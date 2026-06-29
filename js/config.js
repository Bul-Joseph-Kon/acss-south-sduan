// ================================================================
// SUPABASE CONFIGURATION
// ================================================================
// Supabase Project: https://avpoufxsjiecbsxvngip.supabase.co
// ================================================================

export const SUPABASE_CONFIG = {
    url: 'https://avpoufxsjiecbsxvngip.supabase.co',
    key: 'sb_publishable_XZ7BUTHNhF1ojqoxlJq7Bg_cqn9o8HE',
    
    // Storage buckets
    buckets: {
        documents: 'documents',
        avatars: 'avatars',
        certificates: 'certificates'
    },
    
    // File size limits (in bytes)
    maxFileSize: {
        documents: 10 * 1024 * 1024, // 10MB
        avatars: 2 * 1024 * 1024,    // 2MB
        certificates: 5 * 1024 * 1024 // 5MB
    },
    
    // Allowed file types
    allowedFileTypes: {
        documents: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'application/zip'],
        avatars: ['image/jpeg', 'image/png', 'image/jpg'],
        certificates: ['application/pdf']
    },
    
    // Application status mapping
    applicationStatus: {
        draft: 'Draft',
        submitted: 'Submitted',
        pending_review: 'Pending Review',
        under_inspection: 'Under Inspection',
        returned: 'Returned',
        approved: 'Approved',
        rejected: 'Rejected',
        paid: 'Paid',
        completed: 'Completed',
        cancelled: 'Cancelled'
    },
    
    // User roles
    userRoles: {
        trader: 'trader',
        agent: 'agent',
        officer: 'officer',
        inspector: 'inspector',
        supervisor: 'supervisor',
        administrator: 'administrator'
    },
    
    // Dashboard URLs by role
    dashboardUrls: {
        trader: 'pages/trader/dashboard-trader.html',
        agent: 'pages/agent/dashboard-agent.html',
        officer: 'pages/officer/dashboard-officer.html',
        inspector: 'pages/inspector/dashboard-inspector.html',
        supervisor: 'pages/supervisor/dashboard-supervisor.html',
        administrator: 'pages/admin/dashboard-admin.html'
    }
};

// Export dashboard URLs separately for easier import
export const dashboardUrls = SUPABASE_CONFIG.dashboardUrls;

// ================================================================
// ERROR MESSAGES
// ================================================================

export const ERROR_MESSAGES = {
    auth: {
        invalidCredentials: 'Invalid email or password',
        emailNotConfirmed: 'Please confirm your email address',
        weakPassword: 'Password should be at least 6 characters',
        emailAlreadyInUse: 'Email already registered',
        sessionExpired: 'Session expired. Please sign in again'
    },
    storage: {
        fileTooLarge: 'File size exceeds maximum limit',
        invalidFileType: 'Invalid file type',
        uploadFailed: 'Failed to upload file',
        deleteFailed: 'Failed to delete file'
    },
    database: {
        fetchFailed: 'Failed to fetch data',
        insertFailed: 'Failed to create record',
        updateFailed: 'Failed to update record',
        deleteFailed: 'Failed to delete record'
    },
    network: {
        offline: 'You are offline. Please check your connection',
        timeout: 'Request timed out. Please try again'
    }
};

// ================================================================
// SUCCESS MESSAGES
// ================================================================

export const SUCCESS_MESSAGES = {
    auth: {
        signIn: 'Signed in successfully',
        signUp: 'Account created successfully',
        signOut: 'Signed out successfully',
        passwordReset: 'Password reset email sent',
        passwordUpdated: 'Password updated successfully',
        emailUpdated: 'Email updated successfully'
    },
    profile: {
        updated: 'Profile updated successfully',
        avatarUpdated: 'Avatar updated successfully'
    },
    application: {
        created: 'Application created successfully',
        submitted: 'Application submitted successfully',
        updated: 'Application updated successfully',
        deleted: 'Application deleted successfully'
    },
    document: {
        uploaded: 'Document uploaded successfully',
        deleted: 'Document deleted successfully'
    },
    payment: {
        processed: 'Payment processed successfully'
    }
};
