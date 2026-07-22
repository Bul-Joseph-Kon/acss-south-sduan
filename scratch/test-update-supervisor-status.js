import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://avpoufxsjiecbsxvngip.supabase.co';
const supabaseKey = 'sb_publishable_XZ7BUTHNhF1ojqoxlJq7Bg_cqn9o8HE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Logging in...');
  await supabase.auth.signInWithPassword({
    email: 'testadmin@gmail.com',
    password: 'Password123!'
  });

  const { data: apps } = await supabase
    .from('applications')
    .select('id, application_number, status')
    .eq('status', 'submitted')
    .limit(1);

  if (apps && apps.length > 0) {
    const app = apps[0];
    console.log(`Found submitted application: ${app.application_number} (${app.id})`);
    
    console.log('Updating status to pending_supervisor...');
    const { error } = await supabase
      .from('applications')
      .update({ status: 'pending_supervisor' })
      .eq('id', app.id);

    if (error) {
      console.error('❌ Update failed:', error);
    } else {
      console.log('✅ Update succeeded!');
    }
  } else {
    console.log('No submitted applications found to update.');
  }
}

run();
