import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== SELF-REGISTRATION EDGE FUNCTION START ===')
    
    const { email, password, fullName, role, phone, nationality, organization, company } = await req.json()
    
    console.log('STEP 1: Validate input parameters')
    console.log('Email:', email)
    console.log('Role:', role)
    console.log('Full Name:', fullName)
    
    // Validate role - only trader and agent can self-register
    if (role !== 'trader' && role !== 'agent') {
      console.error('Invalid role for self-registration:', role)
      return new Response(
        JSON.stringify({ error: 'Only Traders and Clearing Agents can self-register' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Validate required fields
    if (!email || !password || !fullName || !role) {
      console.error('Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Email, password, full name, and role are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabaseUrl = Deno.env.get('PROJECT_URL')!
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!
    
    console.log('STEP 2: Initialize Supabase client with Service Role')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('STEP 3: Create Auth user')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role,
      }
    })
    
    if (authError) {
      console.error('STEP 3 FAILED: Auth user creation error:', authError)
      return new Response(
        JSON.stringify({ error: authError.message || 'Failed to create user account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('STEP 3 SUCCESS: Auth user created:', authData.user?.id)
    
    const userId = authData.user?.id
    if (!userId) {
      console.error('STEP 3 FAILED: No user ID returned')
      return new Response(
        JSON.stringify({ error: 'Failed to create user account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('STEP 4: Create profile record')
    const profileData = {
      user_id: userId,
      full_name: fullName,
      email: email,
      phone: phone || null,
      nationality: nationality || 'South Sudan',
      organization: organization || null,
      company: company || null,
      role: role,
      status: 'pending'
    }
    
    console.log('Profile data:', profileData)
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single()
    
    if (profileError) {
      console.error('STEP 4 FAILED: Profile creation error:', profileError)
      console.log('STEP 5: Rollback - Delete Auth user due to profile creation failure')
      
      // Delete the Auth user using Service Role
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)
      if (deleteError) {
        console.error('STEP 5 FAILED: Could not delete Auth user during rollback:', deleteError)
      } else {
        console.log('STEP 5 SUCCESS: Auth user deleted during rollback')
      }
      
      return new Response(
        JSON.stringify({ error: profileError.message || 'Failed to create profile. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('STEP 4 SUCCESS: Profile created:', profile.id)
    console.log('STEP 6: Create audit log entry')
    
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'self_registration',
        entity_type: 'user',
        entity_id: userId,
        details: { role, email },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      })
    
    if (auditError) {
      console.error('STEP 6 WARNING: Audit log creation failed:', auditError)
      // Non-critical error, continue
    } else {
      console.log('STEP 6 SUCCESS: Audit log created')
    }
    
    console.log('=== SELF-REGISTRATION EDGE FUNCTION COMPLETE ===')
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: { 
          user: authData.user,
          profile: profile
        },
        message: 'Registration submitted successfully. Your account is awaiting administrator approval.'
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('=== SELF-REGISTRATION EDGE FUNCTION ERROR ===')
    console.error('Error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
