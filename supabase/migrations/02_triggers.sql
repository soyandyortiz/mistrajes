-- ============================================================
--  PACHARENTA — TRIGGERS DE LÓGICA DE NEGOCIO (ESPAÑOL)
-- ============================================================

-- ===========================================================
-- T1. INGRESO AUTOMÁTICO AL CONFIRMAR PAGO
-- ===========================================================
CREATE OR REPLACE FUNCTION fn_crear_ingreso_desde_pago()
RETURNS TRIGGER AS $$
DECLARE
    v_descripcion   TEXT;
BEGIN
    v_descripcion := CASE NEW.tipo_pago
        WHEN 'anticipo' THEN 'Anticipo (50%) — Contrato #' || NEW.contrato_id::TEXT
        WHEN 'saldo'    THEN 'Pago saldo restante — Contrato #' || NEW.contrato_id::TEXT
        WHEN 'extra'    THEN 'Pago adicional — Contrato #' || NEW.contrato_id::TEXT
        ELSE                 'Abono — Contrato #' || NEW.contrato_id::TEXT
    END;

    INSERT INTO ingresos (
        tenant_id, contrato_id, pago_contrato_id, metodo_pago_id, monto,
        descripcion, registrado_en, registrado_por, nombre_registrador_snapshot, es_manual
    ) VALUES (
        NEW.tenant_id, NEW.contrato_id, NEW.id, NEW.metodo_pago_id, NEW.monto,
        v_descripcion, NEW.registrado_en, NEW.registrado_por, NEW.nombre_registrador_snapshot, FALSE
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_ingreso_desde_pago
AFTER INSERT ON pagos_contrato
FOR EACH ROW EXECUTE FUNCTION fn_crear_ingreso_desde_pago();

-- ===========================================================
-- T2. AUTO-CIERRE DE INCONVENIENTES
-- ===========================================================
CREATE OR REPLACE FUNCTION fn_marcar_problemas_resueltos()
RETURNS TRIGGER AS $$
DECLARE
    v_cantidad_pendientes INT;
BEGIN
    SELECT COUNT(*) INTO v_cantidad_pendientes
    FROM lineas_inconvenientes
    WHERE contrato_id = NEW.contrato_id AND estado = 'pendiente' AND deleted_at IS NULL;

    IF v_cantidad_pendientes = 0 THEN
        UPDATE contratos
        SET estado = 'problemas_resueltos', updated_at = NOW(), actualizado_por = NEW.resuelto_por
        WHERE id = NEW.contrato_id AND estado = 'devuelto_con_problemas';

        INSERT INTO log_auditoria (
            tenant_id, usuario_id, nombre_usuario_snapshot, accion, tipo_entidad, entidad_id, valor_anterior, valor_nuevo
        )
        SELECT
            c.tenant_id, NEW.resuelto_por, NEW.nombre_resolutor_snapshot,
            'contrato.estado_cambiado', 'contrato', c.id,
            jsonb_build_object('estado', 'devuelto_con_problemas'),
            jsonb_build_object('estado', 'problemas_resueltos')
        FROM contratos c WHERE c.id = NEW.contrato_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_marcar_problemas_resueltos
AFTER UPDATE OF estado ON lineas_inconvenientes
FOR EACH ROW WHEN (NEW.estado = 'resuelto' AND OLD.estado = 'pendiente')
EXECUTE FUNCTION fn_marcar_problemas_resueltos();

-- ===========================================================
-- T3. AUDIT LOG — CAMBIOS DE ESTADO EN CONTRATOS
-- ===========================================================
CREATE OR REPLACE FUNCTION fn_audit_estado_contrato()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
        INSERT INTO log_auditoria (
            tenant_id, usuario_id, nombre_usuario_snapshot, accion, tipo_entidad, entidad_id, valor_anterior, valor_nuevo
        ) VALUES (
            NEW.tenant_id, NEW.actualizado_por, (SELECT nombre_completo FROM perfiles_usuario WHERE id = NEW.actualizado_por),
            'contrato.estado_cambiado', 'contrato', NEW.id,
            jsonb_build_object('estado', OLD.estado, 'anticipo_pagado', OLD.anticipo_pagado, 'saldo_pendiente',  OLD.saldo_pendiente),
            jsonb_build_object('estado', NEW.estado, 'anticipo_pagado', NEW.anticipo_pagado, 'saldo_pendiente',  NEW.saldo_pendiente)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_estado_contrato
AFTER UPDATE ON contratos
FOR EACH ROW EXECUTE FUNCTION fn_audit_estado_contrato();

-- ===========================================================
-- T4 y T5. AUDIT LOG PRODUCTOS Y PIEZAS
-- ===========================================================
CREATE OR REPLACE FUNCTION fn_audit_cambios_producto()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO log_auditoria (
        tenant_id, usuario_id, nombre_usuario_snapshot, accion, tipo_entidad, entidad_id, valor_anterior, valor_nuevo
    ) VALUES (
        NEW.tenant_id, NEW.actualizado_por, (SELECT nombre_completo FROM perfiles_usuario WHERE id = NEW.actualizado_por),
        CASE WHEN TG_OP = 'INSERT' THEN 'producto.creado' WHEN OLD.estado IS DISTINCT FROM NEW.estado THEN 'producto.estado_cambiado' ELSE 'producto.actualizado' END,
        'producto', NEW.id,
        CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('estado', OLD.estado, 'precio_unitario', OLD.precio_unitario) ELSE NULL END,
        jsonb_build_object('estado', NEW.estado, 'precio_unitario', NEW.precio_unitario)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER trg_audit_productos AFTER INSERT OR UPDATE ON productos FOR EACH ROW EXECUTE FUNCTION fn_audit_cambios_producto();

CREATE OR REPLACE FUNCTION fn_audit_cambios_pieza()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO log_auditoria (
        tenant_id, usuario_id, nombre_usuario_snapshot, accion, tipo_entidad, entidad_id, valor_anterior, valor_nuevo
    ) VALUES (
        NEW.tenant_id, NEW.actualizado_por, (SELECT nombre_completo FROM perfiles_usuario WHERE id = NEW.actualizado_por),
        CASE WHEN TG_OP = 'INSERT' THEN 'pieza.creada' WHEN OLD.estado IS DISTINCT FROM NEW.estado THEN 'pieza.estado_cambiado' ELSE 'pieza.actualizada' END,
        'pieza', NEW.id,
        CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('estado', OLD.estado, 'precio_unitario', OLD.precio_unitario) ELSE NULL END,
        jsonb_build_object('estado', NEW.estado, 'precio_unitario', NEW.precio_unitario)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER trg_audit_piezas AFTER INSERT OR UPDATE ON piezas FOR EACH ROW EXECUTE FUNCTION fn_audit_cambios_pieza();

-- ===========================================================
-- T12. VALIDACIÓN LÍMITES PLAN PRODUCTOS
-- ===========================================================
CREATE OR REPLACE FUNCTION fn_validar_limite_productos()
RETURNS TRIGGER AS $$
DECLARE
    v_actuales INT;
    v_maximo   INT;
BEGIN
    SELECT COUNT(*) INTO v_actuales FROM productos WHERE tenant_id = NEW.tenant_id AND estado = 'activo' AND deleted_at IS NULL;
    SELECT p.max_productos_activos INTO v_maximo FROM tenants t JOIN plans p ON p.id = t.plan_id WHERE t.id = NEW.tenant_id;
    IF v_actuales >= v_maximo THEN
        RAISE EXCEPTION 'Límite de % productos activos alcanzado según tu plan actual.', v_maximo USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER trg_validar_limite_productos BEFORE INSERT ON productos FOR EACH ROW WHEN (NEW.estado = 'activo') EXECUTE FUNCTION fn_validar_limite_productos();

-- ===========================================================
-- T13. VALIDACIÓN LÍMITES PLAN PIEZAS
-- ===========================================================
CREATE OR REPLACE FUNCTION fn_validar_limite_piezas()
RETURNS TRIGGER AS $$
DECLARE
    v_actuales INT;
    v_maximo   INT;
BEGIN
    SELECT COUNT(*) INTO v_actuales FROM piezas WHERE tenant_id = NEW.tenant_id AND estado = 'activo' AND deleted_at IS NULL;
    SELECT p.max_piezas_activas INTO v_maximo FROM tenants t JOIN plans p ON p.id = t.plan_id WHERE t.id = NEW.tenant_id;
    IF v_actuales >= v_maximo THEN
        RAISE EXCEPTION 'Límite de % piezas activas alcanzado según tu plan actual.', v_maximo USING ERRCODE = 'P0002';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER trg_validar_limite_piezas BEFORE INSERT ON piezas FOR EACH ROW WHEN (NEW.estado = 'activo') EXECUTE FUNCTION fn_validar_limite_piezas();

-- ===========================================================
-- T14. VALIDACIÓN LÍMITES PLAN EMPLEADOS
-- ===========================================================
CREATE OR REPLACE FUNCTION fn_validar_limite_empleados()
RETURNS TRIGGER AS $$
DECLARE
    v_actuales INT;
    v_maximo   INT;
BEGIN
    -- Contamos únicamente a los usuarios con rol de empleado activos en este tenant
    SELECT COUNT(*) INTO v_actuales FROM perfiles_usuario WHERE tenant_id = NEW.tenant_id AND rol = 'tenant_empleado' AND es_activo = TRUE AND deleted_at IS NULL;
    SELECT p.max_empleados INTO v_maximo FROM tenants t JOIN plans p ON p.id = t.plan_id WHERE t.id = NEW.tenant_id;
    
    -- El admin tenant usualmente no cuenta para el límite, pero si aplica se debe de cambiar la consulta de arriba
    IF v_actuales >= v_maximo THEN
        RAISE EXCEPTION 'Límite de % empleados alcanzado según tu plan actual. Para agregar más debes actualizar a un plan superior.', v_maximo USING ERRCODE = 'P0003';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER trg_validar_limite_empleados BEFORE INSERT ON perfiles_usuario FOR EACH ROW WHEN (NEW.rol = 'tenant_empleado' AND NEW.es_activo = TRUE) EXECUTE FUNCTION fn_validar_limite_empleados();

-- ===========================================================
-- T15. VALIDACIÓN LÍMITES PLAN CONTRATOS ACTIVOS
-- ===========================================================
CREATE OR REPLACE FUNCTION fn_validar_limite_contratos()
RETURNS TRIGGER AS $$
DECLARE
    v_actuales INT;
    v_maximo   INT;
BEGIN
    -- Consideramos "activos" a aquellos en proceso, ni finalizados ni cancelados ni eliminados
    SELECT COUNT(*) INTO v_actuales FROM contratos WHERE tenant_id = NEW.tenant_id AND estado NOT IN ('devuelto_ok', 'problemas_resueltos', 'cancelado', 'eliminado') AND deleted_at IS NULL;
    SELECT p.max_contratos_activos INTO v_maximo FROM tenants t JOIN plans p ON p.id = t.plan_id WHERE t.id = NEW.tenant_id;
    IF v_actuales >= v_maximo THEN
        RAISE EXCEPTION 'Límite de % contratos concurrentes activos alcanzado según tu plan actual.', v_maximo USING ERRCODE = 'P0004';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER trg_validar_limite_contratos BEFORE INSERT ON contratos FOR EACH ROW EXECUTE FUNCTION fn_validar_limite_contratos();

-- ===========================================================
-- FUNCIONES DE AUTO ACTUALIZACIÓN DE BALANCE
-- ===========================================================
CREATE OR REPLACE FUNCTION actualizar_balance_contrato()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE contratos
    SET
        anticipo_pagado = (SELECT COALESCE(SUM(monto), 0) FROM pagos_contrato WHERE contrato_id = NEW.contrato_id),
        saldo_pendiente = total - (SELECT COALESCE(SUM(monto), 0) FROM pagos_contrato WHERE contrato_id = NEW.contrato_id),
        updated_at = NOW()
    WHERE id = NEW.contrato_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_actualizar_balance_contrato AFTER INSERT ON pagos_contrato FOR EACH ROW EXECUTE FUNCTION actualizar_balance_contrato();

CREATE OR REPLACE FUNCTION actualizar_balance_egreso()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE egresos
    SET
        monto_pagado = (SELECT COALESCE(SUM(monto), 0) FROM pagos_egreso WHERE egreso_id = NEW.egreso_id),
        estado_deuda = CASE WHEN (SELECT COALESCE(SUM(monto), 0) FROM pagos_egreso WHERE egreso_id = NEW.egreso_id) >= monto_total THEN 'pagado'::estado_deuda ELSE 'pendiente'::estado_deuda END,
        updated_at = NOW()
    WHERE id = NEW.egreso_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_actualizar_balance_egreso AFTER INSERT ON pagos_egreso FOR EACH ROW EXECUTE FUNCTION actualizar_balance_egreso();

-- T13 Auto Updated At
CREATE OR REPLACE FUNCTION fn_marcar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'tenants', 'metodos_pago_tenant', 'perfiles_usuario',
        'categorias_productos', 'piezas', 'stock_piezas',
        'productos', 'clientes', 'proveedores', 'contratos',
        'egresos', 'plantillas_notificacion'
    ] LOOP
        EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_marcar_updated_at()', t);
    END LOOP;
END;
$$;
