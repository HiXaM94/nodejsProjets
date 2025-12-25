# JWT Authentication Implementation

## Overview

This project has been migrated from **session-based authentication** to **JWT (JSON Web Token) authentication**. JWT provides better scalability, stateless authentication, and is ideal for modern API architectures.

## What Changed?

### Backend Changes

1. **Removed Dependencies:**
   - `express-session` - No longer needed
   - `express-mysql-session` - Session store removed

2. **Added Dependencies:**
   - `jsonwebtoken` - For creating and verifying JWT tokens

3. **Authentication Flow:**
   - **Before:** Server stored session data in MySQL
   - **After:** Server issues JWT tokens, client stores and sends them

### Key Features

✅ **Stateless Authentication** - No server-side session storage  
✅ **Scalable** - Works across multiple servers without session sharing  
✅ **24-hour Token Expiration** - Configurable via `JWT_EXPIRES_IN`  
✅ **Secure** - Uses HS256 algorithm with secret key  
✅ **CORS Ready** - Includes CORS headers for cross-origin requests  

---

## API Changes

### 1. Registration (`POST /api/auth/register`)

**Request:**
```json
{
  "username": "john_doe",
  "password": "securePassword123",
  "email": "john@example.com"
}
```

**Response (NEW - includes token):**
```json
{
  "message": "User registered successfully!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "john_doe"
  }
}
```

### 2. Login (`POST /api/auth/login`)

**Request:**
```json
{
  "username": "john_doe",
  "password": "securePassword123"
}
```

**Response (NEW - includes token):**
```json
{
  "message": "Login successful!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "john_doe"
  }
}
```

### 3. Logout (`POST /api/auth/logout`)

**Response:**
```json
{
  "message": "Logout successful! Please remove the token from client."
}
```

**Note:** With JWT, logout is handled client-side by removing the token from storage.

### 4. Check Auth Status (`GET /api/auth/status`)

**Headers Required:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "username": "john_doe"
  }
}
```

### 5. Verify Token (`POST /api/auth/verify`) - NEW ENDPOINT

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "username": "john_doe"
  }
}
```

---

## Frontend Integration

### Storing the Token

After login/register, store the token in `localStorage`:

```javascript
// After successful login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});

const data = await response.json();

if (data.token) {
  localStorage.setItem('authToken', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
}
```

### Sending Token with Requests

Include the token in the `Authorization` header for all protected routes:

```javascript
const token = localStorage.getItem('authToken');

const response = await fetch('/api/cats', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Logout

Remove the token from storage:

```javascript
async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  window.location.href = '/';
}
```

### Checking Authentication Status

```javascript
async function checkAuth() {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    return { authenticated: false };
  }
  
  try {
    const response = await fetch('/api/auth/status', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      return await response.json();
    } else {
      // Token invalid or expired
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      return { authenticated: false };
    }
  } catch (error) {
    return { authenticated: false };
  }
}
```

---

## Environment Variables

### Required for Production

Add to your `.env` file or hosting platform:

```bash
# JWT Secret Key (MUST be changed in production!)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Node Environment
NODE_ENV=production

# Database Configuration
JAWSDB_URL=mysql://user:password@host:port/database
```

### Generating a Secure JWT Secret

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 64
```

---

## Security Best Practices

### ✅ DO:

1. **Use HTTPS in production** - JWT tokens should only be transmitted over secure connections
2. **Set a strong JWT_SECRET** - Use at least 32 characters, randomly generated
3. **Set appropriate token expiration** - Default is 24 hours, adjust based on your needs
4. **Validate tokens on every request** - The middleware does this automatically
5. **Store tokens securely** - Use `localStorage` or `sessionStorage`, never in cookies without httpOnly flag

### ❌ DON'T:

1. **Don't expose JWT_SECRET** - Never commit it to version control
2. **Don't store sensitive data in tokens** - Tokens are base64 encoded, not encrypted
3. **Don't use the default secret in production** - Always set a custom `JWT_SECRET`
4. **Don't trust expired tokens** - The middleware rejects them automatically

---

## Token Expiration & Refresh

### Current Implementation

- Tokens expire after **24 hours** (configurable)
- Users must log in again after expiration
- No refresh token mechanism (can be added if needed)

### Adding Refresh Tokens (Future Enhancement)

If you need longer sessions, consider implementing refresh tokens:

1. Issue both access token (short-lived) and refresh token (long-lived)
2. Store refresh token in httpOnly cookie
3. Create `/api/auth/refresh` endpoint to issue new access tokens
4. Automatically refresh tokens before expiration

---

## Testing the API

### Using cURL

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

**Access Protected Route:**
```bash
curl -X GET http://localhost:3000/api/cats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using Postman

1. **Login/Register:**
   - Method: POST
   - URL: `http://localhost:3000/api/auth/login`
   - Body: JSON with username and password
   - Copy the `token` from response

2. **Access Protected Routes:**
   - Method: GET/POST/PUT/DELETE
   - URL: `http://localhost:3000/api/cats`
   - Headers: Add `Authorization` with value `Bearer YOUR_TOKEN`

---

## Migration Checklist

If you're updating an existing frontend:

- [ ] Update login/register handlers to store JWT token
- [ ] Add `Authorization` header to all API requests
- [ ] Update logout to remove token from localStorage
- [ ] Update auth status checks to use token
- [ ] Remove any session-related code
- [ ] Test all protected routes with token
- [ ] Handle token expiration gracefully
- [ ] Update error handling for 401 responses

---

## Troubleshooting

### "Unauthorized. No token provided."

**Cause:** Missing or malformed Authorization header  
**Solution:** Ensure you're sending `Authorization: Bearer <token>`

### "Unauthorized. Invalid or expired token."

**Cause:** Token is expired or invalid  
**Solution:** Log in again to get a new token

### CORS Errors

**Cause:** Cross-origin requests without proper headers  
**Solution:** CORS headers are already configured in `app.js`

### Token Not Working After Server Restart

**Cause:** JWT_SECRET changed or not set consistently  
**Solution:** Set `JWT_SECRET` in environment variables

---

## Additional Resources

- [JWT.io](https://jwt.io/) - Decode and verify JWT tokens
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)

---

## Support

For questions or issues, refer to:
- `app.js` - Main application file with JWT implementation
- `package.json` - Dependencies and scripts
- This documentation file

**Last Updated:** December 23, 2025
