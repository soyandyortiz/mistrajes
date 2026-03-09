-- ============================================================
--  PACHARENTA — DISEÑO COMPLETO DE BASE DE DATOS (ESPAÑOL)
--  Motor: PostgreSQL (Supabase)
--  Arquitectura: Multi-Tenant con Row Level Security (RLS)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================================
-- 1. ENUMS GLOBALES
-- ===========================================================

DROP TYPE IF EXISTS tenant_status CASCADE;
DROP TYPE IF EXISTS billing_period CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS canal_pedido CASCADE;
DROP TYPE IF EXISTS estado_contrato CASCADE;
DROP TYPE IF EXISTS estado_linea_problema CASCADE;
DROP TYPE IF EXISTS tipo_garantia CASCADE;
DROP TYPE IF EXISTS modalidad_egreso CASCADE;
DROP TYPE IF EXISTS categoria_egreso CASCADE;
DROP TYPE IF EXISTS tipo_entidad CASCADE;
DROP TYPE IF EXISTS tipo_envio CASCADE;
DROP TYPE IF EXISTS estado_producto CASCADE;
DROP TYPE IF EXISTS estado_deuda CASCADE;
DROP TYPE IF EXISTS vigencia_proforma CASCADE;
DROP TYPE IF EXISTS estado_pago_suscripcion CASCADE;

CREATE TYPE tenant_status AS ENUM (
    'active',
    'suspended',
    'archived',
    'cancelled'
);

CREATE TYPE billing_period AS ENUM (
    'monthly',
    'annual'
);

-- Roles de usuario
CREATE TYPE user_role AS ENUM (
    'super_admin',      -- GuambraWeb, acceso global
    'tenant_admin',     -- Dueño del negocio tenant
    'tenant_empleado'   -- Empleado con acceso limitado (ANTES: tenant_employee)
);

-- Canal de origen de un contrato/pedido (ANTES: order_channel)
CREATE TYPE canal_pedido AS ENUM (
    'online',       -- Tienda online pública
    'presencial'    -- Contrato presencial (ANTES: in_store)
);

-- Estados del contrato/pedido (ANTES: contract_status)
CREATE TYPE estado_contrato AS ENUM (
    'pendiente_pago',       -- (ANTES: pending_payment)
    'reservado',            -- (ANTES: reserved)
    'entregado',            -- (ANTES: delivered)
    'devuelto_ok',          -- (ANTES: returned_ok)
    'devuelto_con_problemas', -- (ANTES: returned_with_issues)
    'problemas_resueltos',  -- (ANTES: returned_issues_solved)
    'cancelado',            -- (ANTES: cancelled)
    'eliminado'             -- (ANTES: deleted)
);

-- Estados de una línea de problema en devolución (ANTES: issue_line_status)
CREATE TYPE estado_linea_problema AS ENUM (
    'pendiente', -- (ANTES: pending)
    'resuelto'   -- (ANTES: solved)
);

-- Tipo de garantía (ANTES: guarantee_type)
CREATE TYPE tipo_garantia AS ENUM (
    'fisica',    -- (ANTES: physical)
    'economica'  -- (ANTES: economic)
);

-- Modalidad de un egreso (ANTES: expense_modality)
CREATE TYPE modalidad_egreso AS ENUM (
    'contado', -- (ANTES: cash)
    'credito'  -- (ANTES: credit)
);

-- Categorías de egreso (ANTES: expense_category)
CREATE TYPE categoria_egreso AS ENUM (
    'pago_proveedor', -- (ANTES: supplier_payment)
    'pago_empleado',  -- (ANTES: employee_payment)
    'arriendo',       -- (ANTES: rent)
    'servicios',      -- (ANTES: utilities)
    'otros'           -- (ANTES: other)
);

-- Tipo de proveedor / cliente (persona o empresa) (ANTES: entity_type)
CREATE TYPE tipo_entidad AS ENUM (
    'natural', -- Persona natural
    'empresa'  -- Empresa / RUC (ANTES: company)
);

-- Tipo de envío del pedido (ANTES: shipping_type)
CREATE TYPE tipo_envio AS ENUM (
    'retiro', -- Retiro en tienda (ANTES: pickup)
    'envio'   -- Envío fuera de la ciudad (ANTES: delivery)
);

-- Estado del producto/pieza (ANTES: product_status)
CREATE TYPE estado_producto AS ENUM (
    'activo',   -- (ANTES: active)
    'inactivo'  -- (ANTES: inactive)
);

-- Estado de una deuda de egreso (ANTES: debt_status)
CREATE TYPE estado_deuda AS ENUM (
    'pendiente', -- (ANTES: pending)
    'pagado'     -- (ANTES: paid)
);

-- Vigencia de una proforma (ANTES: proforma_validity)
CREATE TYPE vigencia_proforma AS ENUM (
    '5_dias',  -- (ANTES: 5_days)
    '7_dias',  -- (ANTES: 7_days)
    '10_dias'  -- (ANTES: 10_days)
);

-- Estado de pago de suscripción (ANTES: subscription_payment_status)
CREATE TYPE estado_pago_suscripcion AS ENUM (
    'pagado',    -- (ANTES: paid)
    'vencido',   -- (ANTES: overdue)
    'cancelado'  -- (ANTES: cancelled)
);


-- ===========================================================
-- 2. PLANES DE SUSCRIPCIÓN (Se mantiene en inglés: plans)
-- ===========================================================
CREATE TABLE plans (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre                      VARCHAR(100) NOT NULL,
    descripcion                 TEXT,
    precio_mensual              NUMERIC(10,2) NOT NULL,
    precio_anual                NUMERIC(10,2) NOT NULL,
    max_productos_activos       INT NOT NULL DEFAULT 20,
    max_piezas_activas          INT NOT NULL DEFAULT 100,
    max_empleados               INT NOT NULL DEFAULT 2,
    max_contratos_activos       INT NOT NULL DEFAULT 50,
    tiene_tienda_online         BOOLEAN NOT NULL DEFAULT TRUE,
    tiene_modulo_envios         BOOLEAN NOT NULL DEFAULT TRUE,
    tiene_modulo_proformas      BOOLEAN NOT NULL DEFAULT TRUE,
    tiene_dominio_propio        BOOLEAN NOT NULL DEFAULT FALSE,
    nivel_soporte               VARCHAR(50) DEFAULT 'basico',
    es_activo                   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================================
-- 3. TENANTS (Se mantiene en inglés: tenants)
-- ===========================================================
CREATE TABLE tenants (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id                     UUID NOT NULL REFERENCES plans(id),

    -- Datos del negocio
    nombre_negocio              VARCHAR(200) NOT NULL,
    slug                        VARCHAR(100) NOT NULL UNIQUE,
    dominio_personalizado       VARCHAR(255) UNIQUE,
    url_logo                    TEXT,
    color_primario              VARCHAR(7) DEFAULT '#1a3a5c',
    color_secundario            VARCHAR(7) DEFAULT '#f0c040',

    -- Datos del responsable / dueño
    nombre_propietario          VARCHAR(200) NOT NULL,
    cedula_ruc_propietario      VARCHAR(20) NOT NULL,
    email_propietario           VARCHAR(255) NOT NULL UNIQUE,
    whatsapp_propietario        VARCHAR(20),

    -- Datos del negocio (dirección)
    pais                        VARCHAR(100) NOT NULL DEFAULT 'Ecuador',
    provincia                   VARCHAR(100),
    ciudad                      VARCHAR(100),
    direccion                   TEXT,
    telefono                    VARCHAR(20),

    -- Configuración del negocio (personalizable por tenant)
    politica_garantia           TEXT,
    politica_cancelacion        TEXT,
    texto_legal_contrato        TEXT,
    horas_alquiler              INT NOT NULL DEFAULT 24,
    horas_buffer_lavanderia     INT NOT NULL DEFAULT 4,
    porcentaje_anticipo         NUMERIC(5,2) NOT NULL DEFAULT 50.0,
    porcentaje_garantia         NUMERIC(5,2) NOT NULL DEFAULT 60.0,

    -- Estado y suscripción
    estado                      tenant_status NOT NULL DEFAULT 'active',
    periodo_facturacion         billing_period NOT NULL DEFAULT 'monthly',
    inicio_suscripcion          DATE NOT NULL,
    fin_suscripcion             DATE NOT NULL,
    fin_periodo_gracia          DATE,

    -- Auditoría
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creado_por                  UUID,

    CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9\-]+$')
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_estado ON tenants(estado);

-- ===========================================================
-- 4. HISTORIAL DE PAGOS DE SUSCRIPCIÓN (ANTES: subscription_payments)
-- ===========================================================
CREATE TABLE pagos_suscripcion (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id),
    plan_id                     UUID NOT NULL REFERENCES plans(id),
    monto                       NUMERIC(10,2) NOT NULL,
    periodo_facturacion         billing_period NOT NULL,
    inicio_periodo              DATE NOT NULL,
    fin_periodo                 DATE NOT NULL,
    estado                      estado_pago_suscripcion NOT NULL DEFAULT 'pagado',
    metodo_pago                 VARCHAR(100),
    referencia_pago             VARCHAR(255),
    confirmado_por              UUID,
    confirmado_en               TIMESTAMPTZ,
    notas                       TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pagos_susc_tenant ON pagos_suscripcion(tenant_id);

-- ===========================================================
-- 5. MÉTODOS DE PAGO DEL TENANT (ANTES: tenant_payment_methods)
-- ===========================================================
CREATE TABLE metodos_pago_tenant (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nombre                      VARCHAR(100) NOT NULL,
    tipo                        VARCHAR(50) NOT NULL, -- transfer, qr, cash
    numero_cuenta               VARCHAR(100),
    titular_cuenta              VARCHAR(200),
    nombre_banco                VARCHAR(100),
    instrucciones               TEXT,
    es_activo                   BOOLEAN NOT NULL DEFAULT TRUE,
    orden_visual                INT DEFAULT 0,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMPTZ
);

CREATE INDEX idx_metodos_pago_tenant ON metodos_pago_tenant(tenant_id);

-- ===========================================================
-- 6. USUARIOS DEL SISTEMA (ANTES: user_profiles)
-- ===========================================================
CREATE TABLE perfiles_usuario (
    id                          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id                   UUID REFERENCES tenants(id),
    rol                         user_role NOT NULL,
    nombre_completo             VARCHAR(200) NOT NULL,
    cedula                      VARCHAR(20),
    whatsapp                    VARCHAR(20),
    es_activo                   BOOLEAN NOT NULL DEFAULT TRUE,

    nombre_referencia_familiar  VARCHAR(200),
    telefono_referencia_familiar VARCHAR(20),
    direccion_domicilio         TEXT,
    ciudad                      VARCHAR(100),
    provincia                   VARCHAR(100),
    pais                        VARCHAR(100) DEFAULT 'Ecuador',
    fecha_inicio_laboral        DATE,
    dia_pago                    INT,
    salario_mensual             NUMERIC(10,2),

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creado_por                  UUID REFERENCES perfiles_usuario(id),
    deleted_at                  TIMESTAMPTZ
);

CREATE INDEX idx_perfiles_tenant ON perfiles_usuario(tenant_id);
CREATE INDEX idx_perfiles_rol ON perfiles_usuario(rol);

-- ===========================================================
-- 7. LOG DE ACCESOS SUPER ADMIN (ANTES: super_admin_access_log)
-- ===========================================================
CREATE TABLE log_acceso_superadmin (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    super_admin_id              UUID NOT NULL REFERENCES perfiles_usuario(id),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id),
    motivo                      TEXT NOT NULL,
    accedido_en                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    direccion_ip                INET
);

-- ===========================================================
-- 8. CATEGORÍAS DE PRODUCTOS (ANTES: product_categories)
-- ===========================================================
CREATE TABLE categorias_productos (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nombre                      VARCHAR(150) NOT NULL,
    slug                        VARCHAR(150) NOT NULL,
    padre_id                    UUID REFERENCES categorias_productos(id),
    orden_visual                INT DEFAULT 0,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at                  TIMESTAMPTZ,

    UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_categorias_tenant ON categorias_productos(tenant_id);

-- ===========================================================
-- 9. PIEZAS / ELEMENTOS (ANTES: pieces y piece_*)
-- ===========================================================
CREATE TABLE piezas (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    categoria_id                UUID REFERENCES categorias_productos(id),
    nombre                      VARCHAR(200) NOT NULL,
    descripcion                 TEXT,
    precio_unitario             NUMERIC(10,2) NOT NULL DEFAULT 0,
    porcentaje_descuento        NUMERIC(5,2) NOT NULL DEFAULT 0,
    estado                      estado_producto NOT NULL DEFAULT 'activo',

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creado_por                  UUID REFERENCES perfiles_usuario(id),
    actualizado_por             UUID REFERENCES perfiles_usuario(id),
    deleted_at                  TIMESTAMPTZ
);

CREATE INDEX idx_piezas_tenant ON piezas(tenant_id);
CREATE INDEX idx_piezas_estado ON piezas(tenant_id, estado);

CREATE TABLE imagenes_piezas (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pieza_id                    UUID NOT NULL REFERENCES piezas(id) ON DELETE CASCADE,
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    url                         TEXT NOT NULL,
    orden_visual                INT DEFAULT 0,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT max_imagenes_pieza CHECK (orden_visual BETWEEN 0 AND 4)
);

CREATE TABLE stock_piezas (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pieza_id                    UUID NOT NULL REFERENCES piezas(id) ON DELETE CASCADE,
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    etiqueta_talla              VARCHAR(50) NOT NULL,
    es_estandar                 BOOLEAN NOT NULL DEFAULT FALSE,
    stock_total                 INT NOT NULL DEFAULT 0,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(pieza_id, etiqueta_talla)
);

CREATE INDEX idx_stock_piezas_pieza ON stock_piezas(pieza_id);
CREATE INDEX idx_stock_piezas_tenant ON stock_piezas(tenant_id);

-- ===========================================================
-- 10. PRODUCTOS / TRAJES (ANTES: products y product_*)
-- ===========================================================
CREATE TABLE productos (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nombre                      VARCHAR(200) NOT NULL,
    descripcion                 TEXT,
    precio_unitario             NUMERIC(10,2) NOT NULL DEFAULT 0,
    porcentaje_descuento        NUMERIC(5,2) NOT NULL DEFAULT 0,
    estado                      estado_producto NOT NULL DEFAULT 'activo',

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creado_por                  UUID REFERENCES perfiles_usuario(id),
    actualizado_por             UUID REFERENCES perfiles_usuario(id),
    deleted_at                  TIMESTAMPTZ
);

CREATE INDEX idx_productos_tenant ON productos(tenant_id);
CREATE INDEX idx_productos_estado ON productos(tenant_id, estado);

CREATE TABLE categorias_productos_map (
    producto_id                 UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    categoria_id                UUID NOT NULL REFERENCES categorias_productos(id) ON DELETE CASCADE,
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    PRIMARY KEY (producto_id, categoria_id)
);

CREATE TABLE imagenes_productos (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id                 UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    url                         TEXT NOT NULL,
    orden_visual                INT DEFAULT 0,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT max_imagenes_producto CHECK (orden_visual BETWEEN 0 AND 4)
);

CREATE TABLE piezas_producto (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id                 UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    pieza_id                    UUID NOT NULL REFERENCES piezas(id) ON DELETE CASCADE,
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    orden_visual                INT DEFAULT 0,
    UNIQUE(producto_id, pieza_id)
);

CREATE TABLE productos_relacionados (
    producto_id                 UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    producto_relacionado_id     UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    orden_visual                INT DEFAULT 0,
    PRIMARY KEY (producto_id, producto_relacionado_id),
    CONSTRAINT no_auto_relacion CHECK (producto_id <> producto_relacionado_id)
);

-- ===========================================================
-- 11. CLIENTES (ANTES: customers)
-- ===========================================================
CREATE TABLE clientes (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tipo_entidad                tipo_entidad NOT NULL DEFAULT 'natural',

    nombre_completo             VARCHAR(200) NOT NULL,
    identificacion              VARCHAR(20) NOT NULL, -- Cédula o RUC
    email                       VARCHAR(255),
    whatsapp                    VARCHAR(20),

    direccion_domicilio         TEXT NOT NULL,
    ciudad                      VARCHAR(100) NOT NULL,
    provincia                   VARCHAR(100),
    pais                        VARCHAR(100) NOT NULL DEFAULT 'Ecuador',

    nombre_referencia           VARCHAR(200),
    telefono_referencia         VARCHAR(20),

    nombre_empresa              VARCHAR(200),
    ruc_empresa                 VARCHAR(20),
    nombre_responsable_empresa  VARCHAR(200),
    telefono_responsable_empresa VARCHAR(20),
    email_responsable_empresa   VARCHAR(255),

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creado_por                  UUID REFERENCES perfiles_usuario(id),
    actualizado_por             UUID REFERENCES perfiles_usuario(id),
    deleted_at                  TIMESTAMPTZ,

    UNIQUE(tenant_id, identificacion)
);

CREATE INDEX idx_clientes_tenant ON clientes(tenant_id);

-- ===========================================================
-- 12. PROVEEDORES (ANTES: suppliers)
-- ===========================================================
CREATE TABLE proveedores (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tipo_entidad                tipo_entidad NOT NULL DEFAULT 'natural',
    tipo_proveedor              VARCHAR(150),

    nombre_completo             VARCHAR(200),
    identificacion              VARCHAR(20),

    nombre_empresa              VARCHAR(200),
    ruc_empresa                 VARCHAR(20),
    nombre_responsable          VARCHAR(200),

    telefono                    VARCHAR(20),
    email                       VARCHAR(255),
    direccion                   TEXT,
    ciudad                      VARCHAR(100),
    provincia                   VARCHAR(100),
    pais                        VARCHAR(100) NOT NULL DEFAULT 'Ecuador',

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creado_por                  UUID REFERENCES perfiles_usuario(id),
    deleted_at                  TIMESTAMPTZ
);

-- ===========================================================
-- 13. CONTRATOS / PEDIDOS (ANTES: contracts)
-- ===========================================================
CREATE TABLE contratos (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cliente_id                  UUID NOT NULL REFERENCES clientes(id),
    canal                       canal_pedido NOT NULL DEFAULT 'presencial',
    estado                      estado_contrato NOT NULL DEFAULT 'pendiente_pago',
    tipo_envio                  tipo_envio NOT NULL DEFAULT 'retiro',

    direccion_evento            TEXT,
    fecha_salida                TIMESTAMPTZ NOT NULL,
    fecha_evento                TIMESTAMPTZ,
    fecha_devolucion            TIMESTAMPTZ NOT NULL,

    subtotal                    NUMERIC(10,2) NOT NULL DEFAULT 0,
    monto_descuento             NUMERIC(10,2) NOT NULL DEFAULT 0,
    total                       NUMERIC(10,2) NOT NULL DEFAULT 0,
    anticipo_pagado             NUMERIC(10,2) NOT NULL DEFAULT 0,
    saldo_pendiente             NUMERIC(10,2) NOT NULL DEFAULT 0,

    tipo_garantia               tipo_garantia,
    descripcion_garantia        TEXT,
    garantia_devuelta           BOOLEAN NOT NULL DEFAULT FALSE,
    garantia_devuelta_en        TIMESTAMPTZ,
    garantia_devuelta_por       UUID REFERENCES perfiles_usuario(id),

    empresa_envio               VARCHAR(200),
    tracking_envio              TEXT,
    url_comprobante_envio       TEXT,

    contrato_firmado_reserva    BOOLEAN NOT NULL DEFAULT FALSE,
    contrato_firmado_reserva_en TIMESTAMPTZ,
    contrato_firmado_entrega    BOOLEAN NOT NULL DEFAULT FALSE,
    contrato_firmado_entrega_en TIMESTAMPTZ,
    ultima_impresion_en         TIMESTAMPTZ,
    ultima_impresion_por        UUID REFERENCES perfiles_usuario(id),

    codigo_cupon                VARCHAR(100),
    descuento_cupon             NUMERIC(10,2) DEFAULT 0,

    notas_internas              TEXT,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creado_por                  UUID NOT NULL REFERENCES perfiles_usuario(id),
    actualizado_por             UUID REFERENCES perfiles_usuario(id),
    deleted_at                  TIMESTAMPTZ,

    cancelado_en                TIMESTAMPTZ,
    cancelado_por               UUID REFERENCES perfiles_usuario(id),
    motivo_cancelacion          TEXT
);

CREATE INDEX idx_contratos_tenant ON contratos(tenant_id);
CREATE INDEX idx_contratos_estado ON contratos(tenant_id, estado);
CREATE INDEX idx_contratos_fechas ON contratos(tenant_id, fecha_salida, fecha_devolucion);

-- ===========================================================
-- 14. ÍTEMS DE CONTRATO (ANTES: contract_items)
-- ===========================================================
CREATE TABLE items_contrato (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contrato_id                 UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    producto_id                 UUID REFERENCES productos(id),
    pieza_id                    UUID REFERENCES piezas(id),

    nombre_item                 VARCHAR(200) NOT NULL,
    talla_pieza                 VARCHAR(50),
    cantidad                    INT NOT NULL DEFAULT 1,
    precio_unitario             NUMERIC(10,2) NOT NULL,
    porcentaje_descuento        NUMERIC(5,2) NOT NULL DEFAULT 0,
    subtotal                    NUMERIC(10,2) NOT NULL,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT referencia_valida CHECK (
        (producto_id IS NOT NULL AND pieza_id IS NULL) OR
        (producto_id IS NULL AND pieza_id IS NOT NULL)
    )
);

CREATE INDEX idx_items_contrato_contrato ON items_contrato(contrato_id);

-- ===========================================================
-- 15. ABONOS DE CONTRATOS (ANTES: contract_payments)
-- ===========================================================
CREATE TABLE pagos_contrato (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contrato_id                 UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    metodo_pago_id              UUID REFERENCES metodos_pago_tenant(id),
    monto                       NUMERIC(10,2) NOT NULL,
    tipo_pago                   VARCHAR(50) NOT NULL DEFAULT 'anticipo', -- anticipo, saldo, extra
    referencia                  VARCHAR(255),
    url_comprobante             TEXT,

    registrado_por              UUID NOT NULL REFERENCES perfiles_usuario(id),
    nombre_registrador_snapshot VARCHAR(200) NOT NULL,
    registrado_en               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notas                       TEXT
);

-- ===========================================================
-- 16. LÍNEAS DE INCONVENIENTES (ANTES: contract_issue_lines)
-- ===========================================================
CREATE TABLE lineas_inconvenientes (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contrato_id                 UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    descripcion                 TEXT NOT NULL,
    estado                      estado_linea_problema NOT NULL DEFAULT 'pendiente',

    reportado_en                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reportado_por               UUID NOT NULL REFERENCES perfiles_usuario(id),
    nombre_reportador_snapshot  VARCHAR(200) NOT NULL,

    resuelto_en                 TIMESTAMPTZ,
    resuelto_por                UUID REFERENCES perfiles_usuario(id),
    nombre_resolutor_snapshot   VARCHAR(200),

    deleted_at                  TIMESTAMPTZ,
    deleted_por                 UUID REFERENCES perfiles_usuario(id)
);

-- ===========================================================
-- 17. INGRESOS (ANTES: income_records)
-- ===========================================================
CREATE TABLE ingresos (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contrato_id                 UUID REFERENCES contratos(id),
    pago_contrato_id            UUID REFERENCES pagos_contrato(id),
    metodo_pago_id              UUID REFERENCES metodos_pago_tenant(id),

    monto                       NUMERIC(10,2) NOT NULL,
    descripcion                 TEXT NOT NULL,
    registrado_en               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    registrado_por              UUID NOT NULL REFERENCES perfiles_usuario(id),
    nombre_registrador_snapshot VARCHAR(200) NOT NULL,
    es_manual                   BOOLEAN NOT NULL DEFAULT FALSE,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================================
-- 18. EGRESOS (ANTES: expense_records)
-- ===========================================================
CREATE TABLE egresos (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    proveedor_id                UUID REFERENCES proveedores(id),
    empleado_id                 UUID REFERENCES perfiles_usuario(id),
    nombre_empleado_snapshot    VARCHAR(200),
    salario_empleado_snapshot   NUMERIC(10,2),

    categoria                   categoria_egreso NOT NULL,
    descripcion                 TEXT NOT NULL,
    modalidad                   modalidad_egreso NOT NULL DEFAULT 'contado',
    monto_total                 NUMERIC(10,2) NOT NULL,
    monto_pagado                NUMERIC(10,2) NOT NULL DEFAULT 0,
    saldo_pendiente             NUMERIC(10,2) GENERATED ALWAYS AS (monto_total - monto_pagado) STORED,
    estado_deuda                estado_deuda NOT NULL DEFAULT 'pendiente',

    metodo_pago_id              UUID REFERENCES metodos_pago_tenant(id),
    fecha_egreso                DATE NOT NULL DEFAULT CURRENT_DATE,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    registrado_por              UUID NOT NULL REFERENCES perfiles_usuario(id),
    nombre_registrador_snapshot VARCHAR(200) NOT NULL,
    deleted_at                  TIMESTAMPTZ
);

CREATE TABLE lineas_egreso (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    egreso_id                   UUID NOT NULL REFERENCES egresos(id) ON DELETE CASCADE,
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    descripcion                 VARCHAR(300) NOT NULL,
    categoria                   categoria_egreso NOT NULL,
    cantidad                    NUMERIC(10,2) NOT NULL DEFAULT 1,
    precio_unitario             NUMERIC(10,2) NOT NULL,
    subtotal                    NUMERIC(10,2) NOT NULL
);

CREATE TABLE pagos_egreso (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    egreso_id                   UUID NOT NULL REFERENCES egresos(id) ON DELETE CASCADE,
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    monto                       NUMERIC(10,2) NOT NULL,
    metodo_pago_id              UUID REFERENCES metodos_pago_tenant(id),
    fecha_pago                  DATE NOT NULL DEFAULT CURRENT_DATE,
    referencia                  VARCHAR(255),
    registrado_por              UUID NOT NULL REFERENCES perfiles_usuario(id),
    nombre_registrador_snapshot VARCHAR(200) NOT NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================================
-- 19. CIERRES DE CAJA (ANTES: cash_register_closes)
-- ===========================================================
CREATE TABLE cierres_caja (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    fecha_cierre                DATE NOT NULL,
    total_ingresos              NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_egresos               NUMERIC(10,2) NOT NULL DEFAULT 0,
    balance_neto                NUMERIC(10,2) GENERATED ALWAYS AS (total_ingresos - total_egresos) STORED,

    monto_efectivo              NUMERIC(10,2) DEFAULT 0,
    monto_transferencia         NUMERIC(10,2) DEFAULT 0,
    monto_otros                 NUMERIC(10,2) DEFAULT 0,

    notas                       TEXT,
    cerrado_por                 UUID NOT NULL REFERENCES perfiles_usuario(id),
    nombre_cerrador_snapshot    VARCHAR(200) NOT NULL,
    cerrado_en                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, fecha_cierre)
);

-- ===========================================================
-- 20. COMPROBANTES (ANTES: receipts)
-- ===========================================================
CREATE TABLE comprobantes (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contrato_id                 UUID NOT NULL REFERENCES contratos(id),
    cliente_id                  UUID NOT NULL REFERENCES clientes(id),

    total_base                  NUMERIC(10,2) NOT NULL,
    cargos_extra                NUMERIC(10,2) NOT NULL DEFAULT 0,
    descripcion_cargos_extra    TEXT,
    total_final                 NUMERIC(10,2) NOT NULL,

    url_pdf                     TEXT,
    emitido_en                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    emitido_por                 UUID NOT NULL REFERENCES perfiles_usuario(id),
    nombre_emisor_snapshot      VARCHAR(200) NOT NULL,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================================
-- 21. PROFORMAS (ANTES: proformas)
-- ===========================================================
CREATE TABLE proformas (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cliente_id                  UUID REFERENCES clientes(id),
    nombre_cliente              VARCHAR(200),
    email_cliente               VARCHAR(255),

    subtotal                    NUMERIC(10,2) NOT NULL DEFAULT 0,
    monto_descuento             NUMERIC(10,2) NOT NULL DEFAULT 0,
    porcentaje_descuento        NUMERIC(5,2) NOT NULL DEFAULT 0,
    total                       NUMERIC(10,2) NOT NULL DEFAULT 0,
    vigencia                    vigencia_proforma NOT NULL DEFAULT '7_dias',
    expira_el                   DATE NOT NULL,
    esta_expirada               BOOLEAN DEFAULT FALSE,

    url_pdf                     TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creado_por                  UUID NOT NULL REFERENCES perfiles_usuario(id),
    deleted_at                  TIMESTAMPTZ
);

CREATE TABLE lineas_proforma (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proforma_id                 UUID NOT NULL REFERENCES proformas(id) ON DELETE CASCADE,
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    producto_id                 UUID REFERENCES productos(id),
    pieza_id                    UUID REFERENCES piezas(id),
    nombre_item                 VARCHAR(200) NOT NULL,
    cantidad                    INT NOT NULL DEFAULT 1,
    precio_unitario             NUMERIC(10,2) NOT NULL,
    subtotal                    NUMERIC(10,2) NOT NULL
);

-- ===========================================================
-- 22. CUPONES DE DESCUENTO
-- ===========================================================
CREATE TABLE cupones_descuento (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    codigo                      VARCHAR(100) NOT NULL,
    tipo_descuento              VARCHAR(20) NOT NULL DEFAULT 'porcentaje',
    valor_descuento             NUMERIC(10,2) NOT NULL,
    usos_maximos                INT,
    cantidad_usados             INT NOT NULL DEFAULT 0,
    valido_desde                DATE,
    valido_hasta                DATE,
    es_activo                   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creado_por                  UUID REFERENCES perfiles_usuario(id),
    UNIQUE(tenant_id, codigo)
);

-- ===========================================================
-- 23. AUDIT LOG
-- ===========================================================
CREATE TABLE log_auditoria (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                   UUID REFERENCES tenants(id),
    usuario_id                  UUID REFERENCES perfiles_usuario(id),
    nombre_usuario_snapshot     VARCHAR(200),
    accion                      VARCHAR(100) NOT NULL,
    tipo_entidad                VARCHAR(100) NOT NULL,
    entidad_id                  UUID,
    valor_anterior              JSONB,
    valor_nuevo                 JSONB,
    direccion_ip                INET,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================================
-- 24. NOTIFICACIONES
-- ===========================================================
CREATE TABLE log_notificaciones (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contrato_id                 UUID REFERENCES contratos(id),
    telefono_destinatario       VARCHAR(20),
    email_destinatario          VARCHAR(255),
    canal                       VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
    tipo_evento                 VARCHAR(100) NOT NULL,
    cuerpo_mensaje              TEXT NOT NULL,
    enviado_en                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado                      VARCHAR(50) DEFAULT 'enviado',
    mensaje_error               TEXT
);

CREATE TABLE plantillas_notificacion (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tipo_evento                 VARCHAR(100) NOT NULL,
    canal                       VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
    cuerpo_plantilla            TEXT NOT NULL,
    es_activa                   BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, tipo_evento, canal)
);

-- ===========================================================
-- 25. DISPONIBILIDAD DE STOCK — VISTA CALCULADA (TRADUCIDA)
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
            THEN ic.cantidad
            ELSE 0
        END
    ), 0) AS cantidad_en_uso,
    sp.stock_total - COALESCE(SUM(
        CASE
            WHEN c.estado IN ('reservado', 'entregado')
            THEN ic.cantidad
            ELSE 0
        END
    ), 0) AS stock_disponible
FROM stock_piezas sp
LEFT JOIN items_contrato ic ON ic.pieza_id = sp.pieza_id
    AND ic.talla_pieza = sp.etiqueta_talla
LEFT JOIN contratos c ON c.id = ic.contrato_id
    AND c.tenant_id = sp.tenant_id
    AND c.deleted_at IS NULL
    AND c.cancelado_en IS NULL
GROUP BY sp.tenant_id, sp.pieza_id, sp.etiqueta_talla, sp.es_estandar, sp.stock_total;

-- ===========================================================
-- 26. FUNCIÓN: Calcular stock disponible (TRADUCIDA)
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
    v_horas_buffer  INT;
BEGIN
    SELECT horas_buffer_lavanderia INTO v_horas_buffer
    FROM tenants WHERE id = p_tenant_id;

    SELECT stock_total INTO v_stock_total
    FROM stock_piezas
    WHERE pieza_id = p_pieza_id AND etiqueta_talla = p_talla;

    IF v_stock_total IS NULL THEN
        RETURN 0;
    END IF;

    SELECT COALESCE(SUM(ic.cantidad), 0) INTO v_en_uso
    FROM items_contrato ic
    JOIN contratos c ON c.id = ic.contrato_id
    WHERE c.tenant_id = p_tenant_id
      AND ic.pieza_id = p_pieza_id
      AND ic.talla_pieza = p_talla
      AND c.estado IN ('reservado', 'entregado')
      AND c.deleted_at IS NULL
      AND c.cancelado_en IS NULL
      AND p_fecha_salida < (c.fecha_devolucion + (v_horas_buffer || ' hours')::INTERVAL)
      AND (c.fecha_devolucion + (v_horas_buffer || ' hours')::INTERVAL) > p_fecha_salida;

    RETURN GREATEST(0, v_stock_total - v_en_uso);
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger functions are updated in triggers.sql 

-- ===========================================================
-- 27. ROW LEVEL SECURITY (RLS) — Multi-Tenant (TRADUCIDO)
-- ===========================================================
ALTER TABLE tenants                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE metodos_pago_tenant         ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles_usuario            ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_productos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE piezas                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagenes_piezas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_piezas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagenes_productos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE piezas_producto             ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_productos_map    ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_relacionados      ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_contrato              ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_contrato              ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_inconvenientes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE egresos                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_egreso               ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_egreso                ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres_caja                ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprobantes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE proformas                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_proforma             ENABLE ROW LEVEL SECURITY;
ALTER TABLE cupones_descuento           ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_notificaciones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas_notificacion     ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_auditoria               ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS UUID AS $$
    SELECT tenant_id FROM perfiles_usuario WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
    SELECT rol FROM perfiles_usuario WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Aplicar politicas
CREATE POLICY tenant_isolation_contratos ON contratos USING (tenant_id = auth_tenant_id() OR auth_user_role() = 'super_admin');
CREATE POLICY tenant_isolation_clientes ON clientes USING (tenant_id = auth_tenant_id() OR auth_user_role() = 'super_admin');
CREATE POLICY tenant_isolation_productos ON productos USING (tenant_id = auth_tenant_id() OR auth_user_role() = 'super_admin');
CREATE POLICY tenant_isolation_piezas ON piezas USING (tenant_id = auth_tenant_id() OR auth_user_role() = 'super_admin');
CREATE POLICY tenant_isolation_ingresos ON ingresos USING (tenant_id = auth_tenant_id() OR auth_user_role() = 'super_admin');
CREATE POLICY tenant_isolation_egresos ON egresos USING (tenant_id = auth_tenant_id() OR auth_user_role() = 'super_admin');
CREATE POLICY tenant_isolation_lineas_egreso ON lineas_egreso USING (tenant_id = auth_tenant_id() OR auth_user_role() = 'super_admin');
CREATE POLICY tenant_isolation_proveedores ON proveedores USING (tenant_id = auth_tenant_id() OR auth_user_role() = 'super_admin');
CREATE POLICY tenant_isolation_caja ON cierres_caja USING (tenant_id = auth_tenant_id() OR auth_user_role() = 'super_admin');
CREATE POLICY tenant_isolation_usuarios ON perfiles_usuario USING (id = auth.uid() OR tenant_id = auth_tenant_id() OR auth_user_role() = 'super_admin');
CREATE POLICY tenant_self_access ON tenants USING (id = auth_tenant_id() OR auth_user_role() = 'super_admin');
CREATE POLICY audit_access ON log_auditoria USING (tenant_id = auth_tenant_id() OR auth_user_role() = 'super_admin');

-- ===========================================================
-- DATOS SEMILLA — Plan base por defecto
-- ===========================================================
INSERT INTO plans (
    nombre, descripcion, precio_mensual, precio_anual,
    max_productos_activos, max_piezas_activas, max_empleados,
    max_contratos_activos, tiene_tienda_online, tiene_modulo_envios,
    tiene_modulo_proformas, tiene_dominio_propio, nivel_soporte
) VALUES
('Básico', 'Ideal para negocios pequeños. Hasta 20 trajes y 2 empleados.', 29.99, 299.99, 20, 100, 2, 30, TRUE, FALSE, FALSE, FALSE, 'basico'),
('Pro', 'Para negocios en crecimiento. Envíos, proformas y soporte prioritario.', 59.99, 599.99, 100, 500, 5, 150, TRUE, TRUE, TRUE, FALSE, 'prioritario'),
('Enterprise', 'Sin límites. Dominio propio y soporte dedicado.', 119.99, 1199.99, 9999, 9999, 20, 9999, TRUE, TRUE, TRUE, TRUE, 'prioritario');
