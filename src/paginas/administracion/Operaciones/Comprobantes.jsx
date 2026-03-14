import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { useTenantStore } from '../../../stores/tenantStore';
import { toast } from 'sonner';
import { imprimirComprobante } from '../../../utils/imprimirComprobante';
import {
  FileText, Search, Plus, Trash2,
  User, CheckCircle2, Clock, FileDown,
  AlertCircle, DollarSign, Calculator, ChevronRight, Check, Loader2,
  Printer, Receipt, BadgeCheck
} from 'lucide-react';

const ModuleNavbar = ({ currentTab, setTab }) => (
  <div className="border-b border-[var(--border-soft)] pb-px mb-8 overflow-x-auto no-scrollbar">
    <nav className="-mb-px flex gap-6">
      <button onClick={() => setTab('comprobantes')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${currentTab === 'comprobantes' || currentTab === 'generar_comprobante' ? 'border-primary text-primary' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'}`}>
        <CheckCircle2 className="w-3 h-3"/> Comprobantes Reales
      </button>
      <button onClick={() => setTab('proformas_lista')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all ${currentTab.startsWith('proformas') || currentTab === 'nueva_proforma' || currentTab === 'ver_proforma' ? 'border-primary text-primary' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'}`}>
        Cotizaciones / Proformas
      </button>
    </nav>
  </div>
);

export default function FacturadorSRI() {
  const { profile, loading: authLoading } = useAuthStore();
  const { tenant } = useTenantStore();

  const [currentTab, setTab] = useState('comprobantes');
  const [loading, setLoading] = useState(false);

  // --- ESTADOS COMPROBANTES ---
  const [contratosElegibles, setContratosElegibles] = useState([]);
  const [searchComprobante, setSearchComprobante] = useState('');
  const [contratoActivo, setContratoActivo] = useState(null);
  const [detalleItems, setDetalleItems] = useState([]);
  const [detallePagos, setDetallePagos] = useState([]);
  const [detalleLoading, setDetalleLoading] = useState(false);

  // --- ESTADOS PROFORMAS ---
  const [proformasList, setProformasList] = useState([]);
  const [proformaActiva, setProformaActiva] = useState(null);
  const [searchProforma, setSearchProforma] = useState('');

  const pFormInit = {
    cliente_nombre: '',
    cliente_id: '',
    cliente_email: '',
    cliente_celular: '',
    productos: [],
    vigencia_dias: 5
  };
  const [proformaForm, setProformaForm] = useState(pFormInit);
  const [isProcessing, setIsProcessing] = useState(false);


  // ─── FETCH CONTRATOS REALES (devueltos) ───────────────────────────────────
  const fetchContratos = async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select(`
          id, codigo, fecha_salida, fecha_evento, fecha_devolucion,
          total, tipo_garantia, descripcion_garantia, estado, notas_internas,
          clientes(nombre_completo, identificacion, email, whatsapp)
        `)
        .eq('tenant_id', profile.tenant_id)
        .in('estado', ['devuelto_ok', 'problemas_resueltos'])
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContratosElegibles(data || []);
    } catch (e) {
      toast.error('Error cargando contratos finalizados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && profile?.tenant_id) fetchContratos();
    else if (!authLoading && !profile?.tenant_id) setLoading(false);
  }, [authLoading, profile?.tenant_id]);


  // ─── ABRIR DETALLE DE CONTRATO ────────────────────────────────────────────
  const abrirDetalle = async (contrato) => {
    setContratoActivo(contrato);
    setDetalleLoading(true);
    setDetalleItems([]);
    setDetallePagos([]);
    setTab('generar_comprobante');

    try {
      const [itemsRes, pagosRes] = await Promise.all([
        supabase
          .from('items_contrato')
          .select('*, tallas:items_contrato_tallas(etiqueta_talla, cantidad, nombre_pieza_snapshot)')
          .eq('contrato_id', contrato.id),
        supabase
          .from('pagos_contrato')
          .select('*')
          .eq('contrato_id', contrato.id)
          .order('registrado_en', { ascending: true })
      ]);

      setDetalleItems(itemsRes.data || []);
      setDetallePagos(pagosRes.data || []);
    } catch (e) {
      toast.error('Error cargando detalle del contrato');
    } finally {
      setDetalleLoading(false);
    }
  };

  const handleImprimir = (tipo) => {
    if (!contratoActivo) return;
    imprimirComprobante({
      contrato: contratoActivo,
      items: detalleItems,
      pagos: detallePagos,
      tenant,
      tipo
    });
  };


  // ─── FILTROS ──────────────────────────────────────────────────────────────
  const listContratosFiltrada = contratosElegibles.filter(c => {
    const q = searchComprobante.toLowerCase();
    if (!q) return true;
    const nombre = c.clientes?.nombre_completo || '';
    const codigo = c.codigo || c.id?.toString().slice(0, 8).toUpperCase() || '';
    const cedula = c.clientes?.identificacion || '';
    return nombre.toLowerCase().includes(q) || codigo.toLowerCase().includes(q) || cedula.includes(q);
  });


  // ─── LÓGICA PROFORMAS ─────────────────────────────────────────────────────
  const handleProformaChange = (f, v) => setProformaForm(p => ({...p, [f]: v}));

  const addProductoProforma = () => {
    setProformaForm(p => ({
      ...p,
      productos: [...p.productos, { id: Date.now(), nombre: '', cantidad: 1, p_unitario: 0, descuento_tipo: 'Fijo', descuento_val: 0, subtotal: 0 }]
    }));
  };

  const removeProductoProforma = (id) => {
    setProformaForm(p => ({ ...p, productos: p.productos.filter(x => x.id !== id) }));
  };

  const updateProductoProforma = (id, field, val) => {
    setProformaForm(prev => {
      const arr = prev.productos.map(p => {
        if (p.id !== id) return p;
        const nP = { ...p, [field]: val };
        let bruto = (parseFloat(nP.cantidad) || 0) * (parseFloat(nP.p_unitario) || 0);
        let desc = parseFloat(nP.descuento_val) || 0;
        if (nP.descuento_tipo === '%') bruto = bruto - (bruto * (desc / 100));
        else bruto = bruto - desc;
        nP.subtotal = Math.max(0, bruto);
        return nP;
      });
      return { ...prev, productos: arr };
    });
  };

  const proformaTotal = proformaForm.productos.reduce((acc, p) => acc + (p.subtotal || 0), 0);

  const generarProformaBD = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      if (!proformaForm.cliente_nombre || proformaForm.productos.length === 0)
        throw new Error('Cliente o productos no presentes.');

      const fechaEmision = new Date();
      const fechaVence = new Date();
      fechaVence.setDate(fechaVence.getDate() + parseInt(proformaForm.vigencia_dias));

      const payload = {
        id: `PRF-${Math.floor(Math.random() * 900) + 100}T`,
        cliente_nombre: proformaForm.cliente_nombre,
        fecha_creacion: fechaEmision.toISOString().split('T')[0],
        vigencia_hasta: fechaVence.toISOString().split('T')[0],
        vigencia_dias: proformaForm.vigencia_dias,
        estado: 'Vigente',
        total: proformaTotal,
        productos: proformaForm.productos
      };

      setProformasList([payload, ...proformasList]);
      toast.success('Proforma generada. Lista para exportar en PDF.');
      setProformaForm(pFormInit);
      setTab('proformas_lista');
      setTimeout(() => { setProformaActiva(payload); setTab('ver_proforma'); }, 500);
    } catch (err) {
      toast.error(err.message || 'Error generando proforma');
    } finally {
      setIsProcessing(false);
    }
  };

  const filterProformasL = proformasList.filter(p => {
    const q = searchProforma.toLowerCase();
    if (!q) return true;
    return p.id.toLowerCase().includes(q) || p.cliente_nombre.toLowerCase().includes(q);
  });


  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="print-hidden">
        <ModuleNavbar currentTab={currentTab} setTab={setTab} />
      </div>

      {/* ============================================================ */}
      {/* VISTA: LISTA DE CONTRATOS FINALIZADOS                        */}
      {/* ============================================================ */}

      {currentTab === 'comprobantes' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">

          <div className="glass-card bg-primary/5 relative overflow-hidden flex flex-col md:flex-row justify-between items-center p-8 border border-primary/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="relative z-10 w-full mb-4 md:mb-0">
              <h2 className="text-xl font-black uppercase tracking-widest text-[var(--text-primary)] flex items-center gap-3 mb-2">
                <Receipt className="w-6 h-6 text-primary"/> Comprobantes de Servicio
              </h2>
              <p className="text-xs font-bold text-primary/60 max-w-lg">
                Disponible para contratos marcados como <strong>Devuelto sin problemas</strong> o <strong>Devuelto con incidentes resueltos</strong>. Genera comprobante interno o factura (conexión SRI próximamente).
              </p>
            </div>
          </div>

          <div className="flex glass-card p-4 relative">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"/>
            <input
              type="text"
              className="input-guambra w-full h-12 text-sm pl-10"
              placeholder="Buscar por cliente, código o cédula..."
              value={searchComprobante}
              onChange={e => setSearchComprobante(e.target.value)}
            />
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)]">
                  <tr>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] w-1/4">Cliente</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Código / Evento</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Estado</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Total</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Documentos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {loading ? (
                    <tr><td colSpan="5" className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
                  ) : listContratosFiltrada.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-12 text-center">
                        <BadgeCheck className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-40"/>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                          {searchComprobante ? 'Ningún contrato coincide con la búsqueda.' : 'Aún no hay contratos finalizados.'}
                        </p>
                      </td>
                    </tr>
                  ) : listContratosFiltrada.map(c => (
                    <tr key={c.id} className="hover:bg-[var(--bg-surface-2)] transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-[var(--text-primary)] text-sm">{c.clientes?.nombre_completo || '—'}</p>
                        <span className="text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1 mt-1">
                          <User className="w-3 h-3"/> {c.clientes?.identificacion || '—'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--text-muted)] border border-[var(--border-soft)] px-2 py-0.5 rounded bg-[var(--bg-surface-2)] inline-block mb-1">
                          {c.codigo || `TX-${(c.id || '').substring(0, 8).toUpperCase()}`}
                        </span>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                          Evento: {c.fecha_evento ? new Date(c.fecha_evento).toLocaleDateString('es-EC', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                        </p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-dashed inline-block ${c.estado === 'devuelto_ok' ? 'bg-green-500/5 text-green-500/80 border-green-500/20' : 'bg-orange-500/5 text-orange-500/80 border-orange-500/20'}`}>
                          {c.estado === 'devuelto_ok' ? 'Sin problemas' : 'Incidentes resueltos'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-base font-mono font-black text-[var(--text-primary)]">
                          ${parseFloat(c.total || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => abrirDetalle(c)}
                          className="btn-guambra-primary !px-4 !py-2 text-[10px] flex gap-2 ml-auto shadow-none"
                        >
                          Ver Documentos <ChevronRight className="w-3 h-3"/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* ============================================================ */}
      {/* VISTA: DOCUMENTOS DEL CONTRATO (COMPROBANTE / FACTURA)       */}
      {/* ============================================================ */}

      {currentTab === 'generar_comprobante' && contratoActivo && (
        <div className="animate-in slide-in-from-right-4 space-y-6">
          <button
            onClick={() => setTab('comprobantes')}
            className="btn-guambra-secondary self-start !px-6 text-[10px] border-none"
          >
            ← Volver a Contratos
          </button>

          {detalleLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 text-primary animate-spin"/>
            </div>
          ) : (
            <>
              {/* Resumen del Contrato */}
              <div className="glass-card p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-[var(--border-soft)] pb-6">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Contrato Finalizado</p>
                    <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                      {contratoActivo.clientes?.nombre_completo || '—'}
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Ref: <span className="font-mono">{contratoActivo.codigo || `TX-${(contratoActivo.id || '').substring(0, 8).toUpperCase()}`}</span>
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-dashed w-fit h-fit ${contratoActivo.estado === 'devuelto_ok' ? 'bg-green-500/5 text-green-500 border-green-500/30' : 'bg-orange-500/5 text-orange-500 border-orange-500/30'}`}>
                    {contratoActivo.estado === 'devuelto_ok' ? 'Devuelto sin problemas' : 'Devuelto — Incidentes resueltos'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Evento', val: contratoActivo.fecha_evento ? new Date(contratoActivo.fecha_evento + 'T12:00:00').toLocaleDateString('es-EC') : '—' },
                    { label: 'Devolución', val: contratoActivo.fecha_devolucion ? new Date(contratoActivo.fecha_devolucion + 'T12:00:00').toLocaleDateString('es-EC') : '—' },
                    { label: 'Total Contrato', val: `$${parseFloat(contratoActivo.total || 0).toFixed(2)}` },
                    { label: 'Garantía', val: `$${parseFloat(contratoActivo.garantia || 0).toFixed(2)}` },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-[var(--bg-surface-2)] rounded-xl p-4 border border-[var(--border-soft)]">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">{label}</p>
                      <p className="font-black text-[var(--text-primary)] text-base">{val}</p>
                    </div>
                  ))}
                </div>

                {/* Items */}
                {detalleItems.length > 0 && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">Trajes / Artículos del Contrato</p>
                    <div className="rounded-xl overflow-hidden border border-[var(--border-soft)]">
                      <table className="w-full text-left">
                        <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)]">
                          <tr>
                            <th className="p-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Descripción</th>
                            <th className="p-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Cant.</th>
                            <th className="p-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">P. Unit.</th>
                            <th className="p-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-soft)]">
                          {detalleItems.map((item, i) => (
                            <tr key={i} className="hover:bg-[var(--bg-surface-2)] transition-colors">
                              <td className="p-3 font-bold text-[var(--text-primary)] text-sm">
                                {item.nombre_item || '—'}
                                {item.tallas?.length > 0 && (
                                  <span className="block text-[10px] text-[var(--text-muted)] font-normal mt-0.5">
                                    Tallas: {item.tallas.map(t => t.etiqueta_talla).join(', ')}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center font-mono text-[var(--text-secondary)]">{item.cantidad}</td>
                              <td className="p-3 text-right font-mono text-[var(--text-secondary)]">
                                ${parseFloat(item.precio_unitario || 0).toFixed(2)}
                              </td>
                              <td className="p-3 text-right font-mono font-black text-[var(--text-primary)]">
                                ${parseFloat(item.subtotal || item.cantidad * parseFloat(item.precio_unitario || 0)).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Pagos */}
                {detallePagos.length > 0 && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">Historial de Pagos</p>
                    <div className="space-y-2">
                      {detallePagos.map((p, i) => (
                        <div key={i} className="flex justify-between items-center px-4 py-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)]">
                          <div>
                            <span className="text-xs font-bold text-[var(--text-primary)] capitalize">{p.tipo_pago || p.concepto || 'Pago'}</span>
                            <span className="text-[10px] text-[var(--text-muted)] ml-2">{p.registrado_en ? new Date(p.registrado_en).toLocaleDateString('es-EC') : '—'}</span>
                          </div>
                          <span className="font-mono font-black text-[var(--text-primary)]">${parseFloat(p.monto || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Acciones de Impresión */}
              <div className="glass-card p-6 border border-primary/20 bg-primary/5">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4">Generar Documento</p>
                <div className="flex flex-col sm:flex-row gap-4">

                  {/* COMPROBANTE */}
                  <button
                    onClick={() => handleImprimir('comprobante')}
                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] hover:border-primary/40 hover:bg-primary/5 transition-all group"
                  >
                    <div className="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Printer className="w-5 h-5 text-primary"/>
                    </div>
                    <div className="text-left">
                      <p className="font-black text-[var(--text-primary)] text-sm uppercase tracking-wide">Comprobante</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Documento interno de liquidación</p>
                    </div>
                  </button>

                  {/* FACTURA SRI */}
                  <button
                    onClick={() => handleImprimir('factura')}
                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] hover:border-yellow-500/40 hover:bg-yellow-500/5 transition-all group relative"
                  >
                    <div className="p-2 rounded-xl bg-yellow-500/10 group-hover:bg-yellow-500/20 transition-colors">
                      <FileText className="w-5 h-5 text-yellow-500"/>
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-[var(--text-primary)] text-sm uppercase tracking-wide">Factura SRI</p>
                        <span className="text-[8px] font-black uppercase tracking-widest bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/30">Próximamente</span>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)]">Documento tributario — Conexión SRI Ecuador</p>
                    </div>
                  </button>

                </div>
              </div>
            </>
          )}
        </div>
      )}


      {/* ============================================================ */}
      {/* VISTA: LISTA DE PROFORMAS / HISTORIAL                        */}
      {/* ============================================================ */}

      {currentTab === 'proformas_lista' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex glass-card p-3 relative flex-1 max-w-sm">
              <input
                type="text"
                className="input-guambra w-full h-10 text-sm !border-none"
                placeholder="Buscar Razón Social o ID..."
                value={searchProforma}
                onChange={e => setSearchProforma(e.target.value)}
              />
            </div>
            <button onClick={() => setTab('nueva_proforma')} className="btn-guambra-primary flex items-center gap-2">
              <Plus className="w-4 h-4"/> Emitir Proforma
            </button>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)]">
                  <tr>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] w-1/4">Folio Proforma</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Vigencia</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Estado</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Total</th>
                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {filterProformasL.length === 0 ? (
                    <tr><td colSpan="5" className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Librería de cotizaciones vacía.</td></tr>
                  ) : filterProformasL.map(p => {
                    const hVencida = new Date() > new Date(p.vigencia_hasta + 'T23:59:59Z');
                    return (
                      <tr key={p.id} className={`hover:bg-[var(--bg-surface-2)] transition-colors ${hVencida ? 'opacity-50 hover:opacity-100' : ''}`}>
                        <td className="p-4">
                          <p className="font-bold text-[var(--text-primary)] text-sm">{p.cliente_nombre}</p>
                          <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--text-muted)] block mt-1">{p.id}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-bold tracking-widest text-[var(--text-muted)] uppercase"><Clock className="w-3 h-3 inline"/> Nace: {new Date(p.fecha_creacion).toLocaleDateString()}</span>
                            <span className="text-[9px] font-bold tracking-widest text-primary/80 uppercase">Vence: {new Date(p.vigencia_hasta).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-dashed text-center inline-block ${!hVencida ? 'bg-primary/10 text-primary border-primary/30' : 'bg-red-500/10 text-red-500/80 border-red-500/20'}`}>
                            {!hVencida ? `${p.vigencia_dias} Días Activa` : 'Vencida'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-base font-mono font-black text-[var(--text-primary)]">${p.total?.toFixed(2)}</span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => { setProformaActiva(p); setTab('ver_proforma'); }}
                            className="p-2.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface-2)] border border-[var(--border-soft)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-surface-3)] transition-all font-black text-xs uppercase tracking-widest flex ml-auto gap-2"
                          >
                            <Calculator className="w-4 h-4"/> Ver
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* ============================================================ */}
      {/* VISTA: FORMULARIO NUEVA PROFORMA                             */}
      {/* ============================================================ */}

      {currentTab === 'nueva_proforma' && (
        <form onSubmit={generarProformaBD} className="max-w-5xl mx-auto pb-20 animate-in slide-in-from-right-4">
          <button type="button" onClick={() => setTab('proformas_lista')} className="btn-guambra-secondary self-start mb-6 !px-6 text-[10px] border-transparent">
            <ChevronRight className="w-3 h-3 rotate-180 inline"/> Cancelar
          </button>

          <div className="glass-card p-10 space-y-12">
            <div className="border-b border-[var(--border-soft)] pb-6">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-primary)] mb-2">
                <Calculator className="w-6 h-6 inline mr-2 text-primary -translate-y-1"/> Nueva Cotización / Proforma
              </h2>
              <p className="text-xs text-[var(--text-secondary)] max-w-xl">
                Crea presupuestos formales. No reservan inventario. Sirven como referencia para convertir en contrato.
              </p>
            </div>

            {/* P1: CLIENTE */}
            <div className="space-y-6">
              <h3 className="text-[10px] uppercase font-black text-primary tracking-[0.2em] flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-primary/20 flex text-center items-center justify-center text-primary">1</div> Datos del Cliente
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--bg-surface-2)] p-6 rounded-2xl border border-[var(--border-soft)]">
                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Nombre del Cliente <span className="text-primary">*</span></label>
                  <input required type="text" className="input-guambra !h-14 font-bold" value={proformaForm.cliente_nombre} onChange={e => handleProformaChange('cliente_nombre', e.target.value)} placeholder="Nombre completo..." />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Cédula / RUC</label>
                  <input type="text" className="input-guambra" value={proformaForm.cliente_id} onChange={e => handleProformaChange('cliente_id', e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Email / WhatsApp</label>
                  <input type="text" className="input-guambra" value={proformaForm.cliente_email} onChange={e => handleProformaChange('cliente_email', e.target.value)} placeholder="usuario@email.com o número" />
                </div>
              </div>
            </div>

            {/* P2: PRODUCTOS */}
            <div className="space-y-6 relative">
              <h3 className="text-[10px] uppercase font-black text-primary tracking-[0.2em] flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-primary/20 flex text-center items-center justify-center text-primary">2</div> Artículos / Servicios
              </h3>

              <div className="bg-[var(--bg-surface-3)] rounded-2xl border border-[var(--border-soft)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)]">
                      <tr>
                        <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] w-2/5">Descripción</th>
                        <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center w-20">Uds.</th>
                        <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right w-32">Precio U.</th>
                        <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Descuento</th>
                        <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right w-32">Subtotal</th>
                        <th className="p-4 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-soft)]">
                      {proformaForm.productos.map(p => (
                        <tr key={p.id} className="group">
                          <td className="p-3">
                            <input required type="text" className="input-guambra !h-10 text-sm" placeholder="Traje, accesorio..." value={p.nombre} onChange={e => updateProductoProforma(p.id, 'nombre', e.target.value)} />
                          </td>
                          <td className="p-3">
                            <input required type="number" min="1" className="input-guambra !h-10 text-sm text-center" value={p.cantidad} onChange={e => updateProductoProforma(p.id, 'cantidad', e.target.value)} />
                          </td>
                          <td className="p-3 relative">
                            <DollarSign className="w-3 h-3 absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] z-10"/>
                            <input required type="number" step="0.01" min="0" className="input-guambra !h-10 text-sm font-mono text-right pl-6" value={p.p_unitario} onChange={e => updateProductoProforma(p.id, 'p_unitario', e.target.value)} />
                          </td>
                          <td className="p-3">
                            <div className="flex bg-[var(--bg-input)] rounded-xl overflow-hidden border border-[var(--border-soft)]">
                              <select className="bg-transparent border-r border-[var(--border-soft)] text-xs font-black text-primary px-2 outline-none" value={p.descuento_tipo} onChange={e => updateProductoProforma(p.id, 'descuento_tipo', e.target.value)}>
                                <option value="Fijo">-$</option>
                                <option value="%">% Off</option>
                              </select>
                              <input type="number" min="0" step="0.01" className="w-full bg-transparent text-right text-xs font-mono p-2 outline-none text-[var(--text-primary)] focus:bg-[var(--color-primary-dim)] transition-colors" value={p.descuento_val} onChange={e => updateProductoProforma(p.id, 'descuento_val', e.target.value)} />
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <span className="font-mono font-black text-[var(--text-primary)] bg-[var(--bg-surface-2)] py-1.5 px-3 rounded-lg border border-[var(--border-soft)]">${(p.subtotal || 0).toFixed(2)}</span>
                          </td>
                          <td className="p-3 text-center">
                            <button type="button" onClick={() => removeProductoProforma(p.id)} className="text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4"/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-primary/5 border-t border-primary/20 flex justify-between items-center">
                  <button type="button" onClick={addProductoProforma} className="btn-guambra-secondary bg-primary/10 border-none text-primary/80 hover:bg-primary/20 !py-2 text-[10px]">
                    <Plus className="w-3 h-3 inline mr-1"/> Agregar Artículo
                  </button>
                  <div className="flex items-center gap-4 text-right">
                    <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Total Proforma</span>
                    <span className="text-3xl font-black font-mono text-[var(--text-primary)]">${proformaTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* P3: VIGENCIA */}
            <div className="space-y-6">
              <h3 className="text-[10px] uppercase font-black text-primary tracking-[0.2em] flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-primary/20 flex text-center items-center justify-center text-primary">3</div> Vigencia
              </h3>
              <div className="flex flex-col md:flex-row gap-4">
                {[5, 7, 10].map(dias => (
                  <label key={dias} className={`flex-1 glass-card p-6 cursor-pointer border-2 transition-all group relative overflow-hidden flex items-center justify-center text-center gap-3 ${proformaForm.vigencia_dias == dias ? 'border-primary bg-primary/10' : 'border-transparent hover:border-white/10'}`}>
                    <input type="radio" className="hidden" name="vigencia" value={dias} checked={proformaForm.vigencia_dias == dias} onChange={e => handleProformaChange('vigencia_dias', e.target.value)} />
                    {proformaForm.vigencia_dias == dias && <Check className="w-5 h-5 text-primary"/>}
                    <span className={`text-lg font-black uppercase tracking-widest ${proformaForm.vigencia_dias == dias ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{dias} Días</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-8 border-t border-[var(--border-soft)] flex justify-end">
              <button type="submit" disabled={isProcessing || proformaForm.productos.length === 0} className="btn-guambra-primary flex items-center gap-2 !px-12 !h-16 text-sm disabled:opacity-40">
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin"/> : <FileDown className="w-5 h-5"/>} Generar Proforma
              </button>
            </div>
          </div>
        </form>
      )}


      {/* ============================================================ */}
      {/* VISTA: VER PROFORMA (A4 / PDF)                               */}
      {/* ============================================================ */}

      {currentTab === 'ver_proforma' && proformaActiva && (
        <div className="animate-in slide-in-from-right-4 pt-10">
          <div className="max-w-3xl mx-auto mb-6 flex justify-between items-center print-hidden">
            <button onClick={() => setTab('proformas_lista')} className="btn-guambra-secondary self-start !px-6 text-[10px] border-none">← Volver a Proformas</button>
            <button onClick={() => window.print()} className="btn-guambra-primary flex items-center gap-2 !px-6 !py-2 bg-primary/20 border-primary/40 text-primary hover:bg-primary/30">
              <FileDown className="w-4 h-4"/> Descargar PDF
            </button>
          </div>

          <div className="bg-white text-black max-w-3xl mx-auto p-12 shadow-2xl printable-area min-h-[900px] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-end border-b-2 border-black pb-8 mb-8">
                <div className="flex items-center gap-4">
                  {tenant?.configuracion_tienda?.logo_url ? (
                    <img src={tenant.configuracion_tienda.logo_url} alt="Logo" className="h-16 w-16 object-contain"/>
                  ) : (
                    <div className="w-16 h-16 bg-gray-900 rounded-full"></div>
                  )}
                  <div>
                    <h1 className="text-3xl font-black uppercase text-gray-900 tracking-tighter">{tenant?.nombre_negocio || tenant?.nombre || 'Empresa'}</h1>
                    <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">Propuesta Comercial & Servicios</p>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-4xl font-black uppercase text-gray-200 tracking-tighter select-none">Proforma</h2>
                  <span className="text-black font-mono font-black text-sm uppercase">Nº: {proformaActiva.id}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-12">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Presentado a:</span>
                  <p className="font-black text-gray-900 text-lg uppercase leading-tight">{proformaActiva.cliente_nombre}</p>
                </div>
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-[10px] uppercase font-black text-gray-500">Fecha de Emisión:</span>
                    <span className="text-sm font-bold text-gray-900">{proformaActiva.fecha_creacion}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-[10px] uppercase font-black text-gray-500">Válida Hasta:</span>
                    <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2">{proformaActiva.vigencia_hasta}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 overflow-hidden mb-8">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 border-b border-gray-200 text-gray-500">
                    <tr>
                      <th className="p-4 text-[9px] uppercase font-black tracking-widest">Descripción</th>
                      <th className="p-4 text-[9px] uppercase font-black tracking-widest text-center">Cant.</th>
                      <th className="p-4 text-[9px] uppercase font-black tracking-widest text-right">P. Unitario</th>
                      <th className="p-4 text-[9px] uppercase font-black tracking-widest text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {proformaActiva.productos.map((p, i) => {
                      const hasDisc = parseFloat(p.descuento_val) > 0;
                      return (
                        <tr key={i}>
                          <td className="p-4 font-bold text-gray-800 text-sm">
                            {p.nombre}
                            {hasDisc && <span className="block text-[8px] font-black uppercase text-red-500 mt-1">Descuento: {p.descuento_tipo === '%' ? p.descuento_val + '%' : '-$' + p.descuento_val}</span>}
                          </td>
                          <td className="p-4 text-center font-mono font-bold text-gray-600">{p.cantidad}</td>
                          <td className="p-4 text-right font-mono text-gray-500 text-sm">${p.p_unitario}</td>
                          <td className="p-4 text-right font-mono font-black text-gray-900">${(p.subtotal).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t-2 border-gray-900 pt-6 mt-12">
              <div className="flex justify-between flex-wrap gap-8">
                <div className="max-w-sm">
                  {new Date(proformaActiva.vigencia_hasta + 'T23:59:59Z') < new Date() ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs font-bold text-red-600 leading-relaxed uppercase">Documento Vencido. Contacte al negocio para actualizar disponibilidad y precios.</p>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-[10px] font-bold text-gray-500 leading-relaxed uppercase">Precios válidos por {proformaActiva.vigencia_dias} días desde su emisión. No asegura reserva de inventario hasta firmar contrato.</p>
                    </div>
                  )}
                </div>
                <div className="min-w-[250px] text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Total Estimado (USD)</span>
                  <span className="text-5xl font-mono font-black text-gray-900 tracking-tighter">${proformaActiva.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
