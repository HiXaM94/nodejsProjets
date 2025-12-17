// Main Gallery Script with Authentication Integration

// Global state variables
let currentPage = 1;
let currentSearch = '';
let currentTagFilter = '';
let currentUser = null;
const limit = 8;
let searchTimeout;

// DOM Elements
const gallery = document.getElementById('gallery');
const modal = document.getElementById('catModal');
const authModal = document.getElementById('authModal');
const catForm = document.getElementById('catForm');
const modalTitle = document.getElementById('modalTitle');
const searchInput = document.getElementById('searchInput');
const tagFilterSelect = document.getElementById('tagFilterSelect');
const catImgUrlInput = document.getElementById('catImgUrl');

// ===== AUTHENTICATION =====

// Check authentication status
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();

        if (data.authenticated) {
            currentUser = data.user;
            updateNavForUser(data.user);
            showAddCatButton();
            return data.user;
        } else {
            updateNavForGuest();
            hideAddCatButton();
            return null;
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        updateNavForGuest();
        hideAddCatButton();
        return null;
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

// Update navigation for guest
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

// Show/hide Add Cat button based on authentication
function showAddCatButton() {
    const heroContent = document.querySelector('.hero-content');
    if (heroContent && !document.getElementById('addCatBtn')) {
        const addBtn = document.createElement('button');
        addBtn.id = 'addCatBtn';
        addBtn.className = 'btn btn-primary';
        addBtn.textContent = '+ Add Cat';
        addBtn.style.marginTop = '1.5rem';
        addBtn.addEventListener('click', openAddModal);
        heroContent.appendChild(addBtn);
    }
}

function hideAddCatButton() {
    const addBtn = document.getElementById('addCatBtn');
    if (addBtn) {
        addBtn.remove();
    }
}

// ===== MODAL FUNCTIONS =====

function openAuthModal(mode = 'login') {
    if (!authModal) return;

    authModal.style.display = 'block';

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const messageEls = document.querySelectorAll('.message');

    // Clear messages
    messageEls.forEach(el => {
        el.textContent = '';
        el.className = 'message';
    });

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

function closeAuthModal() {
    if (authModal) authModal.style.display = 'none';
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            messageEl.textContent = 'Login successful!';
            messageEl.className = 'message success';

            setTimeout(async () => {
                closeAuthModal();
                await checkAuthStatus(); // Update UI and wait for it

                // Reload data if on gallery page
                if (document.getElementById('gallery')) {
                    fetchCats();
                    if (tagFilterSelect) fetchAndPopulateTags();
                } else {
                    // Reload page if on other pages to update nav
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

// Handle register
async function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const messageEl = document.getElementById('registerMessage');

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            messageEl.textContent = 'Registration successful! Please login.';
            messageEl.className = 'message success';

            setTimeout(() => {
                openAuthModal('login');
            }, 1500);
        } else {
            messageEl.textContent = data.error || 'Registration failed';
            if (data.details) {
                messageEl.textContent += ` (${data.details})`;
            }
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
            hideAddCatButton();
            window.location.reload();
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('Error logging out. Please try again.');
    }
}

// ===== CAT GALLERY FUNCTIONS =====

// Fetch cats from API
async function fetchCats() {
    if (!gallery) return; // Safety check

    gallery.innerHTML = '<h2 style="text-align: center; padding: 3rem;">Loading cats...</h2>';
    const paginationDiv = document.getElementById('pagination');
    if (paginationDiv) paginationDiv.style.display = 'none';

    const url = `/api/cats?page=${currentPage}&limit=${limit}&search=${encodeURIComponent(currentSearch)}&tagFilter=${encodeURIComponent(currentTagFilter)}`;

    try {
        const response = await fetch(url);

        // Handle unauthorized access
        if (response.status === 401) {
            gallery.innerHTML = `
                <div style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 3rem; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">🔒</div>
                        <h2 style="color: #1f2937; margin-bottom: 1rem;">Authentication Required</h2>
                        <p style="color: #6b7280; margin-bottom: 2rem; font-size: 1.1rem;">
                            Please login to view the cat gallery. Only authenticated users can browse and manage cats.
                        </p>
                        <div style="display: flex; gap: 1rem; justify-content: center;">
                            <button onclick="openAuthModal('login')" class="btn btn-primary" style="padding: 1rem 2rem;">
                                Login
                            </button>
                            <button onclick="openAuthModal('register')" class="btn btn-outline" style="padding: 1rem 2rem;">
                                Register
                            </button>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        renderCats(data.cats);
        renderPagination(data.currentPage, data.totalPages, data.totalCount);

    } catch (error) {
        console.error('Fetch error:', error);
        gallery.innerHTML = `<div style="text-align: center; padding: 3rem; color: red;">
            <h2>Failed to load cats.</h2>
            <p>${error.message}</p>
        </div>`;
    }
}

// Fetch and populate tags
async function fetchAndPopulateTags() {
    if (!tagFilterSelect) return;

    try {
        const response = await fetch('/api/tags');
        if (!response.ok) return; // Silently fail if not authenticated
        const tags = await response.json();

        tagFilterSelect.innerHTML = '<option value="">-- Show All Tags --</option>';

        tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.tag;
            option.textContent = tag.tag;
            tagFilterSelect.appendChild(option);
        });

        if (currentTagFilter) {
            tagFilterSelect.value = currentTagFilter;
        }

    } catch (error) {
        console.error('Error fetching tags:', error);
    }
}

// Handle auto-search with debounce
function handleAutoSearch() {
    clearTimeout(searchTimeout);

    if (searchInput) {
        currentSearch = searchInput.value;
    } else {
        currentSearch = '';
    }

    searchTimeout = setTimeout(() => {
        currentPage = 1;
        fetchCats();
    }, 500);
}

// Render cat cards
function renderCats(cats) {
    if (!gallery) return;
    gallery.innerHTML = '';

    if (cats.length === 0) {
        gallery.innerHTML = `
            <div style="width: 100%; text-align: center; margin-top: 30px; grid-column: 1 / -1;">
                <h2>No cats found</h2>
                <p>Try adjusting your search or filter settings.</p>
            </div>
        `;
        return;
    }

    cats.forEach(cat => {
        const catCard = document.createElement('div');
        catCard.className = 'cat-card';
        catCard.setAttribute('data-id', cat.id);

        // Show actions only if user is logged in AND (is the owner OR cat has no owner)
        const canManage = currentUser && (!cat.user_id || cat.user_id === currentUser.id);

        catCard.innerHTML = `
            <img src="${cat.img}" alt="${cat.name}">
            <div class="cat-info">
                <h3>${cat.name}</h3>
                <div class="tag-box">${cat.tag}</div>
                
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem; font-size: 0.85rem; color: var(--text-medium);">
                    ${cat.age ? `<span style="background:#f3f4f6; padding:2px 8px; border-radius:12px;">🎂 ${cat.age}y</span>` : ''}
                    ${cat.gender ? `<span style="background:#f3f4f6; padding:2px 8px; border-radius:12px;">${cat.gender === 'Male' ? '♂️' : '♀️'} ${cat.gender}</span>` : ''}
                    ${cat.origin ? `<span style="background:#f3f4f6; padding:2px 8px; border-radius:12px;">🌍 ${cat.origin}</span>` : ''}
                </div>

                <p>${cat.descreption || 'No description provided.'}</p>
                ${canManage ? `
                <div class="actions">
                    <button class="edit-btn" data-id="${cat.id}">Edit</button>
                    <button class="delete-btn" data-id="${cat.id}">Delete</button>
                </div>
                ` : ''}
            </div>
        `;

        if (canManage) {
            catCard.querySelector('.edit-btn').addEventListener('click', () => openEditModal(cat));
            catCard.querySelector('.delete-btn').addEventListener('click', () => deleteCat(cat.id));
        }

        gallery.appendChild(catCard);
    });
}

// Render pagination controls
function renderPagination(page, totalPages, totalCount) {
    const paginationDiv = document.getElementById('pagination');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageInfo = document.getElementById('pageInfo');

    if (!paginationDiv || !prevBtn || !nextBtn || !pageInfo) return;

    if (totalCount === 0 || totalPages === 1) {
        paginationDiv.style.display = 'none';
        return;
    }

    paginationDiv.style.display = 'flex';

    pageInfo.textContent = `Page ${page} of ${totalPages} (${totalCount} cats)`;

    prevBtn.disabled = page === 1;
    nextBtn.disabled = page === totalPages;

    prevBtn.onclick = () => { currentPage--; fetchCats(); };
    nextBtn.onclick = () => { currentPage++; fetchCats(); };
}

// ===== CRUD OPERATIONS =====

// Save cat (create or update)
async function saveCat(event) {
    event.preventDefault();

    const id = document.getElementById('catId').value;
    const name = document.getElementById('catName').value;
    const tag = document.getElementById('catTag').value;
    const descreption = document.getElementById('catDescreption').value;
    const img = document.getElementById('catImgUrl').value;
    const age = document.getElementById('catAge').value;
    const origin = document.getElementById('catOrigin').value;
    const gender = document.getElementById('catGender').value;

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/cats/${id}` : '/api/cats';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, tag, descreption, img, age, origin, gender })
        });

        if (response.ok) {
            modal.style.display = 'none';
            fetchCats();
            fetchAndPopulateTags(); // Refresh tags in case a new one was added
        } else {
            const data = await response.json();
            alert(`Error: ${data.error || 'Failed to save cat'}\nDetails: ${data.details || ''}`);
        }
    } catch (error) {
        console.error('Error saving cat:', error);
        alert('Network error. Please try again.');
    }
}

// Delete cat
async function deleteCat(id) {
    if (!confirm('Are you sure you want to delete this cat?')) return;

    try {
        const response = await fetch(`/api/cats/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            fetchCats();
            fetchAndPopulateTags(); // Refresh tags
        } else {
            const data = await response.json().catch(() => ({}));
            alert(`Failed to delete cat: ${data.error || 'Unauthorized or server error'}`);
        }
    } catch (error) {
        console.error('Error deleting cat:', error);
        alert('An unexpected error occurred.');
    }
}

// Open Add Modal
function openAddModal() {
    if (!modal) return;
    modalTitle.textContent = 'Add New Cat';
    catForm.reset();
    document.getElementById('catId').value = '';
    modal.style.display = 'block';
}

// Open Edit Modal
function openEditModal(cat) {
    if (!modal) return;
    modalTitle.textContent = 'Edit Cat';

    document.getElementById('catId').value = cat.id;
    document.getElementById('catName').value = cat.name;
    document.getElementById('catTag').value = cat.tag;
    document.getElementById('catDescreption').value = cat.descreption;
    document.getElementById('catAge').value = cat.age || '';
    document.getElementById('catOrigin').value = cat.origin || '';
    document.getElementById('catGender').value = cat.gender || '';

    let imgUrl = cat.img;
    if (imgUrl && !imgUrl.includes('?')) {
        imgUrl += `?cache-buster=${Date.now()}`;
    }
    catImgUrlInput.value = imgUrl;

    modal.style.display = 'block';
}

// Close modal when clicking close button or outside
function setupModalCloseHandlers() {
    // Cat modal
    const closeBtn = modal ? modal.querySelector('.close-btn') : null;
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // Auth modal
    const authCloseBtn = authModal ? authModal.querySelector('.close-btn') : null;
    if (authCloseBtn) {
        authCloseBtn.addEventListener('click', closeAuthModal);
    }

    // Click outside to close
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
        if (event.target === authModal) {
            closeAuthModal();
        }
    });
}

// Ensure Schema (Auto-fix database)
async function ensureSchema() {
    try {
        console.log('Checking database schema...');
        await fetch('/api/update-schema');
        console.log('Database schema check complete.');
    } catch (e) {
        console.error('Schema check failed:', e);
    }
}

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Gallery initialized');

    // Auto-fix schema on load
    await ensureSchema();

    // Check authentication and WAIT for it
    await checkAuthStatus();

    // Setup event listeners
    if (catForm) catForm.addEventListener('submit', saveCat);
    if (searchInput) searchInput.addEventListener('keyup', handleAutoSearch);

    if (tagFilterSelect) {
        tagFilterSelect.addEventListener('change', () => {
            currentTagFilter = tagFilterSelect.value;
            currentPage = 1;
            fetchCats();
        });
    }

    // Setup auth toggle buttons
    const showLoginBtn = document.getElementById('showLoginBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');

    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => openAuthModal('login'));
    }

    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', () => openAuthModal('register'));
    }

    // Setup form submissions
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Setup modal close handlers
    setupModalCloseHandlers();

    // Fetch tags and cats (only if on gallery page)
    if (gallery) {
        if (tagFilterSelect) fetchAndPopulateTags();
        fetchCats();
    }

    // Contact Form Logic (Merged from contact.js)
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }

    console.log('All event listeners attached');
});

// Contact Form Handler
async function handleContactSubmit(event) {
    event.preventDefault();

    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const subject = document.getElementById('contactSubject').value;
    const message = document.getElementById('contactMessage').value;
    const messageEl = document.getElementById('contactFormMessage');

    // Basic validation
    if (!name || !email || !message) {
        messageEl.textContent = 'Please fill in all required fields.';
        messageEl.className = 'message error';
        return;
    }

    try {
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, subject, message })
        });

        const data = await response.json();

        if (response.ok) {
            messageEl.textContent = data.message;
            messageEl.className = 'message success';
            contactForm.reset();
        } else {
            messageEl.textContent = data.error || 'Failed to send message.';
            messageEl.className = 'message error';
        }
    } catch (error) {
        console.error('Contact error:', error);
        messageEl.textContent = 'Network error.';
        messageEl.className = 'message error';
    }
}