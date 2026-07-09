// ================================================================
// TOAST NOTIFICATION MODULE
// ================================================================
// Provides toast notification functionality for user feedback
// ================================================================

class ToastManager {
    constructor() {
        if (ToastManager.instance) {
            return ToastManager.instance;
        }
        
        this.container = null;
        this.toasts = [];
        this.maxToasts = 5;
        this.defaultDuration = 4000;
        
        ToastManager.instance = this;
    }

    // Initialize toast container
    init() {
        if (this.container) return;
        
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);
    }

    // Show toast notification
    show(message, type = 'info', options = {}) {
        this.init();
        
        const duration = options.duration || this.defaultDuration;
        const persistent = options.persistent || false;
        
        // Remove oldest toast if max reached
        if (this.toasts.length >= this.maxToasts) {
            this.removeToast(this.toasts[0]);
        }
        
        const toast = this.createToast(message, type, persistent);
        this.container.appendChild(toast);
        this.toasts.push(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });
        
        // Auto dismiss if not persistent
        if (!persistent) {
            setTimeout(() => {
                this.removeToast(toast);
            }, duration);
        }
        
        return toast;
    }

    // Create toast element
    createToast(message, type, persistent) {
        const toast = document.createElement('div');
        const icon = this.getIcon(type);
        const colors = this.getColors(type);
        
        toast.style.cssText = `
            background: white;
            border-left: 4px solid ${colors.border};
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: flex-start;
            gap: 12px;
            min-width: 300px;
            max-width: 400px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            pointer-events: auto;
        `;
        
        toast.innerHTML = `
            <div style="color: ${colors.icon}; flex-shrink: 0; font-size: 20px;">
                ${icon}
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 500; color: #1f2937; font-size: 14px;">
                    ${this.getTitle(type)}
                </div>
                <div style="color: #6b7280; font-size: 13px; margin-top: 4px;">
                    ${message}
                </div>
            </div>
            ${persistent ? `
                <button onclick="toastManager.removeToast(this.closest('[data-toast]'))" 
                        style="background: none; border: none; color: #9ca3af; cursor: pointer; padding: 4px; font-size: 16px;">
                    ×
                </button>
            ` : ''}
        `;
        
        toast.setAttribute('data-toast', 'true');
        return toast;
    }

    // Get icon for toast type
    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }

    // Get colors for toast type
    getColors(type) {
        const colors = {
            success: { border: '#10b981', icon: '#10b981' },
            error: { border: '#ef4444', icon: '#ef4444' },
            warning: { border: '#f59e0b', icon: '#f59e0b' },
            info: { border: '#3b82f6', icon: '#3b82f6' }
        };
        return colors[type] || colors.info;
    }

    // Get title for toast type
    getTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Information'
        };
        return titles[type] || titles.info;
    }

    // Remove toast
    removeToast(toast) {
        if (!toast || !toast.parentNode) return;
        
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            this.toasts = this.toasts.filter(t => t !== toast);
        }, 300);
    }

    // Clear all toasts
    clear() {
        this.toasts.forEach(toast => this.removeToast(toast));
    }

    // Convenience methods
    success(message, options) {
        return this.show(message, 'success', options);
    }

    error(message, options) {
        return this.show(message, 'error', options);
    }

    warning(message, options) {
        return this.show(message, 'warning', options);
    }

    info(message, options) {
        return this.show(message, 'info', options);
    }
}

// Create singleton instance
const toastManager = new ToastManager();

// Export for use in modules
export default toastManager;
export { toastManager };
