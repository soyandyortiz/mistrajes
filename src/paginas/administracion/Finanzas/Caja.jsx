import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { ArrowRightLeft, ArrowDownCircle, ArrowUpCircle, Banknote, Loader2, Plus, Calendar } from 'lucide-react';
import { toast } from 'sonner';

// Helper: genera string local YYYY-MM-DD
const getLocalDateString = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Helper: genera boundaries de inicio y fin del día en timezone local como ISO strings
const getLocalDayBoundaries = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
};

const Caja = () => {
  const { profile, loading: authLoading } = useAuthStore();
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
   * Fetches today's ingresos and egresos from their respective real tables
   * and merges them into a unified movimientos list for the UI.
   */
  const fetchMovimientos = async () => {
    setLoading(true);
    try {
      const hoy = getLocalDateString();
      const { startISO, endISO } = getLocalDayBoundaries();
      let listaUnificada = [];

      // 1. Fetch ingresos de hoy (column 'registrado_en' is the timestamp)
      const { data: ingresosData, error: errIng } = await supabase
        .from('ingresos')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .gte('registrado_en', startISO)
        .lte('registrado_en', endISO)
        .order('registrado_en', { ascending: false });

      if (errIng && errIng.code !== '42P01') throw errIng;

      // Map ingresos to unified format
      if (ingresosData) {
        listaUnificada.push(...ingresosData.map(ing => ({
          id: ing.id,
          tipo: 'ingreso',
          concepto: ing.descripcion || 'Ingreso registrado',
          monto: Number(ing.monto || 0),
          metodo_pago: ing.metodo_pago || 'Efectivo',
          created_at: ing.registrado_en || ing.created_at,
          fuente: 'ingresos'
        })));
      }

      // 2. Fetch egresos de hoy (solo los de contado/caja)
      const { data: egresosData, error: errEgr } = await supabase
        .from('egresos')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('modalidad', 'contado')
        .gte('fecha_egreso', hoy)
        .lte('fecha_egreso', hoy)
        .order('created_at', { ascending: false });

      if (errEgr && errEgr.code !== '42P01') throw errEgr;

      // Map egresos to unified format
      if (egresosData) {
        listaUnificada.push(...egresosData.map(egr => ({
          id: egr.id,
          tipo: 'egreso',
          concepto: egr.descripcion || 'Egreso de Contado',
          monto: Number(egr.monto_total || 0),
          metodo_pago: egr.metodo_pago || egr.modalidad || 'contado',
          created_at: egr.created_at || egr.fecha_egreso,
          fuente: 'egresos'
        })));
      }

      // 3. Fetch abonos (pagos_egreso) de hoy
      const { data: abonosData, error: errAbo } = await supabase
        .from('pagos_egreso')
        .select('*, egresos(descripcion, categoria)')
        .eq('tenant_id', profile.tenant_id)
        .gte('fecha_pago', hoy)
        .lte('fecha_pago', hoy)
        .order('created_at', { ascending: false });

      if (errAbo && errAbo.code !== '42P01') throw errAbo;

      // Map abonos to unified format
      if (abonosData) {
        listaUnificada.push(...abonosData.map(abono => ({
          id: abono.id,
          tipo: 'egreso',
          concepto: `Cuota/Abono CxP: ${abono.egresos?.descripcion || 'Egreso a crédito'}`,
          monto: Number(abono.monto || 0),
          metodo_pago: abono.referencia || 'Pago de Cuota',
          created_at: abono.created_at || abono.fecha_pago,
          fuente: 'pagos_egreso'
        })));
      }

      // Sort by date descending
      listaUnificada.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setMovimientos(listaUnificada);
    } catch (error) {
      toast.error('Error al cargar movimientos de caja');
      console.error('Error fetchMovimientos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && profile?.tenant_id) fetchMovimientos();
    else if (!authLoading && !profile?.tenant_id) setLoading(false);
  }, [authLoading, profile?.tenant_id]);

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

      <div className="flex justify-between items-center pt-8">
        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)] tracking-widest uppercase">Libro de Transacciones</h2>
        </div>
        <div className="flex gap-4">
            <button onClick={() => { setFormData(prev => ({...prev, tipo: 'egreso'})); setIsModalOpen(true); }} className="px-4 py-2 rounded-xl border border-rose-500/20 text-rose-400 font-bold text-[10px] uppercase tracking-widest hover:bg-rose-500/10 transition-colors flex items-center">
              <ArrowUpCircle className="h-4 w-4 mr-2" /> Extraer
            </button>
            <button onClick={() => { setFormData(prev => ({...prev, tipo: 'ingreso'})); setIsModalOpen(true); }} className="px-4 py-2 rounded-xl bg-green-500/10 text-green-400 font-bold text-[10px] uppercase tracking-widest hover:bg-green-500/20 transition-colors flex items-center border border-green-500/20">
              <ArrowDownCircle className="h-4 w-4 mr-2" /> Inyectar
            </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)] text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">
              <tr>
                <th className="px-6 py-4">Fecha / Hora</th>
                <th className="px-6 py-4">Concepto / Descripción</th>
                <th className="px-6 py-4">Método / Canal</th>
                <th className="px-6 py-4 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {loading ? (
                <tr><td colSpan="4" className="px-6 py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : movimientos.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-12 text-center text-[var(--text-muted)] text-xs tracking-widest uppercase font-bold">Registro Ledger Inactivo Hoy</td></tr>
              ) : (
                movimientos.map((mov) => (
                  <tr key={mov.id} className="hover:bg-[var(--bg-surface-2)] transition-colors group">
                    <td className="px-6 py-4 text-xs font-mono font-bold text-[var(--text-muted)] mb-1">
                       {new Date(mov.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-xs">
                       <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase mr-3 ${mov.tipo === 'ingreso' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                           {mov.tipo}
                       </span>
                       <span className="font-bold text-[var(--text-primary)] tracking-tight">{mov.concepto}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-[var(--bg-surface-3)] border border-[var(--border-soft)] text-[var(--text-secondary)]">
                        {mov.metodo_pago}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
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
