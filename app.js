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
// This saves sessions to the database so they survive server restarts (critical for Vercel)
const sessionStore = new MySQLStore({
    clearExpired: true,
    checkExpirationInterval: 900000, // 15 minutes
    expiration: ONE_HOUR,
    createDatabaseTable: true // Automatically create the sessions table
}, pool);

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure session middleware
app.use(session({
    key: 'session_cookie_name',
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    store: sessionStore, // Use the database store
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // True in production (HTTPS)
        httpOnly: true,
        maxAge: ONE_HOUR,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Important for cross-site cookies if needed, or 'lax' is fine usually
    }
}));

// --- Authentication Middleware ---
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized. Please login to view this content.' });
};

// --- SETUP ROUTE (Run once to fix database) ---
app.get('/api/setup-db', async (req, res) => {
    try {
        console.log('Running database setup...');

        // 1. Create Users Table
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

        // 2. Create Cats Table
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

        // 3. Create Contact Messages Table
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

// --- DEBUG ROUTE (Check table structure) ---
app.get('/api/debug-db', async (req, res) => {
    try {
        const [rows] = await pool.query('DESCRIBE cats');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AUTHENTICATION ROUTES ---

// Register new user
app.post('/api/auth/register', async (req, res) => {
    const { username, password, email } = req.body;

    console.log('Registration request received:', { username, email });

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    try {
        // Check if username already exists
        const checkSql = 'SELECT id FROM users WHERE username = ?';
        const [existingUsers] = await pool.query(checkSql, [username]);

        if (existingUsers.length > 0) {
            return res.status(409).json({ error: 'Username already exists.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Insert new user
        const insertSql = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
        const [result] = await pool.query(insertSql, [username, hashedPassword, email || null]);

        console.log('User registered successfully:', result.insertId);

        res.status(201).json({
            message: 'User registered successfully!',
            userId: result.insertId
        });

    } catch (err) {
        console.error('Registration error:', err.message);
        console.error('Error stack:', err.stack);
        res.status(500).json({ error: 'Error registering user.', details: err.message });
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        // Find user
        const sql = 'SELECT id, username, password FROM users WHERE username = ?';
        const [users] = await pool.query(sql, [username]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        const user = users[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // Create session
        req.session.userId = user.id;
        req.session.username = user.username;

        // Update last login
        await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

        res.json({
            message: 'Login successful!',
            user: { id: user.id, username: user.username }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Error during login.' });
    }
});

// Logout user
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error logging out.' });
        }
        res.clearCookie('session_cookie_name');
        res.json({ message: 'Logout successful!' });
    });
});

// Check session status
app.get('/api/auth/status', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            authenticated: true,
            user: { id: req.session.userId, username: req.session.username }
        });
    } else {
        res.json({ authenticated: false });
    }
});

// --- CATS CRUD ROUTES ---

// R - READ (GET) all cats with Search, Tag Filter, and Pagination - PROTECTED ROUTE
app.get('/api/cats', isAuthenticated, async (req, res) => {
    const limit = parseInt(req.query.limit) || 8;
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search ? req.query.search.toString().trim() : '';
    const tagFilter = req.query.tagFilter ? req.query.tagFilter.toString().trim() : '';

    const offset = (page - 1) * limit;

    const responseData = {
        cats: [], totalCount: 0, totalPages: 0, currentPage: page, limit: limit
    };

    let whereClause = '';
    let conditions = [];
    let params = [];

    if (search.length > 0) {
        conditions.push('(name LIKE ? OR tag LIKE ? OR descreption LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    if (tagFilter.length > 0) {
        conditions.push('tag = ?');
        params.push(tagFilter);
    }

    if (conditions.length > 0) {
        whereClause = ' WHERE ' + conditions.join(' AND ');
    }

    try {
        const countSql = `SELECT COUNT(*) AS total_count FROM cats${whereClause}`;
        const [countRows] = await pool.query(countSql, params);

        responseData.totalCount = countRows[0].total_count;
        responseData.totalPages = Math.ceil(responseData.totalCount / limit);

        const catsSql = `SELECT * FROM cats${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`;
        const catsParams = [...params, limit, offset];

        const [catsRows] = await pool.query(catsSql, catsParams);
        responseData.cats = catsRows;

        res.json(responseData);

    } catch (err) {
        console.error('SQL ERROR FETCHING CATS:', err.message);
        return res.status(500).json({ error: 'Database error fetching cats.' });
    }
});

// R - READ (GET) all unique tags - PROTECTED ROUTE
app.get('/api/tags', isAuthenticated, async (req, res) => {
    try {
        const sql = `SELECT DISTINCT tag FROM cats WHERE tag IS NOT NULL AND tag != '' ORDER BY tag ASC`;
        const [tagRows] = await pool.query(sql);
        res.json(tagRows);

    } catch (err) {
        console.error('Database error fetching tags:', err.message);
        res.status(500).json({ error: 'Database error fetching tags.' });
    }
});

// C - CREATE (POST) a new cat - PROTECTED ROUTE
app.post('/api/cats', isAuthenticated, async (req, res) => {
    const { name, tag, descreption, img } = req.body;

    if (!name || !tag) {
        return res.status(400).json({ error: 'Name and Tag are required fields.' });
    }

    let imageUrl = img;

    try {
        if (!imageUrl || imageUrl.trim() === '') {
            const cataasBaseUrl = 'https://cataas.com/cat';
            const uniqueUrl = `${cataasBaseUrl}?_ts=${Date.now()}`;

            const imageResponse = await fetch(uniqueUrl, { redirect: 'manual' });

            if (imageResponse.status === 302 || imageResponse.status === 307) {
                imageUrl = imageResponse.headers.get('location');
            } else if (imageResponse.ok && imageResponse.url) {
                imageUrl = imageResponse.url;
            } else {
                imageUrl = '/placeholder.jpg';
            }
        }

        if (!imageUrl) { imageUrl = '/placeholder.jpg'; }

        const sql = 'INSERT INTO cats (name, tag, descreption, img, user_id) VALUES (?, ?, ?, ?, ?)';
        const [result] = await pool.query(sql, [name, tag, descreption, imageUrl, req.session.userId]);

        res.status(201).json({ message: 'Cat successfully created.', id: result.insertId });

    } catch (err) {
        console.error('Database insertion error or Image fetch error:', err);
        return res.status(500).json({ error: 'Error creating new cat or fetching image.' });
    }
});

// U - UPDATE (PUT) a cat by ID - PROTECTED ROUTE
app.put('/api/cats/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { name, tag, descreption, img } = req.body;

    console.log(`Attempting to update cat ${id} for user ${req.session.userId}`);

    if (!name || !tag) {
        return res.status(400).json({ error: 'Name and Tag are required fields.' });
    }

    try {
        let sql;
        let params;

        if (img && img.trim() !== '') {
            sql = 'UPDATE cats SET name = ?, tag = ?, descreption = ?, img = ? WHERE id = ? AND user_id = ?';
            params = [name, tag, descreption, img, id, req.session.userId];
        } else {
            sql = 'UPDATE cats SET name = ?, tag = ?, descreption = ? WHERE id = ? AND user_id = ?';
            params = [name, tag, descreption, id, req.session.userId];
        }

        console.log('Executing SQL:', sql);
        console.log('With params:', params);

        const [result] = await pool.query(sql, params);

        console.log('Update result:', result);

        if (result.affectedRows === 0) {
            console.log('No rows affected. Cat not found or user mismatch.');
            return res.status(404).json({ message: 'Cat not found or unauthorized.' });
        }

        res.json({ message: 'Cat updated successfully.' });

    } catch (err) {
        console.error('Database update error:', err);
        res.status(500).json({ error: 'Error updating cat.' });
    }
});

// D - DELETE (DELETE) a cat by ID - PROTECTED ROUTE
app.delete('/api/cats/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;

    try {
        const sql = 'DELETE FROM cats WHERE id = ? AND user_id = ?';
        const [result] = await pool.query(sql, [id, req.session.userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cat not found or unauthorized.' });
        }

        res.json({ message: 'Cat deleted successfully.' });

    } catch (err) {
        console.error('Database delete error:', err);
        res.status(500).json({ error: 'Error deleting cat.' });
    }
});

// --- CONTACT FORM ROUTE ---
app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    try {
        const sql = 'INSERT INTO contact_messages (name, email, subject, message, created_at) VALUES (?, ?, ?, ?, NOW())';
        await pool.query(sql, [name, email, subject || '', message]);

        res.json({ message: 'Message sent successfully! We will get back to you soon.' });
    } catch (err) {
        console.error('Contact form error:', err);
        res.status(500).json({ error: 'Error sending message.' });
    }
});

// --- SERVE STATIC PAGES ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

// --- Server Start ---
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

module.exports = app;