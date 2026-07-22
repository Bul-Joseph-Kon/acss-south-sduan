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

  console.log('Logged in successfully. User ID:', authData.user.id);

  console.log('=== Registered Profiles in Database ===');
  const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('id, email, role, status, full_name');
      
  if (pError) {
      console.error('Error fetching profiles:', pError);
  } else {
      console.log(`Found ${profiles.length} profiles:`);
      profiles.forEach(p => {
          console.log(`- ID: ${p.id} | Email: ${p.email} | Name: ${p.full_name} | Role: ${p.role}`);
      });
  }

  const applicationId = 'b3e6fc04-2604-4eff-9957-21380f36a9de';
  
  console.log('Fetching application b3e6fc04-2604-4eff-9957-21380f36a9de...');
  const { data: app, error: fetchError } = await supabase
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .single();

  if (fetchError) {
    console.error('Fetch Error:', fetchError);
    return;
  }
  
  console.log('Fetched Application status:', app.status);
  console.log('Attempting update status to: "under_inspection" ...');

  const { data: updatedApp, error: updateError } = await supabase
    .from('applications')
    .update({
        status: 'under_inspection',
        inspection_required: true,
        inspection_type: 'cargo'
    })
    .eq('id', applicationId)
    .select();

  if (updateError) {
    console.error('Update with under_inspection Error:', updateError);
    
    console.log('Attempting update status to: "inspection_required" ...');
    const { data: updatedApp2, error: updateError2 } = await supabase
      .from('applications')
      .update({
          status: 'inspection_required',
          inspection_required: true,
          inspection_type: 'cargo'
      })
      .eq('id', applicationId)
      .select();
      
    if (updateError2) {
      console.error('Update with inspection_required Error:', updateError2);
    } else {
      console.log('Update with inspection_required Successful:', updatedApp2);
    }
  } else {
    console.log('Update with under_inspection Successful:', updatedApp);
  }
}

run();
