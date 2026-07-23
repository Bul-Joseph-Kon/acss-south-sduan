import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://avpoufxsjiecbsxvngip.supabase.co';
const supabaseKey = 'sb_publishable_XZ7BUTHNhF1ojqoxlJq7Bg_cqn9o8HE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
    console.log('Signing in to fetch profiles...');
    await supabase.auth.signInWithPassword({
        email: 'testadmin@gmail.com',
        password: 'Password123!'
    });
    
    console.log('=== Registered Profiles in Database ===');
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, role, status, full_name');
        
    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }
    
    console.log(`Found ${profiles.length} profiles:`);
    profiles.forEach(p => {
        console.log(`- ID: ${p.id} | Email: ${p.email} | Name: ${p.full_name} | Role: ${p.role} | Status: ${p.status}`);
    });
}

listUsers();
