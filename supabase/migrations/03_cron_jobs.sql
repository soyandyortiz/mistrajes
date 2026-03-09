-- ============================================================
--  PACHARENTA — TAREAS PROGRAMADAS (CRON JOBS) (ESPAÑOL)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ===========================================================
-- C1. SUSPENDER TENANTS CON SUSCRIPCIÓN VENCIDA
-- ===========================================================
CREATE OR REPLACE FUNCTION fn_suspender_tenants_vencidos()
RETURNS void AS $$
BEGIN
    UPDATE tenants
    SET
        estado = 'suspended',
        updated_at = NOW()
    WHERE
        estado = 'active'
        AND fin_periodo_gracia < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SELECT cron.schedule('suspender-tenants-vencidos', '0 1 * * *', 'SELECT fn_suspender_tenants_vencidos();');

-- ===========================================================
-- C2. ARCHIVAR TENANTS SUSPENDIDOS (Más de 90 días)
-- ===========================================================
CREATE OR REPLACE FUNCTION fn_archivar_tenants_vencidos()
RETURNS void AS $$
BEGIN
    UPDATE tenants
    SET
        estado = 'archived',
        updated_at = NOW()
    WHERE
        estado = 'suspended'
        AND fin_periodo_gracia < (CURRENT_DATE - INTERVAL '90 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SELECT cron.schedule('archivar-tenants-vencidos', '30 1 * * *', 'SELECT fn_archivar_tenants_vencidos();');

-- ===========================================================
-- C3. RECORDATORIOS DE RENOVACIÓN DE PAQUETE (Edge Function)
-- ===========================================================
-- Llama a Supabase Edge Function para enviar correo
CREATE OR REPLACE FUNCTION fn_notificar_suscripcion_por_vencer()
RETURNS void AS $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN
        SELECT id, nombre_negocio, email_propietario, fin_suscripcion
        FROM tenants
        WHERE estado = 'active'
          AND (fin_suscripcion = CURRENT_DATE + INTERVAL '7 days' OR fin_suscripcion = CURRENT_DATE + INTERVAL '1 day')
    LOOP
        -- Reemplazar por llamada a tu Edge Function
        -- PERFORM net.http_post(...);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SELECT cron.schedule('notificar-suscripcion-por-vencer', '0 9 * * *', 'SELECT fn_notificar_suscripcion_por_vencer();');

-- ===========================================================
-- C4. RECORDATORIOS DE RETIRO DE TRAJES (24H ANTES)
-- ===========================================================
CREATE OR REPLACE FUNCTION fn_enviar_recordatorios_retiro_24h()
RETURNS void AS $$
DECLARE
    c RECORD;
BEGIN
    FOR c IN
        SELECT c.id, c.tenant_id, cl.whatsapp, cl.nombre_completo, c.fecha_salida
        FROM contratos c
        JOIN clientes cl ON cl.id = c.cliente_id
        WHERE c.estado = 'reservado'
          AND c.deleted_at IS NULL
          AND c.fecha_salida >= NOW() + INTERVAL '23 hours'
          AND c.fecha_salida <= NOW() + INTERVAL '25 hours'
    LOOP
        INSERT INTO log_notificaciones (
            tenant_id, contrato_id, telefono_destinatario, tipo_evento, cuerpo_mensaje
        ) VALUES (
            c.tenant_id, c.id, c.whatsapp, 'recordatorio_retiro',
            'Hola ' || c.nombre_completo || ', te recordamos que tu pedido está listo para retirar mañana.'
        );
        -- Llamada a Edge Function de WhatsApp aquí
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SELECT cron.schedule('recordatorios-retiro-24h', '0 * * * *', 'SELECT fn_enviar_recordatorios_retiro_24h();');

-- ===========================================================
-- C5. LIMPIEZA DE PROFORMAS EXPIRADAS
-- ===========================================================
CREATE OR REPLACE FUNCTION fn_procesar_proformas_expiradas()
RETURNS void AS $$
BEGIN
    UPDATE proformas
    SET esta_expirada = TRUE
    WHERE
        esta_expirada = FALSE
        AND CURRENT_DATE > expira_el;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================================
-- C6. LIMPIEZA DE AUDITORÍA (Más de 12 meses)
-- ===========================================================
CREATE OR REPLACE FUNCTION fn_limpiar_logs_auditoria_viejos()
RETURNS void AS $$
BEGIN
    DELETE FROM log_auditoria
    WHERE created_at < NOW() - INTERVAL '12 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SELECT cron.schedule('limpiar-logs-auditoria-viejos', '0 3 1 * *', 'SELECT fn_limpiar_logs_auditoria_viejos();');
