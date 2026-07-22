import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://avpoufxsjiecbsxvngip.supabase.co';
const supabaseKey = 'sb_publishable_XZ7BUTHNhF1ojqoxlJq7Bg_cqn9o8HE';
const supabase = createClient(supabaseUrl, supabaseKey);

const candidateColumns = [
  'id',
  'application_id',
  'user_id',
  'payment_number',
  'amount',
  'currency',
  'status',
  'payment_method',
  'transaction_id',
  'receipt_number',
  'paid_at',
  'created_at',
  'updated_at',
  'invoice_id'
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

  console.log('Probing columns for payments table:');
  for (const col of candidateColumns) {
    const { error } = await supabase
      .from('payments')
      .select(col)
      .limit(1);
    
    if (error) {
      console.log(`[payments.${col}] -> ❌ MISSING (or error: ${error.message})`);
    } else {
      console.log(`[payments.${col}] -> ✅ EXISTS`);
    }
  }
}

run();
