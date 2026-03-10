import { useState, useEffect } from 'react';
import {
  ArrowRight, ShoppingBag, ShieldCheck, Zap,
  PartyPopper, Shirt, Sparkles, Scissors,
  Calendar, Globe, Tag, FileText, Star
} from 'lucide-react';
import { Link } from 'react-router-dom';

// --- DATOS DE TESTIMONIOS ---
const TESTIMONIALS = [
  { initials: 'RL', name: 'Rosa López',      biz: 'Trajes Andino',        city: 'Otavalo',   stars: 5, quote: 'El calendario semaforizado eliminó las dobles reservas. Ahorramos horas de trabajo cada semana.' },
  { initials: 'CM', name: 'Carlos Moreno',   biz: 'Disfraces Carnaval',   city: 'Ambato',    stars: 5, quote: 'La tienda online integrada triplicó nuestros pedidos en el primer mes de uso. Increíble.' },
  { initials: 'LV', name: 'Lucía Vargas',    biz: 'Novias Elegance',      city: 'Quito',     stars: 5, quote: 'Los contratos digitales nos quitaron horas de papeleo. Ya no perdemos ni un acuerdo con clientes.' },
  { initials: 'AS', name: 'Andrés Salcedo',  biz: 'Trajes Formales QU',   city: 'Quito',     stars: 5, quote: 'Nuestros clientes reservan desde el celular viendo disponibilidad real. Cambió todo.' },
  { initials: 'ME', name: 'Mariana Espinoza',biz: 'Party Disfraces',      city: 'Guayaquil', stars: 5, quote: 'El control de stock por piezas es exactamente lo que necesitábamos. Cero extravíos.' },
  { initials: 'JT', name: 'Jorge Toapanta',  biz: 'Trajes Típicos Sierra', city: 'Riobamba', stars: 5, quote: 'Pasamos de libretas a contratos digitales en una semana. El soporte técnico es excelente.' },
  { initials: 'VP', name: 'Verónica Pinto',  biz: 'Vestidos Gala',        city: 'Cuenca',    stars: 5, quote: 'El semáforo de pedidos es genial. De un vistazo sé qué está despachado y qué pendiente.' },
  { initials: 'HC', name: 'Héctor Cárdenas', biz: 'Uniformes Ibarra',     city: 'Ibarra',    stars: 5, quote: 'La sincronización directa con la tienda online cambió por completo nuestra operación.' },
  { initials: 'SR', name: 'Sofía Rodríguez', biz: 'Fashion Rent EC',      city: 'Loja',      stars: 5, quote: 'El historial de clientes con tallas guardadas nos permite atender mucho más rápido.' },
  { initials: 'PM', name: 'Patricio Mora',   biz: 'Disfraz Total',        city: 'Machala',   stars: 5, quote: 'Desde que usamos MisTrajes las devoluciones problemáticas bajaron un 80%. Lo recomiendo.' },
];

// --- COMPONENTE CARRUSEL ---
const TestimonialsCarousel = () => {
  const doubled = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <div
      className="overflow-hidden"
      style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}
    >
      <div className="flex gap-5 animate-marquee w-max py-2">
        {doubled.map((t, i) => (
          <div
            key={i}
            className="w-72 flex-shrink-0 bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl p-5 space-y-3 hover:border-[var(--color-primary-dim)] transition-colors"
          >
            {/* Estrellas */}
            <div className="flex gap-0.5">
              {Array.from({ length: t.stars }).map((_, s) => (
                <Star key={s} className="h-3 w-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
            {/* Cita */}
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic line-clamp-3">
              "{t.quote}"
            </p>
            {/* Autor */}
            <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-soft)]">
              <div className="h-8 w-8 rounded-full bg-[var(--color-primary-dim)] border border-[var(--color-primary-dim)] flex items-center justify-center text-[9px] font-black text-[var(--text-primary)] uppercase flex-shrink-0">
                {t.initials}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-primary)] leading-none">{t.name}</p>
                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest mt-0.5">{t.biz} · {t.city}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- HERO VISUAL — Animación CSS pura (sin JS) ---
const HeroVisual = () => {
  const calGrid = [
    [0, 1, 2, 3, 0],
    [3, 0, 1, 2, 1],
    [1, 2, 3, 0, 2],
  ];
  const calCls = {
    0: 'bg-emerald-400/80',
    1: 'bg-amber-400/80',
    2: 'bg-red-400/80',
    3: 'bg-gray-400/55',
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">

      {/* ── Glows de fondo ── */}
      <div className="absolute w-80 h-80 bg-[var(--color-primary-dim)] blur-[130px] rounded-full pointer-events-none hero-glow-pulse" />
      <div className="absolute w-52 h-52 bg-[var(--color-accent-dim)] blur-[90px] rounded-full pointer-events-none hero-glow-pulse"
           style={{ animationDelay: '-2.5s', top: '20%', right: '10%' }} />

      {/* ── Anillos orbitales giratorios ── */}
      <div className="absolute w-[440px] h-[440px] border border-dashed border-[var(--border-soft)] rounded-full pointer-events-none hero-spin-cw opacity-35" />
      <div className="absolute w-[320px] h-[320px] border border-[var(--color-primary-dim)] rounded-full pointer-events-none hero-spin-ccw opacity-55" />
      <div className="absolute w-[210px] h-[210px] border border-[var(--color-primary-dim)] rounded-full pointer-events-none hero-spin-cw opacity-30"
           style={{ animationDuration: '10s' }} />

      {/* ── Punto orbital que recorre el anillo exterior ── */}
      <div className="absolute w-[440px] h-[440px] pointer-events-none hero-spin-cw opacity-80" style={{ animationDuration: '8s' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary)]" />
      </div>
      <div className="absolute w-[320px] h-[320px] pointer-events-none hero-spin-ccw opacity-70" style={{ animationDuration: '12s' }}>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 h-2 w-2 rounded-full bg-[var(--color-accent)] shadow-[0_0_6px_var(--color-accent)]" />
      </div>

      {/* ── TARJETA CENTRAL: Calendario semaforizado ── */}
      <div className="relative z-20 hero-tilt">
        <div className="bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl p-5 w-56 shadow-2xl shadow-black/70 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-[var(--border-soft)]">
            <div className="h-6 w-6 rounded-lg bg-[var(--color-primary-dim)] flex items-center justify-center">
              <Calendar className="h-3 w-3 text-[var(--color-primary)]" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Julio 2026</span>
          </div>
          <div className="space-y-1.5">
            {calGrid.map((row, ri) => (
              <div key={ri} className="flex gap-1.5">
                {row.map((v, ci) => (
                  <div key={ci} className={`h-7 flex-1 rounded-lg ${calCls[v]}`} />
                ))}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-3 pt-2.5 border-t border-[var(--border-soft)]">
            {[
              ['bg-emerald-400', 'Pendiente'],
              ['bg-amber-400',   'Despachado'],
              ['bg-red-400',     'Problema'],
              ['bg-gray-400',    'Devuelto'],
            ].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1">
                <div className={`h-1.5 w-1.5 rounded-full ${c} flex-shrink-0`} />
                <span className="text-[6px] text-[var(--text-muted)] font-black uppercase">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BADGE: Nuevo pedido — arriba izquierda ── */}
      <div className="absolute z-30 top-[11%] left-[2%] hero-float-1"
           style={{ animationDelay: '-1.2s' }}>
        <div className="bg-[var(--bg-surface-2)] border border-emerald-500/40 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 shadow-lg shadow-emerald-500/10">
          <div className="h-6 w-6 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase leading-none text-emerald-400 tracking-wide">Nuevo pedido</p>
            <p className="text-[8px] text-[var(--text-muted)] mt-0.5">Traje Típico · Talla M</p>
          </div>
        </div>
      </div>

      {/* ── CARD: Contrato — abajo izquierda ── */}
      <div className="absolute z-30 bottom-[12%] left-[0%] hero-float-3"
           style={{ animationDelay: '-2.8s' }}>
        <div className="bg-[var(--bg-surface-2)] border border-[var(--color-primary-dim)] rounded-2xl p-3.5 w-40 shadow-xl">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="h-5 w-5 rounded-lg bg-[var(--color-primary-dim)] flex items-center justify-center">
              <FileText className="h-2.5 w-2.5 text-[var(--color-primary)]" />
            </div>
            <span className="text-[8px] font-black uppercase text-[var(--color-primary)] tracking-wide">Contrato</span>
          </div>
          <div className="space-y-1.5">
            <div className="h-1.5 w-full bg-[var(--border-soft)] rounded" />
            <div className="h-1.5 w-4/5  bg-[var(--border-soft)] rounded" />
            <div className="h-1.5 w-3/5  bg-[var(--border-soft)] rounded" />
          </div>
          <div className="mt-3 h-6 w-full bg-[var(--color-primary-dim)] border border-[var(--color-primary-dim)] rounded-lg flex items-center justify-center">
            <span className="text-[7px] font-black text-[var(--color-primary)] uppercase">Generar PDF</span>
          </div>
        </div>
      </div>

      {/* ── BADGE: Tienda Online — arriba derecha ── */}
      <div className="absolute z-30 top-[17%] right-[2%] hero-float-2"
           style={{ animationDelay: '-0.4s' }}>
        <div className="bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl px-3.5 py-2.5 shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-lg bg-[var(--color-primary-dim)] flex items-center justify-center flex-shrink-0">
              <Globe className="h-3 w-3 text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase leading-none text-[var(--text-primary)] tracking-wide">Tienda Online</p>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[8px] text-emerald-400 font-bold">Sincronizada</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD: Métricas del día — abajo derecha ── */}
      <div className="absolute z-30 bottom-[16%] right-[0%] hero-float-1"
           style={{ animationDelay: '-3.5s' }}>
        <div className="bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl p-3.5 w-36 shadow-xl">
          <p className="text-[8px] font-black uppercase text-[var(--color-primary)] tracking-widest mb-2.5">Hoy</p>
          <div className="space-y-2">
            {[
              ['Pedidos',   '8',    'text-emerald-400'],
              ['Contratos', '3',    'text-[var(--color-primary)]'],
              ['Ingresos',  '$240', 'text-[var(--text-primary)]'],
            ].map(([label, val, cls]) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-[8px] text-[var(--text-muted)] uppercase">{label}</span>
                <span className={`text-sm font-black ${cls}`}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Partículas decorativas ── */}
      <div className="absolute z-10 h-2.5 w-2.5 rounded-full bg-[var(--color-accent)] opacity-70 pointer-events-none hero-float-2"
           style={{ top: '40%', right: '9%', animationDelay: '-1s' }} />
      <div className="absolute z-10 h-2 w-2 rounded-full bg-[var(--color-primary)] opacity-50 pointer-events-none hero-float-3"
           style={{ bottom: '38%', left: '11%', animationDelay: '-4s' }} />
      <div className="absolute z-10 h-1.5 w-1.5 rounded-full bg-emerald-400 opacity-60 pointer-events-none hero-float-1"
           style={{ top: '60%', right: '14%', animationDelay: '-2s' }} />
    </div>
  );
};

// --- MOCK COMPONENTS (UI VISUALS ONLY) ---

const MockCalendar = () => {
  const days = ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'];
  // 0=pendiente(verde), 1=despachado(amarillo), 2=devuelto con problemas(rojo), 3=devuelto ok(gris), null=vacío
  const weeks = [
    [null, null, 0, 0, 1, 2, 3],
    [0,    3,    1, 2, 0, 2, 1],
    [1,    0,    3, 0, 2, 1, 3],
    [0,    1,    2, 3, 0, 1, null],
  ];
  const colors = {
    0: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', dot: 'bg-emerald-400' },
    1: { bg: 'bg-amber-500/20',   border: 'border-amber-500/40',   dot: 'bg-amber-400'   },
    2: { bg: 'bg-red-500/20',     border: 'border-red-500/40',     dot: 'bg-red-400'     },
    3: { bg: 'bg-gray-500/20',    border: 'border-gray-500/40',    dot: 'bg-gray-400'    },
  };

  return (
    <div className="w-full h-full bg-[var(--bg-surface-2)] rounded-2xl border border-[var(--border-soft)] overflow-hidden shadow-2xl p-5 space-y-3 relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary-dim)] to-transparent pointer-events-none" />
      {/* Encabezado */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-soft)]">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
          <div className="h-2 w-20 bg-[var(--text-secondary)] opacity-30 rounded" />
        </div>
        <div className="flex gap-1">
          <div className="h-5 w-5 rounded bg-[var(--bg-surface-3)] border border-[var(--border-soft)]" />
          <div className="h-5 w-5 rounded bg-[var(--bg-surface-3)] border border-[var(--border-soft)]" />
        </div>
      </div>
      {/* Días */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(d => (
          <div key={d} className="text-center text-[8px] font-black uppercase text-[var(--text-muted)] py-0.5">{d}</div>
        ))}
      </div>
      {/* Grid semanas */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1">
          {week.map((status, di) => {
            if (status === null) return <div key={di} />;
            const c = colors[status];
            return (
              <div key={di} className={`aspect-square rounded-lg border ${c.bg} ${c.border} flex items-center justify-center`}>
                <div className={`h-1.5 w-1.5 rounded-full ${c.dot} animate-pulse`} />
              </div>
            );
          })}
        </div>
      ))}
      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-[var(--border-soft)]">
        {[
          { dot: 'bg-emerald-400', label: 'Pendiente'  },
          { dot: 'bg-amber-400',   label: 'Despachado' },
          { dot: 'bg-red-400',     label: 'Problema'   },
          { dot: 'bg-gray-400',    label: 'Devuelto'   },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 rounded-full ${l.dot}`} />
            <span className="text-[7px] font-black uppercase text-[var(--text-muted)]">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MockProducts = () => (
  <div className="w-full h-full bg-[var(--bg-surface-2)] rounded-2xl border border-[var(--border-soft)] overflow-hidden shadow-2xl relative p-5 space-y-4">
    <div className="flex justify-between items-center pb-3 border-b border-[var(--border-soft)]">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-[var(--color-primary)]" />
        <div className="h-2 w-16 bg-[var(--color-primary-dim)] rounded" />
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-primary-dim)] rounded-full border border-[var(--color-primary-dim)]">
        <Globe className="h-3 w-3 text-[var(--color-primary)]" />
        <div className="h-1.5 w-10 bg-[var(--color-primary)] opacity-60 rounded" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {[true, true, false, true].map((published, i) => (
        <div key={i} className="space-y-1.5 animate-in fade-in duration-1000" style={{ animationDelay: `${i * 0.2}s` }}>
          <div className="h-20 bg-[var(--bg-surface-3)] rounded-xl border border-[var(--border-soft)] overflow-hidden flex items-center justify-center relative">
            <Shirt className="h-7 w-7 text-[var(--text-muted)] opacity-20" />
            <div className={`absolute top-1.5 right-1.5 h-4 px-1.5 rounded-full flex items-center gap-1 ${
              published
                ? 'bg-emerald-500/20 border border-emerald-500/40'
                : 'bg-[var(--bg-surface-2)] border border-[var(--border-soft)]'
            }`}>
              <div className={`h-1 w-1 rounded-full ${published ? 'bg-emerald-400' : 'bg-[var(--text-muted)]'}`} />
              <span className={`text-[6px] font-black uppercase ${published ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                {published ? 'online' : 'borrador'}
              </span>
            </div>
          </div>
          <div className="h-1.5 w-3/4 bg-[var(--text-muted)] opacity-20 rounded" />
          <div className="h-1 w-1/2 bg-[var(--bg-surface-3)] rounded" />
        </div>
      ))}
    </div>
    {/* Barra de sincronización */}
    <div className="flex items-center gap-2 bg-[var(--bg-surface-3)] border border-[var(--border-soft)] rounded-xl p-3">
      <Globe className="h-3 w-3 text-[var(--color-primary)] flex-shrink-0" />
      <div className="h-1.5 flex-1 bg-[var(--border-soft)] rounded overflow-hidden">
        <div className="h-full w-2/3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded animate-pulse" />
      </div>
      <span className="text-[7px] font-black uppercase text-[var(--color-primary)]">Sync</span>
    </div>
  </div>
);

const MockContracts = () => (
  <div className="w-full h-full bg-[var(--bg-surface-2)] rounded-2xl border border-[var(--border-soft)] overflow-hidden shadow-2xl p-6 relative">
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-[var(--color-primary-dim)] flex items-center justify-center border border-[var(--color-primary-dim)]">
          <FileText className="h-5 w-5 text-[var(--color-primary)]" />
        </div>
        <div className="space-y-2">
          <div className="h-2 w-24 bg-[var(--text-secondary)] opacity-40 rounded" />
          <div className="h-1.5 w-16 bg-[var(--border-soft)] rounded" />
        </div>
      </div>
      <div className="p-4 bg-[var(--bg-surface-3)] border border-[var(--border-soft)] rounded-2xl space-y-4">
        <div className="flex justify-between">
          <div className="h-2 w-12 bg-[var(--text-muted)] opacity-30 rounded" />
          <div className="h-2 w-8 bg-[var(--text-muted)] opacity-30 rounded" />
        </div>
        <div className="h-px bg-[var(--border-soft)]" />
        <div className="space-y-2">
          {[['Cliente', 'María López'], ['Artículo', 'Traje Típico S'], ['Depósito', '$30.00']].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center">
              <div className="h-1.5 w-12 bg-[var(--border-soft)] rounded" />
              <div className="h-1.5 w-16 bg-[var(--color-primary-dim)] rounded" />
            </div>
          ))}
        </div>
        <div className="h-8 w-full bg-[var(--color-primary-dim)] border border-[var(--color-primary-dim)] rounded-lg flex items-center justify-center gap-2">
          <div className="h-1.5 w-1/3 bg-[var(--color-primary)] opacity-60 rounded" />
        </div>
      </div>
    </div>
    <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/20 to-transparent animate-pulse" />
  </div>
);

// --- MAIN LANDING COMPONENT ---

const Landing = () => {
  const words = ['Trajes', 'Disfraces', 'Vestidos', 'Uniformes', 'Moda'];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const businessTypes = [
    {
      name: 'Trajes Típicos',
      icon: Shirt,
      card:    'bg-blue-600   border-blue-400/30   hover:border-blue-300/60',
      iconBg:  'bg-white/15',
      iconClr: 'text-white',
      glow:    'from-blue-400/20 to-indigo-500/10',
      desc: 'Gestiona tu colección de trajes regionales y culturales con control total de piezas y disponibilidad.',
    },
    {
      name: 'Disfraces y Carnaval',
      icon: PartyPopper,
      card:    'bg-purple-600 border-purple-400/30 hover:border-purple-300/60',
      iconBg:  'bg-white/15',
      iconClr: 'text-white',
      glow:    'from-purple-400/20 to-pink-500/10',
      desc: 'Organiza miles de disfraces, accesorios y conjuntos para fiestas, eventos y carnavales.',
    },
    {
      name: 'Vestidos de Novia',
      icon: Sparkles,
      card:    'bg-rose-600   border-rose-400/30   hover:border-rose-300/60',
      iconBg:  'bg-white/15',
      iconClr: 'text-white',
      glow:    'from-rose-400/20 to-pink-500/10',
      desc: 'Administra tu colección nupcial con reservas anticipadas, pruebas de tela y contratos personalizados.',
    },
    {
      name: 'Trajes Formales',
      icon: Scissors,
      card:    'bg-amber-600  border-amber-400/30  hover:border-amber-300/60',
      iconBg:  'bg-white/15',
      iconClr: 'text-white',
      glow:    'from-amber-400/20 to-orange-500/10',
      desc: 'Controla tu stock de trajes ejecutivos, smoking y vestidos de gala para eventos corporativos.',
    },
  ];

  return (
    <div className="min-h-screen text-[var(--text-primary)] selection:bg-[var(--color-primary-dim)] relative">

      {/* ══════════════════════════════════════════
          HERO — Dos columnas iguales, primer pantallazo
          ══════════════════════════════════════════ */}
      <section className="relative h-screen pt-20 px-6 lg:px-16 flex items-center overflow-hidden">

        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* ── Columna izquierda: Contenido ── */}
          <div className="flex flex-col gap-5 lg:gap-6 text-center lg:text-left items-center lg:items-start">

            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[10px] font-black text-[var(--text-primary)] uppercase tracking-[0.35em] w-fit animate-in fade-in duration-700">
              <Zap className="h-3 w-3 text-[var(--color-primary)] animate-pulse" />
              Plataforma SaaS · Ecuador
            </div>

            {/* Heading */}
            <div>
              <p className="font-black text-xl md:text-2xl uppercase tracking-tight text-[var(--text-muted)] mb-1 animate-in slide-in-from-left duration-700">
                Control total para tu
              </p>
              <h1 className="font-black text-[clamp(2.8rem,7vw,4.5rem)] uppercase tracking-tighter leading-[0.9] text-[var(--text-primary)] animate-in slide-in-from-left duration-700" style={{ animationDelay: '0.1s' }}>
                Negocio de
                <span className="block relative h-[1.1em] overflow-hidden">
                  <span
                    key={words[index]}
                    className="absolute inset-0 text-gradient-guambra italic flex items-center justify-center lg:justify-start"
                    style={{ animation: 'revealWord 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards' }}
                  >
                    {words[index]}
                  </span>
                </span>
              </h1>
            </div>

            {/* Descripción */}
            <p className="text-base lg:text-lg text-[var(--text-secondary)] leading-relaxed max-w-md opacity-70 animate-in fade-in duration-700" style={{ animationDelay: '0.25s' }}>
              Calendario semaforizado, tienda online integrada y contratos digitales — todo en una sola plataforma.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 animate-in fade-in duration-700" style={{ animationDelay: '0.4s' }}>
              <Link
                to="/registro-negocio"
                className="btn-guambra-primary !text-xs !py-4 !px-10 shadow-[0_0_40px_var(--color-primary-dim)] hover:scale-105 transition-transform duration-300 w-fit"
              >
                Demo Gratis
              </Link>
              <Link
                to="/tutoriales"
                className="btn-guambra-secondary !text-xs !py-4 !px-10 transition-colors w-fit"
              >
                Ver Guías
              </Link>
            </div>

            {/* Micro-badges de confianza */}
            <div className="flex items-center gap-5 flex-wrap animate-in fade-in duration-700" style={{ animationDelay: '0.55s' }}>
              {[
                { icon: ShieldCheck, label: 'SSL 256-bit'      },
                { icon: Zap,         label: '30 días gratis'   },
                { icon: Globe,       label: 'Hecho en Ecuador' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">
                  <Icon className="h-2.5 w-2.5" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* ── Columna derecha: Visual animado ── */}
          <div className="hidden lg:block relative" style={{ height: 'min(520px, calc(100vh - 180px))' }}>
            <HeroVisual />
          </div>
        </div>

        {/* Glow de fondo */}
        <div className="absolute top-1/2 right-1/3 -translate-y-1/2 w-[700px] h-[700px] bg-[var(--color-primary-dim)] blur-[160px] rounded-full -z-10 opacity-20 pointer-events-none" />
      </section>

      {/* Sectores Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--color-primary)]">Versatilidad</h2>
          <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-[var(--text-primary)]">Diseñado para cada <span className="italic">Sector</span></h3>
          <p className="text-sm text-[var(--text-muted)] max-w-xl mx-auto font-normal">
            Pensado específicamente para negocios que alquilan ropa en Ecuador. Sin importar tu especialidad, MisTrajes se adapta.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {businessTypes.map((type, i) => (
            <div
              key={i}
              className={`${type.card} border rounded-2xl p-5 group cursor-pointer transition-all duration-300 relative overflow-hidden`}
            >
              {/* Glow de fondo individual */}
              <div className={`absolute inset-0 bg-gradient-to-br ${type.glow} pointer-events-none transition-opacity duration-300 opacity-60 group-hover:opacity-100`} />

              {/* Layout horizontal: icono + texto */}
              <div className="relative flex items-start gap-4">
                <div className={`h-10 w-10 rounded-xl ${type.iconBg} flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110`}>
                  <type.icon className={`h-5 w-5 ${type.iconClr}`} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black uppercase tracking-wider mb-2 text-white">{type.name}</h4>
                  <p className="text-[11px] text-white/65 leading-relaxed">{type.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature 1: Calendario Semaforizado */}
      <section className="py-40 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10 order-2 lg:order-1">
            <div className="h-14 w-14 rounded-2xl bg-[var(--color-primary-dim)] border border-[var(--color-primary-dim)] flex items-center justify-center">
              <Calendar className="h-7 w-7 text-[var(--color-primary)]" />
            </div>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] text-[var(--text-primary)]">
              Calendario <span className="text-gradient-guambra">Semaforizado</span>
            </h2>
            <p className="text-lg md:text-xl text-[var(--text-secondary)] opacity-50 leading-relaxed font-normal max-w-xl">
              Visualiza de un vistazo qué días están libres, con reservas activas o completamente ocupados. Cero confusiones, cero dobles reservas.
            </p>
            <ul className="space-y-4 pt-4">
              {[
                { color: 'bg-emerald-400', label: 'Verde — pedidos pendientes de despacho' },
                { color: 'bg-amber-400',   label: 'Amarillo — pedido despachado al cliente' },
                { color: 'bg-red-400',     label: 'Rojo — devuelto con problemas' },
                { color: 'bg-gray-400',    label: 'Gris — devuelto sin problemas' },
              ].map(item => (
                <li key={item.label} className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]">
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${item.color}`} />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative order-1 lg:order-2">
            <div className="relative aspect-square max-w-[500px] mx-auto">
              <MockCalendar />
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[var(--color-primary-dim)] blur-[60px] rounded-full" />
              <div className="absolute top-20 -left-10 h-32 w-32 glass-card p-6 flex flex-col justify-center gap-2 transform -rotate-6 animate-bounce transition-all duration-[3s]">
                <div className="h-1.5 w-full bg-emerald-500/30 rounded" />
                <div className="h-1.5 w-2/3 bg-amber-500/30 rounded" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: Productos + Tienda Online */}
      <section className="py-40 px-6 bg-[var(--bg-surface)] border-y border-[var(--border-soft)] relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="relative">
            <div className="relative aspect-square max-w-[500px] mx-auto group">
              <MockProducts />
              <div className="absolute inset-0 border-[20px] border-[var(--color-primary-dim)] rounded-full scale-110 -z-10 group-hover:scale-125 transition-transform duration-[2s]" />
            </div>
          </div>
          <div className="space-y-10">
            <div className="h-14 w-14 rounded-2xl bg-[var(--color-primary-dim)] border border-[var(--color-primary-dim)] flex items-center justify-center">
              <ShoppingBag className="h-7 w-7 text-[var(--color-primary)]" />
            </div>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] text-[var(--text-primary)]">
              Tu Catálogo en la <span className="italic">Vitrina Digital</span>
            </h2>
            <p className="text-lg md:text-xl text-[var(--text-secondary)] opacity-50 leading-relaxed font-normal max-w-xl">
              Crea tus productos una sola vez y publícalos directamente en tu tienda online. Tus clientes verán disponibilidad en tiempo real y podrán apartar desde cualquier dispositivo.
            </p>
            <ul className="space-y-4 pt-4">
              {[
                'Fotos, tallas y precios sincronizados al instante',
                'Reservas directas desde tu tienda online',
                'Stock actualizado automáticamente al cerrar un contrato',
              ].map(item => (
                <li key={item} className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]">
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-8 pt-4">
              <div>
                <span className="text-3xl font-black text-[var(--color-primary)] block mb-1">100%</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Sincronización</span>
              </div>
              <div>
                <span className="text-3xl font-black text-[var(--color-primary)] block mb-1">0.5s</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Actualización</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: Contratos */}
      <section className="py-40 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10 order-2 lg:order-1">
            <div className="h-14 w-14 rounded-2xl bg-[var(--color-primary-dim)] border border-[var(--color-primary-dim)] flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-[var(--color-primary)]" />
            </div>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] text-[var(--text-primary)]">
              Contratos <span className="text-gradient-guambra">Blindados</span>
            </h2>
            <p className="text-lg md:text-xl text-[var(--text-secondary)] opacity-50 leading-relaxed font-normal max-w-xl">
              Genera contratos de alquiler profesionales en segundos. Incluye datos del cliente, prendas, depósitos y fechas de entrega. Sin papeleo, sin errores.
            </p>
            <ul className="space-y-4 pt-4">
              {[
                'Generación automática con datos del cliente',
                'Control de depósitos y fechas de devolución',
                'Historial completo por cliente y por prenda',
              ].map(item => (
                <li key={item} className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]">
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/registro-negocio" className="btn-guambra-secondary group transition-all inline-flex items-center">
              Probar Generador <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="relative order-1 lg:order-2">
            <div className="relative aspect-square max-w-[500px] mx-auto">
              <MockContracts />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[var(--color-primary-dim)] blur-[80px] rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Carousel */}
      <section className="py-24">
        <div className="text-center mb-14 space-y-3 px-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--color-primary)]">Testimonios</h2>
          <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-[var(--text-primary)]">
            Lo que dicen nuestros <span className="italic text-gradient-guambra">Clientes</span>
          </h3>
        </div>
        <TestimonialsCarousel />
      </section>

      {/* Final CTA */}
      <section className="py-40 px-6">
        <div className="max-w-5xl mx-auto relative overflow-hidden rounded-[4rem] p-16 md:p-32 text-center border border-[var(--border-soft)] bg-[var(--bg-surface-2)]">
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-primary-dim)] to-transparent pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-[var(--color-primary-dim)] blur-[100px] rounded-full" />
          <div className="relative z-10 space-y-10">
            <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none text-[var(--text-primary)]">
              Inicia tu propia <br /> <span className="text-gradient-guambra italic">Revolución</span>
            </h2>
            <p className="text-lg md:text-xl text-[var(--text-secondary)] opacity-50 max-w-xl mx-auto font-normal">
              Únete hoy y obtén 30 días de acceso ilimitado a todas las funciones PRO. Sin compromiso.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link to="/registro-negocio" className="btn-guambra-primary !px-20 !py-6 !text-sm flex items-center gap-3">
                Probar Demo Gratis <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
            <div className="pt-10 flex items-center justify-center gap-8 opacity-30">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]"><ShieldCheck className="h-3 w-3" /> SSL 256-bit</div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]"><Zap className="h-3 w-3" /> Alta Disponibilidad</div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Landing;
