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

  console.log('1. Testing profile fetch...');
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', 'c4a0a840-c70a-4243-b34c-e73c94b131de')
    .single();

  if (profileError) {
    console.error('❌ Profile Error:', profileError);
  } else {
    console.log('✅ Profile Succeeded:', profileData);
  }

  console.log('2. Testing documents query...');
  const { data: docData, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('application_id', 'b3e6fc04-2604-4eff-9957-21380f36a9de')
    .order('uploaded_at', { ascending: false });

  if (docError) {
    console.error('❌ Documents Error:', docError);
  } else {
    console.log('✅ Documents Succeeded! Count:', docData.length);
  }
}

run();
