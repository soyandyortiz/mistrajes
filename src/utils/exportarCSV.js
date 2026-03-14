/**
 * exportarCSV — Generador de archivos CSV con soporte UTF-8 completo.
 *
 * Usa BOM (U+FEFF) para que Excel reconozca automáticamente el encoding
 * y muestre correctamente tildes, ñ y otros caracteres del español.
 * No requiere dependencias externas.
 *
 * @param {Object}   options
 * @param {Array}    options.columnas      — Definición de columnas: [{ titulo, obtener }]
 * @param {Array}    options.filas         — Array de objetos con los datos
 * @param {string}   options.nombreArchivo — Nombre base (sin extensión ni fecha)
 */

const escapar = (valor) => {
  if (valor === null || valor === undefined) return '';
  const s = String(valor).trim();
  // Envolver en comillas si contiene coma, comilla o salto de línea
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export const formatFecha = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

export const exportarCSV = ({ columnas, filas, nombreArchivo }) => {
  const encabezado = columnas.map(c => escapar(c.titulo)).join(',');

  const cuerpo = filas
    .map(fila =>
      columnas
        .map(c => escapar(typeof c.obtener === 'function' ? c.obtener(fila) : ''))
        .join(',')
    )
    .join('\n');

  // BOM + encabezado + filas
  const csv = '\uFEFF' + encabezado + '\n' + cuerpo;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href     = url;
  link.download = `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
