import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'sonner';
import { 
  Plus, Search, Edit2, Trash2, Eye, Image as ImageIcon, 
  Upload, X, PackagePlus, Box, AlertTriangle, Loader2
} from 'lucide-react';

// Categorías se cargan dinámicamente desde Supabase
const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'Estándar'];
const BUCKET_NAME = 'piezas-imagenes'; // Nombre del bucket en Supabase Storage

const ModuleNavbar = ({ currentTab, setTab }) => (
  <div className="border-b border-[var(--border-soft)] pb-px mb-8 overflow-x-auto no-scrollbar">
    <nav className="-mb-px flex gap-6">
      <button onClick={() => setTab('activas')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all ${currentTab === 'activas' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'}`}>Piezas Activas</button>
      <button onClick={() => setTab('inactivas')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all ${currentTab === 'inactivas' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'}`}>Piezas Inactivas</button>
      <button onClick={() => setTab('nueva')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${currentTab === 'nueva' || currentTab === 'editar' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'}`}><Plus className="w-3 h-3"/> {currentTab === 'editar' ? 'Editar Pieza' : 'Nueva Pieza'}</button>
    </nav>
  </div>
);

export default function Piezas() {
  const { profile, loading: authLoading } = useAuthStore();
  const fileInputRef = useRef(null);
  
  const [currentTab, setTab] = useState('activas');
  const [piezas, setPiezas] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [searchName, setSearchName] = useState('');
  const [filterCat, setFilterCat] = useState('');

  // Formulario
  const initialForm = {
    id: null,
    nombre: '', 
    categoria_id: '',
    subcategoria_id: '',
    precio_unitario: '', 
    descuento: 0, 
    estado: 'activo',
    fotos: [],       // [{file?, url, name, isNew, id?}]
    tallas: DEFAULT_SIZES.map(t => ({ talla: t, stock: 0 }))
  };
  const [formData, setFormData] = useState(initialForm);
  const [isProcessing, setIsProcessing] = useState(false);
  const [nuevaTallaTexto, setNuevaTallaTexto] = useState('');

  // Categorías reales desde Supabase
  const [categorias, setCategorias] = useState([]);

  // ──────────────────────────────────────────────
  // FETCH CATEGORÍAS
  // ──────────────────────────────────────────────
  const fetchCategorias = async () => {
    try {
      const { data } = await supabase
        .from('categorias_productos')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('orden_visual', { ascending: true })
        .order('nombre', { ascending: true });
      setCategorias(data || []);
    } catch { /* silencioso */ }
  };

  // ──────────────────────────────────────────────
  // FETCH PIEZAS — incluye stock e imágenes desde tablas relacionadas
  // ──────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1) Traer piezas base
      const { data: piezasData, error } = await supabase
        .from('piezas')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ids = (piezasData || []).map(p => p.id);
      if (ids.length === 0) {
        setPiezas([]);
        return;
      }

      // 2) Traer stock de todas las piezas
      const { data: stockData } = await supabase
        .from('stock_piezas')
        .select('*')
        .in('pieza_id', ids)
        .eq('tenant_id', profile.tenant_id);

      // 3) Traer imágenes de todas las piezas
      const { data: imagenesData } = await supabase
        .from('imagenes_piezas')
        .select('*')
        .in('pieza_id', ids)
        .eq('tenant_id', profile.tenant_id)
        .order('orden_visual', { ascending: true });

      // 4) Combinar resultados
      const parsed = (piezasData || []).map(p => ({
        ...p,
        tallas: (stockData || [])
          .filter(s => s.pieza_id === p.id)
          .map(s => ({ id: s.id, talla: s.etiqueta_talla, stock: s.stock_total })),
        fotos: (imagenesData || [])
          .filter(img => img.pieza_id === p.id)
          .map(img => ({ id: img.id, url: img.url, name: img.url, isNew: false })),
        descuento: p.porcentaje_descuento || 0,
      }));

      setPiezas(parsed);
    } catch (e) {
      toast.error('Error cargando inventario de piezas');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchData();
      fetchCategorias();
    }
  }, [profile]);

  // Derivados
  const categoriasPrincipales = categorias.filter(c => !c.padre_id);
  const subcategorias = categorias.filter(c => c.padre_id === formData.categoria_id);

  // ──────────────────────────────────────────────
  // MANEJADORES FORMULARIO
  // ──────────────────────────────────────────────
  const handleChange = (field, val) => {
    setFormData(prev => {
      const nw = { ...prev, [field]: val };
      if (field === 'categoria_id') nw.subcategoria_id = '';
      return nw;
    });
  };

  /** Convierte cualquier imagen a WebP vía Canvas API (sin librerías) */
  const convertirAWebP = (file, calidad = 0.85) => new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => blob
          ? resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }))
          : reject(new Error('No se pudo convertir la imagen')),
        'image/webp',
        calidad
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Imagen inválida')); };
    img.src = objectUrl;
  });

  const addFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (formData.fotos.length >= 1) return toast.error('Solo se permite 1 foto por elemento/pieza');
    if (file.size > 5 * 1024 * 1024) return toast.error('La imagen supera el límite de 5 MB');
    try {
      const webp = await convertirAWebP(file);
      setFormData(prev => ({ ...prev, fotos: [{ file: webp, url: URL.createObjectURL(webp), name: webp.name, isNew: true }] }));
    } catch {
      toast.error('No se pudo procesar la imagen');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFoto = (idx) => {
    setFormData(prev => {
      const arr = [...prev.fotos];
      arr.splice(idx, 1);
      return { ...prev, fotos: arr };
    });
  };

  const handleStockChange = (idx, val) => {
    setFormData(prev => {
      const act = [...prev.tallas];
      act[idx] = { ...act[idx], stock: parseInt(val, 10) || 0 };
      return { ...prev, tallas: act };
    });
  };

  const agregarTallaPersonalizada = () => {
    if (!nuevaTallaTexto.trim()) return;
    if (formData.tallas.find(t => t.talla.toLowerCase() === nuevaTallaTexto.trim().toLowerCase()))
      return toast.error('La talla ya existe');
    setFormData(prev => ({
      ...prev,
      tallas: [...prev.tallas, { talla: nuevaTallaTexto.trim(), stock: 0 }]
    }));
    setNuevaTallaTexto('');
  };

  const eliminarTalla = (idx) => {
    setFormData(prev => {
      const act = [...prev.tallas];
      act.splice(idx, 1);
      return { ...prev, tallas: act };
    });
  };

  // ──────────────────────────────────────────────
  // HELPERS: STORAGE
  // ──────────────────────────────────────────────

  /**
   * Asegura que el bucket exista (public bucket).
   * Si no existe lo crea; si ya existe, ignora el error.
   */
  const ensureBucket = async () => {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = (buckets || []).find(b => b.name === BUCKET_NAME);
    if (!exists) {
      await supabase.storage.createBucket(BUCKET_NAME, { public: true });
    }
  };

  /**
   * Sube un archivo al bucket y retorna la URL pública.
   */
  const uploadImage = async (file, piezaId) => {
    await ensureBucket();
    const ext = file.name.split('.').pop();
    const path = `${profile.tenant_id}/${piezaId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
      upsert: false,
      contentType: file.type,
    });
    if (error) throw new Error(`Error subiendo imagen: ${error.message}`);
    const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
    return publicUrl;
  };

  // ──────────────────────────────────────────────
  // GUARDAR PIEZA (INSERT o UPDATE)
  // ──────────────────────────────────────────────
  const guardarPieza = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      if (!formData.categoria_id) throw new Error('Debe seleccionar una categoría principal');
      if (formData.tallas.length === 0) throw new Error('Debe tener al menos una talla registrada');

      const totalStock = formData.tallas.reduce((acc, t) => acc + t.stock, 0);
      if (totalStock === 0 && formData.estado === 'activo')
        toast.info('Aviso: La pieza no tiene stock configurado.');

      // ── 1. GUARDAR / ACTUALIZAR PIEZA BASE ──
      const payload = {
        tenant_id: profile.tenant_id,
        nombre: formData.nombre,
        categoria_id: formData.subcategoria_id || formData.categoria_id || null,
        precio_unitario: parseFloat(formData.precio_unitario) || 0,
        porcentaje_descuento: parseFloat(formData.descuento) || 0,
        estado: formData.estado,
        updated_at: new Date().toISOString(),
        actualizado_por: profile.id,
      };

      let piezaId = formData.id;

      if (piezaId) {
        const { error } = await supabase.from('piezas').update(payload).eq('id', piezaId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('piezas')
          .insert([{ ...payload, creado_por: profile.id }])
          .select('id')
          .single();
        if (error) throw error;
        piezaId = data.id;
      }

      // ── 2. GUARDAR STOCK EN stock_piezas ──
      // Borrar stock anterior y re-insertar (upsert por etiqueta)
      await supabase.from('stock_piezas').delete().eq('pieza_id', piezaId).eq('tenant_id', profile.tenant_id);

      const stockRows = formData.tallas.map(t => ({
        pieza_id: piezaId,
        tenant_id: profile.tenant_id,
        etiqueta_talla: t.talla,
        stock_total: t.stock,
        es_estandar: DEFAULT_SIZES.includes(t.talla),
      }));

      if (stockRows.length > 0) {
        const { error: stockError } = await supabase.from('stock_piezas').insert(stockRows);
        if (stockError) throw new Error(`Error guardando stock: ${stockError.message}`);
      }

      // ── 3. GUARDAR IMÁGENES ──
      // a) Eliminar imágenes que el usuario quitó (las que ya existían pero no están en formData)
      if (formData.id) {
        const keepIds = formData.fotos.filter(f => !f.isNew && f.id).map(f => f.id);
        // Obtener todas las imágenes actuales de esta pieza
        const { data: existingImgs } = await supabase
          .from('imagenes_piezas')
          .select('id')
          .eq('pieza_id', piezaId)
          .eq('tenant_id', profile.tenant_id);
        
        const toDelete = (existingImgs || []).filter(img => !keepIds.includes(img.id)).map(img => img.id);
        if (toDelete.length > 0) {
          await supabase.from('imagenes_piezas').delete().in('id', toDelete);
        }
      }

      // b) Subir imágenes nuevas y registrarlas
      const newFotos = formData.fotos.filter(f => f.isNew && f.file);
      const existingFotos = formData.fotos.filter(f => !f.isNew && f.id);
      const startOrder = existingFotos.length;

      for (let i = 0; i < newFotos.length; i++) {
        const foto = newFotos[i];
        try {
          const publicUrl = await uploadImage(foto.file, piezaId);
          const { error: imgError } = await supabase.from('imagenes_piezas').insert([{
            pieza_id: piezaId,
            tenant_id: profile.tenant_id,
            url: publicUrl,
            orden_visual: startOrder + i,
          }]);
          if (imgError) throw imgError;
        } catch (imgErr) {
          toast.warning(`No se pudo subir la imagen "${foto.name}": ${imgErr.message}`);
        }
      }

      toast.success(formData.id ? 'Pieza actualizada correctamente' : 'Nueva pieza creada exitosamente');
      setFormData(initialForm);
      setTab('activas');
      fetchData();

    } catch (err) {
      toast.error(err.message || 'Error guardando la pieza');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // ──────────────────────────────────────────────
  // EDITAR — carga los datos incluyendo stock e imágenes
  // ──────────────────────────────────────────────
  const editar = (p) => {
    // Detectar si la categoría guardada es una subcategoría
    const esSub = categorias.find(c => c.id === p.categoria_id && c.padre_id);
    setFormData({
      id: p.id,
      nombre: p.nombre,
      categoria_id: esSub ? esSub.padre_id : (p.categoria_id || ''),
      subcategoria_id: esSub ? p.categoria_id : '',
      precio_unitario: p.precio_unitario || '',
      descuento: p.porcentaje_descuento || 0,
      estado: p.estado || 'activo',
      fotos: (p.fotos || []).map(f => ({ ...f, isNew: false })),
      tallas: p.tallas?.length > 0
        ? p.tallas
        : DEFAULT_SIZES.map(t => ({ talla: t, stock: 0 })),
    });
    setTab('editar');
  };

  const cambiarEstado = async (id, estActual) => {
    const nw = estActual === 'activo' ? 'inactivo' : 'activo';
    try {
      await supabase.from('piezas').update({ estado: nw }).eq('id', id);
      toast.success(`Pieza movida a ${nw}s`);
      fetchData();
    } catch (e) {
      toast.error('Error actualizando estado');
    }
  };

  const softDelete = async (id) => {
    if (!confirm('¿Seguro quieres eliminar esta pieza? El historial de alquileres no se afectará.')) return;
    try {
      await supabase.from('piezas').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      toast.success('Pieza eliminada');
      fetchData();
    } catch (e) {
      toast.error('Error al eliminar');
    }
  };

  // ──────────────────────────────────────────────
  // RENDER FILTRADO
  // ──────────────────────────────────────────────
  const listaFiltrada = piezas.filter(p => {
    if (currentTab === 'activas' && p.estado !== 'activo') return false;
    if (currentTab === 'inactivas' && p.estado !== 'inactivo') return false;
    if (searchName && !p.nombre.toLowerCase().includes(searchName.toLowerCase())) return false;
    if (filterCat && p.categoria_id !== filterCat) return false;
    return true;
  });

  const getNombreCategoria = (catId) => {
    const cat = categorias.find(c => c.id === catId);
    if (!cat) return '';
    if (cat.padre_id) {
      const padre = categorias.find(c => c.id === cat.padre_id);
      return padre ? `${padre.nombre} › ${cat.nombre}` : cat.nombre;
    }
    return cat.nombre;
  };

  // ──────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────
  return (
    <div className="animate-in fade-in duration-500 pb-20">
       <ModuleNavbar currentTab={currentTab} setTab={(t) => { if (t === 'nueva') setFormData(initialForm); setTab(t); }} />

       {/* VISTA LISTADO */}
       {(currentTab === 'activas' || currentTab === 'inactivas') && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4">
              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-[7fr_3fr] gap-3 bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl p-3">
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
                    <input type="text" className="input-guambra input-guambra-search h-12 w-full text-sm" placeholder="Buscar por nombre de pieza..." value={searchName} onChange={e => setSearchName(e.target.value)} />
                 </div>
                 <select className="input-guambra h-12 w-full text-sm" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                    <option value="">Todas las Categorías</option>
                    {categoriasPrincipales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    {categorias.filter(c => c.padre_id).map(c => <option key={c.id} value={c.id}>↳ {c.nombre}</option>)}
                 </select>
              </div>

              {/* Tabla */}
              <div className="glass-card overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)]">
                          <tr>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Foto</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Pieza y Familia</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Precio Ref.</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Tallas / Stock</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Estado</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Acciones</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-[var(--border-soft)]">
                          {loading ? (
                             <tr><td colSpan="6" className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--color-primary)]" /></td></tr>
                          ) : listaFiltrada.length === 0 ? (
                             <tr><td colSpan="6" className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">No se encontraron piezas en este estado</td></tr>
                          ) : listaFiltrada.map(p => (
                             <tr key={p.id} className="hover:bg-[var(--bg-surface-2)] transition-colors group">
                                <td className="p-4">
                                   <div className="w-12 h-12 rounded-xl bg-black/50 border border-[var(--border-soft)] flex items-center justify-center overflow-hidden">
                                       {p.fotos?.[0]?.url ? 
                                          <img src={p.fotos[0].url} alt={p.nombre} className="w-full h-full object-cover" /> : 
                                          <ImageIcon className="w-4 h-4 text-[var(--text-muted)]"/>
                                       }
                                   </div>
                                </td>
                                 <td className="p-4">
                                    <p className="font-bold text-[var(--text-primary)] text-sm">{p.nombre}</p>
                                    <p className="text-[9px] font-bold tracking-widest uppercase text-[var(--text-muted)] mt-1">{getNombreCategoria(p.categoria_id)}</p>
                                 </td>
                                <td className="p-4 text-right">
                                   <p className="font-mono font-black text-primary text-sm">${parseFloat(p.precio_unitario || 0).toFixed(2)}</p>
                                   {p.descuento > 0 && <span className="text-[9px] text-green-400 font-bold">-{p.descuento}% OFF</span>}
                                </td>
                                 <td className="p-4">
                                    <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                       {p.tallas?.filter(t => t.stock > 0).slice(0, 4).map(t => (
                                           <span key={t.talla} className="inline-flex items-center gap-1 text-[10px] font-bold bg-[var(--bg-surface-2)] border border-[var(--border-soft)] px-2 py-0.5 rounded-md text-[var(--text-secondary)]">
                                             <span className="font-black text-[var(--text-primary)]">{t.talla}</span>
                                             <span className="text-[var(--text-muted)]">:{t.stock}</span>
                                           </span>
                                       ))}
                                       {p.tallas?.filter(t => t.stock > 0).length > 4 && (
                                         <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-surface-2)] border border-[var(--border-soft)] px-1.5 py-0.5 rounded-md">
                                           +{p.tallas.filter(t => t.stock > 0).length - 4}
                                         </span>
                                       )}
                                       {(!p.tallas || p.tallas.filter(t => t.stock > 0).length === 0) && (
                                         <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md uppercase tracking-widest">Agotado</span>
                                       )}
                                    </div>
                                 </td>
                                <td className="p-4 text-center">
                                   <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.2em] border ${p.estado === 'activo' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                      {p.estado}
                                   </span>
                                </td>
                                <td className="p-4 text-right space-x-2">
                                   <button onClick={() => editar(p)} className="p-2 hover:bg-[var(--bg-surface-2)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all" title="Editar"><Edit2 className="w-4 h-4"/></button>
                                   <button onClick={() => cambiarEstado(p.id, p.estado)} title={p.estado === 'activo' ? 'Desactivar' : 'Activar'} className="p-2 hover:bg-[var(--bg-surface-2)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
                                      <PackagePlus className={`w-4 h-4 ${p.estado !== 'activo' ? '' : 'opacity-50'}`}/>
                                   </button>
                                   <button onClick={() => softDelete(p.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-500/50 hover:text-red-500 transition-all" title="Eliminar"><Trash2 className="w-4 h-4"/></button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
       )}

       {/* VISTA NUEVA / EDITAR */}
       {(currentTab === 'nueva' || currentTab === 'editar') && (
           <form onSubmit={guardarPieza} className="glass-card p-6 md:p-10 animate-in slide-in-from-right-4 space-y-10">
               
               {/* 1. Datos Básicos */}
               <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)] mb-6 border-b border-[var(--color-primary)]/20 pb-4 flex items-center gap-3"><Box className="w-5 h-5"/> 1. Ficha del Elemento</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)] mb-2 block">Nombre de la pieza <span className="text-red-400">*</span></label>
                         <input required type="text" className="input-guambra text-lg h-12" value={formData.nombre} onChange={e => handleChange('nombre', e.target.value)} />
                      </div>

                       <div>
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)] mb-2 block">Categoría <span className="text-red-400">*</span></label>
                          <select required className="input-guambra h-12" value={formData.categoria_id} onChange={e => handleChange('categoria_id', e.target.value)}>
                             <option value="">Seleccione una categoría...</option>
                             {categoriasPrincipales.length === 0
                               ? <option disabled>Sin categorías — crea en el módulo Categorías</option>
                               : categoriasPrincipales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)
                             }
                          </select>
                       </div>

                       <div>
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)] mb-2 block">Subcategoría <span className="text-[var(--text-muted)] text-[8px] ml-1">(Opcional)</span></label>
                          <select className="input-guambra h-12" value={formData.subcategoria_id} onChange={e => handleChange('subcategoria_id', e.target.value)} disabled={!formData.categoria_id || subcategorias.length === 0}>
                             <option value="">{subcategorias.length === 0 ? 'Sin subcategorías para esta categoría' : 'Seleccione si aplica...'}</option>
                             {subcategorias.map(sc => <option key={sc.id} value={sc.id}>{sc.nombre}</option>)}
                          </select>
                       </div>
                  </div>
               </div>

               {/* 2. Precios y Estado */}
               <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)] mb-6 border-b border-[var(--color-primary)]/20 pb-4">2. Financiero y Estado</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)] mb-2 block">Precio Unitario Ref. ($) <span className="text-red-400">*</span></label>
                         <input required type="number" step="0.01" min="0" className="input-guambra font-mono text-xl text-[var(--color-primary)]" value={formData.precio_unitario} onChange={e => handleChange('precio_unitario', e.target.value)} />
                      </div>
                      <div>
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)] mb-2 block">Descuento (%) <span className="text-[var(--text-muted)] text-[8px] ml-1">Individual</span></label>
                         <input type="number" min="0" max="100" className="input-guambra font-mono" value={formData.descuento} onChange={e => handleChange('descuento', e.target.value)} />
                      </div>
                      <div>
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)] mb-2 block">Estado Operativo <span className="text-red-400">*</span></label>
                         <div className="flex bg-[var(--bg-input)] border border-[var(--border-soft)] p-1 rounded-xl">
                            <button type="button" onClick={() => handleChange('estado', 'activo')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${formData.estado === 'activo' ? 'bg-green-500/20 text-green-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Activo</button>
                            <button type="button" onClick={() => handleChange('estado', 'inactivo')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${formData.estado === 'inactivo' ? 'bg-red-500/20 text-red-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Inactivo</button>
                         </div>
                      </div>
                  </div>
               </div>

               {/* 3. Fotos */}
               <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)] mb-6 border-b border-[var(--color-primary)]/20 pb-4">3. Foto del Elemento (Máx 1)</h3>

                  <div className="flex gap-4 items-start">
                     {formData.fotos.map((f, idx) => (
                         <div key={idx} className="w-32 h-32 bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl relative group overflow-hidden flex-shrink-0">
                             <img src={f.url} alt="" className="w-full h-full object-cover" />
                             {f.isNew && (
                               <div className="absolute bottom-1 left-1 bg-[var(--color-primary)]/80 text-[8px] font-black text-white px-1.5 py-0.5 rounded uppercase tracking-wide">Nueva</div>
                             )}
                             <button type="button" onClick={() => removeFoto(idx)} className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0"><X className="w-3 h-3"/></button>
                         </div>
                     ))}

                     {formData.fotos.length < 1 && (
                         <div onClick={() => fileInputRef.current?.click()} className="w-32 h-32 bg-[var(--bg-surface-2)] border-2 border-dashed border-[var(--border-soft)] rounded-2xl flex flex-col items-center justify-center text-[var(--text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all cursor-pointer flex-shrink-0">
                             <Upload className="w-6 h-6 mb-2"/>
                             <span className="text-[9px] font-black uppercase tracking-widest text-center px-2">Subir Foto</span>
                         </div>
                     )}
                     <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={addFoto}/>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-3">Solo se permite <strong>1 foto</strong> por elemento. Tamaño máximo: <strong>5 MB</strong>. Formatos: JPG, PNG, WEBP.</p>
               </div>

               {/* 4. Tallas y Stock */}
               <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)] mb-6 border-b border-[var(--color-primary)]/20 pb-4">4. Dimensionamiento y Bodega</h3>
                  
                  <div className="glass-card mt-4 overflow-hidden">
                     <table className="w-full text-left">
                        <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)]">
                           <tr>
                              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] w-1/2">Variante / Talla</th>
                              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] w-1/3 text-center">Stock Físico (Bodega)</th>
                              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Acciones</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-soft)]">
                           {formData.tallas.map((t, idx) => (
                               <tr key={idx} className="hover:bg-[var(--bg-surface-2)]">
                                   <td className="p-4 font-bold text-[var(--text-primary)]">
                                       <div className="flex items-center gap-3">
                                           <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-[11px] font-black text-[var(--color-primary)] uppercase tracking-wide">{t.talla.substring(0,2)}</div>
                                           <span className="text-sm font-bold text-[var(--text-primary)]">{t.talla}</span>
                                       </div>
                                   </td>
                                  <td className="p-4 text-center">
                                     <input
                                         type="number"
                                         min="0"
                                         className="w-24 bg-[var(--bg-input)] border border-[var(--border-soft)] rounded-lg px-3 py-2 text-center text-[var(--text-primary)] font-mono font-black placeholder-[var(--text-muted)] focus:border-primary focus:outline-none" 
                                         value={t.stock} 
                                         onChange={e => handleStockChange(idx, e.target.value)}
                                     />
                                  </td>
                                  <td className="p-4 text-right">
                                     <button type="button" onClick={() => eliminarTalla(idx)} className="btn-guambra-secondary bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20 !px-4">Eliminar</button>
                                  </td>
                               </tr>
                           ))}
                           
                           {/* Añadir talla personalizada */}
                           <tr className="bg-primary/5">
                              <td className="p-4">
                                  <input 
                                      type="text" 
                                      className="input-guambra !h-10 text-sm" 
                                      placeholder="Ej: XXL, 42, Especial..." 
                                      value={nuevaTallaTexto}
                                      onChange={e => setNuevaTallaTexto(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), agregarTallaPersonalizada())}
                                  />
                              </td>
                              <td className="p-4 text-center">
                                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Se iniciará en 0</span>
                              </td>
                              <td className="p-4 text-right">
                                  <button type="button" onClick={agregarTallaPersonalizada} className="btn-guambra-primary !px-4 !h-10 text-xs">Añadir Talla</button>
                              </td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               </div>

               <div className="pt-8 border-t border-[var(--border-soft)] flex justify-end gap-4">
                   <button type="button" onClick={() => setTab('activas')} className="btn-guambra-secondary !px-8 h-14">Cancelar</button>
                   <button type="submit" disabled={isProcessing} className="btn-guambra-primary !px-10 h-14 text-sm disabled:opacity-50 flex items-center gap-3">
                       {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin"/> Guardando...</> : 'Guardar Ficha Técnica'}
                   </button>
               </div>
           </form>
       )}
    </div>
  );
}
