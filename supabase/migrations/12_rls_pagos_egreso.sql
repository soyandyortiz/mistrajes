-- ============================================================
--  RLS POLICIES — pagos_egreso
--  La tabla existía sin políticas, bloqueando todas las ops.
--  Mismo patrón que 08_rls_cupones_descuento.sql
-- ============================================================

-- SELECT / UPDATE / DELETE
DROP POLICY IF EXISTS tenant_isolation_pagos_egreso ON pagos_egreso;
CREATE POLICY tenant_isolation_pagos_egreso ON pagos_egreso
    USING (
        tenant_id = auth_tenant_id()
        OR auth_user_role() = 'super_admin'
    );

-- INSERT
DROP POLICY IF EXISTS tenant_insert_pagos_egreso ON pagos_egreso;
CREATE POLICY tenant_insert_pagos_egreso ON pagos_egreso
    FOR INSERT WITH CHECK (
        tenant_id = auth_tenant_id()
        OR auth_user_role() = 'super_admin'
    );
