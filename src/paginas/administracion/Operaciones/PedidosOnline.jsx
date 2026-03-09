import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'sonner';
import {
  ShoppingBag, Check, X, Search, Calendar,
  Loader2, Eye, MessageCircle, Clock, CheckCircle2,
  AlertCircle, DollarSign, Smartphone, Package, Ban, Settings
} from 'lucide-react';
import TiendaConfiguracion from './TiendaConfiguracion';

const METODOS_PAGO = ['Efectivo', 'Transferencia Bancaria', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Paypal/Link', 'Otro'];

// ─── Sub-navbar interno de Pedidos Online ─────────────────────────────────────
const ModuleNavbar = ({ currentTab, setTab }) => (
  <div className="border-b border-[var(--border-soft)] pb-px mb-8 overflow-x-auto no-scrollbar">
    <nav className="-mb-px flex gap-6">
      <button onClick={() => setTab('pendientes')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${currentTab === 'pendientes' ? 'border-primary text-primary' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'}`}>
        <Clock className="w-3 h-3"/> Pendientes de Pago
      </button>
      <button onClick={() => setTab('historial')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all ${currentTab === 'historial' ? 'border-primary text-primary' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'}`}>
        Historial Online
      </button>
      <button onClick={() => setTab('configuracion')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${currentTab === 'configuracion' ? 'border-primary text-primary' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'}`}>
        <Settings className="w-3 h-3"/> Configuración
      </button>
    </nav>
  </div>
);

export default function PedidosOnline() {
  const { profile, loading: authLoading } = useAuthStore();

  const [currentTab, setTab] = useState('pendientes');
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros Historial
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');

  // Modales
  const [modalType, setModalType] = useState(null); // 'confirmar' | 'rechazar' | 'ver'
  const [pedidoActivo, setPedidoActivo] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Formularios
  const [montoRecibido, setMontoRecibido] = useState('');
  const [metodoPago, setMetodoPago] = useState('Transferencia Bancaria');
  const [motivoRechazo, setMotivoRechazo] = useState('');

  // ─── Carga de pedidos: contratos con canal='online' ─────────────────────────
  const fetchPedidos = async () => {
    setLoading(true);
    try {
      // Los pedidos online son contratos con canal='online'
      // Pendientes = estado 'pendiente_pago'
      // Historial = estados 'reservado' (confirmados) o 'cancelado' (rechazados)
      const { data, error } = await supabase
        .from('contratos')
        .select(`
          id, estado, canal, total, anticipo_pagado, saldo_pendiente,
          fecha_salida, fecha_evento, fecha_devolucion, created_at,
          motivo_cancelacion,
          clientes(nombre_completo, identificacion, whatsapp),
          items_contrato(nombre_item, cantidad_total, precio_unitario)
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('canal', 'online')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPedidos(data || []);
    } catch (e) {
      console.error('Error cargando pedidos online:', e);
      toast.error('Error cargando bandeja de pedidos online');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && profile?.tenant_id) fetchPedidos();
    else if (!authLoading && !profile?.tenant_id) setLoading(false);
  }, [authLoading, profile?.tenant_id]);

  // ─── Helpers de datos ────────────────────────────────────────────────────────
  const getClienteNombre = (p) => p.clientes?.nombre_completo || 'Cliente web';
  const getClienteTelefono = (p) => p.clientes?.whatsapp || '';
  const getProductosResumen = (p) => {
    const items = p.items_contrato || [];
    if (items.length === 0) return 'Sin detalle de productos';
    return items.map(i => `${i.nombre_item}${i.cantidad_total > 1 ? ` ×${i.cantidad_total}` : ''}`).join(' + ');
  };
  const getFechaEntrega = (p) => p.fecha_salida
    ? new Date(p.fecha_salida).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  // ─── Acciones de modal ───────────────────────────────────────────────────────
  const handleConfirmar = (p) => {
    setPedidoActivo(p);
    setMontoRecibido(((p.total || 0) / 2).toFixed(2));
    setMetodoPago('Transferencia Bancaria');
    setModalType('confirmar');
  };

  const handleRechazar = (p) => {
    setPedidoActivo(p);
    setMotivoRechazo('');
    setModalType('rechazar');
  };

  const verDetalle = (p) => {
    setPedidoActivo(p);
    setModalType('ver');
  };

  // ─── Confirmar Pago → cambia a 'reservado', registra pagos_contrato e ingresos
  const procesarConfirmacion = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const rec = parseFloat(montoRecibido);
      if (!rec || rec <= 0) throw new Error('Monto inválido.');
      const mitad = (pedidoActivo.total || 0) / 2;
      if (rec < mitad) {
        if (!window.confirm(`El anticipo ($${rec}) es menor al 50% requerido ($${mitad.toFixed(2)}). ¿Autorizar por excepción?`)) {
          setIsProcessing(false);
          return;
        }
      }

      // 1. Actualizar contrato a 'reservado'
      const { error: updateError } = await supabase
        .from('contratos')
        .update({
          estado: 'reservado',
          anticipo_pagado: rec,
          saldo_pendiente: Math.max(0, (pedidoActivo.total || 0) - rec),
        })
        .eq('id', pedidoActivo.id);
      if (updateError) throw updateError;

      // 2. Insertar en pagos_contrato
      const { data: pago, error: pagoError } = await supabase
        .from('pagos_contrato')
        .insert({
          contrato_id: pedidoActivo.id,
          tenant_id: profile.tenant_id,
          monto: rec,
          tipo_pago: 'anticipo',
          notas: `Anticipo confirmado (pedido online). Método: ${metodoPago}`,
          registrado_por: profile.id,
          nombre_registrador_snapshot: profile.nombre_completo || 'Empleado',
        })
        .select('id')
        .single();
      if (pagoError) throw pagoError;

      // 3. Registrar en ingresos
      const { error: ingresoError } = await supabase
        .from('ingresos')
        .insert({
          tenant_id: profile.tenant_id,
          contrato_id: pedidoActivo.id,
          pago_contrato_id: pago.id,
          monto: rec,
          descripcion: `Anticipo desde tienda online — confirmado por ${profile.nombre_completo || 'Empleado'} — Método: ${metodoPago}`,
          registrado_por: profile.id,
          nombre_registrador_snapshot: profile.nombre_completo || 'Empleado',
          es_manual: false,
        });
      if (ingresoError) throw ingresoError;

      toast.success('¡Pedido confirmado! Pasó a Contratos Activos como Reservado.');

      // WhatsApp al cliente
      const tel = getClienteTelefono(pedidoActivo);
      if (tel) {
        const msg = `Hola ${getClienteNombre(pedidoActivo)}, tu pedido online ha sido confirmado. Registramos tu anticipo de $${rec.toFixed(2)}. ¡Te esperamos el ${getFechaEntrega(pedidoActivo)}! — Mis Trajes`;
        window.open(`https://wa.me/${tel.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
      }

      setModalType(null);
      fetchPedidos();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error confirmando pedido');
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Rechazar pedido → cambia a 'cancelado', envía WhatsApp
  const procesarRechazo = async (e) => {
    e.preventDefault();
    if (!motivoRechazo.trim()) return toast.error('El motivo de rechazo es obligatorio.');
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('contratos')
        .update({
          estado: 'cancelado',
          motivo_cancelacion: motivoRechazo.trim(),
          cancelado_en: new Date().toISOString(),
          cancelado_por: profile.id,
        })
        .eq('id', pedidoActivo.id);
      if (error) throw error;

      toast.error('Pedido rechazado y archivado en historial.');

      // WhatsApp al cliente
      const tel = getClienteTelefono(pedidoActivo);
      if (tel) {
        const msg = `Lo sentimos ${getClienteNombre(pedidoActivo)}, tu pedido online no pudo ser procesado. Motivo: ${motivoRechazo}. Por favor contáctanos para buscar alternativas. — Mis Trajes`;
        window.open(`https://wa.me/${tel.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
      }

      setModalType(null);
      fetchPedidos();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error al rechazar pedido');
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Listas filtradas ────────────────────────────────────────────────────────
  const pendientes = pedidos.filter(p => p.estado === 'pendiente_pago');

  const historial = pedidos.filter(p => {
    if (p.estado === 'pendiente_pago') return false;
    const texto = `${getClienteNombre(p)} ${p.id}`.toLowerCase();
    if (searchQuery && !texto.includes(searchQuery.toLowerCase())) return false;
    if (filterEstado && p.estado !== filterEstado) return false;
    if (filterFechaInicio && new Date(p.created_at) < new Date(filterFechaInicio)) return false;
    if (filterFechaFin) {
      const fin = new Date(filterFechaFin); fin.setDate(fin.getDate() + 1);
      if (new Date(p.created_at) >= fin) return false;
    }
    return true;
  });

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter uppercase mb-2 flex items-center gap-3">
          <ShoppingBag className="w-8 h-8 text-primary"/> Pedidos Online
        </h1>
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">
          Gestión de pedidos recibidos desde la tienda online pública
        </p>
      </div>

      <ModuleNavbar currentTab={currentTab} setTab={setTab} />

      {/* ─── PENDIENTES ─────────────────────────────────────────────────────── */}
      {currentTab === 'pendientes' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">

          {/* Banner con contador */}
          <div className="glass-card bg-primary/5 relative overflow-hidden flex flex-col md:flex-row justify-between items-center p-8 border border-primary/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="relative z-10 w-full mb-4 md:mb-0">
              <h2 className="text-xl font-black uppercase tracking-widest text-[var(--text-primary)] flex items-center gap-3 mb-2">
                <ShoppingBag className="w-6 h-6 text-primary"/> Bandeja de Evaluación
              </h2>
              <p className="text-xs font-bold text-[var(--text-muted)] max-w-lg">
                Pedidos recibidos desde la tienda online sin pago confirmado. Revisa el comprobante, registra el anticipo y convierte a Contrato Activo.
              </p>
            </div>
            <div className="relative z-10 bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl p-4 text-center min-w-[150px]">
              <span className="text-[9px] uppercase tracking-[0.2em] font-black text-[var(--text-muted)] mb-1 block">Esperando</span>
              <span className="text-3xl font-mono font-black text-primary tracking-tighter animate-pulse">{pendientes.length}</span>
            </div>
          </div>

          {/* Tabla */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)]">
                  <tr>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Cliente</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Productos</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Fecha entrega</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Total / Anticipo 50%</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {loading ? (
                    <tr><td colSpan="5" className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
                  ) : pendientes.length === 0 ? (
                    <tr><td colSpan="5" className="p-12 text-center text-xs font-black uppercase tracking-widest text-green-400/50">
                      <CheckCircle2 className="w-8 h-8 text-green-400/20 mx-auto mb-3"/>Inbox limpio — Todo validado.
                    </td></tr>
                  ) : pendientes.map(p => (
                    <tr key={p.id} className="hover:bg-[var(--bg-surface-2)] transition-colors group">
                      <td className="p-4">
                        <p className="font-bold text-[var(--text-primary)] text-sm">{getClienteNombre(p)}</p>
                        {getClienteTelefono(p) && (
                          <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-surface-2)] px-2 py-0.5 rounded mt-1 flex items-center gap-1.5 w-fit">
                            <Smartphone className="w-3 h-3 text-primary opacity-60"/>{getClienteTelefono(p)}
                          </span>
                        )}
                      </td>
                      <td className="p-4 max-w-xs">
                        <span className="text-xs font-bold text-[var(--text-secondary)] line-clamp-2">{getProductosResumen(p)}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-[9px] font-black tracking-widest text-primary/80 uppercase flex flex-col border-l-2 border-primary/40 pl-2">
                          Entrega:
                          <span className="text-[var(--text-primary)] text-xs mt-0.5">{getFechaEntrega(p)}</span>
                        </span>
                        <span className="text-[8px] tracking-widest uppercase text-[var(--text-muted)] flex items-center gap-1 mt-1">
                          <Clock className="w-2 h-2"/> Llegó: {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <p className="font-mono font-black text-[var(--text-primary)] text-lg">${Number(p.total || 0).toFixed(2)}</p>
                        <span className="text-[9px] font-bold text-orange-400 mt-0.5 bg-orange-400/10 px-2 py-0.5 rounded border border-orange-400/20 animate-pulse">
                          Exigir: ${(Number(p.total || 0) / 2).toFixed(2)} (50%)
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => verDetalle(p)} className="p-2.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] transition-all" title="Ver detalle">
                            <Eye className="w-4 h-4"/>
                          </button>
                          <button onClick={() => handleRechazar(p)} className="p-2.5 rounded-lg text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all" title="Rechazar">
                            <X className="w-4 h-4"/>
                          </button>
                          <button onClick={() => handleConfirmar(p)} className="px-4 py-2.5 rounded-lg text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 transition-all flex items-center gap-2">
                            <Check className="w-4 h-4"/> <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Confirmar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── HISTORIAL ──────────────────────────────────────────────────────── */}
      {currentTab === 'historial' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="flex flex-col lg:flex-row gap-4 glass-card p-4">
            <div className="relative flex-[2]">
              <input type="text" className="input-guambra h-12 text-sm" placeholder="Buscar por nombre de cliente..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex flex-1 gap-2 bg-[var(--bg-input)] border border-[var(--border-soft)] rounded-xl p-1 h-12">
              <Calendar className="w-4 h-4 text-[var(--text-muted)] my-auto ml-3 shrink-0" />
              <input type="date" className="bg-transparent border-0 text-[var(--text-primary)] text-[10px] font-bold w-full focus:outline-none pl-2 dark-date" value={filterFechaInicio} onChange={e => setFilterFechaInicio(e.target.value)} />
              <span className="text-[var(--text-muted)] my-auto">-</span>
              <input type="date" className="bg-transparent border-0 text-[var(--text-primary)] text-[10px] font-bold w-full focus:outline-none pl-2 dark-date" value={filterFechaFin} onChange={e => setFilterFechaFin(e.target.value)} />
            </div>
            <select className="input-guambra flex-1 h-12 text-sm font-bold" value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="reservado">Confirmados (Reservado)</option>
              <option value="cancelado">Rechazados (Cancelado)</option>
            </select>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)]">
                  <tr>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Cliente</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Productos</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Fechas</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Resolución</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {loading ? (
                    <tr><td colSpan="5" className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
                  ) : historial.length === 0 ? (
                    <tr><td colSpan="5" className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Sin registros históricos con estos filtros.</td></tr>
                  ) : historial.map(p => (
                    <tr key={p.id} className="hover:bg-[var(--bg-surface-2)] transition-colors opacity-70 hover:opacity-100">
                      <td className="p-4">
                        <p className="font-bold text-[var(--text-primary)] text-sm">{getClienteNombre(p)}</p>
                        <span className="text-[9px] font-mono text-[var(--text-muted)]">{p.clientes?.identificacion || ''}</span>
                      </td>
                      <td className="p-4 max-w-xs">
                        <span className="text-xs font-bold text-[var(--text-secondary)] line-clamp-2">{getProductosResumen(p)}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase block">Entrega: {getFechaEntrega(p)}</span>
                        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Registrado: {new Date(p.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="p-4 text-center">
                        {p.estado === 'reservado' ? (
                          <span className="px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest bg-green-500/10 text-green-400 border border-green-500/20">Confirmado</span>
                        ) : (
                          <div>
                            <span className="px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20">Rechazado</span>
                            {p.motivo_cancelacion && <p className="text-[8px] text-[var(--text-muted)] mt-1 max-w-[150px] truncate">{p.motivo_cancelacion}</p>}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => verDetalle(p)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] transition-all">
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

      {/* ─── CONFIGURACION ────────────────────────────────────────────────────── */}
      {currentTab === 'configuracion' && (
        <div className="animate-in slide-in-from-bottom-4">
          <TiendaConfiguracion />
        </div>
      )}

      {/* ─── MODAL: CONFIRMAR PAGO ───────────────────────────────────────────── */}
      {modalType === 'confirmar' && pedidoActivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <form onSubmit={procesarConfirmacion} className="glass-card w-full max-w-lg p-8 animate-in zoom-in-95 duration-200 border border-green-500/20">
            <div className="w-16 h-16 rounded-3xl bg-green-500/20 text-green-400 flex items-center justify-center mb-6 border border-green-500/30">
              <CheckCircle2 className="w-8 h-8"/>
            </div>
            <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter mb-2">Confirmar Anticipo</h3>
            <p className="text-xs text-[var(--text-muted)] mb-8 font-medium leading-relaxed">
              Total del pedido: <span className="text-[var(--text-primary)] font-mono font-black">${Number(pedidoActivo.total || 0).toFixed(2)}</span>.
              Al confirmar, el pedido pasará a <b>Contratos Activos</b> con estado <b>Reservado</b>.
            </p>
            <div className="space-y-5">
              <div className="bg-[var(--bg-surface-2)] p-5 rounded-2xl border border-[var(--border-soft)]">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
                  <DollarSign className="w-3 h-3"/> Monto del anticipo recibido ($)
                </label>
                <input required type="number" step="0.01" min="1" max={pedidoActivo.total} className="input-guambra font-mono text-2xl" value={montoRecibido} onChange={e => setMontoRecibido(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Método de pago</label>
                <select required className="input-guambra h-14" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                  {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="pt-8 flex justify-end gap-3 border-t border-[var(--border-soft)] mt-8">
              <button type="button" onClick={() => setModalType(null)} className="btn-guambra-secondary">Cancelar</button>
              <button type="submit" disabled={isProcessing} className="bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold uppercase tracking-widest border border-green-500/50 px-8 rounded-xl h-12 text-[10px] flex items-center gap-2 transition-all">
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <MessageCircle className="w-4 h-4"/>}
                {isProcessing ? 'Procesando...' : 'Confirmar y notificar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── MODAL: RECHAZAR ────────────────────────────────────────────────── */}
      {modalType === 'rechazar' && pedidoActivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <form onSubmit={procesarRechazo} className="glass-card w-full max-w-lg p-8 animate-in zoom-in-95 duration-200 border border-red-500/20">
            <div className="w-16 h-16 rounded-3xl bg-red-500/20 text-red-400 flex items-center justify-center mb-6 border border-red-500/30">
              <Ban className="w-8 h-8"/>
            </div>
            <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter mb-2">Rechazar Pedido</h3>
            <p className="text-xs text-red-500 mb-8 font-medium leading-relaxed">
              Esta acción es permanente. El pedido pasará al Historial como <b>Rechazado</b> y se notificará al cliente por WhatsApp.
            </p>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2">
                Motivo del rechazo <span className="text-[var(--text-primary)]">*</span>
              </label>
              <textarea required rows={4} className="input-guambra resize-none" value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} placeholder="Ej: Talla no disponible para la fecha solicitada..."/>
            </div>
            <div className="pt-8 flex justify-end gap-3 border-t border-[var(--border-soft)] mt-8">
              <button type="button" onClick={() => setModalType(null)} className="btn-guambra-secondary">Cancelar</button>
              <button type="submit" disabled={isProcessing} className="bg-red-500 text-white font-bold uppercase tracking-widest px-8 rounded-xl h-12 text-[10px] flex items-center gap-2 transition-all hover:bg-red-600">
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <AlertCircle className="w-4 h-4"/>}
                {isProcessing ? 'Procesando...' : 'Rechazar y notificar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── MODAL: VER DETALLE ─────────────────────────────────────────────── */}
      {modalType === 'ver' && pedidoActivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-card w-full max-w-2xl p-0 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-[var(--border-soft)] flex justify-between items-start bg-primary/5">
              <div>
                <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter mb-1 flex items-center gap-2">
                  <Package className="w-6 h-6 text-primary"/> Detalle del Pedido
                </h3>
                <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--text-muted)] bg-[var(--bg-surface-2)] px-2 py-0.5 rounded border border-[var(--border-soft)]">
                  ID: {pedidoActivo.id?.substring(0, 16)}...
                </span>
              </div>
              <button onClick={() => setModalType(null)} className="p-2 bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="p-8 overflow-y-auto space-y-8">
              {/* Badge de estado */}
              {pedidoActivo.estado !== 'pendiente_pago' && (
                <div className={`p-4 rounded-xl border flex items-center justify-between ${pedidoActivo.estado === 'reservado' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                  <span className="font-black text-lg">{pedidoActivo.estado === 'reservado' ? 'Confirmado → Contratos Activos' : 'Rechazado'}</span>
                  {pedidoActivo.estado === 'reservado' && <span className="font-mono font-black border-l border-green-500/30 pl-4">Anticipo: ${Number(pedidoActivo.anticipo_pagado || 0).toFixed(2)}</span>}
                </div>
              )}
              {pedidoActivo.estado === 'cancelado' && pedidoActivo.motivo_cancelacion && (
                <div className="p-4 bg-[var(--bg-surface-2)] border-l-4 border-red-500 text-sm font-bold text-[var(--text-secondary)]">
                  <span className="text-red-400">Motivo rechazo: </span>{pedidoActivo.motivo_cancelacion}
                </div>
              )}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-[var(--bg-surface-2)] p-4 rounded-xl border border-[var(--border-soft)]">
                  <h4 className="text-[10px] font-black text-[var(--text-muted)] tracking-[0.2em] uppercase mb-3">Cliente</h4>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{getClienteNombre(pedidoActivo)}</p>
                  {getClienteTelefono(pedidoActivo) && <p className="text-xs font-bold text-primary mt-1 flex items-center gap-1"><Smartphone className="w-3 h-3"/> {getClienteTelefono(pedidoActivo)}</p>}
                </div>
                <div className="bg-[var(--bg-surface-2)] p-4 rounded-xl border border-[var(--border-soft)]">
                  <h4 className="text-[10px] font-black text-[var(--text-muted)] tracking-[0.2em] uppercase mb-3">Financiero</h4>
                  <div className="flex justify-between border-b border-[var(--border-soft)] pb-2 mb-2">
                    <span className="text-[9px] uppercase font-bold text-[var(--text-muted)]">Total</span>
                    <span className="text-sm font-black text-[var(--text-primary)] font-mono">${Number(pedidoActivo.total || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[9px] uppercase font-bold text-[var(--text-muted)]">Fecha entrega</span>
                    <span className="text-xs font-bold text-primary">{getFechaEntrega(pedidoActivo)}</span>
                  </div>
                </div>
              </div>
              {/* Items */}
              <div>
                <h4 className="text-[10px] font-black text-[var(--text-muted)] tracking-[0.2em] uppercase mb-3">Productos solicitados</h4>
                <div className="border border-[var(--border-soft)] rounded-xl overflow-hidden bg-[var(--bg-input)]">
                  {pedidoActivo.items_contrato?.length > 0 ? (
                    <table className="w-full text-left">
                      <thead className="bg-[var(--bg-surface-2)] text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest border-b border-[var(--border-soft)]">
                        <tr>
                          <th className="p-3">Producto</th>
                          <th className="p-3 text-center">Cant.</th>
                          <th className="p-3 text-right">Precio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-soft)]">
                        {pedidoActivo.items_contrato.map((it, i) => (
                          <tr key={i}>
                            <td className="p-3 text-xs font-bold text-[var(--text-secondary)]">{it.nombre_item}</td>
                            <td className="p-3 text-center"><span className="bg-[var(--bg-surface-3)] px-2 py-0.5 rounded text-[10px] font-black text-[var(--text-primary)]">{it.cantidad_total}</span></td>
                            <td className="p-3 text-right text-xs font-mono font-bold text-[var(--text-muted)]">${Number(it.precio_unitario || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center text-xs text-[var(--text-muted)]">No hay detalle de productos.</div>
                  )}
                </div>
              </div>
            </div>
            {/* Acciones si es pendiente */}
            {pedidoActivo.estado === 'pendiente_pago' && (
              <div className="p-6 bg-[var(--bg-surface)] border-t border-[var(--border-soft)] flex justify-end gap-3">
                <button onClick={() => { setModalType(null); handleRechazar(pedidoActivo); }} className="btn-guambra-secondary border-red-500/30 text-red-400 hover:bg-red-500/10">Rechazar</button>
                <button onClick={() => { setModalType(null); handleConfirmar(pedidoActivo); }} className="btn-guambra-primary !bg-green-600 border-none shadow-lg shadow-green-600/20">Confirmar Pago</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
