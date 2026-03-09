import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jwnabxbiekmempmocdge.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3bmFieGJpZWttZW1wbW9jZGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDQ0ODMsImV4cCI6MjA4ODA4MDQ4M30.1lNt15_PTgpnwcpV4metcwtSIfQc38cIZqW5CtHPz1U'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// SERVICE_ROLE KEY ADDED DIRECTLY AS REQUESTED BY USER FOR MVP/DEMO PURPOSES
// This bypasses RLS in the onboarding step to provision the tenant since there's no backend.
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3bmFieGJpZWttZW1wbW9jZGdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUwNDQ4MywiZXhwIjoyMDg4MDgwNDgzfQ.1fSexyovI8SAQ8I2o6d8oiFM8Co0WmuybjOs6Z_ioaU'
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'sb-admin-session'
  }
})
