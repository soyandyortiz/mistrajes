import { createClient } from '@supabase/supabase-js';
const rootUrl = 'https://jwnabxbiekmempmocdge.supabase.co';
const rootKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3bmFieGJpZWttZW1wbW9jZGdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUwNDQ4MywiZXhwIjoyMDg4MDgwNDgzfQ.1fSexyovI8SAQ8I2o6d8oiFM8Co0WmuybjOs6Z_ioaU';
const supabaseAdmin = createClient(rootUrl, rootKey);

async function setupUsers() {
  const tenants = await supabaseAdmin.from('tenants').select('*');
  let tenantId = '8ded9cc1-152f-47b6-adbb-67205dd5b6f6';
  
  if (tenants.data && tenants.data.length > 0) {
     tenantId = tenants.data[0].id; // we will use the first tenant
  }
  
  console.log('Using tenant id:', tenantId);

  const users = [
    { email: 'andyortiz.ec@gmail.com', pass: 'Andy0604511089', role: 'super_admin', name: 'Andy (Super Admin)', tenantId: null },
    { email: 'admin@andino.com', pass: 'Admin1234!', role: 'tenant_admin', name: 'Admin Andino', tenantId: tenantId },
    { email: 'empleado@andino.com', pass: 'Empleado1234!', role: 'tenant_empleado', name: 'Empleado Andino', tenantId: tenantId },
  ];

  for (const u of users) {
    let uid = null;
    
    // 1. Try to list user to see if exists
    const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listData && listData.users) {
        const found = listData.users.find(x => x.email === u.email);
        if (found) {
            uid = found.id;
            console.log('User already exists, updating password for:', u.email);
            // Ignore error if it fails
            await supabaseAdmin.auth.admin.updateUserById(uid, { password: u.pass, email_confirm: true });
        }
    }
    
    if (!uid) {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
          email: u.email,
          password: u.pass,
          email_confirm: true,
          user_metadata: { name: u.name }
        });
        
        if (userError) {
          console.log('Error creating user:', u.email, userError.message);
          continue;
        } else {
          uid = userData.user.id;
        }
    }
    
    if(!uid) continue;
    
    // 2. Try simple Update instead of upsert first, sometimes upsert fails due to rules or constraints
    const { error: profileError } = await supabaseAdmin.from('perfiles_usuario').update({
      rol: u.role,
      tenant_id: u.tenantId,
      nombre_completo: u.name,
      es_activo: true
    }).eq('id', uid);
    
    // If update failed (might not exist yet), try Insert
    if (profileError || true) { // just do insert on conflict via SQL instead
        // Try insert since update might return no error but affect 0 rows
        await supabaseAdmin.from('perfiles_usuario').insert({
          id: uid,
          nombre_completo: u.name,
          email: u.email,
          rol: u.role,
          tenant_id: u.tenantId,
          es_activo: true
        }).catch(e => {}); // ignore insert duplicate key error
    }
    
    console.log('Processed profile:', u.email);
  }
}
setupUsers();
