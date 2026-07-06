import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_ROLES = [
  "trader",
  "agent",
  "officer",
  "inspector",
  "supervisor",
  "revenue",
  "administrator",
  "admin",
];

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate HTTP method
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const {
      email,
      password,
      full_name,
      role,
      phone,
      nationality,
      organization,
      company,
      status = "active",
    } = body;

    // Validate required fields
    if (!email || !password || !full_name || !role) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: email, password, full_name, role",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    if (!VALID_ROLES.includes(role)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with Service Role Key
    const supabaseUrl = Deno.env.get("PROJECT_URL");
    const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Server configuration error" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify requesting user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid authorization token" 
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to verify user role" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["administrator", "admin"].includes(profile.role)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Permission denied: Administrator access required" 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect duplicate email before creation
    const { data: existingUser, error: checkError } = await supabase.auth.admin.listUsers();
    if (checkError) {
      console.error("Failed to check for duplicate email:", checkError);
    } else {
      const duplicate = existingUser.users.find(u => u.email === email);
      if (duplicate) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Email already registered" 
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create auth user
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        phone,
        nationality,
        organization,
        company,
      },
    });

    if (createError) {
      // Check if it's a duplicate email error
      if (createError.message?.toLowerCase().includes("user already registered") ||
          createError.message?.toLowerCase().includes("duplicate") ||
          createError.message?.toLowerCase().includes("already exists")) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Email already registered" 
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.error("Failed to create user:", createError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to create user" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert profile record
    const profileInsertData: any = {
      user_id: authData.user.id,
      full_name,
      email,
      role,
      status: status,
      nationality: nationality || "South Sudan",
    };

    if (phone) profileInsertData.phone = phone;
    if (organization) profileInsertData.organization = organization;
    if (company) profileInsertData.company = company;

    const { error: insertError } = await supabase
      .from("profiles")
      .insert(profileInsertData);

    if (insertError) {
      console.error("Failed to create profile:", insertError);
      
      // Rollback: delete the auth user
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (deleteError) {
        console.error("Failed to rollback auth user:", deleteError);
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to create user profile" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user: authData.user,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});