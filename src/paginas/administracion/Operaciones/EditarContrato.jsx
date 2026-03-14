import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'sonner';
import {
  Calendar, PackageSearch, CreditCard, ChevronLeft, ChevronRight,
  Plus, Minus, Trash2, Loader2, Search, Lock, Unlock, CheckCircle2,
  Edit2, AlertTriangle, XCircle, AlertCircle,
} from 'lucide-react';

const HORAS_DISPONIBLES = (() => {
  const h = [];
  for (let i = 6; i <= 23; i++) {
    h.push(`${String(i).padStart(2, '0')}:00`);
    if (i < 23) h.push(`${String(i).padStart(2, '0')}:30`);
  }
  return h;
})();

const parseFechaDate = (iso) => (iso ? iso.slice(0, 10) : '');
const parseFechaTime = (iso) => (iso ? iso.slice(11, 16) : '08:00');
const combinar = (date, time) => (date ? `${date}T${time || '08:00'}` : '');
const calcularDias = (sd, st, dd, dt) => {
  if (!sd || !dd) return 1;
  const s = new Date(`${sd}T${st || '08:00'}`);
  const d = new Date(`${dd}T${dt || '08:00'}`);
  if (isNaN(s) || isNaN(d)) return 1;
  return Math.max(1, Math.ceil((d - s) / 86400000));
};

export default function EditarContrato({ contrato, onVolver, onGuardado }) {
  const { profile } = useAuthStore();
  const [step, setStep] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [loadingItems, setLoadingItems] = useState(true);
  const searchRef = useRef(null);

  // Cerrar resultados al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target))
        setResultadosProd([]);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── PASO 1: FECHAS Y TIPO ───────────────────────────────────────────────────
  const [fechas, setFechas] = useState({
    tipo_entrega:          contrato.tipo_envio === 'envio' ? 'Envío' : 'Presencial',
    fecha_salida_date:     parseFechaDate(contrato.fecha_salida),
    fecha_salida_time:     parseFechaTime(contrato.fecha_salida),
    fecha_evento_date:     parseFechaDate(contrato.fecha_evento),
    fecha_evento_time:     parseFechaTime(contrato.fecha_evento),
    fecha_devolucion_date: parseFechaDate(contrato.fecha_devolucion),
    fecha_devolucion_time: parseFechaTime(contrato.fecha_devolucion),
  });
  const [devolucionBloqueada, setDevolucionBloqueada] = useState(true);
  const [diasAlquiler, setDiasAlquiler] = useState(contrato.dias_alquiler || 1);

  const fechaSalidaFull     = combinar(fechas.fecha_salida_date, fechas.fecha_salida_time);
  const fechaEventoFull     = combinar(fechas.fecha_evento_date, fechas.fecha_evento_time);
  const fechaDevolucionFull = combinar(fechas.fecha_devolucion_date, fechas.fecha_devolucion_time);

  const handleSalidaChange = (field, val) => {
    const nf = { ...fechas, [field]: val };
    if (nf.fecha_salida_date) {
      const salida = new Date(`${nf.fecha_salida_date}T${nf.fecha_salida_time}`);
      if (!isNaN(salida)) {
        if (devolucionBloqueada) {
          const dev = new Date(salida.getTime() + 86400000);
          nf.fecha_devolucion_date = dev.toISOString().slice(0, 10);
          nf.fecha_devolucion_time = `${String(dev.getHours()).padStart(2,'0')}:${String(dev.getMinutes()).padStart(2,'0')}`;
        }
        if (!nf.fecha_evento_date) {
          nf.fecha_evento_date = nf.fecha_salida_date;
          nf.fecha_evento_time = nf.fecha_salida_time;
        }
      }
    }
    setFechas(nf);
    setDiasAlquiler(calcularDias(nf.fecha_salida_date, nf.fecha_salida_time, nf.fecha_devolucion_date, nf.fecha_devolucion_time));
  };

  const handleDevChange = (field, val) => {
    const nf = { ...fechas, [field]: val };
    if (nf.fecha_salida_date && nf.fecha_devolucion_date) {
      const s = new Date(`${nf.fecha_salida_date}T${nf.fecha_salida_time}`);
      const d = new Date(`${nf.fecha_devolucion_date}T${nf.fecha_devolucion_time}`);
      if (d < s) { toast.error('La devolución no puede ser anterior a la salida.'); return; }
    }
    setFechas(nf);
    setDiasAlquiler(calcularDias(nf.fecha_salida_date, nf.fecha_salida_time, nf.fecha_devolucion_date, nf.fecha_devolucion_time));
  };

  // ── PASO 2: PRODUCTOS ───────────────────────────────────────────────────────
  const [productosCarrito, setProductosCarrito] = useState([]);
  const [busquedaProd, setBusquedaProd] = useState('');
  const [resultadosProd, setResultadosProd] = useState([]);
  const [buscandoProd, setBuscandoProd] = useState(false);
  const [cargandoPiezas, setCargandoPiezas] = useState(null);

  // Cargar productos existentes del contrato
  useEffect(() => {
    const load = async () => {
      setLoadingItems(true);
      try {
        const { data: items, error } = await supabase
          .from('items_contrato')
          .select('*, tallas:items_contrato_tallas(pieza_id, nombre_pieza_snapshot, etiqueta_talla, cantidad)')
          .eq('contrato_id', contrato.id)
          .order('created_at');
        if (error) throw error;

        const piezaIds = [...new Set((items || []).flatMap(i => (i.tallas || []).map(t => t.pieza_id).filter(Boolean)))];
        let stockMap = {};
        if (piezaIds.length > 0) {
          const { data: stocks } = await supabase
            .from('stock_piezas')
            .select('pieza_id, etiqueta_talla, stock_total')
            .in('pieza_id', piezaIds)
            .eq('tenant_id', profile.tenant_id);
          (stocks || []).forEach(s => {
            if (!stockMap[s.pieza_id]) stockMap[s.pieza_id] = [];
            stockMap[s.pieza_id].push({ talla: s.etiqueta_talla, stock: s.stock_total });
          });
        }

        const carrito = (items || []).map(item => {
          const piezaMap = {};
          (item.tallas || []).forEach(t => {
            if (!piezaMap[t.pieza_id]) {
              const tallasDisponibles = stockMap[t.pieza_id] || [];
              const tallasCantidades = {};
              tallasDisponibles.forEach(s => { tallasCantidades[s.talla] = 0; });
              piezaMap[t.pieza_id] = { id: t.pieza_id, nombre: t.nombre_pieza_snapshot, tallasDisponibles, tallasCantidades };
            }
            piezaMap[t.pieza_id].tallasCantidades[t.etiqueta_talla] = t.cantidad;
          });
          return {
            id: item.producto_id,
            nombre: item.nombre_item,
            precio_unitario: Number(item.precio_unitario),
            cantidad_total: Number(item.cantidad),
            fase: 'confirmado',
            piezas: Object.values(piezaMap),
          };
        });
        setProductosCarrito(carrito);
      } catch { toast.error('Error al cargar productos del contrato'); }
      finally { setLoadingItems(false); }
    };
    load();
  }, []);

  // ── Verificación de stock disponible (excluye el propio contrato) ──
  const verificarStockDisponible = async (prodId) => {
    if (!fechaSalidaFull || !fechaDevolucionFull) return;
    const prod = productosCarrito.find(p => p.id === prodId);
    if (!prod) return;
    const piezaIds = prod.piezas.map(pz => pz.id).filter(Boolean);
    if (piezaIds.length === 0) return;

    setProductosCarrito(prev => prev.map(p =>
      p.id === prodId ? { ...p, _stockVerificando: true } : p
    ));

    try {
      const { data, error } = await supabase.rpc('obtener_stock_disponible_batch', {
        p_tenant_id:           profile.tenant_id,
        p_pieza_ids:           piezaIds,
        p_fecha_salida:        fechaSalidaFull,
        p_fecha_dev:           fechaDevolucionFull,
        p_exclude_contrato_id: contrato.id, // excluye las reservas del propio contrato
      });
      if (error) throw error;

      const dispMap = {};
      (data || []).forEach(row => {
        if (!dispMap[row.pieza_id]) dispMap[row.pieza_id] = {};
        dispMap[row.pieza_id][row.etiqueta_talla] = row.disponible;
      });

      setProductosCarrito(prev => prev.map(p => {
        if (p.id !== prodId) return p;
        return {
          ...p,
          _stockVerificando: false,
          piezas: p.piezas.map(pz => ({
            ...pz,
            tallasDisponibles: pz.tallasDisponibles.map(t => ({
              ...t,
              stockDisponible: dispMap[pz.id]?.[t.talla] ?? t.stock,
            })),
          })),
        };
      }));
    } catch (e) {
      console.error('Error verificando stock:', e);
      setProductosCarrito(prev => prev.map(p =>
        p.id === prodId ? { ...p, _stockVerificando: false } : p
      ));
    }
  };

  const realizarBusqueda = async (q) => {
    setBusquedaProd(q);
    if (q.trim().length < 2) { setResultadosProd([]); return; }
    setBuscandoProd(true);
    try {
      const { data } = await supabase.from('productos')
        .select('id, nombre, precio_unitario')
        .eq('tenant_id', profile.tenant_id).eq('estado', 'activo').is('deleted_at', null)
        .ilike('nombre', `%${q.trim()}%`).limit(8);
      setResultadosProd(data || []);
    } finally { setBuscandoProd(false); }
  };

  const agregarProducto = async (prod) => {
    if (productosCarrito.find(p => p.id === prod.id)) return toast.info('El producto ya está en la lista');
    setCargandoPiezas(prod.id);
    setBusquedaProd(''); setResultadosProd([]);
    try {
      const { data: ppRows } = await supabase.from('piezas_producto')
        .select('pieza_id, pieza:pieza_id(id, nombre)')
        .eq('producto_id', prod.id).eq('tenant_id', profile.tenant_id).order('orden_visual');
      const piezaIds = (ppRows || []).map(r => r.pieza?.id).filter(Boolean);
      let stockMap = {};
      if (piezaIds.length > 0) {
        const { data: stocks } = await supabase.from('stock_piezas')
          .select('pieza_id, etiqueta_talla, stock_total')
          .in('pieza_id', piezaIds).eq('tenant_id', profile.tenant_id);
        (stocks || []).forEach(s => {
          if (!stockMap[s.pieza_id]) stockMap[s.pieza_id] = [];
          stockMap[s.pieza_id].push({ talla: s.etiqueta_talla, stock: s.stock_total });
        });
      }
      const piezas = (ppRows || []).map(row => {
        const pz = row.pieza; if (!pz) return null;
        const tallasDisponibles = stockMap[pz.id] || [];
        const tallasCantidades = {};
        tallasDisponibles.forEach(t => { tallasCantidades[t.talla] = 0; });
        return { id: pz.id, nombre: pz.nombre, tallasDisponibles, tallasCantidades };
      }).filter(Boolean);
      setProductosCarrito(prev => [...prev, { ...prod, cantidad_total: 1, fase: 'cantidad', piezas }]);
    } catch { toast.error(`Error al cargar piezas de "${prod.nombre}"`); }
    finally { setCargandoPiezas(null); }
  };

  const confirmarCantidad = (prodId) => {
    const prod = productosCarrito.find(p => p.id === prodId);
    if (!prod) return;
    if (!prod.cantidad_total || prod.cantidad_total < 1) return toast.error('Cantidad mínima: 1');
    setProductosCarrito(prev => prev.map(p => {
      if (p.id !== prodId) return p;
      return { ...p, fase: p.piezas.length === 0 ? 'confirmado' : 'tallas', _yaConfirmado: true };
    }));
    if (prod.piezas.length > 0) verificarStockDisponible(prodId);
  };

  const updateTalla = (prodId, piezaId, talla, valor) => {
    const v = Math.max(0, parseInt(valor, 10) || 0);
    setProductosCarrito(prev => prev.map(p => p.id !== prodId ? p : {
      ...p, piezas: p.piezas.map(pz => pz.id !== piezaId ? pz : {
        ...pz, tallasCantidades: { ...pz.tallasCantidades, [talla]: v }
      })
    }));
  };

  const totalAsignado = (pz) => Object.values(pz.tallasCantidades || {}).reduce((a, b) => a + b, 0);
  const piezasValidas = (prod) => prod.piezas.length === 0 || prod.piezas.every(pz => totalAsignado(pz) === prod.cantidad_total);

  const hayExcesoStock = (prod) =>
    prod.piezas.some(pz =>
      pz.tallasDisponibles.some(t => {
        const cant = pz.tallasCantidades[t.talla] ?? 0;
        const disp = t.stockDisponible ?? t.stock;
        return cant > disp && cant > 0;
      })
    );

  const confirmarTallas = (prodId) => setProductosCarrito(prev => prev.map(p => {
    if (p.id !== prodId) return p;
    if (!piezasValidas(p)) return (toast.error('La suma de tallas debe ser igual a la cantidad total.'), p);
    if (hayExcesoStock(p)) return (toast.error('Hay tallas con stock insuficiente. Reduce las cantidades en rojo.'), p);
    return { ...p, fase: 'confirmado' };
  }));

  const editarTallas = (prodId) => {
    setProductosCarrito(prev => prev.map(p => p.id === prodId ? { ...p, fase: 'tallas' } : p));
    verificarStockDisponible(prodId);
  };

  const quitarProducto = (prodId) => setProductosCarrito(prev => prev.filter(p => p.id !== prodId));
  const todosConfirmados = productosCarrito.length > 0 && productosCarrito.every(p => p.fase === 'confirmado');

  // ── PASO 3: FINANCIERO ──────────────────────────────────────────────────────
  const [descuento, setDescuento] = useState(Number(contrato.monto_descuento || 0));
  const [garantia, setGarantia] = useState({
    tipo: contrato.tipo_garantia === 'fisica' ? 'Física' : 'Económica',
    descripcion: contrato.descripcion_garantia || '',
  });
  const [notasInternas, setNotasInternas] = useState(contrato.notas_internas || '');

  const subtotalBase = useMemo(() =>
    productosCarrito.reduce((acc, p) => acc + (Number(p.precio_unitario) || 0) * (Number(p.cantidad_total) || 1), 0),
    [productosCarrito]
  );
  const total = Math.max(0, subtotalBase - descuento);
  const anticipoPagado = Number(contrato.anticipo_pagado || 0);
  const nuevoSaldo = Math.max(0, total - anticipoPagado);
  const anticipoExcedeTotal = anticipoPagado > total;

  // ── GUARDAR ─────────────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    if (guardando) return;
    if (!fechas.fecha_salida_date) return (toast.error('La fecha de salida es obligatoria.'), setStep(1));
    if (!fechas.fecha_devolucion_date) return (toast.error('La fecha de devolución es obligatoria.'), setStep(1));
    if (productosCarrito.length === 0) return (toast.error('Debe haber al menos un producto.'), setStep(2));
    if (!todosConfirmados) return (toast.error('Confirma todos los productos y sus tallas.'), setStep(2));

    const tipoGarantiaPayload = garantia.tipo === 'Física' ? 'fisica'
      : garantia.tipo === 'Económica' ? 'economica' : null;

    const payload = {
      contrato_id: contrato.id,
      tenant_id:   profile.tenant_id,
      editado_por: profile.id,
      contrato: {
        tipo_envio:           fechas.tipo_entrega === 'Envío' ? 'envio' : 'retiro',
        fecha_salida:         fechaSalidaFull,
        fecha_evento:         fechaEventoFull || null,
        fecha_devolucion:     fechaDevolucionFull,
        dias_alquiler:        diasAlquiler,
        precio_por_dia:       diasAlquiler > 1 ? (subtotalBase / diasAlquiler) : null,
        subtotal_alquiler:    diasAlquiler > 1 ? subtotalBase : null,
        subtotal:             subtotalBase,
        monto_descuento:      descuento,
        total,
        tipo_garantia:        tipoGarantiaPayload,
        descripcion_garantia: garantia.descripcion?.trim() || null,
        notas_internas:       notasInternas?.trim() || null,
      },
      productos: productosCarrito.map(prod => ({
        id:              prod.id,
        nombre:          prod.nombre,
        cantidad_total:  prod.cantidad_total,
        precio_unitario: Number(prod.precio_unitario),
        piezas: prod.piezas.map(pz => ({
          id: pz.id, nombre: pz.nombre,
          tallasCantidades: pz.tallasCantidades || {},
        })),
      })),
    };

    setGuardando(true);
    try {
      const { data, error } = await supabase.rpc('editar_contrato_completo', { payload });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Error al actualizar el contrato');
      toast.success('¡Contrato actualizado exitosamente!');
      onGuardado();
    } catch (e) {
      toast.error(e.message || 'Error inesperado al actualizar el contrato');
    } finally {
      setGuardando(false);
    }
  };

  const codigoContrato = contrato.codigo || `TX-${(contrato.id || '').substring(0, 8).toUpperCase()}`;

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row gap-8">

        {/* Sidebar de progreso */}
        <div className="lg:w-64 shrink-0">
          <div className="glass-card p-6 sticky top-24">
            <div className="mb-6 pb-4 border-b border-[var(--border-soft)]">
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)] mb-1">Editando</p>
              <p className="font-mono font-black text-[var(--color-primary)] text-base">{codigoContrato}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{contrato.clientes?.nombre_completo || '—'}</p>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] mb-4">Secciones</p>
            <nav className="space-y-2">
              {[
                { n: 1, title: 'Fechas y Tipo',       icon: Calendar },
                { n: 2, title: 'Productos y Tallas',   icon: PackageSearch },
                { n: 3, title: 'Financiero y Notas',   icon: CreditCard },
              ].map(({ n, title, icon: Icon }) => (
                <button key={n} onClick={() => setStep(n)}
                  className={`w-full flex items-center gap-3 text-left p-3 rounded-xl transition-all ${step === n ? 'bg-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/20 text-white' : 'hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)]'}`}
                >
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${step === n ? 'bg-white/20' : 'bg-[var(--bg-surface)] border border-[var(--border-soft)]'}`}>{n}</div>
                  <span className="text-xs font-bold leading-tight">{title}</span>
                </button>
              ))}
            </nav>
            {/* Indicador de anticipo excede total en sidebar */}
            {anticipoExcedeTotal && (
              <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[9px] text-amber-400 font-bold leading-tight">Anticipo excede el nuevo total</p>
              </div>
            )}
            <button onClick={onVolver} className="w-full mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" /> Volver
            </button>
          </div>
        </div>

        {/* Área de contenido */}
        <div className="flex-1 max-w-4xl">
          <div className="glass-card p-8 md:p-10 relative overflow-hidden min-h-[500px] flex flex-col">
            <div className="absolute top-0 right-0 p-10 opacity-[0.025] pointer-events-none">
              <Edit2 className="w-80 h-80 scale-150 rotate-12" />
            </div>

            {/* ── PASO 1: FECHAS ─────────────────────────────────────── */}
            {step === 1 && (
              <div className="animate-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-primary)] mb-2">Fechas y Tipo de Entrega</h2>
                <p className="text-xs text-[var(--text-muted)] mb-8">Modifica las fechas del contrato.</p>

                <div className="mb-8">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-3 block">Tipo de Entrega</label>
                  <div className="flex gap-2 p-1 bg-[var(--bg-surface-2)] rounded-xl w-fit border border-[var(--border-soft)]">
                    {['Presencial', 'Envío'].map(tipo => (
                      <button key={tipo} type="button"
                        onClick={() => setFechas(f => ({ ...f, tipo_entrega: tipo }))}
                        className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${fechas.tipo_entrega === tipo ? 'bg-[var(--bg-surface-3)] text-[var(--text-primary)] border border-[var(--border-soft)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                      >{tipo}</button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Fecha de Salida *</label>
                      <input type="date" className="input-guambra" value={fechas.fecha_salida_date} onChange={e => handleSalidaChange('fecha_salida_date', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Hora de Salida</label>
                      <select className="input-guambra" value={fechas.fecha_salida_time} onChange={e => handleSalidaChange('fecha_salida_time', e.target.value)}>
                        {HORAS_DISPONIBLES.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Fecha del Evento (Opcional)</label>
                      <input type="date" className="input-guambra" value={fechas.fecha_evento_date} onChange={e => setFechas(f => ({ ...f, fecha_evento_date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Hora del Evento</label>
                      <select className="input-guambra" value={fechas.fecha_evento_time} onChange={e => setFechas(f => ({ ...f, fecha_evento_time: e.target.value }))}>
                        {HORAS_DISPONIBLES.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-4">
                    <div className="flex items-center gap-3 mb-1">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)]">Fecha de Devolución *</label>
                      <button type="button" onClick={() => setDevolucionBloqueada(b => !b)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${devolucionBloqueada ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'border-[var(--border-soft)] text-[var(--text-muted)] hover:border-[var(--color-primary)]/20'}`}
                      >
                        {devolucionBloqueada ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                        {devolucionBloqueada ? 'Auto (+24h)' : 'Manual'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="date" className="input-guambra" disabled={devolucionBloqueada} value={fechas.fecha_devolucion_date} onChange={e => handleDevChange('fecha_devolucion_date', e.target.value)} />
                      <select className="input-guambra" disabled={devolucionBloqueada} value={fechas.fecha_devolucion_time} onChange={e => handleDevChange('fecha_devolucion_time', e.target.value)}>
                        {HORAS_DISPONIBLES.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    {diasAlquiler > 1 && (
                      <p className="text-[10px] text-[var(--color-primary)] font-black uppercase tracking-widest">
                        Duración: {diasAlquiler} días de alquiler
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end mt-auto pt-8">
                  <button onClick={() => setStep(2)} className="btn-guambra-primary flex items-center gap-2">
                    Siguiente: Productos <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── PASO 2: PRODUCTOS ──────────────────────────────────── */}
            {step === 2 && (
              <div className="animate-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-primary)] mb-2">Productos y Tallas</h2>
                <p className="text-xs text-[var(--text-muted)] mb-6">Modifica cantidades, agrega o elimina productos. El stock se verifica automáticamente al distribuir tallas.</p>

                {loadingItems ? (
                  <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" /></div>
                ) : (
                  <>
                    {/* Buscador de productos */}
                    <div ref={searchRef} className="relative mb-6">
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
                          <input
                            type="text" placeholder="Buscar producto para agregar..."
                            className="input-guambra pl-11"
                            value={busquedaProd}
                            onChange={e => realizarBusqueda(e.target.value)}
                          />
                        </div>
                        {buscandoProd && <div className="flex items-center px-4"><Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" /></div>}
                      </div>
                      {resultadosProd.length > 0 && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 glass-card border border-[var(--border-soft)] rounded-xl overflow-hidden shadow-2xl">
                          {resultadosProd.map(prod => (
                            <button key={prod.id} type="button"
                              onClick={() => agregarProducto(prod)}
                              disabled={!!cargandoPiezas}
                              className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--bg-surface-2)] transition-all text-left border-b border-[var(--border-soft)] last:border-0"
                            >
                              <span className="text-sm font-bold text-[var(--text-primary)]">{prod.nombre}</span>
                              <span className="text-xs font-black text-[var(--color-primary)] ml-4">${Number(prod.precio_unitario).toFixed(2)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Lista de productos */}
                    {productosCarrito.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                        <PackageSearch className="h-10 w-10 text-[var(--text-muted)] opacity-40 mb-3" />
                        <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest">Sin productos</p>
                      </div>
                    ) : (
                      <div className="space-y-4 flex-1">
                        {productosCarrito.map(prod => (
                          <div key={prod.id} className={`border rounded-2xl overflow-hidden transition-all ${
                            prod.fase === 'confirmado' && !hayExcesoStock(prod)
                              ? 'border-[var(--color-primary)]/30 bg-[var(--color-primary-dim)]/10'
                              : prod.fase === 'confirmado' && hayExcesoStock(prod)
                              ? 'border-red-500/30 bg-red-500/5'
                              : 'border-[var(--border-soft)] bg-[var(--bg-surface-2)]'
                          }`}>
                            {/* Cabecera producto */}
                            <div className="flex items-center justify-between px-5 py-4">
                              <div className="flex items-center gap-3">
                                {prod.fase === 'confirmado' && !hayExcesoStock(prod) && <CheckCircle2 className="h-4 w-4 text-[var(--color-primary)] shrink-0" />}
                                {prod.fase === 'confirmado' && hayExcesoStock(prod) && <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />}
                                <div>
                                  <p className="text-sm font-black text-[var(--text-primary)]">{prod.nombre}</p>
                                  <p className="text-[10px] text-[var(--text-muted)] font-mono">${Number(prod.precio_unitario).toFixed(2)} × {prod.cantidad_total} = ${(Number(prod.precio_unitario) * prod.cantidad_total).toFixed(2)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {prod.fase === 'confirmado' && (
                                  <button type="button" onClick={() => editarTallas(prod.id)}
                                    className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--color-primary)] px-3 py-1.5 rounded-lg border border-[var(--border-soft)] hover:border-[var(--color-primary)]/30 transition-all">
                                    Editar
                                  </button>
                                )}
                                <button type="button" onClick={() => quitarProducto(prod.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400/50 hover:text-red-400 transition-all">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Fase: ingresar cantidad */}
                            {prod.fase === 'cantidad' && (
                              <div className="px-5 pb-5 border-t border-[var(--border-soft)]">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-4 mb-3">¿Cuántas unidades lleva el cliente?</p>
                                <div className="flex items-center gap-3">
                                  <button type="button"
                                    onClick={() => setProductosCarrito(prev => prev.map(p => p.id === prod.id ? { ...p, cantidad_total: Math.max(1, p.cantidad_total - 1) } : p))}
                                    className="w-9 h-9 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-all"
                                  ><Minus className="h-4 w-4" /></button>
                                  <input type="number" min="1" className="input-guambra w-24 text-center font-black text-lg"
                                    value={prod.cantidad_total}
                                    onChange={e => setProductosCarrito(prev => prev.map(p => p.id === prod.id ? { ...p, cantidad_total: Math.max(1, parseInt(e.target.value, 10) || 1) } : p))}
                                  />
                                  <button type="button"
                                    onClick={() => setProductosCarrito(prev => prev.map(p => p.id === prod.id ? { ...p, cantidad_total: p.cantidad_total + 1 } : p))}
                                    className="w-9 h-9 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-all"
                                  ><Plus className="h-4 w-4" /></button>
                                  <button type="button" onClick={() => confirmarCantidad(prod.id)} className="btn-guambra-primary !py-2.5 !text-xs flex items-center gap-1.5">
                                    <ChevronRight className="h-4 w-4" /> Confirmar
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Fase: asignar tallas */}
                            {prod.fase === 'tallas' && (
                              <div className="px-5 pb-5 border-t border-[var(--border-soft)]">
                                {/* Encabezado con estado de verificación */}
                                <div className="flex items-center justify-between mt-4 mb-3">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)]">
                                    Distribución de tallas — {prod.cantidad_total} unidad{prod.cantidad_total !== 1 ? 'es' : ''}
                                  </p>
                                  {prod._stockVerificando && (
                                    <span className="text-[9px] text-[var(--text-muted)] flex items-center gap-1">
                                      <Loader2 className="w-3 h-3 animate-spin" /> Verificando disponibilidad...
                                    </span>
                                  )}
                                  {!prod._stockVerificando && !fechaSalidaFull && (
                                    <span className="text-[9px] text-amber-400 flex items-center gap-1 font-bold">
                                      <AlertTriangle className="w-3 h-3" /> Sin fechas — mostrando stock total
                                    </span>
                                  )}
                                </div>

                                {/* Alerta de exceso global */}
                                {hayExcesoStock(prod) && !prod._stockVerificando && (
                                  <div className="flex items-start gap-2 p-3 mb-3 rounded-xl bg-red-500/5 border border-red-500/25">
                                    <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                    <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest">
                                      Hay tallas que superan el stock disponible. Reduce las cantidades indicadas en rojo.
                                    </p>
                                  </div>
                                )}

                                <div className="space-y-4">
                                  {prod.piezas.map(pz => {
                                    const asignado = totalAsignado(pz);
                                    const ok = asignado === prod.cantidad_total;
                                    const excede = asignado > prod.cantidad_total;
                                    return (
                                      <div key={pz.id} className={`p-4 rounded-xl border transition-colors ${
                                        ok && !pz.tallasDisponibles.some(t => { const c = pz.tallasCantidades[t.talla] ?? 0; return c > (t.stockDisponible ?? t.stock) && c > 0; })
                                          ? 'border-green-500/30 bg-green-500/5'
                                          : excede ? 'border-red-500/30 bg-red-500/5'
                                          : 'border-[var(--border-soft)] bg-[var(--bg-surface)]'
                                      }`}>
                                        <div className="flex items-center justify-between mb-3">
                                          <p className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider">{pz.nombre}</p>
                                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                                            ok ? 'bg-green-500/20 text-green-400' : excede ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                                          }`}>
                                            {asignado}/{prod.cantidad_total}
                                          </span>
                                        </div>

                                        {pz.tallasDisponibles.length > 0 ? (
                                          <div className="grid gap-2">
                                            {pz.tallasDisponibles.map(tallaInfo => {
                                              const cantActual = pz.tallasCantidades[tallaInfo.talla] ?? 0;
                                              const stockDisp = tallaInfo.stockDisponible ?? tallaInfo.stock;
                                              const sinStock = stockDisp === 0;
                                              const stockOk = cantActual <= stockDisp;
                                              const verificado = tallaInfo.stockDisponible !== undefined && tallaInfo.stockDisponible !== null;
                                              return (
                                                <div key={tallaInfo.talla} className={`flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors ${cantActual > 0 && !sinStock ? 'bg-[var(--bg-surface-3)]' : ''}`}>
                                                  {/* Badge talla */}
                                                  <span className={`text-[10px] font-black w-14 text-center py-1 rounded-md border shrink-0 ${
                                                    sinStock ? 'text-[var(--text-muted)] opacity-50 bg-[var(--bg-surface-2)] border-[var(--border-soft)]'
                                                             : 'text-[var(--text-primary)] bg-[var(--bg-surface-2)] border-[var(--border-soft)]'
                                                  }`}>{tallaInfo.talla}</span>

                                                  {/* Indicador stock disponible */}
                                                  <div className="flex flex-col w-20 shrink-0">
                                                    <span className={`text-[9px] font-black leading-tight ${
                                                      sinStock ? 'text-red-400'
                                                      : stockDisp <= prod.cantidad_total / 2 ? 'text-amber-400'
                                                      : 'text-[var(--text-muted)]'
                                                    }`}>
                                                      {sinStock ? 'No disponible' : `Disp: ${stockDisp}`}
                                                    </span>
                                                    {verificado && tallaInfo.stockDisponible !== tallaInfo.stock && (
                                                      <span className="text-[8px] text-[var(--text-muted)] opacity-60 leading-tight">total: {tallaInfo.stock}</span>
                                                    )}
                                                  </div>

                                                  {/* Controles cantidad */}
                                                  <div className="flex items-center gap-1">
                                                    <button type="button"
                                                      disabled={sinStock || cantActual === 0}
                                                      onClick={() => updateTalla(prod.id, pz.id, tallaInfo.talla, cantActual - 1)}
                                                      className="w-7 h-7 rounded-md bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                                                    ><Minus className="w-3 h-3" /></button>
                                                    <input
                                                      type="number" min="0" max={stockDisp}
                                                      disabled={sinStock}
                                                      className={`w-14 px-2 py-1 rounded-lg text-center text-xs font-black border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                                                        !stockOk && cantActual > 0
                                                          ? 'bg-red-500/10 border-red-500/40 text-red-400'
                                                          : cantActual > 0
                                                          ? 'bg-primary/10 border-primary/40 text-[var(--text-primary)]'
                                                          : 'bg-[var(--bg-input)] border-[var(--border-soft)] text-[var(--text-primary)]'
                                                      }`}
                                                      value={cantActual}
                                                      onChange={e => updateTalla(prod.id, pz.id, tallaInfo.talla, e.target.value)}
                                                    />
                                                    <button type="button"
                                                      disabled={sinStock || cantActual >= stockDisp}
                                                      onClick={() => updateTalla(prod.id, pz.id, tallaInfo.talla, cantActual + 1)}
                                                      className="w-7 h-7 rounded-md bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                                                    ><Plus className="w-3 h-3" /></button>
                                                  </div>

                                                  {/* Aviso inline de exceso */}
                                                  {!stockOk && cantActual > 0 && (
                                                    <span className="text-[9px] text-red-400 font-black leading-tight">
                                                      Stock insuficiente — disponible: {stockDisp}, solicitado: {cantActual}
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <p className="text-xs text-[var(--text-muted)] italic">Sin tallas configuradas</p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Botón confirmar tallas */}
                                {(() => {
                                  const puedeConfirmar = piezasValidas(prod) && !hayExcesoStock(prod) && !prod._stockVerificando;
                                  return (
                                    <button type="button" onClick={() => confirmarTallas(prod.id)}
                                      disabled={!puedeConfirmar}
                                      className={`mt-4 w-full h-11 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                                        puedeConfirmar
                                          ? 'bg-green-500 text-white hover:bg-green-400 shadow-lg shadow-green-500/20'
                                          : 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border-soft)]'
                                      }`}
                                    >
                                      {prod._stockVerificando
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando stock...</>
                                        : <><CheckCircle2 className="w-4 h-4" />
                                            {puedeConfirmar
                                              ? 'Guardar distribución'
                                              : hayExcesoStock(prod)
                                              ? 'Stock insuficiente — ajusta las tallas'
                                              : `Distribuye ${prod.cantidad_total} unidad${prod.cantidad_total !== 1 ? 'es' : ''} en cada pieza`
                                            }
                                          </>
                                      }
                                    </button>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between mt-auto pt-8">
                  <button onClick={() => setStep(1)} className="btn-guambra-secondary flex items-center gap-2">
                    <ChevronLeft className="h-4 w-4" /> Atrás
                  </button>
                  <button onClick={() => { if (!todosConfirmados) return toast.error('Confirma todos los productos antes de continuar.'); setStep(3); }}
                    className="btn-guambra-primary flex items-center gap-2">
                    Siguiente: Financiero <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── PASO 3: FINANCIERO ─────────────────────────────────── */}
            {step === 3 && (
              <div className="animate-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-primary)] mb-2">Financiero y Notas</h2>
                <p className="text-xs text-[var(--text-muted)] mb-8">Los abonos registrados se mantienen intactos. El saldo pendiente se recalcula automáticamente.</p>

                <div className="space-y-6 flex-1">
                  {/* Alerta anticipo excede total — prominente */}
                  {anticipoExcedeTotal && (
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                      <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1">
                          El anticipo pagado supera el nuevo total
                        </p>
                        <p className="text-[11px] text-amber-300/80 leading-relaxed">
                          El cliente pagó <strong>${anticipoPagado.toFixed(2)}</strong> pero el nuevo total es <strong>${total.toFixed(2)}</strong>.
                          El saldo quedará en <strong>$0.00</strong> y habrá un crédito a favor del cliente de <strong>${(anticipoPagado - total).toFixed(2)}</strong>.
                          Considera aplicar un abono adicional o ajustar el descuento.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Resumen financiero */}
                  <div className="glass-card p-6 space-y-4 border border-[var(--border-soft)]">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-primary)]">Resumen Financiero</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-widest mb-1">Subtotal productos</p>
                        <p className="font-black text-[var(--text-primary)] text-lg">${subtotalBase.toFixed(2)}</p>
                      </div>
                      <div>
                        <label className="text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-widest mb-1 block">Descuento ($)</label>
                        <input type="number" min="0" step="0.01" className="input-guambra font-mono"
                          value={descuento}
                          onChange={e => setDescuento(Math.max(0, parseFloat(e.target.value) || 0))}
                        />
                      </div>
                      <div className="col-span-2 pt-3 border-t border-[var(--border-soft)] flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Total del Contrato</p>
                        <p className="text-2xl font-black text-[var(--color-primary)]">${total.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Comparativa de pagos */}
                    <div className="pt-3 border-t border-[var(--border-soft)] grid grid-cols-3 gap-3 text-center">
                      <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20">
                        <p className="text-[9px] text-green-400 font-black uppercase tracking-widest mb-1">Ya pagado</p>
                        <p className="font-black text-green-400">${anticipoPagado.toFixed(2)}</p>
                      </div>
                      <div className={`rounded-xl p-3 border ${
                        anticipoExcedeTotal ? 'bg-amber-500/10 border-amber-500/20'
                        : nuevoSaldo > 0 ? 'bg-red-500/10 border-red-500/20'
                        : 'bg-green-500/10 border-green-500/20'
                      }`}>
                        <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${
                          anticipoExcedeTotal ? 'text-amber-400' : nuevoSaldo > 0 ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {anticipoExcedeTotal ? 'Crédito a favor' : 'Nuevo saldo'}
                        </p>
                        <p className={`font-black ${
                          anticipoExcedeTotal ? 'text-amber-400' : nuevoSaldo > 0 ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {anticipoExcedeTotal
                            ? `+$${(anticipoPagado - total).toFixed(2)}`
                            : `$${nuevoSaldo.toFixed(2)}`
                          }
                        </p>
                      </div>
                      <div className="bg-[var(--bg-surface-2)] rounded-xl p-3 border border-[var(--border-soft)]">
                        <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-1">Días</p>
                        <p className="font-black text-[var(--text-primary)]">{diasAlquiler}</p>
                      </div>
                    </div>

                    {/* Aviso de reducción de saldo (sin llegar a exceso) */}
                    {!anticipoExcedeTotal && nuevoSaldo < Number(contrato.saldo_pendiente || 0) && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-400 font-bold leading-snug">
                          El nuevo total es menor al anterior. El saldo pendiente bajará de ${Number(contrato.saldo_pendiente).toFixed(2)} a ${nuevoSaldo.toFixed(2)}.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Garantía */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Tipo de Garantía</label>
                      <div className="flex gap-2">
                        {['Económica', 'Física'].map(tipo => (
                          <button key={tipo} type="button"
                            onClick={() => setGarantia(g => ({ ...g, tipo }))}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${garantia.tipo === tipo ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'border-[var(--border-soft)] text-[var(--text-muted)] hover:border-[var(--color-primary)]/20'}`}
                          >{tipo}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Descripción de Garantía</label>
                      <input type="text" className="input-guambra" value={garantia.descripcion}
                        onChange={e => setGarantia(g => ({ ...g, descripcion: e.target.value }))}
                        placeholder="Ej: Licencia de conducir, $50..." />
                    </div>
                  </div>

                  {/* Notas internas */}
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Notas Internas</label>
                    <textarea rows={3} className="input-guambra resize-none"
                      value={notasInternas}
                      onChange={e => setNotasInternas(e.target.value)}
                      placeholder="Observaciones internas del contrato..."
                    />
                  </div>
                </div>

                <div className="flex justify-between mt-8 pt-6 border-t border-[var(--border-soft)]">
                  <button onClick={() => setStep(2)} className="btn-guambra-secondary flex items-center gap-2">
                    <ChevronLeft className="h-4 w-4" /> Atrás
                  </button>
                  <button onClick={handleGuardar} disabled={guardando}
                    className="btn-guambra-primary flex items-center gap-2 min-w-[180px] justify-center">
                    {guardando
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                      : <><CheckCircle2 className="h-4 w-4" /> Guardar Cambios</>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
