import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useTenantStore } from '../../stores/tenantStore';
import { ClipboardList, Plus, ArrowRight, CheckCircle2, AlertTriangle, Play, Loader2, DollarSign, X, Ban, Search, Eye, User, Calendar, Package, CreditCard, ShieldCheck, ShoppingBag, Edit2, Clock, Trash2, AlertCircle, Building2, MapPin, Printer, FileText, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import NuevoContratoView from './Operaciones/NuevoContrato';
import EditarContrato from './Operaciones/EditarContrato';
import { imprimirContrato } from '../../utils/imprimirContrato';
import { imprimirComprobante } from '../../utils/imprimirComprobante';

// ─── Menú de Navegación Horizontal (igual a Inventario de Trajes) ─────────────
const ModuleNavbar = ({ currentTab, setTab }) => (
  <div className="border-b border-[var(--border-soft)] pb-px mb-8 overflow-x-auto no-scrollbar">
    <nav className="-mb-px flex gap-6">
      <button onClick={() => setTab('nuevo')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${ currentTab === 'nuevo' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]' }`}>
        <Plus className="w-3 h-3" /> Nuevo Contrato
      </button>
      <button onClick={() => setTab('activos')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all ${ currentTab === 'activos' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]' }`}>
        Contratos Activos
      </button>
      <button onClick={() => setTab('problemas')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all ${ currentTab === 'problemas' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]' }`}>
        Con Problemas
      </button>
      <button onClick={() => setTab('historial')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all ${ currentTab === 'historial' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]' }`}>
        Historial
      </button>
    </nav>
  </div>
);

// ─── Helpers compartidos ──────────────────────────────────────────────────────
const getCodigoContrato = (c) => c.codigo || `TX-${(c.id || '').substring(0, 8).toUpperCase()}`;

const getStatusBadge = (estado) => {
  const map = {
    reservado:              { cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30',   label: 'Reservado' },
    entregado:              { cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30',       label: 'En Uso' },
    devuelto_ok:            { cls: 'bg-green-500/20 text-green-400 border-green-500/30',   label: 'Finalizado' },
    devuelto_con_problemas: { cls: 'bg-red-500/20 text-red-400 border-red-500/30',         label: 'Incidencia' },
    problemas_resueltos:    { cls: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Resuelto' },
  };
  const s = map[estado] || { cls: 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-soft)]', label: estado };
  return (
    <span className={`inline-flex items-center rounded-lg px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] border ${s.cls}`}>
      {s.label}
    </span>
  );
};

// ─── Modal compartido: Ver Detalle de Contrato ────────────────────────────────
const ContratoDetalleModal = ({ contrato, onClose, detalleItems, detallePagos, loading }) => (
  <div className="fixed inset-0 z-[200] flex items-start justify-center lg:pl-72 pt-20 px-6 pb-6 overflow-y-auto bg-[var(--bg-page)]/85 backdrop-blur-md">
    <div className="glass-card w-full max-w-4xl animate-in zoom-in-95 shadow-2xl">
      {/* Cabecera */}
      <div className="flex items-center justify-between px-7 py-4 border-b border-[var(--border-soft)]">
        <div className="flex items-center gap-4">
          <p className="font-mono font-black text-[var(--color-primary)] text-base tracking-tight">{getCodigoContrato(contrato)}</p>
          {getStatusBadge(contrato.estado)}
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold hidden sm:block">Detalle del Contrato</span>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--bg-surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Cuerpo */}
      {loading ? (
        <div className="flex justify-center py-14"><Loader2 className="h-7 w-7 animate-spin text-[var(--color-primary)]" /></div>
      ) : (
        <div className="p-6 space-y-4">
          {/* Fila 1: Cliente | Fechas | Financiero */}
          <div className="grid grid-cols-3 gap-4">
            {/* Cliente */}
            {(() => {
              const cli = contrato.clientes || {};
              const esEmpresa = cli.tipo_entidad === 'empresa';
              return (
                <div className="bg-[var(--bg-surface-2)] rounded-2xl p-5 border border-[var(--border-soft)] space-y-3">
                  <p className="text-[10px] text-[var(--color-primary)] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5"/>Cliente
                    {esEmpresa && (
                      <span className="ml-1 text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md font-black uppercase tracking-wider">Empresa</span>
                    )}
                  </p>
                  <div>
                    <p className="font-black text-[var(--text-primary)] text-sm leading-snug">{cli.nombre_completo || '—'}</p>
                    <p className="text-xs text-[var(--text-muted)] font-mono">{cli.identificacion || '—'}</p>
                    {cli.whatsapp && <p className="text-[11px] text-[var(--text-secondary)] mt-1 flex items-center gap-1.5"><span className="text-[var(--text-muted)]">📱</span>{cli.whatsapp}</p>}
                    {cli.email && <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5"><span className="text-[var(--text-muted)]">✉</span>{cli.email}</p>}
                  </div>
                  {esEmpresa && (cli.nombre_empresa || cli.nombre_responsable_empresa) && (
                    <div className="pt-3 border-t border-[var(--border-soft)] space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1"><Building2 className="w-3 h-3"/>Empresa / Responsable</p>
                      {cli.nombre_empresa && <p className="text-xs font-black text-[var(--text-primary)]">{cli.nombre_empresa}{cli.ruc_empresa && <span className="ml-2 font-mono font-normal text-[var(--text-muted)]">RUC {cli.ruc_empresa}</span>}</p>}
                      {cli.nombre_responsable_empresa && <p className="text-[11px] text-[var(--text-secondary)]">{cli.nombre_responsable_empresa}</p>}
                      {cli.telefono_responsable_empresa && <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5"><span className="text-[var(--text-muted)]">📱</span>{cli.telefono_responsable_empresa}</p>}
                      {cli.email_responsable_empresa && <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5"><span className="text-[var(--text-muted)]">✉</span>{cli.email_responsable_empresa}</p>}
                    </div>
                  )}
                  {(cli.nombre_referencia || cli.nombre_referencia_2) && (
                    <div className="pt-3 border-t border-[var(--border-soft)] space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Contactos de referencia</p>
                      {cli.nombre_referencia && <div className="flex items-center justify-between gap-2"><p className="text-[11px] text-[var(--text-secondary)]">{cli.nombre_referencia}</p>{cli.telefono_referencia && <p className="text-[11px] font-mono text-[var(--text-muted)]">{cli.telefono_referencia}</p>}</div>}
                      {cli.nombre_referencia_2 && <div className="flex items-center justify-between gap-2"><p className="text-[11px] text-[var(--text-secondary)]">{cli.nombre_referencia_2}</p>{cli.telefono_referencia_2 && <p className="text-[11px] font-mono text-[var(--text-muted)]">{cli.telefono_referencia_2}</p>}</div>}
                    </div>
                  )}
                  {contrato.direccion_evento && (
                    <div className="pt-3 border-t border-[var(--border-soft)]">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/>Dirección del evento</p>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{contrato.direccion_evento}</p>
                    </div>
                  )}
                  <div className="pt-3 border-t border-[var(--border-soft)] grid grid-cols-2 gap-3">
                    <div><p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-0.5">Días alquiler</p><p className="text-sm font-black text-[var(--text-primary)]">{contrato.dias_alquiler ?? 1}</p></div>
                    <div><p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-0.5">Tipo entrega</p><p className="text-sm font-black text-[var(--text-primary)] capitalize">{contrato.tipo_envio || '—'}</p></div>
                  </div>
                </div>
              );
            })()}

            {/* Fechas */}
            <div className="bg-[var(--bg-surface-2)] rounded-2xl p-5 border border-[var(--border-soft)]">
              <p className="text-[10px] text-[var(--color-primary)] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5"/>Fechas</p>
              <div className="space-y-3">
                {[['Salida', contrato.fecha_salida], ['Evento', contrato.fecha_evento], ['Devolución', contrato.fecha_devolucion]].map(([lbl, val]) => (
                  <div key={lbl}>
                    <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-0.5">{lbl}</p>
                    {val ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-black text-[var(--text-primary)]">{new Date(val).toLocaleDateString('es-EC', { timeZone: 'UTC', day:'2-digit', month:'2-digit', year:'numeric' })}</span>
                        <span className="text-xs text-[var(--text-muted)] font-bold">{new Date(val).toLocaleTimeString('es-EC', { timeZone: 'UTC', hour:'2-digit', minute:'2-digit' })}</span>
                      </div>
                    ) : <span className="text-sm font-bold text-[var(--text-muted)]">—</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Financiero */}
            <div className="bg-[var(--bg-surface-2)] rounded-2xl p-5 border border-[var(--border-soft)]">
              <p className="text-[10px] text-[var(--color-primary)] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5"/>Financiero</p>
              <div className="space-y-2">
                {[
                  ['Subtotal',  `$${Number(contrato.subtotal || 0).toFixed(2)}`],
                  ['Descuento', `$${Number(contrato.monto_descuento || 0).toFixed(2)}`],
                  ['Total',     `$${Number(contrato.total || 0).toFixed(2)}`, true],
                  ['Anticipo',  `$${Number(contrato.anticipo_pagado || 0).toFixed(2)}`],
                  ['Saldo',     `$${Number(contrato.saldo_pendiente || 0).toFixed(2)}`, false, Number(contrato.saldo_pendiente) > 0],
                ].map(([lbl, val, bold, warn]) => (
                  <div key={lbl} className={`flex justify-between items-center text-xs ${bold ? 'border-t border-[var(--border-soft)] pt-2 mt-1' : ''}`}>
                    <span className="text-[var(--text-secondary)]">{lbl}</span>
                    <span className={`font-black ${bold ? 'text-[var(--text-primary)] text-sm' : warn ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>{val}</span>
                  </div>
                ))}
              </div>
              {(contrato.tipo_garantia || contrato.descripcion_garantia) && (
                <div className="mt-3 pt-3 border-t border-[var(--border-soft)]">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5 flex items-center gap-1"><ShieldCheck className="h-3 w-3"/>Garantía</p>
                  <p className="text-xs font-black text-[var(--text-primary)] capitalize">{contrato.tipo_garantia || '—'}</p>
                  {contrato.descripcion_garantia && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{contrato.descripcion_garantia}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Productos y Tallas */}
          <div className="bg-[var(--bg-surface-2)] rounded-2xl p-5 border border-[var(--border-soft)]">
            <p className="text-[10px] text-[var(--color-primary)] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5"><Package className="h-3.5 w-3.5"/>Productos y Tallas</p>
            {detalleItems.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] italic">Sin items registrados</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {detalleItems.map(item => (
                  <div key={item.id} className="bg-[var(--bg-surface)] rounded-xl p-4 border border-[var(--border-soft)]">
                    <div className="flex justify-between items-start gap-3">
                      <p className="font-black text-[var(--text-primary)] text-sm leading-tight">{item.nombre_item}</p>
                      <p className="text-xs font-black text-[var(--color-primary)] shrink-0">${Number(item.precio_unitario).toFixed(2)}</p>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">Cantidad: {item.cantidad}</p>
                    {item.tallas?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.tallas.map((t, i) => (
                          <span key={i} className="inline-flex items-center gap-1 bg-[var(--color-primary-dim)] text-[var(--color-primary)] border border-[var(--color-primary)]/20 px-2 py-0.5 rounded-lg text-[10px] font-black">
                            {t.nombre_pieza_snapshot}: <span className="uppercase">{t.etiqueta_talla}</span> ×{t.cantidad}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historial de Pagos */}
          <div className="bg-[var(--bg-surface-2)] rounded-2xl p-5 border border-[var(--border-soft)]">
            <p className="text-[10px] text-[var(--color-primary)] font-black uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5"/>Historial de Pagos
              <span className="ml-auto text-[var(--text-muted)] font-bold normal-case tracking-normal">{detallePagos.length} registro{detallePagos.length !== 1 ? 's' : ''}</span>
            </p>
            {detallePagos.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] italic">Sin pagos registrados</p>
            ) : (
              <div className="relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[var(--border-soft)]"></div>
                <div className="space-y-3">
                  {detallePagos.map((p, idx) => {
                    const fecha = p.registrado_en ? new Date(p.registrado_en) : null;
                    const tipoBadge = {
                      anticipo: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
                      abono:    'bg-green-500/15 text-green-400 border-green-500/25',
                      saldo:    'bg-[var(--color-primary-dim)] text-[var(--color-primary)] border-[var(--color-primary)]/25',
                    }[p.tipo_pago] || 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-soft)]';
                    const dotColor = {
                      anticipo: 'bg-blue-400',
                      abono:    'bg-green-400',
                      saldo:    'bg-[var(--color-primary)]',
                    }[p.tipo_pago] || 'bg-[var(--text-muted)]';
                    return (
                      <div key={p.id} className="flex gap-4 pl-1">
                        <div className={`w-5 h-5 rounded-full ${dotColor} shrink-0 mt-0.5 flex items-center justify-center z-10`}>
                          <span className="text-[7px] font-black text-white">{idx + 1}</span>
                        </div>
                        <div className="flex-1 bg-[var(--bg-surface)] rounded-xl p-3 border border-[var(--border-soft)]">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${tipoBadge}`}>{p.tipo_pago}</span>
                            <span className="text-base font-black text-green-400 font-mono">${Number(p.monto).toFixed(2)}</span>
                          </div>
                          {fecha && (
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Clock className="w-3 h-3 text-[var(--text-muted)] shrink-0"/>
                              <span className="text-xs font-bold text-[var(--text-primary)]">{fecha.toLocaleDateString('es-EC', { day:'2-digit', month:'2-digit', year:'numeric' })}</span>
                              <span className="text-xs text-[var(--text-muted)]">{fecha.toLocaleTimeString('es-EC', { hour:'2-digit', minute:'2-digit' })}</span>
                            </div>
                          )}
                          {p.referencia && <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1"><CreditCard className="w-3 h-3 shrink-0"/>{p.referencia}</p>}
                          {p.nombre_registrador_snapshot && <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5"><User className="w-3 h-3 shrink-0"/>{p.nombre_registrador_snapshot}</p>}
                          {p.notas && <p className="text-[10px] text-[var(--text-muted)] italic mt-1.5 pt-1.5 border-t border-[var(--border-soft)] line-clamp-2">{p.notas}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
);

// ─── Sección: Contratos Activos ───────────────────────────────────────────────
const ContratosActivosView = ({ onNuevoContrato }) => {
  const { profile, loading: authLoading } = useAuthStore();
  const { tenant } = useTenantStore();
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editandoContrato, setEditandoContrato] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEntregaOpen, setIsEntregaOpen] = useState(false);
  const [isDevolucionOpen, setIsDevolucionOpen] = useState(false);
  const [isAbonoOpen, setIsAbonoOpen] = useState(false);
  const [isAnularOpen, setIsAnularOpen] = useState(false);
  const [contratoActivo, setContratoActivo] = useState(null);
  const [isVerOpen, setIsVerOpen] = useState(false);
  const [detalleItems, setDetalleItems] = useState([]);
  const [detallePagos, setDetallePagos] = useState([]);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [garantiaForm, setGarantiaForm] = useState('');
  const [notasDevolucion, setNotasDevolucion] = useState('');
  const [montoEntrega, setMontoEntrega] = useState('');
  const [metodoPagoEntrega, setMetodoPagoEntrega] = useState('');
  const [montoAbono, setMontoAbono] = useState('');
  const [metodoPagoAbono, setMetodoPagoAbono] = useState('');
  const [motivoAnulacion, setMotivoAnulacion] = useState('');

  // Estado para flujo de registro de problemas (post-devolución con incidencias)
  const [isProblemasOpen, setIsProblemasOpen] = useState(false);
  const [lineasProblema, setLineasProblema] = useState([{ descripcion: '' }]);
  const [guardandoProblemas, setGuardandoProblemas] = useState(false);

  const METODOS_PAGO = ['Efectivo', 'Transferencia Bancaria', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Paypal/Link', 'Otro'];

  const fetchContratos = async () => {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select(`*, items_contrato(nombre_item), clientes(
          nombre_completo, identificacion, tipo_entidad,
          email, whatsapp, direccion_domicilio, ciudad,
          nombre_referencia, telefono_referencia,
          nombre_referencia_2, telefono_referencia_2,
          nombre_empresa, ruc_empresa,
          nombre_responsable_empresa, telefono_responsable_empresa, email_responsable_empresa
        )`)
        .eq('tenant_id', profile.tenant_id)
        // Solo contratos activos: reservado o entregado. Nunca pendiente_pago
        .in('estado', ['reservado', 'entregado'])
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setContratos(data);
    } catch {
      toast.error('Error al obtener contratos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && profile?.tenant_id) fetchContratos();
    else if (!authLoading && !profile?.tenant_id) setLoading(false);
  }, [authLoading, profile?.tenant_id]);

  const abrirVerDetalle = async (c) => {
    setContratoActivo(c);
    setIsVerOpen(true);
    setDetalleLoading(true);
    try {
      const [{ data: items }, { data: pagos }] = await Promise.all([
        supabase
          .from('items_contrato')
          .select('*, tallas:items_contrato_tallas(etiqueta_talla, cantidad, nombre_pieza_snapshot)')
          .eq('contrato_id', c.id)
          .order('created_at'),
        supabase
          .from('pagos_contrato')
          .select('*')
          .eq('contrato_id', c.id)
          .order('registrado_en'),
      ]);
      setDetalleItems(items || []);
      setDetallePagos(pagos || []);
    } catch { toast.error('Error cargando detalle del contrato'); }
    finally { setDetalleLoading(false); }
  };

  const abrirModalEntrega = (c) => {
    setContratoActivo(c);
    setGarantiaForm(c.descripcion_garantia || '');
    setMontoEntrega(Number(c.saldo_pendiente || 0) > 0 ? String(Number(c.saldo_pendiente).toFixed(2)) : '');
    setMetodoPagoEntrega('');
    setIsEntregaOpen(true);
  };
  const abrirModalDevolucion = (c) => { setContratoActivo(c); setNotasDevolucion(''); setIsDevolucionOpen(true); };

  const confirmarEntrega = async (e) => {
    e.preventDefault();
    const montoCobrado = parseFloat(montoEntrega) || 0;
    const saldoPendiente = Number(contratoActivo.saldo_pendiente || 0);

    // Validar que si hay saldo y se indica monto, el método de pago sea obligatorio
    if (montoCobrado > 0 && !metodoPagoEntrega) {
      toast.error('Selecciona el método de pago del saldo cobrado');
      return;
    }
    if (montoCobrado > saldoPendiente) {
      toast.error(`El monto cobrado ($${montoCobrado}) no puede superar el saldo pendiente ($${saldoPendiente.toFixed(2)})`);
      return;
    }

    try {
      // Solo registrar pago si se cobró algo
      if (montoCobrado > 0) {
        const { error: pagoErr } = await supabase.from('pagos_contrato').insert({
          contrato_id: contratoActivo.id,
          tenant_id: profile.tenant_id,
          monto: montoCobrado,
          tipo_pago: 'saldo',
          referencia: metodoPagoEntrega,
          notas: `Cobro al entregar. Garantía: ${garantiaForm}`,
          registrado_por: profile.id,
          nombre_registrador_snapshot: profile.nombre_completo || 'Empleado',
          registrado_en: new Date().toISOString(),
        });
        if (pagoErr) throw pagoErr;

        // Actualizar balance manualmente
        const nuevoAnticipo = (contratoActivo.anticipo_pagado || 0) + montoCobrado;
        const nuevoSaldo = Math.max(0, saldoPendiente - montoCobrado);
        await supabase.from('contratos').update({
          anticipo_pagado: nuevoAnticipo,
          saldo_pendiente: nuevoSaldo,
        }).eq('id', contratoActivo.id);
      }

      const { error } = await supabase.from('contratos').update({
        estado: 'entregado',
        descripcion_garantia: garantiaForm || contratoActivo.descripcion_garantia,
      }).eq('id', contratoActivo.id);
      if (error) throw error;

      const saldoRestante = saldoPendiente - montoCobrado;
      if (saldoRestante > 0) {
        toast.success(`Contrato en uso. Queda un saldo pendiente de $${saldoRestante.toFixed(2)}.`);
      } else {
        toast.success('Contrato en uso. Saldo completamente cobrado.');
      }
      setIsEntregaOpen(false);
      fetchContratos();
    } catch { toast.error('No se pudo procesar la entrega'); }
  };

  const confirmarDevolucion = async (estado) => {
    try {
      const { error } = await supabase.from('contratos').update({ estado, notas_internas: notasDevolucion }).eq('id', contratoActivo.id);
      if (error) throw error;
      setIsDevolucionOpen(false);
      if (estado === 'devuelto_ok') {
        toast.success('Contrato finalizado sin incidencias. Archivado.');
        fetchContratos();
      } else {
        // Abrir flujo de registro de problemas individuales
        toast.success('Devolución registrada con incidencias. Registra los problemas.');
        setLineasProblema([{ descripcion: '' }]);
        setIsProblemasOpen(true);
      }
    } catch { toast.error('Error al registrar la devolución'); }
  };

  const registrarProblemas = async (e) => {
    e.preventDefault();
    const lineasValidas = lineasProblema.filter(l => l.descripcion.trim());
    if (lineasValidas.length === 0) return toast.error('Agrega al menos un problema');
    setGuardandoProblemas(true);
    try {
      const rows = lineasValidas.map((l, i) => ({
        tenant_id: profile.tenant_id,
        contrato_id: contratoActivo.id,
        numero_problema: i + 1,
        descripcion: l.descripcion.trim(),
        estado: 'pendiente',
        registrado_por: profile.id,
        nombre_registrador_snapshot: profile.nombre_completo || 'Empleado',
      }));
      const { error } = await supabase.from('problemas_contrato').insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} problema(s) registrado(s). Contrato movido a "Con Problemas".`);
      setIsProblemasOpen(false);
      fetchContratos();
    } catch (err) { toast.error('Error registrando problemas: ' + err.message); }
    finally { setGuardandoProblemas(false); }
  };

  const registrarAbono = async (e) => {
    e.preventDefault();
    const monto = parseFloat(montoAbono);
    if (!monto || monto <= 0) return toast.error('Ingresa un monto válido');
    const saldoActual = Number(contratoActivo.saldo_pendiente || 0);
    if (saldoActual <= 0) return toast.error('Este contrato no tiene saldo pendiente');
    if (monto > saldoActual) return toast.error(`El abono ($${monto.toFixed(2)}) no puede superar el saldo pendiente ($${saldoActual.toFixed(2)})`);
    try {
      // Insertar en pagos_contrato
      const { error: pagoError } = await supabase
        .from('pagos_contrato')
        .insert({
          contrato_id: contratoActivo.id,
          tenant_id: profile.tenant_id,
          monto,
          tipo_pago: 'abono',
          referencia: metodoPagoAbono || null,
          notas: `Abono adicional — ${metodoPagoAbono || 'Sin método especificado'}`,
          registrado_por: profile.id,
          nombre_registrador_snapshot: profile.nombre_completo || 'Empleado',
        });
      if (pagoError) throw pagoError;
      // El trigger trg_ingreso_desde_pago registra automáticamente en ingresos.
      // Actualizar saldo
      const nuevoAnticipo = (contratoActivo.anticipo_pagado || 0) + monto;
      const nuevoSaldo = Math.max(0, (contratoActivo.total || 0) - nuevoAnticipo);
      await supabase.from('contratos').update({ anticipo_pagado: nuevoAnticipo, saldo_pendiente: nuevoSaldo }).eq('id', contratoActivo.id);
      toast.success(`Abono de $${monto.toFixed(2)} registrado correctamente`);
      setIsAbonoOpen(false);
      setMontoAbono('');
      fetchContratos();
    } catch (err) { toast.error('Error al registrar abono: ' + err.message); }
  };

  const anularContrato = async (e) => {
    e.preventDefault();
    if (!motivoAnulacion.trim()) return toast.error('El motivo de anulación es obligatorio');
    try {
      const { error } = await supabase.from('contratos').update({
        estado: 'cancelado',
        motivo_cancelacion: motivoAnulacion,
        cancelado_en: new Date().toISOString(),
        cancelado_por: profile.id,
      }).eq('id', contratoActivo.id);
      if (error) throw error;
      toast.success('Contrato anulado. El anticipo queda retenido.');
      setIsAnularOpen(false);
      setMotivoAnulacion('');
      fetchContratos();
    } catch (err) { toast.error('Error al anular: ' + err.message); }
  };

  const getOrigenBadge = (canal) => {
    if (canal === 'online')
      return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20"><ShoppingBag className="w-2.5 h-2.5"/>Tienda Online</span>;
    return <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-[var(--bg-surface-2)] text-[var(--text-muted)] border border-[var(--border-soft)]">Manual</span>;
  };

  const filterData = contratos.filter(c =>
    getCodigoContrato(c).toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.clientes?.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Modo edición: reemplaza la vista completa
  if (editandoContrato) {
    return (
      <EditarContrato
        contrato={editandoContrato}
        onVolver={() => setEditandoContrato(null)}
        onGuardado={() => { setEditandoContrato(null); fetchContratos(); }}
      />
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4">
      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative max-w-lg flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            className="input-guambra input-guambra-search w-full"
            placeholder="Buscar por código TX o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={onNuevoContrato} className="btn-guambra-primary !py-3 !px-8 flex items-center gap-3 text-xs">
          <Plus className="h-4 w-4" /> Nuevo Contrato
        </button>
      </div>

      {/* Tabla */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--border-soft)]">
            <thead className="bg-[var(--bg-surface-2)]">
              <tr>
                <th className="py-5 pl-8 pr-4 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Cliente</th>
                <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Salida / Devolución</th>
                <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Productos</th>
                <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Total / Saldo</th>
                <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Estado</th>
                <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Origen</th>
                <th className="relative py-5 pl-4 pr-8"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {loading ? (
                <tr><td colSpan="7" className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></td></tr>
              ) : filterData.length === 0 ? (
                <tr><td colSpan="7" className="py-12 text-center text-xs text-[var(--text-muted)] tracking-widest uppercase font-bold">No hay contratos activos</td></tr>
              ) : filterData.map((contract) => (
                <tr key={contract.id} className="hover:bg-[var(--bg-surface-2)] transition-all duration-200 group">
                  <td className="whitespace-nowrap py-5 pl-8 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)] group-hover:bg-[var(--color-primary-dim)] group-hover:text-[var(--color-primary)] transition-all">
                        {contract.clientes?.nombre_completo?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-[var(--text-primary)] block">{contract.clientes?.nombre_completo || 'Sin nombre'}</span>
                        <span className="text-[9px] text-[var(--text-muted)] font-mono">{contract.clientes?.identificacion || ''}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5 text-xs text-[var(--text-secondary)] font-bold whitespace-nowrap">
                    <span className="block">{contract.fecha_salida ? new Date(contract.fecha_salida).toLocaleString('es-EC', { timeZone: 'UTC', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'}</span>
                    <span className="text-[9px] opacity-60 block mt-0.5">Dev: {contract.fecha_devolucion ? new Date(contract.fecha_devolucion).toLocaleString('es-EC', { timeZone: 'UTC', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'}</span>
                  </td>
                  <td className="px-4 py-5 max-w-[200px]">
                    <p className="text-xs text-[var(--text-secondary)] font-bold leading-snug line-clamp-2">
                      {contract.items_contrato?.length > 0
                        ? contract.items_contrato.map(i => i.nombre_item).join(', ')
                        : <span className="text-[var(--text-muted)] italic">Sin productos</span>}
                    </p>
                  </td>
                  <td className="px-4 py-5">
                    <span className="text-sm font-black text-[var(--text-primary)]">${Number(contract.total || 0).toFixed(2)}</span>
                    {(contract.saldo_pendiente || 0) > 0 && <span className="block text-[9px] text-red-400 font-bold uppercase">Debe ${Number(contract.saldo_pendiente).toFixed(2)}</span>}
                    {(contract.saldo_pendiente || 0) === 0 && Number(contract.anticipo_pagado || 0) > Number(contract.total || 0)
                      ? <span className="block text-[9px] text-cyan-400 font-bold uppercase">A favor: ${(Number(contract.anticipo_pagado) - Number(contract.total)).toFixed(2)}</span>
                      : (contract.saldo_pendiente || 0) === 0 && <span className="block text-[9px] text-green-400 font-bold uppercase">Saldo: $0.00</span>
                    }
                  </td>
                  <td className="px-4 py-5">{getStatusBadge(contract.estado)}</td>
                  <td className="px-4 py-5">{getOrigenBadge(contract.canal)}</td>
                  <td className="relative whitespace-nowrap py-5 pl-4 pr-8 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => abrirVerDetalle(contract)} className="p-2 rounded-lg bg-[var(--color-primary-dim)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white border border-[var(--color-primary)]/20 transition-all" title="Ver detalle">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setEditandoContrato(contract)} className="p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-all" title="Editar contrato">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      {contract.estado === 'reservado' && (
                        <button onClick={() => abrirModalEntrega(contract)} className="btn-guambra-primary !py-2 !px-3 !text-[9px] inline-flex items-center gap-1">
                          <Play className="h-3 w-3" /> Entregar
                        </button>
                      )}
                      {contract.estado === 'entregado' && (
                        <button onClick={() => abrirModalDevolucion(contract)} className="btn-guambra-secondary !py-2 !px-3 !text-[9px] inline-flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" /> Devolver
                        </button>
                      )}
                      {(() => {
                        const sinSaldo = Number(contract.saldo_pendiente || 0) <= 0;
                        return (
                          <button
                            onClick={() => { if (sinSaldo) return; setContratoActivo(contract); setMontoAbono(''); setMetodoPagoAbono(''); setIsAbonoOpen(true); }}
                            disabled={sinSaldo}
                            className={`p-2 rounded-lg border transition-all ${sinSaldo ? 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-soft)] opacity-40 cursor-not-allowed' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/20'}`}
                            title={sinSaldo ? 'Saldo en cero — sin abonos pendientes' : 'Agregar abono'}
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                          </button>
                        );
                      })()}
                      <button onClick={() => { setContratoActivo(contract); setMotivoAnulacion(''); setIsAnularOpen(true); }} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all" title="Anular contrato">
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Entrega */}
      {isEntregaOpen && contratoActivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 lg:pl-72 bg-[var(--bg-page)]/80 backdrop-blur-md">
          <form
            onSubmit={confirmarEntrega}
            className="glass-card w-full max-w-2xl animate-in zoom-in-95 flex flex-col max-h-[92vh]"
          >
            {/* ── Encabezado ── */}
            <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-[var(--border-soft)] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Play className="w-4 h-4 text-primary"/>
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-[var(--text-primary)] tracking-tighter leading-none">Procesar Entrega</h3>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 font-mono">
                    {contratoActivo.codigo || `TX-${(contratoActivo.id||'').substring(0,8).toUpperCase()}`}
                    <span className="mx-1 opacity-40">·</span>
                    {contratoActivo.clientes?.nombre_completo || contratoActivo.cliente_nombre}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEntregaOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all shrink-0"
              >
                <X className="w-4 h-4"/>
              </button>
            </div>

            {/* ── Cuerpo scrollable ── */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* Fila superior: estado saldo + cobro (en grid cuando hay saldo) */}
              {Number(contratoActivo.saldo_pendiente || 0) > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Columna izquierda: info saldo */}
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col justify-center gap-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0"/>
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Saldo pendiente</p>
                    </div>
                    <p className="text-3xl font-black text-amber-400 font-mono">
                      ${Number(contratoActivo.saldo_pendiente).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-amber-400/70 leading-relaxed">
                      Puedes cobrarlo ahora o dejarlo pendiente.
                    </p>
                  </div>

                  {/* Columna derecha: campos de cobro */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Cobro al entregar <span className="normal-case font-normal">(opcional)</span></p>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">Monto a cobrar ahora</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={Number(contratoActivo.saldo_pendiente)}
                        className="input-guambra font-mono"
                        value={montoEntrega}
                        onChange={e => setMontoEntrega(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                        Método de pago {parseFloat(montoEntrega) > 0 && <span className="text-red-400">*</span>}
                      </label>
                      <select
                        className="input-guambra"
                        value={metodoPagoEntrega}
                        onChange={e => setMetodoPagoEntrega(e.target.value)}
                        disabled={!(parseFloat(montoEntrega) > 0)}
                      >
                        <option value="">Seleccione...</option>
                        {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0"/>
                  <p className="text-xs font-bold text-green-400">Contrato con saldo en cero. Listo para entregar.</p>
                </div>
              )}

              {/* Garantía */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
                  Garantía dejada por el cliente <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="input-guambra"
                  required
                  value={garantiaForm}
                  onChange={e => setGarantiaForm(e.target.value)}
                  placeholder="Ej. Licencia de conducir, $50 en efectivo..."
                />
              </div>
            </div>

            {/* ── Footer con botones ── */}
            <div className="flex gap-3 px-6 py-4 border-t border-[var(--border-soft)] shrink-0">
              <button type="button" onClick={() => setIsEntregaOpen(false)} className="btn-guambra-secondary flex-1">Cancelar</button>
              <button type="submit" className="btn-guambra-primary flex-1 flex items-center justify-center gap-2">
                <Play className="w-3.5 h-3.5"/> Entregar — En Uso
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Devolución */}
      {isDevolucionOpen && contratoActivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:pl-72 bg-[var(--bg-page)]/80 backdrop-blur-md">
          <div className="glass-card w-full max-w-lg p-8 animate-in zoom-in-95">
            <h3 className="text-xl font-black uppercase text-[var(--text-primary)] tracking-tighter mb-1">Registro de Devolución</h3>
            <p className="text-xs text-[var(--text-muted)] mb-6">
              {contratoActivo.codigo || `TX-${(contratoActivo.id||'').substring(0,8).toUpperCase()}`}
              {' · '}{contratoActivo.clientes?.nombre_completo}
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Observación general <span className="normal-case font-normal">(opcional)</span>
                </label>
                <textarea
                  className="input-guambra min-h-[80px] resize-none"
                  value={notasDevolucion}
                  onChange={e => setNotasDevolucion(e.target.value)}
                  placeholder="Ej: traje con olor a perfume, sin daños visibles..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--border-soft)]">
                <button
                  onClick={() => confirmarDevolucion('devuelto_ok')}
                  className="bg-[var(--bg-surface-2)] hover:bg-green-500/10 text-[var(--text-secondary)] hover:text-green-400 border border-[var(--border-soft)] hover:border-green-500/30 rounded-xl p-5 transition-all flex flex-col items-center gap-2 group"
                >
                  <CheckCircle2 className="h-7 w-7 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Sin problemas</span>
                  <span className="text-[9px] text-[var(--text-muted)] text-center normal-case font-normal tracking-normal">Pasa directamente al historial</span>
                </button>

                <button
                  onClick={() => confirmarDevolucion('devuelto_con_problemas')}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl p-5 transition-all flex flex-col items-center gap-2 group"
                >
                  <AlertTriangle className="h-7 w-7 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-center">Con incidencias</span>
                  <span className="text-[9px] text-red-400/60 text-center normal-case font-normal tracking-normal">Abre el registro de problemas</span>
                </button>
              </div>

              <button
                onClick={() => setIsDevolucionOpen(false)}
                className="w-full text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] uppercase tracking-widest"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar Abono */}
      {isAbonoOpen && contratoActivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-page)]/80 backdrop-blur-md">
          <form onSubmit={registrarAbono} className="glass-card w-full max-w-md p-8 animate-in zoom-in-95 border border-green-500/20">
            <div className="w-14 h-14 rounded-2xl bg-green-500/20 text-green-400 flex items-center justify-center mb-6 border border-green-500/30">
              <DollarSign className="w-7 h-7"/>
            </div>
            <h3 className="text-xl font-black uppercase text-[var(--text-primary)] tracking-tighter mb-1">Registrar Abono</h3>
            <p className="text-xs text-[var(--text-muted)] font-medium mb-8">
              Saldo pendiente: <span className="text-[var(--text-primary)] font-mono font-black">${Number(contratoActivo.saldo_pendiente || 0).toFixed(2)}</span>
            </p>
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Monto del abono *</label>
                <input type="number" step="0.01" min="0.01" required className="input-guambra font-mono text-xl" value={montoAbono} onChange={e => setMontoAbono(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Método de pago *</label>
                <select required className="input-guambra" value={metodoPagoAbono} onChange={e => setMetodoPagoAbono(e.target.value)}>
                  <option value="">Seleccione...</option>
                  {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8 pt-6 border-t border-[var(--border-soft)]">
              <button type="button" onClick={() => setIsAbonoOpen(false)} className="btn-guambra-secondary flex-1">Cancelar</button>
              <button type="submit" className="flex-1 bg-green-500 text-white font-black uppercase tracking-widest rounded-xl h-12 text-xs flex items-center justify-center gap-2 hover:bg-green-400 transition-all"><CheckCircle2 className="w-4 h-4"/> Registrar</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Modal VER DETALLE ──────────────────────────────────────── */}
      {isVerOpen && contratoActivo && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center lg:pl-72 pt-20 px-6 pb-6 overflow-y-auto bg-[var(--bg-page)]/85 backdrop-blur-md">
          <div className="glass-card w-full max-w-4xl animate-in zoom-in-95 shadow-2xl">

            {/* Cabecera */}
            <div className="flex items-center justify-between px-7 py-4 border-b border-[var(--border-soft)]">
              <div className="flex items-center gap-4">
                <p className="font-mono font-black text-[var(--color-primary)] text-base tracking-tight">{getCodigoContrato(contratoActivo)}</p>
                {getStatusBadge(contratoActivo.estado)}
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold hidden sm:block">Detalle del Contrato</span>
              </div>
              <button onClick={() => setIsVerOpen(false)} className="p-2 rounded-xl hover:bg-[var(--bg-surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Cuerpo */}
            {detalleLoading ? (
              <div className="flex justify-center py-14"><Loader2 className="h-7 w-7 animate-spin text-[var(--color-primary)]" /></div>
            ) : (
              <div className="p-6 space-y-4">

                {/* Fila 1: Cliente | Fechas | Financiero */}
                <div className="grid grid-cols-3 gap-4">

                  {/* Cliente */}
                  {(() => {
                    const cli = contratoActivo.clientes || {};
                    const esEmpresa = cli.tipo_entidad === 'empresa';
                    return (
                      <div className="bg-[var(--bg-surface-2)] rounded-2xl p-5 border border-[var(--border-soft)] space-y-3">
                        {/* Encabezado */}
                        <p className="text-[10px] text-[var(--color-primary)] font-black uppercase tracking-widest flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5"/>Cliente
                          {esEmpresa && (
                            <span className="ml-1 text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md font-black uppercase tracking-wider">Empresa</span>
                          )}
                        </p>

                        {/* Nombre + ID + contacto básico */}
                        <div>
                          <p className="font-black text-[var(--text-primary)] text-sm leading-snug">{cli.nombre_completo || '—'}</p>
                          <p className="text-xs text-[var(--text-muted)] font-mono">{cli.identificacion || '—'}</p>
                          {cli.whatsapp && (
                            <p className="text-[11px] text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
                              <span className="text-[var(--text-muted)]">📱</span>{cli.whatsapp}
                            </p>
                          )}
                          {cli.email && (
                            <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
                              <span className="text-[var(--text-muted)]">✉</span>{cli.email}
                            </p>
                          )}
                        </div>

                        {/* Empresa */}
                        {esEmpresa && (cli.nombre_empresa || cli.nombre_responsable_empresa) && (
                          <div className="pt-3 border-t border-[var(--border-soft)] space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1">
                              <Building2 className="w-3 h-3"/>Empresa / Responsable
                            </p>
                            {cli.nombre_empresa && (
                              <p className="text-xs font-black text-[var(--text-primary)]">{cli.nombre_empresa}
                                {cli.ruc_empresa && <span className="ml-2 font-mono font-normal text-[var(--text-muted)]">RUC {cli.ruc_empresa}</span>}
                              </p>
                            )}
                            {cli.nombre_responsable_empresa && (
                              <p className="text-[11px] text-[var(--text-secondary)]">{cli.nombre_responsable_empresa}</p>
                            )}
                            {cli.telefono_responsable_empresa && (
                              <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
                                <span className="text-[var(--text-muted)]">📱</span>{cli.telefono_responsable_empresa}
                              </p>
                            )}
                            {cli.email_responsable_empresa && (
                              <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
                                <span className="text-[var(--text-muted)]">✉</span>{cli.email_responsable_empresa}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Referencias (persona natural o empresa) */}
                        {(cli.nombre_referencia || cli.nombre_referencia_2) && (
                          <div className="pt-3 border-t border-[var(--border-soft)] space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Contactos de referencia</p>
                            {cli.nombre_referencia && (
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] text-[var(--text-secondary)]">{cli.nombre_referencia}</p>
                                {cli.telefono_referencia && <p className="text-[11px] font-mono text-[var(--text-muted)]">{cli.telefono_referencia}</p>}
                              </div>
                            )}
                            {cli.nombre_referencia_2 && (
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] text-[var(--text-secondary)]">{cli.nombre_referencia_2}</p>
                                {cli.telefono_referencia_2 && <p className="text-[11px] font-mono text-[var(--text-muted)]">{cli.telefono_referencia_2}</p>}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Dirección del evento */}
                        {contratoActivo.direccion_evento && (
                          <div className="pt-3 border-t border-[var(--border-soft)]">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3"/>Dirección del evento
                            </p>
                            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{contratoActivo.direccion_evento}</p>
                          </div>
                        )}

                        {/* Días alquiler + tipo envío */}
                        <div className="pt-3 border-t border-[var(--border-soft)] grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-0.5">Días alquiler</p>
                            <p className="text-sm font-black text-[var(--text-primary)]">{contratoActivo.dias_alquiler ?? 1}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-0.5">Tipo entrega</p>
                            <p className="text-sm font-black text-[var(--text-primary)] capitalize">{contratoActivo.tipo_envio || '—'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Fechas */}
                  <div className="bg-[var(--bg-surface-2)] rounded-2xl p-5 border border-[var(--border-soft)]">
                    <p className="text-[10px] text-[var(--color-primary)] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5"/>Fechas
                    </p>
                    <div className="space-y-3">
                      {[
                        ['Salida',     contratoActivo.fecha_salida],
                        ['Evento',     contratoActivo.fecha_evento],
                        ['Devolución', contratoActivo.fecha_devolucion],
                      ].map(([lbl, val]) => (
                        <div key={lbl}>
                          <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-0.5">{lbl}</p>
                          {val ? (
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-black text-[var(--text-primary)]">
                                {new Date(val).toLocaleDateString('es-EC', { timeZone: 'UTC', day:'2-digit', month:'2-digit', year:'numeric' })}
                              </span>
                              <span className="text-xs text-[var(--text-muted)] font-bold">
                                {new Date(val).toLocaleTimeString('es-EC', { timeZone: 'UTC', hour:'2-digit', minute:'2-digit' })}
                              </span>
                            </div>
                          ) : <span className="text-sm font-bold text-[var(--text-muted)]">—</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financiero + Pagos + Garantía */}
                  <div className="bg-[var(--bg-surface-2)] rounded-2xl p-5 border border-[var(--border-soft)]">
                    <p className="text-[10px] text-[var(--color-primary)] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5"/>Financiero
                    </p>
                    <div className="space-y-2">
                      {[
                        ['Subtotal',   `$${Number(contratoActivo.subtotal || 0).toFixed(2)}`],
                        ['Descuento',  `$${Number(contratoActivo.monto_descuento || 0).toFixed(2)}`],
                        ['Total',      `$${Number(contratoActivo.total || 0).toFixed(2)}`, true],
                        ['Anticipo',   `$${Number(contratoActivo.anticipo_pagado || 0).toFixed(2)}`],
                        ['Saldo',      `$${Number(contratoActivo.saldo_pendiente || 0).toFixed(2)}`, false, Number(contratoActivo.saldo_pendiente) > 0],
                      ].map(([lbl, val, bold, warn]) => (
                        <div key={lbl} className={`flex justify-between items-center text-xs ${bold ? 'border-t border-[var(--border-soft)] pt-2 mt-1' : ''}`}>
                          <span className="text-[var(--text-secondary)]">{lbl}</span>
                          <span className={`font-black ${bold ? 'text-[var(--text-primary)] text-sm' : warn ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>{val}</span>
                        </div>
                      ))}
                    </div>
                    {(contratoActivo.tipo_garantia || contratoActivo.descripcion_garantia) && (
                      <div className="mt-3 pt-3 border-t border-[var(--border-soft)]">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3"/>Garantía
                        </p>
                        <p className="text-xs font-black text-[var(--text-primary)] capitalize">{contratoActivo.tipo_garantia || '—'}</p>
                        {contratoActivo.descripcion_garantia && (
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{contratoActivo.descripcion_garantia}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Fila 2: Productos y Tallas */}
                <div className="bg-[var(--bg-surface-2)] rounded-2xl p-5 border border-[var(--border-soft)]">
                  <p className="text-[10px] text-[var(--color-primary)] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5"/>Productos y Tallas
                  </p>
                  {detalleItems.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] italic">Sin items registrados</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {detalleItems.map(item => (
                        <div key={item.id} className="bg-[var(--bg-surface)] rounded-xl p-4 border border-[var(--border-soft)]">
                          <div className="flex justify-between items-start gap-3">
                            <p className="font-black text-[var(--text-primary)] text-sm leading-tight">{item.nombre_item}</p>
                            <p className="text-xs font-black text-[var(--color-primary)] shrink-0">${Number(item.precio_unitario).toFixed(2)}</p>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] mt-1">Cantidad: {item.cantidad}</p>
                          {item.tallas?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {item.tallas.map((t, i) => (
                                <span key={i} className="inline-flex items-center gap-1 bg-[var(--color-primary-dim)] text-[var(--color-primary)] border border-[var(--color-primary)]/20 px-2 py-0.5 rounded-lg text-[10px] font-black">
                                  {t.nombre_pieza_snapshot}: <span className="uppercase">{t.etiqueta_talla}</span> ×{t.cantidad}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Historial de Pagos */}
                <div className="bg-[var(--bg-surface-2)] rounded-2xl p-5 border border-[var(--border-soft)]">
                  <p className="text-[10px] text-[var(--color-primary)] font-black uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5"/>Historial de Pagos
                    <span className="ml-auto text-[var(--text-muted)] font-bold normal-case tracking-normal">
                      {detallePagos.length} registro{detallePagos.length !== 1 ? 's' : ''}
                    </span>
                  </p>
                  {detallePagos.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] italic">Sin pagos registrados</p>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[var(--border-soft)]"></div>
                      <div className="space-y-3">
                        {detallePagos.map((p, idx) => {
                          const fecha = p.registrado_en ? new Date(p.registrado_en) : null;
                          const tipoBadge = {
                            anticipo: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
                            abono:    'bg-green-500/15 text-green-400 border-green-500/25',
                            saldo:    'bg-[var(--color-primary-dim)] text-[var(--color-primary)] border-[var(--color-primary)]/25',
                          }[p.tipo_pago] || 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-soft)]';
                          const dotColor = {
                            anticipo: 'bg-blue-400',
                            abono:    'bg-green-400',
                            saldo:    'bg-[var(--color-primary)]',
                          }[p.tipo_pago] || 'bg-[var(--text-muted)]';

                          return (
                            <div key={p.id} className="flex gap-4 pl-1">
                              <div className={`w-5 h-5 rounded-full ${dotColor} shrink-0 mt-0.5 flex items-center justify-center z-10`}>
                                <span className="text-[7px] font-black text-white">{idx + 1}</span>
                              </div>
                              <div className="flex-1 bg-[var(--bg-surface)] rounded-xl p-3 border border-[var(--border-soft)]">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${tipoBadge}`}>
                                    {p.tipo_pago}
                                  </span>
                                  <span className="text-base font-black text-green-400 font-mono">
                                    ${Number(p.monto).toFixed(2)}
                                  </span>
                                </div>
                                {fecha && (
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <Clock className="w-3 h-3 text-[var(--text-muted)] shrink-0"/>
                                    <span className="text-xs font-bold text-[var(--text-primary)]">
                                      {fecha.toLocaleDateString('es-EC', { day:'2-digit', month:'2-digit', year:'numeric' })}
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)]">
                                      {fecha.toLocaleTimeString('es-EC', { hour:'2-digit', minute:'2-digit' })}
                                    </span>
                                  </div>
                                )}
                                {p.referencia && (
                                  <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                    <CreditCard className="w-3 h-3 shrink-0"/>
                                    {p.referencia}
                                  </p>
                                )}
                                {p.nombre_registrador_snapshot && (
                                  <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                                    <User className="w-3 h-3 shrink-0"/>
                                    {p.nombre_registrador_snapshot}
                                  </p>
                                )}
                                {p.notas && (
                                  <p className="text-[10px] text-[var(--text-muted)] italic mt-1.5 pt-1.5 border-t border-[var(--border-soft)] line-clamp-2">
                                    {p.notas}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Pie del modal — botones de acción */}
            {!detalleLoading && (
              <div className="px-6 py-4 border-t border-[var(--border-soft)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => imprimirContrato({
                      contrato: contratoActivo,
                      items: detalleItems,
                      pagos: detallePagos,
                      tenant,
                    })}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--color-primary)]/30 text-[var(--color-primary)] bg-[var(--color-primary-dim)] hover:bg-[var(--color-primary)]/20 font-black text-[10px] uppercase tracking-widest transition-all"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Imprimir Contrato
                  </button>
                  {(contratoActivo?.estado === 'devuelto_ok' || contratoActivo?.estado === 'problemas_resueltos') && (
                    <>
                      <button
                        onClick={() => imprimirComprobante({ contrato: contratoActivo, items: detalleItems, pagos: detallePagos, tenant, tipo: 'comprobante' })}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-green-500/30 text-green-400 bg-green-500/10 hover:bg-green-500/20 font-black text-[10px] uppercase tracking-widest transition-all"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        Comprobante
                      </button>
                      <button
                        onClick={() => imprimirComprobante({ contrato: contratoActivo, items: detalleItems, pagos: detallePagos, tenant, tipo: 'factura' })}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-yellow-500/30 text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 font-black text-[10px] uppercase tracking-widest transition-all"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Factura <span className="text-[8px] opacity-60 normal-case">(SRI próx.)</span>
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setIsVerOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-black text-[10px] uppercase tracking-widest transition-all hover:bg-[var(--bg-surface-3)]"
                >
                  Cerrar
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Modal Anular Contrato */}
      {isAnularOpen && contratoActivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:pl-72 bg-[var(--bg-page)]/80 backdrop-blur-md">
          <form onSubmit={anularContrato} className="glass-card w-full max-w-md p-8 animate-in zoom-in-95 border border-red-500/20">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-6 border border-red-500/30">
              <Ban className="w-7 h-7"/>
            </div>
            <h3 className="text-xl font-black uppercase text-[var(--text-primary)] tracking-tighter mb-1">Anular Contrato</h3>
            <p className="text-xs text-red-300/60 font-medium mb-8">El contrato pasará al historial con estado <strong>Cancelado</strong>. El cliente pierde el 100% del anticipo pagado. Esta acción no se puede deshacer.</p>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2">Motivo de anulación *</label>
              <textarea required rows={4} className="input-guambra resize-none" value={motivoAnulacion} onChange={e => setMotivoAnulacion(e.target.value)} placeholder="Ej: Cliente no se presentó a retirar los trajes..." />
            </div>
            <div className="flex gap-3 mt-8 pt-6 border-t border-[var(--border-soft)]">
              <button type="button" onClick={() => setIsAnularOpen(false)} className="btn-guambra-secondary flex-1">Cancelar</button>
              <button type="submit" className="flex-1 bg-red-500 text-white font-black uppercase tracking-widest rounded-xl h-12 text-xs flex items-center justify-center gap-2 hover:bg-red-600 transition-all"><X className="w-4 h-4"/> Anular Definitivamente</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Modal Registrar Problemas (post-devolución con incidencias) ─────── */}
      {isProblemasOpen && contratoActivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:pl-72 bg-[var(--bg-page)]/80 backdrop-blur-md">
          <form onSubmit={registrarProblemas} className="glass-card w-full max-w-lg p-8 animate-in zoom-in-95 border border-red-500/20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30 shrink-0">
                <AlertCircle className="w-7 h-7"/>
              </div>
              <div>
                <h3 className="text-xl font-black uppercase text-[var(--text-primary)] tracking-tighter">Registrar Problemas</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Contrato <span className="font-mono font-black text-red-400">{contratoActivo.codigo || `TX-${(contratoActivo.id || '').substring(0,8).toUpperCase()}`}</span>
                </p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-6 leading-relaxed">
              Describe cada incidencia en una fila separada. Podrás marcar cada una como "Solucionado" individualmente desde la sección <strong>Con Problemas</strong>.
            </p>

            <div className="space-y-3 mb-4">
              {lineasProblema.map((linea, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-black flex items-center justify-center shrink-0 border border-red-500/20">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    required
                    className="input-guambra flex-1 !py-2"
                    placeholder={`Problema #${idx + 1}...`}
                    value={linea.descripcion}
                    onChange={e => setLineasProblema(prev => prev.map((l, i) => i === idx ? { ...l, descripcion: e.target.value } : l))}
                  />
                  {lineasProblema.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLineasProblema(prev => prev.filter((_, i) => i !== idx))}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setLineasProblema(prev => [...prev, { descripcion: '' }])}
              className="w-full py-2 rounded-xl border border-dashed border-[var(--border-medium)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--color-primary)] text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors mb-6"
            >
              <Plus className="w-3.5 h-3.5"/> Agregar otro problema
            </button>

            <div className="flex gap-3 pt-6 border-t border-[var(--border-soft)]">
              <button type="button" onClick={() => setIsProblemasOpen(false)} className="btn-guambra-secondary flex-1">Omitir</button>
              <button
                type="submit"
                disabled={guardandoProblemas}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl h-12 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-red-500 hover:bg-red-600 text-white"
              >
                {guardandoProblemas
                  ? <><Loader2 className="w-4 h-4 animate-spin shrink-0"/> Guardando…</>
                  : 'Guardar Problemas'
                }
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ─── Sección: Contratos con Problemas ─────────────────────────────────────────
const ContratosProblemasView = () => {
  const { profile, loading: authLoading } = useAuthStore();
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal para agregar líneas de problema a contratos que no tienen ninguna
  const [isAgregarOpen, setIsAgregarOpen] = useState(false);
  const [contratoEditar, setContratoEditar] = useState(null);
  const [lineasNuevas, setLineasNuevas] = useState([{ descripcion: '' }]);
  const [guardandoNuevas, setGuardandoNuevas] = useState(false);

  const fetchProblemas = async () => {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*, clientes(nombre_completo, identificacion), problemas_contrato(*)')
        .eq('tenant_id', profile.tenant_id)
        .eq('estado', 'devuelto_con_problemas')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Ordenar problemas por numero_problema dentro de cada contrato
      const ordenados = (data || []).map(c => ({
        ...c,
        problemas_contrato: (c.problemas_contrato || []).sort((a, b) => a.numero_problema - b.numero_problema),
      }));
      setContratos(ordenados);
    } catch { toast.error('Error cargando contratos con problemas'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!authLoading && profile?.tenant_id) fetchProblemas();
    else if (!authLoading && !profile?.tenant_id) setLoading(false);
  }, [authLoading, profile?.tenant_id]);

  const marcarSolucionado = async (problemaId, contratoId) => {
    const { error } = await supabase
      .from('problemas_contrato')
      .update({
        estado: 'solucionado',
        resuelto_en: new Date().toISOString(),
        resuelto_por: profile.id,
        nombre_resolutor_snapshot: profile.nombre_completo || 'Empleado',
      })
      .eq('id', problemaId);
    if (error) { toast.error('Error al marcar como solucionado'); return; }
    setContratos(prev => prev.map(c => {
      if (c.id !== contratoId) return c;
      return { ...c, problemas_contrato: c.problemas_contrato.map(p => p.id === problemaId ? { ...p, estado: 'solucionado', resuelto_en: new Date().toISOString() } : p) };
    }));
    toast.success('Problema marcado como solucionado');
  };

  const archivarContrato = async (contratoId) => {
    const { error } = await supabase
      .from('contratos')
      .update({ estado: 'problemas_resueltos' })
      .eq('id', contratoId);
    if (error) { toast.error('Error al archivar el contrato'); return; }
    toast.success('Contrato archivado. Todos los problemas resueltos.');
    setContratos(prev => prev.filter(c => c.id !== contratoId));
  };

  const abrirAgregarProblemas = (c) => {
    setContratoEditar(c);
    setLineasNuevas([{ descripcion: '' }]);
    setIsAgregarOpen(true);
  };

  const guardarLineasNuevas = async (e) => {
    e.preventDefault();
    const validas = lineasNuevas.filter(l => l.descripcion.trim());
    if (validas.length === 0) return toast.error('Agrega al menos una línea de problema');
    setGuardandoNuevas(true);
    try {
      const rows = validas.map((l, i) => ({
        tenant_id: profile.tenant_id,
        contrato_id: contratoEditar.id,
        numero_problema: i + 1,
        descripcion: l.descripcion.trim(),
        estado: 'pendiente',
        registrado_por: profile.id,
        nombre_registrador_snapshot: profile.nombre_completo || 'Empleado',
      }));
      const { error } = await supabase.from('problemas_contrato').insert(rows);
      if (error) throw error;
      toast.success(`${validas.length} problema${validas.length > 1 ? 's' : ''} registrado${validas.length > 1 ? 's' : ''} correctamente`);
      setIsAgregarOpen(false);
      fetchProblemas();
    } catch (err) { toast.error('Error al guardar: ' + err.message); }
    finally { setGuardandoNuevas(false); }
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : contratos.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4 opacity-60" />
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Sin contratos con incidencias activas</p>
        </div>
      ) : contratos.map(c => {
        const problemas = c.problemas_contrato || [];
        const pendientes = problemas.filter(p => p.estado === 'pendiente').length;
        const todosResueltos = problemas.length > 0 && pendientes === 0;
        const codigo = c.codigo || `TX-${(c.id || '').substring(0, 8).toUpperCase()}`;

        return (
          <div key={c.id} className="glass-card overflow-hidden border border-red-500/20">
            {/* Cabecera del contrato */}
            <div className="flex items-center justify-between px-6 py-4 bg-red-500/5 border-b border-red-500/15">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0"/>
                <span className="font-mono font-black text-red-400 text-sm">{codigo}</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">{c.clientes?.nombre_completo}</span>
                {c.clientes?.identificacion && (
                  <span className="text-[10px] text-[var(--text-muted)] font-mono hidden sm:block">{c.clientes.identificacion}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${pendientes > 0 ? 'bg-red-500/15 text-red-400 border-red-500/25' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'}`}>
                  {pendientes > 0 ? `${pendientes} pendiente${pendientes > 1 ? 's' : ''}` : 'Todo resuelto'}
                </span>
                <button
                  onClick={() => abrirAgregarProblemas(c)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5"/> Agregar
                </button>
                {todosResueltos && (
                  <button
                    onClick={() => archivarContrato(c.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/25 text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5"/> Archivar contrato
                  </button>
                )}
              </div>
            </div>

            {/* Líneas de problemas */}
            <div className="divide-y divide-[var(--border-soft)]">
              {problemas.length === 0
                ? <p className="px-6 py-4 text-xs text-[var(--text-muted)] italic">Sin líneas de problema registradas</p>
                : problemas.map((p, idx) => (
                <div key={p.id} className={`flex items-start gap-4 px-6 py-4 transition-colors ${p.estado === 'solucionado' ? 'opacity-50' : 'hover:bg-[var(--bg-surface-2)]'}`}>
                  {/* Número */}
                  <span className={`w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 ${p.estado === 'solucionado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {p.numero_problema}
                  </span>

                  {/* Descripción */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium text-[var(--text-primary)] ${p.estado === 'solucionado' ? 'line-through text-[var(--text-muted)]' : ''}`}>
                      {p.descripcion}
                    </p>
                    {p.estado === 'solucionado' && p.resuelto_en && (
                      <p className="text-[10px] text-emerald-500 mt-0.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3"/>
                        Resuelto el {new Date(p.resuelto_en).toLocaleDateString('es-EC', { day:'2-digit', month:'2-digit', year:'numeric' })}
                        {p.nombre_resolutor_snapshot && ` por ${p.nombre_resolutor_snapshot}`}
                      </p>
                    )}
                  </div>

                  {/* Estado + Acción */}
                  <div className="shrink-0">
                    {p.estado === 'pendiente' ? (
                      <button
                        onClick={() => marcarSolucionado(p.id, c.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5"/> Solucionado
                      </button>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5"/> Resuelto
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Notas generales del contrato (si las hay) */}
            {c.notas_internas && (
              <div className="px-6 py-3 bg-[var(--bg-surface-2)] border-t border-[var(--border-soft)]">
                <p className="text-[10px] text-[var(--text-muted)] italic"><span className="font-bold not-italic">Nota:</span> {c.notas_internas}</p>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Modal Agregar Líneas de Problema ──────────────────────────────── */}
      {isAgregarOpen && contratoEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:pl-72 bg-[var(--bg-page)]/80 backdrop-blur-md">
          <form onSubmit={guardarLineasNuevas} className="glass-card w-full max-w-lg p-8 animate-in zoom-in-95 border border-red-500/20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30 shrink-0">
                <AlertCircle className="w-7 h-7"/>
              </div>
              <div>
                <h3 className="text-xl font-black uppercase text-[var(--text-primary)] tracking-tighter">Registrar Problemas</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Contrato <span className="font-mono font-black text-red-400">{contratoEditar.codigo || `TX-${(contratoEditar.id || '').substring(0,8).toUpperCase()}`}</span>
                </p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-6 leading-relaxed">
              Describe cada incidencia en una fila separada. Podrás marcarlas como "Solucionado" individualmente.
            </p>

            <div className="space-y-3 mb-4">
              {lineasNuevas.map((linea, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-black flex items-center justify-center shrink-0 border border-red-500/20">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    required
                    className="input-guambra flex-1 !py-2"
                    placeholder={`Problema #${idx + 1}...`}
                    value={linea.descripcion}
                    onChange={e => setLineasNuevas(prev => prev.map((l, i) => i === idx ? { ...l, descripcion: e.target.value } : l))}
                  />
                  {lineasNuevas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLineasNuevas(prev => prev.filter((_, i) => i !== idx))}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setLineasNuevas(prev => [...prev, { descripcion: '' }])}
              className="w-full py-2 rounded-xl border border-dashed border-[var(--border-medium)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--color-primary)] text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors mb-6"
            >
              <Plus className="w-3.5 h-3.5"/> Agregar otro problema
            </button>

            <div className="flex gap-3 pt-6 border-t border-[var(--border-soft)]">
              <button type="button" onClick={() => setIsAgregarOpen(false)} className="btn-guambra-secondary flex-1">Cancelar</button>
              <button
                type="submit"
                disabled={guardandoNuevas}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl h-12 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-red-500 hover:bg-red-600 text-white"
              >
                {guardandoNuevas
                  ? <><Loader2 className="w-4 h-4 animate-spin shrink-0"/> Guardando…</>
                  : 'Guardar Problemas'
                }
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ─── Sección: Historial ────────────────────────────────────────────────────────
const HistorialView = () => {
  const { profile, loading: authLoading } = useAuthStore();
  const { tenant } = useTenantStore();
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal ver detalle de contrato
  const [isVerOpen, setIsVerOpen] = useState(false);
  const [contratoActivo, setContratoActivo] = useState(null);
  const [detalleItems, setDetalleItems] = useState([]);
  const [detallePagos, setDetallePagos] = useState([]);
  const [detalleLoading, setDetalleLoading] = useState(false);

  // Modal de problemas del historial
  const [isVerProblemasOpen, setIsVerProblemasOpen] = useState(false);
  const [contratoHistorial, setContratoHistorial] = useState(null);
  const [problemasHistorial, setProblemasHistorial] = useState([]);
  const [loadingProblemas, setLoadingProblemas] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from('contratos')
          .select(`*, clientes(
            nombre_completo, identificacion, tipo_entidad,
            email, whatsapp, direccion_domicilio, ciudad, provincia,
            nombre_referencia, telefono_referencia,
            nombre_referencia_2, telefono_referencia_2,
            nombre_empresa, ruc_empresa,
            nombre_responsable_empresa, telefono_responsable_empresa, email_responsable_empresa
          )`)
          .eq('tenant_id', profile.tenant_id)
          .in('estado', ['devuelto_ok', 'problemas_resueltos', 'cancelado'])
          .order('created_at', { ascending: false });
        if (error) throw error;
        setContratos(data || []);
      } catch { toast.error('Error cargando historial'); }
      finally { setLoading(false); }
    };
    if (!authLoading && profile?.tenant_id) fetch();
    else if (!authLoading && !profile?.tenant_id) setLoading(false);
  }, [authLoading, profile?.tenant_id]);

  const abrirVerDetalle = async (c) => {
    setContratoActivo(c);
    setIsVerOpen(true);
    setDetalleLoading(true);
    try {
      const [{ data: items }, { data: pagos }] = await Promise.all([
        supabase
          .from('items_contrato')
          .select('*, tallas:items_contrato_tallas(etiqueta_talla, cantidad, nombre_pieza_snapshot)')
          .eq('contrato_id', c.id)
          .order('created_at'),
        supabase
          .from('pagos_contrato')
          .select('*')
          .eq('contrato_id', c.id)
          .order('registrado_en'),
      ]);
      setDetalleItems(items || []);
      setDetallePagos(pagos || []);
    } catch { toast.error('Error cargando detalle del contrato'); }
    finally { setDetalleLoading(false); }
  };

  const abrirProblemas = async (c) => {
    setContratoHistorial(c);
    setIsVerProblemasOpen(true);
    setLoadingProblemas(true);
    try {
      const { data, error } = await supabase
        .from('problemas_contrato')
        .select('*')
        .eq('contrato_id', c.id)
        .order('numero_problema');
      if (error) throw error;
      setProblemasHistorial(data || []);
    } catch { toast.error('Error cargando problemas'); }
    finally { setLoadingProblemas(false); }
  };

  const getEtiquetaFinal = (estado) => {
    if (estado === 'devuelto_ok') return { label: 'Devuelto sin problemas', cls: 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border-[var(--border-soft)]' };
    if (estado === 'problemas_resueltos') return { label: 'Problemas resueltos', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' };
    if (estado === 'cancelado') return { label: 'Cancelado', cls: 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-soft)] line-through' };
    return { label: estado, cls: 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-soft)]' };
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : contratos.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Sin contratos finalizados aún</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border-soft)]">
              <thead className="bg-[var(--bg-surface-2)]">
                <tr>
                  <th className="py-5 pl-8 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Ticket</th>
                  <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Cliente</th>
                  <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Total</th>
                  <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Estado Final</th>
                  <th className="px-4 py-5 text-left text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Problemas</th>
                  <th className="px-4 py-5 text-right text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] opacity-40">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {contratos.map(c => {
                  const { label, cls } = getEtiquetaFinal(c.estado);
                  const tieneProblemas = c.estado === 'problemas_resueltos';
                  return (
                    <tr key={c.id} className="hover:bg-[var(--bg-surface-2)] transition-all">
                      <td className="py-5 pl-8 font-mono font-black text-primary text-sm">{c.codigo || `TX-${(c.id || '').substring(0, 8).toUpperCase()}`}</td>
                      <td className="px-4 py-5 text-sm font-bold text-[var(--text-primary)]">{c.clientes?.nombre_completo}</td>
                      <td className="px-4 py-5 text-sm font-black text-[var(--text-primary)]">${Number(c.total || 0).toFixed(2)}</td>
                      <td className="px-4 py-5">
                        <span className={`inline-flex items-center rounded-lg px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] border ${cls}`}>
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        {tieneProblemas ? (
                          <button
                            onClick={() => abrirProblemas(c)}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5"/> Ver registro
                          </button>
                        ) : (
                          <span className="text-[10px] text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-5 text-right">
                        <button
                          onClick={() => abrirVerDetalle(c)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-primary)]/25 text-[var(--color-primary)] bg-[var(--color-primary-dim)] hover:bg-[var(--color-primary)]/20 text-[10px] font-black uppercase tracking-widest transition-all ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5"/> Ver contrato
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal VER DETALLE (Historial) ─────────────────────────────────── */}
      {isVerOpen && contratoActivo && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center lg:pl-72 pt-20 px-6 pb-6 overflow-y-auto bg-[var(--bg-page)]/85 backdrop-blur-md">
          <div className="glass-card w-full max-w-4xl animate-in zoom-in-95 shadow-2xl">

            {/* Cabecera */}
            <div className="flex items-center justify-between px-7 py-4 border-b border-[var(--border-soft)]">
              <div className="flex items-center gap-4">
                <p className="font-mono font-black text-[var(--color-primary)] text-base tracking-tight">{getCodigoContrato(contratoActivo)}</p>
                {getStatusBadge(contratoActivo.estado)}
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold hidden sm:block">Detalle del Contrato</span>
              </div>
              <button onClick={() => setIsVerOpen(false)} className="p-2 rounded-xl hover:bg-[var(--bg-surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Cuerpo */}
            {detalleLoading ? (
              <div className="flex justify-center py-14"><Loader2 className="h-7 w-7 animate-spin text-[var(--color-primary)]" /></div>
            ) : (
              <div className="p-6 space-y-4">

                {/* Fila 1: Cliente | Fechas | Financiero */}
                <div className="grid grid-cols-3 gap-4">

                  {/* Cliente */}
                  {(() => {
                    const cli = contratoActivo.clientes || {};
                    const esEmpresa = cli.tipo_entidad === 'empresa';
                    return (
                      <div className="bg-[var(--bg-surface-2)] rounded-2xl p-5 border border-[var(--border-soft)] space-y-3">
                        <p className="text-[10px] text-[var(--color-primary)] font-black uppercase tracking-widest flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5"/>Cliente
                          {esEmpresa && <span className="ml-1 text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md font-black uppercase tracking-wider">Empresa</span>}
                        </p>
                        <div>
                          <p className="font-black text-[var(--text-primary)] text-sm leading-snug">{cli.nombre_completo || '—'}</p>
                          <p className="text-xs text-[var(--text-muted)] font-mono">{cli.identificacion || '—'}</p>
                        </div>
                        {cli.email    && <p className="text-xs text-[var(--text-secondary)] truncate">{cli.email}</p>}
                        {cli.whatsapp && <p className="text-xs text-[var(--text-secondary)]">{cli.whatsapp}</p>}
                        {esEmpresa && cli.nombre_empresa && (
                          <div className="pt-2 border-t border-[var(--border-soft)]">
                            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 flex items-center gap-1"><Building2 className="h-3 w-3"/>Empresa</p>
                            <p className="text-xs font-bold text-[var(--text-primary)]">{cli.nombre_empresa}</p>
                            {cli.nombre_responsable_empresa && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{cli.nombre_responsable_empresa}</p>}
                          </div>
                        )}
                        {(cli.ciudad || cli.provincia) && (
                          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0"/>{[cli.ciudad, cli.provincia].filter(Boolean).join(', ')}</p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Fechas */}
                  <div className="bg-[var(--bg-surface-2)] rounded-2xl p-5 border border-[var(--border-soft)] space-y-3">
                    <p className="text-[10px] text-[var(--color-primary)] font-black uppercase tracking-widest flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5"/>Fechas</p>
                    {[
                      ['Salida',      contratoActivo.fecha_salida],
                      ['Evento',      contratoActivo.fecha_evento],
                      ['Devolución',  contratoActivo.fecha_devolucion],
                    ].map(([lbl, val]) => val && (
                      <div key={lbl}>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">{lbl}</p>
                        <p className="text-xs font-black text-[var(--text-primary)]">{new Date(val).toLocaleDateString('es-EC', { day:'2-digit', month:'2-digit', year:'numeric' })}</p>
                      </div>
                    ))}
                    {contratoActivo.tipo_envio && (
                      <div className="pt-2 border-t border-[var(--border-soft)]">
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Entrega</p>
                        <p className="text-xs font-bold text-[var(--text-primary)] capitalize">{contratoActivo.tipo_envio === 'envio' ? 'Envío a domicilio' : 'Retiro en tienda'}</p>
                      </div>
                    )}
                  </div>

                  {/* Financiero */}
                  <div className="bg-[var(--bg-surface-2)] rounded-2xl p-5 border border-[var(--border-soft)] space-y-2">
                    <p className="text-[10px] text-[var(--color-primary)] font-black uppercase tracking-widest flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5"/>Financiero</p>
                    <div className="space-y-1.5">
                      {[
                        ['Subtotal',   `$${Number(contratoActivo.subtotal || 0).toFixed(2)}`,         false, false],
                        ['Descuento',  `-$${Number(contratoActivo.monto_descuento || 0).toFixed(2)}`,  false, false],
                        ['Total',      `$${Number(contratoActivo.total || 0).toFixed(2)}`,             true,  false],
                        ['Anticipo',   `$${Number(contratoActivo.anticipo_pagado || 0).toFixed(2)}`,   false, false],
                        ['Saldo',      `$${Number(contratoActivo.saldo_pendiente || 0).toFixed(2)}`,   false, Number(contratoActivo.saldo_pendiente) > 0],
                      ].map(([lbl, val, bold, warn]) => (
                        <div key={lbl} className={`flex justify-between items-center text-xs ${bold ? 'border-t border-[var(--border-soft)] pt-2 mt-1' : ''}`}>
                          <span className="text-[var(--text-secondary)]">{lbl}</span>
                          <span className={`font-black ${bold ? 'text-[var(--text-primary)] text-sm' : warn ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>{val}</span>
                        </div>
                      ))}
                    </div>
                    {(contratoActivo.tipo_garantia || contratoActivo.descripcion_garantia) && (
                      <div className="mt-3 pt-3 border-t border-[var(--border-soft)]">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5 flex items-center gap-1"><ShieldCheck className="h-3 w-3"/>Garantía</p>
                        <p className="text-xs font-black text-[var(--text-primary)] capitalize">{contratoActivo.tipo_garantia || '—'}</p>
                        {contratoActivo.descripcion_garantia && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{contratoActivo.descripcion_garantia}</p>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Productos y Tallas */}
                <div className="bg-[var(--bg-surface-2)] rounded-2xl p-5 border border-[var(--border-soft)]">
                  <p className="text-[10px] text-[var(--color-primary)] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5"><Package className="h-3.5 w-3.5"/>Productos y Tallas</p>
                  {detalleItems.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] italic">Sin items registrados</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {detalleItems.map(item => (
                        <div key={item.id} className="bg-[var(--bg-surface)] rounded-xl p-4 border border-[var(--border-soft)]">
                          <div className="flex justify-between items-start gap-3">
                            <p className="font-black text-[var(--text-primary)] text-sm leading-tight">{item.nombre_item}</p>
                            <p className="text-xs font-black text-[var(--color-primary)] shrink-0">${Number(item.precio_unitario).toFixed(2)}</p>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] mt-1">Cantidad: {item.cantidad}</p>
                          {item.tallas?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {item.tallas.map((t, i) => (
                                <span key={i} className="inline-flex items-center gap-1 bg-[var(--color-primary-dim)] text-[var(--color-primary)] border border-[var(--color-primary)]/20 px-2 py-0.5 rounded-lg text-[10px] font-black">
                                  {t.nombre_pieza_snapshot}: <span className="uppercase">{t.etiqueta_talla}</span> ×{t.cantidad}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Historial de Pagos */}
                <div className="bg-[var(--bg-surface-2)] rounded-2xl p-5 border border-[var(--border-soft)]">
                  <p className="text-[10px] text-[var(--color-primary)] font-black uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5"/>Historial de Pagos
                    <span className="ml-auto text-[var(--text-muted)] font-bold normal-case tracking-normal">{detallePagos.length} registro{detallePagos.length !== 1 ? 's' : ''}</span>
                  </p>
                  {detallePagos.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] italic">Sin pagos registrados</p>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[var(--border-soft)]"></div>
                      <div className="space-y-3">
                        {detallePagos.map((p, idx) => {
                          const fecha = p.registrado_en ? new Date(p.registrado_en) : null;
                          const tipoBadge = { anticipo: 'bg-blue-500/15 text-blue-400 border-blue-500/25', abono: 'bg-green-500/15 text-green-400 border-green-500/25', saldo: 'bg-[var(--color-primary-dim)] text-[var(--color-primary)] border-[var(--color-primary)]/25' }[p.tipo_pago] || 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-soft)]';
                          const dotColor = { anticipo: 'bg-blue-400', abono: 'bg-green-400', saldo: 'bg-[var(--color-primary)]' }[p.tipo_pago] || 'bg-[var(--text-muted)]';
                          return (
                            <div key={p.id} className="flex gap-4 pl-1">
                              <div className={`w-5 h-5 rounded-full ${dotColor} shrink-0 mt-0.5 flex items-center justify-center z-10`}>
                                <span className="text-[7px] font-black text-white">{idx + 1}</span>
                              </div>
                              <div className="flex-1 bg-[var(--bg-surface)] rounded-xl p-3 border border-[var(--border-soft)]">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${tipoBadge}`}>{p.tipo_pago}</span>
                                  <span className="text-base font-black text-green-400 font-mono">${Number(p.monto).toFixed(2)}</span>
                                </div>
                                {fecha && (
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <Clock className="w-3 h-3 text-[var(--text-muted)] shrink-0"/>
                                    <span className="text-xs font-bold text-[var(--text-primary)]">{fecha.toLocaleDateString('es-EC', { day:'2-digit', month:'2-digit', year:'numeric' })}</span>
                                    <span className="text-xs text-[var(--text-muted)]">{fecha.toLocaleTimeString('es-EC', { hour:'2-digit', minute:'2-digit' })}</span>
                                  </div>
                                )}
                                {p.referencia && <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1"><CreditCard className="w-3 h-3 shrink-0"/>{p.referencia}</p>}
                                {p.nombre_registrador_snapshot && <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5"><User className="w-3 h-3 shrink-0"/>{p.nombre_registrador_snapshot}</p>}
                                {p.notas && <p className="text-[10px] text-[var(--text-muted)] italic mt-1.5 pt-1.5 border-t border-[var(--border-soft)] line-clamp-2">{p.notas}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Pie: botones de acción */}
            {!detalleLoading && (
              <div className="px-6 py-4 border-t border-[var(--border-soft)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => imprimirContrato({
                      contrato: contratoActivo,
                      items: detalleItems,
                      pagos: detallePagos,
                      tenant,
                    })}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--color-primary)]/30 text-[var(--color-primary)] bg-[var(--color-primary-dim)] hover:bg-[var(--color-primary)]/20 font-black text-[10px] uppercase tracking-widest transition-all"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Imprimir Contrato
                  </button>
                  {(contratoActivo?.estado === 'devuelto_ok' || contratoActivo?.estado === 'problemas_resueltos') && (
                    <>
                      <button
                        onClick={() => imprimirComprobante({ contrato: contratoActivo, items: detalleItems, pagos: detallePagos, tenant, tipo: 'comprobante' })}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-green-500/30 text-green-400 bg-green-500/10 hover:bg-green-500/20 font-black text-[10px] uppercase tracking-widest transition-all"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        Comprobante
                      </button>
                      <button
                        onClick={() => imprimirComprobante({ contrato: contratoActivo, items: detalleItems, pagos: detallePagos, tenant, tipo: 'factura' })}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-yellow-500/30 text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 font-black text-[10px] uppercase tracking-widest transition-all"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Factura <span className="text-[8px] opacity-60 normal-case">(SRI próx.)</span>
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setIsVerOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-black text-[10px] uppercase tracking-widest transition-all hover:bg-[var(--bg-surface-3)]"
                >
                  Cerrar
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Modal Ver Problemas del Historial */}
      {isVerProblemasOpen && contratoHistorial && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:pl-72 bg-[var(--bg-page)]/85 backdrop-blur-md">
          <div className="glass-card w-full max-w-xl animate-in zoom-in-95 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-soft)]">
              <div>
                <p className="font-mono font-black text-emerald-400 text-sm">
                  {contratoHistorial.codigo || `TX-${(contratoHistorial.id || '').substring(0, 8).toUpperCase()}`}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Registro de problemas resueltos</p>
              </div>
              <button onClick={() => setIsVerProblemasOpen(false)} className="p-2 rounded-xl hover:bg-[var(--bg-surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
                <X className="h-4 w-4"/>
              </button>
            </div>

            <div className="p-6">
              {loadingProblemas ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
              ) : problemasHistorial.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] italic text-center py-6">Sin problemas registrados para este contrato</p>
              ) : (
                <div className="space-y-3">
                  {problemasHistorial.map(p => (
                    <div key={p.id} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)]">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        {p.numero_problema}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{p.descripcion}</p>
                        {p.resuelto_en && (
                          <p className="text-[10px] text-emerald-500 mt-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3"/>
                            Resuelto el {new Date(p.resuelto_en).toLocaleDateString('es-EC', { day:'2-digit', month:'2-digit', year:'numeric' })}
                            {p.nombre_resolutor_snapshot && ` · ${p.nombre_resolutor_snapshot}`}
                          </p>
                        )}
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded shrink-0">
                        Resuelto
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Componente Principal ──────────────────────────────────────────────────────
const GestionContratos = () => {
  const [currentTab, setCurrentTab] = useState('activos');

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      {/* Menú de Navegación Horizontal */}
      <ModuleNavbar currentTab={currentTab} setTab={setCurrentTab} />

      {/* Contenido según Tab activo */}
      {currentTab === 'nuevo' && <NuevoContratoView onVolver={() => setCurrentTab('activos')} />}
      {currentTab === 'activos' && <ContratosActivosView onNuevoContrato={() => setCurrentTab('nuevo')} />}
      {currentTab === 'problemas' && <ContratosProblemasView />}
      {currentTab === 'historial' && <HistorialView />}
    </div>
  );
};

export default GestionContratos;
