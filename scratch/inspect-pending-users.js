import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://avpoufxsjiecbsxvngip.supabase.co';
const supabaseKey = 'sb_publishable_XZ7BUTHNhF1ojqoxlJq7Bg_cqn9o8HE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching pending profiles...');
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('status', 'pending');

  if (error) {
    console.error('❌ Error fetching profiles:', error);
    return;
  }

  console.log(`Found ${profiles.length} pending profiles:`);
  profiles.forEach(p => {
    console.log(`- ID: ${p.id} | Email: ${p.email} | Name: ${p.full_name} | Role: ${p.role} | Status: ${p.status}`);
  });
}

run();
