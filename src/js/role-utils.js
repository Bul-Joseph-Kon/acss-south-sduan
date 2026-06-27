function getCurrentUserRoles() {
    try {
        var stored = localStorage.getItem('userRoles');
        if (stored) {
            var parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {
        // ignore invalid stored JSON
    }
    var single = localStorage.getItem('userRole');
    return single ? [single] : [];
}

function getCurrentUserRole() {
    var activeRole = localStorage.getItem('userRole');
    if (activeRole) return activeRole;
    var roles = getCurrentUserRoles();
    return roles.length ? roles[0] : '';
}

function setActiveUserRole(role) {
    if (!role) return;
    localStorage.setItem('userRole', role);
}

function isUserLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

function requireAuth() {
    if (!isUserLoggedIn()) {
        var currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = '../auth/login.html?redirect=' + currentUrl;
        return false;
    }
    return true;
}

function getDashboardUrl(role) {
    var dashboardMap = {
        admin: '../pages/dashboard-admin.html',
        agent: '../pages/dashboard-agent.html',
        trader: '../pages/dashboard-trader.html',
        officer: '../pages/dashboard-officer.html',
        inspector: '../pages/dashboard-inspector.html',
        revenue: '../pages/dashboard-revenue.html',
        supervisor: '../pages/dashboard-supervisor.html'
    };
    return dashboardMap[role] || '../pages/dashboard-trader.html';
}

function redirectToCurrentRoleDashboard() {
    if (!requireAuth()) return;
    var role = getCurrentUserRole();
    var target = getDashboardUrl(role);
    var current = window.location.pathname.split('/').pop();
    if (!current || !target) return;
    var targetName = target.split('/').pop();
    if (current !== targetName) {
        window.location.href = target;
    }
}

function getUserName() {
    return localStorage.getItem('userName') || '';
}

function getUserIdentifier() {
    return localStorage.getItem('userIdentifier') || '';
}

function renderRoleSwitcher(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var roles = getCurrentUserRoles();
    if (roles.length === 0) {
        container.textContent = '';
        return;
    }
    var current = getCurrentUserRole();
    if (roles.length === 1) {
        container.textContent = 'Role: ' + current;
        return;
    }
    var options = roles.map(function(role) {
        return '<option value="' + role + '"' + (role === current ? ' selected' : '') + '>' + role.charAt(0).toUpperCase() + role.slice(1) + '</option>';
    }).join('');
    container.innerHTML = '<div class="flex items-center gap-2 text-sm text-gray-700"><span>Active role:</span><select id="roleSelect" class="border rounded px-2 py-1 text-sm">' + options + '</select></div>';
    document.getElementById('roleSelect')?.addEventListener('change', function() {
        setActiveUserRole(this.value);
        window.location.reload();
    });
}

function enforceCurrentDashboard(expectedRole) {
    if (!requireAuth()) return;
    var role = getCurrentUserRole();
    if (!role || role === expectedRole) return;
    var target = getDashboardUrl(role);
    if (target) {
        window.location.href = target;
    }
}

window.getCurrentUserRoles = getCurrentUserRoles;
window.getCurrentUserRole = getCurrentUserRole;
window.setActiveUserRole = setActiveUserRole;
window.isUserLoggedIn = isUserLoggedIn;
window.requireAuth = requireAuth;
window.getDashboardUrl = getDashboardUrl;
window.redirectToCurrentRoleDashboard = redirectToCurrentRoleDashboard;
window.renderRoleSwitcher = renderRoleSwitcher;
window.enforceCurrentDashboard = enforceCurrentDashboard;
window.getUserName = getUserName;
window.getUserIdentifier = getUserIdentifier;
