import supabase from './supabase.js';
import { SUPABASE_CONFIG, ERROR_MESSAGES } from './config.js';
import { getUserProfile } from './auth.js';

export async function uploadFile(bucket, file, path = null) {
    try {
        const profile = await getUserProfile((await supabase.auth.getUser()).data.user?.id);
        const filePath = path || `${profile?.id}/${Date.now()}_${file.name}`;
        
        const { data, error } = await supabase.storage.from(bucket).upload(filePath, file);
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function downloadFile(bucket, path) {
    try {
        const { data, error } = await supabase.storage.from(bucket).download(path);
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getPublicUrl(bucket, path) {
    try {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return { success: true, url: data.publicUrl };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function deleteFile(bucket, path) {
    try {
        const { error } = await supabase.storage.from(bucket).remove([path]);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function listFiles(bucket, folder = null) {
    try {
        const profile = await getUserProfile((await supabase.auth.getUser()).data.user?.id);
        const folderPath = folder || profile?.id;
        
        const { data, error } = await supabase.storage.from(bucket).list(folderPath);
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export function validateFileSize(file, bucket) {
    const maxSize = SUPABASE_CONFIG.maxFileSize[bucket] || SUPABASE_CONFIG.maxFileSize.documents;
    return file.size <= maxSize;
}

export function validateFileType(file, bucket) {
    const allowedTypes = SUPABASE_CONFIG.allowedFileTypes[bucket] || SUPABASE_CONFIG.allowedFileTypes.documents;
    return allowedTypes.includes(file.type);
}

export function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}
