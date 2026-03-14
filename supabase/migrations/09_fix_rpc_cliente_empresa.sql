-- ============================================================
--  Migración #09 — Fix RPC crear_contrato_completo:
--  Persiste los campos de empresa, responsable y referencia
--  en la tabla clientes al crear un contrato.
-- ============================================================

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
        nombre_referencia,    telefono_referencia,
        nombre_referencia_2,  telefono_referencia_2,
        nombre_empresa, ruc_empresa, tipo_empresa,
        nombre_responsable_empresa, telefono_responsable_empresa, email_responsable_empresa,
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
        NULLIF(payload->'cliente'->>'nombre_referencia', ''),
        NULLIF(payload->'cliente'->>'telefono_referencia', ''),
        NULLIF(payload->'cliente'->>'nombre_referencia_2', ''),
        NULLIF(payload->'cliente'->>'telefono_referencia_2', ''),
        NULLIF(payload->'cliente'->>'nombre_empresa', ''),
        NULLIF(payload->'cliente'->>'ruc_empresa', ''),
        NULLIF(payload->'cliente'->>'tipo_empresa', ''),
        NULLIF(payload->'cliente'->>'nombre_responsable_empresa', ''),
        NULLIF(payload->'cliente'->>'telefono_responsable_empresa', ''),
        NULLIF(payload->'cliente'->>'email_responsable_empresa', ''),
        v_creado_por
    )
    ON CONFLICT (tenant_id, identificacion) DO UPDATE SET
        nombre_completo               = EXCLUDED.nombre_completo,
        whatsapp                      = COALESCE(EXCLUDED.whatsapp, clientes.whatsapp),
        email                         = COALESCE(EXCLUDED.email, clientes.email),
        direccion_domicilio           = COALESCE(EXCLUDED.direccion_domicilio, clientes.direccion_domicilio),
        ciudad                        = COALESCE(EXCLUDED.ciudad, clientes.ciudad),
        provincia                     = COALESCE(EXCLUDED.provincia, clientes.provincia),
        pais                          = COALESCE(EXCLUDED.pais, clientes.pais),
        nombre_referencia             = COALESCE(EXCLUDED.nombre_referencia, clientes.nombre_referencia),
        telefono_referencia           = COALESCE(EXCLUDED.telefono_referencia, clientes.telefono_referencia),
        nombre_referencia_2           = COALESCE(EXCLUDED.nombre_referencia_2, clientes.nombre_referencia_2),
        telefono_referencia_2         = COALESCE(EXCLUDED.telefono_referencia_2, clientes.telefono_referencia_2),
        nombre_empresa                = COALESCE(EXCLUDED.nombre_empresa, clientes.nombre_empresa),
        ruc_empresa                   = COALESCE(EXCLUDED.ruc_empresa, clientes.ruc_empresa),
        tipo_empresa                  = COALESCE(EXCLUDED.tipo_empresa, clientes.tipo_empresa),
        nombre_responsable_empresa    = COALESCE(EXCLUDED.nombre_responsable_empresa, clientes.nombre_responsable_empresa),
        telefono_responsable_empresa  = COALESCE(EXCLUDED.telefono_responsable_empresa, clientes.telefono_responsable_empresa),
        email_responsable_empresa     = COALESCE(EXCLUDED.email_responsable_empresa, clientes.email_responsable_empresa),
        actualizado_por               = v_creado_por,
        updated_at                    = NOW()
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

GRANT EXECUTE ON FUNCTION crear_contrato_completo(JSONB) TO authenticated;
