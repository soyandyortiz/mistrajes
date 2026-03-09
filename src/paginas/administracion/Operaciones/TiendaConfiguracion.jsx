import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../stores/authStore";
import { useTenantStore } from "../../../stores/tenantStore";
import { Save, Phone, Mail, MapPin, Globe, Loader2, Copy } from "lucide-react";

const TiendaConfiguracion = () => {
  const { profile } = useAuthStore();
  const { tenant } = useTenantStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre_negocio: "",
    descripcion_negocio: "",
    telefono: "",
    whatsapp: "",
    email: "",
    direccion: "",
    ciudad: "",
    provincia: "",
    map_iframe: "",
    facebook_url: "",
    instagram_url: "",
    tiktok_url: "",
  });

  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!profile?.tenant_id) return;
      try {
        const { data, error } = await supabase
          .from("tenants")
          .select(
            "telefono, whatsapp_propietario, email_propietario, direccion, ciudad, provincia, configuracion_tienda"
          )
          .eq("id", profile.tenant_id)
          .single();

        if (error) throw error;

        if (data) {
          const config = data.configuracion_tienda || {};
          setFormData({
            nombre_negocio: config.nombre_negocio || "",
            descripcion_negocio: config.descripcion_negocio || "",
            telefono: config.telefono || "",
            whatsapp: config.whatsapp || "",
            email: config.email || "",
            direccion: config.direccion || "",
            ciudad: config.ciudad || "",
            provincia: config.provincia || "",
            map_iframe: config.map_iframe || "",
            facebook_url: config.facebook_url || "",
            instagram_url: config.instagram_url || "",
            tiktok_url: config.tiktok_url || "",
          });
        }
      } catch (err) {
        console.error("Error fetching config:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [profile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
            ...formData
          },
        })
        .eq("id", profile.tenant_id);

      if (error) throw error;
      
      // Actualizar el estado global inmediamente para que se refleje en toda la app sin tener que recargar
      useTenantStore.getState().setTenantFromAuth({
        ...tenant,
        configuracion_tienda: {
          ...currentConfig,
          ...formData
        }
      });

      setToastMessage({ type: "success", text: "Configuración guardada exitosamente" });
    } catch (err) {
      console.error("Error salvando config:", err);
      setToastMessage({ type: "error", text: "Hubo un error al guardar" });
    } finally {
      setSaving(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const storeUrl = `http://localhost:5173/?t=${tenant?.slug}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg border z-50 flex items-center gap-3 animate-in slide-in-from-right-8 ${
            toastMessage.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {toastMessage.type === "success" ? (
            <Save className="h-5 w-5" />
          ) : (
            <Loader2 className="h-5 w-5" />
          )}
          <span className="font-bold text-sm">{toastMessage.text}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tighter">
            Configuración de Tienda Online
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-lg">
            Personaliza la información de tu negocio que tus clientes verán en tu
            tienda pública y en los modales de contacto.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 bg-[var(--bg-surface-2)] p-3 rounded-lg border border-[var(--border-soft)]">
          <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
            Enlace de tu tienda:
          </span>
          <div className="flex flex-row items-center gap-2">
            <span className="text-xs text-primary font-bold">{storeUrl}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(storeUrl);
                setToastMessage({ type: "success", text: "Enlace copiado al portapapeles" });
                setTimeout(() => setToastMessage(null), 3000);
              }}
              className="p-1.5 hover:bg-[var(--bg-surface-3)] rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              title="Copiar enlace"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SEO */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2 border-b border-[var(--border-soft)] pb-4">
            <Globe className="h-4 w-4 text-primary" />
            Información del Negocio (SEO)
          </h3>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                Nombre de la Tienda (Público)
              </label>
              <input
                type="text"
                name="nombre_negocio"
                value={formData.nombre_negocio}
                onChange={handleInputChange}
                className="input-guambra"
                placeholder="Ej. Mi Super Tienda"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/70 uppercase">
                Descripción Corta del Negocio
              </label>
               <textarea
                name="descripcion_negocio"
                value={formData.descripcion_negocio}
                onChange={handleInputChange}
                className="input-guambra min-h-[80px]"
                rows={3}
                placeholder="Ofrecemos los mejores trajes para tus eventos especiales..."
              ></textarea>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                Esta descripción ayudará a que Google y otros buscadores encuentre tu tienda y entienda qué ofreces.
              </p>
            </div>
          </div>
        </div>

        {/* Contactos */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2 border-b border-[var(--border-soft)] pb-4">
            <Phone className="h-4 w-4 text-primary" />
            Información de Contacto
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/70 uppercase">
                Teléfono
              </label>
              <input
                type="text"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                className="input-guambra"
                placeholder="Ej. +593 2 123 4567"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                WhatsApp Principal
              </label>
              <input
                type="text"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleInputChange}
                className="input-guambra"
                placeholder="Ej. +593981234567"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-white/70 uppercase">
                Correo Electrónico Comercial
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input-guambra pl-10"
                  placeholder="admin@miempresa.com"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              </div>
            </div>
          </div>
        </div>

        {/* Ubicación */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2 border-b border-[var(--border-soft)] pb-4">
            <MapPin className="h-4 w-4 text-primary" />
            Ubicación Física
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-white/70 uppercase">
                Dirección Exacta
              </label>
              <input
                type="text"
                name="direccion"
                value={formData.direccion}
                onChange={handleInputChange}
                className="input-guambra"
                placeholder="Calle Principal y Secundaria, Edificio X, Local Y"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/70 uppercase">
                Ciudad
              </label>
              <input
                type="text"
                name="ciudad"
                value={formData.ciudad}
                onChange={handleInputChange}
                className="input-guambra"
                placeholder="Ej. Quito"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/70 uppercase">
                Provincia
              </label>
              <input
                type="text"
                name="provincia"
                value={formData.provincia}
                onChange={handleInputChange}
                className="input-guambra"
                placeholder="Ej. Pichincha"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                Google Maps Embed (Iframe URL / HTML)
              </label>
              <textarea
                name="map_iframe"
                value={formData.map_iframe}
                onChange={handleInputChange}
                className="input-guambra min-h-[80px]"
                rows={3}
                placeholder='<iframe src="https://www.google.com/maps/embed?pb=..." ></iframe>'
              ></textarea>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                Pega aquí el código HTML para integrar el mapa de Google Maps que
                generas desde la página web de Google.
              </p>
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2 border-b border-[var(--border-soft)] pb-4">
            <Globe className="h-4 w-4 text-primary" />
            Redes Sociales (Opcional)
          </h3>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/70 uppercase">
                Facebook URL
              </label>
              <input
                type="text"
                name="facebook_url"
                value={formData.facebook_url}
                onChange={handleInputChange}
                className="input-guambra"
                placeholder="https://facebook.com/tu_pagina"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/70 uppercase">
                Instagram URL
              </label>
              <input
                type="text"
                name="instagram_url"
                value={formData.instagram_url}
                onChange={handleInputChange}
                className="input-guambra"
                placeholder="https://instagram.com/tu_perfil"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/70 uppercase">
                TikTok URL
              </label>
              <input
                type="text"
                name="tiktok_url"
                value={formData.tiktok_url}
                onChange={handleInputChange}
                className="input-guambra"
                placeholder="https://tiktok.com/@tu_perfil"
              />
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
                <Save className="h-4 w-4" /> Guardar Configuración
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TiendaConfiguracion;
