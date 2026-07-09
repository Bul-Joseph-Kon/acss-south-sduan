# Runtime Execution Trace Report - Escalation Workflow

**Date:** 2025-01-18  
**Project:** ACSS South Sudan  
**Objective:** Trace actual runtime execution from user click to database write for the Escalation workflow

---

## Critical Finding

**⚠️ NO DIRECT "ESCALATE" BUTTON EXISTS**

The escalation workflow is **NOT triggered by a dedicated "Escalate" button**. Instead, escalation is triggered **automatically** when AI validation fails during inspection submission.

---

## Button Location and Event Listener

### Submit Inspection Report Button

**File:** `pages/inspector/inspection-details.html`

**Button Element:** 
```html
<button class="btn-submit" id="submitBtn">Submit Inspection Report</button>
```

**Event Listener Location:** Line 451
```javascript
document.getElementById('submitBtn')?.addEventListener('click', submitInspectionReport);
```

**Event Listener Status:** ✅ ACTIVE - Attached on page load

---

## Complete Execution Path

### Step-by-Step Trace

```
USER ACTION: Click "Submit Inspection Report" button
    ↓
STEP 1: submitInspectionReport() ENTRY
    File: pages/inspector/inspection-details.html
    Line: 706-708
    Console: "STEP 1: Submit Inspection Report button clicked"
    ↓
STEP 2: Validation Process Start
    File: pages/inspector/inspection-details.html
    Line: 750
    Console: "STEP 2: Starting validation process"
    ↓
STEP 3: AI Validation Call
    File: pages/inspector/inspection-details.html
    Line: 754-756
    Console: "STEP 3: Calling validateInspectionReport"
    Console: "STEP 3.1: Validation results received"
    Function: validateInspectionReport() from js/ai-validation.js
    ↓
STEP 4: Status Update Call
    File: pages/inspector/inspection-details.html
    Line: 759-761
    Console: "STEP 4: Calling updateApplicationStatusAfterInspection"
    Console: "STEP 4.1: Status update received"
    Function: updateApplicationStatusAfterInspection() from js/ai-validation.js
    ↓
    ⚠️ CRITICAL DECISION POINT
    ↓
    IF statusUpdate.newStatus === 'escalated':
        ↓
        STEP 5: Escalation Check
        File: pages/inspector/inspection-details.html
        Line: 781
        Console: "STEP 5: Checking if escalation needed, newStatus: escalated"
        ↓
        STEP 6: Escalation Trigger
        File: pages/inspector/inspection-details.html
        Line: 784-791
        Console: "STEP 6: ESCALATION TRIGGERED - Calling createEscalationCase"
        Console: "STEP 6.1: Escalation payload"
        ↓
        STEP 7: createEscalationCase() Call
        File: pages/inspector/inspection-details.html
        Line: 793-798
        Console: "STEP 7: createEscalationCase result"
        Function: createEscalationCase() from js/escalation-service.js
        ↓
        STEP 8: createEscalationCase() ENTRY
        File: js/escalation-service.js
        Line: 17
        Console: "=== STEP 8: createEscalationCase ENTRY ==="
        ↓
        STEP 8.1: Auth User Check
        File: js/escalation-service.js
        Line: 22
        Console: "STEP 8.1: Auth user:"
        ↓
        STEP 8.2: User Profile Fetch
        File: js/escalation-service.js
        Line: 24
        Console: "STEP 8.2: User profile:"
        ↓
        STEP 8.3: Application Fetch
        File: js/escalation-service.js
        Line: 31
        Console: "STEP 8.3: Fetching application details"
        ↓
        STEP 8.4: Application Retrieved
        File: js/escalation-service.js
        Line: 40
        Console: "STEP 8.4: Application fetched:"
        ↓
        STEP 9: INSERT Payload Preparation
        File: js/escalation-service.js
        Line: 53
        Console: "STEP 9: INSERT payload for escalated_cases:"
        Payload:
        {
            application_id: UUID,
            trader_id: UUID,
            assigned_officer_id: UUID,
            reason: "AI validation failure reason",
            priority: "high",
            status: "open",
            notes: "Escalated from inspection due to AI validation failure"
        }
        ↓
        STEP 10: Supabase INSERT Execution
        File: js/escalation-service.js
        Line: 54-58
        SQL: INSERT INTO escalated_cases (...)
        ↓
        IF SUCCESS:
            Console: "STEP 10: INSERT SUCCESS - Escalation case created:"
        IF FAILURE:
            Console: "STEP 10: INSERT FAILED - Full error object:"
            {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            }
        ↓
        STEP 11: Verification Query
        File: js/escalation-service.js
        Line: 73-79
        Console: "STEP 11: Running verification query"
        SQL: SELECT * FROM escalated_cases ORDER BY created_at DESC LIMIT 1
        Console: "STEP 11.1: Verification result:"
        ↓
        STEP 12: Application Status Update
        File: js/escalation-service.js
        Line: 82-90
        Console: "STEP 12: Updating application status"
        SQL: UPDATE applications SET status = 'pending_review', ...
        ↓
        IF SUCCESS:
            Console: "STEP 13: Application status update SUCCESS"
        IF FAILURE:
            Console: "STEP 13: Application status update FAILED:"
        ↓
        STEP 14: Application Status Verification
        File: js/escalation-service.js
        Line: 99-105
        Console: "STEP 14: Verifying application status update"
        SQL: SELECT status, escalation_reason, escalated_at FROM applications WHERE id = ...
        Console: "STEP 14.1: Application status verification:"
        ↓
        STEP 15: Activity Log Creation
        File: js/escalation-service.js
        Line: 108-110
        Console: "STEP 15: Creating activity log"
        SQL: INSERT INTO activity_logs (...)
        Console: "STEP 15.1: Activity log created"
        ↓
        STEP 16: Activity Log Verification
        File: js/escalation-service.js
        Line: 113-121
        Console: "STEP 16: Verifying activity log"
        SQL: SELECT * FROM activity_logs WHERE application_id = ... AND action = 'escalation' ...
        Console: "STEP 16.1: Activity log verification:"
        ↓
        STEP 17: Audit Log Creation
        File: js/escalation-service.js
        Line: 124-126
        Console: "STEP 17: Creating audit log"
        SQL: INSERT INTO audit_logs (...)
        Console: "STEP 17.1: Audit log created"
        ↓
        STEP 18: Audit Log Verification
        File: js/escalation-service.js
        Line: 129-137
        Console: "STEP 18: Verifying audit log"
        SQL: SELECT * FROM audit_logs WHERE entity_id = ... AND action = 'escalation_escalation' ...
        Console: "STEP 18.1: Audit log verification:"
        ↓
        STEP 19: Notification Send
        File: js/escalation-service.js
        Line: 140-142
        Console: "STEP 19: Sending escalation notification"
        SQL: INSERT INTO notifications (...)
        Console: "STEP 19.1: Notification sent"
        ↓
        STEP 20: Notification Verification
        File: js/escalation-service.js
        Line: 145-154
        Console: "STEP 20: Verifying notification"
        SQL: SELECT * FROM notifications WHERE reference_id = ... AND title = 'Application Escalated' ...
        Console: "STEP 20.1: Notification verification:"
        ↓
        STEP 21: Workflow Complete
        File: js/escalation-service.js
        Line: 156
        Console: "STEP 21: Escalation workflow COMPLETE"
        ↓
    ELSE (no escalation):
        Console: "STEP 6: No escalation - sending completion notification"
```

---

## Function Call Chain

```
submitInspectionReport()
  → validateInspectionReport()
  → updateApplicationStatusAfterInspection()
    → [IF newStatus === 'escalated']
      → createEscalationCase()
        → getUserProfile()
        → supabase.from('applications').select()
        → supabase.from('escalated_cases').insert()
        → supabase.from('escalated_cases').select() [verification]
        → supabase.from('applications').update()
        → supabase.from('applications').select() [verification]
        → createActivityLog()
          → supabase.from('activity_logs').insert()
        → supabase.from('activity_logs').select() [verification]
        → createAuditLog()
          → supabase.from('audit_logs').insert()
        → supabase.from('audit_logs').select() [verification]
        → sendEscalationNotification()
          → supabase.from('profiles').select() [get supervisors]
          → sendInspectionEscalatedNotification()
            → supabase.from('notifications').insert()
        → supabase.from('notifications').select() [verification]
```

---

## Payload Sent to Database

### escalated_cases INSERT Payload

```javascript
{
    application_id: "<UUID from appId>",
    trader_id: "<UUID from application.user_id>",
    assigned_officer_id: "<UUID from current user profile>",
    reason: "<AI validation failure message>",
    priority: "high",
    status: "open",
    notes: "Escalated from inspection due to AI validation failure"
}
```

### applications UPDATE Payload

```javascript
{
    status: "pending_review",
    escalation_reason: "<AI validation failure message>",
    escalated_at: "<ISO timestamp>"
}
```

### activity_logs INSERT Payload

```javascript
{
    user_id: "<UUID from current user>",
    application_id: "<UUID from appId>",
    action: "escalation",
    details: "<AI validation failure message>",
    timestamp: "<ISO timestamp>"
}
```

### audit_logs INSERT Payload

```javascript
{
    user_id: "<UUID from current user>",
    action: "escalation_escalation",
    entity_type: "escalation_case",
    entity_id: "<UUID from appId>",
    details: "<JSON string of escalation data>",
    timestamp: "<ISO timestamp>"
}
```

### notifications INSERT Payload (per supervisor)

```javascript
{
    user_id: "<UUID from supervisor profile>",
    title: "Application Escalated",
    message: "Application #<appId> escalated to supervisor. Reason: <reason>",
    reference_id: "<UUID from appId>",
    reference_type: "application",
    read: false,
    created_at: "<ISO timestamp>"
}
```

---

## Expected SQL Responses

### Successful Execution

**Console Output:**
```
STEP 1: Submit Inspection Report button clicked
STEP 2: Starting validation process
STEP 3: Calling validateInspectionReport
STEP 3.1: Validation results received {validation_score: <number>, validation_passed: false, errors: [...]}
STEP 4: Calling updateApplicationStatusAfterInspection
STEP 4.1: Status update received {newStatus: 'escalated', message: '<reason>'}
STEP 5: Checking if escalation needed, newStatus: escalated
STEP 6: ESCALATION TRIGGERED - Calling createEscalationCase
STEP 6.1: Escalation payload {applicationId: '<UUID>', reason: '<reason>', ...}
STEP 7: createEscalationCase result {success: true, data: {...}, message: 'Escalation case created successfully'}
=== STEP 8: createEscalationCase ENTRY ===
Application ID: <UUID>
Escalation Data: {reason: '<reason>', priority: 'high', ...}
STEP 8.1: Auth user: {id: '<UUID>', email: '...'}
STEP 8.2: User profile: {id: '<UUID>', full_name: '...', role: 'inspector'}
STEP 8.3: Fetching application details
STEP 8.4: Application fetched: {id: '<UUID>', user_id: '<UUID>', ...}
STEP 9: INSERT payload for escalated_cases: {application_id: '<UUID>', ...}
STEP 10: INSERT SUCCESS - Escalation case created: {id: '<UUID>', ...}
STEP 11: Running verification query
STEP 11.1: Verification result: {data: [{id: '<UUID>', ...}], error: null}
STEP 12: Updating application status
STEP 13: Application status update SUCCESS
STEP 14: Verifying application status update
STEP 14.1: Application status verification: {data: {status: 'pending_review', escalation_reason: '<reason>', escalated_at: '<timestamp>'}}
STEP 15: Creating activity log
STEP 15.1: Activity log created
STEP 16: Verifying activity log
STEP 16.1: Activity log verification: {data: [{id: '<UUID>', action: 'escalation', ...}]}
STEP 17: Creating audit log
STEP 17.1: Audit log created
STEP 18: Verifying audit log
STEP 18.1: Audit log verification: {data: [{id: '<UUID>', action: 'escalation_escalation', ...}]}
STEP 19: Sending escalation notification
STEP 19.1: Notification sent
STEP 20: Verifying notification
STEP 20.1: Notification verification: {data: [{id: '<UUID>', title: 'Application Escalated', ...}]}
STEP 21: Escalation workflow COMPLETE
```

---

## Potential Runtime Failure Points

### Failure Point 1: User Profile Not Found

**Location:** js/escalation-service.js, Line 26-28

**Error:**
```
User profile not found
```

**Cause:** User is authenticated but profile record doesn't exist in profiles table

**Fix:** Ensure profile creation on user registration

---

### Failure Point 2: Application Not Found

**Location:** js/escalation-service.js, Line 38-39

**Error:**
```
Application not found
```

**Cause:** Application ID is invalid or application was deleted

**Fix:** Validate application exists before escalation

---

### Failure Point 3: escalated_cases INSERT Failure

**Location:** js/escalation-service.js, Line 60-67

**Possible Errors:**

**Foreign Key Violation (23503):**
```
code: "23503"
message: "null value in column \"application_id\" violates not-null constraint"
```
**Cause:** application_id is null or invalid

**Permission Denied (42501):**
```
code: "42501"
message: "permission denied for table escalated_cases"
```
**Cause:** RLS policy prevents insert

**Table Not Found (42P01):**
```
code: "42P01"
message: "relation \"escalated_cases\" does not exist"
```
**Cause:** Migration 005 not run

**Fix:** Check RLS policies, run migrations, validate foreign keys

---

### Failure Point 4: applications UPDATE Failure

**Location:** js/escalation-service.js, Line 92-95

**Possible Errors:**

**Permission Denied (42501):**
```
code: "42501"
message: "permission denied for table applications"
```
**Cause:** RLS policy prevents update

**Fix:** Check RLS policies for applications table

---

### Failure Point 5: activity_logs INSERT Failure

**Location:** js/escalation-service.js (createActivityLog function)

**Possible Errors:**

**Table Not Found (42P01):**
```
code: "42P01"
message: "relation \"activity_logs\" does not exist"
```
**Cause:** activity_logs table not created

**Fix:** Create activity_logs table migration

---

### Failure Point 6: audit_logs INSERT Failure

**Location:** js/escalation-service.js (createAuditLog function)

**Possible Errors:**

**Table Not Found (42P01):**
```
code: "42P01"
message: "relation \"audit_logs\" does not exist"
```
**Cause:** audit_logs table not created

**Fix:** Create audit_logs table migration

---

### Failure Point 7: Notification INSERT Failure

**Location:** js/escalation-service.js (sendEscalationNotification function)

**Possible Errors:**

**Table Not Found (42P01):**
```
code: "42P01"
message: "relation \"notifications\" does not exist"
```
**Cause:** notifications table not created

**Fix:** Create notifications table migration

---

## Exact Line Numbers

| Step | File | Line | Description |
|------|------|------|-------------|
| 1 | pages/inspector/inspection-details.html | 707 | submitInspectionReport entry |
| 2 | pages/inspector/inspection-details.html | 750 | Validation start |
| 3 | pages/inspector/inspection-details.html | 754 | validateInspectionReport call |
| 4 | pages/inspector/inspection-details.html | 759 | updateApplicationStatusAfterInspection call |
| 5 | pages/inspector/inspection-details.html | 781 | Escalation check |
| 6 | pages/inspector/inspection-details.html | 784 | Escalation trigger |
| 7 | pages/inspector/inspection-details.html | 793 | createEscalationCase call |
| 8 | js/escalation-service.js | 17 | createEscalationCase entry |
| 8.1 | js/escalation-service.js | 22 | Auth user check |
| 8.2 | js/escalation-service.js | 24 | Profile fetch |
| 8.3 | js/escalation-service.js | 31 | Application fetch |
| 9 | js/escalation-service.js | 53 | INSERT payload |
| 10 | js/escalation-service.js | 54 | INSERT execution |
| 11 | js/escalation-service.js | 73 | Verification query |
| 12 | js/escalation-service.js | 82 | Application status update |
| 14 | js/escalation-service.js | 99 | Application status verification |
| 15 | js/escalation-service.js | 108 | Activity log creation |
| 16 | js/escalation-service.js | 113 | Activity log verification |
| 17 | js/escalation-service.js | 124 | Audit log creation |
| 18 | js/escalation-service.js | 129 | Audit log verification |
| 19 | js/escalation-service.js | 140 | Notification send |
| 20 | js/escalation-service.js | 145 | Notification verification |
| 21 | js/escalation-service.js | 156 | Workflow complete |

---

## Required Fixes

### Fix 1: Ensure escalated_cases Table Exists

**Check:** Run migration 005
```bash
supabase db push
```

**Verify:**
```sql
SELECT COUNT(*) FROM escalated_cases;
```

---

### Fix 2: Check RLS Policies

**Check:** Ensure RLS allows inserts for authenticated users
```sql
SELECT * FROM pg_policies WHERE tablename = 'escalated_cases';
```

**Required Policy:**
```sql
CREATE POLICY "Users can insert escalated_cases"
ON escalated_cases
FOR INSERT
TO authenticated
WITH CHECK (true);
```

---

### Fix 3: Ensure activity_logs Table Exists

**Check:** Verify table exists
```sql
SELECT COUNT(*) FROM activity_logs;
```

**If missing:** Create migration for activity_logs table

---

### Fix 4: Ensure audit_logs Table Exists

**Check:** Verify table exists
```sql
SELECT COUNT(*) FROM audit_logs;
```

**If missing:** Create migration for audit_logs table

---

### Fix 5: Ensure notifications Table Exists

**Check:** Verify table exists
```sql
SELECT COUNT(*) FROM notifications;
```

**If missing:** Create migration for notifications table

---

## Testing Instructions

### Prerequisites

1. Ensure user is logged in as Inspector
2. Ensure application exists in `under_inspection` status
3. Ensure AI validation will fail (low validation score)

### Test Steps

1. Open browser DevTools Console
2. Navigate to `pages/inspector/inspection-details.html?id=<application_id>`
3. Fill out inspection form with data that will fail AI validation
4. Click "Submit Inspection Report" button
5. Observe console output for all 21 steps
6. Verify each step's console log appears
7. Check database for records:
   ```sql
   SELECT COUNT(*) FROM escalated_cases;
   SELECT * FROM applications WHERE id = '<application_id>';
   SELECT * FROM activity_logs WHERE application_id = '<application_id>';
   SELECT * FROM audit_logs WHERE entity_id = '<application_id>';
   SELECT * FROM notifications WHERE reference_id = '<application_id>';
   ```

### Expected Result

All 21 steps should complete successfully with console logs showing:
- All INSERT operations successful
- All verification queries return data
- No error messages
- escalated_cases count > 0

### If Failure Occurs

1. Identify the step where execution stops
2. Check the error object in console
3. Refer to "Potential Runtime Failure Points" section
4. Apply corresponding fix
5. Re-test

---

## Summary

**Button File:** `pages/inspector/inspection-details.html`  
**Event Listener Line:** 451  
**Function Call Chain:** 7 functions deep  
**Payload Sent:** 5 database operations (1 INSERT, 1 UPDATE, 3 additional INSERTs)  
**SQL Response:** Expected success with verification data  
**Exact Runtime Failure Point:** Depends on database state - see failure points section  
**Exact Line Number:** See line number table above  
**Required Fix:** Ensure all tables exist and RLS policies allow operations

**⚠️ CRITICAL:** The escalation workflow is **NOT triggered by a direct button click**. It is triggered automatically when AI validation fails during inspection submission. To test escalation, you must submit an inspection that fails AI validation.

**Status:** ✅ INSTRUMENTED WITH CONSOLE LOGS  
**Verification:** ⏳ REQUIRES MANUAL TESTING  
**Database Record:** ⏳ PENDING TEST EXECUTION
