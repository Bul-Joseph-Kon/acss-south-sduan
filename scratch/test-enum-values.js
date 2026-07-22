import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://avpoufxsjiecbsxvngip.supabase.co';
const supabaseKey = 'sb_publishable_XZ7BUTHNhF1ojqoxlJq7Bg_cqn9o8HE';
const supabase = createClient(supabaseUrl, supabaseKey);

const candidateStatuses = [
  'draft',
  'submitted',
  'pending_review',
  'under_inspection',
  'returned',
  'approved',
  'rejected',
  'paid',
  'completed',
  'cancelled',
  'ai_validation',
  'pending_supervisor',
  'clearance_approved',
  'awaiting_payment',
  'high_risk_review',
  'escalated',
  'under_review',
  'inspection_required',
  'inspection_completed',
  'payment_required',
  'payment_verified'
];

async function run() {
  console.log('Logging in as testadmin@gmail.com...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'testadmin@gmail.com',
    password: 'Password123!'
  });

  if (authError) {
    console.error('Login Error:', authError);
    return;
  }

  const applicationId = 'b3e6fc04-2604-4eff-9957-21380f36a9de';
  
  // Get current status so we can restore it later
  const { data: app } = await supabase.from('applications').select('status').eq('id', applicationId).single();
  const originalStatus = app.status;
  console.log('Original status:', originalStatus);

  console.log('Probing status enum values:');
  for (const status of candidateStatuses) {
    const { error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', applicationId)
      .select();
    
    if (error) {
      if (error.message.includes('invalid input value for enum')) {
        console.log(`[status.${status}] -> ❌ NOT IN ENUM`);
      } else {
        console.log(`[status.${status}] -> ❌ ERROR: ${error.message}`);
      }
    } else {
      console.log(`[status.${status}] -> ✅ VALID ENUM VALUE`);
    }
  }

  // Restore original status
  await supabase.from('applications').update({ status: originalStatus }).eq('id', applicationId);
  console.log('Restored original status.');
}

run();
