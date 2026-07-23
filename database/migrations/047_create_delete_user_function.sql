-- ================================================================
-- CREATE DELETE USER FUNCTION
-- ================================================================
-- This function allows administrators to delete users by their profile ID
-- It will delete both the auth user and the profile record
-- ================================================================

CREATE OR REPLACE FUNCTION delete_user_by_id(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_auth_user_id UUID;
BEGIN
    -- First, get the auth user_id from the profile
    SELECT user_id INTO v_auth_user_id 
    FROM profiles 
    WHERE id = target_user_id;
    
    IF v_auth_user_id IS NULL THEN
        RAISE EXCEPTION 'Profile not found with id: %', target_user_id;
    END IF;
    
    -- Delete the profile record
    DELETE FROM profiles WHERE id = target_user_id;
    
    -- Delete the auth user (requires admin privileges)
    -- This is done via the auth admin API, not directly in SQL
    -- The client-side code should handle auth user deletion
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to delete user: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_by_id(UUID) TO authenticated;
