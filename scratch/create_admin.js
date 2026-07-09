import { createClient } from '@supabase/supabase-js';

const url = 'https://avpoufxsjiecbsxvngip.supabase.co';
const key = 'sb_publishable_XZ7BUTHNhF1ojqoxlJq7Bg_cqn9o8HE';
const supabase = createClient(url, key);

const email = 'testadmin@gmail.com';
const password = 'Password123!';
const fullName = 'Test Administrator';

async function main() {
    console.log('=== Create Admin Diagnostic ===');
    
    // Step 1: Sign in (in case user already exists)
    console.log('Attempting sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    let session = signInData?.session;
    let user = signInData?.user;
    
    if (signInError) {
        console.log('Sign in failed (expected if user does not exist):', signInError.message);
        
        // Step 2: Sign up
        console.log('Attempting sign up...');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName }
            }
        });
        
        if (signUpError) {
            console.error('Sign up failed:', signUpError);
            return;
        }
        
        user = signUpData.user;
        session = signUpData.session;
        console.log('Sign up successful! User ID:', user?.id);
        console.log('Session established:', !!session);
    } else {
        console.log('Sign in successful! User ID:', user?.id);
    }
    
    if (!user) {
        console.error('No user object available.');
        return;
    }

    // Step 3: Insert profile if it doesn't exist
    console.log('Checking profile...');
    const { data: profileCheck, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id);
        
    console.log('Profile check result:', profileCheck, 'Error:', checkError?.message);
    
    if (checkError) {
        console.error('Error checking profile:', checkError);
    }
    
    if (!profileCheck || profileCheck.length === 0) {
        console.log('Profile does not exist. Creating profile...');
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .insert({
                user_id: user.id,
                full_name: fullName,
                email: email,
                role: 'administrator',
                status: 'active'
            })
            .select();
            
        if (profileError) {
            console.error('Profile creation failed:', profileError);
        } else {
            console.log('Profile created successfully:', profileData);
        }
    } else {
        console.log('Profile already exists:', profileCheck[0]);
    }
    
    // Step 4: Run diagnostic queries under this session
    // Re-initialize client with session or just query (supabase client shares state if session is active)
    console.log('Querying profiles...');
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    if (pError) console.error('Profiles select error:', pError);
    else console.log(`Profiles found: ${profiles.length}`);
    
    console.log('Querying admin_users...');
    const { data: admins, error: aError } = await supabase.from('admin_users').select('*');
    if (aError) console.error('Admin users select error:', aError);
    else console.log(`Admin users found: ${admins?.length}`, admins);
    
    console.log('Querying applications...');
    const { data: apps, error: appError } = await supabase.from('applications').select('*');
    if (appError) console.error('Applications select error:', appError);
    else console.log(`Applications found: ${apps?.length}`);
}

main();
