// public/script.js

const API_URL = 'http://localhost:3000/cats';
const gallery = document.getElementById('cats-gallery');
const form = document.getElementById('cat-form');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');

// --- 1. Fetch and Render All Cats (READ Operation) ---
async function fetchCats() {
    try {
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) loadingMessage.style.display = 'block';

        gallery.innerHTML = ''; 
        
        const response = await fetch(API_URL);
        const cats = await response.json();
        
        if (loadingMessage) loadingMessage.style.display = 'none';

        if (cats.length === 0) {
            gallery.innerHTML = '<p>No cats found in the database. Add one!</p>';
            return;
        }

        cats.forEach(cat => {
            const card = createCatCard(cat);
            gallery.appendChild(card);
        });

    } catch (error) {
        console.error('Error fetching cats:', error);
        gallery.innerHTML = '<p>Failed to load data. Ensure Node.js server is running!</p>';
    }
}

function createCatCard(cat) {
    const card = document.createElement('div');
    card.className = 'cat-card';
    
    // Determine image path (Assuming images are in /public/images/)
    // Fallback to a placeholder if the img field is an external URL or just the filename
    const imagePath = cat.img.startsWith('http') ? cat.img : `/images/${cat.img}`; 

    // --- UPDATED HTML STRUCTURE TO MATCH SCREENSHOT ---
    card.innerHTML = `
        <img src="${imagePath}" alt="${cat.name}" onerror="this.onerror=null;this.src='https://via.placeholder.com/250x150?text=No+Image';">
        <div class="cat-info">
            <h3>${cat.name}</h3>
            <p>${cat.descreption}</p>
            <div class="tag-box">${cat.tag}</div>
            <div class="actions">
                <button class="edit-btn" onclick="openEditModal(${cat.id}, '${cat.name.replace(/'/g, "\\'")}', '${cat.tag.replace(/'/g, "\\'")}', '${cat.descreption.replace(/'/g, "\\'")}', '${cat.img.replace(/'/g, "\\'")}')">Edit</button>
                <button class="delete-btn" onclick="deleteCat(${cat.id})">Delete</button>
            </div>
        </div>
    `;
    return card;
}


// --- 2. Add/Edit Handlers (CREATE & UPDATE Operations) ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const catId = document.getElementById('cat-id').value;
    const method = catId ? 'PUT' : 'POST'; 
    const url = catId ? `${API_URL}/${catId}` : API_URL;
    
    const data = {
        name: document.getElementById('name').value,
        tag: document.getElementById('tag').value,
        descreption: document.getElementById('descreption').value,
        img: document.getElementById('img').value
    };

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        closeModal();
        fetchCats(); 

    } catch (error) {
        console.error(`Error ${method}ing cat:`, error);
        alert(`Failed to ${method} cat. Check server console.`);
    }
});


// Functions to open and close the modal (no change)
function openAddModal() {
    modalTitle.textContent = 'Add (Calen-g000)/cats';
    document.getElementById('cat-id').value = '';
    form.reset(); 
    modal.style.display = 'block';
}

function openEditModal(id, name, tag, desc, img) {
    modalTitle.textContent = 'Edit Cat';
    
    document.getElementById('cat-id').value = id;
    document.getElementById('name').value = name;
    document.getElementById('tag').value = tag;
    document.getElementById('descreption').value = desc;
    document.getElementById('img').value = img;
    
    modal.style.display = 'block';
}

function closeModal() {
    modal.style.display = 'none';
}


// --- 3. Delete Handler (DELETE Operation) ---
async function deleteCat(id) {
    if (!confirm(`Are you sure you want to delete Cat ID ${id}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        fetchCats(); 

    } catch (error) {
        console.error('Error deleting cat:', error);
        alert('Failed to delete cat. Check server console.');
    }
}


// Initialize the application by fetching data when the page loads
fetchCats();