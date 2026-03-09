import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'sonner';
import { 
  Calendar as CalendarIcon, Clock, Edit2, Eye, 
  Trash2, DollarSign, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, XCircle, ShoppingBag, User
} from 'lucide-react';

import { THEME_ESTADOS, obtenerBadgeEstado } from '../../../utils/coreTheme';

export default function Calendario() {
  const { profile, loading: authLoading } = useAuthStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(false);

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
                cliente:clientes(nombre_completo),
                items:items_contrato(nombre_item, cantidad)
             `)
             .eq('tenant_id', profile.tenant_id);
          
          if(error && error.code !== '42P01') throw error;

          let list = data || [];

          // Transformar los datos reales para la UI
          const transformedList = list.map(c => {
              // Convertir fecha UTC a local para graficar correctamente
              const localDate = new Date(c.fecha_salida);
              const fechaIsoLocal = new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
              const horaIsoLocal = c.fecha_salida ? localDate.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit'}) : '00:00';

              // Concatenar nombre de cliente
              const nombreCliente = c.cliente ? (c.cliente.nombre_completo || 'Cliente Sin Nombre') : 'Cliente Desconocido';
              
              // Generar resumen de items
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

  // LOGICA DEL CALENDARIO
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay(); // 0 is Sunday

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  // Ajuste para que la semana empiece en Lunes (Opción UX) o Domingo. Dejaremos Domingo = 0.
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({length: daysInMonth}, (_, i) => i + 1);

  // Obtener contratos del día seleccionado
  const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`;
  
  const contratosDelDia = contratos.filter(c => {
      if(!c.fecha_entrega) return false;
      return c.fecha_entrega === selectedDateStr;
  }).sort((a, b) => (a.hora_entrega || '00:00').localeCompare(b.hora_entrega || '00:00'));

  // ACCIONES RAPIDAS
  const handleAnular = async (c) => {
      if(!confirm(`¿Vedar permanentemente este evento (${c.id})? El contrato pasará a historial y el 100% de los anticipos será retenido como penalidad.`)) return;
      
      try {
          if(!c.id.startsWith('CNT-')) {
              await supabase.from('contratos').update({ estado: 'Cancelado' }).eq('id', c.id);
          }
          toast.success('Renta anulada. Inyectado al pasivo histórico.');
          setContratos(prev => prev.map(p => p.id === c.id ? { ...p, estado: 'Cancelado' } : p));
      } catch (err) {
          toast.error('Grave: Fallo al cancelar contrato');
      }
  };


  return (
    <div className="animate-in fade-in duration-500 pb-20 h-[calc(100vh-100px)] min-h-[800px] flex flex-col">
       
       <div className="mb-6 flex justify-between items-end shrink-0">
           <div>
               <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter uppercase mb-2 flex items-center gap-3"><CalendarIcon className="w-8 h-8 text-primary"/> Radar Logístico</h1>
               <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-40">Semaforización y Despliegue Diario</p>
           </div>
           
           {/* Controles del Navegador Mes */}
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
               
               {/* Dias de la semana Header */}
               <div className="grid grid-cols-7 border-b border-[var(--border-soft)] bg-[var(--bg-surface-2)] shrink-0">
                   {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                       <div key={d} className="p-3 text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{d}</div>
                   ))}
               </div>

               {/* Grid de Dias */}
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
                              className={`border-r border-b border-[var(--border-soft)] p-2 min-h-[120px] transition-all cursor-pointer flex flex-col gap-1 relative overflow-hidden group
                                  ${isSelected ? 'bg-primary/10 border-primary/30' : 'hover:bg-[var(--bg-surface-2)]'}
                              `}
                           >
                               <span className={`text-xs font-black p-1.5 rounded-lg w-8 h-8 flex items-center justify-center mb-1
                                   ${isSelected ? 'bg-primary text-white' : isToday ? 'bg-[var(--bg-surface-3)] text-[var(--text-primary)] border border-[var(--border-soft)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'}
                               `}>
                                   {d}
                               </span>

                               {/* Renderizar Píldoras de Evento */}
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
           <div className="flex-[1] lg:max-w-sm glass-card flex flex-col h-full overflow-hidden p-0 border-primary/20 bg-black/60 shadow-2xl relative">
               
               {/* Efecto de luz lateral */}
               <div className="absolute top-0 right-0 w-full h-32 bg-primary/10 blur-3xl -translate-y-1/2 pointer-events-none"></div>

               <div className="p-6 border-b border-[var(--border-soft)] shrink-0 relative z-10">
                   <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tighter flex items-center justify-between">
                       <span>{selectedDate.toLocaleDateString(undefined, {weekday: 'long'})}</span>
                       <span className="text-primary font-mono bg-primary/10 px-2 py-1 rounded-lg text-lg border border-primary/20">{selectedDate.getDate()}</span>
                   </h2>
                   <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">{selectedDate.toLocaleDateString(undefined, {month: 'long', year: 'numeric'})}</p>
                   
                   <div className="mt-4 flex gap-2">
                       <span className="bg-black/60 border border-[var(--border-soft)] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] flex-1 text-center">
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
                       const anulado = c.estado === 'Cancelado';

                       return (
                           <div key={c.id} className={`bg-[#0f0f11] border border-[var(--border-soft)] rounded-2xl p-4 relative overflow-hidden group transition-all hover:bg-[var(--bg-surface-2)] ${anulado ? 'opacity-40' : ''}`}>
                               {/* Barra Lateral Color Semaforo */}
                               <div className={`absolute top-0 left-0 w-1.5 h-full ${style.badge}`}></div>
                               
                               <div className="flex justify-between items-start mb-2 pl-2">
                                   <span className="text-xs font-mono font-black text-[var(--text-secondary)] bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-soft)] flex items-center gap-1.5"><Clock className="w-3 h-3 text-primary"/> {c.hora_entrega || 'N/D'}</span>
                                   <span className="text-[9px] font-mono tracking-widest text-[var(--text-muted)] uppercase">{c.id}</span>
                               </div>

                               <div className="pl-2">
                                   <p className={`font-bold text-sm text-[var(--text-primary)] line-clamp-1 ${anulado ? 'line-through' : ''}`} title={c.cliente_nombre}>{c.cliente_nombre}</p>
                                   <p className="text-[10px] text-[var(--text-muted)] mt-1 flex items-center gap-1.5 line-clamp-1"><ShoppingBag className="w-3 h-3 shrink-0"/> {c.productos_resumen}</p>
                                   
                                   <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm border inline-block mt-3 ${style.color}`}>
                                       {c.estado}
                                   </span>
                               </div>

                               {/* Action Bar (Hover o siempre visible) */}
                               {!anulado && (
                                   <div className="pt-4 mt-4 border-t border-[var(--border-soft)] flex justify-between gap-1 pl-2">
                                       <button className="flex-1 py-1.5 rounded bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center" title="Añadir Abono">
                                           <DollarSign className="w-3.5 h-3.5"/>
                                       </button>
                                       <button className="flex-1 py-1.5 rounded bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center" title="Editar Contrato">
                                           <Edit2 className="w-3.5 h-3.5"/>
                                       </button>
                                       <button className="flex-1 py-1.5 rounded bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center" title="Inspeccionar">
                                           <Eye className="w-3.5 h-3.5"/>
                                       </button>
                                       <button onClick={() => handleAnular(c)} className="flex-1 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500/50 hover:text-red-400 transition-colors flex items-center justify-center" title="Anular e Incautar Reserva">
                                           <Trash2 className="w-3.5 h-3.5"/>
                                       </button>
                                   </div>
                               )}
                           </div>
                       )
                   })}
               </div>

               {/* Footer panel rapido */}
               <div className="p-4 bg-[var(--bg-surface-2)] border-t border-[var(--border-soft)] shrink-0 text-center">
                   <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Atención: Anular un contrato retiene el 100% como comisión de lucro cesante.</p>
               </div>
           </div>
       </div>

    </div>
  );
}
