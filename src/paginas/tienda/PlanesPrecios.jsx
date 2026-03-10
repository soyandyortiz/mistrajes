import { Link } from 'react-router-dom';
import {
  Check, X, Zap, ArrowRight, ShieldCheck, HeadphonesIcon, Infinity, Star,
  Crown, Rocket,
} from 'lucide-react';

// ── Datos de planes (sincronizados con el SQL insertado en Supabase) ──────────
const PLANES = [
  {
    slug: 'Emprendedores',
    nombre: 'Emprendedores',
    precio: 25,
    descripcion: 'Perfecto para comenzar tu negocio de alquiler con todas las herramientas esenciales.',
    recomendado: false,
    icon: Zap,
    colorIcon: 'text-blue-400',
    colorIconBg: 'bg-blue-500/10 border-blue-500/20',
    colorBadge: '',
    highlights: ['25 contratos / mes', '25 productos', '25 clientes'],
  },
  {
    slug: 'Negocios',
    nombre: 'Negocios',
    precio: 50,
    descripcion: 'Para negocios en crecimiento que necesitan más capacidad, empleados y proformas.',
    recomendado: true,
    icon: Crown,
    colorIcon: 'text-[var(--color-primary)]',
    colorIconBg: 'bg-[var(--color-primary-dim)] border-[var(--color-primary-dim)]',
    colorBadge: 'text-[var(--color-primary)]',
    highlights: ['50 contratos / mes', '75 productos', 'Hasta 4 empleados'],
  },
  {
    slug: 'Empresarial',
    nombre: 'Empresarial',
    precio: 75,
    descripcion: 'Para empresas consolidadas que operan con múltiples sucursales y equipos.',
    recomendado: false,
    icon: Rocket,
    colorIcon: 'text-violet-400',
    colorIconBg: 'bg-violet-500/10 border-violet-500/20',
    colorBadge: '',
    highlights: ['Contratos ilimitados', 'Productos ilimitados', 'Hasta 3 sucursales'],
  },
];

// ── Tabla comparativa ─────────────────────────────────────────────────────────
// Valores: true=✓  false=✗  string=texto  'inf'=∞  'adv'=badge especial
const FEATURES = [
  { label: 'Dashboard',             cat: 'General',    vals: [true, true, 'adv'] },
  { label: 'Calendario de reservas',cat: 'General',    vals: [true, true, true] },
  { label: 'Tienda online',          cat: 'General',    vals: [true, true, true] },
  { label: 'Pedidos online',         cat: 'General',    vals: [true, true, true] },
  { label: 'Contratos de alquiler',  cat: 'Operaciones',vals: ['25', '50 / mes', 'inf'] },
  { label: 'Trajes / Productos',     cat: 'Inventario', vals: ['25', '75', 'inf'] },
  { label: 'Piezas / Elementos',     cat: 'Inventario', vals: ['250', '750', 'inf'] },
  { label: 'Categorías',             cat: 'Inventario', vals: ['inf', 'inf', 'inf'] },
  { label: 'Clientes',               cat: 'Clientes',   vals: ['25', '1.000', 'inf'] },
  { label: 'Empleados',              cat: 'Equipo',     vals: [false, 'Hasta 4', 'Hasta 10'] },
  { label: 'Proveedores',            cat: 'Finanzas',   vals: [true, true, true] },
  { label: 'Ingresos',               cat: 'Finanzas',   vals: [true, true, true] },
  { label: 'Egresos',                cat: 'Finanzas',   vals: [true, true, true] },
  { label: 'Caja',                   cat: 'Finanzas',   vals: ['1', '1', '1 / sucursal'] },
  { label: 'Comprobantes',           cat: 'Finanzas',   vals: [true, true, true] },
  { label: 'Generación de proformas',cat: 'Finanzas',   vals: [false, true, true] },
  { label: 'Sucursales',             cat: 'Escala',     vals: [false, false, 'Hasta 3'] },
  { label: 'Soporte técnico',        cat: 'Soporte',    vals: ['Estándar', 'Prioritario', 'Prioritario'] },
];

// ── Render de celda de tabla ──────────────────────────────────────────────────
const CeldaValor = ({ val, recomendado }) => {
  if (val === true)
    return <Check className={`h-4 w-4 mx-auto ${recomendado ? 'text-[var(--color-primary)]' : 'text-emerald-400'}`} />;
  if (val === false)
    return <X className="h-4 w-4 mx-auto text-[var(--text-muted)] opacity-40" />;
  if (val === 'inf')
    return <Infinity className={`h-4 w-4 mx-auto ${recomendado ? 'text-[var(--color-primary)]' : 'text-[var(--text-secondary)]'}`} />;
  if (val === 'adv')
    return (
      <span className="text-[9px] font-black uppercase tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
        Avanzado
      </span>
    );
  return (
    <span className={`text-xs font-bold ${recomendado ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
      {val}
    </span>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────
const PlanesPrecios = () => {
  const categories = [...new Set(FEATURES.map(f => f.cat))];

  return (
    <div className="min-h-screen pt-20 pb-24 text-[var(--text-primary)]">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto space-y-5">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--color-primary)]">
            Planes &amp; Precios
          </p>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none text-[var(--text-primary)]">
            El plan <span className="text-gradient-guambra italic">perfecto</span><br />para tu negocio
          </h1>
          <p className="text-base text-[var(--text-secondary)] opacity-70 max-w-xl mx-auto leading-relaxed">
            Sin costos ocultos. Sin contratos forzosos. Cancela cuando quieras.
          </p>
          <div className="flex items-center justify-center gap-6 pt-2 opacity-50">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              <ShieldCheck className="h-3.5 w-3.5" /> SSL Seguro
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              <Zap className="h-3.5 w-3.5" /> Alta disponibilidad
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              <HeadphonesIcon className="h-3.5 w-3.5" /> Soporte incluido
            </div>
          </div>
        </div>
      </section>

      {/* ── Tabla comparativa ────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--color-primary)]">
              Comparativa completa
            </p>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-[var(--text-primary)]">
              Todas las <span className="text-gradient-guambra italic">funcionalidades</span>
            </h2>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--border-soft)]">
            <table className="w-full text-sm border-collapse">
              {/* Cabecera */}
              <thead>
                <tr className="bg-[var(--bg-surface-3)]">
                  <th className="text-left px-5 py-4 text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] w-[40%]">
                    Funcionalidad
                  </th>
                  {PLANES.map((plan) => (
                    <th
                      key={plan.slug}
                      className={`px-4 py-4 text-center w-[20%] ${plan.recomendado ? 'bg-[var(--color-primary-dim)]' : ''}`}
                    >
                      <div className="space-y-1">
                        <p className={`text-[10px] font-black uppercase tracking-widest ${plan.recomendado ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]'}`}>
                          {plan.nombre}
                        </p>
                        <p className={`text-lg font-black tracking-tighter ${plan.recomendado ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                          ${plan.precio}<span className="text-[10px] font-bold">/mes</span>
                        </p>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {categories.map((cat) => {
                  const featuresDeCat = FEATURES.filter(f => f.cat === cat);
                  return (
                    <>
                      {/* Separador de categoría */}
                      <tr key={`cat-${cat}`} className="bg-[var(--bg-surface-3)]/50">
                        <td colSpan={4} className="px-5 py-2">
                          <span className="text-[8px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)] opacity-70">{cat}</span>
                        </td>
                      </tr>

                      {featuresDeCat.map((feat, fi) => (
                        <tr
                          key={feat.label}
                          className={`border-t border-[var(--border-soft)] transition-colors hover:bg-[var(--bg-surface-3)]/30 ${fi === featuresDeCat.length - 1 ? '' : ''}`}
                        >
                          <td className="px-5 py-3.5 text-xs text-[var(--text-secondary)] font-medium">
                            {feat.label}
                          </td>
                          {feat.vals.map((val, pi) => (
                            <td
                              key={pi}
                              className={`px-4 py-3.5 text-center ${PLANES[pi].recomendado ? 'bg-[var(--color-primary-dim)]/30' : ''}`}
                            >
                              <CeldaValor val={val} recomendado={PLANES[pi].recomendado} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  );
                })}

                {/* Fila de CTA al final de la tabla */}
                <tr className="border-t border-[var(--border-soft)] bg-[var(--bg-surface-3)]">
                  <td className="px-5 py-5" />
                  {PLANES.map((plan) => (
                    <td
                      key={plan.slug}
                      className={`px-4 py-5 text-center ${plan.recomendado ? 'bg-[var(--color-primary-dim)]/30' : ''}`}
                    >
                      <Link
                        to={`/pago-plan?plan=${encodeURIComponent(plan.slug)}`}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          plan.recomendado
                            ? 'btn-guambra-primary'
                            : 'border border-[var(--border-soft)] text-[var(--text-muted)] hover:border-[var(--color-primary-dim)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-dim)]'
                        }`}
                      >
                        Adquirir <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── CTA final ─────────────────────────────────────────────────────── */}
      <section className="px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface-2)]">
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary-dim)] via-transparent to-transparent pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-[300px] h-[300px] bg-[var(--color-primary-dim)] blur-[80px] rounded-full" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 px-8 md:px-12 py-10">
              <div className="space-y-2 text-center md:text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)]">¿Tienes dudas?</p>
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none text-[var(--text-primary)]">
                  Habla con <span className="text-gradient-guambra italic">nosotros</span>
                </h2>
                <p className="text-sm text-[var(--text-secondary)] opacity-60 max-w-sm font-normal">
                  Nuestro equipo te ayuda a elegir el plan ideal para tu negocio.
                </p>
              </div>
              <a
                href="https://wa.me/593982650929?text=Hola%2C%20quiero%20información%20sobre%20los%20planes%20de%20MisTrajes."
                target="_blank"
                rel="noopener noreferrer"
                className="btn-guambra-primary !px-10 !py-4 !text-sm flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                Consultar por WhatsApp <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default PlanesPrecios;
