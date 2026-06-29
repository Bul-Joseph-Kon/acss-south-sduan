-- ================================================================
-- SUPABASE STORAGE CONFIGURATION
-- ================================================================
-- This file contains SQL for creating storage buckets and policies
-- Run this in Supabase SQL Editor
-- ================================================================

-- ================================================================
-- STORAGE BUCKETS
-- ================================================================
-- Note: Create the following buckets in Supabase Dashboard > Storage:
-- 1. documents - For user uploaded documents
-- 2. avatars - For user profile avatars
-- 3. certificates - For issued certificates
-- ================================================================

-- Insert storage buckets (if not created via dashboard)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('documents', 'documents', false, 10485760, ARRAY['application/pdf'::text, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'::text, 'image/jpeg'::text, 'image/png'::text, 'application/zip'::text])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg'::text, 'image/png'::text, 'image/jpg'::text])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('certificates', 'certificates', true, 5242880, ARRAY['application/pdf'::text])
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- STORAGE POLICIES FOR DOCUMENTS BUCKET
-- ================================================================

DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
DROP POLICY IF EXISTS "Officers can view assigned documents" ON storage.objects;
DROP POLICY IF EXISTS "Administrators can view all documents" ON storage.objects;

-- Users can upload documents to their own folder
CREATE POLICY "Users can upload documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'documents' AND
        auth.uid()::TEXT = (storage.foldername(name))[1]
    );

-- Users can view their own documents
CREATE POLICY "Users can view own documents"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'documents' AND
        auth.uid()::TEXT = (storage.foldername(name))[1]
    );

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'documents' AND
        auth.uid()::TEXT = (storage.foldername(name))[1]
    );

-- Officers can view documents for assigned applications
CREATE POLICY "Officers can view assigned documents"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'documents' AND
        EXISTS (
            SELECT 1 FROM documents d
            JOIN applications a ON a.id = d.application_id
            JOIN profiles p ON p.id = a.officer_id
            WHERE d.storage_path = (storage.foldername(name))[1]
            AND p.user_id = auth.uid()
        )
    );

-- Administrators can view all documents
CREATE POLICY "Administrators can view all documents"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'documents' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- ================================================================
-- STORAGE POLICIES FOR AVATARS BUCKET
-- ================================================================

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Everyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid()::TEXT = (storage.foldername(name))[1]
    );

-- Everyone can view avatars (public bucket)
CREATE POLICY "Everyone can view avatars"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'avatars');

-- Users can update their own avatar
CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::TEXT = (storage.foldername(name))[1]
    );

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::TEXT = (storage.foldername(name))[1]
    );

-- ================================================================
-- STORAGE POLICIES FOR CERTIFICATES BUCKET
-- ================================================================

DROP POLICY IF EXISTS "Everyone can view certificates" ON storage.objects;
DROP POLICY IF EXISTS "System can upload certificates" ON storage.objects;
DROP POLICY IF EXISTS "Administrators can delete certificates" ON storage.objects;

-- Everyone can view certificates (public bucket)
CREATE POLICY "Everyone can view certificates"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'certificates');

-- Only system can upload certificates (via Edge Function)
CREATE POLICY "System can upload certificates"
    ON storage.objects FOR INSERT
    TO service_role
    WITH CHECK (bucket_id = 'certificates');

-- Only administrators can delete certificates
CREATE POLICY "Administrators can delete certificates"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'certificates' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- ================================================================
-- HELPER FUNCTION: Generate storage path
-- ================================================================

CREATE OR REPLACE FUNCTION generate_storage_path(bucket TEXT, user_id UUID, filename TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN bucket || '/' || user_id::TEXT || '/' || filename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- END OF STORAGE POLICIES
-- ================================================================
