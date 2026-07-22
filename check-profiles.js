import { createClient } from '@supabase/supabase-js';

// Try with service role key if available
const supabaseUrl = 'https://avpoufxsjiecbsxvngip.supabase.co';
const supabaseKey = 'sb_publishable_XZ7BUTHNhF1ojqoxlJq7Bg_cqn9o8HE';
const supabase = createClient(supabaseUrl, supabaseKey);

const testAccounts = [
  { email: 'agent@acss.test', password: 'Test123456', role: 'agent', full_name: 'Test Agent', organization: 'Test Customs Agency', phone: '+211 123 456 789' },
  { email: 'officer@acss.test', password: 'Test123456', role: 'officer', full_name: 'Test Officer', organization: 'South Sudan Customs', phone: '+211 234 567 890' },
  { email: 'inspector@acss.test', password: 'Test123456', role: 'inspector', full_name: 'Test Inspector', organization: 'South Sudan Customs', phone: '+211 345 678 901' },
  { email: 'supervisor@acss.test', password: 'Test123456', role: 'supervisor', full_name: 'Test Supervisor', organization: 'South Sudan Customs', phone: '+211 456 789 012' },
  { email: 'revenue@acss.test', password: 'Test123456', role: 'revenue', full_name: 'Test Revenue Officer', organization: 'South Sudan Customs', phone: '+211 567 890 123' }
];

async function createTestAccountsWithAdmin() {
  for (const account of testAccounts) {
    console.log(`Creating account for ${account.email}...`);
    
    // Try to create user with admin API (bypasses email confirmation)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        full_name: account.full_name
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`User ${account.email} already exists, skipping auth creation`);
        // Get existing user
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existingUser = users.find(u => u.email === account.email);
        if (existingUser) {
          // Create profile if it doesn't exist
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', existingUser.id)
            .single();
          
          if (!existingProfile) {
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                user_id: existingUser.id,
                full_name: account.full_name,
                email: account.email,
                phone: account.phone,
                role: account.role,
                status: 'active',
                organization: account.organization,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            if (profileError) {
              console.error(`Failed to create profile for ${account.email}:`, profileError.message);
            } else {
              console.log(`Profile created for ${account.email}`);
            }
          } else {
            console.log(`Profile already exists for ${account.email}`);
          }
        }
        continue;
      }
      console.error(`Failed to create auth user for ${account.email}:`, authError.message);
      continue;
    }

    console.log(`Auth user created for ${account.email}, user_id: ${authData.user.id}`);

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        full_name: account.full_name,
        email: account.email,
        phone: account.phone,
        role: account.role,
        status: 'active',
        organization: account.organization,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error(`Failed to create profile for ${account.email}:`, profileError.message);
    } else {
      console.log(`Profile created for ${account.email}`);
    }
  }

  console.log('All test accounts processed!');
}

createTestAccountsWithAdmin();
