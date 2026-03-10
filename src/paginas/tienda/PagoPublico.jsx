import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, QrCode, CheckCircle2, MessageCircle,
  Calculator, Clock, Loader2, Copy, Check, Bitcoin,
  ShieldCheck, Zap, Crown, Rocket,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

const OPCIONES_MESES = [
  { value: 1, label: '1 mes' },
  { value: 3, label: '3 meses', badge: '5% desc.' },
  { value: 6, label: '6 meses', badge: '10% desc.' },
  { value: 12, label: '12 meses', badge: '15% desc.' },
];

const getDescuento = (m) => {
  if (m >= 12) return 0.15;
  if (m >= 6) return 0.10;
  if (m >= 3) return 0.05;
  return 0;
};

const PLAN_ICONS = {
  Emprendedores: { Icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  Negocios:      { Icon: Crown, color: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-primary-dim)] border-[var(--color-primary-dim)]' },
  Empresarial:   { Icon: Rocket, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
};

// ── Botón copiar ──────────────────────────────────────────────────────────────
const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      title="Copiar"
      className="h-7 w-7 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-surface-3)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary-dim)] transition-all shrink-0"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};

// ── Método de pago: Banco Pichincha ───────────────────────────────────────────
const MetodoPichincha = () => (
  <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface-3)] overflow-hidden">
    <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-soft)]">
      <div className="h-9 w-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
        <Building2 className="h-4.5 w-4.5 text-yellow-400" />
      </div>
      <div>
        <p className="text-sm font-black uppercase tracking-tight text-[var(--text-primary)]">Banco Pichincha</p>
        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Transferencia · Cuenta de Ahorros</p>
      </div>
    </div>
    <div className="px-5 py-4 space-y-3">
      {[
        { label: 'Titular', value: 'Andy Ortiz' },
        { label: 'N° de cuenta', value: '2207862136' },
        { label: 'Tipo', value: 'Cuenta de Ahorros' },
        { label: 'Banco', value: 'Banco Pichincha' },
      ].map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between gap-3">
          <span className="text-xs text-[var(--text-muted)]">{label}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--text-primary)]">{value}</span>
            <CopyBtn text={value} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── Método de pago: DeUna ─────────────────────────────────────────────────────
const MetodoDeuna = () => (
  <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface-3)] overflow-hidden">
    <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-soft)]">
      <div className="h-9 w-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
        <QrCode className="h-4.5 w-4.5 text-violet-400" />
      </div>
      <div>
        <p className="text-sm font-black uppercase tracking-tight text-[var(--text-primary)]">DeUna</p>
        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Pago inmediato · QR</p>
      </div>
    </div>
    <div className="p-5">
      <div className="bg-white rounded-xl p-4 flex items-center justify-center">
        <img
          src="/qr-deuna.jpeg"
          alt="QR DeUna"
          className="max-w-[180px] w-full rounded-lg"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div className="hidden flex-col items-center gap-2 text-gray-400 p-8">
          <QrCode className="h-16 w-16" />
          <p className="text-xs text-center">Escanea con tu app DeUna</p>
        </div>
      </div>
      <p className="text-[10px] font-bold text-center text-[var(--text-muted)] mt-3 uppercase tracking-widest">
        Escanea con tu app DeUna
      </p>
    </div>
  </div>
);

// ── Método de pago: Bitcoin ───────────────────────────────────────────────────
const BITCOIN_ADDRESS = 'bc1qkvr0dzgpglsfqytqk5xwlqzvzv9rfsqsdt3pf7';
const MetodoBitcoin = () => (
  <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface-3)] overflow-hidden">
    <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-soft)]">
      <div className="h-9 w-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
        <Bitcoin className="h-4.5 w-4.5 text-orange-400" />
      </div>
      <div>
        <p className="text-sm font-black uppercase tracking-tight text-[var(--text-primary)]">Bitcoin</p>
        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Criptomoneda · BTC</p>
      </div>
    </div>
    <div className="p-5 space-y-4">
      <div className="bg-white rounded-xl p-4 flex items-center justify-center">
        <img
          src="/qr-bitcoin.jpeg"
          alt="QR Bitcoin"
          className="max-w-[180px] w-full rounded-lg"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div className="hidden flex-col items-center gap-2 text-gray-400 p-8">
          <Bitcoin className="h-16 w-16" />
          <p className="text-xs text-center">Escanea con tu wallet</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--text-muted)]">Dirección Bitcoin</p>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)]">
          <span className="text-[10px] font-mono text-[var(--text-secondary)] break-all flex-1 leading-relaxed">
            {BITCOIN_ADDRESS}
          </span>
          <CopyBtn text={BITCOIN_ADDRESS} />
        </div>
        <p className="text-[9px] text-[var(--text-muted)] opacity-60">
          Verifica siempre la dirección completa antes de enviar.
        </p>
      </div>
    </div>
  </div>
);

// ── Componente principal ──────────────────────────────────────────────────────
const PagoPublico = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planNombre = searchParams.get('plan') || '';

  const { user, profile } = useAuthStore();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [meses, setMeses] = useState(1);
  const [metodoPago, setMetodoPago] = useState('banco_pichincha');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!planNombre) { navigate('/precios'); return; }
    const fetchPlan = async () => {
      const { data } = await supabase
        .from('plans')
        .select('*')
        .ilike('nombre', planNombre)
        .single();
      if (data) {
        setPlan(data);
      } else {
        // Plan hardcodeado como fallback si aún no está en DB
        const PRECIOS = { Emprendedores: 25, Negocios: 50, Empresarial: 75 };
        setPlan({ nombre: planNombre, precio_mensual: PRECIOS[planNombre] || 50, descripcion: '' });
      }
      setLoading(false);
    };
    fetchPlan();
  }, [planNombre, navigate]);

  const precioBase = plan ? plan.precio_mensual * meses : 0;
  const descuento = getDescuento(meses);
  const montoDescuento = precioBase * descuento;
  const totalFinal = precioBase - montoDescuento;

  const handleConfirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      // Si está autenticado y tiene tenant, registrar en DB
      if (user && profile?.tenant && plan?.id) {
        await supabase.from('pagos_suscripcion').insert([{
          tenant_id: profile.tenant.id,
          plan_id: plan.id,
          monto: totalFinal,
          periodo_facturacion: 'monthly',
          inicio_periodo: new Date().toISOString().split('T')[0],
          fin_periodo: new Date(new Date().setMonth(new Date().getMonth() + meses)).toISOString().split('T')[0],
          estado: 'pendiente',
          metodo_pago: metodoPago,
          meses_pagados: meses,
          notas: `Pago confirmado por cliente — Plan: ${plan.nombre}, ${meses} mes(es), Total: $${totalFinal.toFixed(2)}`,
        }]);
      }
      setEnviado(true);
    } catch (err) {
      setError('Hubo un error al registrar el pago. Contáctanos por WhatsApp.');
    } finally {
      setEnviando(false);
    }
  };

  const iconData = PLAN_ICONS[planNombre] || PLAN_ICONS['Negocios'];

  // ── Pantalla de éxito ────────────────────────────────────────────────────
  if (enviado) {
    return (
      <div className="pt-24 pb-16 px-6 min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="h-20 w-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-2">¡Pago notificado!</p>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-[var(--text-primary)]">
              Gracias por tu pago
            </h2>
          </div>
          <div className="p-5 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-left space-y-2">
            <p className="text-xs font-bold text-[var(--text-primary)]">¿Qué pasa ahora?</p>
            <ul className="space-y-2">
              {[
                'Envía tu comprobante de pago por WhatsApp',
                'Nuestro equipo verificará el pago',
                'Tu plan será activado en menos de 24h hábiles',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[9px] font-black text-[var(--color-primary)] bg-[var(--color-primary-dim)] w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-xs text-[var(--text-muted)]">{step}</span>
                </li>
              ))}
            </ul>
          </div>
          <a
            href={`https://wa.me/593982650929?text=Hola%2C%20realicé%20el%20pago%20del%20Plan%20${encodeURIComponent(planNombre)}%20por%20$${totalFinal.toFixed(2)}.%20Adjunto%20mi%20comprobante.`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-guambra-primary w-full flex items-center justify-center gap-2 !py-4"
          >
            <MessageCircle className="h-4 w-4" />
            Enviar comprobante por WhatsApp
          </a>
          <Link to="/precios" className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            ← Volver a planes
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  // ── Página de pago ───────────────────────────────────────────────────────
  return (
    <div className="pt-24 pb-16 px-6 min-h-screen text-[var(--text-primary)]">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* Back */}
        <Link
          to="/precios"
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a planes
        </Link>

        {/* Header */}
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase tracking-[0.45em] text-[var(--color-primary)]">Checkout</p>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-[var(--text-primary)]">
            Plan <span className="text-gradient-guambra italic">{plan?.nombre}</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ── Col izquierda: resumen + duración ─────────────────────────── */}
          <div className="lg:col-span-3 space-y-6">

            {/* Resumen del plan */}
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface-2)] p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 ${iconData.bg}`}>
                    <iconData.Icon className={`h-5 w-5 ${iconData.color}`} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-primary)]">Plan seleccionado</p>
                    <h3 className="text-xl font-black uppercase tracking-tighter text-[var(--text-primary)]">{plan?.nombre}</h3>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-3xl font-black tracking-tighter text-[var(--text-primary)]">${plan?.precio_mensual}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">/ mes</p>
                </div>
              </div>
            </div>

            {/* Selector de duración */}
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface-2)] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--color-primary)]" />
                <p className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)]">
                  ¿Cuántos meses deseas contratar?
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {OPCIONES_MESES.map((op) => (
                  <button
                    key={op.value}
                    onClick={() => setMeses(op.value)}
                    className={`relative p-4 rounded-xl border text-center transition-all ${
                      meses === op.value
                        ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary)] shadow-[0_0_20px_var(--color-primary-glow)]'
                        : 'bg-[var(--bg-surface-3)] border-[var(--border-soft)] hover:border-[var(--color-primary-dim)]'
                    }`}
                  >
                    <p className={`text-base font-black tracking-tighter ${meses === op.value ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {op.label}
                    </p>
                    {op.badge && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-primary)]">{op.badge}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Desglose de precio */}
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface-2)] p-6 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Calculator className="h-4 w-4 text-[var(--color-primary)]" />
                <p className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)]">Desglose</p>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">${plan?.precio_mensual} × {meses} mes{meses > 1 ? 'es' : ''}</span>
                <span className="font-bold text-[var(--text-primary)]">${precioBase.toFixed(2)}</span>
              </div>
              {descuento > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-400">Descuento ({(descuento * 100).toFixed(0)}%)</span>
                  <span className="font-bold text-emerald-400">−${montoDescuento.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-[var(--border-soft)] pt-3 flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)]">Total a pagar</span>
                <span className="text-2xl font-black tracking-tighter text-[var(--text-primary)]">${totalFinal.toFixed(2)}</span>
              </div>
            </div>

            {/* Instrucciones */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-300 mb-1">Instrucciones de pago</p>
                  <ol className="space-y-1.5">
                    {[
                      'Elige tu método de pago preferido.',
                      'Realiza la transferencia por el total indicado.',
                      'Haz clic en "Ya realicé el pago".',
                      'Envía el comprobante por WhatsApp para agilizar la activación.',
                    ].map((step, i) => (
                      <li key={i} className="text-[11px] text-[var(--text-muted)] flex items-start gap-2">
                        <span className="font-black text-emerald-400 shrink-0">{i + 1}.</span> {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* ── Col derecha: métodos de pago + botón ──────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)]">
              Método de pago
            </p>

            {/* Tabs selección método */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'banco_pichincha', label: 'Pichincha' },
                { key: 'deuna', label: 'DeUna' },
                { key: 'bitcoin', label: 'Bitcoin' },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMetodoPago(m.key)}
                  className={`py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                    metodoPago === m.key
                      ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'bg-[var(--bg-surface-3)] border-[var(--border-soft)] text-[var(--text-muted)] hover:border-[var(--color-primary-dim)]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Contenido del método */}
            {metodoPago === 'banco_pichincha' && <MetodoPichincha />}
            {metodoPago === 'deuna' && <MetodoDeuna />}
            {metodoPago === 'bitcoin' && <MetodoBitcoin />}

            {/* Error */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400 font-bold">{error}</p>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleConfirmar}
              disabled={enviando}
              className="btn-guambra-primary w-full flex items-center justify-center gap-2 !py-4 !text-sm"
            >
              {enviando
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Registrando...</>
                : <><CheckCircle2 className="h-4 w-4" /> Ya realicé el pago</>
              }
            </button>

            <p className="text-[9px] text-[var(--text-muted)] text-center leading-relaxed">
              Al confirmar declaras que ya realizaste la transferencia por ${totalFinal.toFixed(2)}. Tu plan será activado dentro de las 24h hábiles siguientes.
            </p>

            {/* WhatsApp directo */}
            <a
              href={`https://wa.me/593982650929?text=Hola%2C%20quiero%20pagar%20el%20Plan%20${encodeURIComponent(planNombre)}%20por%20$${totalFinal.toFixed(2)}%20(${meses}%20mes).`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface-3)] text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--color-primary-dim)] transition-all"
            >
              <MessageCircle className="h-4 w-4" /> Consultar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PagoPublico;
