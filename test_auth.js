import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jwnabxbiekmempmocdge.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3bmFieGJpZWttZW1wbW9jZGdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUwNDQ4MywiZXhwIjoyMDg4MDgwNDgzfQ.1fSexyovI8SAQ8I2o6d8oiFM8Co0WmuybjOs6Z_ioaU'
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function test() {
  const { data, error } = await supabaseAdmin
  .from('perfiles_usuario')
  .select('*, tenant:tenants(*)')
  .limit(2);

  console.log("DATA:", JSON.stringify(data, null, 2));
  console.log("ERROR:", error);
}
test();
