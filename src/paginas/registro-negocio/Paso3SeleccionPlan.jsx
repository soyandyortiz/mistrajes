import { useState, useEffect } from 'react';
import { useRegistroNegocioStore } from '../../stores/registroNegocioStore';
import { supabase } from '../../lib/supabase';
import { Check, Loader2 } from 'lucide-react';

const Paso3SeleccionPlan = () => {
  const { selectedPlan, setPlan, nextStep, prevStep } = useRegistroNegocioStore();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .order('precio_mensual', { ascending: true });
        
        if (error) throw error;
        setPlans(data || []);
      } catch (err) {
        console.error('Error fetching plans:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleNext = () => {
    if (selectedPlan) {
      nextStep();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 transition-all duration-300">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-gray-500 font-medium tracking-tight">Cargando planes disponibles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-4xl font-black tracking-tighter text-white sm:text-5xl">
          Elige tu <span className="text-gradient-guambra">Potencia</span>
        </h2>
        <p className="mt-4 text-gray-400 font-medium tracking-wide">
          Suscripciones escalables diseñadas para el crecimiento de tu negocio.
        </p>
      </div>

      <div className="isolate mx-auto grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            onClick={() => setPlan(plan)}
            className={`glass-card p-8 xl:p-10 cursor-pointer transition-all duration-500 transform relative overflow-hidden group ${
              selectedPlan?.id === plan.id
                ? 'border-primary ring-1 ring-primary/50 shadow-[0_0_40px_rgba(51,92,255,0.2)] scale-[1.03]'
                : 'hover:border-white/30 hover:scale-[1.01]'
            }`}
          >
            {selectedPlan?.id === plan.id && (
              <div className="absolute top-0 right-0 p-2 z-10">
                <div className="rounded-full bg-primary p-1 shadow-[0_0_10px_rgba(51,92,255,0.8)]">
                  <Check className="h-4 w-4 text-white" />
                </div>
              </div>
            )}

            {Number(plan.precio_mensual) === 0 && (
              <div className="absolute top-5 right-[-35px] bg-primary text-white text-[10px] font-bold px-10 py-1 uppercase tracking-widest transform rotate-45 shadow-lg z-0">
                Demo
              </div>
            )}
            
            <div className="flex flex-col h-full relative z-0">
              <h3 className={`text-2xl font-black leading-8 tracking-tighter transition-colors ${selectedPlan?.id === plan.id ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                {plan.nombre}
              </h3>
              
              <p className="mt-4 text-sm leading-6 text-gray-400 h-12 overflow-hidden">{plan.descripcion}</p>
              
              <p className="mt-8 flex items-baseline gap-x-1">
                <span className="text-5xl font-black tracking-tighter text-white">${plan.precio_mensual}</span>
                <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">/mes</span>
              </p>

              <ul role="list" className="mt-10 space-y-4 text-sm leading-6 text-gray-300 xl:mt-12 font-medium">
                <li className="flex gap-x-3 items-center">
                  <div className="rounded-full bg-white/5 p-1"><Check className="h-4 w-4 text-primary" /></div>
                  Hasta {plan.max_productos_activos} Trajes
                </li>
                <li className="flex gap-x-3 items-center">
                  <div className="rounded-full bg-white/5 p-1"><Check className="h-4 w-4 text-primary" /></div>
                  {plan.max_empleados} Usuarios
                </li>
                <li className="flex gap-x-3 items-center">
                  <div className="rounded-full bg-white/5 p-1"><Check className="h-4 w-4 text-primary" /></div>
                  Contratos Ilimitados*
                </li>
                <li className="flex gap-x-3 items-center">
                  <div className="rounded-full bg-white/5 p-1"><Check className="h-4 w-4 text-primary" /></div>
                  {plan.tiene_tienda_online ? (
                    <span className="text-gradient-guambra font-bold">Tienda Online PRO</span>
                  ) : (
                    <span className="text-gray-600">Sin Tienda Pública</span>
                  )}
                </li>
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-12 flex justify-between items-center">
        <button
            type="button"
            onClick={prevStep}
            className="btn-guambra-secondary"
          >
            Atrás
        </button>
        <button
            type="button"
            onClick={handleNext}
            disabled={!selectedPlan}
            className="btn-guambra-primary disabled:opacity-20"
          >
            Confirmar Plan
        </button>
      </div>
    </div>
  );
};

export default Paso3SeleccionPlan;
