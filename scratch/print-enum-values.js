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

  const token = authData.session.access_token;
  console.log('Fetching OpenAPI spec to get enum values for status...');
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    console.error('Failed to fetch:', response.status, response.statusText);
    return;
  }

  const spec = await response.json();
  const statusProp = spec.definitions?.applications?.properties?.status;
  
  if (!statusProp) {
    console.error('Could not find status property in applications table definition');
    return;
  }

  console.log('Enum values in application_status (exposed as applications.status):');
  console.log(statusProp.description);
}

run();
