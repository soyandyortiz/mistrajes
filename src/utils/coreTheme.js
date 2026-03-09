// Ubicación: src/utils/coreTheme.js

/**
 * Matriz Transversal de Estados y Semaforización
 * Consolidación global de códigos de color y reglas de negocio para todas las entidades
 * del sistema multi-tenant Mis Trajes. 
 * 
 * Uso: Mover centralmente la estética y asegurar coincidencia exacta con el panel de Especificaciones.
 * Actualizado para soportar variables de tema CSS.
 */

export const THEME_ESTADOS = {
    // --- PEDIDOS (Tienda Online) ---
    'Pendiente de pago': {
        color: 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-soft)]',
        badge: 'bg-[var(--bg-surface-3)]',
        desc: 'Creado sin anticipo confirmado. Stock libre.'
    },

    // --- CONTRATOS ---
    'Reservado': {
        color: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
        badge: 'bg-blue-500',
        desc: 'Anticipo confirmado. Stock reservado.'
    },
    'Entregado': {
        color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
        badge: 'bg-yellow-500',
        desc: 'Trajes entregados, garantía y firma recibidas.'
    },
    'Devuelto sin problemas': {
        color: 'bg-green-500/10 text-green-500 border-green-500/30',
        badge: 'bg-green-500',
        desc: 'Trajes devueltos bien. Garantía devuelta.'
    },
    'Devuelto con problemas': {
        color: 'bg-red-500/10 text-red-500 border-red-500/30',
        badge: 'bg-red-500',
        desc: 'Líneas pendientes. Garantía retenida.'
    },
    'Con inconvenientes — Solucionado': {
        color: 'bg-emerald-700/20 text-emerald-500 border-emerald-600/30',
        badge: 'bg-emerald-600',
        desc: 'Todos los problemas resueltos. Archivado.'
    },
    'Cancelado': {
        color: 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-soft)] line-through',
        badge: 'bg-[var(--bg-surface-3)]',
        desc: 'Anticipo perdido. Archivado.'
    },
    'Eliminado': {
        color: 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-soft)] line-through',
        badge: 'bg-[var(--bg-surface-3)]',
        desc: 'Anticipo perdido. Archivado.'
    },

    // --- PRODUCTOS ---
    'Activo': {
        color: 'bg-green-500/10 text-green-500 border-green-500/30',
        badge: 'bg-green-500',
        desc: 'Visible en tienda online.'
    },
    'Inactivo': {
        color: 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-soft)]',
        badge: 'bg-[var(--bg-surface-3)]',
        desc: 'No visible en tienda online.'
    },

    // --- EGRESOS / CARTERA DE DEUDAS ---
    'Con saldo pendiente': {
        color: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
        badge: 'bg-orange-500',
        desc: 'Crédito no saldado.'
    },
    'Saldado': {
        color: 'bg-green-500/10 text-green-500 border-green-500/30',
        badge: 'bg-green-500',
        desc: 'Pago completo. Archivado.'
    },

    // --- TENANTS / SUCURSALES (Configuración) ---
    'Tenant_Activo': {
        color: 'bg-green-500/10 text-green-500 border-green-500/30',
        badge: 'bg-green-500',
        desc: 'Suscripción vigente.'
    },
    'Tenant_Suspendido': {
        color: 'bg-red-500/10 text-red-500 border-red-500/30',
        badge: 'bg-red-500',
        desc: 'Suscripción vencida. Datos conservados.'
    },
    'Tenant_Archivado': {
        color: 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-soft)]',
        badge: 'bg-[var(--bg-surface-3)]',
        desc: 'Período de gracia vencido.'
    }
};

/**
 * Helper Func. Retorna la clase Tailwind de un estado o un fallback genérico.
 */
export const obtenerBadgeEstado = (estadoRaw) => {
    const fallback = { color: 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-soft)]', badge: 'bg-[var(--bg-surface-3)]' };
    if(!estadoRaw) return fallback;
    return THEME_ESTADOS[estadoRaw] || fallback;
};
