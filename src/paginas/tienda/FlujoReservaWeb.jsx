import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenantStore } from '../../stores/tenantStore';
import { ShoppingBag, ChevronLeft, CreditCard, CheckCircle2, MapPin, Truck, Loader2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const FlujoReservaWeb = () => {
  const { tenant } = useTenantStore();
  const [searchParams] = useSearchParams();
  const productoId = searchParams.get('producto');
  
  const [productoInfo, setProductoInfo] = useState(null);
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
      nombre: '',
      identificacion: '',
      telefono: '',
      fechaUso: '',
      quiereEnvio: false,
      direccion: '',
      comprobanteTransferencia: null
  });

  useEffect(() => {
     if (productoId && tenant?.id) {
         supabase.from('productos').select('*').eq('id', productoId).single()
           .then(({data, error}) => {
               if(!error) setProductoInfo(data);
               setLoading(false);
           });
     } else {
         setLoading(false);
     }
  }, [productoId, tenant]);

  const getUrl = (path, params = '') => {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const baseParams = isLocalhost && tenant?.slug ? `t=${tenant.slug}` : '';
      
      let query = '';
      if (baseParams && params) query = `?${baseParams}&${params}`;
      else if (baseParams) query = `?${baseParams}`;
      else if (params) query = `?${params}`;
      
      return `${path}${query}`;
  };

  if (loading) return <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center"><Loader2 className="animate-spin text-[var(--color-primary)] h-8 w-8" /></div>;
  if (!productoInfo) return <div className="min-h-screen bg-[var(--bg-page)] flex flex-col items-center justify-center text-[var(--text-muted)]"><ShoppingBag className="h-10 w-10 mb-4" /> Producto no encontrado. <Link to={getUrl('/')} className="text-[var(--color-primary)] mt-4">Volver</Link></div>;

  const handleSubmitReserva = async (e) => {
      e.preventDefault();
      // Simularemos la creación del Pedido Tienda que recae en el casillero del Admin
      toast.success('¡Reserva Solicitada con Éxito! El administrador verificará su comprobante.');
      setPaso(3);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] py-12 px-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--color-primary-dim)] rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 opacity-30"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
         <Link to={getUrl('/')} className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-10">
            <ChevronLeft className="h-4 w-4 mr-2" /> Seguir Explorando
         </Link>

         {/* Wizard Progress */}
         <div className="flex gap-4 mb-12 border-b border-[var(--border-soft)] pb-8">
             <div className={`flex-1 pb-4 border-b-2 transition-all ${paso >= 1 ? 'border-[var(--color-primary)]' : 'border-[var(--border-soft)]'}`}>
                 <span className={`text-[10px] font-black uppercase tracking-widest ${paso >= 1 ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]'}`}>1. Detalles</span>
             </div>
             <div className={`flex-1 pb-4 border-b-2 transition-all ${paso >= 2 ? 'border-[var(--color-primary)]' : 'border-[var(--border-soft)]'}`}>
                 <span className={`text-[10px] font-black uppercase tracking-widest ${paso >= 2 ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]'}`}>2. Pago Seguro</span>
             </div>
             <div className={`flex-1 pb-4 border-b-2 transition-all ${paso >= 3 ? 'border-[var(--color-primary)]' : 'border-[var(--border-soft)]'}`}>
                 <span className={`text-[10px] font-black uppercase tracking-widest ${paso >= 3 ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]'}`}>3. Confirmación</span>
             </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
             
             {/* Área de Formulario */}
             <div className="lg:col-span-7">
                 {paso === 1 && (
                     <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 glass-card p-8">
                         <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter mb-2 text-[var(--text-primary)]">Reserva de Prenda</h2>
                            <p className="text-xs text-[var(--text-muted)] font-medium">Completa tus datos para agendar la exclusividad del traje.</p>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div className="col-span-2">
                                 <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Nombre Completo</label>
                                 <input type="text" className="input-guambra" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Para registro del contrato" />
                             </div>
                             <div>
                                 <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 block">RUC/Cédula</label>
                                 <input type="text" className="input-guambra" required value={formData.identificacion} onChange={e => setFormData({...formData, identificacion: e.target.value})} />
                             </div>
                             <div>
                                 <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Whatsapp Remitente</label>
                                 <input type="tel" className="input-guambra" required value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                             </div>
                             <div className="col-span-2">
                                 <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Fecha a utilizar (Evento)</label>
                                 <input type="date" className="input-guambra" required value={formData.fechaUso} onChange={e => setFormData({...formData, fechaUso: e.target.value})} />
                             </div>
                         </div>

                         <div className="border-t border-[var(--border-soft)] pt-6">
                             <label className="flex items-center gap-3 cursor-pointer group">
                                 <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${formData.quiereEnvio ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'bg-[var(--bg-surface-2)] border-[var(--border-soft)] group-hover:bg-[var(--bg-surface-3)]'}`}>
                                     {formData.quiereEnvio && <CheckCircle2 className="h-3 w-3 text-white" />}
                                 </div>
                                 <input type="checkbox" className="hidden" checked={formData.quiereEnvio} onChange={e => setFormData({...formData, quiereEnvio: e.target.checked})} />
                                 <span className="text-sm font-bold text-[var(--text-primary)]"><Truck className="h-4 w-4 inline-block mr-2 text-[var(--color-primary)]" /> Deseo envío a domicilio (Recargo extra según ubicación)</span>
                             </label>
                             {formData.quiereEnvio && (
                                 <div className="mt-4 pl-8 animate-in slide-in-from-top-2">
                                     <input type="text" className="input-guambra" placeholder="Especificar dirección completa, ciudad..." value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} />
                                 </div>
                             )}
                         </div>

                         <button onClick={() => setPaso(2)} disabled={!formData.nombre || !formData.identificacion || !formData.fechaUso} className="btn-guambra-primary w-full h-14 mt-4 disabled:opacity-30">
                            Ir a Pago de Anticipo
                         </button>
                     </div>
                 )}

                 {paso === 2 && (
                     <form onSubmit={handleSubmitReserva} className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 glass-card p-8">
                         <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter mb-2 text-[var(--text-primary)]">Liquidación Segura</h2>
                            <p className="text-xs text-[var(--text-muted)] font-medium">Realiza tu transferencia al tenant y adjunta el comprobante.</p>
                         </div>
                         
                         <div className="bg-[var(--color-primary-dim)] border border-[var(--color-primary-dim)] rounded-2xl p-6 mb-6">
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] mb-4 flex items-center"><CreditCard className="h-4 w-4 mr-2" /> Datos Bancarios del Negocio</h4>
                             <dl className="grid grid-cols-2 gap-y-4 text-sm">
                                 <dt className="text-[var(--text-muted)] uppercase tracking-widest text-[9px] font-bold">Titular</dt>
                                 <dd className="text-[var(--text-primary)] font-bold">{tenant?.nombre_propietario || 'El Propietario'}</dd>
                                 <dt className="text-[var(--text-muted)] uppercase tracking-widest text-[9px] font-bold">Banco</dt>
                                 <dd className="text-[var(--text-primary)] font-bold">Banco Pichincha Cta. Ahorros</dd>
                                 <dt className="text-[var(--text-muted)] uppercase tracking-widest text-[9px] font-bold">Número</dt>
                                 <dd className="text-[var(--text-primary)] font-bold font-mono text-base">2200000000</dd>
                             </dl>
                         </div>

                         <div>
                            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Comprobante (Obligatorio)</label>
                            <input type="file" required className="input-guambra !p-3 text-xs" accept="image/*,.pdf" />
                            <p className="text-[10px] text-[var(--text-muted)] mt-2 font-bold uppercase tracking-widest opacity-60">Formatos PNG, JPG, PDF.</p>
                         </div>
                         
                         <div className="flex gap-4 pt-4 border-t border-[var(--border-soft)]">
                             <button type="button" onClick={() => setPaso(1)} className="btn-guambra-secondary flex-1">Atrás</button>
                             <button type="submit" className="btn-guambra-primary flex-1">Confirmar Orden</button>
                         </div>
                     </form>
                 )}

                 {paso === 3 && (
                     <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 glass-card p-12 text-center flex flex-col items-center">
                         <div className="h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20 mb-4 animate-bounce">
                             <CheckCircle2 className="h-10 w-10 text-green-400" />
                         </div>
                         <h2 className="text-3xl font-black uppercase tracking-tighter text-[var(--text-primary)]">Resumen Creado</h2>
                         <p className="text-sm text-[var(--text-secondary)] max-w-sm">Tus datos y comprobante han sido recibidos. En breve nos comunicaremos a tu Whatsapp para rectificar disponibilidad absoluta y medidas.</p>
                         <Link to={getUrl('/')} className="btn-guambra-secondary mt-8 inline-block">Cerrar Sesión Visual</Link>
                     </div>
                 )}
             </div>

             {/* Área de Resumen del Traje (Lateral Fijo) */}
             <div className="lg:col-span-5 hidden lg:block">
                 <div className="glass-card p-6 sticky top-24">
                     <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)] mb-4 block">Resumen de Inversión</span>
                     <div className="flex gap-4 mb-6">
                         <div className="w-20 h-24 bg-[var(--bg-surface-3)] rounded-xl border border-[var(--border-soft)] flex items-center justify-center">
                             <ShoppingBag className="text-[var(--text-muted)] opacity-20 h-8 w-8" />
                         </div>
                         <div>
                             <h4 className="font-bold text-[var(--text-primary)] tracking-tight">{productoInfo.nombre}</h4>
                             <span className="text-2xl font-black tracking-tighter text-[var(--color-primary)] mt-1 block">${productoInfo.precio_unitario}</span>
                         </div>
                     </div>
                     <div className="space-y-4 text-sm border-t border-[var(--border-soft)] pt-6">
                         <div className="flex justify-between text-[var(--text-secondary)] font-medium">
                             <span>Anticipo Requerido (50%)</span>
                             <span>${(productoInfo.precio_unitario / 2).toFixed(2)}</span>
                         </div>
                         {formData.quiereEnvio && (
                             <div className="flex justify-between text-[var(--color-primary)]/80 font-medium text-xs">
                                 <span className="flex items-center"><Truck className="h-3 w-3 mr-1" /> Envío a Domicilio</span>
                                 <span>Por Confirmar</span>
                             </div>
                         )}
                         <div className="flex justify-between items-end pt-4 border-t border-[var(--border-soft)]">
                             <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Total Final (Depósito Aprox)</span>
                             <span className="text-3xl font-black tracking-tighter text-[var(--text-primary)]">${(productoInfo.precio_unitario / 2).toFixed(2)}</span>
                         </div>
                     </div>
                 </div>
             </div>

         </div>
      </div>
    </div>
  );
};

export default FlujoReservaWeb;
