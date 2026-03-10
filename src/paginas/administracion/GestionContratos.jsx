import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { ClipboardList, Plus, ArrowRight, CheckCircle2, AlertTriangle, Play, Loader2, DollarSign, X, Ban, Search } from 'lucide-react';
import { toast } from 'sonner';
import NuevoContratoView from './Operaciones/NuevoContrato';

// ─── Menú de Navegación Horizontal (igual a Inventario de Trajes) ─────────────
const ModuleNavbar = ({ currentTab, setTab }) => (
  <div className="border-b border-[var(--border-soft)] pb-px mb-8 overflow-x-auto no-scrollbar">
    <nav className="-mb-px flex gap-6">
      <button onClick={() => setTab('nuevo')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${ currentTab === 'nuevo' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]' }`}>
        <Plus className="w-3 h-3" /> Nuevo Contrato
      </button>
      <button onClick={() => setTab('activos')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all ${ currentTab === 'activos' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]' }`}>
        Contratos Activos
      </button>
      <button onClick={() => setTab('problemas')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all ${ currentTab === 'problemas' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]' }`}>
        Con Problemas
      </button>
      <button onClick={() => setTab('historial')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all ${ currentTab === 'historial' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]' }`}>
        Historial
      </button>
    </nav>
  </div>
);

// ─── Sección: Contratos Activos ───────────────────────────────────────────────
const ContratosActivosView = ({ onNuevoContrato }) => {
  const { profile, loading: authLoading } = useAuthStore();
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEntregaOpen, setIsEntregaOpen] = useState(false);
  const [isDevolucionOpen, setIsDevolucionOpen] = useState(false);
  const [isAbonoOpen, setIsAbonoOpen] = useState(false);
  const [isAnularOpen, setIsAnularOpen] = useState(false);
  const [contratoActivo, setContratoActivo] = useState(null);
  const [garantiaForm, setGarantiaForm] = useState('');
  const [notasDevolucion, setNotasDevolucion] = useState('');
  const [montoAbono, setMontoAbono] = useState('');
  const [metodoPagoAbono, setMetodoPagoAbono] = useState('');
  const [motivoAnulacion, setMotivoAnulacion] = useState('');

  const METODOS_PAGO = ['Efectivo', 'Transferencia Bancaria', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Otro'];

  const fetchContratos = async () => {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*, clientes(nombre_completo, identificacion)')
        .eq('tenant_id', profile.tenant_id)
        // Solo contratos activos: reservado o entregado. Nunca pendiente_pago
        .in('estado', ['reservado', 'entregado'])
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setContratos(data);
    } catch (e) {
      toast.error('Error al obtener contratos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && profile?.tenant_id) fetchContratos();
    else if (!authLoading && !profile?.tenant_id) setLoading(false);
  }, [authLoading, profile?.tenant_id]);

  const abrirModalEntrega = (c) => { setContratoActivo(c); setGarantiaForm(c.garantia_fisica || ''); setIsEntregaOpen(true); };
  const abrirModalDevolucion = (c) => { setContratoActivo(c); setNotasDevolucion(''); setIsDevolucionOpen(true); };

  const confirmarEntrega = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('contratos').update({
        estado: 'entregado', saldo_pendiente: 0,
        anticipo_pagado: contratoActivo.total, garantia_fisica: garantiaForm
      }).eq('id', contratoActivo.id);
      if (error) throw error;
      toast.success('Traje Entregado y Saldo Cobrado!');
      setIsEntregaOpen(false);
      fetchContratos();
    } catch { toast.error('No se pudo procesar la entrega'); }
  };

  const confirmarDevolucion = async (estado) => {
    try {
      const { error } = await supabase.from('contratos').update({ estado, notas_internas: notasDevolucion }).eq('id', contratoActivo.id);
      if (error) throw error;
      toast.success(estado === 'devuelto_ok' ? 'Contrato Finalizado Exitosamente' : 'Registrado con Inconvenientes');
      setIsDevolucionOpen(false);
      fetchContratos();
    } catch { toast.error('Error al registrar la devolución'); }
  };

  const registrarAbono = async (e) => {
    e.preventDefault();
    const monto = parseFloat(montoAbono);
    if (!monto || monto <= 0) return toast.error('Ingresa un monto válido');
    try {
      // Insertar en pagos_contrato
      const { data: pago, error: pagoError } = await supabase
        .from('pagos_contrato')
        .insert({
          contrato_id: contratoActivo.id,
          tenant_id: profile.tenant_id,
          monto,
          tipo_pago: 'abono',
          notas: `Abono adicional. Método: ${metodoPagoAbono || 'No especificado'}`,
          registrado_por: profile.id,
          nombre_registrador_snapshot: profile.nombre_completo || 'Empleado',
        })
        .select('id').single();
      if (pagoError) throw pagoError;
      // Insertar en ingresos
      await supabase.from('ingresos').insert({
        tenant_id: profile.tenant_id,
        contrato_id: contratoActivo.id,
        pago_contrato_id: pago.id,
        monto,
        descripcion: `Abono contrato — Método: ${metodoPagoAbono || 'No especificado'}`,
        registrado_por: profile.id,
        nombre_registrador_snapshot: profile.nombre_completo || 'Empleado',
        es_manual: true,
      });
      // Actualizar saldo
      const nuevoAnticipo = (contratoActivo.anticipo_pagado || 0) + monto;
      const nuevoSaldo = Math.max(0, (contratoActivo.total || 0) - nuevoAnticipo);
      await supabase.from('contratos').update({ anticipo_pagado: nuevoAnticipo, saldo_pendiente: nuevoSaldo }).eq('id', contratoActivo.id);
      toast.success(`Abono de $${monto.toFixed(2)} registrado correctamente`);
      setIsAbonoOpen(false);
      setMontoAbono('');
      fetchContratos();
    } catch (err) { toast.error('Error al registrar abono: ' + err.message); }
  };

  const anularContrato = async (e) => {
    e.preventDefault();
    if (!motivoAnulacion.trim()) return toast.error('El motivo de anulación es obligatorio');
    try {
      const { error } = await supabase.from('contratos').update({
        estado: 'cancelado',
        motivo_cancelacion: motivoAnulacion,
        cancelado_en: new Date().toISOString(),
        cancelado_por: profile.id,
      }).eq('id', contratoActivo.id);
      if (error) throw error;
      toast.success('Contrato anulado. El anticipo queda retenido.');
      setIsAnularOpen(false);
      setMotivoAnulacion('');
      fetchContratos();
    } catch (err) { toast.error('Error al anular: ' + err.message); }
  };

  const getStatusBadge = (estado) => {
    const map = {
      reservado:   { cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30',   label: 'Reservado' },
      entregado:   { cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30',       label: 'En Uso' },
      devuelto_ok: { cls: 'bg-green-500/20 text-green-400 border-green-500/30',   label: 'Finalizado' },
      devuelto_con_problemas: { cls: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Incidencia' },
      problemas_resueltos: { cls: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Resuelto' },
    };
    const s = map[estado] || { cls: 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-soft)]', label: estado };
    return (
      <span className={`inline-flex items-center rounded-lg px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] border ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  const getOrigenBadge = (canal) => {
    if (canal === 'online')
      return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20"><ShoppingBag className="w-2.5 h-2.5"/>Tienda Online</span>;
    return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-[var(--bg-surface-2)] text-[var(--text-muted)] border border-[var(--border-soft)]">Manual</span>;
  };

  const filterData = contratos.filter(c =>
    c.codigo_contrato?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.clientes?.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4">
      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative max-w-lg flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            className="input-guambra input-guambra-search w-full"
            placeholder="Buscar por código TX o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={onNuevoContrato} className="btn-guambra-primary !py-3 !px-8 flex items-center gap-3 text-xs">
          <Plus className="h-4 w-4" /> Nuevo Contrato
        </button>
      </div>

      {/* Tabla */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--border-soft)]">
            <thead className="bg-[var(--bg-surface-2)]">
              <tr>
                <th className="py-5 pl-8 pr-4 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Cliente</th>
                <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Fechas</th>
                <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Total / Saldo</th>
                <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Estado</th>
                <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Origen</th>
                <th className="relative py-5 pl-4 pr-8"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {loading ? (
                <tr><td colSpan="6" className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></td></tr>
              ) : filterData.length === 0 ? (
                <tr><td colSpan="6" className="py-12 text-center text-xs text-[var(--text-muted)] tracking-widest uppercase font-bold">No hay contratos activos</td></tr>
              ) : filterData.map((contract) => (
                <tr key={contract.id} className="hover:bg-[var(--bg-surface-2)] transition-all duration-200 group">
                  <td className="whitespace-nowrap py-5 pl-8 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)] group-hover:bg-[var(--color-primary-dim)] group-hover:text-[var(--color-primary)] transition-all">
                        {contract.clientes?.nombre_completo?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-[var(--text-primary)] block">{contract.clientes?.nombre_completo || 'Sin nombre'}</span>
                        <span className="text-[9px] text-[var(--text-muted)] font-mono">{contract.clientes?.identificacion || ''}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5 text-xs text-[var(--text-secondary)] font-bold">
                    <span className="block">{contract.fecha_salida ? new Date(contract.fecha_salida).toLocaleDateString() : '—'}</span>
                    <span className="text-[9px] opacity-60">Dev: {contract.fecha_devolucion ? new Date(contract.fecha_devolucion).toLocaleDateString() : '—'}</span>
                  </td>
                  <td className="px-4 py-5">
                    <span className="text-sm font-black text-[var(--text-primary)]">${Number(contract.total || 0).toFixed(2)}</span>
                    {(contract.saldo_pendiente || 0) > 0 && <span className="block text-[9px] text-red-400 font-bold uppercase">Debe ${Number(contract.saldo_pendiente).toFixed(2)}</span>}
                    {(contract.saldo_pendiente || 0) === 0 && <span className="block text-[9px] text-green-400 font-bold uppercase">Saldo: $0.00</span>}
                  </td>
                  <td className="px-4 py-5">{getStatusBadge(contract.estado)}</td>
                  <td className="px-4 py-5">{getOrigenBadge(contract.canal)}</td>
                  <td className="relative whitespace-nowrap py-5 pl-4 pr-8 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {contract.estado === 'reservado' && (
                        <button onClick={() => abrirModalEntrega(contract)} className="btn-guambra-primary !py-2 !px-3 !text-[9px] inline-flex items-center gap-1">
                          <Play className="h-3 w-3" /> Entregar
                        </button>
                      )}
                      {contract.estado === 'entregado' && (
                        <button onClick={() => abrirModalDevolucion(contract)} className="btn-guambra-secondary !py-2 !px-3 !text-[9px] inline-flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" /> Devolver
                        </button>
                      )}
                      <button onClick={() => { setContratoActivo(contract); setMontoAbono(''); setMetodoPagoAbono(''); setIsAbonoOpen(true); }} className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-all" title="Agregar abono">
                        <DollarSign className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => { setContratoActivo(contract); setMotivoAnulacion(''); setIsAnularOpen(true); }} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all" title="Anular contrato">
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Entrega */}
      {isEntregaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-page)]/80 backdrop-blur-md">
          <div className="glass-card w-full max-w-md p-8 animate-in zoom-in-95">
            <h3 className="text-xl font-black uppercase text-[var(--text-primary)] tracking-tighter mb-4">Procesar Entrega</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-6 font-medium">Al confirmar, declaras que se ha cobrado el saldo restante (${contratoActivo?.saldo_pendiente}).</p>
            <form onSubmit={confirmarEntrega} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Garantía Dejada Por el Cliente</label>
                <input type="text" className="input-guambra" required value={garantiaForm} onChange={e => setGarantiaForm(e.target.value)} placeholder="Ej. Licencia de Conducir, $50 billete..." />
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsEntregaOpen(false)} className="btn-guambra-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-guambra-primary flex-1">Confirmar Entrega</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Devolución */}
      {isDevolucionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-page)]/80 backdrop-blur-md">
          <div className="glass-card w-full max-w-lg p-8 animate-in zoom-in-95">
            <h3 className="text-xl font-black uppercase text-[var(--text-primary)] tracking-tighter mb-4">Registro de Devolución</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Notas de Recepción (Opcional)</label>
                <textarea className="input-guambra min-h-[100px]" value={notasDevolucion} onChange={e => setNotasDevolucion(e.target.value)} placeholder="Describe cualquier daño, quemadura, mancha..." />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-soft)]">
                <button onClick={() => confirmarDevolucion('devuelto_ok')} className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl p-4 transition-all flex flex-col items-center gap-2 group">
                  <CheckCircle2 className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Todo Conforme</span>
                </button>
                <button onClick={() => confirmarDevolucion('devuelto_con_problemas')} disabled={!notasDevolucion || notasDevolucion.length < 5} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl p-4 transition-all flex flex-col items-center gap-2 group disabled:opacity-30">
                  <AlertTriangle className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-center">Registrar Incidencia</span>
                </button>
              </div>
              <button onClick={() => setIsDevolucionOpen(false)} className="w-full text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] uppercase tracking-widest">Cancelar Operación</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar Abono */}
      {isAbonoOpen && contratoActivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-page)]/80 backdrop-blur-md">
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
              <button type="submit" className="flex-1 bg-green-500 text-white font-black uppercase tracking-widest rounded-xl h-12 text-xs flex items-center justify-center gap-2 hover:bg-green-400 transition-all"><CheckCircle2 className="w-4 h-4"/> Registrar</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Anular Contrato */}
      {isAnularOpen && contratoActivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-page)]/80 backdrop-blur-md">
          <form onSubmit={anularContrato} className="glass-card w-full max-w-md p-8 animate-in zoom-in-95 border border-red-500/20">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-6 border border-red-500/30">
              <Ban className="w-7 h-7"/>
            </div>
            <h3 className="text-xl font-black uppercase text-[var(--text-primary)] tracking-tighter mb-1">Anular Contrato</h3>
            <p className="text-xs text-red-300/60 font-medium mb-8">El contrato pasará al historial con estado <strong>Cancelado</strong>. El cliente pierde el 100% del anticipo pagado. Esta acción no se puede deshacer.</p>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2">Motivo de anulación *</label>
              <textarea required rows={4} className="input-guambra resize-none" value={motivoAnulacion} onChange={e => setMotivoAnulacion(e.target.value)} placeholder="Ej: Cliente no se presentó a retirar los trajes..." />
            </div>
            <div className="flex gap-3 mt-8 pt-6 border-t border-[var(--border-soft)]">
              <button type="button" onClick={() => setIsAnularOpen(false)} className="btn-guambra-secondary flex-1">Cancelar</button>
              <button type="submit" className="flex-1 bg-red-500 text-white font-black uppercase tracking-widest rounded-xl h-12 text-xs flex items-center justify-center gap-2 hover:bg-red-600 transition-all"><X className="w-4 h-4"/> Anular Definitivamente</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ─── Sección: Contratos con Problemas ─────────────────────────────────────────
const ContratosProblemasView = () => {
  const { profile, loading: authLoading } = useAuthStore();
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from('contratos')
          .select('*, clientes(nombre_completo)')
          .eq('tenant_id', profile.tenant_id)
          .eq('estado', 'devuelto_con_problemas')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setContratos(data || []);
      } catch { toast.error('Error cargando contratos con problemas'); }
      finally { setLoading(false); }
    };
    if (!authLoading && profile?.tenant_id) fetch();
    else if (!authLoading && !profile?.tenant_id) setLoading(false);
  }, [authLoading, profile?.tenant_id]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : contratos.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4 opacity-60" />
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Sin contratos con incidencias activas</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border-soft)]">
              <thead className="bg-[var(--bg-surface-2)]">
                <tr>
                  <th className="py-5 pl-8 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Ticket</th>
                  <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Cliente</th>
                  <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Notas de Incidencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {contratos.map(c => (
                  <tr key={c.id} className="hover:bg-[var(--bg-surface-2)] transition-all">
                    <td className="py-5 pl-8 font-mono font-black text-red-400 text-sm">{c.codigo_contrato}</td>
                    <td className="px-4 py-5 text-sm font-bold text-[var(--text-primary)]">{c.clientes?.nombre_completo}</td>
                    <td className="px-4 py-5 text-xs text-[var(--text-secondary)]">{c.notas || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Sección: Historial ────────────────────────────────────────────────────────
const HistorialView = () => {
  const { profile, loading: authLoading } = useAuthStore();
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from('contratos')
          .select('*, clientes(nombre_completo)')
          .eq('tenant_id', profile.tenant_id)
          .in('estado', ['devuelto_ok', 'problemas_resueltos'])
          .order('created_at', { ascending: false });
        if (error) throw error;
        setContratos(data || []);
      } catch { toast.error('Error cargando historial'); }
      finally { setLoading(false); }
    };
    if (!authLoading && profile?.tenant_id) fetch();
    else if (!authLoading && !profile?.tenant_id) setLoading(false);
  }, [authLoading, profile?.tenant_id]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : contratos.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Sin contratos finalizados aún</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border-soft)]">
              <thead className="bg-[var(--bg-surface-2)]">
                <tr>
                  <th className="py-5 pl-8 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Ticket</th>
                  <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Cliente</th>
                  <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Total</th>
                  <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Estado Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {contratos.map(c => (
                  <tr key={c.id} className="hover:bg-[var(--bg-surface-2)] transition-all">
                    <td className="py-5 pl-8 font-mono font-black text-primary text-sm">{c.codigo_contrato}</td>
                    <td className="px-4 py-5 text-sm font-bold text-[var(--text-primary)]">{c.clientes?.nombre_completo}</td>
                    <td className="px-4 py-5 text-sm font-black text-[var(--text-primary)]">${c.total}</td>
                    <td className="px-4 py-5">
                      <span className={`inline-flex items-center rounded-lg px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] border ${c.estado === 'devuelto_ok' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'}`}>
                        {c.estado === 'devuelto_ok' ? 'Finalizado' : 'Resuelto'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Componente Principal ──────────────────────────────────────────────────────
const GestionContratos = () => {
  const [currentTab, setCurrentTab] = useState('activos');

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      {/* Menú de Navegación Horizontal */}
      <ModuleNavbar currentTab={currentTab} setTab={setCurrentTab} />

      {/* Contenido según Tab activo */}
      {currentTab === 'nuevo' && <NuevoContratoView onVolver={() => setCurrentTab('activos')} />}
      {currentTab === 'activos' && <ContratosActivosView onNuevoContrato={() => setCurrentTab('nuevo')} />}
      {currentTab === 'problemas' && <ContratosProblemasView />}
      {currentTab === 'historial' && <HistorialView />}
    </div>
  );
};

export default GestionContratos;
