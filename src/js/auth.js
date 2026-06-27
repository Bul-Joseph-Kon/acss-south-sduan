// ================================================================
// AUTHENTICATION & ACCESS CONTROL - auth.js
// ================================================================

// ================================================================
// USER DATA
// ================================================================
var DEMO_USERS = [
    { id: 1, name: "John Importer", email: "john@importer.com", username: "john_imp", identifier: "IMP-001", password: "pass123", role: "trader", traderType: "importer", status: "active", mfaEnabled: false, created: "2025-01-15" },
    { id: 2, name: "Sarah Exporter", email: "sarah@exporter.com", username: "sarah_exp", identifier: "EXP-001", password: "pass123", role: "trader", traderType: "exporter", status: "active", mfaEnabled: false, created: "2025-02-20" },
    { id: 3, name: "Mike Agent", email: "mike@agent.com", username: "mike_agent", identifier: "AGT-003", password: "pass123", role: "agent", status: "active", mfaEnabled: false, created: "2025-03-10" },
    { id: 4, name: "David Officer", email: "david@ssra.gov", username: "david_off", identifier: "OFF-004", password: "pass123", role: "officer", status: "active", mfaEnabled: false, created: "2025-01-05" },
    { id: 5, name: "Grace Supervisor", email: "grace@ssra.gov", username: "grace_sup", identifier: "SUP-005", password: "pass123", role: "supervisor", status: "active", mfaEnabled: false, created: "2025-01-10" },
    { id: 6, name: "Admin User", email: "admin@ssra.gov", username: "admin", identifier: "ADMIN-007", password: "admin123", role: "admin", status: "active", mfaEnabled: false, created: "2025-01-01" },
    { id: 7, name: "Alice Inspector", email: "alice@ssra.gov", username: "alice_insp", identifier: "INS-008", password: "pass123", role: "inspector", status: "active", mfaEnabled: false, created: "2025-02-01" },
    { id: 8, name: "James Revenue", email: "james@ssra.gov", username: "james_rev", identifier: "REV-009", password: "pass123", role: "revenue", status: "active", mfaEnabled: false, created: "2025-02-15" },
    { id: 9, name: "Peter Citizen", email: "peter@citizen.com", username: "peter_cit", identifier: "CIT-001", password: "pass123", role: "citizen", status: "active", mfaEnabled: false, created: "2026-06-16" }
];

var registrationData = { accountType: null, step: 1, verificationStep: 1 };
var otpTimerInterval;

// ================================================================
// DATABASE FUNCTIONS
// ================================================================
function initDB() {
    var stored = localStorage.getItem('portal_users');
    if (!stored || JSON.parse(stored).length === 0) {
        localStorage.setItem('portal_users', JSON.stringify(DEMO_USERS));
    }
    var sessions = localStorage.getItem('portal_sessions');
    if (!sessions) localStorage.setItem('portal_sessions', JSON.stringify([]));
    var logs = localStorage.getItem('portal_audit');
    if (!logs) localStorage.setItem('portal_audit', JSON.stringify([]));
}
initDB();

function getUsers() { return JSON.parse(localStorage.getItem('portal_users') || '[]'); }
function saveUsers(users) { localStorage.setItem('portal_users', JSON.stringify(users)); }
function getSessions() { return JSON.parse(localStorage.getItem('portal_sessions') || '[]'); }
function saveSessions(sessions) { localStorage.setItem('portal_sessions', JSON.stringify(sessions)); }
function getAuditLogs() { return JSON.parse(localStorage.getItem('portal_audit') || '[]'); }
function saveAuditLogs(logs) { localStorage.setItem('portal_audit', JSON.stringify(logs)); }

function getCurrentUser() {
    var data = localStorage.getItem('portal_session');
    if (data) {
        try { return JSON.parse(data); } catch { /* fall through */ }
    }

    // Fallback: some pages set simpler keys (isLoggedIn, userRole, userName, userIdentifier)
    try {
        if (localStorage.getItem('isLoggedIn') === 'true') {
            var built = {
                id: Date.now(),
                name: localStorage.getItem('userName') || 'User',
                email: localStorage.getItem('userEmail') || '',
                identifier: localStorage.getItem('userIdentifier') || '',
                role: localStorage.getItem('userRole') || 'trader',
                status: 'active',
                created: new Date().toISOString()
            };
            // persist as portal_session for consistent detection
            localStorage.setItem('portal_session', JSON.stringify(built));
            return built;
        }
    } catch (e) { console.warn('getCurrentUser fallback failed', e); }

    return null;
}

function setSession(user) {
    localStorage.setItem('portal_session', JSON.stringify(user));
    var sessions = getSessions();
    sessions.push({
        id: 'sess_' + Date.now(),
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        device: navigator.userAgent || 'Unknown Device',
        ip: '127.0.0.1',
        loginTime: new Date().toISOString(),
        active: true
    });
    saveSessions(sessions);
    addAuditLog(user.id, 'LOGIN', 'User logged in successfully', 'Success');
}

function clearSession() {
    var user = getCurrentUser();
    if (user) {
        var sessions = getSessions();
        var updated = sessions.map(function(s) {
            if (s.userId === user.id && s.active) {
                s.active = false;
                s.logoutTime = new Date().toISOString();
            }
            return s;
        });
        saveSessions(updated);
        addAuditLog(user.id, 'LOGOUT', 'User logged out', 'Success');
    }
    localStorage.removeItem('portal_session');
}

function addAuditLog(userId, action, details, status) {
    var logs = getAuditLogs();
    logs.push({
        id: 'audit_' + Date.now(),
        userId: userId,
        action: action,
        details: details,
        status: status,
        timestamp: new Date().toISOString(),
        ip: '127.0.0.1'
    });
    saveAuditLogs(logs);
}

// ================================================================
// MODAL FUNCTIONS
// ================================================================
function showModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { 
    if (id) document.getElementById(id).style.display = 'none'; 
    else document.getElementById('alertModal').style.display = 'none';
}
function showAlert(title, message) {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').innerHTML = message;
    showModal('alertModal');
}

// ================================================================
// REGISTRATION FUNCTIONS
// ================================================================
function selectAccountType(type) {
    document.querySelectorAll('.role-card').forEach(function(el) { el.classList.remove('selected'); });
    var selected = document.querySelector('[data-role="' + type + '"]');
    if (selected) selected.classList.add('selected');
    registrationData.accountType = type;
    document.getElementById('roleNextBtn').disabled = false;
}

function goToRegisterStep(step) {
    registrationData.step = step;
    for (var i = 1; i <= 5; i++) {
        document.getElementById('regStep' + i + 'Content').classList.add('hidden');
        var stepEl = document.getElementById('regStep' + i);
        if (stepEl) {
            stepEl.classList.remove('active', 'completed');
            if (i < step) stepEl.classList.add('completed');
            else if (i === step) stepEl.classList.add('active');
        }
    }
    document.getElementById('regStep' + step + 'Content').classList.remove('hidden');
}

function otpMove(current, nextId) {
    if (current.value.length >= 1 && nextId) {
        document.getElementById(nextId).focus();
    }
}

function verifyEmailOTP() {
    var otpInputs = ['otp1','otp2','otp3','otp4','otp5','otp6'];
    var otp = '';
    otpInputs.forEach(function(id) { otp += document.getElementById(id).value; });
    if (otp.length !== 6) {
        showAlert('Error', 'Please enter the complete 6-digit code.');
        return;
    }
    if (otp === '123456' || otp.length === 6) {
        showAlert('Success', 'Email verified successfully!');
        registrationData.verificationStep = 2;
        showVerificationStep(2);
        otpInputs.forEach(function(id) { document.getElementById(id).value = ''; });
    } else {
        showAlert('Invalid Code', 'The verification code is incorrect.');
    }
}

function resendEmailOTP() {
    showAlert('Code Sent', 'A new verification code has been sent to your email.');
}

function verifyPhoneOTP() {
    var otpInputs = ['otpPhone1','otpPhone2','otpPhone3','otpPhone4','otpPhone5','otpPhone6'];
    var otp = '';
    otpInputs.forEach(function(id) { otp += document.getElementById(id).value; });
    if (otp.length !== 6) {
        showAlert('Error', 'Please enter the complete 6-digit code.');
        return;
    }
    if (otp === '123456' || otp.length === 6) {
        showAlert('Success', 'Phone verified successfully!');
        registrationData.verificationStep = 3;
        showVerificationStep(3);
        otpInputs.forEach(function(id) { document.getElementById(id).value = ''; });
    } else {
        showAlert('Invalid Code', 'The verification code is incorrect.');
    }
}

function resendPhoneOTP() {
    showAlert('Code Sent', 'A new verification code has been sent to your phone.');
}

function verifyIdentity() {
    var fileInput = document.getElementById('idVerifyUpload');
    if (fileInput.files.length === 0) {
        showAlert('Error', 'Please upload an ID document.');
        return;
    }
    document.getElementById('idVerifyStatus').classList.remove('hidden');
    showAlert('Success', 'Identity document uploaded and verified!');
    registrationData.verificationStep = 4;
    showVerificationStep(4);
}

function verifyAI() {
    showAlert('AI Verification', '🤖 AI Verification in progress...\n\n✅ OCR Reading: Complete\n✅ TIN Validation: Passed\n✅ Duplicate Check: Clear\n✅ ID Authenticity: Verified\n\nRisk Score: 85% - Low Risk');
    registrationData.verificationStep = 5;
    showVerificationStep(5);
}

function showVerificationStep(step) {
    document.getElementById('emailVerification').classList.add('hidden');
    document.getElementById('phoneVerification').classList.add('hidden');
    document.getElementById('identityVerification').classList.add('hidden');
    document.getElementById('aiVerification').classList.add('hidden');
    document.getElementById('accountActivation').classList.add('hidden');
    
    if (step === 1) {
        document.getElementById('emailVerification').classList.remove('hidden');
    } else if (step === 2) {
        document.getElementById('phoneVerification').classList.remove('hidden');
    } else if (step === 3) {
        document.getElementById('identityVerification').classList.remove('hidden');
    } else if (step === 4) {
        document.getElementById('aiVerification').classList.remove('hidden');
    } else if (step === 5) {
        document.getElementById('accountActivation').classList.remove('hidden');
    }
    updateVerificationSteps(step);
}

function updateVerificationSteps(step) {
    var steps = ['vStep1', 'vStep2', 'vStep3', 'vStep4', 'vStep5'];
    var lines = ['vLine1', 'vLine2', 'vLine3', 'vLine4'];
    
    for (var i = 0; i < steps.length; i++) {
        var el = document.getElementById(steps[i]);
        el.classList.remove('active', 'completed', 'pending');
        if (i < step) {
            el.classList.add('completed');
            el.textContent = '✓';
        } else if (i === step - 1) {
            el.classList.add('active');
            el.textContent = i + 1;
        } else {
            el.classList.add('pending');
            el.textContent = i + 1;
        }
    }
    
    for (var i = 0; i < lines.length; i++) {
        var line = document.getElementById(lines[i]);
        if (i < step - 1) {
            line.classList.add('completed');
        } else {
            line.classList.remove('completed');
        }
    }
}

function activateAccount() {
    var accountType = registrationData.accountType;
    var fullName = document.getElementById('regFullName').value.trim();
    var dob = document.getElementById('regDob').value;
    var nationality = document.getElementById('regNationality').value.trim();
    var gender = document.getElementById('regGender').value;
    var nationalId = document.getElementById('regNationalId').value.trim();
    var phone = document.getElementById('regPhone').value.trim();
    var email = document.getElementById('regEmail').value.trim();
    var address = document.getElementById('regAddress').value.trim();
    var company = document.getElementById('regCompany').value.trim();
    var regNumber = document.getElementById('regRegNumber').value.trim();
    var tin = document.getElementById('regTin').value.trim();
    var businessAddress = document.getElementById('regBusinessAddress').value.trim();
    var username = document.getElementById('regUsername').value.trim();
    var password = document.getElementById('regPassword').value;
    var confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (!fullName || !nationalId || !phone || !email || !username || !password || !tin) {
        showAlert('Error', 'Please fill in all required fields.');
        return;
    }
    if (password.length < 8) {
        showAlert('Error', 'Password must be at least 8 characters.');
        return;
    }
    if (password !== confirmPassword) {
        showAlert('Error', 'Passwords do not match.');
        return;
    }
    if (!accountType) {
        showAlert('Error', 'Please select an account type.');
        return;
    }
    
    var users = getUsers();
    for (var i = 0; i < users.length; i++) {
        if (users[i].email === email) {
            showAlert('Error', 'This email is already registered.');
            return;
        }
        if (users[i].username === username) {
            showAlert('Error', 'This username is already taken.');
            return;
        }
        if (users[i].identifier === tin) {
            showAlert('Error', 'This TIN is already registered.');
            return;
        }
    }
    
    var roleMap = {
        importer: 'importer',
        exporter: 'exporter',
        agent: 'agent',
        transporter: 'transporter',
        warehouse: 'warehouse',
        citizen: 'citizen'
    };
    
    var role = roleMap[accountType] || 'citizen';
    
    var newUser = {
        id: users.length + 1,
        name: fullName,
        username: username,
        email: email,
        identifier: tin,
        password: password,
        role: role,
        status: 'active',
        mfaEnabled: false,
        created: new Date().toISOString(),
        dob: dob,
        nationality: nationality,
        gender: gender,
        nationalId: nationalId,
        phone: phone,
        address: address,
        company: company,
        regNumber: regNumber,
        businessAddress: businessAddress,
        accountType: accountType
    };
    
    users.push(newUser);
    saveUsers(users);
    addAuditLog(newUser.id, 'REGISTER', 'New user registered: ' + newUser.email, 'Success');
    
    closeModal('registerModal');
    showAlert('Success', 'Account created successfully! Please sign in.');
    
    // Reset
    registrationData = { accountType: null, step: 1, verificationStep: 1 };
    goToRegisterStep(1);
    document.querySelectorAll('.role-card').forEach(function(el) { el.classList.remove('selected'); });
    document.getElementById('roleNextBtn').disabled = true;
    document.getElementById('regFullName').value = '';
    document.getElementById('regDob').value = '';
    document.getElementById('regNationality').value = 'South Sudanese';
    document.getElementById('regGender').value = '';
    document.getElementById('regNationalId').value = '';
    document.getElementById('regPhone').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regAddress').value = '';
    document.getElementById('regCompany').value = '';
    document.getElementById('regRegNumber').value = '';
    document.getElementById('regTin').value = '';
    document.getElementById('regBusinessAddress').value = '';
    document.getElementById('regUsername').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regConfirmPassword').value = '';
    var otpIds = ['otp1','otp2','otp3','otp4','otp5','otp6','otpPhone1','otpPhone2','otpPhone3','otpPhone4','otpPhone5','otpPhone6'];
    otpIds.forEach(function(id) { document.getElementById(id).value = ''; });
    document.getElementById('idUploadStatus').classList.add('hidden');
    document.getElementById('idUpload').value = '';
    document.getElementById('idVerifyStatus').classList.add('hidden');
    document.getElementById('idVerifyUpload').value = '';
    showVerificationStep(1);
}

// ================================================================
// AUTH FUNCTIONS
// ================================================================
function handleSignIn() {
    var identifier = document.getElementById('loginIdentifier').value.trim();
    var password = document.getElementById('loginPassword').value.trim();
    
    if (!identifier || !password) {
        showAlert('Error', 'Please enter your credentials.');
        return;
    }
    
    var users = getUsers();
    var user = null;
    for (var i = 0; i < users.length; i++) {
        if ((users[i].identifier === identifier || users[i].email === identifier || users[i].username === identifier) && 
            users[i].password === password) {
            user = users[i];
            break;
        }
    }
    
    if (!user) {
        addAuditLog(null, 'LOGIN_FAILED', 'Failed login attempt for: ' + identifier, 'Failed');
        showAlert('Login Failed', 'Invalid credentials. Please try again.');
        return;
    }
    
    if (user.status === 'inactive') {
        showAlert('Account Inactive', 'Your account has been deactivated. Please contact support.');
        return;
    }
    
    completeLogin(user);
}

function completeLogin(user) {
    setSession(user);
    var users = getUsers();
    var updated = users.map(function(u) {
        if (u.id === user.id) {
            u.lastLogin = new Date().toISOString();
        }
        return u;
    });
    saveUsers(updated);
    closeModal('signInModal');
    showDashboardAfterLogin();
}

function handleForgotPassword() {
    var email = document.getElementById('forgotEmail').value.trim();
    if (!email) {
        showAlert('Error', 'Please enter your email address.');
        return;
    }
    var users = getUsers();
    var user = null;
    for (var i = 0; i < users.length; i++) {
        if (users[i].email === email) {
            user = users[i];
            break;
        }
    }
    if (!user) {
        showAlert('Not Found', 'No account found with this email address.');
        return;
    }
    closeModal('forgotModal');
    showAlert('Password Reset', 'A password reset link has been sent to your email address.');
}

function handleLogout() {
    clearSession();
    location.reload();
}

// ================================================================
// DASHBOARD
// ================================================================
function showDashboardAfterLogin() {
    var user = getCurrentUser();
    if (!user) return;
    
    var authButtons = document.getElementById('authButtons');
    if (authButtons) {
        authButtons.innerHTML = 
            '<span class="text-gray-700 font-semibold mr-2">Welcome, ' + user.name + '</span>' +
            '<button onclick="showDashboard()" class="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition">Dashboard</button>' +
            '<button onclick="handleLogout()" class="px-3 py-1.5 text-red-600 font-semibold hover:text-red-800 transition">Logout</button>';
    }
    
    var userHeaderInfo = document.getElementById('userHeaderInfo');
    if (userHeaderInfo) {
        userHeaderInfo.classList.remove('hidden');
        document.getElementById('headerUserName').textContent = user.name;
        document.getElementById('headerUserRole').textContent = user.role;
    }
}

function showDashboard() {
    var user = getCurrentUser();
    if (!user) return;
    
    showAlert('Dashboard', 'Welcome to your dashboard, ' + user.name + '!\n\n' +
        '📊 Overview\n' +
        '👤 Profile: ' + user.name + '\n' +
        '🔑 Role: ' + user.role + '\n' +
        '📧 Email: ' + user.email + '\n' +
        '🆔 TIN: ' + user.identifier + '\n\n' +
        '📋 Services Available\n' +
        '📄 Applications\n' +
        '💰 Payments\n' +
        '🔔 Notifications');
}

// ================================================================
// EXPOSE FUNCTIONS GLOBALLY
// ================================================================
window.getCurrentUser = getCurrentUser;
window.getUsers = getUsers;
window.saveUsers = saveUsers;
window.setSession = setSession;
window.clearSession = clearSession;
window.showModal = showModal;
window.closeModal = closeModal;
window.showAlert = showAlert;
window.handleSignIn = handleSignIn;
window.handleForgotPassword = handleForgotPassword;
window.handleLogout = handleLogout;
window.selectAccountType = selectAccountType;
window.goToRegisterStep = goToRegisterStep;
window.verifyEmailOTP = verifyEmailOTP;
window.resendEmailOTP = resendEmailOTP;
window.verifyPhoneOTP = verifyPhoneOTP;
window.resendPhoneOTP = resendPhoneOTP;
window.verifyIdentity = verifyIdentity;
window.verifyAI = verifyAI;
window.activateAccount = activateAccount;
window.otpMove = otpMove;
window.showDashboard = showDashboard;
window.showDashboardAfterLogin = showDashboardAfterLogin;
window.addAuditLog = addAuditLog;
window.initDB = initDB;

// ================================================================
// ACCESS GUARD
// ================================================================
function requireLogin(allowedRoles) {
    var user = getCurrentUser();
    if (user) {
        if (allowedRoles) {
            var allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
            if (allowed.indexOf(user.role) === -1) {
                showAlert('Access Denied', 'You do not have permission to access this page.');
                chooseLoginRedirect();
                return false;
            }
        }
        return true;
    }

    // No user — try to find a reachable login path and redirect there.
    chooseLoginRedirect();
    return false;
}

function chooseLoginRedirect() {
    var returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    var origin = window.location.origin;

    var candidates = [
        origin + '/auth/login.html',
        origin + '/pages/auth/login.html',
        origin + window.location.pathname.replace(/\/[^/]*$/, '') + '/auth/login.html'
    ];

    // Try each candidate; on first reachable, redirect. Fallback to origin + '/auth/login.html'.
    (async function tryCandidates() {
        for (var i = 0; i < candidates.length; i++) {
            var url = candidates[i] + '?redirect=' + returnUrl;
            try {
                var res = await fetch(candidates[i], { method: 'HEAD' });
                if (res && (res.status === 200 || res.status === 0 || res.status === 302 || res.type === 'basic')) {
                    window.location.href = url;
                    return;
                }
            } catch (e) {
                // ignore and try next
            }
        }
        // final fallback
        window.location.href = origin + '/auth/login.html?redirect=' + returnUrl;
    })();
}

window.requireLogin = requireLogin;