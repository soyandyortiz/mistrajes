import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import {
  Users, DollarSign, TrendingUp, Calendar, ArrowRight, Clock,
  ExternalLink, Package, Trophy, ChevronRight, Loader2,
  RotateCcw, AlertTriangle, CheckCircle2, Star, Wallet,
  ShoppingBag, BarChart2, FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ── Helpers ───────────────────────────────────────────────────────────────────

const pad = n => String(n).padStart(2, '0');
const hoyISO = () => {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
};
const startEndOfDay = () => {
  const n = new Date();
  const s = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 0, 0, 0).toISOString();
  const e = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 23, 59, 59).toISOString();
  return { s, e };
};
const mesActualInicio = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString();
};
const seisMesesAtras = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth() - 5, 1).toISOString();
};

const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const getUltimos6Meses = () => {
  const ahora = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, label: MESES_CORTOS[d.getMonth()], value: 0 };
  });
};

const fmtMoneda = v => {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${Number(v).toFixed(2)}`;
};

const iniciales = nombre => {
  if (!nombre) return '?';
  const p = nombre.trim().split(' ');
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : nombre.slice(0, 2).toUpperCase();
};

// ── Sub-componentes ───────────────────────────────────────────────────────────

// Variantes de color para StatCard.
// iconBg  → fondo + borde del contenedor del ícono (semitransparente, funciona en claro y oscuro)
// iconTxt → color del ícono SVG (tono 600 = legible sobre fondo claro; tono 400/500 = legible sobre fondo oscuro)
//           Usamos texto con variable Tailwind para que adapte en ambos temas automáticamente.
// glow    → clase bg para el destello decorativo de fondo
const STAT_VARIANTS = {
  blue:   { iconBg: 'bg-blue-500/10 border border-blue-500/25',     iconTxt: 'text-blue-600 dark:text-blue-400',   glow: 'bg-blue-500'   },
  purple: { iconBg: 'bg-purple-500/10 border border-purple-500/25', iconTxt: 'text-purple-600 dark:text-purple-400', glow: 'bg-purple-500' },
  green:  { iconBg: 'bg-green-500/10 border border-green-500/25',   iconTxt: 'text-green-600 dark:text-green-400',  glow: 'bg-green-500'  },
  orange: { iconBg: 'bg-orange-500/10 border border-orange-500/25', iconTxt: 'text-orange-600 dark:text-orange-400', glow: 'bg-orange-500' },
};

// Nota: el proyecto no usa el prefijo `dark:` de Tailwind sino variables CSS con data-theme.
// Para garantizar contraste en ambos temas usamos el nivel 500 que es legible tanto sobre
// fondos claros (#fff) como oscuros (#111).
const STAT_ICON_COLOR = {
  blue:   'text-blue-500',
  purple: 'text-purple-500',
  green:  'text-green-500',
  orange: 'text-orange-500',
};

const StatCard = ({ label, value, icon: Icon, variant = 'blue', loading, subtext }) => {
  const v = STAT_VARIANTS[variant];
  const iconColor = STAT_ICON_COLOR[variant];
  return (
    <div className="glass-card p-6 relative overflow-hidden group hover:-translate-y-0.5 transition-transform">
      {/* Destello decorativo de fondo */}
      <div className={`absolute top-0 right-0 w-28 h-28 rounded-full blur-2xl opacity-10 -translate-y-1/2 translate-x-1/2 pointer-events-none ${v.glow}`} />
      <div className="flex items-center justify-between mb-4 relative z-10">
        {/* Contenedor del ícono: fondo semitransparente del color + borde sutil */}
        <div className={`p-2.5 rounded-xl ${v.iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <dt className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 relative z-10">{label}</dt>
      <dd className="text-3xl font-black tracking-tight text-[var(--text-primary)] relative z-10">
        {loading ? <span className="animate-pulse text-[var(--text-muted)]">···</span> : value}
      </dd>
      {subtext && <p className="text-[10px] text-[var(--text-muted)] font-bold mt-1 relative z-10">{subtext}</p>}
    </div>
  );
};

const BarChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-2 h-36 w-full pt-4">
      {data.map((item, i) => {
        const pct = max > 0 ? (item.value / max) * 100 : 0;
        const isCurrentMonth = i === data.length - 1;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="relative w-full group/bar cursor-default" style={{ height: '100px' }}>
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--bg-surface-3)] border border-[var(--border-soft)] rounded-lg px-2 py-1 text-[10px] font-black whitespace-nowrap opacity-0 group-hover/bar:opacity-100 transition-all z-20 pointer-events-none shadow-lg">
                {fmtMoneda(item.value)}
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex flex-col justify-end" style={{ height: '100px' }}>
                <div
                  className={`w-full rounded-t-lg transition-all duration-700 ${isCurrentMonth ? 'bg-primary' : 'bg-primary/30 group-hover/bar:bg-primary/50'}`}
                  style={{ height: `${pct}%`, minHeight: item.value > 0 ? '4px' : '0' }}
                />
              </div>
            </div>
            <span className={`text-[9px] font-black uppercase tracking-wide ${isCurrentMonth ? 'text-primary' : 'text-[var(--text-muted)]'}`}>
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const RankingBar = ({ nombre, count, total, color = 'bg-primary/50', index }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className={`text-[9px] font-black w-5 text-right shrink-0 ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-[var(--text-muted)]'}`}>
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xs font-bold text-[var(--text-primary)] truncate pr-2">{nombre}</span>
          <span className="text-[10px] font-black text-[var(--text-muted)] shrink-0">{count}x</span>
        </div>
        <div className="h-1.5 bg-[var(--bg-surface-2)] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
};

const ClienteCard = ({ nombre, count, index }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-surface-2)] transition-colors group">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 border ${
      index === 0 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
      index === 1 ? 'bg-slate-500/20 text-slate-300 border-slate-500/30' :
      index === 2 ? 'bg-amber-700/20 text-amber-600 border-amber-700/30' :
      'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-soft)]'
    }`}>
      {iniciales(nombre)}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-black text-[var(--text-primary)] truncate">{nombre}</p>
      <p className="text-[10px] text-[var(--text-muted)] font-bold">{count} {count === 1 ? 'contrato' : 'contratos'}</p>
    </div>
    {index === 0 && <Trophy className="w-4 h-4 text-yellow-400 shrink-0" />}
  </div>
);

const EntregaRow = ({ contrato, tipo }) => (
  <Link
    to="/contratos"
    className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] hover:border-primary/40 hover:bg-primary/5 transition-all group"
  >
    <div className={`w-2 h-2 rounded-full shrink-0 ${tipo === 'entrega' ? 'bg-blue-400' : 'bg-orange-400'} animate-pulse`} />
    <div className="flex-1 min-w-0">
      <p className="text-xs font-black text-[var(--text-primary)] truncate">{contrato.clientes?.nombre_completo || '—'}</p>
      <p className={`text-[10px] font-mono font-bold ${tipo === 'entrega' ? 'text-blue-400' : 'text-orange-400'}`}>
        {contrato.codigo || contrato.id.slice(0, 8).toUpperCase()}
      </p>
    </div>
    <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-primary transition-colors shrink-0" />
  </Link>
);

const EmptyState = ({ icon: Icon, text }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
    <Icon className="w-7 h-7 text-[var(--text-muted)] mb-2" />
    <span className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">{text}</span>
  </div>
);

// ── Componente principal ──────────────────────────────────────────────────────

const AdminDashboard = () => {
  const { profile, loading: authLoading } = useAuthStore();

  const [loading, setLoading]                     = useState(true);
  const [stats, setStats]                         = useState({ activos: 0, clientes: 0, ingresosMes: 0, saldoPendiente: 0 });
  const [entregasHoy, setEntregasHoy]             = useState([]);
  const [devolucionesHoy, setDevolucionesHoy]     = useState([]);
  const [chartData, setChartData]                 = useState(getUltimos6Meses());
  const [topTrajes, setTopTrajes]                 = useState([]);
  const [topClientes, setTopClientes]             = useState([]);
  const [refreshKey, setRefreshKey]               = useState(0);

  const handleOpenStore = () => {
    if (!profile?.tenant) return;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const url = isLocal
      ? `http://${window.location.host}/?t=${profile.tenant.slug}`
      : profile.tenant.dominio_personalizado
        ? `https://${profile.tenant.dominio_personalizado}`
        : `https://${profile.tenant.slug}.mistrajes.com`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    if (authLoading || !profile?.tenant_id) return;

    const tid = profile.tenant_id;

    const cargar = async () => {
      setLoading(true);
      try {
        const { s: startHoy, e: endHoy } = startEndOfDay();
        const mesInicio   = mesActualInicio();
        const chartInicio = seisMesesAtras();

        const [
          resActivos,
          resClientes,
          resSaldo,
          resPagosChart,
          resEntregas,
          resDevoluciones,
          resItems,
          resContratos,
        ] = await Promise.all([
          // Contratos activos (en curso)
          supabase.from('contratos')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tid)
            .in('estado', ['reservado', 'entregado'])
            .is('deleted_at', null),

          // Clientes registrados
          supabase.from('clientes')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tid)
            .is('deleted_at', null),

          // Saldo pendiente de cobro
          supabase.from('contratos')
            .select('saldo_pendiente')
            .eq('tenant_id', tid)
            .in('estado', ['pendiente_pago', 'reservado', 'entregado'])
            .is('deleted_at', null),

          // Pagos para gráfica (últimos 6 meses)
          supabase.from('pagos_contrato')
            .select('monto, registrado_en')
            .eq('tenant_id', tid)
            .gte('registrado_en', chartInicio),

          // Entregas de hoy
          supabase.from('contratos')
            .select('id, codigo, fecha_salida, clientes(nombre_completo)')
            .eq('tenant_id', tid)
            .eq('estado', 'reservado')
            .gte('fecha_salida', startHoy)
            .lte('fecha_salida', endHoy)
            .is('deleted_at', null)
            .order('fecha_salida', { ascending: true }),

          // Devoluciones de hoy
          supabase.from('contratos')
            .select('id, codigo, fecha_devolucion, clientes(nombre_completo)')
            .eq('tenant_id', tid)
            .eq('estado', 'entregado')
            .gte('fecha_devolucion', startHoy)
            .lte('fecha_devolucion', endHoy)
            .is('deleted_at', null)
            .order('fecha_devolucion', { ascending: true }),

          // Items de contratos para top trajes
          supabase.from('items_contrato')
            .select('nombre_item')
            .eq('tenant_id', tid),

          // Contratos para top clientes
          supabase.from('contratos')
            .select('cliente_id, clientes(nombre_completo)')
            .eq('tenant_id', tid)
            .is('deleted_at', null)
            .in('estado', ['reservado', 'entregado', 'devuelto_ok', 'problemas_resueltos', 'pendiente_pago']),
        ]);

        // ── Stats básicos ──────────────────────────────────────────────────
        const saldoTotal = (resSaldo.data || []).reduce((s, c) => s + (parseFloat(c.saldo_pendiente) || 0), 0);

        // Ingresos mes actual desde pagos chart
        const mesKey = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}`;
        const ingresosMes = (resPagosChart.data || [])
          .filter(p => p.registrado_en.startsWith(mesKey))
          .reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);

        setStats({
          activos: resActivos.count || 0,
          clientes: resClientes.count || 0,
          ingresosMes,
          saldoPendiente: saldoTotal,
        });

        // ── Gráfica de ingresos ────────────────────────────────────────────
        const base = getUltimos6Meses();
        (resPagosChart.data || []).forEach(p => {
          const key = p.registrado_en.slice(0, 7);
          const slot = base.find(m => m.key === key);
          if (slot) slot.value += parseFloat(p.monto) || 0;
        });
        setChartData([...base]);

        // ── Entregas y devoluciones ────────────────────────────────────────
        setEntregasHoy(resEntregas.data || []);
        setDevolucionesHoy(resDevoluciones.data || []);

        // ── Top trajes ─────────────────────────────────────────────────────
        const conteoPorTraje = {};
        (resItems.data || []).forEach(it => {
          const k = it.nombre_item;
          conteoPorTraje[k] = (conteoPorTraje[k] || 0) + 1;
        });
        const trajesOrdenados = Object.entries(conteoPorTraje)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([nombre, count]) => ({ nombre, count }));
        setTopTrajes(trajesOrdenados);

        // ── Top clientes ───────────────────────────────────────────────────
        const conteoPorCliente = {};
        const nombreCliente = {};
        (resContratos.data || []).forEach(c => {
          if (!c.cliente_id) return;
          conteoPorCliente[c.cliente_id] = (conteoPorCliente[c.cliente_id] || 0) + 1;
          if (!nombreCliente[c.cliente_id]) {
            nombreCliente[c.cliente_id] = c.clientes?.nombre_completo || 'Cliente';
          }
        });
        const clientesOrdenados = Object.entries(conteoPorCliente)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, count]) => ({ nombre: nombreCliente[id], count }));
        setTopClientes(clientesOrdenados);

      } catch (e) {
        console.error('Dashboard error:', e);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [authLoading, profile?.tenant_id, refreshKey]);

  // ── Helpers de UI ──────────────────────────────────────────────────────────
  const ahora = new Date();
  const saludo = ahora.getHours() < 12 ? 'Buenos días' : ahora.getHours() < 18 ? 'Buenas tardes' : 'Buenas noches';
  const fechaLarga = ahora.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const maxTrajes = topTrajes[0]?.count || 1;
  const maxClientes = topClientes[0]?.count || 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">

      {/* ═══ CABECERA ═══════════════════════════════════════════════════════ */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--border-soft)] pb-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-1 capitalize">{fechaLarga}</p>
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
            {saludo}, <span className="text-primary">{profile?.nombre_completo?.split(' ')[0] || 'Admin'}</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-bold mt-1 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            Datos actualizados en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            title="Actualizar datos"
            className="p-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] hover:bg-[var(--bg-surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenStore}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] border border-[var(--border-soft)] text-xs font-black uppercase tracking-widest text-[var(--text-primary)] transition-all"
          >
            <ExternalLink className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            Ver tienda
          </button>
          <Link to="/contratos/nuevo" className="btn-guambra-primary !py-2.5 !px-5 text-xs">
            + Nuevo contrato
          </Link>
        </div>
      </header>

      {/* ═══ STAT CARDS ═════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Contratos en curso"
          value={stats.activos}
          icon={FileText}
          variant="blue"
          loading={loading}
          subtext="Reservados + entregados"
        />
        <StatCard
          label="Clientes registrados"
          value={stats.clientes}
          icon={Users}
          variant="purple"
          loading={loading}
          subtext="Base de clientes activa"
        />
        <StatCard
          label="Cobrado este mes"
          value={fmtMoneda(stats.ingresosMes)}
          icon={DollarSign}
          variant="green"
          loading={loading}
          subtext="Pagos recibidos del mes"
        />
        <StatCard
          label="Por cobrar"
          value={fmtMoneda(stats.saldoPendiente)}
          icon={Wallet}
          variant="orange"
          loading={loading}
          subtext="Saldo pendiente en contratos"
        />
      </div>

      {/* ═══ GRÁFICA + ACTIVIDAD HOY ════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gráfica de ingresos */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)] flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" /> Ingresos por mes
              </h3>
              <p className="text-[10px] text-[var(--text-muted)] font-bold mt-0.5">Pagos recibidos en los últimos 6 meses</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Total acumulado</p>
              <p className="text-xl font-black font-mono text-primary">
                {loading ? '···' : fmtMoneda(chartData.reduce((s, d) => s + d.value, 0))}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="h-36 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <BarChart data={chartData} />
          )}

          {/* Leyenda */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--border-soft)]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-primary" />
              <span className="text-[10px] font-bold text-[var(--text-muted)]">Mes actual</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-primary/30" />
              <span className="text-[10px] font-bold text-[var(--text-muted)]">Meses anteriores</span>
            </div>
          </div>
        </div>

        {/* Actividad de hoy */}
        <div className="glass-card p-6 flex flex-col gap-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Hoy
          </h3>

          {/* Entregas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" /> Entregas
              </p>
              <span className="text-[10px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                {entregasHoy.length}
              </span>
            </div>
            <div className="space-y-2">
              {loading ? (
                <div className="h-10 animate-pulse bg-[var(--bg-surface-2)] rounded-xl" />
              ) : entregasHoy.length === 0 ? (
                <EmptyState icon={CheckCircle2} text="Sin entregas hoy" />
              ) : entregasHoy.map(e => (
                <EntregaRow key={e.id} contrato={e} tipo="entrega" />
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--border-soft)]" />

          {/* Devoluciones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-400" /> Devoluciones
              </p>
              <span className="text-[10px] font-black bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full">
                {devolucionesHoy.length}
              </span>
            </div>
            <div className="space-y-2">
              {loading ? (
                <div className="h-10 animate-pulse bg-[var(--bg-surface-2)] rounded-xl" />
              ) : devolucionesHoy.length === 0 ? (
                <EmptyState icon={CheckCircle2} text="Sin devoluciones hoy" />
              ) : devolucionesHoy.map(d => (
                <EntregaRow key={d.id} contrato={d} tipo="devolucion" />
              ))}
            </div>
          </div>

          {/* Alerta si hay pendientes */}
          {!loading && (entregasHoy.length > 0 || devolucionesHoy.length > 0) && (
            <Link
              to="/contratos"
              className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
            >
              Ver todos los contratos <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* ═══ RANKINGS ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Trajes más alquilados */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)] flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" /> Trajes más alquilados
            </h3>
            <Link to="/productos" className="text-[10px] font-black text-[var(--text-muted)] hover:text-primary transition-colors flex items-center gap-1">
              Ver todos <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-10 animate-pulse bg-[var(--bg-surface-2)] rounded-xl" />)}
            </div>
          ) : topTrajes.length === 0 ? (
            <EmptyState icon={Package} text="Sin datos de alquileres aún" />
          ) : (
            <div className="space-y-4">
              {topTrajes.map((t, i) => (
                <RankingBar
                  key={t.nombre}
                  nombre={t.nombre}
                  count={t.count}
                  total={maxTrajes}
                  index={i}
                  color={i === 0 ? 'bg-yellow-400/70' : i === 1 ? 'bg-slate-400/70' : i === 2 ? 'bg-amber-700/70' : 'bg-primary/40'}
                />
              ))}
            </div>
          )}

          {!loading && topTrajes.length > 0 && (
            <p className="text-[10px] text-[var(--text-muted)] font-bold mt-5 pt-4 border-t border-[var(--border-soft)]">
              Basado en {topTrajes.reduce((s, t) => s + t.count, 0)} contratos registrados
            </p>
          )}
        </div>

        {/* Mejores clientes */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" /> Clientes más frecuentes
            </h3>
            <Link to="/clientes" className="text-[10px] font-black text-[var(--text-muted)] hover:text-primary transition-colors flex items-center gap-1">
              Ver todos <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-14 animate-pulse bg-[var(--bg-surface-2)] rounded-xl" />)}
            </div>
          ) : topClientes.length === 0 ? (
            <EmptyState icon={Users} text="Sin datos de clientes aún" />
          ) : (
            <div className="space-y-1">
              {topClientes.map((c, i) => (
                <ClienteCard key={c.nombre + i} nombre={c.nombre} count={c.count} index={i} />
              ))}
            </div>
          )}

          {!loading && topClientes.length > 0 && (
            <p className="text-[10px] text-[var(--text-muted)] font-bold mt-4 pt-4 border-t border-[var(--border-soft)]">
              Top {topClientes.length} de {stats.clientes} clientes en total
            </p>
          )}
        </div>
      </div>

      {/* ═══ ACCIONES RÁPIDAS ═══════════════════════════════════════════════ */}
      <div className="glass-card p-6">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4">Acciones rápidas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Nuevo contrato', href: '/contratos/nuevo', icon: FileText, color: 'text-primary border-primary/30 hover:bg-primary/10' },
            { label: 'Ver contratos', href: '/contratos', icon: TrendingUp, color: 'text-blue-400 border-blue-500/30 hover:bg-blue-500/10' },
            { label: 'Ver clientes', href: '/clientes', icon: Users, color: 'text-purple-400 border-purple-500/30 hover:bg-purple-500/10' },
            { label: 'Caja del día', href: '/caja', icon: Wallet, color: 'text-green-400 border-green-500/30 hover:bg-green-500/10' },
          ].map(({ label, href, icon: Icon, color }) => (
            <Link
              key={href}
              to={href}
              className={`flex items-center gap-3 p-4 rounded-xl border bg-[var(--bg-surface-2)] transition-all ${color}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-xs font-black">{label}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;
