import React, { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'sonner';
import { 
  Users, Search, Plus, Trash2, Edit2, Eye, X,
  MapPin, User, Phone, Mail, Loader2, CheckCircle2,
  Calendar, Shield, Lock, DollarSign, UserPlus
} from 'lucide-react';

const MOCK_PROVINCES = [
    'Azuay', 'Bolívar', 'Cañar', 'Carchi', 'Chimborazo', 'Cotopaxi', 'El Oro', 'Esmeraldas', 'Galápagos', 'Guayas', 'Imbabura', 'Loja', 'Los Ríos', 'Manabí', 'Morona Santiago', 'Napo', 'Orellana', 'Pastaza', 'Pichincha', 'Santa Elena', 'Santo Domingo de los Tsáchilas', 'Sucumbíos', 'Tungurahua', 'Zamora Chinchipe'
];

const ModuleNavbar = ({ currentTab, setTab }) => (
  <div className="border-b border-[var(--border-soft)] pb-px mb-8 overflow-x-auto no-scrollbar">
    <nav className="-mb-px flex gap-6">
      <button onClick={() => setTab('lista')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all ${currentTab === 'lista' || currentTab === 'perfil' ? 'border-primary text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-medium)]'}`}>Lista de Empleados</button>
      <button onClick={() => setTab('nuevo')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${currentTab === 'nuevo' || currentTab === 'editar' ? 'border-primary text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-medium)]'}`}><Plus className="w-3 h-3"/> {currentTab === 'editar' ? 'Editar Empleado' : 'Nuevo Empleado'}</button>
    </nav>
  </div>
);

export default function Empleados() {
  const { profile, loading: authLoading } = useAuthStore();
  
  const [currentTab, setTab] = useState('lista'); // 'lista' | 'nuevo' | 'editar' | 'perfil'
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');

  // Perfil Activo
  const [empleadoActivo, setEmpleadoActivo] = useState(null);

  // Estados para Permisos
  const [isPermisosModalOpen, setIsPermisosModalOpen] = useState(false);
  const [empleadoParaPermisos, setEmpleadoParaPermisos] = useState(null);
  const [permisosEditando, setPermisosEditando] = useState([]);

  const MODULOS_SISTEMA = [
    { id: 'dashboard', nombre: 'Dashboard', descripcion: 'Resumen general y métricas key' },
    { id: 'calendario', nombre: 'Calendario', descripcion: 'Vista cronológica de alquileres' },
    { id: 'contratos', nombre: 'Contratos', descripcion: 'Gestión y creación de alquileres' },
    { id: 'pedidos-online', nombre: 'Pedidos Online', descripcion: 'Reservas desde la web' },
    { id: 'productos', nombre: 'Trajes/Productos', descripcion: 'Inventario de conjuntos' },
    { id: 'piezas', nombre: 'Piezas/Elementos', descripcion: 'Inventario de partes sueltas' },
    { id: 'categorias', nombre: 'Categorías', descripcion: 'Organización del catálogo' },
    { id: 'clientes', nombre: 'Clientes', descripcion: 'Base de datos de clientes' },
    { id: 'ingresos', nombre: 'Ingresos', descripcion: 'Flujo de caja de entrada' },
    { id: 'egresos', nombre: 'Egresos', descripcion: 'Gastos y salidas de dinero' },
    { id: 'proveedores', nombre: 'Proveedores', descripcion: 'Gestión de abastecimiento' },
    { id: 'caja', nombre: 'Caja', descripcion: 'Arqueo y cierres diarios' },
    { id: 'comprobantes', nombre: 'Comprobantes', descripcion: 'Facturas y proformas' },
  ];

  // Formulario
  const initialForm = {
    id: null,
    nombre_completo: '',
    cedula: '',
    whatsapp: '',
    email: '', // User Access
    password: '',
    
    // Referencia Familiar
    referencia_nombre: '',
    referencia_celular: '',
    
    // Domicilio
    direccion_domicilio: '',
    ciudad: '',
    provincia: '',
    pais: 'Ecuador',
    
    // Laboral
    fecha_inicio: '',
    fecha_pago: '',
    salario_mensual: '',
    
    estado: 'activo',
    rol: 'tenant_empleado' // Default role for standard employees
  };
  
  const [formData, setFormData] = useState(initialForm);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchEmpleados = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('perfiles_usuario')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const parsedData = (data || []).map(p => ({
         ...p,
         estado: p.es_activo === false ? 'inactivo' : 'activo'
      }));
      setEmpleados(parsedData);
    } catch (e) {
      toast.error('Error cargando la lista de empleados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && profile?.tenant_id) fetchEmpleados();
    else if (!authLoading && !profile?.tenant_id) setLoading(false);
  }, [authLoading, profile?.tenant_id]);

  // -- ACCIONES DE FORMULARIO --
  const handleChange = (field, val) => {
      setFormData(prev => ({...prev, [field]: val}));
  };

  const guardarEmpleado = async (e) => {
      e.preventDefault();
      setIsProcessing(true);
      
      try {
          // Validaciones básicas de negocio
          if(!formData.nombre_completo || !formData.email || !formData.cedula || !formData.whatsapp) {
             throw new Error('Información de empleado incompleta. Faltan campos obligatorios.');
          }

          let userId = formData.id;

          // Si es nuevo empleado, crear en Auth Supabase primero usando Supabase Admin
          if (!formData.id) {
              if(!formData.password || formData.password.length < 6) throw new Error('Se requiere una contraseña segura inicial de al menos 6 caracteres');
              
              const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                  email: formData.email,
                  password: formData.password,
                  email_confirm: true,
                  user_metadata: {
                      full_name: formData.nombre_completo,
                      cedula: formData.cedula,
                      is_employee: true
                  }
              });

              if (authError) {
                  if (authError.message.includes('already registered')) throw new Error('El correo electrónico ya está registrado en el sistema.');
                  throw authError; // Otros errores de auth
              }
              userId = authData.user.id;
          } else {
              // Si es actualización y pasaron un password nuevo, actualizamos en auth
              if(formData.password) {
                  const { error: pwdErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: formData.password });
                  if(pwdErr) throw new Error('Error al actualizar la contraseña: ' + pwdErr.message);
              }
          }

          const payload = {
              tenant_id: profile.tenant_id,
              rol: formData.rol,
              es_activo: formData.estado === 'activo',
              
              nombre_completo: formData.nombre_completo,
              cedula: formData.cedula,
              whatsapp: formData.whatsapp,
              direccion_domicilio: formData.direccion_domicilio,
              ciudad: formData.ciudad,
              provincia: formData.provincia,
              pais: formData.pais,
              
              nombre_referencia_familiar: formData.referencia_nombre,
              telefono_referencia_familiar: formData.referencia_celular,
              
              fecha_inicio_laboral: formData.fecha_inicio || null,
              dia_pago: parseInt(formData.fecha_pago) || null,
              salario_mensual: parseFloat(formData.salario_mensual) || 0,
              email: formData.email
          };
          
          Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

          if (formData.id) {
              const { error } = await supabaseAdmin.from('perfiles_usuario').update(payload).eq('id', formData.id);
              if (error) throw error;
              toast.success('Perfil de empleado actualizado correctamente');
          } else {
              const { error } = await supabaseAdmin.from('perfiles_usuario').insert([{ 
                  ...payload, 
                  id: userId
              }]);
              
              if (error) {
                  // Rollback auth
                  await supabaseAdmin.auth.admin.deleteUser(userId);
                  throw error;
              }
              toast.success('Empleado dado de alta y credenciales operativas');
          }

          setFormData(initialForm);
          setTab('lista');
          fetchEmpleados();

      } catch (err) {
          toast.error(err.message || 'Error guardando empleado');
      } finally {
          setIsProcessing(false);
      }
  };

  const editar = (p) => {
      setFormData({
         ...initialForm,
         id: p.id,
         nombre_completo: p.nombre_completo || '',
         cedula: p.cedula || '',
         whatsapp: p.whatsapp || '',
         email: p.email || '', 
         password: '', 
         
         referencia_nombre: p.nombre_referencia_familiar || '',
         referencia_celular: p.telefono_referencia_familiar || '',
         
         direccion_domicilio: p.direccion_domicilio || '',
         ciudad: p.ciudad || '',
         provincia: p.provincia || '',
         pais: p.pais || 'Ecuador',
         
         fecha_inicio: p.fecha_inicio_laboral || '',
         fecha_pago: p.dia_pago || '',
         salario_mensual: p.salario_mensual || '',
         
         estado: p.es_activo === false ? 'inactivo' : 'activo',
         rol: p.rol || 'tenant_empleado'
      });
      setTab('editar');
  };

  const verPerfil = async (p) => {
      setEmpleadoActivo(p);
      setTab('perfil');
  };

  const softDelete = async (id) => {
      if(!confirm('¿Seguro quieres eliminar este empleado? Sus registros pasados (egresos y creación de contratos) se mantienen por trazabilidad, pero perderá acceso completo al sistema.')) return;
      try {
          await supabaseAdmin.from('perfiles_usuario').update({ deleted_at: new Date(), es_activo: false }).eq('id', id);
          toast.success('Empleado dado de baja exitosamente');
          fetchEmpleados();
      } catch (e) {
          toast.error('Error al dar de baja');
      }
  };

  const abrirModalPermisos = (empleado) => {
    setEmpleadoParaPermisos(empleado);
    setPermisosEditando(empleado.permisos?.modulos || []);
    setIsPermisosModalOpen(true);
  };

  const togglePermiso = (moduloId) => {
    setPermisosEditando(prev => 
      prev.includes(moduloId) 
        ? prev.filter(id => id !== moduloId) 
        : [...prev, moduloId]
    );
  };

  const guardarPermisos = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabaseAdmin
        .from('perfiles_usuario')
        .update({ permisos: { modulos: permisosEditando } })
        .eq('id', empleadoParaPermisos.id);

      if (error) throw error;

      toast.success(`Permisos actualizados para ${empleadoParaPermisos.nombre_completo}`);
      setIsPermisosModalOpen(false);
      fetchEmpleados();
    } catch (err) {
      toast.error('Error al actualizar permisos: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const ModalPermisos = () => {
    if (!isPermisosModalOpen) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[var(--bg-surface-1)]/80 backdrop-blur-md animate-in fade-in duration-300">
        <div className="relative w-full max-w-2xl bg-[var(--bg-surface-1)] border border-[var(--border-soft)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[var(--border-soft)] flex items-center justify-between bg-[var(--bg-surface-2)]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Shield className="h-5 w-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest">Gestionar Accesos</h3>
                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-0.5">{empleadoParaPermisos?.nombre_completo}</p>
              </div>
            </div>
            <button onClick={() => setIsPermisosModalOpen(false)} className="p-2 hover:bg-[var(--bg-surface-3)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            <p className="text-xs text-[var(--text-muted)] mb-6 bg-[var(--bg-surface-2)] p-4 rounded-xl border border-[var(--border-soft)]">
              Selecciona los módulos a los que este empleado podrá acceder. Los administradores siempre tienen acceso completo a todos los módulos.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MODULOS_SISTEMA.map((modulo) => {
                const isSelected = permisosEditando.includes(modulo.id);
                return (
                  <button
                    key={modulo.id}
                    onClick={() => togglePermiso(modulo.id)}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 text-left group
                      ${isSelected 
                        ? 'bg-primary border-primary/50 shadow-[0_0_20px_rgba(99,102,241,0.15)] text-[var(--text-primary)]' 
                        : 'bg-[var(--bg-surface-2)] border-[var(--border-soft)] text-[var(--text-muted)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-surface-3)]'}`}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-300
                      ${isSelected 
                        ? 'bg-primary text-white shadow-[0_0_15px_rgba(99,102,241,0.6)] border border-primary/50' 
                        : 'bg-[var(--bg-surface-3)] text-[var(--text-muted)] border border-transparent group-hover:text-[var(--text-primary)]'}`}>
                      {isSelected ? <CheckCircle2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className={`text-xs font-black uppercase tracking-widest ${isSelected ? 'text-[var(--color-primary)] drop-shadow-[0_0_5px_rgba(99,102,241,0.5)]' : 'text-[var(--text-secondary)]'}`}>{modulo.nombre}</p>
                      <p className="text-[9px] font-bold opacity-40 mt-0.5">{modulo.descripcion}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--border-soft)] flex justify-end gap-3 bg-[var(--bg-surface-2)]">
            <button 
              onClick={() => setIsPermisosModalOpen(false)}
              className="btn-guambra-secondary !px-6 !py-3 !text-[10px]"
            >
              Cancelar
            </button>
            <button 
              onClick={guardarPermisos}
              disabled={isProcessing}
              className="btn-guambra-primary !px-6 !py-3 !text-[10px] flex items-center gap-2"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    );
  };

  // -- RENDER FILTRADO LISTA --
  const listaFiltrada = empleados.filter(p => {
      if (searchQuery && !p.nombre_completo?.toLowerCase().includes(searchQuery.toLowerCase()) && !p.identificacion?.includes(searchQuery)) return false;
      return true;
  });

  return (
    <div className="animate-in fade-in duration-500 pb-20">
       <div className="mb-8">
           <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter uppercase mb-2">Recursos Humanos y Nómina</h1>
           <p className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Recursos Humanos - Perfiles Laborales Activos</p>
       </div>
       
       <ModuleNavbar currentTab={currentTab} setTab={(t) => { if(t === 'nuevo') setFormData(initialForm); setTab(t); }} />

       {/* VISTA LISTADO */}
       {currentTab === 'lista' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4">
              {/* Filtros */}
              <div className="flex flex-col md:flex-row gap-3 bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl p-3">
                 <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
                    <input type="text" className="input-guambra input-guambra-search h-11 text-sm w-full" placeholder="Buscar empleado por nombre o cédula..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                 </div>
              </div>

              {/* Tabla */}
              <div className="glass-card overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)]">
                          <tr>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Empleado</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Cédula</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Contacto</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Información Laboral</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Estado de Acceso</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Acciones</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-[var(--border-soft)]">
                          {loading ? (
                             <tr><td colSpan="6" className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--color-primary)]" /></td></tr>
                          ) : listaFiltrada.length === 0 ? (
                             <tr><td colSpan="6" className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">No se encontraron empleados en la base</td></tr>
                          ) : listaFiltrada.map(p => (
                             <tr key={p.id} className="hover:bg-[var(--bg-surface-3)] transition-colors group">
                                <td className="p-4">
                                   <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/50 flex items-center justify-center text-[var(--color-primary)] group-hover:scale-110 transition-transform">
                                          {p.rol === 'tenant_admin' ? <Shield className="w-4 h-4"/> : <User className="w-4 h-4"/>}
                                      </div>
                                      <div>
                                         <p className="font-bold text-[var(--text-primary)] text-sm">{p.nombre_completo}</p>
                                         <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">{p.rol === 'tenant_admin' ? 'Administrador del Local' : 'Empleado Estándar'}</span>
                                      </div>
                                   </div>
                                </td>
                                <td className="p-4 font-mono font-bold text-[var(--text-primary)] tracking-widest text-sm">{p.identificacion || p.cedula || 'N/A'}</td>
                                <td className="p-4">
                                   <div className="flex flex-col gap-1">
                                      <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2"><Phone className="w-3 h-3 text-[var(--color-primary)]"/> {p.telefono || p.whatsapp || 'N/A'}</span>
                                      {p.email && <span className="text-[9px] text-[var(--text-muted)] w-full truncate"><Mail className="w-3 h-3 inline mr-1 opacity-50"/> {p.email}</span>}
                                   </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[10px] uppercase font-black text-[var(--color-primary)] font-mono bg-primary/10 px-2 py-0.5 rounded w-fit">Salario: ${p.salario_mensual?.toFixed(2) || '0.00'}</span>
                                      <span className="text-[10px] text-[var(--text-muted)]">Inicio: {p.fecha_inicio_laboral || 'N/A'} — Día Pago: {p.fecha_pago_dia ? `Día ${p.fecha_pago_dia}` : 'N/A'}</span>
                                    </div>
                                </td>
                                 <td className="p-4 text-center">
                                    {(() => {
                                      const est = p.estado || 'inactivo';
                                      const isActivo = est === 'activo';
                                      return (
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.2em] border ${isActivo ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${isActivo ? 'bg-green-400' : 'bg-red-500'}`} />
                                          {est}
                                        </span>
                                      );
                                    })()}
                                 </td>
                                <td className="p-4 text-right space-x-2">
                                   <button onClick={() => verPerfil(p)} className="p-2 hover:bg-[var(--bg-surface-3)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all" title="Ver Perfil Completo"><Eye className="w-4 h-4"/></button>
                                   <button onClick={() => abrirModalPermisos(p)} className="p-2 hover:bg-[var(--bg-surface-3)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all" title="Gestionar Permisos de Módulos"><Shield className="w-4 h-4"/></button>
                                   <button onClick={() => editar(p)} className="p-2 hover:bg-[var(--bg-surface-3)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all" title="Modificar Contrato/Accesos"><Edit2 className="w-4 h-4"/></button>
                                   {p.rol !== 'tenant_admin' && <button onClick={() => softDelete(p.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400/50 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4"/></button>}
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
       )}

       {/* VISTA PERFIL COMPLETO */}
       {currentTab === 'perfil' && empleadoActivo && (
           <div className="animate-in slide-in-from-right-4">
              <div className="flex flex-col gap-8 max-w-4xl mx-auto">
                 <div className="glass-card p-8 flex items-center gap-6 relative overflow-hidden">
                     {/* Decorator */}
                     <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                     <div className="flex items-center gap-8 relative z-10 w-full border-b border-[var(--border-soft)] pb-8 mb-8">
                         <div className="w-24 h-24 rounded-2xl bg-primary/20 border border-primary text-[var(--color-primary)] flex items-center justify-center shadow-xl shadow-primary/20 shrink-0">
                            {empleadoActivo.rol === 'tenant_admin' ? <Shield className="w-10 h-10"/> : <User className="w-10 h-10"/>}
                         </div>
                         <div className="flex-1 text-left">
                             <div className="flex justify-between items-start">
                                 <div>
                                     <h2 className="text-3xl font-black uppercase tracking-tighter text-[var(--text-primary)] mb-2">{empleadoActivo.nombre_completo}</h2>
                                     <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] bg-primary/10 px-3 py-1.5 rounded-md border border-primary/20">{empleadoActivo.rol === 'tenant_admin' ? 'Administrador Superior' : 'Empleado Estándar'}</span>
                                 </div>
                                 <span className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border ${empleadoActivo.estado === 'activo' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                    Acceso {empleadoActivo.estado}
                                 </span>
                             </div>
                         </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                         {/* Datos Personales */}
                         <div className="space-y-6">
                            <h4 className="text-sm font-black text-[var(--text-secondary)] tracking-widest uppercase mb-4 flex items-center gap-2"><User className="w-4 h-4"/> Legales y Contacto</h4>
                            
                            <div className="space-y-4">
                               <div className="flex justify-between border-b border-[var(--border-soft)] pb-2">
                                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest">Cédula de Identidad</span>
                                  <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{empleadoActivo.cedula || 'N/A'}</span>
                               </div>
                               <div className="flex justify-between border-b border-[var(--border-soft)] pb-2">
                                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest">Celular de Contacto</span>
                                  <span className="text-sm font-bold text-[var(--text-primary)]">{empleadoActivo.whatsapp || 'N/A'}</span>
                               </div>
                               <div className="flex justify-between border-b border-[var(--border-soft)] pb-2">
                                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest">Residencia</span>
                                  <span className="text-sm font-bold text-[var(--text-primary)]">{empleadoActivo.ciudad || 'N/A'}</span>
                               </div>
                               <div className="flex justify-between border-b border-[var(--border-soft)] pb-2">
                                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest">Dirección Exacta</span>
                                  <span className="text-xs font-bold text-[var(--text-primary)] opacity-80 max-w-[50%] text-right">{empleadoActivo.direccion_domicilio || 'N/A'}</span>
                               </div>
                            </div>

                            <div className="bg-[var(--bg-surface-2)] rounded-xl p-4 border border-[var(--border-soft)] mt-4">
                                <h5 className="text-[9px] uppercase font-black tracking-widest text-[var(--color-primary)] mb-3">Referencia Familiar de Emergencia</h5>
                                <div className="flex justify-between">
                                    <span className="text-xs font-bold text-[var(--text-primary)]">{empleadoActivo.nombre_referencia_familiar || 'No Registrado'}</span>
                                    <span className="text-xs text-[var(--text-secondary)]"><Phone className="w-3 h-3 inline mr-1 opacity-50"/> {empleadoActivo.telefono_referencia_familiar || '-'}</span>
                                </div>
                            </div>
                         </div>

                         {/* Datos Laborales y Accesos */}
                         <div className="space-y-6">
                            <h4 className="text-sm font-black text-[var(--text-secondary)] tracking-widest uppercase mb-4 flex items-center gap-2"><Shield className="w-4 h-4"/> Nómina y Accesos</h4>
                            
                            <div className="space-y-4">
                               <div className="flex justify-between border-b border-[var(--border-soft)] pb-2">
                                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest">Email (Usuario Acceso)</span>
                                  <span className="text-xs font-bold text-[var(--text-primary)] opacity-80">{empleadoActivo.email || '(Consultar Auth)'}</span>
                               </div>
                               <div className="flex justify-between border-b border-[var(--border-soft)] pb-2">
                                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest">Salario Contractual</span>
                                  <span className="text-lg font-black font-mono text-[var(--color-primary)]">${empleadoActivo.salario_mensual?.toFixed(2) || '0.00'}</span>
                               </div>
                               <div className="flex justify-between border-b border-[var(--border-soft)] pb-2">
                                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest">Fecha Inicio Empleado</span>
                                  <span className="text-sm font-bold text-[var(--text-primary)]">{empleadoActivo.fecha_inicio_laboral || 'N/A'}</span>
                               </div>
                               <div className="flex justify-between border-b border-[var(--border-soft)] pb-2">
                                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest">Diferido Pago Mensual</span>
                                  <span className="text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-surface-2)] px-2 py-0.5 rounded">{empleadoActivo.dia_pago ? `Todos los ${empleadoActivo.dia_pago}` : 'N/A'}</span>
                               </div>
                            </div>

                            <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20 mt-4 text-blue-400 text-xs font-bold">
                                {empleadoActivo.rol === 'tenant_admin' ? (
                                    'Privilegios Super Administrador: Acceso a Finanzas, Empleados y Configuraciones Generales Permitido.'
                                ) : (
                                    'Restricción Activa: Acceso Denegado a Finanzas, Proveedores y Negocio. Válido únicamente para Gestión de Contratos y Tienda.'
                                )}
                            </div>
                         </div>
                     </div>
                 </div>

                 <button onClick={() => setTab('lista')} className="btn-guambra-secondary self-start">Regresar al Listado</button>
              </div>
           </div>
       )}

       {/* VISTA NUEVO / EDITAR EMPLEADO */}
       {(currentTab === 'nuevo' || currentTab === 'editar') && (
           <form onSubmit={guardarEmpleado} className="glass-card p-6 md:p-10 animate-in slide-in-from-right-4 space-y-10">
               
               {/* 1. Datos Personales Obligatorios */}
               <div>
                   <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)] mb-6 border-b border-primary/20 pb-4 flex items-center gap-3"><UserPlus className="w-5 h-5"/> 1. Identificación Personal</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Nombre Completo del Colaborador <span className="text-red-400">*</span></label>
                         <input required type="text" className="input-guambra" value={formData.nombre_completo} onChange={e => handleChange('nombre_completo', e.target.value)} />
                      </div>
                      <div>
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Cédula de Identidad <span className="text-red-400">*</span></label>
                         <input required type="text" className="input-guambra" value={formData.cedula} onChange={e => handleChange('cedula', e.target.value)} />
                      </div>
                      <div>
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Contacto Principal (WhatsApp) <span className="text-red-400">*</span></label>
                         <input required type="tel" className="input-guambra" value={formData.whatsapp} onChange={e => handleChange('whatsapp', e.target.value)} />
                      </div>
                   </div>
               </div>

               {/* 2. Referencia Familiar de Emergencia */}
               <div>
                   <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)] mb-6 border-b border-primary/20 pb-4 flex items-center gap-3"><Phone className="w-5 h-5"/> 2. Contacto de Emergencia</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--bg-surface-2)] p-6 rounded-2xl border border-[var(--border-soft)]">
                      <div>
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Familiar Referencia (Nombre) <span className="text-red-400">*</span></label>
                         <input required type="text" className="input-guambra bg-[var(--bg-surface-3)] border-[var(--border-soft)]" value={formData.referencia_nombre} onChange={e => handleChange('referencia_nombre', e.target.value)} />
                      </div>
                      <div>
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Teléfono / Celular Referencia <span className="text-red-400">*</span></label>
                         <input required type="text" className="input-guambra bg-[var(--bg-surface-3)] border-[var(--border-soft)]" value={formData.referencia_celular} onChange={e => handleChange('referencia_celular', e.target.value)} />
                      </div>
                   </div>
               </div>

               {/* 3. Domicilio */}
               <div>
                   <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)] mb-6 border-b border-primary/20 pb-4 flex items-center gap-3"><MapPin className="w-5 h-5"/> 3. Domicilio Actual</h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-3">
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Dirección Exacta <span className="text-red-400">*</span></label>
                         <input required type="text" className="input-guambra" value={formData.direccion_domicilio} onChange={e => handleChange('direccion_domicilio', e.target.value)} />
                      </div>
                      <div>
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">País <span className="text-red-400">*</span></label>
                         <select required className="input-guambra" value={formData.pais} onChange={e => handleChange('pais', e.target.value)}>
                             <option value="Ecuador">Ecuador</option>
                         </select>
                      </div>
                      <div>
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Provincia <span className="text-red-400">*</span></label>
                         <select required className="input-guambra" value={formData.provincia} onChange={e => handleChange('provincia', e.target.value)}>
                             <option value="">Seleccione...</option>
                             {MOCK_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                         </select>
                      </div>
                      <div>
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Ciudad <span className="text-red-400">*</span></label>
                         <input required type="text" className="input-guambra" value={formData.ciudad} onChange={e => handleChange('ciudad', e.target.value)} />
                      </div>
                   </div>
               </div>

               {/* 4. Condiciones Laborales y Plataforma */}
               <div>
                   <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)] mb-6 border-b border-primary/20 pb-4 flex items-center gap-3"><DollarSign className="w-5 h-5"/> 4. Contratación Operativa y Accesos</h3>
                   
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                       <div>
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Salario Mensual Bruto ($) <span className="text-red-400">*</span></label>
                          <input required type="number" step="0.01" min="0" className="input-guambra font-mono text-[var(--color-primary)] text-xl" value={formData.salario_mensual} onChange={e => handleChange('salario_mensual', e.target.value)} />
                       </div>
                       <div>
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Fecha Efectiva de Inicio <span className="text-red-400">*</span></label>
                          <input required type="date" className="input-guambra dark-date" value={formData.fecha_inicio} onChange={e => handleChange('fecha_inicio', e.target.value)} />
                       </div>
                       <div>
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block text-[var(--text-primary)] flex justify-between">Día de Pago (Mensual) <span className="text-[var(--text-muted)] truncate ml-2">ej: 15 o 30</span> <span className="text-red-400 shrink-0">*</span></label>
                          <input required type="number" min="1" max="31" className="input-guambra" value={formData.fecha_pago} onChange={e => handleChange('fecha_pago', e.target.value)} />
                       </div>
                   </div>

                   <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20 grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="md:col-span-2">
                           <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-[var(--color-primary)] mb-1">Generación de Usuario del Sistema</h4>
                           <p className="text-xs text-[var(--text-muted)] mb-4 font-bold">Las credenciales que permitirán acceso parcial al inventario y a los módulos de contratos.</p>
                       </div>
                       <div>
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 flex items-center gap-2"><Mail className="w-3 h-3 text-[var(--text-primary)]"/> Email Institucional de Acceso <span className="text-red-400">*</span></label>
                          <input required type="email" className="input-guambra" disabled={!!formData.id} value={formData.email} onChange={e => handleChange('email', e.target.value)} placeholder="empleado@mistrajes.com" />
                          {formData.id && <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1 block">El email no puede modificarse tras su creación</span>}
                       </div>
                       <div>
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 flex items-center gap-2"><Lock className="w-3 h-3 text-[var(--text-primary)]"/> Contraseña de Bloqueo <span className="text-red-400">{!formData.id ? '*' : ''}</span></label>
                          <input required={!formData.id} type="text" className="input-guambra font-mono" value={formData.password} onChange={e => handleChange('password', e.target.value)} placeholder={formData.id ? "Ingresa para sobrescribir (Opcional)" : "Genera una contraseña fuerte"} />
                       </div>
                   </div>
               </div>

               <div className="pt-8 border-t border-[var(--border-soft)] flex justify-end gap-4">
                   <button type="button" onClick={() => setTab('lista')} className="btn-guambra-secondary !px-8 h-14">Cancelar</button>
                   <button type="submit" disabled={isProcessing} className="btn-guambra-primary !px-10 h-14 text-sm disabled:opacity-50 flex items-center gap-2">
                       {isProcessing ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle2 className="w-5 h-5"/>} 
                       {currentTab === 'editar' ? 'Actualizar Ficha y Permisos' : 'Dar de Alta Empleado'}
                   </button>
               </div>
           </form>
       )}

       <ModalPermisos />
    </div>
  );
}