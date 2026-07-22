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

  console.log('Testing ai_validation_results join...');
  const { data, error } = await supabase
    .from('applications')
    .select(`
        id,
        ai_validation_results!ai_validation_results_application_id_fkey(*)
    `)
    .limit(3);

  if (error) {
    console.error('Join Error:', error);
  } else {
    console.log('Join Succeeded! Retrieved applications:', data);
  }
}

run();
