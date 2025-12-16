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
        } else {
            updateNavForGuest();
            hideAddCatButton();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        updateNavForGuest();
        hideAddCatButton();
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

// Open authentication modal
function openAuthModal(mode = 'login') {
    if (!authModal) return;

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');

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
    if (authModal) {
        authModal.style.display = 'none';
    }
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            messageEl.textContent = data.message;
            messageEl.className = 'message success';
            document.getElementById('registerForm').reset();

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            messageEl.textContent = data.message;
            messageEl.className = 'message success';
            currentUser = data.user;
            document.getElementById('loginForm').reset();

            setTimeout(() => {
                closeAuthModal();
                updateNavForUser(data.user);
                showAddCatButton();
                messageEl.textContent = '';
                fetchCats(); // Reload cats after login
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
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        renderCats(data.cats);
        renderPagination(data.currentPage, data.totalPages, data.totalCount);

    } catch (error) {
        console.error('Fetch error:', error);
        gallery.innerHTML = '<h2 style="text-align: center; padding: 3rem;">Failed to load cats. Please try again.</h2>';
    }
}

// Fetch and populate tags
async function fetchAndPopulateTags() {
    try {
        const response = await fetch('/api/tags');
        if (!response.ok) return; // Silently fail if not authenticated
        const tags = await response.json();

        if (tagFilterSelect) {
            tagFilterSelect.innerHTML = '<option value="">-- Show All Tags --</option>';

            tags.forEach(tag => {
                const option = document.createElement('option');
                option.value = tag.tag;
                option.textContent = tag.tag;
                tagFilterSelect.appendChild(option);
            });

            tagFilterSelect.addEventListener('change', () => {
                currentTagFilter = tagFilterSelect.value;
                currentPage = 1;
                fetchCats();
            });
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

        catCard.innerHTML = `
            <img src="${cat.img}" alt="${cat.name}">
            <div class="cat-info">
                <h3>${cat.name}</h3>
                <div class="tag-box">${cat.tag}</div>
                <p>${cat.descreption || 'No description provided.'}</p>
                ${currentUser ? `
                <div class="actions">
                    <button class="edit-btn" data-id="${cat.id}">Edit</button>
                    <button class="delete-btn" data-id="${cat.id}">Delete</button>
                </div>
                ` : ''}
            </div>
        `;

        if (currentUser) {
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

    if (!currentUser) {
        alert('You must be logged in to perform this action.');
        openAuthModal('login');
        return;
    }

    const id = document.getElementById('catId').value;
    const name = document.getElementById('catName').value;
    const tag = document.getElementById('catTag').value;
    const descreption = document.getElementById('catDescreption').value;
    const img = catImgUrlInput.value;

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/cats/${id}` : '/api/cats';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, tag, descreption, img })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.statusText}`);
        }

        modal.style.display = 'none';
        catForm.reset();

        currentPage = 1;
        currentSearch = '';
        if (searchInput) searchInput.value = '';
        fetchCats();

    } catch (error) {
        console.error('Error saving cat:', error);
        alert(`Failed to save cat: ${error.message}`);
    }
}

// Delete cat
async function deleteCat(id) {
    if (!currentUser) {
        alert('You must be logged in to perform this action.');
        openAuthModal('login');
        return;
    }

    if (!confirm('Are you sure you want to delete this cat?')) {
        return;
    }

    try {
        const response = await fetch(`/api/cats/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.statusText}`);
        }

        fetchCats();

    } catch (error) {
        console.error('Error deleting cat:', error);
        alert(`Failed to delete cat: ${error.message}`);
    }
}

// ===== MODAL HANDLERS =====

// Open add modal
function openAddModal() {
    if (!currentUser) {
        alert('Please login to add cats.');
        openAuthModal('login');
        return;
    }

    modalTitle.textContent = 'Add New Cat';
    catForm.reset();
    document.getElementById('catId').value = '';
    catImgUrlInput.value = '';
    modal.style.display = 'block';
}

// Open edit modal
function openEditModal(cat) {
    if (!currentUser) {
        alert('Please login to edit cats.');
        openAuthModal('login');
        return;
    }

    modalTitle.textContent = `Edit ${cat.name}`;
    document.getElementById('catId').value = cat.id;
    document.getElementById('catName').value = cat.name;
    document.getElementById('catTag').value = cat.tag;
    document.getElementById('catDescreption').value = cat.descreption;

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

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', () => {
    console.log('Gallery initialized');

    // Check authentication
    checkAuthStatus();

    // Setup event listeners
    if (catForm) catForm.addEventListener('submit', saveCat);
    if (searchInput) searchInput.addEventListener('keyup', handleAutoSearch);

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

    // Fetch tags and cats
    if (tagFilterSelect) fetchAndPopulateTags();
    fetchCats();

    console.log('All event listeners attached');
});