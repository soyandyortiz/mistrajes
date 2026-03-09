import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  const { data, error } = await supabase
    .from('productos')
    .select('id, nombre, precio_unitario')
    .eq('estado', 'activo')
    .is('deleted_at', null)
    .ilike('nombre', `%traje%`)
    .limit(8);
    
  console.log('Error:', error);
  console.log('Result:', data);
}
testFetch();
