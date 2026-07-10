// js/data-system.js - Shared data management for all dashboards

// Initialize database if not exists
function initializeDatabase() {
    if (!localStorage.getItem('ssra_database')) {
        var database = {
            users: [],
            declarations: [],
            c17Forms: [],
            payments: [],
            notifications: [],
            auditLogs: [],
            borderPosts: [],
            customsOffices: [],
            services: [],
            settings: {
                dutyRate: 0.1,
                highRiskThreshold: 100000,
                processingTime: 24,
                systemName: 'SSRA Customs System',
                maintenanceMode: false,
                emailNotifications: true,
                lastUpdated: new Date().toISOString()
            }
        };
        localStorage.setItem('ssra_database', JSON.stringify(database));
    }
    return JSON.parse(localStorage.getItem('ssra_database'));
}

// Save database
function saveDatabase(db) {
    localStorage.setItem('ssra_database', JSON.stringify(db));
}

// Get current user from localStorage
function getCurrentUser() {
    var users = getAllUsers();
    var userId = localStorage.getItem('userId') || localStorage.getItem('userIdentifier');
    var user = users.find(function(u) { return u.identifier === userId || u.id == userId; });
    
    return {
        id: user ? user.id : null,
        name: localStorage.getItem('userName') || 'User',
        role: localStorage.getItem('userRole') || 'trader',
        identifier: localStorage.getItem('userIdentifier') || userId,
        traderType: localStorage.getItem('traderType'),
        email: user ? user.email : '',
        phone: user ? user.phone : '',
        status: user ? user.status : 'active'
    };
}

// Get all users
function getAllUsers() {
    var db = initializeDatabase();
    return db.users;
}

// Get all declarations (ADD THIS FUNCTION)
function getAllDeclarations() {
    var db = initializeDatabase();
    return db.declarations;
}

// Get user by identifier
function getUserByIdentifier(identifier) {
    var users = getAllUsers();
    return users.find(function(u) { return u.identifier === identifier; });
}

// Create new user
function createUser(userData) {
    var db = initializeDatabase();
    var newUser = {
        id: Date.now(),
        name: userData.name,
        email: userData.email,
        identifier: userData.identifier,
        password: userData.password,
        role: userData.role,
        traderType: userData.traderType || null,
        phone: userData.phone || '',
        status: userData.status || 'active',
        licenseNumber: userData.licenseNumber || null,
        badgeNumber: userData.badgeNumber || null,
        createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    saveDatabase(db);
    addAuditLog('USER_CREATED', 'New user ' + userData.name + ' created with role ' + userData.role);
    return newUser;
}

// Update user
function updateUser(identifier, userData) {
    var db = initializeDatabase();
    var userIndex = db.users.findIndex(function(u) { return u.identifier === identifier; });
    if (userIndex !== -1) {
        db.users[userIndex] = Object.assign({}, db.users[userIndex], userData);
        saveDatabase(db);
        addAuditLog('USER_UPDATED', 'User ' + userData.name + ' updated');
        return true;
    }
    return false;
}

// Delete user
function deleteUser(identifier) {
    var db = initializeDatabase();
    var user = db.users.find(function(u) { return u.identifier === identifier; });
    if (user) {
        db.users = db.users.filter(function(u) { return u.identifier !== identifier; });
        saveDatabase(db);
        addAuditLog('USER_DELETED', 'User ' + user.name + ' deleted');
        return true;
    }
    return false;
}

// Add notification for a user
function addNotification(userId, title, message, type, referenceId) {
    var db = initializeDatabase();
    db.notifications.unshift({
        id: Date.now(),
        userId: userId,
        title: title,
        message: message,
        type: type,
        referenceId: referenceId,
        read: false,
        createdAt: new Date().toISOString()
    });
    saveDatabase(db);
}

// Get notifications for current user
function getUserNotifications() {
    var user = getCurrentUser();
    var db = initializeDatabase();
    return db.notifications.filter(function(n) { return n.userId === user.id || n.userId === user.identifier; });
}

// Get all notifications (for admin)
function getAllNotifications() {
    var db = initializeDatabase();
    return db.notifications;
}

// Mark notification as read
function markNotificationRead(notificationId) {
    var db = initializeDatabase();
    var notification = db.notifications.find(function(n) { return n.id == notificationId; });
    if (notification) {
        notification.read = true;
        saveDatabase(db);
    }
}

// Add audit log
function addAuditLog(action, details) {
    var user = getCurrentUser();
    var db = initializeDatabase();
    db.auditLogs.unshift({
        id: Date.now(),
        userId: user.id || user.identifier,
        userName: user.name,
        action: action,
        details: details,
        timestamp: new Date().toISOString()
    });
    if (db.auditLogs.length > 1000) {
        db.auditLogs = db.auditLogs.slice(0, 1000);
    }
    saveDatabase(db);
}

// Get audit logs
function getAuditLogs(limit) {
    var db = initializeDatabase();
    var logs = db.auditLogs;
    return limit ? logs.slice(0, limit) : logs;
}

// Clear audit logs
function clearAuditLogs() {
    var db = initializeDatabase();
    db.auditLogs = [];
    saveDatabase(db);
    addAuditLog('AUDIT_CLEARED', 'Audit logs cleared by admin');
}

// Create new declaration
function createDeclaration(data) {
    var db = initializeDatabase();
    var newId = 'DEC-' + new Date().getFullYear() + '-' + String(db.declarations.length + 1).padStart(4, '0');
    var newDeclaration = {
        id: newId,
        traderId: data.traderId,
        traderName: data.traderName,
        agentId: data.agentId || null,
        agentName: data.agentName || null,
        type: data.type,
        goods: data.goods,
        hsCode: data.hsCode,
        quantity: data.quantity,
        value: data.value,
        country: data.country,
        port: data.port,
        duty: data.value * 0.1,
        status: data.status || 'pending_agent',
        documents: data.documents || [],
        submittedDate: new Date().toISOString(),
        officerComments: null,
        supervisorComments: null,
        officerId: null,
        supervisorId: null,
        clearedDate: null,
        c17Number: data.c17Number || null
    };
    db.declarations.push(newDeclaration);
    saveDatabase(db);
    
    if (data.agentId) {
        addNotification(data.agentId, 'New Declaration', 'New declaration from ' + data.traderName, 'info', newDeclaration.id);
    }
    
    addAuditLog('CREATE_DECLARATION', 'Declaration ' + newDeclaration.id + ' created');
    return newDeclaration;
}

// Update declaration status
function updateDeclarationStatus(declarationId, status, comments, userId) {
    var db = initializeDatabase();
    var declaration = db.declarations.find(function(d) { return d.id === declarationId; });
    if (declaration) {
        var oldStatus = declaration.status;
        declaration.status = status;
        if (comments) {
            if (status === 'officer_review') declaration.officerComments = comments;
            if (status === 'supervisor_approval') declaration.supervisorComments = comments;
            if (status === 'rejected') declaration.officerComments = comments;
        }
        if (status === 'cleared') declaration.clearedDate = new Date().toISOString();
        saveDatabase(db);
        
        if (status === 'agent_submitted') {
            addNotification(declaration.traderId, 'Declaration Submitted', 'Your declaration has been submitted to customs', 'success', declarationId);
            var officers = db.users.filter(function(u) { return u.role === 'officer' && u.status === 'active'; });
            if (officers.length > 0) {
                declaration.officerId = officers[0].id;
                addNotification(officers[0].id, 'New Declaration', 'New declaration ready for review', 'info', declarationId);
            }
        }
        if (status === 'officer_review') {
            addNotification(declaration.agentId, 'Under Review', 'Declaration is being reviewed by customs officer', 'info', declarationId);
        }
        if (status === 'supervisor_approval') {
            var supervisors = db.users.filter(function(u) { return u.role === 'supervisor' && u.status === 'active'; });
            if (supervisors.length > 0) {
                declaration.supervisorId = supervisors[0].id;
                addNotification(supervisors[0].id, 'Approval Required', 'High value declaration needs supervisor approval', 'warning', declarationId);
            }
        }
        if (status === 'approved') {
            addNotification(declaration.traderId, 'Declaration Approved', 'Your declaration has been approved. Please pay duties.', 'success', declarationId);
        }
        if (status === 'rejected') {
            addNotification(declaration.traderId, 'Declaration Rejected', 'Your declaration has been rejected. Reason: ' + (comments || 'Please contact customs'), 'error', declarationId);
        }
        if (status === 'cleared') {
            addNotification(declaration.traderId, 'Shipment Cleared', 'Your shipment has been cleared. Download your certificate.', 'success', declarationId);
        }
        
        addAuditLog('UPDATE_STATUS', 'Declaration ' + declarationId + ' status changed from ' + oldStatus + ' to ' + status);
    }
}

// Get declarations based on user role
function getUserDeclarations() {
    var user = getCurrentUser();
    var db = initializeDatabase();
    var declarations = db.declarations;
    
    if (user.role === 'trader') {
        return declarations.filter(function(d) { return d.traderId === user.id || d.traderId === user.identifier; });
    }
    if (user.role === 'agent') {
        return declarations.filter(function(d) { return d.agentId === user.id || d.agentId === user.identifier || d.status === 'pending_agent'; });
    }
    if (user.role === 'officer') {
        return declarations.filter(function(d) { return d.status === 'agent_submitted' || d.status === 'officer_review'; });
    }
    if (user.role === 'supervisor') {
        return declarations.filter(function(d) { return d.status === 'supervisor_approval' || (d.value > 100000 && d.status === 'officer_review'); });
    }
    if (user.role === 'manager' || user.role === 'admin') {
        return declarations;
    }
    return [];
}

// Process payment
function processPayment(declarationId, amount, method) {
    var db = initializeDatabase();
    var declaration = db.declarations.find(function(d) { return d.id === declarationId; });
    var user = getCurrentUser();
    if (declaration && declaration.duty === amount) {
        var payment = {
            id: 'PAY-' + Date.now(),
            declarationId: declarationId,
            amount: amount,
            method: method,
            status: 'completed',
            paidBy: user.id || user.identifier,
            paidByName: user.name,
            paidDate: new Date().toISOString()
        };
        db.payments.push(payment);
        declaration.status = 'paid';
        saveDatabase(db);
        
        addNotification(declaration.traderId, 'Payment Received', 'Your payment of $' + amount + ' has been received', 'success', declarationId);
        addAuditLog('PAYMENT', 'Payment of $' + amount + ' for ' + declarationId + ' by ' + user.name);
        return true;
    }
    return false;
}

// Get payments for user
function getUserPayments() {
    var user = getCurrentUser();
    var db = initializeDatabase();
    return db.payments.filter(function(p) { return p.paidBy === user.id || p.paidBy === user.identifier; });
}

// Generate certificate
function generateCertificate(declarationId) {
    var db = initializeDatabase();
    var declaration = db.declarations.find(function(d) { return d.id === declarationId; });
    if (declaration && declaration.status === 'paid') {
        declaration.status = 'cleared';
        declaration.clearedDate = new Date().toISOString();
        saveDatabase(db);
        
        addNotification(declaration.traderId, 'Certificate Ready', 'Your clearance certificate is ready for download', 'success', declarationId);
        addAuditLog('CERTIFICATE_GENERATED', 'Certificate generated for ' + declarationId);
        return true;
    }
    return false;
}

// Get dashboard statistics for current user
function getUserStats() {
    var declarations = getUserDeclarations();
    
    return {
        total: declarations.length,
        pending: declarations.filter(function(d) { return d.status === 'pending_agent' || d.status === 'agent_submitted'; }).length,
        underReview: declarations.filter(function(d) { return d.status === 'officer_review' || d.status === 'supervisor_approval'; }).length,
        approved: declarations.filter(function(d) { return d.status === 'approved'; }).length,
        cleared: declarations.filter(function(d) { return d.status === 'cleared'; }).length,
        rejected: declarations.filter(function(d) { return d.status === 'rejected'; }).length,
        totalValue: declarations.reduce(function(sum, d) { return sum + d.value; }, 0)
    };
}

// Export functions for use in dashboards
window.SSRA = {
    init: function() {
        initializeDatabase();
    },
    getCurrentUser: getCurrentUser,
    getDatabase: initializeDatabase,
    saveDatabase: saveDatabase,
    getAllUsers: getAllUsers,
    getAllDeclarations: getAllDeclarations,
    addNotification: addNotification,
    getUserNotifications: getUserNotifications,
    getAllNotifications: getAllNotifications,
    markNotificationRead: markNotificationRead,
    addAuditLog: addAuditLog,
    getAuditLogs: getAuditLogs,
    clearAuditLogs: clearAuditLogs,
    createDeclaration: createDeclaration,
    updateDeclarationStatus: updateDeclarationStatus,
    getUserDeclarations: getUserDeclarations,
    processPayment: processPayment,
    getUserPayments: getUserPayments,
    generateCertificate: generateCertificate,
    getUserStats: getUserStats,
    createUser: createUser,
    updateUser: updateUser,
    deleteUser: deleteUser
};

// Auto-initialize
SSRA.init();