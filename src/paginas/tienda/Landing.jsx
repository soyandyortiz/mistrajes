import { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, Store, ShoppingBag, ShieldCheck, Zap, 
  Utensils, PartyPopper, Shirt, Scissors, Briefcase, 
  ChevronRight, Search, Plus, Calendar, DollarSign
} from 'lucide-react';
import { Link } from 'react-router-dom';

// --- MOCK COMPONENTS (UI VISUALS ONLY) ---

const MockDashboard = () => (
  <div className="w-full h-full bg-[var(--bg-surface-2)] rounded-2xl border border-[var(--border-soft)] overflow-hidden shadow-2xl relative group">
    <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary-dim)] to-transparent pointer-events-none" />
    <div className="h-10 border-b border-[var(--border-soft)] bg-[var(--bg-surface-2)] flex items-center px-4 gap-2">
      <div className="h-2 w-2 rounded-full bg-red-500/50" />
      <div className="h-2 w-2 rounded-full bg-amber-500/50" />
      <div className="h-2 w-2 rounded-full bg-green-500/50" />
    </div>
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map(i => (
          <div key={i} className="h-16 bg-[var(--bg-surface-3)] rounded-xl border border-[var(--border-soft)] p-3 space-y-2">
            <div className="h-1.5 w-1/2 bg-[var(--border-soft)] rounded" />
            <div className="h-3 w-3/4 bg-[var(--color-primary-dim)] rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-2 w-1/4 bg-[var(--border-soft)] rounded" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex justify-between items-center p-2 bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-lg">
              <div className="flex gap-2 items-center">
                <div className="h-6 w-6 rounded-md bg-[var(--bg-surface-3)]" />
                <div className="h-1.5 w-16 bg-[var(--border-soft)] rounded" />
              </div>
              <div className="h-1.5 w-8 bg-[var(--color-primary-dim)] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
    {/* Overlay Floating Element */}
    <div className="absolute bottom-4 right-4 bg-[var(--color-primary)] p-3 rounded-xl shadow-xl transform transition-transform group-hover:scale-110 duration-500">
      <Plus className="h-4 w-4 text-white" />
    </div>
  </div>
);

const MockInventory = () => (
  <div className="w-full h-full bg-[var(--bg-surface-2)] rounded-2xl border border-[var(--border-soft)] overflow-hidden shadow-2xl relative p-6 space-y-6">
    <div className="flex justify-between items-center pb-4 border-b border-[var(--border-soft)]">
      <div className="flex gap-2">
        <div className="h-2 w-8 bg-[var(--color-primary-dim)] rounded" />
        <div className="h-2 w-8 bg-[var(--border-soft)] rounded" />
      </div>
      <Search className="h-3 w-3 text-[var(--text-muted)]" />
    </div>
    <div className="grid grid-cols-2 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="space-y-2 animate-in fade-in duration-1000" style={{ animationDelay: `${i * 0.2}s` }}>
          <div className="h-24 bg-[var(--bg-surface-3)] rounded-xl border border-[var(--border-soft)] overflow-hidden flex items-center justify-center relative">
             <Shirt className="h-8 w-8 text-[var(--text-muted)] opacity-20" />
             <div className="absolute bottom-2 right-2 h-4 w-8 bg-green-500/20 rounded-md border border-green-500/30 flex items-center justify-center">
                <div className="h-1 w-4 bg-green-500/50 rounded-full" />
             </div>
          </div>
          <div className="h-2 w-3/4 bg-[var(--text-muted)] opacity-20 rounded" />
          <div className="h-1.5 w-1/2 bg-[var(--bg-surface-3)] rounded" />
        </div>
      ))}
    </div>
  </div>
);

const MockContracts = () => (
  <div className="w-full h-full bg-[var(--bg-surface-2)] rounded-2xl border border-[var(--border-soft)] overflow-hidden shadow-2xl p-6 relative">
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-[var(--color-primary-dim)] flex items-center justify-center border border-[var(--color-primary-dim)]">
          <Calendar className="h-5 w-5 text-[var(--color-primary)]" />
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
          <div className="flex justify-between">
            <div className="h-1.5 w-20 bg-[var(--border-soft)] rounded" />
            <div className="h-1.5 w-10 bg-[var(--border-soft)] rounded" />
          </div>
          <div className="flex justify-between">
            <div className="h-1.5 w-16 bg-[var(--border-soft)] rounded" />
            <div className="h-1.5 w-10 bg-[var(--border-soft)] rounded" />
          </div>
        </div>
        <div className="h-8 w-full bg-[var(--color-primary-dim)] border border-[var(--color-primary-dim)] rounded-lg flex items-center justify-center">
           <div className="h-1.5 w-1/3 bg-[var(--color-primary)] opacity-60 rounded" />
        </div>
      </div>
    </div>
    {/* Animated Line connecting elements */}
    <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/20 to-transparent animate-pulse" />
  </div>
);

// --- MAIN LANDING COMPONENT ---

const Landing = () => {
  const words = ['Trajes', 'Disfraces', 'Maquinaria', 'Herramientas', 'Moda'];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const businessTypes = [
    { name: 'Alquiler de Trajes', icon: Shirt, color: 'from-blue-500 to-indigo-600' },
    { name: 'Fiestas y Disfraces', icon: PartyPopper, color: 'from-purple-500 to-pink-600' },
    { name: 'Negocios de Belleza', icon: Scissors, color: 'from-amber-500 to-orange-600' },
    { name: 'Equipos y Maquinaria', icon: Briefcase, color: 'from-emerald-500 to-teal-600' },
  ];

  return (
    <div className="min-h-screen text-[var(--text-primary)] selection:bg-[var(--color-primary-dim)] relative">
      <div className="absolute inset-0 bg-[var(--bg-page)] -z-10" />
      
      {/* Hero Section */}
      <section className="relative pt-48 pb-24 px-6 flex flex-col items-center justify-center text-center overflow-hidden min-h-[95vh]">
        <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center gap-10">
          
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[10px] font-black text-[var(--text-primary)] uppercase tracking-[0.4em] animate-in fade-in duration-1000">
            <Zap className="h-3.5 w-3.5 text-[var(--color-primary)] animate-pulse" />
            Infraestructura Multitenant SaaS
          </div>

          <div className="flex flex-col items-center gap-4">
            <div
              className="font-black reveal-word text-3xl md:text-5xl uppercase tracking-tighter text-[var(--text-secondary)] opacity-50"
              style={{ animationDelay: '0.1s' }}
            >
              Control Absoluto para tu
            </div>

            <div
              className="font-black reveal-word flex flex-row justify-center items-center text-6xl md:text-8xl lg:text-9xl uppercase tracking-tighter"
              style={{ animationDelay: '0.3s' }}
            >
              <span className="font-black mr-4 md:mr-8">Negocio de</span>
              <div className="relative overflow-visible h-[1em] min-w-[300px] flex items-center justify-center">
                <span
                  key={words[index]}
                  className="text-gradient-guambra font-black inline-block absolute italic transform-gpu"
                  style={{
                    animation: 'revealWord 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                  }}
                >
                  {words[index]}
                </span>
              </div>
            </div>
          </div>

          <p
            className="reveal-word text-lg md:text-2xl max-w-3xl mx-auto leading-relaxed text-[var(--text-secondary)] opacity-60 font-medium"
            style={{ animationDelay: '0.5s' }}
          >
            La plataforma distribuida más potente para administrar <span className="text-[var(--text-primary)]">inventario híbrido</span>, contratos inteligentes y flujos de caja.
          </p>

          <div
            className="reveal-word flex flex-col sm:flex-row gap-8 justify-center mt-6"
            style={{ animationDelay: '0.7s' }}
          >
            <Link to="/registro-negocio" className="btn-guambra-primary !text-xs !py-5 !px-16 shadow-[0_0_50px_var(--color-primary-dim)] hover:scale-105 transition-transform duration-500">
              Demo Gratis
            </Link>
            <Link to="/tutoriales" className="btn-guambra-secondary !text-xs !py-5 !px-16 transition-colors">
              Ver Guías
            </Link>
          </div>
        </div>

        {/* Decorative Background Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--color-primary-dim)] blur-[120px] rounded-full -z-10 opacity-30 animate-pulse" />
      </section>

      {/* Business Types Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--color-primary)]">Versatilidad</h2>
          <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-[var(--text-primary)]">Diseñado para cada <span className="italic">Sector</span></h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {businessTypes.map((type, i) => (
            <div key={i} className="glass-card p-10 group cursor-pointer hover:border-[var(--color-primary)] relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${type.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="h-16 w-16 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] flex items-center justify-center mb-8 transition-all group-hover:scale-110 group-hover:bg-[var(--color-primary-dim)]">
                <type.icon className="h-8 w-8 text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors" />
              </div>
              <h4 className="text-xl font-black uppercase tracking-tighter mb-4 text-[var(--text-primary)]">{type.name}</h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed font-normal">
                Optimización específica para flujos de {type.name.toLowerCase()} con reportes detallados.
              </p>
              <div className="mt-8 flex items-center text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                Configurar esta vertical <ChevronRight className="h-3 w-3 ml-1" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Feature 1: Intelligence */}
      <section className="py-40 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10 order-2 lg:order-1">
            <div className="h-14 w-14 rounded-2xl bg-[var(--color-primary-dim)] border border-[var(--color-primary-dim)] flex items-center justify-center">
              <Zap className="h-7 w-7 text-[var(--color-primary)]" />
            </div>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] text-[var(--text-primary)]">
              Visualiza el <span className="text-gradient-guambra">Poder</span> de tus Datos
            </h2>
            <p className="text-lg md:text-xl text-[var(--text-secondary)] opacity-50 leading-relaxed font-normal max-w-xl">
              Olvídate de las hojas de cálculo. Nuestro dashboard centrado en el usuario te ofrece una perspectiva 360° de tus alquileres, ingresos y alertas críticas.
            </p>
            <ul className="space-y-4 pt-4">
              {['Métricas de facturación en tiempo real', 'Alertas de stock bajo o retrasos', 'Gráficos interactivos de demanda'].map(item => (
                <li key={item} className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]">
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative order-1 lg:order-2">
            <div className="relative aspect-square max-w-[500px] mx-auto">
               <MockDashboard />
               {/* Decorative bits */}
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-[var(--color-primary-dim)] blur-[60px] rounded-full" />
               <div className="absolute top-20 -left-10 h-32 w-32 glass-card p-6 flex flex-col justify-center gap-2 transform -rotate-6 animate-bounce transition-all duration-[3s]">
                  <div className="h-1.5 w-full bg-[var(--color-primary-dim)] rounded" />
                  <div className="h-1.5 w-2/3 bg-[var(--border-soft)] rounded" />
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Feature 2: Automation */}
      <section className="py-40 px-6 bg-[var(--bg-surface)] border-y border-[var(--border-soft)] relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="relative">
            <div className="relative aspect-square max-w-[500px] mx-auto group">
               <MockInventory />
               <div className="absolute inset-0 border-[20px] border-[var(--color-primary-dim)] rounded-full scale-110 -z-10 group-hover:scale-125 transition-transform duration-[2s]" />
            </div>
          </div>
          <div className="space-y-10">
            <div className="h-14 w-14 rounded-2xl bg-[var(--color-primary-dim)] border border-[var(--color-primary-dim)] flex items-center justify-center">
              <ShoppingBag className="h-7 w-7 text-[var(--color-primary)]" />
            </div>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] text-[var(--text-primary)]">
              Inventario que <span className="italic">Trabaja</span> para Ti
            </h2>
            <p className="text-lg md:text-xl text-[var(--text-secondary)] opacity-50 leading-relaxed font-normal max-w-xl">
              Controla cada pieza, cada talle y cada estado. Sube masivamente tus productos y deja que el sistema gestione la disponibilidad automáticamente.
            </p>
            <div className="grid grid-cols-2 gap-8 pt-4">
               <div>
                  <span className="text-3xl font-black text-[var(--color-primary)] block mb-1">100%</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Precisión</span>
               </div>
               <div>
                  <span className="text-3xl font-black text-[var(--color-primary)] block mb-1">0.5s</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Latency</span>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Feature 3: Security */}
      <section className="py-40 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10 order-2 lg:order-1">
            <div className="h-14 w-14 rounded-2xl bg-[var(--color-primary-dim)] border border-[var(--color-primary-dim)] flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-[var(--color-primary)]" />
            </div>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9] text-[var(--text-primary)]">
              Acuerdos <span className="text-gradient-guambra">Blindados</span>
            </h2>
            <p className="text-lg md:text-xl text-[var(--text-secondary)] opacity-50 leading-relaxed font-normal max-w-xl">
              Genera contratos de alquiler legales y profesionales en segundos. Firma digital, control de depósitos y términos dinámicos.
            </p>
            <button className="btn-guambra-secondary group transition-all">
              Probar Generador <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="relative order-1 lg:order-2">
            <div className="relative aspect-square max-w-[500px] mx-auto">
               <MockContracts />
               <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[var(--color-primary-dim)] blur-[80px] rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Quote / Stats */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
          <div className="glass-card p-12 md:p-20 text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-5">
                <Store className="h-40 w-40 text-[var(--text-primary)]" />
             </div>
             <p className="text-2xl md:text-4xl font-light italic leading-relaxed text-[var(--text-secondary)] opacity-80 relative z-10 mb-10">
                "MisTrajes transformó nuestro taller de alquileres. Lo que antes tomaba horas de papeleo, ahora sucede en segundos. Es el futuro."
             </p>
             <div className="flex flex-col items-center gap-2 relative z-10">
                <div className="h-12 w-12 rounded-full bg-[var(--color-primary-dim)] border border-[var(--color-primary-dim)] flex items-center justify-center uppercase font-black text-[var(--text-primary)]">GW</div>
                <span className="text-xs font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">GuambraWeb Enterprise</span>
             </div>
          </div>
      </section>

      {/* Final CTA Section */}
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
               <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]"><Zap className="h-3 w-3" /> High Performance</div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Landing;
