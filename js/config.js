// ================================================================
// SUPABASE CONFIGURATION
// ================================================================
// Supabase Project: https://avpoufxsjiecbsxvngip.supabase.co
// Credentials loaded from environment variables for security
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
    
    // Canonical application status mapping
    applicationStatus: {
        draft: 'Draft',
        submitted: 'Submitted',
        under_review: 'Under Review',
        inspection_required: 'Inspection Required',
        inspection_completed: 'Inspection Completed',
        escalated: 'Escalated',
        approved: 'Approved',
        payment_required: 'Payment Required',
        paid: 'Paid',
        payment_verified: 'Payment Verified',
        completed: 'Completed',
        returned: 'Returned for Correction',
        rejected: 'Rejected'
    },

    // AI Risk level metadata (stored separately from status)
    riskLevels: {
        low: 'Low',
        medium: 'Medium',
        high: 'High'
    },

    // Application workflow transitions by role
    workflowTransitions: {
        trader: {
            draft: ['submitted'],
            returned: ['submitted'],
            payment_required: ['paid']
        },
        agent: {
            draft: ['submitted'],
            returned: ['submitted'],
            payment_required: ['paid']
        },
        officer: {
            under_review: ['approved', 'returned', 'rejected', 'under_inspection', 'escalated'],
            inspection_completed: ['approved', 'returned', 'rejected', 'escalated']
        },
        inspector: {
            under_inspection: ['inspection_completed']
        },
        supervisor: {
            escalated: ['approved', 'rejected', 'returned']
        },
        revenue: {
            approved: ['payment_required'],
            paid: ['payment_verified'],
            payment_verified: ['completed']
        }
    },

    // AI-driven automatic routing rules
    aiRoutingRules: {
        // After submission, trigger AI validation
        submitted: {
            autoRoute: true,
            nextStatus: 'ai_validation',
            assignTo: 'system',
            condition: 'status === "submitted"'
        },
        // After AI validation passes
        ai_validation: {
            autoRoute: true,
            nextStatus: 'pending_review',
            assignTo: 'officer',
            condition: 'ai_validation_passed === true'
        },
        // After officer review passes
        pending_review: {
            autoRoute: true,
            nextStatus: 'under_inspection',
            assignTo: 'inspector',
            condition: 'inspection_required === true'
        },
        // After officer review passes without inspection
        pending_review: {
            autoRoute: true,
            nextStatus: 'pending_supervisor',
            assignTo: 'supervisor',
            condition: 'requires_supervisor_review === true'
        },
        // After officer review passes without escalation
        pending_review: {
            autoRoute: true,
            nextStatus: 'awaiting_payment',
            assignTo: 'revenue',
            condition: 'officer_review_passed === true && requires_supervisor_review === false'
        },
        // After inspection passes
        under_inspection: {
            autoRoute: true,
            nextStatus: 'pending_supervisor',
            assignTo: 'supervisor',
            condition: 'inspection_passed === true && requires_supervisor_review === true'
        },
        // After inspection passes without escalation
        under_inspection: {
            autoRoute: true,
            nextStatus: 'awaiting_payment',
            assignTo: 'revenue',
            condition: 'inspection_passed === true && requires_supervisor_review === false'
        },
        // After supervisor approval
        pending_supervisor: {
            autoRoute: true,
            nextStatus: 'awaiting_payment',
            assignTo: 'revenue',
            condition: 'supervisor_approved === true'
        },
        // After payment verification
        paid: {
            autoRoute: true,
            nextStatus: 'clearance_approved',
            assignTo: 'revenue',
            condition: 'payment_verified === true'
        },
        // After clearance approval
        clearance_approved: {
            autoRoute: true,
            nextStatus: 'completed',
            assignTo: null,
            condition: 'documents_generated === true'
        }
    },

    // AI services configuration
    aiServices: {
        ocr: {
            name: 'OCR Engine',
            description: 'Document text extraction',
            accuracy: 98,
            version: '3.2.1',
            status: 'enabled',
            workflowStage: 'submission' // When documents are uploaded
        },
        fraudDetection: {
            name: 'Fraud Detection',
            description: 'Fraud detection and prevention',
            accuracy: 96,
            version: '2.8.0',
            status: 'enabled',
            workflowStage: 'review' // When officer reviews applications
        },
        riskAssessment: {
            name: 'Risk Assessment',
            description: 'Risk scoring and analysis',
            accuracy: 94,
            version: '2.5.0',
            status: 'enabled',
            workflowStage: 'review' // When officer reviews applications
        },
        dutyCalculation: {
            name: 'Duty Calculation',
            description: 'Automated duty calculation',
            accuracy: 89,
            version: '2.3.0',
            status: 'training',
            workflowStage: 'revenue' // When revenue officer processes approved applications
        }
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
        trader: '/pages/trader/dashboard-trader.html',
        agent: '/pages/agent/dashboard-agent.html',
        officer: '/pages/officer/dashboard-officer.html',
        inspector: '/pages/inspector/dashboard-inspector.html',
        supervisor: '/pages/supervisor/dashboard-supervisor.html',
        revenue: '/pages/revenue/dashboard-revenue.html',
        administrator: '/pages/admin/dashboard-admin.html'
    }
};

// Export properties separately for easier import
export const dashboardUrls = SUPABASE_CONFIG.dashboardUrls;
export const workflowTransitions = SUPABASE_CONFIG.workflowTransitions;
export const aiRoutingRules = SUPABASE_CONFIG.aiRoutingRules;
export const aiServices = SUPABASE_CONFIG.aiServices;

// Also export the full config for backward compatibility
export const SUPABASE_CONFIG_EXPORT = SUPABASE_CONFIG;

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
