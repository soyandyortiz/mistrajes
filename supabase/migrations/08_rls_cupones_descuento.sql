-- ============================================================
--  RLS POLICIES — cupones_descuento
--  La tabla existía sin políticas, bloqueando todas las ops.
-- ============================================================

-- SELECT / UPDATE / DELETE
DROP POLICY IF EXISTS tenant_isolation_cupones_descuento ON cupones_descuento;
CREATE POLICY tenant_isolation_cupones_descuento ON cupones_descuento
    USING (
        tenant_id = auth_tenant_id()
        OR auth_user_role() = 'super_admin'
    );

-- INSERT
DROP POLICY IF EXISTS tenant_insert_cupones_descuento ON cupones_descuento;
CREATE POLICY tenant_insert_cupones_descuento ON cupones_descuento
    FOR INSERT WITH CHECK (
        tenant_id = auth_tenant_id()
        OR auth_user_role() = 'super_admin'
    );
