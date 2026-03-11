-- ============================================================
-- Migración #06 — RPC transaccional para editar contratos activos
-- Fecha: 2026-03-10
-- ============================================================

CREATE OR REPLACE FUNCTION editar_contrato_completo(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_contrato_id       UUID := (payload->>'contrato_id')::UUID;
    v_tenant_id         UUID := (payload->>'tenant_id')::UUID;
    v_editado_por       UUID := (payload->>'editado_por')::UUID;

    r_producto          JSONB;
    r_pieza             JSONB;
    r_talla             RECORD;
    v_item_id           UUID;
    v_cantidad_talla    INT;
    v_talla_nombre      TEXT;
    v_stock_disponible  INT;
    v_suma_tallas       INT;
    v_cantidad_prod     INT;
    v_nombre_pieza      TEXT;

    v_subtotal          NUMERIC;
    v_total             NUMERIC;
    v_anticipo_actual   NUMERIC;
    v_nuevo_saldo       NUMERIC;
BEGIN
    -- Verificar que el contrato pertenece al tenant
    IF NOT EXISTS (
        SELECT 1 FROM contratos
        WHERE id = v_contrato_id AND tenant_id = v_tenant_id
          AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Contrato no encontrado o sin permisos.';
    END IF;

    -- 1. Eliminar todos los items actuales (CASCADE borra items_contrato_tallas)
    --    Al hacer esto dentro de la transacción, el stock queda libre para la
    --    validación de los nuevos items.
    DELETE FROM items_contrato
    WHERE contrato_id = v_contrato_id AND tenant_id = v_tenant_id;

    -- 2. Insertar nuevos productos + tallas
    FOR r_producto IN SELECT * FROM jsonb_array_elements(payload->'productos')
    LOOP
        v_cantidad_prod := (r_producto->>'cantidad_total')::INT;

        INSERT INTO items_contrato (
            contrato_id, tenant_id, producto_id, nombre_item,
            cantidad, precio_unitario, porcentaje_descuento, subtotal
        ) VALUES (
            v_contrato_id, v_tenant_id,
            (r_producto->>'id')::UUID,
            r_producto->>'nombre',
            v_cantidad_prod,
            (r_producto->>'precio_unitario')::NUMERIC,
            0,
            v_cantidad_prod * (r_producto->>'precio_unitario')::NUMERIC
        ) RETURNING id INTO v_item_id;

        IF r_producto->'piezas' IS NOT NULL AND jsonb_array_length(r_producto->'piezas') > 0 THEN
            FOR r_pieza IN SELECT * FROM jsonb_array_elements(r_producto->'piezas')
            LOOP
                v_suma_tallas  := 0;
                v_nombre_pieza := r_pieza->>'nombre';

                IF r_pieza->'tallasCantidades' IS NOT NULL THEN
                    FOR r_talla IN SELECT * FROM jsonb_each(r_pieza->'tallasCantidades')
                    LOOP
                        v_talla_nombre   := r_talla.key;
                        v_cantidad_talla := (r_talla.value::text)::INT;

                        IF v_cantidad_talla > 0 THEN
                            v_suma_tallas := v_suma_tallas + v_cantidad_talla;

                            -- Validar stock disponible (ya sin los items del propio contrato)
                            v_stock_disponible := calcular_stock_disponible_fecha(
                                v_tenant_id,
                                (r_pieza->>'id')::UUID,
                                v_talla_nombre,
                                (payload->'contrato'->>'fecha_salida')::TIMESTAMPTZ
                            );

                            IF v_stock_disponible < v_cantidad_talla THEN
                                RAISE EXCEPTION 'Stock insuficiente para "%" en talla %. Disponible: %, Requerido: %.',
                                    v_nombre_pieza, v_talla_nombre, v_stock_disponible, v_cantidad_talla;
                            END IF;

                            INSERT INTO items_contrato_tallas (
                                item_contrato_id, tenant_id, pieza_id,
                                nombre_pieza_snapshot, etiqueta_talla, cantidad
                            ) VALUES (
                                v_item_id, v_tenant_id,
                                (r_pieza->>'id')::UUID,
                                v_nombre_pieza,
                                v_talla_nombre,
                                v_cantidad_talla
                            );
                        END IF;
                    END LOOP;
                END IF;

                IF v_suma_tallas != v_cantidad_prod THEN
                    RAISE EXCEPTION 'La suma de tallas de la pieza "%" (%) no coincide con la cantidad del producto (%).',
                        v_nombre_pieza, v_suma_tallas, v_cantidad_prod;
                END IF;
            END LOOP;
        END IF;
    END LOOP;

    -- 3. Calcular financiero y respetar abonos ya registrados
    v_subtotal := (payload->'contrato'->>'subtotal')::NUMERIC;
    v_total    := (payload->'contrato'->>'total')::NUMERIC;

    SELECT anticipo_pagado INTO v_anticipo_actual
    FROM contratos WHERE id = v_contrato_id;

    -- Saldo = nuevo total − lo que ya pagó; nunca negativo
    v_nuevo_saldo := GREATEST(0, v_total - COALESCE(v_anticipo_actual, 0));

    -- 4. Actualizar el contrato
    UPDATE contratos SET
        tipo_envio               = (payload->'contrato'->>'tipo_envio')::tipo_envio,
        fecha_salida             = (payload->'contrato'->>'fecha_salida')::TIMESTAMPTZ,
        fecha_evento             = NULLIF(payload->'contrato'->>'fecha_evento', '')::TIMESTAMPTZ,
        fecha_devolucion         = (payload->'contrato'->>'fecha_devolucion')::TIMESTAMPTZ,
        dias_alquiler            = COALESCE((payload->'contrato'->>'dias_alquiler')::INT, 1),
        precio_por_dia           = (payload->'contrato'->>'precio_por_dia')::NUMERIC,
        subtotal_alquiler        = (payload->'contrato'->>'subtotal_alquiler')::NUMERIC,
        subtotal                 = v_subtotal,
        monto_descuento          = COALESCE((payload->'contrato'->>'monto_descuento')::NUMERIC, 0),
        total                    = v_total,
        saldo_pendiente          = v_nuevo_saldo,
        tipo_garantia            = (payload->'contrato'->>'tipo_garantia')::tipo_garantia,
        descripcion_garantia     = payload->'contrato'->>'descripcion_garantia',
        notas_internas           = payload->'contrato'->>'notas_internas',
        updated_at               = NOW()
    WHERE id = v_contrato_id AND tenant_id = v_tenant_id;

    RETURN jsonb_build_object(
        'success',      true,
        'contrato_id',  v_contrato_id,
        'nuevo_saldo',  v_nuevo_saldo,
        'mensaje',      'Contrato actualizado exitosamente'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error',   SQLERRM
    );
END;
$$;
