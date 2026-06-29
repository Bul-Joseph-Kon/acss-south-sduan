export function formatDate(date) {
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(date) {
    return new Date(date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatCurrency(amount, currency = 'SSP') {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
}

export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

export function validatePhone(phone) {
    const re = /^\+?[\d\s-]{10,}$/;
    return re.test(phone);
}

export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

export function getStatusColor(status) {
    const colors = {
        draft: 'gray',
        submitted: 'blue',
        pending_review: 'yellow',
        under_inspection: 'orange',
        returned: 'purple',
        approved: 'green',
        rejected: 'red',
        paid: 'emerald',
        completed: 'green',
        cancelled: 'gray'
    };
    return colors[status] || 'gray';
}

export function getRoleBadgeClass(role) {
    const classes = {
        trader: 'bg-green-100 text-green-800',
        agent: 'bg-yellow-100 text-yellow-800',
        officer: 'bg-blue-100 text-blue-800',
        inspector: 'bg-purple-100 text-purple-800',
        supervisor: 'bg-indigo-100 text-indigo-800',
        administrator: 'bg-red-100 text-red-800'
    };
    return classes[role] || 'bg-gray-100 text-gray-800';
}

export function showLoading(element) {
    if (element) {
        element.innerHTML = '<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>';
        element.disabled = true;
    }
}

export function hideLoading(element, originalText) {
    if (element) {
        element.innerHTML = originalText;
        element.disabled = false;
    }
}

export function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-medium z-50 ${type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

export function showModal(title, content, onConfirm = null) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-lg font-semibold mb-4">${title}</h3>
            <div class="mb-4">${content}</div>
            <div class="flex justify-end gap-2">
                <button id="modalCancel" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
                ${onConfirm ? '<button id="modalConfirm" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Confirm</button>' : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.querySelector('#modalCancel').onclick = () => modal.remove();
    if (onConfirm) {
        modal.querySelector('#modalConfirm').onclick = () => {
            onConfirm();
            modal.remove();
        };
    }
}

export function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

export function setQueryParam(param, value) {
    const url = new URL(window.location);
    url.searchParams.set(param, value);
    window.history.pushState({}, '', url);
}

export function removeQueryParam(param) {
    const url = new URL(window.location);
    url.searchParams.delete(param);
    window.history.pushState({}, '', url);
}
