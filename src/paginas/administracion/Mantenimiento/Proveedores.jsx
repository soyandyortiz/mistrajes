import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'sonner';
import { 
  Building2, Search, Plus, Trash2, Edit2, Eye, 
  MapPin, User, Phone, Mail, Loader2, CheckCircle2,
  Briefcase, Hash, Globe, AlertCircle, DollarSign
} from 'lucide-react';

const ModuleNavbar = ({ currentTab, setTab }) => (
  <div className="border-b border-[var(--border-soft)] pb-px mb-8 overflow-x-auto no-scrollbar">
    <nav className="-mb-px flex gap-6">
      <button onClick={() => setTab('lista')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all ${currentTab === 'lista' || currentTab === 'perfil' ? 'border-primary text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-medium)]'}`}>Lista de Proveedores</button>
      <button onClick={() => setTab('nuevo')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${currentTab === 'nuevo' || currentTab === 'editar' ? 'border-primary text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-medium)]'}`}><Plus className="w-3 h-3"/> {currentTab === 'editar' ? 'Editar Proveedor' : 'Nuevo Proveedor'}</button>
    </nav>
  </div>
);

export default function Proveedores() {
  const { profile, loading: authLoading } = useAuthStore();
  
  const [currentTab, setTab] = useState('lista'); // 'lista' | 'nuevo' | 'editar' | 'perfil'
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroTipo, setFiltroTipo] = useState(''); // 'Persona Natural' | 'Empresa'

  // Perfil Activo
  const [provActivo, setProvActivo] = useState(null);

  // Formulario
  const initialForm = {
    id: null,
    tipo_entidad: 'Empresa', // 'Empresa' | 'Persona Natural'
    
    // Compartidos / Equivalentes
    identificacion: '', // RUC o Cédula
    nombre_principal: '', // Razón Social o Nombres Completos
    tipo_proveedor: '', // Qué provee
    pais: 'Ecuador',
    ciudad: '',
    direccion: '',
    
    // Contacto (o del encargado)
    nombre_encargado: '', // Solo para Empresa
    celular: '', 
    email: ''
  };
  
  const [formData, setFormData] = useState(initialForm);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchProveedores = async () => {
    setLoading(true);
    try {
      // 1. Obtener Proveedores
      const { data, error } = await supabase.from('proveedores')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') throw error;
      
      const listProvs = data || [];

      // 2. Obtener Deudas (Egresos modalidad credito, estado Pendiente) para cruzar datos
      const { data: deudasData, error: errD } = await supabase.from('egresos')
          .select('proveedor_id, saldo_pendiente')
          .eq('tenant_id', profile.tenant_id)
          .eq('modalidad', 'credito')
          .neq('estado_deuda', 'pagado');
      
      // Si la tabla no existe o error, omitir deudas
      const deudasAgrupadas = {};
      if(!errD || errD.code === '42P01') {
          (deudasData || []).forEach(d => {
              const id = d.proveedor_id;
              if (id) deudasAgrupadas[id] = (deudasAgrupadas[id] || 0) + (d.saldo_pendiente || 0);
          });
      }

      // 3. Mergear Deudas con Proveedores
      const parsedData = listProvs.map(p => ({
          ...p,
          deuda_activa: deudasAgrupadas[p.id] || 0
      }));

      setProveedores(parsedData);
    } catch (e) {
      toast.error('Error cargando catálogo de proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && profile?.tenant_id) fetchProveedores();
    else if (!authLoading && !profile?.tenant_id) setLoading(false);
  }, [authLoading, profile?.tenant_id]);

  // -- ACCIONES DE FORMULARIO --
  const handleChange = (field, val) => {
      setFormData(prev => ({...prev, [field]: val}));
  };

  const guardarProveedor = async (e) => {
      e.preventDefault();
      setIsProcessing(true);
      
      try {
          if(!formData.nombre_principal || !formData.identificacion || !formData.tipo_proveedor) {
             throw new Error('Información obligatoria incompleta reviso los campos con asterisco.');
          }

          const payload = {
              tenant_id: profile.tenant_id,
              tipo_entidad: formData.tipo_entidad === 'Empresa' ? 'empresa' : 'natural',
              identificacion: formData.tipo_entidad === 'Persona Natural' ? formData.identificacion : null,
              ruc_empresa: formData.tipo_entidad === 'Empresa' ? formData.identificacion : null,
              nombre_empresa: formData.tipo_entidad === 'Empresa' ? formData.nombre_principal : null,
              nombre_completo: formData.tipo_entidad === 'Persona Natural' ? formData.nombre_principal : null,
              tipo_proveedor: formData.tipo_proveedor,
              pais: formData.pais,
              ciudad: formData.ciudad,
              direccion: formData.direccion,
              telefono: formData.celular,
              email: formData.email,
              nombre_responsable: formData.tipo_entidad === 'Empresa' ? formData.nombre_encargado : null,
          };
          
          Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

          if (formData.id) {
              const { error } = await supabase.from('proveedores').update(payload).eq('id', formData.id);
              if (error) {
                  if (error.code === '42P01') throw new Error('Simulador: Actualizacion BD Pendiente de Tablas');
                  throw error;
              }
              toast.success('Ficha de proveedor actualizada exhaustivamente');
          } else {
              const { error } = await supabase.from('proveedores').insert([payload]);
              if (error) {
                  if (error.code === '42P01') {
                      // MOCK UI si no hay tabla
                      setProveedores(prev => [{...payload, id: `mock_prov_${Date.now()}`, deuda_activa: 0}, ...prev]);
                      toast.success('Proveedor ingresado en Sandbox Local');
                  } else throw error;
              } else {
                 toast.success('Aliado estratégico agregado a la base de dados.');
              }
          }

          setFormData(initialForm);
          setTab('lista');
          fetchProveedores();

      } catch (err) {
          toast.error(err.message || 'Error guardando datos corporativos del proveedor');
      } finally {
          setIsProcessing(false);
      }
  };

  const editar = (p) => {
      setFormData({
         ...initialForm,
         id: p.id,
         tipo_entidad: p.tipo_entidad === 'empresa' ? 'Empresa' : 'Persona Natural',
         identificacion: p.tipo_entidad === 'empresa' ? p.ruc_empresa || '' : p.identificacion || '',
         nombre_principal: p.tipo_entidad === 'empresa' ? p.nombre_empresa || '' : p.nombre_completo || '',
         tipo_proveedor: p.tipo_proveedor || '',
         pais: p.pais || 'Ecuador',
         ciudad: p.ciudad || '',
         direccion: p.direccion || '',
         nombre_encargado: p.nombre_responsable || '',
         celular: p.telefono || '',
         email: p.email || ''
      });
      setTab('editar');
  };

  const verPerfil = async (p) => {
      setProvActivo(p);
      setTab('perfil');
  };

  const deleteProv = async (id) => {
      if(!confirm('¿Remover este proveedor de la cartera de afiliados? Las cuentas por pagar antiguas seguirán reflejándose solo como trazabilidad estática.')) return;
      try {
          if (!id.toString().startsWith('mock_')) {
              await supabase.from('proveedores').update({ deleted_at: new Date() }).eq('id', id);
          } else {
              setProveedores(prev => prev.filter(x => x.id !== id));
          }
          toast.success('Asociación comercial removida');
          fetchProveedores();
      } catch (e) {
          toast.error('Grave: Error limitando registro foráneo');
      }
  };


  // -- RENDER FILTRADO LISTA --
  const listaFiltrada = proveedores.filter(p => {
      const nomToSearch = (p.nombre_empresa || p.nombre_completo || '').toLowerCase();
      const identSearch = p.ruc_empresa || p.identificacion || '';
      if (searchQuery && !nomToSearch.includes(searchQuery.toLowerCase()) && !identSearch.includes(searchQuery)) return false;
      const fTipo = filtroTipo === 'Empresa' ? 'empresa' : (filtroTipo === 'Persona Natural' ? 'natural' : '');
      if (fTipo && p.tipo_entidad !== fTipo) return false;
      return true;
  });

  return (
    <div className="animate-in fade-in duration-500 pb-20">
       <div className="mb-8">
           <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter uppercase mb-2">Proveedores y Afiliados</h1>
           <p className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Gestión B2B - Abastecimiento y Socios de Valor</p>
       </div>
       
       <ModuleNavbar currentTab={currentTab} setTab={(t) => { if(t === 'nuevo') setFormData(initialForm); setTab(t); }} />

       {/* VISTA: LISTADO DE PROVEEDORES */}
       {currentTab === 'lista' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4">
              {/* Filtros */}
              <div className="flex flex-col md:flex-row gap-3 bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl p-3">
                 <div className="relative flex-[2]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
                    <input type="text" className="input-guambra input-guambra-search h-11 text-sm w-full" placeholder="Buscar aliado por nombre, RUC o producto en vitrina..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                 </div>
                 <select className="input-guambra flex-1 h-11 text-sm" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                    <option value="">Cualquier Estructura Jurídica</option>
                    <option value="Empresa">Corporaciones / Empresas</option>
                    <option value="Persona Natural">Personas Naturales Independentes</option>
                 </select>
              </div>

              {/* Tabla */}
              <div className="glass-card overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)]">
                          <tr>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Organización / Afiliado</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Insumos (Provee)</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Sede Logística</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Contacto Ejecutivo</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Riesgo / Deuda</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Acciones</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-[var(--border-soft)]">
                          {loading ? (
                             <tr><td colSpan="6" className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--color-primary)]" /></td></tr>
                          ) : listaFiltrada.length === 0 ? (
                             <tr><td colSpan="6" className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Vacío Comercial. No existen proveedores indexados.</td></tr>
                          ) : listaFiltrada.map(p => (
                             <tr key={p.id} className="hover:bg-[var(--bg-surface-2)] transition-colors group">
                                <td className="p-4">
                                   <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-[var(--color-primary)] shrink-0 group-hover:bg-primary/20 transition-all">
                                          {p.tipo_entidad === 'empresa' ? <Building2 className="w-4 h-4"/> : <User className="w-4 h-4"/>}
                                      </div>
                                      <div>
                                         <p className="font-bold text-[var(--text-primary)] text-sm truncate max-w-[200px]" title={p.nombre_empresa || p.nombre_completo}>{p.nombre_empresa || p.nombre_completo}</p>
                                         <span className="text-[9px] font-mono font-black tracking-widest opacity-40 uppercase bg-[var(--bg-surface-2)] px-1 py-0.5 rounded">{p.tipo_entidad === 'empresa' ? 'Empresa' : 'Persona Natural'} {(p.ruc_empresa || p.identificacion) ? `| ${(p.ruc_empresa || p.identificacion)}` : ''}</span>
                                      </div>
                                   </div>
                                </td>
                                <td className="p-4">
                                   <span className="text-xs font-bold text-[var(--text-secondary)] border-b border-[var(--border-medium)] pb-0.5 border-dashed">{p.tipo_proveedor}</span>
                                </td>
                                <td className="p-4">
                                   <div className="flex flex-col gap-0.5">
                                      <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[150px]"><MapPin className="w-3 h-3 inline mr-1 text-[var(--color-primary)] opacity-50"/> {p.ciudad || 'No Def.'}</span>
                                      <span className="text-[9px] font-black tracking-widest text-[var(--text-muted)] uppercase">{p.pais}</span>
                                   </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-1">
                                      <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2"><Phone className="w-3 h-3 text-[var(--color-primary)] opacity-50"/> {p.telefono || 'N/A'}</span>
                                      {p.email && <span className="text-[9px] text-[var(--text-muted)] w-full truncate max-w-[150px]"><Mail className="w-3 h-3 inline mr-1 opacity-30"/> {p.email}</span>}
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    {p.deuda_activa > 0 ? (
                                        <div className="flex flex-col items-end">
                                           <span className="font-mono font-black text-orange-400 text-sm bg-orange-500/10 px-2 py-1 rounded-lg border border-orange-500/20">Debe ${p.deuda_activa?.toFixed(2)}</span>
                                           <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">Ref CxP Activa</span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-black uppercase tracking-widest text-green-400/50 bg-green-500/10 px-2 py-1 rounded-lg flex items-center gap-1 w-fit ml-auto">
                                            <CheckCircle2 className="w-3 h-3"/> Al día
                                        </span>
                                    )}
                                </td>
                                <td className="p-4 text-right space-x-1 lg:space-x-2 whitespace-nowrap">
                                   <button onClick={() => verPerfil(p)} className="p-2 hover:bg-[var(--bg-surface-3)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all" title="Ver Ficha"><Eye className="w-4 h-4"/></button>
                                   <button onClick={() => editar(p)} className="p-2 hover:bg-[var(--bg-surface-3)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all" title="Enmendar Datos"><Edit2 className="w-4 h-4"/></button>
                                   <button onClick={() => deleteProv(p.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400/50 hover:text-red-400 transition-all"><Trash2 className="w-4 h-4"/></button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
       )}

       {/* VISTA (EXPANDIDA): PERFIL DEL PROVEEDOR */}
       {currentTab === 'perfil' && provActivo && (
           <div className="animate-in slide-in-from-right-4">
              <div className="flex flex-col gap-6 max-w-4xl mx-auto">
                 <button onClick={() => setTab('lista')} className="btn-guambra-secondary self-start mb-2 !px-6 !py-2 !h-auto text-[10px]">← Volver al Listado</button>
                 
                 <div className="glass-card p-0 overflow-hidden relative">
                     {/* Header Hero Area */}
                     <div className="bg-primary/5 border-b border-primary/20 p-8 flex flex-col md:flex-row items-center gap-8 relative">
                         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                         
                         <div className="w-24 h-24 rounded-3xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--color-primary)] shadow-2xl relative z-10 shrink-0">
                             {provActivo.tipo_entidad === 'empresa' ? <Building2 className="w-10 h-10"/> : <User className="w-10 h-10"/>}
                         </div>
                         <div className="text-center md:text-left relative z-10">
                             <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                                 <h2 className="text-3xl font-black uppercase tracking-tighter text-[var(--text-primary)]">{provActivo.nombre_empresa || provActivo.nombre_completo}</h2>
                                 <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">{provActivo.tipo_entidad === 'empresa' ? 'Empresa' : 'Persona Natural'} Institucional</span>
                             </div>
                             <p className="text-sm font-bold text-[var(--text-secondary)] mb-1">Estatus Tributario / ID: <span className="text-[var(--text-primary)] font-mono bg-[var(--bg-surface-2)] py-0.5 px-2 rounded ml-1">{provActivo.ruc_empresa || provActivo.identificacion || 'N/A'}</span></p>
                             <div className="flex items-center gap-2 mt-4 flex-wrap justify-center md:justify-start">
                                 <span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)] border border-[var(--border-soft)] rounded-full px-3 py-1 flex items-center gap-1.5 bg-[var(--bg-surface-2)]"><Globe className="w-3 h-3 text-[var(--color-primary)]"/> {provActivo.pais} / {provActivo.ciudad}</span>
                                 <span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)] border border-[var(--border-soft)] rounded-full px-3 py-1 flex items-center gap-1.5 bg-[var(--bg-surface-2)]"><Briefcase className="w-3 h-3 text-[var(--color-primary)]"/> Insumo Clave: {provActivo.tipo_proveedor}</span>
                             </div>
                         </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--bg-surface-2)]">
                         {/* Datos Operativos & Financieros Puros */}
                         <div className="bg-[var(--bg-surface-2)] p-8 space-y-6">
                            <h4 className="text-[10px] font-black text-[var(--text-muted)] tracking-[0.2em] uppercase flex items-center gap-2 pb-2 border-b border-[var(--border-soft)]"><AlertCircle className="w-4 h-4 text-[var(--color-primary)]"/> Reseña Financiera e Intercambio</h4>
                            
                            <div className="flex p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <DollarSign className="w-8 h-8 text-orange-400 opacity-50"/>
                                    <div>
                                        <p className="text-[10px] font-black tracking-widest uppercase text-orange-400/60 mb-1">Riesgo CxP (Deuda Directa)</p>
                                        <p className="text-2xl font-mono font-black text-[var(--text-primary)]">${(provActivo.deuda_activa || 0).toFixed(2)}</p>
                                    </div>
                                </div>
                                {provActivo.deuda_activa > 0 && <span className="bg-orange-500 text-[var(--text-primary)] text-[9px] font-black uppercase px-2 py-1 rounded-md animate-pulse">Impago</span>}
                            </div>

                            <div className="space-y-4 pt-2">
                               <div className="flex flex-col gap-1 border-b border-[var(--border-soft)] pb-3">
                                  <span className="text-[9px] uppercase font-black text-[var(--text-muted)] tracking-widest">Matriz Comercial (Dirección)</span>
                                  <span className="text-xs font-bold text-[var(--text-secondary)]">{provActivo.direccion || 'Sin domicilio registrado en sistema'}</span>
                               </div>
                               <div className="flex flex-col gap-1 border-b border-[var(--border-soft)] pb-3">
                                  <span className="text-[9px] uppercase font-black text-[var(--text-muted)] tracking-widest">Creación del Portafolio</span>
                                  <span className="text-xs font-bold text-[var(--text-secondary)]">{provActivo.created_at ? new Date(provActivo.created_at).toLocaleDateString() : 'Generación Local'}</span>
                               </div>
                            </div>
                         </div>

                         {/* Datos Contacto / Representante */}
                         <div className="bg-[var(--bg-surface-2)] p-8 space-y-6">
                            <h4 className="text-[10px] font-black text-[var(--text-muted)] tracking-[0.2em] uppercase flex items-center gap-2 pb-2 border-b border-[var(--border-soft)]"><Phone className="w-4 h-4 text-[var(--color-primary)]"/> Canales de Comunicación Ejecutiva</h4>
                            
                            {provActivo.tipo_entidad === 'empresa' && (
                                <div className="p-4 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] mb-6">
                                    <span className="text-[9px] uppercase font-black tracking-widest text-[var(--color-primary)] mb-1 block">Ejecutivo de Cuenta / Representante</span>
                                    <p className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2"><User className="w-4 h-4 opacity-50"/> {provActivo.nombre_responsable || 'A quien corresponda'}</p>
                                </div>
                            )}
                            
                            <div className="space-y-4">
                               <div className="flex justify-between items-center border-b border-[var(--border-soft)] pb-3 group cursor-pointer hover:bg-[var(--bg-surface-2)] -mx-4 px-4 rounded-lg transition-colors duration-300">
                                  <div>
                                      <span className="text-[9px] uppercase font-black text-[var(--text-muted)] tracking-widest block mb-0.5"><Phone className="w-3 h-3 inline pb-0.5 text-[var(--color-primary)]"/> Línea WhatsApp / Teléfono</span>
                                      <span className="text-sm font-bold text-[var(--text-primary)]">{provActivo.telefono || 'N/A'}</span>
                                  </div>
                               </div>
                               <div className="flex justify-between items-center border-b border-[var(--border-soft)] pb-3 group cursor-pointer hover:bg-[var(--bg-surface-2)] -mx-4 px-4 rounded-lg transition-colors duration-300">
                                  <div>
                                      <span className="text-[9px] uppercase font-black text-[var(--text-muted)] tracking-widest block mb-0.5"><Mail className="w-3 h-3 inline pb-0.5 text-[var(--color-primary)]"/> Correo Institucional / Facturación</span>
                                      <span className="text-sm font-bold text-blue-400 group-hover:underline">{provActivo.email || 'No proporcionado'}</span>
                                  </div>
                               </div>
                            </div>
                         </div>
                     </div>
                 </div>
              </div>
           </div>
       )}

       {/* VISTA: NUEVO / EDITAR PROVEEDOR */}
       {(currentTab === 'nuevo' || currentTab === 'editar') && (
           <form onSubmit={guardarProveedor} className="glass-card max-w-4xl mx-auto p-6 md:p-10 animate-in slide-in-from-right-4 space-y-10">
               
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[var(--border-soft)] pb-6 mb-8 gap-4">
                  <div>
                      <h3 className="text-xl font-black uppercase tracking-tighter text-[var(--text-primary)] mb-1"><Briefcase className="w-6 h-6 inline mr-2 text-[var(--color-primary)] -translate-y-1"/> Ficha de Afiliación</h3>
                      <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-muted)]">Captura de Datos B2B e Indexación Contable</p>
                  </div>
                  
                  {/* Tipo de Proveedor Switcher */}
                  <div className="flex bg-[var(--bg-surface-2)] border border-[var(--border-soft)] p-1.5 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
                      <button type="button" onClick={() => handleChange('tipo_entidad', 'Empresa')} className={`flex-1 md:w-48 py-2.5 px-4 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${formData.tipo_entidad === 'Empresa' ? 'bg-primary text-[var(--text-primary)] shadow-lg shadow-primary/20' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]'}`}>
                          <Building2 className="w-3 h-3"/> Corporación Legal
                      </button>
                      <button type="button" onClick={() => handleChange('tipo_entidad', 'Persona Natural')} className={`flex-1 md:w-48 py-2.5 px-4 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${formData.tipo_entidad === 'Persona Natural' ? 'bg-primary text-[var(--text-primary)] shadow-lg shadow-primary/20' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]'}`}>
                          <User className="w-3 h-3"/> Profesional Natural
                      </button>
                  </div>
               </div>

               <div className="space-y-8">
                   {/* SECCION 1: IDENTIDAD */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                       <span className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-primary/20 text-[var(--color-primary)] border border-primary/30 flex items-center justify-center text-xs font-black">1</span>
                       
                       <div className="md:col-span-2">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                              {formData.tipo_entidad === 'Empresa' ? 'Razón Social (Nombre Público de Pila) ' : 'Nombres del Contratista / Albañil / Auxiliar '} 
                              <span className="text-red-400">*</span>
                          </label>
                          <input required type="text" className="input-guambra !h-14 font-bold text-[var(--text-primary)]" value={formData.nombre_principal} onChange={e => handleChange('nombre_principal', e.target.value)} placeholder={formData.tipo_entidad === 'Empresa' ? "Ej: Textilera Andes S.A." : "Ej: Marta Jaramillo (Costurera)"} />
                       </div>
                       
                       <div>
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block flex items-center gap-1.5"><Hash className="w-3 h-3"/> {formData.tipo_entidad === 'Empresa' ? 'Registro Único de Contribuyentes (RUC)' : 'Cédula de Ciudadanía'} <span className="text-red-400">*</span></label>
                          <input required type="text" className="input-guambra font-mono" value={formData.identificacion} onChange={e => handleChange('identificacion', e.target.value)} />
                       </div>
                       
                       <div>
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block flex items-center gap-1.5"><Briefcase className="w-3 h-3"/> Vertical / Insignia / Provee de... <span className="text-red-400">*</span></label>
                          <input required type="text" className="input-guambra" value={formData.tipo_proveedor} onChange={e => handleChange('tipo_proveedor', e.target.value)} placeholder="Ej: Telas, Mantenimiento, Tintorería..." />
                       </div>
                   </div>

                   {/* SECCION 2: UBICACION GEOGRAFICA */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--bg-surface-2)] p-6 rounded-2xl border border-[var(--border-soft)] relative">
                       <span className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-primary/20 text-[var(--color-primary)] border border-primary/30 flex items-center justify-center text-xs font-black">2</span>
                       
                       <div className="md:col-span-2">
                           <h4 className="text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest border-b border-[var(--border-soft)] pb-2 mb-4">Matriz Logística</h4>
                       </div>

                       <div>
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">País de Origen <span className="text-red-400">*</span></label>
                          <select required className="input-guambra" value={formData.pais} onChange={e => handleChange('pais', e.target.value)}>
                              <option value="Ecuador">Ecuador</option>
                              <option value="Colombia">Colombia</option>
                              <option value="Perú">Perú</option>
                              <option value="Internacional (Exportación)">Internacional (Misceláneo)</option>
                          </select>
                       </div>
                       <div>
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Ciudad Sede <span className="text-red-400">*</span></label>
                          <input required type="text" className="input-guambra" value={formData.ciudad} onChange={e => handleChange('ciudad', e.target.value)} placeholder="Ej: Cuenca, Guayaquil..." />
                       </div>
                       <div className="md:col-span-2">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Dirección Facturación Exacta <span className="text-red-400">*</span></label>
                          <input required type="text" className="input-guambra" value={formData.direccion} onChange={e => handleChange('direccion', e.target.value)} placeholder="Av. Principal y Secundaria..." />
                       </div>
                   </div>

                   {/* SECCION 3: CONTACTO OMNICANAL */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                       
                       <span className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-primary/20 text-[var(--color-primary)] border border-primary/30 flex items-center justify-center text-xs font-black">3</span>
                       
                       {formData.tipo_entidad === 'Empresa' && (
                           <div className="md:col-span-2 bg-blue-500/5 border border-blue-500/10 p-5 rounded-xl mb-2">
                              <label className="text-[10px] uppercase tracking-widest font-black text-blue-400 mb-2 block">Asignar Representante Comercial de la Empresa  <span className="text-red-400">*</span></label>
                              <input required={formData.tipo_entidad === 'Empresa'} type="text" className="input-guambra bg-[var(--bg-surface-2)] border-[var(--border-soft)] focus:border-blue-500/50" value={formData.nombre_encargado} onChange={e => handleChange('nombre_encargado', e.target.value)} placeholder="Con quién trato la facturación directamente..." />
                           </div>
                       )}

                       <div>
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block flex items-center gap-1.5"><Phone className="w-3 h-3 text-[var(--color-primary)]"/> Chat Negocios (WP) / Celular <span className="text-red-400">*</span></label>
                          <input required type="tel" className="input-guambra" value={formData.celular} onChange={e => handleChange('celular', e.target.value)} />
                       </div>
                       <div>
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block flex items-center gap-1.5"><Mail className="w-3 h-3 text-[var(--color-primary)]"/> Correo Electrónico Empresarial <span className="text-red-400">*</span></label>
                          <input required type="email" className="input-guambra" value={formData.email} onChange={e => handleChange('email', e.target.value)} />
                       </div>
                   </div>
               </div>
               
               <div className="pt-6 border-t border-[var(--border-soft)] flex justify-end gap-3 mt-10">
                   <button type="button" onClick={() => setTab('lista')} className="btn-guambra-secondary !px-8 h-14">Cancelar Operación</button>
                   <button type="submit" disabled={isProcessing} className="btn-guambra-primary !px-10 h-14 text-sm disabled:opacity-50 flex items-center gap-2">
                       {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : <CheckCircle2 className="w-5 h-5"/>} 
                       {currentTab === 'editar' ? 'Actualizar Registro Indexado' : 'Fichar en Catálogo'}
                   </button>
               </div>
           </form>
       )}

    </div>
  );
}
