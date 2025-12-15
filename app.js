// app.js - Full CRUD API, Static File Server, and External Image Fetching

const express = require('express');
const mysql = require('mysql2'); 
const fetch = require('node-fetch'); // Required for making external API calls
const app = express();
const port = 3000; 

// --- 1. MySQL Connection Configuration ---
const dbConfig = {
    host: 'localhost',
    user: 'root', 
    password: '', 
    database: 'nodejsproj_db' // !!! CONFIRM YOUR DATABASE NAME HERE !!!
};
// Create connection pool and immediately promisify it for async/await syntax
const pool = mysql.createPool(dbConfig).promise(); 

// --- 2. Middleware & Static Files ---
app.use(express.json()); // To parse JSON bodies (for POST/PUT/PATCH)
app.use(express.urlencoded({ extended: true })); 
app.use(express.static('public')); // Serve all frontend files from the 'public' directory

// --- 3. Test Database Connection on Startup ---
async function testDbConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Successfully connected to MySQL as id ' + connection.threadId);
        connection.release();
    } catch (err) {
        console.error('Error connecting to MySQL:', err.stack);
        console.error('ACTION REQUIRED: Ensure MySQL in XAMPP is running and database name is correct.');
    }
}
testDbConnection();


// ------------------------------------------------------------------
// --- 4. CRUD API Routes (All parameterized for security) ---
// ------------------------------------------------------------------


// R - READ ALL CATS (Optional: Filter by Query Parameter ?id=X)
app.get('/cats', async (req, res) => {
    const queryId = req.query.id; 
    let sql;
    let params = [];

    if (queryId) {
        sql = 'SELECT * FROM cats WHERE id = ?';
        params = [queryId];
    } else {
        sql = 'SELECT * FROM cats';
    }

    try {
        const [results] = await pool.execute(sql, params); 
        if (queryId && results.length === 0) {
            return res.status(404).json({ error: `Cat not found with ID ${queryId}.` });
        }
        res.json(results);
    } catch (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ error: 'Error fetching cat data.' });
    }
});


// R - READ ONE CAT by Path Parameter
app.get('/cats/:id', async (req, res) => {
    const catId = req.params.id; 
    try {
        const [results] = await pool.execute('SELECT * FROM cats WHERE id = ?', [catId]);
        if (results.length === 0) {
            return res.status(404).json({ error: 'Cat not found.' });
        }
        res.json(results[0]); 
    } catch (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ error: 'Error fetching single cat data.' });
    }
});


// C - CREATE (POST) a new cat (Includes External Image Fetching)
app.post('/cats', async (req, res) => {
    // Get data from the request body
    const { name, tag, descreption } = req.body; 
    
    if (!name || !tag) {
        return res.status(400).json({ error: 'Name and Tag are required fields.' });
    }
    
    let imageUrl = req.body.img; 

    try {
        // --- STEP 1: Fetch Unique Image URL from External API (Cataas) ---
        if (!imageUrl || imageUrl.trim() === '') {
            const cataasBaseUrl = 'https://cataas.com/cat'; 
            
            // 🛑 CACHE-BUSTING FIX: Append a unique timestamp to force a new image
            const uniqueUrl = `${cataasBaseUrl}?_ts=${Date.now()}`;
            
            console.log('Fetching unique image with URL:', uniqueUrl);

            const imageResponse = await fetch(uniqueUrl, { redirect: 'manual' });
            
            if (imageResponse.status === 302 || imageResponse.status === 307) {
                // If it's a redirect, get the actual URL from the 'Location' header
                imageUrl = imageResponse.headers.get('location');
            } else if (imageResponse.ok && imageResponse.url) {
                // If it returns a 200 OK directly, use the final URL
                imageUrl = imageResponse.url;
            } else {
                console.error(`Cataas API response status: ${imageResponse.status}`);
                imageUrl = 'default_placeholder.jpg'; 
            }
        }
        
        if (!imageUrl) {
             imageUrl = 'default_placeholder.jpg';
        }

        // --- STEP 2: Insert Data into MySQL ---
        const sql = 'INSERT INTO cats (name, tag, descreption, img) VALUES (?, ?, ?, ?)';
        
        const [result] = await pool.execute(sql, [name, tag, descreption, imageUrl]);

        // 3. Success: Return the newly created record's ID
        res.status(201).json({ 
            message: 'Cat successfully created with external image.',
            id: result.insertId,
            data: { name, tag, descreption, img: imageUrl }
        });

    } catch (err) {
        console.error('Database insertion error or Image fetch error:', err);
        return res.status(500).json({ error: 'Error creating new cat or fetching image.' });
    }
});


// U - UPDATE (PUT) an existing cat (Full Replacement)
app.put('/cats/:id', async (req, res) => {
    const catId = req.params.id;
    const { name, tag, descreption, img } = req.body;
    if (!name || !tag) {
        return res.status(400).json({ error: 'Name and Tag are required fields for update.' });
    }
    try {
        const sql = 'UPDATE cats SET name = ?, tag = ?, descreption = ?, img = ? WHERE id = ?';
        const [result] = await pool.execute(sql, [name, tag, descreption, img, catId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: `Cat with ID ${catId} not found.` });
        }
        res.status(200).json({ 
            message: `Cat with ID ${catId} successfully updated.`,
            updatedCount: result.affectedRows
        });
    } catch (err) {
        console.error('Database update error:', err);
        return res.status(500).json({ error: 'Error updating cat.' });
    }
});


// P - PATCH (Partial Update) an existing cat
app.patch('/cats/:id', async (req, res) => {
    const catId = req.params.id;
    const updates = req.body; 
    let updateFields = [];
    let params = [];

    for (const key in updates) {
        if (key !== 'id' && updates[key] !== undefined) {
            updateFields.push(`${key} = ?`);
            params.push(updates[key]);
        }
    }
    if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update.' });
    }
    params.push(catId); 

    try {
        const sql = `UPDATE cats SET ${updateFields.join(', ')} WHERE id = ?`;
        const [result] = await pool.execute(sql, params);

        if (result.affectedRows === 0) {
            const [check] = await pool.execute('SELECT id FROM cats WHERE id = ?', [catId]);
            if (check.length === 0) {
                return res.status(404).json({ error: `Cat with ID ${catId} not found.` });
            }
            return res.status(200).json({ message: `Cat with ID ${catId} found, but no changes were applied.` });
        }
        res.status(200).json({ 
            message: `Cat with ID ${catId} successfully patched.`,
            updatedCount: result.affectedRows
        });
    } catch (err) {
        console.error('Database PATCH error:', err);
        return res.status(500).json({ error: 'Error patching cat.' });
    }
});


// D - DELETE a cat by ID
app.delete('/cats/:id', async (req, res) => {
    const catId = req.params.id; 
    try {
        const [result] = await pool.execute('DELETE FROM cats WHERE id = ?', [catId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: `Cat not found with ID ${catId}. No record was deleted.` });
        }
        res.status(200).json({ 
            message: `Cat with ID ${catId} successfully deleted.`,
            deletedCount: result.affectedRows
        }); 
    } catch (err) {
        console.error('Database deletion error:', err);
        return res.status(500).json({ error: 'Error processing deletion request.' });
    }
});


// --- 5. Start Express Server ---
app.listen(port, () => {
    console.log(`Express server listening on port ${port}`);
    console.log(`Access the web app at http://localhost:${port}`);
});