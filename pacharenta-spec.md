# PachaRenta — Especificación Técnica Completa

### Sistema SaaS de Gestión de Alquiler de Trajes Típicos

**Desarrollado por GuambraWeb | Documento para construcción de UI/UX**

---

> **INSTRUCCIÓN PARA IA:** Construir cada módulo exactamente como se especifica. No omitir campos, validaciones ni reglas de negocio. Cada sección del navbar es una vista independiente. Respetar los estados, colores y automatizaciones indicadas.

---

## GESTIÓN DE CONTRATOS

**Navbar del módulo:** `Nuevo Contrato` | `Contratos Activos` | `Contratos con Problemas` | `Historial de Contratos`

---

### NUEVO CONTRATO

**Descripción:** Formulario inteligente multipaso para crear contratos en atención presencial.

---

#### PASO 1 — BÚSQUEDA / DATOS DEL CLIENTE

**Campo de búsqueda inicial:**

- Input: `Cédula o RUC del cliente`
  - Al ingresar cédula existente → auto-completa todos los campos del cliente (solo lectura, con botón "Editar datos")
  - Si no existe → habilita formulario completo en blanco

**Formulario para Persona Natural:**
| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| Nombres completos | Texto | ✅ | Mín. 2 palabras |
| Cédula o RUC | Texto | ✅ | Validar formato Ecuador |
| Email | Email | ✅ | Formato válido |
| WhatsApp | Teléfono | ✅ | Formato con código país |
| País | Selector | ✅ | Default: Ecuador |
| Provincia | Selector | ✅ | Dependiente de País |
| Ciudad | Texto | ✅ | — |
| Dirección de domicilio | Texto | ✅ | Dato contractual obligatorio |
| Dirección del evento (referencia) | Texto | ✅ | — |
| Contacto de referencia — Nombre | Texto | ❌ | — |
| Contacto de referencia — Celular | Teléfono | ❌ | — |

**Formulario para Empresa:**
| Campo | Tipo | Obligatorio |
|---|---|---|
| RUC | Texto | ✅ |
| Nombre de la empresa | Texto | ✅ |
| Tipo de empresa | Texto | ✅ |
| Dirección de domicilio | Texto | ✅ |
| Ciudad | Texto | ✅ |
| Provincia | Selector | ✅ |
| País | Selector | ✅ |
| Nombre del responsable | Texto | ✅ |
| Celular del responsable | Teléfono | ✅ |
| Email del responsable | Email | ✅ |

---

#### PASO 2 — FECHAS Y TIPO DE CONTRATO

| Campo                                | Tipo                                             | Obligatorio | Reglas / Automatización                                             |
| ------------------------------------ | ------------------------------------------------ | ----------- | ------------------------------------------------------------------- |
| Tipo de entrega                      | Radio: `Presencial` / `Envío fuera de la ciudad` | ✅          | Cambia reglas de garantía y firma                                   |
| Fecha y hora de salida de los trajes | DateTime picker                                  | ✅          | Al ingresar → dispara validación de stock automática                |
| Fecha y hora del evento              | DateTime picker                                  | ✅          | Debe ser ≥ fecha de salida                                          |
| Fecha y hora de devolución           | DateTime (solo lectura)                          | ✅          | Auto-calculada: fecha de salida + 24 horas. No editable manualmente |

**Regla:** Si tipo = `Envío fuera de la ciudad`, mostrar aviso: _"La garantía será económica por transferencia bancaria (60% del total). El cliente deberá enviar contrato firmado escaneado y copia de cédula a color por ambos lados."_

---

#### PASO 3 — SELECCIÓN DE PRODUCTOS Y TALLAS

**Buscador de productos:**

- Input de búsqueda por nombre de traje o pieza
- Resultados en dropdown con nombre, foto miniatura y precio
- Botón `+ Agregar al pedido`

**Tabla dinámica de productos agregados:**

Por cada producto agregado se despliega automáticamente una subtabla con todas sus piezas/elementos:

| Columna             | Descripción                                                                      |
| ------------------- | -------------------------------------------------------------------------------- |
| Pieza/Elemento      | Nombre de la pieza                                                               |
| Talla               | Selector desplegable con tallas disponibles para la fecha ingresada              |
| Stock disponible    | Número (calculado en tiempo real según fecha de salida + fórmula +4h lavandería) |
| Cantidad solicitada | Input numérico — máximo = stock disponible                                       |
| Estado de stock     | Ícono: ✅ disponible / ⚠️ parcial / ❌ sin stock                                 |

**Comportamientos de stock:**

- Stock completo disponible → permite continuar sin aviso
- Stock parcialmente disponible → muestra alerta amarilla con cantidad disponible; el empleado decide si acepta
- Sin stock → bloquea la cantidad y muestra fecha/hora exacta de próxima disponibilidad

---

#### PASO 4 — DETALLE DE PRECIO

**Tabla de precios auto-calculada:**
| Detalle | Cantidad | Precio Unitario | Subtotal |
|---|---|---|---|
| [nombre del traje/producto] | — | $XX.XX | $XX.XX |

**Resumen financiero (auto-calculado, solo lectura):**

- Total: $XXX.XX
- Anticipo requerido (50%): $XXX.XX
- Saldo pendiente al retirar: $XXX.XX

**Sección de descuentos:**

- Input: `Código de cupón/descuento`
- Botón: `Aplicar`
- Al aplicar: recalcula totales automáticamente

**Métodos de pago del anticipo** (configurados por el tenant, ejemplos):

- Banco Pichincha
- Pago QR De Una
- Cooperativa Riobamba
- Cooperativa CACECH
- [otros configurados por el tenant en su panel]

**Selector:** `Método de pago del anticipo` — obligatorio

**Aviso visible al empleado:** _"El pedido no será alistado hasta confirmar el comprobante del anticipo. El stock permanece disponible para otros clientes hasta ese momento."_

---

#### PASO 5 — GARANTÍA _(No obligatoria al crear — se completa en entrega)_

| Campo                      | Tipo                                                                | Obligatorio al crear | Reglas                                           |
| -------------------------- | ------------------------------------------------------------------- | -------------------- | ------------------------------------------------ |
| Tipo de garantía           | Radio: `Física (laptop con cargador)` / `Económica (60% del total)` | ❌                   | Si tipo contrato = Envío: solo permite Económica |
| Descripción de la garantía | Textarea                                                            | ❌                   | Detalle del objeto o datos de transferencia      |

**Nota visible:** _"La garantía se completa en el momento en que el cliente retira los trajes, no al reservar."_

---

#### PASO 6 — ACCIONES FINALES

**Botón `Guardar Contrato`:**

- Genera ID de contrato único en el sistema
- El pedido queda en estado **Pendiente de pago**
- El botón `Imprimir Contrato` se habilita solo después de guardar

**Botón `Imprimir Contrato`** _(disponible solo tras guardar):_

- Genera PDF con todos los datos guardados
- Formato de escritura legal ecuatoriana
- Incluye cláusulas: pérdida del 100% del anticipo si cancela; devolución en 24h; devolución en mismo estado
- Dos secciones de firma: Primera firma (reserva) + Segunda firma (entrega) — ambas en el mismo documento físico

**Botón `Confirmar Pago del Anticipo`:**

- El empleado indica que recibió el comprobante de pago
- El pedido cambia de estado **Pendiente de pago → Reservado**
- El sistema registra automáticamente el pago: fecha, hora, monto, descripción ("Anticipo contrato #XXXXX"), método de pago, nombre del empleado que confirmó
- El sistema envía WhatsApp automático al cliente con: ID de pedido, enlace de seguimiento, fecha y hora de entrega acordada
- El stock queda reservado para este contrato

**Botón `Rechazar Pedido`:**

- El pedido pasa al historial con etiqueta **Rechazado**
- No se elimina de la base de datos
- Se envía WhatsApp al cliente con notificación de rechazo y motivo

---

### CONTRATOS ACTIVOS

**Descripción:** Tabla dinámica de todos los contratos en estados: Reservado, Entregado.

**Filtros disponibles:**

- Por fecha de entrega (rango desde/hasta)
- Por fecha de devolución (rango)
- Por estado: `Reservado` | `Entregado`
- Por canal: `Presencial` | `Desde tienda online`
- Buscador por: Nombre del cliente, Cédula, ID de pedido

**Columnas de la tabla:**
| Columna | Descripción |
|---|---|
| ID de pedido | Identificador único |
| Nombre del cliente | — |
| Cédula / RUC | — |
| Trajes / Productos | Lista resumida de ítems |
| Fecha de entrega | Fecha y hora |
| Fecha de devolución | Fecha y hora (calculada) |
| Estado | Badge con color según estado |
| Canal | `Presencial` o `Tienda online` |
| Acciones | Ver, Editar, Abonar, Eliminar |

**Acción: Ver** → Abre modal/página con detalle completo del contrato (todos los campos, línea de tiempo de pagos, estado actual).

**Acción: Editar** → Permite modificar datos del contrato (con registro de auditoría: quién editó y cuándo).

**Acción: Abonar** → Abre formulario de abono:
| Campo | Tipo | Obligatorio |
|---|---|---|
| Monto del abono | Numérico | ✅ |
| Método de pago | Selector | ✅ |
| Descripción (opcional) | Texto | ❌ |

- Al confirmar: actualiza saldo pendiente del contrato y crea registro automático de ingreso

**Acción: Eliminar** → El contrato pasa al historial con etiqueta **Eliminado**. No se borra de la base de datos. Requiere confirmación del empleado.

---

#### SUB-FLUJO: ENTREGA DE TRAJES (desde Contratos Activos)

Al abrir un contrato en estado **Reservado**, el empleado puede iniciar el flujo de entrega:

**Paso 1 — Verificación del pedido:** Vista de solo lectura del detalle completo del contrato.

**Paso 2 — Cobro del saldo restante:**
| Campo | Tipo | Obligatorio |
|---|---|---|
| Saldo a cobrar (auto-calculado) | Numérico (editable) | ✅ |
| Método de pago | Selector | ✅ |
| Confirmar pago | Botón | ✅ |

- Al confirmar: saldo del contrato queda en $0. Se registra ingreso.

**Paso 3 — Registro de garantía** _(obligatorio para completar entrega):_
| Campo | Tipo | Obligatorio |
|---|---|---|
| Tipo de garantía | Radio: `Física` / `Económica` | ✅ |
| Descripción detallada | Textarea | ✅ |

**Paso 4 — Requisitos obligatorios** _(los 3 deben marcarse como cumplidos):_

- ☐ Cédula de identidad original del cliente presentada
- ☐ Garantía recibida y registrada en el sistema
- ☐ Segunda firma del contrato obtenida

**Botón `Marcar como Entregado`** → Solo habilitado cuando los 3 requisitos están marcados. Cambia estado a **Entregado**.

---

#### SUB-FLUJO: DEVOLUCIÓN DE TRAJES (desde Contratos Activos — estado Entregado)

**Paso 1 — Revisión de piezas:** Lista completa de piezas/elementos del contrato con campo de revisión por cada uno:
| Pieza | Talla | Cantidad | Estado físico | Observación |
|---|---|---|---|---|
| [nombre] | [talla] | [cant.] | `Bien` / `Con daño` | Texto libre |

**Paso 2a — Sin inconvenientes:**

- Botón `Devolver Garantía` → campo: tipo de devolución (efectivo/transferencia) + descripción
- Garantía se registra como **Devuelta** en el sistema
- Estado del contrato → **Devuelto sin problemas**

**Paso 2b — Con inconvenientes:**
Formulario de líneas de problemas:
| Campo | Tipo | Reglas |
|---|---|---|
| # | Auto-incremental | — |
| Descripción del problema | Textarea | Editable después de guardar |
| Fecha y hora | Auto-registrada | NO editable por empleado — permanente |
| Estado | `Pendiente` / `Solucionado` | Cambiable por línea individual |
| Acciones | Marcar solucionado, Editar descripción, Eliminar línea (si fue error) | — |

**Reglas críticas de inconvenientes:**

- Mientras haya al menos 1 línea en estado **Pendiente** → contrato permanece en "Devuelto con problemas"
- La garantía **NO se devuelve** mientras haya líneas pendientes
- Al marcar TODAS las líneas como **Solucionado** → se habilita el botón `Marcar pedido como completamente solucionado`
- Al presionar ese botón → estado cambia a **Con inconvenientes — Solucionado** y se archiva en historial

---

### CONTRATOS CON PROBLEMAS

**Descripción:** Vista exclusiva de contratos en estado **Devuelto con problemas** con líneas de inconvenientes pendientes.

**Columnas de la tabla:**
| Columna | Descripción |
|---|---|
| ID de contrato | — |
| Nombre del cliente | — |
| Cédula | — |
| Fecha de devolución | — |
| Líneas pendientes | Contador numérico de líneas en estado Pendiente |
| Garantía | Estado: `Retenida` |
| Acciones | Ver detalle, Gestionar líneas, Modificar garantía |

**Acción: Gestionar líneas** → Abre el panel de líneas de inconvenientes del contrato con todas las opciones descritas en el sub-flujo de devolución.

---

### HISTORIAL DE CONTRATOS

**Descripción:** Archivo de todos los contratos finalizados o cancelados.

**Filtros disponibles:**

- Rango de fechas
- Estado: `Devuelto sin problemas` | `Con inconvenientes — Solucionado` | `Cancelado` | `Eliminado` | `Rechazado`
- Canal: `Presencial` | `Tienda online`
- Buscador: Nombre del cliente, Cédula, ID de pedido

**Columnas:**
| Columna | Descripción |
|---|---|
| ID de contrato | — |
| Nombre del cliente | — |
| Cédula | — |
| Productos | — |
| Fecha de entrega | — |
| Fecha de devolución | — |
| Estado final | Badge con etiqueta |
| Canal | — |
| Acciones | Solo Ver (solo lectura) / Emitir comprobante (si aplica) |

---

## INVENTARIO DE TRAJES/PRODUCTOS

**Navbar del módulo:** `Productos Activos` | `Productos Inactivos` | `Nuevo Producto`

---

### NUEVO PRODUCTO / EDITAR PRODUCTO

**Formulario completo:**
| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| Nombre del traje/producto | Texto | ✅ | — |
| Descripción | Textarea | ✅ | — |
| Categoría(s) | Multi-selector (creadas por el tenant) | ✅ | — |
| Subcategoría(s) | Multi-selector dependiente de categoría | ❌ | — |
| Precio unitario | Numérico decimal | ✅ | — |
| Porcentaje de descuento | Numérico (0–100) | ❌ | Default: 0 |
| Fotografías | Upload de imágenes | ❌ | Máximo 5 fotos |
| Estado | Toggle: `Activo` / `Inactivo` | ✅ | Solo Activos aparecen en tienda online |
| Piezas/Elementos asociados | Buscador de piezas + vincular | ❌ | Muestra foto de cada pieza vinculada |
| Productos relacionados | Buscador de otros productos | ❌ | Máximo 5 productos relacionados |

**Regla:** Al desactivar un producto → desaparece inmediatamente de la tienda online. Los contratos activos que lo contengan no se afectan.

---

### PRODUCTOS ACTIVOS / INACTIVOS

**Tabla dinámica con filtros:**

- Filtro por categoría
- Filtro por subcategoría
- Buscador por nombre

**Columnas:**
| Columna | Descripción |
|---|---|
| Foto | Miniatura de la primera imagen |
| Nombre | — |
| Categoría | — |
| Precio | — |
| Descuento | % si aplica |
| Piezas vinculadas | Cantidad |
| Estado | Activo / Inactivo |
| Acciones | Ver, Editar, Activar/Desactivar, Eliminar |

**Acción Eliminar:** Soft delete — no se elimina físicamente de la base de datos.

---

## INVENTARIO DE PIEZAS/ELEMENTOS

**Navbar del módulo:** `Piezas Activas` | `Piezas Inactivas` | `Nueva Pieza`

---

### NUEVA PIEZA / EDITAR PIEZA

**Formulario:**
| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| Nombre de la pieza | Texto | ✅ | — |
| Categoría | Selector | ✅ | — |
| Subcategoría | Selector | ❌ | — |
| Imágenes | Upload | ❌ | Máximo 5 imágenes |
| Precio unitario | Numérico decimal | ✅ | — |
| Porcentaje de descuento | Numérico (0–100) | ❌ | Default: 0 |
| Estado | Toggle: `Activo` / `Inactivo` | ✅ | — |
| **Tabla de tallas y cantidades** | Tabla dinámica | ✅ | Ver detalle abajo |

**Tabla dinámica de tallas y cantidades:**
| Talla | Stock disponible | Acciones |
|---|---|---|
| XS | Numérico | Editar, Eliminar fila |
| S | Numérico | Editar, Eliminar fila |
| M | Numérico | Editar, Eliminar fila |
| L | Numérico | Editar, Eliminar fila |
| XL | Numérico | Editar, Eliminar fila |
| Estándar (talla única) | Numérico | Editar, Eliminar fila |
| + Agregar talla personalizada | Input texto + cantidad | — |

**Regla:** El stock se gestiona a nivel de pieza + talla. Cada talla tiene su propio contador independiente.

---

### PIEZAS ACTIVAS / INACTIVAS

**Tabla con filtros por categoría, subcategoría y buscador.**

**Columnas:**
| Columna | Descripción |
|---|---|
| Foto | Miniatura |
| Nombre | — |
| Categoría | — |
| Precio | — |
| Tallas disponibles | Lista resumida con stock |
| Estado | Activo / Inactivo |
| Trajes vinculados | Cuántos trajes usan esta pieza |
| Acciones | Ver, Editar, Activar/Desactivar, Eliminar |

---

## GESTIÓN DE CLIENTES

**Navbar del módulo:** `Lista de Clientes` | `Nuevo Cliente`

---

### NUEVO CLIENTE / EDITAR CLIENTE

**Selector tipo de persona:** `Persona Natural` | `Empresa`

**Formulario Persona Natural:**
| Campo | Tipo | Obligatorio |
|---|---|---|
| Nombres completos | Texto | ✅ |
| Cédula o RUC | Texto | ✅ |
| Email | Email | ✅ |
| WhatsApp | Teléfono | ✅ |
| Dirección de domicilio | Texto | ✅ |
| Ciudad | Texto | ✅ |
| Provincia | Selector | ✅ |
| País | Selector | ✅ |
| Contacto de referencia 1 — Nombre | Texto | ❌ |
| Contacto de referencia 1 — Celular | Teléfono | ❌ |
| Contacto de referencia 2 — Nombre | Texto | ❌ |
| Contacto de referencia 2 — Celular | Teléfono | ❌ |

**Formulario Empresa:**
| Campo | Tipo | Obligatorio |
|---|---|---|
| RUC | Texto | ✅ |
| Nombre de la empresa | Texto | ✅ |
| Tipo de empresa | Texto | ✅ |
| Dirección de domicilio | Texto | ✅ |
| Ciudad | Texto | ✅ |
| Provincia | Selector | ✅ |
| País | Selector | ✅ |
| Nombre del responsable | Texto | ✅ |
| Celular del responsable | Teléfono | ✅ |
| Email del responsable | Email | ✅ |

**Fuentes de creación:** Manual por empleado | Automático desde tienda online | Automático desde nuevo contrato presencial (si el cliente es nuevo).

---

### LISTA DE CLIENTES

**Filtros:** Por ciudad, provincia, tipo (natural/empresa), buscador por nombre o cédula.

**Columnas:**
| Columna | Descripción |
|---|---|
| Nombre / Empresa | — |
| Cédula / RUC | — |
| Ciudad | — |
| WhatsApp / Celular | — |
| Total de contratos | Contador histórico |
| Último contrato | Fecha |
| Acciones | Ver, Modificar, Eliminar (soft delete) |

**Acción Ver:** Abre perfil completo del cliente con historial de todos sus contratos.

---

## GESTIÓN DE EMPLEADOS

**Navbar del módulo:** `Lista de Empleados` | `Nuevo Empleado`

---

### NUEVO EMPLEADO / EDITAR EMPLEADO

**Formulario:**
| Campo | Tipo | Obligatorio |
|---|---|---|
| Nombre completo | Texto | ✅ |
| Cédula | Texto | ✅ |
| WhatsApp | Teléfono | ✅ |
| Email (será el usuario de acceso) | Email | ✅ |
| Contraseña de acceso | Password | ✅ |
| Referencia familiar — Nombre | Texto | ✅ |
| Referencia familiar — Número de contacto | Teléfono | ✅ |
| Dirección de domicilio | Texto | ✅ |
| Ciudad | Texto | ✅ |
| Provincia | Selector | ✅ |
| País | Selector | ✅ |
| Fecha de inicio laboral | Date picker | ✅ |
| Fecha de pago mensual | Date picker (día del mes) | ✅ |
| Salario mensual | Numérico decimal | ✅ |

**Regla de acceso:** El empleado accede únicamente a los módulos: Contratos, Pedidos Online, Inventario de Trajes y Piezas. No accede a Finanzas, Empleados, Proveedores ni configuración del negocio.

**Conexión con Egresos:** El salario mensual registrado aquí se auto-completa (editable) cuando se registra un egreso de categoría "Pago a empleados" y se selecciona este empleado.

---

### LISTA DE EMPLEADOS

**Columnas:**
| Columna | Descripción |
|---|---|
| Nombre | — |
| Cédula | — |
| WhatsApp | — |
| Fecha de inicio | — |
| Salario mensual | — |
| Fecha de pago | — |
| Estado | Activo / Inactivo |
| Acciones | Ver, Editar, Eliminar (soft delete) |

---

## GESTIÓN DE INGRESOS

**Navbar del módulo:** `Ingresos del Día` | `Historial de Ingresos` | `Registrar Ingreso Manual`

---

### INGRESOS DEL DÍA

**Vista resumen del día actual:**

- Total ingresado hoy: $XXX.XX
- Desglose por método de pago: Efectivo / Transferencia / Otros
- Lista de ingresos del día (tabla, ver columnas en historial)

---

### HISTORIAL DE INGRESOS

**Filtros:**

- Rango de fechas
- Método de pago
- Empleado que registró
- Buscador por descripción o ID de contrato

**Columnas:**
| Columna | Descripción |
|---|---|
| Fecha y hora | — |
| Monto | — |
| Descripción | Ej: "Anticipo contrato #XXXXX" / "Abono contrato #XXXXX" |
| Método de pago | — |
| ID de contrato vinculado | Link al contrato (si aplica) |
| Registrado por | Nombre del empleado — permanente, no editable |
| Tipo | `Automático` / `Manual` |

**Regla de auditoría:** El campo "Registrado por" es permanente e ineditable en todos los registros.

---

### REGISTRAR INGRESO MANUAL

_(Para ingresos no vinculados a contratos)_

**Formulario:**
| Campo | Tipo | Obligatorio |
|---|---|---|
| Fecha y hora | DateTime (default: ahora) | ✅ |
| Monto | Numérico decimal | ✅ |
| Descripción | Texto | ✅ |
| Método de pago | Selector (configurado por tenant) | ✅ |

**Al guardar:** Se registra automáticamente el nombre del empleado que lo creó (auditoría).

---

## GESTIÓN DE EGRESO

**Navbar del módulo:** `Registrar Egreso` | `Historial de Egresos` | `Deudas con Proveedores`

---

### REGISTRAR EGRESO

**Formulario tipo factura:**

**Encabezado:**
| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| Categoría del egreso | Selector | ✅ | Opciones: Pago a proveedores / Pago a empleados / Arriendo de local / Servicios básicos / Otros |
| Modalidad | Radio: `Contado` / `Crédito` | ✅ | Si Crédito → habilita gestión de abonos |
| Método de pago | Selector | ✅ | — |

**Si categoría = "Pago a empleados":**

- Aparece selector: `Seleccionar empleado` (listado desde Gestión de Empleados)
- Al seleccionar → auto-completa el salario mensual del empleado (campo editable para pagos parciales, bonos o descuentos)

**Si categoría = "Pago a proveedores":**

- Aparece selector: `Seleccionar proveedor` (listado desde Gestión de Proveedores)

**Tabla de detalle (filas dinámicas):**
| Descripción/Detalle | Categoría | Cantidad | Precio Unitario | Subtotal |
|---|---|---|---|---|
| [texto libre] | [selector] | [numérico] | [numérico] | [auto-calculado] |

- Botón `+ Agregar fila`
- Total auto-calculado al pie

**Si modalidad = "Crédito":**

- Se crea una deuda registrada en "Deudas con Proveedores"
- Se habilitará el registro de abonos parciales

---

### HISTORIAL DE EGRESOS

**Filtros:** Por categoría, rango de fechas, método de pago, proveedor/empleado.

**Columnas:**
| Columna | Descripción |
|---|---|
| Fecha y hora | — |
| Categoría | — |
| Descripción | — |
| Proveedor / Empleado | Si aplica |
| Total | — |
| Modalidad | Contado / Crédito |
| Saldo pendiente | Si es crédito |
| Método de pago | — |
| Registrado por | Nombre del empleado |
| Acciones | Ver, Editar (si no está saldado) |

---

### DEUDAS CON PROVEEDORES

**Tabla principal:**
| Columna | Descripción |
|---|---|
| Nombre del proveedor | — |
| Deuda total original | — |
| Total abonado | — |
| Saldo pendiente | Calculado automáticamente |
| Acciones | Ver historial de pagos, Registrar nuevo abono |

**Al hacer clic en una fila → se despliega:**

- Historial completo de abonos (fecha, monto, método de pago)
- Formulario de nuevo abono:
  | Campo | Tipo | Obligatorio |
  |---|---|---|
  | Monto del abono | Numérico | ✅ |
  | Método de pago | Selector | ✅ |
  | Descripción | Texto | ❌ |

- Al llegar a saldo cero → se habilita botón `Finalizar pago completo` que archiva la deuda con estado **Saldado**.

---

## GESTIÓN DE PROVEEDORES

**Navbar del módulo:** `Lista de Proveedores` | `Nuevo Proveedor`

---

### NUEVO PROVEEDOR / EDITAR PROVEEDOR

**Selector tipo:** `Empresa` | `Persona Natural`

**Formulario Empresa:**
| Campo | Tipo | Obligatorio |
|---|---|---|
| RUC | Texto | ✅ |
| Nombre de la empresa | Texto | ✅ |
| Tipo de proveedor (qué provee) | Texto | ✅ |
| País | Selector | ✅ |
| Ciudad | Texto | ✅ |
| Dirección | Texto | ✅ |
| Nombre del encargado | Texto | ✅ |
| Celular del encargado | Teléfono | ✅ |
| Email del encargado | Email | ✅ |

**Formulario Persona Natural:**
| Campo | Tipo | Obligatorio |
|---|---|---|
| Cédula | Texto | ✅ |
| Nombres completos | Texto | ✅ |
| Tipo de proveedor (qué provee) | Texto | ✅ |
| País | Selector | ✅ |
| Ciudad | Texto | ✅ |
| Dirección | Texto | ✅ |
| Celular | Teléfono | ✅ |
| Email | Email | ✅ |

---

### LISTA DE PROVEEDORES

**Columnas:**
| Columna | Descripción |
|---|---|
| Nombre / Empresa | — |
| Tipo de proveedor | — |
| País / Ciudad | — |
| Celular / Email | — |
| Deuda activa | Monto si tiene crédito pendiente |
| Acciones | Ver, Editar, Eliminar |

---

## PEDIDOS DE LA TIENDA ONLINE

**Navbar del módulo:** `Pedidos Pendientes` | `Historial de Pedidos Online`

---

### PEDIDOS PENDIENTES

**Descripción:** Puerta de entrada entre la tienda pública y el sistema interno. Todo pedido online llega aquí antes de pasar a Gestión de Contratos.

**Alerta en tiempo real:** Al llegar un nuevo pedido → notificación inmediata al Admin Tenant y empleado vía WhatsApp.

**Tabla dinámica:**
| Columna | Descripción |
|---|---|
| ID de pedido | — |
| Nombre del cliente | — |
| Productos solicitados | Lista resumida |
| Fecha de entrega solicitada | — |
| Fecha en que se realizó el pedido | — |
| Monto total | — |
| Anticipo requerido (50%) | — |
| Acciones | Confirmar pago, Rechazar pedido |

**Acción `Confirmar pago`:**

- Abre formulario:
  | Campo | Tipo | Obligatorio |
  |---|---|---|
  | Monto del anticipo recibido | Numérico | ✅ |
  | Método de pago | Selector | ✅ |
- Al confirmar: el pedido pasa automáticamente a Gestión de Contratos con etiqueta **"Desde tienda online"** y estado **Reservado**
- Se crea registro automático de ingreso
- Se envía WhatsApp al cliente

**Acción `Rechazar pedido`:**

- Campo: motivo del rechazo (texto)
- El pedido pasa al historial con etiqueta **Rechazado**
- Se envía WhatsApp al cliente con notificación de rechazo y motivo
- No se elimina de la base de datos

---

### HISTORIAL DE PEDIDOS ONLINE

**Filtros:** Por fecha, estado (Confirmado / Rechazado), buscador por nombre o ID.

**Columnas:** ID de pedido, Nombre del cliente, Productos, Fecha solicitada, Estado, Acciones (solo Ver).

---

## CAJA

**Navbar del módulo:** `Vista del Día` | `Historial de Cierres`

---

### VISTA DEL DÍA

**Panel principal (datos del día actual, actualizados en tiempo real):**

| Sección                              | Descripción                                     |
| ------------------------------------ | ----------------------------------------------- |
| Total ingresos del día               | Suma de todos los ingresos registrados hoy      |
| Total egresos del día                | Suma de todos los egresos registrados hoy       |
| Balance del día                      | Ingresos − Egresos                              |
| Desglose ingresos por método de pago | Efectivo: $XX / Transferencia: $XX / Otros: $XX |
| Desglose egresos por categoría       | Tabla por categoría con subtotales              |
| Total en caja (acumulado)            | Calculado automáticamente                       |

**Botón `Cerrar Caja`:**

- Genera un resumen de cierre con todos los datos del día
- Registra quién realizó el cierre (auditoría)
- Bloquea la edición retroactiva del día cerrado

---

### HISTORIAL DE CIERRES

**Filtros:**

- Por día específico
- Rango de días (desde/hasta)
- Por semana
- Por mes
- Por año

**Columnas:**
| Columna | Descripción |
|---|---|
| Fecha | — |
| Total ingresos | — |
The above content does NOT show the entire file contents. If you need to view any lines of the file which were not shown to complete your task, call this tool again to view those lines.
