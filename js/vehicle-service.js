// ================================================================
// VEHICLE SERVICE MODULE
// ================================================================
// Handles all vehicle-related operations
// ================================================================

import supabase from './supabase.js';
import { fetchTable, fetchById, insertRecord, updateRecord, deleteRecord, countRecords } from './database.js';
import { getUserProfile } from './auth.js';

// ================================================================
// FETCH VEHICLES
// ================================================================

export async function fetchVehicles(options = {}) {
    const filters = options.filters || {};
    
    return fetchTable('vehicles', {
        filters,
        orderBy: options.orderBy || { column: 'created_at', ascending: false },
        limit: options.limit
    });
}

// ================================================================
// FETCH VEHICLE BY ID
// ================================================================

export async function fetchVehicleById(id) {
    return fetchById('vehicles', id);
}

// ================================================================
// SEARCH VEHICLES
// ================================================================

export async function searchVehicles(searchCriteria) {
    try {
        const { vin, registrationNumber, declarationNumber } = searchCriteria;
        
        let query = supabase.from('vehicles').select('*');
        
        if (vin) {
            query = query.ilike('vin', `%${vin}%`);
        }
        if (registrationNumber) {
            query = query.ilike('registration_number', `%${registrationNumber}%`);
        }
        if (declarationNumber) {
            query = query.ilike('declaration_number', `%${declarationNumber}%`);
        }
        
        const { data, error } = await query.limit(50);
        
        if (error) throw error;
        
        return { success: true, data };
    } catch (error) {
        console.error('Search vehicles error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// CREATE VEHICLE
// ================================================================

export async function createVehicle(vehicleData) {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user ? await getUserProfile(user.id) : null;
    
    const newVehicle = {
        ...vehicleData,
        trader_id: profile?.id,
        status: 'pending'
    };

    return insertRecord('vehicles', newVehicle);
}

// ================================================================
// UPDATE VEHICLE
// ================================================================

export async function updateVehicle(id, updates) {
    return updateRecord('vehicles', id, updates);
}

// ================================================================
// DELETE VEHICLE
// ================================================================

export async function deleteVehicle(id) {
    return deleteRecord('vehicles', id);
}

// ================================================================
// FETCH VEHICLE VERIFICATIONS
// ================================================================

export async function fetchVehicleVerifications(vehicleId, options = {}) {
    try {
        let query = supabase
            .from('vehicle_verifications')
            .select('*')
            .eq('vehicle_id', vehicleId);
        
        if (options.orderBy) {
            query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending });
        } else {
            query = query.order('created_at', { ascending: false });
        }
        
        if (options.limit) {
            query = query.limit(options.limit);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        return { success: true, data };
    } catch (error) {
        console.error('Fetch vehicle verifications error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// FETCH LATEST VERIFICATION FOR VEHICLE
// ================================================================

export async function fetchLatestVehicleVerification(vehicleId) {
    try {
        const { data, error } = await supabase
            .from('vehicle_verifications')
            .select('*')
            .eq('vehicle_id', vehicleId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Fetch latest verification error:', error);
        return { success: false, error: error.message };
    }
}

// ================================================================
// CREATE VERIFICATION
// ================================================================

export async function createVehicleVerification(verificationData) {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user ? await getUserProfile(user.id) : null;
    
    const newVerification = {
        ...verificationData,
        verified_by: profile?.id,
        verified_at: new Date().toISOString()
    };

    return insertRecord('vehicle_verifications', newVerification);
}

// ================================================================
// UPDATE VERIFICATION
// ================================================================

export async function updateVehicleVerification(id, updates) {
    return updateRecord('vehicle_verifications', id, updates);
}

// ================================================================
// FETCH VEHICLE STATISTICS
// ================================================================

export async function fetchVehicleStatistics() {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user ? await getUserProfile(user.id) : null;
    
    const filters = profile ? { trader_id: profile.id } : {};

    const [totalResult, pendingResult, verifiedResult, rejectedResult] = await Promise.all([
        countRecords('vehicles', filters),
        countRecords('vehicles', { ...filters, status: 'pending' }),
        countRecords('vehicles', { ...filters, status: 'verified' }),
        countRecords('vehicles', { ...filters, status: 'rejected' })
    ]);

    return {
        total: totalResult.success ? totalResult.count : 0,
        pending: pendingResult.success ? pendingResult.count : 0,
        verified: verifiedResult.success ? verifiedResult.count : 0,
        rejected: rejectedResult.success ? rejectedResult.count : 0
    };
}

// ================================================================
// VALIDATE VEHICLE DATA
// ================================================================

export async function validateVehicleData(vehicleData) {
    const errors = [];
    const warnings = [];

    // Check required fields
    if (!vehicleData.vin) errors.push('VIN is required');
    if (!vehicleData.registration_number) errors.push('Registration number is required');
    if (!vehicleData.make) errors.push('Vehicle make is required');
    if (!vehicleData.model) errors.push('Vehicle model is required');
    if (!vehicleData.year) errors.push('Vehicle year is required');
    if (!vehicleData.color) errors.push('Vehicle color is required');

    // Validate VIN format (17 characters)
    if (vehicleData.vin && vehicleData.vin.length !== 17) {
        warnings.push('VIN should be 17 characters');
    }

    // Validate year
    if (vehicleData.year) {
        const currentYear = new Date().getFullYear();
        if (vehicleData.year < 1900 || vehicleData.year > currentYear + 1) {
            warnings.push('Vehicle year seems invalid');
        }
    }

    return {
        success: errors.length === 0,
        errors,
        warnings
    };
}

// ================================================================
// CHECK FOR DUPLICATE VEHICLE
// ================================================================

export async function checkDuplicateVehicle(vin, registrationNumber, excludeId = null) {
    try {
        let query = supabase
            .from('vehicles')
            .select('id')
            .or(`vin.eq.${vin},registration_number.eq.${registrationNumber}`);
        
        if (excludeId) {
            query = query.neq('id', excludeId);
        }
        
        const { data, error } = await query.limit(1);
        
        if (error) throw error;
        
        return {
            isDuplicate: data && data.length > 0,
            existingVehicleId: data?.[0]?.id
        };
    } catch (error) {
        console.error('Check duplicate vehicle error:', error);
        return { isDuplicate: false, error: error.message };
    }
}

// ================================================================
// GENERATE VEHICLE QR CODE DATA
// ================================================================

export function generateVehicleQRCodeData(vehicle) {
    return {
        id: vehicle.id,
        vin: vehicle.vin,
        registrationNumber: vehicle.registration_number,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        status: vehicle.status,
        generatedAt: new Date().toISOString()
    };
}

// ================================================================
// GENERATE VERIFICATION QR CODE DATA
// ================================================================

export function generateVerificationQRCodeData(verification) {
    return {
        id: verification.id,
        vehicleId: verification.vehicle_id,
        verificationType: verification.verification_type,
        result: verification.result,
        verifiedAt: verification.verified_at,
        verifiedBy: verification.verified_by,
        generatedAt: new Date().toISOString()
    };
}
