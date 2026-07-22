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

  console.log('Searching for application b3e6fc04-2604-4eff-9957-21380f36a9de...');
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', 'b3e6fc04-2604-4eff-9957-21380f36a9de');

  if (error) {
    console.error('Fetch Error:', error);
  } else if (data.length === 0) {
    console.log('❌ Application NOT FOUND in database!');
  } else {
    console.log('✅ Application FOUND!', data[0]);
  }
}

run();
