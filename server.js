const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Initialize SQLite Database
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeTables();
    }
});

function initializeTables() {
    db.serialize(() => {
        // Bookings Table
        db.run(`CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            services TEXT,
            pickup_date TEXT,
            time_slot TEXT,
            full_name TEXT,
            phone TEXT,
            address TEXT,
            notes TEXT,
            status TEXT DEFAULT 'Pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Loyalty Table
        db.run(`CREATE TABLE IF NOT EXISTS loyalty_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Admin Table & Seeding
        db.run(`CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`, () => {
            db.get(`SELECT count(*) as count FROM admin_users`, (err, row) => {
                if (row && row.count === 0) {
                    db.run(`INSERT INTO admin_users (username, password) VALUES ('admin', 'dailyclean2025')`);
                    console.log('Default admin seeded (admin / dailyclean2025)');
                }
            });
        });
    });
}

// ==========================================
// PUBLIC APIs
// ==========================================

app.post('/api/book', (req, res) => {
    const { services, date, timeSlot, fullName, phone, address, notes } = req.body;
    if (!services || !date || !timeSlot || !fullName || !phone) {
        return res.status(400).json({ error: 'Missing required booking fields.' });
    }

    const sql = `INSERT INTO bookings (services, pickup_date, time_slot, full_name, phone, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [services, date, timeSlot, fullName, phone, address || '', notes || ''], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.status(201).json({ message: 'Booking created', bookingId: this.lastID });
    });
});

app.post('/api/loyalty', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    db.run(`INSERT INTO loyalty_members (email) VALUES (?)`, [email], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already registered' });
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({ message: 'Joined successfully' });
    });
});

// ==========================================
// ADMIN APIs (Protected)
// ==========================================

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT id FROM admin_users WHERE username = ? AND password = ?', [username, password], (err, row) => {
        if (err) return res.status(500).json({ error: 'Auth error' });
        if (!row) return res.status(401).json({ error: 'Invalid credentials' });
        res.json({ token: 'mock-token-' + row.id }); // Use JWT for real production
    });
});

// Optimized Stats Endpoint using Promises
app.get('/api/admin/dashboard', (req, res) => {
    if (!req.headers.authorization) return res.status(401).json({ error: 'Unauthorized' });

    const getCount = (sql) => new Promise((resolve) => db.get(sql, (err, row) => resolve(row ? row.count : 0)));

    Promise.all([
        getCount(`SELECT count(*) as count FROM bookings`),
        getCount(`SELECT count(*) as count FROM bookings WHERE status = 'Pending'`),
        getCount(`SELECT count(*) as count FROM loyalty_members`)
    ]).then(([total, pending, loyalty]) => {
        res.json({ totalBookings: total, pendingBookings: pending, totalLoyalty: loyalty });
    });
});

app.get('/api/admin/bookings', (req, res) => {
    if (!req.headers.authorization) return res.status(401).json({ error: 'Unauthorized' });
    db.all(`SELECT * FROM bookings ORDER BY created_at DESC`, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Fetch failed' });
        res.json(rows);
    });
});

app.put('/api/admin/bookings/:id/status', (req, res) => {
    const { status } = req.body;
    db.run(`UPDATE bookings SET status = ? WHERE id = ?`, [status, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Update failed' });
        res.json({ message: 'Status updated' });
    });
});

// Graceful Shutdown
process.on('SIGINT', () => {
    db.close(() => {
        console.log('Database connection closed.');
        process.exit(0);
    });
});

app.listen(PORT, () => console.log(`Server live at http://localhost:${PORT}`));