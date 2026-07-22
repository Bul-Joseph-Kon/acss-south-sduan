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

  console.log("Fetching applications for role 'inspector' with status 'under_inspection'...");
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('status', 'under_inspection');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Success! Found ${data.length} applications in the inspector queue:`);
    data.forEach(app => {
      console.log(`- App Number: ${app.application_number} | Status: ${app.status} | Type: ${app.inspection_type}`);
    });
  }
}

run();
