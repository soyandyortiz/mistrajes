-- ============================================================
-- Migración #04 - Creación de tablas faltantes y RPC transaccional
-- ============================================================

-- 1. Crear tabla para las tallas asignadas a las piezas de cada producto en un contrato
CREATE TABLE IF NOT EXISTS items_contrato_tallas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_contrato_id UUID NOT NULL REFERENCES items_contrato(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pieza_id UUID NOT NULL REFERENCES piezas(id),
    nombre_pieza_snapshot VARCHAR(200) NOT NULL,
    etiqueta_talla VARCHAR(50) NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES perfiles_usuario(id),
    updated_by UUID REFERENCES perfiles_usuario(id)
);

CREATE INDEX IF NOT EXISTS idx_items_contrato_tallas_item ON items_contrato_tallas(item_contrato_id);
ALTER TABLE items_contrato_tallas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_items_tallas ON items_contrato_tallas;
CREATE POLICY tenant_isolation_items_tallas ON items_contrato_tallas 
    USING (tenant_id = auth_tenant_id() OR auth_user_role() = 'super_admin');

-- 2. Crear tabla de garantías independiente (como se especificó en el mapa)
CREATE TABLE IF NOT EXISTS garantias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tipo tipo_garantia NOT NULL,
    descripcion TEXT,
    devuelta BOOLEAN NOT NULL DEFAULT FALSE,
    devuelta_en TIMESTAMPTZ,
    devuelta_por UUID REFERENCES perfiles_usuario(id),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES perfiles_usuario(id),
    updated_by UUID REFERENCES perfiles_usuario(id),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_garantias_contrato ON garantias(contrato_id);
ALTER TABLE garantias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_garantias ON garantias;
CREATE POLICY tenant_isolation_garantias ON garantias 
    USING (tenant_id = auth_tenant_id() OR auth_user_role() = 'super_admin');

-- 3. Actualizar la vista de disponibilidad de stock para considerar la tabla items_contrato_tallas real
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
LEFT JOIN items_contrato_tallas ict ON ict.pieza_id = sp.pieza_id 
    AND ict.etiqueta_talla = sp.etiqueta_talla 
LEFT JOIN items_contrato ic ON ic.id = ict.item_contrato_id
LEFT JOIN contratos c ON c.id = ic.contrato_id
    AND c.tenant_id = sp.tenant_id
    AND c.deleted_at IS NULL
    AND c.cancelado_en IS NULL
GROUP BY sp.tenant_id, sp.pieza_id, sp.etiqueta_talla, sp.es_estandar, sp.stock_total;

-- 4. Actualizar función calcular_stock_disponible_fecha para usar la nueva tabla tallas
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
    v_horas_buffer  INT;
BEGIN
    SELECT horas_buffer_lavanderia INTO v_horas_buffer
    FROM tenants WHERE id = p_tenant_id;

    SELECT stock_total INTO v_stock_total
    FROM stock_piezas
    WHERE pieza_id = p_pieza_id AND etiqueta_talla = p_talla AND tenant_id = p_tenant_id;

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
      AND p_fecha_salida < (c.fecha_devolucion + (v_horas_buffer || ' hours')::INTERVAL)
      AND (c.fecha_devolucion + (v_horas_buffer || ' hours')::INTERVAL) > p_fecha_salida;

    RETURN GREATEST(0, v_stock_total - v_en_uso);
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. RPC Seguro con TRANSACCIONES PARA CREAR CONTRATO
CREATE OR REPLACE FUNCTION crear_contrato_completo(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cliente_id UUID;
    v_contrato_id UUID;
    v_item_id UUID;
    v_pago_id UUID;
    v_garantia_id UUID;
    v_tenant_id UUID := (payload->>'tenant_id')::UUID;
    v_creado_por UUID := (payload->>'creado_por')::UUID;
    
    r_producto JSONB;
    r_pieza JSONB;
    r_talla RECORD;
    
    v_cantidad_talla INT;
    v_talla_nombre TEXT;
    
    v_stock_disponible INT;
    v_suma_tallas INT;
    v_cantidad_total_prod INT;
    
    v_nombre_pieza TEXT;
BEGIN
    -- 1. Insertar / Actualizar Cliente
    IF payload->'cliente'->>'identificacion' IS NULL OR payload->'cliente'->>'identificacion' = '' THEN
        RAISE EXCEPTION 'La identificación del cliente es requerida.';
    END IF;

    INSERT INTO clientes (
        tenant_id, tipo_entidad, nombre_completo, identificacion, email, whatsapp, 
        direccion_domicilio, ciudad, provincia, pais, creado_por
    ) VALUES (
        v_tenant_id, 
        (payload->'cliente'->>'tipo_entidad')::tipo_entidad,
        payload->'cliente'->>'nombre_completo',
        payload->'cliente'->>'identificacion',
        payload->'cliente'->>'email',
        payload->'cliente'->>'whatsapp',
        payload->'cliente'->>'direccion_domicilio',
        payload->'cliente'->>'ciudad',
        payload->'cliente'->>'provincia',
        COALESCE(payload->'cliente'->>'pais', 'Ecuador'),
        v_creado_por
    )
    ON CONFLICT (tenant_id, identificacion) DO UPDATE SET
        nombre_completo = EXCLUDED.nombre_completo,
        whatsapp = COALESCE(EXCLUDED.whatsapp, clientes.whatsapp),
        email = COALESCE(EXCLUDED.email, clientes.email),
        direccion_domicilio = COALESCE(EXCLUDED.direccion_domicilio, clientes.direccion_domicilio),
        ciudad = COALESCE(EXCLUDED.ciudad, clientes.ciudad),
        provincia = COALESCE(EXCLUDED.provincia, clientes.provincia),
        pais = COALESCE(EXCLUDED.pais, clientes.pais),
        actualizado_por = v_creado_por,
        updated_at = NOW()
    RETURNING id INTO v_cliente_id;

    -- 2. Insertar Contrato base
    INSERT INTO contratos (
        tenant_id, cliente_id, canal, estado, tipo_envio,
        fecha_salida, fecha_evento, fecha_devolucion,
        subtotal, monto_descuento, total,
        anticipo_pagado, saldo_pendiente,
        tipo_garantia, descripcion_garantia,
        codigo_cupon, descuento_cupon, creado_por
    ) VALUES (
        v_tenant_id, v_cliente_id, 'presencial', 'reservado', (payload->'contrato'->>'tipo_envio')::tipo_envio,
        (payload->'contrato'->>'fecha_salida')::TIMESTAMPTZ, 
        NULLIF(payload->'contrato'->>'fecha_evento', '')::TIMESTAMPTZ, 
        (payload->'contrato'->>'fecha_devolucion')::TIMESTAMPTZ,
        (payload->'contrato'->>'subtotal')::NUMERIC,
        (payload->'contrato'->>'monto_descuento')::NUMERIC,
        (payload->'contrato'->>'total')::NUMERIC,
        0, 
        (payload->'contrato'->>'total')::NUMERIC,
        (payload->'contrato'->>'tipo_garantia')::tipo_garantia,
        payload->'contrato'->>'descripcion_garantia',
        payload->'contrato'->>'codigo_cupon',
        COALESCE((payload->'contrato'->>'descuento_cupon')::NUMERIC, 0),
        v_creado_por
    ) RETURNING id INTO v_contrato_id;

    -- 2.1 Si hay garantía, la insertamos en la tabla explícita
    IF payload->'contrato'->>'tipo_garantia' IS NOT NULL THEN
        INSERT INTO garantias (
            contrato_id, tenant_id, tipo, descripcion, created_by
        ) VALUES (
            v_contrato_id, v_tenant_id, (payload->'contrato'->>'tipo_garantia')::tipo_garantia,
            payload->'contrato'->>'descripcion_garantia', v_creado_por
        ) RETURNING id INTO v_garantia_id;
    END IF;

    -- 3. Productos y Piezas (Items Contrato y Tallas)
    FOR r_producto IN SELECT * FROM jsonb_array_elements(payload->'productos')
    LOOP
        v_cantidad_total_prod := (r_producto->>'cantidad_total')::INT;
        
        -- Insert items_contrato
        INSERT INTO items_contrato (
            contrato_id, tenant_id, producto_id, nombre_item,
            cantidad, precio_unitario, porcentaje_descuento, subtotal
        ) VALUES (
            v_contrato_id, v_tenant_id, (r_producto->>'id')::UUID, r_producto->>'nombre',
            v_cantidad_total_prod, (r_producto->>'precio_unitario')::NUMERIC, 0,
            v_cantidad_total_prod * (r_producto->>'precio_unitario')::NUMERIC
        ) RETURNING id INTO v_item_id;
        
        -- Iterar todas las piezas (si el producto tiene piezas)
        IF r_producto->'piezas' IS NOT NULL AND jsonb_array_length(r_producto->'piezas') > 0 THEN
            FOR r_pieza IN SELECT * FROM jsonb_array_elements(r_producto->'piezas')
            LOOP
                v_suma_tallas := 0;
                v_nombre_pieza := r_pieza->>'nombre';
                
                IF r_pieza->'tallasCantidades' IS NOT NULL THEN
                    FOR r_talla IN SELECT * FROM jsonb_each(r_pieza->'tallasCantidades')
                    LOOP
                        v_talla_nombre := r_talla.key;
                        v_cantidad_talla := (r_talla.value::text)::INT;
                        
                        IF v_cantidad_talla > 0 THEN
                            v_suma_tallas := v_suma_tallas + v_cantidad_talla;
                            
                            -- Validación estricta de stock disponible (rebotará si no hay suficiente)
                            v_stock_disponible := calcular_stock_disponible_fecha(
                                v_tenant_id,
                                (r_pieza->>'id')::UUID,
                                v_talla_nombre,
                                (payload->'contrato'->>'fecha_salida')::TIMESTAMPTZ
                            );
                            
                            IF v_stock_disponible < v_cantidad_talla THEN
                                RAISE EXCEPTION 'Stock insuficiente para "%" en talla %. Requerido: %, Disponible para esas fechas: %.', 
                                    v_nombre_pieza, v_talla_nombre, v_cantidad_talla, v_stock_disponible;
                            END IF;
                            
                            -- Insertamos el detalle por talla
                            INSERT INTO items_contrato_tallas (
                                item_contrato_id, tenant_id, pieza_id, nombre_pieza_snapshot,
                                etiqueta_talla, cantidad, created_by
                            ) VALUES (
                                v_item_id, v_tenant_id, (r_pieza->>'id')::UUID, v_nombre_pieza,
                                v_talla_nombre, v_cantidad_talla, v_creado_por
                            );
                        END IF;
                    END LOOP;
                END IF;
                
                -- Validar consistencia global de la suma frente a la cantidad_total indicada
                IF v_suma_tallas != v_cantidad_total_prod THEN
                    RAISE EXCEPTION 'La suma de tallas asignadas para la pieza "%" (%) no coincide con la cantidad total del producto (%).', 
                        v_nombre_pieza, v_suma_tallas, v_cantidad_total_prod;
                END IF;
            END LOOP;
        END IF;
    END LOOP;

    -- 4. Registrar Pago de Anticipo si aplica
    IF (payload->'pago_anticipo'->>'monto')::NUMERIC > 0 THEN
        INSERT INTO pagos_contrato (
            contrato_id, tenant_id, monto, tipo_pago,
            notas, registrado_por, nombre_registrador_snapshot
        ) VALUES (
            v_contrato_id, v_tenant_id, (payload->'pago_anticipo'->>'monto')::NUMERIC, 'anticipo',
            payload->'pago_anticipo'->>'notas', v_creado_por, payload->'pago_anticipo'->>'nombre_registrador_snapshot'
        ) RETURNING id INTO v_pago_id;
        
        -- Los triggers asociados (trg_actualizar_balance_contrato y trg_ingreso_desde_pago)
        -- se encargarán de actualizar "anticipo_pagado", "saldo_pendiente" e insertar en "ingresos".
    END IF;

    -- Si todo salió bien, devolvemos success. 
    -- Si falla un RAISE EXCEPTION, postgres interrumpe y hace ROLLBACK total solo.
    RETURN jsonb_build_object(
        'success', true,
        'contrato_id', v_contrato_id,
        'mensaje', 'Contrato creado exitosamente'
    );
EXCEPTION WHEN OTHERS THEN
    -- Retornar el detalle del error en caso de que ocurra y rollback
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;
