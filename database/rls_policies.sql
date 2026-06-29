-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================
-- This file contains all RLS policies for secure data access
-- Run this in Supabase SQL Editor after running the schema migration
-- ================================================================

-- ================================================================
-- HELPER FUNCTION: Get current user profile
-- ================================================================

CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS UUID AS $$
    SELECT id FROM profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- ================================================================
-- PROFILES TABLE RLS
-- ================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (user_id = auth.uid());

-- Users can insert their own profile (for registration)
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Service role (triggers/functions) can bypass RLS for profile creation
CREATE POLICY "Service role can insert profiles"
    ON profiles FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Administrators can view all profiles
CREATE POLICY "Administrators can view all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- Administrators can update all profiles
CREATE POLICY "Administrators can update all profiles"
    ON profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- ================================================================
-- ROLES TABLE RLS
-- ================================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Everyone can view roles
CREATE POLICY "Everyone can view roles"
    ON roles FOR SELECT
    USING (true);

-- Only administrators can modify roles
CREATE POLICY "Administrators can insert roles"
    ON roles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

CREATE POLICY "Administrators can update roles"
    ON roles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

CREATE POLICY "Administrators can delete roles"
    ON roles FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- ================================================================
-- APPLICATIONS TABLE RLS
-- ================================================================

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own applications
CREATE POLICY "Users can view own applications"
    ON applications FOR SELECT
    USING (user_id = get_current_profile_id());

-- Agents can view applications assigned to them
CREATE POLICY "Agents can view assigned applications"
    ON applications FOR SELECT
    USING (
        agent_id = get_current_profile_id() OR
        user_id = get_current_profile_id()
    );

-- Officers can view applications assigned to them
CREATE POLICY "Officers can view assigned applications"
    ON applications FOR SELECT
    USING (
        officer_id = get_current_profile_id() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role IN ('officer', 'supervisor', 'administrator')
        )
    );

-- Inspectors can view applications assigned for inspection
CREATE POLICY "Inspectors can view assigned applications"
    ON applications FOR SELECT
    USING (
        inspector_id = get_current_profile_id()
    );

-- Supervisors can view departmental applications
CREATE POLICY "Supervisors can view departmental applications"
    ON applications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role IN ('supervisor', 'administrator')
        )
    );

-- Administrators can view all applications
CREATE POLICY "Administrators can view all applications"
    ON applications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- Users can create applications
CREATE POLICY "Users can create applications"
    ON applications FOR INSERT
    WITH CHECK (user_id = get_current_profile_id());

-- Users can update their own draft applications
CREATE POLICY "Users can update own draft applications"
    ON applications FOR UPDATE
    USING (
        user_id = get_current_profile_id() AND
        status = 'draft'
    );

-- Officers can update assigned applications
CREATE POLICY "Officers can update assigned applications"
    ON applications FOR UPDATE
    USING (
        officer_id = get_current_profile_id() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role IN ('officer', 'supervisor', 'administrator')
        )
    );

-- Inspectors can update inspection status
CREATE POLICY "Inspectors can update inspection status"
    ON applications FOR UPDATE
    USING (
        inspector_id = get_current_profile_id() AND
        status = 'under_inspection'
    );

-- ================================================================
-- APPLICATION ITEMS TABLE RLS
-- ================================================================

ALTER TABLE application_items ENABLE ROW LEVEL SECURITY;

-- Users can view items for their applications
CREATE POLICY "Users can view own application items"
    ON application_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = application_items.application_id 
            AND applications.user_id = get_current_profile_id()
        )
    );

-- Officers can view items for assigned applications
CREATE POLICY "Officers can view assigned application items"
    ON application_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = application_items.application_id 
            AND applications.officer_id = get_current_profile_id()
        )
    );

-- Administrators can view all items
CREATE POLICY "Administrators can view all application items"
    ON application_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- Users can insert items for their applications
CREATE POLICY "Users can insert own application items"
    ON application_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = application_items.application_id 
            AND applications.user_id = get_current_profile_id()
            AND applications.status = 'draft'
        )
    );

-- Users can update items for their draft applications
CREATE POLICY "Users can update own application items"
    ON application_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = application_items.application_id 
            AND applications.user_id = get_current_profile_id()
            AND applications.status = 'draft'
        )
    );

-- ================================================================
-- DOCUMENTS TABLE RLS
-- ================================================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Users can view their own documents
CREATE POLICY "Users can view own documents"
    ON documents FOR SELECT
    USING (user_id = get_current_profile_id());

-- Users can view documents for their applications
CREATE POLICY "Users can view application documents"
    ON documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = documents.application_id 
            AND applications.user_id = get_current_profile_id()
        )
    );

-- Officers can view documents for assigned applications
CREATE POLICY "Officers can view assigned documents"
    ON documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = documents.application_id 
            AND applications.officer_id = get_current_profile_id()
        )
    );

-- Administrators can view all documents
CREATE POLICY "Administrators can view all documents"
    ON documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- Users can upload documents for their applications
CREATE POLICY "Users can upload documents"
    ON documents FOR INSERT
    WITH CHECK (
        user_id = get_current_profile_id() OR
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = documents.application_id 
            AND applications.user_id = get_current_profile_id()
        )
    );

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents"
    ON documents FOR DELETE
    USING (user_id = get_current_profile_id());

-- ================================================================
-- NOTIFICATIONS TABLE RLS
-- ================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (user_id = get_current_profile_id());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (user_id = get_current_profile_id());

-- Users can insert notifications (via trigger)
CREATE POLICY "Users can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

-- ================================================================
-- PAYMENTS TABLE RLS
-- ================================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
    ON payments FOR SELECT
    USING (user_id = get_current_profile_id());

-- Users can view payments for their applications
CREATE POLICY "Users can view application payments"
    ON payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = payments.application_id 
            AND applications.user_id = get_current_profile_id()
        )
    );

-- Administrators can view all payments
CREATE POLICY "Administrators can view all payments"
    ON payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- Users can create payments for their applications
CREATE POLICY "Users can create payments"
    ON payments FOR INSERT
    WITH CHECK (
        user_id = get_current_profile_id() OR
        EXISTS (
            SELECT 1 FROM applications 
            WHERE applications.id = payments.application_id 
            AND applications.user_id = get_current_profile_id()
        )
    );

-- ================================================================
-- AUDIT LOGS TABLE RLS
-- ================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
    ON audit_logs FOR SELECT
    USING (user_id = get_current_profile_id());

-- Administrators can view all audit logs
CREATE POLICY "Administrators can view all audit logs"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (true);

-- ================================================================
-- ACTIVITY LOGS TABLE RLS
-- ================================================================

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own activity logs
CREATE POLICY "Users can view own activity logs"
    ON activity_logs FOR SELECT
    USING (user_id = get_current_profile_id());

-- Administrators can view all activity logs
CREATE POLICY "Administrators can view all activity logs"
    ON activity_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- System can insert activity logs
CREATE POLICY "System can insert activity logs"
    ON activity_logs FOR INSERT
    WITH CHECK (true);

-- ================================================================
-- SYSTEM SETTINGS TABLE RLS
-- ================================================================

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view system settings
CREATE POLICY "Everyone can view system settings"
    ON system_settings FOR SELECT
    USING (true);

-- Only administrators can modify system settings
CREATE POLICY "Administrators can update system settings"
    ON system_settings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

CREATE POLICY "Administrators can insert system settings"
    ON system_settings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- ================================================================
-- SERVICES TABLE RLS
-- ================================================================

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Everyone can view active services
CREATE POLICY "Everyone can view active services"
    ON services FOR SELECT
    USING (is_active = true);

-- Administrators can view all services
CREATE POLICY "Administrators can view all services"
    ON services FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- Only administrators can modify services
CREATE POLICY "Administrators can insert services"
    ON services FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

CREATE POLICY "Administrators can update services"
    ON services FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- ================================================================
-- DEPARTMENTS TABLE RLS
-- ================================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Everyone can view departments
CREATE POLICY "Everyone can view departments"
    ON departments FOR SELECT
    USING (true);

-- Only administrators can modify departments
CREATE POLICY "Administrators can modify departments"
    ON departments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- ================================================================
-- OFFICES TABLE RLS
-- ================================================================

ALTER TABLE offices ENABLE ROW LEVEL SECURITY;

-- Everyone can view active offices
CREATE POLICY "Everyone can view active offices"
    ON offices FOR SELECT
    USING (is_active = true);

-- Administrators can view all offices
CREATE POLICY "Administrators can view all offices"
    ON offices FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- Only administrators can modify offices
CREATE POLICY "Administrators can modify offices"
    ON offices FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- ================================================================
-- COUNTRIES TABLE RLS
-- ================================================================

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

-- Everyone can view active countries
CREATE POLICY "Everyone can view active countries"
    ON countries FOR SELECT
    USING (is_active = true);

-- Administrators can view all countries
CREATE POLICY "Administrators can view all countries"
    ON countries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- Only administrators can modify countries
CREATE POLICY "Administrators can modify countries"
    ON countries FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- ================================================================
-- PORTS TABLE RLS
-- ================================================================

ALTER TABLE ports ENABLE ROW LEVEL SECURITY;

-- Everyone can view active ports
CREATE POLICY "Everyone can view active ports"
    ON ports FOR SELECT
    USING (is_active = true);

-- Administrators can view all ports
CREATE POLICY "Administrators can view all ports"
    ON ports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- Only administrators can modify ports
CREATE POLICY "Administrators can modify ports"
    ON ports FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- ================================================================
-- TARIFF CODES TABLE RLS
-- ================================================================

ALTER TABLE tariff_codes ENABLE ROW LEVEL SECURITY;

-- Everyone can view active tariff codes
CREATE POLICY "Everyone can view active tariff codes"
    ON tariff_codes FOR SELECT
    USING (is_active = true);

-- Administrators can view all tariff codes
CREATE POLICY "Administrators can view all tariff codes"
    ON tariff_codes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- Only administrators can modify tariff codes
CREATE POLICY "Administrators can modify tariff codes"
    ON tariff_codes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- ================================================================
-- CURRENCIES TABLE RLS
-- ================================================================

ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;

-- Everyone can view active currencies
CREATE POLICY "Everyone can view active currencies"
    ON currencies FOR SELECT
    USING (is_active = true);

-- Administrators can view all currencies
CREATE POLICY "Administrators can view all currencies"
    ON currencies FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- Only administrators can modify currencies
CREATE POLICY "Administrators can modify currencies"
    ON currencies FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'administrator'
        )
    );

-- ================================================================
-- END OF RLS POLICIES
-- ================================================================
