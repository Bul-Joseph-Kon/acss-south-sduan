-- ================================================================
-- MIGRATION 049: Add Admin RPC to Delete User
-- ================================================================
-- Creates a secure RPC function to allow administrators to delete
-- users from auth.users. This bypasses the need to expose the
-- service role key on the client side.
-- ================================================================

CREATE OR REPLACE FUNCTION public.delete_user_by_id(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    caller_role TEXT;
BEGIN
    -- Check if the calling user is an administrator
    caller_role := public.get_user_role();
    
    IF caller_role != 'administrator' THEN
        RAISE EXCEPTION 'Access denied: Only administrators can delete users';
    END IF;

    -- Delete from auth.users (cascades to public.profiles)
    DELETE FROM auth.users WHERE id = target_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
