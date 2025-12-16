# Cats Gallery - Authentication & Authorization Setup

## Overview
This is a complete Node.js web application with user authentication and authorization. Users can register, login, browse cat photos, and authenticated users can add, edit, and delete their own cats.

## Features

### Navigation
- **Modern Navigation Bar** with Home, About, and Contact pages
- **Responsive Design** that works on all devices
- **Dynamic User Menu** showing login/register or user profile

### Authentication & Authorization
- **User Registration** with password hashing (bcrypt)
- **User Login** with session management
- **Protected Routes** - Only authenticated users can add/edit/delete cats
- **Session Persistence** - Users stay logged in across page refreshes

### Pages
1. **Home** - Browse and search cat gallery
2. **About** - Learn about the application
3. **Contact** - Send messages (stored in database)

## Setup Instructions

### 1. Database Setup

First, you need to create the required database tables. Run the following SQL in your MySQL:

```sql
-- Use your existing database
USE nodejsproj_db;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    INDEX idx_username (username)
);

-- Add user_id column to cats table (if it doesn't exist)
ALTER TABLE cats 
ADD COLUMN user_id INT,
ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    subject VARCHAR(200),
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at)
);
```

**OR** run the provided SQL file:
```bash
mysql -u root -p nodejsproj_db < database_setup.sql
```

### 2. Install Dependencies

All required dependencies are already in package.json. But if needed:

```bash
npm install
```

### 3. Start the Server

```bash
npm start
```

The server will run at: **http://localhost:3000**

## Usage Guide

### For Guests (Not Logged In)
- Browse cat gallery
- Search and filter cats
- View About and Contact pages
- Register for an account

### For Authenticated Users
- All guest features, plus:
- Add new cat photos
- Edit your own cats
- Delete your own cats

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/status` - Check authentication status

### Cats (Public)
- `GET /api/cats` - Get all cats (with pagination, search, filter)
- `GET /api/tags` - Get all unique tags

### Cats (Protected - Requires Auth)
- `POST /api/cats` - Create new cat
- `PUT /api/cats/:id` - Update cat
- `DELETE /api/cats/:id` - Delete cat

### Contact
- `POST /api/contact` - Submit contact form

### Pages
- `GET /` - Home page
- `GET /about` - About page
- `GET /contact` - Contact page

## Security Features

1. **Password Hashing** - Bcrypt with 10 salt rounds
2. **Session Management** - Secure HTTP-only cookies
3. **CSRF Protection** - Session-based
4. **SQL Injection Protection** - Prepared statements
5. **Authorization** - Users can only modify their own cats

## File Structure

```
project_nodejs/
├── app.js                  # Main server file
├── package.json            # Dependencies
├── database_setup.sql      # Database schema
├── public/
│   ├── index.html         # Home page
│   ├── about.html         # About page
│   ├── contact.html       # Contact page
│   ├── style.css          # Modern CSS styles
│   ├── script.js          # Main gallery + auth logic
│   ├── auth.js            # Shared auth functions
│   └── contact.js         # Contact form handler
```

## Customization

### Change Session Secret
In `app.js`, line 29, change the session secret:
```javascript
secret: 'your-secret-key-change-this-in-production'
```

### Change Database Connection
In `app.js`, lines 14-22, update database credentials:
```javascript
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'your_password',
    database: 'nodejsproj_db'
});
```

### Styling
All styles are in `public/style.css`. The design uses:
- CSS variables for easy color customization
- Modern gradients and animations
- Responsive grid layouts
- Inter font family

## Troubleshooting

### Database Connection Error
- Verify MySQL is running
- Check database credentials in `app.js`
- Ensure database `nodejsproj_db` exists

### Session Not Persisting
- Check that cookies are enabled in browser
- Verify session secret is set in `app.js`

### Can't Add/Edit/Delete Cats
- Make sure you're logged in
- Check browser console for errors
- Verify database tables are created correctly

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MySQL (with mysql2)
- **Authentication**: bcrypt, express-session
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Fonts**: Google Fonts (Inter)

## Next Steps

Consider adding:
- Email verification for registration
- Password reset functionality
- Profile page for users
- Image upload instead of URLs
- Admin dashboard
- Comments on cat photos
- Like/favorite system

---

**Enjoy your Cats Gallery!** 🐱
