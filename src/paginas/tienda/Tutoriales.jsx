import { useState } from 'react';
import { 
  PlayCircle, 
  ChevronRight, 
  ChevronDown, 
  BookOpen, 
  Shield, 
  Layout, 
  Clock,
  Menu,
  X,
  Layers,
  Settings,
  Database,
  FileText,
  DollarSign
} from 'lucide-react';

const Tutoriales = () => {
  const [selectedTutorial, setSelectedTutorial] = useState({
    id: 'intro-1',
    title: 'Introducción al Sistema MisTrajes',
    youtubeId: 'dQw4w9WgXcQ', // Placeholder
    duration: '5:24',
    description: 'En este primer video aprenderás los conceptos básicos de la plataforma, cómo navegar por el dashboard principal y cómo comenzar a configurar tu entorno de trabajo profesional.'
  });
  
  const [openSections, setOpenSections] = useState(['primeros-pasos']);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const modules = [
    {
      id: 'primeros-pasos',
      title: 'Primeros Pasos',
      icon: PlayCircle,
      lessons: [
        { id: 'intro-1', title: 'Introducción al Sistema', duration: '5:24', youtubeId: 'dQw4w9WgXcQ', description: 'Visión general de todas las herramientas y flujo de trabajo sugerido para nuevos negocios.' },
        { id: 'config-2', title: 'Configuración Inicial', duration: '3:45', youtubeId: 'dQw4w9WgXcQ', description: 'Aprende a configurar los datos de tu negocio, moneda, y parámetros regionales.' },
        { id: 'tour-3', title: 'Tour por el Dashboard', duration: '7:12', youtubeId: 'dQw4w9WgXcQ', description: 'Entiende cada métrica y acceso directo de tu panel de control central.' },
      ]
    },
    {
      id: 'gestion-inventario',
      title: 'Gestión de Inventario',
      icon: Database,
      lessons: [
        { id: 'prod-1', title: 'Crear un Producto', duration: '4:50', youtubeId: 'dQw4w9WgXcQ', description: 'Cómo dar de alta trajes, vestidos y accesorios con fotos y descripciones.' },
        { id: 'stock-2', title: 'Control de Stock', duration: '6:15', youtubeId: 'dQw4w9WgXcQ', description: 'Gestión de tallas, colores y alertas de inventario bajo o fuera de servicio.' },
        { id: 'cat-3', title: 'Categorías Avanzadas', duration: '3:20', youtubeId: 'dQw4w9WgXcQ', description: 'Organiza tu catálogo para que tus empleados y clientes encuentren todo al instante.' },
      ]
    },
    {
      id: 'contratos-alquiler',
      title: 'Ventas y Contratos',
      icon: FileText,
      lessons: [
        { id: 'cont-1', title: 'Generar Nuevo Contrato', duration: '8:40', youtubeId: 'dQw4w9WgXcQ', description: 'El proceso completo: desde seleccionar el traje hasta imprimir el acuerdo legal.' },
        { id: 'dev-2', title: 'Retornos y Devoluciones', duration: '4:30', youtubeId: 'dQw4w9WgXcQ', description: 'Cómo registrar entregas y devoluciones gestionando depósitos de garantía.' },
        { id: 'cli-3', title: 'Fidelización de Clientes', duration: '5:10', youtubeId: 'dQw4w9WgXcQ', description: 'Manejo de base de datos de clientes, historial de rentas y preferencias.' },
      ]
    },
    {
      id: 'finanzas',
      title: 'Administración y Finanzas',
      icon: DollarSign,
      lessons: [
        { id: 'caja-1', title: 'Cierre de Caja Diaria', duration: '6:00', youtubeId: 'dQw4w9WgXcQ', description: 'Control de efectivo, tarjetas y depósitos al final de cada jornada laboral.' },
        { id: 'plan-2', title: 'Gestión de Suscripción', duration: '2:50', youtubeId: 'dQw4w9WgXcQ', description: 'Cómo renovar tu plan SaaS y descargar tus facturas fiscales.' },
      ]
    }
  ];

  const toggleSection = (id) => {
    setOpenSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSelectLesson = (lesson) => {
    setSelectedTutorial(lesson);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
    // Smooth scroll to top in mobile when changing lesson
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex flex-col lg:flex-row">
      
      {/* Mobile Header Toggle */}
      <div className="lg:hidden fixed bottom-6 right-6 z-[60]">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="h-16 w-16 rounded-full bg-[var(--color-primary)] text-white shadow-2xl flex items-center justify-center border-4 border-[var(--border-soft)]"
        >
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside 
        className={`
          fixed lg:sticky top-[73px] left-0 h-[calc(100vh-73px)] w-full lg:w-[320px] xl:w-[380px] bg-[var(--bg-surface-3)]/90 backdrop-blur-3xl border-r border-[var(--border-soft)] overflow-y-auto z-50 transition-all duration-500 lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6 lg:p-10 space-y-8">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)] mb-2">Curriculum</h2>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-primary)]">Módulos de <span className="text-gradient-guambra">Éxito</span></h3>
          </div>

          <div className="space-y-4">
            {modules.map((module) => {
              const isOpen = openSections.includes(module.id);
              return (
                <div key={module.id} className="space-y-2">
                  <button 
                    onClick={() => toggleSection(module.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      isOpen ? 'bg-[var(--bg-surface-2)] border-[var(--border-soft)]' : 'bg-transparent border-transparent hover:bg-[var(--bg-surface-3)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center border ${
                        isOpen ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary-dim)] text-[var(--color-primary)]' : 'bg-[var(--bg-surface-3)] border-[var(--border-soft)] text-[var(--text-muted)]'
                      }`}>
                        <module.icon className="h-4 w-4" />
                      </div>
                      <span className={`text-[11px] font-black uppercase tracking-widest ${isOpen ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                        {module.title}
                      </span>
                    </div>
                    {isOpen ? <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" /> : <ChevronRight className="h-4 w-4 text-[var(--text-muted)] opacity-50" />}
                  </button>

                  <div className={`space-y-1 pl-4 overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[500px] opacity-100 py-2' : 'max-h-0 opacity-0'}`}>
                    {module.lessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        onClick={() => handleSelectLesson(lesson)}
                        className={`w-full text-left p-4 rounded-xl flex items-start gap-3 transition-colors group ${
                          selectedTutorial.id === lesson.id ? 'bg-[var(--color-primary-dim)] border border-[var(--color-primary-dim)]' : 'hover:bg-[var(--bg-surface-2)] border border-transparent'
                        }`}
                      >
                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${selectedTutorial.id === lesson.id ? 'bg-[var(--color-primary)]' : 'bg-[var(--border-soft)] group-hover:bg-[var(--text-muted)]'}`} />
                        <div>
                          <p className={`text-[11px] font-bold uppercase tracking-wider ${selectedTutorial.id === lesson.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                            {lesson.title}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="h-3 w-3 text-[var(--text-muted)]" />
                            <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{lesson.duration} min</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 lg:p-16 xl:p-24 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-12">
          
          {/* Breadcrumb / Category info */}
          <div className="flex items-center gap-3 animate-in fade-in duration-700">
             <div className="h-1px w-8 bg-[var(--color-primary-dim)]"></div>
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)]">
                Video-Tutorial {modules.findIndex(m => m.lessons.some(l => l.id === selectedTutorial.id)) + 1}.{modules.find(m => m.lessons.some(l => l.id === selectedTutorial.id))?.lessons.findIndex(l => l.id === selectedTutorial.id) + 1}
             </span>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-[var(--text-primary)] animate-in slide-in-from-left duration-700">
              {selectedTutorial.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-surface-2)] border border-[var(--border-soft)]">
                  <PlayCircle className="h-3 w-3 text-[var(--color-primary)]" /> Multi-Tenant SaaS
               </div>
               <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" /> Duración: {selectedTutorial.duration}
               </div>
            </div>
          </div>

          {/* Video Player */}
          <div className="relative group animate-in zoom-in-95 duration-1000">
            <div className="absolute inset-0 bg-[var(--color-primary-dim)] blur-[100px] rounded-full group-hover:bg-[var(--color-primary-dim)] transition-all" />
            <div className="relative aspect-video w-full bg-black rounded-[2rem] border border-[var(--border-soft)] overflow-hidden shadow-2xl">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${selectedTutorial.youtubeId}?autoplay=0&rel=0`}
                title={selectedTutorial.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>

          {/* Description Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-10">
             <div className="lg:col-span-2 space-y-8 animate-in fade-in duration-1000 delay-300">
                <div className="space-y-4">
                   <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[var(--color-primary)]">Resumen del Tema</h3>
                   <div className="h-px bg-[var(--border-soft)] w-full" />
                   <p className="text-xl text-[var(--text-secondary)] leading-relaxed italic border-l-2 border-[var(--color-primary-dim)] pl-8">
                      {selectedTutorial.description}
                   </p>
                </div>
                
                <div className="space-y-6">
                   <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">Lo que aprenderás:</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        'Atajos del teclado para navegación rápida',
                        'Mejores prácticas de seguridad de datos',
                        'Optimización de flujos con clientes recurrentes'
                      ].map(point => (
                        <div key={point} className="p-4 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] flex items-start gap-3">
                           <Shield className="h-4 w-4 text-[var(--color-primary)] mt-0.5 shrink-0" />
                           <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{point}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </div>

             <div className="lg:col-span-1 space-y-6 animate-in slide-in-from-right duration-1000 delay-500">
                <div className="glass-card p-8 border-[var(--color-primary-dim)] bg-[var(--color-primary-dim)]/20">
                   <h3 className="text-sm font-black uppercase tracking-tighter mb-4 text-[var(--text-primary)]">¿Necesitas ayuda personalizada?</h3>
                   <p className="text-[11px] text-[var(--text-muted)] mb-8 leading-relaxed">
                      Nuestros expertos técnicos están disponibles para asistirte con configuraciones avanzadas.
                   </p>
                   <button className="btn-guambra-primary w-full shadow-lg shadow-[var(--color-primary-glow)]">Solicitar Soporte</button>
                </div>

                <div className="p-8 rounded-3xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)]">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Servicio en Línea</span>
                   </div>
                   <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest leading-relaxed">
                      Documentación técnica actualizada para v4.2.1
                   </p>
                </div>
             </div>
          </div>
        </div>
      </main>

    </div>
  );
};

export default Tutoriales;
