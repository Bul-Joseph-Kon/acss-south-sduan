import { createClient } from '@supabase/supabase-js';

const url = 'https://avpoufxsjiecbsxvngip.supabase.co';
const key = 'sb_publishable_XZ7BUTHNhF1ojqoxlJq7Bg_cqn9o8HE';
const supabase = createClient(url, key);

async function runDiagnostics() {
    console.log('=== Supabase Diagnostics ===');
    
    // 1. Get current session info (if any, though node run won't have it by default unless we sign in)
    console.log('Fetching profiles...');
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    if (pError) console.error('Profiles select error:', pError);
    else console.log(`Profiles found: ${profiles.length}`, profiles);
    
    console.log('Fetching admin_users...');
    const { data: admins, error: aError } = await supabase.from('admin_users').select('*');
    if (aError) console.error('Admin users select error:', aError);
    else console.log(`Admin users found: ${admins.length}`, admins);
    
    console.log('Fetching applications...');
    const { data: apps, error: appError } = await supabase.from('applications').select('*');
    if (appError) console.error('Applications select error:', appError);
    else console.log(`Applications found: ${apps.length}`, apps);
}

runDiagnostics();
