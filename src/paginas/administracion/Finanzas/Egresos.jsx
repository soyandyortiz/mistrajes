import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'sonner';
import { 
  Plus, Search, Calendar, FileText, User as UserIcon, Loader2,
  CheckCircle2, AlertCircle, ShoppingCart, DollarSign, Wallet,
  Building2, Receipt, ArrowDownRight, CreditCard, ChevronDown, CheckCircle
} from 'lucide-react';

// Constantes de configuración que conectan con los Enums reales de Postgres
const CATEGORIAS_EGRESO = [
    { label: 'Pago a proveedores', value: 'pago_proveedor' },
    { label: 'Pago a empleados', value: 'pago_empleado' },
    { label: 'Arriendo de local', value: 'arriendo' },
    { label: 'Servicios básicos', value: 'servicios' },
    { label: 'Otros / Varios', value: 'otros' }
];

const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Paypal/Link', 'Otro'];

// Mocks Temporales (Se reemplazarán al crear la tabla proveedores)
const MOCK_PROVEEDORES = [
    { id: 'prov_1', nombre_comercial: 'Sastrería El Corte Fino' },
    { id: 'prov_2', nombre_comercial: 'Textiles e Insumos Andinos' },
    { id: 'prov_3', nombre_comercial: 'Servicio de Lavandería Express' }
];

const ModuleNavbar = ({ currentTab, setTab }) => (
  <div className="border-b border-[var(--border-soft)] pb-px mb-8 overflow-x-auto no-scrollbar">
    <nav className="-mb-px flex gap-6">
      <button onClick={() => setTab('registrar')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${currentTab === 'registrar' ? 'border-primary text-primary' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'}`}><ShoppingCart className="w-3 h-3"/> Registrar Nuevo</button>
      <button onClick={() => setTab('historial')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all ${currentTab === 'historial' ? 'border-primary text-primary' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'}`}>Historial Principal</button>
      <button onClick={() => setTab('deudas')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${currentTab === 'deudas' ? 'border-primary text-primary' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'}`}><Wallet className="w-3 h-3"/> Deudas Activas</button>
    </nav>
  </div>
);

export default function Egresos({ initialTab = 'registrar' }) {
  const { profile, loading: authLoading } = useAuthStore();
  
  const [currentTab, setTab] = useState(initialTab); // 'registrar' | 'historial' | 'deudas'
  const [loading, setLoading] = useState(false);

  // Datos base
  const [egresos, setEgresos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [proveedores, setProveedores] = useState([]); // Usaremos MOCK si BD falla

  // Filtros Historial
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterMetodo, setFilterMetodo] = useState('');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');

  // Formulario de Registro
  const docInitState = {
     categoria: 'pago_proveedor',
     modalidad: 'contado', // 'contado' | 'credito'
     metodo_pago: 'Transferencia',
     abono_inicial: '',
     empleado_id: '',
     proveedor_id: '',
     detalles: [{ id: Date.now(), descripcion: '', categoria: '', cantidad: 1, precio_unitario: '' }]
  };
  const [formData, setFormData] = useState(docInitState);
  const [isProcessing, setIsProcessing] = useState(false);

  // Historial de Egresos
  const [modalEgreso, setModalEgreso] = useState(null); // Objeto del egreso seleccionado para visualizar modal

  // Deudas Activas
  const [deudaExpandida, setDeudaExpandida] = useState(null); // id del abono
  const [formAbono, setFormAbono] = useState({ monto: '', metodo_pago: 'Efectivo', descripcion: '' });

  // --- OBTENCION DE DATOS ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Obtener Empleados
      const { data: emps } = await supabase.from('perfiles_usuario').select('id, nombre_completo, salario_mensual').eq('tenant_id', profile.tenant_id);
      setEmpleados(emps || []);

      // 2. Obtener Proveedores - usando columnas reales del esquema
      const { data: provs, error: provErr } = await supabase.from('proveedores').select('id, nombre_completo, nombre_empresa, tipo_entidad').eq('tenant_id', profile.tenant_id);
      if(provErr && provErr.code === '42P01') {
          // Tabla aún no creada, usar MOCK
          setProveedores(MOCK_PROVEEDORES);
      } else if (provErr) {
          // Cualquier otro error (ej: 400 columna incorrecta) - usar MOCK
          setProveedores(MOCK_PROVEEDORES);
         } else {
             // Normalizar: un proveedor puede ser persona o empresa
             const provsNorm = (provs || []).map(p => ({
                 ...p,
                 nombre_comercial: p.tipo_entidad === 'empresa' ? (p.nombre_empresa || p.nombre_completo) : (p.nombre_completo || p.nombre_empresa)
             }));
             setProveedores(provsNorm);
             
             // 3. Obtener Egresos/Deudas (M7) - Intentar join con lineas_egreso y pagos_egreso
             const { data: egs, error: egErr } = await supabase.from('egresos')
                 .select('*, lineas_egreso(*), pagos_egreso(*)')
                 .eq('tenant_id', profile.tenant_id)
                 .order('created_at', { ascending: false });
                 
             if(egErr && egErr.code === '42P01') {
                setEgresos([]);
             } else if (egErr) {
                // Si falla el select con join (columnas no existen aún), hacer fallback
                const { data: fallbackEgs } = await supabase.from('egresos')
                   .select('*')
                   .eq('tenant_id', profile.tenant_id)
                   .order('created_at', { ascending: false });
                   
                setEgresos(fallbackEgs ? fallbackEgs.map(mapEgresosBase) : []);
             } else {
                setEgresos((egs || []).map(mapEgresosBase));
             }
         }

    } catch (e) {
      toast.error('Error cargando información contable');
    } finally {
      setLoading(false);
    }
  };
  
  const mapEgresosBase = (e) => {
      let destNombre = '';
      if (e.categoria === 'pago_empleado') {
          destNombre = e.nombre_empleado_snapshot || empleados?.find(emp => emp.id === e.empleado_id)?.nombre_completo || 'Empleado';
      } else if (e.categoria === 'pago_proveedor') {
          const provObj = proveedores.find(prov => prov.id === e.proveedor_id);
          destNombre = provObj ? (provObj.nombre_comercial || provObj.nombre_empresa || provObj.nombre_completo) : 'Proveedor';
      } else {
          destNombre = 'Varios / Otros';
      }
      
      return {
          ...e,
          registrado_por_nombre: e.nombre_registrador_snapshot || 'Usuario',
          destinatario_nombre: destNombre,
          detalles: e.lineas_egreso || e.detalles || [], // Priorizar DB relation
          abonos: (e.pagos_egreso || e.abonos || []).sort((a,b) => new Date(a.created_at || a.fecha) - new Date(b.created_at || b.fecha))
      };
  };

  useEffect(() => {
    if (!authLoading && profile?.tenant_id) fetchData();
    else if (!authLoading && !profile?.tenant_id) setLoading(false);
  }, [authLoading, profile?.tenant_id]);


  // --- FORMULARIO GESTIÓN DETALLES (M7-S1) ---
  const handleDocChange = (field, val) => {
      setFormData(prev => {
          const base = {...prev, [field]: val};
          
          // Lógica de llenado automático de sueldo si se escoge empleado
          if (field === 'empleado_id') {
              const emp = empleados.find(e => e.id === val);
              if (emp) {
                 base.detalles = [{ 
                     id: Date.now(), 
                     descripcion: `Pago de Nómina Mensual - ${emp.nombre_completo}`, 
                     categoria: 'pago_empleado', 
                     cantidad: 1, 
                     precio_unitario: emp.salario_mensual || 0 
                 }];
              }
          }
          return base;
      });
  };

  const handleDetalleChange = (idx, field, val) => {
      setFormData(prev => {
          const nuevasList = [...prev.detalles];
          nuevasList[idx][field] = val;
          return {...prev, detalles: nuevasList};
      });
  };

  const agregarFila = () => {
      setFormData(prev => ({...prev, detalles: [...prev.detalles, { id: Date.now(), descripcion: '', categoria: '', cantidad: 1, precio_unitario: '' }]}));
  };

  const eliminarFila = (idx) => {
      setFormData(prev => {
          const nuevasList = [...prev.detalles];
          nuevasList.splice(idx, 1);
          return {...prev, detalles: nuevasList};
      });
  };

  const calcularTotalEgreso = () => {
      return formData.detalles.reduce((acc, d) => acc + (parseFloat(d.cantidad || 0) * parseFloat(d.precio_unitario || 0)), 0);
  };


  // --- ACCIONES SUBMIT ---
  const registrarEgreso = async (e) => {
      e.preventDefault();
      setIsProcessing(true);
      
      try {
          const totalCalculado = calcularTotalEgreso();
          if(totalCalculado <= 0) throw new Error('El subtotal del egreso debe ser mayor a cero.');
          
          if(formData.categoria === 'pago_empleado' && !formData.empleado_id) throw new Error('Debe seleccionar el empleado al que se dirige el pago.');
          if(formData.categoria === 'pago_proveedor' && !formData.proveedor_id) throw new Error('Debe vincular a un proveedor para este egreso.');

          // Validación de que detalles no estén vacios
          for (let det of formData.detalles) {
               if(!det.descripcion.trim()) throw new Error('Debe completar la descripción de todas las filas.');
          }

          let destinatario_id = null;
          let destinatario_nombre = '';
          
          if (formData.categoria === 'pago_empleado') {
              destinatario_id = formData.empleado_id;
              destinatario_nombre = empleados.find(x => x.id === formData.empleado_id)?.nombre_completo;
          } else if (formData.categoria === 'pago_proveedor') {
              destinatario_id = formData.proveedor_id;
              destinatario_nombre = proveedores.find(x => x.id === formData.proveedor_id)?.nombre_comercial || proveedores.find(x => x.id === formData.proveedor_id)?.razon_social;
          }

          const abonosHist = formData.modalidad === 'contado' ? [{
              fecha: new Date().toISOString(),
              monto: totalCalculado,
              metodo_pago: formData.metodo_pago,
              registrado_por: profile.id
          }] : [];

          // Helper para obtener fecha local correcta en formato YYYY-MM-DD
          const getLocalDateString = () => {
              const now = new Date();
              return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          };

          const abonoInicialNum = formData.modalidad === 'credito' && formData.abono_inicial ? parseFloat(formData.abono_inicial) : 0;
          
          if(abonoInicialNum < 0) throw new Error('El abono inicial no puede ser negativo.');
          if(abonoInicialNum > totalCalculado) throw new Error('El abono inicial no puede ser mayor al total del egreso.');

          const monto_pagado_inicial = formData.modalidad === 'contado' ? totalCalculado : abonoInicialNum;
          const estado_deudor = monto_pagado_inicial >= totalCalculado ? 'pagado' : 'pendiente';

          // Payload alineado con el schema real de la tabla 'egresos'
          const payload = {
              tenant_id: profile.tenant_id,
              fecha_egreso: getLocalDateString(), // DATE campo del schema (Fecha Local)
              categoria: formData.categoria,
              modalidad: formData.modalidad,
              descripcion: formData.detalles.map(d => d.descripcion).join('; '),
              monto_total: totalCalculado,
              monto_pagado: monto_pagado_inicial,
              estado_deuda: estado_deudor,
              empleado_id: formData.categoria === 'pago_empleado' ? formData.empleado_id || null : null,
              proveedor_id: formData.categoria === 'pago_proveedor' ? formData.proveedor_id || null : null,
              nombre_empleado_snapshot: formData.categoria === 'pago_empleado' ? (empleados.find(x => x.id === formData.empleado_id)?.nombre_completo || null) : null,
              registrado_por: profile.id,
              nombre_registrador_snapshot: profile.nombre_completo || 'Usuario',
          };

          const { data: insertedEgreso, error } = await supabase.from('egresos').insert([payload]).select().single();
          
          if(error) {
              if (error.code === '42P01') {
                   // MOCK local update si BD no existe
                   const mockItem = { ...payload, id: `mock_${Date.now()}`, registrado_por_nombre: profile.nombre_completo, lineas_egreso: formData.detalles };
                   setEgresos(prev => [mapEgresosBase(mockItem), ...prev]);
                   toast.success('Egreso guardado localmente (Simulador activado)');
              } else throw error;
          } else {
              // Si se guardó el egreso, guardamos sus líneas de detalle
              try {
                  const lineasPayload = formData.detalles.map(d => ({
                      egreso_id: insertedEgreso.id,
                      tenant_id: profile.tenant_id,
                      descripcion: d.descripcion,
                      categoria: d.categoria || formData.categoria || 'otros',
                      cantidad: parseFloat(d.cantidad) || 1,
                      precio_unitario: parseFloat(d.precio_unitario) || 0,
                      subtotal: (parseFloat(d.cantidad) || 1) * (parseFloat(d.precio_unitario) || 0)
                  }));
                  const { error: lineasError } = await supabase.from('lineas_egreso').insert(lineasPayload);
                  if (lineasError) throw lineasError;
                  
              } catch(lineErr) {
                  console.error("No se pudieron insertar lineas_egreso:", lineErr);
                  throw new Error(`Error al guardar el detalle del egreso: ${lineErr.message || 'Sin permisos de RLS'}`);
              }
              
              // Insertar historial de abono inicial si existe
              if (abonoInicialNum > 0) {
                  try {
                      const { error: errAbono } = await supabase.from('pagos_egreso').insert([{
                          egreso_id: insertedEgreso.id,
                          tenant_id: profile.tenant_id,
                          monto: abonoInicialNum,
                          referencia: `Abono Inicial - ${formData.metodo_pago}`,
                          registrado_por: profile.id,
                          nombre_registrador_snapshot: profile.nombre_completo || 'Usuario',
                          fecha_pago: getLocalDateString()
                      }]);
                      if (errAbono) throw errAbono;
                  } catch (errAbono) {
                      console.error("Error guardando abono inicial:", errAbono);
                      toast.warning('El egreso se guardó, pero hubo un error registrando el abono inicial en el historial.');
                  }
              }
              
              toast.success('Egreso fiscal registrado con éxito en los libros');
              fetchData();
          }

          setFormData(docInitState);
          setTab('historial');

      } catch (err) {
          toast.error(err.message || 'Error al emitir egreso');
      } finally {
          setIsProcessing(false);
      }
  };


  const registrarAbono = async (e, deudaId) => {
      e.preventDefault();
      try {
          const deuda = egresos.find(x => x.id === deudaId);
          if(!deuda) return;
          
          const montoAbono = parseFloat(formAbono.monto);
          if(montoAbono <= 0 || montoAbono > deuda.saldo_pendiente) throw new Error('El abono es inválido o supera el saldo pendiente.');

          const getLocalDateStringAbono = () => {
              const now = new Date();
              return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          };

          const nuevoAbonoLocal = {
              id: Date.now(),
              fecha_pago: getLocalDateStringAbono(),
              created_at: new Date().toISOString(),
              monto: montoAbono,
              referencia: formAbono.metodo_pago,
              descripcion: formAbono.descripcion,
              registrado_por_nombre: profile.nombre_completo,
              nombre_registrador_snapshot: profile.nombre_completo
          };

          const nuevoSaldadoTotal = (deuda.monto_pagado || 0) + montoAbono;
          const nuevoSaldo = deuda.monto_total - nuevoSaldadoTotal;
          const nuevosAbonos = [...(deuda.abonos || []), nuevoAbonoLocal];
          const nuevoEstado = nuevoSaldo <= 0 ? 'pagado' : 'pendiente';

          // Actualizar en BD y registrar en pagos_egreso
          if (!deudaId.toString().startsWith('mock_')) {
              // 1. Inserción del Abono en Historial DB
              const payloadAbonoBD = {
                  egreso_id: deudaId,
                  tenant_id: profile.tenant_id,
                  monto: montoAbono,
                  referencia: formAbono.metodo_pago,
                  descripcion: formAbono.descripcion,
                  registrado_por: profile.id,
                  nombre_registrador_snapshot: profile.nombre_completo || 'Usuario',
                  fecha_pago: getLocalDateStringAbono()
              };
              const { error: errAbono } = await supabase.from('pagos_egreso').insert([payloadAbonoBD]);
              if (errAbono) throw errAbono;

              // 2. Actualización Monto Pagado del Maestro
              const { error } = await supabase.from('egresos')
                  .update({ monto_pagado: nuevoSaldadoTotal, estado_deuda: nuevoEstado })
                  .eq('id', deudaId);
              if(error) throw error;
          }

          // Local update
          setEgresos(prev => prev.map(eg => eg.id === deudaId ? { ...eg, abonos: nuevosAbonos, monto_pagado: nuevoSaldadoTotal, saldo_pendiente: nuevoSaldo, estado_deuda: nuevoEstado } : eg));
          
          toast.success(`Abono de $${montoAbono.toFixed(2)} registrado correctamenta`);
          setFormAbono({ monto: '', metodo_pago: 'Efectivo', descripcion: '' });

      } catch (err) {
          toast.error(err.message || 'Error al agregar cuota');
      }
  };

  const finalizarPagoPorCompleto = async (deudaId) => {
      const deuda = egresos.find(x => x.id === deudaId);
      if(!deuda || deuda.saldo_pendiente > 0) return toast.info('Aún persiste saldo en la deuda');

      try {
          if (!deudaId.toString().startsWith('mock_')) {
              await supabase.from('egresos').update({ estado_deuda: 'pagado' }).eq('id', deudaId);
          }
          setEgresos(prev => prev.map(eg => eg.id === deudaId ? { ...eg, estado_deuda: 'pagado' } : eg));
          toast.success('Deuda liquidada y archivada formalmente');
      } catch (e) {
          toast.error('Error al archivar la obligación vencida');
      }
  };


  // --- FILTROS DE RENDER ---
  const listaFiltradaHistorial = egresos.filter(p => {
      if (searchQuery && !p.destinatario_nombre?.toLowerCase().includes(searchQuery.toLowerCase()) && !p.detalles?.[0]?.descripcion?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterCat && p.categoria !== filterCat) return false;
      if (filterMetodo && p.modalidad !== filterMetodo) return false; // Usamos esto para filtrar contado/credito
      
      if (filterFechaInicio && new Date(p.fecha_egreso) < new Date(filterFechaInicio)) return false;
      if (filterFechaFin) {
          const mFin = new Date(filterFechaFin);
          mFin.setDate(mFin.getDate() + 1); // include full day
          if (new Date(p.fecha_egreso) >= mFin) return false;
      }
      return true;
  });

  const deudasPendientes = egresos.filter(p => p.modalidad === 'credito' && p.estado_deuda !== 'pagado');
  const sumaTotalDeudas = deudasPendientes.reduce((acc, d) => acc + (d.saldo_pendiente || 0), 0);


  return (
    <div className="animate-in fade-in duration-500 pb-20">
       <ModuleNavbar currentTab={currentTab} setTab={setTab} />

       {/* VISTA M7-S1: REGISTRAR NUEVO EGRESO */}
       {currentTab === 'registrar' && (
           <form onSubmit={registrarEgreso} className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-4">
               
               <div className="glass-card p-6 md:p-10 space-y-10">
                   {/* ROW 1: ENCABEZADO FISCAL */}
                   <div>
                       <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-6 border-b border-primary/20 pb-4 flex items-center gap-3"><Receipt className="w-5 h-5"/> 1. Parametrización del Desembolso</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="md:col-span-2">
                               <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Categoría Contable del Egreso <span className="text-red-400">*</span></label>
                               <select required className="input-guambra h-14 text-sm font-bold" value={formData.categoria} onChange={e => handleDocChange('categoria', e.target.value)}>
                                  {CATEGORIAS_EGRESO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                               </select>
                           </div>

                           {/* Selectores dinámicos Empleados/Proveedores */}
                           {formData.categoria === 'pago_empleado' && (
                               <div className="md:col-span-2 bg-[var(--bg-surface-2)] p-4 rounded-xl border border-[var(--border-soft)] animate-in fade-in slide-in-from-top-2">
                                   <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block flex items-center gap-2"><UserIcon className="w-3 h-3 text-primary"/> Seleccionar Plantilla <span className="text-red-400">*</span></label>
                                   <select required className="input-guambra h-14" value={formData.empleado_id} onChange={e => handleDocChange('empleado_id', e.target.value)}>
                                      <option value="">Seleccione a quién pertenece esta cuota mensual...</option>
                                      {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre_completo} (Base: ${e.salario_mensual || 0})</option>)}
                                   </select>
                               </div>
                           )}

                           {formData.categoria === 'pago_proveedor' && (
                               <div className="md:col-span-2 bg-[var(--bg-surface-2)] p-4 rounded-xl border border-[var(--border-soft)] animate-in fade-in slide-in-from-top-2">
                                   <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block flex items-center gap-2"><Building2 className="w-3 h-3 text-primary"/> Seleccionar Proveedor <span className="text-red-400">*</span></label>
                                   <select required className="input-guambra h-14" value={formData.proveedor_id} onChange={e => handleDocChange('proveedor_id', e.target.value)}>
                                      <option value="">Buscar Razón Social en BD...</option>
                                       {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre_comercial || p.nombre_empresa || p.nombre_completo}</option>)}
                                   </select>
                               </div>
                           )}

                           <div>
                               <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Modalidad Operativa <span className="text-red-400">*</span></label>
                               <div className="flex bg-[var(--bg-surface-2)] border border-[var(--border-soft)] p-1 rounded-xl">
                                  <button type="button" onClick={() => handleDocChange('modalidad', 'contado')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${formData.modalidad === 'contado' ? 'bg-primary/20 text-[var(--text-primary)] border border-primary/50' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Caja / Contado</button>
                                  <button type="button" onClick={() => handleDocChange('modalidad', 'credito')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${formData.modalidad === 'credito' ? 'bg-orange-500/20 text-[var(--text-primary)] border border-orange-500/50' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Línea de Crédito</button>
                               </div>
                           </div>

                           {formData.modalidad === 'contado' ? (
                               <div className="animate-in fade-in slide-in-from-bottom-2">
                                   <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Vía o Método de Dispersión <span className="text-red-400">*</span></label>
                                   <select required className="input-guambra h-14" value={formData.metodo_pago} onChange={e => handleDocChange('metodo_pago', e.target.value)}>
                                      {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                                   </select>
                               </div>
                           ) : (
                               <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 bg-orange-500/10 p-4 border border-orange-500/20 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                                   <div className="flex flex-col gap-2 relative">
                                       <label className="text-[10px] uppercase tracking-widest font-bold text-orange-400 mb-1 flex items-center gap-2">
                                           <AlertCircle className="w-3 h-3"/> Abono Inicial (Opcional)
                                       </label>
                                       <div className="relative">
                                           <DollarSign className="w-4 h-4 text-orange-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                           <input 
                                               type="number" 
                                               step="0.01" 
                                               min="0"
                                               className="input-guambra h-14 pl-10 text-orange-400 font-mono font-bold w-full bg-[var(--bg-surface-2)] border-orange-500/30 focus:border-orange-500 placeholder:text-orange-900/40" 
                                               placeholder="0.00" 
                                               value={formData.abono_inicial} 
                                               onChange={e => handleDocChange('abono_inicial', e.target.value)}
                                           />
                                       </div>
                                       <p className="text-[9px] text-orange-400/60 uppercase tracking-widest mt-1">Si dejas vacío, toda la deuda irá a CxP</p>
                                   </div>
                                   <div className="flex flex-col gap-2">
                                       <label className="text-[10px] uppercase tracking-widest font-bold text-orange-400 mb-1 block">
                                           Método de Pago del Abono
                                       </label>
                                       <select 
                                           className="input-guambra h-14 bg-[var(--bg-surface-2)] text-orange-400 border-orange-500/30 focus:border-orange-500" 
                                           value={formData.metodo_pago} 
                                           onChange={e => handleDocChange('metodo_pago', e.target.value)}
                                       >
                                           {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                                       </select>
                                   </div>
                               </div>
                           )}
                       </div>
                   </div>

                   {/* ROW 2: DETALLES (TABLA DINAMICA) */}
                   <div>
                       <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4 pb-4 border-b border-primary/20 flex justify-between items-center">
                           <span className="flex items-center gap-3"><FileText className="w-5 h-5"/> 2. Desglose del Comprobante</span>
                       </h3>

                       <div className="space-y-2">
                           {/* Cabeceras de tabla UI (Ocultas en movil real, pero mostradas aqui por simplicidad) */}
                           <div className="hidden md:grid grid-cols-12 gap-2 text-[9px] uppercase tracking-widest font-black text-[var(--text-muted)] px-2 mb-2 bg-[var(--bg-surface-2)] rounded-t-lg py-2 mt-4">
                               <div className="col-span-1 text-center">Cant.</div>
                               <div className="col-span-6">Descripción del Egreso / Servicio</div>
                               <div className="col-span-2 text-right">Precio Unit ($)</div>
                               <div className="col-span-2 text-right text-primary">Subtotal</div>
                               <div className="col-span-1 text-center">X</div>
                           </div>

                           {formData.detalles.map((det, idx) => (
                               <div key={det.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 border border-[var(--border-soft)] bg-[var(--bg-surface-2)] p-3 rounded-lg animate-in slide-in-from-bottom-2 md:items-center relative group">
                                   {/* Etiqueta movil */}
                                   <span className="md:hidden text-[9px] font-black text-primary uppercase absolute top-2 right-2">Item {idx + 1}</span>
                                   
                                    <div className="md:col-span-1">
                                        <label className="text-[8px] text-[var(--text-muted)] uppercase mb-1 block md:hidden">Cant</label>
                                        <input required type="number" min="1" className="bg-transparent border border-[var(--border-soft)] rounded-lg h-10 w-full text-center font-mono focus:border-primary px-2 text-[var(--text-primary)] outline-none" value={det.cantidad} onChange={e => handleDetalleChange(idx, 'cantidad', e.target.value)} />
                                    </div>
                                    <div className="md:col-span-6">
                                        <label className="text-[8px] text-[var(--text-muted)] uppercase mb-1 block md:hidden">Descripción Exacta</label>
                                        <input required type="text" className="bg-transparent border border-[var(--border-soft)] rounded-lg h-10 w-full px-3 text-[var(--text-primary)] outline-none focus:border-primary" value={det.descripcion} onChange={e => handleDetalleChange(idx, 'descripcion', e.target.value)} placeholder="Ej: Rol de pagos Marzo, Compra de Alfileres..." />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-[8px] text-[var(--text-muted)] uppercase mb-1 block md:hidden">Precio Unit ($)</label>
                                        <input required type="number" step="0.01" min="0" className="bg-transparent border border-[var(--border-soft)] rounded-lg h-10 w-full text-center md:text-right font-mono focus:border-primary px-3 text-[var(--text-primary)] outline-none" value={det.precio_unitario} onChange={e => handleDetalleChange(idx, 'precio_unitario', e.target.value)} />
                                    </div>
                                   <div className="md:col-span-2 text-right self-end md:self-center">
                                       <span className="text-[8px] text-[var(--text-muted)] uppercase block md:hidden mb-1">Subtotal</span>
                                       <span className="font-mono font-black text-[var(--text-primary)] text-lg">${((parseFloat(det.cantidad||0)) * (parseFloat(det.precio_unitario||0))).toFixed(2)}</span>
                                   </div>
                                   <div className="md:col-span-1 mt-2 md:mt-0 flex justify-center self-end md:self-center">
                                       {formData.detalles.length > 1 && (
                                          <button type="button" onClick={() => eliminarFila(idx)} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center transition-all"><ArrowDownRight className="w-4 h-4 rotate-45"/></button>
                                       )}
                                   </div>
                               </div>
                           ))}

                           <div className="flex justify-between items-center mt-6 pt-4 border-t border-[var(--border-soft)]">
                               <button type="button" onClick={agregarFila} className="px-4 py-2 border border-[var(--border-soft)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] flex items-center gap-2 transition-all">
                                   <Plus className="w-3 h-3"/> + Concepto / Fila
                               </button>
                               <div className="bg-primary/20 border-2 border-primary/40 px-6 py-4 rounded-2xl flex flex-col items-end min-w-[250px] shadow-2xl shadow-primary/10">
                                   <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Gran Total del FCL</span>
                                   <span className="text-3xl font-black font-mono text-[var(--text-primary)] tracking-tighter">${calcularTotalEgreso().toFixed(2)}</span>
                               </div>
                           </div>
                       </div>
                   </div>

                   <div className="pt-8 flex justify-end">
                       <button type="submit" disabled={isProcessing} className="btn-guambra-primary !h-16 w-full md:w-auto md:min-w-[300px] text-base shadow-xl shadow-primary/20">
                           {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : (
                               formData.modalidad === 'contado' ? 'Descargar de Caja General' : 'Registrar CXP y Archivar'
                           )}
                       </button>
                   </div>
               </div>
           </form>
       )}

       {/* VISTA M7-S2: HISTORIAL DE EGRESOS */}
       {currentTab === 'historial' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4">
              {/* Filtros */}
              <div className="flex flex-col lg:flex-row gap-4 glass-card p-4">
                 <div className="relative flex-[2]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
                    <input type="text" className="input-guambra input-guambra-search h-12 text-sm w-full" placeholder="Buscar por concepto o proveedor vinculado..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                 </div>
                 
                 <div className="flex flex-1 gap-2 bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-xl p-1 h-12">
                     <Calendar className="w-4 h-4 text-[var(--text-muted)] my-auto ml-3 shrink-0" />
                     <input type="date" className="bg-transparent border-0 text-[var(--text-primary)] text-[10px] font-bold uppercase tracking-widest w-full focus:outline-none dark-date pl-2" value={filterFechaInicio} onChange={e => setFilterFechaInicio(e.target.value)} />
                     <span className="text-[var(--text-muted)] my-auto">-</span>
                     <input type="date" className="bg-transparent border-0 text-[var(--text-primary)] text-[10px] font-bold uppercase tracking-widest w-full focus:outline-none dark-date pl-2" value={filterFechaFin} onChange={e => setFilterFechaFin(e.target.value)} />
                 </div>

                 <select className="input-guambra flex-1 h-12 text-sm" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                    <option value="">Cualquier Categoría</option>
                    {CATEGORIAS_EGRESO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                 </select>
                 
                 <select className="input-guambra flex-1 h-12 text-sm" value={filterMetodo} onChange={e => setFilterMetodo(e.target.value)}>
                    <option value="">Contado/Crédito</option>
                    <option value="contado">Vía Contado Directo</option>
                    <option value="credito">Cuenta Por Pagar</option>
                 </select>
              </div>

              {/* Tabla */}
              <div className="glass-card overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)]">
                          <tr>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Timestamp Emitido</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] w-1/4">Línea de Gasto</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Contratista/Destinatario</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Formato de Pago</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Monto Bruto</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-[var(--border-soft)]">
                          {loading ? (
                             <tr><td colSpan="5" className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
                           ) : listaFiltradaHistorial.length === 0 ? (
                              <tr><td colSpan="5" className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Sin reportes asociados a las variables</td></tr>
                           ) : listaFiltradaHistorial.map(p => {
                              return (
                              <React.Fragment key={p.id}>
                                  <tr className={`transition-colors group hover:bg-[var(--bg-surface-2)]`}>
                                     <td className="p-4">
                                        <div className="flex flex-col gap-0.5">
                                           <p className="font-bold text-[var(--text-primary)] text-sm">{new Date(p.fecha_egreso + 'T00:00:00').toLocaleDateString()}</p>
                                           <p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)]">{p.created_at ? new Date(p.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Sin hora'}</p>
                                        </div>
                                     </td>
                                     <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                           <span className="text-[9px] font-black tracking-widest uppercase text-primary border border-primary/20 bg-primary/5 px-2 py-0.5 rounded w-fit">
                                               {CATEGORIAS_EGRESO.find(c => c.value === p.categoria)?.label || p.categoria}
                                           </span>
                                           <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-1 max-w-xs">{p.descripcion ? p.descripcion.split(';')[0] : (p.detalles?.[0]?.descripcion || 'Egreso sin descripción')}</p>
                                           {p.descripcion && p.descripcion.split(';').length > 1 && <span className="text-[10px] text-[var(--text-muted)] italic">y {(p.descripcion.split(';').length - 1)} concepto(s) más.</span>}
                                           
                                           <span className="text-[8px] tracking-[0.2em] font-black uppercase text-[var(--text-muted)] mt-1 flex items-center gap-1">
                                               <UserIcon className="w-2 h-2"/> Ejecutado por {p.registrado_por_nombre}
                                           </span>
                                        </div>
                                     </td>
                                     <td className="p-4">
                                         <span className="text-xs font-bold text-[var(--text-primary)]/80">{p.destinatario_nombre || <span className="text-[var(--text-muted)] uppercase text-[9px] tracking-widest">Sin destinatario fijo local</span>}</span>
                                     </td>
                                     <td className="p-4 text-center border-l border-[var(--border-soft)]">
                                        {p.modalidad === 'contado' ? (
                                            <div className="flex flex-col items-center">
                                                <span className="px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-md text-[9px] font-black uppercase tracking-widest mb-1">Caja Cerrada</span>
                                                <span className="text-[9px] font-bold text-[var(--text-muted)] flex items-center gap-1"><CreditCard className="w-3 h-3"/> {p.metodo_pago}</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${p.estado_deuda === 'pagado' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                                                   En Deuda ({p.estado_deuda})
                                                </span>
                                                {p.estado_deuda !== 'pagado' && <span className="text-[9px] font-bold text-orange-400/50 mt-1 animate-pulse">Debe ${p.saldo_pendiente?.toFixed(2)}</span>}
                                            </div>
                                        )}
                                     </td>
                                     <td className="p-4 text-right">
                                        <div className="flex justify-end items-center gap-4">
                                            <p className="font-mono font-black text-rose-400 text-lg">-${p.monto_total?.toFixed(2)}</p>
                                            <button onClick={() => setModalEgreso(p)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors border border-primary/20 group">
                                                <span className="text-[10px] font-black uppercase tracking-widest">Detalle</span>
                                                <UserIcon className="w-3 h-3 group-hover:scale-110 transition-transform"/>
                                            </button>
                                        </div>
                                     </td>
                                  </tr>
                              </React.Fragment>
                              );
                           })}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
       )}

       {/* VISTA M7-S3: GESTIÓN DE PASIVOS (DEUDAS) */}
       {currentTab === 'deudas' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4">
              
              {/* Tarjeta Warning Global */}
              <div className="glass-card bg-orange-500/10 relative overflow-hidden flex flex-col md:flex-row justify-between items-center p-8 border border-orange-500/20">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                  <div className="relative z-10 w-full mb-4 md:mb-0">
                      <h2 className="text-xl font-black uppercase tracking-widest text-orange-400 flex items-center gap-3 mb-2"><Wallet className="w-6 h-6"/> Monitor de Obligaciones (CXP)</h2>
                      <p className="text-xs font-bold text-[var(--text-secondary)]">Flujo consolidado histórico y retenciones pasivas del negocio en modo crédito.</p>
                  </div>
                  <div className="relative z-10 bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl p-4 text-right min-w-[200px]">
                      <span className="text-[9px] uppercase tracking-[0.2em] font-black text-[var(--text-muted)] mb-1 block">Riesgo Liquidez Adquirida</span>
                      <span className="text-3xl font-mono font-black text-[var(--text-primary)] tracking-tighter">${sumaTotalDeudas.toFixed(2)}</span>
                  </div>
              </div>

              <div className="mx-auto flex flex-col gap-4">
                  {deudasPendientes.length === 0 ? (
                      <div className="glass-card p-16 text-center animate-in zoom-in-95">
                          <CheckCircle className="w-16 h-16 text-green-400/20 mx-auto mb-4"/>
                          <p className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">La tesorería y el negocio operan al 100% de sanidad sin cuentas por pagar.</p>
                      </div>
                  ) : (
                      deudasPendientes.map(deuda => {
                          const pagado = deuda.monto_total - deuda.saldo_pendiente;
                          const pctAbonado = Math.min((pagado / deuda.monto_total) * 100, 100);
                          const isExpanded = deudaExpandida === deuda.id;

                          return (
                              <div key={deuda.id} className={`glass-card overflow-hidden transition-all duration-300 border-2 ${isExpanded ? 'border-primary/50' : 'border-transparent hover:border-[var(--border-soft)]'}`}>
                                  {/* Encabezado Fila CXP */}
                                  <div onClick={() => setDeudaExpandida(isExpanded ? null : deuda.id)} className="p-6 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between cursor-pointer group">
                                      <div className="flex-1 w-full">
                                          <div className="flex items-center gap-3 mb-2">
                                              <span className="w-10 h-10 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] flex items-center justify-center group-hover:bg-primary/20 transition-all text-[var(--text-secondary)] group-hover:text-primary shrink-0">
                                                  {deuda.categoria === 'pago_empleado' ? <UserIcon className="w-4 h-4"/> : <Building2 className="w-4 h-4"/>}
                                              </span>
                                              <div>
                                                  <p className="text-base font-bold text-[var(--text-primary)] truncate max-w-sm">{deuda.destinatario_nombre || (deuda.categoria === 'pago_empleado' ? 'Empleado / Nómina' : 'Proveedor de Servicios')}</p>
                                                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Emitido: {new Date(deuda.fecha_egreso + 'T00:00:00').toLocaleDateString()} — CXP Original: <span className="line-through font-mono font-normal">${deuda.monto_total?.toFixed(2)}</span></p>
                                              </div>
                                          </div>
                                      </div>

                                      <div className="w-full lg:w-1/3 mx-0 px-2">
                                          <div className="flex justify-between text-[9px] font-bold tracking-widest uppercase mb-1.5">
                                              <span className="text-green-400 text-right">Pagado: ${pagado.toFixed(2)}</span>
                                          </div>
                                          <div className="w-full h-2 bg-[var(--bg-input)] rounded-full overflow-hidden border border-[var(--border-soft)]">
                                              <div className="h-full bg-primary/60" style={{ width: `${pctAbonado}%` }}></div>
                                          </div>
                                      </div>

                                      <div className="flex items-center justify-between lg:w-1/4 w-full pl-0 lg:pl-6">
                                          <div className="text-left lg:text-right">
                                              <span className="text-[10px] uppercase font-black tracking-widest text-primary/60 block mb-1">Deuda Viva</span>
                                              <span className="text-2xl font-black font-mono text-[var(--text-primary)]">${deuda.saldo_pendiente?.toFixed(2)}</span>
                                          </div>
                                          <ChevronDown className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-180 text-primary' : ''}`} />
                                      </div>
                                  </div>

                                  {/* Form Panel Abajo Expansible */}
                                  {isExpanded && (
                                      <div className="bg-[var(--bg-surface-1)] border-t border-[var(--border-soft)] p-6 lg:p-10 animate-in slide-in-from-top-4 flex flex-col lg:flex-row gap-10">
                                          
                                          {/* Col 1: Historial Consolidado de Abonos */}
                                          <div className="flex-1">
                                              <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2"><FileText className="w-3 h-3"/> Historial Consolidado de Amortización</h4>
                                              <div className="space-y-3">
                                                  {deuda.abonos?.length === 0 ? (
                                                      <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 block p-3 bg-red-400/10 border border-red-400/20 rounded-xl">Inactivo. Deuda a Plazo Forzoso (Vía 100%)</span>
                                                  ) : (
                                                      <div className="bg-[var(--bg-surface-2)] rounded-xl border border-[var(--border-soft)] p-2 space-y-2 max-h-[250px] overflow-y-auto no-scrollbar">
                                                          {deuda.abonos.map((abo, i) => (
                                                              <div key={i} className="bg-[var(--bg-surface-2)] p-3 rounded-lg flex justify-between items-center text-sm border border-[var(--border-soft)]">
                                                                  <div className="flex flex-col">
                                                                     <span className="text-[10px] font-bold text-[var(--text-secondary)] mb-1">{new Date(abo.created_at || abo.fecha_pago || abo.fecha || new Date()).toLocaleDateString()} a las {new Date(abo.created_at || abo.fecha || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                                     <span className="text-xs font-bold text-[var(--text-primary)]/80"><CreditCard className="inline w-3 h-3 opacity-40 mr-1"/> {abo.referencia || abo.metodo_pago} — {abo.descripcion || 'Abono base'}</span>
                                                                  </div>
                                                                  <div className="flex flex-col text-right">
                                                                     <span className="font-mono font-black text-[var(--text-primary)] text-base">${abo.monto?.toFixed(2)}</span>
                                                                     <span className="text-[8px] uppercase tracking-widest text-[var(--text-muted)] mt-1">Ref: {abo.nombre_registrador_snapshot || abo.registrado_por_nombre || 'Sistema'}</span>
                                                                  </div>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  )}
                                              </div>
                                          </div>

                                          {/* Col 2: Cajón Formulario Nuevo Abono */}
                                          <div className="w-full lg:w-96 bg-primary/5 p-6 rounded-2xl border border-primary/20 shrink-0">
                                              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-6 text-center">Inyectar Abono Temporal</h4>
                                              <form onSubmit={(e) => registrarAbono(e, deuda.id)} className="space-y-4">
                                                  <div>
                                                      <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest mb-1.5 block">Transferir Vía</label>
                                                      <select required className="input-guambra !h-12 !bg-[var(--bg-input)]" value={formAbono.metodo_pago} onChange={e => setFormAbono({...formAbono, metodo_pago: e.target.value})}>
                                                          {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                                                      </select>
                                                  </div>
                                                  <div>
                                                      <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest mb-1.5 block">Descripción Contable Externa</label>
                                                      <input type="text" className="input-guambra !bg-[var(--bg-input)]" value={formAbono.descripcion} onChange={e => setFormAbono({...formAbono, descripcion: e.target.value})} placeholder="Transferencia o Comprobante..." />
                                                  </div>
                                                  <div>
                                                      <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest mb-1.5 block">Capital Liquidado ($)</label>
                                                      <input required type="number" step="0.01" max={deuda.saldo_pendiente} className="input-guambra !bg-[var(--bg-input)] font-mono font-black text-xl text-primary text-center tracking-wider" value={formAbono.monto} onChange={e => setFormAbono({...formAbono, monto: e.target.value})} placeholder="0.00" />
                                                  </div>
                                                  
                                                  <button type="submit" className="btn-guambra-primary w-full mt-2">Cargar Ficha Cuota</button>
                                              </form>
                                              
                                              {/* Finalizar Pago Forzoso si Saldo es menor igual a cero (Aunque por UI se actualiza automatico, es bueno visualmente) */}
                                              {deuda.saldo_pendiente <= 0 && (
                                                  <button onClick={() => finalizarPagoPorCompleto(deuda.id)} className="w-full mt-4 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold text-[10px] uppercase tracking-widest py-3 rounded-lg transition-colors border border-green-500/30 flex justify-center items-center gap-2">
                                                      <CheckCircle2 className="w-4 h-4"/> Confirmar Liquidación Total
                                                  </button>
                                              )}
                                          </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    )}

            {/* MODAL DETALLE DE EGRESO */}
            {modalEgreso && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[var(--bg-surface-1)] border border-[var(--border-soft)] rounded-2xl w-full max-w-3xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-[var(--border-soft)] flex justify-between items-start bg-[var(--bg-surface-2)]">
                            <div>
                                <span className="px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md text-[9px] font-black uppercase tracking-widest mb-3 inline-block">
                                    Detalle de Transacción
                                </span>
                                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">{modalEgreso.destinatario_nombre}</h2>
                                <p className="text-xs text-[var(--text-muted)] font-mono">
                                    Emitido: {new Date(modalEgreso.fecha_egreso + 'T00:00:00').toLocaleDateString()} {modalEgreso.created_at ? new Date(modalEgreso.created_at).toLocaleTimeString() : ''}
                                    {/* Ref check */}
                                    <span className="ml-4 pl-4 border-l border-[var(--border-soft)]">Ref: {modalEgreso.id.substring(0, 8)}</span>
                                </p>
                            </div>
                            <button onClick={() => setModalEgreso(null)} className="w-8 h-8 rounded-lg bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] flex items-center justify-center text-[var(--text-secondary)] transition-colors">
                                X
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-[var(--bg-surface-2)] border border-[var(--border-soft)] p-4 rounded-xl">
                                    <span className="block text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Categoría</span>
                                    <span className="font-bold text-sm text-[var(--text-primary)]">{CATEGORIAS_EGRESO.find(c => c.value === modalEgreso.categoria)?.label || modalEgreso.categoria}</span>
                                </div>
                                <div className="bg-[var(--bg-surface-2)] border border-[var(--border-soft)] p-4 rounded-xl">
                                    <span className="block text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Operación</span>
                                    <span className="font-bold text-sm text-[var(--text-primary)] capitalize">{modalEgreso.modalidad}</span>
                                </div>
                                <div className="bg-[var(--bg-surface-2)] border border-[var(--border-soft)] p-4 rounded-xl">
                                    <span className="block text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Estado</span>
                                    <span className={`font-bold text-sm ${modalEgreso.estado_deuda === 'pagado' ? 'text-green-400' : 'text-orange-400'}`}>
                                        {modalEgreso.estado_deuda.toUpperCase()}
                                    </span>
                                </div>
                                <div className="bg-[var(--bg-surface-2)] border border-[var(--border-soft)] p-4 rounded-xl">
                                    <span className="block text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Total Egreso</span>
                                    <span className="font-mono font-black text-rose-400 text-lg">${modalEgreso.monto_total?.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Details Table */}
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Desglose de Factura ({modalEgreso.lineas_egreso?.length > 0 ? modalEgreso.lineas_egreso.length : modalEgreso.descripcion.split(';').length} conceptos)
                                </h3>
                                <div className="border border-[var(--border-soft)] rounded-xl overflow-hidden bg-[var(--bg-surface-2)]">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-[var(--bg-surface-3)] border-b border-[var(--border-soft)]">
                                            <tr>
                                                <th className="p-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center w-16">Cant.</th>
                                                <th className="p-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Descripción</th>
                                                <th className="p-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right w-24">Costo U.</th>
                                                <th className="p-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right w-28">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-soft)] text-[var(--text-primary)]">
                                            {modalEgreso.lineas_egreso && modalEgreso.lineas_egreso.length > 0 ? (
                                                // Render structured data from DB (lineas_egreso)
                                                modalEgreso.lineas_egreso.map((linea, idx) => (
                                                    <tr key={idx} className="hover:bg-[var(--bg-surface-3)]">
                                                        <td className="p-3 text-center text-[var(--text-secondary)] font-mono">{linea.cantidad || 1}</td>
                                                        <td className="p-3">{linea.descripcion}</td>
                                                        <td className="p-3 text-right text-[var(--text-secondary)] font-mono">${Number(linea.precio_unitario || 0).toFixed(2)}</td>
                                                        <td className="p-3 text-right font-mono font-bold">${Number(linea.subtotal || 0).toFixed(2)}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                // Fallback to split description if relational data missing (legacy records)
                                                modalEgreso.descripcion.split(';').map((desc, idx) => {
                                                    const text = desc.trim();
                                                    if (!text) return null;
                                                    return (
                                                        <tr key={idx} className="hover:bg-[var(--bg-surface-3)]">
                                                            <td className="p-3 text-center text-[var(--text-muted)] italic">-</td>
                                                            <td className="p-3">{text}</td>
                                                            <td className="p-3 text-right text-[var(--text-muted)] italic">-</td>
                                                            <td className="p-3 text-right text-[var(--text-muted)] italic">-</td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                        <tfoot className="bg-[var(--bg-surface-3)] border-t py-2 border-[var(--border-soft)]">
                                            <tr>
                                                <td colSpan="3" className="p-3 text-right text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">Total General</td>
                                                <td className="p-3 text-right font-mono font-black text-rose-400">${modalEgreso.monto_total?.toFixed(2)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Footer Action */}
                            <div className="flex justify-end pt-4 border-t border-[var(--border-soft)]">
                                <button onClick={() => setModalEgreso(null)} className="btn-guambra-secondary h-12 px-8">
                                    Cerrar Visualizador
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
