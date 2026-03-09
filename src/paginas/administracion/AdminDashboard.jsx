import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Activity, Users, ShoppingCart, DollarSign, TrendingUp, Calendar, ArrowRight, Clock, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const { profile, loading: authLoading } = useAuthStore();

  const handleOpenStore = () => {
      if (!profile?.tenant) return;
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      let url = '';
      if (isLocalhost) {
          url = `http://${window.location.host}/?t=${profile.tenant.slug}`;
      } else if (profile.tenant.dominio_personalizado) {
          url = `https://${profile.tenant.dominio_personalizado}`;
      } else {
          url = `https://${profile.tenant.slug}.mistrajes.com`;
      }
      
      window.open(url, '_blank');
  };

  const [stats, setStats] = useState({
      contratosActivos: 0,
      clientes: 0,
      ingresosMes: 0,
      productosActivos: 0
  });
  const [entregasHoy, setEntregasHoy] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
     const fetchDashboardData = async () => {
         const isSuperAdmin = profile?.rol === 'super_admin';
         if(!profile?.tenant_id && !isSuperAdmin) return;
         
         const hoy = new Date().toISOString().split('T')[0];
         const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

         try {
             setLoading(true);
             
             // Definir consultas dinámicamente según el rol
             let queryContratos = supabase.from('contratos').select('id', { count: 'exact' }).in('estado', ['reservado', 'entregado']);
             let queryClientes = supabase.from('clientes').select('id', { count: 'exact' }).is('deleted_at', null);
             let queryProds = supabase.from('productos').select('id', { count: 'exact' }).eq('estado', 'activo').is('deleted_at', null);
             let queryIngresos = supabase.from('ingresos').select('monto').gte('registrado_en', primerDiaMes);
             let queryEntregas = supabase.from('contratos').select('id, fecha_salida, estado, clientes(nombre_completo)').eq('fecha_salida', hoy).eq('estado', 'reservado');

             // Aplicar filtro de tenant solo si NO es Super Admin
             if (!isSuperAdmin) {
                 queryContratos = queryContratos.eq('tenant_id', profile.tenant_id);
                 queryClientes = queryClientes.eq('tenant_id', profile.tenant_id);
                 queryProds = queryProds.eq('tenant_id', profile.tenant_id);
                 queryIngresos = queryIngresos.eq('tenant_id', profile.tenant_id);
                 queryEntregas = queryEntregas.eq('tenant_id', profile.tenant_id);
             }

             const [resContratos, resClientes, resProds, resCaja, resEntregas] = await Promise.all([
                 queryContratos,
                 queryClientes,
                 queryProds,
                 queryIngresos,
                 queryEntregas
             ]);

             setStats({
                 contratosActivos: resContratos.count || 0,
                 clientes: resClientes.count || 0,
                 productosActivos: resProds.count || 0,
                 ingresosMes: resCaja.data?.reduce((acc, curr) => acc + Number(curr.monto), 0) || 0
             });

             setEntregasHoy(resEntregas.data || []);
         } catch(e) {
             console.error("Error sincronizando dashboard", e);
         } finally {
             setLoading(false);
         }
     };

     fetchDashboardData();
  }, [profile]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex justify-between items-end border-b border-[var(--border-soft)] pb-8">
        <div>
            <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tighter uppercase">
              Panel de Control
            </h1>
            <p className="mt-2 text-xs font-normal text-[var(--text-muted)] uppercase tracking-[0.3em] flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              Sincronización de Datos en Tiempo Real
            </p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={handleOpenStore}
             className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] border border-[var(--border-soft)] hover:border-[var(--border-medium)] text-xs font-black uppercase tracking-widest text-[var(--text-primary)] transition-all shadow-sm"
           >
             <ExternalLink className="h-4 w-4 text-[var(--text-muted)]" />
             Ver Tienda Online
           </button>
           <Link to="/contratos/nuevo" className="btn-guambra-primary !py-3 !px-6 text-xs">Crear Contrato Nuevo</Link>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Contratos Abiertos', value: stats.contratosActivos, icon: TrendingUp, color: 'text-blue-400' },
          { label: 'Cartera Clientes', value: stats.clientes, icon: Users, color: 'text-purple-400' },
          { label: 'Inventario Activo', value: stats.productosActivos, icon: ShoppingCart, color: 'text-amber-400' },
          { label: 'Flujo MTD (Mes)', value: `$${stats.ingresosMes.toFixed(2)}`, icon: DollarSign, color: 'text-green-400' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-8 group relative overflow-hidden bg-[var(--bg-surface)] border-[var(--border-soft)] transition-colors duration-300">
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                 <stat.icon className={`h-24 w-24 ${stat.color}`} />
             </div>
             <div className="flex items-center justify-between mb-6 relative z-10">
                <div className={`p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] group-hover:bg-[var(--bg-surface-3)] transition-all duration-300 ${stat.color}`}>
                   <stat.icon className="h-5 w-5" />
                </div>
                <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">NUCLEO</div>
             </div>
             <dt className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.3em] mb-1 relative z-10">{stat.label}</dt>
             <dd className="text-4xl font-black tracking-tighter text-[var(--text-primary)] relative z-10">
                {loading ? <span className="animate-pulse bg-[var(--bg-surface-2)] text-transparent rounded">--.-</span> : stat.value}
             </dd>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Chart Placeholder */}
        <div className="lg:col-span-2">
            <div className="glass-card p-10 h-full flex flex-col justify-center items-center relative bg-[var(--bg-surface)] border-[var(--border-soft)]">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                   <Activity className="h-40 w-40 text-[var(--color-primary)]" />
                </div>
                <div className="text-center space-y-6 relative z-10 w-full max-w-md">
                   <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)] mx-auto animate-pulse"></div>
                   <h3 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-primary)]">Motor de Analítica</h3>
                   <p className="text-xs text-[var(--text-muted)] uppercase tracking-[0.2em]">Procesando vectores de demanda...</p>
                   <div className="flex gap-2 justify-center items-end h-32 pt-8 border-b border-[var(--border-soft)]">
                      {[0.2, 0.4, 0.3, 0.6, 0.5, 0.8, 0.9, 0.6, 0.7, 1.0].map((height, i) => (
                        <div key={i} className="flex-1 w-full bg-[var(--bg-surface-2)] rounded-t-sm overflow-hidden relative hover:bg-[var(--bg-surface-3)] transition-colors group cursor-crosshair">
                           <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[var(--color-primary)]/80 to-[var(--color-primary)] group-hover:brightness-125 transition-all" style={{ height: `${height * 100}%` }}></div>
                        </div>
                      ))}
                   </div>
                </div>
            </div>
        </div>

        {/* Calendar / Notifications Preview */}
        <div className="glass-card p-8 flex flex-col h-[400px] bg-[var(--bg-surface)] border-[var(--border-soft)]">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--border-soft)]">
             <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 text-[var(--text-primary)]">
                <Calendar className="h-4 w-4 text-[var(--color-primary)]" /> Entregas Agendadas Hoy
             </h3>
             <span className="flex items-center gap-2 text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-widest bg-[var(--color-primary-dim)] px-2 py-1 rounded">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping"></span>
                {entregasHoy.length} Pendientes
             </span>
          </div>
          <div className="space-y-3 overflow-y-auto flex-1 pr-2">
             {loading ? (
                <div className="flex justify-center py-8"><span className="animate-spin h-6 w-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full"></span></div>
             ) : entregasHoy.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                    <Clock className="h-8 w-8 mb-2 text-[var(--text-muted)]" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">Sin entregas para hoy</span>
                </div>
             ) : entregasHoy.map((entrega) => (
               <Link to="/contratos" key={entrega.id} className="flex items-start gap-4 p-4 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] hover:bg-[var(--bg-surface-3)] hover:border-[var(--color-primary)]/30 transition-all duration-300 group cursor-pointer">
                  <div className="h-2 w-2 rounded-full bg-[var(--color-primary)] mt-1.5 shadow-[0_0_10px_rgba(255,100,50,0.5)]"></div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-[var(--text-primary)] mb-1 truncate">{entrega.clientes?.nombre_completo}</h4>
                    <p className="text-[9px] text-[var(--color-primary)] font-bold uppercase tracking-widest">Contrato {entrega.id.split('-')[0]}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all" />
               </Link>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
