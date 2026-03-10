import { useState, useEffect, useCallback } from 'react';
import { supabaseAdmin } from '../../lib/supabase';
import RichTextEditor from '../../components/RichTextEditor';
import {
  Plus, Trash2, ChevronDown, ChevronRight,
  BookOpen, Save, Loader2, ArrowUp, ArrowDown,
  LayoutDashboard, Database, FileText, DollarSign,
  Users, Store, CalendarDays, UserCog, PlayCircle,
  Settings, Zap, ShieldCheck, Package, GraduationCap,
  X, CheckCircle2,
} from 'lucide-react';

// ── Mapa de íconos disponibles para módulos ──────────────────────────────────
const ICONOS = {
  BookOpen, PlayCircle, LayoutDashboard, Database, FileText,
  DollarSign, Users, Store, CalendarDays, UserCog,
  Settings, Zap, ShieldCheck, Package, GraduationCap,
};
const ICONOS_KEYS = Object.keys(ICONOS);

const IconoComp = ({ nombre, className }) => {
  const Comp = ICONOS[nombre] || BookOpen;
  return <Comp className={className} />;
};

const extractYoutubeId = (input = '') => {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : trimmed;
};

// ── Componentes UI reutilizables ─────────────────────────────────────────────
const Label = ({ children }) => (
  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">{children}</label>
);

const Input = ({ value, onChange, placeholder, type = 'text' }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className="w-full bg-[var(--bg-surface-3)] border border-[var(--border-soft)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
  />
);

// ── Componente principal ─────────────────────────────────────────────────────
const GestionTutoriales = () => {
  const [modulos, setModulos] = useState([]);
  const [lecciones, setLecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null); // { tipo: 'modulo'|'leccion', id }
  const [form, setForm] = useState({});
  const [openModulos, setOpenModulos] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null); // { tipo, id, titulo }
  const [dbError, setDbError] = useState(null); // error de tablas no creadas
  const [toast, setToast] = useState(null); // { tipo: 'ok'|'err', msg }

  const showToast = (tipo, msg) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setDbError(null);
    const [resModulos, resLecciones] = await Promise.all([
      supabaseAdmin.from('tutorial_modulos').select('*').order('orden'),
      supabaseAdmin.from('tutorial_lecciones').select('*').order('orden'),
    ]);
    if (resModulos.error) {
      setDbError(resModulos.error);
      setLoading(false);
      return;
    }
    setModulos(resModulos.data || []);
    setLecciones(resLecciones.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Selección de item ────────────────────────────────────────────────────
  const selectItem = (tipo, data) => {
    setSelected({ tipo, id: data.id });
    if (tipo === 'modulo') {
      setForm({ titulo: data.titulo, icono: data.icono, activo: data.activo });
    } else {
      setForm({
        titulo: data.titulo,
        duracion: data.duracion || '',
        youtube_id: data.youtube_id || '',
        descripcion_html: data.descripcion_html || '',
        puntos_clave: data.puntos_clave?.length ? [...data.puntos_clave] : [''],
      });
    }
  };

  const selectedData = selected
    ? (selected.tipo === 'modulo'
      ? modulos.find(m => m.id === selected.id)
      : lecciones.find(l => l.id === selected.id))
    : null;

  // ── Guardar ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selected || !selectedData) return;
    setSaving(true);
    let error;
    if (selected.tipo === 'modulo') {
      ({ error } = await supabaseAdmin.from('tutorial_modulos').update({
        titulo: form.titulo?.trim() || 'Sin título',
        icono: form.icono || 'BookOpen',
        activo: !!form.activo,
      }).eq('id', selected.id));
    } else {
      const ytId = extractYoutubeId(form.youtube_id || '');
      const puntos = (form.puntos_clave || []).filter(p => p.trim() !== '');
      ({ error } = await supabaseAdmin.from('tutorial_lecciones').update({
        titulo: form.titulo?.trim() || 'Sin título',
        duracion: form.duracion?.trim() || '0:00',
        youtube_id: ytId,
        descripcion_html: form.descripcion_html || '',
        puntos_clave: puntos,
      }).eq('id', selected.id));
    }
    if (error) {
      showToast('err', 'Error al guardar: ' + error.message);
    } else {
      showToast('ok', 'Guardado correctamente');
      await fetchAll();
    }
    setSaving(false);
  };

  // ── Nuevo módulo ─────────────────────────────────────────────────────────
  const handleNewModulo = async () => {
    setSaving(true);
    const maxOrden = modulos.length > 0 ? Math.max(...modulos.map(m => m.orden)) + 1 : 0;
    const { data, error } = await supabaseAdmin.from('tutorial_modulos').insert({
      titulo: 'Nuevo Módulo',
      icono: 'BookOpen',
      orden: maxOrden,
      activo: true,
    }).select().single();
    if (error) {
      showToast('err', 'Error al crear módulo: ' + error.message);
      setSaving(false);
      return;
    }
    await fetchAll();
    selectItem('modulo', data);
    setOpenModulos(prev => [...prev, data.id]);
    setSaving(false);
  };

  // ── Nueva lección ────────────────────────────────────────────────────────
  const handleNewLeccion = async (moduloId) => {
    setSaving(true);
    const lecsMod = lecciones.filter(l => l.modulo_id === moduloId);
    const maxOrden = lecsMod.length > 0 ? Math.max(...lecsMod.map(l => l.orden)) + 1 : 0;
    const { data, error } = await supabaseAdmin.from('tutorial_lecciones').insert({
      modulo_id: moduloId,
      titulo: 'Nueva Lección',
      duracion: '0:00',
      youtube_id: '',
      descripcion_html: '',
      puntos_clave: [],
      orden: maxOrden,
    }).select().single();
    if (error) {
      showToast('err', 'Error al crear lección: ' + error.message);
      setSaving(false);
      return;
    }
    await fetchAll();
    selectItem('leccion', data);
    setSaving(false);
  };

  // ── Eliminar ─────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    const table = confirmDelete.tipo === 'modulo' ? 'tutorial_modulos' : 'tutorial_lecciones';
    const { error } = await supabaseAdmin.from(table).delete().eq('id', confirmDelete.id);
    if (error) {
      showToast('err', 'Error al eliminar: ' + error.message);
    } else {
      if (selected?.id === confirmDelete.id) setSelected(null);
      showToast('ok', `${confirmDelete.tipo === 'modulo' ? 'Módulo' : 'Lección'} eliminado`);
      await fetchAll();
    }
    setConfirmDelete(null);
    setSaving(false);
  };

  // ── Reordenar ────────────────────────────────────────────────────────────
  const moverOrden = async (tipo, id, moduloId, dir) => {
    const lista = (tipo === 'modulo'
      ? [...modulos]
      : [...lecciones.filter(l => l.modulo_id === moduloId)]
    ).sort((a, b) => a.orden - b.orden);

    const idx = lista.findIndex(x => x.id === id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= lista.length) return;

    const table = tipo === 'modulo' ? 'tutorial_modulos' : 'tutorial_lecciones';
    await Promise.all([
      supabaseAdmin.from(table).update({ orden: lista[swapIdx].orden }).eq('id', lista[idx].id),
      supabaseAdmin.from(table).update({ orden: lista[idx].orden }).eq('id', lista[swapIdx].id),
    ]);
    await fetchAll();
  };

  // ── Helpers UI ───────────────────────────────────────────────────────────
  const toggleModulo = (id) =>
    setOpenModulos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const addPunto = () =>
    setForm(f => ({ ...f, puntos_clave: [...(f.puntos_clave || []), ''] }));

  const removePunto = (i) =>
    setForm(f => ({ ...f, puntos_clave: f.puntos_clave.filter((_, idx) => idx !== i) }));

  const updatePunto = (i, val) =>
    setForm(f => ({ ...f, puntos_clave: f.puntos_clave.map((p, idx) => idx === i ? val : p) }));

  const ytPreviewId = selected?.tipo === 'leccion' ? extractYoutubeId(form.youtube_id || '') : '';

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  // Tablas no creadas en Supabase
  if (dbError) {
    const SQL = `-- Ejecuta esto en el SQL Editor de tu proyecto Supabase

CREATE TABLE tutorial_modulos (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo     text NOT NULL,
  icono      text NOT NULL DEFAULT 'BookOpen',
  orden      int  NOT NULL DEFAULT 0,
  activo     boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE tutorial_lecciones (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  modulo_id        uuid REFERENCES tutorial_modulos(id) ON DELETE CASCADE,
  titulo           text    NOT NULL,
  duracion         text    NOT NULL DEFAULT '0:00',
  youtube_id       text    NOT NULL DEFAULT '',
  descripcion_html text    NOT NULL DEFAULT '',
  puntos_clave     text[]  NOT NULL DEFAULT '{}',
  orden            int     NOT NULL DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE tutorial_modulos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutorial_lecciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_modulos"   ON tutorial_modulos   FOR SELECT USING (activo = true);
CREATE POLICY "public_read_lecciones" ON tutorial_lecciones FOR SELECT USING (true);`;

    return (
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-start gap-4 p-5 rounded-2xl border border-red-500/30 bg-red-500/10">
          <div className="h-9 w-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <X className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-wider text-red-400">Tablas no encontradas</p>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              Las tablas <code className="bg-[var(--bg-surface-2)] px-1 py-0.5 rounded text-[var(--text-primary)]">tutorial_modulos</code> y{' '}
              <code className="bg-[var(--bg-surface-2)] px-1 py-0.5 rounded text-[var(--text-primary)]">tutorial_lecciones</code> no existen en Supabase.
              Copia el SQL de abajo, pégalo en el <strong>SQL Editor</strong> de tu proyecto y ejecútalo.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-primary)]">SQL a ejecutar en Supabase</p>
            <button
              onClick={() => { navigator.clipboard.writeText(SQL); showToast('ok', 'SQL copiado al portapapeles'); }}
              className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--color-primary-dim)]"
            >
              Copiar
            </button>
          </div>
          <pre className="bg-[var(--bg-surface-3)] border border-[var(--border-soft)] rounded-xl p-4 text-xs text-[var(--text-secondary)] overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
            {SQL}
          </pre>
        </div>

        <button
          onClick={fetchAll}
          className="btn-guambra-primary flex items-center gap-2 !py-3 !px-6"
        >
          <Loader2 className="h-4 w-4" /> Reintentar conexión
        </button>

        {toast && (
          <div className={`fixed bottom-6 right-6 z-[300] px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-widest shadow-xl ${
            toast.tipo === 'ok'
              ? 'bg-[var(--bg-surface-2)] border-[var(--color-primary-dim)] text-[var(--color-primary)]'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {toast.msg}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">

      {/* ── Panel izquierdo: árbol ────────────────────────────────────────── */}
      <aside className="w-[300px] shrink-0 border-r border-[var(--border-soft)] bg-[var(--bg-surface-3)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-soft)] shrink-0">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)] mb-0.5">CMS</p>
          <h2 className="text-base font-black uppercase tracking-tighter text-[var(--text-primary)]">Tutoriales</h2>
        </div>

        {/* Lista de módulos */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {modulos.map((mod, modIdx) => {
            const isOpen = openModulos.includes(mod.id);
            const isSelMod = selected?.tipo === 'modulo' && selected.id === mod.id;
            const lecsDelMod = lecciones
              .filter(l => l.modulo_id === mod.id)
              .sort((a, b) => a.orden - b.orden);

            return (
              <div key={mod.id}>
                {/* Fila módulo */}
                <div className={`group flex items-center gap-1.5 px-2 py-2 rounded-xl border transition-all cursor-pointer ${
                  isSelMod
                    ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary-dim)]'
                    : 'border-transparent hover:bg-[var(--bg-surface-2)]'
                }`}>
                  <button
                    onClick={() => toggleModulo(mod.id)}
                    className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {isOpen
                      ? <ChevronDown className="h-3.5 w-3.5" />
                      : <ChevronRight className="h-3.5 w-3.5" />
                    }
                  </button>

                  <button
                    onClick={() => selectItem('modulo', mod)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    <div className={`h-6 w-6 rounded-lg border flex items-center justify-center shrink-0 ${
                      isSelMod
                        ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary-dim)] text-[var(--color-primary)]'
                        : 'bg-[var(--bg-surface-2)] border-[var(--border-soft)] text-[var(--text-muted)]'
                    }`}>
                      <IconoComp nombre={mod.icono} className="h-3 w-3" />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider truncate ${
                      isSelMod ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                    }`}>
                      {mod.titulo}
                    </span>
                    {!mod.activo && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] bg-[var(--bg-surface-2)] px-1.5 py-0.5 rounded-full border border-[var(--border-soft)] shrink-0">
                        OFF
                      </span>
                    )}
                  </button>

                  {/* Acciones módulo */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => moverOrden('modulo', mod.id, null, 'up')}
                      disabled={modIdx === 0}
                      className="h-5 w-5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 transition-colors"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => moverOrden('modulo', mod.id, null, 'down')}
                      disabled={modIdx === modulos.length - 1}
                      className="h-5 w-5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 transition-colors"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ tipo: 'modulo', id: mod.id, titulo: mod.titulo })}
                      className="h-5 w-5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Lecciones del módulo */}
                {isOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 pl-2 border-l border-[var(--border-soft)]">
                    {lecsDelMod.map((lec, lecIdx) => {
                      const isSelLec = selected?.tipo === 'leccion' && selected.id === lec.id;
                      return (
                        <div key={lec.id} className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          isSelLec
                            ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary-dim)]'
                            : 'border-transparent hover:bg-[var(--bg-surface-2)]'
                        }`}>
                          <span className="text-[9px] font-black text-[var(--text-muted)] w-4 text-right shrink-0">
                            {lecIdx + 1}
                          </span>
                          <button
                            onClick={() => selectItem('leccion', lec)}
                            className="flex-1 text-left min-w-0"
                          >
                            <p className={`text-[10px] font-semibold truncate ${
                              isSelLec ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                            }`}>
                              {lec.titulo}
                            </p>
                          </button>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => moverOrden('leccion', lec.id, mod.id, 'up')}
                              disabled={lecIdx === 0}
                              className="h-4 w-4 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20"
                            >
                              <ArrowUp className="h-2.5 w-2.5" />
                            </button>
                            <button
                              onClick={() => moverOrden('leccion', lec.id, mod.id, 'down')}
                              disabled={lecIdx === lecsDelMod.length - 1}
                              className="h-4 w-4 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20"
                            >
                              <ArrowDown className="h-2.5 w-2.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ tipo: 'leccion', id: lec.id, titulo: lec.titulo })}
                              className="h-4 w-4 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-red-400"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* + Nueva lección */}
                    <button
                      onClick={() => handleNewLeccion(mod.id)}
                      disabled={saving}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] transition-all border border-dashed border-[var(--border-soft)] hover:border-[var(--color-primary-dim)]"
                    >
                      <Plus className="h-3 w-3" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Nueva Lección</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* + Nuevo módulo */}
        <div className="p-3 border-t border-[var(--border-soft)] shrink-0">
          <button
            onClick={handleNewModulo}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--bg-surface-2)] hover:bg-[var(--color-primary-dim)] border border-[var(--border-soft)] hover:border-[var(--color-primary-dim)] text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-all"
          >
            <Plus className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Nuevo Módulo</span>
          </button>
        </div>
      </aside>

      {/* ── Panel derecho: formulario ─────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-[var(--bg-surface)]">
        {!selected ? (
          /* Estado vacío */
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-12">
            <div className="h-16 w-16 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-[var(--text-muted)]">Selecciona un módulo o lección</p>
              <p className="text-xs text-[var(--text-muted)] opacity-60 mt-1">para editar su contenido</p>
            </div>
          </div>
        ) : selected.tipo === 'modulo' && selectedData ? (
          /* ── Formulario de módulo ────────────────────────────────────── */
          <div className="max-w-xl mx-auto p-8 space-y-8">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)] mb-1">Módulo</p>
              <h3 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-primary)]">
                Editar Módulo
              </h3>
            </div>

            <div className="space-y-5">
              {/* Título */}
              <div className="space-y-1.5">
                <Label>Título del módulo</Label>
                <Input
                  value={form.titulo || ''}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ej: Gestión de Contratos"
                />
              </div>

              {/* Selector de ícono */}
              <div className="space-y-2">
                <Label>Ícono</Label>
                <div className="grid grid-cols-5 gap-2">
                  {ICONOS_KEYS.map(key => {
                    const isActive = form.icono === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, icono: key }))}
                        title={key}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${
                          isActive
                            ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary-dim)] text-[var(--color-primary)]'
                            : 'bg-[var(--bg-surface-2)] border-[var(--border-soft)] text-[var(--text-muted)] hover:border-[var(--color-primary-dim)]'
                        }`}
                      >
                        <IconoComp nombre={key} className="h-5 w-5" />
                        <span className="text-[7px] font-bold truncate w-full text-center">{key.slice(0, 8)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Estado activo */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)]">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">Módulo activo</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Visible en la página pública de tutoriales</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    form.activo ? 'bg-[var(--color-primary)]' : 'bg-[var(--border-soft)]'
                  }`}
                >
                  <span className={`absolute left-0 top-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${
                    form.activo ? 'translate-x-[22px]' : 'translate-x-[2px]'
                  }`} />
                </button>
              </div>
            </div>

            {/* Botón guardar */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-guambra-primary w-full flex items-center justify-center gap-2 !py-3"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Guardando...' : 'Guardar Módulo'}
            </button>
          </div>

        ) : selected.tipo === 'leccion' && selectedData ? (
          /* ── Formulario de lección ───────────────────────────────────── */
          <div className="max-w-2xl mx-auto p-8 space-y-8">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)] mb-1">
                {modulos.find(m => m.id === selectedData.modulo_id)?.titulo || 'Lección'}
              </p>
              <h3 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-primary)]">
                Editar Lección
              </h3>
            </div>

            <div className="space-y-5">
              {/* Título */}
              <div className="space-y-1.5">
                <Label>Título de la lección</Label>
                <Input
                  value={form.titulo || ''}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ej: Crear un Nuevo Contrato"
                />
              </div>

              {/* Duración + YouTube */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Duración (mm:ss)</Label>
                  <Input
                    value={form.duracion || ''}
                    onChange={e => setForm(f => ({ ...f, duracion: e.target.value }))}
                    placeholder="Ej: 5:24"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>URL o ID de YouTube</Label>
                  <Input
                    value={form.youtube_id || ''}
                    onChange={e => setForm(f => ({ ...f, youtube_id: e.target.value }))}
                    placeholder="youtu.be/xxxxx o ID"
                  />
                </div>
              </div>

              {/* Preview YouTube */}
              {ytPreviewId && /^[a-zA-Z0-9_-]{11}$/.test(ytPreviewId) && (
                <div className="rounded-xl overflow-hidden border border-[var(--border-soft)] aspect-video">
                  <iframe
                    key={ytPreviewId}
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${ytPreviewId}?autoplay=0&rel=0`}
                    title="Preview"
                    frameBorder="0"
                    allowFullScreen
                  />
                </div>
              )}

              {/* Descripción con editor rico */}
              <div className="space-y-1.5">
                <Label>Descripción (texto enriquecido)</Label>
                <RichTextEditor
                  value={form.descripcion_html || ''}
                  onChange={val => setForm(f => ({ ...f, descripcion_html: val }))}
                  placeholder="Describe qué aprenderá el usuario en esta lección..."
                />
              </div>

              {/* Puntos clave */}
              <div className="space-y-2">
                <Label>Puntos clave (lo que aprenderás)</Label>
                <div className="space-y-2">
                  {(form.puntos_clave || []).map((punto, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                      <input
                        value={punto}
                        onChange={e => updatePunto(i, e.target.value)}
                        placeholder={`Punto clave ${i + 1}`}
                        className="flex-1 bg-[var(--bg-surface-3)] border border-[var(--border-soft)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => removePunto(i)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--bg-surface-2)] transition-colors shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addPunto}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors px-1 py-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar punto
                  </button>
                </div>
              </div>
            </div>

            {/* Botón guardar */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-guambra-primary w-full flex items-center justify-center gap-2 !py-3"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Guardando...' : 'Guardar Lección'}
            </button>
          </div>
        ) : null}
      </main>

      {/* ── Toast de feedback ───────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[300] px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-widest shadow-xl transition-all animate-in fade-in slide-in-from-bottom-2 ${
          toast.tipo === 'ok'
            ? 'bg-[var(--bg-surface-2)] border-[var(--color-primary-dim)] text-[var(--color-primary)]'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ── Modal confirmación eliminación ───────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)]">
                  ¿Eliminar {confirmDelete.tipo === 'modulo' ? 'módulo' : 'lección'}?
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  <span className="font-semibold text-[var(--text-secondary)]">"{confirmDelete.titulo}"</span>
                  {confirmDelete.tipo === 'modulo' && ' y todas sus lecciones serán eliminados permanentemente.'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface-3)] text-xs font-black uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-xs font-black uppercase tracking-wider text-white transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionTutoriales;
