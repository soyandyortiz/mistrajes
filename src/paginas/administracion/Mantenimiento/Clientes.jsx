import React, { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../stores/authStore";
import { toast } from "sonner";
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit2,
  Eye,
  MapPin,
  User,
  Building2,
  Phone,
  Mail,
  Loader2,
  ChevronRight,
  CheckCircle2,
  Calendar,
  CreditCard,
} from "lucide-react";

const MOCK_PROVINCES_ECUADOR = [
  "Azuay",
  "Bolívar",
  "Cañar",
  "Carchi",
  "Chimborazo",
  "Cotopaxi",
  "El Oro",
  "Esmeraldas",
  "Galápagos",
  "Guayas",
  "Imbabura",
  "Loja",
  "Los Ríos",
  "Manabí",
  "Morona Santiago",
  "Napo",
  "Orellana",
  "Pastaza",
  "Pichincha",
  "Santa Elena",
  "Santo Domingo de los Tsáchilas",
  "Sucumbíos",
  "Tungurahua",
  "Zamora Chinchipe",
];

const ModuleNavbar = ({ currentTab, setTab }) => (
  <div className="border-b border-[var(--border-soft)] pb-px mb-8 overflow-x-auto no-scrollbar">
    <nav className="-mb-px flex gap-6">
      <button
        onClick={() => setTab("lista")}
        className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all ${currentTab === "lista" || currentTab === "perfil" ? "border-primary text-[var(--color-primary)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-white/20"}`}
      >
        Lista de Clientes
      </button>
      <button
        onClick={() => setTab("nuevo")}
        className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${currentTab === "nuevo" || currentTab === "editar" ? "border-primary text-[var(--color-primary)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-white/20"}`}
      >
        <Plus className="w-3 h-3" />{" "}
        {currentTab === "editar" ? "Editar Cliente" : "Nuevo Cliente"}
      </button>
    </nav>
  </div>
);

export default function Clientes() {
  const { profile, loading: authLoading } = useAuthStore();

  const [currentTab, setTab] = useState("lista"); // 'lista' | 'nuevo' | 'editar' | 'perfil'
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [searchDocName, setSearchDocName] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterProvincia, setFilterProvincia] = useState("");
  const [filterCiudad, setFilterCiudad] = useState("");

  // Perfil / Historial Contratos
  const [clienteActivo, setClienteActivo] = useState(null);
  const [contratosCliente, setContratosCliente] = useState([]);

  // Formulario
  const initialForm = {
    id: null,
    tipo_cliente: "natural", // 'natural' | 'empresa'
    identificacion: "",
    nombre_completo: "", // nombres para natural, o nombre empresa
    email: "",
    whatsapp: "",
    direccion_domicilio: "",
    ciudad: "",
    provincia: "",
    pais: "Ecuador",

    // Natural Fields Ext
    referencia1_nombre: "",
    referencia1_celular: "",
    referencia2_nombre: "",
    referencia2_celular: "",

    // Empresa Fields Ext
    tipo_empresa: "",
    responsable_nombre: "",
    responsable_celular: "",
    responsable_email: "",
  };
  const [formData, setFormData] = useState(initialForm);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*, contratos(id)")
        .eq("tenant_id", profile.tenant_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const parsedData = (data || []).map((p) => ({
        ...p,
        tipo_cliente: p.tipo_entidad || "natural",
        whatsapp: p.whatsapp || p.telefono_responsable_empresa || "",
        referencia1_nombre: p.nombre_referencia || "",
        referencia1_celular: p.telefono_referencia || "",
        referencia2_nombre: p.nombre_referencia_2 || "",
        referencia2_celular: p.telefono_referencia_2 || "",
        responsable_nombre: p.nombre_responsable_empresa || "",
        responsable_celular: p.telefono_responsable_empresa || "",
        responsable_email: p.email_responsable_empresa || "",
        tipo_empresa: p.tipo_empresa || "", 
        total_contratos: p.contratos?.length || 0,
        ultimo_contrato: p.created_at, // Mock
      }));

      setClientes(parsedData);
    } catch (e) {
      toast.error("Error cargando cartera de clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && profile?.tenant_id) fetchData();
    else if (!authLoading && !profile?.tenant_id) setLoading(false);
  }, [authLoading, profile?.tenant_id]);

  // -- ACCIONES DE FORMULARIO --
  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const guardarCliente = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      if (!formData.identificacion)
        throw new Error("La identificación es obligatoria");
      if (!formData.nombre_completo)
        throw new Error("El nombre o razón social es obligatorio");

      const payload = {
        tenant_id: profile.tenant_id,
        tipo_entidad: formData.tipo_cliente,
        identificacion: formData.identificacion,
        nombre_completo: formData.nombre_completo,
        email: formData.email,
        whatsapp: formData.whatsapp || formData.responsable_celular,
        direccion_domicilio: formData.direccion_domicilio,
        ciudad: formData.ciudad,
        provincia: formData.provincia,
        pais: formData.pais,

        nombre_referencia: formData.referencia1_nombre,
        telefono_referencia: formData.referencia1_celular,
        nombre_referencia_2: formData.referencia2_nombre,
        telefono_referencia_2: formData.referencia2_celular,

        tipo_empresa: formData.tipo_empresa,
        nombre_empresa:
          formData.tipo_cliente === "empresa" ? formData.nombre_completo : null,
        ruc_empresa:
          formData.tipo_cliente === "empresa" ? formData.identificacion : null,
        nombre_responsable_empresa: formData.responsable_nombre,
        telefono_responsable_empresa: formData.responsable_celular,
        email_responsable_empresa: formData.responsable_email,
      };

      Object.keys(payload).forEach(
        (key) => payload[key] === undefined && delete payload[key],
      );

      if (formData.id) {
        const { error } = await supabase
          .from("clientes")
          .update(payload)
          .eq("id", formData.id);
        if (error) {
          if (error.code === "23505")
            throw new Error(
              "Ya existe un cliente con esta identificación (Cédula o RUC)",
            );
          throw error;
        }
        toast.success("Ficha de cliente actualizada");
      } else {
        const { error } = await supabase
          .from("clientes")
          .insert([{ ...payload, creado_por: profile.id }]);
        if (error) {
          if (error.code === "23505")
            throw new Error(
              "Ya existe un cliente con esta identificación (Cédula o RUC)",
            );
          throw error;
        }
        toast.success("Nuevo cliente registrado exitosamente");
      }

      setFormData(initialForm);
      setTab("lista");
      fetchData();
    } catch (err) {
      toast.error(err.message || "Error guardando cliente");
    } finally {
      setIsProcessing(false);
    }
  };

  const editar = (p) => {
    setFormData({
      ...initialForm,
      id: p.id,
      tipo_cliente: p.tipo_entidad || "natural",
      identificacion: p.identificacion || "",
      nombre_completo: p.nombre_completo || "",
      email: p.email || "",
      whatsapp: p.whatsapp || "",
      direccion_domicilio: p.direccion_domicilio || "",
      ciudad: p.ciudad || "",
      provincia: p.provincia || "",
      pais: p.pais || "Ecuador",

      referencia1_nombre: p.nombre_referencia || "",
      referencia1_celular: p.telefono_referencia || "",
      referencia2_nombre: p.nombre_referencia_2 || "",
      referencia2_celular: p.telefono_referencia_2 || "",

      tipo_empresa: p.tipo_empresa || "",
      responsable_nombre: p.nombre_responsable_empresa || "",
      responsable_celular: p.telefono_responsable_empresa || "",
      responsable_email: p.email_responsable_empresa || "",
    });
    setTab("editar");
  };

  const verPerfil = async (p) => {
    setClienteActivo(p);
    setTab("perfil");

    try {
      const { data: mc, error } = await supabase
        .from('contratos')
        .select('id, created_at, total, estado')
        .eq('cliente_id', p.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mapped = (mc || []).map((tx) => ({
        id: tx.id,
        codigo: `CTX-${tx.id.split('-')[0].toUpperCase()}`,
        fecha: new Date(tx.created_at).toLocaleDateString(),
        total: tx.total || 0,
        estado: tx.estado
      }));
      
      setContratosCliente(mapped);
    } catch (e) {
      toast.error('Error cargando historial de contratos');
      setContratosCliente([]);
    }
  };

  const softDelete = async (id) => {
    if (
      !confirm(
        "¿Seguro quieres eliminar a este cliente? Se mantendrá en el registro de contratos antiguos pero desaparecerá del módulo de clientes y búsqueda por POS.",
      )
    )
      return;
    try {
      await supabase
        .from("clientes")
        .update({ deleted_at: new Date() })
        .eq("id", id);
      toast.success("Cliente eliminado (Soft delete)");
      fetchData();
    } catch (e) {
      toast.error("Error al ocultar cliente");
    }
  };

  // -- RENDER FILTRADO LISTA --
  const listaFiltrada = clientes.filter((p) => {
    if (
      searchDocName &&
      !p.nombre_completo?.toLowerCase().includes(searchDocName.toLowerCase()) &&
      !p.identificacion?.includes(searchDocName)
    )
      return false;
    if (filterTipo && p.tipo_cliente !== filterTipo) return false;
    if (filterProvincia && p.provincia !== filterProvincia) return false;
    if (filterCiudad && p.ciudad?.toLowerCase() !== filterCiudad.toLowerCase())
      return false;
    return true;
  });

  const getStatusBadge = (estado) => {
    if (estado === "devuelto_ok")
      return (
        <span className="text-[9px] font-black uppercase tracking-widest text-green-400 bg-green-500/10 px-2 py-1 rounded">
          Cerrado OK
        </span>
      );
    if (estado === "devuelto_con_problemas")
      return (
        <span className="text-[9px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 px-2 py-1 rounded">
          Conflictos
        </span>
      );
    return (
      <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-primary)] bg-primary/10 px-2 py-1 rounded">
        {estado}
      </span>
    );
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter uppercase mb-2">
          Cartera de Clientes
        </h1>
        <p className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">
          Personas y Empresas
        </p>
      </div>

      <ModuleNavbar
        currentTab={currentTab}
        setTab={(t) => {
          if (t === "nuevo") setFormData(initialForm);
          setTab(t);
        }}
      />

      {/* VISTA LISTADO */}
      {currentTab === "lista" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3">
            <div className="relative flex-[2]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="text"
                className="input-guambra input-guambra-search h-11 text-sm w-full"
                placeholder="Buscar por Nombre, Razón Social o Cédula/RUC..."
                value={searchDocName}
                onChange={(e) => setSearchDocName(e.target.value)}
              />
            </div>
            <select
              className="input-guambra flex-1 h-11 text-sm"
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
            >
              <option value="">Cualquier Tipo</option>
              <option value="natural">Persona Natural</option>
              <option value="empresa">Empresa</option>
            </select>
            <select
              className="input-guambra flex-1 h-11 text-sm"
              value={filterProvincia}
              onChange={(e) => setFilterProvincia(e.target.value)}
            >
              <option value="">Todas Provincias</option>
              {MOCK_PROVINCES_ECUADOR.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="text"
                className="input-guambra input-guambra-search h-11 w-full text-sm"
                placeholder="Ciudad..."
                value={filterCiudad}
                onChange={(e) => setFilterCiudad(e.target.value)}
              />
            </div>
          </div>

          {/* Tabla */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)]">
                  <tr>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                      Nombre / Empresa
                    </th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                      Cédula / RUC
                    </th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                      Ubicación
                    </th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                      Contacto Directo
                    </th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">
                      Contratos
                    </th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="p-12 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--color-primary)]" />
                      </td>
                    </tr>
                  ) : listaFiltrada.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]"
                      >
                        No se encontraron clientes para mostrar
                      </td>
                    </tr>
                  ) : (
                    listaFiltrada.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-white/[0.02] transition-colors group"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-black/50 border border-[var(--border-soft)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-primary/20 group-hover:text-[var(--color-primary)] transition-all">
                              {p.tipo_cliente === "empresa" ? (
                                <Building2 className="w-4 h-4" />
                              ) : (
                                <User className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-[var(--text-primary)] text-sm">
                                {p.nombre_completo}
                              </p>
                              <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">
                                {p.tipo_cliente === "empresa"
                                  ? "Personalidad Jurídica"
                                  : "Persona Natural"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono font-bold text-[var(--text-primary)] tracking-widest text-sm">
                          {p.identificacion}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[150px]">
                              {p.ciudad}
                              {p.provincia ? `, ${p.provincia}` : ""}
                            </span>
                            <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest truncate max-w-[150px]">
                              {p.direccion_domicilio ||
                                p.direccion ||
                                "Sin dirección"}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                              <Phone className="w-3 h-3 text-[var(--color-primary)]" />{" "}
                              {p.whatsapp || p.telefono || "N/A"}
                            </span>
                            {p.email && (
                              <span className="text-[9px] text-[var(--text-muted)] w-full truncate">
                                <Mail className="w-3 h-3 inline mr-1 opacity-50" />{" "}
                                {p.email}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center justify-center bg-[var(--bg-surface-2)] border border-[var(--border-soft)] px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--text-primary)]">
                            {p.total_contratos}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => verPerfil(p)}
                            className="p-2 hover:bg-white/10 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                            title="Ver Perfil Histórico"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => editar(p)}
                            className="p-2 hover:bg-white/10 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                            title="Modificar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => softDelete(p.id)}
                            className="p-2 hover:bg-red-500/20 rounded-lg text-red-400/50 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VISTA PERFIL COMPLETO (Historial) */}
      {currentTab === "perfil" && clienteActivo && (
        <div className="animate-in slide-in-from-right-4">
          <div className="flex gap-8 flex-col lg:flex-row">
            {/* Columna 1: Tarjeta Ciente */}
            <div className="glass-card p-8 lg:w-1/3 h-fit sticky top-24">
              <div className="w-20 h-20 rounded-2xl bg-primary/20 border border-primary text-[var(--color-primary)] flex items-center justify-center mb-6 shadow-xl shadow-primary/20">
                {clienteActivo.tipo_cliente === "empresa" ? (
                  <Building2 className="w-10 h-10" />
                ) : (
                  <User className="w-10 h-10" />
                )}
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-primary)] mb-1">
                {clienteActivo.nombre_completo}
              </h2>
              <p className="text-sm font-mono tracking-widest text-[var(--color-primary)] mb-6">
                ID: {clienteActivo.identificacion}
              </p>

              <div className="space-y-4 pt-6 border-t border-[var(--border-soft)] mb-6">
                <div className="flex gap-4 items-start">
                  <Phone className="w-4 h-4 text-[var(--text-muted)] mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                      WhatsApp / Teléfono
                    </span>
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {clienteActivo.whatsapp ||
                        clienteActivo.telefono ||
                        "No registrado"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <Mail className="w-4 h-4 text-[var(--text-muted)] mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                      Email
                    </span>
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {clienteActivo.email || "No registrado"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <MapPin className="w-4 h-4 text-[var(--text-muted)] mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                      Dirección
                    </span>
                    <span className="text-sm font-bold text-[var(--text-primary)] leading-tight">
                      {clienteActivo.direccion_domicilio ||
                        clienteActivo.direccion ||
                        "Sin domicilio"}{" "}
                      <br />{" "}
                      <span className="text-[var(--text-muted)] font-normal text-xs">
                        {clienteActivo.ciudad}
                        {clienteActivo.provincia
                          ? `, ${clienteActivo.provincia}`
                          : ""}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setTab("lista")}
                className="btn-guambra-secondary w-full text-xs"
              >
                Cerrar y Volver
              </button>
            </div>

            {/* Columna 2: Record Contratos */}
            <div className="glass-card flex-1 p-8">
              <div className="flex justify-between items-center mb-8 pb-6 border-b border-[var(--border-soft)]">
                <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
                  <Calendar className="text-[var(--color-primary)] w-5 h-5" /> Historial de
                  Contratos
                </h3>
                <span className="px-4 py-2 bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-full text-xs font-bold font-mono text-[var(--text-secondary)]">
                  Total Vidas: {clienteActivo.total_contratos}
                </span>
              </div>

              <div className="space-y-4">
                {contratosCliente.length === 0 ? (
                  <div className="p-12 text-center text-[var(--text-muted)] text-[10px] uppercase font-black tracking-widest border-2 border-dashed border-[var(--border-soft)] rounded-2xl">
                    El cliente no tiene contratos finalizados o cancelados
                  </div>
                ) : (
                  contratosCliente.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-4 bg-black/40 border border-[var(--border-soft)] rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 hover:bg-[var(--bg-surface-2)] transition-all"
                    >
                      <div className="flex items-center gap-6 min-w-[200px]">
                        <div className="w-12 h-12 bg-[var(--bg-surface-2)] rounded-xl border border-[var(--border-soft)] flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-[var(--text-muted)]" />
                        </div>
                        <div>
                          <p className="font-mono font-black text-[var(--text-primary)]">
                            {tx.codigo}
                          </p>
                          <p className="text-[10px] uppercase tracking-widest text-[var(--color-primary)] font-bold">
                            {tx.fecha}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 items-center">
                        {getStatusBadge(tx.estado)}
                        <span className="text-lg font-black tracking-tighter text-[var(--text-primary)] font-mono w-24 text-right">
                          ${tx.total?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-8">
                <button
                  onClick={() => {
                    toast.info(
                      "Funcionalidad de exportación a PDF se agregará en siguiente fase",
                    );
                  }}
                  className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] border-b border-[var(--border-soft)] hover:border-white transition-all pb-1"
                >
                  Descargar Reporte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA NUEVA / EDITAR CLIENTE */}
      {(currentTab === "nuevo" || currentTab === "editar") && (
        <form
          onSubmit={guardarCliente}
          className="glass-card p-6 md:p-10 animate-in slide-in-from-right-4 space-y-10"
        >
          {/* 1. Naturaleza del Cliente */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)] mb-6 border-b border-primary/20 pb-4 flex items-center gap-3">
              <Users className="w-5 h-5" /> 1. Tipología
            </h3>
            <div className="flex bg-black/40 border border-[var(--border-soft)] p-1 rounded-xl w-fit max-w-full">
              <button
                type="button"
                onClick={() => handleChange("tipo_cliente", "natural")}
                className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-3 ${formData.tipo_cliente === "natural" ? "bg-primary text-[var(--text-primary)] shadow-lg shadow-primary/20" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
              >
                <User className="w-4 h-4" /> Persona Natural
              </button>
              <button
                type="button"
                onClick={() => handleChange("tipo_cliente", "empresa")}
                className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-3 ${formData.tipo_cliente === "empresa" ? "bg-white/10 text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
              >
                <Building2 className="w-4 h-4" /> Empresa Corporativa
              </button>
            </div>
          </div>

          {/* FORMULARIO PERSONA NATURAL */}
          {formData.tipo_cliente === "natural" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)] mb-6 border-b border-primary/20 pb-4">
                2. Datos de Identidad
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                    Nombres Completos <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="input-guambra"
                    value={formData.nombre_completo}
                    onChange={(e) =>
                      handleChange("nombre_completo", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                    Cédula o Pasaporte <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="input-guambra"
                    value={formData.identificacion}
                    onChange={(e) =>
                      handleChange("identificacion", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                    Teléfono WhatsApp <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    type="tel"
                    className="input-guambra"
                    value={formData.whatsapp}
                    onChange={(e) => handleChange("whatsapp", e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                    Correo Electrónico <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    type="email"
                    className="input-guambra"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>
              </div>

              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)] mb-6 border-b border-primary/20 pb-4 flex items-center gap-3">
                <MapPin className="w-4 h-4" /> 3. Residencia y Logística
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="md:col-span-3">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                    Dirección de Domicilio Exacta{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="input-guambra"
                    value={formData.direccion_domicilio}
                    onChange={(e) =>
                      handleChange("direccion_domicilio", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                    País <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    className="input-guambra"
                    value={formData.pais}
                    onChange={(e) => handleChange("pais", e.target.value)}
                  >
                    <option value="Ecuador">Ecuador</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                    Provincia <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    className="input-guambra"
                    value={formData.provincia}
                    onChange={(e) => handleChange("provincia", e.target.value)}
                  >
                    <option value="">Seleccione...</option>
                    {MOCK_PROVINCES_ECUADOR.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                    Ciudad <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="input-guambra"
                    value={formData.ciudad}
                    onChange={(e) => handleChange("ciudad", e.target.value)}
                  />
                </div>
              </div>

              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)] mb-6 border-b border-primary/20 pb-4">
                4. Contactos de Referencia Alternos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4 bg-black/40 p-4 rounded-xl border border-[var(--border-soft)]">
                  <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] border-b border-[var(--border-soft)] pb-2 mb-4">
                    Referencia 1
                  </h4>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                      Nombre Ref 1
                    </label>
                    <input
                      type="text"
                      className="input-guambra bg-[var(--bg-surface-2)] border-[var(--border-soft)]"
                      value={formData.referencia1_nombre}
                      onChange={(e) =>
                        handleChange("referencia1_nombre", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                      Celular Ref 1
                    </label>
                    <input
                      type="tel"
                      className="input-guambra bg-[var(--bg-surface-2)] border-[var(--border-soft)]"
                      value={formData.referencia1_celular}
                      onChange={(e) =>
                        handleChange("referencia1_celular", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="space-y-4 bg-black/40 p-4 rounded-xl border border-[var(--border-soft)]">
                  <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] border-b border-[var(--border-soft)] pb-2 mb-4">
                    Referencia 2
                  </h4>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                      Nombre Ref 2
                    </label>
                    <input
                      type="text"
                      className="input-guambra bg-[var(--bg-surface-2)] border-[var(--border-soft)]"
                      value={formData.referencia2_nombre}
                      onChange={(e) =>
                        handleChange("referencia2_nombre", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                      Celular Ref 2
                    </label>
                    <input
                      type="tel"
                      className="input-guambra bg-[var(--bg-surface-2)] border-[var(--border-soft)]"
                      value={formData.referencia2_celular}
                      onChange={(e) =>
                        handleChange("referencia2_celular", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FORMULARIO EMPRESA */}
          {formData.tipo_cliente === "empresa" && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)] mb-6 border-b border-primary/20 pb-4">
                2. Datos Jurídicos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                    RUC <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="input-guambra"
                    value={formData.identificacion}
                    onChange={(e) =>
                      handleChange("identificacion", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                    Tipo de Empresa <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="input-guambra"
                    value={formData.tipo_empresa}
                    onChange={(e) =>
                      handleChange("tipo_empresa", e.target.value)
                    }
                    placeholder="Ej. Agencia Publicitaria"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                    Razón Social / Nombre Comercial{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="input-guambra"
                    value={formData.nombre_completo}
                    onChange={(e) =>
                      handleChange("nombre_completo", e.target.value)
                    }
                  />
                </div>
              </div>

              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)] mb-6 border-b border-primary/20 pb-4 flex items-center gap-3">
                <MapPin className="w-4 h-4" /> 3. Sede Matriz Logística
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="md:col-span-3">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                    Dirección de Matriz <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="input-guambra"
                    value={formData.direccion_domicilio}
                    onChange={(e) =>
                      handleChange("direccion_domicilio", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                    País <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    className="input-guambra"
                    value={formData.pais}
                    onChange={(e) => handleChange("pais", e.target.value)}
                  >
                    <option value="Ecuador">Ecuador</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                    Provincia <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    className="input-guambra"
                    value={formData.provincia}
                    onChange={(e) => handleChange("provincia", e.target.value)}
                  >
                    <option value="">Seleccione...</option>
                    {MOCK_PROVINCES_ECUADOR.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                    Ciudad <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="input-guambra"
                    value={formData.ciudad}
                    onChange={(e) => handleChange("ciudad", e.target.value)}
                  />
                </div>
              </div>

              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)] mb-6 border-b border-primary/20 pb-4">
                4. Personal Legal Responsable
              </h3>
              <div className="bg-black/40 p-6 rounded-2xl border border-[var(--border-soft)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                      Nombre del Representante o Responsable{" "}
                      <span className="text-red-400">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      className="input-guambra bg-[var(--bg-surface-2)] border-[var(--border-soft)]"
                      value={formData.responsable_nombre}
                      onChange={(e) =>
                        handleChange("responsable_nombre", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                      Celular Directo <span className="text-red-400">*</span>
                    </label>
                    <input
                      required
                      type="tel"
                      className="input-guambra bg-[var(--bg-surface-2)] border-[var(--border-soft)]"
                      value={formData.responsable_celular}
                      onChange={(e) =>
                        handleChange("responsable_celular", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                      Email Directo <span className="text-red-400">*</span>
                    </label>
                    <input
                      required
                      type="email"
                      className="input-guambra bg-[var(--bg-surface-2)] border-[var(--border-soft)]"
                      value={formData.responsable_email}
                      onChange={(e) =>
                        handleChange("responsable_email", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-8 border-t border-[var(--border-soft)] flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setTab("lista")}
              className="btn-guambra-secondary !px-8 h-14"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="btn-guambra-primary !px-10 h-14 text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              {currentTab === "editar"
                ? "Actualizar Ficha Técnica"
                : "Registrar Nuevo Cliente"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
