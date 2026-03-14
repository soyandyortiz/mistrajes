/**
 * Validación de documentos de identidad ecuatorianos.
 * Todas las funciones retornan: { valido: boolean|null, mensaje: string }
 *   valido = null  → campo vacío (no mostrar indicador)
 *   valido = false → inválido (rojo)
 *   valido = true  → válido   (verde)
 */

/** Cédula ecuatoriana — 10 dígitos */
export function validarCedula(valor) {
  const v = String(valor || '').replace(/\D/g, '');
  if (!v) return { valido: null, mensaje: '' };
  if (v.length < 10) return { valido: false, mensaje: `${v.length}/10 dígitos` };
  if (v.length > 10) return { valido: false, mensaje: 'Máximo 10 dígitos' };

  const prov = parseInt(v.substring(0, 2), 10);
  if (prov < 1 || (prov > 24 && prov !== 30)) {
    return { valido: false, mensaje: 'Código de provincia inválido (01-24)' };
  }

  const ter = parseInt(v[2], 10);
  if (ter > 5) return { valido: false, mensaje: 'No corresponde a cédula de persona natural' };

  const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let p = parseInt(v[i], 10) * coef[i];
    if (p >= 10) p -= 9;
    suma += p;
  }
  const ver = suma % 10 === 0 ? 0 : 10 - (suma % 10);
  return ver === parseInt(v[9], 10)
    ? { valido: true, mensaje: 'Cédula válida' }
    : { valido: false, mensaje: 'Cédula inválida (dígito verificador)' };
}

/** RUC ecuatoriano — 13 dígitos (persona natural, jurídica o pública) */
export function validarRUC(valor) {
  const v = String(valor || '').replace(/\D/g, '');
  if (!v) return { valido: null, mensaje: '' };
  if (v.length < 13) return { valido: false, mensaje: `${v.length}/13 dígitos` };
  if (v.length > 13) return { valido: false, mensaje: 'Máximo 13 dígitos' };

  const prov = parseInt(v.substring(0, 2), 10);
  if (prov < 1 || (prov > 24 && prov !== 30)) {
    return { valido: false, mensaje: 'Código de provincia inválido (01-24)' };
  }

  const estab = parseInt(v.substring(10, 13), 10);
  if (estab < 1) return { valido: false, mensaje: 'Establecimiento debe ser ≥ 001' };

  const ter = parseInt(v[2], 10);

  // Persona natural (3er dígito 0-5): primeros 10 = cédula válida
  if (ter <= 5) {
    const r = validarCedula(v.substring(0, 10));
    return r.valido
      ? { valido: true, mensaje: 'RUC válido (persona natural)' }
      : { valido: false, mensaje: 'RUC inválido (verifique los primeros 10 dígitos)' };
  }

  // Sociedad privada / jurídica (3er dígito = 9)
  if (ter === 9) {
    const coef = [4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < 9; i++) suma += parseInt(v[i], 10) * coef[i];
    const res = suma % 11;
    const ver = res === 0 ? 0 : 11 - res;
    return ver === parseInt(v[9], 10)
      ? { valido: true, mensaje: 'RUC válido (sociedad)' }
      : { valido: false, mensaje: 'RUC inválido (dígito verificador)' };
  }

  // Entidad pública (3er dígito = 6)
  if (ter === 6) {
    const coef = [3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < 8; i++) suma += parseInt(v[i], 10) * coef[i];
    const res = suma % 11;
    const ver = res === 0 ? 0 : 11 - res;
    return ver === parseInt(v[8], 10)
      ? { valido: true, mensaje: 'RUC válido (entidad pública)' }
      : { valido: false, mensaje: 'RUC inválido (dígito verificador)' };
  }

  return { valido: false, mensaje: 'Tipo de documento no reconocido' };
}

/**
 * Detecta automáticamente: cédula (10 dígitos) o RUC (13 dígitos).
 * Si contiene letras se asume pasaporte — sin validación.
 */
export function validarIdentificacion(valor) {
  const v = String(valor || '');
  if (!v) return { valido: null, mensaje: '' };
  if (/[a-zA-Z]/.test(v)) return { valido: null, mensaje: '' }; // pasaporte

  const digits = v.replace(/\D/g, '');
  if (digits.length === 10) return validarCedula(digits);
  if (digits.length === 13) return validarRUC(digits);
  if (digits.length > 13) return { valido: false, mensaje: 'Demasiados dígitos' };
  return { valido: false, mensaje: `${digits.length} dígitos — 10 cédula / 13 RUC` };
}
