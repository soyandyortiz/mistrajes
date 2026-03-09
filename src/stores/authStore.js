import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useTenantStore } from './tenantStore';

export const useAuthStore = create((set, get) => ({
  user: null, // Supabase auth user
  profile: null, // Custom profile from perfiles_usuario table
  loading: true,

  initialize: async () => {
    try {
      // 1. Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;

      if (session?.user) {
        // 2. If logged in, fetch the profile data (tenant_id, rol)
        const { data: profileData, error: profileError } = await supabase
          .from('perfiles_usuario')
          .select('*, tenant:tenants(*)')
          .eq('id', session.user.id)
          .single();

        if (profileError) throw profileError;

        useTenantStore.getState().setTenantFromAuth(profileData.tenant);
        set({ user: session.user, profile: profileData, loading: false });
      } else {
        useTenantStore.getState().clearTenant();
        set({ user: null, profile: null, loading: false });
      }

            // 3. Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        // Ignoramos INITIAL_SESSION si ya lo manejó getSession
        if (event === 'SIGNED_OUT') {
           useTenantStore.getState().clearTenant();
           set({ user: null, profile: null, loading: false });
        } else if (session?.user) {
           // Si llega SIGNED_IN o TOKEN_REFRESHED
           const currentProfile = get().profile;
           
           // Si no teníamos perfil o cambió el id de usuario (es otra cuenta), bloqueamos pantalla y traemos la data
           if (!currentProfile || currentProfile.id !== session.user.id) {
               set({ loading: true });
               try {
                  const { data: profileData, error } = await supabase
                    .from('perfiles_usuario')
                    .select('*, tenant:tenants(*)')
                    .eq('id', session.user.id)
                    .single();
                    
                  if (error) {
                     console.error('Error fetching profile on format:', error);
                     useTenantStore.getState().clearTenant();
                     set({ user: session.user, profile: null, loading: false });
                     return;
                  }
                    
                  useTenantStore.getState().setTenantFromAuth(profileData?.tenant);
                  set({ user: session.user, profile: profileData, loading: false });
               } catch (err) {
                  console.error('Crash in onAuthStateChange:', err);
                  set({ user: null, profile: null, loading: false });
               }
           } else {
               // Ya teníamos el perfil de este usuario en memoria. 
               // Solo actualizamos de fondo la sesión (refresh token, etc) SIN mostrar spinner.
               set({ user: session.user, loading: false });
           }
        }
      });

    } catch (error) {
      console.error('Error initializing auth:', error);
      useTenantStore.getState().clearTenant();
      set({ user: null, profile: null, loading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
  }
}));
