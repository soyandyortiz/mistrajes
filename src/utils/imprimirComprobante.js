/**
 * Generador de Comprobante / Factura — Auto-escala a 1 página A4
 * Técnica: @page margin:0 + contenedor 210×297mm + transform:scale() por JS post-render
 */

function formatFecha(f) {
  if (!f) return '—';
  try {
    const d = new Date(f.includes('T') ? f : f + 'T12:00:00');
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return f; }
}

function fmtMoneda(v) {
  return `$${(parseFloat(v) || 0).toFixed(2)}`;
}

function numeroALetras(monto) {
  const entero = Math.floor(monto);
  const cents = Math.round((monto - entero) * 100);
  const U = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
    'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const D = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const C = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
    'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
  function conv(n) {
    if (n === 0) return 'cero';
    if (n < 20) return U[n];
    if (n < 100) return n % 10 === 0 ? D[Math.floor(n / 10)] : `${D[Math.floor(n / 10)]} y ${U[n % 10]}`;
    if (n === 100) return 'cien';
    if (n < 1000) return n % 100 === 0 ? C[Math.floor(n / 100)] : `${C[Math.floor(n / 100)]} ${conv(n % 100)}`;
    if (n < 2000) return `mil ${conv(n % 1000)}`;
    return `${conv(Math.floor(n / 1000))} mil${n % 1000 > 0 ? ` ${conv(n % 1000)}` : ''}`;
  }
  const p = conv(entero);
  return `${p.charAt(0).toUpperCase()}${p.slice(1)} con ${String(cents).padStart(2, '0')}/100 USD`;
}

function getDatosNegocio(tenant) {
  return {
    nombreNegocio: tenant?.nombre_negocio || tenant?.nombre || 'Mi Negocio',
    responsable:   tenant?.nombre_propietario || '',
    ruc:           tenant?.cedula_ruc_propietario || '',
    email:         tenant?.email_propietario || '',
    telefono:      tenant?.whatsapp_propietario || '',
    ciudad:        tenant?.ciudad || 'Ecuador',
    logoUrl:       tenant?.configuracion_tienda?.logo_url || '',
  };
}

/**
 * @param {{ contrato, items, pagos, tenant, tipo: 'comprobante'|'factura' }}
 */
export function imprimirComprobante({ contrato, items = [], pagos = [], tenant, tipo = 'comprobante' }) {
  const neg    = getDatosNegocio(tenant);
  const cli    = contrato?.clientes || {};
  const esFac  = tipo === 'factura';
  const titulo = esFac ? 'FACTURA' : 'COMPROBANTE';
  const codigo = contrato?.codigo || `TX-${(contrato?.id || '').substring(0, 8).toUpperCase()}`;
  const numDoc = `${esFac ? 'FAC' : 'CB'}-${codigo}`;

  const clienteNombre   = cli.nombre_completo || '—';
  const clienteCedula   = cli.identificacion || '—';
  const clienteEmail    = cli.email || '';
  const clienteTelefono = cli.whatsapp || '';

  const totalContrato = parseFloat(contrato?.total || 0);
  const totalPagado   = pagos.reduce((s, p) => s + parseFloat(p.monto || 0), 0);
  const estadoStr     = contrato?.estado === 'devuelto_ok' ? 'Devuelto sin inconvenientes' : 'Devuelto — Incidentes resueltos';

  // ── Filas tabla ítems ───────────────────────────────────────────────────────
  const filaItems = items.length
    ? items.map(item => {
        const tallas = (item.tallas || []).map(t => `${t.etiqueta_talla}${t.cantidad > 1 ? ` ×${t.cantidad}` : ''}`).join(', ');
        const sub    = parseFloat(item.subtotal || item.cantidad * parseFloat(item.precio_unitario || 0));
        return `<tr>
          <td class="td-desc">${item.nombre_item || '—'}${tallas ? `<div class="talla-tag">Tallas: ${tallas}</div>` : ''}</td>
          <td class="td-c">${item.cantidad}</td>
          <td class="td-r mono">${fmtMoneda(item.precio_unitario)}</td>
          <td class="td-r mono fw7">${fmtMoneda(sub)}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="4" class="td-empty">Sin ítems registrados</td></tr>`;

  // ── Filas tabla pagos ───────────────────────────────────────────────────────
  const filaPagos = pagos.map((p, i) => `
    <tr class="${i % 2 === 1 ? 'tr-alt' : ''}">
      <td class="td-p">${formatFecha(p.registrado_en)}</td>
      <td class="td-p cap">${p.tipo_pago || 'Pago'}</td>
      <td class="td-r mono fw7">${fmtMoneda(p.monto)}</td>
    </tr>`).join('');

  // ── Logo HTML ───────────────────────────────────────────────────────────────
  const logoHtml = neg.logoUrl
    ? `<img src="${neg.logoUrl}" class="logo-img" alt="Logo">`
    : `<div class="logo-ph"></div>`;

  // ── HTML completo ───────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${titulo} ${numDoc}</title>
<style>
/* ── Reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Página A4 sin márgenes propios — el contenedor los provee ── */
@page { size: A4 portrait; margin: 0; }
html, body { width: 210mm; height: 297mm; background: #fff; font-family: 'Segoe UI', Arial, sans-serif; color: #111827; }

/* ── Contenedor A4 ── */
#page {
  width: 210mm;
  height: 297mm;
  overflow: hidden;
  background: #fff;
  position: relative;
}

/* ── Área de contenido — se escalará si desborda ── */
#content {
  padding: 10mm 13mm;
  transform-origin: top left;
  width: 100%;
}

/* ── CABECERA ── */
.header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8px; border-bottom: 2.5px solid #111827; margin-bottom: 10px; }
.logo-wrap { display: flex; align-items: center; gap: 10px; }
.logo-img { height: 44px; max-width: 120px; object-fit: contain; }
.logo-ph { height: 44px; width: 44px; background: #111827; border-radius: 50%; }
.biz-name { font-size: 17px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.3px; line-height: 1.1; }
.biz-sub  { font-size: 8px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px; }
.biz-ruc  { font-size: 9px; color: #6b7280; margin-top: 1px; }
.doc-wrap { text-align: right; }
.doc-title { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; line-height: 1; }
.doc-num { display: inline-block; margin-top: 3px; font-size: 11px; font-family: monospace; font-weight: 700; color: #4f46e5; background: #ede9fe; padding: 2px 8px; border-radius: 4px; }
.doc-date { font-size: 9px; color: #6b7280; margin-top: 4px; }

/* ── PARTES ── */
.parties { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.party-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 7px; padding: 8px 10px; }
.party-lbl { font-size: 7.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 5px; }
.party-name { font-size: 12px; font-weight: 800; color: #111827; line-height: 1.2; }
.party-det  { font-size: 9px; color: #6b7280; line-height: 1.6; margin-top: 2px; }

/* ── ESTADO BAR ── */
.estado-bar { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 6px 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
.estado-lbl { font-size: 7.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #166534; }
.estado-val { font-size: 10px; font-weight: 700; color: #15803d; margin-top: 1px; }
.estado-fechas { text-align: right; font-size: 8.5px; color: #6b7280; line-height: 1.7; }

/* ── SECCIÓN ── */
.sec-title { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 6px; }

/* ── TABLA ÍTEMS ── */
table.items { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
table.items thead th { background: #111827; color: #fff; padding: 6px 7px; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
table.items thead th:first-child  { text-align: left; border-radius: 5px 0 0 0; }
table.items thead th:last-child   { text-align: right; border-radius: 0 5px 0 0; }
.td-desc { padding: 6px 7px; border-bottom: 1px solid #f3f4f6; font-size: 10.5px; color: #111827; }
.td-c    { padding: 6px 7px; border-bottom: 1px solid #f3f4f6; text-align: center; font-size: 10.5px; color: #374151; }
.td-r    { padding: 6px 7px; border-bottom: 1px solid #f3f4f6; text-align: right; font-size: 10.5px; color: #374151; }
.td-empty{ padding: 12px; text-align: center; font-size: 10px; color: #9ca3af; }
.talla-tag { font-size: 8px; color: #6b7280; margin-top: 1px; }
.mono { font-family: monospace; }
.fw7  { font-weight: 700; color: #111827; }
table.items tbody tr:last-child td { border-bottom: none; }

/* ── TOTALES ── */
.totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 8px; }
.totals-box { width: 260px; }
.t-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 10px; color: #374151; border-bottom: 1px solid #f3f4f6; }
.t-row.grand { font-size: 14px; font-weight: 900; color: #111827; border-bottom: none; border-top: 2px solid #111827; padding-top: 6px; margin-top: 2px; }
.t-row.grand span:last-child { font-family: monospace; }

/* ── EN LETRAS ── */
.en-letras { background: #f9fafb; border: 1px dashed #e5e7eb; border-radius: 5px; padding: 5px 10px; font-size: 8.5px; color: #6b7280; font-style: italic; margin-bottom: 8px; }
.en-letras strong { color: #111827; }

/* ── TABLA PAGOS ── */
table.pagos { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
table.pagos thead th { background: #f3f4f6; color: #6b7280; padding: 5px 7px; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; text-align: left; }
table.pagos thead th:last-child { text-align: right; }
.td-p { padding: 5px 7px; border-bottom: 1px solid #f3f4f6; font-size: 9.5px; color: #374151; }
.tr-alt td { background: #f9fafb; }
.cap { text-transform: capitalize; }

/* ── PIE ── */
.footer { border-top: 1px solid #e5e7eb; padding-top: 8px; display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8px; }
.footer-note { font-size: 8px; color: #9ca3af; max-width: 280px; line-height: 1.5; }
.powered { font-size: 7.5px; color: #d1d5db; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-align: right; }
</style>
</head>
<body>
<div id="page">
<div id="content">

<!-- CABECERA -->
<div class="header">
  <div class="logo-wrap">
    ${logoHtml}
    <div>
      <div class="biz-name">${neg.nombreNegocio}</div>
      <div class="biz-sub">Alquiler de Trajes &amp; Disfraces</div>
      ${neg.ruc ? `<div class="biz-ruc">RUC/CI: ${neg.ruc}</div>` : ''}
      ${neg.ciudad ? `<div class="biz-ruc">${neg.ciudad}${neg.telefono ? ` · ${neg.telefono}` : ''}</div>` : ''}
    </div>
  </div>
  <div class="doc-wrap">
    <div class="doc-title">${titulo}</div>
    <div class="doc-num">${numDoc}</div>
    <div class="doc-date">Expedición: ${formatFecha(new Date().toISOString().split('T')[0])}</div>
  </div>
</div>

<!-- PARTES -->
<div class="parties">
  <div class="party-box">
    <div class="party-lbl">Proveedor del Servicio</div>
    <div class="party-name">${neg.nombreNegocio}</div>
    <div class="party-det">
      ${neg.responsable ? `${neg.responsable}<br>` : ''}
      ${neg.ruc ? `RUC/CI: ${neg.ruc}<br>` : ''}
      ${neg.email ? `${neg.email}` : ''}
    </div>
  </div>
  <div class="party-box">
    <div class="party-lbl">Cliente / Arrendatario</div>
    <div class="party-name">${clienteNombre}</div>
    <div class="party-det">
      ${clienteCedula !== '—' ? `CI/RUC: ${clienteCedula}<br>` : ''}
      ${clienteTelefono ? `Tel: ${clienteTelefono}<br>` : ''}
      ${clienteEmail ? clienteEmail : ''}
    </div>
  </div>
</div>

<!-- ESTADO -->
<div class="estado-bar">
  <div>
    <div class="estado-lbl">Estado del Servicio</div>
    <div class="estado-val">${estadoStr}</div>
  </div>
  <div class="estado-fechas">
    Evento: ${formatFecha(contrato?.fecha_evento)}<br>
    Devolución: ${formatFecha(contrato?.fecha_devolucion)}<br>
    Ref: ${codigo}
  </div>
</div>

<!-- ÍTEMS -->
<div class="sec-title">Detalle del Servicio</div>
<table class="items">
  <thead><tr>
    <th style="text-align:left;width:50%">Descripción</th>
    <th style="text-align:center;width:11%">Cant.</th>
    <th style="text-align:right;width:19%">P. Unitario</th>
    <th style="text-align:right;width:20%">Subtotal</th>
  </tr></thead>
  <tbody>${filaItems}</tbody>
</table>

<!-- TOTALES -->
<div class="totals-wrap">
  <div class="totals-box">
    <div class="t-row"><span>Total del Servicio:</span><span class="mono">${fmtMoneda(totalContrato)}</span></div>
    <div class="t-row"><span>Total Cobrado:</span><span class="mono">${fmtMoneda(totalPagado)}</span></div>
    <div class="t-row grand"><span>TOTAL:</span><span>${fmtMoneda(totalContrato)}</span></div>
  </div>
</div>

<!-- EN LETRAS -->
<div class="en-letras">Son: <strong>${numeroALetras(totalContrato)}</strong></div>

${pagos.length > 0 ? `
<!-- PAGOS -->
<div class="sec-title">Historial de Pagos</div>
<table class="pagos">
  <thead><tr>
    <th>Fecha</th><th>Concepto</th><th style="text-align:right">Monto</th>
  </tr></thead>
  <tbody>${filaPagos}</tbody>
</table>` : ''}

<!-- PIE -->
<div class="footer">
  <div class="footer-note">
    Este ${esFac ? 'documento tributario' : 'comprobante'} certifica la prestación completa del servicio de alquiler.
  </div>
  <div class="powered">Generado con <span style="color:#4f46e5">MisTrajes</span></div>
</div>

</div><!-- /content -->
</div><!-- /page -->

<script>
(function() {
  // A4 content height disponible = 297mm - 2×10mm padding = 277mm → en px a 96dpi
  var MM_TO_PX = 96 / 25.4;
  var PAGE_H_PX = Math.floor(277 * MM_TO_PX); // ~1049px
  var PAGE_W_PX = Math.floor(184 * MM_TO_PX); // ~695px (210 - 2×13)

  var content = document.getElementById('content');
  var naturalH = content.scrollHeight;
  var naturalW = content.scrollWidth;

  if (naturalH > PAGE_H_PX || naturalW > PAGE_W_PX) {
    var scaleH = PAGE_H_PX / naturalH;
    var scaleW = PAGE_W_PX / naturalW;
    var scale  = Math.min(scaleH, scaleW, 1);

    content.style.transform      = 'scale(' + scale + ')';
    content.style.transformOrigin = 'top left';
    // Compensar el ancho para que no haya scroll horizontal
    content.style.width = Math.round(100 / scale) + '%';
  }

  setTimeout(function() { window.print(); }, 500);
})();
</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=860,height=720');
  if (!w) { alert('Permite las ventanas emergentes para generar el documento.'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
