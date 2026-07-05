# Quick Reference Guide - AI Validation System

## For Developers

### How to Trigger Validation Manually

```javascript
import { submitApplication } from './js/applications.js';

// Submit application and trigger validation
const result = await submitApplication(applicationId);

// result will contain:
// {
//   success: true/false,
//   status: 'pending_review' | 'returned',
//   message: 'Application passed validation...',
//   validationResults: {
//     errors: [...],
//     warnings: [...],
//     details: {...}
//   }
// }
```

### Access Validation Results

```javascript
import supabase from './js/supabase.js';

// Get application with validation results
const { data: app } = await supabase
  .from('applications')
  .select('*, ai_validation_results, ai_validation_passed')
  .eq('id', applicationId)
  .single();

// Check results
if (!app.ai_validation_passed) {
  console.log('Errors:', app.ai_validation_results.errors);
  console.log('Warnings:', app.ai_validation_results.warnings);
}
```

### Running Individual Validation Checks

```javascript
import { 
  validateData,
  verifyDocuments,
  validateHSCodes,
  verifyCustomsValue,
  performFraudDetection,
  performRiskAssessment
} from './js/ai-validation.js';

// Run specific check
const dataValidation = await validateData(application);
// Returns { errors: [], warnings: [], validated: true/false }

const fraudCheck = await performFraudDetection(application);
// Returns { errors: [], warnings: [], fraudScore: 25, riskLevel: 'low' }
```

### Send Custom Notifications

```javascript
import { sendAIValidationNotification } from './js/notifications.js';

await sendAIValidationNotification(
  userId,
  applicationId,
  ['Error 1', 'Error 2'],
  ['Warning 1']
);
```

### Adjust Validation Thresholds

Edit in `js/ai-validation.js`:
```javascript
// Fraud Score Thresholds
const FRAUD_HIGH_RISK = 70;        // Score above this = error
const FRAUD_MEDIUM_RISK = 40;      // Score above this = warning

// Risk Assessment Thresholds
const RISK_HIGH = 50;              // Score below this = error
const RISK_MEDIUM = 70;            // Score below this = warning

// Document Requirements
const MAX_FILE_SIZE = 5242880;     // 5MB
const MIN_OCR_CONFIDENCE = 0.75;   // 75%

// Other Thresholds
const VALUE_VARIANCE = 0.05;       // 5% allowed variance
const DUPLICATE_HOURS = 24;        // Check past 24 hours
```

---

## For System Administrators

### Monitor Validation Performance

```sql
-- Check validation statistics
SELECT 
  COUNT(*) as total_apps,
  SUM(CASE WHEN ai_validation_passed THEN 1 ELSE 0 END) as passed,
  SUM(CASE WHEN ai_validation_passed = false THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN ai_validation_passed THEN 1 ELSE 0 END) / COUNT(*), 2) as pass_rate
FROM applications
WHERE status != 'draft';

-- Check most common validation errors
SELECT 
  jsonb_array_elements(ai_validation_results->'errors')::text as error,
  COUNT(*) as frequency
FROM applications
WHERE ai_validation_passed = false
GROUP BY error
ORDER BY frequency DESC
LIMIT 10;

-- Check fraud score distribution
SELECT 
  ROUND((ai_validation_results->'details'->'fraudDetection'->>'fraudScore')::numeric, 0) as fraud_score,
  COUNT(*) as count
FROM applications
WHERE ai_validation_passed = false
GROUP BY fraud_score
ORDER BY fraud_score DESC;
```

### View Return Reasons

```sql
-- See why applications are returned
SELECT 
  application_number,
  return_reason,
  returned_at,
  user_id,
  application_type
FROM applications
WHERE status = 'returned'
ORDER BY returned_at DESC
LIMIT 20;
```

### Track Validation Metrics Over Time

```sql
-- Daily validation pass rate
SELECT 
  DATE(submitted_at) as submission_date,
  COUNT(*) as submissions,
  SUM(CASE WHEN ai_validation_passed THEN 1 ELSE 0 END) as passed,
  ROUND(100.0 * SUM(CASE WHEN ai_validation_passed THEN 1 ELSE 0 END) / COUNT(*), 2) as pass_rate
FROM applications
WHERE submitted_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY submission_date
ORDER BY submission_date DESC;
```

### Identify Users with Issues

```sql
-- Users with high rejection rates
SELECT 
  p.id,
  p.full_name,
  p.email,
  COUNT(a.id) as total_apps,
  SUM(CASE WHEN a.ai_validation_passed = false THEN 1 ELSE 0 END) as failed_validations,
  ROUND(100.0 * SUM(CASE WHEN a.ai_validation_passed = false THEN 1 ELSE 0 END) / COUNT(a.id), 2) as failure_rate
FROM profiles p
LEFT JOIN applications a ON p.id = a.user_id
GROUP BY p.id, p.full_name, p.email
HAVING COUNT(a.id) > 5
ORDER BY failure_rate DESC;
```

---

## Common Tasks

### Check if Application Passed Validation

```javascript
import supabase from './js/supabase.js';

async function checkValidationStatus(appId) {
  const { data: app } = await supabase
    .from('applications')
    .select('status, ai_validation_passed, ai_validation_results')
    .eq('id', appId)
    .single();

  if (app.ai_validation_passed === true) {
    console.log('✅ Application passed validation');
    console.log('Status:', app.status); // Should be 'pending_review'
  } else if (app.ai_validation_passed === false) {
    console.log('❌ Application failed validation');
    console.log('Errors:', app.ai_validation_results.errors);
  } else {
    console.log('⏳ Not yet validated');
  }
}
```

### Manually Re-validate Application

```javascript
import { 
  comprehensiveApplicationValidation,
  updateApplicationStatusAfterValidation 
} from './js/ai-validation.js';

async function revalidateApplication(appId) {
  console.log('Re-validating application...');
  
  const validationResults = await comprehensiveApplicationValidation(appId);
  const statusUpdate = await updateApplicationStatusAfterValidation(appId, validationResults);
  
  if (statusUpdate.success) {
    console.log('✅ Re-validation complete. New status:', statusUpdate.status);
  } else {
    console.log('❌ Re-validation failed:', statusUpdate.error);
  }
}
```

### Export Validation Report

```javascript
async function exportValidationReport(appId) {
  const { data: app } = await supabase
    .from('applications')
    .select('*')
    .eq('id', appId)
    .single();

  const report = {
    applicationNumber: app.application_number,
    applicant: app.applicant_name,
    applicationType: app.application_type,
    submittedAt: app.submitted_at,
    validationResults: app.ai_validation_results,
    status: app.status,
    exportedAt: new Date().toISOString()
  };

  // Convert to JSON
  const json = JSON.stringify(report, null, 2);
  
  // Or convert to CSV if needed
  const csv = generateCSV(report);
  
  return { json, csv };
}
```

---

## Troubleshooting

### Application Stuck in "submitted" Status

```sql
-- Check if validation was triggered
SELECT 
  application_number,
  status,
  ai_validation_passed,
  ai_validation_results IS NOT NULL as has_results,
  submitted_at
FROM applications
WHERE status = 'submitted'
AND submitted_at < NOW() - INTERVAL '10 minutes';

-- Manually update if needed
UPDATE applications
SET status = 'pending_review',
    ai_validation_passed = true
WHERE application_number = 'APP-2024-001234';
```

### Validation Results Not Displaying

```javascript
// Check if results are stored
const { data: app } = await supabase
  .from('applications')
  .select('ai_validation_results')
  .eq('id', appId)
  .single();

console.log('Validation results:', app.ai_validation_results);

// If null, manually re-validate
if (!app.ai_validation_results) {
  console.log('Re-validating...');
  const results = await comprehensiveApplicationValidation(appId);
  console.log('Results:', results);
}
```

### High Failure Rate for Specific Error

```sql
-- Find which check is causing failures
SELECT 
  jsonb_array_elements(ai_validation_results->'errors')::text as specific_error,
  COUNT(*) as frequency,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM applications WHERE ai_validation_passed = false), 2) as percent
FROM applications
WHERE ai_validation_passed = false
GROUP BY specific_error
ORDER BY frequency DESC;
```

---

## Performance Optimization

### Cache Validation Rules

```javascript
// Create a cache for validation rules
const validationRuleCache = {};

async function getCachedValidationRules(ruleType) {
  if (!validationRuleCache[ruleType]) {
    const { data: rules } = await supabase
      .from('validation_rules')
      .select('*')
      .eq('rule_type', ruleType);
    validationRuleCache[ruleType] = rules;
  }
  return validationRuleCache[ruleType];
}

// Clear cache periodically
setInterval(() => {
  Object.keys(validationRuleCache).forEach(key => delete validationRuleCache[key]);
}, 3600000); // Every hour
```

### Batch Validate Applications

```javascript
async function batchValidateApplications(appIds) {
  const validationPromises = appIds.map(id => 
    comprehensiveApplicationValidation(id)
  );
  
  // Run in parallel (but not all at once)
  const results = [];
  const batchSize = 10;
  
  for (let i = 0; i < validationPromises.length; i += batchSize) {
    const batch = validationPromises.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }
  
  return results;
}
```

---

## Integration Examples

### Webhook for External Systems

```javascript
// Notify external system when validation completes
async function notifyExternalSystem(appId, validationResults) {
  const payload = {
    applicationId: appId,
    status: validationResults.errors.length > 0 ? 'FAILED' : 'PASSED',
    errors: validationResults.errors,
    warnings: validationResults.warnings,
    timestamp: new Date().toISOString()
  };

  await fetch('https://external-system.example.com/webhook/validation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
```

### API Endpoint for Validation Status

```javascript
// Express.js example
app.get('/api/applications/:id/validation', async (req, res) => {
  const { data: app } = await supabase
    .from('applications')
    .select('status, ai_validation_passed, ai_validation_results')
    .eq('id', req.params.id)
    .single();

  res.json({
    passed: app.ai_validation_passed,
    status: app.status,
    results: app.ai_validation_results
  });
});
```

---

## Maintenance Checklist

### Daily
- [ ] Monitor validation failure rate
- [ ] Check for stuck applications
- [ ] Review error logs

### Weekly
- [ ] Analyze most common errors
- [ ] Check user feedback on validations
- [ ] Update threshold if needed
- [ ] Review fraud score distribution

### Monthly
- [ ] Performance review
- [ ] Update tariff codes if needed
- [ ] Audit validation rules
- [ ] Generate compliance reports

### Quarterly
- [ ] Security review
- [ ] Database optimization
- [ ] Feature enhancement planning
- [ ] User satisfaction survey

---

## Emergency Procedures

### Disable Validation (Emergency Only)

```sql
-- Temporarily allow all submissions without validation
UPDATE applications
SET ai_validation_passed = true,
    status = 'pending_review'
WHERE status = 'submitted'
AND ai_validation_results IS NULL;

-- Later, re-validate when system is healthy
-- Use revalidateApplication() function above
```

### Clear Validation Cache

```javascript
import supabase from './js/supabase.js';

// Clear all validation results (careful!)
async function clearValidationCache() {
  const { error } = await supabase
    .from('applications')
    .update({ ai_validation_results: null })
    .eq('ai_validation_passed', true); // Only revalidate passed ones first

  if (error) console.error('Error:', error);
  else console.log('✅ Cache cleared');
}
```

---

## Useful SQL Queries

```sql
-- Applications pending officer review
SELECT application_number, applicant_name, submitted_at 
FROM applications 
WHERE status = 'pending_review' 
ORDER BY submitted_at ASC;

-- Applications returned for correction
SELECT application_number, applicant_name, return_reason, returned_at
FROM applications
WHERE status = 'returned'
ORDER BY returned_at DESC;

-- High-value applications requiring review
SELECT application_number, declared_value, applicant_name
FROM applications
WHERE declared_value > 1000000
AND ai_validation_passed = true;

-- Users with compliance issues
SELECT DISTINCT p.full_name, p.email, COUNT(a.id) as issue_count
FROM profiles p
JOIN applications a ON p.id = a.user_id
WHERE a.status = 'returned'
GROUP BY p.id, p.full_name, p.email
HAVING COUNT(a.id) > 3;
```

---

## Contact & Support

**For Technical Issues:**
- Check logs in `console`
- Review database queries above
- Contact development team

**For User Issues:**
- Check validation error message
- Reference `AI_VALIDATION_SYSTEM.md`
- Contact support@ssra-customs.gov.ss

**For Enhancements:**
- Create ticket in project management system
- Include use case and expected outcome
- Assign to development team

---

**Last Updated:** January 15, 2024
**Version:** 1.0
