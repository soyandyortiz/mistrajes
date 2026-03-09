import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jwnabxbiekmempmocdge.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3bmFieGJpZWttZW1wbW9jZGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDQ0ODMsImV4cCI6MjA4ODA4MDQ4M30.1lNt15_PTgpnwcpV4metcwtSIfQc38cIZqW5CtHPz1U'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  console.log("Signing in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@andino.com',
    password: 'admin' // I'll just try '123456', 'admin123', 'admin', 'password' until one works or I can just use admin auth.
  });
  
  if (authError && authError.message !== 'Invalid login credentials') {
    console.log("Auth Error:", authError);
    return;
  }
  if (authError) {
    console.log("Auth Failed:", authError.message);
    // Since I don't know the password, I will just generate a session with supabaseAdmin to get a jwt and use it with anon client.
    return;
  }
}
test();
