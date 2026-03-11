import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PlayCircle, ChevronRight, ChevronDown, Clock,
  Menu, X, BookOpen, CheckCircle2, Loader2,
  LayoutDashboard, Database, FileText, DollarSign,
  Users, Store, CalendarDays, UserCog, Settings,
  Zap, ShieldCheck, Package, GraduationCap,
  Lock, LogIn, ArrowRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

const ICONOS = {
  BookOpen, PlayCircle, LayoutDashboard, Database, FileText,
  DollarSign, Users, Store, CalendarDays, UserCog,
  Settings, Zap, ShieldCheck, Package, GraduationCap,
};

const IconoComp = ({ nombre, className }) => {
  const Comp = ICONOS[nombre] || BookOpen;
  return <Comp className={className} />;
};

// Modal que aparece al intentar acceder a un módulo bloqueado
const ModalBloqueado = ({ onClose }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
    <div
      className="bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl p-8 max-w-sm w-full space-y-6 shadow-2xl"
      onClick={e => e.stopPropagation()}
    >
      {/* Icono */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-14 w-14 rounded-2xl bg-[var(--color-primary-dim)] border border-[var(--color-primary-dim)] flex items-center justify-center">
          <Lock className="h-7 w-7 text-[var(--color-primary)]" />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)] mb-1">Contenido exclusivo</p>
          <h3 className="text-xl font-black uppercase tracking-tighter text-[var(--text-primary)]">
            Módulo Bloqueado
          </h3>
        </div>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Este módulo está disponible para usuarios con una cuenta activa. Inicia sesión o elige un plan para acceder a todos los tutoriales.
        </p>
      </div>

      {/* Acciones */}
      <div className="space-y-3">
        <Link
          to="/iniciar-sesion"
          className="btn-guambra-primary w-full flex items-center justify-center gap-2 !py-3 !text-xs"
        >
          <LogIn className="h-4 w-4" /> Iniciar Sesión
        </Link>
        <Link
          to="/registro-negocio"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface-3)] text-xs font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--color-primary-dim)] transition-all"
        >
          Ver Planes <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <button
        onClick={onClose}
        className="w-full text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors py-1"
      >
        Cerrar
      </button>
    </div>
  </div>
);

const Tutoriales = () => {
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [openSections, setOpenSections] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showModalBloqueado, setShowModalBloqueado] = useState(false);

  const { user, loading: authLoading } = useAuthStore();
  const isAuthenticated = !!user;

  useEffect(() => {
    const fetchTutoriales = async () => {
      setLoading(true);
      try {
        const { data: mods, error } = await supabase
          .from('tutorial_modulos')
          .select('*, tutorial_lecciones(*)')
          .eq('activo', true)
          .order('orden');

        if (error) throw error;

        const modsOrdenados = (mods || []).map(m => ({
          ...m,
          tutorial_lecciones: [...(m.tutorial_lecciones || [])].sort((a, b) => a.orden - b.orden),
        }));

        setModulos(modsOrdenados);

        // Seleccionar primera lección del primer módulo (siempre público)
        const primeraLeccion = modsOrdenados[0]?.tutorial_lecciones?.[0];
        if (primeraLeccion) {
          setSelectedLesson(primeraLeccion);
          setOpenSections([modsOrdenados[0].id]);
        }
      } catch (err) {
        console.error('Error cargando tutoriales:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTutoriales();
  }, []);

  const toggleSection = (modIdx, modId) => {
    // Si no está autenticado y no es el primer módulo, mostrar modal
    if (!isAuthenticated && modIdx > 0) {
      setShowModalBloqueado(true);
      return;
    }
    setOpenSections(prev =>
      prev.includes(modId) ? prev.filter(s => s !== modId) : [...prev, modId]
    );
  };

  const handleSelectLesson = (lesson, modIdx) => {
    // Si no está autenticado y no es del primer módulo, mostrar modal
    if (!isAuthenticated && modIdx > 0) {
      setShowModalBloqueado(true);
      return;
    }
    setSelectedLesson(lesson);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const currentMod = modulos.find(m => m.tutorial_lecciones?.some(l => l.id === selectedLesson?.id));
  const currentLessonIdx = currentMod?.tutorial_lecciones?.findIndex(l => l.id === selectedLesson?.id) ?? 0;

  if (loading || authLoading) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (modulos.length === 0) {
    return (
      <div className="pt-20 min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="h-16 w-16 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] flex items-center justify-center">
          <BookOpen className="h-8 w-8 text-[var(--text-muted)]" />
        </div>
        <p className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">Próximamente</p>
        <p className="text-xs text-[var(--text-muted)] opacity-60 max-w-xs">
          Los tutoriales del sistema estarán disponibles muy pronto.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen text-[var(--text-primary)] flex flex-col lg:flex-row">

      {/* Modal de módulo bloqueado */}
      {showModalBloqueado && <ModalBloqueado onClose={() => setShowModalBloqueado(false)} />}

      {/* Mobile FAB */}
      <div className="lg:hidden fixed bottom-6 left-6 z-[60]">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="h-14 w-14 rounded-2xl bg-[var(--color-primary)] text-white shadow-2xl flex items-center justify-center border border-[var(--border-soft)]"
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-[73px] left-0 h-[calc(100vh-73px)] w-full lg:w-[300px] xl:w-[340px]
          bg-[var(--bg-surface-3)]/95 backdrop-blur-3xl border-r border-[var(--border-soft)]
          overflow-y-auto z-50 transition-all duration-500 lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-5 lg:p-7 space-y-5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.45em] text-[var(--color-primary)] mb-1">Curriculum</p>
            <h3 className="text-xl font-black uppercase tracking-tighter text-[var(--text-primary)]">
              Módulos de <span className="text-gradient-guambra italic">Éxito</span>
            </h3>
          </div>

          <div className="space-y-1">
            {modulos.map((mod, modIdx) => {
              const isOpen = openSections.includes(mod.id);
              const hasActive = mod.tutorial_lecciones?.some(l => l.id === selectedLesson?.id);
              const lecciones = mod.tutorial_lecciones || [];
              const bloqueado = !isAuthenticated && modIdx > 0;

              return (
                <div key={mod.id}>
                  <button
                    onClick={() => toggleSection(modIdx, mod.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                      bloqueado
                        ? 'border-transparent opacity-60 hover:opacity-80'
                        : isOpen || hasActive
                          ? 'bg-[var(--bg-surface-2)] border-[var(--border-soft)]'
                          : 'bg-transparent border-transparent hover:bg-[var(--bg-surface-2)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center border shrink-0 ${
                        bloqueado
                          ? 'bg-[var(--bg-surface-2)] border-[var(--border-soft)] text-[var(--text-muted)]'
                          : hasActive
                            ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary-dim)] text-[var(--color-primary)]'
                            : 'bg-[var(--bg-surface-3)] border-[var(--border-soft)] text-[var(--text-muted)]'
                      }`}>
                        {bloqueado
                          ? <Lock className="h-3.5 w-3.5" />
                          : <IconoComp nombre={mod.icono} className="h-3.5 w-3.5" />
                        }
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest text-left ${
                        hasActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                      }`}>
                        {mod.titulo}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {bloqueado ? (
                        <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] bg-[var(--bg-surface-2)] px-1.5 py-0.5 rounded-full border border-[var(--border-soft)]">
                          PRO
                        </span>
                      ) : (
                        <>
                          <span className="text-[9px] font-black text-[var(--text-muted)] opacity-50">{lecciones.length}</span>
                          {isOpen
                            ? <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                            : <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-50" />
                          }
                        </>
                      )}
                    </div>
                  </button>

                  {/* Lecciones — solo si no está bloqueado y está abierto */}
                  {!bloqueado && (
                    <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="pl-3 pt-1 pb-2 space-y-0.5">
                        {lecciones.map((lesson, idx) => (
                          <button
                            key={lesson.id}
                            onClick={() => handleSelectLesson(lesson, modIdx)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-2.5 transition-colors border ${
                              selectedLesson?.id === lesson.id
                                ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary-dim)]'
                                : 'hover:bg-[var(--bg-surface-2)] border-transparent'
                            }`}
                          >
                            <span className={`text-[9px] font-black mt-0.5 shrink-0 w-4 ${
                              selectedLesson?.id === lesson.id ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]'
                            }`}>
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className={`text-[10px] font-bold uppercase tracking-wider leading-tight ${
                                selectedLesson?.id === lesson.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                              }`}>
                                {lesson.titulo}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Clock className="h-2.5 w-2.5 text-[var(--text-muted)] shrink-0" />
                                <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                                  {lesson.duracion}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Banner CTA para no autenticados */}
          {!isAuthenticated && modulos.length > 1 && (
            <div className="relative overflow-hidden rounded-2xl border border-[var(--color-primary-dim)] bg-[var(--color-primary-dim)]/20 p-4 space-y-3">
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-[var(--color-primary-dim)] blur-[30px] rounded-full" />
              <div className="relative">
                <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-primary)] mb-1">
                  {modulos.length - 1} módulos bloqueados
                </p>
                <p className="text-xs font-bold text-[var(--text-secondary)] leading-snug">
                  Inicia sesión para acceder a todos los tutoriales del sistema.
                </p>
              </div>
              <div className="relative flex flex-col gap-2">
                <Link
                  to="/iniciar-sesion"
                  className="btn-guambra-primary w-full flex items-center justify-center gap-1.5 !py-2.5 !text-[10px]"
                >
                  <LogIn className="h-3.5 w-3.5" /> Iniciar Sesión
                </Link>
                <Link
                  to="/registro-negocio"
                  className="w-full text-center text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors py-1"
                >
                  Ver planes →
                </Link>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 p-6 md:p-10 lg:p-14 xl:p-20 overflow-y-auto">
        {selectedLesson && (
          <div className="max-w-4xl mx-auto space-y-10">

            {/* Breadcrumb */}
            <div className="flex items-center gap-3 animate-in fade-in duration-700">
              <div className="h-px w-8 bg-[var(--color-primary-dim)]" />
              <span className="text-[9px] font-black uppercase tracking-[0.45em] text-[var(--color-primary)]">
                {currentMod?.titulo} · Lección {currentLessonIdx + 1}
              </span>
            </div>

            {/* Título */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-[var(--text-primary)] leading-tight animate-in slide-in-from-left duration-700">
                {selectedLesson.titulo}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-surface-2)] border border-[var(--border-soft)]">
                  <IconoComp nombre={currentMod?.icono} className="h-3 w-3 text-[var(--color-primary)]" />
                  {currentMod?.titulo}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" /> {selectedLesson.duracion}
                </div>
              </div>
            </div>

            {/* Video */}
            {selectedLesson.youtube_id && (
              <div className="relative group animate-in zoom-in-95 duration-700">
                <div className="absolute inset-0 bg-[var(--color-primary-dim)] blur-[80px] rounded-full opacity-70 pointer-events-none" />
                <div className="relative aspect-video w-full bg-black rounded-2xl border border-[var(--border-soft)] overflow-hidden shadow-2xl">
                  <iframe
                    key={selectedLesson.id}
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${selectedLesson.youtube_id}?autoplay=0&rel=0`}
                    title={selectedLesson.titulo}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* Descripción + sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">

              <div className="lg:col-span-2 space-y-8 animate-in fade-in duration-700">
                {selectedLesson.descripcion_html && (
                  <div className="space-y-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-primary)]">Resumen</p>
                    <div className="h-px bg-[var(--border-soft)]" />
                    <div
                      className="tutorial-content border-l-2 border-[var(--color-primary-dim)] pl-5 text-sm leading-relaxed text-[var(--text-secondary)]"
                      dangerouslySetInnerHTML={{ __html: selectedLesson.descripcion_html }}
                    />
                  </div>
                )}

                {selectedLesson.puntos_clave?.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--text-muted)]">Lo que aprenderás</p>
                    <div className="space-y-2">
                      {selectedLesson.puntos_clave.map((punto, i) => (
                        <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)]">
                          <CheckCircle2 className="h-4 w-4 text-[var(--color-primary)] mt-0.5 shrink-0" />
                          <span className="text-xs font-semibold text-[var(--text-secondary)] leading-snug">{punto}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-1 space-y-4 animate-in slide-in-from-right duration-700">
                <div className="p-6 rounded-2xl border border-[var(--color-primary-dim)] bg-[var(--color-primary-dim)]/20 space-y-4">
                  <p className="text-xs font-black uppercase tracking-tighter text-[var(--text-primary)]">¿Necesitas ayuda?</p>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    Nuestros expertos están disponibles para asistirte con configuraciones avanzadas.
                  </p>
                  <button className="btn-guambra-primary w-full !py-3 !text-xs shadow-lg shadow-[var(--color-primary-glow)]">
                    Solicitar Soporte
                  </button>
                </div>
                <div className="p-5 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Servicio en Línea</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider leading-relaxed">
                    Documentación actualizada · v4.2.1
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Tutoriales;
