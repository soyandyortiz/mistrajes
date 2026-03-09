# CLAUDE.md

## Idioma

Responde siempre en español.

Este archivo proporciona orientación a Claude Code (claude.ai/code) al trabajar con el código de este repositorio.

## Resumen del proyecto

**Mis Trajes** — Plataforma SaaS multi-tenant para negocios de alquiler de trajes/disfraces, orientada al mercado ecuatoriano. Hay dos sub-proyectos:

- **Raíz (`/`)** — SPA principal con Vite + React (la app activa)
- **`/nextapp`** — Proyecto Next.js 16 separado (experimento/scaffold inicial; no es la app activa)

El código activo es la app Vite en la raíz.

## Comandos

### App principal (Vite/React — directorio raíz)

```bash
npm run dev       # Servidor de desarrollo (http://localhost:5173)
npm run build     # Build de producción
npm run preview   # Vista previa del build de producción
npm run lint      # ESLint
```

### App Next.js (directorio `/nextapp`)

```bash
cd nextapp
npm run dev       # Servidor de desarrollo Next.js
npm run build
npm run lint
```

### Probar la tienda de un tenant específico en local

Agregar `?t=<slug_del_tenant>` a la URL de desarrollo:

```
http://localhost:5173/?t=andino
```

## Arquitectura

### Modelo Multi-Tenant

El tenant se resuelve completamente en el cliente dentro de `src/App.jsx` según el hostname de la URL:

1. Parámetro `?t=<slug>` → modo prueba local
2. `<slug>.mistrajes.com` → tenant por subdominio
3. Cualquier otro dominio → dominio personalizado del tenant
4. `mistrajes.com` / `localhost` → landing/admin principal del SaaS

Cuando se detecta un slug, `useTenantStore.resolveTenant()` consulta Supabase y activa el **modo tienda** (renderiza `TiendaPublica` en lugar de la landing de marketing).

### Backend: Supabase (BaaS, sin backend propio)

- `src/lib/supabase.js` exporta dos clientes:
  - `supabase` — cliente con clave anon para operaciones normales (RLS activo)
  - `supabaseAdmin` — cliente con clave service role para el onboarding de tenants (bypass de RLS). Hardcodeado en el fuente por ser MVP/demo.
- Tablas clave: `tenants`, `perfiles_usuario`, `avisos_sistema`
- Auth: Supabase Auth; los perfiles de usuario extienden a los auth users via `perfiles_usuario` (incluye `rol`, `tenant_id`, `permisos`)

### Manejo de estado: Stores Zustand

- `authStore` — Sesión Supabase + perfil de usuario (join de `perfiles_usuario` con `tenants`). Se inicializa al montar la app y configura el listener `onAuthStateChange`. También llama a `tenantStore.setTenantFromAuth()` al iniciar sesión.
- `tenantStore` — Datos del tenant actual. Se llena via `resolveTenant(slug)` (tienda pública) o `setTenantFromAuth()` (área privada de admin).
- `registroNegocioStore` — Estado del formulario multi-paso de registro de negocio (3 pasos: datos del negocio → subdominio → confirmación).
- `themeStore` — Tema oscuro/claro, persistido con el middleware `persist` de Zustand. Se aplica estableciendo el atributo `data-theme` en `<html>`.

### Control de Acceso por Roles (RBAC)

Tres roles gestionados en `ProtectedRoute` y `DiseñoAdministracion`:

- `super_admin` → `/super-admin/*` (gestión global de la plataforma)
- `tenant_admin` → `/dashboard` y todos los módulos de gestión
- `tenant_empleado` → `/dashboard` + solo los módulos listados en `profile.permisos.modulos[]`

### Estructura de Rutas

Todas las rutas se definen en `src/App.jsx`. Dos modos principales:

- **Público/tienda** — `PublicLayout` (con `PublicNavbar`, `PublicFooter`, `WhatsAppWidget`) envuelve las páginas de marketing; en modo tienda lo reemplaza `TiendaPublica`
- **Privado/admin** — `DiseñoAdministracion` (sidebar colapsable + header sticky) envuelve todos los módulos de gestión via `<Outlet />`

### Sistema de Temas

Propiedades CSS personalizadas en `src/index.css` (Tailwind v4 via `@import "tailwindcss"`). Dos temas: `[data-theme="dark"]` (por defecto) y `[data-theme="light"]`. Todos los componentes usan variables CSS `var(--nombre-token)` — nunca colores hardcodeados. Los colores de badges de estado están centralizados en `src/utils/coreTheme.js` (`THEME_ESTADOS`, `obtenerBadgeEstado`).

### Patrón de Carga de Datos

Usar el hook `useTenantFetch` en cualquier componente que necesite datos del tenant:

```js
const { tenantId, authReady } = useTenantFetch();
useEffect(() => {
  if (authReady && tenantId) fetchData();
}, [authReady, tenantId]);
```

Esto evita condiciones de carrera con la inicialización del auth (donde `profile` es inicialmente `null`).

### Componentes de Layout Clave

- `src/components/layouts/DiseñoAdministracion.jsx` — Shell principal de admin. Gestiona sidebar, header, modal de suspensión, modal de avisos del sistema (tabla `avisos_sistema`) y navegación filtrada por rol.
- `src/components/layouts/ModuleLayout.jsx` — Envuelve módulos individuales con encabezado de título/descripción y navegación por tabs.
- `src/components/layouts/SubNavbar.jsx` — Sub-navegación dentro de módulos.

### Organización de Páginas

```
src/paginas/
  tienda/                # Tienda pública + páginas de marketing
  autenticacion/         # Inicio de sesión
  registro-negocio/      # Flujo de onboarding multi-paso
  administracion/        # Módulos de admin del tenant (Contratos, Productos, Piezas, Clientes, Finanzas, etc.)
  administrador-central/ # Páginas del super-admin
```
