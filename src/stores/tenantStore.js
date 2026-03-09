import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useTenantStore = create((set, get) => ({
  tenant: null,
  loading: true,
  error: null,

  // Resuelve el tenant actual en base a un slug o dominio (útil para la tienda pública)
  resolveTenant: async (slugOrDomain) => {
    set({ loading: true, error: null });
    try {
       // Buscar por slug o por dominio personalizado
       const { data, error } = await supabase
         .from('tenants')
         .select('*')
         .or(`slug.eq.${slugOrDomain},dominio_personalizado.eq.${slugOrDomain}`)
         .eq('estado', 'active')
         .maybeSingle();
         
       if (error) throw error;
       
       set({ tenant: data, loading: false });
       return data;
    } catch (err) {
       console.error("Error resolving tenant:", err);
       set({ tenant: null, loading: false, error: err.message });
       return null;
    }
  },

  // Para contextos privados (el tenant se obtiene del auth profile)
  setTenantFromAuth: (tenantData) => {
     set({ tenant: tenantData, loading: false, error: null });
  },
  
  clearTenant: () => set({ tenant: null, loading: false, error: null })
}));
