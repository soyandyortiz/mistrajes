-- ============================================================
-- Migración #05 — Corrección completa del módulo de Contratos
-- Fecha: 2026-03-10
-- Problemas resueltos:
--   1. Columnas faltantes en `contratos` (dias_alquiler, precio_por_dia,
--      subtotal_alquiler, fecha_devolucion_modificada)
--   2. Columnas faltantes en `clientes` (nombre_referencia_2, telefono_referencia_2)
--   3. Políticas RLS faltantes en clientes, ingresos, stock_piezas,
--      imagenes_productos (por eso no aparecían en OpenAPI)
--   4. La migración 04 (crear_contrato_completo) no había sido aplicada —
--      se re-aplica aquí de forma idempotente con todas las correcciones.
--   5. Campo `registrado_en` de pagos_contrato puede ser NULL (DEFAULT NOW())
-- ============================================================

-- ===========================================================
-- A. COLUMNAS FALTANTES EN `contratos`
--    (referenciadas en el payload del frontend y en la RPC)
-- ===========================================================

ALTER TABLE contratos
    ADD COLUMN IF NOT EXISTS dias_alquiler              INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS precio_por_dia             NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS subtotal_alquiler          NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS fecha_devolucion_modificada BOOLEAN NOT NULL DEFAULT FALSE;

-- ===========================================================
-- B. COLUMNAS FALTANTES EN `clientes`
--    (el módulo Clientes.jsx referencia nombre_referencia_2
--     y telefono_referencia_2 pero no estaban en el schema)
-- ===========================================================

ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS nombre_referencia_2    VARCHAR(200),
    ADD COLUMN IF NOT EXISTS telefono_referencia_2  VARCHAR(20);

-- Relajar la restricción NOT NULL de direccion_domicilio y ciudad
-- (el formulario de NuevoContrato no siempre las provee como no nulas)
ALTER TABLE clientes
    ALTER COLUMN direccion_domicilio DROP NOT NULL,
    ALTER COLUMN ciudad              DROP NOT NULL;

-- ===========================================================
-- C. COLUMNA `registrado_en` en `pagos_contrato`
--    El schema original la tiene como NOT NULL sin DEFAULT,
--    pero la RPC no la provee; se agrega DEFAULT NOW()
-- ===========================================================

ALTER TABLE pagos_contrato
    ALTER COLUMN registrado_en SET DEFAULT NOW();

-- ===========================================================
-- D. RLS — POLÍTICAS FALTANTES
--    Las tablas clientes, ingresos, stock_piezas e
--    imagenes_productos no tenían RLS activado → por eso
--    no aparecían en el endpoint de OpenAPI de Supabase.
-- ===========================================================

-- Helper functions: DROP primero para evitar error de cambio de tipo de retorno
DROP FUNCTION IF EXISTS auth_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS auth_user_role() CASCADE;

CREATE FUNCTION auth_tenant_id()
RETURNS UUID AS $$
    SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID;
$$ LANGUAGE sql STABLE;

CREATE FUNCTION auth_user_role()
RETURNS TEXT AS $$
    SELECT auth.jwt() -> 'app_metadata' ->> 'rol';
$$ LANGUAGE sql STABLE;

-- ── clientes ──────────────────────────────────────────────
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_clientes ON clientes;
CREATE POLICY tenant_isolation_clientes ON clientes
    USING (
        tenant_id = auth_tenant_id()
        OR auth_user_role() = 'super_admin'
    );

DROP POLICY IF EXISTS tenant_insert_clientes ON clientes;
CREATE POLICY tenant_insert_clientes ON clientes
    FOR INSERT WITH CHECK (
        tenant_id = auth_tenant_id()
        OR auth_user_role() = 'super_admin'
    );

-- ── ingresos ──────────────────────────────────────────────
ALTER TABLE ingresos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_ingresos ON ingresos;
CREATE POLICY tenant_isolation_ingresos ON ingresos
    USING (
        tenant_id = auth_tenant_id()
        OR auth_user_role() = 'super_admin'
    );

DROP POLICY IF EXISTS tenant_insert_ingresos ON ingresos;
CREATE POLICY tenant_insert_ingresos ON ingresos
    FOR INSERT WITH CHECK (
        tenant_id = auth_tenant_id()
        OR auth_user_role() = 'super_admin'
    );

-- ── stock_piezas ──────────────────────────────────────────
ALTER TABLE stock_piezas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_stock_piezas ON stock_piezas;
CREATE POLICY tenant_isolation_stock_piezas ON stock_piezas
    USING (
        tenant_id = auth_tenant_id()
        OR auth_user_role() = 'super_admin'
    );

DROP POLICY IF EXISTS tenant_insert_stock_piezas ON stock_piezas;
CREATE POLICY tenant_insert_stock_piezas ON stock_piezas
    FOR INSERT WITH CHECK (
        tenant_id = auth_tenant_id()
        OR auth_user_role() = 'super_admin'
    );

-- ── imagenes_productos ────────────────────────────────────
ALTER TABLE imagenes_productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_imagenes_productos ON imagenes_productos;
CREATE POLICY tenant_isolation_imagenes_productos ON imagenes_productos
    USING (
        tenant_id = auth_tenant_id()
        OR auth_user_role() = 'super_admin'
    );

DROP POLICY IF EXISTS tenant_insert_imagenes_productos ON imagenes_productos;
CREATE POLICY tenant_insert_imagenes_productos ON imagenes_productos
    FOR INSERT WITH CHECK (
        tenant_id = auth_tenant_id()
        OR auth_user_role() = 'super_admin'
    );

-- ── garantias (de migración 04) ───────────────────────────
ALTER TABLE IF EXISTS garantias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_garantias ON garantias;
CREATE POLICY tenant_isolation_garantias ON garantias
    USING (
        tenant_id = auth_tenant_id()
        OR auth_user_role() = 'super_admin'
    );

-- ── items_contrato_tallas (de migración 04) ───────────────
ALTER TABLE IF EXISTS items_contrato_tallas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_items_tallas ON items_contrato_tallas;
CREATE POLICY tenant_isolation_items_tallas ON items_contrato_tallas
    USING (
        tenant_id = auth_tenant_id()
        OR auth_user_role() = 'super_admin'
    );

-- ===========================================================
-- E. TABLAS DE MIGRACIÓN 04 (idempotentes)
--    Re-crear por si no fueron aplicadas
-- ===========================================================

CREATE TABLE IF NOT EXISTS items_contrato_tallas (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_contrato_id        UUID NOT NULL REFERENCES items_contrato(id) ON DELETE CASCADE,
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pieza_id                UUID NOT NULL REFERENCES piezas(id),
    nombre_pieza_snapshot   VARCHAR(200) NOT NULL,
    etiqueta_talla          VARCHAR(50) NOT NULL,
    cantidad                INT NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              UUID REFERENCES perfiles_usuario(id)
);

CREATE INDEX IF NOT EXISTS idx_items_contrato_tallas_item
    ON items_contrato_tallas(item_contrato_id);

CREATE INDEX IF NOT EXISTS idx_items_contrato_tallas_pieza_talla
    ON items_contrato_tallas(pieza_id, etiqueta_talla);

CREATE TABLE IF NOT EXISTS garantias (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contrato_id     UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tipo            tipo_garantia NOT NULL,
    descripcion     TEXT,
    devuelta        BOOLEAN NOT NULL DEFAULT FALSE,
    devuelta_en     TIMESTAMPTZ,
    devuelta_por    UUID REFERENCES perfiles_usuario(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID REFERENCES perfiles_usuario(id),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_garantias_contrato
    ON garantias(contrato_id);

-- ===========================================================
-- F. VISTA DE DISPONIBILIDAD DE STOCK (re-crear con corrección)
-- ===========================================================

CREATE OR REPLACE VIEW vista_disponibilidad_stock AS
SELECT
    sp.tenant_id,
    sp.pieza_id,
    sp.etiqueta_talla,
    sp.es_estandar,
    sp.stock_total,
    COALESCE(SUM(
        CASE
            WHEN c.estado IN ('reservado', 'entregado')
            THEN ict.cantidad
            ELSE 0
        END
    ), 0) AS cantidad_en_uso,
    sp.stock_total - COALESCE(SUM(
        CASE
            WHEN c.estado IN ('reservado', 'entregado')
            THEN ict.cantidad
            ELSE 0
        END
    ), 0) AS stock_disponible
FROM stock_piezas sp
LEFT JOIN items_contrato_tallas ict
    ON ict.pieza_id = sp.pieza_id
    AND ict.etiqueta_talla = sp.etiqueta_talla
LEFT JOIN items_contrato ic ON ic.id = ict.item_contrato_id
LEFT JOIN contratos c
    ON c.id = ic.contrato_id
    AND c.tenant_id = sp.tenant_id
    AND c.deleted_at IS NULL
    AND c.cancelado_en IS NULL
GROUP BY
    sp.tenant_id, sp.pieza_id, sp.etiqueta_talla,
    sp.es_estandar, sp.stock_total;

-- ===========================================================
-- G. FUNCIÓN calcular_stock_disponible_fecha (re-crear)
-- ===========================================================

CREATE OR REPLACE FUNCTION calcular_stock_disponible_fecha(
    p_tenant_id     UUID,
    p_pieza_id      UUID,
    p_talla         VARCHAR,
    p_fecha_salida  TIMESTAMPTZ
)
RETURNS INT AS $$
DECLARE
    v_stock_total   INT;
    v_en_uso        INT;
    v_horas_buffer  INT := 4;  -- valor por defecto si no está configurado
BEGIN
    BEGIN
        SELECT horas_buffer_lavanderia INTO v_horas_buffer
        FROM tenants WHERE id = p_tenant_id;
    EXCEPTION WHEN OTHERS THEN
        v_horas_buffer := 4;
    END;

    SELECT stock_total INTO v_stock_total
    FROM stock_piezas
    WHERE pieza_id = p_pieza_id
      AND etiqueta_talla = p_talla
      AND tenant_id = p_tenant_id;

    IF v_stock_total IS NULL THEN
        RETURN 0;
    END IF;

    SELECT COALESCE(SUM(ict.cantidad), 0) INTO v_en_uso
    FROM items_contrato_tallas ict
    JOIN items_contrato ic ON ic.id = ict.item_contrato_id
    JOIN contratos c ON c.id = ic.contrato_id
    WHERE c.tenant_id = p_tenant_id
      AND ict.pieza_id = p_pieza_id
      AND ict.etiqueta_talla = p_talla
      AND c.estado IN ('reservado', 'entregado')
      AND c.deleted_at IS NULL
      AND c.cancelado_en IS NULL
      AND p_fecha_salida < (c.fecha_devolucion + (COALESCE(v_horas_buffer, 4) || ' hours')::INTERVAL);

    RETURN GREATEST(0, v_stock_total - v_en_uso);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ===========================================================
-- H. RPC PRINCIPAL: crear_contrato_completo (CORREGIDA)
--    Correcciones respecto a migración 04 original:
--    1. Incluye dias_alquiler, precio_por_dia, subtotal_alquiler,
--       fecha_devolucion_modificada en el INSERT de contratos
--    2. Manejo más robusto del tipo_garantia (no falla si es NULL/vacío)
--    3. La validación de suma de tallas es opcional para productos
--       sin piezas (productos libres)
--    4. Mejor manejo de errores con SQLSTATE
-- ===========================================================

CREATE OR REPLACE FUNCTION crear_contrato_completo(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cliente_id            UUID;
    v_contrato_id           UUID;
    v_item_id               UUID;
    v_pago_id               UUID;
    v_garantia_id           UUID;
    v_tenant_id             UUID := (payload->>'tenant_id')::UUID;
    v_creado_por            UUID := (payload->>'creado_por')::UUID;

    r_producto              JSONB;
    r_pieza                 JSONB;
    r_talla                 RECORD;

    v_cantidad_talla        INT;
    v_talla_nombre          TEXT;
    v_stock_disponible      INT;
    v_suma_tallas           INT;
    v_cantidad_total_prod   INT;
    v_nombre_pieza          TEXT;

    v_tipo_garantia_val     TEXT;
    v_tipo_envio_val        TEXT;
    v_tiene_piezas          BOOLEAN;
BEGIN
    -- ── Validaciones básicas ────────────────────────────────
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'tenant_id es requerido.';
    END IF;

    IF v_creado_por IS NULL THEN
        RAISE EXCEPTION 'creado_por es requerido.';
    END IF;

    IF payload->'cliente'->>'identificacion' IS NULL
       OR payload->'cliente'->>'identificacion' = '' THEN
        RAISE EXCEPTION 'La identificación del cliente es requerida.';
    END IF;

    IF payload->'productos' IS NULL
       OR jsonb_array_length(payload->'productos') = 0 THEN
        RAISE EXCEPTION 'Debe incluir al menos un producto en el contrato.';
    END IF;

    -- ── 1. Upsert del Cliente ────────────────────────────────
    INSERT INTO clientes (
        tenant_id, tipo_entidad, nombre_completo, identificacion,
        email, whatsapp, direccion_domicilio, ciudad, provincia, pais,
        creado_por
    ) VALUES (
        v_tenant_id,
        COALESCE((payload->'cliente'->>'tipo_entidad')::tipo_entidad, 'natural'::tipo_entidad),
        COALESCE(payload->'cliente'->>'nombre_completo', 'Sin nombre'),
        payload->'cliente'->>'identificacion',
        NULLIF(payload->'cliente'->>'email', ''),
        NULLIF(payload->'cliente'->>'whatsapp', ''),
        COALESCE(NULLIF(payload->'cliente'->>'direccion_domicilio', ''), 'No especificada'),
        COALESCE(NULLIF(payload->'cliente'->>'ciudad', ''), 'No especificada'),
        NULLIF(payload->'cliente'->>'provincia', ''),
        COALESCE(NULLIF(payload->'cliente'->>'pais', ''), 'Ecuador'),
        v_creado_por
    )
    ON CONFLICT (tenant_id, identificacion) DO UPDATE SET
        nombre_completo     = EXCLUDED.nombre_completo,
        whatsapp            = COALESCE(EXCLUDED.whatsapp, clientes.whatsapp),
        email               = COALESCE(EXCLUDED.email, clientes.email),
        direccion_domicilio = COALESCE(EXCLUDED.direccion_domicilio, clientes.direccion_domicilio),
        ciudad              = COALESCE(EXCLUDED.ciudad, clientes.ciudad),
        provincia           = COALESCE(EXCLUDED.provincia, clientes.provincia),
        pais                = COALESCE(EXCLUDED.pais, clientes.pais),
        actualizado_por     = v_creado_por,
        updated_at          = NOW()
    RETURNING id INTO v_cliente_id;

    -- ── 2. Normalizar valores ENUM ───────────────────────────
    v_tipo_envio_val := LOWER(COALESCE(payload->'contrato'->>'tipo_envio', 'retiro'));
    IF v_tipo_envio_val NOT IN ('retiro', 'envio') THEN
        v_tipo_envio_val := 'retiro';
    END IF;

    v_tipo_garantia_val := LOWER(COALESCE(payload->'contrato'->>'tipo_garantia', ''));
    IF v_tipo_garantia_val NOT IN ('fisica', 'economica') THEN
        v_tipo_garantia_val := NULL;
    END IF;

    -- ── 3. Insertar Contrato base ────────────────────────────
    INSERT INTO contratos (
        tenant_id, cliente_id, canal, estado, tipo_envio,
        direccion_evento,
        fecha_salida, fecha_evento, fecha_devolucion,
        subtotal, monto_descuento, total,
        anticipo_pagado, saldo_pendiente,
        tipo_garantia, descripcion_garantia,
        codigo_cupon, descuento_cupon,
        dias_alquiler, precio_por_dia, subtotal_alquiler,
        fecha_devolucion_modificada,
        creado_por
    ) VALUES (
        v_tenant_id,
        v_cliente_id,
        'presencial',
        'reservado',
        v_tipo_envio_val::tipo_envio,
        NULLIF(payload->'contrato'->>'direccion_evento', ''),
        (payload->'contrato'->>'fecha_salida')::TIMESTAMPTZ,
        NULLIF(payload->'contrato'->>'fecha_evento', '')::TIMESTAMPTZ,
        (payload->'contrato'->>'fecha_devolucion')::TIMESTAMPTZ,
        COALESCE((payload->'contrato'->>'subtotal')::NUMERIC, 0),
        COALESCE((payload->'contrato'->>'monto_descuento')::NUMERIC, 0),
        COALESCE((payload->'contrato'->>'total')::NUMERIC, 0),
        0,   -- anticipo_pagado: se actualiza por trigger al insertar pago
        COALESCE((payload->'contrato'->>'total')::NUMERIC, 0),
        v_tipo_garantia_val::tipo_garantia,
        NULLIF(payload->'contrato'->>'descripcion_garantia', ''),
        NULLIF(payload->'contrato'->>'codigo_cupon', ''),
        COALESCE((payload->'contrato'->>'descuento_cupon')::NUMERIC, 0),
        COALESCE((payload->'contrato'->>'dias_alquiler')::INT, 1),
        (payload->'contrato'->>'precio_por_dia')::NUMERIC,
        (payload->'contrato'->>'subtotal_alquiler')::NUMERIC,
        COALESCE((payload->'contrato'->>'fecha_devolucion_modificada')::BOOLEAN, FALSE),
        v_creado_por
    ) RETURNING id INTO v_contrato_id;

    -- ── 3.1. Insertar garantía en tabla explícita (si aplica) ─
    IF v_tipo_garantia_val IS NOT NULL THEN
        INSERT INTO garantias (
            contrato_id, tenant_id, tipo, descripcion, created_by
        ) VALUES (
            v_contrato_id,
            v_tenant_id,
            v_tipo_garantia_val::tipo_garantia,
            NULLIF(payload->'contrato'->>'descripcion_garantia', ''),
            v_creado_por
        ) RETURNING id INTO v_garantia_id;
    END IF;

    -- ── 4. Iterar productos ──────────────────────────────────
    FOR r_producto IN SELECT * FROM jsonb_array_elements(payload->'productos')
    LOOP
        v_cantidad_total_prod := COALESCE((r_producto->>'cantidad_total')::INT, 1);

        -- Insertar en items_contrato
        INSERT INTO items_contrato (
            contrato_id, tenant_id, producto_id, nombre_item,
            cantidad, precio_unitario, porcentaje_descuento, subtotal
        ) VALUES (
            v_contrato_id,
            v_tenant_id,
            (r_producto->>'id')::UUID,
            COALESCE(r_producto->>'nombre', 'Producto'),
            v_cantidad_total_prod,
            COALESCE((r_producto->>'precio_unitario')::NUMERIC, 0),
            0,
            v_cantidad_total_prod * COALESCE((r_producto->>'precio_unitario')::NUMERIC, 0)
        ) RETURNING id INTO v_item_id;

        -- Iterar piezas (si el producto tiene piezas asignadas)
        v_tiene_piezas := r_producto->'piezas' IS NOT NULL
            AND jsonb_array_length(r_producto->'piezas') > 0;

        IF v_tiene_piezas THEN
            FOR r_pieza IN SELECT * FROM jsonb_array_elements(r_producto->'piezas')
            LOOP
                v_suma_tallas  := 0;
                v_nombre_pieza := COALESCE(r_pieza->>'nombre', 'Pieza');

                IF r_pieza->'tallasCantidades' IS NOT NULL THEN
                    FOR r_talla IN SELECT * FROM jsonb_each(r_pieza->'tallasCantidades')
                    LOOP
                        v_talla_nombre   := r_talla.key;
                        v_cantidad_talla := COALESCE((r_talla.value::text)::INT, 0);

                        IF v_cantidad_talla > 0 THEN
                            v_suma_tallas := v_suma_tallas + v_cantidad_talla;

                            -- Validar stock disponible para las fechas del contrato
                            v_stock_disponible := calcular_stock_disponible_fecha(
                                v_tenant_id,
                                (r_pieza->>'id')::UUID,
                                v_talla_nombre,
                                (payload->'contrato'->>'fecha_salida')::TIMESTAMPTZ
                            );

                            IF v_stock_disponible < v_cantidad_talla THEN
                                RAISE EXCEPTION
                                    'Stock insuficiente para "%" talla %. Requerido: %, Disponible: %.',
                                    v_nombre_pieza, v_talla_nombre,
                                    v_cantidad_talla, v_stock_disponible
                                USING ERRCODE = 'P0010';
                            END IF;

                            -- Registrar detalle por talla
                            INSERT INTO items_contrato_tallas (
                                item_contrato_id, tenant_id, pieza_id,
                                nombre_pieza_snapshot, etiqueta_talla, cantidad, created_by
                            ) VALUES (
                                v_item_id, v_tenant_id, (r_pieza->>'id')::UUID,
                                v_nombre_pieza, v_talla_nombre,
                                v_cantidad_talla, v_creado_por
                            );
                        END IF;
                    END LOOP;
                END IF;

                -- Validar que la suma de tallas == cantidad total del producto
                IF v_suma_tallas <> v_cantidad_total_prod THEN
                    RAISE EXCEPTION
                        'La suma de tallas para la pieza "%" (%) no coincide con la cantidad del producto (%).',
                        v_nombre_pieza, v_suma_tallas, v_cantidad_total_prod
                    USING ERRCODE = 'P0011';
                END IF;
            END LOOP;
        END IF;
    END LOOP;

    -- ── 5. Registrar Anticipo ────────────────────────────────
    IF (payload->'pago_anticipo'->>'monto')::NUMERIC > 0 THEN
        INSERT INTO pagos_contrato (
            contrato_id, tenant_id, monto, tipo_pago,
            notas, registrado_por, nombre_registrador_snapshot, registrado_en
        ) VALUES (
            v_contrato_id,
            v_tenant_id,
            (payload->'pago_anticipo'->>'monto')::NUMERIC,
            'anticipo',
            COALESCE(payload->'pago_anticipo'->>'notas', 'Anticipo al crear contrato'),
            v_creado_por,
            COALESCE(
                NULLIF(payload->'pago_anticipo'->>'nombre_registrador_snapshot', ''),
                'Sistema'
            ),
            NOW()
        ) RETURNING id INTO v_pago_id;
        -- Los triggers trg_actualizar_balance_contrato y trg_ingreso_desde_pago
        -- actualizan automáticamente anticipo_pagado, saldo_pendiente e insertan en ingresos.
    END IF;

    -- ── Resultado exitoso ────────────────────────────────────
    RETURN jsonb_build_object(
        'success',     true,
        'contrato_id', v_contrato_id,
        'cliente_id',  v_cliente_id,
        'mensaje',     'Contrato creado exitosamente'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error',   SQLERRM,
        'code',    SQLSTATE
    );
END;
$$;

-- Conceder acceso de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION crear_contrato_completo(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION calcular_stock_disponible_fecha(UUID, UUID, VARCHAR, TIMESTAMPTZ) TO authenticated;

-- ===========================================================
-- I. ÍNDICES ADICIONALES para rendimiento
-- ===========================================================

CREATE INDEX IF NOT EXISTS idx_contratos_cliente
    ON contratos(cliente_id);

CREATE INDEX IF NOT EXISTS idx_items_contrato_producto
    ON items_contrato(producto_id);

CREATE INDEX IF NOT EXISTS idx_ingresos_contrato
    ON ingresos(contrato_id);

CREATE INDEX IF NOT EXISTS idx_ingresos_tenant_fecha
    ON ingresos(tenant_id, registrado_en DESC);

CREATE INDEX IF NOT EXISTS idx_pagos_contrato_contrato
    ON pagos_contrato(contrato_id);

-- ===========================================================
-- FIN DE MIGRACIÓN 05
-- ===========================================================
