const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Supabase Connection Configuration
// Replace the string below with your actual connection string if not using a .env file
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:[YOUR-PASSWORD]@db.jeoqnvwwthxtonfapgej.supabase.co:5432/postgres';

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false } // Required for Supabase & Render
});

// Initialize Tables for PostgreSQL
const initializeTables = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                services TEXT,
                pickup_date TEXT,
                time_slot TEXT,
                full_name TEXT,
                phone TEXT,
                address TEXT,
                notes TEXT,
                status TEXT DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS loyalty_members (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS admin_users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE,
                password TEXT
            );
        `);

        // Seed default admin if table is empty
        const adminCheck = await client.query('SELECT count(*) FROM admin_users');
        if (parseInt(adminCheck.rows[0].count) === 0) {
            await client.query("INSERT INTO admin_users (username, password) VALUES ('admin', 'dailyclean2025')");
            console.log('✅ Default admin seeded (admin / dailyclean2025)');
        }
        
        console.log('✅ Connected to Supabase and tables verified.');
    } catch (err) {
        console.error('❌ Database Initialization Error:', err.message);
    } finally {
        client.release();
    }
};

initializeTables();

// ==========================================
// PUBLIC APIs
// ==========================================

app.post('/api/book', async (req, res) => {
    const { services, date, timeSlot, fullName, phone, address, notes } = req.body;
    if (!services || !date || !timeSlot || !fullName || !phone) {
        return res.status(400).json({ error: 'Missing required booking fields.' });
    }

    try {
        const sql = `INSERT INTO bookings (services, pickup_date, time_slot, full_name, phone, address, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`;
        const result = await pool.query(sql, [services, date, timeSlot, fullName, phone, address || '', notes || '']);
        res.status(201).json({ message: 'Booking created', bookingId: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/loyalty', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    try {
        await pool.query(`INSERT INTO loyalty_members (email) VALUES ($1)`, [email]);
        res.status(201).json({ message: 'Joined successfully' });
    } catch (err) {
        if (err.message.includes('unique constraint')) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        res.status(500).json({ error: 'Database error' });
    }
});

// ==========================================
// ADMIN APIs (Protected)
// ==========================================

app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT id FROM admin_users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        res.json({ token: 'mock-token-' + result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: 'Auth error' });
    }
});

app.get('/api/admin/dashboard', async (req, res) => {
    // Check for the specific "Daily Clean" key
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== 'Bearer mock-token-1') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const total = await pool.query('SELECT count(*) as count FROM bookings');
        const pending = await pool.query("SELECT count(*) as count FROM bookings WHERE status = 'Pending'");
        const loyalty = await pool.query('SELECT count(*) as count FROM loyalty_members');

        res.json({
            totalBookings: total.rows[0].count,
            pendingBookings: pending.rows[0].count,
            totalLoyalty: loyalty.rows[0].count
        });
    } catch (err) {
        res.status(500).json({ error: 'Stats fetch failed' });
    }
});
app.get('/api/admin/bookings', async (req, res) => {
    const authHeader = req.headers.authorization;
    
    // This matches the security you just added to the dashboard
    if (!authHeader || authHeader !== 'Bearer mock-token-1') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Fetch failed' });
    }
});

// Update booking status
app.put('/api/admin/bookings/:id/status', async (req, res) => {
    // Add this check for total security
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== 'Bearer mock-token-1') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { status } = req.body;
    try {
        await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, req.params.id]);
        res.json({ message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ error: 'Update failed' });
    }
});
app.listen(PORT, () => console.log(`🚀 Server live at http://localhost:${PORT}`));