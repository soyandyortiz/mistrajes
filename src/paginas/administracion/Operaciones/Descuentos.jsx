import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'sonner';
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Percent } from 'lucide-react';

// ─── Formulario Nuevo Código ──────────────────────────────────────────────────
const FormNuevoCodigo = ({ tenantId, onGuardado }) => {
  const [form, setForm] = useState({ codigo: '', valor: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const codigo = form.codigo.trim().toUpperCase();
    if (!codigo) return toast.error('El código es obligatorio');
    const valor = parseFloat(form.valor);
    if (!valor || valor <= 0 || valor > 100)
      return toast.error('El valor debe ser un porcentaje entre 1 y 100');

    setLoading(true);
    try {
      const { error } = await supabase.from('cupones_descuento').insert([{
        tenant_id: tenantId,
        codigo,
        tipo_descuento: 'porcentaje',
        valor_descuento: valor,
        es_activo: true,
      }]);
      if (error) {
        if (error.code === '23505') return toast.error(`El código "${codigo}" ya existe`);
        throw error;
      }
      toast.success(`Código "${codigo}" creado con ${valor}% de descuento`);
      setForm({ codigo: '', valor: '' });
      onGuardado();
    } catch (err) {
      console.error(err);
      toast.error('Error al crear el código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl p-6 space-y-5">
      <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
        <Plus className="w-4 h-4 text-primary" /> Nuevo Código de Descuento
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Código */}
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
            Código <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            className="input-guambra uppercase font-mono"
            placeholder="EJ: VERANO20"
            value={form.codigo}
            maxLength={50}
            onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
          />
        </div>

        {/* Valor (%) */}
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
            Descuento (%) <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max="100"
              step="0.01"
              className="input-guambra pr-10"
              placeholder="10"
              value={form.valor}
              onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
            />
            <Percent className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="btn-guambra flex items-center gap-2 text-xs"
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Plus className="w-4 h-4" />}
          Crear Código
        </button>
      </div>
    </form>
  );
};

// ─── Tabla de Códigos ─────────────────────────────────────────────────────────
const TablaDescuentos = ({ codigos, cargando, onToggle, onEliminar }) => {
  if (cargando) {
    return (
      <div className="flex items-center justify-center h-40 text-[var(--text-muted)]">
        <Loader2 className="w-6 h-6 animate-spin mr-3" />
        <span className="text-xs font-bold uppercase tracking-widest">Cargando...</span>
      </div>
    );
  }

  if (codigos.length === 0) {
    return (
      <div className="h-40 border-2 border-dashed border-[var(--border-soft)] rounded-2xl flex flex-col items-center justify-center text-[var(--text-muted)]">
        <Tag className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-xs font-bold uppercase tracking-widest opacity-60">No hay códigos de descuento</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border-soft)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-soft)] bg-[var(--bg-surface-2)]">
            <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Código</th>
            <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Descuento</th>
            <th className="text-center px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Estado</th>
            <th className="text-right px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {codigos.map(c => (
            <tr key={c.id} className="border-b border-[var(--border-soft)] last:border-0 hover:bg-[var(--bg-surface-2)] transition-colors">
              <td className="px-5 py-4">
                <span className="font-mono font-black text-sm text-[var(--text-primary)] bg-[var(--bg-surface-3)] px-3 py-1 rounded-lg border border-[var(--border-soft)]">
                  {c.codigo}
                </span>
              </td>
              <td className="px-5 py-4">
                <span className="font-black text-primary text-lg">{c.valor_descuento}%</span>
              </td>
              <td className="px-5 py-4 text-center">
                <button
                  onClick={() => onToggle(c)}
                  title={c.es_activo ? 'Desactivar código' : 'Activar código'}
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors"
                  style={{ color: c.es_activo ? 'var(--color-success, #4ade80)' : 'var(--text-muted)' }}
                >
                  {c.es_activo
                    ? <ToggleRight className="w-6 h-6" />
                    : <ToggleLeft className="w-6 h-6" />}
                  {c.es_activo ? 'Activo' : 'Inactivo'}
                </button>
              </td>
              <td className="px-5 py-4 text-right">
                <button
                  onClick={() => onEliminar(c)}
                  title="Eliminar código"
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Descuentos() {
  const { profile } = useAuthStore();
  const [codigos, setCodigos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargarCodigos = async () => {
    if (!profile?.tenant_id) return;
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('cupones_descuento')
        .select('id, codigo, valor_descuento, es_activo, created_at')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCodigos(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar los códigos de descuento');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCodigos();
  }, [profile?.tenant_id]);

  const handleToggle = async (cupon) => {
    const nuevoEstado = !cupon.es_activo;
    try {
      const { error } = await supabase
        .from('cupones_descuento')
        .update({ es_activo: nuevoEstado })
        .eq('id', cupon.id);
      if (error) throw error;
      setCodigos(prev => prev.map(c => c.id === cupon.id ? { ...c, es_activo: nuevoEstado } : c));
      toast.success(`Código "${cupon.codigo}" ${nuevoEstado ? 'activado' : 'desactivado'}`);
    } catch (err) {
      console.error(err);
      toast.error('Error al actualizar el estado');
    }
  };

  const handleEliminar = async (cupon) => {
    if (!window.confirm(`¿Eliminar el código "${cupon.codigo}"? Esta acción no se puede deshacer.`)) return;
    try {
      const { error } = await supabase
        .from('cupones_descuento')
        .delete()
        .eq('id', cupon.id);
      if (error) throw error;
      setCodigos(prev => prev.filter(c => c.id !== cupon.id));
      toast.success(`Código "${cupon.codigo}" eliminado`);
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar el código');
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-5xl">
      {/* Encabezado informativo */}
      <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5 flex items-start gap-4">
        <Tag className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)] mb-1">
            Códigos de Descuento en Porcentaje
          </p>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Crea códigos que tus clientes pueden presentar al momento del contrato. El operador los ingresa
            en el <strong className="text-[var(--text-primary)]">Paso 4 (Precio y Pago)</strong> al crear un nuevo contrato.
            Actívalos o desactívalos en cualquier momento sin eliminarlos.
          </p>
        </div>
      </div>

      {/* Formulario nuevo código */}
      <FormNuevoCodigo tenantId={profile?.tenant_id} onGuardado={cargarCodigos} />

      {/* Lista de códigos */}
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Códigos existentes ({codigos.length})
        </h3>
        <TablaDescuentos
          codigos={codigos}
          cargando={cargando}
          onToggle={handleToggle}
          onEliminar={handleEliminar}
        />
      </div>
    </div>
  );
}
