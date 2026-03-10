import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../stores/authStore";
import { useTenantStore } from "../../../stores/tenantStore";
import { Save, Loader2, Image as ImageIcon, Store, MonitorPlay } from "lucide-react";

// TODO: Helper to mock upload or actual upload to bucket
const ConfiguracionesGenerales = () => {
  const { profile } = useAuthStore();
  const { tenant } = useTenantStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  
  const [formData, setFormData] = useState({
    logo_url: "",
    icono_url: "",
  });

  const fileInputLogoRef = useRef(null);
  const fileInputIconoRef = useRef(null);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!profile?.tenant_id) return;
      try {
        const { data, error } = await supabase
          .from("tenants")
          .select("configuracion_tienda")
          .eq("id", profile.tenant_id)
          .single();

        if (error) throw error;

        if (data) {
          const config = data.configuracion_tienda || {};
          setFormData({
            logo_url: config.logo_url || "",
            icono_url: config.icono_url || "",
          });
        }
      } catch (err) {
        console.error("Error fetching admin config:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [profile]);

  // Manejar subida simulada o por bucket (usaremos base64 para evitar depender de políticas de bucket complejas inicialmente, o si el usuario lo prefiere, podemos luego enlazarlo a un bucket). 
  // Por simplicidad y asegurar que funcione out-of-the-box, guardaremos el base64 o pediremos una URL
  const handleFileUpload = (e, field) => {
      const file = e.target.files[0];
      if (!file) return;

      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
          setToastMessage({ type: "error", text: "La imagen no debe superar los 5MB" });
          setTimeout(() => setToastMessage(null), 3000);
          return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
         setFormData(prev => ({
             ...prev,
             [field]: reader.result
         }));
      };
      reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setSaving(true);
    setToastMessage(null);

    try {
      const { data: currentData } = await supabase
        .from("tenants")
        .select("configuracion_tienda")
        .eq("id", profile.tenant_id)
        .single();
        
      const currentConfig = currentData?.configuracion_tienda || {};

      const { error } = await supabase
        .from("tenants")
        .update({
          configuracion_tienda: {
            ...currentConfig,
            logo_url: formData.logo_url,
            icono_url: formData.icono_url
          },
        })
        .eq("id", profile.tenant_id);

      if (error) throw error;
      
      // Update local tenant store softly to reflect immediately (optional depending on layout remount)
      setToastMessage({ type: "success", text: "Configuraciones generales guardadas exitosamente. Es posible que debas recargar la página para ver los cambios aplicados en todo el sistema." });
    } catch (err) {
      console.error("Error salvando configuraciones root:", err);
      setToastMessage({ type: "error", text: "Hubo un error al guardar las configuraciones" });
    } finally {
      setSaving(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg border z-50 flex items-center gap-3 animate-in slide-in-from-right-8 max-w-sm ${
            toastMessage.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {toastMessage.type === "success" ? (
            <Save className="h-5 w-5 shrink-0" />
          ) : (
            <Loader2 className="h-5 w-5 shrink-0" />
          )}
          <span className="font-bold text-xs">{toastMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Identidad Visual */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2 border-b border-[var(--border-soft)] pb-4">
            <ImageIcon className="h-4 w-4 text-primary" />
            Identidad Visual
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             
             {/* Logo Principal */}
             <div className="space-y-4">
                 <div>
                   <label className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2 mb-1">
                      <Store className="h-4 w-4 text-[var(--text-muted)]" />
                      Logotipo de la Empresa
                   </label>
                   <p className="text-[10px] text-[var(--text-muted)] mb-3">Se mostrará en el menú del sistema y en la cabecera de la tienda online (Recomendado apaisado/rectangular). <span className="font-bold text-[var(--text-secondary)]">Máx. 5MB</span></p>
                </div>
                
                 <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--border-soft)] rounded-2xl bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] transition-colors relative group">
                   {formData.logo_url ? (
                      <div className="relative w-full flex justify-center h-24">
                         <img src={formData.logo_url} alt="Logo Preview" className="h-full object-contain" />
                         <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                             <button type="button" onClick={() => fileInputLogoRef.current?.click()} className="btn-guambra-primary text-[10px] py-1.5 px-3">Cambiar Logo</button>
                         </div>
                      </div>
                   ) : (
                      <div className="text-center">
                         <ImageIcon className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-2" />
                         <button type="button" onClick={() => fileInputLogoRef.current?.click()} className="btn-guambra-primary text-[10px] py-1.5 px-3">Subir Logo</button>
                      </div>
                   )}
                   <input type="file" accept="image/png, image/jpeg, image/webp" className="hidden" ref={fileInputLogoRef} onChange={(e) => handleFileUpload(e, 'logo_url')} />
                </div>
             </div>

             {/* Favicon / Icono Pequeño */}
             <div className="space-y-4">
                <div>
                   <label className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2 mb-1">
                      <MonitorPlay className="h-4 w-4 text-[var(--text-muted)]" />
                      Ícono del Negocio (Favicon)
                   </label>
                   <p className="text-[10px] text-[var(--text-muted)] mb-3">Se mostrará en las pestañas del navegador junto al título de tu web (Debe ser cuadrado). <span className="font-bold text-[var(--text-secondary)]">Máx. 5MB</span></p>
                </div>
                
                 <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--border-soft)] rounded-2xl bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] transition-colors relative group">
                   {formData.icono_url ? (
                      <div className="relative w-full flex justify-center h-24">
                         <img src={formData.icono_url} alt="Icon Preview" className="h-full w-24 object-cover rounded-xl" />
                         <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                             <button type="button" onClick={() => fileInputIconoRef.current?.click()} className="btn-guambra-primary text-[10px] py-1.5 px-3">Cambiar Ícono</button>
                         </div>
                      </div>
                   ) : (
                      <div className="text-center">
                         <div className="h-10 w-10 mx-auto mb-2 border-2 border-[var(--border-soft)] rounded-xl flex items-center justify-center bg-[var(--bg-surface-2)]"><span className="text-[var(--text-muted)] text-xs font-black">?</span></div>
                         <button type="button" onClick={() => fileInputIconoRef.current?.click()} className="btn-guambra-primary text-[10px] py-1.5 px-3">Subir Ícono</button>
                      </div>
                   )}
                   <input type="file" accept="image/png, image/jpeg, image/x-icon, image/webp" className="hidden" ref={fileInputIconoRef} onChange={(e) => handleFileUpload(e, 'icono_url')} />
                </div>
             </div>

          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-guambra-primary gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Guardar Configuraciones
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ConfiguracionesGenerales;
