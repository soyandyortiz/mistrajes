import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'sonner';
import { 
  Lock, Search, Calendar, Eye, Loader2, 
  CheckCircle2, AlertCircle, DollarSign, Wallet,
  TrendingDown, TrendingUp, ChevronRight
} from 'lucide-react';

// Helper: genera boundaries de inicio y fin del día en timezone local como ISO strings
const getLocalDayBoundaries = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { startISO: start.toISOString(), endISO: end.toISOString(), localDate: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}` };
};

const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Paypal/Link', 'Otro'];
const CATEGORIAS_EGRESO = [
    { label: 'Pago a proveedores', value: 'pago_proveedor' },
    { label: 'Pago a empleados', value: 'pago_empleado' },
    { label: 'Arriendo de local', value: 'arriendo' },
    { label: 'Servicios básicos', value: 'servicios' },
    { label: 'Otros / Varios', value: 'otros' }
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
  
  const [currentTab, setTab] = useState(initialTab); // 'dia' | 'historial' | 'ver'
  const [loading, setLoading] = useState(false);

  // Data M10-S1 (Día Actual)
  const [ingresosHoy, setIngresosHoy] = useState([]);
  const [egresosHoy, setEgresosHoy] = useState([]);
  const [cierreHoyRegistrado, setCierreHoyRegistrado] = useState(false);
  
  // Data M10-S2 (Historial)
  const [cierres, setCierres] = useState([]);
  const [cierreActivo, setCierreActivo] = useState(null); // Para 'ver'

  // Filtros Historial
  const [filtroTipoList, setFiltroTipoList] = useState('dia'); // dia, semana, mes, año
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');

  // Estados modal cierre
  const [esCerrando, setEsCerrando] = useState(false);
  const [montoFisico, setMontoFisico] = useState('');
  const [saldoAnterior, setSaldoAnterior] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { startISO, endISO, localDate: hoyISO } = getLocalDayBoundaries();

      // 1. Obtener Cierres en BD (Usando el nombre plural 'cierres_caja')
      const { data: cierresData, error: errC } = await supabase.from('cierres_caja')
        .select('*, perfiles_usuario(nombre_completo)')
        .eq('tenant_id', profile.tenant_id)
        .order('fecha_cierre', { ascending: false });

      if (errC && errC.code !== '42P01') throw errC;
      
      const cierresLista = (cierresData || []).map(c => ({
          ...c,
          fecha: c.fecha_cierre, // Normalizar para compatibilidad si antes usaba 'fecha'
          registrado_por_nombre: c.perfiles_usuario?.nombre_completo || 'Sistema'
      }));
      setCierres(cierresLista);

      const yaCerradoHoy = cierresLista.some(c => c.fecha_cierre === hoyISO);
      setCierreHoyRegistrado(yaCerradoHoy);

      // Obtener el saldo acumulado del último cierre para calcular el nuevo saldo acumulado
      if (cierresLista.length > 0) {
          setSaldoAnterior(cierresLista[0].saldo_acumulado || 0);
      }

      // Si ya cerró, no cargamos operaciones del día al vivo (se bloquea).
      // Solo cargamos si NO está cerrado DENTRO DEL FRONTEND.
      let listIngresos = [];
      let listEgresos = [];
      
      if (!yaCerradoHoy) {
          // 2. Ingresos de hoy (usando boundaries locales)
          const { data: ingData, error: errI } = await supabase.from('ingresos')
             .select('*').eq('tenant_id', profile.tenant_id).gte('registrado_en', startISO).lte('registrado_en', endISO);
          if (errI && errI.code !== '42P01') throw errI;
          listIngresos = ingData || [];

          // 3. Egresos (De modalidades de caja/contado) hoy
          const { data: egData, error: errE } = await supabase.from('egresos')
             .select('*').eq('tenant_id', profile.tenant_id).eq('modalidad', 'contado').gte('fecha_egreso', hoyISO).lte('fecha_egreso', hoyISO);
          if (errE && errE.code !== '42P01') throw errE;
          listEgresos = egData || [];

          // 4. Abonos o Cuotas (pagos_egreso) hoy
          const { data: abonosData, error: errA } = await supabase.from('pagos_egreso')
             .select('*, egresos(categoria)').eq('tenant_id', profile.tenant_id).gte('fecha_pago', hoyISO).lte('fecha_pago', hoyISO);
          if (errA && errA.code !== '42P01') throw errA;
          
          if (abonosData) {
              const mappedAbonos = abonosData.map(ab => ({
                  ...ab,
                  monto_total: ab.monto,
                  categoria: ab.egresos?.categoria || 'otros'
              }));
              listEgresos = [...listEgresos, ...mappedAbonos];
          }
      }

      setIngresosHoy(listIngresos);
      setEgresosHoy(listEgresos);

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


  // --- CÁLCULOS DÍA ACTUAL ---
  const totalIn = ingresosHoy.reduce((acc, i) => acc + (i.monto || i.monto_recibido || 0), 0); // M6 o M1
  const totalOut = egresosHoy.reduce((acc, i) => acc + (i.monto_total || 0), 0); // M7
  const balanceDia = totalIn - totalOut;

  // Cajas desglose
  const ingresosPorMetodo = METODOS_PAGO.reduce((acc, met) => {
      acc[met] = ingresosHoy.filter(i => i.metodo_pago === met).reduce((sum, i) => sum + (i.monto || 0), 0);
      return acc;
  }, {});

  const egresosPorCat = CATEGORIAS_EGRESO.reduce((acc, catItem) => {
      acc[catItem.value] = egresosHoy.filter(i => i.categoria === catItem.value).reduce((sum, i) => sum + (i.monto_total || 0), 0);
      return acc;
  }, {});


   // --- ACCION CERRAR CAJA ---
   const ejecutarCierreDario = async () => {
       const montoFisicoNum = parseFloat(montoFisico) || 0;
       const diferencia = montoFisicoNum - balanceDia;
       const nuevoSaldoAcumulado = saldoAnterior + balanceDia;

       if(!confirm(`¿Estás totalmente seguro? 
Resultado del cuadre: ${diferencia === 0 ? '✓ PERFECTO' : diferencia > 0 ? `⚠ SOBRANTE ($${diferencia.toFixed(2)})` : `✗ FALTANTE ($${Math.abs(diferencia).toFixed(2)})`}

Esto archiva el balance y bloquea adición o edición retroactiva para todos los movimientos vinculados al día actual.`)) return;
       setEsCerrando(true);
       
       try {
            const payload = {
                 tenant_id: profile.tenant_id,
                 fecha_cierre: new Date().toISOString().split('T')[0],
                 total_ingresos: totalIn,
                 total_egresos: totalOut,
                 monto_efectivo: ingresosPorMetodo['Efectivo'] || 0,
                 monto_transferencia: ingresosPorMetodo['Transferencia'] || 0,
                 monto_otros: totalIn - (ingresosPorMetodo['Efectivo'] || 0) - (ingresosPorMetodo['Transferencia'] || 0),
                 monto_fisico_contado: montoFisicoNum,
                 diferencia: diferencia,
                 saldo_acumulado: nuevoSaldoAcumulado,
                 cerrado_por: profile.id,
                 nombre_cerrador_snapshot: profile.nombre_completo || 'Usuario'
            };

            const { error } = await supabase.from('cierres_caja').insert([payload]);
            if(error) {
                throw error;
            } else {
                toast.success('El archivo fiscal del día se ha sellado correctamente');
            }

            setCierreHoyRegistrado(true);
            setIngresosHoy([]);
            setEgresosHoy([]);
            fetchData(); // Recargar historial

       } catch (err) {
            toast.error(err.message || 'Fallo contable emitiendo cierre de caja');
       } finally {
            setEsCerrando(false);
       }
   };


  // --- LOGICA FILTRADO HISTORIAL ---
  const dateObj = new Date();
  const diaSemana = dateObj.getDay(); 
  const diffSemana = dateObj.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
  const inicioSemana = new Date(dateObj.setDate(diffSemana)); // Lunes local
  
  const filtarCierres = (c) => {
      const fechaCierre = new Date(c.fecha + 'T00:00:00Z');
      const timeCierre = fechaCierre.getTime();
      const nHoy = new Date().getTime();

      // Rango especifico
      if (filterFechaInicio && timeCierre < new Date(filterFechaInicio + 'T00:00:00Z').getTime()) return false;
      if (filterFechaFin && timeCierre > new Date(filterFechaFin + 'T23:59:59Z').getTime()) return false;

      // Filtro rapido radiobuttons
      if (filtroTipoList === 'dia') { /* Todos listados (O hoy si quisieras) */ }
      if (filtroTipoList === 'semana' && timeCierre < inicioSemana.getTime()) return false;
      if (filtroTipoList === 'mes' && (fechaCierre.getMonth() !== new Date().getMonth() || fechaCierre.getFullYear() !== new Date().getFullYear())) return false;
      if (filtroTipoList === 'anio' && fechaCierre.getFullYear() !== new Date().getFullYear()) return false;
      
      return true;
  };

  const historialListado = cierres.filter(filtarCierres);

  // Stats Historial
  const hTotIn = historialListado.reduce((sum, i) => sum + i.total_ingresos, 0);
  const hTotOut = historialListado.reduce((sum, i) => sum + i.total_egresos, 0);
  const hBalance = historialListado.reduce((sum, i) => sum + i.balance, 0);


  return (
    <div className="animate-in fade-in duration-500 pb-20">
       <div className="mb-8">
        <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter uppercase mb-2 flex items-center gap-3"><Wallet className="w-8 h-8 text-primary"/> Arqueo de Caja</h1>
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">Validación de Efectivo y Saldos</p>
       </div>
       
       <ModuleNavbar currentTab={currentTab} setTab={setTab} />

       {/* VISTA DEL DÍA */}
       {currentTab === 'dia' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4">
              
              {cierreHoyRegistrado ? (
                  <div className="glass-card bg-red-500/5 relative overflow-hidden flex flex-col justify-center items-center p-16 border border-red-500/20 text-center animate-in zoom-in-95">
                      <div className="w-20 h-20 rounded-3xl bg-red-500/20 text-red-400 flex items-center justify-center mb-6 border border-red-500/30">
                          <Lock className="w-10 h-10"/>
                      </div>
                      <h2 className="text-2xl font-black uppercase tracking-widest text-[var(--text-primary)] mb-2">Operaciones del Día Selladas</h2>
                      <p className="text-sm font-bold text-[var(--text-muted)] max-w-lg mb-8">El comprobante Z de caja general correspondiente a hoy ya fue tramitado y sellado criptográficamente por auditoría. Dirígete a Historial para revisarlo.</p>
                      
                      <button onClick={() => setTab('historial')} className="btn-guambra-primary bg-red-500/20 border-none text-red-400 hover:bg-red-500/30">Explorar Registro Z del Día</button>
                  </div>
              ) : (
                  <>
                      {/* STATS PRINCIPALES */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="glass-card p-6 border-b-4 border-b-green-500/50 hover:-translate-y-1 transition-transform cursor-default relative overflow-hidden group">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-green-500/20 transition-all"></div>
                             <div className="flex items-center gap-2 text-green-400 mb-4 relative z-10"><TrendingUp className="w-5 h-5"/> <span className="text-[10px] font-black tracking-widest uppercase">Entradas Acumuladas</span></div>
                             <h3 className="text-4xl font-mono font-black text-[var(--text-primary)] relative z-10">${totalIn.toFixed(2)}</h3>
                         </div>
                         <div className="glass-card p-6 border-b-4 border-b-orange-500/50 hover:-translate-y-1 transition-transform cursor-default relative overflow-hidden group">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-orange-500/20 transition-all"></div>
                             <div className="flex items-center gap-2 text-orange-400 mb-4 relative z-10"><TrendingDown className="w-5 h-5"/> <span className="text-[10px] font-black tracking-widest uppercase">Salidas / Gastos</span></div>
                             <h3 className="text-4xl font-mono font-black text-[var(--text-primary)] relative z-10">-${totalOut.toFixed(2)}</h3>
                         </div>
                         <div className="glass-card p-6 border-b-4 border-b-primary hover:-translate-y-1 transition-transform cursor-default relative overflow-hidden group bg-primary/5">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 transition-all"></div>
                             <div className="flex items-center gap-2 text-primary mb-4 relative z-10"><DollarSign className="w-5 h-5"/> <span className="text-[10px] font-black tracking-widest uppercase">Balance / Caja Líquida Final</span></div>
                             <h3 className="text-4xl font-mono font-black text-[var(--text-primary)] relative z-10 flex items-center gap-3">
                                 $ {balanceDia.toFixed(2)}
                             </h3>
                         </div>
                      </div>

                      {/* DESGLOSE POR CATEGORÍA */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          
                          {/* Modulo Ingresos */}
                          <div className="glass-card p-0 overflow-hidden">
                              <h4 className="text-[10px] font-black uppercase tracking-widest p-6 border-b border-[var(--border-soft)] text-[var(--text-muted)] flex justify-between">
                                  <span>Origen de Ingresos (Por Método)</span>
                                  <span className="text-green-400 font-mono">Máximo: ${Math.max(...Object.values(ingresosPorMetodo)).toFixed(2)}</span>
                              </h4>
                              <div className="divide-y divide-[var(--border-soft)] bg-[var(--bg-input)]">
                                  {METODOS_PAGO.map(met => (
                                      ingresosPorMetodo[met] > 0 && (
                                          <div key={met} className="flex justify-between items-center p-4 text-sm hover:bg-[var(--bg-surface-2)] transition-colors">
                                             <span className="font-bold text-[var(--text-secondary)]">{met}</span>
                                             <span className="font-black font-mono text-green-400 tracking-wider">${ingresosPorMetodo[met].toFixed(2)}</span>
                                          </div>
                                      )
                                  ))}
                                  {totalIn === 0 && <div className="p-10 text-center text-xs text-[var(--text-muted)] uppercase tracking-widest font-black">Caja inamovible hoy. Cero ingresos.</div>}
                              </div>
                          </div>

                          {/* Modulo Egresos */}
                          <div className="glass-card p-0 overflow-hidden">
                              <h4 className="text-[10px] font-black uppercase tracking-widest p-6 border-b border-[var(--border-soft)] text-[var(--text-muted)] flex justify-between">
                                  <span>Destino de Egresos (Por Categoría)</span>
                                  <span className="text-orange-400 font-mono">Ref: {egresosHoy.length} comprobantes</span>
                              </h4>
                              <div className="divide-y divide-[var(--border-soft)] bg-[var(--bg-input)]">
                                  {CATEGORIAS_EGRESO.map(catItem => (
                                      egresosPorCat[catItem.value] > 0 && (
                                          <div key={catItem.value} className="flex justify-between items-center p-4 text-sm hover:bg-[var(--bg-surface-2)] transition-colors">
                                             <span className="font-bold text-[var(--text-secondary)]">{catItem.label}</span>
                                             <span className="font-black font-mono text-orange-400 tracking-wider">-${egresosPorCat[catItem.value].toFixed(2)}</span>
                                          </div>
                                      )
                                  ))}
                                  {totalOut === 0 && <div className="p-10 text-center text-xs text-[var(--text-muted)] uppercase tracking-widest font-black">No hay flujos de salida formal hoy.</div>}
                              </div>
                          </div>
                      </div>

                       {/* CUADRE FÍSICO Y CIERRE */}
                       <div className="glass-card p-8 border-t-2 border-primary/20 bg-primary/5 mt-6 animate-in slide-in-from-bottom-2">
                           <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                               <div className="flex-1 space-y-2">
                                   <h4 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                       <DollarSign className="w-4 h-4"/> Validación de Efectivo en Gaveta
                                   </h4>
                                   <p className="text-xs font-bold text-[var(--text-muted)]">Ingresa el monto total de dinero físico (billetes y monedas) que tienes actualmente en caja para validar el cuadre.</p>
                               </div>

                               <div className="flex flex-col items-center md:items-end gap-4">
                                   <div className="relative group">
                                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-xl">$</span>
                                       <input 
                                           type="number" 
                                           step="0.01" 
                                           className="input-guambra !h-16 !w-64 !pl-10 !bg-[var(--bg-surface-2)] !border-primary/30 !text-3xl font-mono font-black text-[var(--text-primary)]" 
                                           placeholder="0.00"
                                           value={montoFisico}
                                           onChange={(e) => setMontoFisico(e.target.value)}
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
                                           {(parseFloat(montoFisico) - balanceDia) === 0 ? (
                                               <><CheckCircle2 className="w-3 h-3"/> Cuadre Perfecto</>
                                           ) : (parseFloat(montoFisico) - balanceDia) > 0 ? (
                                               <><AlertCircle className="w-3 h-3"/> Sobrante de ${ (parseFloat(montoFisico) - balanceDia).toFixed(2) }</>
                                           ) : (
                                               <><AlertCircle className="w-3 h-3"/> Faltante de $${ Math.abs(parseFloat(montoFisico) - balanceDia).toFixed(2) }</>
                                           )}
                                       </div>
                                   )}
                               </div>
                           </div>

                           <div className="flex justify-end pt-8 border-t border-[var(--border-soft)] mt-8">
                               <button 
                                   onClick={ejecutarCierreDario} 
                                   disabled={esCerrando || !montoFisico} 
                                   className={`btn-guambra-primary !px-12 !h-16 text-base shadow-xl flex items-center gap-3 w-full md:w-auto transition-all ${
                                       !montoFisico ? 'opacity-50 cursor-not-allowed !bg-[var(--bg-surface-2)] !text-[var(--text-muted)]' : 'shimmer shadow-primary/20'
                                   }`}
                               >
                                   {esCerrando ? <Loader2 className="w-5 h-5 animate-spin"/> : <Lock className="w-5 h-5"/>} 
                                   Efectuar Arqueo y Cierre Diario (Z)
                               </button>
                           </div>
                       </div>
                  </>
              )}
           </div>
       )}


       {/* VISTA M10-S2: HISTORIAL DE CIERRES */}
       {currentTab === 'historial' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4">
              
              {/* Filtros */}
              <div className="flex flex-col lg:flex-row gap-4 glass-card p-4 items-center">
                 
                 <div className="flex bg-[var(--bg-input)] border border-[var(--border-soft)] p-1.5 rounded-xl min-w-max flex-1 lg:flex-none">
                     <button type="button" onClick={() => setFiltroTipoList('dia')} className={`flex-1 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filtroTipoList === 'dia' ? 'bg-primary/20 text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Todo</button>
                     <button type="button" onClick={() => setFiltroTipoList('semana')} className={`flex-1 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filtroTipoList === 'semana' ? 'bg-primary/20 text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Semana</button>
                     <button type="button" onClick={() => setFiltroTipoList('mes')} className={`flex-1 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filtroTipoList === 'mes' ? 'bg-primary/20 text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Mes</button>
                     <button type="button" onClick={() => setFiltroTipoList('anio')} className={`flex-1 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filtroTipoList === 'anio' ? 'bg-primary/20 text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Año</button>
                 </div>
                 
                 <div className="flex flex-1 gap-2 bg-[var(--bg-input)] border border-[var(--border-soft)] rounded-xl p-1 h-12 w-full">
                     <Calendar className="w-4 h-4 text-[var(--text-muted)] my-auto ml-3 shrink-0" />
                     <input type="date" className="bg-transparent border-0 text-[var(--text-primary)] text-[10px] font-bold uppercase tracking-widest w-full focus:outline-none dark-date pl-2" value={filterFechaInicio} onChange={e => setFilterFechaInicio(e.target.value)} title="Desde" />
                     <span className="text-[var(--text-muted)] my-auto">-</span>
                     <input type="date" className="bg-transparent border-0 text-[var(--text-primary)] text-[10px] font-bold uppercase tracking-widest w-full focus:outline-none dark-date pl-2" value={filterFechaFin} onChange={e => setFilterFechaFin(e.target.value)} title="Hasta" />
                 </div>
              </div>

              {/* Stats Consolidado Historial Rango */}
              <div className="grid grid-cols-3 gap-2 md:gap-6 bg-[var(--bg-input)] p-4 border border-[var(--border-soft)] rounded-2xl">
                   <div className="text-center md:text-left md:pl-6 border-r border-[var(--border-soft)]">
                       <span className="text-[8px] md:text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest block mb-1">Ingresos Brutos</span>
                       <span className="text-sm md:text-xl font-mono font-black text-green-400">${hTotIn.toFixed(2)}</span>
                   </div>
                   <div className="text-center md:text-left md:pl-6 border-r border-[var(--border-soft)]">
                       <span className="text-[8px] md:text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest block mb-1">Egresos Brutos</span>
                       <span className="text-sm md:text-xl font-mono font-black text-orange-400">-${hTotOut.toFixed(2)}</span>
                   </div>
                   <div className="text-center md:text-left md:pl-6">
                       <span className="text-[8px] md:text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest block mb-1">Resultado Neto del Periodo</span>
                       <span className="text-sm md:text-2xl font-mono font-black text-[var(--text-primary)]">${hBalance.toFixed(2)}</span>
                   </div>
              </div>

              {/* Tabla Historial Cierres */}
              <div className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)]">
                            <tr>
                               <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] w-1/4">Trazabilidad Fiscal</th>
                               <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Sistema (Día)</th>
                               <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Físico (Contado)</th>
                               <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Diferencia</th>
                               <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Saldo Acumulado</th>
                               <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-soft)]">
                          {loading ? (
                             <tr><td colSpan="6" className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
                          ) : historialListado.length === 0 ? (
                             <tr><td colSpan="6" className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Sin cierres auditados detectados en el rango</td></tr>
                          ) : historialListado.map(c => (
                             <tr key={c.id} className="hover:bg-[var(--bg-surface-2)] transition-colors group">
                                <td className="p-4">
                                   <div className="flex flex-col gap-1">
                                       <p className="font-bold text-[var(--text-primary)] text-base">Z - {new Date(c.fecha_cierre + 'T00:00:00Z').toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</p>
                                       <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-tighter">ID: {c.id.split('-')[0]} — Auditor: {c.registrado_por_nombre}</span>
                                    </div>
                                 </td>
                                 <td className="p-4">
                                    <span className="font-mono font-black text-[var(--text-primary)]">${(c.total_ingresos - c.total_egresos).toFixed(2)}</span>
                                 </td>
                                 <td className="p-4">
                                    <span className="font-mono font-black text-primary">${(c.monto_fisico_contado || 0).toFixed(2)}</span>
                                 </td>
                                 <td className="p-4 text-center">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                                        (c.diferencia || 0) === 0 
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                            : (c.diferencia || 0) > 0 
                                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                        {(c.diferencia || 0) === 0 ? <CheckCircle2 className="w-3 h-3"/> : <AlertCircle className="w-3 h-3"/>}
                                        {(c.diferencia || 0) === 0 ? 'Cuadrado' : (c.diferencia || 0) > 0 ? 'Sobrante' : 'Faltante'}
                                        {(c.diferencia || 0) !== 0 && ` ($${Math.abs(c.diferencia).toFixed(2)})`}
                                    </div>
                                 </td>
                                 <td className="p-4 text-right">
                                    <span className="text-sm font-mono font-black text-[var(--text-secondary)]">${(c.saldo_acumulado || 0).toFixed(2)}</span>
                                 </td>
                                 <td className="p-4 text-right">
                                    <button onClick={() => { setCierreActivo(c); setTab('ver'); }} className="p-2 bg-[var(--bg-surface-2)] hover:bg-primary/10 text-[var(--text-muted)] hover:text-primary rounded-xl transition-all border border-[var(--border-soft)] hover:border-primary/50">
                                       <Eye className="w-4 h-4" />
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


       {/* VISTA M10-S2 EXPLANDIDA (VER DETALLE Z) */}
       {currentTab === 'ver' && cierreActivo && (
           <div className="animate-in slide-in-from-right-4 max-w-4xl mx-auto space-y-8">
              
              <button onClick={() => setTab('historial')} className="btn-guambra-secondary self-start mb-2 !px-6 !py-2 !h-auto text-[10px] border-none">← Volver al Archivo Z</button>
              
              <div className="glass-card p-0 overflow-hidden relative">
                  {/* Etiqueta Autoría Absolute */}
                  <div className="absolute top-0 right-0 bg-primary/20 text-primary border-l border-b border-primary/30 px-6 py-2 rounded-bl-3xl z-20 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4"/>
                      <span className="text-[9px] uppercase font-black tracking-[0.2em]">Auditado por: {cierreActivo.registrado_por_nombre}</span>
                  </div>

                   {/* Header Formato Ticket Archivo */}
                  <div className="bg-[var(--bg-surface-3)] border-b border-[var(--border-soft)] p-10 flex flex-col items-center justify-center text-center relative">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                      
                      <Lock className="w-12 h-12 text-primary opacity-50 mb-4"/>
                      <h2 className="text-[10px] uppercase tracking-[0.4em] text-[var(--text-secondary)] mb-2 font-black">Reporte Financiero de Cierre Z</h2>
                      <h3 className="text-3xl font-black text-[var(--text-primary)]">{new Date(cierreActivo.fecha_cierre + 'T00:00:00Z').toLocaleDateString()}</h3>
                      <p className="text-xs font-mono font-black tracking-widest text-primary/40 mt-3 pt-3 border-t border-[var(--border-soft)] w-fit">Ref-Doc: {cierreActivo.id}</p>
                  </div>

                  <div className="p-10 bg-[var(--bg-input)]">
                      {/* STATS DE ARQUEO CENTRAL */}
                       <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                          <div className="border border-[var(--border-soft)] bg-[var(--bg-card)] rounded-2xl p-6 text-center shadow-lg">
                              <span className="text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)] mb-1 block">Esperado (Sistema)</span>
                              <span className="text-2xl font-mono font-black text-[var(--text-primary)]">${(cierreActivo.total_ingresos - cierreActivo.total_egresos).toFixed(2)}</span>
                          </div>
                          <div className="border border-primary/30 bg-primary/10 rounded-2xl p-6 text-center shadow-lg shadow-primary/10">
                              <span className="text-[10px] uppercase tracking-widest font-black text-primary mb-1 block">Físico (Contado)</span>
                              <span className="text-2xl font-mono font-black text-[var(--text-primary)]">${(cierreActivo.monto_fisico_contado || 0).toFixed(2)}</span>
                          </div>
                          <div className={`border rounded-2xl p-6 text-center shadow-lg ${
                              (cierreActivo.diferencia || 0) === 0 ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
                          }`}>
                              <span className={`text-[10px] uppercase tracking-widest font-black mb-1 block ${
                                  (cierreActivo.diferencia || 0) === 0 ? 'text-green-500' : 'text-red-500'
                              }`}>Diferencia Arqueo</span>
                              <span className={`text-2xl font-mono font-black ${
                                  (cierreActivo.diferencia || 0) >= 0 ? 'text-[var(--text-primary)]' : 'text-red-400'
                              }`}>${(cierreActivo.diferencia || 0).toFixed(2)}</span>
                          </div>
                          <div className="border border-[var(--border-soft)] bg-[var(--bg-card)] rounded-2xl p-6 text-center shadow-lg">
                              <span className="text-[10px] uppercase tracking-widest font-black text-[var(--text-muted)] mb-1 block">Saldo Acumulado</span>
                              <span className="text-2xl font-mono font-black text-[var(--text-secondary)]">${(cierreActivo.saldo_acumulado || 0).toFixed(2)}</span>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          {/* Desglose Z IN */}
                           <div>
                              <h4 className="text-[10px] font-black uppercase tracking-widest pb-3 border-b border-[var(--border-soft)] text-green-400/80 mb-4 flex items-center gap-2"><TrendingUp className="w-3 h-3"/> Resumen de Ingresos</h4>
                              <div className="space-y-2 text-sm">
                                  <div className="flex justify-between p-3 bg-[var(--bg-input)] rounded-lg border border-[var(--border-soft)] text-[var(--text-secondary)]">
                                      <span className="font-bold">Total Ingresos del Día</span>
                                      <span className="font-mono font-black text-green-400">${cierreActivo.total_ingresos.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between p-3 bg-[var(--bg-input)] rounded-lg border border-[var(--border-soft)]">
                                      <span className="font-bold text-[var(--text-muted)]">Vía Efectivo</span>
                                      <span className="font-mono font-black text-[var(--text-primary)]">${(cierreActivo.monto_efectivo || 0).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between p-3 bg-[var(--bg-input)] rounded-lg border border-[var(--border-soft)]">
                                      <span className="font-bold text-[var(--text-muted)]">Vía Transferencia</span>
                                      <span className="font-mono font-black text-[var(--text-primary)]">${(cierreActivo.monto_transferencia || 0).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between p-3 bg-[var(--bg-input)] rounded-lg border border-[var(--border-soft)]">
                                      <span className="font-bold text-[var(--text-muted)]">Otras Vías Digitales</span>
                                      <span className="font-mono font-black text-[var(--text-primary)]">${(cierreActivo.monto_otros || 0).toFixed(2)}</span>
                                  </div>
                              </div>
                          </div>

                           {/* Info Auditoría */}
                          <div>
                              <h4 className="text-[10px] font-black uppercase tracking-widest pb-3 border-b border-[var(--border-soft)] text-orange-400/80 mb-4 flex items-center gap-2"><TrendingDown className="w-3 h-3"/> Resumen de Gastos</h4>
                              <div className="space-y-4">
                                  <div className="flex justify-between p-4 bg-red-400/5 rounded-xl border border-red-400/10 text-red-500">
                                      <span className="text-xs font-bold uppercase">Total Egresos del Día</span>
                                      <span className="font-mono font-black text-xl">-${cierreActivo.total_egresos.toFixed(2)}</span>
                                  </div>
                                  <div className="bg-[var(--bg-surface-2)] p-4 rounded-xl border border-[var(--border-soft)] italic text-[10px] text-[var(--text-muted)] space-y-2">
                                      <p className="font-bold uppercase tracking-widest border-b border-[var(--border-soft)] pb-2 mb-2">Observaciones del Cierre</p>
                                      {cierreActivo.notas || 'Sin observaciones registradas por el personal de tesorería.'}
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
