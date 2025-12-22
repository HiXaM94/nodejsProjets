/**
 * Popup Manager for Custom Alerts, Confirmations, and Toasts
 * Replaces standard browser alerts with a well-designed UI.
 */
class Popup {
    static init() {
        if (!document.getElementById('popup-container')) {
            const container = document.createElement('div');
            container.id = 'popup-container';
            container.className = 'custom-popup-overlay';
            container.style.display = 'none';
            container.innerHTML = `
                <div class="custom-popup">
                    <div class="popup-icon" id="popup-icon"></div>
                    <h3 id="popup-title"></h3>
                    <p id="popup-message"></p>
                    <div class="popup-actions" id="popup-actions"></div>
                </div>
            `;
            document.body.appendChild(container);
        }

        if (!document.getElementById('toast-container')) {
            const toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'custom-toast-container';
            document.body.appendChild(toastContainer);
        }
    }

    /**
     * Show a modal popup
     * @param {string} message - Message to display
     * @param {string} type - 'alert' or 'confirm' or 'error' or 'success'
     * @param {string} title - Title of the popup
     * @returns {Promise<boolean>} - Resolves to true if confirmed, false otherwise
     */
    static show(message, type = 'alert', title = '') {
        this.init();
        return new Promise((resolve) => {
            const container = document.getElementById('popup-container');
            const iconEl = document.getElementById('popup-icon');
            const titleEl = document.getElementById('popup-title');
            const messageEl = document.getElementById('popup-message');
            const actionsEl = document.getElementById('popup-actions');

            // Set Content
            titleEl.textContent = title || (type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Alert');
            messageEl.textContent = message;

            // Set Icon
            let iconHtml = '';
            if (type === 'error' || type === 'alert') {
                iconHtml = `<div class="icon-circle error"><i data-lucide="alert-circle"></i></div>`;
            } else if (type === 'success') {
                iconHtml = `<div class="icon-circle success"><i data-lucide="check-circle"></i></div>`;
            } else if (type === 'confirm') {
                iconHtml = `<div class="icon-circle warning"><i data-lucide="help-circle"></i></div>`;
            }
            iconEl.innerHTML = iconHtml;

            // Set Actions
            actionsEl.innerHTML = '';
            
            if (type === 'confirm') {
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'btn btn-outline';
                cancelBtn.textContent = 'Cancel';
                cancelBtn.onclick = () => {
                    this.close();
                    resolve(false);
                };

                const confirmBtn = document.createElement('button');
                confirmBtn.className = 'btn btn-primary';
                confirmBtn.textContent = 'Confirm';
                confirmBtn.onclick = () => {
                    this.close();
                    resolve(true);
                };

                actionsEl.appendChild(cancelBtn);
                actionsEl.appendChild(confirmBtn);
            } else {
                const okBtn = document.createElement('button');
                okBtn.className = 'btn btn-primary full-width';
                okBtn.textContent = 'OK';
                okBtn.onclick = () => {
                    this.close();
                    resolve(true);
                };
                actionsEl.appendChild(okBtn);
            }

            // Show
            container.style.display = 'flex';
            
            // Re-render icons
            if (window.lucide) {
                window.lucide.createIcons();
            }
        });
    }

    static close() {
        const container = document.getElementById('popup-container');
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * Show an alert popup (replaces window.alert)
     */
    static async alert(message, title = 'Alert') {
        return this.show(message, 'alert', title);
    }

    /**
     * Show a confirmation popup (replaces window.confirm)
     */
    static async confirm(message, title = 'Confirm Action') {
        return this.show(message, 'confirm', title);
    }

    /**
     * Show an error popup
     */
    static async error(message, title = 'Error') {
        return this.show(message, 'error', title);
    }

    /**
     * Show a transient toast notification
     * @param {string} message 
     * @param {string} type - 'success', 'error', 'info'
     */
    static toast(message, type = 'success') {
        this.init();
        const container = document.getElementById('toast-container');
        
        const toast = document.createElement('div');
        toast.className = `custom-toast ${type}`;
        
        let icon = '';
        if (type === 'success') icon = '<i data-lucide="check"></i>';
        if (type === 'error') icon = '<i data-lucide="x"></i>';
        if (type === 'info') icon = '<i data-lucide="info"></i>';

        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${icon}</span>
                <span class="toast-message">${message}</span>
            </div>
            <button class="toast-close">&times;</button>
        `;

        container.appendChild(toast);

        // Re-render icons
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Close button
        toast.querySelector('.toast-close').onclick = () => {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        };

        // Auto remove
        setTimeout(() => {
            if (toast.isConnected) {
                toast.style.animation = 'slideOutRight 0.3s ease forwards';
                setTimeout(() => toast.remove(), 300);
            }
        }, 3000);
    }
}

// Make it globally available
window.Popup = Popup;
