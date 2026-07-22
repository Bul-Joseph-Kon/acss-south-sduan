import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://avpoufxsjiecbsxvngip.supabase.co';
const supabaseKey = 'sb_publishable_XZ7BUTHNhF1ojqoxlJq7Bg_cqn9o8HE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Logging in as testadmin@gmail.com...');
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'testadmin@gmail.com',
    password: 'Password123!'
  });

  console.log('Testing documents table join...');
  const { data: docData, error: docError } = await supabase
    .from('documents')
    .select('*, applications(application_number)')
    .limit(1);

  if (docError) {
    console.error('Documents Join Error:', docError);
  } else {
    console.log('Documents Join Succeeded! No ambiguity found.');
  }

  console.log('Testing payments table join (fixed)...');
  const { data: payData, error: payError } = await supabase
    .from('payments')
    .select('*, applications!payments_application_id_fkey(application_number)')
    .limit(1);

  if (payError) {
    console.error('Payments Join Error:', payError);
  } else {
    console.log('Payments Join Succeeded! Fix is working.');
  }
}

run();
