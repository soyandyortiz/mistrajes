import { useState, useEffect } from 'react';
import { Outlet, Navigate, NavLink, useLocation } from 'react-router-dom';
import {
  Store, User, LogOut, ClipboardList, Users,
  Menu, X, ChevronLeft, ChevronRight, Puzzle,
  TrendingUp, TrendingDown, Factory, ShoppingCart, Landmark,
  Receipt, Calendar as CalendarIcon, Shirt, Bell, Tag,
  Ban, Clock, Wrench, Info, LayoutDashboard, ShieldCheck,
  Database, Megaphone, CheckSquare
} from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import { useAuthStore } from '../../stores/authStore';
import BannerSuscripcion from '../BannerSuscripcion';
import NotificationsDropdown from '../notifications/NotificationsDropdown';
import UserProfileDropdown from './UserProfileDropdown';
import { useTenantStore } from '../../stores/tenantStore';
import { supabaseAdmin } from '../../lib/supabase';

const MenuPrincipal = [
  // --- TENANT ROUTES ---
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['tenant_admin', 'tenant_empleado'] },
  { name: 'Calendario', href: '/calendario', icon: CalendarIcon, roles: ['tenant_admin', 'tenant_empleado'] },
  { name: 'Contratos', href: '/contratos', icon: ClipboardList, roles: ['tenant_admin', 'tenant_empleado'] },
  { name: 'Tienda Online', href: '/pedidos-online', icon: ShoppingCart, roles: ['tenant_admin', 'tenant_empleado'] },
  { name: 'Trajes/Productos', href: '/productos', icon: Shirt, roles: ['tenant_admin', 'tenant_empleado'] },
  { name: 'Piezas/Elementos', href: '/piezas', icon: Puzzle, roles: ['tenant_admin', 'tenant_empleado'] },
  { name: 'Categorías', href: '/categorias', icon: Tag, roles: ['tenant_admin', 'tenant_empleado'] },
  { name: 'Clientes', href: '/clientes', icon: Users, roles: ['tenant_admin', 'tenant_empleado'] },
  { name: 'Empleados', href: '/empleados', icon: User, roles: ['tenant_admin'] },
  { name: 'Ingresos', href: '/ingresos', icon: TrendingUp, roles: ['tenant_admin'] },
  { name: 'Egresos', href: '/egresos', icon: TrendingDown, roles: ['tenant_admin'] },
  { name: 'Proveedores', href: '/proveedores', icon: Factory, roles: ['tenant_admin'] },
  { name: 'Caja', href: '/caja', icon: Landmark, roles: ['tenant_admin'] },
  { name: 'Comprobantes', href: '/comprobantes', icon: Receipt, roles: ['tenant_admin'] },

  // --- SUPER ADMIN ROUTES ---
  { name: 'Panel Maestro', href: '/super-admin/negocios', icon: ShieldCheck, roles: ['super_admin'] },
  { name: 'Pedidos DEMOS', href: '/super-admin/pedidos', icon: CheckSquare, roles: ['super_admin'] },
  { name: 'Avisos Globales', href: '/super-admin/avisos', icon: Megaphone, roles: ['super_admin'] },
];


// ——— Countdown hook ———
const useCountdown = (targetDate) => {
  const calc = () => {
    if (!targetDate) return null;
    const diff = new Date(targetDate) - new Date();
    if (diff <= 0) return { h: 0, m: 0, s: 0, done: true };
    return { h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000), done: false };
  };
  const [rem, setRem] = useState(calc);
  useEffect(() => {
    if (!targetDate) return;
    const id = setInterval(() => setRem(calc()), 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return rem;
};

// ——— Modal Suspensión (NO se puede cerrar) ———
const ModalSuspension = ({ tenant, signOut }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[var(--bg-page)]/95 backdrop-blur-md">
    <div className="relative w-full max-w-lg">
      <div className="absolute -inset-4 bg-red-500/10 rounded-3xl blur-3xl pointer-events-none" />
      <div className="relative bg-[var(--bg-surface)] border border-red-500/30 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-red-500/20 border-b border-red-500/30 px-6 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
            <Ban className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <p className="text-xs font-black text-red-300 uppercase tracking-widest">Servicio Suspendido</p>
            <p className="text-[10px] text-red-400/70 font-bold uppercase tracking-widest mt-0.5">Mis Trajes · {tenant?.nombre_negocio}</p>
          </div>
        </div>
        <div className="p-8 text-center space-y-6">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tighter mb-2">Tu cuenta ha sido <span className="text-red-400">suspendida</span></h2>
            <p className="text-sm text-white/50 leading-relaxed">El acceso a los módulos del sistema ha sido bloqueado temporalmente.</p>
          </div>
          {tenant?.motivo_suspension && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-left">
              <p className="text-[10px] font-black text-red-300 uppercase tracking-widest mb-2">Motivo de la suspensión</p>
              <p className="text-sm text-white/70 leading-relaxed">{tenant.motivo_suspension}</p>
            </div>
          )}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">¿Cómo reactivar tu cuenta?</p>
            <ol className="text-xs text-white/60 text-left space-y-2 list-none">
              <li className="flex gap-2"><span className="text-primary font-black">1.</span> Regulariza tu pago de suscripción</li>
              <li className="flex gap-2"><span className="text-primary font-black">2.</span> Envía el comprobante a soporte</li>
              <li className="flex gap-2"><span className="text-primary font-black">3.</span> Tu cuenta será reactivada en minutos</li>
            </ol>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Contáctanos</p>
            <a href="https://wa.me/593982650929" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30 text-xs font-black uppercase tracking-widest transition-all">
              WhatsApp Soporte
            </a>
          </div>
          <div className="border-t border-white/5 pt-4 space-y-2">
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">¿Quieres acceder con otra cuenta?</p>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 text-white/50 border border-white/10 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/20 text-xs font-black uppercase tracking-widest transition-all"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
            <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Esta pantalla no puede cerrarse hasta reactivar el servicio</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ——— Modal Aviso del Sistema ———
const ModalAviso = ({ aviso, onCerrar }) => {
  const countdown = useCountdown(aviso.tipo === 'mantenimiento' ? aviso.fecha_fin : null);
  const esMant = aviso.tipo === 'mantenimiento';
  return (
    <div className={`fixed inset-0 z-[190] flex items-center justify-center p-4 ${esMant ? 'bg-[var(--bg-page)]/90 backdrop-blur-md' : 'bg-[var(--bg-page)]/70 backdrop-blur-sm'}`}>
      <div className="relative w-full max-w-md">
        <div className={`absolute -inset-4 rounded-3xl blur-3xl pointer-events-none ${esMant ? 'bg-amber-500/10' : 'bg-blue-500/10'}`} />
        <div className={`relative bg-[var(--bg-surface)] rounded-2xl overflow-hidden shadow-2xl border ${esMant ? 'border-amber-500/30' : 'border-[var(--border-soft)]'}`}>
          <div className={`px-6 py-4 border-b flex items-center gap-3 ${esMant ? 'bg-amber-500/10 border-amber-500/20' : 'bg-[var(--bg-surface-2)] border-[var(--border-soft)]'}`}>
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center border ${esMant ? 'bg-amber-500/20 border-amber-500/30' : 'bg-blue-500/20 border-blue-500/20'}`}>
              {esMant ? <Wrench className="h-4 w-4 text-amber-400" /> : <Info className="h-4 w-4 text-blue-400" />}
            </div>
            <div className="flex-1">
              <p className={`text-[10px] font-black uppercase tracking-widest ${esMant ? 'text-amber-300' : 'text-blue-300'}`}>
                {esMant ? 'Mantenimiento Programado' : 'Aviso del Sistema'}
              </p>
              <p className="text-xs font-black text-[var(--text-primary)] mt-0.5">{aviso.titulo}</p>
            </div>
            {aviso.permite_cerrar && (
              <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{aviso.mensaje}</p>
            {esMant && countdown && !countdown.done && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <p className="text-[10px] font-black text-amber-300/60 uppercase tracking-widest mb-3 text-center">
                   <Clock className="inline h-3 w-3 mr-1" />Tiempo estimado restante
                </p>
                <div className="flex justify-center gap-4">
                  {[['h', countdown.h], ['m', countdown.m], ['s', countdown.s]].map(([label, val]) => (
                    <div key={label} className="text-center">
                      <div className="text-3xl font-black text-amber-300 tabular-nums w-14 text-center">{String(val).padStart(2, '0')}</div>
                      <div className="text-[9px] font-black text-amber-300/40 uppercase tracking-widest mt-1">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {esMant && countdown?.done && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                <p className="text-xs font-black text-green-300">✅ El mantenimiento debería haber concluido. Recarga la página.</p>
              </div>
            )}
            {aviso.fecha_inicio && (
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest text-center">
                Inicio programado: {new Date(aviso.fecha_inicio).toLocaleString('es-EC')}
              </p>
            )}
            {aviso.permite_cerrar ? (
              <button onClick={onCerrar} className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border border-[var(--border-soft)] hover:bg-[var(--bg-surface-3)] hover:text-[var(--text-primary)] transition-all">
                Entendido, cerrar
              </button>
            ) : (
              <p className="text-center text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Este aviso no puede cerrarse</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DiseñoAdministracion = () => {
  const { user, profile, signOut } = useAuthStore();
  const { tenant } = useTenantStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const [avisos, setAvisos] = useState([]);
  const [avisoActual, setAvisoActual] = useState(null);

  const allowedMenuItems = MenuPrincipal.filter(item => {
    // 1. Verificar si el rol base tiene acceso al ítem
    const tieneRol = item.roles.includes(profile?.rol);
    if (!tieneRol) return false;

    // 2. Si es superadmin o admin, tiene acceso total a lo permitido por su rol
    if (['super_admin', 'tenant_admin'].includes(profile?.rol)) return true;

    // 3. Si es empleado, verificar permisos específicos por módulo si existen
    if (profile?.rol === 'tenant_empleado') {
      if (item.href === '/dashboard') return true;
      const moduloId = item.href.replace('/', '');
      const misPermisos = profile?.permisos?.modulos || [];
      return misPermisos.includes(moduloId);
    }

    return false;
  });

  useEffect(() => { setIsSidebarOpen(false); }, [location.pathname]);

  // Cargar avisos activos
  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabaseAdmin
        .from('avisos_sistema')
        .select('*')
        .eq('es_activo', true)
        .order('created_at', { ascending: true });
      if (data?.length) {
        const leidos = JSON.parse(sessionStorage.getItem('avisos_leidos') || '[]');
        const pendientes = data.filter(a => !a.permite_cerrar || !leidos.includes(a.id));
        setAvisos(pendientes);
        if (pendientes.length > 0) setAvisoActual(0);
      }
    };
    cargar();
  }, []);

  const cerrarAvisoActual = () => {
    const aviso = avisos[avisoActual];
    if (!aviso?.permite_cerrar) return;
    const leidos = JSON.parse(sessionStorage.getItem('avisos_leidos') || '[]');
    sessionStorage.setItem('avisos_leidos', JSON.stringify([...leidos, aviso.id]));
    const nuevos = avisos.filter((_, i) => i !== avisoActual);
    setAvisos(nuevos);
    setAvisoActual(nuevos.length > 0 ? 0 : null);
  };

  const esSuspendido = tenant?.estado === 'suspendido' || tenant?.estado === 'suspended';

  if (!user || !profile) return <Navigate to="/iniciar-sesion" replace />;

  const isSuperAdmin = profile?.rol === 'super_admin';

  return (
    <div className="min-h-screen flex bg-[var(--bg-page)] text-[var(--text-primary)] relative overflow-hidden transition-colors duration-300">

      {/* MODAL SUSPENSIÓN — NO CERRABLE */}
      {esSuspendido && <ModalSuspension tenant={tenant} signOut={signOut} />}

      {/* MODAL AVISO SISTEMA */}
      {!esSuspendido && avisoActual !== null && avisos[avisoActual] && (
        <ModalAviso aviso={avisos[avisoActual]} onCerrar={cerrarAvisoActual} />
      )}

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-[var(--bg-page)]/80 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[var(--bg-surface-3)]/80 backdrop-blur-3xl border-r border-[var(--border-soft)] transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}
        ${esSuspendido ? 'pointer-events-none opacity-20' : ''}
      `}>
        <div className="flex h-16 shrink-0 items-center justify-between p-4 border-b border-[var(--border-soft)]">
          <NavLink to={isSuperAdmin ? "/super-admin/negocios" : "/dashboard"} className={`flex items-center gap-3 transition-opacity duration-200 w-full ${isCollapsed ? 'justify-center' : ''}`}>
            {isCollapsed ? (
               isSuperAdmin ? (
                  <div className="h-8 w-8 rounded-xl bg-[var(--color-primary-dim)] flex items-center justify-center shrink-0 border border-[var(--color-primary)]/30 shadow-[0_0_15px_rgba(51,92,255,0.3)]">
                    <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />
                  </div>
               ) : (
                  tenant?.configuracion_tienda?.icono_url ? (
                    <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-[var(--bg-surface-2)]">
                        <img src={tenant.configuracion_tienda.icono_url} alt="Icono" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-xl bg-[var(--color-primary-dim)] flex items-center justify-center shrink-0">
                      <Store className="h-4 w-4 text-[var(--color-primary)]" />
                    </div>
                  )
               )
            ) : (
               isSuperAdmin ? (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[var(--color-primary-dim)] flex items-center justify-center shrink-0 border border-[var(--color-primary)]/30 shadow-[0_0_20px_rgba(51,92,255,0.4)]">
                      <ShieldCheck className="h-5 w-5 text-[var(--color-primary)]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black tracking-tighter text-[var(--text-primary)] uppercase leading-none">
                        Mis<span className="text-[var(--color-primary)] italic">Trajes</span>
                      </span>
                      <span className="text-[8px] font-bold text-[var(--color-primary)] uppercase tracking-[0.2em] mt-1">Super Admin</span>
                    </div>
                  </div>
               ) : (
                  tenant?.configuracion_tienda?.logo_url ? (
                    <div className="h-10 w-full flex items-center justify-center">
                        <img src={tenant.configuracion_tienda.logo_url} alt="Logo" className="max-h-10 max-w-[180px] object-contain" />
                    </div>
                  ) : (
                    <>
                      <div className="h-8 w-8 rounded-xl bg-[var(--color-primary-dim)] flex items-center justify-center shrink-0">
                        <Store className="h-4 w-4 text-[var(--color-primary)]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black tracking-tighter text-[var(--text-primary)] uppercase leading-none truncate max-w-[160px]">
                          {tenant?.configuracion_tienda?.nombre_negocio || tenant?.nombre_negocio || 'Mi Negocio'}
                        </span>
                      </div>
                    </>
                  )
               )
            )}
          </NavLink>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] rounded-lg"><X className="h-5 w-5" /></button>
          <button onClick={() => setIsCollapsed(!isCollapsed)} className={`hidden lg:flex p-1.5 absolute -right-3.5 top-5 bg-[var(--bg-page)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-soft)] rounded-full z-10 hover:border-[var(--color-primary)]/50 transition-all`}>
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden pt-4 pb-4 px-3 custom-scrollbar">
          {!isCollapsed && <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4 px-3 hidden lg:block">{isSuperAdmin ? 'Administración Global' : 'Módulos Principales'}</label>}
          <ul role="list" className="flex flex-1 flex-col gap-y-1">
            {allowedMenuItems.map((item) => (
              <li key={item.name}>
                <NavLink to={item.href} title={isCollapsed ? item.name : undefined}
                  className={({ isActive }) => `group flex items-center px-3 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all duration-200 uppercase relative overflow-hidden
                    ${isActive 
                      ? 'text-[var(--color-primary)] bg-[var(--color-primary-dim)] border-l-2 border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary-glow)]' 
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] border-l-2 border-transparent'}`}>
                  <item.icon className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-110 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
                  <span className={`whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'hidden lg:hidden' : 'opacity-100 flex-1'}`}>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ease-in-out
        ${isCollapsed ? 'lg:ml-20' : 'lg:ml-72'}
        ${esSuspendido ? 'pointer-events-none select-none opacity-30' : ''}
      `}>
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between px-4 lg:px-8 border-b border-[var(--border-soft)] bg-[var(--navbar-bg)] backdrop-blur-md transition-colors duration-300">
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] rounded-lg mr-3 transition-colors"><Menu className="h-5 w-5" /></button>
            <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              <span className="text-[var(--text-primary)]">{isSuperAdmin ? 'SaaS Central' : (tenant?.nombre || 'Mi Negocio')}</span>
              <span className="opacity-50">/</span>
              <span className="text-[var(--color-primary)] tracking-tighter italic">
                {isSuperAdmin ? 'Administración' : (location.pathname.split('/')[1] || 'Dashboard')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            {!isSuperAdmin && <BannerSuscripcion variant="header" />}
            <NotificationsDropdown />
            
            {/* Global Theme Toggle */}
            <ThemeToggle size="sm" />

            <div className="h-6 w-px bg-[var(--border-soft)] hidden md:block" />
            <UserProfileDropdown />
          </div>
        </header>
        {!isSuperAdmin && <div className="lg:hidden"><BannerSuscripcion isCollapsed={false} /></div>}
        <div className="flex-1 p-4 lg:p-8 relative z-10 overflow-y-auto flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col"><Outlet /></div>
        </div>
      </main>
    </div>
  );
};

export default DiseñoAdministracion;
