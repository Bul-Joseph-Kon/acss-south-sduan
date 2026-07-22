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

  console.log('Fetching profiles...');
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, email');

  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log('Profiles in database:');
    data.forEach(p => {
      console.log(`- Name: ${p.full_name} | Role: ${p.role} | Email: ${p.email} | ID: ${p.id}`);
    });
  }
}

run();
