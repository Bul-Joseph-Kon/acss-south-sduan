import supabase from '../js/supabase.js';

async function testStatsQuery() {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current Auth User:', user);
    
    if (!user) {
        console.error('No auth user is logged in!');
        return;
    }
    
    const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
    console.log('User Profile:', profile);
    console.log('Profile Query Error:', profileErr);
    
    if (profile) {
        // Run count query exactly like trader-service
        const { count, error: countErr } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);
            
        console.log('Applications count:', count);
        console.log('Applications count error:', countErr);
        
        // Let's query applications directly to see if any exist
        const { data: apps, error: selectErr } = await supabase
            .from('applications')
            .select('*')
            .eq('user_id', profile.id);
            
        console.log('Select applications result length:', apps?.length);
        console.log('Select applications error:', selectErr);
    }
}

testStatsQuery();
