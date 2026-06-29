-- ================================================================
-- POSTGRESQL FUNCTIONS FOR BUSINESS LOGIC
-- ================================================================

-- Helper: Get current profile ID from auth context
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM profiles WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Update profile timestamp
CREATE OR REPLACE FUNCTION update_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create profile for new user
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role user_role;
BEGIN
    -- Default role
    v_role := 'trader'::user_role;

    -- Only use the supplied role if it is valid
    BEGIN
        IF NEW.raw_user_meta_data ? 'role' THEN
            v_role := (NEW.raw_user_meta_data->>'role')::user_role;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            v_role := 'trader'::user_role;
    END;

    INSERT INTO public.profiles (
        user_id,
        full_name,
        email,
        role,
        status
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        NEW.email,
        v_role,
        'active'
    );

    RETURN NEW;

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Generate unique application number (trigger version - uses NEW row)
DROP FUNCTION IF EXISTS generate_application_number();
CREATE FUNCTION generate_application_number()
RETURNS TRIGGER AS $$
DECLARE
    prefix TEXT;
    sequence_num INTEGER;
    new_number TEXT;
    app_type TEXT;
BEGIN
    app_type := COALESCE(NEW.application_type, 'CVET');
    
    SELECT value INTO prefix FROM system_settings WHERE key = 'application_number_prefix';
    IF prefix IS NULL THEN prefix := 'CVET'; END IF;
    
    UPDATE system_settings SET value = (CAST(value AS INTEGER) + 1)::TEXT WHERE key = 'application_number_sequence' RETURNING CAST(value AS INTEGER) INTO sequence_num;
    IF sequence_num IS NULL THEN sequence_num := 1; INSERT INTO system_settings (key, value, description, category) VALUES ('application_number_sequence', '1', 'Current application number sequence', 'applications') ON CONFLICT (key) DO NOTHING; END IF;
    
    new_number := prefix || '-' || LPAD(sequence_num::TEXT, 6, '0');
    WHILE EXISTS (SELECT 1 FROM applications WHERE application_number = new_number) LOOP
        sequence_num := sequence_num + 1;
        new_number := prefix || '-' || LPAD(sequence_num::TEXT, 6, '0');
    END LOOP;
    
    UPDATE system_settings SET value = sequence_num::TEXT WHERE key = 'application_number_sequence';
    NEW.application_number := new_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate unique payment number (trigger version - uses NEW row)
DROP FUNCTION IF EXISTS generate_payment_number();
CREATE FUNCTION generate_payment_number()
RETURNS TRIGGER AS $$
DECLARE
    sequence_num INTEGER;
    new_number TEXT;
BEGIN
    new_number := 'PAY-' || EXTRACT(YEAR FROM NOW()) || '-';
    SELECT COALESCE(COUNT(*), 0) + 1 INTO sequence_num FROM payments WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    new_number := new_number || LPAD(sequence_num::TEXT, 6, '0');
    NEW.payment_number := new_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log activity
CREATE OR REPLACE FUNCTION log_activity(user_id UUID, activity_type TEXT, description TEXT, metadata JSONB DEFAULT '{}')
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO activity_logs (user_id, activity_type, description, metadata, ip_address)
    VALUES (user_id, activity_type, description, metadata, inet_client_addr())
    RETURNING id INTO log_id;
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Send notification
CREATE OR REPLACE FUNCTION send_notification(user_id UUID, title TEXT, message TEXT, notification_type notification_type DEFAULT 'info', link TEXT DEFAULT NULL, reference_id UUID DEFAULT NULL, reference_type TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, title, message, type, link, reference_id, reference_type)
    VALUES (user_id, title, message, notification_type, link, reference_id, reference_type)
    RETURNING id INTO notification_id;
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update dashboard counters
CREATE OR REPLACE FUNCTION update_dashboard_counters()
RETURNS TABLE (
    total_applications BIGINT,
    pending_applications BIGINT,
    approved_applications BIGINT,
    rejected_applications BIGINT,
    unread_notifications BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM applications WHERE user_id = get_current_profile_id()),
        (SELECT COUNT(*) FROM applications WHERE user_id = get_current_profile_id() AND status IN ('pending_review', 'under_inspection')),
        (SELECT COUNT(*) FROM applications WHERE user_id = get_current_profile_id() AND status = 'approved'),
        (SELECT COUNT(*) FROM applications WHERE user_id = get_current_profile_id() AND status = 'rejected'),
        (SELECT COUNT(*) FROM notifications WHERE user_id = get_current_profile_id() AND read = FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit changes
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address)
        VALUES (get_current_profile_id(), 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW), inet_client_addr());
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address)
        VALUES (get_current_profile_id(), 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), inet_client_addr());
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, ip_address)
        VALUES (get_current_profile_id(), 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), inet_client_addr());
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
