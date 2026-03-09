import { useState, useEffect } from 'react';
import { supabaseAdmin } from '../../lib/supabase';
import { Loader2, CheckCircle, XCircle, Store, Mail, Phone, MapPin, Building, CreditCard, Rocket } from 'lucide-react';

const SolicitudesRegistro = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState(null);

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const fetchSolicitudes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseAdmin
        .from('solicitudes_registro')
        .select(`
          *,
          plans (
            id,
            nombre,
            precio_mensual
          )
        `)
        .eq('estado', 'pendiente')
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      setSolicitudes(data || []);
    } catch (error) {
      console.error('Error fetching solicitudes:', error);
      alert('No se pudieron cargar las solicitudes pendientes');
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (solicitud) => {
    if (!window.confirm(`¿Estás seguro de Aprobar a ${solicitud.nombre_negocio}? Esto creará el espacio de trabajo activo de inmediato.`)) return;
    
    setProcesandoId(solicitud.id);
    try {
      if (!solicitud.email_propietario) {
        throw new Error('El campo email está vacío en la solicitud.');
      }

      const tempPassword = 'MisTrajes' + Math.floor(Math.random() * 100000);
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: solicitud.email_propietario,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: solicitud.nombre_propietario,
        }
      });

      if (authError && !authError.message.includes('already registered')) throw authError;

      const newUserId = authData?.user?.id;
      if (!newUserId) throw new Error('No se pudo crear o resolver el usuario en Auth.');

      const hoy = new Date().toISOString().split('T')[0];
      const trialFin = new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0];

      const { data: tenantData, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .insert([{
            nombre_negocio: solicitud.nombre_negocio, 
            slug: solicitud.slug,                   
            plan_id: solicitud.plan_id,
            estado: 'trial', 
            nombre_propietario: solicitud.nombre_propietario, 
            cedula_ruc_propietario: solicitud.cedula_ruc_propietario, 
            email_propietario: solicitud.email_propietario,           
            whatsapp_propietario: solicitud.whatsapp_propietario,
            ciudad: solicitud.ciudad,
            pais: solicitud.pais,
            direccion: solicitud.direccion,
            inicio_suscripcion: hoy,
            fin_suscripcion: trialFin,
            trial_inicio: hoy,
            trial_fin: trialFin
        }])
        .select()
        .single();
        
      if (tenantError) throw tenantError;

      const { data: suscripcionData, error: suscripcionError } = await supabaseAdmin
        .from('tenant_suscripciones')
        .insert([{
            tenant_id: tenantData.id,
            plan_id: solicitud.plan_id,
            tipo: 'trial',
            estado: 'activa',
            fecha_inicio: hoy,
            fecha_vencimiento: trialFin,
            meses_contratados: 1,
            notas: 'Prueba gratuita de 30 días - Aprobada por SuperAdmin'
        }])
        .select()
        .single();

      if (suscripcionError) throw suscripcionError;

      await supabaseAdmin
        .from('tenants')
        .update({ suscripcion_activa_id: suscripcionData.id })
        .eq('id', tenantData.id);

      await supabaseAdmin
        .from('perfiles_usuario')
        .insert([{
            id: newUserId,
            tenant_id: tenantData.id,
            rol: 'tenant_admin',
            nombre_completo: solicitud.nombre_propietario
        }]);

      await supabaseAdmin
        .from('solicitudes_registro')
        .update({ estado: 'aprobado' })
        .eq('id', solicitud.id);

      alert(`¡Aprobado con éxito!\nEmail: ${solicitud.email_propietario}\nClave Temp: ${tempPassword}\nDominio: ${solicitud.slug}.mistrajes.com`);
      fetchSolicitudes();

    } catch (error) {
      console.error('Error aprobando solicitud:', error);
      alert('Error: ' + error.message);
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRechazar = async (id) => {
    if (!window.confirm('¿Rechazar esta solicitud?')) return;
    setProcesandoId(id);
    try {
      await supabaseAdmin
        .from('solicitudes_registro')
        .update({ estado: 'rechazado' })
        .eq('id', id);
      alert('Solicitud rechazada.');
      fetchSolicitudes();
    } catch (error) {
      console.error('Error rechazando solicitud:', error);
      alert('Error al rechazar.');
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="flex border-b border-[var(--border-soft)] pb-6">
         <div>
            <h2 className="text-2xl font-black tracking-tighter text-[var(--text-primary)] uppercase">Solicitudes de Registro</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)] uppercase tracking-widest font-bold">Prospectos esperando habilitación de plataforma</p>
         </div>
         <div className="ml-auto">
            <button 
              onClick={fetchSolicitudes} 
              className="px-6 py-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] hover:bg-[var(--bg-surface-3)] text-xs font-black uppercase tracking-widest text-[var(--text-primary)] transition-all"
            >
               Refrescar
            </button>
         </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-[var(--color-primary)] h-12 w-12" />
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-3xl p-12 text-center">
            <div className="h-16 w-16 mx-auto bg-[var(--color-primary-dim)] rounded-full flex items-center justify-center mb-4 border border-[var(--color-primary)]/20">
               <Store className="h-8 w-8 text-[var(--color-primary)]" />
            </div>
            <h3 className="text-lg font-black text-[var(--text-primary)] mb-2 uppercase tracking-tight">Cero Pendientes</h3>
            <p className="text-sm text-[var(--text-muted)] font-bold uppercase tracking-widest">No hay solicitudes nuevas en este momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {solicitudes.map((sol) => (
            <div key={sol.id} className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-[2rem] p-6 flex flex-col hover:border-[var(--color-primary)]/40 transition-all hover:shadow-2xl">
              <div className="flex items-start justify-between mb-4">
                 <div>
                    <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight flex flex-wrap items-center gap-2">
                        {sol.nombre_negocio}
                        <span className="text-[10px] text-[var(--color-primary)] font-mono bg-[var(--color-primary-dim)] px-2 py-0.5 rounded border border-[var(--color-primary)]/20 uppercase">RUC: {sol.ruc_negocio}</span>
                    </h3>
                    <p className="text-[11px] text-[var(--color-primary)]/80 mt-1 font-mono tracking-widest uppercase">{sol.slug}.mistrajes.com</p>
                 </div>
                 <span className="text-[9px] bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full uppercase tracking-widest border border-amber-500/20 font-black animate-pulse">Pendiente</span>
              </div>

              <div className="space-y-4 flex-1 mb-8 pt-6 border-t border-[var(--border-soft)]">
                 <div className="flex items-center gap-3 text-xs">
                    <Building className="h-4 w-4 text-[var(--color-primary)] opacity-70" />
                    <span className="text-[var(--text-secondary)] font-black uppercase tracking-tight">{sol.nombre_propietario}</span>
                    <span className="text-[var(--text-muted)] text-[10px]">(ID: {sol.cedula_ruc_propietario})</span>
                 </div>
                 <div className="flex items-center gap-3 text-xs">
                    <Mail className="h-4 w-4 text-[var(--color-primary)] opacity-70" />
                    <span className="text-[var(--text-secondary)] font-mono">{sol.email_propietario}</span>
                 </div>
                 <div className="flex items-center gap-3 text-xs">
                    <Phone className="h-4 w-4 text-[var(--color-primary)] opacity-70" />
                    <span className="text-[var(--text-secondary)] font-mono">{sol.whatsapp_propietario}</span>
                 </div>
                  <div className="flex items-center gap-3 text-xs">
                    <MapPin className="h-4 w-4 text-[var(--color-primary)] opacity-70" />
                    <span className="text-[var(--text-muted)] uppercase tracking-tighter">
                      {sol.direccion}, {sol.ciudad} - {sol.provincia}, {sol.pais}
                    </span>
                  </div>
                 {sol.plans && (
                   <div className="flex items-center gap-3 text-xs bg-[var(--color-primary-dim)] p-3 rounded-2xl border border-[var(--color-primary)]/10 mt-2">
                      <CreditCard className="h-4 w-4 text-[var(--color-primary)]" />
                      <span className="text-[var(--color-primary)] font-black uppercase tracking-widest">{sol.plans.nombre}</span>
                      <span className="text-[var(--text-primary)] font-black ml-auto bg-[var(--bg-surface-2)] px-2 py-1 rounded border border-[var(--border-soft)]">USD {sol.plans.precio_mensual}/mes</span>
                   </div>
                 )}
              </div>

              <div className="flex items-center gap-3 pt-6 border-t border-[var(--border-soft)] mt-auto">
                 <button 
                   onClick={() => handleRechazar(sol.id)}
                   disabled={procesandoId === sol.id}
                   className="flex-1 py-3 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                 >
                   {procesandoId === sol.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-4 w-4" /> Rechazar</>}
                 </button>
                 <button 
                   onClick={() => handleAprobar(sol)}
                   disabled={procesandoId === sol.id}
                   className="flex-1 py-3 rounded-2xl bg-[var(--color-primary)] text-white hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-[var(--color-primary-shadow)] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                 >
                   {procesandoId === sol.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4" /> Aprobar & Crear</>}
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SolicitudesRegistro;
