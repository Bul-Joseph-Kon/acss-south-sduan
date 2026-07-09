// ================================================================
// DATABASE MODULE
// ================================================================
// Generic database operations with Supabase
// ================================================================

import supabase from './supabase.js';
import { handleSupabaseError } from './supabase.js';

// ================================================================
// GENERIC FETCH
// ================================================================

export async function fetchTable(tableName, options = {}) {
    try {
        let query = supabase.from(tableName).select('*');

        if (options.filters) {
            Object.keys(options.filters).forEach(key => {
                const val = options.filters[key];
                if (Array.isArray(val)) {
                    query = query.in(key, val);
                } else {
                    query = query.eq(key, val);
                }
            });
        }

        if (options.orderBy) {
            query = query.order(options.orderBy.column, { 
                ascending: options.orderBy.ascending !== false 
            });
        }

        if (options.limit) {
            query = query.limit(options.limit);
        }

        if (options.range) {
            query = query.range(options.range.start, options.range.end);
        }

        const { data, error } = await query;

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error(`Fetch ${tableName} error:`, error);
        return { success: false, error: handleSupabaseError(error) };
    }
}

// ================================================================
// FETCH BY ID
// ================================================================

export async function fetchById(tableName, id) {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error(`Fetch ${tableName} by ID error:`, error);
        return { success: false, error: handleSupabaseError(error) };
    }
}

// ================================================================
// INSERT RECORD
// ================================================================

export async function insertRecord(tableName, record) {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .insert(record)
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error(`Insert ${tableName} error:`, error);
        return { success: false, error: handleSupabaseError(error) };
    }
}

// ================================================================
// UPDATE RECORD
// ================================================================

export async function updateRecord(tableName, id, updates) {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error(`Update ${tableName} error:`, error);
        return { success: false, error: handleSupabaseError(error) };
    }
}

// ================================================================
// DELETE RECORD
// ================================================================

export async function deleteRecord(tableName, id) {
    try {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error(`Delete ${tableName} error:`, error);
        return { success: false, error: handleSupabaseError(error) };
    }
}

// ================================================================
// BATCH INSERT
// ================================================================

export async function batchInsert(tableName, records) {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .insert(records)
            .select();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error(`Batch insert ${tableName} error:`, error);
        return { success: false, error: handleSupabaseError(error) };
    }
}

// ================================================================
// BATCH UPDATE
// ================================================================

export async function batchUpdate(tableName, updates, filterColumn, filterValue) {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .update(updates)
            .eq(filterColumn, filterValue)
            .select();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error(`Batch update ${tableName} error:`, error);
        return { success: false, error: handleSupabaseError(error) };
    }
}

// ================================================================
// COUNT RECORDS
// ================================================================

export async function countRecords(tableName, filters = {}) {
    try {
        let query = supabase.from(tableName).select('*', { count: 'exact', head: true });

        Object.keys(filters).forEach(key => {
            query = query.eq(key, filters[key]);
        });

        const { count, error } = await query;

        if (error) {
            console.error(`Count ${tableName} error:`, JSON.stringify(error));
            throw error;
        }

        return { success: true, count };
    } catch (error) {
        console.error(`Count ${tableName} error:`, error);
        return { success: false, error: handleSupabaseError(error) };
    }
}

// ================================================================
// SEARCH RECORDS
// ================================================================

export async function searchRecords(tableName, searchTerm, columns) {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .or(columns.map(col => `${col}.ilike.%${searchTerm}%`).join(','));

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error(`Search ${tableName} error:`, error);
        return { success: false, error: handleSupabaseError(error) };
    }
}

// ================================================================
// JOIN TABLES
// ================================================================

export async function fetchWithJoin(tableName, joinTables, options = {}) {
    try {
        // Note: This function uses ambiguous relationships. 
        // For production use, replace with explicit foreign key syntax:
        // e.g., profiles!table_column_fkey(*) instead of profiles(*)
        const selectColumns = joinTables.map(table => `${table}(*`).join(',');
        let query = supabase.from(tableName).select(`*,${selectColumns}`);

        if (options.filters) {
            Object.keys(options.filters).forEach(key => {
                query = query.eq(key, options.filters[key]);
            });
        }

        if (options.orderBy) {
            query = query.order(options.orderBy.column, { 
                ascending: options.orderBy.ascending !== false 
            });
        }

        if (options.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error(`Fetch ${tableName} with join error:`, error);
        return { success: false, error: handleSupabaseError(error) };
    }
}
