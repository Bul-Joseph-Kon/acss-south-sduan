// ================================================================
// DOCUMENTS MODULE
// ================================================================
// Handles all document-related operations
// ================================================================

import supabase from './supabase.js';
import { fetchTable, fetchById, insertRecord, updateRecord, deleteRecord, countRecords } from './database.js';
import { getUserProfile } from './auth.js';
import { uploadFile, deleteFile, getPublicUrl, validateFileSize, validateFileType } from './storage.js';

// ================================================================
// FETCH DOCUMENTS
// ================================================================

export async function fetchDocuments(options = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user ? await getUserProfile(user.id) : null;
    
    const filters = options.filters || {};
    if (profile && !options.includeAll) {
        filters.user_id = profile.id;
    }

    return fetchTable('documents', {
        filters,
        orderBy: options.orderBy || { column: 'created_at', ascending: false },
        limit: options.limit
    });
}

// ================================================================
// FETCH DOCUMENT BY ID
// ================================================================

export async function fetchDocumentById(id) {
    return fetchById('documents', id);
}

// ================================================================
// FETCH DOCUMENTS BY APPLICATION ID
// ================================================================

export async function fetchDocumentsByApplication(applicationId) {
    try {
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('application_id', applicationId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Fetch documents by application error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// UPLOAD DOCUMENT
// ================================================================

export async function uploadDocument(file, applicationId = null, documentType = null, metadata = {}) {
    try {
        console.log('=== UPLOADING DOCUMENT ===');
        console.log('File:', file.name);
        console.log('Application ID:', applicationId);
        console.log('Document Type:', documentType);

        const { data: { user } } = await supabase.auth.getUser();
        const profile = user ? await getUserProfile(user.id) : null;

        if (!profile) {
            throw new Error('User not authenticated');
        }

        // Validate file
        if (!validateFileSize(file, 'documents')) {
            throw new Error('File size exceeds maximum allowed size');
        }

        if (!validateFileType(file, 'documents')) {
            throw new Error('File type not allowed');
        }

        // Upload to Supabase Storage
        const filePath = `${profile.id}/${Date.now()}_${file.name}`;
        const uploadResult = await uploadFile('documents', file, filePath);

        if (!uploadResult.success) {
            throw new Error(uploadResult.error);
        }

        // Get public URL
        const urlResult = await getPublicUrl('documents', filePath);
        if (!urlResult.success) {
            throw new Error(urlResult.error);
        }

        // Create document record
        const documentData = {
            user_id: profile.id,
            application_id: applicationId,
            document_type: documentType || 'other',
            file_name: file.name,
            file_path: filePath,
            file_url: urlResult.url,
            file_size: file.size,
            file_type: file.type,
            status: 'uploaded',
            metadata: JSON.stringify(metadata)
        };

        const { data: document, error: dbError } = await supabase
            .from('documents')
            .insert(documentData)
            .select()
            .single();

        if (dbError) throw dbError;

        console.log('Document uploaded successfully:', document);
        return { success: true, data: document };
    } catch (error) {
        console.error('Upload document error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// UPDATE DOCUMENT
// ================================================================

export async function updateDocument(id, updates) {
    return updateRecord('documents', id, updates);
}

// ================================================================
// UPDATE DOCUMENT STATUS
// ================================================================

export async function updateDocumentStatus(documentId, status, verificationNotes = null) {
    const updates = { status };
    
    if (status === 'verified') {
        updates.verified_at = new Date().toISOString();
        if (verificationNotes) {
            updates.verification_notes = verificationNotes;
        }
    } else if (status === 'rejected') {
        updates.rejected_at = new Date().toISOString();
        if (verificationNotes) {
            updates.rejection_reason = verificationNotes;
        }
    }

    return updateDocument(documentId, updates);
}

// ================================================================
// DELETE DOCUMENT
// ================================================================

export async function deleteDocument(id) {
    try {
        console.log('=== DELETING DOCUMENT ===');
        console.log('Document ID:', id);

        // Get document details
        const { data: document, error: fetchError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        if (!document) throw new Error('Document not found');

        // Delete from storage
        if (document.file_path) {
            const deleteResult = await deleteFile('documents', document.file_path);
            if (!deleteResult.success) {
                console.warn('Failed to delete file from storage:', deleteResult.error);
            }
        }

        // Delete from database
        const { error: dbError } = await supabase
            .from('documents')
            .delete()
            .eq('id', id);

        if (dbError) throw dbError;

        console.log('Document deleted successfully');
        return { success: true };
    } catch (error) {
        console.error('Delete document error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// VERIFY DOCUMENT
// ================================================================

export async function verifyDocument(documentId, verified = true, notes = null) {
    const status = verified ? 'verified' : 'rejected';
    return updateDocumentStatus(documentId, status, notes);
}

// ================================================================
// FETCH DOCUMENT STATISTICS
// ================================================================

export async function fetchDocumentStatistics() {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user ? await getUserProfile(user.id) : null;
    
    const filters = profile ? { user_id: profile.id } : {};

    const [totalResult, uploadedResult, verifiedResult, rejectedResult] = await Promise.all([
        countRecords('documents', filters),
        countRecords('documents', { ...filters, status: 'uploaded' }),
        countRecords('documents', { ...filters, status: 'verified' }),
        countRecords('documents', { ...filters, status: 'rejected' })
    ]);

    return {
        total: totalResult.success ? totalResult.count : 0,
        uploaded: uploadedResult.success ? uploadedResult.count : 0,
        verified: verifiedResult.success ? verifiedResult.count : 0,
        rejected: rejectedResult.success ? rejectedResult.count : 0
    };
}

// ================================================================
// GET DOCUMENT DOWNLOAD URL
// ================================================================

export async function getDocumentDownloadUrl(documentId) {
    try {
        const { data: document, error: fetchError } = await supabase
            .from('documents')
            .select('file_path')
            .eq('id', documentId)
            .single();

        if (fetchError) throw fetchError;
        if (!document) throw new Error('Document not found');

        const urlResult = await getPublicUrl('documents', document.file_path);
        if (!urlResult.success) {
            throw new Error(urlResult.error);
        }

        return { success: true, url: urlResult.url };
    } catch (error) {
        console.error('Get document download URL error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// BATCH UPLOAD DOCUMENTS
// ================================================================

export async function batchUploadDocuments(files, applicationId = null, documentType = null) {
    try {
        console.log('=== BATCH UPLOADING DOCUMENTS ===');
        console.log('Files:', files.length);
        console.log('Application ID:', applicationId);

        const results = [];
        const errors = [];

        for (const file of files) {
            const result = await uploadDocument(file, applicationId, documentType);
            if (result.success) {
                results.push(result.data);
            } else {
                errors.push({ file: file.name, error: result.error });
            }
        }

        console.log('Batch upload complete:', { success: results.length, errors: errors.length });
        return {
            success: true,
            data: results,
            errors: errors,
            total: files.length,
            uploaded: results.length,
            failed: errors.length
        };
    } catch (error) {
        console.error('Batch upload documents error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// SEARCH DOCUMENTS
// ================================================================

export async function searchDocuments(searchTerm) {
    try {
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .or(`file_name.ilike.%${searchTerm}%,document_type.ilike.%${searchTerm}%`);

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Search documents error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// FETCH DOCUMENTS BY TYPE
// ================================================================

export async function fetchDocumentsByType(documentType, options = {}) {
    return fetchTable('documents', {
        filters: { document_type: documentType },
        orderBy: options.orderBy || { column: 'created_at', ascending: false },
        limit: options.limit
    });
}

// ================================================================
// FETCH DOCUMENTS BY STATUS
// ================================================================

export async function fetchDocumentsByStatus(status, options = {}) {
    return fetchTable('documents', {
        filters: { status },
        orderBy: options.orderBy || { column: 'created_at', ascending: false },
        limit: options.limit
    });
}
