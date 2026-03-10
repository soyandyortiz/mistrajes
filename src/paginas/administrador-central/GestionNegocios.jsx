import { useState, useEffect, useMemo } from 'react';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import {
  Users, CreditCard, Bell, Search,
  XCircle, Calendar, Building, MapPin, Loader2, Plus,
  Rocket, CheckCircle, LayoutDashboard, CalendarDays, FileText,
  ShoppingCart, Shirt, Package2, Tag, TrendingUp, TrendingDown,
  Truck, Wallet, Receipt, Puzzle, Sliders, X, Save, Mail, Phone,
  PauseCircle, PlayCircle, Trash2, ChevronRight, User, Settings,
} from 'lucide-react';

// ── Módulos del sistema ───────────────────────────────────────────────────────
const MODULOS_SISTEMA = [
  { id: 'dashboard',      label: 'Dashboard',       icon: LayoutDashboard, desc: 'Panel principal con métricas' },
  { id: 'calendario',     label: 'Calendario',      icon: CalendarDays,    desc: 'Reservas y disponibilidad' },
  { id: 'contratos',      label: 'Contratos',       icon: FileText,        desc: 'Contratos de alquiler' },
  { id: 'pedidos-online', label: 'Pedidos Online',  icon: ShoppingCart,    desc: 'Pedidos desde tienda web' },
  { id: 'productos',      label: 'Productos',       icon: Shirt,           desc: 'Catálogo de trajes' },
  { id: 'piezas',         label: 'Piezas',          icon: Puzzle,          desc: 'Inventario de piezas' },
  { id: 'categorias',     label: 'Categorías',      icon: Tag,             desc: 'Organización del catálogo' },
  { id: 'clientes',       label: 'Clientes',        icon: Users,           desc: 'Base de datos de clientes' },
  { id: 'ingresos',       label: 'Ingresos',        icon: TrendingUp,      desc: 'Registro de ingresos' },
  { id: 'egresos',        label: 'Egresos',         icon: TrendingDown,    desc: 'Gastos y salidas' },
  { id: 'proveedores',    label: 'Proveedores',     icon: Truck,           desc: 'Gestión de proveedores' },
  { id: 'caja',           label: 'Caja',            icon: Wallet,          desc: 'Control de caja diaria' },
  { id: 'comprobantes',   label: 'Comprobantes',    icon: Receipt,         desc: 'Proformas y comprobantes' },
];
const TODOS_IDS = MODULOS_SISTEMA.map(m => m.id);

const PRESETS = {
  demo:          { label: 'DEMO',          modulos: TODOS_IDS },
  emprendedores: { label: 'Emprendedores', modulos: ['dashboard','calendario','contratos','pedidos-online','productos','piezas','categorias','clientes','ingresos','egresos','proveedores','caja'] },
  negocios:      { label: 'Negocios',      modulos: TODOS_IDS },
  empresarial:   { label: 'Empresarial',   modulos: TODOS_IDS },
};

const PRESET_STYLES = {
  demo:          { idle: 'bg-blue-500/10 border-blue-500/20 text-blue-300',   active: 'bg-blue-500 border-blue-500 text-white shadow-blue-500/30' },
  emprendedores: { idle: 'bg-[var(--bg-surface-3)] border-[var(--border-soft)] text-[var(--text-secondary)]', active: 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-[var(--color-primary-glow)]' },
  negocios:      { idle: 'bg-amber-500/10 border-amber-500/20 text-amber-300', active: 'bg-amber-500 border-amber-500 text-white shadow-amber-500/30' },
  empresarial:   { idle: 'bg-violet-500/10 border-violet-500/20 text-violet-300', active: 'bg-violet-500 border-violet-500 text-white shadow-violet-500/30' },
};

// ── Componentes auxiliares (FUERA del componente principal para evitar
//    re-montaje en cada render y pérdida de foco en inputs) ──────────────────

const ESTADO_LABEL = {
  activo:    'Activo',
  active:    'Activo',
  trial:     'Demo',
  demo:      'Demo',
  suspendido:'Suspendido',
  suspended: 'Suspendido',
  vencido:   'Vencido',
  cancelado: 'Cancelado',
};

const BadgeEstado = ({ estado }) => {
  const styles = {
    activo:    'bg-green-500/10 text-green-500 border-green-500/20',
    active:    'bg-green-500/10 text-green-500 border-green-500/20',
    trial:     'bg-blue-500/10 text-blue-500 border-blue-500/20',
    demo:      'bg-blue-500/10 text-blue-500 border-blue-500/20',
    suspendido:'bg-red-500/10 text-red-500 border-red-500/20',
    suspended: 'bg-red-500/10 text-red-500 border-red-500/20',
    vencido:   'bg-amber-500/10 text-amber-500 border-amber-500/20',
    cancelado: 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-soft)]',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[estado] || 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-soft)]'}`}>
      {ESTADO_LABEL[estado] ?? estado}
    </span>
  );
};

const InputField = ({ label, type = 'text', value, onChange, readOnly = false, children }) => (
  <div className="space-y-1.5">
    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.35em] px-1">{label}</label>
    {children || (
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        readOnly={readOnly}
        className={`w-full bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-xl px-4 py-2.5 text-sm focus:border-[var(--color-primary)]/60 outline-none transition-all ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
    )}
  </div>
);

// ── Componente principal ──────────────────────────────────────────────────────
const GestionNegocios = ({ initialTab = 'tenants' }) => {
  const [tabActivo, setTabActivo] = useState(initialTab);
  const [tenants, setTenants] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [pagosPendientes, setPagosPendientes] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [procesandoId, setProcesandoId] = useState(null);

  // Modal de rechazo de pago
  const [modalRechazo, setModalRechazo] = useState(null);
  // Modal de aviso
  const [modalAviso, setModalAviso] = useState({ abierto: false, datos: null });

  // ── Drawer de gestión unificado ─────────────────────────────────────────────
  const [drawer, setDrawer] = useState(null); // { tipo: 'tenant'|'solicitud', item }
  const [drawerTab, setDrawerTab] = useState('cuenta');
  const [formData, setFormData] = useState({});
  const [modulosActivos, setModulosActivos] = useState([]);
  const [presetActivo, setPresetActivo] = useState('demo');
  const [guardando, setGuardando] = useState(false);
  // Detecta si la columna modulos_habilitados ya existe en BD
  const [columnaModulosOk, setColumnaModulosOk] = useState(null); // null=checking true=ok false=falta

  useEffect(() => { setTabActivo(initialTab); }, [initialTab]);
  useEffect(() => { fetchAll(); }, []);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [
        { data: tenantsData, error: tErr },
        { data: pagosData,   error: pErr },
        { data: avisosData,  error: aErr },
        { data: solData,     error: sErr },
        { data: planesData,  error: plErr },
      ] = await Promise.all([
        supabaseAdmin.from('tenants').select('*, plan:plans(id,nombre,precio_mensual)').order('created_at', { ascending: false }),
        supabaseAdmin.from('pagos_suscripcion').select('*, tenant:tenants!pagos_suscripcion_tenant_id_fkey(nombre_negocio,email_propietario,slug), plan:plans!pagos_suscripcion_plan_id_fkey(id,nombre,precio_mensual)').eq('estado', 'pendiente').order('created_at', { ascending: false }),
        supabaseAdmin.from('avisos_sistema').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('solicitudes_registro').select('*, plan:plans(id,nombre,precio_mensual)').eq('estado', 'pendiente').order('fecha_creacion', { ascending: false }),
        supabaseAdmin.from('plans').select('*').eq('es_activo', true).order('precio_mensual'),
      ]);

      if (tErr)  console.error('tenants:', tErr.message);
      if (pErr)  console.error('pagos:', pErr.message);
      if (aErr)  console.error('avisos:', aErr.message);
      if (sErr)  console.error('solicitudes:', sErr.message);
      if (plErr) console.error('planes:', plErr.message);

      setTenants(tenantsData || []);
      setPagosPendientes(pagosData || []);
      setAvisos(avisosData || []);
      setSolicitudes(solData || []);
      setPlanes(planesData || []);

      // Detectar si la columna modulos_habilitados existe
      // Si el primer tenant tiene la clave (aunque sea null), la columna existe
      if (tenantsData?.length > 0) {
        setColumnaModulosOk('modulos_habilitados' in tenantsData[0]);
      } else {
        // Sin tenants: hacer una query de prueba
        const { error: colErr } = await supabaseAdmin
          .from('tenants').select('modulos_habilitados').limit(0);
        setColumnaModulosOk(!colErr);
      }
    } catch (err) {
      console.error('fetchAll error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Drawer: apertura ────────────────────────────────────────────────────────
  const abrirDrawer = (tipo, item) => {
    if (tipo === 'tenant') {
      setFormData({
        nombre_negocio:         item.nombre_negocio || '',
        nombre_propietario:     item.nombre_propietario || '',
        cedula_ruc_propietario: item.cedula_ruc_propietario || '',
        email_propietario:      item.email_propietario || '',
        whatsapp_propietario:   item.whatsapp_propietario || '',
        ciudad:                 item.ciudad || '',
        provincia:              item.provincia || '',
        pais:                   item.pais || 'Ecuador',
        estado:                 item.estado || 'active',
        plan_id:                item.plan_id || '',
        fin_suscripcion:        item.fin_suscripcion ? item.fin_suscripcion.split('T')[0] : '',
        motivo_suspension:      item.motivo_suspension || '',
      });
      setDrawerTab('cuenta');
    } else {
      setDrawerTab('modulos');
    }

    // Módulos
    const saved = item.modulos_habilitados;
    if (Array.isArray(saved) && saved.length > 0) {
      setModulosActivos(saved);
    } else {
      const planNombre = item.plan?.nombre?.toLowerCase() || '';
      const key = planNombre.includes('emprendedor') ? 'emprendedores'
                : planNombre.includes('negocio')     ? 'negocios'
                : planNombre.includes('empresarial') ? 'empresarial'
                : 'demo';
      setPresetActivo(key);
      setModulosActivos([...PRESETS[key].modulos]);
    }

    setDrawer({ tipo, item });
  };

  const cerrarDrawer = () => {
    setDrawer(null);
    setFormData({});
    setModulosActivos([]);
  };

  const aplicarPreset = (key) => {
    setPresetActivo(key);
    setModulosActivos([...PRESETS[key].modulos]);
  };

  const toggleModulo = (id) => {
    setModulosActivos(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  // ── Drawer: guardar todo ─────────────────────────────────────────────────────
  const guardarTodo = async () => {
    if (!drawer) return;
    setGuardando(true);
    try {
      const { tipo, item } = drawer;

      if (tipo === 'tenant') {
        // ── 1. Payload principal del tenant ─────────────────────────────────
        const planIdFinal = formData.plan_id || item.plan_id;
        const finSuscripcion = formData.fin_suscripcion || null;

        const payloadBase = {
          nombre_negocio:         formData.nombre_negocio,
          nombre_propietario:     formData.nombre_propietario,
          cedula_ruc_propietario: formData.cedula_ruc_propietario,
          email_propietario:      formData.email_propietario,
          whatsapp_propietario:   formData.whatsapp_propietario,
          ciudad:                 formData.ciudad,
          provincia:              formData.provincia || null,
          pais:                   formData.pais,
          estado:                 formData.estado,
          fin_suscripcion:        finSuscripcion,
          motivo_suspension:      formData.estado === 'suspendido' ? (formData.motivo_suspension || null) : null,
        };
        if (planIdFinal) payloadBase.plan_id = planIdFinal;

        const { error: errBase } = await supabaseAdmin
          .from('tenants')
          .update(payloadBase)
          .eq('id', item.id);
        if (errBase) throw errBase;

        // ── 2. Sincronizar tenant_suscripciones (fecha + plan + tipo) ──────────
        // BannerSuscripcion del admin tenant lee de esta tabla, NO de tenants.
        if (item.suscripcion_activa_id) {
          const suscPayload = {};
          if (finSuscripcion) suscPayload.fecha_vencimiento = finSuscripcion;
          if (planIdFinal)    suscPayload.plan_id           = planIdFinal;

          // Upgrade Demo → Activo: cambiar tipo de 'trial' a 'mensual'
          const eraDemo = item.estado === 'trial' || item.estado === 'demo';
          const ahoraActivo = formData.estado === 'activo';
          if (eraDemo && ahoraActivo) suscPayload.tipo = 'mensual';

          // Sincronizar estado de la suscripción
          if (formData.estado === 'suspendido')                        suscPayload.estado = 'suspendida';
          else if (formData.estado === 'activo')                       suscPayload.estado = 'activa';

          if (Object.keys(suscPayload).length > 0) {
            const { error: errSusc } = await supabaseAdmin
              .from('tenant_suscripciones')
              .update(suscPayload)
              .eq('id', item.suscripcion_activa_id);
            if (errSusc) console.warn('tenant_suscripciones sync:', errSusc.message);
          }
        }

        // ── 3. Guardar módulos (solo si la columna existe en BD) ─────────────
        if (columnaModulosOk) {
          const { error: errMod } = await supabaseAdmin
            .from('tenants')
            .update({ modulos_habilitados: modulosActivos })
            .eq('id', item.id);
          if (errMod) setColumnaModulosOk(false);
        }

        // Actualizar estado local inmediatamente sin esperar refetch
        const planActualizado = planes.find(p => p.id === planIdFinal) || item.plan;
        setTenants(prev => prev.map(t =>
          t.id === item.id
            ? { ...t, ...payloadBase, plan_id: planIdFinal, plan: planActualizado,
                ...(columnaModulosOk ? { modulos_habilitados: modulosActivos } : {}) }
            : t
        ));

      } else {
        // ── Solicitud: solo módulos ─────────────────────────────────────────
        if (columnaModulosOk) {
          const { error } = await supabaseAdmin
            .from('solicitudes_registro')
            .update({ modulos_habilitados: modulosActivos })
            .eq('id', item.id);
          if (error) {
            setColumnaModulosOk(false);
            throw new Error('La columna modulos_habilitados no existe. Ejecuta la migración SQL.');
          }
        } else {
          throw new Error('La columna modulos_habilitados no existe aún. Ejecuta la migración SQL en Supabase.');
        }
        setSolicitudes(prev => prev.map(s =>
          s.id === item.id ? { ...s, modulos_habilitados: modulosActivos } : s
        ));
      }

      cerrarDrawer();
    } catch (e) {
      alert('Error al guardar: ' + e.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Aprobar solicitud DEMO ──────────────────────────────────────────────────
  const handleAprobarSolicitud = async (sol) => {
    if (!window.confirm(`¿Aprobar DEMO para ${sol.nombre_negocio}?`)) return;
    setProcesandoId(sol.id);
    try {
      const tempPassword = 'MT' + Math.floor(Math.random() * 100000);
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: sol.email_propietario,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: sol.nombre_propietario },
      });
      if (authError && !authError.message.includes('already registered')) throw authError;

      const userId = authData?.user?.id;
      const hoy = new Date().toISOString().split('T')[0];
      const trialFin = new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0];

      const nuevoTenant = {
        nombre_negocio:         sol.nombre_negocio,
        slug:                   sol.slug,
        plan_id:                sol.plan_id,
        estado:                 'trial',
        nombre_propietario:     sol.nombre_propietario,
        cedula_ruc_propietario: sol.cedula_ruc_propietario,
        email_propietario:      sol.email_propietario,
        whatsapp_propietario:   sol.whatsapp_propietario,
        ciudad:                 sol.ciudad,
        pais:                   sol.pais,
        direccion:              sol.direccion,
        inicio_suscripcion:     hoy,
        fin_suscripcion:        trialFin,
        modulos_habilitados:    Array.isArray(sol.modulos_habilitados) && sol.modulos_habilitados.length
                                  ? sol.modulos_habilitados
                                  : PRESETS.demo.modulos,
      };

      // Añadir trial_inicio/fin si la columna existe en el schema real
      try { nuevoTenant.trial_inicio = hoy; nuevoTenant.trial_fin = trialFin; } catch {}

      const { data: tenant, error: tErr } = await supabaseAdmin
        .from('tenants')
        .insert([nuevoTenant])
        .select()
        .single();
      if (tErr) throw tErr;

      if (userId) {
        await supabaseAdmin.from('perfiles_usuario').insert([{
          id: userId,
          tenant_id: tenant.id,
          rol: 'tenant_admin',
          nombre_completo: sol.nombre_propietario,
        }]);
      }

      await supabaseAdmin
        .from('solicitudes_registro')
        .update({ estado: 'aprobado' })
        .eq('id', sol.id);

      alert(`¡DEMO Activo!\nEmail: ${sol.email_propietario}\nClave temporal: ${tempPassword}`);
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

  // ── Pago ────────────────────────────────────────────────────────────────────
  const handleAprobarPago = async (pago) => {
    if (!pago?.tenant) return;
    try {
      await supabaseAdmin
        .from('pagos_suscripcion')
        .update({ estado: 'confirmado', confirmado_en: new Date().toISOString() })
        .eq('id', pago.id);

      await supabaseAdmin
        .from('tenants')
        .update({ estado: 'activo', fin_suscripcion: pago.fin_periodo, plan_id: pago.plan_id })
        .eq('id', pago.tenant_id);

      alert('Pago aprobado con éxito');
      fetchAll();
    } catch (e) {
      alert('Error al aprobar pago: ' + e.message);
    }
  };

  const handleRechazarPago = async (motivo) => {
    if (!modalRechazo) return;
    try {
      await supabaseAdmin
        .from('pagos_suscripcion')
        .update({ estado: 'rechazado', notas: motivo })
        .eq('id', modalRechazo.id);
      setModalRechazo(null);
      fetchAll();
    } catch (e) { alert('Error al rechazar pago'); }
  };

  // ── Avisos ──────────────────────────────────────────────────────────────────
  const handleGuardarAviso = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const datos = {
      titulo:         fd.get('titulo'),
      mensaje:        fd.get('mensaje'),
      tipo:           fd.get('tipo'),
      es_activo:      fd.get('es_activo') === 'on',
      permite_cerrar: fd.get('permite_cerrar') === 'on',
      fecha_inicio:   fd.get('fecha_inicio') || null,
      fecha_fin:      fd.get('fecha_fin') || null,
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

  // ── Filtros ─────────────────────────────────────────────────────────────────
  const tenantsFiltrados = useMemo(() => tenants.filter(t => {
    const q = busqueda.toLowerCase();
    const ok = t.nombre_negocio?.toLowerCase().includes(q) || t.email_propietario?.toLowerCase().includes(q);
    const est = filtroEstado === 'todos' || t.estado === filtroEstado;
    return ok && est;
  }), [tenants, busqueda, filtroEstado]);

  // Helpers de acceso al formData
  const f = (field) => formData[field] ?? '';
  const setF = (field) => (val) => setFormData(prev => ({ ...prev, [field]: val }));

  // ── Tabs del drawer ─────────────────────────────────────────────────────────
  const TABS_TENANT = [
    { id: 'cuenta',   label: 'Cuenta',   icon: Settings },
    { id: 'cliente',  label: 'Cliente',  icon: User },
    { id: 'modulos',  label: 'Módulos',  icon: Sliders },
  ];
  const TABS_SOLICITUD = [
    { id: 'modulos',  label: 'Acceso',   icon: Sliders },
    { id: 'cliente',  label: 'Datos',    icon: User },
  ];

  const esTenant = drawer?.tipo === 'tenant';
  const tabs = esTenant ? TABS_TENANT : TABS_SOLICITUD;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Tabs principales */}
      <div className="flex items-center gap-2 bg-[var(--bg-surface-2)] border border-[var(--border-soft)] p-1 rounded-2xl w-fit">
        {[
          { id: 'tenants', label: 'Negocios',     icon: Users,      count: tenants.length },
          { id: 'pedidos', label: 'Pedidos DEMOS', icon: Rocket,    count: solicitudes.length + pagosPendientes.length },
          { id: 'avisos',  label: 'Avisos',        icon: Bell,      count: avisos.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setTabActivo(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all
              ${tabActivo === tab.id ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary-glow)] scale-[1.02]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface-3)]'}
            `}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${tabActivo === tab.id ? 'bg-white/20' : 'bg-[var(--bg-surface-3)] text-[var(--text-muted)]'}`}>
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
          {/* ── TENANTS ─────────────────────────────────────────────────────── */}
          {tabActivo === 'tenants' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    type="text" placeholder="Buscar negocio o email..."
                    value={busqueda} onChange={e => setBusqueda(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl text-sm text-[var(--text-primary)] focus:border-[var(--color-primary)]/50 outline-none transition-all placeholder-[var(--text-muted)]"
                  />
                </div>
                <select
                  value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                  className="bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-2xl px-4 py-3 text-sm outline-none appearance-none cursor-pointer"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="activo">Activo</option>
                  <option value="trial">Demo</option>
                  <option value="suspendido">Suspendido</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {tenantsFiltrados.map(tenant => {
                  const nMod = Array.isArray(tenant.modulos_habilitados) ? tenant.modulos_habilitados.length : null;
                  return (
                    <div key={tenant.id} className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-3xl p-5 hover:border-[var(--color-primary)]/30 transition-all hover:shadow-xl hover:shadow-[var(--color-primary-glow)] relative">
                      <div className="absolute top-4 right-4">
                        <BadgeEstado estado={tenant.estado} />
                      </div>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="h-12 w-12 rounded-2xl bg-[var(--color-primary-dim)] border border-[var(--color-primary)]/20 flex items-center justify-center shrink-0">
                          {tenant.configuracion_tienda?.icono_url
                            ? <img src={tenant.configuracion_tienda.icono_url} alt="" className="h-full w-full object-cover rounded-2xl" />
                            : <Building className="h-5 w-5 text-[var(--color-primary)]" />}
                        </div>
                        <div className="min-w-0 pr-16">
                          <h3 className="font-black text-[var(--text-primary)] tracking-tight text-sm truncate">{tenant.nombre_negocio}</h3>
                          <p className="text-[10px] font-mono text-[var(--color-primary)]/60 uppercase tracking-wider truncate">{tenant.slug}.mistrajes.com</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-5 text-xs text-[var(--text-secondary)]">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 opacity-40 shrink-0" />
                          <span className="truncate">{tenant.email_propietario}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 opacity-40 shrink-0" />
                          <span>{tenant.whatsapp_propietario || '—'}</span>
                        </div>
                        <div className="pt-2.5 border-t border-[var(--border-soft)] space-y-1.5">
                          {/* Plan + módulos */}
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--text-muted)] font-bold uppercase text-[10px]">{tenant.plan?.nombre || 'Sin plan'}</span>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border ${nMod !== null ? 'bg-[var(--color-primary-dim)] text-[var(--color-primary)] border-[var(--color-primary)]/20' : 'text-[var(--text-muted)] border-[var(--border-soft)]'}`}>
                              {nMod !== null ? `${nMod}/${MODULOS_SISTEMA.length} mód.` : 'Sin config'}
                            </span>
                          </div>
                          {/* Fechas inicio → vencimiento */}
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[var(--text-muted)] font-bold uppercase tracking-wide">Inicio</span>
                            <span className="font-black text-[var(--text-secondary)]">
                              {tenant.inicio_suscripcion
                                ? new Date(tenant.inicio_suscripcion + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                : '—'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[var(--text-muted)] font-bold uppercase tracking-wide">Vence</span>
                            <span className={`font-black ${
                              tenant.fin_suscripcion && new Date(tenant.fin_suscripcion) < new Date()
                                ? 'text-red-500'
                                : new Date(tenant.fin_suscripcion) - new Date() < 5 * 86400000
                                ? 'text-amber-500'
                                : 'text-[var(--text-secondary)]'
                            }`}>
                              {tenant.fin_suscripcion
                                ? new Date(tenant.fin_suscripcion + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                : '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => abrirDrawer('tenant', tenant)}
                        className="w-full py-2.5 rounded-xl bg-[var(--color-primary-dim)] border border-[var(--color-primary)]/20 text-[var(--color-primary)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-primary)] hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <Settings className="h-3.5 w-3.5" /> Gestionar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── PEDIDOS DEMOS ─────────────────────────────────────────────── */}
          {tabActivo === 'pedidos' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

              {/* Solicitudes */}
              <section className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Rocket className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Nuevas Solicitudes DEMO</h2>
                    <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Prospectos esperando habilitación</p>
                  </div>
                </div>

                {solicitudes.length === 0 ? (
                  <div className="bg-[var(--bg-surface-2)]/50 border border-dashed border-[var(--border-soft)] rounded-3xl p-12 text-center">
                    <p className="text-xs text-[var(--text-muted)] font-black uppercase tracking-[0.2em]">Cero solicitudes nuevas</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {solicitudes.map(sol => {
                      const nMod = Array.isArray(sol.modulos_habilitados) ? sol.modulos_habilitados.length : null;
                      return (
                        <div key={sol.id} className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-3xl p-5 hover:border-blue-500/30 transition-all">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-black text-[var(--text-primary)] tracking-tight">{sol.nombre_negocio}</h3>
                              <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mt-0.5">{sol.slug}.mistrajes.com</p>
                            </div>
                            {nMod !== null && (
                              <span className="text-[9px] font-black bg-[var(--color-primary-dim)] text-[var(--color-primary)] px-2 py-0.5 rounded-full border border-[var(--color-primary)]/20 uppercase">
                                {nMod} módulos
                              </span>
                            )}
                          </div>

                          <div className="space-y-2 mb-4 bg-[var(--bg-surface-2)] rounded-2xl p-3 border border-[var(--border-soft)] text-xs">
                            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                              <User className="h-3 w-3 opacity-50" /> {sol.nombre_propietario}
                            </div>
                            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                              <Mail className="h-3 w-3 opacity-50" /> {sol.email_propietario}
                            </div>
                            <div className="flex items-center gap-2 text-[var(--text-muted)]">
                              <MapPin className="h-3 w-3 opacity-50" /> {sol.ciudad}, {sol.pais}
                            </div>
                            {/* Fecha de solicitud */}
                            <div className="pt-2 border-t border-[var(--border-soft)] flex justify-between items-center">
                              <span className="text-[var(--text-muted)] font-bold uppercase tracking-wide text-[10px]">Solicitud recibida</span>
                              <span className="font-black text-[var(--text-secondary)] text-[10px]">
                                {sol.fecha_creacion
                                  ? new Date(sol.fecha_creacion).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                  : '—'}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => abrirDrawer('solicitud', sol)}
                              className="px-3 py-2.5 rounded-xl bg-[var(--color-primary-dim)] border border-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all"
                              title="Configurar acceso"
                            >
                              <Sliders className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRechazarSolicitud(sol.id)}
                              disabled={procesandoId === sol.id}
                              className="flex-1 py-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                            >
                              Rechazar
                            </button>
                            <button
                              onClick={() => handleAprobarSolicitud(sol)}
                              disabled={procesandoId === sol.id}
                              className="flex-1 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-[10px] font-black uppercase tracking-widest text-blue-300 hover:bg-blue-500/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {procesandoId === sol.id ? <Loader2 className="h-3 w-3 animate-spin"/> : <CheckCircle className="h-3 w-3"/>}
                              Activar DEMO
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Pagos pendientes */}
              <section className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Pagos por Verificar</h2>
                    <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Depósitos bancarios pendientes de confirmación</p>
                  </div>
                </div>

                {pagosPendientes.length === 0 ? (
                  <div className="bg-[var(--bg-surface-2)]/50 border border-dashed border-[var(--border-soft)] rounded-3xl p-12 text-center">
                    <p className="text-xs text-[var(--text-muted)] font-black uppercase tracking-[0.2em]">Cero pagos pendientes</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {pagosPendientes.map(pago => (
                      <div key={pago.id} className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-3xl p-5 hover:border-amber-500/30 transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-black text-[var(--text-primary)] tracking-tight text-sm">{pago.tenant?.nombre_negocio}</h3>
                            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">Plan: {pago.plan?.nombre}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-black text-[var(--text-primary)] font-mono">USD {pago.monto || pago.plan?.precio_mensual}</p>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase font-black">{pago.metodo_pago || 'Transferencia'}</p>
                          </div>
                        </div>
                        <div className="bg-[var(--bg-surface-2)] p-3 rounded-xl border border-[var(--border-soft)] mb-4">
                          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase mb-1">Notas</p>
                          <p className="text-xs text-[var(--text-secondary)] italic">{pago.notas || 'Sin notas'}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setModalRechazo(pago)} className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all">
                            Rechazar
                          </button>
                          <button onClick={() => handleAprobarPago(pago)} className="flex-1 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-[10px] font-black uppercase tracking-widest hover:bg-green-500/20 transition-all">
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

          {/* ── AVISOS ──────────────────────────────────────────────────────── */}
          {tabActivo === 'avisos' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-black text-[var(--text-primary)] uppercase tracking-[0.15em]">Comunicados del Sistema</h2>
                <button
                  onClick={() => setModalAviso({ abierto: true, datos: null })}
                  className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-primary)]/80 transition-all flex items-center gap-2 shadow-lg shadow-[var(--color-primary-glow)]"
                >
                  <Plus className="h-4 w-4" /> Nuevo Aviso
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {avisos.map(aviso => (
                  <div key={aviso.id} className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-3xl p-5 hover:border-[var(--border-medium)] transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${aviso.es_activo ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-soft)]'}`}>
                        {aviso.es_activo ? 'Activo' : 'Inactivo'}
                      </span>
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{aviso.tipo}</span>
                    </div>
                    <h3 className="font-black text-[var(--text-primary)] mb-2 line-clamp-1 text-sm">{aviso.titulo}</h3>
                    <p className="text-xs text-[var(--text-secondary)] mb-4 line-clamp-3 leading-relaxed">{aviso.mensaje}</p>
                    <div className="flex gap-2">
                      <button onClick={() => setModalAviso({ abierto: true, datos: aviso })} className="flex-1 py-2 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)] hover:bg-[var(--bg-surface-3)]">
                        Editar
                      </button>
                      <button onClick={() => handleEliminarAviso(aviso.id)} className="px-3 py-2 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500 hover:bg-red-500/10 transition-colors">
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

      {/* ═══════════════════════════════════════════════════════════════════════
          DRAWER DE GESTIÓN UNIFICADO
      ═══════════════════════════════════════════════════════════════════════ */}
      {drawer && (
        <>
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm" onClick={cerrarDrawer} />

          <div className="fixed inset-y-0 right-0 z-[210] w-full max-w-lg bg-[var(--bg-surface)] border-l border-[var(--border-soft)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

            {/* Cabecera del drawer */}
            <div className="px-6 py-4 border-b border-[var(--border-soft)] bg-[var(--bg-surface-2)]/60 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[var(--color-primary-dim)] border border-[var(--color-primary)]/20 flex items-center justify-center">
                    <Building className="h-5 w-5 text-[var(--color-primary)]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-[var(--text-primary)] tracking-tight leading-none">
                      {drawer.item.nombre_negocio}
                    </h2>
                    <p className="text-[10px] font-mono text-[var(--color-primary)]/60 uppercase tracking-widest mt-0.5">
                      {drawer.item.slug}.mistrajes.com
                    </p>
                  </div>
                </div>
                <button onClick={cerrarDrawer} className="p-2 rounded-xl hover:bg-[var(--bg-surface-3)] transition-all text-[var(--text-muted)]">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Tabs del drawer */}
              <div className="flex gap-1 bg-[var(--bg-surface-3)] p-1 rounded-xl">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDrawerTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      drawerTab === tab.id
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    <tab.icon className="h-3 w-3" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contenido del tab */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* ── TAB: CUENTA ────────────────────────────────────────────── */}
              {drawerTab === 'cuenta' && esTenant && (
                <>
                  {/* Fechas de referencia (solo lectura) */}
                  {drawer?.item?.inicio_suscripcion && (
                    <div className="bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-xl px-4 py-3 flex justify-between items-center">
                      <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.35em]">Inicio del plan</span>
                      <span className="text-xs font-black text-[var(--color-primary)]">
                        {new Date(drawer.item.inicio_suscripcion + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <InputField label="Estado del negocio">
                      <select
                        value={f('estado')} onChange={e => setF('estado')(e.target.value)}
                        className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-xl px-4 py-2.5 text-sm outline-none"
                      >
                        <option value="activo">Activo</option>
                        <option value="suspendido">Suspendido</option>
                      </select>
                    </InputField>

                    <InputField label="Vencimiento suscripción" name="fin_suscripcion" type="date" value={f('fin_suscripcion')} onChange={setF('fin_suscripcion')} />
                  </div>

                  <InputField label="Plan asignado">
                    <select
                      value={f('plan_id')} onChange={e => setF('plan_id')(e.target.value)}
                      className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-xl px-4 py-2.5 text-sm outline-none"
                    >
                      <option value="">— Sin plan asignado —</option>
                      {(() => {
                        // Mostrar solo planes de pago (excluir Demo Gratuita y similares)
                        const planesPago = planes.filter(p =>
                          p.precio_mensual > 0 &&
                          !p.nombre.toLowerCase().includes('demo') &&
                          !p.nombre.toLowerCase().includes('gratuita') &&
                          !p.nombre.toLowerCase().includes('free')
                        );
                        return planesPago.length > 0
                          ? planesPago.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.nombre} — ${Number(p.precio_mensual).toFixed(2)}/mes
                              </option>
                            ))
                          : (
                            // Fallback: planes de la página de precios
                            <>
                              <option value="emprendedores">Emprendedores — $25.00/mes</option>
                              <option value="negocios">Negocios — $50.00/mes</option>
                              <option value="empresarial">Empresarial — $75.00/mes</option>
                            </>
                          );
                      })()}
                    </select>
                  </InputField>

                  {/* Aviso de activación cuando viene de Demo */}
                  {(drawer?.item?.estado === 'trial' || drawer?.item?.estado === 'demo') && f('plan_id') && f('plan_id') !== drawer?.item?.plan_id && f('estado') === 'activo' && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
                      <span className="text-green-500 text-sm leading-none mt-0.5">✓</span>
                      <p className="text-[10px] text-green-600 dark:text-green-400 font-bold leading-relaxed">
                        Al guardar, el negocio pasará de <strong>Demo</strong> a <strong>Activo</strong> con el plan seleccionado. La suscripción quedará registrada como mensual.
                      </p>
                    </div>
                  )}

                  {(f('estado') === 'suspendido' || f('estado') === 'suspended') && (
                    <InputField label="Motivo de suspensión" name="motivo_suspension" value={f('motivo_suspension')} onChange={setF('motivo_suspension')}>
                      <textarea
                        value={f('motivo_suspension')} onChange={e => setF('motivo_suspension')(e.target.value)}
                        rows={3}
                        className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-xl px-4 py-2.5 text-sm outline-none resize-none focus:border-[var(--color-primary)]/60 transition-all"
                        placeholder="Describe el motivo de suspensión..."
                      />
                    </InputField>
                  )}

                  <div className="bg-[var(--bg-surface-2)] rounded-2xl border border-[var(--border-soft)] p-4 space-y-2.5">
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.35em]">Resumen de acceso</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-secondary)]">Módulos habilitados</span>
                      <span className="font-black text-[var(--color-primary)]">{modulosActivos.length} / {MODULOS_SISTEMA.length}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-secondary)]">Inicio suscripción</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {drawer.item.inicio_suscripcion ? new Date(drawer.item.inicio_suscripcion).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    <button
                      onClick={() => setDrawerTab('modulos')}
                      className="w-full mt-1 py-2 rounded-xl border border-[var(--border-soft)] text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 transition-all flex items-center justify-center gap-2"
                    >
                      <Sliders className="h-3 w-3" /> Editar módulos
                    </button>
                  </div>
                </>
              )}

              {/* ── TAB: CLIENTE ───────────────────────────────────────────── */}
              {drawerTab === 'cliente' && (
                <>
                  {esTenant ? (
                    <>
                      <InputField label="Nombre del negocio" value={f('nombre_negocio')} onChange={setF('nombre_negocio')} />
                      <div className="grid grid-cols-2 gap-3">
                        <InputField label="Propietario" value={f('nombre_propietario')} onChange={setF('nombre_propietario')} />
                        <InputField label="Cédula / RUC" value={f('cedula_ruc_propietario')} onChange={setF('cedula_ruc_propietario')} />
                      </div>
                      <InputField label="Email" type="email" value={f('email_propietario')} onChange={setF('email_propietario')} />
                      <InputField label="WhatsApp" value={f('whatsapp_propietario')} onChange={setF('whatsapp_propietario')} />
                      <div className="grid grid-cols-2 gap-3">
                        <InputField label="Ciudad" value={f('ciudad')} onChange={setF('ciudad')} />
                        <InputField label="Provincia" value={f('provincia')} onChange={setF('provincia')} />
                      </div>
                      <InputField label="País" value={f('pais')} onChange={setF('pais')} />
                    </>
                  ) : (
                    /* Solicitud: datos de solo lectura */
                    <div className="space-y-3">
                      <div className="bg-[var(--bg-surface-2)] rounded-2xl border border-[var(--border-soft)] p-4 space-y-3">
                        {[
                          ['Propietario', drawer.item.nombre_propietario],
                          ['Cédula / RUC', drawer.item.cedula_ruc_propietario],
                          ['Email', drawer.item.email_propietario],
                          ['WhatsApp', drawer.item.whatsapp_propietario],
                          ['Ciudad', drawer.item.ciudad],
                          ['País', drawer.item.pais],
                          ['Plan solicitado', drawer.item.plan?.nombre],
                        ].map(([label, val]) => val && (
                          <div key={label} className="flex justify-between items-center text-xs">
                            <span className="text-[var(--text-muted)] font-bold uppercase text-[10px]">{label}</span>
                            <span className="text-[var(--text-primary)] font-medium">{val}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] italic text-center">Los datos del cliente se editan después de aprobar el DEMO.</p>
                    </div>
                  )}
                </>
              )}

              {/* ── TAB: MÓDULOS ───────────────────────────────────────────── */}
              {drawerTab === 'modulos' && (
                <>
                  {/* Banner de migración pendiente */}
                  {columnaModulosOk === false && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2">
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">⚠ Migración SQL requerida</p>
                      <p className="text-xs text-amber-300/80 leading-relaxed">
                        La columna <code className="bg-amber-500/20 px-1 rounded">modulos_habilitados</code> no existe en la base de datos. Ejecuta este SQL en <strong>Supabase → SQL Editor</strong>:
                      </p>
                      <pre className="text-[10px] text-amber-200 bg-black/30 rounded-xl p-3 overflow-x-auto leading-relaxed select-all">{`ALTER TABLE public.tenants\n  ADD COLUMN IF NOT EXISTS modulos_habilitados jsonb DEFAULT NULL;\n\nALTER TABLE public.solicitudes_registro\n  ADD COLUMN IF NOT EXISTS modulos_habilitados jsonb DEFAULT NULL;`}</pre>
                      <p className="text-[10px] text-amber-400/70 italic">Los demás datos (cuenta y cliente) sí se guardan correctamente.</p>
                    </div>
                  )}
                  {/* Presets */}
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.35em]">Preset rápido</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(PRESETS).map(([key, preset]) => (
                        <button
                          key={key}
                          onClick={() => aplicarPreset(key)}
                          className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                            presetActivo === key
                              ? PRESET_STYLES[key].active + ' shadow-lg'
                              : PRESET_STYLES[key].idle + ' hover:opacity-80'
                          }`}
                        >
                          {preset.label}
                          <span className="ml-1 opacity-60 text-[9px]">({preset.modulos.length})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lista de módulos */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.35em]">Módulos individuales</p>
                      <div className="flex gap-2 text-[9px] font-black uppercase tracking-widest">
                        <button onClick={() => setModulosActivos(TODOS_IDS)} className="text-[var(--color-primary)] hover:underline">Todo</button>
                        <span className="text-[var(--text-muted)]">/</span>
                        <button onClick={() => setModulosActivos([])} className="text-[var(--text-muted)] hover:text-red-400 hover:underline">Ninguno</button>
                      </div>
                    </div>

                    {MODULOS_SISTEMA.map(mod => {
                      const activo = modulosActivos.includes(mod.id);
                      const IconMod = mod.icon;
                      return (
                        <button
                          key={mod.id}
                          onClick={() => toggleModulo(mod.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left ${
                            activo
                              ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary)]/30'
                              : 'bg-[var(--bg-surface-2)] border-[var(--border-soft)] opacity-55 hover:opacity-75'
                          }`}
                        >
                          <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${activo ? 'bg-[var(--color-primary)]/20' : 'bg-[var(--bg-surface-3)]'}`}>
                            <IconMod className={`h-3.5 w-3.5 ${activo ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-black leading-none mb-0.5 ${activo ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{mod.label}</p>
                            <p className="text-[10px] text-[var(--text-muted)] truncate">{mod.desc}</p>
                          </div>
                          <div className={`relative w-10 h-5 rounded-full border shrink-0 transition-all ${activo ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'bg-[var(--bg-surface-3)] border-[var(--border-soft)]'}`}>
                            <span className={`absolute top-[2px] left-0 h-[16px] w-[16px] rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer: guardar */}
            <div className="px-6 py-4 border-t border-[var(--border-soft)] bg-[var(--bg-surface-2)]/60 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                    Módulos: <span className={`font-black ${columnaModulosOk ? 'text-[var(--color-primary)]' : 'text-amber-400'}`}>{modulosActivos.length}/{MODULOS_SISTEMA.length}</span>
                    {columnaModulosOk === false && <span className="ml-2 text-[9px] text-amber-400 italic">(SQL pendiente)</span>}
                  </p>
                </div>
                <BadgeEstado estado={esTenant ? f('estado') : 'pendiente'} />
              </div>
              <div className="flex gap-3">
                <button onClick={cerrarDrawer} className="flex-1 py-3 rounded-2xl bg-[var(--bg-surface-3)] border border-[var(--border-soft)] text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all">
                  Cancelar
                </button>
                <button
                  onClick={guardarTodo}
                  disabled={guardando}
                  className="flex-1 py-3 rounded-2xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-primary)]/90 transition-all shadow-lg shadow-[var(--color-primary-glow)] flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar todo
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: RECHAZO DE PAGO
      ═══════════════════════════════════════════════════════════════════════ */}
      {modalRechazo && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-3xl p-6 shadow-2xl">
            <h2 className="text-base font-black text-[var(--text-primary)] mb-1">Rechazar Pago</h2>
            <p className="text-xs text-[var(--text-muted)] mb-5 uppercase tracking-widest">{modalRechazo.tenant?.nombre_negocio}</p>
            <form onSubmit={e => { e.preventDefault(); handleRechazarPago(new FormData(e.target).get('motivo')); }} className="space-y-4">
              <textarea name="motivo" rows={3} placeholder="Motivo del rechazo..." required
                className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-xl px-4 py-3 text-sm outline-none resize-none focus:border-red-400/50" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setModalRechazo(null)} className="flex-1 py-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[10px] font-black uppercase text-[var(--text-muted)]">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-[10px] font-black uppercase">Confirmar Rechazo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: AVISO
      ═══════════════════════════════════════════════════════════════════════ */}
      {modalAviso.abierto && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-3xl p-7 shadow-2xl">
            <h2 className="text-base font-black text-[var(--text-primary)] mb-6">
              {modalAviso.datos ? 'Editar Aviso' : 'Nuevo Aviso del Sistema'}
            </h2>
            <form onSubmit={handleGuardarAviso} className="space-y-4">
              <input name="titulo" defaultValue={modalAviso.datos?.titulo} placeholder="Título del aviso" required
                className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)]/50" />
              <textarea name="mensaje" defaultValue={modalAviso.datos?.mensaje} placeholder="Mensaje..." rows={4} required
                className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-xl px-4 py-3 text-sm outline-none resize-none focus:border-[var(--color-primary)]/50" />
              <div className="grid grid-cols-2 gap-3">
                <select name="tipo" defaultValue={modalAviso.datos?.tipo || 'info'}
                  className="bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-xl px-4 py-3 text-sm outline-none">
                  <option value="info">Informativo</option>
                  <option value="warning">Advertencia</option>
                  <option value="success">Éxito</option>
                  <option value="error">Error</option>
                </select>
                <div className="flex items-center gap-3 bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-xl px-4 py-3">
                  <input type="checkbox" name="es_activo" id="es_activo" defaultChecked={modalAviso.datos?.es_activo ?? true} className="accent-[var(--color-primary)]" />
                  <label htmlFor="es_activo" className="text-xs text-[var(--text-secondary)] font-bold cursor-pointer">Activo</label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Desde</label>
                  <input type="date" name="fecha_inicio" defaultValue={modalAviso.datos?.fecha_inicio}
                    className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-xl px-4 py-2.5 text-sm outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest px-1">Hasta</label>
                  <input type="date" name="fecha_fin" defaultValue={modalAviso.datos?.fecha_fin}
                    className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[var(--text-primary)] rounded-xl px-4 py-2.5 text-sm outline-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalAviso({ abierto: false, datos: null })} className="flex-1 py-3 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[10px] font-black uppercase text-[var(--text-muted)]">Cancelar</button>
                <button type="submit" className="flex-1 py-3 rounded-2xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase shadow-lg shadow-[var(--color-primary-glow)]">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default GestionNegocios;
