// Define global state variables for pagination and search
let currentPage = 1;
let currentSearch = '';
const limit = 8; // Number of cats to display per page (must match app.js)
let searchTimeout; // For auto-search debounce

// DOM Elements
const gallery = document.getElementById('gallery');
const modal = document.getElementById('catModal');
const catForm = document.getElementById('catForm');
const modalTitle = document.getElementById('modalTitle');
const searchInput = document.getElementById('searchInput');
const addCatBtn = document.getElementById('addCatBtn');
const catImgUrlInput = document.getElementById('catImgUrl'); 

// --- Main Data Fetching Function ---
async function fetchCats() {
    gallery.innerHTML = '<h2>Loading cats...</h2>';
    const paginationDiv = document.getElementById('pagination');
    if (paginationDiv) paginationDiv.style.display = 'none';

    // Construct the query URL
    const url = `/cats?page=${currentPage}&limit=${limit}&search=${encodeURIComponent(currentSearch)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json(); 

        renderCats(data.cats); 
        renderPagination(data.currentPage, data.totalPages, data.totalCount);

    } catch (error) {
        console.error('Fetch error:', error);
        gallery.innerHTML = '<h2>Failed to load cats. Check your server connection or console for errors.</h2>';
    }
}

// --- Debounce Function for Auto-Search ---
function handleAutoSearch() {
    clearTimeout(searchTimeout); // Clear the previous timeout
    searchTimeout = setTimeout(() => {
        const newSearchTerm = searchInput.value.trim();
        // Only run the search if the search term has actually changed
        if (newSearchTerm !== currentSearch) {
            currentSearch = newSearchTerm;
            currentPage = 1; 
            fetchCats();
        }
    }, 400); // 400ms delay for smooth typing experience
}

// --- Rendering and Pagination Functions ---

function renderCats(cats) {
    gallery.innerHTML = ''; 

    if (cats.length === 0) {
        gallery.innerHTML = `
            <div style="width: 100%; text-align: center; margin-top: 30px;">
                <h2>No cats found matching "${currentSearch}"</h2>
                <p>Try clearing your search or adding a new cat!</p>
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
                <div class="actions">
                    <button class="edit-btn" data-id="${cat.id}">Edit</button>
                    <button class="delete-btn" data-id="${cat.id}">Delete</button>
                </div>
            </div>
        `;

        catCard.querySelector('.edit-btn').addEventListener('click', () => openEditModal(cat));
        catCard.querySelector('.delete-btn').addEventListener('click', () => deleteCat(cat.id));

        gallery.appendChild(catCard);
    });
}

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

    pageInfo.textContent = `Page ${page} of ${totalPages} (${totalCount} total cats)`;

    prevBtn.disabled = page === 1;
    nextBtn.disabled = page === totalPages;
    
    prevBtn.onclick = () => { currentPage--; fetchCats(); };
    nextBtn.onclick = () => { currentPage++; fetchCats(); };
}


// --- CRUD Operations ---

async function saveCat(event) {
    event.preventDefault();

    const id = document.getElementById('catId').value;
    const name = document.getElementById('catName').value;
    const tag = document.getElementById('catTag').value;
    // IMPORTANT: Use the confirmed column name
    const descreption = document.getElementById('catDescreption').value; 
    const img = catImgUrlInput.value; 

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/cats/${id}` : '/cats';

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

        // Success: Close modal, reset form, and refresh
        modal.style.display = 'none';
        catForm.reset();
        
        // Reset state and reload data
        currentPage = 1; 
        currentSearch = '';
        searchInput.value = '';
        fetchCats(); 

    } catch (error) {
        console.error('Error saving cat:', error);
        alert(`Failed to save cat: ${error.message}`);
    }
}

async function deleteCat(id) {
    if (!confirm('Are you sure you want to delete this cat?')) {
        return;
    }

    try {
        const response = await fetch(`/cats/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.statusText}`);
        }

        // Success: Refresh the list
        fetchCats(); 

    } catch (error) {
        console.error('Error deleting cat:', error);
        alert(`Failed to delete cat: ${error.message}`);
    }
}


// --- Modal Handlers ---

function openAddModal() {
    modalTitle.textContent = 'Add New Cat';
    catForm.reset();
    document.getElementById('catId').value = '';
    catImgUrlInput.value = ''; // Ensure image input is clear
    modal.style.display = 'block';
}

function openEditModal(cat) {
    modalTitle.textContent = `Edit ${cat.name}`;
    document.getElementById('catId').value = cat.id;
    document.getElementById('catName').value = cat.name;
    document.getElementById('catTag').value = cat.tag;
    document.getElementById('catDescreption').value = cat.descreption;
    
    // Cache Busting: Ensures browser fetches a potentially new Cataas image
    let imgUrl = cat.img;
    if (imgUrl && !imgUrl.includes('?')) {
        imgUrl += `?cache-buster=${Date.now()}`;
    }
    catImgUrlInput.value = imgUrl; 
    
    modal.style.display = 'block';
}


// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Modal & Form Setup
    if (addCatBtn) addCatBtn.addEventListener('click', openAddModal);
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    if (catForm) catForm.addEventListener('submit', saveCat);

    // AUTO-SEARCH SETUP
    if (searchInput) searchInput.addEventListener('keyup', handleAutoSearch);
    
    // Initial data load
    fetchCats(); 
});