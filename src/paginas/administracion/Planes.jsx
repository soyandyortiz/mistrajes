import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Check, Loader2, Crown, Zap, Rocket, ShieldCheck, ArrowRight } from 'lucide-react';

const iconMap = {
  0: Zap,
  1: Crown,
  2: Rocket,
};

const Planes = () => {
  const { profile } = useAuthStore();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const tenantData = profile?.tenant;
  const suscripcionActivaId = tenantData?.suscripcion_activa_id;

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .eq('es_activo', true)
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

  const handleComprar = (planId) => {
    navigate(`/planes/pagar?plan_id=${planId}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-[var(--text-muted)] text-sm font-medium tracking-wide">Cargando planes disponibles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Planes y Suscripciones</span>
        </div>
        <h1 className="text-4xl font-black tracking-tighter text-[var(--text-primary)] sm:text-5xl">
          Elige tu <span className="text-gradient-guambra">Plan</span>
        </h1>
        <p className="mt-4 text-[var(--text-secondary)] font-medium tracking-wide text-sm">
          Escala tu negocio con el nivel de potencia que necesitas. Todos los planes incluyen soporte por WhatsApp.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan, idx) => {
          const PlanIcon = iconMap[idx] || Zap;
          const isPopular = idx === 1;

          return (
            <div
              key={plan.id}
              className={`relative glass-card p-8 flex flex-col transition-all duration-500 group hover:scale-[1.02] ${
                isPopular 
                  ? 'border-primary/40 ring-1 ring-primary/20 shadow-[0_0_40px_rgba(51,92,255,0.1)]'
                  : 'hover:border-[var(--border-medium)]'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-primary text-[var(--bg-surface)] text-[9px] font-black uppercase tracking-[0.3em] rounded-full shadow-lg shadow-primary/30">
                    Popular
                  </span>
                </div>
              )}

              {/* Plan Icon & Name */}
              <div className="flex items-center gap-3 mb-6">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  isPopular ? 'bg-primary/20 border border-primary/30' : 'bg-[var(--bg-surface-2)] border border-[var(--border-soft)]'
                }`}>
                  <PlanIcon className={`h-6 w-6 ${isPopular ? 'text-primary' : 'text-[var(--text-secondary)]'}`} />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tighter text-[var(--text-primary)]">{plan.nombre}</h3>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{plan.nivel_soporte || 'Básico'}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6 min-h-[40px]">{plan.descripcion}</p>

              {/* Pricing */}
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black tracking-tighter text-[var(--text-primary)]">${plan.precio_mensual}</span>
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">/mes</span>
                </div>
                {plan.precio_anual && (
                  <p className="text-[10px] text-[var(--text-muted)] font-medium mt-1">
                    o ${plan.precio_anual}/año (ahorra {Math.round((1 - plan.precio_anual / (plan.precio_mensual * 12)) * 100)}%)
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)] font-medium">
                  <div className="rounded-full bg-[var(--bg-surface-2)] p-1 shrink-0"><Check className="h-3.5 w-3.5 text-primary" /></div>
                  Hasta {plan.max_productos_activos} Trajes/Productos
                </li>
                <li className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)] font-medium">
                  <div className="rounded-full bg-[var(--bg-surface-2)] p-1 shrink-0"><Check className="h-3.5 w-3.5 text-primary" /></div>
                  Hasta {plan.max_piezas_activas} Piezas
                </li>
                <li className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)] font-medium">
                  <div className="rounded-full bg-[var(--bg-surface-2)] p-1 shrink-0"><Check className="h-3.5 w-3.5 text-primary" /></div>
                  {plan.max_empleados} Usuarios
                </li>
                <li className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)] font-medium">
                  <div className="rounded-full bg-[var(--bg-surface-2)] p-1 shrink-0"><Check className="h-3.5 w-3.5 text-primary" /></div>
                  {plan.max_contratos_activos} Contratos activos
                </li>
                <li className="flex items-center gap-2.5 text-sm font-medium">
                  <div className="rounded-full bg-[var(--bg-surface-2)] p-1 shrink-0"><Check className={`h-3.5 w-3.5 ${plan.tiene_tienda_online ? 'text-primary' : 'text-[var(--text-muted)]'}`} /></div>
                  <span className={plan.tiene_tienda_online ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)] line-through'}>Tienda Online</span>
                </li>
                <li className="flex items-center gap-2.5 text-sm font-medium">
                  <div className="rounded-full bg-[var(--bg-surface-2)] p-1 shrink-0"><Check className={`h-3.5 w-3.5 ${plan.tiene_modulo_envios ? 'text-primary' : 'text-[var(--text-muted)]'}`} /></div>
                  <span className={plan.tiene_modulo_envios ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)] line-through'}>Módulo de Envíos</span>
                </li>
                <li className="flex items-center gap-2.5 text-sm font-medium">
                  <div className="rounded-full bg-[var(--bg-surface-2)] p-1 shrink-0"><Check className={`h-3.5 w-3.5 ${plan.tiene_modulo_proformas ? 'text-primary' : 'text-[var(--text-muted)]'}`} /></div>
                  <span className={plan.tiene_modulo_proformas ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)] line-through'}>Proformas</span>
                </li>
                <li className="flex items-center gap-2.5 text-sm font-medium">
                  <div className="rounded-full bg-[var(--bg-surface-2)] p-1 shrink-0"><Check className={`h-3.5 w-3.5 ${plan.tiene_dominio_propio ? 'text-primary' : 'text-[var(--text-muted)]'}`} /></div>
                  <span className={plan.tiene_dominio_propio ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)] line-through'}>Dominio Propio</span>
                </li>
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleComprar(plan.id)}
                className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 group/btn ${
                  isPopular
                    ? 'bg-primary text-[var(--bg-surface)] hover:bg-primary/90 shadow-lg shadow-primary/20'
                    : 'bg-[var(--bg-surface-2)] text-[var(--text-primary)] border border-[var(--border-soft)] hover:bg-[var(--bg-surface-3)]'
                }`}
              >
                Comprar este plan
                <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-center text-[11px] text-[var(--text-muted)] font-medium max-w-lg mx-auto">
        Todos los planes incluyen soporte por WhatsApp. El pago se procesa manualmente — recibirás confirmación en menos de 24 horas hábiles.
      </p>
    </div>
  );
};

export default Planes;
