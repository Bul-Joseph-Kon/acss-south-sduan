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

  const applicationId = 'b3e6fc04-2604-4eff-9957-21380f36a9de';
  console.log(`Attempting to update application ${applicationId} as staff (admin)...`);

  const { data, error } = await supabase
    .from('applications')
    .update({
      notes: 'Test note from staff update verifier'
    })
    .eq('id', applicationId)
    .select()
    .single();

  if (error) {
    console.error('Update Error:', error);
  } else {
    console.log('Update Succeeded! Returned updated application:', data);
  }
}

run();
