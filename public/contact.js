// Contact Page JavaScript

document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }
});

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

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        messageEl.textContent = 'Please enter a valid email address.';
        messageEl.className = 'message error';
        return;
    }

    try {
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, subject, message })
        });

        const data = await response.json();

        if (response.ok) {
            messageEl.textContent = data.message;
            messageEl.className = 'message success';

            // Clear form
            contactForm.reset();

            // Scroll to message
            messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            messageEl.textContent = data.error || 'Failed to send message. Please try again.';
            messageEl.className = 'message error';
        }
    } catch (error) {
        console.error('Contact form error:', error);
        messageEl.textContent = 'Network error. Please try again later.';
        messageEl.className = 'message error';
    }
}
