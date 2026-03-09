/**
 * useTenantFetch
 * 
 * Hook que envuelve la carga de datos dependientes del tenant_id.
 * Resuelve el problema de que authStore.loading es `true` al montar,
 * y los efectos se disparan con profile = null antes de que el auth cargue.
 *
 * Uso:
 *   const { tenantId, authReady } = useTenantFetch();
 *   useEffect(() => {
 *     if (authReady && tenantId) fetchData();
 *   }, [authReady, tenantId]);
 */
import { useAuthStore } from '../stores/authStore';

export function useTenantFetch() {
  const { profile, loading: authLoading } = useAuthStore();
  const tenantId = profile?.tenant_id ?? null;
  // authReady = true when auth has finished loading (not still in progress)
  const authReady = !authLoading;

  return { tenantId, authReady, profile };
}
