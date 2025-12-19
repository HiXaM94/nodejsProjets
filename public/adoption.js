// ===== ADOPTION FUNCTIONS =====

// Fetch adoption status for a cat
async function fetchAdoptionStatus(catId, adoptBtn) {
    try {
        const response = await fetch(`/api/adoptions/cat/${catId}`);
        if (!response.ok) return;

        const data = await response.json();
        const countSpan = adoptBtn.querySelector('.adoption-count');
        const textSpan = adoptBtn.querySelector('.adopt-text');

        if (countSpan) countSpan.textContent = data.count;

        if (data.userAdopted) {
            adoptBtn.classList.add('adopted');
            if (textSpan) textSpan.textContent = 'Adopted';
        } else {
            adoptBtn.classList.remove('adopted');
            if (textSpan) textSpan.textContent = 'Adopt';
        }
    } catch (error) {
        console.error('Error fetching adoption status:', error);
    }
}

// Handle adopt button click
async function handleAdoptClick(catId, adoptBtn) {
    const isAdopted = adoptBtn.classList.contains('adopted');

    try {
        if (isAdopted) {
            // Unadopt
            const response = await fetch(`/api/adoptions/${catId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                adoptBtn.classList.remove('adopted');
                const textSpan = adoptBtn.querySelector('.adopt-text');
                if (textSpan) textSpan.textContent = 'Adopt';

                // Update count
                fetchAdoptionStatus(catId, adoptBtn);
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to unadopt cat');
            }
        } else {
            // Adopt
            const response = await fetch('/api/adoptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cat_id: catId })
            });

            if (response.ok) {
                adoptBtn.classList.add('adopted');
                const textSpan = adoptBtn.querySelector('.adopt-text');
                if (textSpan) textSpan.textContent = 'Adopted';

                // Update count
                fetchAdoptionStatus(catId, adoptBtn);

                // Show success message
                showAdoptionMessage('Cat adopted successfully! 🎉');
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to adopt cat');
            }
        }
    } catch (error) {
        console.error('Error handling adoption:', error);
        alert('Network error. Please try again.');
    }
}

// Show adoption success message
function showAdoptionMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideInRight 0.3s ease;
        font-weight: 600;
    `;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

// Open adoptions modal
async function openAdoptionsModal() {
    const modal = document.getElementById('adoptionsModal');
    const adoptionsList = document.getElementById('adoptionsList');

    if (!modal || !adoptionsList) return;

    modal.style.display = 'block';
    adoptionsList.innerHTML = '<p style="text-align: center; padding: 2rem;">Loading...</p>';

    try {
        const response = await fetch('/api/adoptions');
        if (!response.ok) throw new Error('Failed to fetch adoptions');

        const data = await response.json();

        if (data.adoptions.length === 0) {
            adoptionsList.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">😿</div>
                    <h3 style="color: var(--text-dark); margin-bottom: 0.5rem;">No Adopted Cats Yet</h3>
                    <p style="color: var(--text-medium);">Start adopting cats to see them here!</p>
                </div>
            `;
            return;
        }

        adoptionsList.innerHTML = data.adoptions.map(cat => `
            <div class="adopted-cat-item">
                <img src="${cat.img}" alt="${cat.name}" class="adopted-cat-img">
                <div class="adopted-cat-info">
                    <h4>${cat.name}</h4>
                    <p><strong>Tag:</strong> ${cat.tag}</p>
                    ${cat.age ? `<p><strong>Age:</strong> ${cat.age} years</p>` : ''}
                    ${cat.origin ? `<p><strong>Origin:</strong> ${cat.origin}</p>` : ''}
                    <p style="font-size: 0.8rem; color: #9ca3af;">
                        <strong>Adopted:</strong> ${new Date(cat.adopted_at).toLocaleDateString()}
                    </p>
                </div>
                <button class="unadopt-btn" data-cat-id="${cat.id}">
                    Remove
                </button>
            </div>
        `).join('');

        // Add unadopt listeners
        adoptionsList.querySelectorAll('.unadopt-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const catId = e.target.dataset.catId;
                if (confirm('Are you sure you want to remove this cat from your adopted list?')) {
                    await handleUnadopt(catId);
                    openAdoptionsModal(); // Refresh the list
                    fetchCats(); // Refresh the gallery to update buttons
                }
            });
        });

        // Refresh icons
        if (window.lucide) {
            window.lucide.createIcons();
        }

    } catch (error) {
        console.error('Error fetching adoptions:', error);
        adoptionsList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: red;">
                <p>Failed to load adopted cats. Please try again.</p>
            </div>
        `;
    }
}

// Close adoptions modal
function closeAdoptionsModal() {
    const modal = document.getElementById('adoptionsModal');
    if (modal) modal.style.display = 'none';
}

// Handle unadopt from modal
async function handleUnadopt(catId) {
    try {
        const response = await fetch(`/api/adoptions/${catId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const data = await response.json();
            alert(data.error || 'Failed to remove cat');
        }
    } catch (error) {
        console.error('Error removing cat:', error);
        alert('Network error. Please try again.');
    }
}

// Add CSS animation for messages
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
