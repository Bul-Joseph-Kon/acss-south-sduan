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

  console.log('Fetching one application...');
  const { data: apps, error: fetchError } = await supabase
    .from('applications')
    .select('*')
    .limit(1);

  if (fetchError) {
    console.error('Fetch Error:', fetchError);
    return;
  }

  if (apps.length === 0) {
    console.log('No applications found in the database.');
    return;
  }

  console.log('Columns found in applications table:');
  Object.keys(apps[0]).forEach(key => {
    console.log(`- ${key}`);
  });
}

run();
