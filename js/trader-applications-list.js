// ================================================================
// TRADER APPLICATIONS LIST MODULE
// ================================================================
// Reusable module for application list pages (submitted, approved, draft, rejected, completed, under-review)
// Handles loading, filtering, searching, pagination, and real-time updates
// ================================================================

import supabase from './supabase.js';
import { checkAuth, getUserProfile, signOut, getCurrentUser } from './auth.js';
import {
    fetchTraderApplicationsByStatus,
    fetchPaginatedApplications,
    searchTraderApplications,
    filterTraderApplications,
    subscribeToTraderDashboard,
    unsubscribeFromTraderDashboard
} from './trader-service.js';
import { realtimeManager } from './realtime.js';

// ================================================================
// APPLICATION LIST MANAGER
// ================================================================

export class ApplicationListManager {
    constructor(config) {
        this.status = config.status; // 'draft', 'submitted', 'under_review', 'approved', 'rejected', 'completed'
        this.pageKey = config.pageKey || `trader-applications-${this.status}`;
        this.containerId = config.containerId || 'applicationsList';
        this.paginationContainerId = config.paginationContainerId || 'pagination';
        this.searchInputId = config.searchInputId || 'searchInput';
        this.filterServiceId = config.filterServiceId || 'filterService';
        this.filterDateFromId = config.filterDateFromId || 'filterDateFrom';
        this.filterDateToId = config.filterDateToId || 'filterDateTo';

        this.currentPage = 1;
        this.pageSize = 10;
        this.currentFilters = {};
        this.currentSearch = '';
        this.currentSort = { column: 'created_at', ascending: false };

        this.isLoading = false;
        this.applications = [];
        this.totalCount = 0;
    }

    // ================================================================
    // INITIALIZATION
    // ================================================================

    async initialize() {
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
            window.location.href = '../../auth/login.html';
            return;
        }

        const user = await getCurrentUser();
        const profile = user ? await getUserProfile(user.id) : null;

        if (profile) {
            this.updateProfileDisplay(profile);
        }

        this.setupEventListeners();
        await loadApplications(this);
        await setupRealtimeSubscriptions(this);
    }

    updateProfileDisplay(profile) {
        const profileName = document.getElementById('traderProfileName');
        const profileRole = document.getElementById('traderProfileRole');
        const profileStatus = document.getElementById('traderProfileStatus');

        if (profileName) profileName.textContent = profile.full_name || 'Trader';
        if (profileRole) profileRole.textContent = formatRole(profile.role);
        if (profileStatus) profileStatus.textContent = `● ${profile.status || 'Active'}`;
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById(this.searchInputId);
        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => {
                this.currentSearch = searchInput.value;
                this.currentPage = 1;
                this.loadApplications();
            }, 500));
        }

        // Service filter
        const serviceFilter = document.getElementById(this.filterServiceId);
        if (serviceFilter) {
            serviceFilter.addEventListener('change', () => {
                this.currentFilters.application_type = serviceFilter.value === 'cvet' ? 'CVET' :
                    serviceFilter.value === 'assessment' ? 'Direct Assessment' : null;
                this.currentPage = 1;
                this.loadApplications();
            });
        }

        // Date filters
        const dateFrom = document.getElementById(this.filterDateFromId);
        const dateTo = document.getElementById(this.filterDateToId);

        if (dateFrom) {
            dateFrom.addEventListener('change', () => {
                this.currentFilters.created_at_gte = dateFrom.value;
                this.currentPage = 1;
                this.loadApplications();
            });
        }

        if (dateTo) {
            dateTo.addEventListener('change', () => {
                this.currentFilters.created_at_lte = dateTo.value;
                this.currentPage = 1;
                this.loadApplications();
            });
        }

        // Sign out
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', async () => {
                const result = await signOut();
                if (result.success) {
                    window.location.href = '../../auth/login.html';
                }
            });
        }
    }

    // ================================================================
    // LOADING APPLICATIONS
    // ================================================================

    async loadApplications() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading();

        try {
            let result;

            if (this.currentSearch) {
                result = await searchTraderApplications(this.currentSearch);
                this.applications = result.success ? result.data : [];
                this.totalCount = this.applications.length;
            } else if (Object.keys(this.currentFilters).length > 0) {
                result = await filterTraderApplications(this.currentFilters);
                this.applications = result.success ? result.data : [];
                this.totalCount = this.applications.length;
            } else {
                result = await fetchPaginatedApplications({
                    page: this.currentPage,
                    pageSize: this.pageSize,
                    filters: { status: this.status }
                });

                if (result.success) {
                    this.applications = result.data;
                    this.totalCount = result.pagination.total;
                } else {
                    this.applications = [];
                    this.totalCount = 0;
                }
            }

            this.renderApplications();
            this.renderPagination();
        } catch (error) {
            console.error('Error loading applications:', error);
            this.showError();
        } finally {
            this.isLoading = false;
        }
    }

    // ================================================================
    // RENDERING
    // ================================================================

    showLoading() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div class="flex items-center justify-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    <span class="ml-3 text-gray-500">Loading applications...</span>
                </div>
            `;
        }
    }

    showError() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="ri-error-warning-line text-red-500 text-4xl mb-2"></i>
                    <p class="text-gray-500">Error loading applications</p>
                    <button onclick="window.location.reload()" class="mt-2 text-emerald-600 hover:underline">Retry</button>
                </div>
            `;
        }
    }

    showEmpty() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="ri-file-list-3-line text-gray-400 text-4xl mb-2"></i>
                    <p class="text-gray-500">No applications found</p>
                    <p class="text-sm text-gray-400 mt-1">Try adjusting your filters or create a new application</p>
                </div>
            `;
        }
    }

    renderApplications() {
        const container = document.getElementById(this.containerId);

        if (!container) return;

        if (this.applications.length === 0) {
            this.showEmpty();
            return;
        }

        container.innerHTML = this.applications.map(app => this.renderApplicationCard(app)).join('');
    }

    renderApplicationCard(app) {
        const statusBadge = this.getStatusBadgeClass(app.status);
        const statusLabel = this.formatStatus(app.status);
        const flowBadge = this.getFlowBadgeClass(app.status);
        const flowStage = this.getFlowStage(app.status);

        return `
            <div class="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-semibold text-gray-800">${app.application_number || 'N/A'}</span>
                            <span class="status-badge ${statusBadge}">${statusLabel}</span>
                            ${flowBadge ? `<span class="flow-badge ${flowBadge} text-[0.5rem]">${flowStage}</span>` : ''}
                        </div>
                        <p class="text-sm text-gray-500">${app.application_type || 'Unknown Type'}</p>
                    </div>
                    <div class="text-right text-sm text-gray-400">
                        ${formatDate(app.created_at)}
                    </div>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    <div>
                        <span class="text-gray-400 text-xs">Origin</span>
                        <p class="font-medium">${app.origin_country || 'N/A'}</p>
                    </div>
                    <div>
                        <span class="text-gray-400 text-xs">Destination</span>
                        <p class="font-medium">${app.destination_country || 'N/A'}</p>
                    </div>
                    <div>
                        <span class="text-gray-400 text-xs">Value</span>
                        <p class="font-medium">${formatCurrency(app.declared_value)}</p>
                    </div>
                    <div>
                        <span class="text-gray-400 text-xs">Items</span>
                        <p class="font-medium">${app.item_count || 0}</p>
                    </div>
                </div>

                <div class="flex gap-2">
                    <a href="tracking.html?ref=${app.application_number}" class="flex-1 text-center bg-emerald-50 text-emerald-600 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition">
                        <i class="ri-search-line"></i> Track
                    </a>
                    <a href="#" onclick="viewApplicationDetails('${app.id}')" class="flex-1 text-center bg-gray-50 text-gray-600 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition">
                        <i class="ri-eye-line"></i> View
                    </a>
                    ${this.status === 'draft' ? `
                        <a href="#" onclick="editApplication('${app.id}')" class="flex-1 text-center bg-blue-50 text-blue-600 py-2 rounded-lg text-sm font-semibold hover:bg-blue-100 transition">
                            <i class="ri-edit-line"></i> Edit
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderPagination() {
        const container = document.getElementById(this.paginationContainerId);

        if (!container) return;

        const totalPages = Math.ceil(this.totalCount / this.pageSize);

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '<div class="flex items-center justify-center gap-2 mt-4">';

        // Previous button
        html += `
            <button 
                onclick="changePage(${this.currentPage - 1})" 
                ${this.currentPage === 1 ? 'disabled' : ''}
                class="px-3 py-1 rounded border ${this.currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}"
            >
                <i class="ri-arrow-left-s-line"></i>
            </button>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                html += `
                    <button 
                        onclick="changePage(${i})"
                        class="px-3 py-1 rounded border ${i === this.currentPage ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'}"
                    >
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                html += '<span class="px-2 text-gray-400">...</span>';
            }
        }

        // Next button
        html += `
            <button 
                onclick="changePage(${this.currentPage + 1})"
                ${this.currentPage === totalPages ? 'disabled' : ''}
                class="px-3 py-1 rounded border ${this.currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}"
            >
                <i class="ri-arrow-right-s-line"></i>
            </button>
        `;

        html += '</div>';
        container.innerHTML = html;
    }

    // ================================================================
    // REALTIME SUBSCRIPTIONS
    // ================================================================

    async setupRealtimeSubscriptions() {
        const user = await getCurrentUser();
        const profile = user ? await getUserProfile(user.id) : null;

        if (!profile) return;

        subscribeToTraderDashboard({
            onApplicationChange: async (payload) => {
                // Reload applications when they change
                await this.loadApplications();
            }
        }, this.pageKey);
    }

    cleanup() {
        unsubscribeFromTraderDashboard(this.pageKey);
    }

    // ================================================================
    // UTILITY FUNCTIONS
    // ================================================================

    getStatusBadgeClass(status) {
        const classes = {
            draft: 'status-draft',
            submitted: 'status-pending',
            pending_review: 'status-review',
            under_inspection: 'status-inspection',
            approved: 'status-approved',
            rejected: 'status-rejected',
            paid: 'status-approved',
            completed: 'status-completed',
            returned: 'status-rejected'
        };
        return classes[status] || 'status-draft';
    }

    getFlowBadgeClass(status) {
        const classes = {
            submitted: 'flow-badge-ai',
            pending_review: 'flow-badge-officer',
            under_inspection: 'flow-badge-inspector',
            approved: 'flow-badge-supervisor',
            paid: 'flow-badge-revenue',
            completed: 'flow-badge-completed'
        };
        return classes[status] || '';
    }

    formatStatus(status) {
        const labels = {
            draft: 'Draft',
            submitted: 'Submitted',
            pending_review: 'Review',
            under_inspection: 'Inspection',
            approved: 'Approved',
            rejected: 'Rejected',
            paid: 'Paid',
            completed: 'Completed',
            returned: 'Returned'
        };
        return labels[status] || status;
    }

    getFlowStage(status) {
        const stages = {
            submitted: 'AI',
            pending_review: 'Officer',
            under_inspection: 'Inspector',
            approved: 'Supervisor',
            paid: 'Revenue',
            completed: '✓ Done'
        };
        return stages[status] || '';
    }

    changePage(page) {
        this.currentPage = page;
        this.loadApplications();
    }
}

// ================================================================
// GLOBAL UTILITY FUNCTIONS
// ================================================================

function debounce(func, wait) {
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

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatCurrency(value) {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value);
}

function formatRole(role) {
    const labels = {
        agent: 'Agent',
        trader: 'Trader',
        officer: 'Officer',
        inspector: 'Inspector',
        supervisor: 'Supervisor',
        revenue: 'Revenue Officer',
        revenue_officer: 'Revenue Officer',
        administrator: 'Administrator',
        admin: 'Administrator'
    };
    return labels[String(role || '').toLowerCase()] || 'Trader';
}

// ================================================================
// EXPORT FUNCTIONS FOR HTML PAGES
// ================================================================

export async function loadApplications(manager) {
    return manager.loadApplications();
}

export async function setupRealtimeSubscriptions(manager) {
    return manager.setupRealtimeSubscriptions();
}

export function changePage(manager, page) {
    manager.changePage(page);
}

export function viewApplicationDetails(applicationId) {
    window.location.href = `tracking.html?id=${applicationId}`;
}

export function editApplication(applicationId) {
    window.location.href = `create-declaration.html?id=${applicationId}`;
}
