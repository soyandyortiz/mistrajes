// Ubicación: src/utils/coreTheme.js

/**
 * Matriz Transversal de Estados y Semaforización
 * Consolidación global de códigos de color y reglas de negocio para todas las entidades
 * del sistema multi-tenant Mis Trajes.
 *
 * Semáforo de contratos:
 *   Verde     = Reservado       → por entregar al cliente
 *   Amarillo  = Entregado       → despachado, en poder del cliente
 *   Gris      = Devuelto OK     → devuelto sin problemas, archivado
 *   Rojo      = Con problemas   → devuelto con incidencias pendientes
 *   Esmeralda = Resuelto        → problemas solucionados, archivado
 */

export const THEME_ESTADOS = {
    // --- PEDIDOS (Tienda Online) ---
    'Pendiente de pago': {
        color: 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-soft)]',
        badge: 'bg-[var(--bg-surface-3)]',
        desc: 'Creado sin anticipo confirmado. Stock libre.'
    },

    // --- CONTRATOS (Title Case — usado por labels de UI) ---
    'Reservado': {
        color: 'bg-green-500/10 text-green-500 border-green-500/30',
        badge: 'bg-green-500',
        desc: 'Anticipo confirmado. Listo para entregar al cliente.'
    },
    'Entregado': {
        color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
        badge: 'bg-yellow-500',
        desc: 'Trajes despachados. En poder del cliente.'
    },
    'Devuelto sin problemas': {
        color: 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border-[var(--border-soft)]',
        badge: 'bg-[var(--bg-surface-3)]',
        desc: 'Trajes devueltos sin incidencias. Archivado.'
    },
    'Devuelto con problemas': {
        color: 'bg-red-500/10 text-red-500 border-red-500/30',
        badge: 'bg-red-500',
        desc: 'Devuelto con incidencias. Garantía retenida.'
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

    // --- CONTRATOS (snake_case — valores reales almacenados en BD) ---
    'reservado': {
        color: 'bg-green-500/10 text-green-500 border-green-500/30',
        badge: 'bg-green-500',
        desc: 'Anticipo confirmado. Listo para entregar al cliente.'
    },
    'entregado': {
        color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
        badge: 'bg-yellow-500',
        desc: 'Trajes despachados. En poder del cliente.'
    },
    'devuelto_ok': {
        color: 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border-[var(--border-soft)]',
        badge: 'bg-[var(--bg-surface-3)]',
        desc: 'Trajes devueltos sin incidencias. Archivado.'
    },
    'devuelto_con_problemas': {
        color: 'bg-red-500/10 text-red-500 border-red-500/30',
        badge: 'bg-red-500',
        desc: 'Devuelto con incidencias. Garantía retenida.'
    },
    'problemas_resueltos': {
        color: 'bg-emerald-700/20 text-emerald-500 border-emerald-600/30',
        badge: 'bg-emerald-600',
        desc: 'Todos los problemas resueltos. Archivado.'
    },
    'cancelado': {
        color: 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-soft)] line-through',
        badge: 'bg-[var(--bg-surface-3)]',
        desc: 'Anticipo perdido. Archivado.'
    },
    'Cancelado — Anulado': {
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
 * Normaliza a minúsculas para comparar, pero primero busca el valor exacto.
 */
export const obtenerBadgeEstado = (estadoRaw) => {
    const fallback = { color: 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] border-[var(--border-soft)]', badge: 'bg-[var(--bg-surface-3)]' };
    if (!estadoRaw) return fallback;
    return THEME_ESTADOS[estadoRaw] || THEME_ESTADOS[estadoRaw.toLowerCase()] || fallback;
};
