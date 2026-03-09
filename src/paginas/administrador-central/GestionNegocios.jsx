import { useState, useEffect, useMemo } from 'react';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { 
  Users, CreditCard, Bell, Search, Filter, 
  ChevronRight, MoreVertical, CheckCircle2, XCircle, 
  Clock, AlertCircle, Calendar, ExternalLink, 
  PauseCircle, PlayCircle, Trash2, Mail, Phone,
  Building, MapPin, Loader2, Plus, Rocket, CheckCircle
} from 'lucide-react';

const GestionNegocios = ({ initialTab = 'tenants' }) => {
  const [tabActivo, setTabActivo] = useState(initialTab);
  const [tenants, setTenants] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [pagosPendientes, setPagosPendientes] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [procesandoId, setProcesandoId] = useState(null);

  // Modales
  const [modalPlan, setModalPlan] = useState(null);
  const [modalRechazo, setModalRechazo] = useState(null);
  const [modalDetalle, setModalDetalle] = useState(null);
  const [modalSuspension, setModalSuspension] = useState(null);
  const [modalAviso, setModalAviso] = useState({ abierto: false, datos: null });

  useEffect(() => {
    setTabActivo(initialTab);
  }, [initialTab]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // 1. Tenants
      const { data: tenantsData, error: tErr } = await supabaseAdmin
        .from('tenants')
        .select(`
          *,
          plan:plans(id, nombre, precio_mensual)
        `)
        .order('created_at', { ascending: false });
      if (tErr) throw tErr;

      // 2. Pagos Pendientes
      const { data: pagosData, error: pErr } = await supabaseAdmin
        .from('pagos_suscripcion')
        .select(`
          *,
          tenant:tenants!pagos_suscripcion_tenant_id_fkey (nombre_negocio, email_propietario, slug),
          plan:plans!pagos_suscripcion_plan_id_fkey (id, nombre, precio_mensual)
        `)
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false });
      if (pErr) throw pErr;

      // 3. Avisos
      const { data: avisosData, error: aErr } = await supabaseAdmin
        .from('avisos_sistema')
        .select('*')
        .order('created_at', { ascending: false });
      if (aErr) throw aErr;

      const { data: solicitudesData, error: sErr } = await supabaseAdmin
        .from('solicitudes_registro')
        .select(`
          *,
          plan:plans(id, nombre, precio_mensual)
        `)
        .eq('estado', 'pendiente')
        .order('fecha_creacion', { ascending: false });
      if (sErr) throw sErr;

      setTenants(tenantsData || []);
      setPagosPendientes(pagosData || []);
      setAvisos(avisosData || []);
      setSolicitudes(solicitudesData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Lógica Solicitudes (DEMOS) ---
  const handleAprobarSolicitud = async (sol) => {
    if (!window.confirm(`¿Aprobar DEMO para ${sol.nombre_negocio}? Se creará la cuenta activa.`)) return;
    setProcesandoId(sol.id);
    try {
      const tempPassword = 'MT' + Math.floor(Math.random() * 100000);
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: sol.email_propietario,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: sol.nombre_propietario }
      });
      if (authError && !authError.message.includes('already registered')) throw authError;

      const userId = authData?.user?.id;
      const hoy = new Date().toISOString().split('T')[0];
      const trialFin = new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0];

      const { data: tenant, error: tErr } = await supabaseAdmin.from('tenants').insert([{
        nombre_negocio: sol.nombre_negocio,
        slug: sol.slug,
        plan_id: sol.plan_id,
        estado: 'trial',
        nombre_propietario: sol.nombre_propietario,
        cedula_ruc_propietario: sol.cedula_ruc_propietario,
        email_propietario: sol.email_propietario,
        whatsapp_propietario: sol.whatsapp_propietario,
        ciudad: sol.ciudad,
        pais: sol.pais,
        direccion: sol.direccion,
        inicio_suscripcion: hoy,
        fin_suscripcion: trialFin,
        trial_inicio: hoy,
        trial_fin: trialFin
      }]).select().single();
      if (tErr) throw tErr;

      const { data: susc, error: sErr } = await supabaseAdmin.from('tenant_suscripciones').insert([{
        tenant_id: tenant.id,
        plan_id: sol.plan_id,
        tipo: 'trial',
        estado: 'activa',
        fecha_inicio: hoy,
        fecha_vencimiento: trialFin,
        meses_contratados: 1,
        notas: 'DEMO aprobada por SuperAdmin'
      }]).select().single();
      if (sErr) throw sErr;

      await supabaseAdmin.from('tenants').update({ suscripcion_activa_id: susc.id }).eq('id', tenant.id);
      
      if (userId) {
         await supabaseAdmin.from('perfiles_usuario').insert([{ 
           id: userId, 
           tenant_id: tenant.id, 
           rol: 'tenant_admin', 
           nombre_completo: sol.nombre_propietario 
         }]);
      }
      
      await supabaseAdmin.from('solicitudes_registro').update({ estado: 'aprobado' }).eq('id', sol.id);

      alert(`¡DEMO Activo!\nClave Temp: ${tempPassword}\nEmail: ${sol.email_propietario}`);
      fetchAll();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRechazarSolicitud = async (id) => {
    if (!window.confirm('¿Rechazar esta solicitud?')) return;
    try {
      await supabaseAdmin.from('solicitudes_registro').update({ estado: 'rechazado' }).eq('id', id);
      fetchAll();
    } catch (e) { alert('Error al rechazar'); }
  };

  // --- Lógica Suscripciones / Pagos ---
  const handleAprobarPago = async (pago) => {
    if (!pago || !pago.tenant) return;
    try {
      await supabaseAdmin
        .from('pagos_suscripcion')
        .update({ 
          estado: 'confirmado',
          confirmado_en: new Date().toISOString()
        })
        .eq('id', pago.id);

      if (pago.suscripcion_id) {
        await supabaseAdmin
          .from('tenant_suscripciones')
          .update({ 
            estado: 'activa',
            fecha_vencimiento: pago.fin_periodo,
            plan_id: pago.plan_id
          })
          .eq('id', pago.suscripcion_id);
      } else {
        const { data: newSusc } = await supabaseAdmin
          .from('tenant_suscripciones')
          .insert([{
            tenant_id: pago.tenant_id,
            plan_id: pago.plan_id,
            tipo: 'mensual',
            estado: 'activa',
            fecha_inicio: pago.inicio_periodo,
            fecha_vencimiento: pago.fin_periodo,
            meses_contratados: pago.meses_pagados || 1
          }])
          .select()
          .single();
        
        await supabaseAdmin
          .from('tenants')
          .update({ suscripcion_activa_id: newSusc.id })
          .eq('id', pago.tenant_id);
      }

      await supabaseAdmin
        .from('tenants')
        .update({ 
          estado: 'activo',
          fin_suscripcion: pago.fin_periodo,
          plan_id: pago.plan_id
        })
        .eq('id', pago.tenant_id);

      alert('Pago aprobado con éxito');
      fetchAll();
    } catch (e) { 
      console.error(e);
      alert('Error al aprobar pago: ' + e.message); 
    }
  };

  const handleRechazarPago = async (motivo) => {
    if (!modalRechazo) return;
    try {
      await supabaseAdmin
        .from('pagos_suscripcion')
        .update({ 
          estado: 'rechazado',
          notas: motivo 
        })
        .eq('id', modalRechazo.id);

      alert('Pago rechazado');
      setModalRechazo(null);
      fetchAll();
    } catch (e) { alert('Error al rechazar pago'); }
  };

  // --- Lógica Suspensiones ---
  const handleSuspender = async (motivo) => {
    if (!modalSuspension) return;
    try {
      await supabaseAdmin
        .from('tenants')
        .update({ 
          estado: 'suspendido',
          motivo_suspension: motivo 
        })
        .eq('id', modalSuspension.id);

      alert('Negocio suspendido');
      setModalSuspension(null);
      fetchAll();
    } catch (e) { alert('Error al suspender'); }
  };

  const handleActivar = async (tenant) => {
    try {
      await supabaseAdmin
        .from('tenants')
        .update({ 
          estado: 'activo',
          motivo_suspension: null 
        })
        .eq('id', tenant.id);

      alert('Negocio reactivado');
      fetchAll();
    } catch (e) { alert('Error al activar'); }
  };

  // --- Lógica Avisos ---
  const handleGuardarAviso = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const datos = {
      titulo: formData.get('titulo'),
      mensaje: formData.get('mensaje'),
      tipo: formData.get('tipo'),
      es_activo: formData.get('es_activo') === 'on',
      permite_cerrar: formData.get('permite_cerrar') === 'on',
      fecha_inicio: formData.get('fecha_inicio') || null,
      fecha_fin: formData.get('fecha_fin') || null,
    };

    try {
      if (modalAviso.datos?.id) {
        await supabaseAdmin.from('avisos_sistema').update(datos).eq('id', modalAviso.datos.id);
      } else {
        await supabaseAdmin.from('avisos_sistema').insert([datos]);
      }
      setModalAviso({ abierto: false, datos: null });
      fetchAll();
    } catch (e) { alert('Error al guardar aviso'); }
  };

  const handleEliminarAviso = async (id) => {
    if (!window.confirm('¿Eliminar este aviso?')) return;
    try {
      await supabaseAdmin.from('avisos_sistema').delete().eq('id', id);
      fetchAll();
    } catch (e) { alert('Error al eliminar'); }
  };

  // --- Filtros ---
  const tenantsFiltrados = useMemo(() => {
    return tenants.filter(t => {
      const matchBusqueda = t.nombre_negocio?.toLowerCase().includes(busqueda.toLowerCase()) || 
                            t.email_propietario?.toLowerCase().includes(busqueda.toLowerCase());
      const matchEstado = filtroEstado === 'todos' || t.estado === filtroEstado;
      return matchBusqueda && matchEstado;
    });
  }, [tenants, busqueda, filtroEstado]);

  // render UI helpers
  const BadgeEstado = ({ estado }) => {
    const config = {
      activo: 'bg-green-500/10 text-green-400 border-green-500/20',
      active: 'bg-green-500/10 text-green-400 border-green-500/20',
      trial: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      suspendido: 'bg-red-500/10 text-red-400 border-red-500/20',
      suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
      vencido: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };
    const style = config[estado] || 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-soft)]';
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${style}`}>{estado}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="flex items-center gap-4 bg-[var(--bg-surface-2)] border border-[var(--border-soft)] p-1 rounded-2xl w-fit">
        {[
          { id: 'tenants', label: 'Negocios', icon: Users, count: tenants.length },
          { id: 'pedidos', label: 'Pedidos DEMOS', icon: Rocket, count: solicitudes.length + pagosPendientes.length },
          { id: 'avisos', label: 'Avisos', icon: Bell, count: avisos.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setTabActivo(tab.id)}
            className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all
              ${tabActivo === tab.id ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary-glow)] scale-[1.02]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface-3)]'}
            `}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${tabActivo === tab.id ? 'bg-white/20 text-white' : 'bg-[var(--bg-surface-3)] text-[var(--text-muted)]'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 text-[var(--color-primary)] animate-spin" />
          <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Cargando Sistema Central...</p>
        </div>
      ) : (
        <>
          {/* VISTA TENANTS */}
          {tabActivo === 'tenants' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl text-sm text-[var(--text-primary)] focus:border-[var(--color-primary)]/50 outline-none transition-all placeholder-[var(--text-muted)]"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-2xl px-4 py-3 text-sm focus:border-[var(--color-primary)]/50 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="activo">Activos</option>
                    <option value="trial">En Prueba</option>
                    <option value="suspendido">Suspendidos</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {tenantsFiltrados.map(tenant => (
                  <div key={tenant.id} className="group bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-3xl p-6 hover:border-[var(--color-primary)]/30 transition-all hover:shadow-2xl hover:shadow-[var(--color-primary-glow)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                      <BadgeEstado estado={tenant.estado} />
                    </div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-14 w-14 rounded-2xl bg-[var(--color-primary-dim)] border border-[var(--color-primary)]/20 flex items-center justify-center shrink-0">
                        {tenant.configuracion_tienda?.icono_url ? (
                          <img src={tenant.configuracion_tienda.icono_url} alt="" className="h-full w-full object-cover rounded-2xl" />
                        ) : (
                          <Building className="h-6 w-6 text-[var(--color-primary)]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-[var(--text-primary)] tracking-tight truncate pr-16">{tenant.nombre_negocio}</h3>
                        <p className="text-[10px] font-mono text-[var(--color-primary)]/60 truncate uppercase tracking-widest">{tenant.slug}.guambra.shop</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6 font-medium">
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <Mail className="h-3.5 w-3.5 opacity-40 shrink-0" />
                        <span className="truncate">{tenant.email_propietario}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <Phone className="h-3.5 w-3.5 opacity-40 shrink-0" />
                        <span>{tenant.whatsapp_propietario}</span>
                      </div>
                      <div className="pt-3 border-t border-[var(--border-soft)]">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Plan Actual</span>
                          <span className="text-xs font-black text-[var(--color-primary)]">{tenant.plan?.nombre || 'Básico (Free)'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Vencimiento</span>
                          <span className="text-xs font-bold text-[var(--text-secondary)] italic">
                            {tenant.fin_suscripcion ? new Date(tenant.fin_suscripcion).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => setModalDetalle(tenant)}
                        className="flex-1 py-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] hover:bg-[var(--bg-surface-3)] transition-all"
                      >
                        Gestionar
                      </button>
                      {tenant.estado !== 'suspendido' ? (
                        <button 
                          onClick={() => setModalSuspension(tenant)}
                          className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all font-bold"
                        >
                          <PauseCircle className="h-4 w-4" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleActivar(tenant)}
                          className="px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all font-bold"
                        >
                          <PlayCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA PEDIDOS DEMOS */}
          {tabActivo === 'pedidos' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Rocket className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Nuevas Solicitudes DEMO</h2>
                    <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Prospectos esperando habilitación de plataforma</p>
                  </div>
                </div>

                {solicitudes.length === 0 ? (
                  <div className="bg-[var(--bg-surface-2)]/50 border border-dashed border-[var(--border-soft)] rounded-3xl p-12 text-center">
                    <p className="text-xs text-[var(--text-muted)] font-black uppercase tracking-[0.2em]">Cero solicitudes nuevas</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {solicitudes.map(sol => (
                      <div key={sol.id} className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-3xl p-6 hover:border-blue-500/30 transition-all">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h3 className="font-black text-[var(--text-primary)] text-lg tracking-tight">{sol.nombre_negocio}</h3>
                            <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mt-1">{sol.slug}.mistrajes.com</p>
                          </div>
                          <span className="text-[9px] font-black bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 italic uppercase tracking-widest">
                            RUC: {sol.ruc_negocio}
                          </span>
                        </div>
                        
                        <div className="space-y-3 mb-6 bg-[var(--bg-surface-2)] rounded-2xl p-4 border border-[var(--border-soft)]">
                          <div className="flex items-center gap-3 text-xs">
                            <Building className="h-3.5 w-3.5 text-blue-400 opacity-50" />
                            <span className="text-[var(--text-secondary)]">{sol.nombre_propietario}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <Mail className="h-3.5 w-3.5 text-blue-400 opacity-50" />
                            <span className="text-[var(--text-secondary)]">{sol.email_propietario}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <MapPin className="h-3.5 w-3.5 text-blue-400 opacity-50" />
                            <span className="text-[var(--text-muted)]">{sol.ciudad}, {sol.pais}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button 
                             onClick={() => handleRechazarSolicitud(sol.id)}
                             disabled={procesandoId === sol.id}
                             className="flex-1 py-3 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                          >
                             Rechazar
                          </button>
                          <button 
                             onClick={() => handleAprobarSolicitud(sol)}
                             disabled={procesandoId === sol.id}
                             className="flex-1 py-3 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-[10px] font-black uppercase tracking-widest text-blue-300 hover:bg-blue-500/30 transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                             {procesandoId === sol.id ? <Loader2 className="h-3 w-3 animate-spin"/> : <CheckCircle className="h-3 w-3"/>}
                             Activar DEMO
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Pagos por Verificar</h2>
                    <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Renovaciones o cambios de plan con depósito bancario</p>
                  </div>
                </div>

                {pagosPendientes.length === 0 ? (
                  <div className="bg-[var(--bg-surface-2)]/50 border border-dashed border-[var(--border-soft)] rounded-3xl p-12 text-center">
                    <p className="text-xs text-[var(--text-muted)] font-black uppercase tracking-[0.2em]">Cero pagos pendientes</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pagosPendientes.map(pago => (
                      <div key={pago.id} className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-3xl p-6 hover:border-amber-500/30 transition-all">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h3 className="font-black text-[var(--text-primary)] tracking-tight">{pago.tenant?.nombre_negocio}</h3>
                            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-1">Plan: {pago.plan?.nombre}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-[var(--text-primary)] font-mono">USD {pago.monto || pago.plan?.precio_mensual}</p>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase font-black">{pago.metodo_pago || 'Transferencia'}</p>
                          </div>
                        </div>
                        
                        <div className="mb-6">
                           <div className="bg-[var(--bg-surface-2)] p-4 rounded-2xl border border-[var(--border-soft)]">
                              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Notas del Pago</p>
                              <p className="text-xs text-[var(--text-secondary)] italic">{pago.notas || 'Sin notas adicionales'}</p>
                           </div>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={() => setModalRechazo(pago)}
                            className="flex-1 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                          >
                            Rechazar
                          </button>
                          <button 
                            onClick={() => handleAprobarPago(pago)}
                            className="flex-1 py-3 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-300 text-[10px] font-black uppercase tracking-widest hover:bg-green-500/20 transition-all font-bold"
                          >
                            Confirmar Pago
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* VISTA AVISOS */}
          {tabActivo === 'avisos' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-black text-[var(--text-primary)] tracking-tight uppercase tracking-[0.2em]">Gestión de Comunicados</h2>
                <button
                  onClick={() => setModalAviso({ abierto: true, datos: null })}
                  className="px-6 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-primary)]/80 transition-all flex items-center gap-2 shadow-lg shadow-[var(--color-primary-glow)]"
                >
                  <Plus className="h-4 w-4" /> Nuevo Aviso
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {avisos.map(aviso => (
                  <div key={aviso.id} className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-3xl p-6 hover:border-[var(--border-medium)] transition-all relative group">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${aviso.es_activo ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-300 border-red-500/20'}`}>
                        {aviso.es_activo ? 'Activo' : 'Inactivo'}
                      </span>
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{aviso.tipo}</span>
                    </div>
                    <h3 className="font-black text-[var(--text-primary)] mb-2 line-clamp-1">{aviso.titulo}</h3>
                    <p className="text-xs text-[var(--text-secondary)] mb-6 line-clamp-3 leading-relaxed">{aviso.mensaje}</p>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => setModalAviso({ abierto: true, datos: aviso })}
                        className="flex-1 py-2 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)] hover:bg-[var(--bg-surface-3)]"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleEliminarAviso(aviso.id)}
                        className="px-3 py-2 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL DETALLE / GESTIÓN TENANT */}
      {modalDetalle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all animate-in fade-in">
          <div className="w-full max-w-4xl bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-[2.5rem] overflow-hidden shadow-2xl text-left">
            <div className="px-8 py-6 border-b border-[var(--border-soft)] bg-[var(--bg-surface-2)]/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-[var(--color-primary-dim)] flex items-center justify-center border border-[var(--color-primary)]/30">
                  <Building className="h-6 w-6 text-[var(--color-primary)]" />
                </div>
                <div>
                   <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tighter uppercase">{modalDetalle.nombre_negocio}</h2>
                   <p className="text-[10px] font-bold text-[var(--color-primary)]/60 uppercase tracking-[0.3em]">Gestión de Cuenta</p>
                </div>
              </div>
              <button onClick={() => setModalDetalle(null)} className="p-2 rounded-xl hover:bg-[var(--bg-surface-2)] transition-all">
                <XCircle className="h-6 w-6 text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12 font-medium">
               <div className="space-y-8">
                  <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Datos de Suscripción</h3>
                    <div className="bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-3xl p-5 space-y-4">
                       <div className="flex justify-between items-center">
                          <span className="text-xs text-[var(--text-secondary)]">Plan Actual</span>
                          <span className="text-xs font-black text-[var(--color-primary)] uppercase">{modalDetalle.plan?.nombre}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-xs text-[var(--text-secondary)]">Inició en</span>
                          <span className="text-xs font-bold text-[var(--text-primary)] italic">{new Date(modalDetalle.inicio_suscripcion).toLocaleDateString()}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-xs text-[var(--text-secondary)]">Próximo Vencimiento</span>
                          <span className="text-xs font-bold text-red-400 italic">{new Date(modalDetalle.fin_suscripcion).toLocaleDateString()}</span>
                       </div>
                       <div className="pt-4 border-t border-[var(--border-soft)]">
                          <button 
                            onClick={() => { setModalPlan(modalDetalle); setModalDetalle(null); }}
                            className="w-full py-3 rounded-2xl bg-[var(--color-primary-dim)] border border-[var(--color-primary)]/20 text-[var(--color-primary)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-primary)] hover:text-white transition-all shadow-xl shadow-[var(--color-primary-glow)]"
                          >
                             Modificar Plan / Fecha
                          </button>
                       </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Branding & Acceso</h3>
                    <div className="bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-3xl p-5 space-y-4">
                       <div className="flex justify-between items-center">
                          <span className="text-xs text-[var(--text-secondary)]">Estado del Sistema</span>
                          <BadgeEstado estado={modalDetalle.estado} />
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-xs text-[var(--text-secondary)]">Subdominio</span>
                          <span className="text-xs font-mono text-[var(--text-primary)] italic">{modalDetalle.slug}.guambra.shop</span>
                       </div>
                    </div>
                  </section>
               </div>

               <div className="space-y-8">
                  <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Contacto Directo</h3>
                    <div className="bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-3xl p-6 space-y-6">
                       <div>
                          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Propietario / Cliente</p>
                          <p className="text-sm font-black text-[var(--text-primary)]">{modalDetalle.nombre_propietario}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{modalDetalle.cedula_ruc_propietario}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">Canal de Contacto</p>
                          <a href={`mailto:${modalDetalle.email_propietario}`} className="flex items-center gap-3 text-xs text-[var(--color-primary)] hover:underline mb-1">
                             <Mail className="h-4 w-4" /> {modalDetalle.email_propietario}
                          </a>
                          <a href={`https://wa.me/${modalDetalle.whatsapp_propietario}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-xs text-green-500 hover:underline">
                             <Phone className="h-4 w-4" /> {modalDetalle.whatsapp_propietario}
                          </a>
                       </div>
                    </div>
                  </section>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PLAN */}
      {modalPlan && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-[2rem] p-8 shadow-2xl text-left">
            <h2 className="text-xl font-black text-[var(--text-primary)] mb-2 uppercase tracking-tight">Ajustar Suscripción</h2>
            <p className="text-xs text-[var(--text-muted)] mb-8 uppercase tracking-widest font-bold">Inquilino: {modalPlan.nombre_negocio}</p>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const d = new FormData(e.target);
              try {
                await supabaseAdmin.from('tenants').update({
                  plan_id: d.get('plan_id'),
                  fin_suscripcion: d.get('fin_suscripcion')
                }).eq('id', modalPlan.id);
                alert('Suscripción actualizada');
                setModalPlan(null);
                fetchAll();
              } catch (e) { alert('Error al actualizar'); }
            }} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-2">Nuevo Plan</label>
                <select name="plan_id" defaultValue={modalPlan.plan_id} className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-2xl px-4 py-3 text-sm focus:border-[var(--color-primary)] outline-none">
                  <option value="9f128be4-8a4b-483d-9f4a-7f61c5f3e9b1">Plan Básico (20 trajes)</option>
                  <option value="6af5561a-0e9f-431d-b657-3de4ca3556af">Plan Premium (99 trajes)</option>
                  <option value="d5e23a41-8c11-447b-898f-01582312681c">Plan Ilimitado PRO</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-2">Vencimiento</label>
                <input type="date" name="fin_suscripcion" defaultValue={modalPlan.fin_suscripcion?.split('T')[0]} className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-2xl px-4 py-3 text-sm focus:border-[var(--color-primary)] outline-none" />
              </div>
              <div className="flex gap-3 pt-4 font-bold">
                <button type="button" onClick={() => setModalPlan(null)} className="flex-1 py-3 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[10px] font-black uppercase text-[var(--text-muted)] hover:bg-[var(--bg-surface-3)]">Cancelar</button>
                <button type="submit" className="flex-1 py-3 rounded-2xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase shadow-lg shadow-[var(--color-primary-glow)]">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionNegocios;
