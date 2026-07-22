import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://avpoufxsjiecbsxvngip.supabase.co';
const supabaseKey = 'sb_publishable_XZ7BUTHNhF1ojqoxlJq7Bg_cqn9o8HE';
const supabase = createClient(supabaseUrl, supabaseKey);

const candidateColumns = [
  'id',
  'application_id',
  'invoice_number',
  'subtotal',
  'tax_amount',
  'total_amount',
  'currency',
  'due_date',
  'status',
  'items',
  'generated_by',
  'generated_at',
  'paid_at',
  'created_at',
  'updated_at'
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

  console.log('Probing columns for invoices table:');
  for (const col of candidateColumns) {
    const { error } = await supabase
      .from('invoices')
      .select(col)
      .limit(1);
    
    if (error) {
      console.log(`[invoices.${col}] -> ❌ MISSING (or error: ${error.message})`);
    } else {
      console.log(`[invoices.${col}] -> ✅ EXISTS`);
    }
  }
}

run();
