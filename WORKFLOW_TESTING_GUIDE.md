# ACSS South Sudan - Complete Workflow Testing Guide

## Overview
This document provides a comprehensive guide for testing the entire ACSS South Sudan workflow from Clearing Agent submission to Cargo Release.

## Prerequisites

### Database Setup
1. Run all database migrations in order (001-017):
   - 001_initial_schema.sql
   - 002_add_applicant_type_to_profiles.sql
   - 003_add_staff_fields.sql
   - 004_fix_rls_recursion.sql
   - 005_add_officer_fields.sql
   - 006_add_inspection_fields.sql
   - 007_add_payment_fields.sql
   - 008_fix_admin_rls.sql
   - 009_add_applications_delete_policy.sql
   - 010_fix_application_number_generation.sql
   - 011_add_escalated_cases_table.sql
   - 012_add_risk_assessments_table.sql
   - 013_add_ai_validation_results_table.sql
   - 014_add_trader_details_to_applications.sql
   - 015_create_test_users.sql
   - 016_create_ai_validation_trigger.sql
   - 017_enable_realtime.sql

### Test Users
Create the following test users in Supabase Auth and update migration 015 with their user IDs:
- **Clearing Agent**: agent@test.com (role: agent)
- **Customs Officer**: officer@test.com (role: officer)
- **Inspector**: inspector@test.com (role: inspector)
- **Supervisor**: supervisor@test.com (role: supervisor)
- **Revenue Officer**: revenue@test.com (role: revenue)

### Environment Setup
1. Set environment variables in `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

## Complete Workflow Test

### Step 1: Clearing Agent Creates Declaration

**Test User**: agent@test.com

**Actions**:
1. Login as Clearing Agent
2. Navigate to "Create New Declaration"
3. Complete all 9 steps:
   - Step 1: Declaration Details
   - Step 2: Declarant Information (Trader details)
   - Step 3: Parties Information
   - Step 4: Shipment Information
   - Step 5: Goods Information
   - Step 6: Transport Information
   - Step 7: Supporting Documents
   - Step 8: AI Validation (auto-processed)
   - Step 9: Declaration Statement

**Expected Results**:
- Application saved as draft after each step
- Progress bar updates correctly
- All form fields saved to Supabase
- `agent_id` set to agent's profile ID
- `trader_name`, `trader_tin`, `trader_address`, `trader_contact`, `trader_email` populated from declarant information

**Database Verification**:
```sql
SELECT * FROM applications WHERE status = 'draft' ORDER BY created_at DESC LIMIT 1;
```

**Submit Declaration**:
1. Click "Submit Declaration" on Step 9
2. Status should change to 'submitted'
3. Application number auto-generated (format: CVET-XXXXXX)

**Database Verification**:
```sql
SELECT * FROM applications WHERE status = 'submitted' ORDER BY created_at DESC LIMIT 1;
```

### Step 2: AI Validation (Automatic)

**Trigger**: Application status changes to 'submitted'

**Expected Results**:
- AI validation trigger fires automatically
- Record created in `ai_validation_results` table
- Record created in `risk_assessments` table
- Application status changes to 'pending_review'
- Activity log created
- Audit log created
- Notification sent to agent

**Database Verification**:
```sql
-- Check AI validation results
SELECT * FROM ai_validation_results WHERE application_id = (SELECT id FROM applications ORDER BY created_at DESC LIMIT 1);

-- Check risk assessment
SELECT * FROM risk_assessments WHERE application_id = (SELECT id FROM applications ORDER BY created_at DESC LIMIT 1);

-- Check application status
SELECT status FROM applications ORDER BY created_at DESC LIMIT 1;

-- Check activity logs
SELECT * FROM activity_logs WHERE entity_id = (SELECT id FROM applications ORDER BY created_at DESC LIMIT 1);

-- Check audit logs
SELECT * FROM audit_logs WHERE entity_id = (SELECT id FROM applications ORDER BY created_at DESC LIMIT 1);

-- Check notifications
SELECT * FROM notifications WHERE entity_id = (SELECT id FROM applications ORDER BY created_at DESC LIMIT 1);
```

### Step 3: Customs Officer Review

**Test User**: officer@test.com

**Actions**:
1. Login as Customs Officer
2. Navigate to dashboard
3. View "Pending Review" queue
4. Select the submitted application
5. Review application details
6. Choose action: Approve, Return, or Reject

**Option A: Approve**
- Click "Approve"
- Add optional notes
- Status should change to 'under_inspection'
- `officer_id` set to officer's profile ID
- `reviewed_at` timestamp set

**Database Verification**:
```sql
SELECT status, officer_id, reviewed_at FROM applications WHERE id = (SELECT id FROM applications ORDER BY created_at DESC LIMIT 1);
```

**Option B: Return**
- Click "Return"
- Enter return reason (required)
- Status should change to 'returned'
- Agent notified

**Option C: Reject**
- Click "Reject"
- Enter rejection reason (required)
- Status should change to 'rejected'
- Agent notified

**Expected Results (for Approve)**:
- Application status: 'under_inspection'
- Activity log created
- Audit log created
- Notification sent to agent

### Step 4: Inspector Inspection

**Test User**: inspector@test.com

**Actions**:
1. Login as Inspector
2. Navigate to dashboard
3. View "Under Inspection" queue
4. Select the application
5. Review application details
6. Record inspection notes
7. Upload evidence documents (optional)
8. Choose action: Complete Inspection or Escalate

**Option A: Complete Inspection**
- Click "Complete Inspection"
- Add inspection report
- Status should change to 'approved'
- `inspector_id` set to inspector's profile ID
- `inspected_at` timestamp set

**Database Verification**:
```sql
SELECT status, inspector_id, inspected_at FROM applications WHERE id = (SELECT id FROM applications ORDER BY created_at DESC LIMIT 1);
```

**Option B: Escalate**
- Click "Escalate"
- Enter escalation reason (required)
- Select escalation type
- Status should change to 'escalated'
- Record created in `escalated_cases` table
- Supervisor notified

**Database Verification**:
```sql
-- Check escalated case
SELECT * FROM escalated_cases WHERE application_id = (SELECT id FROM applications ORDER BY created_at DESC LIMIT 1);

-- Check application status
SELECT status FROM applications WHERE id = (SELECT id FROM applications ORDER BY created AT DESC LIMIT 1);
```

**Expected Results (for Complete Inspection)**:
- Application status: 'approved'
- Activity log created
- Audit log created
- Notification sent to agent

### Step 5: Supervisor Escalation Resolution (if escalated)

**Test User**: supervisor@test.com

**Actions**:
1. Login as Supervisor
2. Navigate to dashboard
3. View "Escalated Cases" queue
4. Select the escalated case
5. Review escalation details
6. Choose action: Resolve, Return, or Reject

**Option A: Resolve and Approve**
- Click "Resolve and Approve"
- Enter resolution notes
- Status should change to 'approved'
- `supervisor_id` set to supervisor's profile ID
- Escalation record marked as resolved

**Database Verification**:
```sql
-- Check escalation resolution
SELECT * FROM escalated_cases WHERE application_id = (SELECT id FROM applications ORDER BY created_at DESC LIMIT 1);

-- Check application status
SELECT status, supervisor_id FROM applications WHERE id = (SELECT id FROM applications ORDER BY created_at DESC LIMIT 1);
```

**Expected Results**:
- Application status: 'approved'
- Escalation status: 'resolved'
- Activity log created
- Audit log created
- Notification sent to agent

### Step 6: Revenue Officer Invoice Generation

**Test User**: revenue@test.com

**Actions**:
1. Login as Revenue Officer
2. Navigate to dashboard
3. View "Approved" queue
4. Select the approved application
5. Review application details
6. Enter duty amount
7. Enter tax amount
8. System calculates total amount
9. Click "Generate Invoice"

**Expected Results**:
- Invoice number generated (format: INV-XXXXXXXX)
- Record created in `payments` table
- Application status changes to 'awaiting_payment'
- Due date set (7 days from now)
- Agent notified

**Database Verification**:
```sql
-- Check payment/invoice
SELECT * FROM payments WHERE application_id = (SELECT id FROM applications ORDER BY created_at DESC LIMIT 1);

-- Check application status
SELECT status FROM applications WHERE id = (SELECT id FROM applications ORDER BY created_at DESC LIMIT 1);
```

### Step 7: Payment Confirmation

**Test User**: revenue@test.com

**Actions**:
1. Navigate to "Awaiting Payment" queue
2. Select the application
3. Review invoice details
4. Enter payment method
5. Enter transaction reference (optional)
6. Click "Confirm Payment"

**Expected Results**:
- Receipt number generated (format: RCP-XXXXXXXX)
- Payment status changes to 'paid'
- `paid_at` timestamp set
- Application status changes to 'paid'
- Activity log created
- Audit log created
- Notification sent to agent

**Database Verification**:
```sql
-- Check payment status
SELECT status, receipt_number, paid_at FROM payments WHERE application_id = (SELECT id FROM applications ORDER BY created_at DESC LIMIT 1);

-- Check application status
SELECT status, completed_at FROM applications WHERE id = (SELECT id FROM applications ORDER BY created_at DESC LIMIT 1);
```

### Step 8: Cargo Release Document Generation

**Trigger**: Application status changes to 'paid'

**Actions**:
1. System automatically generates cargo release document
2. System generates CVET
3. Application status changes to 'completed'

**Expected Results**:
- Release number generated (format: CR-XXXXXXXX)
- QR code generated
- Release date set
- CVET data generated
- Application status: 'completed'
- Activity log created
- Audit log created
- Notification sent to agent

**Database Verification**:
```sql
-- Check cargo release data
SELECT inspection_report->'cargo_release' FROM applications WHERE id = (SELECT id FROM applications ORDER BY created_at DESC LIMIT 1);

-- Check CVET data
SELECT inspection_report->'cvet' FROM applications WHERE id = (SELECT id FROM applications ORDER BY created_at DESC LIMIT 1);

-- Check final status
SELECT status, completed_at FROM applications WHERE id = (SELECT id FROM applications ORDER BY created_at DESC LIMIT 1);
```

### Step 9: Agent Downloads Documents

**Test User**: agent@test.com

**Actions**:
1. Login as Clearing Agent
2. Navigate to dashboard
3. View "Completed" queue
4. Select the completed application
5. Download Receipt
6. Download CVET
7. Download Cargo Release Document

**Expected Results**:
- All documents downloadable
- Documents contain correct information
- QR code valid
- All signatures present

## Realtime Verification

### Test Realtime Updates

1. Open multiple browser windows with different roles logged in
2. Perform actions in one window
3. Verify other windows update automatically without refresh

**Test Scenarios**:
- Agent submits declaration → Officer dashboard updates
- Officer approves application → Inspector dashboard updates
- Inspector completes inspection → Revenue Officer dashboard updates
- Revenue officer confirms payment → Agent dashboard updates
- Any status change → All relevant dashboards update

**Verification**:
- Check browser console for realtime subscription logs
- Verify no page refresh required
- Verify statistics update automatically
- Verify notification badges update

## Error Handling Tests

### Test Error Scenarios

1. **Missing Required Fields**:
   - Try to submit without completing all fields
   - Expected: Validation error with missing field names

2. **Invalid Status Transitions**:
   - Try to approve already approved application
   - Expected: Error message

3. **Unauthorized Access**:
   - Try to access officer dashboard as agent
   - Expected: Redirect to correct dashboard

4. **RLS Policy Violations**:
   - Try to modify another user's application
   - Expected: Database error

5. **Network Errors**:
   - Disconnect network during submission
   - Expected: Reconnection attempt and retry

## Performance Tests

### Test Performance

1. **Large Data Load**:
   - Create 100+ applications
   - Test dashboard load time
   - Expected: < 3 seconds

2. **Realtime Performance**:
   - Subscribe to multiple tables
   - Test update latency
   - Expected: < 1 second

3. **Concurrent Users**:
   - Multiple users working simultaneously
   - Test for race conditions
   - Expected: No conflicts

## Security Tests

### Test Security

1. **SQL Injection**:
   - Try to inject SQL in form fields
   - Expected: Sanitized input, no SQL execution

2. **XSS Prevention**:
   - Try to inject scripts in text fields
   - Expected: Escaped output, no script execution

3. **Authentication Bypass**:
   - Try to access protected pages without login
   - Expected: Redirect to login

4. **Role-Based Access**:
   - Try to access other role's functions
   - Expected: Access denied

## Success Criteria

The workflow is considered complete when:

1. ✅ All database migrations applied successfully
2. ✅ All test users can login and access their dashboards
3. ✅ Agent can create and submit declaration independently
4. ✅ AI validation triggers automatically on submission
5. ✅ Officer can approve/return/reject applications
6. ✅ Inspector can complete inspection or escalate
7. ✅ Supervisor can resolve escalations
8. ✅ Revenue officer can generate invoices and confirm payments
9. ✅ Cargo release documents generate automatically
10. ✅ All activity logs, audit logs, and notifications created
11. ✅ All dashboards update in realtime
12. ✅ All documents are downloadable
13. ✅ No console errors during workflow
14. ✅ No database errors during workflow
15. ✅ Status transitions follow correct flow

## Troubleshooting

### Common Issues

**Issue**: Application number not generated
- **Solution**: Check migration 010 is applied
- **Solution**: Verify system_settings table has application_number_sequence

**Issue**: AI validation not triggering
- **Solution**: Check migration 016 is applied
- **Solution**: Verify trigger exists on applications table

**Issue**: Realtime not working
- **Solution**: Check migration 017 is applied
- **Solution**: Verify realtime is enabled in Supabase dashboard

**Issue**: RLS policy errors
- **Solution**: Check migrations 004, 008, 009 are applied
- **Solution**: Verify admin_users table exists

**Issue**: Status not updating
- **Solution**: Check workflow service functions are imported
- **Solution**: Verify logging service is working

## Next Steps

After successful testing:

1. Deploy to production
2. Set up monitoring
3. Configure alerts
4. Train users
5. Document procedures
6. Schedule regular audits
