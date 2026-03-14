import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { ArrowRightLeft, ArrowDownCircle, ArrowUpCircle, Banknote, Loader2, Plus, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

// Helper: genera string local YYYY-MM-DD
const getLocalDateString = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Helper: genera boundaries de inicio y fin del día en timezone local como ISO strings
const getLocalDayBoundaries = (dateStr = null) => {
  const ref = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0);
  const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
};

const shiftDate = (dateStr, days) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const Caja = () => {
  const { profile, loading: authLoading } = useAuthStore();
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const isToday = selectedDate === getLocalDateString();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [formData, setFormData] = useState({
    tipo: 'ingreso',
    monto: 0,
    concepto: '',
    metodo_pago: 'Efectivo',
    fecha: new Date().toISOString().split('T')[0]
  });

  /**
   * Fetches ingresos and egresos for the selected date from their respective tables
   * and merges them into a unified movimientos list for the UI.
   * Each sub-query is wrapped independently so a single failure doesn't blank the whole view.
   */
  const fetchMovimientos = async () => {
    setLoading(true);
    const hoy = selectedDate;
    const { startISO, endISO } = getLocalDayBoundaries(hoy);
    let listaUnificada = [];

    // 1. Ingresos del día
    try {
      const { data: ingresosData, error: errIng } = await supabase
        .from('ingresos')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .gte('registrado_en', startISO)
        .lte('registrado_en', endISO)
        .order('registrado_en', { ascending: false });

      if (errIng && errIng.code !== '42P01') throw errIng;

      if (ingresosData && ingresosData.length > 0) {
        const pagoIds = ingresosData.map(i => i.pago_contrato_id).filter(Boolean);
        const contratoIds = ingresosData.map(i => i.contrato_id).filter(Boolean);
        let pagosMap = {};
        let contratosMap = {};

        if (pagoIds.length > 0) {
          const { data: pagosRef } = await supabase.from('pagos_contrato').select('id, referencia').in('id', pagoIds);
          if (pagosRef) pagosMap = pagosRef.reduce((acc, p) => { acc[p.id] = p.referencia; return acc; }, {});
        }
        if (contratoIds.length > 0) {
          const { data: contratosRef } = await supabase.from('contratos').select('id, codigo').in('id', contratoIds);
          if (contratosRef) contratosMap = contratosRef.reduce((acc, c) => { acc[c.id] = c.codigo; return acc; }, {});
        }

        listaUnificada.push(...ingresosData.map(ing => ({
          id: ing.id,
          tipo: 'ingreso',
          concepto: ing.descripcion || 'Ingreso registrado',
          monto: Number(ing.monto || 0),
          metodo_pago: pagosMap[ing.pago_contrato_id] || (ing.es_manual ? 'Manual/Otro' : '—'),
          contrato_id: contratosMap[ing.contrato_id] || ing.contrato_id,
          created_at: ing.registrado_en || ing.created_at,
          fuente: 'ingresos'
        })));
      }
    } catch (e) {
      console.warn('[Caja] Error al cargar ingresos:', e);
    }

    // 2. Egresos de contado del día
    try {
      const { data: egresosData, error: errEgr } = await supabase
        .from('egresos')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('modalidad', 'contado')
        .gte('fecha_egreso', hoy)
        .lte('fecha_egreso', hoy)
        .order('created_at', { ascending: false });

      if (errEgr && errEgr.code !== '42P01') throw errEgr;

      if (egresosData) {
        listaUnificada.push(...egresosData.map(egr => ({
          id: egr.id,
          tipo: 'egreso',
          concepto: egr.descripcion || 'Egreso de Contado',
          monto: Number(egr.monto_total || 0),
          metodo_pago: egr.modalidad || 'Contado',
          created_at: egr.created_at || egr.fecha_egreso,
          fuente: 'egresos'
        })));
      }
    } catch (e) {
      console.warn('[Caja] Error al cargar egresos:', e);
    }

    // 3. Abonos a CxP (pagos_egreso) del día
    try {
      const { data: abonosData, error: errAbo } = await supabase
        .from('pagos_egreso')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .gte('fecha_pago', hoy)
        .lte('fecha_pago', hoy)
        .order('created_at', { ascending: false });

      if (errAbo && errAbo.code !== '42P01') throw errAbo;

      if (abonosData) {
        listaUnificada.push(...abonosData.map(abono => ({
          id: abono.id,
          tipo: 'egreso',
          concepto: `Cuota/Abono CxP: ${abono.referencia || 'Pago de cuota'}`,
          monto: Number(abono.monto || 0),
          metodo_pago: abono.referencia || 'Pago de Cuota',
          created_at: abono.created_at || abono.fecha_pago,
          fuente: 'pagos_egreso'
        })));
      }
    } catch (e) {
      console.warn('[Caja] Error al cargar abonos CxP:', e);
    }

    listaUnificada.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setMovimientos(listaUnificada);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && profile?.tenant_id) fetchMovimientos();
    else if (!authLoading && !profile?.tenant_id) setLoading(false);
  }, [authLoading, profile?.tenant_id, selectedDate]);

  /**
   * Handles submitting a new manual transaction.
   * Inserts into 'ingresos' or 'egresos' table depending on the type.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const montoNum = parseFloat(formData.monto);
      if (montoNum <= 0) throw new Error('El monto debe ser mayor a cero.');
      if (!formData.concepto.trim()) throw new Error('Debe ingresar un concepto.');

      if (formData.tipo === 'ingreso') {
        // Insert into ingresos table (using real column names)
        const payload = {
          tenant_id: profile.tenant_id,
          registrado_en: new Date().toISOString(),
          monto: montoNum,
          descripcion: formData.concepto,
          registrado_por: profile.id,
          nombre_registrador_snapshot: profile.nombre_completo || 'Usuario',
          es_manual: true
        };

        const { error } = await supabase.from('ingresos').insert([payload]);

        if (error) {
          if (error.code === '42P01') {
            // Table doesn't exist yet - show local mock
            const mockItem = {
              id: `mock_${Date.now()}`,
              tipo: 'ingreso',
              concepto: formData.concepto,
              monto: montoNum,
              metodo_pago: formData.metodo_pago,
              created_at: new Date().toISOString(),
              fuente: 'ingresos'
            };
            setMovimientos(prev => [mockItem, ...prev]);
            toast.success('Ingreso registrado localmente (Tabla pendiente de migración)');
          } else {
            throw error;
          }
        } else {
          toast.success('Ingreso registrado exitosamente');
          fetchMovimientos();
        }
      } else {
        // Insert into egresos table
        const payload = {
          tenant_id: profile.tenant_id,
          fecha_egreso: getLocalDateString(),
          categoria: 'otros',
          modalidad: 'contado',
          descripcion: formData.concepto,
          monto_total: montoNum,
          monto_pagado: montoNum,
          estado_deuda: 'pagado',
          registrado_por: profile.id,
          nombre_registrador_snapshot: profile.nombre_completo || 'Usuario'
        };

        const { error } = await supabase.from('egresos').insert([payload]);

        if (error) {
          if (error.code === '42P01') {
            const mockItem = {
              id: `mock_${Date.now()}`,
              tipo: 'egreso',
              concepto: formData.concepto,
              monto: montoNum,
              metodo_pago: formData.metodo_pago,
              created_at: new Date().toISOString(),
              fuente: 'egresos'
            };
            setMovimientos(prev => [mockItem, ...prev]);
            toast.success('Egreso registrado localmente (Tabla pendiente de migración)');
          } else {
            throw error;
          }
        } else {
          toast.success('Egreso registrado exitosamente');
          fetchMovimientos();
        }
      }
      
      setIsModalOpen(false);
      setFormData({ tipo: 'ingreso', monto: 0, concepto: '', metodo_pago: 'Efectivo', fecha: new Date().toISOString().split('T')[0] });
    } catch (error) {
       toast.error(error.message || 'Gasto o Ingreso no pudo ser registrado');
       console.error('Error handleSubmit:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const ingresosHoy = movimientos.filter(m => m.tipo === 'ingreso').reduce((a, b) => a + Number(b.monto), 0);
  const egresosHoy = movimientos.filter(m => m.tipo === 'egreso').reduce((a, b) => a + Number(b.monto), 0);
  const balanceHoy = ingresosHoy - egresosHoy;

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center sm:hidden mb-10">
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter uppercase flex items-center gap-3">
             <Banknote className="h-8 w-8 text-primary" /> Caja Fuerte
          </h1>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-8 border-t-2 border-t-primary rounded-t-none group">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] block mb-2">Resumen de Caja</span>
              <h3 className="text-4xl font-black tracking-tighter text-[var(--text-primary)] group-hover:text-primary transition-colors">${balanceHoy.toFixed(2)}</h3>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2 flex items-center gap-2">
                 <Calendar className="h-3 w-3" /> Saldo Líquido Hoy
              </p>
          </div>
          <div className="glass-card p-6 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><ArrowDownCircle className="h-20 w-20 text-green-500" /></div>
              <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest block mb-1">Entrantes / Ventas</span>
              <h3 className="text-2xl font-black tracking-tighter text-[var(--text-primary)]">${ingresosHoy.toFixed(2)}</h3>
          </div>
          <div className="glass-card p-6 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><ArrowUpCircle className="h-20 w-20 text-rose-500" /></div>
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block mb-1">Salientes / Gastos</span>
              <h3 className="text-2xl font-black tracking-tighter text-[var(--text-primary)]">${egresosHoy.toFixed(2)}</h3>
          </div>
      </div>

      {/* Navegador de Fecha */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-8">
        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)] tracking-widest uppercase">Libro de Transacciones</h2>
          {!isToday && (
            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Vista histórica — no son datos de hoy
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Navegador de días */}
          <div className="flex items-center bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-xl p-1 gap-1">
            <button
              onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
              className="w-8 h-8 rounded-lg hover:bg-[var(--bg-surface-3)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              max={getLocalDateString()}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent border-0 text-[var(--text-primary)] text-[11px] font-bold uppercase tracking-widest focus:outline-none dark-date px-1 w-32"
            />
            <button
              onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
              disabled={isToday}
              className="w-8 h-8 rounded-lg hover:bg-[var(--bg-surface-3)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(getLocalDateString())}
              className="px-3 py-2 rounded-xl bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-widest hover:bg-primary/20 transition-colors border border-primary/20"
            >
              Hoy
            </button>
          )}
          {isToday && (
            <>
              <button onClick={() => { setFormData(prev => ({...prev, tipo: 'egreso'})); setIsModalOpen(true); }} className="px-4 py-2 rounded-xl border border-rose-500/20 text-rose-400 font-bold text-[10px] uppercase tracking-widest hover:bg-rose-500/10 transition-colors flex items-center">
                <ArrowUpCircle className="h-4 w-4 mr-2" /> Extraer
              </button>
              <button onClick={() => { setFormData(prev => ({...prev, tipo: 'ingreso'})); setIsModalOpen(true); }} className="px-4 py-2 rounded-xl bg-green-500/10 text-green-400 font-bold text-[10px] uppercase tracking-widest hover:bg-green-500/20 transition-colors flex items-center border border-green-500/20">
                <ArrowDownCircle className="h-4 w-4 mr-2" /> Inyectar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="glass-card overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)] text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-4 w-20">Hora</th>
                <th className="px-4 py-4">Motivo / Concepto</th>
                <th className="px-4 py-4">Vía de Pago</th>
                <th className="px-4 py-4 hidden md:table-cell">Contrato</th>
                <th className="px-4 py-4 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : movimientos.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-[var(--text-muted)] text-xs tracking-widest uppercase font-bold">Sin movimientos para {isToday ? 'hoy' : selectedDate}</td></tr>
              ) : (
                movimientos.map((mov) => (
                  <tr key={mov.id} className="hover:bg-[var(--bg-surface-2)] transition-colors group">
                    <td className="px-4 py-4">
                      <span className="text-xs font-mono font-black text-[var(--text-muted)]">
                        {new Date(mov.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs">
                       <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase mr-2 ${mov.tipo === 'ingreso' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                           {mov.tipo}
                       </span>
                       <span className="font-bold text-[var(--text-primary)] tracking-tight">{mov.concepto}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-[var(--bg-surface-3)] border border-[var(--border-soft)] text-[var(--text-secondary)]">
                        {mov.metodo_pago || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      {mov.contrato_id ? (
                        <span className="text-[9px] font-mono text-[var(--text-muted)] bg-[var(--bg-surface-3)] border border-[var(--border-soft)] px-2 py-1 rounded">
                          {mov.contrato_id}
                        </span>
                      ) : (
                        <span className="text-[9px] text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                       <span className={`text-lg font-black tracking-tighter ${mov.tipo === 'ingreso' ? 'text-green-400' : 'text-rose-400'}`}>
                           {mov.tipo === 'ingreso' ? '+' : '-'}${Number(mov.monto).toFixed(2)}
                       </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-surface-1)] backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--bg-surface-1)] border border-[var(--border-soft)] w-full max-w-md p-6 sm:p-8 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tighter mb-2">Asiento Contable</h3>
            <p className="text-xs text-[var(--text-muted)] mb-8 font-medium">Registrar operación fuera del flujo estándar de contratos.</p>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Naturaleza</label>
                    <select className="input-guambra !h-12" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                        <option value="ingreso">Ingreso (+)</option>
                        <option value="egreso">Egreso (-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Monto ($)</label>
                    <input required type="number" step="0.01" min="0.01" className="input-guambra !h-12 text-lg font-black" value={formData.monto} onChange={e => setFormData({...formData, monto: e.target.value})} placeholder="0.00" />
                  </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Canal de Pago</label>
                <select className="input-guambra !h-12" value={formData.metodo_pago} onChange={e => setFormData({...formData, metodo_pago: e.target.value})}>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                    <option value="Tarjeta de Débito">Tarjeta de Débito</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Descripción / Concepto</label>
                <input required type="text" className="input-guambra !h-12" value={formData.concepto} onChange={e => setFormData({...formData, concepto: e.target.value})} placeholder="Ej. Pago a proveedor, Venta Extra..." />
              </div>
              
              <div className="pt-6 flex justify-end gap-3 border-t border-[var(--border-soft)]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-[var(--border-soft)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all">Cancelar</button>
                <button type="submit" disabled={isProcessing} className="btn-guambra-primary !h-12 disabled:opacity-50 min-w-[150px]">
                    {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Confirmar Asiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Caja;
