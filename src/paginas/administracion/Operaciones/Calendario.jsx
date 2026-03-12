import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'sonner';
import {
  Calendar as CalendarIcon, Clock, Edit2, Eye,
  Trash2, DollarSign, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, XCircle, ShoppingBag, User,
  X, Loader2, Package, CreditCard, ShieldCheck
} from 'lucide-react';

import { THEME_ESTADOS, obtenerBadgeEstado } from '../../../utils/coreTheme';
import EditarContrato from './EditarContrato';

const METODOS_PAGO = ['Efectivo', 'Transferencia Bancaria', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Paypal/Link', 'Otro'];

export default function Calendario() {
  const { profile, loading: authLoading } = useAuthStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── Estado modales / acciones ──────────────────────────────────────────────
  const [editandoContrato, setEditandoContrato] = useState(null);
  const [contratoActivo, setContratoActivo] = useState(null);

  // Modal Ver detalle
  const [isVerOpen, setIsVerOpen] = useState(false);
  const [detalleItems, setDetalleItems] = useState([]);
  const [detallePagos, setDetallePagos] = useState([]);
  const [detalleLoading, setDetalleLoading] = useState(false);

  // Modal Abono
  const [isAbonoOpen, setIsAbonoOpen] = useState(false);
  const [montoAbono, setMontoAbono] = useState('');
  const [metodoPagoAbono, setMetodoPagoAbono] = useState('');

  // Funciones de navegación del mes
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const today = () => {
      const n = new Date();
      setCurrentDate(n);
      setSelectedDate(n);
  };

  const fetchContratos = async () => {
      setLoading(true);
      try {
          const { data, error } = await supabase.from('contratos')
             .select(`
                *,
                cliente:clientes(nombre_completo, identificacion),
                items:items_contrato(nombre_item, cantidad)
             `)
             .eq('tenant_id', profile.tenant_id);

          if(error && error.code !== '42P01') throw error;

          let list = data || [];

          const transformedList = list.map(c => {
              const fechaIsoLocal = c.fecha_salida ? c.fecha_salida.slice(0, 10) : '';
              const horaIsoLocal  = c.fecha_salida ? c.fecha_salida.slice(11, 16) : '00:00';
              const nombreCliente = c.cliente ? (c.cliente.nombre_completo || 'Cliente Sin Nombre') : 'Cliente Desconocido';
              const resumenItems = c.items && c.items.length > 0
                  ? c.items.map(i => `${i.cantidad}x ${i.nombre_item}`).join(', ')
                  : 'Sin ítems registrados';

              return {
                  ...c,
                  cliente_nombre: nombreCliente,
                  fecha_entrega: fechaIsoLocal,
                  hora_entrega: horaIsoLocal,
                  productos_resumen: resumenItems
              };
          });

          setContratos(transformedList);
      } catch (e) {
          toast.error('Error cargando planificador');
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      if (!authLoading && profile?.tenant_id) fetchContratos();
      else if (!authLoading && !profile?.tenant_id) setLoading(false);
  }, [authLoading, profile?.tenant_id, currentDate]);

  // ── Acciones ───────────────────────────────────────────────────────────────

  const abrirVerDetalle = async (c) => {
    setContratoActivo(c);
    setIsVerOpen(true);
    setDetalleLoading(true);
    try {
      const [{ data: items }, { data: pagos }] = await Promise.all([
        supabase
          .from('items_contrato')
          .select('*, tallas:items_contrato_tallas(etiqueta_talla, cantidad, nombre_pieza_snapshot)')
          .eq('contrato_id', c.id)
          .order('created_at'),
        supabase
          .from('pagos_contrato')
          .select('*')
          .eq('contrato_id', c.id)
          .order('registrado_en'),
      ]);
      setDetalleItems(items || []);
      setDetallePagos(pagos || []);
    } catch { toast.error('Error cargando detalle del contrato'); }
    finally { setDetalleLoading(false); }
  };

  const registrarAbono = async (e) => {
    e.preventDefault();
    const monto = parseFloat(montoAbono);
    if (!monto || monto <= 0) return toast.error('Ingresa un monto válido');
    try {
      const { error: pagoError } = await supabase
        .from('pagos_contrato')
        .insert({
          contrato_id: contratoActivo.id,
          tenant_id: profile.tenant_id,
          monto,
          tipo_pago: 'abono',
          referencia: metodoPagoAbono || null,
          notas: `Abono adicional — ${metodoPagoAbono || 'Sin método especificado'}`,
          registrado_por: profile.id,
          nombre_registrador_snapshot: profile.nombre_completo || 'Empleado',
        });
      if (pagoError) throw pagoError;
      const nuevoAnticipo = (contratoActivo.anticipo_pagado || 0) + monto;
      const nuevoSaldo = Math.max(0, (contratoActivo.total || 0) - nuevoAnticipo);
      await supabase.from('contratos').update({ anticipo_pagado: nuevoAnticipo, saldo_pendiente: nuevoSaldo }).eq('id', contratoActivo.id);
      toast.success(`Abono de $${monto.toFixed(2)} registrado correctamente`);
      setIsAbonoOpen(false);
      setMontoAbono('');
      setMetodoPagoAbono('');
      // Actualizar localmente el contrato
      setContratos(prev => prev.map(p => p.id === contratoActivo.id
        ? { ...p, anticipo_pagado: nuevoAnticipo, saldo_pendiente: nuevoSaldo }
        : p
      ));
    } catch (err) { toast.error('Error al registrar abono: ' + err.message); }
  };

  const handleAnular = async (c) => {
      if(!confirm(`¿Anular este contrato (${c.codigo || c.id})? El 100% del anticipo quedará retenido como penalidad.`)) return;
      try {
          await supabase.from('contratos').update({ estado: 'Cancelado' }).eq('id', c.id);
          toast.success('Contrato anulado. Anticipo retenido.');
          setContratos(prev => prev.map(p => p.id === c.id ? { ...p, estado: 'Cancelado' } : p));
      } catch (err) {
          toast.error('Fallo al anular el contrato');
      }
  };

  const getCodigoContrato = (c) => c.codigo || `TX-${(c.id || '').substring(0, 8).toUpperCase()}`;

  const getStatusBadge = (estado) => {
    const map = {
      reservado:   { cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30',   label: 'Reservado' },
      entregado:   { cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30',       label: 'En Uso' },
      devuelto_ok: { cls: 'bg-green-500/20 text-green-400 border-green-500/30',   label: 'Finalizado' },
      devuelto_con_problemas: { cls: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Incidencia' },
      cancelado:   { cls: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Cancelado' },
    };
    const s = map[estado?.toLowerCase()] || { cls: 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-soft)]', label: estado };
    return (
      <span className={`inline-flex items-center rounded-lg px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] border ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  // ── LOGICA DEL CALENDARIO ──────────────────────────────────────────────────
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const blanks = Array(firstDay).fill(null);
  const days = Array.from({length: daysInMonth}, (_, i) => i + 1);

  const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`;

  const contratosDelDia = contratos.filter(c => {
      if(!c.fecha_entrega) return false;
      return c.fecha_entrega === selectedDateStr;
  }).sort((a, b) => (a.hora_entrega || '00:00').localeCompare(b.hora_entrega || '00:00'));

  // ── Modo edición: reemplaza la vista completa ──────────────────────────────
  if (editandoContrato) {
    return (
      <EditarContrato
        contrato={editandoContrato}
        onVolver={() => setEditandoContrato(null)}
        onGuardado={() => { setEditandoContrato(null); fetchContratos(); }}
      />
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-20 h-[calc(100vh-100px)] min-h-[800px] flex flex-col">

       <div className="mb-6 flex justify-end shrink-0">
           <div className="flex bg-[var(--bg-surface-2)] border border-[var(--border-soft)] p-1 rounded-xl">
               <button onClick={prevMonth} className="px-3 hover:bg-[var(--bg-surface-3)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"><ChevronLeft className="w-5 h-5"/></button>
               <button onClick={today} className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-[var(--bg-surface-3)] rounded-lg transition-colors">
                   {currentDate.toLocaleDateString(undefined, {month:'long', year:'numeric'})}
               </button>
               <button onClick={nextMonth} className="px-3 hover:bg-[var(--bg-surface-3)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"><ChevronRight className="w-5 h-5"/></button>
           </div>
       </div>

       <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">

           {/* PANORÁMICA CALENDARIO (75%) */}
           <div className="flex-[3] glass-card p-0 flex flex-col overflow-hidden h-full">

               <div className="grid grid-cols-7 border-b border-[var(--border-soft)] bg-[var(--bg-surface-2)] shrink-0">
                   {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                       <div key={d} className="p-3 text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{d}</div>
                   ))}
               </div>

               <div className="flex-1 grid grid-cols-7 grid-rows-5 lg:grid-rows-auto overflow-y-auto custom-scrollbar bg-[var(--bg-surface)]">
                   {blanks.map((_, i) => <div key={`blank-${i}`} className="border-r border-b border-[var(--border-soft)] bg-[var(--bg-surface-2)] p-2 min-h-[120px]"></div>)}

                   {days.map(d => {
                       const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                       const eventosDelDia = contratos.filter(c => c.fecha_entrega === dStr);
                       const isSelected = selectedDateStr === dStr;

                       const isTodayObj = new Date();
                       const isToday = isTodayObj.getDate() === d && isTodayObj.getMonth() === month && isTodayObj.getFullYear() === year;

                       return (
                           <div
                              key={d}
                              onClick={() => setSelectedDate(new Date(year, month, d))}
                              className={`border-r border-b p-2 min-h-[120px] transition-all cursor-pointer flex flex-col gap-1 relative overflow-hidden group
                                  ${isSelected ? '' : 'border-[var(--border-soft)] hover:bg-[var(--bg-surface-2)]'}
                              `}
                              style={isSelected ? {
                                backgroundColor: 'color-mix(in srgb, var(--color-primary) 18%, var(--bg-surface))',
                                borderColor: 'var(--color-primary)',
                                outline: '1.5px solid color-mix(in srgb, var(--color-primary) 55%, transparent)',
                                outlineOffset: '-1.5px',
                              } : {}}
                           >
                               <span
                                 className="text-xs font-black p-1.5 rounded-lg w-8 h-8 flex items-center justify-center mb-1"
                                 style={
                                   isSelected
                                     ? { backgroundColor: 'var(--color-primary)', color: '#ffffff' }
                                     : isToday
                                       ? { backgroundColor: 'var(--bg-surface-3)', color: 'var(--text-primary)', border: '1px solid var(--border-soft)' }
                                       : { color: 'var(--text-secondary)' }
                                 }
                               >
                                   {d}
                               </span>

                               <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar pb-1 z-10">
                                   {eventosDelDia.map(ev => {
                                       const style = obtenerBadgeEstado(ev.estado);
                                       return (
                                           <div key={ev.id} className={`text-[9px] font-bold px-1.5 py-1 rounded truncate border ${style.color}`} title={`${ev.hora_entrega || ''} - ${ev.cliente_nombre}`}>
                                               {ev.hora_entrega && <span className="font-mono mr-1 opacity-70">{ev.hora_entrega}</span>}
                                               {ev.cliente_nombre.split(' ')[0]}
                                           </div>
                                       )
                                   })}
                               </div>
                           </div>
                       );
                   })}
               </div>
           </div>

           {/* DESGLOSE DEL DÍA SELECCIONADO (25%) */}
           <div className="flex-[1] lg:max-w-sm glass-card flex flex-col h-full overflow-hidden p-0 border-primary/20 bg-[var(--bg-surface)] shadow-2xl relative">

               <div className="absolute top-0 right-0 w-full h-32 bg-primary/10 blur-3xl -translate-y-1/2 pointer-events-none"></div>

               <div className="p-6 border-b border-[var(--border-soft)] shrink-0 relative z-10">
                   <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tighter flex items-center justify-between">
                       <span>{selectedDate.toLocaleDateString(undefined, {weekday: 'long'})}</span>
                       <span className="text-primary font-mono bg-primary/10 px-2 py-1 rounded-lg text-lg border border-primary/20">{selectedDate.getDate()}</span>
                   </h2>
                   <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">{selectedDate.toLocaleDateString(undefined, {month: 'long', year: 'numeric'})}</p>

                   <div className="mt-4 flex gap-2">
                       <span className="bg-[var(--bg-surface-2)] border border-[var(--border-soft)] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] flex-1 text-center">
                           {contratosDelDia.length} Operaciones
                       </span>
                   </div>
               </div>

               <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar relative z-10">
                   {contratosDelDia.length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-6">
                           <Clock className="w-12 h-12 mb-4 text-[var(--text-muted)]"/>
                           <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Día liberado. No existen despachos, retóricos o entregas programadas.</p>
                       </div>
                   ) : contratosDelDia.map(c => {
                       const style = obtenerBadgeEstado(c.estado);
                       const anulado = c.estado === 'Cancelado' || c.estado === 'cancelado';

                       return (
                           <div key={c.id} className={`bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl p-4 relative overflow-hidden group transition-all hover:bg-[var(--bg-surface-3)] ${anulado ? 'opacity-40' : ''}`}>
                               <div className={`absolute top-0 left-0 w-1.5 h-full ${style.badge}`}></div>

                               <div className="flex justify-between items-start mb-2 pl-2">
                                   <span className="text-xs font-mono font-black text-[var(--text-secondary)] bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-soft)] flex items-center gap-1.5"><Clock className="w-3 h-3 text-primary"/> {c.hora_entrega || 'N/D'}</span>
                                   <span className="text-[9px] font-mono tracking-widest text-[var(--text-muted)] uppercase">{c.codigo || c.id.substring(0, 8).toUpperCase()}</span>
                               </div>

                               <div className="pl-2">
                                   <p className={`font-bold text-sm text-[var(--text-primary)] line-clamp-1 ${anulado ? 'line-through' : ''}`} title={c.cliente_nombre}>{c.cliente_nombre}</p>
                                   <p className="text-[10px] text-[var(--text-muted)] mt-1 flex items-center gap-1.5 line-clamp-1"><ShoppingBag className="w-3 h-3 shrink-0"/> {c.productos_resumen}</p>

                                   <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm border inline-block mt-3 ${style.color}`}>
                                       {c.estado}
                                   </span>
                               </div>

                               {!anulado && (
                                   <div className="pt-4 mt-4 border-t border-[var(--border-soft)] flex justify-between gap-1 pl-2">
                                       <button
                                           onClick={() => { setContratoActivo(c); setMontoAbono(''); setMetodoPagoAbono(''); setIsAbonoOpen(true); }}
                                           className="flex-1 py-1.5 rounded bg-green-500/10 hover:bg-green-500/20 text-green-500/70 hover:text-green-400 border border-green-500/20 transition-colors flex items-center justify-center"
                                           title="Agregar Abono"
                                       >
                                           <DollarSign className="w-3.5 h-3.5"/>
                                       </button>
                                       <button
                                           onClick={() => setEditandoContrato(c)}
                                           className="flex-1 py-1.5 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-soft)] transition-colors flex items-center justify-center"
                                           title="Editar Contrato"
                                       >
                                           <Edit2 className="w-3.5 h-3.5"/>
                                       </button>
                                       <button
                                           onClick={() => abrirVerDetalle(c)}
                                           className="flex-1 py-1.5 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-soft)] transition-colors flex items-center justify-center"
                                           title="Ver Detalle"
                                       >
                                           <Eye className="w-3.5 h-3.5"/>
                                       </button>
                                       <button
                                           onClick={() => handleAnular(c)}
                                           className="flex-1 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500/50 hover:text-red-400 transition-colors flex items-center justify-center"
                                           title="Anular Contrato"
                                       >
                                           <Trash2 className="w-3.5 h-3.5"/>
                                       </button>
                                   </div>
                               )}
                           </div>
                       )
                   })}
               </div>

               <div className="p-4 bg-[var(--bg-surface-2)] border-t border-[var(--border-soft)] shrink-0 text-center">
                   <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Atención: Anular un contrato retiene el 100% como comisión de lucro cesante.</p>
               </div>
           </div>
       </div>

       {/* ── Modal Agregar Abono ─────────────────────────────────────────────── */}
       {isAbonoOpen && contratoActivo && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:pl-72 bg-[var(--bg-page)]/80 backdrop-blur-md">
           <form onSubmit={registrarAbono} className="glass-card w-full max-w-md p-8 animate-in zoom-in-95 border border-green-500/20">
             <div className="w-14 h-14 rounded-2xl bg-green-500/20 text-green-400 flex items-center justify-center mb-6 border border-green-500/30">
               <DollarSign className="w-7 h-7"/>
             </div>
             <h3 className="text-xl font-black uppercase text-[var(--text-primary)] tracking-tighter mb-1">Registrar Abono</h3>
             <p className="text-xs text-[var(--text-muted)] font-medium mb-8">
               Saldo pendiente: <span className="text-[var(--text-primary)] font-mono font-black">${Number(contratoActivo.saldo_pendiente || 0).toFixed(2)}</span>
             </p>
             <div className="space-y-5">
               <div>
                 <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Monto del abono *</label>
                 <input type="number" step="0.01" min="0.01" required className="input-guambra font-mono text-xl" value={montoAbono} onChange={e => setMontoAbono(e.target.value)} placeholder="0.00" />
               </div>
               <div>
                 <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Método de pago *</label>
                 <select required className="input-guambra" value={metodoPagoAbono} onChange={e => setMetodoPagoAbono(e.target.value)}>
                   <option value="">Seleccione...</option>
                   {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                 </select>
               </div>
             </div>
             <div className="flex gap-3 mt-8 pt-6 border-t border-[var(--border-soft)]">
               <button type="button" onClick={() => setIsAbonoOpen(false)} className="btn-guambra-secondary flex-1">Cancelar</button>
               <button type="submit" className="flex-1 bg-green-500 text-white font-black uppercase tracking-widest rounded-xl h-12 text-xs flex items-center justify-center gap-2 hover:bg-green-400 transition-all">
                 <CheckCircle2 className="w-4 h-4"/> Registrar
               </button>
             </div>
           </form>
         </div>
       )}

       {/* ── Modal Ver Detalle ───────────────────────────────────────────────── */}
       {isVerOpen && contratoActivo && (
         <div className="fixed inset-0 z-[200] flex items-start justify-center lg:pl-72 pt-20 px-6 pb-6 overflow-y-auto bg-[var(--bg-page)]/85 backdrop-blur-md">
           <div className="glass-card w-full max-w-4xl animate-in zoom-in-95 shadow-2xl">

             <div className="flex items-center justify-between px-7 py-4 border-b border-[var(--border-soft)]">
               <div className="flex items-center gap-4">
                 <p className="font-mono font-black text-primary text-base tracking-tight">{getCodigoContrato(contratoActivo)}</p>
                 {getStatusBadge(contratoActivo.estado)}
                 <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold hidden sm:block">Detalle del Contrato</span>
               </div>
               <button onClick={() => setIsVerOpen(false)} className="p-2 rounded-xl hover:bg-[var(--bg-surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
                 <X className="h-4 w-4" />
               </button>
             </div>

             {detalleLoading ? (
               <div className="flex justify-center py-14"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
             ) : (
               <div className="p-6 space-y-4">

                 <div className="grid grid-cols-3 gap-4">

                   {/* Cliente */}
                   <div className="bg-[var(--bg-surface-2)] rounded-2xl p-5 border border-[var(--border-soft)] space-y-1">
                     <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                       <User className="h-3.5 w-3.5"/>Cliente
                     </p>
                     <p className="font-black text-[var(--text-primary)] text-sm leading-snug">{contratoActivo.cliente?.nombre_completo || contratoActivo.cliente_nombre || '—'}</p>
                     <p className="text-xs text-[var(--text-muted)] font-mono">{contratoActivo.cliente?.identificacion || '—'}</p>
                     <div className="mt-3 pt-3 border-t border-[var(--border-soft)] grid grid-cols-2 gap-3">
                       <div>
                         <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-0.5">Días alquiler</p>
                         <p className="text-sm font-black text-[var(--text-primary)]">{contratoActivo.dias_alquiler ?? 1}</p>
                       </div>
                       <div>
                         <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-0.5">Tipo entrega</p>
                         <p className="text-sm font-black text-[var(--text-primary)] capitalize">{contratoActivo.tipo_envio || '—'}</p>
                       </div>
                     </div>
                   </div>

                   {/* Fechas */}
                   <div className="bg-[var(--bg-surface-2)] rounded-2xl p-5 border border-[var(--border-soft)]">
                     <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                       <CalendarIcon className="h-3.5 w-3.5"/>Fechas
                     </p>
                     <div className="space-y-3">
                       {[
                         ['Salida',     contratoActivo.fecha_salida],
                         ['Evento',     contratoActivo.fecha_evento],
                         ['Devolución', contratoActivo.fecha_devolucion],
                       ].map(([lbl, val]) => (
                         <div key={lbl}>
                           <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-0.5">{lbl}</p>
                           {val ? (
                             <div className="flex items-baseline gap-2">
                               <span className="text-sm font-black text-[var(--text-primary)]">
                                 {new Date(val).toLocaleDateString('es-EC', { timeZone: 'UTC', day:'2-digit', month:'2-digit', year:'numeric' })}
                               </span>
                               <span className="text-xs text-[var(--text-muted)] font-bold">
                                 {new Date(val).toLocaleTimeString('es-EC', { timeZone: 'UTC', hour:'2-digit', minute:'2-digit' })}
                               </span>
                             </div>
                           ) : <span className="text-sm font-bold text-[var(--text-muted)]">—</span>}
                         </div>
                       ))}
                     </div>
                   </div>

                   {/* Financiero */}
                   <div className="bg-[var(--bg-surface-2)] rounded-2xl p-5 border border-[var(--border-soft)]">
                     <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                       <CreditCard className="h-3.5 w-3.5"/>Financiero
                     </p>
                     <div className="space-y-2">
                       {[
                         ['Subtotal',  `$${Number(contratoActivo.subtotal || 0).toFixed(2)}`],
                         ['Descuento', `$${Number(contratoActivo.monto_descuento || 0).toFixed(2)}`],
                         ['Total',     `$${Number(contratoActivo.total || 0).toFixed(2)}`, true],
                         ['Anticipo',  `$${Number(contratoActivo.anticipo_pagado || 0).toFixed(2)}`],
                         ['Saldo',     `$${Number(contratoActivo.saldo_pendiente || 0).toFixed(2)}`, false, Number(contratoActivo.saldo_pendiente) > 0],
                       ].map(([lbl, val, bold, warn]) => (
                         <div key={lbl} className={`flex justify-between items-center text-xs ${bold ? 'border-t border-[var(--border-soft)] pt-2 mt-1' : ''}`}>
                           <span className="text-[var(--text-secondary)]">{lbl}</span>
                           <span className={`font-black ${bold ? 'text-[var(--text-primary)] text-sm' : warn ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>{val}</span>
                         </div>
                       ))}
                     </div>
                     {(contratoActivo.tipo_garantia || contratoActivo.descripcion_garantia) && (
                       <div className="mt-3 pt-3 border-t border-[var(--border-soft)]">
                         <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5 flex items-center gap-1">
                           <ShieldCheck className="h-3 w-3"/>Garantía
                         </p>
                         <p className="text-xs font-black text-[var(--text-primary)] capitalize">{contratoActivo.tipo_garantia || '—'}</p>
                         {contratoActivo.descripcion_garantia && (
                           <p className="text-xs text-[var(--text-secondary)] mt-0.5">{contratoActivo.descripcion_garantia}</p>
                         )}
                       </div>
                     )}
                   </div>
                 </div>

                 {/* Productos */}
                 <div className="bg-[var(--bg-surface-2)] rounded-2xl p-5 border border-[var(--border-soft)]">
                   <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                     <Package className="h-3.5 w-3.5"/>Productos y Tallas
                   </p>
                   {detalleItems.length === 0 ? (
                     <p className="text-sm text-[var(--text-muted)] italic">Sin ítems registrados</p>
                   ) : (
                     <div className="grid grid-cols-2 gap-3">
                       {detalleItems.map(item => (
                         <div key={item.id} className="bg-[var(--bg-surface)] rounded-xl p-4 border border-[var(--border-soft)]">
                           <div className="flex justify-between items-start gap-3">
                             <p className="font-black text-[var(--text-primary)] text-sm leading-tight">{item.nombre_item}</p>
                             <p className="text-xs font-black text-primary shrink-0">${Number(item.precio_unitario || 0).toFixed(2)}</p>
                           </div>
                           <p className="text-[10px] text-[var(--text-muted)] mt-1">Cantidad: {item.cantidad}</p>
                           {item.tallas && item.tallas.length > 0 && (
                             <div className="mt-2 flex flex-wrap gap-1">
                               {item.tallas.map((t, i) => (
                                 <span key={i} className="text-[9px] font-black bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded px-1.5 py-0.5 text-[var(--text-muted)]">
                                   {t.etiqueta_talla} ×{t.cantidad}
                                 </span>
                               ))}
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                   )}
                 </div>

                 {/* Historial de Pagos */}
                 <div className="bg-[var(--bg-surface-2)] rounded-2xl p-5 border border-[var(--border-soft)]">
                   <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-4 flex items-center gap-1.5">
                     <DollarSign className="h-3.5 w-3.5"/>Historial de Pagos
                     <span className="ml-auto text-[var(--text-muted)] font-bold normal-case tracking-normal">
                       {detallePagos.length} registro{detallePagos.length !== 1 ? 's' : ''}
                     </span>
                   </p>
                   {detallePagos.length === 0 ? (
                     <p className="text-sm text-[var(--text-muted)] italic">Sin pagos registrados</p>
                   ) : (
                     <div className="relative">
                       {/* Línea vertical de la timeline */}
                       <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[var(--border-soft)]"></div>
                       <div className="space-y-3">
                         {detallePagos.map((p, idx) => {
                           const fecha = p.registrado_en ? new Date(p.registrado_en) : null;
                           const tipoBadge = {
                             anticipo: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
                             abono:    'bg-green-500/15 text-green-400 border-green-500/25',
                             saldo:    'bg-primary/15 text-primary border-primary/25',
                           }[p.tipo_pago] || 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-soft)]';
                           const dotColor = {
                             anticipo: 'bg-blue-400',
                             abono:    'bg-green-400',
                             saldo:    'bg-primary',
                           }[p.tipo_pago] || 'bg-[var(--text-muted)]';

                           return (
                             <div key={p.id} className="flex gap-4 pl-1">
                               {/* Dot de la timeline */}
                               <div className={`w-5 h-5 rounded-full ${dotColor} shrink-0 mt-0.5 flex items-center justify-center z-10`}>
                                 <span className="text-[7px] font-black text-white">{idx + 1}</span>
                               </div>

                               <div className="flex-1 bg-[var(--bg-surface)] rounded-xl p-3 border border-[var(--border-soft)]">
                                 {/* Fila superior: tipo + monto */}
                                 <div className="flex items-center justify-between gap-2 mb-2">
                                   <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${tipoBadge}`}>
                                     {p.tipo_pago}
                                   </span>
                                   <span className="text-base font-black text-green-400 font-mono">
                                     ${Number(p.monto).toFixed(2)}
                                   </span>
                                 </div>

                                 {/* Fecha y hora */}
                                 {fecha && (
                                   <div className="flex items-center gap-1.5 mb-1.5">
                                     <Clock className="w-3 h-3 text-[var(--text-muted)] shrink-0"/>
                                     <span className="text-xs font-bold text-[var(--text-primary)]">
                                       {fecha.toLocaleDateString('es-EC', { day:'2-digit', month:'2-digit', year:'numeric' })}
                                     </span>
                                     <span className="text-xs text-[var(--text-muted)]">
                                       {fecha.toLocaleTimeString('es-EC', { hour:'2-digit', minute:'2-digit' })}
                                     </span>
                                   </div>
                                 )}

                                 {/* Método de pago (referencia) */}
                                 {p.referencia && (
                                   <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                     <CreditCard className="w-3 h-3 shrink-0"/>
                                     {p.referencia}
                                   </p>
                                 )}

                                 {/* Registrado por */}
                                 {p.nombre_registrador_snapshot && (
                                   <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                                     <User className="w-3 h-3 shrink-0"/>
                                     {p.nombre_registrador_snapshot}
                                   </p>
                                 )}

                                 {/* Notas */}
                                 {p.notas && (
                                   <p className="text-[10px] text-[var(--text-muted)] italic mt-1.5 pt-1.5 border-t border-[var(--border-soft)] line-clamp-2">
                                     {p.notas}
                                   </p>
                                 )}
                               </div>
                             </div>
                           );
                         })}
                       </div>
                     </div>
                   )}
                 </div>

               </div>
             )}
           </div>
         </div>
       )}

    </div>
  );
}
