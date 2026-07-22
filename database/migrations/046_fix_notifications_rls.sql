-- ================================================================
-- FIX NOTIFICATIONS RLS POLICY FOR ALL USERS
-- ================================================================
-- This migration adds RLS policies for notifications table
-- to allow users to view their own notifications
-- ================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own notifications by joining with profiles
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Allow users to insert their own notifications (for system use)
CREATE POLICY "Users can insert own notifications"
    ON notifications FOR INSERT
    WITH CHECK (
        user_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Allow users to update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (
        user_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );
