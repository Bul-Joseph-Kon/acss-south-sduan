import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://avpoufxsjiecbsxvngip.supabase.co';
const supabaseKey = 'sb_publishable_XZ7BUTHNhF1ojqoxlJq7Bg_cqn9o8HE';
const supabase = createClient(supabaseUrl, supabaseKey);

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

  console.log('Querying inspection_required from applications...');
  const { data, error } = await supabase
    .from('applications')
    .select('id, status, inspection_required')
    .limit(3);

  if (error) {
    console.error('Query Error:', error);
  } else {
    console.log('Query Succeeded! Applications retrieved:', data);
  }
}

run();
