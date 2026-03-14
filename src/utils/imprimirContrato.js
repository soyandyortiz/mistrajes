/**
 * imprimirContrato — Generador de contrato de arrendamiento de vestimenta.
 *
 * ─── NOTA LEGAL ────────────────────────────────────────────────────────────
 * El contrato es un documento BIPARTITO entre:
 *   • Arrendador → El negocio del admin tenant (propietario de los trajes)
 *   • Arrendatario → El cliente final
 *
 * MisTrajes es únicamente la plataforma de gestión (SaaS). No es parte
 * contratante y solo aparece como nota técnica en el pie de página, igual
 * que Shopify no aparece en contratos de sus comerciantes.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Parámetros:
 *   contrato  — Objeto contrato con join de clientes
 *   items     — Array de items_contrato con tallas
 *   pagos     — Array de pagos_contrato
 *   tenant    — Objeto tenant completo desde useTenantStore / authStore
 */

// ── Formateo ──────────────────────────────────────────────────────────────────
const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
};

const fmtCorta = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

// ── Número a letras (español ecuatoriano) ─────────────────────────────────────
const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete',
  'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince',
  'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
const DECENAS  = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta',
  'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'cien', 'doscientos', 'trescientos', 'cuatrocientos',
  'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function _cientos(n) {
  if (n < 20) return UNIDADES[n];
  if (n < 30) return n === 20 ? 'veinte' : 'veinti' + UNIDADES[n - 20];
  const d = Math.floor(n / 10), u = n % 10;
  return DECENAS[d] + (u ? ' y ' + UNIDADES[u] : '');
}
function _grupo(n) {
  const c = Math.floor(n / 100), r = n % 100;
  if (c === 0) return _cientos(r);
  if (r === 0) return CENTENAS[c];
  return (c === 1 ? 'ciento' : CENTENAS[c]) + ' ' + _cientos(r);
}
function numeroALetras(monto) {
  const n = Math.abs(monto);
  const entero = Math.floor(n);
  const cents  = Math.round((n - entero) * 100);
  let res = '';
  if (entero === 0)           res = 'cero';
  else if (entero < 1000)     res = _grupo(entero);
  else if (entero < 1_000_000) {
    const miles = Math.floor(entero / 1000), resto = entero % 1000;
    res = (miles === 1 ? 'mil' : _grupo(miles) + ' mil') + (resto ? ' ' + _grupo(resto) : '');
  } else {
    res = entero.toLocaleString('es-EC');
  }
  return res.trim() + ' dólares con ' + String(cents).padStart(2, '0') + '/100 USD';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const getCodigoContrato = (c) => c.codigo || `TX-${(c.id || '').substring(0, 8).toUpperCase()}`;
const esc = (v) => String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const nombreCliente = (cli) =>
  cli.tipo_entidad === 'empresa'
    ? (cli.nombre_empresa || cli.nombre_completo || '—')
    : (cli.nombre_completo || '—');

const idCliente = (cli) =>
  cli.tipo_entidad === 'empresa'
    ? (cli.ruc_empresa || cli.identificacion || '—')
    : (cli.identificacion || '—');

// ── Extrae datos del arrendador (negocio del tenant) ──────────────────────────
function getDatosArrendador(tenant) {
  const cfg = tenant?.configuracion_tienda || {};
  return {
    nombreNegocio:  cfg.nombre_negocio || tenant?.nombre_negocio || 'Mi Negocio',
    nombreDueno:    tenant?.nombre_propietario || '—',
    cedulaRuc:      tenant?.cedula_ruc_propietario || '—',
    email:          tenant?.email_propietario || '',
    telefono:       tenant?.whatsapp_propietario || tenant?.telefono || '',
    ciudad:         tenant?.ciudad || 'Riobamba',
    provincia:      tenant?.provincia || 'Chimborazo',
    direccion:      tenant?.direccion || '',
    logoUrl:        cfg.logo_url || cfg.icono_url || '/icono.svg',
    esLogo:         !!cfg.logo_url,          // true = imagen rectangular, false = ícono
  };
}

// ── CSS completo ──────────────────────────────────────────────────────────────
const CSS = `
  @page { size: A4 portrait; margin: 18mm 22mm; }
  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; break-before: page; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #111; line-height: 1.55; background: #fff; }

  /* PORTADA */
  .cover { min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; }
  .cover-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #1a1a2e; padding-bottom: 12px; margin-bottom: 18px; }
  .cover-brand { display: flex; align-items: center; gap: 14px; }
  .cover-logo { max-height: 56px; max-width: 180px; object-fit: contain; }
  .cover-logo-icon { width: 52px; height: 52px; object-fit: contain; }
  .cover-brand-name { font-family: Arial, Helvetica, sans-serif; font-size: 20pt; font-weight: 900; letter-spacing: -0.5px; color: #1a1a2e; text-transform: uppercase; line-height: 1.1; }
  .cover-brand-sub { font-size: 7.5pt; color: #6b7280; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 2px; margin-top: 3px; }
  .cover-codigo-box { text-align: right; }
  .cover-codigo-label { font-size: 7pt; color: #9ca3af; text-transform: uppercase; letter-spacing: 2px; font-family: Arial, sans-serif; }
  .cover-codigo { font-family: 'Courier New', monospace; font-size: 18pt; font-weight: 900; color: #1a1a2e; letter-spacing: 2px; }
  .cover-title { text-align: center; padding: 22px 0 16px; }
  .cover-title h1 { font-size: 19pt; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; color: #1a1a2e; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 14px 0; }
  .cover-title p { font-size: 9pt; color: #6b7280; margin-top: 8px; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 2px; }
  .cover-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 8px 0; }
  .party-card { border: 1.5px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; }
  .party-card.arrendador { border-top: 4px solid #1a1a2e; }
  .party-card.arrendatario { border-top: 4px solid #374151; }
  .party-label { font-size: 7.5pt; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; font-family: Arial, sans-serif; color: #9ca3af; margin-bottom: 8px; }
  .party-name { font-size: 12.5pt; font-weight: 900; color: #1a1a2e; margin-bottom: 5px; line-height: 1.2; }
  .party-row { font-size: 9pt; color: #4b5563; display: flex; gap: 6px; margin-top: 3px; }
  .party-row-label { font-weight: 700; color: #374151; min-width: 65px; }
  .cover-fechas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 10px 0; }
  .fecha-box { text-align: center; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 8px; background: #f9fafb; }
  .fecha-box-label { font-size: 7pt; color: #9ca3af; text-transform: uppercase; letter-spacing: 1.5px; font-family: Arial, sans-serif; margin-bottom: 4px; }
  .fecha-box-value { font-size: 10pt; font-weight: 800; color: #1a1a2e; }
  .cover-financiero { display: grid; grid-template-columns: 1.5fr 1fr; gap: 14px; margin: 10px 0; }
  .tabla-pagos { width: 100%; border-collapse: collapse; font-size: 9pt; }
  .tabla-pagos th { background: #f3f4f6; font-family: Arial, sans-serif; font-size: 7.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; padding: 7px 10px; border: 1px solid #e5e7eb; text-align: left; }
  .tabla-pagos td { border: 1px solid #e5e7eb; padding: 7px 10px; color: #374151; }
  .totales-box { border: 1.5px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
  .total-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; border-bottom: 1px solid #e5e7eb; font-size: 10pt; }
  .total-row:last-child { border-bottom: none; }
  .total-row.destacado { background: #1a1a2e; color: white; }
  .total-row.pagado { background: #f0fdf4; color: #15803d; }
  .total-row.saldo-pendiente { background: #fef2f2; color: #dc2626; }
  .total-row-label { font-size: 9pt; font-family: Arial, sans-serif; }
  .total-row-val { font-weight: 900; font-family: 'Courier New', monospace; font-size: 11pt; }
  .cover-footer { border-top: 1px solid #e5e7eb; padding-top: 10px; display: flex; justify-content: space-between; align-items: flex-end; }
  .cover-footer-note { font-size: 7.5pt; color: #9ca3af; font-family: Arial, sans-serif; max-width: 65%; }
  .powered-by { font-size: 7pt; color: #d1d5db; font-family: Arial, sans-serif; text-align: right; }

  /* CONTRATO LEGAL */
  .contrato { padding-top: 4mm; }
  .contrato-header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #1a1a2e; padding-bottom: 12px; }
  .contrato-titulo { font-size: 13.5pt; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #1a1a2e; }
  .contrato-subtitulo { font-size: 9.5pt; color: #6b7280; margin-top: 4px; font-family: Arial, sans-serif; }
  .contrato-codigo-bar { display: flex; justify-content: space-between; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; padding: 7px 14px; margin-bottom: 14px; font-family: Arial, sans-serif; font-size: 8.5pt; color: #374151; }
  .contrato-codigo-bar strong { font-family: 'Courier New', monospace; color: #1a1a2e; font-size: 10pt; }
  .seccion-titulo { font-size: 11pt; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #1a1a2e; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
  .clausula { margin: 12px 0; }
  .clausula-titulo { font-size: 11pt; font-weight: 900; color: #1a1a2e; margin-bottom: 5px; }
  .clausula-texto { text-align: justify; font-size: 10.5pt; line-height: 1.65; color: #1f2937; }
  .clausula-texto p { margin-top: 5px; }
  .tabla-items { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9.5pt; }
  .tabla-items th { background: #1a1a2e; color: white; font-family: Arial, sans-serif; font-size: 7.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; border: 1px solid #1a1a2e; text-align: left; }
  .tabla-items td { border: 1px solid #d1d5db; padding: 7px 10px; vertical-align: top; }
  .tabla-items tr:nth-child(even) td { background: #f9fafb; }
  .resumen-financiero { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin: 12px 0 12px auto; max-width: 290px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
  .res-label { font-size: 9pt; padding: 6px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-family: Arial, sans-serif; }
  .res-valor { font-size: 9pt; padding: 6px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700; font-family: 'Courier New', monospace; border-left: 1px solid #e5e7eb; }
  .res-total-label { background: #1a1a2e; color: white; font-weight: 800; font-size: 10.5pt; padding: 8px 12px; }
  .res-total-valor { background: #1a1a2e; color: white; font-weight: 900; font-size: 10.5pt; padding: 8px 12px; text-align: right; font-family: 'Courier New', monospace; border-left: 1px solid #374151; }
  .monto-letras { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 9px 14px; margin: 8px 0; font-size: 10pt; font-style: italic; color: #374151; text-align: center; }

  /* SECCIONES DE FIRMA */
  .firma-seccion { margin-top: 20px; border: 2px solid #1a1a2e; border-radius: 8px; overflow: hidden; }
  .firma-seccion-header { background: #1a1a2e; color: white; padding: 12px 18px; display: flex; align-items: center; gap: 12px; }
  .firma-numero { width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.15); color: white; display: flex; align-items: center; justify-content: center; font-size: 11pt; font-weight: 900; font-family: Arial, sans-serif; flex-shrink: 0; border: 1.5px solid rgba(255,255,255,0.3); }
  .firma-seccion-titulo { font-family: Arial, sans-serif; font-size: 10.5pt; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
  .firma-seccion-subtitulo { font-family: Arial, sans-serif; font-size: 7.5pt; color: #d1d5db; margin-top: 2px; }
  .firma-cuerpo { padding: 16px 18px; }
  .firma-descripcion { font-size: 10pt; color: #374151; text-align: justify; margin-bottom: 18px; line-height: 1.65; font-style: italic; }
  .firma-lineas { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 10px; }
  .firma-linea { border-bottom: 1.5px solid #1a1a2e; height: 52px; margin-bottom: 8px; }
  .firma-nombre { font-size: 10pt; font-weight: 900; color: #1a1a2e; }
  .firma-id { font-size: 8.5pt; color: #6b7280; font-family: Arial, sans-serif; }
  .firma-rol { font-size: 7.5pt; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, sans-serif; margin-top: 2px; }
  .firma-fecha-lugar { text-align: center; margin: 14px 0 6px; font-size: 9.5pt; color: #6b7280; font-style: italic; }

  /* ACTA DE ENTREGA */
  .garantia-espacio { border: 1.5px dashed #9ca3af; border-radius: 6px; padding: 12px 14px; margin: 12px 0; min-height: 65px; }
  .garantia-label { font-family: Arial, sans-serif; font-size: 8pt; color: #9ca3af; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 5px; }
  .garantia-valor { font-size: 10.5pt; color: #1f2937; }
  .tabla-entrega { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 8px 0; }
  .tabla-entrega th { background: #374151; color: white; font-family: Arial, sans-serif; font-size: 7.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 7px 10px; border: 1px solid #374151; text-align: left; }
  .tabla-entrega td { border: 1px solid #d1d5db; padding: 7px 10px; }
  .tabla-entrega tr:nth-child(even) td { background: #f9fafb; }

  /* BOTÓN DE IMPRESIÓN (solo en pantalla) */
  .btn-imprimir { position: fixed; bottom: 20px; right: 20px; background: #1a1a2e; color: white; border: none; border-radius: 10px; padding: 11px 22px; font-family: Arial, sans-serif; font-size: 10.5pt; font-weight: 800; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,0.25); z-index: 9999; }
  .btn-imprimir:hover { background: #2d3748; }

  /* MARCA DE AGUA */
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 68pt; font-weight: 900; color: rgba(0,0,0,0.035); text-transform: uppercase; pointer-events: none; z-index: 0; font-family: Arial, sans-serif; white-space: nowrap; }
`;

// ── Generador del HTML completo ───────────────────────────────────────────────
function generarHtml({ contrato, items, pagos, tenant }) {
  const arr    = getDatosArrendador(tenant);
  const cli    = contrato.clientes || {};
  const codigo = getCodigoContrato(contrato);
  const total    = Number(contrato.total || 0);
  const anticipo = Number(contrato.anticipo_pagado || 0);
  const saldo    = Number(contrato.saldo_pendiente || 0);
  const hoy      = fmt(new Date().toISOString());

  // Filas de ítems
  const itemsRows = (items || []).map((item, idx) => {
    const tallas = item.tallas?.length
      ? item.tallas.map(t => `${esc(t.nombre_pieza_snapshot || '')}: <strong>${esc(t.etiqueta_talla)}</strong> ×${t.cantidad}`).join(' &nbsp;|&nbsp; ')
      : '<em style="color:#999">—</em>';
    return `<tr>
      <td style="text-align:center;">${idx + 1}</td>
      <td><strong>${esc(item.nombre_item)}</strong></td>
      <td style="text-align:center;">${item.cantidad}</td>
      <td style="font-size:9pt;">${tallas}</td>
      <td style="text-align:right;">$${Number(item.precio_unitario || 0).toFixed(2)}</td>
      <td style="text-align:right;font-weight:bold;">$${(Number(item.precio_unitario || 0) * Number(item.cantidad || 1)).toFixed(2)}</td>
    </tr>`;
  }).join('');

  // Filas de pagos (portada)
  const pagosRows = (pagos || []).map(p => {
    const c = { anticipo: '#2563eb', abono: '#16a34a', saldo: '#7c3aed' }[p.tipo_pago] || '#6b7280';
    return `<tr>
      <td><span style="background:${c}18;color:${c};border:1px solid ${c}35;padding:2px 7px;border-radius:4px;font-size:8pt;font-weight:800;text-transform:uppercase;">${esc(p.tipo_pago)}</span></td>
      <td style="text-align:center;">${fmtCorta(p.registrado_en)}</td>
      <td style="text-align:right;color:#16a34a;font-weight:800;">$${Number(p.monto || 0).toFixed(2)}</td>
      <td>${esc(p.nombre_registrador_snapshot || '—')}</td>
    </tr>`;
  }).join('');

  // Logo header del negocio
  const logoHeader = arr.esLogo
    ? `<img src="${esc(arr.logoUrl)}" alt="${esc(arr.nombreNegocio)}" class="cover-logo" />`
    : `<img src="${esc(arr.logoUrl)}" alt="${esc(arr.nombreNegocio)}" class="cover-logo-icon" />`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Contrato ${esc(codigo)} · ${esc(arr.nombreNegocio)}</title>
  <style>${CSS}</style>
</head>
<body>

<div class="watermark">${esc(arr.nombreNegocio)}</div>
<button class="btn-imprimir no-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>

<!-- ══════════════════════════════════════════════════
     PÁGINA 1 — PORTADA
══════════════════════════════════════════════════ -->
<div class="cover">

  <div class="cover-header">
    <div class="cover-brand">
      ${logoHeader}
      <div>
        <div class="cover-brand-name">${esc(arr.nombreNegocio)}</div>
        <div class="cover-brand-sub">Arrendamiento de Vestimenta · ${esc(arr.ciudad || 'Ecuador')}</div>
      </div>
    </div>
    <div class="cover-codigo-box">
      <div class="cover-codigo-label">Código de Contrato</div>
      <div class="cover-codigo">${esc(codigo)}</div>
    </div>
  </div>

  <div class="cover-title">
    <h1>Contrato de Arrendamiento de Vestimenta</h1>
    <p>Documento Legal · República del Ecuador</p>
  </div>

  <div class="cover-parties">
    <div class="party-card arrendador">
      <div class="party-label">☑ Arrendador (Propietario)</div>
      <div class="party-name">${esc(arr.nombreDueno)}</div>
      <div class="party-row"><span class="party-row-label">CI / RUC:</span> ${esc(arr.cedulaRuc)}</div>
      <div class="party-row"><span class="party-row-label">Negocio:</span> ${esc(arr.nombreNegocio)}</div>
      ${arr.email    ? `<div class="party-row"><span class="party-row-label">Email:</span> ${esc(arr.email)}</div>` : ''}
      ${arr.telefono ? `<div class="party-row"><span class="party-row-label">Teléfono:</span> ${esc(arr.telefono)}</div>` : ''}
      ${arr.ciudad   ? `<div class="party-row"><span class="party-row-label">Ciudad:</span> ${esc(arr.ciudad)}</div>` : ''}
    </div>
    <div class="party-card arrendatario">
      <div class="party-label">☑ Arrendatario (Cliente)</div>
      <div class="party-name">${esc(nombreCliente(cli))}</div>
      <div class="party-row"><span class="party-row-label">${cli.tipo_entidad === 'empresa' ? 'RUC:' : 'CI:'}</span> ${esc(idCliente(cli))}</div>
      ${cli.email    ? `<div class="party-row"><span class="party-row-label">Email:</span> ${esc(cli.email)}</div>` : ''}
      ${cli.whatsapp ? `<div class="party-row"><span class="party-row-label">WhatsApp:</span> ${esc(cli.whatsapp)}</div>` : ''}
      ${(cli.ciudad || cli.provincia) ? `<div class="party-row"><span class="party-row-label">Ciudad:</span> ${esc([cli.ciudad, cli.provincia].filter(Boolean).join(', '))}</div>` : ''}
    </div>
  </div>

  <div class="cover-fechas">
    <div class="fecha-box">
      <div class="fecha-box-label">Fecha de Entrega</div>
      <div class="fecha-box-value">${fmtCorta(contrato.fecha_salida)}</div>
    </div>
    ${contrato.fecha_evento
      ? `<div class="fecha-box" style="border-color:#374151;background:#f9fafb;">
          <div class="fecha-box-label">Fecha del Evento</div>
          <div class="fecha-box-value">${fmtCorta(contrato.fecha_evento)}</div>
        </div>`
      : `<div class="fecha-box">
          <div class="fecha-box-label">Días de Alquiler</div>
          <div class="fecha-box-value">${contrato.dias_alquiler || '—'} día(s)</div>
        </div>`}
    <div class="fecha-box">
      <div class="fecha-box-label">Fecha de Devolución</div>
      <div class="fecha-box-value">${fmtCorta(contrato.fecha_devolucion)}</div>
    </div>
  </div>

  <div class="cover-financiero">
    <div>
      <div style="font-family:Arial,sans-serif;font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#6b7280;margin-bottom:6px;">Historial de Pagos</div>
      ${pagos?.length ? `<table class="tabla-pagos">
        <thead><tr><th>Tipo</th><th>Fecha</th><th>Monto</th><th>Registrado por</th></tr></thead>
        <tbody>${pagosRows}</tbody>
      </table>` : '<p style="font-size:9pt;color:#9ca3af;font-style:italic;">Sin pagos registrados</p>'}
    </div>
    <div class="totales-box">
      <div class="total-row"><span class="total-row-label">Subtotal</span><span class="total-row-val">$${Number(contrato.subtotal || 0).toFixed(2)}</span></div>
      ${Number(contrato.monto_descuento || 0) > 0
        ? `<div class="total-row"><span class="total-row-label">Descuento</span><span class="total-row-val" style="color:#dc2626;">−$${Number(contrato.monto_descuento).toFixed(2)}</span></div>`
        : ''}
      <div class="total-row destacado"><span class="total-row-label">TOTAL</span><span class="total-row-val">$${total.toFixed(2)}</span></div>
      <div class="total-row pagado"><span class="total-row-label">Anticipo Pagado</span><span class="total-row-val">$${anticipo.toFixed(2)}</span></div>
      ${saldo > 0
        ? `<div class="total-row saldo-pendiente"><span class="total-row-label">Saldo Pendiente</span><span class="total-row-val">$${saldo.toFixed(2)}</span></div>`
        : `<div class="total-row pagado"><span class="total-row-label">Estado de Pago</span><span class="total-row-val" style="font-size:8.5pt;">CANCELADO ✓</span></div>`}
    </div>
  </div>

  <div class="cover-footer">
    <div class="cover-footer-note">
      Documento generado el ${hoy} · ${esc(arr.nombreNegocio)}.
      ${contrato.notas_internas ? `<br/><em>Nota: ${esc(contrato.notas_internas)}</em>` : ''}
    </div>
    <div class="powered-by">Generado con <strong>MisTrajes</strong><br/>Sistema de Gestión de Alquileres</div>
  </div>

</div>

<!-- ══════════════════════════════════════════════════
     PÁGINAS SIGUIENTES — CONTRATO LEGAL
══════════════════════════════════════════════════ -->
<div class="contrato page-break">

  <div class="contrato-header">
    <div class="contrato-titulo">Contrato de Arrendamiento de Vestimenta</div>
    <div class="contrato-subtitulo">${esc(arr.nombreNegocio)} · República del Ecuador</div>
  </div>

  <div class="contrato-codigo-bar">
    <span>Código: <strong>${esc(codigo)}</strong></span>
    <span>Emitido: ${hoy}</span>
    <span>Estado: ${esc((contrato.estado || '').toUpperCase())}</span>
  </div>

  <!-- COMPARECIENTES -->
  <div class="seccion-titulo">COMPARECIENTES</div>
  <div class="clausula-texto">
    <p>En la ciudad de ${esc(arr.ciudad || 'Riobamba')}${arr.provincia ? `, provincia de ${esc(arr.provincia)}` : ''}, República del Ecuador, con fecha ${hoy}, comparecen libre y voluntariamente a celebrar el presente Contrato de Arrendamiento de Vestimenta las siguientes partes:</p>

    <p style="margin-top:10px;">
      <strong>EL ARRENDADOR:</strong> El/La señor/a <strong>${esc(arr.nombreDueno)}</strong>, portador/a de cédula de ciudadanía / RUC Nº <strong>${esc(arr.cedulaRuc)}</strong>, propietario/a y representante legal del negocio <strong>${esc(arr.nombreNegocio)}</strong>${arr.ciudad ? `, con domicilio en la ciudad de ${esc(arr.ciudad)}` : ''}${arr.email ? `, correo electrónico: ${esc(arr.email)}` : ''}${arr.telefono ? `, teléfono: ${esc(arr.telefono)}` : ''}; a quien en adelante se denominará <em>"EL ARRENDADOR"</em>.
    </p>

    <p style="margin-top:10px;">
      <strong>EL ARRENDATARIO:</strong> ${cli.tipo_entidad === 'empresa'
        ? `La empresa <strong>${esc(cli.nombre_empresa || cli.nombre_completo || '—')}</strong>, con RUC Nº <strong>${esc(cli.ruc_empresa || cli.identificacion || '—')}</strong>${cli.nombre_responsable_empresa ? `, representada legalmente por el/la señor/a <strong>${esc(cli.nombre_responsable_empresa)}</strong>` : ''}`
        : `El/La señor/a <strong>${esc(cli.nombre_completo || '—')}</strong>, portador/a de cédula de ciudadanía Nº <strong>${esc(cli.identificacion || '—')}</strong>`
      }${cli.email ? `, correo electrónico: ${esc(cli.email)}` : ''}${cli.whatsapp ? `, teléfono/WhatsApp: ${esc(cli.whatsapp)}` : ''}${(cli.ciudad || cli.provincia) ? `, domiciliado/a en ${esc([cli.ciudad, cli.provincia].filter(Boolean).join(', '))}` : ''}; a quien en adelante se denominará <em>"EL ARRENDATARIO"</em>.
    </p>

    <p style="margin-top:10px;">Las partes acuerdan celebrar el presente contrato conforme a las cláusulas y estipulaciones que se detallan a continuación:</p>
  </div>

  <!-- CLÁUSULAS -->
  <div class="seccion-titulo" style="margin-top:16px;">CLÁUSULAS Y ESTIPULACIONES</div>

  <div class="clausula">
    <div class="clausula-titulo">CLÁUSULA PRIMERA — OBJETO DEL CONTRATO</div>
    <div class="clausula-texto">
      <p>EL ARRENDADOR entrega en arrendamiento temporal al ARRENDATARIO las siguientes prendas de vestir y accesorios, en perfectas condiciones de uso, para el evento y período indicados en el presente instrumento, identificado con el código <strong>${esc(codigo)}</strong>:</p>
    </div>
    <table class="tabla-items" style="margin-top:10px;">
      <thead>
        <tr>
          <th style="width:28px;text-align:center;">#</th>
          <th>Descripción del Ítem</th>
          <th style="text-align:center;width:55px;">Cant.</th>
          <th>Tallas / Piezas</th>
          <th style="text-align:right;width:75px;">P. Unit.</th>
          <th style="text-align:right;width:85px;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows || '<tr><td colspan="6" style="text-align:center;color:#9ca3af;font-style:italic;padding:12px;">Sin ítems registrados</td></tr>'}
      </tbody>
    </table>
    <div class="resumen-financiero">
      <div class="res-label">Subtotal</div><div class="res-valor">$${Number(contrato.subtotal || 0).toFixed(2)}</div>
      ${Number(contrato.monto_descuento || 0) > 0
        ? `<div class="res-label">Descuento</div><div class="res-valor" style="color:#dc2626;">−$${Number(contrato.monto_descuento).toFixed(2)}</div>`
        : ''}
      <div class="res-total-label">TOTAL DEL CONTRATO</div><div class="res-total-valor">$${total.toFixed(2)}</div>
    </div>
    <div class="monto-letras">Valor total en letras: <strong>${numeroALetras(total)}</strong></div>
  </div>

  <div class="clausula">
    <div class="clausula-titulo">CLÁUSULA SEGUNDA — VALOR DEL ARRENDAMIENTO Y CONDICIONES DE PAGO</div>
    <div class="clausula-texto">
      <p>El valor total del presente contrato asciende a <strong>$${total.toFixed(2)}</strong> (${numeroALetras(total)}), que incluye todos los ítems de la Cláusula Primera.</p>
      <p><strong>a) Anticipo de reserva:</strong> La suma de <strong>$${anticipo.toFixed(2)}</strong> (${numeroALetras(anticipo)}), cancelada al momento de la suscripción del presente contrato en calidad de reserva irrevocable. Este valor no será reembolsable en caso de desistimiento por parte del ARRENDATARIO.</p>
      ${saldo > 0
        ? `<p><strong>b) Saldo pendiente:</strong> La suma de <strong>$${saldo.toFixed(2)}</strong> (${numeroALetras(saldo)}), pagadera previo a la entrega física de las prendas.</p>`
        : `<p><strong>b) Estado de pago:</strong> El valor total ha sido cancelado íntegramente por el ARRENDATARIO.</p>`}
      <p>Se aceptan como medios de pago: efectivo, transferencia bancaria, tarjeta de crédito/débito, u otro medio acordado entre las partes y registrado debidamente en el sistema.</p>
    </div>
  </div>

  <div class="clausula">
    <div class="clausula-titulo">CLÁUSULA TERCERA — PLAZO Y PERÍODO DEL ARRENDAMIENTO</div>
    <div class="clausula-texto">
      <p>El período de arrendamiento comprende desde el <strong>${fmt(contrato.fecha_salida)}</strong> (fecha de entrega de las prendas) hasta el <strong>${fmt(contrato.fecha_devolucion)}</strong> (fecha máxima de devolución), por un total de <strong>${contrato.dias_alquiler || '—'} día(s)</strong> de alquiler.${contrato.fecha_evento ? ` El evento para el cual se arriendan las prendas se realizará el <strong>${fmt(contrato.fecha_evento)}</strong>.` : ''}</p>
      <p>Cualquier retraso en la devolución más allá de la fecha pactada generará los cargos establecidos en la Cláusula Novena.</p>
    </div>
  </div>

  <div class="clausula">
    <div class="clausula-titulo">CLÁUSULA CUARTA — MODALIDAD DE ENTREGA</div>
    <div class="clausula-texto">
      <p>Las prendas serán entregadas mediante la modalidad de <strong>${contrato.tipo_envio === 'envio' ? 'ENVÍO A DOMICILIO' : 'RETIRO EN EL ESTABLECIMIENTO'}</strong>. ${contrato.tipo_envio === 'envio' ? `EL ARRENDADOR coordinará el despacho; el ARRENDATARIO deberá verificar el estado de las prendas al momento de la recepción.` : `El ARRENDATARIO deberá acudir personalmente a las instalaciones de ${esc(arr.nombreNegocio)} en la fecha acordada.`}</p>
      <p>La recepción de las prendas sin observaciones escritas en el momento de la entrega implica plena conformidad con su estado y cantidad.</p>
    </div>
  </div>

  <div class="clausula">
    <div class="clausula-titulo">CLÁUSULA QUINTA — OBLIGACIONES DEL ARRENDATARIO</div>
    <div class="clausula-texto">
      <p>EL ARRENDATARIO se compromete expresamente a:</p>
      <p><strong>a)</strong> Utilizar las prendas exclusivamente para el evento y período estipulados, conforme al uso para el que fueron diseñadas.</p>
      <p><strong>b)</strong> Mantener las prendas en óptimas condiciones, evitando rasgaduras, manchas permanentes, modificaciones o cualquier deterioro.</p>
      <p><strong>c)</strong> Devolver la totalidad de las prendas en la fecha acordada, sin necesidad de que estén limpias, siendo la limpieza responsabilidad de EL ARRENDADOR.</p>
      <p><strong>d)</strong> No realizar modificaciones de ningún tipo a las prendas: cortes, costuras, tintura, bordados o alteraciones al estado original.</p>
      <p><strong>e)</strong> No subarrendar ni ceder las prendas a terceros sin autorización escrita de EL ARRENDADOR.</p>
      <p><strong>f)</strong> Responder económicamente por daño, pérdida o deterioro más allá del desgaste natural de uso.</p>
    </div>
  </div>

  <div class="clausula">
    <div class="clausula-titulo">CLÁUSULA SEXTA — GARANTÍA</div>
    <div class="clausula-texto">
      ${(contrato.tipo_garantia || contrato.descripcion_garantia)
        ? `<p>Como garantía del cumplimiento de las obligaciones, el ARRENDATARIO entrega una garantía de tipo <strong>${esc(contrato.tipo_garantia === 'economica' ? 'ECONÓMICA' : 'FÍSICA')}</strong>, consistente en: <strong>${esc(contrato.descripcion_garantia || '—')}</strong>.</p>
           <p>Dicha garantía será devuelta al ARRENDATARIO una vez que las prendas sean retornadas en las condiciones acordadas y se verifique la ausencia de daños o faltantes. En caso de daño, EL ARRENDADOR podrá retener total o parcialmente la garantía para cubrir los costos correspondientes.</p>`
        : `<p>Las partes acuerdan que la garantía del presente contrato consiste en la información de referencias personales del ARRENDATARIO registradas en el sistema. El ARRENDATARIO es responsable del estado de las prendas durante todo el período de arrendamiento.</p>`}
    </div>
  </div>

  <div class="clausula">
    <div class="clausula-titulo">CLÁUSULA SÉPTIMA — RESPONSABILIDAD POR DAÑOS, PÉRDIDA O DETERIORO</div>
    <div class="clausula-texto">
      <p>EL ARRENDATARIO asume plena responsabilidad civil y económica por cualquier daño, pérdida, robo o deterioro de las prendas arrendadas, desde la entrega hasta la devolución efectiva.</p>
      <p><strong>a) Daños reparables:</strong> Costo de reparación valorado a precio de mercado por EL ARRENDADOR.</p>
      <p><strong>b) Daños irreparables o pérdida:</strong> Valor comercial de reposición de la prenda, determinado por EL ARRENDADOR.</p>
      <p><strong>c) Manchas permanentes:</strong> Consideradas daño irreparable y sujetas a reposición.</p>
    </div>
  </div>

  <div class="clausula">
    <div class="clausula-titulo">CLÁUSULA OCTAVA — DEVOLUCIÓN DE LAS PRENDAS</div>
    <div class="clausula-texto">
      <p>EL ARRENDATARIO se obliga a devolver la totalidad de las prendas en las instalaciones de <strong>${esc(arr.nombreNegocio)}</strong> o mediante el mecanismo acordado, a más tardar el <strong>${fmt(contrato.fecha_devolucion)}</strong>. Al momento de la devolución, EL ARRENDADOR verificará el estado de las prendas y suscribirá el acta correspondiente.</p>
    </div>
  </div>

  <div class="clausula">
    <div class="clausula-titulo">CLÁUSULA NOVENA — PENALIDADES Y CARGOS POR MORA</div>
    <div class="clausula-texto">
      <p><strong>a) Retraso en devolución:</strong> Por cada día de retraso se generará un cargo equivalente a un día adicional de alquiler más un recargo del 20% por gastos administrativos.</p>
      <p><strong>b) Desistimiento del ARRENDATARIO:</strong> El anticipo abonado no será reembolsable bajo ningún concepto, salvo acuerdo expreso entre las partes.</p>
      <p><strong>c) Cambio de fechas:</strong> Deberá comunicarse con mínimo 48 horas de anticipación y quedará sujeto a disponibilidad.</p>
    </div>
  </div>

  <div class="clausula">
    <div class="clausula-titulo">CLÁUSULA DÉCIMA — JURISDICCIÓN Y RESOLUCIÓN DE CONTROVERSIAS</div>
    <div class="clausula-texto">
      <p>Las partes procurarán resolver cualquier controversia por acuerdo directo. De no lograrse en 30 días, se someterán a la jurisdicción de los jueces y tribunales de la ciudad de ${esc(arr.ciudad || 'Riobamba')}, República del Ecuador, renunciando al fuero de su domicilio si fuere diferente. Se aplicará el Código Civil ecuatoriano y demás normas vigentes.</p>
    </div>
  </div>

  <div class="clausula">
    <div class="clausula-titulo">CLÁUSULA DÉCIMA PRIMERA — DECLARACIÓN DE CONFORMIDAD</div>
    <div class="clausula-texto">
      <p>Las partes declaran haber leído íntegramente el presente contrato, comprenden su alcance legal y manifiestan libre y voluntaria conformidad con todas sus cláusulas. El presente instrumento se firma en dos ejemplares de igual valor legal, quedando uno en poder de cada parte.</p>
    </div>
  </div>


  <!-- ══════════════════════════════════════════════════
       SECCIÓN DE FIRMA 1 — ACEPTACIÓN DEL CONTRATO
  ══════════════════════════════════════════════════ -->
  <div class="firma-seccion" style="margin-top:28px;">
    <div class="firma-seccion-header">
      <div class="firma-numero">1</div>
      <div>
        <div class="firma-seccion-titulo">Aceptación del Contrato</div>
        <div class="firma-seccion-subtitulo">Se firma al momento del pago del anticipo / primera cuota</div>
      </div>
    </div>
    <div class="firma-cuerpo">
      <div class="firma-descripcion">
        Al realizar el pago del anticipo, EL ARRENDATARIO declara bajo su firma que ha leído, comprendido y acepta voluntariamente todas las cláusulas del presente Contrato de Arrendamiento de Vestimenta. Reconoce que las prendas descritas en la Cláusula Primera quedan reservadas a su nombre a partir de este momento, y que el anticipo abonado es irrevocable.
      </div>
      <div class="firma-fecha-lugar">
        En ${esc(arr.ciudad || 'Riobamba')}, a los ______ días del mes de ________________________ del año __________
      </div>
      <div class="firma-lineas">
        <div>
          <div class="firma-linea"></div>
          <div class="firma-nombre">${esc(arr.nombreDueno)}</div>
          <div class="firma-id">CI / RUC: ${esc(arr.cedulaRuc)}</div>
          <div class="firma-rol">EL ARRENDADOR · ${esc(arr.nombreNegocio)}</div>
        </div>
        <div>
          <div class="firma-linea"></div>
          <div class="firma-nombre">${esc(nombreCliente(cli))}</div>
          <div class="firma-id">${cli.tipo_entidad === 'empresa' ? 'RUC' : 'CI'}: ${esc(idCliente(cli))}</div>
          <div class="firma-rol">EL ARRENDATARIO</div>
        </div>
      </div>
    </div>
  </div>


  <!-- ══════════════════════════════════════════════════
       SECCIÓN DE FIRMA 2 — ACTA DE ENTREGA (nueva página)
  ══════════════════════════════════════════════════ -->
  <div class="firma-seccion page-break" style="margin-top:0;border-color:#374151;">
    <div class="firma-seccion-header" style="background:#374151;">
      <div class="firma-numero" style="background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.2);">2</div>
      <div>
        <div class="firma-seccion-titulo">Acta de Entrega de Prendas</div>
        <div class="firma-seccion-subtitulo">Se completa y firma al momento del retiro físico de los trajes</div>
      </div>
    </div>
    <div class="firma-cuerpo">

      <div class="firma-descripcion">
        En ${esc(arr.ciudad || 'Riobamba')}, a los ______ días del mes de ________________________ del año __________, EL ARRENDADOR hace entrega formal de las prendas al ARRENDATARIO en perfectas condiciones de uso. EL ARRENDATARIO declara recibirlas conforme y asume toda responsabilidad sobre las mismas a partir de este momento.
      </div>

      <div style="font-family:Arial,sans-serif;font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#6b7280;margin-bottom:6px;">
        Prendas entregadas
      </div>
      <table class="tabla-entrega">
        <thead>
          <tr>
            <th>#</th>
            <th>Prenda / Ítem</th>
            <th style="width:55px;">Cant.</th>
            <th>Tallas / Piezas</th>
            <th style="text-align:center;width:130px;">Estado al entregar</th>
            <th style="text-align:center;width:65px;">Conforme</th>
          </tr>
        </thead>
        <tbody>
          ${(items || []).map((item, idx) => {
            const tallas = item.tallas?.length
              ? item.tallas.map(t => `${esc(t.nombre_pieza_snapshot || '')}: ${esc(t.etiqueta_talla)} ×${t.cantidad}`).join(' | ')
              : '—';
            return `<tr>
              <td style="text-align:center;">${idx + 1}</td>
              <td><strong>${esc(item.nombre_item)}</strong></td>
              <td style="text-align:center;">${item.cantidad}</td>
              <td style="font-size:8.5pt;">${tallas}</td>
              <td style="text-align:center;font-size:8.5pt;">Buenas condiciones</td>
              <td style="text-align:center;font-size:14pt;">□</td>
            </tr>`;
          }).join('') || '<tr><td colspan="6" style="text-align:center;color:#9ca3af;font-style:italic;padding:10px;">Sin ítems</td></tr>'}
        </tbody>
      </table>

      <div style="margin-top:16px;">
        <div style="font-family:Arial,sans-serif;font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#374151;margin-bottom:7px;">Garantía entregada por el Arrendatario</div>
        <div class="garantia-espacio">
          ${(contrato.tipo_garantia || contrato.descripcion_garantia)
            ? `<div class="garantia-label">Tipo: ${esc(contrato.tipo_garantia === 'economica' ? 'ECONÓMICA' : 'FÍSICA')}</div>
               <div class="garantia-valor">${esc(contrato.descripcion_garantia || '—')}</div>`
            : `<div class="garantia-label">Complete la garantía al momento de la entrega</div>
               <div style="height:30px;"></div>
               <div class="garantia-label">Tipo: □ Económica &nbsp;&nbsp; □ Física &nbsp;&nbsp;&nbsp; Descripción: ____________________________________________</div>`}
        </div>
      </div>

      ${saldo > 0 ? `
      <div style="margin:12px 0;padding:11px 14px;background:#fef9c3;border:1.5px solid #facc15;border-radius:6px;font-size:9.5pt;color:#713f12;">
        <strong>⚠ Saldo pendiente al entregar:</strong> $${saldo.toFixed(2)} — El ARRENDATARIO declara haberlo cancelado previo a recibir las prendas.<br/>
        <span style="font-size:8.5pt;">Método de pago: ______________________________ &nbsp; Nº Referencia: ______________________________</span>
      </div>` : ''}

      <div style="margin-top:14px;">
        <div style="font-family:Arial,sans-serif;font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#6b7280;margin-bottom:6px;">Observaciones al momento de la entrega</div>
        <div style="border:1.5px dashed #d1d5db;border-radius:6px;padding:10px;min-height:55px;font-size:9pt;color:#9ca3af;font-style:italic;">(Anote cualquier observación sobre el estado de las prendas al momento de la entrega)</div>
      </div>

      <div class="firma-fecha-lugar" style="margin-top:18px;">
        Entrega realizada en ${esc(arr.ciudad || 'Riobamba')}, a los ______ días del mes de ________________________ del año __________
      </div>
      <div class="firma-lineas">
        <div>
          <div class="firma-linea"></div>
          <div class="firma-nombre">${esc(arr.nombreDueno)}</div>
          <div class="firma-id">CI / RUC: ${esc(arr.cedulaRuc)}</div>
          <div class="firma-rol">EL ARRENDADOR · Entrega las prendas</div>
        </div>
        <div>
          <div class="firma-linea"></div>
          <div class="firma-nombre">${esc(nombreCliente(cli))}</div>
          <div class="firma-id">${cli.tipo_entidad === 'empresa' ? 'RUC' : 'CI'}: ${esc(idCliente(cli))}</div>
          <div class="firma-rol">EL ARRENDATARIO · Recibe conforme</div>
        </div>
      </div>

    </div>
  </div>

  <!-- Pie de página -->
  <div style="margin-top:18px;border-top:1px solid #e5e7eb;padding-top:9px;display:flex;justify-content:space-between;font-size:7.5pt;color:#9ca3af;font-family:Arial,sans-serif;">
    <span>${esc(arr.nombreNegocio)}${arr.ciudad ? ` · ${esc(arr.ciudad)}` : ''}</span>
    <span>Contrato ${esc(codigo)} · ${hoy}</span>
    <span style="color:#d1d5db;">Generado con MisTrajes</span>
  </div>

</div>

<script>
  window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 700); });
</script>
</body>
</html>`;
}

// ── Función pública ───────────────────────────────────────────────────────────
export function imprimirContrato({ contrato, items, pagos, tenant }) {
  const html = generarHtml({ contrato, items, pagos, tenant });
  const ventana = window.open('', '_blank', 'width=920,height=720,scrollbars=yes');
  if (!ventana) {
    alert('Permite las ventanas emergentes en tu navegador para imprimir el contrato.');
    return;
  }
  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
}
