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

  console.log('1. Checking counts of supervisor statuses in the database...');
  const { data: allApps, error: dbError } = await supabase
    .from('applications')
    .select('id, application_number, status, application_type');

  if (dbError) {
    console.error('❌ Database error:', dbError);
    return;
  }

  const counts = {};
  allApps.forEach(app => {
    counts[app.status] = (counts[app.status] || 0) + 1;
  });
  console.log('Database application status counts:', counts);

  console.log('2. Querying applications for supervisor role...');
  const { data: supervisorApps, error: queryError } = await supabase
    .from('applications')
    .select('*')
    .in('status', ['pending_supervisor', 'escalated']);

  if (queryError) {
    console.error('❌ Query error:', queryError);
  } else {
    console.log(`✅ Supervisor query returned ${supervisorApps.length} applications:`);
    supervisorApps.forEach(app => {
      console.log(`- App: ${app.application_number} | Status: ${app.status} | Type: ${app.application_type}`);
    });
  }
}

run();
