const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 3000;
const SALT_ROUNDS = 10;

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = '24h'; // Token expiration time

// --- Database Configuration ---
let pool;

function getPool() {
    if (pool) return pool;

    let dbConfig;

    if (process.env.JAWSDB_URL) {
        console.log('Using JAWSDB_URL connection string...');

        // Parse the connection string to add SSL for TiDB Cloud
        const connectionString = process.env.JAWSDB_URL;

        // Check if it's a TiDB Cloud connection (contains .tidbcloud.com or gateway01)
        const isTiDB = connectionString.includes('.tidbcloud.com') ||
            connectionString.includes('gateway01') ||
            connectionString.includes('.root');

        if (isTiDB) {
            console.log('TiDB Cloud detected - enabling SSL...');

            // Manual parsing for TiDB Cloud connection strings
            // Format: mysql://username:password@host:port/database or mysql://username:password@host:port/database?params
            const match = connectionString.match(/mysql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/([^?]+)/);

            if (match) {
                const [, username, password, host, port, database] = match;

                dbConfig = {
                    host: host,
                    port: parseInt(port) || 4000,
                    user: username,
                    password: password,
                    database: database,
                    ssl: {
                        minVersion: 'TLSv1.2',
                        rejectUnauthorized: true
                    },
                    waitForConnections: true,
                    connectionLimit: 10,
                    queueLimit: 0,
                    enableKeepAlive: true,
                    keepAliveInitialDelay: 0
                };

                console.log(`✓ TiDB Config: host=${host}, port=${port}, user=${username}, db=${database}`);
            } else {
                console.error('❌ Failed to parse TiDB connection string');
                dbConfig = connectionString;
            }
        } else {
            // For other MySQL services, use connection string directly
            dbConfig = connectionString;
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
        console.log('Database pool created successfully');
    } catch (err) {
        console.error('CRITICAL: Error creating database pool:', err.message);
    }
    return pool;
}

// Initialize pool
pool = getPool();

// --- JWT Utility Functions ---
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
};

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// CORS headers for JWT (if needed for cross-origin requests)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// --- Authentication Middleware ---
const isAuthenticated = (req, res, next) => {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized. No token provided.' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Unauthorized. Invalid or expired token.' });
    }

    // Attach user info to request object
    req.user = decoded;
    next();
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
                age INT,
                origin VARCHAR(100),
                gender VARCHAR(20),
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
        await pool.query(`
            CREATE TABLE IF NOT EXISTS adoptions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                cat_id INT NOT NULL,
                adopted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (cat_id) REFERENCES cats(id) ON DELETE CASCADE,
                UNIQUE KEY unique_adoption (user_id, cat_id)
            )
        `);
        res.send('<h1>Database Setup Complete! ✅</h1><p>Tables created successfully. <a href="/">Go back to Home</a></p>');
    } catch (err) {
        console.error('Setup error:', err);
        res.status(500).send(`<h1>Setup Failed ❌</h1><p>Error: ${err.message}</p>`);
    }
});


// --- DIAGNOSTIC ROUTE (for debugging connection issues) ---
app.get('/api/db-check', async (req, res) => {
    try {
        const hasJawsDB = !!process.env.JAWSDB_URL;
        const connectionInfo = {
            hasJawsDBURL: hasJawsDB,
            nodeEnv: process.env.NODE_ENV,
            timestamp: new Date().toISOString()
        };

        // Test connection
        await pool.query('SELECT 1');

        res.json({
            status: 'OK',
            message: 'Database connection successful',
            ...connectionInfo
        });
    } catch (err) {
        res.status(500).json({
            status: 'ERROR',
            message: err.message,
            code: err.code,
            sqlState: err.sqlState
        });
    }
});

// --- UPDATE SCHEMA ROUTE ---
app.get('/api/update-schema', async (req, res) => {
    const results = [];
    const queries = [
        { sql: 'ALTER TABLE cats ADD COLUMN age INT', label: 'Added age' },
        { sql: 'ALTER TABLE cats ADD COLUMN origin VARCHAR(100)', label: 'Added origin' },
        { sql: 'ALTER TABLE cats ADD COLUMN gender VARCHAR(20)', label: 'Added gender' },
        { sql: 'ALTER TABLE cats ADD COLUMN user_id INT', label: 'Added user_id' }
    ];

    for (const q of queries) {
        try {
            await pool.query(q.sql);
            results.push(`${q.label}: OK`);
        } catch (e) {
            results.push(`${q.label}: Skip (${e.code === 'ER_DUP_COLUMN_NAME' ? 'Exists' : e.message})`);
        }
    }
    res.json({ message: 'Schema update attempted', results });
});

// --- AUTHENTICATION ROUTES ---
app.post('/api/auth/register', async (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });
    try {
        console.log('Attempting to register user:', username);
        const [existingUsers] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUsers.length > 0) return res.status(409).json({ error: 'Username already exists.' });

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const [result] = await pool.query('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', [username, hashedPassword, email || null]);

        // Generate JWT token for the new user
        const user = { id: result.insertId, username };
        const token = generateToken(user);

        console.log('User registered successfully:', result.insertId);
        res.status(201).json({
            message: 'User registered successfully!',
            token,
            user: { id: user.id, username: user.username }
        });
    } catch (err) {
        console.error('Registration error details:', err);
        res.status(500).json({ error: 'Error registering user.', details: err.message });
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

        // Update last login time
        await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

        // Generate JWT token
        const token = generateToken({ id: user.id, username: user.username });

        res.json({
            message: 'Login successful!',
            token,
            user: { id: user.id, username: user.username }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Error during login.' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    // With JWT, logout is handled client-side by removing the token
    // Optionally, you could implement a token blacklist here
    res.json({ message: 'Logout successful! Please remove the token from client.' });
});

app.get('/api/auth/status', isAuthenticated, (req, res) => {
    // If middleware passes, user is authenticated
    res.json({
        authenticated: true,
        user: { id: req.user.id, username: req.user.username }
    });
});

// New route to verify token without requiring authentication
app.post('/api/auth/verify', (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ valid: false, error: 'Token is required' });
    }

    const decoded = verifyToken(token);

    if (decoded) {
        res.json({ valid: true, user: { id: decoded.id, username: decoded.username } });
    } else {
        res.json({ valid: false, error: 'Invalid or expired token' });
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
        await pool.query(sql, [name, tag, descreption, imageUrl, age || null, origin || null, gender || null, req.user.id]);
        res.status(201).json({ message: 'Cat created.' });
    } catch (err) {
        console.error('Error creating cat:', err);
        res.status(500).json({ error: 'Error creating cat', details: err.message, message: 'Error creating cat: ' + err.message });
    }
});

app.put('/api/cats/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { name, tag, descreption, img, age, origin, gender } = req.body;
    try {
        let sql, params;
        // Allow update if the user is the owner OR the cat has no owner (NULL user_id)
        // If it had no owner, this update will set the current user as the owner
        if (img) {
            sql = 'UPDATE cats SET name = ?, tag = ?, descreption = ?, img = ?, age = ?, origin = ?, gender = ?, user_id = ? WHERE id = ? AND (user_id = ? OR user_id IS NULL)';
            params = [name, tag, descreption, img, age || null, origin || null, gender || null, req.user.id, id, req.user.id];
        } else {
            sql = 'UPDATE cats SET name = ?, tag = ?, descreption = ?, age = ?, origin = ?, gender = ?, user_id = ? WHERE id = ? AND (user_id = ? OR user_id IS NULL)';
            params = [name, tag, descreption, age || null, origin || null, gender || null, req.user.id, id, req.user.id];
        }
        const [result] = await pool.query(sql, params);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Unauthorized or cat not found', message: 'Unauthorized or cat not found' });
        res.json({ message: 'Cat updated.' });
    } catch (err) {
        console.error('Error updating cat:', err);
        res.status(500).json({ error: 'Error updating cat', details: err.message, message: 'Error updating cat: ' + err.message });
    }
});

app.delete('/api/cats/:id', isAuthenticated, async (req, res) => {
    try {
        // Allow delete if owner OR if no owner exists (legacy)
        const [result] = await pool.query('DELETE FROM cats WHERE id = ? AND (user_id = ? OR user_id IS NULL)', [req.params.id, req.user.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Unauthorized or cat not found', message: 'Unauthorized or cat not found' });
        res.json({ message: 'Cat deleted.' });
    } catch (err) {
        console.error('Error deleting cat:', err);
        res.status(500).json({ error: 'Error deleting cat', details: err.message, message: 'Error deleting cat: ' + err.message });
    }
});

// --- ADOPTION ROUTES ---
// Adopt a cat
app.post('/api/adoptions', isAuthenticated, async (req, res) => {
    const { cat_id } = req.body;
    if (!cat_id) return res.status(400).json({ error: 'cat_id is required' });

    try {
        // Check if cat exists
        const [cats] = await pool.query('SELECT id FROM cats WHERE id = ?', [cat_id]);
        if (cats.length === 0) return res.status(404).json({ error: 'Cat not found' });

        // Try to adopt (will fail if already adopted due to UNIQUE constraint)
        await pool.query('INSERT INTO adoptions (user_id, cat_id) VALUES (?, ?)', [req.user.id, cat_id]);
        res.status(201).json({ message: 'Cat adopted successfully!' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'You have already adopted this cat' });
        }
        console.error('Error adopting cat:', err);
        res.status(500).json({ error: 'Error adopting cat', details: err.message });
    }
});

// Get user's adopted cats
app.get('/api/adoptions', isAuthenticated, async (req, res) => {
    try {
        const [adoptions] = await pool.query(`
            SELECT c.*, a.adopted_at 
            FROM adoptions a 
            JOIN cats c ON a.cat_id = c.id 
            WHERE a.user_id = ? 
            ORDER BY a.adopted_at DESC
        `, [req.user.id]);

        res.json({ adoptions, count: adoptions.length });
    } catch (err) {
        console.error('Error fetching adoptions:', err);
        res.status(500).json({ error: 'Error fetching adoptions' });
    }
});

// Get adoption count for a specific cat
app.get('/api/adoptions/cat/:catId', isAuthenticated, async (req, res) => {
    try {
        const [result] = await pool.query('SELECT COUNT(*) as count FROM adoptions WHERE cat_id = ?', [req.params.catId]);
        const [userAdopted] = await pool.query('SELECT id FROM adoptions WHERE cat_id = ? AND user_id = ?', [req.params.catId, req.user.id]);

        res.json({
            count: result[0].count,
            userAdopted: userAdopted.length > 0
        });
    } catch (err) {
        console.error('Error fetching adoption count:', err);
        res.status(500).json({ error: 'Error fetching adoption count' });
    }
});

// Unadopt a cat
app.delete('/api/adoptions/:catId', isAuthenticated, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM adoptions WHERE cat_id = ? AND user_id = ?', [req.params.catId, req.user.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Adoption not found' });
        res.json({ message: 'Cat unadopted successfully' });
    } catch (err) {
        console.error('Error unadopting cat:', err);
        res.status(500).json({ error: 'Error unadopting cat' });
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

// --- Server Start ---
if (require.main === module) {
    app.listen(port, () => console.log(`Server running on port ${port}`));
}

module.exports = app;