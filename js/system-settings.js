// ================================================================
// SYSTEM SETTINGS MODULE
// ================================================================
// Handles all system settings operations
// ================================================================

import supabase from './supabase.js';
import { fetchTable, fetchById, insertRecord, updateRecord, deleteRecord } from './database.js';

// ================================================================
// FETCH SYSTEM SETTINGS
// ================================================================

export async function fetchSystemSettings() {
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .select('*')
            .order('category', { ascending: true });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Fetch system settings error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// FETCH SYSTEM SETTING BY KEY
// ================================================================

export async function fetchSystemSetting(key) {
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .select('*')
            .eq('key', key)
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Fetch system setting error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// UPDATE SYSTEM SETTING
// ================================================================

export async function updateSystemSetting(key, value, updatedBy = null) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const actorId = updatedBy || user?.id;

        const { data, error } = await supabase
            .from('system_settings')
            .update({
                value: value,
                updated_at: new Date().toISOString(),
                updated_by: actorId
            })
            .eq('key', key)
            .select()
            .single();

        if (error) throw error;

        console.log('System setting updated:', key, '=', value);
        return { success: true, data };
    } catch (error) {
        console.error('Update system setting error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// BATCH UPDATE SYSTEM SETTINGS
// ================================================================

export async function batchUpdateSystemSettings(settings, updatedBy = null) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const actorId = updatedBy || user?.id;

        const updates = settings.map(setting => ({
            key: setting.key,
            value: setting.value,
            updated_at: new Date().toISOString(),
            updated_by: actorId
        }));

        const { data, error } = await supabase
            .from('system_settings')
            .upsert(updates, { onConflict: 'key' })
            .select();

        if (error) throw error;

        console.log('Batch system settings updated:', updates.length, 'settings');
        return { success: true, data };
    } catch (error) {
        console.error('Batch update system settings error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// RESET SYSTEM SETTING TO DEFAULT
// ================================================================

export async function resetSystemSettingToDefault(key) {
    try {
        // Get default value from initial data
        const { data: setting, error: fetchError } = await supabase
            .from('system_settings')
            .select('default_value')
            .eq('key', key)
            .single();

        if (fetchError) throw fetchError;
        if (!setting) throw new Error('Setting not found');

        return updateSystemSetting(key, setting.default_value);
    } catch (error) {
        console.error('Reset system setting error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// GET SETTINGS BY CATEGORY
// ================================================================

export async function getSettingsByCategory(category) {
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .select('*')
            .eq('category', category)
            .order('key', { ascending: true });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Get settings by category error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// AI SETTINGS FUNCTIONS
// ================================================================

export async function updateAIServiceSetting(serviceName, settingKey, value) {
    const key = `ai_${serviceName}_${settingKey}`;
    return updateSystemSetting(key, value);
}

export async function getAIServiceSettings(serviceName) {
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .select('*')
            .like('key', `ai_${serviceName}%`)
            .order('key', { ascending: true });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Get AI service settings error:', error);
        return { success: false, error: error.message };
    }
}

export async function toggleAIService(serviceName, enabled) {
    return updateAIServiceSetting(serviceName, 'enabled', enabled);
}

export async function updateAIServiceModel(serviceName, model) {
    return updateAIServiceSetting(serviceName, 'model', model);
}

export async function updateAIServiceAccuracy(serviceName, accuracy) {
    return updateAIServiceSetting(serviceName, 'accuracy', accuracy);
}

// ================================================================
// WORKFLOW SETTINGS FUNCTIONS
// ================================================================

export async function updateWorkflowSetting(workflowStage, settingKey, value) {
    const key = `workflow_${workflowStage}_${settingKey}`;
    return updateSystemSetting(key, value);
}

export async function getWorkflowSettings(workflowStage) {
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .select('*')
            .like('key', `workflow_${workflowStage}%`)
            .order('key', { ascending: true });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Get workflow settings error:', error);
        return { success: false, error: error.message };
    }
}

export async function enableWorkflowAutoRouting(workflowStage, enabled) {
    return updateWorkflowSetting(workflowStage, 'auto_route', enabled);
}

export async function updateWorkflowTimeout(workflowStage, timeoutMinutes) {
    return updateWorkflowSetting(workflowStage, 'timeout_minutes', timeoutMinutes);
}

// ================================================================
// SYSTEM INFO FUNCTIONS
// ================================================================

export async function getSystemInfo() {
    try {
        const [nameResult, versionResult, maintenanceResult] = await Promise.all([
            fetchSystemSetting('system_name'),
            fetchSystemSetting('system_version'),
            fetchSystemSetting('maintenance_mode')
        ]);

        return {
            success: true,
            data: {
                name: nameResult.success ? nameResult.data?.value : 'SSRA Customs Management System',
                version: versionResult.success ? versionResult.data?.value : '2.4.0',
                maintenanceMode: maintenanceResult.success ? maintenanceResult.data?.value === 'true' : false
            }
        };
    } catch (error) {
        console.error('Get system info error:', error);
        return { success: false, error: error.message };
    }
}

export async function setMaintenanceMode(enabled) {
    return updateSystemSetting('maintenance_mode', enabled.toString());
}

export async function updateSystemName(name) {
    return updateSystemSetting('system_name', name);
}
