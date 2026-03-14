import { useState } from 'react';
import { useRegistroNegocioStore } from '../../stores/registroNegocioStore';
import { supabase } from '../../lib/supabase';
import { CreditCard, Loader2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Paso4PagoYActivacion = () => {
  const { businessData, subdomain, selectedPlan, prevStep, reset } = useRegistroNegocioStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleRegisterTenant = async () => {
    setIsProcessing(true);
    setError(null);
    
    // Simulating slight delay for professional feel
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      // Registrar la solicitud en la tabla de solicitudes_registro
      const { error: insertError } = await supabase
        .from('solicitudes_registro')
        .insert([{
            nombre_negocio: businessData.name, 
            slug: subdomain,                   
            plan_id: selectedPlan.id,
            nombre_propietario: businessData.contactName, 
            cedula_ruc_propietario: businessData.documentId || '9999999999', 
            email_propietario: businessData.email,           
            whatsapp_propietario: businessData.whatsapp,
            ciudad: businessData.city,
            pais: businessData.country,
            direccion: businessData.address,
            estado: 'pendiente'
        }]);
        
      if (insertError) throw insertError;

      // Success! Move to activation screen state
      setIsProcessing(false);
      
      // Store some info to show on the success screen
      sessionStorage.setItem('demo_email', businessData.email);
      sessionStorage.setItem('demo_subdomain', subdomain);
      sessionStorage.setItem('demo_negocio', businessData.name);
      sessionStorage.setItem('demo_plan', selectedPlan.nombre);
      
      navigate('/registro-negocio/exito');
      reset();

    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.message || 'Ocurrió un error al enviar tu solicitud. Inténtalo de nuevo.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-[800ms]">
      <div className="border-b border-white/10 pb-6">
        <h3 className="text-3xl font-black text-white tracking-tighter">Finalizar Aprovisionamiento</h3>
        <p className="mt-2 text-sm text-gray-400">Revisa tu configuración y activa tu nodo en la red.</p>
      </div>
      
      <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
           <img src="/icono.svg" alt="" className="h-32 w-32 object-contain" />
        </div>

        <h3 className="text-2xl font-black text-white mb-10 flex items-center tracking-tighter">
            <img src="/icono.svg" alt="MisTrajes" className="h-10 w-10 object-contain mr-4" />
            {businessData.name}
        </h3>
        
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8 relative z-10">
          <div className="sm:col-span-1 border-l-2 border-white/5 pl-4">
            <dt className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Identidad Digital</dt>
            <dd className="text-lg text-white font-bold tracking-tight">{subdomain}.mistrajes.com</dd>
          </div>
          <div className="sm:col-span-1 border-l-2 border-white/5 pl-4">
            <dt className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Nivel de Potencia</dt>
            <dd className="text-lg text-white font-bold tracking-tight">{selectedPlan?.nombre}</dd>
          </div>
          <div className="sm:col-span-1 border-l-2 border-white/5 pl-4">
            <dt className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Responsable del Nodo</dt>
            <dd className="text-lg text-white font-bold tracking-tight">{businessData.contactName}</dd>
          </div>
          <div className="sm:col-span-1 border-l-2 border-primary/20 pl-4 bg-primary/5 rounded-r-xl py-2">
            <dt className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Inversión Mensual</dt>
            <dd className="text-3xl font-black text-white tracking-tighter">${selectedPlan?.precio_mensual}</dd>
          </div>
        </dl>
      </div>

      {error && (
        <div className="bg-red-500/5 border border-red-500/20 px-6 py-4 rounded-2xl animate-in shake-1 border-l-4 border-l-red-500">
           <p className="text-sm font-bold text-red-400 uppercase tracking-widest mb-1">Error de Sincronización</p>
           <p className="text-xs text-red-300/80 font-medium">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-10 flex justify-between items-center bg-transparent">
        <button
          type="button"
          onClick={prevStep}
          disabled={isProcessing}
          className="btn-guambra-secondary disabled:opacity-20"
        >
          Regresar
        </button>
        
        <button
          onClick={handleRegisterTenant}
          disabled={isProcessing}
          className="btn-guambra-primary disabled:opacity-50 min-w-[280px]"
        >
          {isProcessing ? (
            <div className="flex items-center">
              <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Enviando Solicitud...
            </div>
          ) : (
            <div className="flex items-center">
              <img src="/icono.svg" alt="" className="-ml-1 mr-3 h-5 w-5 object-contain" />
              Enviar Solicitud
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default Paso4PagoYActivacion;
