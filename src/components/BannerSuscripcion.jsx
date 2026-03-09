import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Clock, ShieldCheck, AlertTriangle, ShieldX, MessageCircle } from 'lucide-react';

const BannerSuscripcion = ({ isCollapsed, variant = 'sidebar' }) => {
  const { profile } = useAuthStore();
  const [suscripcion, setSuscripcion] = useState(null);
  const [loading, setLoading] = useState(true);

  const tenantData = profile?.tenant;

  useEffect(() => {
    if (!tenantData?.suscripcion_activa_id) {
      setLoading(false);
      return;
    }

    const fetchSuscripcion = async () => {
      try {
        const { data, error } = await supabase
          .from('tenant_suscripciones')
          .select('*, plan:plans(nombre)')
          .eq('id', tenantData.suscripcion_activa_id)
          .single();

        if (error) throw error;
        setSuscripcion(data);
      } catch (err) {
        console.error('Error fetching suscripcion:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuscripcion();
  }, [tenantData?.suscripcion_activa_id]);

  if (loading || !tenantData) return null;

  // Calculate remaining days
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fechaVencimiento = suscripcion 
    ? new Date(suscripcion.fecha_vencimiento + 'T00:00:00') 
    : tenantData.trial_fin 
      ? new Date(tenantData.trial_fin + 'T00:00:00') 
      : null;

  if (!fechaVencimiento) return null;

  const diasRestantes = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
  const estadoTenant = tenantData.estado;
  const esTrial = estadoTenant === 'trial' || suscripcion?.tipo === 'trial';
  const estaSuspendido = estadoTenant === 'suspendido' || estadoTenant === 'suspended';
  const vencimientoProximo = diasRestantes <= 5 && diasRestantes > 0;
  const vencido = diasRestantes <= 0;

  // Determine banner state
  let config;

  if (estaSuspendido || vencido) {
    config = {
      icon: ShieldX,
      bg: 'bg-red-500/10 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]',
      iconColor: 'text-red-400',
      textColor: 'text-red-500 font-black',
      dotColor: 'bg-red-500',
      title: 'Acceso suspendido',
      subtitle: 'Contacta a soporte.',
      btnText: 'WhatsApp',
      btnHref: 'https://wa.me/593982650929?text=Hola%2C%20mi%20plan%20fue%20suspendido%20y%20necesito%20reactivarlo.',
      btnStyle: 'bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30',
      isExternal: true
    };
  } else if (vencimientoProximo) {
    config = {
      icon: AlertTriangle,
      bg: 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
      iconColor: 'text-amber-500',
      textColor: 'text-amber-600 font-black',
      dotColor: 'bg-amber-500 animate-pulse',
      title: `Vence en ${diasRestantes} d.`,
      subtitle: 'Renueva ahora.',
      btnText: 'Renovar',
      btnHref: '/planes',
      btnStyle: 'bg-amber-500/20 text-amber-600 border-amber-500/30 hover:bg-amber-500/30',
      isExternal: false
    };
  } else if (esTrial) {
    config = {
      icon: Clock,
      bg: 'bg-blue-500/10 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]',
      iconColor: 'text-blue-500',
      textColor: 'text-blue-600 font-black',
      dotColor: 'bg-blue-500',
      title: `Trial — ${diasRestantes} d.`,
      subtitle: 'Elige un plan.',
      btnText: 'Planes',
      btnHref: '/planes',
      btnStyle: 'bg-blue-500/20 text-blue-600 border-blue-500/30 hover:bg-blue-500/30',
      isExternal: false
    };
  } else {
    // Active plan with > 5 days
    const nombrePlan = suscripcion?.plan?.nombre || 'Plan Activo';
    const fechaFormateada = fechaVencimiento.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
    config = {
      icon: ShieldCheck,
      bg: 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
      iconColor: 'text-emerald-500',
      textColor: 'text-emerald-600 font-black',
      dotColor: 'bg-emerald-500',
      title: `${nombrePlan}`,
      subtitle: `Vence: ${fechaFormateada}`,
      btnText: 'Planes',
      btnHref: '/planes',
      btnStyle: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/30',
      isExternal: false
    };
  }

  const Icon = config.icon;

  if (variant === 'header') {
    const BtnComponent = config.isExternal ? (
       <a href={config.btnHref} target="_blank" rel="noopener noreferrer" className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md border transition-all flex items-center gap-1 ${config.btnStyle}`}>
          <MessageCircle className="h-2.5 w-2.5" />
          {config.btnText}
       </a>
    ) : (
       <Link to={config.btnHref} className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md border transition-all ${config.btnStyle}`}>
          {config.btnText}
       </Link>
    );

    return (
      <div className={`hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl border ${config.bg} transition-all duration-300 shrink-0`}>
        <div className="flex items-center gap-2">
          <div className="relative">
             <Icon className={`h-3.5 w-3.5 ${config.iconColor}`} />
             <span className={`absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
          </div>
          <div className="flex flex-col min-w-max">
             <span className={`text-[10px] leading-none uppercase tracking-widest ${config.textColor}`}>{config.title}</span>
             <span className="text-[8px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-0.5 leading-none">{config.subtitle}</span>
          </div>
        </div>
        <div className="w-px h-6 bg-[var(--border-soft)] mx-1"></div>
        {BtnComponent}
      </div>
    );
  }

  // Collapsed sidebar: show compact icon only
  if (isCollapsed) {
    return (
      <div className="px-3 py-2 flex justify-center" title={config.title}>
        <div className={`relative p-2 rounded-xl ${config.bg} border`}>
          <Icon className={`h-4 w-4 ${config.iconColor}`} />
          <span className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${config.dotColor}`} />
        </div>
      </div>
    );
  }

  // Expanded sidebar: full banner
  const ButtonContent = (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-all ${config.btnStyle}`}>
      {config.isExternal ? <MessageCircle className="h-3 w-3" /> : null}
      {config.btnText}
    </span>
  );

  return (
    <div className={`mx-3 mb-3 p-3 rounded-xl border ${config.bg} transition-all duration-300`}>
      <div className="flex items-start gap-2.5">
        <div className="relative shrink-0 mt-0.5">
          <Icon className={`h-4 w-4 ${config.iconColor}`} />
          <span className={`absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] leading-tight truncate ${config.textColor}`}>{config.title}</p>
          <p className="text-[9px] text-[var(--text-muted)] font-medium mt-0.5 leading-tight">{config.subtitle}</p>
          <div className="mt-2">
            {config.isExternal ? (
              <a href={config.btnHref} target="_blank" rel="noopener noreferrer">
                {ButtonContent}
              </a>
            ) : (
              <Link to={config.btnHref}>
                {ButtonContent}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannerSuscripcion;
