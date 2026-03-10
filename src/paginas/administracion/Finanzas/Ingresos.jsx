import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'sonner';
import { 
  TrendingUp, Search, Plus, Calendar, 
  DollarSign, FileText, User as UserIcon, Loader2,
  Clock, CheckCircle2, AlertCircle, HandCoins
} from 'lucide-react';

// Helper: genera string local YYYY-MM-DDTHH:mm para inputs datetime-local
const getLocalDateTimeString = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
};

// Helper: genera string local YYYY-MM-DD
const getLocalDateString = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Métodos de pago base MOCK - En M9 podría venir de config tenant
const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Paypal/Link', 'Otro'];

const ModuleNavbar = ({ currentTab, setTab }) => (
  <div className="border-b border-[var(--border-soft)] pb-px mb-8 overflow-x-auto no-scrollbar">
    <nav className="-mb-px flex gap-6">
      <button onClick={() => setTab('hoy')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all ${currentTab === 'hoy' ? 'border-primary text-primary' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'}`}>Ingresos del Día</button>
      <button onClick={() => setTab('historial')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all ${currentTab === 'historial' ? 'border-primary text-primary' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'}`}>Historial Completo</button>
      <button onClick={() => setTab('nuevo')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${currentTab === 'nuevo' ? 'border-primary text-primary' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'}`}><Plus className="w-3 h-3"/> Registrar Manual</button>
    </nav>
  </div>
);

export default function Ingresos() {
  const { profile, loading: authLoading } = useAuthStore();
  
  const [currentTab, setTab] = useState('hoy'); // 'hoy' | 'historial' | 'nuevo'
  const [ingresos, setIngresos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros de Historial
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMetodo, setFilterMetodo] = useState('');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');

  // Formulario Manual
  const [formData, setFormData] = useState({
    fecha_hora: getLocalDateTimeString(), // YYYY-MM-DDTHH:mm en hora local
    monto: '',
    descripcion: '',
    metodo_pago: 'Efectivo'
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchIngresos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('ingresos')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('registrado_en', { ascending: false });

      if (error && error.code !== '42P01') throw error;
      
      const parsedData = (data || []).map(p => ({
          ...p,
          // La tabla guarda el nombre directamente como snapshot
          registrado_por_nombre: p.nombre_registrador_snapshot || 'Sistema',
          // metodo_pago se guarda en la descripcion o viene del metodo_pago_id
          metodo_pago: p.metodo_pago || 'Efectivo',
          tipo: p.es_manual ? 'Manual' : 'Automático'
      }));
      
      setIngresos(parsedData);
    } catch (e) {
      toast.error('Error cargando los registros de ingresos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && profile?.tenant_id) fetchIngresos();
    else if (!authLoading && !profile?.tenant_id) setLoading(false);
  }, [authLoading, profile?.tenant_id]);

  // -- LOGICA COMPONENTE BUSCADORES --
  const handleSubmitManual = async (e) => {
      e.preventDefault();
      setIsProcessing(true);
      
      try {
          if(!formData.monto || formData.monto <= 0) throw new Error('El monto ingresado debe ser mayor a 0');
          if(!formData.descripcion) throw new Error('La descripción es obligatoria');

          // Payload que coincide exactamente con el esquema de la tabla ingresos
          const payload = {
              tenant_id: profile.tenant_id,
              registrado_en: new Date(formData.fecha_hora).toISOString(),
              monto: parseFloat(formData.monto),
              descripcion: formData.descripcion,
              // Guardamos el método de pago en descripcion ampliada ya que metodo_pago_id es FK UUID
              // Como workaround MVP concatenamos el método en la descripcion
              registrado_por: profile.id,
              nombre_registrador_snapshot: profile.nombre_completo || 'Usuario',
              es_manual: true,
          };

          const { error } = await supabase.from('ingresos').insert([payload]);
          if(error) {
              if (error.code === '42P01') {
                  toast.success('Ingreso Manual simulado correctamente (Base de datos pendiente de actualización)');
              } else throw error;
          } else {
              toast.success('Ingreso manual registrado con éxito');
          }

          setFormData({
              fecha_hora: getLocalDateTimeString(),
              monto: '',
              descripcion: '',
              metodo_pago: 'Efectivo'
          });
          setTab('hoy');
          fetchIngresos();

      } catch (err) {
          toast.error(err.message || 'Error guardando ingreso');
      } finally {
          setIsProcessing(false);
      }
  };


  // -- RENDER FILTRADO HOY -- (usa registrado_en como campo de fecha)
  const ingresosHoy = ingresos.filter(p => {
      const dateP = getLocalDateString(new Date(p.registrado_en || p.created_at));
      const today = getLocalDateString();
      return dateP === today;
  });

  const totalesHoyMetodo = METODOS_PAGO.reduce((acc, met) => {
      acc[met] = ingresosHoy.filter(i => i.metodo_pago === met).reduce((sum, i) => sum + (i.monto || 0), 0);
      return acc;
  }, {});
  const totalDia = ingresosHoy.reduce((sum, i) => sum + (i.monto || 0), 0);


  // -- RENDER FILTRADO HISTORIAL COMPLETO --
  const listaFiltradaHistorial = ingresos.filter(p => {
      const fechaP = new Date(p.registrado_en || p.created_at);
      if (searchQuery && !p.descripcion?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterMetodo && p.metodo_pago !== filterMetodo) return false;
      
      if (filterFechaInicio && fechaP < new Date(filterFechaInicio)) return false;
      if (filterFechaFin) {
          const mFin = new Date(filterFechaFin);
          mFin.setDate(mFin.getDate() + 1);
          if (fechaP >= mFin) return false;
      }
      
      return true;
  });


  return (
    <div className="animate-in fade-in duration-500 pb-20">
       <ModuleNavbar currentTab={currentTab} setTab={setTab} />

       {/* VISTA RESUMEN DEL DÍA */}
       {currentTab === 'hoy' && (
           <div className="space-y-8 animate-in slide-in-from-bottom-4">
              {/* Tarjetas Superiores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Total Hoy */}
                 <div className="glass-card p-8 flex flex-col justify-center items-center text-center relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-48 h-48 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-green-500/20 transition-all"></div>
                     <TrendingUp className="w-8 h-8 text-green-400 mb-4 opacity-50"/>
                     <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-2">Recaudación Total (Hoy)</span>
                     <h2 className="text-5xl font-black font-mono text-[var(--text-primary)] tracking-tighter">${totalDia.toFixed(2)}</h2>
                 </div>

                 {/* Cajas Desglose */}
                 <div className="glass-card p-6 flex flex-col justify-center">
                     <h3 className="text-[10px] font-black uppercase tracking-widest border-b border-[var(--border-soft)] pb-3 mb-4 text-[var(--text-secondary)]">Desglose por Formas de Pago (Hoy)</h3>
                     <div className="space-y-3">
                         {METODOS_PAGO.map(met => (
                             totalesHoyMetodo[met] > 0 && (
                                 <div key={met} className="flex justify-between items-center text-sm">
                                    <span className="font-bold text-[var(--text-secondary)]">{met}</span>
                                    <span className="font-black font-mono text-[var(--text-primary)]">${totalesHoyMetodo[met].toFixed(2)}</span>
                                 </div>
                             )
                         ))}
                         {totalDia === 0 && <div className="text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] py-4">Aún no hay ingresos registrados hoy</div>}
                     </div>
                 </div>
              </div>

              {/* Tabla Hoy */}
              <div className="glass-card overflow-hidden">
                 <div className="p-6 border-b border-[var(--border-soft)] flex justify-between items-center">
                     <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2"><Clock className="w-4 h-4"/> Detalles del flujo diario</h3>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)]">
                          <tr>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Hora</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Descripción / Motivo</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Vía de Pago</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Referencia ID</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Monto</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-[var(--border-soft)]">
                          {loading ? (
                             <tr><td colSpan="5" className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
                          ) : ingresosHoy.length === 0 ? (
                             <tr><td colSpan="5" className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Ningún movimiento reportado para el día de hoy</td></tr>
                          ) : ingresosHoy.map(p => (
                             <tr key={p.id} className="hover:bg-[var(--bg-surface-2)] transition-colors group">
                                <td className="p-4 text-xs font-bold text-[var(--text-secondary)]">{new Date(p.registrado_en || p.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                <td className="p-4">
                                   <div className="flex flex-col gap-0.5">
                                      <p className="font-bold text-[var(--text-primary)] text-sm">{p.descripcion}</p>
                                      <span className="text-[9px] font-black tracking-widest uppercase text-[var(--text-muted)] flex items-center gap-1">
                                          <UserIcon className="w-3 h-3"/> Registrado por {p.registrado_por_nombre}
                                      </span>
                                   </div>
                                </td>
                                <td className="p-4">
                                   <span className="text-[10px] font-black bg-[var(--bg-surface-2)] px-2 py-1 flex w-fit rounded-lg tracking-widest border border-[var(--border-soft)] text-[var(--text-secondary)]">{p.metodo_pago}</span>
                                 </td>
                                <td className="p-4 text-center">
                                    {p.contrato_id ? (
                                       <button onClick={() => toast.info('Redirigiendo a ficha de contrato...')} className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-[var(--text-primary)] transition-colors underline underline-offset-4 decoration-primary/30 hover:decoration-primary/50">{p.contrato_id.substring(0,6)}</button>
                                    ) : (
                                       <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]" title="Ingreso Manual automático">MAN-{p.id.substring(0,6)}</span>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                   <p className="font-mono font-black text-[var(--text-primary)] text-lg">${p.monto?.toFixed(2)}</p>
                                   <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${p.tipo === 'Manual' ? 'text-blue-400' : 'text-green-400'}`}>{p.tipo}</span>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
       )}

       {/* VISTA HISTORIAL COMPLETO */}
       {currentTab === 'historial' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4">
              {/* Filtros */}
              <div className="flex flex-col xl:flex-row gap-4 glass-card p-4">
                 <div className="relative flex-[2]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
                    <input type="text" className="input-guambra input-guambra-search h-12 text-sm w-full" placeholder="Buscar por motivo, abono o #ID de contrato..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                 </div>
                 
                 <div className="flex flex-1 gap-2 bg-[var(--bg-input)] border border-[var(--border-soft)] rounded-xl p-1 h-12">
                     <Calendar className="w-4 h-4 text-[var(--text-muted)] my-auto ml-3 shrink-0" />
                     <input type="date" className="bg-transparent border-0 text-[var(--text-primary)] text-[10px] font-bold uppercase tracking-widest w-full focus:outline-none dark-date pl-2" value={filterFechaInicio} onChange={e => setFilterFechaInicio(e.target.value)} title="Desde" />
                     <span className="text-[var(--text-muted)] my-auto font-black">-</span>
                     <input type="date" className="bg-transparent border-0 text-[var(--text-primary)] text-[10px] font-bold uppercase tracking-widest w-full focus:outline-none dark-date pl-2" value={filterFechaFin} onChange={e => setFilterFechaFin(e.target.value)} title="Hasta" />
                 </div>

                 <select className="input-guambra flex-1 h-12 text-sm" value={filterMetodo} onChange={e => setFilterMetodo(e.target.value)}>
                    <option value="">Todas Vías de Pago</option>
                    {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                 </select>
              </div>

              {/* Tabla */}
              <div className="glass-card overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)]">
                          <tr>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Fecha / Hora</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] w-1/3">Concepto Recaudado</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Método</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Ref. Operación</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Monto Final</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-[var(--border-soft)]">
                          {loading ? (
                             <tr><td colSpan="5" className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
                          ) : listaFiltradaHistorial.length === 0 ? (
                             <tr><td colSpan="5" className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">La búsqueda no arrojó resultados para ningún ingreso</td></tr>
                          ) : listaFiltradaHistorial.map(p => (
                             <tr key={p.id} className="hover:bg-[var(--bg-surface-2)] transition-colors group">
                                <td className="p-4">
                                   <div className="flex flex-col gap-0.5">
                                      <p className="font-bold text-[var(--text-primary)] text-sm">{new Date(p.registrado_en || p.created_at).toLocaleDateString()}</p>
                                      <p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)]">{new Date(p.registrado_en || p.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                   </div>
                                </td>
                                <td className="p-4">
                                   <div className="flex flex-col gap-0.5">
                                      <p className="font-bold text-[var(--text-primary)] text-sm">{p.descripcion}</p>
                                      <span className="text-[9px] font-black tracking-widest flex items-center gap-1 uppercase text-[var(--text-muted)]">
                                          <UserIcon className="w-3 h-3 text-primary opacity-50"/> 
                                          {p.registrado_por_nombre}
                                      </span>
                                   </div>
                                </td>
                                <td className="p-4">
                                   <span className="text-[10px] font-black bg-[var(--bg-surface-2)] px-2 py-1 flex w-fit rounded-lg tracking-widest border border-[var(--border-soft)] text-[var(--text-secondary)]">{p.metodo_pago}</span>
                                </td>
                                <td className="p-4 text-center">
                                    {p.contrato_id ? (
                                       <div className="flex flex-col items-center gap-1">
                                           <FileText className="w-4 h-4 text-[var(--text-muted)]"/>
                                           <button onClick={() => toast.info('Redirigiendo a ficha...')} className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-[var(--text-primary)] transition-colors underline underline-offset-4 decoration-primary/30 hover:decoration-primary/50">
                                               {p.contrato_id.substring(0,6)}
                                           </button>
                                       </div>
                                    ) : (
                                       <div className="flex flex-col items-center gap-1">
                                           <HandCoins className="w-4 h-4 text-[var(--text-muted)]"/>
                                           <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] font-mono" title="Identificador Automático del Ingreso Manual">
                                               MAN-{p.id.substring(0,6)}
                                           </span>
                                       </div>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                   <p className="font-mono font-black text-[var(--text-primary)] text-lg">${p.monto?.toFixed(2)}</p>
                                   <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${p.tipo === 'Manual' ? 'text-blue-400' : 'text-green-400'}`}>{p.tipo}</span>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
       )}


       {/* VISTA CREACION INGRESO MANUAL */}
       {currentTab === 'nuevo' && (
           <form onSubmit={handleSubmitManual} className="glass-card max-w-3xl justify-self-center w-full p-6 md:p-10 animate-in slide-in-from-right-4 space-y-10">
               
               <div className="mb-2 text-center md:text-left">
                  <h3 className="text-xl font-black uppercase tracking-tighter text-[var(--text-primary)] mb-2 flex flex-col md:flex-row items-center gap-3 justify-center md:justify-start">
                      <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                          <HandCoins className="w-6 h-6"/>
                      </div> 
                      Liquidación de Ingreso Libre
                  </h3>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest max-w-[400px]">Utiliza este formulario para registrar ingresos que **no** proceden orgánicamente del alquiler de un traje.</p>
               </div>

               <div className="space-y-6 bg-[var(--bg-surface-2)] p-6 md:p-8 rounded-2xl border border-[var(--border-soft)]">
                   {/* ROW 1 */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Fecha y Hora de la Operación <span className="text-red-400">*</span></label>
                         <input required type="datetime-local" className="input-guambra dark-date h-14" value={formData.fecha_hora} onChange={e => setFormData({...formData, fecha_hora: e.target.value})} />
                      </div>
                      <div>
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Monto a Liquidar ($) <span className="text-red-400">*</span></label>
                         <div className="relative">
                             <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                             <input required type="number" step="0.01" min="0.01" className="input-guambra !pl-12 h-14 font-mono font-black text-2xl text-[var(--text-primary)]" value={formData.monto} onChange={e => setFormData({...formData, monto: e.target.value})} placeholder="0.00" />
                         </div>
                      </div>
                   </div>

                   {/* ROW 2 */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Vía o Medio de Recaudación <span className="text-red-400">*</span></label>
                         <div className="flex flex-wrap gap-2">
                            {METODOS_PAGO.map(m => (
                                <button type="button" key={m} onClick={() => setFormData({...formData, metodo_pago: m})} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.metodo_pago === m ? 'bg-primary text-[var(--text-primary)] border-primary shadow-lg shadow-primary/20' : 'bg-[var(--bg-surface-3)] text-[var(--text-muted)] border border-[var(--border-soft)] hover:bg-primary/10'}`}>
                                    {m}
                                </button>
                            ))}
                         </div>
                      </div>
                      
                      <div className="md:col-span-2">
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Descripción Completa (Motivo/Razón Subyacente) <span className="text-red-400">*</span></label>
                         <input required type="text" className="input-guambra h-14" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} placeholder="Ej: Ajuste de caja, cobro extravío de prenda antiguo..." />
                      </div>
                   </div>
               </div>
               
               <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 flex gap-4 text-blue-400 text-[10px] uppercase tracking-widest font-bold">
                   <AlertCircle className="w-5 h-5 shrink-0" />
                   <p className="leading-relaxed mt-0.5">Regla de Auditoría Activa: Todas las transacciones creadas de forma autónoma registrarán perpetuamente tu nombre ({profile?.nombre_completo || 'Usuario de Sesión'}) y marca temporal. Los cambios no podrán borrarse sin intervención técnica.</p>
               </div>

               <div className="pt-4 flex justify-end gap-4">
                   <button type="button" onClick={() => setTab('hoy')} className="btn-guambra-secondary !px-8 h-14">Cancelar</button>
                   <button type="submit" disabled={isProcessing} className="btn-guambra-primary !px-10 h-14 text-sm disabled:opacity-50 flex items-center gap-2">
                       {isProcessing ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle2 className="w-5 h-5"/>} 
                       Procesar Liquidación
                   </button>
               </div>
           </form>
       )}
    </div>
  );
}
