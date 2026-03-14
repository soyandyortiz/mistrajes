import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'sonner';
import {
  Lock, Calendar, Eye, Loader2,
  CheckCircle2, AlertCircle, DollarSign, Wallet,
  TrendingDown, TrendingUp, X, Clock, History, TriangleAlert
} from 'lucide-react';

// Límites del día actual en ISO
const getLocalDayBoundaries = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const pad = n => String(n).padStart(2, '0');
  const localDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return { startISO: start.toISOString(), endISO: end.toISOString(), localDate };
};

// Formatea una fecha YYYY-MM-DD a texto legible en español
const formatFechaCorta = (fechaStr) =>
  new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

// Dado el listado de cierres, devuelve los días sin cierre desde ayer hacia atrás,
// deteniéndose en el primer día cerrado O al llegar a inicioSuscripcion (límite inferior).
// inicioSuscripcion: string "YYYY-MM-DD" — fecha en que el tenant activó su plan.
const detectarDiasSinCierre = (cierresLista, inicioSuscripcion) => {
  const fechasCerradas = new Set(cierresLista.map(c => c.fecha_cierre));
  const sinCierre = [];
  const hoyDate = new Date();
  const pad2 = n => String(n).padStart(2, '0');

  // Límite inferior: inicio del plan (inclusive). Si no existe, no hay límite por plan.
  const limiteInferior = inicioSuscripcion
    ? new Date(inicioSuscripcion + 'T00:00:00')
    : null;

  for (let i = 1; i <= 730; i++) { // máximo 2 años como tope de seguridad
    const d = new Date(hoyDate.getFullYear(), hoyDate.getMonth(), hoyDate.getDate() - i);

    // No retroceder antes del inicio del plan del tenant
    if (limiteInferior && d < limiteInferior) break;

    const dStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

    if (!fechasCerradas.has(dStr)) {
      sinCierre.push(dStr);
    } else {
      break; // Para en el primer día que sí está cerrado
    }
  }
  sinCierre.reverse(); // Más antiguo primero → cierra en orden cronológico
  return sinCierre;
};

// Inicio de semana (lunes) sin mutar el objeto
const getInicioSemana = () => {
  const hoy = new Date();
  const dia = hoy.getDay(); // 0=Dom, 1=Lun…
  const diff = dia === 0 ? -6 : 1 - dia;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diff);
  lunes.setHours(0, 0, 0, 0);
  return lunes;
};

const METODOS_PAGO = ['Efectivo', 'Transferencia Bancaria', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Paypal/Link', 'Otro'];
const CATEGORIAS_EGRESO = [
  { label: 'Pago a proveedores', value: 'pago_proveedor' },
  { label: 'Pago a empleados',   value: 'pago_empleado' },
  { label: 'Arriendo de local',  value: 'arriendo' },
  { label: 'Servicios básicos',  value: 'servicios' },
  { label: 'Otros / Varios',     value: 'otros' },
];

const ModuleNavbar = ({ currentTab, setTab }) => (
  <div className="border-b border-[var(--border-soft)] pb-px mb-8 overflow-x-auto no-scrollbar">
    <nav className="-mb-px flex gap-6">
      <button onClick={() => setTab('dia')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${currentTab === 'dia' ? 'border-primary text-primary' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'}`}>
        <Wallet className="w-3 h-3"/> Vista del Día
      </button>
      <button onClick={() => setTab('historial')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all ${currentTab === 'historial' || currentTab === 'ver' ? 'border-primary text-primary' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'}`}>
        Historial de Cierres
      </button>
    </nav>
  </div>
);

export default function CajaGeneral({ initialTab = 'dia' }) {
  const { profile, loading: authLoading } = useAuthStore();

  const [currentTab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);

  // Reloj en vivo
  const [ahora, setAhora] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Datos del día
  const [ingresosHoy, setIngresosHoy]         = useState([]);
  const [egresosHoy, setEgresosHoy]           = useState([]);
  const [cierreHoyRegistrado, setCierreHoyRegistrado] = useState(false);

  // Historial
  const [cierres, setCierres]         = useState([]);
  const [cierreActivo, setCierreActivo] = useState(null);

  // Filtros historial
  const [filtroRapido, setFiltroRapido]       = useState('todo');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin]   = useState('');

  // Cierre del día actual
  const [esCerrando, setEsCerrando]   = useState(false);
  const [montoFisico, setMontoFisico] = useState('');
  const [notasCierre, setNotasCierre] = useState('');
  const [saldoAnterior, setSaldoAnterior] = useState(0);

  // ─── Cierres retroactivos (días olvidados) ─────────────────────────────────
  const [diasSinCerrar, setDiasSinCerrar]       = useState([]);   // YYYY-MM-DD[], más antiguo primero
  const [retroFecha, setRetroFecha]             = useState(null); // fecha que se está cerrando ahora
  const [retroData, setRetroData]               = useState({ totalIn: 0, totalOut: 0 });
  const [retroLoading, setRetroLoading]         = useState(false);
  const [montoFisicoRetro, setMontoFisicoRetro] = useState('');
  const [notasRetro, setNotasRetro]             = useState('');
  const [guardandoRetro, setGuardandoRetro]     = useState(false);

  // ─── Carga de datos ────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const { startISO, endISO, localDate: hoyISO } = getLocalDayBoundaries();

      const { data: cierresData, error: errC } = await supabase
        .from('cierres_caja')
        .select('*, perfiles_usuario(nombre_completo)')
        .eq('tenant_id', profile.tenant_id)
        .order('fecha_cierre', { ascending: false });

      if (errC && errC.code !== '42P01') throw errC;

      const cierresLista = (cierresData || []).map(c => ({
        ...c,
        registrado_por_nombre: c.perfiles_usuario?.nombre_completo || 'Sistema',
      }));
      setCierres(cierresLista);

      const yaCerradoHoy = cierresLista.some(c => c.fecha_cierre === hoyISO);
      setCierreHoyRegistrado(yaCerradoHoy);

      if (cierresLista.length > 0) setSaldoAnterior(cierresLista[0].saldo_acumulado || 0);

      // ── Detectar días sin cierre desde el inicio del plan del tenant ─────
      const sinCierre = detectarDiasSinCierre(cierresLista, profile.tenant?.inicio_suscripcion);
      setDiasSinCerrar(sinCierre);
      // Seleccionar automáticamente el más antiguo para cerrar primero
      if (sinCierre.length > 0) {
        setRetroFecha(sinCierre[0]);
      } else {
        setRetroFecha(null);
      }

      if (!yaCerradoHoy) {
        // Ingresos de hoy
        const { data: ingData, error: errI } = await supabase
          .from('ingresos')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .gte('registrado_en', startISO)
          .lte('registrado_en', endISO);
        if (errI && errI.code !== '42P01') throw errI;

        const pagoIds = (ingData || []).map(i => i.pago_contrato_id).filter(Boolean);
        let pagosMap = {};
        if (pagoIds.length > 0) {
          const { data: pagosRef } = await supabase
            .from('pagos_contrato')
            .select('id, referencia')
            .in('id', pagoIds);
          if (pagosRef) pagosMap = pagosRef.reduce((acc, p) => { acc[p.id] = p.referencia; return acc; }, {});
        }

        const listIngresos = (ingData || []).map(ing => ({
          ...ing,
          metodo_pago: pagosMap[ing.pago_contrato_id] || (ing.es_manual ? 'Otro' : null),
        }));

        // Egresos de contado del día
        const { data: egData, error: errE } = await supabase
          .from('egresos')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .eq('modalidad', 'contado')
          .gte('fecha_egreso', hoyISO)
          .lte('fecha_egreso', hoyISO);
        if (errE && errE.code !== '42P01') throw errE;

        // Abonos a crédito pagados hoy
        const { data: abonosData, error: errA } = await supabase
          .from('pagos_egreso')
          .select('*, egresos(categoria)')
          .eq('tenant_id', profile.tenant_id)
          .gte('fecha_pago', hoyISO)
          .lte('fecha_pago', hoyISO);
        if (errA && errA.code !== '42P01') throw errA;

        const listEgresos = [
          ...(egData || []),
          ...(abonosData || []).map(ab => ({
            ...ab,
            monto_total: ab.monto,
            categoria: ab.egresos?.categoria || 'otros',
          })),
        ];

        setIngresosHoy(listIngresos);
        setEgresosHoy(listEgresos);
      }
    } catch (e) {
      toast.error('Error cargando operaciones de caja');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && profile?.tenant_id) fetchData();
    else if (!authLoading && !profile?.tenant_id) setLoading(false);
  }, [authLoading, profile?.tenant_id]);

  // ─── Cálculos del día ──────────────────────────────────────────────────────
  const totalIn  = ingresosHoy.reduce((acc, i) => acc + (parseFloat(i.monto) || parseFloat(i.monto_recibido) || 0), 0);
  const totalOut = egresosHoy.reduce((acc, i) => acc + (parseFloat(i.monto_total) || 0), 0);
  const balanceDia = totalIn - totalOut;

  const ingresosPorMetodo = METODOS_PAGO.reduce((acc, met) => {
    acc[met] = ingresosHoy.filter(i => i.metodo_pago === met).reduce((sum, i) => sum + (parseFloat(i.monto) || 0), 0);
    return acc;
  }, {});
  const ingresosSinMetodo = ingresosHoy
    .filter(i => !i.metodo_pago || !METODOS_PAGO.includes(i.metodo_pago))
    .reduce((sum, i) => sum + (parseFloat(i.monto) || 0), 0);

  const egresosPorCat = CATEGORIAS_EGRESO.reduce((acc, catItem) => {
    acc[catItem.value] = egresosHoy.filter(i => i.categoria === catItem.value).reduce((sum, i) => sum + (parseFloat(i.monto_total) || 0), 0);
    return acc;
  }, {});

  // ─── Cerrar caja ───────────────────────────────────────────────────────────
  const ejecutarCierreDiario = async () => {
    const montoFisicoNum  = parseFloat(montoFisico) || 0;
    const diferencia      = montoFisicoNum - balanceDia;
    const nuevoSaldoAcumulado = saldoAnterior + balanceDia;

    const resumenCuadre =
      diferencia === 0 ? '✓ El dinero cuadra perfectamente' :
      diferencia > 0   ? `⚠ Hay un sobrante de $${diferencia.toFixed(2)}` :
                         `✗ Hay un faltante de $${Math.abs(diferencia).toFixed(2)}`;

    if (!confirm(`¿Confirmas el cierre de caja del día de hoy?\n\nResultado del conteo: ${resumenCuadre}\n\nUna vez cerrado, no podrás modificar los movimientos de hoy.`)) return;

    setEsCerrando(true);
    try {
      const payload = {
        tenant_id:                profile.tenant_id,
        fecha_cierre:             new Date().toISOString().split('T')[0],
        total_ingresos:           totalIn,
        total_egresos:            totalOut,
        monto_efectivo:           ingresosPorMetodo['Efectivo'] || 0,
        monto_transferencia:      ingresosPorMetodo['Transferencia Bancaria'] || 0,
        monto_otros:              totalIn - (ingresosPorMetodo['Efectivo'] || 0) - (ingresosPorMetodo['Transferencia Bancaria'] || 0),
        monto_fisico_contado:     montoFisicoNum,
        diferencia:               diferencia,
        saldo_acumulado:          nuevoSaldoAcumulado,
        notas:                    notasCierre.trim() || null,
        cerrado_por:              profile.id,
        nombre_cerrador_snapshot: profile.nombre_completo || 'Usuario',
      };

      const { error } = await supabase.from('cierres_caja').insert([payload]);
      if (error) throw error;

      toast.success('Cierre de caja registrado correctamente');
      setCierreHoyRegistrado(true);
      setIngresosHoy([]);
      setEgresosHoy([]);
      setMontoFisico('');
      setNotasCierre('');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Error al registrar el cierre de caja');
    } finally {
      setEsCerrando(false);
    }
  };

  // ─── Cargar datos de un día anterior para cierre retroactivo ──────────────
  const cargarDatosDiaRetro = async (fechaStr) => {
    if (!fechaStr || !profile?.tenant_id) return;
    setRetroLoading(true);
    try {
      const startISO = new Date(fechaStr + 'T00:00:00').toISOString();
      const endISO   = new Date(fechaStr + 'T23:59:59').toISOString();

      const [ingRes, egRes, abonosRes] = await Promise.all([
        supabase.from('ingresos')
          .select('monto')
          .eq('tenant_id', profile.tenant_id)
          .gte('registrado_en', startISO)
          .lte('registrado_en', endISO),
        supabase.from('egresos')
          .select('monto_total')
          .eq('tenant_id', profile.tenant_id)
          .eq('modalidad', 'contado')
          .gte('fecha_egreso', fechaStr)
          .lte('fecha_egreso', fechaStr),
        supabase.from('pagos_egreso')
          .select('monto')
          .eq('tenant_id', profile.tenant_id)
          .gte('fecha_pago', fechaStr)
          .lte('fecha_pago', fechaStr),
      ]);

      const totalIn  = (ingRes.data || []).reduce((s, i) => s + (parseFloat(i.monto) || 0), 0);
      const totalOut = [
        ...(egRes.data || []).map(e => parseFloat(e.monto_total) || 0),
        ...(abonosRes.data || []).map(a => parseFloat(a.monto) || 0),
      ].reduce((s, v) => s + v, 0);

      setRetroData({ totalIn, totalOut });
      setMontoFisicoRetro('');
      setNotasRetro('');
    } catch {
      toast.error('Error cargando datos del día sin cerrar');
    } finally {
      setRetroLoading(false);
    }
  };

  // Se ejecuta cada vez que cambia la fecha retroactiva seleccionada
  useEffect(() => {
    if (retroFecha && profile?.tenant_id) cargarDatosDiaRetro(retroFecha);
  }, [retroFecha, profile?.tenant_id]);

  // ─── Ejecutar cierre retroactivo ───────────────────────────────────────────
  const ejecutarCierreRetroactivo = async () => {
    if (!retroFecha) return;
    const montoNum   = parseFloat(montoFisicoRetro) || 0;
    const balance    = retroData.totalIn - retroData.totalOut;
    const diferencia = montoNum - balance;

    // Calcular saldo acumulado: buscar el cierre más reciente anterior a retroFecha
    const cierresOrdenados = [...cierres].sort((a, b) => a.fecha_cierre.localeCompare(b.fecha_cierre));
    const prevCierre = cierresOrdenados.filter(c => c.fecha_cierre < retroFecha).pop();
    const saldoPrevio = prevCierre?.saldo_acumulado || 0;
    const nuevoSaldo  = saldoPrevio + balance;

    const fechaLabel = formatFechaCorta(retroFecha);
    if (!confirm(`¿Confirmas el cierre retroactivo del ${fechaLabel}?\n\nEste registro quedará guardado con la fecha correcta en el historial.`)) return;

    setGuardandoRetro(true);
    try {
      const payload = {
        tenant_id:                profile.tenant_id,
        fecha_cierre:             retroFecha,
        total_ingresos:           retroData.totalIn,
        total_egresos:            retroData.totalOut,
        monto_efectivo:           0,
        monto_transferencia:      0,
        monto_otros:              retroData.totalIn,
        monto_fisico_contado:     montoNum,
        diferencia:               diferencia,
        saldo_acumulado:          nuevoSaldo,
        notas:                    (notasRetro.trim() || null) ?? 'Cierre retroactivo — registrado al día siguiente',
        cerrado_por:              profile.id,
        nombre_cerrador_snapshot: profile.nombre_completo || 'Usuario',
      };

      const { error } = await supabase.from('cierres_caja').insert([payload]);
      if (error) throw error;

      toast.success(`Cierre del ${fechaLabel} registrado correctamente`);
      // fetchData() re-detecta días pendientes y actualiza retroFecha al siguiente
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Error al registrar el cierre retroactivo');
    } finally {
      setGuardandoRetro(false);
    }
  };

  // ─── Filtrado del historial ────────────────────────────────────────────────
  const inicioSemana = getInicioSemana();

  const filtrarCierres = (c) => {
    const fechaStr = c.fecha_cierre; // "YYYY-MM-DD"
    if (!fechaStr) return false;
    const fechaCierre = new Date(fechaStr + 'T00:00:00');

    // Rango manual
    if (filterFechaInicio) {
      const desde = new Date(filterFechaInicio + 'T00:00:00');
      if (fechaCierre < desde) return false;
    }
    if (filterFechaFin) {
      const hasta = new Date(filterFechaFin + 'T23:59:59');
      if (fechaCierre > hasta) return false;
    }

    // Filtro rápido
    const hoy = new Date();
    if (filtroRapido === 'hoy') {
      return fechaStr === getLocalDayBoundaries().localDate;
    }
    if (filtroRapido === 'semana') {
      return fechaCierre >= inicioSemana;
    }
    if (filtroRapido === 'mes') {
      return fechaCierre.getMonth() === hoy.getMonth() && fechaCierre.getFullYear() === hoy.getFullYear();
    }
    if (filtroRapido === 'anio') {
      return fechaCierre.getFullYear() === hoy.getFullYear();
    }
    return true; // 'todo'
  };

  const limpiarFiltros = () => {
    setFiltroRapido('todo');
    setFilterFechaInicio('');
    setFilterFechaFin('');
  };

  const historialListado = cierres.filter(filtrarCierres);

  // Totales del rango filtrado — usa balance_neto (columna generada) o calcula
  const hTotIn  = historialListado.reduce((sum, c) => sum + (parseFloat(c.total_ingresos) || 0), 0);
  const hTotOut = historialListado.reduce((sum, c) => sum + (parseFloat(c.total_egresos) || 0), 0);
  const hBalance = hTotIn - hTotOut;

  // ─── Formato fecha/hora del reloj ─────────────────────────────────────────
  const fmtFechaLarga = (d) => d.toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const fmtHora = (d) => d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // ─── Datos derivados del cierre retroactivo ────────────────────────────────
  const retroBalance   = retroData.totalIn - retroData.totalOut;
  const retroMontoNum  = parseFloat(montoFisicoRetro) || 0;
  const retroDiferencia = retroMontoNum - retroBalance;

  return (
    <div className="animate-in fade-in duration-500 pb-20">

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BANNER ALERTA — DÍAS SIN CERRAR                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {diasSinCerrar.length > 0 && (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/8 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-in slide-in-from-top-2">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
            <TriangleAlert className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-red-400 uppercase tracking-wide">
              {diasSinCerrar.length === 1
                ? '¡Caja sin cerrar del día anterior!'
                : `¡${diasSinCerrar.length} días sin cerrar!`}
            </p>
            <p className="text-xs font-bold text-[var(--text-muted)] mt-0.5">
              {diasSinCerrar.length === 1
                ? `El ${formatFechaCorta(diasSinCerrar[0])} no fue cerrado. Debes registrar ese cierre antes de continuar con la caja de hoy.`
                : `Hay ${diasSinCerrar.length} días sin cierre. Ciérralos en orden, del más antiguo al más reciente, antes de cerrar la caja de hoy.`}
            </p>
          </div>
          <button
            onClick={() => setTab('dia')}
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
          >
            <History className="w-3.5 h-3.5" /> Resolver ahora
          </button>
        </div>
      )}

      <ModuleNavbar currentTab={currentTab} setTab={setTab} />

      {/* ═══════════════════════════════════════════ */}
      {/* VISTA DEL DÍA                              */}
      {/* ═══════════════════════════════════════════ */}
      {currentTab === 'dia' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">

          {/* ─── SECCIÓN CIERRE RETROACTIVO ────────────────────────── */}
          {diasSinCerrar.length > 0 && retroFecha && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 overflow-hidden">

              {/* Cabecera */}
              <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                    <History className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Cierre pendiente del día anterior</p>
                    <p className="text-sm font-black text-[var(--text-primary)] capitalize mt-0.5">
                      {formatFechaCorta(retroFecha)}
                    </p>
                  </div>
                </div>
                {/* Indicador de cuántos días quedan */}
                {diasSinCerrar.length > 1 && (
                  <div className="flex items-center gap-2">
                    {diasSinCerrar.map((d, i) => (
                      <button
                        key={d}
                        onClick={() => setRetroFecha(d)}
                        title={formatFechaCorta(d)}
                        className={`w-7 h-7 rounded-lg text-[9px] font-black border transition-all ${
                          d === retroFecha
                            ? 'bg-red-500 border-red-600 text-white shadow-sm shadow-red-500/40'
                            : 'bg-[var(--bg-surface-2)] border-[var(--border-soft)] text-[var(--text-muted)] hover:border-red-500/40 hover:text-red-500'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <span className="text-[10px] font-bold text-[var(--text-muted)] ml-1">pendientes</span>
                  </div>
                )}
              </div>

              {/* Resumen del día */}
              <div className="p-6 space-y-5">
                {retroLoading ? (
                  <div className="flex items-center justify-center py-8 gap-3 text-[var(--text-muted)]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-xs font-bold">Cargando movimientos de ese día…</span>
                  </div>
                ) : (
                  <>
                    {/* 3 tarjetas: ingresos / egresos / balance */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                        <p className="text-[9px] font-black uppercase tracking-widest text-green-400 mb-1">Entradas</p>
                        <p className="text-xl font-mono font-black text-[var(--text-primary)]">${retroData.totalIn.toFixed(2)}</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                        <p className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-1">Gastos</p>
                        <p className="text-xl font-mono font-black text-[var(--text-primary)]">-${retroData.totalOut.toFixed(2)}</p>
                      </div>
                      <div className={`text-center p-4 rounded-xl border ${retroBalance >= 0 ? 'bg-primary/10 border-primary/20' : 'bg-red-500/10 border-red-500/20'}`}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Balance</p>
                        <p className={`text-xl font-mono font-black ${retroBalance >= 0 ? 'text-primary' : 'text-red-400'}`}>
                          ${retroBalance.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Conteo físico */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wide block">
                        ¿Cuánto había físicamente en caja ese día? <span className="text-[var(--text-muted)] font-normal normal-case">(opcional)</span>
                      </label>
                      <div className="relative max-w-xs">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-xl">$</span>
                        <input
                          type="number"
                          step="0.01"
                          className="input-guambra !h-14 !w-full !pl-10 !text-2xl font-mono font-black !border-red-500/30"
                          placeholder="0.00"
                          value={montoFisicoRetro}
                          onChange={e => setMontoFisicoRetro(e.target.value)}
                        />
                      </div>
                      {montoFisicoRetro && (
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest animate-in zoom-in-95 ${
                          retroDiferencia === 0
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : retroDiferencia > 0
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {retroDiferencia === 0
                            ? <><CheckCircle2 className="w-3 h-3"/> Todo cuadra</>
                            : retroDiferencia > 0
                              ? <><AlertCircle className="w-3 h-3"/> Sobran ${retroDiferencia.toFixed(2)}</>
                              : <><AlertCircle className="w-3 h-3"/> Faltan ${Math.abs(retroDiferencia).toFixed(2)}</>
                          }
                        </div>
                      )}
                    </div>

                    {/* Notas */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wide block">
                        Nota del cierre retroactivo <span className="text-[var(--text-muted)] font-normal normal-case">(opcional)</span>
                      </label>
                      <textarea
                        className="input-guambra w-full resize-none !border-red-500/20"
                        rows={2}
                        placeholder="Ej: Se olvidó cerrar caja, todo en orden…"
                        value={notasRetro}
                        onChange={e => setNotasRetro(e.target.value)}
                      />
                    </div>

                    {/* Botón guardar */}
                    <div className="flex justify-end pt-2 border-t border-red-500/15">
                      <button
                        onClick={ejecutarCierreRetroactivo}
                        disabled={guardandoRetro}
                        className="flex items-center gap-2 px-8 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                      >
                        {guardandoRetro ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                        Registrar cierre del {new Date(retroFecha + 'T00:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Bloqueador: mientras haya días sin cerrar, ocultar el cierre de hoy */}
          {diasSinCerrar.length > 0 && (
            <div className="glass-card p-8 text-center border border-[var(--border-soft)] opacity-60 pointer-events-none select-none">
              <Lock className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
                Cierra primero los días pendientes para poder registrar la caja de hoy
              </p>
            </div>
          )}

          {/* ─── CONTENIDO NORMAL DEL DÍA (solo visible si no hay días pendientes) ─── */}
          {diasSinCerrar.length === 0 && (
          <>
          {/* Fecha y hora actual */}
          <div className="glass-card px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border border-[var(--border-soft)]">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Fecha y hora actual</p>
                <p className="font-black text-[var(--text-primary)] text-sm capitalize">{fmtFechaLarga(ahora)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Hora del cierre</p>
              <p className="font-mono font-black text-2xl text-primary tracking-widest">{fmtHora(ahora)}</p>
            </div>
          </div>

          {cierreHoyRegistrado ? (
            <div className="glass-card bg-red-500/5 flex flex-col justify-center items-center p-16 border border-red-500/20 text-center animate-in zoom-in-95">
              <div className="w-20 h-20 rounded-3xl bg-red-500/20 text-red-400 flex items-center justify-center mb-6 border border-red-500/30">
                <Lock className="w-10 h-10"/>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-widest text-[var(--text-primary)] mb-2">La caja de hoy ya fue cerrada</h2>
              <p className="text-sm font-bold text-[var(--text-muted)] max-w-lg mb-8">
                El cierre de caja del día de hoy ya fue registrado. Puedes ir al historial para revisarlo.
              </p>
              <button onClick={() => setTab('historial')} className="btn-guambra-primary bg-red-500/20 border-none text-red-400 hover:bg-red-500/30">
                Ver Historial de Cierres
              </button>
            </div>
          ) : (
            <>
              {/* RESUMEN DEL DÍA */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 border-b-4 border-b-green-500/50 hover:-translate-y-1 transition-transform cursor-default relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-green-500/20 transition-all"/>
                  <div className="flex items-center gap-2 text-green-400 mb-4 relative z-10">
                    <TrendingUp className="w-5 h-5"/>
                    <span className="text-[10px] font-black tracking-widest uppercase">Total Entradas de Hoy</span>
                  </div>
                  <h3 className="text-4xl font-mono font-black text-[var(--text-primary)] relative z-10">${totalIn.toFixed(2)}</h3>
                </div>
                <div className="glass-card p-6 border-b-4 border-b-orange-500/50 hover:-translate-y-1 transition-transform cursor-default relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-orange-500/20 transition-all"/>
                  <div className="flex items-center gap-2 text-orange-400 mb-4 relative z-10">
                    <TrendingDown className="w-5 h-5"/>
                    <span className="text-[10px] font-black tracking-widest uppercase">Total Gastos de Hoy</span>
                  </div>
                  <h3 className="text-4xl font-mono font-black text-[var(--text-primary)] relative z-10">-${totalOut.toFixed(2)}</h3>
                </div>
                <div className="glass-card p-6 border-b-4 border-b-primary hover:-translate-y-1 transition-transform cursor-default relative overflow-hidden group bg-primary/5">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 transition-all"/>
                  <div className="flex items-center gap-2 text-primary mb-4 relative z-10">
                    <DollarSign className="w-5 h-5"/>
                    <span className="text-[10px] font-black tracking-widest uppercase">Lo que queda en Caja</span>
                  </div>
                  <h3 className="text-4xl font-mono font-black text-[var(--text-primary)] relative z-10">${balanceDia.toFixed(2)}</h3>
                </div>
              </div>

              {/* DESGLOSE */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-0 overflow-hidden">
                  <h4 className="text-[10px] font-black uppercase tracking-widest p-6 border-b border-[var(--border-soft)] text-[var(--text-muted)] flex justify-between">
                    <span>Entradas por Forma de Pago</span>
                    <span className="text-green-400 font-mono">${totalIn.toFixed(2)}</span>
                  </h4>
                  <div className="divide-y divide-[var(--border-soft)] bg-[var(--bg-input)]">
                    {METODOS_PAGO.map(met => ingresosPorMetodo[met] > 0 && (
                      <div key={met} className="flex justify-between items-center p-4 text-sm hover:bg-[var(--bg-surface-2)] transition-colors">
                        <span className="font-bold text-[var(--text-secondary)]">{met}</span>
                        <span className="font-black font-mono text-green-400">${ingresosPorMetodo[met].toFixed(2)}</span>
                      </div>
                    ))}
                    {ingresosSinMetodo > 0 && (
                      <div className="flex justify-between items-center p-4 text-sm hover:bg-[var(--bg-surface-2)] transition-colors">
                        <span className="font-bold text-[var(--text-muted)]">Sin método / Manual</span>
                        <span className="font-black font-mono text-green-400">${ingresosSinMetodo.toFixed(2)}</span>
                      </div>
                    )}
                    {totalIn === 0 && <div className="p-10 text-center text-xs text-[var(--text-muted)] uppercase tracking-widest font-black">Sin ingresos registrados hoy.</div>}
                  </div>
                </div>

                <div className="glass-card p-0 overflow-hidden">
                  <h4 className="text-[10px] font-black uppercase tracking-widest p-6 border-b border-[var(--border-soft)] text-[var(--text-muted)] flex justify-between">
                    <span>Gastos por Categoría</span>
                    <span className="text-orange-400 font-mono">{egresosHoy.length} movimientos</span>
                  </h4>
                  <div className="divide-y divide-[var(--border-soft)] bg-[var(--bg-input)]">
                    {CATEGORIAS_EGRESO.map(catItem => egresosPorCat[catItem.value] > 0 && (
                      <div key={catItem.value} className="flex justify-between items-center p-4 text-sm hover:bg-[var(--bg-surface-2)] transition-colors">
                        <span className="font-bold text-[var(--text-secondary)]">{catItem.label}</span>
                        <span className="font-black font-mono text-orange-400">-${egresosPorCat[catItem.value].toFixed(2)}</span>
                      </div>
                    ))}
                    {totalOut === 0 && <div className="p-10 text-center text-xs text-[var(--text-muted)] uppercase tracking-widest font-black">Sin gastos registrados hoy.</div>}
                  </div>
                </div>
              </div>

              {/* SECCIÓN CIERRE */}
              <div className="glass-card p-8 border-t-2 border-primary/20 bg-primary/5 space-y-6">
                <h4 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Lock className="w-4 h-4"/> Cerrar la Caja del Día
                </h4>

                {/* Conteo físico */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wide">¿Cuánto dinero hay físicamente en caja?</p>
                    <p className="text-xs font-bold text-[var(--text-muted)]">Cuenta los billetes y monedas que tienes en la gaveta y escribe el total aquí para verificar que coincide con el sistema.</p>
                  </div>
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-xl">$</span>
                      <input
                        type="number"
                        step="0.01"
                        className="input-guambra !h-16 !w-64 !pl-10 !bg-[var(--bg-surface-2)] !border-primary/30 !text-3xl font-mono font-black text-[var(--text-primary)]"
                        placeholder="0.00"
                        value={montoFisico}
                        onChange={e => setMontoFisico(e.target.value)}
                      />
                    </div>
                    {montoFisico && (
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest animate-in zoom-in-95 ${
                        (parseFloat(montoFisico) - balanceDia) === 0
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : (parseFloat(montoFisico) - balanceDia) > 0
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {(parseFloat(montoFisico) - balanceDia) === 0
                          ? <><CheckCircle2 className="w-3 h-3"/> Perfecto, todo cuadra</>
                          : (parseFloat(montoFisico) - balanceDia) > 0
                            ? <><AlertCircle className="w-3 h-3"/> Sobran ${(parseFloat(montoFisico) - balanceDia).toFixed(2)}</>
                            : <><AlertCircle className="w-3 h-3"/> Faltan ${Math.abs(parseFloat(montoFisico) - balanceDia).toFixed(2)}</>
                        }
                      </div>
                    )}
                  </div>
                </div>

                {/* Observaciones */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wide block">
                    Observaciones del Cierre <span className="text-[var(--text-muted)] font-normal normal-case">(opcional)</span>
                  </label>
                  <textarea
                    className="input-guambra w-full resize-none"
                    rows={3}
                    placeholder="Escribe aquí cualquier nota, irregularidad o comentario sobre el cierre de hoy..."
                    value={notasCierre}
                    onChange={e => setNotasCierre(e.target.value)}
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-[var(--border-soft)]">
                  <button
                    onClick={ejecutarCierreDiario}
                    disabled={esCerrando || !montoFisico}
                    className={`btn-guambra-primary !px-12 !h-16 text-base shadow-xl flex items-center gap-3 w-full md:w-auto transition-all ${
                      !montoFisico ? 'opacity-50 cursor-not-allowed !bg-[var(--bg-surface-2)] !text-[var(--text-muted)]' : 'shimmer shadow-primary/20'
                    }`}
                  >
                    {esCerrando ? <Loader2 className="w-5 h-5 animate-spin"/> : <Lock className="w-5 h-5"/>}
                    Registrar Cierre de Caja
                  </button>
                </div>
              </div>
            </>
          )}
          {/* Fin bloque condicional diasSinCerrar === 0 */}
          </>
          )}
        </div>
      )}


      {/* ═══════════════════════════════════════════ */}
      {/* HISTORIAL DE CIERRES                       */}
      {/* ═══════════════════════════════════════════ */}
      {currentTab === 'historial' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">

          {/* Filtros */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex flex-col lg:flex-row gap-3 items-center">

              {/* Botones de período rápido */}
              <div className="flex bg-[var(--bg-input)] border border-[var(--border-soft)] p-1.5 rounded-xl min-w-max">
                {[
                  { key: 'todo',   label: 'Todo' },
                  { key: 'hoy',    label: 'Hoy' },
                  { key: 'semana', label: 'Esta semana' },
                  { key: 'mes',    label: 'Este mes' },
                  { key: 'anio',   label: 'Este año' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFiltroRapido(key)}
                    className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${filtroRapido === key ? 'bg-primary/20 text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Rango de fechas */}
              <div className="flex flex-1 gap-2 bg-[var(--bg-input)] border border-[var(--border-soft)] rounded-xl p-1 h-11 w-full items-center">
                <Calendar className="w-4 h-4 text-[var(--text-muted)] ml-3 shrink-0"/>
                <input
                  type="date"
                  className="bg-transparent border-0 text-[var(--text-primary)] text-xs font-bold w-full focus:outline-none pl-1"
                  value={filterFechaInicio}
                  onChange={e => { setFilterFechaInicio(e.target.value); setFiltroRapido('todo'); }}
                  title="Desde"
                />
                <span className="text-[var(--text-muted)] shrink-0">—</span>
                <input
                  type="date"
                  className="bg-transparent border-0 text-[var(--text-primary)] text-xs font-bold w-full focus:outline-none pl-1"
                  value={filterFechaFin}
                  onChange={e => { setFilterFechaFin(e.target.value); setFiltroRapido('todo'); }}
                  title="Hasta"
                />
              </div>

              {/* Limpiar filtros */}
              {(filtroRapido !== 'todo' || filterFechaInicio || filterFechaFin) && (
                <button
                  onClick={limpiarFiltros}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 border border-[var(--border-soft)] transition-all shrink-0"
                >
                  <X className="w-3 h-3"/> Limpiar
                </button>
              )}
            </div>

            {/* Resultado del filtro */}
            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest pl-1">
              Mostrando <span className="text-[var(--text-primary)]">{historialListado.length}</span> {historialListado.length === 1 ? 'cierre' : 'cierres'}
              {filtroRapido !== 'todo' || filterFechaInicio || filterFechaFin ? ' en el período seleccionado' : ' en total'}
            </p>
          </div>

          {/* Totales del rango */}
          <div className="grid grid-cols-3 gap-2 md:gap-6 bg-[var(--bg-input)] p-4 border border-[var(--border-soft)] rounded-2xl">
            <div className="text-center md:text-left md:pl-6 border-r border-[var(--border-soft)]">
              <span className="text-[8px] md:text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest block mb-1">Total Entradas</span>
              <span className="text-sm md:text-xl font-mono font-black text-green-400">${hTotIn.toFixed(2)}</span>
            </div>
            <div className="text-center md:text-left md:pl-6 border-r border-[var(--border-soft)]">
              <span className="text-[8px] md:text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest block mb-1">Total Gastos</span>
              <span className="text-sm md:text-xl font-mono font-black text-orange-400">-${hTotOut.toFixed(2)}</span>
            </div>
            <div className="text-center md:text-left md:pl-6">
              <span className="text-[8px] md:text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest block mb-1">Ganancia del Período</span>
              <span className={`text-sm md:text-2xl font-mono font-black ${hBalance >= 0 ? 'text-[var(--text-primary)]' : 'text-red-400'}`}>
                ${hBalance.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Tabla */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)]">
                  <tr>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] w-1/4">Fecha del Cierre</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Lo que dice el sistema</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Lo que se contó</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Diferencia</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Saldo Acumulado</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {loading ? (
                    <tr><td colSpan="6" className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary"/></td></tr>
                  ) : historialListado.length === 0 ? (
                    <tr><td colSpan="6" className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                      No hay cierres en este período
                    </td></tr>
                  ) : historialListado.map(c => (
                    <tr key={c.id} className="hover:bg-[var(--bg-surface-2)] transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-[var(--text-primary)] text-sm">
                          {new Date(c.fecha_cierre + 'T00:00:00').toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-tighter">
                          Registrado por: {c.registrado_por_nombre}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-mono font-black text-[var(--text-primary)]">
                          ${(parseFloat(c.total_ingresos) - parseFloat(c.total_egresos)).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-mono font-black text-primary">${parseFloat(c.monto_fisico_contado || 0).toFixed(2)}</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                          (c.diferencia || 0) === 0
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : (c.diferencia || 0) > 0
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {(c.diferencia || 0) === 0
                            ? <><CheckCircle2 className="w-3 h-3"/> Cuadrado</>
                            : (c.diferencia || 0) > 0
                              ? <><AlertCircle className="w-3 h-3"/> Sobrante (${Math.abs(c.diferencia).toFixed(2)})</>
                              : <><AlertCircle className="w-3 h-3"/> Faltante (${Math.abs(c.diferencia).toFixed(2)})</>
                          }
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-mono font-black text-[var(--text-secondary)]">${parseFloat(c.saldo_acumulado || 0).toFixed(2)}</span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => { setCierreActivo(c); setTab('ver'); }}
                          className="p-2 bg-[var(--bg-surface-2)] hover:bg-primary/10 text-[var(--text-muted)] hover:text-primary rounded-xl transition-all border border-[var(--border-soft)] hover:border-primary/50"
                        >
                          <Eye className="w-4 h-4"/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* ═══════════════════════════════════════════ */}
      {/* DETALLE DE UN CIERRE                       */}
      {/* ═══════════════════════════════════════════ */}
      {currentTab === 'ver' && cierreActivo && (
        <div className="animate-in slide-in-from-right-4 max-w-4xl mx-auto space-y-8">

          <button onClick={() => setTab('historial')} className="btn-guambra-secondary self-start mb-2 !px-6 !py-2 !h-auto text-[10px] border-none">
            ← Volver al Historial
          </button>

          <div className="glass-card p-0 overflow-hidden relative">
            {/* Autor */}
            <div className="absolute top-0 right-0 bg-primary/20 text-primary border-l border-b border-primary/30 px-6 py-2 rounded-bl-3xl z-20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4"/>
              <span className="text-[9px] uppercase font-black tracking-[0.2em]">Registrado por: {cierreActivo.registrado_por_nombre}</span>
            </div>

            {/* Cabecera */}
            <div className="bg-[var(--bg-surface-3)] border-b border-[var(--border-soft)] p-10 flex flex-col items-center justify-center text-center relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"/>
              <Lock className="w-12 h-12 text-primary opacity-50 mb-4"/>
              <h2 className="text-[10px] uppercase tracking-[0.4em] text-[var(--text-secondary)] mb-2 font-black">Resumen del Cierre de Caja</h2>
              <h3 className="text-3xl font-black text-[var(--text-primary)]">
                {new Date(cierreActivo.fecha_cierre + 'T00:00:00').toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>
              <p className="text-xs font-mono font-black tracking-widest text-primary/40 mt-3 pt-3 border-t border-[var(--border-soft)] w-fit">
                ID: {cierreActivo.id}
              </p>
            </div>

            <div className="p-10 bg-[var(--bg-input)]">
              {/* 4 tarjetas de resumen */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                <div className="border border-[var(--border-soft)] bg-[var(--bg-card)] rounded-2xl p-6 text-center shadow-lg">
                  <span className="text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)] mb-1 block">Lo que decía el sistema</span>
                  <span className="text-2xl font-mono font-black text-[var(--text-primary)]">
                    ${(parseFloat(cierreActivo.total_ingresos) - parseFloat(cierreActivo.total_egresos)).toFixed(2)}
                  </span>
                </div>
                <div className="border border-primary/30 bg-primary/10 rounded-2xl p-6 text-center shadow-lg shadow-primary/10">
                  <span className="text-[10px] uppercase tracking-widest font-black text-primary mb-1 block">Lo que se contó en físico</span>
                  <span className="text-2xl font-mono font-black text-[var(--text-primary)]">
                    ${parseFloat(cierreActivo.monto_fisico_contado || 0).toFixed(2)}
                  </span>
                </div>
                <div className={`border rounded-2xl p-6 text-center shadow-lg ${(cierreActivo.diferencia || 0) === 0 ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                  <span className={`text-[10px] uppercase tracking-widest font-black mb-1 block ${(cierreActivo.diferencia || 0) === 0 ? 'text-green-500' : 'text-red-500'}`}>
                    Diferencia encontrada
                  </span>
                  <span className={`text-2xl font-mono font-black ${(cierreActivo.diferencia || 0) >= 0 ? 'text-[var(--text-primary)]' : 'text-red-400'}`}>
                    ${parseFloat(cierreActivo.diferencia || 0).toFixed(2)}
                  </span>
                </div>
                <div className="border border-[var(--border-soft)] bg-[var(--bg-card)] rounded-2xl p-6 text-center shadow-lg">
                  <span className="text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)] mb-1 block">Saldo total acumulado</span>
                  <span className="text-2xl font-mono font-black text-[var(--text-secondary)]">
                    ${parseFloat(cierreActivo.saldo_acumulado || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Ingresos */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest pb-3 border-b border-[var(--border-soft)] text-green-400/80 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3"/> Detalle de Entradas
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-3 bg-[var(--bg-input)] rounded-lg border border-[var(--border-soft)] text-[var(--text-secondary)]">
                      <span className="font-bold">Total entradas del día</span>
                      <span className="font-mono font-black text-green-400">${parseFloat(cierreActivo.total_ingresos).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-[var(--bg-input)] rounded-lg border border-[var(--border-soft)]">
                      <span className="font-bold text-[var(--text-muted)]">En efectivo</span>
                      <span className="font-mono font-black text-[var(--text-primary)]">${parseFloat(cierreActivo.monto_efectivo || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-[var(--bg-input)] rounded-lg border border-[var(--border-soft)]">
                      <span className="font-bold text-[var(--text-muted)]">Por transferencia</span>
                      <span className="font-mono font-black text-[var(--text-primary)]">${parseFloat(cierreActivo.monto_transferencia || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-[var(--bg-input)] rounded-lg border border-[var(--border-soft)]">
                      <span className="font-bold text-[var(--text-muted)]">Otros medios de pago</span>
                      <span className="font-mono font-black text-[var(--text-primary)]">${parseFloat(cierreActivo.monto_otros || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Gastos y observaciones */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest pb-3 border-b border-[var(--border-soft)] text-orange-400/80 mb-4 flex items-center gap-2">
                    <TrendingDown className="w-3 h-3"/> Gastos y Observaciones
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between p-4 bg-red-400/5 rounded-xl border border-red-400/10 text-red-500">
                      <span className="text-xs font-bold uppercase">Total gastos del día</span>
                      <span className="font-mono font-black text-xl">-${parseFloat(cierreActivo.total_egresos).toFixed(2)}</span>
                    </div>
                    <div className="bg-[var(--bg-surface-2)] p-4 rounded-xl border border-[var(--border-soft)] space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border-soft)] pb-2 mb-2">
                        Observaciones del cierre
                      </p>
                      <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed">
                        {cierreActivo.notas || 'Sin observaciones registradas.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
