const express = require('express');
const mysql = require('mysql2/promise');
const fetch = require('node-fetch');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const app = express();
app.set('trust proxy', 1); // Required for Vercel/Heroku secure cookies
const port = process.env.PORT || 3000;
const ONE_HOUR = 1000 * 60 * 60;
const SALT_ROUNDS = 10;

// --- Database Configuration ---
let pool;

function getPool() {
    if (pool) return pool;

    let dbConfig;

    if (process.env.JAWSDB_URL) {
        // Parse the URL to ensure SSL is handled correctly for TiDB/Vercel
        try {
            const dbUrl = new URL(process.env.JAWSDB_URL);
            dbConfig = {
                host: dbUrl.hostname,
                user: dbUrl.username,
                password: dbUrl.password,
                database: dbUrl.pathname.substr(1),
                port: dbUrl.port || 3306,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                ssl: {
                    rejectUnauthorized: true // Required for TiDB Cloud
                }
            };
            console.log('Using parsed Database URL config');
        } catch (e) {
            console.error('Error parsing JAWSDB_URL, falling back to string:', e);
            dbConfig = process.env.JAWSDB_URL;
        }
    } else {
        // Local Development
        dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'nodejsproj_db',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        };
    }

    console.log('Initializing database connection...');
    try {
        pool = mysql.createPool(dbConfig);
        console.log('Database pool created');
    } catch (err) {
        console.error('Error creating database pool:', err);
    }
    return pool;
}

// Initialize pool
pool = getPool();

// --- Session Store Configuration ---
const sessionStore = new MySQLStore({
    clearExpired: true,
    checkExpirationInterval: 900000,
    expiration: ONE_HOUR,
    createDatabaseTable: true
}, pool);

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure session middleware
app.use(session({
    key: 'session_cookie_name',
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: ONE_HOUR,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// --- Authentication Middleware ---
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized. Please login to view this content.' });
};

// --- SETUP ROUTE ---
app.get('/api/setup-db', async (req, res) => {
    try {
        console.log('Running database setup...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(100),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cats (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                tag VARCHAR(50) NOT NULL,
                descreption TEXT,
                img VARCHAR(255),
                user_id INT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS contact_messages (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                subject VARCHAR(200),
                message TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        res.send('<h1>Database Setup Complete! ✅</h1><p>Tables created successfully. <a href="/">Go back to Home</a></p>');
    } catch (err) {
        console.error('Setup error:', err);
        res.status(500).send(`<h1>Setup Failed ❌</h1><p>Error: ${err.message}</p>`);
    }
});

// --- UPDATE SCHEMA ROUTE ---
app.get('/api/update-schema', async (req, res) => {
    const results = [];
    try {
        try { await pool.query('ALTER TABLE cats ADD COLUMN age INT'); results.push('Added age'); } catch (e) { }
        try { await pool.query('ALTER TABLE cats ADD COLUMN origin VARCHAR(100)'); results.push('Added origin'); } catch (e) { }
        try { await pool.query('ALTER TABLE cats ADD COLUMN gender VARCHAR(20)'); results.push('Added gender'); } catch (e) { }
        res.json({ message: 'Schema update attempted', results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AUTHENTICATION ROUTES ---
app.post('/api/auth/register', async (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });
    try {
        const [existingUsers] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUsers.length > 0) return res.status(409).json({ error: 'Username already exists.' });
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const [result] = await pool.query('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', [username, hashedPassword, email || null]);
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (err) {
        res.status(500).json({ error: 'Error registering user.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await pool.query('SELECT id, username, password FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ error: 'Invalid username or password.' });
        const user = users[0];
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(401).json({ error: 'Invalid username or password.' });
        req.session.userId = user.id;
        req.session.username = user.username;
        res.json({ message: 'Login successful!', user: { id: user.id, username: user.username } });
    } catch (err) {
        res.status(500).json({ error: 'Error during login.' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('session_cookie_name');
        res.json({ message: 'Logout successful!' });
    });
});

app.get('/api/auth/status', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({ authenticated: true, user: { id: req.session.userId, username: req.session.username } });
    } else {
        res.json({ authenticated: false });
    }
});

// --- CATS CRUD ROUTES ---
app.get('/api/cats', isAuthenticated, async (req, res) => {
    const limit = parseInt(req.query.limit) || 8;
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || '';
    const tagFilter = req.query.tagFilter || '';
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];
    if (search || tagFilter) {
        let conditions = [];
        if (search) {
            conditions.push('(name LIKE ? OR descreption LIKE ? OR tag LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (tagFilter) {
            conditions.push('tag = ?');
            params.push(tagFilter);
        }
        whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    try {
        const [countResult] = await pool.query(`SELECT COUNT(*) as count FROM cats ${whereClause}`, params);
        const [cats] = await pool.query(`SELECT * FROM cats ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`, params);
        res.json({ cats, totalPages: Math.ceil(countResult[0].count / limit), totalCount: countResult[0].count, currentPage: page });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching cats' });
    }
});

app.get('/api/tags', async (req, res) => {
    try {
        const [tags] = await pool.query('SELECT DISTINCT tag FROM cats ORDER BY tag ASC');
        res.json(tags);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching tags' });
    }
});

app.post('/api/cats', isAuthenticated, async (req, res) => {
    const { name, tag, descreption, img, age, origin, gender } = req.body;
    let imageUrl = img;
    try {
        if (!imageUrl) {
            const response = await fetch(`https://cataas.com/cat?_ts=${Date.now()}`, { redirect: 'manual' });
            imageUrl = response.headers.get('location') || response.url || '/placeholder.jpg';
        }
        const sql = 'INSERT INTO cats (name, tag, descreption, img, age, origin, gender, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        await pool.query(sql, [name, tag, descreption, imageUrl, age || null, origin || null, gender || null, req.session.userId]);
        res.status(201).json({ message: 'Cat created.' });
    } catch (err) {
        res.status(500).json({ error: 'Error creating cat', details: err.message });
    }
});

app.put('/api/cats/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { name, tag, descreption, img, age, origin, gender } = req.body;
    try {
        let sql, params;
        if (img) {
            sql = 'UPDATE cats SET name = ?, tag = ?, descreption = ?, img = ?, age = ?, origin = ?, gender = ? WHERE id = ? AND user_id = ?';
            params = [name, tag, descreption, img, age || null, origin || null, gender || null, id, req.session.userId];
        } else {
            sql = 'UPDATE cats SET name = ?, tag = ?, descreption = ?, age = ?, origin = ?, gender = ? WHERE id = ? AND user_id = ?';
            params = [name, tag, descreption, age || null, origin || null, gender || null, id, req.session.userId];
        }
        const [result] = await pool.query(sql, params);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Unauthorized or not found' });
        res.json({ message: 'Cat updated.' });
    } catch (err) {
        res.status(500).json({ error: 'Error updating cat', details: err.message });
    }
});

app.delete('/api/cats/:id', isAuthenticated, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM cats WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Unauthorized or not found' });
        res.json({ message: 'Cat deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting cat' });
    }
});

app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;
    try {
        await pool.query('INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)', [name, email, subject, message]);
        res.json({ message: 'Message sent.' });
    } catch (err) {
        res.status(500).json({ error: 'Error sending message' });
    }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contact.html')));

app.listen(port, () => console.log(`Running on port ${port}`));

module.exports = app;