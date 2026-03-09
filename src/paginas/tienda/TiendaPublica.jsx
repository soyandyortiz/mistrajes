import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenantStore } from '../../stores/tenantStore';
import { ShoppingBag, Search, Filter, Star, Loader2, ArrowRight, Phone, MapPin, X, Mail, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

const TiendaPublica = () => {
  const { tenant, loading: tenantLoading } = useTenantStore();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  useEffect(() => {
    const fetchCatalogo = async () => {
      if (!tenant?.id) return;
      try {
        const { data, error } = await supabase
          .from('productos')
          .select('*, categorias_productos_map(categoria_id)')
          .eq('tenant_id', tenant.id)
          .eq('estado', 'activo')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        const ids = (data || []).map(p => p.id);
        let imgMap = {};
        if (ids.length > 0) {
            const { data: imgs } = await supabase
              .from('imagenes_productos')
              .select('*')
              .in('producto_id', ids)
              .eq('tenant_id', tenant.id)
              .order('orden_visual', { ascending: true });
            
            (imgs || []).forEach(img => {
               if(!imgMap[img.producto_id]) imgMap[img.producto_id] = [];
               imgMap[img.producto_id].push(img);
            });
        }

        const productosProcesados = (data || []).map(p => ({
           ...p,
           fotos: imgMap[p.id] || [],
           categorias_ids: (p.categorias_productos_map || []).map(cm => cm.categoria_id)
        }));

        setProductos(productosProcesados);
        
        // Fetch categories
        const { data: catData } = await supabase
          .from('categorias_productos')
          .select('*')
          .eq('tenant_id', tenant.id)
          .is('deleted_at', null)
          .order('orden_visual', { ascending: true })
          .order('nombre', { ascending: true });
          
        const catDataArray = catData || [];
        
        // Filtrar categorías para mostrar solo las que tienen productos activos
        const usedIds = new Set();
        productosProcesados.forEach(p => {
             // p.categorias_ids ya incluye la subcategoría/categoría mapeada en categorias_productos_map
             p.categorias_ids.forEach(cid => {
                  usedIds.add(cid);
                  // Si es una subcategoría, también debemos mostrar su padre en el menú
                  const cat = catDataArray.find(c => c.id === cid);
                  if (cat && cat.padre_id) {
                      usedIds.add(cat.padre_id);
                  }
             });
        });

        const categoriasFiltradas = catDataArray.filter(c => usedIds.has(c.id));
        setCategorias(categoriasFiltradas);
      } catch (err) {
        console.error('Error cargando catalogo:', err);
        setProductos([]);
      } finally {
        setLoading(false);
      }
    };

    if (tenant?.id) {
      fetchCatalogo();
      
      // Nota: El SEO y Favicon ahora se manejan de forma global mediante el componente
      // <TenantMetaEffects /> en App.jsx para asegurar que aplique al panel y a la tienda por igual.

    } else if (!tenantLoading) {
      // tenant no existe y ya terminó de cargar
      setLoading(false);
    }
  }, [tenant, tenantLoading]);

  const filtrados = productos.filter(p => {
      const matchSearch = p.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = activeCategory ? p.categorias_ids.includes(activeCategory) : true;
      return matchSearch && matchCat;
  });

  const getUrl = (path, params = '') => {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const baseParams = isLocalhost && tenant?.slug ? `t=${tenant.slug}` : '';
      
      let query = '';
      if (baseParams && params) query = `?${baseParams}&${params}`;
      else if (baseParams) query = `?${baseParams}`;
      else if (params) query = `?${params}`;
      
      return `${path}${query}`;
  };

  // Organize categories into tree
  const categoriasPrincipales = categorias.filter(c => !c.padre_id);

  // Mostrar loader mientras se resuelve el tenant para evitar pantalla negra
  if (tenantLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 opacity-50">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--color-primary)]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Cargando tienda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] relative flex flex-col pt-16">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[var(--color-primary-dim)] via-[var(--bg-page)] to-[var(--bg-page)]"></div>
      
      {/* Navbar Tienda */}
      <nav className="fixed top-0 left-0 w-full z-50 glass-card !rounded-none border-x-0 border-t-0 border-b border-[var(--border-soft)] h-20 flex items-center px-6 lg:px-12 backdrop-blur-xl bg-[var(--bg-page)]/80">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between relative">
           <div className="flex items-center gap-3 z-10">
               {tenant?.configuracion_tienda?.logo_url ? (
                   <img src={tenant.configuracion_tienda.logo_url} alt="Logotipo" className="h-10 object-contain max-w-[150px]" />
               ) : (
                   <>
                     <div className="h-10 w-10 rounded-xl bg-[var(--color-primary-dim)] flex items-center justify-center border border-[var(--color-primary-dim)] shrink-0">
                        <Star className="h-5 w-5 text-[var(--color-primary)]" />
                     </div>
                     <span className="font-black tracking-tighter text-xl uppercase hidden sm:block text-[var(--text-primary)]">{tenant?.configuracion_tienda?.nombre_negocio || tenant?.nombre_negocio || 'Tienda'}</span>
                   </>
               )}
           </div>

           {/* Menú de Modales (Contactos y Ubicación) */}
           <div className="hidden lg:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest absolute left-1/2 -translate-x-1/2 h-full">
               <button 
                 onClick={() => setIsContactModalOpen(true)}
                 className="whitespace-nowrap transition-colors h-full flex items-center border-b-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-transparent"
               >
                 Contactos
               </button>
               <button 
                 onClick={() => setIsLocationModalOpen(true)}
                 className="whitespace-nowrap transition-colors h-full flex items-center border-b-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-transparent"
               >
                 Ubicación
               </button>
           </div>

           <div className="flex items-center gap-4 relative z-50">
              <Link to={getUrl('/reserva-web')} className="relative p-2.5 bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] border border-[var(--border-soft)] rounded-xl transition-colors group">
                 <ShoppingBag className="h-5 w-5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" />
              </Link>
           </div>
        </div>
      </nav>

      {/* Hero Header y Buscador Compacto */}
      <header className="relative z-10 pt-32 pb-6 px-6 lg:px-12 max-w-5xl mx-auto animate-in slide-in-from-bottom-8 duration-700 w-full text-center">
         
         {/* Título y Descripción de la Tienda */}
         {(tenant?.configuracion_tienda?.nombre_negocio || tenant?.configuracion_tienda?.descripcion_negocio) && (
            <div className="mb-8">
               {tenant?.configuracion_tienda?.nombre_negocio && (
                  <h1 className="text-4xl md:text-5xl font-black text-[var(--text-primary)] mb-4 tracking-tighter drop-shadow-md">
                     {tenant.configuracion_tienda.nombre_negocio}
                  </h1>
               )}
               {tenant?.configuracion_tienda?.descripcion_negocio && (
                  <p className="text-[var(--text-secondary)] opacity-80 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
                     {tenant.configuracion_tienda.descripcion_negocio}
                  </p>
               )}
            </div>
         )}

         <div className="relative w-full max-w-xl mx-auto group mb-8">
             <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
                 <Search className="h-5 w-5 text-[var(--text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors" />
             </div>
             <input 
                 type="text" 
                 value={searchTerm} 
                 onChange={(e) => setSearchTerm(e.target.value)} 
                 className="w-full bg-[var(--bg-surface-2)]/80 backdrop-blur-md border border-[var(--border-soft)] hover:border-[var(--text-muted)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] h-14 pl-14 pr-6 rounded-full shadow-2xl shadow-[var(--shadow-lg)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] font-medium transition-all" 
                 placeholder="¿Qué traje o prenda estás buscando hoy?" 
             />
         </div>

         {/* Categorías Integradas debajo del Buscador */}
         <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-[10px] md:text-[11px] font-bold uppercase tracking-widest">
            <button 
               onClick={() => setActiveCategory(null)} 
               className={`px-4 py-2 rounded-full border transition-all duration-300 ${!activeCategory ? 'bg-[var(--color-primary-dim)] text-[var(--text-primary)] border-[var(--color-primary)] shadow-[var(--color-primary-glow)]' : 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-surface-3)] hover:text-[var(--text-primary)]'}`}
            >
               Todo el Catálogo
            </button>
            {categoriasPrincipales.map(cat => (
               <div key={cat.id} className="relative group/cat">
                  <button 
                     onClick={() => setActiveCategory(cat.id)}
                     className={`px-4 py-2 rounded-full border transition-all duration-300 ${activeCategory === cat.id ? 'bg-[var(--color-primary-dim)] text-[var(--text-primary)] border-[var(--color-primary)] shadow-[var(--color-primary-glow)]' : 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-surface-3)] hover:text-[var(--text-primary)]'}`}
                  >
                     {cat.nombre}
                  </button>
                  {/* Dropdown de Subcategorías */}
                  {categorias.filter(sub => sub.padre_id === cat.id).length > 0 && (
                     <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-xl py-2 px-1 min-w-[200px] opacity-0 invisible group-hover/cat:opacity-100 group-hover/cat:visible transition-all shadow-2xl z-50 before:content-[''] before:absolute before:-top-3 before:left-0 before:w-full before:h-3">
                        {categorias.filter(sub => sub.padre_id === cat.id).map(sub => (
                           <button 
                              key={sub.id}
                              onClick={(e) => { setActiveCategory(sub.id); e.stopPropagation(); }}
                              className={`w-full text-left px-4 py-2.5 hover:bg-[var(--bg-surface-3)] rounded-lg transition-colors flex items-center justify-between ${activeCategory === sub.id ? 'text-[var(--color-primary)] bg-[var(--color-primary-dim)]' : 'text-[var(--text-secondary)]'}`}
                           >
                              <span>{sub.nombre}</span>
                              {activeCategory === sub.id && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shadow-[0_0_10px_var(--color-primary)]"></div>}
                           </button>
                        ))}
                     </div>
                  )}
               </div>
            ))}
         </div>
      </header>

      {/* Resultados Info */}
      <div className="relative z-10 max-w-7xl mx-auto w-full px-6 lg:px-12 pb-4">
         <div className="flex justify-between items-center border-b border-[var(--border-soft)] pb-4">
             <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">
                 Mostrando {filtrados.length} resultados
             </h2>
             <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] px-4 py-2 rounded-lg border border-[var(--border-soft)] group">
                 <Filter className="h-3 w-3 text-[var(--text-muted)] group-hover:text-[var(--color-primary)] transition-colors" /> <span className="hidden sm:block">Filtros Avanzados</span><span className="sm:hidden">Filtros</span>
             </button>
         </div>
      </div>

      {/* Grid de Catálogo */}
      <main className="flex-1 relative z-10 max-w-7xl mx-auto w-full px-6 lg:px-12 pb-24 pt-4">

         {loading ? (
             <div className="flex flex-col items-center justify-center py-20 opacity-50">
                 <Loader2 className="h-10 w-10 animate-spin text-[var(--color-primary)] mb-4" />
                 <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Sincronizando Colección</p>
             </div>
         ) : filtrados.length === 0 ? (
             <div className="text-center py-20">
                 <p className="text-[var(--text-muted)] font-medium tracking-wide">No se encontraron productos coincidentes.</p>
             </div>
         ) : (
             <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                 {filtrados.map(prod => (
                     <div key={prod.id} className="group relative rounded-2xl md:rounded-3xl overflow-hidden glass-card border border-[var(--border-soft)] hover:border-[var(--color-primary)] transition-all duration-500 will-change-transform hover:-translate-y-2 flex flex-col">
                        <div className="aspect-square bg-[var(--bg-surface-3)] relative overflow-hidden flex items-center justify-center">
                            {prod.fotos && prod.fotos.length > 0 ? (
                                <img src={prod.fotos[0].url} alt={prod.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            ) : (
                                <Star className="h-16 w-16 md:h-24 md:w-24 text-[var(--text-primary)] p-4 md:p-6 opacity-5 group-hover:scale-110 transition-transform duration-700" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-page)]/80 to-transparent"></div>
                            
                            <div className="absolute bottom-3 left-3 right-3 md:bottom-4 md:left-4 md:right-4 flex justify-between items-end">
                                <span className="px-2 py-1 md:px-3 md:py-1 rounded-full bg-black/60 backdrop-blur-md border border-[var(--border-soft)] text-[9px] md:text-[10px] font-black tracking-widest uppercase shadow-xl text-[var(--color-primary)] block w-fit">
                                  ${prod.precio_unitario}/día
                                </span>
                            </div>
                        </div>
                        <div className="p-4 md:p-6 flex-1 flex flex-col">
                            <h3 className="text-sm md:text-lg font-black tracking-tighter text-[var(--text-primary)] mb-1 md:mb-2 line-clamp-1">{prod.nombre}</h3>
                            <p className="hidden md:block text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed flex-1 mb-6">{prod.descripcion || 'Sin descripción disponible.'}</p>
                            
                            <div className="relative z-20 mt-auto">
                                <Link to={getUrl('/reserva-web', `producto=${prod.id}`)} className="flex items-center justify-center w-full py-2.5 md:py-3 rounded-xl bg-[var(--bg-surface-2)] text-[9px] md:text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--color-primary)] hover:text-white transition-all group/btn border border-[var(--border-soft)] hover:border-[var(--color-primary)] relative pointer-events-auto cursor-pointer shadow-lg shadow-[var(--shadow-sm)]">
                                    Reservar <span className="hidden md:inline ml-1">Ahora</span> <ArrowRight className="h-3 w-3 ml-1.5 md:ml-2 group-hover/btn:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>
                     </div>
                 ))}
             </div>
         )}
      </main>

      {/* Modal Contactos */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setIsContactModalOpen(false)}>
          <div className="relative w-full max-w-sm glass-card border border-[var(--border-soft)] p-6 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tighter flex items-center gap-2">
                <Phone className="h-5 w-5 text-[var(--color-primary)]" /> Contactos
              </h3>
              <button onClick={() => setIsContactModalOpen(false)} className="p-2 bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              {(tenant?.configuracion_tienda?.telefono || tenant?.telefono) && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-surface-3)] hover:bg-[var(--bg-surface-2)] transition-colors">
                  <div className="h-10 w-10 flex items-center justify-center bg-[var(--color-primary-dim)] rounded-full shrink-0"><Phone className="h-4 w-4 text-[var(--color-primary)]" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Llamadas</p>
                    <p className="text-sm font-black text-[var(--text-primary)] truncate">{tenant.configuracion_tienda?.telefono || tenant.telefono}</p>
                  </div>
                </div>
              )}
              {(tenant?.configuracion_tienda?.whatsapp || tenant?.whatsapp_propietario) && (
                <a href={`https://wa.me/${(tenant.configuracion_tienda?.whatsapp || tenant.whatsapp_propietario).replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 rounded-xl bg-green-500/10 hover:bg-green-500/20 transition-colors group">
                  <div className="h-10 w-10 flex items-center justify-center bg-green-500/20 rounded-full shrink-0 group-hover:scale-110 transition-transform">
                    <Phone className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-green-400/60 font-bold uppercase tracking-widest">WhatsApp Directo</p>
                    <p className="text-sm font-black text-green-300 truncate">{tenant.configuracion_tienda?.whatsapp || tenant.whatsapp_propietario}</p>
                  </div>
                </a>
              )}
              {(tenant?.configuracion_tienda?.email || tenant?.email_propietario) && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-surface-3)] hover:bg-[var(--bg-surface-2)] transition-colors">
                  <div className="h-10 w-10 flex items-center justify-center bg-blue-500/20 rounded-full shrink-0"><Mail className="h-4 w-4 text-blue-400" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Correo Comercial</p>
                    <p className="text-sm font-black text-[var(--text-primary)] truncate">{tenant.configuracion_tienda?.email || tenant.email_propietario}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Social Links if present */}
            {(tenant?.configuracion_tienda?.facebook_url || tenant?.configuracion_tienda?.instagram_url || tenant?.configuracion_tienda?.tiktok_url) && (
              <div className="mt-6 pt-6 border-t border-[var(--border-soft)] flex gap-4 justify-center">
                 {tenant.configuracion_tienda.facebook_url && (
                    <a href={tenant.configuracion_tienda.facebook_url} target="_blank" rel="noreferrer" className="p-3 bg-[var(--bg-surface-3)] hover:bg-blue-500/20 rounded-full transition-all group/social border border-transparent hover:border-blue-500/30">
                       <Globe className="h-4 w-4 text-[var(--text-muted)] group-hover/social:text-blue-400" />
                    </a>
                 )}
                 {tenant.configuracion_tienda.instagram_url && (
                    <a href={tenant.configuracion_tienda.instagram_url} target="_blank" rel="noreferrer" className="p-3 bg-[var(--bg-surface-3)] hover:bg-pink-500/20 rounded-full transition-all group/social border border-transparent hover:border-pink-500/30">
                       <Globe className="h-4 w-4 text-[var(--text-muted)] group-hover/social:text-pink-400" />
                    </a>
                 )}
                 {tenant.configuracion_tienda.tiktok_url && (
                    <a href={tenant.configuracion_tienda.tiktok_url} target="_blank" rel="noreferrer" className="p-3 bg-[var(--bg-surface-3)] hover:bg-white/20 rounded-full transition-all group/social border border-transparent hover:border-[var(--text-primary)]/30">
                       <Globe className="h-4 w-4 text-[var(--text-muted)] group-hover/social:text-[var(--text-primary)]" />
                    </a>
                 )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Ubicación */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setIsLocationModalOpen(false)}>
          <div className="relative w-full max-w-2xl glass-card border border-[var(--border-soft)] p-6 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tighter flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[var(--color-primary)]" /> Nuestra Ubicación
              </h3>
              <button onClick={() => setIsLocationModalOpen(false)} className="p-2 bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-6">
               <div className="flex items-start gap-4 p-4 rounded-xl bg-[var(--bg-surface-3)] border border-[var(--border-soft)] text-sm text-[var(--text-secondary)]">
                  <div className="h-10 w-10 flex items-center justify-center bg-[var(--color-primary-dim)] rounded-full shrink-0"><MapPin className="h-4 w-4 text-[var(--color-primary)]" /></div>
                  <div>
                     <h4 className="text-[var(--text-primary)] font-black mb-1">Dirección Física</h4>
                     <p>{tenant?.configuracion_tienda?.direccion || tenant?.direccion || 'Aún no hemos configurado nuestra dirección.'}</p>
                     {(tenant?.configuracion_tienda?.ciudad || tenant?.ciudad || tenant?.configuracion_tienda?.provincia || tenant?.provincia) && (
                        <p className="mt-1 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest">{tenant?.configuracion_tienda?.ciudad || tenant?.ciudad}, {tenant?.configuracion_tienda?.provincia || tenant?.provincia}</p>
                     )}
                  </div>
               </div>
               
               {/* Google Maps Embed */}
               {tenant?.configuracion_tienda?.map_iframe && (
                 <div className="w-full h-80 rounded-2xl overflow-hidden bg-[var(--bg-surface-3)] relative border border-[var(--border-soft)] map-embed-container" 
                      dangerouslySetInnerHTML={{__html: tenant.configuracion_tienda.map_iframe}}>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
      
      {/* Footer Minimalista */}
      <footer className="relative z-10 border-t border-[var(--border-soft)] py-8 text-center bg-black/20">
         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">
            {tenant?.configuracion_tienda?.nombre_negocio || tenant?.nombre_negocio} • Desarrollado por <a href="https://guambraweb.com/" target="_blank" rel="noreferrer" className="text-[var(--color-primary)]/70 hover:text-[var(--color-primary)] transition-colors">GuambraWeb</a>
         </p>
      </footer>
    </div>
  );
};

export default TiendaPublica;
