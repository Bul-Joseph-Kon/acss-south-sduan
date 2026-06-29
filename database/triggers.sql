-- ================================================================
-- POSTGRESQL TRIGGERS FOR AUTOMATION
-- ================================================================

-- Trigger: Create profile on new user signup
-- DISABLED: Trigger causes HTTP 500 error during Supabase auth signup
-- Profile creation is now handled manually in frontend (js/auth.js)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION create_user_profile();

-- Trigger: Update profile timestamp on update
DROP TRIGGER IF EXISTS update_profiles_timestamp ON profiles;
CREATE TRIGGER update_profiles_timestamp
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_timestamp();

-- Trigger: Generate application number on insert
DROP TRIGGER IF EXISTS generate_application_number_trigger ON applications;
CREATE TRIGGER generate_application_number_trigger
    BEFORE INSERT ON applications
    FOR EACH ROW
    WHEN (NEW.application_number IS NULL OR NEW.application_number = '')
    EXECUTE FUNCTION generate_application_number();

-- Trigger: Generate payment number on insert
DROP TRIGGER IF EXISTS generate_payment_number_trigger ON payments;
CREATE TRIGGER generate_payment_number_trigger
    BEFORE INSERT ON payments
    FOR EACH ROW
    WHEN (NEW.payment_number IS NULL OR NEW.payment_number = '')
    EXECUTE FUNCTION generate_payment_number();

-- Trigger: Audit applications changes
DROP TRIGGER IF EXISTS audit_applications ON applications;
CREATE TRIGGER audit_applications
    AFTER INSERT OR UPDATE OR DELETE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION audit_changes();

-- Trigger: Audit profiles changes
DROP TRIGGER IF EXISTS audit_profiles ON profiles;
CREATE TRIGGER audit_profiles
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION audit_changes();

-- Trigger: Audit payments changes
DROP TRIGGER IF EXISTS audit_payments ON payments;
CREATE TRIGGER audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION audit_changes();

-- Trigger: Audit documents changes
DROP TRIGGER IF EXISTS audit_documents ON documents;
CREATE TRIGGER audit_documents
    AFTER INSERT OR UPDATE OR DELETE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION audit_changes();

-- Trigger: Update application timestamp
DROP TRIGGER IF EXISTS update_applications_timestamp ON applications;
CREATE TRIGGER update_applications_timestamp
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_timestamp();

-- Trigger: Update application items timestamp
DROP TRIGGER IF EXISTS update_application_items_timestamp ON application_items;
CREATE TRIGGER update_application_items_timestamp
    BEFORE UPDATE ON application_items
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_timestamp();

-- Trigger: Update payments timestamp
DROP TRIGGER IF EXISTS update_payments_timestamp ON payments;
CREATE TRIGGER update_payments_timestamp
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_timestamp();

-- Trigger: Update system settings timestamp
DROP TRIGGER IF EXISTS update_system_settings_timestamp ON system_settings;
CREATE TRIGGER update_system_settings_timestamp
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_timestamp();

-- Trigger: Update services timestamp
DROP TRIGGER IF EXISTS update_services_timestamp ON services;
CREATE TRIGGER update_services_timestamp
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_timestamp();

-- Trigger: Update departments timestamp
DROP TRIGGER IF EXISTS update_departments_timestamp ON departments;
CREATE TRIGGER update_departments_timestamp
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_timestamp();

-- Trigger: Update offices timestamp
DROP TRIGGER IF EXISTS update_offices_timestamp ON offices;
CREATE TRIGGER update_offices_timestamp
    BEFORE UPDATE ON offices
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_timestamp();

-- Trigger: Update tariff codes timestamp
DROP TRIGGER IF EXISTS update_tariff_codes_timestamp ON tariff_codes;
CREATE TRIGGER update_tariff_codes_timestamp
    BEFORE UPDATE ON tariff_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_timestamp();

-- Trigger: Update currencies timestamp
DROP TRIGGER IF EXISTS update_currencies_timestamp ON currencies;
CREATE TRIGGER update_currencies_timestamp
    BEFORE UPDATE ON currencies
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_timestamp();

-- Trigger: Send notification on application status change
CREATE OR REPLACE FUNCTION notify_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM send_notification(
            NEW.user_id,
            'Application Status Updated',
            'Your application ' || NEW.application_number || ' status is now: ' || NEW.status,
            'info',
            '/applications/' || NEW.id,
            NEW.id,
            'application'
        );
        
        IF NEW.agent_id IS NOT NULL AND NEW.agent_id != NEW.user_id THEN
            PERFORM send_notification(
                NEW.agent_id,
                'Application Status Updated',
                'Application ' || NEW.application_number || ' status is now: ' || NEW.status,
                'info',
                '/applications/' || NEW.id,
                NEW.id,
                'application'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_status_change ON applications;
CREATE TRIGGER trigger_notify_on_status_change
    AFTER UPDATE ON applications
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_on_status_change();

-- Trigger: Log activity on new application
CREATE OR REPLACE FUNCTION log_new_application()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM log_activity(
        NEW.user_id,
        'APPLICATION_CREATED',
        'New application created: ' || NEW.application_number,
        jsonb_build_object('application_id', NEW.id, 'application_number', NEW.application_number, 'type', NEW.application_type)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_new_application ON applications;
CREATE TRIGGER trigger_log_new_application
    AFTER INSERT ON applications
    FOR EACH ROW
    EXECUTE FUNCTION log_new_application();

-- Trigger: Log activity on document upload
CREATE OR REPLACE FUNCTION log_document_upload()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM log_activity(
        NEW.user_id,
        'DOCUMENT_UPLOADED',
        'Document uploaded: ' || NEW.document_name,
        jsonb_build_object('document_id', NEW.id, 'application_id', NEW.application_id, 'document_type', NEW.document_type)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_document_upload ON documents;
CREATE TRIGGER trigger_log_document_upload
    AFTER INSERT ON documents
    FOR EACH ROW
    EXECUTE FUNCTION log_document_upload();
