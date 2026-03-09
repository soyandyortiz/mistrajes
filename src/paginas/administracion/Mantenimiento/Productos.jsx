import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'sonner';
import { 
  Package, Search, Plus, Trash2, Edit2, Eye, Image as ImageIcon,
  Shirt, Link as LinkIcon, AlertTriangle, Upload, X, Loader2
} from 'lucide-react';

// Categorías se cargan dinámicamente desde Supabase
const BUCKET_PRODUCTOS = 'productos-imagenes';
const ModuleNavbar = ({ currentTab, setTab }) => (
  <div className="border-b border-[var(--border-soft)] pb-px mb-8 overflow-x-auto no-scrollbar">
    <nav className="-mb-px flex gap-6">
      <button onClick={() => setTab('activos')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all ${currentTab === 'activos' ? 'border-primary text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-white/20'}`}>Productos Activos</button>
      <button onClick={() => setTab('inactivos')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all ${currentTab === 'inactivos' ? 'border-primary text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-white/20'}`}>Productos Inactivos</button>
      <button onClick={() => setTab('nuevo')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${currentTab === 'nuevo' || currentTab === 'editar' ? 'border-primary text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-white/20'}`}><Plus className="w-3 h-3"/> {currentTab === 'editar' ? 'Editar Producto' : 'Nuevo Producto'}</button>
    </nav>
  </div>
);

export default function Productos() {
  const { profile, loading: authLoading } = useAuthStore();
  const fileInputRef = useRef(null);
  
  const [currentTab, setTab] = useState('activos'); // 'activos' | 'inactivos' | 'nuevo' | 'editar'
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchName, setSearchName] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterSubCat, setFilterSubCat] = useState('');

  // Form
  const initialForm = {
    id: null,
    nombre: '', descripcion: '', 
    categoria_id: '',
    subcategoria_id: '',
    precio_unitario: '', descuento: 0, estado: 'activo',
    fotos: [], piezas: [], relacionados: []
  };
  const [formData, setFormData] = useState(initialForm);
  const [isProcessing, setIsProcessing] = useState(false);

  // Categorías reales desde Supabase
  const [categorias, setCategorias] = useState([]);

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

  // Estado buscadores — conectado a Supabase
  const [busquedaPieza, setBusquedaPieza] = useState('');
  const [resultadosPiezas, setResultadosPiezas] = useState([]);
  const [busquedandoPieza, setBusquedandoPieza] = useState(false);
  const [busquedaRel, setBusquedaRel] = useState('');
  const [resultadosRel, setResultadosRel] = useState([]);
  const [busquedandoRel, setBusquedandoRel] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*, categorias_productos_map(categoria_id)')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ids = (data || []).map(p => p.id);
      let imagenesMap = {};
      let piezasMap = {};
      let relacionadosMap = {};

      if (ids.length > 0) {
        // Imágenes
        const { data: imgs } = await supabase
          .from('imagenes_productos')
          .select('*')
          .in('producto_id', ids)
          .eq('tenant_id', profile.tenant_id)
          .order('orden_visual', { ascending: true });
        (imgs || []).forEach(img => {
          if (!imagenesMap[img.producto_id]) imagenesMap[img.producto_id] = [];
          imagenesMap[img.producto_id].push({ id: img.id, url: img.url, name: img.url, isNew: false });
        });

        // Piezas vinculadas (piezas_producto → piezas)
        const { data: ppRows } = await supabase
          .from('piezas_producto')
          .select('producto_id, orden_visual, pieza:pieza_id(id, nombre)')
          .in('producto_id', ids)
          .eq('tenant_id', profile.tenant_id)
          .order('orden_visual', { ascending: true });
        (ppRows || []).forEach(row => {
          if (!piezasMap[row.producto_id]) piezasMap[row.producto_id] = [];
          if (row.pieza) piezasMap[row.producto_id].push(row.pieza);
        });

        // Imágenes de piezas para mostrar thumbnail
        const piezaIds = [...new Set((ppRows || []).map(r => r.pieza?.id).filter(Boolean))];
        let piezaImgMap = {};
        if (piezaIds.length > 0) {
          const { data: pImgs } = await supabase
            .from('imagenes_piezas')
            .select('pieza_id, url')
            .in('pieza_id', piezaIds)
            .order('orden_visual', { ascending: true });
          (pImgs || []).forEach(pi => {
            if (!piezaImgMap[pi.pieza_id]) piezaImgMap[pi.pieza_id] = pi.url;
          });
        }
        // Agregar foto al objeto pieza en el mapa
        Object.keys(piezasMap).forEach(productoId => {
          piezasMap[productoId] = piezasMap[productoId].map(pz => ({
            ...pz,
            foto: piezaImgMap[pz.id] || null,
          }));
        });

        // Relacionados (productos_relacionados → productos)
        const { data: relRows } = await supabase
          .from('productos_relacionados')
          .select('producto_id, orden_visual, relacionado:producto_relacionado_id(id, nombre)')
          .in('producto_id', ids)
          .eq('tenant_id', profile.tenant_id)
          .order('orden_visual', { ascending: true });
        (relRows || []).forEach(row => {
          if (!relacionadosMap[row.producto_id]) relacionadosMap[row.producto_id] = [];
          if (row.relacionado) relacionadosMap[row.producto_id].push(row.relacionado);
        });
      }

      const parsedData = (data || []).map(p => ({
        ...p,
        categoria_id: p.categorias_productos_map?.[0]?.categoria_id || null,
        fotos: imagenesMap[p.id] || [],
        piezas: piezasMap[p.id] || [],
        relacionados: relacionadosMap[p.id] || [],
        descuento: p.porcentaje_descuento || 0,
      }));

      setProductos(parsedData);
    } catch (e) {
      toast.error('Error cargando inventario');
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

  // Categorías principales (sin padre_id)
  const categoriasPrincipales = categorias.filter(c => !c.padre_id);
  // Subcategorías según categoría seleccionada
  const subcategoriasDisponibles = categorias.filter(c => c.padre_id === formData.categoria_id);

  // ──────────────────────────────────────────────
  // BUSCADOR DE PIEZAS — consulta real a Supabase
  // ──────────────────────────────────────────────
  const buscarPiezas = async (q) => {
    setBusquedaPieza(q);
    if (q.trim().length < 2) return setResultadosPiezas([]);
    setBusquedandoPieza(true);
    try {
      // Buscar piezas activas del tenant que coincidan con la búsqueda
      const { data, error } = await supabase
        .from('piezas')
        .select('id, nombre')
        .eq('tenant_id', profile.tenant_id)
        .eq('estado', 'activo')
        .is('deleted_at', null)
        .ilike('nombre', `%${q.trim()}%`)
        .limit(8);
      if (error) throw error;

      // Obtener primera imagen de cada pieza encontrada
      const piezaIds = (data || []).map(p => p.id);
      let imgMap = {};
      if (piezaIds.length > 0) {
        const { data: imgs } = await supabase
          .from('imagenes_piezas')
          .select('pieza_id, url')
          .in('pieza_id', piezaIds)
          .order('orden_visual', { ascending: true });
        (imgs || []).forEach(img => {
          if (!imgMap[img.pieza_id]) imgMap[img.pieza_id] = img.url;
        });
      }

      setResultadosPiezas(
        (data || []).map(p => ({ ...p, foto: imgMap[p.id] || null }))
      );
    } catch (err) {
      console.error('Error buscando piezas:', err);
      setResultadosPiezas([]);
    } finally {
      setBusquedandoPieza(false);
    }
  };

  // ──────────────────────────────────────────────
  // BUSCADOR DE PRODUCTOS RELACIONADOS — consulta real a Supabase
  // ──────────────────────────────────────────────
  const buscarRelacionados = async (q) => {
    setBusquedaRel(q);
    if (q.trim().length < 2) return setResultadosRel([]);
    setBusquedandoRel(true);
    try {
      let query = supabase
        .from('productos')
        .select('id, nombre')
        .eq('tenant_id', profile.tenant_id)
        .eq('estado', 'activo')
        .is('deleted_at', null)
        .ilike('nombre', `%${q.trim()}%`)
        .limit(8);
      // Excluir el producto actual si estamos editando
      if (formData.id) query = query.neq('id', formData.id);
      const { data, error } = await query;
      if (error) throw error;
      setResultadosRel(data || []);
    } catch (err) {
      console.error('Error buscando relacionados:', err);
      setResultadosRel([]);
    } finally {
      setBusquedandoRel(false);
    }
  };

  // -- ACCIONES DE FORMULARIO --
  const handleChange = (field, val) => {
      setFormData(prev => {
          const nw = {...prev, [field]: val};
          if(field === 'categoria_id') nw.subcategoria_id = '';
          return nw;
      });
  };

  
  const toggleArrayItem = (field, val) => {
     setFormData(prev => {
         const arr = [...prev[field]];
         const idx = arr.indexOf(val);
         if(idx >= 0) arr.splice(idx, 1);
         else arr.push(val);
         return {...prev, [field]: arr};
     });
  };

  const addFoto = (e) => {
    const files = Array.from(e.target.files);
    if (formData.fotos.length + files.length > 5) return toast.error('Máximo 5 fotos permitidas');
    const newFotos = files.map(f => ({
      file: f,
      url: URL.createObjectURL(f),
      name: f.name,
      isNew: true,
    }));
    setFormData(prev => ({ ...prev, fotos: [...prev.fotos, ...newFotos] }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Helpers Storage ──
  const ensureBucketProductos = async () => {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = (buckets || []).find(b => b.name === BUCKET_PRODUCTOS);
    if (!exists) {
      await supabase.storage.createBucket(BUCKET_PRODUCTOS, { public: true });
    }
  };

  const uploadImageProducto = async (file, productoId) => {
    await ensureBucketProductos();
    const ext = file.name.split('.').pop();
    const path = `${profile.tenant_id}/${productoId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET_PRODUCTOS).upload(path, file, {
      upsert: false,
      contentType: file.type,
    });
    if (error) throw new Error(`Error subiendo imagen: ${error.message}`);
    const { data: { publicUrl } } = supabase.storage.from(BUCKET_PRODUCTOS).getPublicUrl(path);
    return publicUrl;
  };

  const removeFoto = (idx) => {
      setFormData(prev => {
          const arr = [...prev.fotos];
          arr.splice(idx, 1);
          return {...prev, fotos: arr};
      });
  };

  const agregarPieza = (pieza) => {
    if (formData.piezas.find(x => x.id === pieza.id)) {
      toast.info('Esta pieza ya está vinculada');
      return;
    }
    setFormData(prev => ({ ...prev, piezas: [...prev.piezas, pieza] }));
    setBusquedaPieza('');
    setResultadosPiezas([]);
  };

  const agregarRelacionado = (producto) => {
    if (formData.relacionados.length >= 5) return toast.error('Máximo 5 productos relacionados');
    if (formData.relacionados.find(x => x.id === producto.id)) {
      toast.info('Este producto ya está agregado');
      return;
    }
    setFormData(prev => ({ ...prev, relacionados: [...prev.relacionados, { id: producto.id, nombre: producto.nombre }] }));
    setBusquedaRel('');
    setResultadosRel([]);
  };


  const guardarProducto = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      if (!formData.categoria_id) throw new Error('Debe seleccionar una categoría');

      const productoPayload = {
        tenant_id: profile.tenant_id,
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        precio_unitario: parseFloat(formData.precio_unitario) || 0,
        estado: formData.estado,
        porcentaje_descuento: parseFloat(formData.descuento) || 0,
        updated_at: new Date().toISOString(),
        actualizado_por: profile.id,
      };

      let productoId = formData.id;

      if (formData.id) {
        const { error } = await supabase.from('productos').update(productoPayload).eq('id', formData.id);
        if (error) throw error;
        await supabase.from('categorias_productos_map').delete().eq('producto_id', formData.id);
      } else {
        const { data, error } = await supabase
          .from('productos')
          .insert([{ ...productoPayload, creado_por: profile.id }])
          .select('id')
          .single();
        if (error) throw error;
        productoId = data.id;
      }

      // ── Categoría en el mapa ──
      const categoriaAGuardar = formData.subcategoria_id || formData.categoria_id;
      await supabase.from('categorias_productos_map').insert([
        { producto_id: productoId, categoria_id: categoriaAGuardar, tenant_id: profile.tenant_id }
      ]);

      // ── Piezas vinculadas: sincronizar piezas_producto ──
      // Borrar todas las relaciones previas y re-insertar las actuales
      await supabase
        .from('piezas_producto')
        .delete()
        .eq('producto_id', productoId)
        .eq('tenant_id', profile.tenant_id);

      if (formData.piezas.length > 0) {
        const piezasRows = formData.piezas.map((pz, idx) => ({
          producto_id: productoId,
          pieza_id: pz.id,
          tenant_id: profile.tenant_id,
          orden_visual: idx,
        }));
        const { error: pzError } = await supabase.from('piezas_producto').insert(piezasRows);
        if (pzError) console.error('Error guardando piezas vinculadas:', pzError);
      }

      // ── Relacionados: sincronizar productos_relacionados ──
      await supabase
        .from('productos_relacionados')
        .delete()
        .eq('producto_id', productoId)
        .eq('tenant_id', profile.tenant_id);

      if (formData.relacionados.length > 0) {
        const relRows = formData.relacionados.map((rel, idx) => ({
          producto_id: productoId,
          producto_relacionado_id: rel.id,
          tenant_id: profile.tenant_id,
          orden_visual: idx,
        }));
        const { error: relError } = await supabase.from('productos_relacionados').insert(relRows);
        if (relError) console.error('Error guardando relacionados:', relError);
      }

      // ── Imágenes: eliminar las removidas ──
      if (formData.id) {
        const keepIds = formData.fotos.filter(f => !f.isNew && f.id).map(f => f.id);
        const { data: existingImgs } = await supabase
          .from('imagenes_productos')
          .select('id')
          .eq('producto_id', productoId)
          .eq('tenant_id', profile.tenant_id);
        const toDelete = (existingImgs || []).filter(img => !keepIds.includes(img.id)).map(img => img.id);
        if (toDelete.length > 0) {
          await supabase.from('imagenes_productos').delete().in('id', toDelete);
        }
      }

      // ── Imágenes: subir las nuevas ──
      const newFotos = formData.fotos.filter(f => f.isNew && f.file);
      const existingFotos = formData.fotos.filter(f => !f.isNew && f.id);

      for (let i = 0; i < newFotos.length; i++) {
        const foto = newFotos[i];
        try {
          const publicUrl = await uploadImageProducto(foto.file, productoId);
          const { error: imgError } = await supabase.from('imagenes_productos').insert([{
            producto_id: productoId,
            tenant_id: profile.tenant_id,
            url: publicUrl,
            orden_visual: existingFotos.length + i,
          }]);
          if (imgError) throw imgError;
        } catch (imgErr) {
          toast.warning(`No se pudo subir "${foto.name}": ${imgErr.message}`);
        }
      }

      toast.success(formData.id ? 'Producto actualizado' : 'Producto creado exitosamente');
      setFormData(initialForm);
      setTab('activos');
      fetchData();

    } catch (err) {
      toast.error(err.message || 'Error guardando');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const editar = (p) => {
    // Detectar si la categoría guardada es una subcategoría
    const esSub = categorias.find(c => c.id === p.categoria_id && c.padre_id);
    setFormData({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      categoria_id: esSub ? esSub.padre_id : (p.categoria_id || ''),
      subcategoria_id: esSub ? p.categoria_id : '',
      precio_unitario: p.precio_unitario || '',
      descuento: p.porcentaje_descuento || 0,
      estado: p.estado || 'activo',
      fotos: (p.fotos || []).map(f => ({ ...f, isNew: false })),
      piezas: p.piezas || [],
      relacionados: p.relacionados || [],
    });
    setTab('editar');
  };

  const cambiarEstado = async (id, estActual) => {
      const nw = estActual === 'activo' ? 'inactivo' : 'activo';
      try {
          await supabase.from('productos').update({ estado: nw }).eq('id', id);
          if (nw === 'inactivo') toast.success('Producto inactivo, ya no visible en tienda en línea.');
          else toast.success('Producto activado');
          fetchData();
      } catch (e) {
          toast.error('Error cambiando estado');
      }
  };

  const softDelete = async (id) => {
      if(!confirm('¿Seguro quieres eliminar? Irá a papelera pero no afectará contratos pasados.')) return;
      try {
          await supabase.from('productos').update({ deleted_at: new Date() }).eq('id', id);
          toast.success('Producto eliminado del listado');
          fetchData();
      } catch (e) {
          toast.error('Error eliminando');
      }
  };


  // -- RENDER FILTRADO LISTA --
  const listaFiltrada = productos.filter(p => {
      if (currentTab === 'activos' && p.estado !== 'activo') return false;
      if (currentTab === 'inactivos' && p.estado !== 'inactivo') return false;
      if (searchName && !p.nombre.toLowerCase().includes(searchName.toLowerCase())) return false;
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


  return (
    <div className="animate-in fade-in duration-500 pb-20">
       <div className="mb-8">
           <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter uppercase mb-2">Inventario de Trajes</h1>
           <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">Gestión de Catálogo y Relaciones</p>
       </div>
       
       <ModuleNavbar currentTab={currentTab} setTab={(t) => { if(t === 'nuevo') setFormData(initialForm); setTab(t); }} />

       {/* VISTA LISTADO */}
       {(currentTab === 'activos' || currentTab === 'inactivos') && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4">
              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-[7fr_3fr] gap-3 bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl p-3">
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
                    <input type="text" className="input-guambra input-guambra-search h-12 w-full text-sm" placeholder="Buscar por nombre..." value={searchName} onChange={e => setSearchName(e.target.value)} />
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
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Nombre y Cat.</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Precios</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Piezas Vinc.</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Estado</th>
                             <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Acciones</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-[var(--border-soft)]">
                          {loading ? (
                             <tr><td colSpan="6" className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--color-primary)]" /></td></tr>
                          ) : listaFiltrada.length === 0 ? (
                             <tr><td colSpan="6" className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">No se encontraron productos en esta sección</td></tr>
                          ) : listaFiltrada.map(p => (
                             <tr key={p.id} className="hover:bg-[var(--bg-surface-2)] transition-colors group">
                                <td className="p-4">
                                   <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] flex items-center justify-center overflow-hidden">
                                       {(p.fotos && p.fotos[0]?.url) || p.imagen_url ? 
                                          <img src={p.fotos?.[0]?.url || p.imagen_url} className="w-full h-full object-cover" /> : 
                                          <ImageIcon className="w-4 h-4 text-[var(--text-muted)]"/>
                                       }
                                   </div>
                                </td>
                                 <td className="p-4">
<p className="font-bold text-[var(--text-primary)] text-sm">{p.nombre}</p>
                                    <p className="text-[9px] font-bold tracking-widest uppercase text-[var(--text-muted)] mt-1">{getNombreCategoria(p.categoria_id)}</p>
                                 </td>
                                <td className="p-4">
                                   <p className="font-mono font-black text-[var(--color-primary)] text-sm">${p.precio_unitario}</p>
                                   {p.descuento > 0 && <span className="text-[9px] text-green-400 font-bold bg-green-500/10 px-1.5 py-0.5 rounded-md">-{p.descuento}% OFF</span>}
                                </td>
                                <td className="p-4 text-center">
                                   <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-xs font-bold text-[var(--text-secondary)]">{p.piezas?.length || 0}</span>
                                </td>
                                <td className="p-4 text-center">
                                   <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.2em] border ${p.estado === 'activo' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                      {p.estado}
                                   </span>
                                </td>
                                <td className="p-4 text-right space-x-2">
                                   <button className="p-2 hover:bg-[var(--bg-surface-2)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"><Eye className="w-4 h-4"/></button>
                                   <button onClick={() => editar(p)} className="p-2 hover:bg-[var(--bg-surface-2)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"><Edit2 className="w-4 h-4"/></button>
                                   <button onClick={() => cambiarEstado(p.id, p.estado)} title="Activar/Desactivar" className="p-2 hover:bg-[var(--bg-surface-2)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
                                      {p.estado === 'activo' ? <Shirt className="w-4 h-4 opacity-50"/> : <Shirt className="w-4 h-4"/>}
                                   </button>
                                   <button onClick={() => softDelete(p.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-500/50 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4"/></button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
       )}

       {/* VISTA NUEVO / EDITAR */}
       {(currentTab === 'nuevo' || currentTab === 'editar') && (
           <form onSubmit={guardarProducto} className="glass-card p-6 md:p-10 animate-in slide-in-from-right-4 space-y-10">
               
               {/* 1. Datos Basicos */}
               <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)] mb-6 border-b border-[var(--color-primary)]/20 pb-4 flex items-center gap-3"><Package className="w-5 h-5"/> 1. Información Principal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Nombre del Producto / Traje <span className="text-red-400">*</span></label>
                         <input required type="text" className="input-guambra text-lg h-12" value={formData.nombre} onChange={e => handleChange('nombre', e.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Descripción Detallada <span className="text-red-400">*</span></label>
                         <textarea required className="input-guambra min-h-[120px]" value={formData.descripcion} onChange={e => handleChange('descripcion', e.target.value)}></textarea>
                      </div>

                       {/* Selector de Categoría y Subcategoría */}
                       <div>
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Categoría <span className="text-red-400">*</span></label>
                          <select required className="input-guambra h-12" value={formData.categoria_id} onChange={e => handleChange('categoria_id', e.target.value)}>
                             <option value="">Seleccione una categoría...</option>
                             {categoriasPrincipales.length === 0
                               ? <option disabled>Sin categorías — crea en el módulo Categorías</option>
                               : categoriasPrincipales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)
                             }
                          </select>
                       </div>

                       <div>
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Subcategoría <span className="text-[var(--text-muted)] text-[8px] ml-1">(Opcional)</span></label>
                          <select className="input-guambra h-12" value={formData.subcategoria_id} onChange={e => handleChange('subcategoria_id', e.target.value)} disabled={!formData.categoria_id || subcategoriasDisponibles.length === 0}>
                             <option value="">{subcategoriasDisponibles.length === 0 ? 'Sin subcategorías para esta categoría' : 'Seleccione si aplica...'}</option>
                             {subcategoriasDisponibles.map(sc => <option key={sc.id} value={sc.id}>{sc.nombre}</option>)}
                          </select>
                       </div>
                  </div>
               </div>

               {/* 2. Precios y Estado */}
               <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)] mb-6 border-b border-[var(--color-primary)]/20 pb-4">2. Financiero y Visibilidad</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Precio Unitario ($) <span className="text-red-400">*</span></label>
                         <input required type="number" step="0.01" min="0" className="input-guambra font-mono text-xl text-[var(--color-primary)]" value={formData.precio_unitario} onChange={e => handleChange('precio_unitario', e.target.value)} />
                      </div>
                      <div>
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Descuento (%) <span className="text-[var(--text-muted)] text-[8px] ml-1">Para tienda web</span></label>
                         <input type="number" min="0" max="100" className="input-guambra font-mono" value={formData.descuento} onChange={e => handleChange('descuento', e.target.value)} />
                      </div>
                      <div>
                         <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Visibilidad (Estado) <span className="text-red-400">*</span></label>
                         <div className="flex bg-black/40 border border-[var(--border-soft)] p-1 rounded-xl">
                            <button type="button" onClick={() => handleChange('estado', 'activo')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${formData.estado === 'activo' ? 'bg-green-500/20 text-green-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Activo</button>
                            <button type="button" onClick={() => handleChange('estado', 'inactivo')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${formData.estado === 'inactivo' ? 'bg-red-500/20 text-red-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>Inactivo</button>
                         </div>
                      </div>
                  </div>
                  {formData.estado === 'inactivo' && (
                     <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 text-red-400">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0"/>
                        <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">El producto desaparecerá inmediatamente de la tienda online pública. No afectará a los contratos activos.</p>
                     </div>
                  )}
               </div>

               {/* 3. Fotos */}
               <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)] mb-6 border-b border-[var(--color-primary)]/20 pb-4">3. Material Visual</h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                     {formData.fotos.map((f, idx) => (
                         <div key={idx} className="aspect-square bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl relative group overflow-hidden">
                             <img src={f.url} alt="" className="w-full h-full object-cover" />
                             {f.isNew && <div className="absolute bottom-1 left-1 bg-primary/80 text-[8px] font-black text-black px-1.5 py-0.5 rounded uppercase tracking-wide">Nueva</div>}
                             <button type="button" onClick={() => removeFoto(idx)} className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-[var(--text-primary)] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0"><X className="w-3 h-3"/></button>
                         </div>
                     ))}
                     
                     {formData.fotos.length < 5 && (
                         <div onClick={() => fileInputRef.current?.click()} className="aspect-square bg-[var(--bg-surface-2)] border-2 border-dashed border-[var(--border-soft)] rounded-2xl flex flex-col items-center justify-center text-[var(--text-muted)] hover:text-[var(--color-primary)] hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                             <Upload className="w-6 h-6 mb-2"/>
                             <span className="text-[9px] font-black uppercase tracking-widest text-center px-4">Subir Foto<br/>({formData.fotos.length}/5)</span>
                         </div>
                     )}
                     <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={addFoto}/>
                  </div>
               </div>

               {/* 4. Estructura y Relaciones */}
               <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)] mb-6 border-b border-[var(--color-primary)]/20 pb-4">4. Estructura y Venta Cruzada</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      {/* Piezas vinculadas */}
                      <div className="space-y-4">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] block">Piezas Compuestas</label>
                          <div className="relative">
                              <input type="text" className="input-guambra h-12" placeholder="Buscar pieza en bodega..." value={busquedaPieza} onChange={e => buscarPiezas(e.target.value)}/>
                             
                             {busquedandoPieza && busquedaPieza.length >= 2 && (
                               <div className="absolute top-[100%] left-0 w-full bg-[#121215] border border-[var(--border-soft)] rounded-xl shadow-2xl z-20 mt-2 p-3 text-center">
                                 <Loader2 className="w-4 h-4 animate-spin mx-auto text-[var(--color-primary)]"/>
                               </div>
                             )}
                             {!busquedandoPieza && resultadosPiezas.length > 0 && (
                                 <div className="absolute top-[100%] left-0 w-full bg-[#121215] border border-[var(--border-soft)] rounded-xl shadow-2xl z-20 mt-2 overflow-hidden">
                                     {resultadosPiezas.map(p => (
                                         <div key={p.id} onClick={() => agregarPieza(p)} className="p-3 hover:bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)] last:border-0 cursor-pointer flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border-soft)] overflow-hidden flex items-center justify-center flex-shrink-0">
                                              {p.foto ? <img src={p.foto} alt="" className="w-full h-full object-cover"/> : <ImageIcon className="w-3 h-3 text-[var(--text-muted)]"/>}
                                            </div>
                                            <span className="text-xs font-bold text-[var(--text-primary)]">{p.nombre}</span>
                                            <Plus className="w-3 h-3 text-[var(--color-primary)] ml-auto flex-shrink-0"/>
                                         </div>
                                     ))}
                                 </div>
                             )}
                             {!busquedandoPieza && busquedaPieza.length >= 2 && resultadosPiezas.length === 0 && (
                               <div className="absolute top-[100%] left-0 w-full bg-[#121215] border border-[var(--border-soft)] rounded-xl shadow-2xl z-20 mt-2 p-3 text-center text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                                 Sin piezas para "{busquedaPieza}"
                               </div>
                             )}
                          </div>
                          
                          <div className="bg-black/40 border border-[var(--border-soft)] rounded-xl min-h-[100px] p-2 space-y-2">
                              {formData.piezas.length === 0 ? (
                                  <div className="h-[80px] flex items-center justify-center text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Sin piezas vinculadas</div>
                              ) : (
                                   formData.piezas.map(p => (
                                       <div key={p.id} className="flex items-center gap-3 p-2 bg-[var(--bg-surface-2)] rounded-lg border border-[var(--border-soft)] relative group pr-10">
                                          <div className="w-8 h-8 rounded-md bg-[var(--bg-surface-2)] border border-[var(--border-soft)] overflow-hidden flex items-center justify-center flex-shrink-0">
                                            {p.foto ? <img src={p.foto} alt="" className="w-full h-full object-cover"/> : <ImageIcon className="w-3 h-3 text-[var(--text-muted)]"/>}
                                          </div>
                                          <span className="text-xs font-bold text-[var(--text-primary)] truncate">{p.nombre}</span>
                                          <button type="button" onClick={() => setFormData(prev => ({...prev, piezas: prev.piezas.filter(x => x.id !== p.id)}))} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-red-500/10 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3"/></button>
                                       </div>
                                   ))
                              )}
                          </div>
                      </div>

                      {/* Relacionados */}
                      <div className="space-y-4">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] block">Productos Sugeridos (Cross-Sell max 5)</label>
                          <div className="relative">
                             <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                              <input type="text" className="input-guambra h-12" placeholder="Buscar otro producto / traje..." value={busquedaRel} onChange={e => buscarRelacionados(e.target.value)}/>
                             
                             {busquedandoRel && busquedaRel.length >= 2 && (
                               <div className="absolute top-[100%] left-0 w-full bg-[#121215] border border-[var(--border-soft)] rounded-xl shadow-2xl z-20 mt-2 p-3 text-center">
                                 <Loader2 className="w-4 h-4 animate-spin mx-auto text-[var(--color-primary)]"/>
                               </div>
                             )}
                             {!busquedandoRel && resultadosRel.length > 0 && (
                                 <div className="absolute top-[100%] left-0 w-full bg-[#121215] border border-[var(--border-soft)] rounded-xl shadow-2xl z-20 mt-2 overflow-hidden">
                                     {resultadosRel.map(p => (
                                         <div key={p.id} onClick={() => agregarRelacionado(p)} className="p-3 hover:bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)] last:border-0 cursor-pointer flex items-center gap-3">
                                            <Package className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0"/>
                                            <span className="text-xs font-bold text-[var(--text-primary)]">{p.nombre}</span>
                                            <Plus className="w-3 h-3 text-[var(--color-primary)] ml-auto flex-shrink-0"/>
                                         </div>
                                     ))}
                                 </div>
                             )}
                             {!busquedandoRel && busquedaRel.length >= 2 && resultadosRel.length === 0 && (
                               <div className="absolute top-[100%] left-0 w-full bg-[#121215] border border-[var(--border-soft)] rounded-xl shadow-2xl z-20 mt-2 p-3 text-center text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                                 Sin productos para "{busquedaRel}"
                               </div>
                             )}
                          </div>
                          
                          <div className="bg-black/40 border border-[var(--border-soft)] rounded-xl min-h-[100px] p-2 space-y-2">
                              {formData.relacionados.length === 0 ? (
                                  <div className="h-[80px] flex items-center justify-center text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Sin sugerencias</div>
                              ) : (
                                  formData.relacionados.map(p => (
                                      <div key={p.id} className="flex items-center gap-3 p-2 bg-[var(--bg-surface-2)] rounded-lg border border-[var(--border-soft)] relative group pr-10">
                                         <span className="text-xs font-bold text-[var(--text-primary)] truncate">{p.nombre}</span>
                                         <button type="button" onClick={() => setFormData(prev => ({...prev, relacionados: prev.relacionados.filter(x => x.id !== p.id)}))} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-red-500/10 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3"/></button>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  </div>
               </div>

               <div className="pt-8 border-t border-[var(--border-soft)] flex justify-end gap-4">
                   <button type="button" onClick={() => setTab('activos')} className="btn-guambra-secondary !px-8 h-14">Cancelar</button>
                   <button type="submit" disabled={isProcessing} className="btn-guambra-primary !px-10 h-14 text-sm disabled:opacity-50 flex items-center gap-3">
                       {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin"/> Guardando...</> : 'Guardar y Publicar'}
                   </button>
               </div>
           </form>
       )}
    </div>
  );
}
