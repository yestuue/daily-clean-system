require('dotenv').config();
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

// ✅ DATABASE CONNECTION — reads from .env locally, from Render env var in production
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ✅ Initialize Tables
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
            console.log('✅ Default admin seeded: admin / dailyclean2025');
        }
        
        console.log('✅ Connected to Supabase. Tables ready.');
    } catch (err) {
        console.error('❌ DB Init Error:', err.message);
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
        const sql = `INSERT INTO bookings (services, pickup_date, time_slot, full_name, phone, address, notes) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`;
        const result = await pool.query(sql, [services, date, timeSlot, fullName, phone, address || '', notes || '']);
        res.status(201).json({ message: 'Booking created', bookingId: result.rows[0].id });
    } catch (err) {
        console.error('Book error:', err.message);
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
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Email already registered' });
        }
        console.error('Loyalty error:', err.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// ==========================================
// ADMIN APIs
// ==========================================

app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT id FROM admin_users WHERE username = $1 AND password = $2',
            [username, password]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        res.json({ token: 'mock-token-' + result.rows[0].id });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Auth error' });
    }
});

// ✅ Auth middleware — reusable
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== 'Bearer mock-token-1') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

app.get('/api/admin/dashboard', requireAuth, async (req, res) => {
    try {
        const total   = await pool.query('SELECT count(*) as count FROM bookings');
        const pending = await pool.query("SELECT count(*) as count FROM bookings WHERE status = 'Pending'");
        const loyalty = await pool.query('SELECT count(*) as count FROM loyalty_members');
        res.json({
            totalBookings:   total.rows[0].count,
            pendingBookings: pending.rows[0].count,
            totalLoyalty:    loyalty.rows[0].count
        });
    } catch (err) {
        console.error('Dashboard error:', err.message);
        res.status(500).json({ error: 'Stats fetch failed' });
    }
});

app.get('/api/admin/bookings', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Bookings fetch error:', err.message);
        res.status(500).json({ error: 'Fetch failed' });
    }
});

app.put('/api/admin/bookings/:id/status', requireAuth, async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, req.params.id]);
        res.json({ message: 'Status updated' });
    } catch (err) {
        console.error('Status update error:', err.message);
        res.status(500).json({ error: 'Update failed' });
    }
});

app.listen(PORT, () => console.log(`🚀 Daily Clean server live at http://localhost:${PORT}`));