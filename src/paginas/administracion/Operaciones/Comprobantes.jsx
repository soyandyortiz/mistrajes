import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'sonner';
import { 
  FileText, Search, Plus, Trash2, Calendar, 
  User, CheckCircle2, Clock, FileDown, Eye,
  AlertCircle, DollarSign, Calculator, ChevronRight, Check, Loader2
} from 'lucide-react';

const ModuleNavbar = ({ currentTab, setTab }) => (
  <div className="border-b border-[var(--border-soft)] pb-px mb-8 overflow-x-auto no-scrollbar">
    <nav className="-mb-px flex gap-6">
      <button onClick={() => setTab('comprobantes')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${currentTab === 'comprobantes' || currentTab === 'generar_comprobante' ? 'border-primary text-primary' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'}`}>
        <CheckCircle2 className="w-3 h-3"/> Comprobantes Reales
      </button>
      <button onClick={() => setTab('proformas_lista')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all ${currentTab.startsWith('proformas') ? 'border-primary text-primary' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'}`}>
        Cotizaciones / Proformas
      </button>
    </nav>
  </div>
);

export default function ComprobantesProformas() {
  const { profile, loading: authLoading } = useAuthStore();
  
  const [currentTab, setTab] = useState('comprobantes'); 
  // 'comprobantes' | 'generar_comprobante' | 'proformas_lista' | 'nueva_proforma' | 'ver_proforma'
  const [loading, setLoading] = useState(false);

  // --- ESTADOS COMPROBANTES ---
  const [contratosElegibles, setContratosElegibles] = useState([]);
  const [searchComprobante, setSearchComprobante] = useState('');
  const [contratoActivo, setContratoActivo] = useState(null);
  const [cobrosAdicionales, setCobrosAdicionales] = useState([]); // {id, desc, monto}

  // --- ESTADOS PROFORMAS ---
  const [proformasList, setProformasList] = useState([]);
  const [proformaActiva, setProformaActiva] = useState(null);
  const [searchProforma, setSearchProforma] = useState('');

  // Formulario Nueva Proforma
  const pFormInit = {
      cliente_nombre: '',
      cliente_id: '',
      cliente_email: '',
      cliente_celular: '',
      productos: [], // {id, nombre, cantidad, p_unitario, descuento_tipo, descuento_val, subtotal}
      vigencia_dias: 5
  };
  const [proformaForm, setProformaForm] = useState(pFormInit);
  const [isProcessing, setIsProcessing] = useState(false);


  const fetchDatos = async () => {
    setLoading(true);
    try {
      // 1. MOCK COMPROBANTES (Contratos Devueltos)
      setContratosElegibles([
          {
              id: 'CNT-001X',
              cliente_nombre: 'Mariana Silva Valdés',
              cliente_identificacion: '1728394056',
              fecha_evento: '2026-03-01',
              estado: 'Devuelto sin problemas',
              total_pagado: 150.00,
              garantia_dejada: 50.00,
              garantia_devuelta: true,
              productos: [
                  { desc: 'Vestido Turquesa Colección Z', cant: 1, precio: 120 },
                  { desc: 'Zapatos Strass Pplateados', cant: 1, precio: 30 }
              ]
          },
          {
              id: 'CNT-002Y',
              cliente_nombre: 'Andrés García',
              cliente_identificacion: '0987654321',
              fecha_evento: '2026-02-28',
              estado: 'Con inconvenientes — Solucionado',
              total_pagado: 200.00,
              garantia_dejada: 100.00,
              garantia_devuelta: false, // Cobrada por daños
              notas_incidentes: 'Quemadura de cigarrillo en bastilla, reparación deducida de garantía.',
              productos: [
                  { desc: 'Esmoquin Black Tie L', cant: 1, precio: 200 }
              ]
          }
      ]);

      // 2. MOCK PROFORMAS
      const f1 = new Date(); f1.setDate(f1.getDate() + 3); // Vence en 3 dias (Vigente)
      const f2 = new Date(); f2.setDate(f2.getDate() - 2); // Venció hace 2 dias (Vencida)

      setProformasList([
          {
              id: 'PRF-501A',
              cliente_nombre: 'Consorcio B2B Eventos',
              fecha_creacion: new Date().toISOString().split('T')[0],
              vigencia_hasta: f1.toISOString().split('T')[0],
              estado: 'Vigente',
              vigencia_dias: 7,
              total: 450.00,
              productos: [
                  { nombre: 'Lote Trajes Ejecutivos Azules', cantidad: 5, p_unitario: 100, descuento_val: 50, subtotal: 450 }
              ]
          },
          {
              id: 'PRF-499Z',
              cliente_nombre: 'Camila Pólit',
              fecha_creacion: new Date(Date.now() - 7*86400000).toISOString().split('T')[0],
              vigencia_hasta: f2.toISOString().split('T')[0],
              estado: 'Vencida',
              vigencia_dias: 5,
              total: 120.00,
              productos: [
                  { nombre: 'Vestido de Novia Civil Sencillo', cantidad: 1, p_unitario: 120, descuento_val: 0, subtotal: 120 }
              ]
          }
      ]);

    } catch (e) {
      toast.error('Error cargando módulo contable comprobatorio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && profile?.tenant_id) fetchDatos();
    else if (!authLoading && !profile?.tenant_id) setLoading(false);
  }, [authLoading, profile?.tenant_id]);


  // --- LOGICA COMPROBANTES ---

  const listContratosFiltrada = contratosElegibles.filter(c => {
      const q = searchComprobante.toLowerCase();
      if(!q) return true;
      return c.id.toLowerCase().includes(q) || c.cliente_nombre.toLowerCase().includes(q) || c.cliente_identificacion.includes(q);
  });

  const iniciarComprobante = (c) => {
      setContratoActivo({ ...c });
      setCobrosAdicionales([]);
      setTab('generar_comprobante');
  };

  const addCobroExtra = () => {
      setCobrosAdicionales([...cobrosAdicionales, { id: Date.now(), desc: '', monto: '' }]);
  };
  const removeCobroExtra = (id) => {
      setCobrosAdicionales(cobrosAdicionales.filter(c => c.id !== id));
  };
  const updateCobroExtra = (id, field, val) => {
      setCobrosAdicionales(cobrosAdicionales.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  const generarPDFComprobante = () => {
      // Simula generacion de PDF e impresión
      window.print();
      toast.success('Documento despachado a la cola de impresión / guardado PDF.');
  };


  // --- LOGICA PROFORMAS ---

  const handleProformaChange = (f, v) => setProformaForm(p => ({...p, [f]: v}));

  const addProductoProforma = () => {
      setProformaForm(p => ({
          ...p,
          productos: [...p.productos, { id: Date.now(), nombre: '', cantidad: 1, p_unitario: 0, descuento_tipo: 'Fijo', descuento_val: 0, subtotal: 0 }]
      }));
  };
  
  const removeProductoProforma = (id) => {
      setProformaForm(p => ({
          ...p,
          productos: p.productos.filter(x => x.id !== id)
      }));
  };

  const updateProductoProforma = (id, field, val) => {
      setProformaForm(prev => {
          const arr = prev.productos.map(p => {
              if(p.id !== id) return p;
              const nP = { ...p, [field]: val };
              
              // Recalcular subtotal
              let bruto = (parseFloat(nP.cantidad) || 0) * (parseFloat(nP.p_unitario) || 0);
              let desc = parseFloat(nP.descuento_val) || 0;
              
              if(nP.descuento_tipo === '%') {
                  bruto = bruto - (bruto * (desc / 100));
              } else {
                  bruto = bruto - desc;
              }
              nP.subtotal = Math.max(0, bruto);
              return nP;
          });
          return { ...prev, productos: arr };
      });
  };

  const proformaTotal = proformaForm.productos.reduce((acc, p) => acc + (p.subtotal || 0), 0);

  const generarProformaBD = async (e) => {
      e.preventDefault();
      setIsProcessing(true);
      try {
          if(!proformaForm.cliente_nombre || proformaForm.productos.length === 0) throw new Error('Cliente o productos no presentes.');

          const fechaEmision = new Date();
          const fechaVence = new Date();
          fechaVence.setDate(fechaVence.getDate() + parseInt(proformaForm.vigencia_dias));

          const payload = {
              id: `PRF-${Math.floor(Math.random() * 900) + 100}T`,
              cliente_nombre: proformaForm.cliente_nombre,
              fecha_creacion: fechaEmision.toISOString().split('T')[0],
              vigencia_hasta: fechaVence.toISOString().split('T')[0],
              vigencia_dias: proformaForm.vigencia_dias,
              estado: 'Vigente',
              total: proformaTotal,
              productos: proformaForm.productos
          };

          setProformasList([payload, ...proformasList]);
          toast.success('Proforma generada en el sistema. Lista para exportar en PDF.');
          
          setProformaForm(pFormInit);
          setTab('proformas_lista');

          // Autoselect para imprimir/ver
          setTimeout(() => {
              setProformaActiva(payload);
              setTab('ver_proforma');
          }, 500);

      } catch (err) {
          toast.error(err.message || 'Error calculando tabla dinámica');
      } finally {
          setIsProcessing(false);
      }
  };

  const filterProformasL = proformasList.filter(p => {
      const q = searchProforma.toLowerCase();
      if(!q) return true;
      return p.id.toLowerCase().includes(q) || p.cliente_nombre.toLowerCase().includes(q);
  });


  return (
    <div className="animate-in fade-in duration-500 pb-20">
       <div className="mb-8 print-hidden">
           <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter uppercase mb-2 flex items-center gap-3"><FileText className="w-8 h-8 text-primary"/> Oficina de Facturación</h1>
           <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">Comprobantes Finales y Cotizaciones</p>
       </div>
       
       <div className="print-hidden">
           <ModuleNavbar currentTab={currentTab} setTab={setTab} />
       </div>

       {/* ========================================================== */}
       {/* VISTA: COMPROBANTES (PUNTO DE DEVOLUCIÓN FINAL)     */}
       {/* ========================================================== */}
       
       {currentTab === 'comprobantes' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4">
              
              <div className="glass-card bg-primary/5 relative overflow-hidden flex flex-col md:flex-row justify-between items-center p-8 border border-primary/20">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                  <div className="relative z-10 w-full mb-4 md:mb-0">
                      <h2 className="text-xl font-black uppercase tracking-widest text-[var(--text-primary)] flex items-center gap-3 mb-2"><CheckCircle2 className="w-6 h-6 text-primary"/> Generador de Finiquitos</h2>
                      <p className="text-xs font-bold text-primary/60 max-w-lg">Exclusivo para operaciones legalmente cerradas (Trajes Devueltos Totalmente). Utilizar este panel para expedir el ticket final al cliente tras saldar todas las cuentas de pérdida, daños o saldos pendientes.</p>
                  </div>
              </div>

              <div className="flex glass-card p-4 relative">
                 <input type="text" className="input-guambra w-full h-12 text-sm" placeholder="ID Reserva o Nombre del Arrendatario..." value={searchComprobante} onChange={e => setSearchComprobante(e.target.value)} />
              </div>

              <div className="glass-card overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)]">
                          <tr>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] w-1/4">Titular y Ficha</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Estado de Recepción Operativa</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Volumen Cobrado</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Extensión de Finiquito</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-[var(--border-soft)]">
                          {loading ? (
                             <tr><td colSpan="4" className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
                          ) : listContratosFiltrada.length === 0 ? (
                             <tr><td colSpan="4" className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Ningún contrato liquidado encaja con la búsqueda.</td></tr>
                          ) : listContratosFiltrada.map(c => (
                             <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="p-4">
                                   <p className="font-bold text-[var(--text-primary)] text-base">{c.cliente_nombre}</p>
                                   <div className="flex gap-2 mt-1">
                                       <span className="text-[10px] font-mono tracking-widest uppercase text-white/50 border border-white/10 px-1 rounded bg-black/40">{c.id}</span>
                                       <span className="text-[10px] font-mono tracking-widest text-primary/50 flex items-center gap-1"><User className="w-3 h-3"/> {c.cliente_identificacion}</span>
                                   </div>
                                </td>
                                <td className="p-4">
                                   <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-dashed flex w-fit ${c.estado.includes('sin problemas') ? 'bg-green-500/5 text-green-500/80 border-green-500/20' : 'bg-orange-500/5 text-orange-500/80 border-orange-500/20'}`}>
                                       {c.estado}
                                   </span>
                                </td>
                                <td className="p-4 text-right">
                                   <span className="text-lg font-mono font-black text-white">${c.total_pagado?.toFixed(2)}</span>
                                </td>
                                <td className="p-4 text-right">
                                   <button onClick={() => iniciarComprobante(c)} className="btn-guambra-primary !px-4 !py-2 text-[10px] flex gap-2 ml-auto shadow-none">
                                       Construir Documento <ChevronRight className="w-3 h-3"/>
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

       {/* MODAL / VISTA GENERAR COMPROBANTE - PDF */}
       {currentTab === 'generar_comprobante' && contratoActivo && (
           <div className="animate-in slide-in-from-right-4">
               <button onClick={() => setTab('comprobantes')} className="btn-guambra-secondary self-start mb-4 !px-6 text-[10px] border-none print-hidden">← Menú de Contratos</button>
               
               <div className="glass-card max-w-3xl mx-auto p-0 overflow-hidden bg-white/5 printable-area" id="area-comprobante">
                    {/* Header Ticket */}
                    <div className="bg-[#0f0f11] p-10 border-b border-white/10 relative print-bg-white print-border-black">
                        <div className="absolute top-10 right-10 text-right">
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-white print-text-black">Comprobante No.</h2>
                            <span className="text-primary font-mono font-black text-sm p-1 px-2 border border-primary/20 bg-primary/10 rounded print-bg-transparent print-text-black">CB-{Math.floor(Math.random() * 90000)}</span>
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center p-2 print-border-black border">
                                <div className="w-full h-full bg-black rounded-full mix-blend-multiply opacity-50"></div>
                            </div>
                            <div>
                                <h1 className="text-xl font-black uppercase text-white print-text-black">Tenant Mis Trajes SA</h1>
                                <p className="text-xs font-bold text-white/50 print-text-black">RUC: 1790000000001 | Matriz Principal</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-white/10 print-border-black">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-primary mb-1 block print-text-black">A nombre de:</span>
                                <p className="font-bold text-white text-base uppercase print-text-black">{contratoActivo.cliente_nombre}</p>
                                <p className="text-xs font-mono text-white/60 print-text-black">CI/RUC: {contratoActivo.cliente_identificacion}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] font-black uppercase tracking-widest text-primary mb-1 block print-text-black">Fecha de Expedición:</span>
                                <p className="font-bold text-white text-base print-text-black">{new Date().toLocaleDateString()}</p>
                                <p className="text-xs font-mono text-white/60 print-text-black">Ref Contrato Interno: {contratoActivo.id}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-10 space-y-8">
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 border-b border-white/10 pb-2 mb-4 print-text-black print-border-black">Cuerpo Comercial (Productos Originales)</h4>
                            <table className="w-full text-left print-text-black">
                                <thead>
                                    <tr className="text-[9px] uppercase font-black text-white/60 opacity-60 print-text-black">
                                        <th className="pb-2">Cant</th>
                                        <th className="pb-2">Descripción Insumo</th>
                                        <th className="pb-2 text-right">Unit.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contratoActivo.productos.map((p,i) => (
                                        <tr key={i} className="border-b border-white/5 print-border-black">
                                            <td className="py-3 text-sm font-black font-mono">{p.cant}x</td>
                                            <td className="py-3 font-bold text-sm text-white/90 print-text-black">{p.desc}</td>
                                            <td className="py-3 text-right font-mono font-bold text-white/80 print-text-black">${p.precio.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* ZONA INTERACTIVA / VIVA: Agregado de Cargos  (Oculta en impresion si vacia, interactiva en web) */}
                        <div className="bg-orange-500/5 p-6 rounded-2xl border border-orange-500/20 print-hidden">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h4 className="text-xs font-black uppercase text-orange-400 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Cargos Extraordinarios Post-Devolución</h4>
                                    <p className="text-[10px] text-orange-400/50">Mora, Daños graves, Pérdida de ganchos que exige cobro fuera de contrato general.</p>
                                </div>
                                <button type="button" onClick={addCobroExtra} className="btn-guambra-secondary bg-orange-500/10 text-orange-400 border-none hover:bg-orange-500/20 !py-1.5"><Plus className="w-4 h-4 mr-1 inline"/> Sumar Renglón</button>
                            </div>

                            {cobrosAdicionales.map((c, i) => (
                                <div key={c.id} className="flex gap-4 items-center mt-3 animate-in fade-in">
                                    <input type="text" placeholder="Concepto del cobro extra (Ej. Quemadura Plancha)" className="input-guambra flex-[3] !bg-black" value={c.desc} onChange={e => updateCobroExtra(c.id, 'desc', e.target.value)} />
                                    <div className="relative flex-[1]">
                                        <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30"/>
                                        <input type="number" placeholder="0.00" step="0.01" className="input-guambra pl-10 font-mono !bg-black" value={c.monto} onChange={e => updateCobroExtra(c.id, 'monto', e.target.value)} />
                                    </div>
                                    <button onClick={() => removeCobroExtra(c.id)} className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            ))}
                        </div>

                        {/* Visible en Impresion SI hay extras */}
                        {cobrosAdicionales.length > 0 && (
                            <div className="print-only hidden print:block pt-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-black border-b border-black pb-2 mb-4">Mora y Penalizaciones Ejecutadas</h4>
                                <table className="w-full text-left text-black">
                                    <tbody>
                                        {cobrosAdicionales.map((c, i) => (c.desc && c.monto) && (
                                            <tr key={i} className="border-b border-gray-300">
                                                <td className="py-2 text-sm font-bold w-3/4">{c.desc}</td>
                                                <td className="py-2 text-right font-mono font-bold">${Number(c.monto).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="flex flex-col items-end pt-6 border-t border-white/10 print-border-black font-mono">
                            <div className="w-full max-w-xs space-y-2">
                                <div className="flex justify-between text-white/60 print-text-black text-sm">
                                    <span>Venta Base Liquidada:</span>
                                    <span>${contratoActivo.total_pagado.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-orange-400 print-text-black text-sm">
                                    <span>Sumatoria Penalizaciones:</span>
                                    <span>+${cobrosAdicionales.reduce((acc, c) => acc + (parseFloat(c.monto)||0), 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xl font-black text-white print-text-black uppercase tracking-tighter pt-4 border-t border-white/20 print-border-black">
                                    <span>Cobro Global Real:</span>
                                    <span>${ (contratoActivo.total_pagado + cobrosAdicionales.reduce((acc, c) => acc + (parseFloat(c.monto)||0), 0)).toFixed(2) }</span>
                                </div>
                            </div>
                        </div>

                    </div>
               </div>

               <div className="max-w-3xl mx-auto flex justify-end mt-6 pb-20 print-hidden">
                    <button onClick={generarPDFComprobante} className="btn-guambra-primary !bg-white text-black hover:bg-gray-200 shadow-xl shadow-white/20 border-white flex items-center gap-2">
                        <FileDown className="w-5 h-5"/> Imprimir Papel / Generar PDF Nativo
                    </button>
               </div>
           </div>
       )}



       {/* ========================================================== */}
       {/* VISTA: LISTA DE PROFORMAS / HISTORIAL               */}
       {/* ========================================================== */}
       
       {currentTab === 'proformas_lista' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center mb-4">
                  <div className="flex glass-card p-3 relative flex-1 max-w-sm">
                     <input type="text" className="input-guambra w-full h-10 text-sm !border-none" placeholder="Buscar Razón Social o ID..." value={searchProforma} onChange={e => setSearchProforma(e.target.value)} />
                  </div>
                  <button onClick={() => setTab('nueva_proforma')} className="btn-guambra-primary flex items-center gap-2">
                      <Plus className="w-4 h-4"/> Emitir Proforma (Nuevo Trato)
                  </button>
              </div>

              <div className="glass-card overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-white/5 border-b border-white/10">
                          <tr>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-white/50 w-1/4">Folio Proforma</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-white/50">Línea de Vida Comercial</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-white/50 text-center">Estado Técnico</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-white/50 text-right">Potencial Facturado</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-white/50 text-right">Firma Digital</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {filterProformasL.length === 0 ? (
                             <tr><td colSpan="5" className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-white/30">Librería de cotizaciones vacía.</td></tr>
                          ) : filterProformasL.map(p => {
                              // Validacion en vivo
                              const hVencida = new Date() > new Date(p.vigencia_hasta + 'T23:59:59Z');

                              return (
                                 <tr key={p.id} className={`hover:bg-white/[0.02] transition-colors ${hVencida ? 'opacity-50 hover:opacity-100 mix-blend-luminosity' : ''}`}>
                                    <td className="p-4">
                                       <p className="font-bold text-white text-base">{p.cliente_nombre}</p>
                                       <span className="text-[10px] font-mono tracking-widest uppercase text-white/50 block mt-1">{p.id}</span>
                                    </td>
                                    <td className="p-4">
                                       <div className="flex flex-col gap-1.5">
                                           <span className="text-[9px] font-bold tracking-widest text-white/50 uppercase"><Clock className="w-3 h-3 inline text-white/30"/> Nace: {new Date(p.fecha_creacion).toLocaleDateString()}</span>
                                           <span className="text-[9px] font-bold tracking-widest text-primary/80 uppercase">Muere: {new Date(p.vigencia_hasta).toLocaleDateString()}</span>
                                       </div>
                                    </td>
                                    <td className="p-4 text-center">
                                       <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-dashed text-center inline-block ${!hVencida ? 'bg-primary/10 text-primary border-primary/30' : 'bg-red-500/10 text-red-500/80 border-red-500/20'}`}>
                                           {!hVencida ? `${p.vigencia_dias} Días Activa` : 'Vencida o Quemada'}
                                       </span>
                                    </td>
                                    <td className="p-4 text-right">
                                       <span className="text-lg font-mono font-black text-[var(--text-primary)]">${p.total?.toFixed(2)}</span>
                                    </td>
                                    <td className="p-4 text-right">
                                       <button onClick={() => { setProformaActiva(p); setTab('ver_proforma'); }} className="p-2.5 rounded-lg text-white/80 hover:text-white bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all font-black text-xs uppercase tracking-widest flex ml-auto gap-2">
                                            <Calculator className="w-4 h-4"/> Cotización
                                       </button>
                                    </td>
                                 </tr>
                              )
                          })}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
       )}

       {/* ========================================================== */}
       {/* VISTA: FORMAR NUEVA PROFORMA (MULTI-FASE SIMULADO)  */}
       {/* ========================================================== */}
       
       {currentTab === 'nueva_proforma' && (
           <form onSubmit={generarProformaBD} className="max-w-5xl mx-auto pb-20 animate-in slide-in-from-right-4">
               
               <button type="button" onClick={() => setTab('proformas_lista')} className="btn-guambra-secondary self-start mb-6 !px-6 text-[10px] border-transparent"><ChevronRight className="w-3 h-3 rotate-180 inline"/> Cancelar Arquitectura</button>
               
               <div className="glass-card p-10 space-y-12">
                   
                   <div className="border-b border-white/10 pb-6">
                       <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2"><Calculator className="w-6 h-6 inline mr-2 text-primary -translate-y-1"/> Mesa de Cotización Previa</h2>
                       <p className="text-xs text-white/50 max-w-xl">Crea presupuestos magnéticos formales. Estos documentos carecen de peso legal final o reserva de inventario, operan como un imán para concretar Contratos más tarde.</p>
                   </div>

                   {/* P1: CLIENTE */}
                   <div className="space-y-6">
                       <h3 className="text-[10px] uppercase font-black text-primary tracking-[0.2em] flex items-center gap-2"><div className="w-5 h-5 rounded bg-primary/20 flex text-center items-center justify-center text-primary">1</div> Sujeto de Cotización y Envío</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/20 p-6 rounded-2xl border border-white/5">
                           <div className="md:col-span-2">
                               <label className="text-[10px] uppercase tracking-widest font-bold text-white/50 mb-2 block">Nombre Jurídico Comercial o Persona <span className="text-primary">*</span></label>
                               <input required type="text" className="input-guambra !h-14 font-bold text-white" value={proformaForm.cliente_nombre} onChange={e => handleProformaChange('cliente_nombre', e.target.value)} placeholder="A quién se extiende este sobre sellado..." />
                           </div>
                           <div>
                               <label className="text-[10px] uppercase tracking-widest font-bold text-white/50 mb-2 block">Cédula / RUC Empresarial</label>
                               <input type="text" className="input-guambra" value={proformaForm.cliente_id} onChange={e => handleProformaChange('cliente_id', e.target.value)} />
                           </div>
                           <div>
                               <label className="text-[10px] uppercase tracking-widest font-bold text-white/50 mb-2 block">Canal Directo de Envío (Mail / WP)</label>
                               <input type="text" className="input-guambra" value={proformaForm.cliente_email} onChange={e => handleProformaChange('cliente_email', e.target.value)} placeholder="usuario@empresa.com o Número" />
                           </div>
                       </div>
                   </div>

                   {/* P2: BIENES RAICES / INVENTARIO */}
                   <div className="space-y-6 relative">
                       <h3 className="text-[10px] uppercase font-black text-primary tracking-[0.2em] flex items-center gap-2"><div className="w-5 h-5 rounded bg-primary/20 flex text-center items-center justify-center text-primary">2</div> Inventario / Tabla Blanca Numérica</h3>
                       
                       <div className="bg-[#0f0f11] rounded-2xl border border-white/10 overflow-hidden">
                           <div className="overflow-x-auto">
                           <table className="w-full text-left">
                               <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)]">
                                  <tr>
                                     <th className="p-4 text-[9px] font-black uppercase tracking-widest text-white/50 w-2/5">Item Catalogado</th>
                                     <th className="p-4 text-[9px] font-black uppercase tracking-widest text-white/50 text-center w-20">Uds.</th>
                                     <th className="p-4 text-[9px] font-black uppercase tracking-widest text-white/50 text-right w-32">Costo U.</th>
                                     <th className="p-4 text-[9px] font-black uppercase tracking-widest text-white/50 text-right">Bonificación / Dscto</th>
                                     <th className="p-4 text-[9px] font-black uppercase tracking-widest text-white/50 text-right w-32">Parcial</th>
                                     <th className="p-4 w-12"></th>
                                  </tr>
                               </thead>
                               <tbody className="divide-y divide-white/5 bg-black/20">
                                   {proformaForm.productos.map(p => (
                                       <tr key={p.id} className="group">
                                           <td className="p-3">
                                               <input required type="text" className="input-guambra !h-10 text-sm !bg-black" placeholder="Describa Traje/Bien..." value={p.nombre} onChange={e => updateProductoProforma(p.id, 'nombre', e.target.value)} />
                                           </td>
                                           <td className="p-3">
                                               <input required type="number" min="1" className="input-guambra !h-10 text-sm !bg-black text-center" value={p.cantidad} onChange={e => updateProductoProforma(p.id, 'cantidad', e.target.value)} />
                                           </td>
                                           <td className="p-3 relative">
                                               <DollarSign className="w-3 h-3 absolute left-5 top-1/2 -translate-y-1/2 text-white/30 z-10"/>
                                               <input required type="number" step="0.01" min="0" className="input-guambra !h-10 text-sm font-mono text-right pl-6 !bg-black" value={p.p_unitario} onChange={e => updateProductoProforma(p.id, 'p_unitario', e.target.value)} />
                                           </td>
                                           <td className="p-3">
                                               <div className="flex bg-black rounded-xl overflow-hidden border border-white/10">
                                                   <select className="bg-transparent border-r border-white/10 text-xs font-black text-primary px-2 outline-none" value={p.descuento_tipo} onChange={e => updateProductoProforma(p.id, 'descuento_tipo', e.target.value)}>
                                                       <option value="Fijo">-$</option>
                                                       <option value="%">% Off</option>
                                                   </select>
                                                   <input type="number" min="0" step="0.01" className="w-full bg-transparent text-right text-xs font-mono p-2 outline-none text-white focus:bg-white/5 transition-colors" value={p.descuento_val} onChange={e => updateProductoProforma(p.id, 'descuento_val', e.target.value)} />
                                               </div>
                                           </td>
                                           <td className="p-3 text-right">
                                               <span className="font-mono font-black text-white bg-white/5 py-1.5 px-3 rounded-lg border border-white/5">${(p.subtotal || 0).toFixed(2)}</span>
                                           </td>
                                           <td className="p-3 text-center">
                                               <button type="button" onClick={() => removeProductoProforma(p.id)} className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4"/></button>
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                           </div>
                           
                           <div className="p-4 bg-primary/5 border-t border-primary/20 flex justify-between items-center">
                               <button type="button" onClick={addProductoProforma} className="btn-guambra-secondary bg-primary/10 border-none text-primary/80 hover:bg-primary/20 !py-2 text-[10px]"><Plus className="w-3 h-3 inline mr-1"/> Adicionar Renglón Comprador</button>
                               <div className="flex items-center gap-4 text-right">
                                   <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Macro-Valoración Final</span>
                                   <span className="text-3xl font-black font-mono text-white">${proformaTotal.toFixed(2)}</span>
                               </div>
                           </div>
                       </div>
                   </div>

                   {/* P3: VIGENCIA */}
                   <div className="space-y-6">
                       <h3 className="text-[10px] uppercase font-black text-primary tracking-[0.2em] flex items-center gap-2"><div className="w-5 h-5 rounded bg-primary/20 flex text-center items-center justify-center text-primary">3</div> Vigencia Contractual Condicional</h3>
                       <div className="flex flex-col md:flex-row gap-4">
                           {[5,7,10].map(dias => (
                               <label key={dias} className={`flex-1 glass-card p-6 cursor-pointer border-2 transition-all group relative overflow-hidden flex items-center justify-center text-center gap-3 ${proformaForm.vigencia_dias == dias ? 'border-primary bg-primary/10' : 'border-transparent hover:border-white/10'}`}>
                                   <input type="radio" className="hidden" name="vigencia" value={dias} checked={proformaForm.vigencia_dias == dias} onChange={e => handleProformaChange('vigencia_dias', e.target.value)} />
                                   {proformaForm.vigencia_dias == dias && <Check className="w-5 h-5 text-primary"/>}
                                   <span className={`text-lg font-black uppercase tracking-widest ${proformaForm.vigencia_dias == dias ? 'text-white' : 'text-white/50'}`}>Proteger × {dias} Días</span>
                               </label>
                           ))}
                       </div>
                   </div>

                   <div className="pt-8 border-t border-white/10 flex justify-end">
                       <button type="submit" disabled={isProcessing || proformaForm.productos.length===0} className="btn-guambra-primary !bg-white text-black hover:bg-gray-200 shadow-xl shadow-white/20 border-white flex items-center gap-2 !px-12 !h-16 text-sm disabled:opacity-40">
                           {isProcessing ? <Loader2 className="w-5 h-5 animate-spin"/> : <FileDown className="w-5 h-5"/>} Ensamblar Formulario Proforma Legal
                       </button>
                   </div>
               </div>
           </form>
       )}


       {/* ========================================================== */}
       {/* VISTA: VER PROFORMA (VISOR TIPO A4 / PDF)           */}
       {/* ========================================================== */}
       
       {currentTab === 'ver_proforma' && proformaActiva && (
            <div className="animate-in slide-in-from-right-4 pt-10">
               <div className="max-w-3xl mx-auto mb-6 flex justify-between items-center print-hidden">
                   <button onClick={() => setTab('proformas_lista')} className="btn-guambra-secondary self-start !px-6 text-[10px] border-none">← Retorno a Cartera Cotizaciones</button>
                   <button onClick={() => window.print()} className="btn-guambra-primary flex items-center gap-2 !px-6 !py-2 bg-primary/20 border-primary/40 text-primary hover:bg-primary/30"><FileDown className="w-4 h-4"/> Descargar PDF Directo</button>
               </div>
               
               {/* La pagina A4 Printable */}
               <div className="bg-white text-black max-w-3xl mx-auto p-12 shadow-2xl printable-area min-h-[900px] flex flex-col justify-between">
                   
                   <div>
                       {/* Header Comercial Proforma */}
                       <div className="flex justify-between items-end border-b-2 border-black pb-8 mb-8">
                           <div className="flex items-center gap-4">
                               <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center p-2"></div>
                               <div>
                                   <h1 className="text-3xl font-black uppercase text-gray-900 tracking-tighter">Mis Trajes</h1>
                                   <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">Propuesta Comercial & Servicios</p>
                               </div>
                           </div>
                           <div className="text-right">
                               <h2 className="text-4xl font-black uppercase text-gray-200 tracking-tighter select-none">Proforma</h2>
                               <span className="text-black font-mono font-black text-sm uppercase">Nº Oficial: {proformaActiva.id}</span>
                           </div>
                       </div>

                       <div className="grid grid-cols-2 gap-8 mb-12">
                           <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                               <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Presentado Formalmente A:</span>
                               <p className="font-black text-gray-900 text-lg uppercase leading-tight">{proformaActiva.cliente_nombre}</p>
                           </div>
                           <div className="space-y-4 pt-2">
                               <div className="flex justify-between border-b border-gray-200 pb-2">
                                   <span className="text-[10px] uppercase font-black text-gray-500">Fecha de Alta Sistema:</span>
                                   <span className="text-sm font-bold text-gray-900">{proformaActiva.fecha_creacion}</span>
                               </div>
                               <div className="flex justify-between border-b border-gray-200 pb-2">
                                   <span className="text-[10px] uppercase font-black text-gray-500">Válido Rigurosamente Hasta:</span>
                                   <span className="text-sm font-black text-primary bg-primary/10 px-2 line-clamp-1">{proformaActiva.vigencia_hasta}</span>
                               </div>
                           </div>
                       </div>

                       {/* Tabla de Productos Proforma */}
                       <div className="rounded-xl border border-gray-200 overflow-hidden mb-8">
                           <table className="w-full text-left">
                               <thead className="bg-gray-100 border-b border-gray-200 text-gray-500">
                                   <tr>
                                       <th className="p-4 text-[9px] uppercase font-black tracking-widest">Descripción Técnica</th>
                                       <th className="p-4 text-[9px] uppercase font-black tracking-widest text-center">Cant.</th>
                                       <th className="p-4 text-[9px] uppercase font-black tracking-widest text-right">P. Unitario</th>
                                       <th className="p-4 text-[9px] uppercase font-black tracking-widest text-right">Subtotal Neto</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-gray-100">
                                   {proformaActiva.productos.map((p, i) => {
                                       const hasDisc = parseFloat(p.descuento_val) > 0;
                                       return (
                                       <tr key={i}>
                                           <td className="p-4 font-bold text-gray-800 text-sm">
                                               {p.nombre}
                                               {hasDisc && <span className="block text-[8px] font-black uppercase text-red-500 mt-1">Beneficia de {p.descuento_tipo === '%' ? p.descuento_val + '% Descuento' : '-$'+p.descuento_val}</span>}
                                           </td>
                                           <td className="p-4 text-center font-mono font-bold text-gray-600">{p.cantidad}</td>
                                           <td className="p-4 text-right font-mono text-gray-500 text-sm">${p.p_unitario}</td>
                                           <td className="p-4 text-right font-mono font-black text-gray-900">${(p.subtotal).toFixed(2)}</td>
                                       </tr>
                                       )
                                   })}
                               </tbody>
                           </table>
                       </div>
                   </div>

                   <div className="border-t-2 border-gray-900 pt-6 mt-12">
                       <div className="flex justify-between flex-wrap gap-8">
                           <div className="max-w-sm">
                               {new Date(proformaActiva.vigencia_hasta + 'T23:59:59Z') < new Date() ? (
                                   <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                       <p className="text-xs font-bold text-red-600 leading-relaxed uppercase">🚫 DOCUMENTO VENCIDO. El precio de esta proforma está caducado y sujeto a cambios drásticos. Contacte al negocio urgentemente para ratificar disponibilidad de armario y actualización del valor real.</p>
                                   </div>
                               ) : (
                                   <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                       <p className="text-[10px] font-bold text-gray-500 leading-relaxed uppercase">El precio y disponibilidad dictado en esta proforma se congela y respeta integralmente solo por los próximos {proformaActiva.vigencia_dias} días hábiles contados tras su expedición. No asegura reserva física del inventario hasta no mediar contrato.</p>
                                   </div>
                               )}
                           </div>
                           <div className="min-w-[250px] text-right">
                               <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Inversión Final Proyectada (USD)</span>
                               <span className="text-5xl font-mono font-black text-gray-900 tracking-tighter">${proformaActiva.total.toFixed(2)}</span>
                           </div>
                       </div>
                   </div>

               </div>
            </div>
       )}

    </div>
  );
}
