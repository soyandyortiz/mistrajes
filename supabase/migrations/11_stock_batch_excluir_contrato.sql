-- ============================================================
--  Migración #11 — Actualiza obtener_stock_disponible_batch
--  Agrega el parámetro opcional p_exclude_contrato_id para
--  excluir el propio contrato al editar (evita contar dos veces
--  las reservas del contrato que se está modificando).
--
--  Uso en NuevoContrato : sin p_exclude_contrato_id (NULL)
--  Uso en EditarContrato: con p_exclude_contrato_id = contrato.id
-- ============================================================

CREATE OR REPLACE FUNCTION obtener_stock_disponible_batch(
    p_tenant_id           UUID,
    p_pieza_ids           UUID[],
    p_fecha_salida        TIMESTAMPTZ,
    p_fecha_dev           TIMESTAMPTZ,
    p_exclude_contrato_id UUID DEFAULT NULL
)
RETURNS TABLE (
    pieza_id       UUID,
    etiqueta_talla TEXT,
    stock_total    INT,
    reservado      INT,
    disponible     INT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        sp.pieza_id,
        sp.etiqueta_talla,
        sp.stock_total::INT,
        COALESCE(res.reservado, 0)::INT                               AS reservado,
        GREATEST(0, sp.stock_total - COALESCE(res.reservado, 0))::INT AS disponible
    FROM stock_piezas sp
    LEFT JOIN (
        SELECT
            ict.pieza_id,
            ict.etiqueta_talla,
            SUM(ict.cantidad)::INT AS reservado
        FROM items_contrato_tallas ict
        JOIN items_contrato ic ON ic.id  = ict.item_contrato_id
        JOIN contratos      c  ON c.id   = ic.contrato_id
        WHERE ict.tenant_id = p_tenant_id
          AND ict.pieza_id  = ANY(p_pieza_ids)
          AND c.estado      NOT IN ('cancelado', 'eliminado')
          -- Excluir el contrato que se está editando para no contar
          -- sus propias reservas (se borran y recrean en la transacción)
          AND (p_exclude_contrato_id IS NULL OR ic.contrato_id != p_exclude_contrato_id)
          AND c.fecha_salida    < p_fecha_dev
          AND c.fecha_devolucion > p_fecha_salida
        GROUP BY ict.pieza_id, ict.etiqueta_talla
    ) res USING (pieza_id, etiqueta_talla)
    WHERE sp.pieza_id = ANY(p_pieza_ids)
    ORDER BY sp.pieza_id, sp.etiqueta_talla;
$$;

GRANT EXECUTE ON FUNCTION obtener_stock_disponible_batch(UUID, UUID[], TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated;
