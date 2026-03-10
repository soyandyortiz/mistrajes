import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Clock, ShieldCheck, AlertTriangle, ShieldX, MessageCircle, CalendarDays } from 'lucide-react';

const BannerSuscripcion = ({ isCollapsed, variant = 'sidebar' }) => {
  const { profile } = useAuthStore();
  const tenantId = profile?.tenant?.id;

  const [tenantFresh, setTenantFresh]   = useState(null);
  const [suscripcion, setSuscripcion]   = useState(null);
  const [loading, setLoading]           = useState(true);

  // Fetch siempre directo a Supabase, no usa tenantData del authStore (es stale)
  const fetchAll = useCallback(async () => {
    if (!tenantId) { setLoading(false); return; }
    try {
      // 1. Tenant fresco (estado, plan, fechas)
      const { data: tData } = await supabase
        .from('tenants')
        .select('estado, plan_id, inicio_suscripcion, trial_inicio, trial_fin, fin_suscripcion, suscripcion_activa_id, plan:plans(nombre)')
        .eq('id', tenantId)
        .single();

      if (!tData) return;
      setTenantFresh(tData);

      // 2. Suscripción activa (tipo, estado, fecha_vencimiento, plan)
      if (tData.suscripcion_activa_id) {
        const { data: sData } = await supabase
          .from('tenant_suscripciones')
          .select('*, plan:plans(nombre)')
          .eq('id', tData.suscripcion_activa_id)
          .single();
        setSuscripcion(sData ?? null);
      } else {
        setSuscripcion(null);
      }
    } catch (err) {
      console.error('BannerSuscripcion:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Fetch inicial + polling cada 60s + re-fetch al volver al tab
  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60_000);
    window.addEventListener('focus', fetchAll);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fetchAll);
    };
  }, [fetchAll]);

  // Realtime: si está habilitado en Supabase, actualiza al instante
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`banner-tenant-${tenantId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tenants', filter: `id=eq.${tenantId}` }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, fetchAll]);

  if (loading || !tenantFresh) return null;

  // ── Fechas ────────────────────────────────────────────────────────────────────
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const venceRaw = suscripcion?.fecha_vencimiento ?? tenantFresh.fin_suscripcion ?? tenantFresh.trial_fin;
  if (!venceRaw) return null;

  const fechaVencimiento = new Date(venceRaw + 'T00:00:00');
  const diasRestantes = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));

  const fechaVenceFormateada = fechaVencimiento.toLocaleDateString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const inicioRaw = suscripcion?.fecha_inicio ?? tenantFresh.inicio_suscripcion ?? tenantFresh.trial_inicio;
  const fechaInicioFormateada = inicioRaw
    ? new Date(inicioRaw + 'T00:00:00').toLocaleDateString('es-EC', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : null;

  // ── Estado: usa datos frescos (tenantFresh + suscripcion) ─────────────────────
  const estadoFresh = tenantFresh.estado;

  // Si hay suscripcion, su tipo es la fuente de verdad
  // Si no, usamos el estado del tenant
  const esTrial = suscripcion
    ? suscripcion.tipo === 'trial'
    : estadoFresh === 'trial' || estadoFresh === 'demo';

  const estaSuspendido = suscripcion
    ? suscripcion.estado === 'suspendida'
    : estadoFresh === 'suspendido' || estadoFresh === 'suspended';

  const vencimientoProximo = diasRestantes <= 5 && diasRestantes > 0;
  const vencido = diasRestantes <= 0;

  // Nombre del plan: preferir suscripción fresca → tenant fresco → fallback
  const nombrePlan = suscripcion?.plan?.nombre ?? tenantFresh.plan?.nombre ?? 'Plan Activo';

  // ── Config por estado ─────────────────────────────────────────────────────────
  let config;

  if (estaSuspendido || vencido) {
    config = {
      icon: ShieldX,
      bg: 'bg-red-500/10 border-red-500/25',
      iconColor: 'text-red-500',
      textColor: 'text-red-600 dark:text-red-400 font-black',
      dotColor: 'bg-red-500',
      title: estaSuspendido ? 'Acceso suspendido' : 'Suscripción vencida',
      subtitle: 'Contacta a soporte.',
      inicio: null,
      btnText: 'WhatsApp',
      btnHref: 'https://wa.me/593982650929?text=Hola%2C%20mi%20plan%20fue%20suspendido%20y%20necesito%20reactivarlo.',
      btnStyle: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25 hover:bg-red-500/25',
      isExternal: true,
    };
  } else if (vencimientoProximo) {
    config = {
      icon: AlertTriangle,
      bg: 'bg-amber-500/10 border-amber-500/25',
      iconColor: 'text-amber-500',
      textColor: 'text-amber-600 dark:text-amber-400 font-black',
      dotColor: 'bg-amber-500 animate-pulse',
      title: `Vence en ${diasRestantes} d.`,
      subtitle: `Vence: ${fechaVenceFormateada}`,
      inicio: fechaInicioFormateada,
      btnText: 'Renovar',
      btnHref: '/precios',
      btnStyle: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/25',
      isExternal: false,
    };
  } else if (esTrial) {
    config = {
      icon: Clock,
      bg: 'bg-blue-500/10 border-blue-500/25',
      iconColor: 'text-blue-500',
      textColor: 'text-blue-600 dark:text-blue-400 font-black',
      dotColor: 'bg-blue-500',
      title: `Demo — ${diasRestantes} d.`,
      subtitle: `Vence: ${fechaVenceFormateada}`,
      inicio: fechaInicioFormateada,
      btnText: 'Planes',
      btnHref: '/precios',
      btnStyle: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25 hover:bg-blue-500/25',
      isExternal: false,
    };
  } else {
    config = {
      icon: ShieldCheck,
      bg: 'bg-emerald-500/10 border-emerald-500/25',
      iconColor: 'text-emerald-500',
      textColor: 'text-emerald-600 dark:text-emerald-400 font-black',
      dotColor: 'bg-emerald-500',
      title: `${nombrePlan} · ${diasRestantes}d`,
      subtitle: `Vence: ${fechaVenceFormateada}`,
      inicio: fechaInicioFormateada,
      btnText: 'Planes',
      btnHref: '/precios',
      btnStyle: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/25',
      isExternal: false,
    };
  }

  const Icon = config.icon;

  // ── Variant: header ───────────────────────────────────────────────────────────
  if (variant === 'header') {
    const BtnComponent = config.isExternal ? (
      <a
        href={config.btnHref}
        target="_blank"
        rel="noopener noreferrer"
        className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md border transition-all flex items-center gap-1 ${config.btnStyle}`}
      >
        <MessageCircle className="h-2.5 w-2.5" />
        {config.btnText}
      </a>
    ) : (
      <Link
        to={config.btnHref}
        className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md border transition-all ${config.btnStyle}`}
      >
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
            <span className={`text-[10px] leading-none uppercase tracking-widest ${config.textColor}`}>
              {config.title}
            </span>
            <span className="text-[8px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-0.5 leading-none">
              {config.subtitle}
            </span>
            {config.inicio && (
              <span className="text-[8px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-0.5 leading-none flex items-center gap-0.5">
                <CalendarDays className="h-2 w-2 opacity-60" />
                Desde {config.inicio}
              </span>
            )}
          </div>
        </div>
        <div className="w-px h-6 bg-[var(--border-soft)] mx-1" />
        {BtnComponent}
      </div>
    );
  }

  // ── Variant: sidebar colapsado ────────────────────────────────────────────────
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

  // ── Variant: sidebar expandido ────────────────────────────────────────────────
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
          {config.inicio && (
            <p className="text-[9px] text-[var(--text-muted)] font-medium mt-0.5 leading-tight flex items-center gap-1">
              <CalendarDays className="h-2.5 w-2.5 opacity-50 shrink-0" />
              Desde {config.inicio}
            </p>
          )}
          <div className="mt-2">
            {config.isExternal ? (
              <a href={config.btnHref} target="_blank" rel="noopener noreferrer">
                {ButtonContent}
              </a>
            ) : (
              <Link to={config.btnHref}>{ButtonContent}</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannerSuscripcion;
