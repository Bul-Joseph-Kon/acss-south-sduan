import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://avpoufxsjiecbsxvngip.supabase.co';
const supabaseKey = 'sb_publishable_XZ7BUTHNhF1ojqoxlJq7Bg_cqn9o8HE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function register(email, role, name) {
  console.log(`Registering ${name} (${email}) as ${role}...`);
  try {
    const { data, error } = await supabase.functions.invoke('self-register', {
      body: {
        email: email,
        password: 'Password123!',
        fullName: name,
        role: role,
        phone: '+211912345678',
        nationality: 'South Sudan',
        organization: null,
        company: null
      }
    });

    if (error) {
      console.error(`❌ Error registering ${email}:`, error);
    } else {
      console.log(`✅ Registered ${email} successfully:`, data);
    }
  } catch (err) {
    console.error(`❌ Exception registering ${email}:`, err);
  }
}

async function run() {
  await register('pendingtrader@acss.test', 'trader', 'Pending Trader');
  await register('pendingagent@acss.test', 'agent', 'Pending Agent');
}

run();
