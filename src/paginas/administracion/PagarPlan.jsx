import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import {
  Loader2, ArrowLeft, Building2, QrCode, CheckCircle2,
  MessageCircle, ShieldCheck, Calculator, Clock
} from 'lucide-react';

const opcionesMeses = [
  { value: 1, label: '1 mes' },
  { value: 3, label: '3 meses', descuento: '5% desc.' },
  { value: 6, label: '6 meses', descuento: '10% desc.' },
  { value: 12, label: '12 meses', descuento: '15% desc.' },
];

const PagarPlan = () => {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan_id');
  const navigate = useNavigate();
  const { profile } = useAuthStore();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [meses, setMeses] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState(null);

  const tenantData = profile?.tenant;

  useEffect(() => {
    if (!planId) {
      navigate('/planes');
      return;
    }

    const fetchPlan = async () => {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .eq('id', planId)
          .single();

        if (error) throw error;
        setPlan(data);
      } catch (err) {
        console.error('Error fetching plan:', err);
        navigate('/planes');
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [planId, navigate]);

  // Calculate pricing
  const getDescuento = (m) => {
    if (m >= 12) return 0.15;
    if (m >= 6) return 0.10;
    if (m >= 3) return 0.05;
    return 0;
  };

  const precioBase = plan ? plan.precio_mensual * meses : 0;
  const descuento = getDescuento(meses);
  const montoDescuento = precioBase * descuento;
  const totalFinal = precioBase - montoDescuento;

  const handleConfirmarEnvio = async () => {
    if (!tenantData || !plan) return;

    setEnviando(true);
    setError(null);

    try {
      // Create payment record with status 'pendiente'
      const { error: pagoError } = await supabase
        .from('pagos_suscripcion')
        .insert([{
          tenant_id: tenantData.id,
          plan_id: plan.id,
          monto: totalFinal,
          periodo_facturacion: tenantData.periodo_facturacion || 'monthly',
          inicio_periodo: new Date().toISOString().split('T')[0],
          fin_periodo: new Date(new Date().setMonth(new Date().getMonth() + meses)).toISOString().split('T')[0],
          estado: 'pendiente',
          metodo_pago: 'banco_pichincha',
          meses_pagados: meses,
          notas: `Pago pendiente de confirmación — Plan: ${plan.nombre}, ${meses} mes(es), Total: $${totalFinal.toFixed(2)}`
        }]);

      if (pagoError) throw pagoError;

      setEnviado(true);
    } catch (err) {
      console.error('Error registering payment:', err);
      setError(err.message || 'Error al registrar el pago. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-[var(--text-muted)] text-sm font-medium">Cargando información del plan...</p>
      </div>
    );
  }

  // Success state
  if (enviado) {
    return (
      <div className="max-w-lg mx-auto py-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="glass-card p-10 text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black tracking-tighter text-[var(--text-primary)]">¡Comprobante registrado!</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Hemos registrado tu intención de pago. Tu plan será activado por el equipo de Mis Trajes en menos de <strong className="text-[var(--text-primary)]">24 horas hábiles</strong> después de verificar el comprobante.
          </p>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <p className="text-xs text-emerald-300 font-bold uppercase tracking-widest mb-1">¿Aún no enviaste el comprobante?</p>
            <p className="text-[11px] text-[var(--text-muted)]">Envíalo por WhatsApp al número indicado para agilizar la activación.</p>
          </div>
          <div className="flex flex-col gap-3 pt-4">
            <a
              href="https://wa.me/593982650929?text=Hola%2C%20acabo%20de%20realizar%20el%20pago%20de%20mi%20suscripci%C3%B3n%20Mis%20Trajes.%20Adjunto%20mi%20comprobante."
              target="_blank"
              rel="noopener noreferrer"
              className="btn-guambra-primary flex items-center justify-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar comprobante por WhatsApp
            </a>
            <Link to="/dashboard" className="btn-guambra-secondary text-center">
              Volver al Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Back Button */}
      <Link to="/planes" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] uppercase tracking-widest transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Volver a planes
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* Left Column: Plan Summary + Month Selector */}
        <div className="lg:col-span-3 space-y-6">

          {/* Plan Summary Card */}
          <div className="glass-card p-8">
            <div className="flex items-center gap-2 mb-6">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-black tracking-tighter text-[var(--text-primary)] uppercase">Resumen del Plan</h2>
            </div>

            <div className="bg-[var(--bg-surface-2)] rounded-xl p-6 border border-[var(--border-soft)]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-black tracking-tighter text-[var(--text-primary)]">{plan.nombre}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{plan.descripcion}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black tracking-tighter text-[var(--text-primary)]">${plan.precio_mensual}</p>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">/mes</p>
                </div>
              </div>
            </div>

            {/* Month Selector */}
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-primary" />
                <label className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest">¿Cuántos meses deseas contratar?</label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {opcionesMeses.map((opcion) => (
                  <button
                    key={opcion.value}
                    onClick={() => setMeses(opcion.value)}
                    className={`relative p-4 rounded-xl border text-center transition-all duration-300 ${
                      meses === opcion.value
                        ? 'bg-primary/20 border-primary/50 shadow-lg shadow-primary/10'
                        : 'bg-[var(--bg-surface-2)] border-[var(--border-soft)] hover:bg-[var(--bg-surface-3)]'
                    }`}
                  >
                    <p className={`text-lg font-black tracking-tighter ${meses === opcion.value ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {opcion.label}
                    </p>
                    {opcion.descuento && (
                      <span className="text-[9px] font-bold text-primary uppercase tracking-widest">{opcion.descuento}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Calculation */}
            <div className="mt-8 bg-[var(--bg-surface-2)] rounded-xl p-6 border border-[var(--border-soft)] space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-primary" />
                <span className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest">Desglose</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">${plan.precio_mensual} × {meses} mes{meses > 1 ? 'es' : ''}</span>
                <span className="text-[var(--text-primary)] font-bold">${precioBase.toFixed(2)}</span>
              </div>

              {descuento > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-400 font-medium">Descuento ({(descuento * 100).toFixed(0)}%)</span>
                  <span className="text-emerald-400 font-bold">-${montoDescuento.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-[var(--border-soft)] pt-3 flex justify-between">
                <span className="text-[var(--text-primary)] font-black uppercase tracking-widest text-sm">Total a pagar</span>
                <span className="text-2xl font-black tracking-tighter text-[var(--text-primary)]">${totalFinal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Payment Methods + CTA */}
        <div className="lg:col-span-2 space-y-6">

          {/* Payment Methods */}
          <div className="glass-card p-8">
            <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest mb-6">Métodos de Pago</h3>

            {/* Banco Pichincha */}
            <div className="bg-[var(--bg-surface-2)] rounded-xl p-5 border border-[var(--border-soft)] mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-[var(--text-primary)] tracking-tight">Banco Pichincha</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Cuenta de Ahorros</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Cuenta:</span>
                  <span className="text-[var(--text-primary)] font-bold tracking-wide">2207862136</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Titular:</span>
                  <span className="text-[var(--text-primary)] font-bold">Andy J. Ortiz</span>
                </div>
              </div>
            </div>

            {/* deUna QR */}
            <div className="bg-[var(--bg-surface-2)] rounded-xl p-5 border border-[var(--border-soft)] mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                  <QrCode className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-[var(--text-primary)] tracking-tight">deUna QR</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Pago inmediato</p>
                </div>
              </div>
              <div className="flex items-center justify-center p-4 bg-white rounded-xl">
                <div className="text-center">
                  <QrCode className="h-24 w-24 text-gray-800 mx-auto" />
                  <p className="text-[10px] text-gray-500 font-bold mt-2">Escanea con tu app deUna</p>
                </div>
              </div>
            </div>

            {/* WhatsApp Instructions */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-300 leading-relaxed">
                    Una vez realizado el pago, envía tu comprobante al siguiente WhatsApp para activar tu plan:
                  </p>
                  <a
                    href="https://wa.me/593982650929"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs font-black uppercase tracking-widest hover:bg-emerald-500/30 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    +593 982650929
                  </a>
                  <p className="text-[10px] text-[var(--text-muted)] font-medium mt-3">
                    Tu plan será activado en menos de 24 horas hábiles.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-xs text-red-400 font-bold">{error}</p>
            </div>
          )}

          <button
            onClick={handleConfirmarEnvio}
            disabled={enviando}
            className="w-full btn-guambra-primary flex items-center justify-center gap-3 py-4 text-sm disabled:opacity-50"
          >
            {enviando ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Ya envié mi comprobante
              </>
            )}
          </button>

          <p className="text-[10px] text-[var(--text-muted)] text-center font-medium">
            Al hacer clic confirmas que ya realizaste la transferencia y enviaste el comprobante por WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PagarPlan;
