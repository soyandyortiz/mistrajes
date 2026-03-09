import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'sonner';
import { Tag, Plus, Edit2, Trash2, ChevronRight, Loader2, X, FolderOpen, Folder } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toSlug = (str) =>
  str.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

// ─── ModuleNavbar ─────────────────────────────────────────────────────────────
const ModuleNavbar = ({ currentTab, setTab }) => (
  <div className="border-b border-[var(--border-soft)] pb-px mb-8 overflow-x-auto no-scrollbar">
    <nav className="-mb-px flex gap-6">
      {[
        { id: 'categorias', label: 'Categorías Principales' },
        { id: 'subcategorias', label: 'Subcategorías' },
        { id: 'nueva', label: 'Nueva Categoría', icon: Plus },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setTab(tab.id)}
          className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
            currentTab === tab.id
              ? 'border-primary text-[var(--color-primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-white/20'
          }`}
        >
          {tab.id === 'nueva' && <Plus className="w-3 h-3" />}
          {tab.id !== 'nueva' && (tab.id === 'categorias' ? <FolderOpen className="w-3 h-3" /> : <Folder className="w-3 h-3" />)}
          {tab.label}
        </button>
      ))}
    </nav>
  </div>
);

// ─── Formulario Crear/Editar ──────────────────────────────────────────────────
const FormCategoria = ({ categoriasPadre, editando, onGuardado, onCancelar, tenantId }) => {
  const [form, setForm] = useState({ nombre: '', padre_id: '', orden_visual: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editando) {
      setForm({
        nombre: editando.nombre || '',
        padre_id: editando.padre_id || '',
        orden_visual: editando.orden_visual || 0,
      });
    } else {
      setForm({ nombre: '', padre_id: '', orden_visual: 0 });
    }
  }, [editando]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio');
    setLoading(true);
    try {
      const payload = {
        tenant_id: tenantId,
        nombre: form.nombre.trim(),
        slug: toSlug(form.nombre),
        padre_id: form.padre_id || null,
        orden_visual: Number(form.orden_visual) || 0,
      };
      if (editando) {
        const { error } = await supabase.from('categorias_productos').update(payload).eq('id', editando.id);
        if (error) throw error;
        toast.success('Categoría actualizada correctamente');
      } else {
        const { error } = await supabase.from('categorias_productos').insert([payload]);
        if (error) throw error;
        toast.success('Categoría creada correctamente');
      }
      setForm({ nombre: '', padre_id: '', orden_visual: 0 });
      onGuardado();
    } catch (err) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card p-8 md:p-10 space-y-8 animate-in slide-in-from-bottom-4 max-w-2xl">
      <div>
        <h2 className="text-xl font-black uppercase tracking-tighter text-[var(--text-primary)] mb-1">
          {editando ? 'Editar Categoría' : 'Nueva Categoría'}
        </h2>
        <p className="text-xs text-[var(--text-muted)] font-medium">
          {editando ? 'Modifica los datos de la categoría.' : 'Las categorías organizan tus productos y piezas. Si asignas una categoría padre, se convierte en subcategoría.'}
        </p>
      </div>

      <div className="space-y-6">
        {/* Nombre */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Nombre de la Categoría <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            className="input-guambra text-lg"
            placeholder="Ej: Trajes Típicos, Disfraces, Alta Costura..."
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />
          {form.nombre && (
            <p className="mt-2 text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-bold">
              Slug generado: <span className="text-[var(--color-primary)]/70">{toSlug(form.nombre)}</span>
            </p>
          )}
        </div>

        {/* Categoría Padre (opcional → subcategoría) */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Categoría Padre <span className="text-[var(--text-muted)] text-[9px] ml-1">(Dejar vacío si es principal)</span>
          </label>
          <select
            className="input-guambra"
            value={form.padre_id}
            onChange={(e) => setForm({ ...form, padre_id: e.target.value })}
          >
            <option value="">— Categoría Principal (sin padre) —</option>
            {categoriasPadre
              .filter(c => !c.padre_id && c.id !== editando?.id)
              .map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
          </select>
          {form.padre_id && (
            <p className="mt-2 text-[9px] text-amber-400/70 uppercase tracking-widest font-bold flex items-center gap-1">
              <ChevronRight className="w-3 h-3" /> Esta será una subcategoría de la categoría seleccionada
            </p>
          )}
        </div>

        {/* Orden visual */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Orden de aparición <span className="text-[var(--text-muted)] text-[9px] ml-1">(Menor = primero)</span>
          </label>
          <input
            type="number"
            min="0"
            className="input-guambra w-32 font-mono"
            value={form.orden_visual}
            onChange={(e) => setForm({ ...form, orden_visual: e.target.value })}
          />
        </div>
      </div>

      <div className="flex gap-4 pt-4 border-t border-[var(--border-soft)]">
        {onCancelar && (
          <button type="button" onClick={onCancelar} className="btn-guambra-secondary !px-8 h-12 flex items-center gap-2">
            <X className="w-4 h-4" /> Cancelar
          </button>
        )}
        <button type="submit" disabled={loading} className="btn-guambra-primary !px-10 h-12 flex items-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {editando ? 'Guardar Cambios' : 'Crear Categoría'}
        </button>
      </div>
    </form>
  );
};

// ─── Tabla de Categorías ──────────────────────────────────────────────────────
const TablaCategorias = ({ categorias, soloSubcategorias, onEditar, onEliminar, loading }) => {
  const lista = soloSubcategorias
    ? categorias.filter(c => c.padre_id)
    : categorias.filter(c => !c.padre_id);

  const getNombrePadre = (padre_id) =>
    categorias.find(c => c.id === padre_id)?.nombre || '—';

  if (loading) return (
    <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" /></div>
  );

  if (lista.length === 0) return (
    <div className="glass-card p-16 text-center">
      {soloSubcategorias
        ? <Folder className="w-12 h-12 text-[var(--text-primary)]/10 mx-auto mb-4" />
        : <FolderOpen className="w-12 h-12 text-[var(--text-primary)]/10 mx-auto mb-4" />}
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
        {soloSubcategorias ? 'No hay subcategorías creadas aún' : 'No hay categorías principales creadas aún'}
      </p>
      <p className="text-[10px] text-[var(--text-muted)] mt-2">Usa el tab "+ Nueva Categoría" para agregar una.</p>
    </div>
  );

  return (
    <div className="glass-card overflow-hidden animate-in slide-in-from-bottom-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border-soft)]">
          <thead className="bg-white/[0.03]">
            <tr>
              <th className="py-5 pl-8 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Nombre</th>
              <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Slug</th>
              {soloSubcategorias && (
                <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">Categoría Padre</th>
              )}
              {!soloSubcategorias && (
                <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">Subcategorías</th>
              )}
              <th className="px-4 py-5 text-center text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">Orden</th>
              <th className="relative py-5 pl-4 pr-8"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-soft)]">
            {lista.map((cat) => {
              const subcats = categorias.filter(c => c.padre_id === cat.id);
              return (
                <tr key={cat.id} className="hover:bg-white/[0.03] transition-all group">
                  <td className="py-5 pl-8">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        {soloSubcategorias
                          ? <ChevronRight className="w-4 h-4 text-[var(--color-primary)]/60" />
                          : <Tag className="w-4 h-4 text-[var(--color-primary)]/60" />}
                      </div>
                      <span className="text-sm font-bold text-[var(--text-primary)]">{cat.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <span className="font-mono text-xs text-[var(--text-muted)] bg-[var(--bg-surface-2)] px-2 py-1 rounded-md">{cat.slug}</span>
                  </td>
                  {soloSubcategorias && (
                    <td className="px-4 py-5">
                      <span className="text-xs font-bold text-[var(--color-primary)]/70 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                        {getNombrePadre(cat.padre_id)}
                      </span>
                    </td>
                  )}
                  {!soloSubcategorias && (
                    <td className="px-4 py-5">
                      {subcats.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {subcats.map(sc => (
                            <span key={sc.id} className="text-[9px] font-bold text-[var(--text-muted)] bg-[var(--bg-surface-2)] border border-[var(--border-soft)] px-2 py-0.5 rounded-full uppercase tracking-widest">
                              {sc.nombre}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Sin subcategorías</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-5 text-center">
                    <span className="font-mono text-xs text-[var(--text-muted)] bg-[var(--bg-surface-2)] w-8 h-8 rounded-full flex items-center justify-center mx-auto">
                      {cat.orden_visual}
                    </span>
                  </td>
                  <td className="py-5 pl-4 pr-8 text-right space-x-2">
                    <button
                      onClick={() => onEditar(cat)}
                      className="p-2 hover:bg-white/10 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all opacity-0 group-hover:opacity-100"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEliminar(cat)}
                      className="p-2 hover:bg-red-500/20 rounded-lg text-red-400/40 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Componente Principal ──────────────────────────────────────────────────────
export default function Categorias() {
  const { profile, loading: authLoading } = useAuthStore();
  const [currentTab, setCurrentTab] = useState('categorias');
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState(null);

  const fetchCategorias = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categorias_productos')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('orden_visual', { ascending: true })
        .order('nombre', { ascending: true });
      if (error) throw error;
      setCategorias(data || []);
    } catch (err) {
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && profile?.tenant_id) fetchCategorias();
    else if (!authLoading && !profile?.tenant_id) setLoading(false);
  }, [authLoading, profile?.tenant_id]);

  const handleEditar = (cat) => {
    setEditando(cat);
    setCurrentTab('nueva');
  };

  const handleEliminar = async (cat) => {
    const tieneHijos = categorias.some(c => c.padre_id === cat.id);
    if (tieneHijos) {
      return toast.error('No puedes eliminar una categoría que tiene subcategorías. Elimina primero sus hijos.');
    }
    if (!confirm(`¿Eliminar la categoría "${cat.nombre}"? Esta acción no puede deshacerse.`)) return;
    try {
      const { error } = await supabase
        .from('categorias_productos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', cat.id);
      if (error) throw error;
      toast.success('Categoría eliminada');
      fetchCategorias();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const handleGuardado = () => {
    setEditando(null);
    fetchCategorias();
    setCurrentTab('categorias');
  };

  const handleCancelarEdicion = () => {
    setEditando(null);
    setCurrentTab('categorias');
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      {/* Cabecera */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter uppercase mb-2 flex items-center gap-3">
          <Tag className="h-7 w-7 text-[var(--color-primary)]" /> Categorías y Subcategorías
        </h1>
        <p className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">
          Organización de Productos y Piezas/Elementos del Catálogo
        </p>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Categorías Principales', value: categorias.filter(c => !c.padre_id).length, color: 'text-[var(--color-primary)]' },
          { label: 'Subcategorías', value: categorias.filter(c => c.padre_id).length, color: 'text-blue-400' },
          { label: 'Total Categorías', value: categorias.length, color: 'text-green-400' },
          { label: 'Aplicables a', value: 'Productos y Piezas', color: 'text-amber-400', isText: true },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-5 flex flex-col gap-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">{stat.label}</span>
            <span className={`text-2xl font-black ${stat.color} ${stat.isText ? 'text-sm' : ''}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* NavigBar */}
      <ModuleNavbar currentTab={currentTab} setTab={(t) => { if (t !== 'nueva') setEditando(null); setCurrentTab(t); }} />

      {/* Contenido */}
      {currentTab === 'categorias' && (
        <TablaCategorias
          categorias={categorias}
          soloSubcategorias={false}
          onEditar={handleEditar}
          onEliminar={handleEliminar}
          loading={loading}
        />
      )}

      {currentTab === 'subcategorias' && (
        <TablaCategorias
          categorias={categorias}
          soloSubcategorias={true}
          onEditar={handleEditar}
          onEliminar={handleEliminar}
          loading={loading}
        />
      )}

      {currentTab === 'nueva' && (
        <FormCategoria
          categoriasPadre={categorias}
          editando={editando}
          onGuardado={handleGuardado}
          onCancelar={editando ? handleCancelarEdicion : null}
          tenantId={profile?.tenant_id}
        />
      )}
    </div>
  );
}
