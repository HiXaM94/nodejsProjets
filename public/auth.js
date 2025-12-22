// Shared Authentication JavaScript
// This file handles login, registration, and session management

let currentUser = null;

// Check authentication status on page load
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();

        if (data.authenticated) {
            currentUser = data.user;
            updateNavForUser(data.user);
        } else {
            updateNavForGuest();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        updateNavForGuest();
    }
}

// Update navigation for authenticated user
function updateNavForUser(user) {
    const navAuth = document.getElementById('navAuth');
    if (!navAuth) return;

    navAuth.innerHTML = `
        <div class="user-display">
            <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
            <span class="username">${user.username}</span>
        </div>
        <button id="logoutBtn" class="btn btn-outline">Logout</button>
    `;

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Update navigation for guest user
function updateNavForGuest() {
    const navAuth = document.getElementById('navAuth');
    if (!navAuth) return;

    navAuth.innerHTML = `
        <button id="loginBtn" class="btn btn-outline">Login</button>
        <button id="registerBtn" class="btn btn-primary">Register</button>
    `;

    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => openAuthModal('login'));
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', () => openAuthModal('register'));
    }
}

// Open authentication modal
function openAuthModal(mode = 'login') {
    const authModal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');

    if (!authModal) return;

    authModal.style.display = 'block';

    if (mode === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        showLoginBtn.classList.add('active');
        showRegisterBtn.classList.remove('active');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        showLoginBtn.classList.remove('active');
        showRegisterBtn.classList.add('active');
    }
}

// Close authentication modal
function closeAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.style.display = 'none';
    }
}

// For opening register modal from other pages
function openRegisterModal() {
    openAuthModal('register');
}

// Handle registration
async function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const messageEl = document.getElementById('registerMessage');

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            messageEl.textContent = data.message;
            messageEl.className = 'message success';

            // Clear form
            document.getElementById('registerForm').reset();

            // Switch to login form after 2 seconds
            setTimeout(() => {
                openAuthModal('login');
                messageEl.textContent = '';
            }, 2000);
        } else {
            messageEl.textContent = data.error || 'Registration failed';
            messageEl.className = 'message error';
        }
    } catch (error) {
        messageEl.textContent = 'Network error. Please try again.';
        messageEl.className = 'message error';
    }
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const messageEl = document.getElementById('loginMessage');

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            messageEl.textContent = data.message;
            messageEl.className = 'message success';

            currentUser = data.user;

            // Clear form
            document.getElementById('loginForm').reset();

            // Update UI
            setTimeout(() => {
                closeAuthModal();
                updateNavForUser(data.user);
                messageEl.textContent = '';

                // Reload if on home page to show "Add Cat" option
                if (window.location.pathname === '/') {
                    window.location.reload();
                }
            }, 1000);
        } else {
            messageEl.textContent = data.error || 'Login failed';
            messageEl.className = 'message error';
        }
    } catch (error) {
        messageEl.textContent = 'Network error. Please try again.';
        messageEl.className = 'message error';
    }
}

// Handle logout
async function handleLogout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });

        if (response.ok) {
            currentUser = null;
            updateNavForGuest();

            // Redirect to home if on a protected page
            if (window.location.pathname !== '/' && window.location.pathname !== '/about' && window.location.pathname !== '/contact') {
                window.location.href = '/';
            } else if (window.location.pathname === '/') {
                window.location.reload();
            }
        }
    } catch (error) {
        console.error('Logout error:', error);
        Popup.error('Error logging out. Please try again.');
    }
}

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();

    // Set up auth toggle buttons
    const showLoginBtn = document.getElementById('showLoginBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');

    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => openAuthModal('login'));
    }

    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', () => openAuthModal('register'));
    }

    // Set up form submissions
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Close modal when clicking outside
    const authModal = document.getElementById('authModal');
    if (authModal) {
        window.addEventListener('click', (event) => {
            if (event.target === authModal) {
                closeAuthModal();
            }
        });
    }
});
