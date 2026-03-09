# 🎭 PachaRenta — Sistema SaaS de Gestión de Alquiler de Trajes Típicos

> **Desarrollado por GuambraWeb** · Versión 3.0 · Documento completo de Flujo, Reglas de Negocio y Arquitectura SaaS

---

## 📑 Índice General

- [PARTE I — Modelo SaaS Multi-Tenant](#parte-i--modelo-saas-multi-tenant)
  - [Arquitectura y Modelo de Negocio](#arquitectura-y-modelo-de-negocio-saas)
  - [Onboarding de Nuevos Tenants](#flujo-de-onboarding-de-nuevos-negocios)
  - [Planes y Suscripciones](#planes-y-suscripciones)
  - [Aislamiento y Seguridad Multi-Tenant](#reglas-de-aislamiento-y-seguridad-multi-tenant)
  - [Super Admin GuambraWeb](#administración-de-la-plataforma-super-admin)
- [PARTE II — Flujos de Negocio por Tenant](#parte-ii--flujos-de-negocio-por-tenant)
  - [Sección 1 — Reglas de Negocio Globales](#sección-1--reglas-de-negocio-globales)
  - [Sección 2 — Flujo de Reserva](#sección-2--flujo-de-reserva-de-pedidos)
  - [Sección 3 — Flujo de Entrega](#sección-3--flujo-de-entrega-de-trajes)
  - [Sección 4 — Flujo de Devolución](#sección-4--flujo-de-devolución-de-trajes)
  - [Sección 5 — Envíos Fuera de la Ciudad](#sección-5--flujo-de-envíos-fuera-de-la-ciudad)
- [PARTE III — Módulos del Sistema](#parte-iii--módulos-del-sistema)
- [PARTE IV — Auditoría, Automatizaciones y Reglas Transversales](#parte-iv--auditoría-automatizaciones-y-reglas-transversales)

---

# PARTE I — Modelo SaaS Multi-Tenant

## Arquitectura y Modelo de Negocio SaaS

PachaRenta es una plataforma **SaaS (Software as a Service)** que permite a múltiples negocios de alquiler de trajes típicos, disfraces o indumentaria cultural operar su gestión completa desde un único sistema compartido, con datos **completamente aislados por negocio**.

### Definición de Tenant

Cada negocio cliente de GuambraWeb que contrata PachaRenta es un **tenant**. Cada tenant tiene su propio espacio aislado:

- Tienda online pública propia
- Sistema de gestión interno propio
- Datos propios (clientes, contratos, inventario, empleados, finanzas)

> ⚠️ **Principio fundamental:** Ningún tenant puede ver, acceder ni modificar los datos de otro tenant. Esta regla es absoluta y no tiene excepciones.

### Actores del Sistema

| Actor                        | Descripción                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| **Super Admin (GuambraWeb)** | Administrador global de la plataforma. Gestiona tenants, planes, facturación y monitoreo. |
| **Admin Tenant**             | Dueño o administrador del negocio. Acceso completo a su instancia.                        |
| **Empleado Tenant**          | Usuario con acceso limitado creado por el Admin Tenant.                                   |
| **Cliente Final**            | Usuario de la tienda online pública. Sin acceso al sistema de gestión.                    |

---

## Flujo de Onboarding de Nuevos Negocios

```
Registro → Subdominio → Plan → Pago → Activación → Configuración
```

### Paso 1 — Registro del Negocio

El dueño ingresa a la web de PachaRenta y completa:

- Nombre del negocio
- RUC o cédula del responsable
- Nombre del responsable
- Email de contacto
- WhatsApp
- País, Ciudad, Dirección

### Paso 2 — Selección de Subdominio

El tenant elige su subdominio de tienda online:

- Formato: **`nombretienda.pacharenta.com`**
- (Dominio propio disponible según plan)
- El sistema verifica disponibilidad en tiempo real

### Paso 3 — Selección de Plan

El tenant selecciona el plan de suscripción según su tamaño y necesidades.

### Paso 4 — Pago de Suscripción

El tenant realiza el pago del primer período. GuambraWeb confirma el pago desde el Super Admin.

### Paso 5 — Activación Automática

Al confirmar el pago, el sistema automáticamente:

- Crea el espacio aislado (tenant) en la base de datos
- Genera credenciales del Admin Tenant
- Activa la tienda online pública en el subdominio seleccionado
- Envía email y WhatsApp de bienvenida con credenciales y enlace de acceso

### Paso 6 — Configuración Inicial del Tenant

El Admin Tenant completa:

- Datos del negocio (logo, colores de marca, dirección, teléfonos)
- Métodos de pago aceptados
- Datos bancarios para la tienda online
- Políticas personalizadas de garantía y cancelación
- Categorías y subcategorías propias de productos

> ⚠️ **Regla:** Un tenant no puede operar ni recibir pedidos hasta completar la configuración mínima: datos del negocio + al menos un método de pago + al menos un producto activo.

---

## Planes y Suscripciones

GuambraWeb define los planes desde el Super Admin. Los planes se diferencian por límites y funcionalidades.

### Variables Configurables por Plan

| Variable                                | Descripción                                   |
| --------------------------------------- | --------------------------------------------- |
| Máximo de productos/trajes activos      | Límite de inventario visible                  |
| Máximo de piezas/elementos activos      | Límite de inventario de piezas                |
| Máximo de empleados (usuarios)          | Usuarios del sistema de gestión               |
| Acceso a tienda online pública          | Habilitado / Deshabilitado                    |
| Acceso al módulo de envíos              | Habilitado / Deshabilitado                    |
| Acceso al módulo de proformas           | Habilitado / Deshabilitado                    |
| Límite de contratos activos simultáneos | Número máximo                                 |
| Soporte incluido                        | Básico / Prioritario                          |
| Dominio                                 | Subdominio PachaRenta / Dominio personalizado |
| Período de facturación                  | Mensual / Anual                               |

### Reglas de Suscripción

- **Suspensión:** Si un tenant no renueva al vencer el período, el acceso al sistema y la tienda online se suspenden.
- **Conservación de datos:** Los datos NO se eliminan al suspenderse. Se conservan por un período de gracia (ej. 30 días).
- **Archivado:** Si no se reactiva en el período de gracia, GuambraWeb puede archivar los datos (con notificación previa).
- **Cambio de plan:**
  - Sube de plan → cobro proporcional al período restante
  - Baja de plan → cambio aplica al siguiente período
- **Límites alcanzados:** El sistema bloquea la creación de nuevos registros y sugiere actualizar el plan. Los datos existentes no se afectan.

---

## Reglas de Aislamiento y Seguridad Multi-Tenant

- Cada registro lleva un **`tenant_id`** que asegura aislamiento total.
- Todas las consultas a BD filtran obligatoriamente por `tenant_id`. No existen consultas globales que mezclen tenants.
- El subdominio/dominio determina automáticamente a qué `tenant_id` pertenece cada sesión.
- Las credenciales de un empleado de un tenant **no pueden** usarse en otro tenant.
- El Super Admin puede acceder a datos de cualquier tenant solo para soporte/auditoría, con acceso registrado en log.
- Las contraseñas se almacenan **cifradas**. Ningún actor puede ver contraseñas en texto plano.

---

## Administración de la Plataforma (Super Admin)

Panel exclusivo de GuambraWeb para gestionar toda la plataforma PachaRenta.

### Funciones del Super Admin

| Función                  | Descripción                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| **Gestión de tenants**   | Ver, crear, editar, suspender, reactivar y eliminar tenants      |
| **Gestión de planes**    | Crear, editar y eliminar planes con límites y precios            |
| **Facturación y pagos**  | Estado de pago por tenant, confirmar pagos, historial de cobros  |
| **Monitoreo de uso**     | Métricas por tenant (contratos, productos, empleados activos)    |
| **Soporte técnico**      | Acceso al sistema de un tenant con registro de auditoría         |
| **Comunicaciones**       | Notificaciones globales a todos los tenants                      |
| **Configuración global** | Plantillas base de contratos, límites por defecto, integraciones |

---

# PARTE II — Flujos de Negocio por Tenant

> Todos los flujos aplican dentro del espacio de cada tenant de forma independiente.

---

## Sección 1 — Reglas de Negocio Globales

Aplican a todos los canales (tienda online y atención presencial) sin excepción.

### 💰 Reglas de Pago

- El precio de alquiler cubre únicamente **24 horas de uso**.
- Se cobra un **anticipo del 50%** al reservar. Sin pago confirmado, el pedido queda en _Pendiente_ y el stock **NO se reserva**.
- El **50% restante** se cobra al momento de retirar físicamente los trajes.
- Si el cliente cancela antes de la entrega, **pierde el 100% del anticipo abonado**.
- Los abonos adicionales entre reserva y entrega se registran acumulativamente; el saldo pendiente se actualiza en tiempo real.

> 🔑 **Regla clave:** Un pedido solo pasa a _Reservado_ cuando el empleado confirma el comprobante del anticipo. Hasta entonces el stock está libre.

### 📦 Reglas de Stock y Disponibilidad

- Disponibilidad calculada en tiempo real según fecha/hora de salida solicitada.
- **Fórmula:** Fecha/hora de devolución del cliente anterior **+ 4 horas** (lavandería y secado).
- Stock gestionado a nivel de **pieza/elemento + talla**. Cada talla tiene su propio contador.

| Escenario                     | Acción del Sistema                                     |
| ----------------------------- | ------------------------------------------------------ |
| Stock disponible completo     | Permite continuar sin aviso                            |
| Stock parcialmente disponible | Notifica cantidad disponible; cliente/empleado decide  |
| Sin stock disponible          | Bloquea el producto y sugiere próxima fecha disponible |

### 🔒 Reglas de Garantía

- La garantía se entrega y registra **al retirar los trajes**, no al reservar.
- **Tipos aceptados:**
  - Laptop con cargador en buen estado
  - Garantía económica equivalente al **60% del total del contrato**
- La garantía se registra con tipo y descripción detallada.
- Se devuelve solo si los trajes retornan completos y en perfectas condiciones.
- Para envíos fuera de la ciudad → garantía **siempre económica** por transferencia bancaria.

### 📄 Reglas de Contrato

- Cada pedido genera un **contrato legal con ID único**.
- El contrato puede imprimirse desde el primer guardado (al confirmar el anticipo del 50%).
- **Dos momentos de firma:**
  1. Al hacer la reserva con el anticipo → primera firma
  2. Al retirar los trajes → segunda firma
- Al imprimir en la reserva, el documento físico se **archiva en la tienda** esperando la segunda firma.
- Los contratos **nunca se eliminan** de la BD. Pasan al historial con estado correspondiente.
- Formato: escritura legal ecuatoriana (personalizable por tenant).
- **Cláusulas incluidas:**
  - El cliente acepta perder el 100% del anticipo si cancela
  - Debe devolver en menos de 24 horas desde la entrega
  - Debe devolver en el mismo estado en que recibió

### 🔔 Reglas de Notificación

- Al confirmar el anticipo → notification automática por **WhatsApp** al cliente con ID del pedido y enlace de seguimiento.
- El cliente puede consultar su pedido en el **portal de seguimiento público** usando cédula/RUC o email.
- Si el cliente ya existe en la BD → en pedidos futuros el sistema **sugiere sus datos automáticamente**.

---

## Sección 2 — Flujo de Reserva de Pedidos

```
Paso 1: Productos → Paso 2: Cliente + Fechas → Paso 3: Tallas → Paso 4: Precio → Paso 5: Pedido → Paso 6: Confirmación
```

### Paso 1 — Selección de Productos

**Canal Online:**

- Cliente navega tienda pública con categorías, subcategorías y buscador
- Selecciona trajes y agrega al carrito
- El carrito muestra cantidad, subtotal y campo para cupón/descuento

**Canal Presencial:**

- Empleado accede a PachaRenta → "Nuevo Contrato"
- Usa buscador inteligente de productos o piezas

> 📝 Cada traje es un producto individual compuesto por piezas/elementos. Un traje puede tener referenciado el traje de la pareja y otros personajes de la misma cultura como productos relacionados.

### Paso 2 — Datos del Cliente y Fechas

**Datos obligatorios del cliente:**

- Nombres completos
- Cédula o RUC
- Email, WhatsApp
- País, Provincia, Ciudad, Dirección de domicilio
- Dirección del evento (referencia)

**Datos de fechas:**

- Fecha y hora de **salida** de los trajes
- Fecha y hora del **evento**
- Fecha y hora de **devolución** _(auto-calculada: salida + 24h)_

> ⚡ **Automatización:** Al ingresar la fecha/hora de salida → se calcula la devolución automáticamente y se valida el stock al instante.

### Paso 3 — Selección de Tallas y Cantidades

- Tabla dinámica con todas las piezas de cada producto seleccionado
- Por cada pieza: tallas disponibles con stock real para la fecha solicitada
- Cantidades restringidas al stock disponible
- Piezas de talla estándar indicadas claramente

### Paso 4 — Detalle de Precio

| Detalle            | Cantidad | Precio Unitario | Subtotal |
| ------------------ | -------- | --------------- | -------- |
| [nombre del traje] |          |                 |          |

**Total:** $XXX &nbsp;|&nbsp; **Anticipo requerido (50%):** $XXX &nbsp;|&nbsp; **Saldo pendiente al retirar:** $XXX

- Métodos de pago configurados por el tenant (Banco Pichincha, Pago QR De Una, Cooperativa Riobamba, CACECH, u otros)

> ⚠️ **Aviso al cliente:** El pedido no será alistado hasta confirmar el comprobante del anticipo. El stock permanece libre hasta ese momento.

### Paso 5 — Generación del Pedido

- El sistema genera un **ID de pedido único**
- Guarda todos los datos
- Estado: **Pendiente de pago**

### Paso 6 — Confirmación del Pago por el Empleado

| Acción              | Resultado                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Aprobar pago**    | Pedido pasa a estado _Reservado_. Contrato disponible para imprimir. WhatsApp automático al cliente. Ingreso registrado. |
| **Rechazar pedido** | Pasa al historial con etiqueta _Rechazado_. No se elimina de la BD.                                                      |

---

## Sección 3 — Flujo de Entrega de Trajes

> Entre reserva y entrega, el cliente puede realizar abonos adicionales y solicitar cambios de productos a través de la página de Soporte de la tienda online.

### Paso 1 — Verificación del Pedido

El empleado busca el pedido por ID o cédula y verifica estado y detalle completo.

### Paso 2 — Cobro del Saldo Restante

- Se cobra el 50% pendiente (o saldo real considerando abonos previos)
- Se registra método de pago
- El sistema actualiza el saldo a **$0**

### Paso 3 — Registro de Garantía

El empleado completa el campo de garantía en el contrato:

- Tipo: física (laptop) o económica (transferencia)
- Descripción detallada

### Paso 4 — Contrato e Impresión

| Momento                            | Acción                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Al confirmar el anticipo (50%)** | Se imprime para archivar físicamente. El cliente firma la **primera sección** (reserva).                     |
| **Al momento de la entrega**       | Se reimprimen o se usa el contrato archivado. El cliente firma la **segunda sección** (entrega y recepción). |

> ⚠️ El botón "Imprimir Contrato" está disponible **solo después de guardar**. Los datos impresos corresponden exactamente a los datos almacenados en el sistema.

### Paso 5 — Requisitos Obligatorios para Completar la Entrega

Los tres requisitos deben cumplirse para cambiar el estado a **Entregado**:

1. ✅ Cédula de identidad original del cliente
2. ✅ Garantía entregada
3. ✅ Segunda firma del contrato

---

## Sección 4 — Flujo de Devolución de Trajes

### Paso 1 — Recepción y Revisión

El empleado abre el pedido y revisa la lista completa de piezas según el contrato, verificando cantidad y estado físico de cada pieza.

### Paso 2a — Sin Inconvenientes

- Empleado devuelve la garantía y la registra como _Devuelta_
- Pedido pasa al historial con estado **Devuelto sin problemas**

### Paso 2b — Con Inconvenientes

Cada problema se registra como una **línea individual**:

| #   | Descripción del problema   | Fecha y hora (auto) | Estado                  | Acciones                             |
| --- | -------------------------- | ------------------- | ----------------------- | ------------------------------------ |
| 1   | [texto libre del empleado] | [auto-registrado]   | Pendiente / Solucionado | Editar, Marcar solucionado, Eliminar |

**Reglas de las líneas de problemas:**

- La fecha y hora se registran **automáticamente** al guardar. No son editables.
- La descripción sí es editable después de guardada.
- Cada línea puede marcarse individualmente como **Solucionado**.
- Una línea puede eliminarse si fue registrada por error.
- El pedido permanece en _Devuelto con problemas_ mientras haya **al menos una línea Pendiente**.
- La garantía **no se devuelve** mientras haya líneas pendientes.
- Cuando **todas las líneas están Solucionadas** → se habilita el botón **"Marcar pedido como completamente solucionado"** → estado: **Con inconvenientes — Solucionado**.

---

## Sección 5 — Flujo de Envíos Fuera de la Ciudad

El flujo de reserva es idéntico al canal online hasta el formulario de datos, donde el cliente activa la opción **"Envío fuera de la ciudad"**.

### Diferencias con el Flujo Estándar

| Aspecto          | Flujo Estándar     | Envío Fuera de la Ciudad                                    |
| ---------------- | ------------------ | ----------------------------------------------------------- |
| Retiro de trajes | Presencial         | No retira personalmente                                     |
| Contrato         | Firma presencial   | Imprime, firma y envía escaneado en alta calidad            |
| Garantía         | Física o económica | **Siempre económica** (transferencia, 60% del total)        |
| Cédula           | Presenta original  | Envía copia a color por ambos lados                         |
| Despacho         | Entrega directa    | Tienda empaca y comparte hoja de ruta/comprobante de envíos |
| Devolución       | Flujo Sección 4    | Flujo Sección 4 adaptado a envío                            |

---

# PARTE III — Módulos del Sistema

---

## Gestión de Contratos

### Sección: Nuevo Contrato

Formulario inteligente para contratos presenciales:

1. Búsqueda del cliente por cédula → si existe, auto-completa todos sus datos
2. Ingreso de fechas con auto-cálculo de devolución (+24h) y validación de stock
3. Buscador de productos/piezas con tabla dinámica de tallas/cantidades
4. Tabla de precios auto-calculada (Detalle, Cantidad, Precio Unitario, Subtotal, Total, Anticipo, Saldo)
5. Sección de garantía (no obligatoria al crear; se completa en la entrega)
6. **Botón "Guardar Contrato"** → genera el ID de contrato (obligatorio antes de imprimir)
7. **Botón "Imprimir Contrato"** → disponible solo después de guardar

### Sección: Contratos Activos

Tabla dinámica con filtros y búsqueda.

**Columnas:** ID de pedido, Nombre del cliente, Cédula, Trajes/Productos, Fecha de entrega, Fecha de devolución, Estado, Canal

**Acciones por fila:** Ver, Editar, Abonar, Eliminar _(pasa al historial con etiqueta Eliminado)_

### Sección: Contratos con Problemas

Lista de contratos en estado _Devuelto con problemas_ con líneas de inconvenientes pendientes.

### Sección: Historial de Contratos

Todos los contratos finalizados. Filtros por fecha, estado, canal y búsqueda por cliente, cédula o ID.

> **Regla de integración:** Los pedidos de la tienda online pasan primero por el Módulo de Pedidos Online. Solo tras confirmación de pago llegan a Gestión de Contratos con etiqueta _Desde tienda online_.

---

## Inventario de Trajes/Productos

### Campos de un Traje/Producto

| Campo                      | Detalle                                          |
| -------------------------- | ------------------------------------------------ |
| Nombre                     | Texto libre                                      |
| Descripción                | Texto libre                                      |
| Categoría(s)               | Selección múltiple                               |
| Subcategoría(s)            | Selección múltiple                               |
| Precio unitario            | Numérico                                         |
| Porcentaje de descuento    | Numérico                                         |
| Cantidad en stock          | Numérico                                         |
| Fotografías                | Hasta 5 imágenes                                 |
| Estado                     | Activo / Inactivo                                |
| Piezas/Elementos asociados | Vinculados desde Inventario de Piezas (con foto) |
| Productos relacionados     | Hasta 5 productos vinculables                    |

**Vista de gestión:** Tabla dinámica con filtros, búsqueda y acciones: Ver, Editar, Eliminar, Activar/Desactivar.

> ⚠️ Solo los productos en estado **Activo** se muestran en la tienda online del tenant.

---

## Inventario de Piezas/Elementos

Las piezas son la **unidad mínima de inventario**. Se crean en su propio módulo y luego se agrupan en trajes en el módulo de Inventario de Trajes. El stock se descuenta a nivel de **pieza + talla**.

### Campos de una Pieza

| Campo                        | Detalle                          |
| ---------------------------- | -------------------------------- |
| Nombre                       | Texto libre                      |
| Categoría                    | Selección                        |
| Subcategoría                 | Selección                        |
| Imágenes                     | Hasta 5                          |
| Precio unitario              | Numérico                         |
| Porcentaje de descuento      | Numérico                         |
| Estado                       | Activo / Inactivo                |
| Tabla de tallas y cantidades | Cada talla tiene su propio stock |

**Vista de gestión:** Tabla dinámica con filtros, búsqueda y acciones: Ver, Editar, Eliminar, Activar/Desactivar.

---

## Gestión de Clientes

### Fuentes de Registro

- Automático desde tienda online (cliente nuevo)
- Automático desde nuevo contrato presencial (cliente nuevo)
- Manual por el empleado

### Datos — Persona Natural

| Campo                                      | Obligatorio |
| ------------------------------------------ | ----------- |
| Nombres completos                          | ✅          |
| Cédula o RUC                               | ✅          |
| Email                                      | ✅          |
| WhatsApp                                   | ✅          |
| Contactos de referencia (nombre + celular) |             |
| **Dirección de domicilio**                 | ✅          |
| Ciudad, Provincia, País                    | ✅          |

### Datos — Empresa

| Campo                      | Obligatorio |
| -------------------------- | ----------- |
| RUC                        | ✅          |
| Nombre de la empresa       | ✅          |
| Tipo de empresa            | ✅          |
| **Dirección de domicilio** | ✅          |
| Ciudad, Provincia, País    | ✅          |
| Nombre del responsable     | ✅          |
| Celular del responsable    | ✅          |
| Email del responsable      | ✅          |

> ⚠️ La dirección de domicilio es **obligatoria** (dato contractual y de envío).

**Vista de gestión:** Tabla dinámica con historial. Acciones: Ver, Modificar, Eliminar.

---

## Gestión de Empleados

El administrador crea usuarios con acceso limitado. Los empleados acceden únicamente a: Contratos, Pedidos Online, Inventario de Trajes y Piezas.

### Datos del Empleado

| Campo                                   |                         |
| --------------------------------------- | ----------------------- |
| Nombre completo                         | Cédula                  |
| WhatsApp                                | Email                   |
| Referencia familiar (nombre + contacto) | Dirección de domicilio  |
| Ciudad, Provincia, País                 | Fecha de inicio laboral |
| Fecha de pago mensual                   | **Salario mensual**     |

**Vista de gestión:** Tabla dinámica con acciones: Ver, Editar, Eliminar.

> **Conexión con Egresos:** Al registrar un egreso de categoría _Pago a empleados_, el sistema muestra un selector de empleados y auto-completa el salario registrado aquí. Este valor **es editable** en el egreso para pagos parciales, bonos o descuentos.

---

## Gestión de Ingresos

### Registro Automático

Cada vez que se confirma un abono en un contrato, el sistema registra automáticamente:

| Campo                                | Tipo                                  |
| ------------------------------------ | ------------------------------------- |
| Fecha y hora                         | Auto                                  |
| Monto                                | Auto                                  |
| Descripción                          | Auto (ej. _Abono al contrato #XXXXX_) |
| Método de pago                       | Auto                                  |
| ID del contrato vinculado            | Auto                                  |
| **Nombre del empleado que confirmó** | Auto — permanente e ineditable        |

### Registro Manual

Formulario para ingresos no vinculados a contratos: Fecha y hora, Monto, Descripción, Método de pago. También registra automáticamente el empleado creador.

**Vista de gestión:** Historial con filtros por fecha, método de pago, empleado y descripción.

---

## Gestión de Egresos

### Categorías de Egreso

- Pago a proveedores
- Pago a empleados
- Arriendo de local
- Servicios básicos
- Otros

### Registro de Egreso — Formato Tipo Factura

| Descripción/Detalle | Categoría | Cantidad | Precio Unitario | Subtotal |
| ------------------- | --------- | -------- | --------------- | -------- |
|                     |           |          |                 |          |

**Total:** $XXX &nbsp;|&nbsp; **Método de pago:** [selección] &nbsp;|&nbsp; **Modalidad:** Contado / Crédito

- Modalidad **Crédito**: se registran abonos parciales que descuentan el saldo acumulativamente.
- Categoría **Pago a empleados**: selector de empleados con auto-completado del salario (editable).

### Sub-sección — Deudas con Proveedores

| Campo                |     |
| -------------------- | --- |
| Nombre del proveedor |     |
| Deuda total          |     |
| Total abonado        |     |
| Saldo pendiente      |     |

Al clic en una fila → historial de pagos + opción de nuevo abono. Al llegar a saldo cero → botón **"Finalizar pago completo"** archiva la deuda.

**Vista de gestión:** Historial con filtros por categoría, fecha, método de pago y proveedor/empleado.

---

## Gestión de Proveedores

### Datos — Empresa

| Campo                          |                         |
| ------------------------------ | ----------------------- |
| RUC                            | Nombre de la empresa    |
| Tipo de proveedor (qué provee) | País, Ciudad, Dirección |
| Nombre del encargado           | Celular, Email          |

### Datos — Persona Natural

| Campo             |                         |
| ----------------- | ----------------------- |
| Cédula            | Nombres completos       |
| Tipo de proveedor | País, Ciudad, Dirección |
| Celular           | Email                   |

**Vista de gestión:** Tabla dinámica con acciones: Ver, Editar, Eliminar.

---

## Pedidos de la Tienda Online

Puerta de entrada entre la tienda pública y el sistema interno del tenant.

### Sección: Pedidos Pendientes

**Columnas:** ID de pedido, Nombre del cliente, Productos, Fecha solicitada, Fecha del pedido, Monto total, Anticipo

**Acciones:**
| Acción | Resultado |
|--------|-----------|
| Confirmar pago | Pedido pasa automáticamente a Gestión de Contratos con etiqueta _Desde tienda online_ y estado _Reservado_ |
| Rechazar pedido | Pasa al historial con etiqueta _Rechazado_. No se elimina de la BD. |

---

## Caja

### Vista del Día

- Resumen de ingresos vs. egresos del día actual
- Desglose por método de pago (Efectivo, Transferencia, Otros)
- Total en caja calculado automáticamente
- Botón **"Cerrar Caja"**

### Historial de Cierres

Tabla dinámica filtrable por: día, rango de días, semana, mes y año.

---

## Comprobantes y Proformas

### Sección Comprobantes

- Solo para pedidos completamente devueltos
- El empleado puede agregar cobros adicionales antes de emitir
- Genera **PDF descargable e imprimible**

### Sección Proformas

- Búsqueda o creación de cliente/empresa
- Buscador de productos
- Tabla dinámica de detalle con descuento (monto fijo o porcentaje)
- Selector de vigencia: 5, 7 o 10 días
- Al vencer la vigencia → indica que el precio está sujeto a cambios

---

## Calendario Semaforizado

### Distribución de Pantalla

- **75% izquierdo:** Calendario (cada día muestra los nombres de los trajes/pedidos activos)
- **25% derecho:** Lista de contratos del día ordenados por hora de entrega

### Sistema de Colores

| Color           | Estado                 | Descripción                             |
| --------------- | ---------------------- | --------------------------------------- |
| 🟢 **Verde**    | Por entregar           | Trajes pendientes de entrega al cliente |
| 🟡 **Amarillo** | Entregado              | Trajes ya entregados al cliente         |
| ⬜ **Gris**     | Devuelto sin problemas | Trajes devueltos en buen estado         |
| 🔴 **Rojo**     | Devuelto con problemas | Líneas de problemas pendientes          |

**Acciones rápidas por contrato:** Ver, Modificar, Anular, Abonar.

---

# PARTE IV — Auditoría, Automatizaciones y Reglas Transversales

---

## Reglas de Auditoría del Sistema

La auditoría garantiza **trazabilidad completa** de todas las acciones relevantes.

### Registros de Auditoría por Módulo

| Módulo                           | Qué se registra                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| **Contratos**                    | Quién creó, editó, confirmó cada pago, cambió el estado; fecha/hora de cada acción |
| **Ingresos**                     | Nombre del empleado que registró (automático o manual). Permanente e ineditable.   |
| **Egresos**                      | Nombre del empleado que registró                                                   |
| **Productos e inventario**       | Quién creó, editó o desactivó un producto o pieza                                  |
| **Clientes**                     | Quién creó o editó un cliente                                                      |
| **Caja**                         | Quién realizó el cierre de caja de cada día                                        |
| **Pedidos online**               | Quién confirmó o rechazó cada pedido                                               |
| **Inconvenientes de devolución** | Quién registró cada línea, con fecha/hora automáticas e inalterables               |
| **Accesos Super Admin**          | Fecha, hora y motivo declarado de cada acceso de GuambraWeb a un tenant            |

> **Regla general:** Ningún empleado puede editar los campos de auditoría. Solo el Admin Tenant puede ver el log completo. El Super Admin ve los logs de todos los tenants.

---

## Automatizaciones del Sistema

### Contratos y Fechas

- Al ingresar fecha/hora de salida → calcula devolución automáticamente (+24h)
- Al ingresar fecha/hora de salida → valida stock disponible por pieza y talla
- Al seleccionar un producto → completa automáticamente la fila en tabla dinámica (nombre, piezas, tallas, cantidades, precio)
- Al completar cantidades → auto-calcula subtotal, total, anticipo (50%) y saldo pendiente

### Clientes

- Al ingresar cédula ya registrada → auto-completa todos los datos del cliente
- Al crear un cliente desde la tienda online o nuevo contrato → se guarda automáticamente en Gestión de Clientes

### Ingresos y Egresos

- Al confirmar pago del anticipo → crea registro de ingreso con todos los datos + nombre del empleado
- Al registrar abono adicional → actualiza saldo pendiente del contrato + crea registro de ingreso
- Al seleccionar empleado en egreso de pago → auto-completa el salario (editable)
- Al completar saldo de deuda de proveedor → habilita el botón de cierre de deuda

### Estados de Contratos

```
Pendiente de pago → [confirmar pago] → Reservado
Reservado → [3 requisitos de entrega] → Entregado
Entregado → [devolución sin problemas] → Devuelto sin problemas
Entregado → [problemas registrados] → Devuelto con problemas
Devuelto con problemas → [todas las líneas Solucionadas] → Con inconvenientes — Solucionado
```

### Tienda Online

- Producto desactivado → desaparece **inmediatamente** de la tienda online
- Precios y descuentos actualizados → se reflejan **inmediatamente** en la tienda online
- Stock disponible en tienda → calculado en tiempo real (contratos activos + fórmula +4h de lavandería)

---

## Notificaciones Automáticas

Todas las notificaciones se envían por **WhatsApp**. El texto base es configurable por el tenant.

| Evento                        | Destinatario            | Contenido del mensaje                                          |
| ----------------------------- | ----------------------- | -------------------------------------------------------------- |
| Pago del anticipo confirmado  | Cliente                 | ID de pedido, enlace de seguimiento, fecha/hora de entrega     |
| Recordatorio de retiro        | Cliente                 | 24h antes: ID de pedido + requisitos (cédula, saldo, garantía) |
| Recordatorio de devolución    | Cliente                 | 2h antes: aviso de devolución                                  |
| Pedido rechazado              | Cliente                 | Notificación de rechazo con motivo                             |
| Vencimiento de suscripción    | Admin Tenant            | Aviso 7 días y 1 día antes del vencimiento                     |
| Nuevo pedido en tienda online | Admin Tenant / Empleado | Alerta inmediata de pedido pendiente                           |

---

## Tabla General de Estados del Sistema

| Entidad      | Estado                               | Descripción                                                | Acciones Permitidas                       |
| ------------ | ------------------------------------ | ---------------------------------------------------------- | ----------------------------------------- |
| Pedido       | **Pendiente de pago**                | Creado sin anticipo confirmado. Stock libre.               | Confirmar pago, Rechazar, Editar          |
| Contrato     | **Reservado**                        | Anticipo confirmado. Stock reservado. Contrato disponible. | Abonar, Editar, Ver, Imprimir, Anular     |
| Contrato     | **Entregado**                        | Trajes entregados, garantía y segunda firma recibidas.     | Ver, Registrar devolución                 |
| Contrato     | **Devuelto sin problemas**           | Trajes en buen estado. Garantía devuelta.                  | Ver, Emitir comprobante                   |
| Contrato     | **Devuelto con problemas**           | Líneas de inconvenientes pendientes. Garantía retenida.    | Ver, Gestionar líneas, Modificar garantía |
| Contrato     | **Con inconvenientes — Solucionado** | Todos los problemas resueltos. Archivado.                  | Solo consulta, Emitir comprobante         |
| Contrato     | **Cancelado / Eliminado**            | Cliente pierde el anticipo. Archivado.                     | Solo consulta en historial                |
| Producto     | **Activo**                           | Visible en tienda online y seleccionable en contratos.     | Desactivar, Editar                        |
| Producto     | **Inactivo**                         | No visible en tienda online.                               | Activar, Editar                           |
| Egreso/Deuda | **Con saldo pendiente**              | Crédito no saldado.                                        | Registrar abono                           |
| Egreso/Deuda | **Saldado**                          | Pago completo. Archivado.                                  | Solo consulta                             |
| Tenant       | **Activo**                           | Suscripción vigente. Sistema operativo completo.           | Uso normal                                |
| Tenant       | **Suspendido**                       | Suscripción vencida. Acceso bloqueado. Datos conservados.  | Reactivar plan                            |
| Tenant       | **Archivado**                        | Período de gracia vencido. Datos en espera.                | Solo reactivación por Super Admin         |

---

## Consideraciones para Base de Datos Escalable

> Estas reglas no definen la estructura técnica final pero orientan las decisiones de modelado para un sistema escalable, auditable y multi-tenant desde el origen.

### Principios de Diseño

| Principio                          | Descripción                                                                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Toda tabla lleva `tenant_id`**   | Sin excepción. Es la columna de aislamiento central del modelo multi-tenant.                                                        |
| **Soft delete universal**          | Ningún registro se elimina físicamente. Todos tienen un campo de estado o `deleted_at`.                                             |
| **Auditoría embebida**             | Todas las tablas principales incluyen: `created_at`, `updated_at`, `created_by`, `updated_by`.                                      |
| **Stock por pieza y talla**        | El stock no se gestiona a nivel de producto/traje sino de pieza + talla. Permite alquilar piezas sueltas.                           |
| **Contratos como entidad central** | El contrato conecta: cliente, empleado, productos, piezas, tallas, pagos, garantía y estados. Su integridad referencial es crítica. |
