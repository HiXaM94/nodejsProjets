const express = require('express');
const mysql = require('mysql2/promise');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const port = 3000;

// --- Database Configuration (VERIFY THESE AGAIN) ---
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', 
    password: '', // CONFIRMED: Use your actual password or ''
    database: 'nodejsproj_db', // CONFIRMED: Use your actual database name
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- Middleware ---
app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public'))); 

// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// R - READ (GET) all cats with Search, Tag Filter, and Pagination
app.get('/cats', async (req, res) => {
    // 1. Get Parameters and Defaults
    const limit = parseInt(req.query.limit) || 8; 
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search ? req.query.search.toString().trim() : ''; 
    // NEW: Get the tag filter parameter
    const tagFilter = req.query.tagFilter ? req.query.tagFilter.toString().trim() : '';

    const offset = (page - 1) * limit;
    
    const responseData = {
        cats: [], totalCount: 0, totalPages: 0, currentPage: page, limit: limit
    };

    let whereClause = '';
    let conditions = []; // Array to hold individual WHERE conditions
    let params = [];    // Array to hold query parameters

    // 2. Build Search (WHERE) Clause ONLY IF search is non-empty
    if (search.length > 0) { 
        conditions.push('(name LIKE ? OR tag LIKE ? OR descreption LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // 3. NEW: Build Tag Filter Clause ONLY IF tagFilter is non-empty
    if (tagFilter.length > 0) {
        conditions.push('tag = ?');
        params.push(tagFilter);
    }
    
    // 4. Construct the WHERE clause if any conditions exist
    if (conditions.length > 0) {
        whereClause = ' WHERE ' + conditions.join(' AND ');
    }

    try {
        // --- Query 1: Get Total Count ---
        const countSql = `SELECT COUNT(*) AS total_count FROM cats${whereClause}`;
        const [countRows] = await pool.execute(countSql, params);
        
        responseData.totalCount = countRows[0].total_count;
        responseData.totalPages = Math.ceil(responseData.totalCount / limit);

        // --- Query 2: Get Cats Data ---
        const catsSql = `SELECT * FROM cats${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`;
        
        // Add LIMIT and OFFSET to the parameters array
        const catsParams = [...params, limit, offset];

        const [catsRows] = await pool.execute(catsSql, catsParams);
        responseData.cats = catsRows;

        res.json(responseData);

    } catch (err) {
        console.error('--- SQL ERROR FETCHING CATS ---');
        console.error(`Error Message: ${err.message}`);
        return res.status(500).json({ error: 'Database error fetching cats.' });
    }
});

// R - READ (GET) all unique tags
app.get('/tags', async (req, res) => {
    try {
        // Select distinct tags that are not empty or null
        const sql = `SELECT DISTINCT tag FROM cats WHERE tag IS NOT NULL AND tag != '' ORDER BY tag ASC`;
        const [tagRows] = await pool.execute(sql);
        
        // Return only the rows (e.g., [{tag: 'MaineCoon'}, {tag: 'SillyCat'}])
        res.json(tagRows); 

    } catch (err) {
        // Log the error for diagnosis
        console.error('Database error fetching tags:', err.message); 
        res.status(500).json({ error: 'Database error fetching tags.' });
    }
});

// R - READ (GET) all cats with Search, Tag Filter, and Pagination
app.get('/cats', async (req, res) => {
    // 1. Get Parameters and Defaults
    const limit = parseInt(req.query.limit) || 8; 
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search ? req.query.search.toString().trim() : ''; 
    // NEW: Get the tag filter parameter
    const tagFilter = req.query.tagFilter ? req.query.tagFilter.toString().trim() : '';

    const offset = (page - 1) * limit;
    
    const responseData = {
        cats: [], totalCount: 0, totalPages: 0, currentPage: page, limit: limit
    };

    let whereClause = '';
    let conditions = []; // Array to hold individual WHERE conditions
    let params = [];    // Array to hold query parameters

    // 2. Build Search (WHERE) Clause ONLY IF search is non-empty
    if (search.length > 0) { 
        conditions.push('(name LIKE ? OR tag LIKE ? OR descreption LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // 3. NEW: Build Tag Filter Clause ONLY IF tagFilter is non-empty
    if (tagFilter.length > 0) {
        conditions.push('tag = ?');
        params.push(tagFilter);
    }
    
    // 4. Construct the WHERE clause if any conditions exist
    if (conditions.length > 0) {
        whereClause = ' WHERE ' + conditions.join(' AND ');
    }

    try {
        // --- Query 1: Get Total Count ---
        const countSql = `SELECT COUNT(*) AS total_count FROM cats${whereClause}`;
        const [countRows] = await pool.execute(countSql, params);
        
        responseData.totalCount = countRows[0].total_count;
        responseData.totalPages = Math.ceil(responseData.totalCount / limit);

        // --- Query 2: Get Cats Data ---
        const catsSql = `SELECT * FROM cats${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`;
        
        // Add LIMIT and OFFSET to the parameters array
        const catsParams = [...params, limit, offset];

        const [catsRows] = await pool.execute(catsSql, catsParams);
        responseData.cats = catsRows;

        res.json(responseData);

    } catch (err) {
        console.error('--- SQL ERROR FETCHING CATS ---');
        console.error(`Error Message: ${err.message}`);
        return res.status(500).json({ error: 'Database error fetching cats.' });
    }
});

// public/script.js - New function to fetch and populate tags
async function fetchAndPopulateTags() {
    try {
        // You MUST create a simple backend route GET /tags to fetch unique tags.
        const response = await fetch('/tags');
        if (!response.ok) throw new Error('Failed to fetch tags.');
        const tags = await response.json(); 

        tagFilterSelect.innerHTML = '<option value="">-- Show All Tags --</option>'; // Reset
        
        tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.tag;
            option.textContent = tag.tag;
            tagFilterSelect.appendChild(option);
        });

        // Add event listener after populating
        tagFilterSelect.addEventListener('change', () => {
            currentTagFilter = tagFilterSelect.value;
            currentPage = 1; // Reset to first page on filter change
            fetchCats();
        });

    } catch (error) {
        console.error('Error fetching tags:', error);
    }
}

// C - CREATE (POST) a new cat (Handles Optional Image URL)
app.post('/cats', async (req, res) => {
    const { name, tag, descreption, img } = req.body; // Extract img here
    
    if (!name || !tag) {
        return res.status(400).json({ error: 'Name and Tag are required fields.' });
    }
    
    let imageUrl = img; // Start with the provided img URL

    try {
        // Only fetch a random image if NO URL was provided by the user
        if (!imageUrl || imageUrl.trim() === '') {
            const cataasBaseUrl = 'https://cataas.com/cat'; 
            const uniqueUrl = `${cataasBaseUrl}?_ts=${Date.now()}`;
            
            // Logic to fetch a random image from Cataas
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

        // Insert into database using the CONFIRMED spelling 'descreption'
        const sql = 'INSERT INTO cats (name, tag, descreption, img) VALUES (?, ?, ?, ?)';
        const [result] = await pool.execute(sql, [name, tag, descreption, imageUrl]);

        res.status(201).json({ message: 'Cat successfully created.', id: result.insertId });

    } catch (err) {
        console.error('Database insertion error or Image fetch error:', err);
        return res.status(500).json({ error: 'Error creating new cat or fetching image.' });
    }
});


// U - UPDATE (PUT) a cat by ID (Handles Image URL Update)
app.put('/cats/:id', async (req, res) => {
    const { id } = req.params;
    const { name, tag, descreption, img } = req.body; // Extract img here
    
    if (!name || !tag) {
        return res.status(400).json({ error: 'Name and Tag are required fields.' });
    }

    try {
        let sql;
        let params;
        
        // If the user provided a new image URL, update the 'img' column too
        if (img && img.trim() !== '') {
            sql = 'UPDATE cats SET name = ?, tag = ?, descreption = ?, img = ? WHERE id = ?';
            params = [name, tag, descreption, img, id];
        } else {
            // Otherwise, only update the text fields
            sql = 'UPDATE cats SET name = ?, tag = ?, descreption = ? WHERE id = ?';
            params = [name, tag, descreption, id];
        }

        const [result] = await pool.execute(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cat not found.' });
        }

        res.json({ message: 'Cat updated successfully.' });

    } catch (err) {
        console.error('Database update error:', err);
        res.status(500).json({ error: 'Error updating cat.' });
    }
});


// D - DELETE (DELETE) a cat by ID
app.delete('/cats/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const sql = 'DELETE FROM cats WHERE id = ?';
        const [result] = await pool.execute(sql, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cat not found.' });
        }

        res.json({ message: 'Cat deleted successfully.' });

    } catch (err) {
        console.error('Database delete error:', err);
        res.status(500).json({ error: 'Error deleting cat.' });
    }
});


// --- Server Start ---
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});