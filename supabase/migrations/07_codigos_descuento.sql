-- ============================================================
--  CODIGOS DE DESCUENTO — Multi-Tenant
--  Módulo para crear y gestionar cupones/códigos de descuento
--  en porcentaje (%) aplicables en contratos.
-- ============================================================

CREATE TABLE IF NOT EXISTS codigos_descuento (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  codigo      VARCHAR(50)  NOT NULL,
  valor       NUMERIC(5,2) NOT NULL,
  activo      BOOLEAN      NOT NULL DEFAULT true,
  descripcion TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,

  CONSTRAINT ck_valor_positivo  CHECK (valor > 0),
  CONSTRAINT ck_valor_porcentaje CHECK (valor <= 100),
  CONSTRAINT uq_codigo_tenant   UNIQUE (tenant_id, codigo)
);

ALTER TABLE codigos_descuento ENABLE ROW LEVEL SECURITY;

-- Aislamiento multi-tenant: cada tenant solo ve sus propios códigos
CREATE POLICY "tenant_rls_codigos_descuento"
  ON codigos_descuento
  FOR ALL
  USING (
    tenant_id = (
      SELECT tenant_id FROM perfiles_usuario WHERE id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_codigos_descuento_tenant
  ON codigos_descuento(tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_codigos_descuento_busqueda
  ON codigos_descuento(tenant_id, codigo)
  WHERE deleted_at IS NULL AND activo = true;
