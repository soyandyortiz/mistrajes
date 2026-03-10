import { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet, Link } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import DiseñoAdministracion from "./components/layouts/DiseñoAdministracion";
import FlujoRegistro from "./paginas/registro-negocio/FlujoRegistro";
import RegistroExitoso from "./paginas/registro-negocio/RegistroExitoso";
import IniciarSesion from "./paginas/autenticacion/IniciarSesion";
import GestionNegocios from "./paginas/administrador-central/GestionNegocios";
import GestionTutoriales from "./paginas/administrador-central/GestionTutoriales";
import SolicitudesRegistro from "./paginas/administrador-central/SolicitudesRegistro";
import Landing from "./paginas/tienda/Landing";
import AdminDashboard from "./paginas/administracion/AdminDashboard";
import GestionContratos from "./paginas/administracion/GestionContratos";

import Piezas from "./paginas/administracion/Mantenimiento/Piezas";
import Productos from "./paginas/administracion/Mantenimiento/Productos";
import Categorias from "./paginas/administracion/Mantenimiento/Categorias";
import Clientes from "./paginas/administracion/Mantenimiento/Clientes";
import Proveedores from "./paginas/administracion/Mantenimiento/Proveedores";
import Empleados from "./paginas/administracion/Mantenimiento/Empleados";
import CajaGeneral from "./paginas/administracion/Finanzas/CajaGeneral";
import TiendaPublica from "./paginas/tienda/TiendaPublica";
import FlujoReservaWeb from "./paginas/tienda/FlujoReservaWeb";
import Tutoriales from "./paginas/tienda/Tutoriales";
import Caracteristicas from "./paginas/tienda/Caracteristicas";
import TerminosCondiciones from "./paginas/tienda/TerminosCondiciones";
import PoliticaDatos from "./paginas/tienda/PoliticaDatos";
import PublicNavbar from "./components/navigation/PublicNavbar";
import PublicFooter from "./components/navigation/PublicFooter";
import WhatsAppWidget from "./components/navigation/WhatsAppWidget";
import { Loader2 } from "lucide-react";
import { useTenantStore } from "./stores/tenantStore";
import ModuleLayout from "./components/layouts/ModuleLayout";

// Placholders for missing routes if they exist
import Ingresos from "./paginas/administracion/Finanzas/Ingresos";
import Egresos from "./paginas/administracion/Finanzas/Egresos";
import PedidosOnline from "./paginas/administracion/Operaciones/PedidosOnline";
import TiendaConfiguracion from "./paginas/administracion/Operaciones/TiendaConfiguracion";
import NuevoContrato from "./paginas/administracion/Operaciones/NuevoContrato";
import Comprobantes from "./paginas/administracion/Operaciones/Comprobantes";
import Calendario from "./paginas/administracion/Operaciones/Calendario";
import Planes from "./paginas/administracion/Planes";
import PagarPlan from "./paginas/administracion/PagarPlan";
import ConfiguracionesGenerales from "./paginas/administracion/Operaciones/ConfiguracionesGenerales";

// Capa de Layout para Páginas Públicas (Marketing)
const PublicLayout = () => (
  <div className="flex flex-col min-h-screen transition-colors duration-500">
    <PublicNavbar />
    <main className="flex-1">
      <Outlet />
    </main>
    <PublicFooter />
    <WhatsAppWidget />
  </div>
);

// Layout reducido para Tutoriales (sin footer completo, solo copyright)
const TutorialesLayout = () => (
  <div className="flex flex-col min-h-screen transition-colors duration-500">
    <PublicNavbar />
    <main className="flex-1">
      <Outlet />
    </main>
    <div className="py-5 border-t border-[var(--border-soft)] flex items-center justify-center gap-3">
      <span className="text-[9px] font-black text-[var(--text-muted)] opacity-50 uppercase tracking-[0.4em]">
        © 2026 GUAMBRAWEB ENTERPRISE • ECUADOR
      </span>
    </div>
    <WhatsAppWidget />
  </div>
);

// Capa Global de Efectos (Fondo Andino + Cursor)
const GlobalEffects = () => {
  const cursorRef = useRef(null);

  useEffect(() => {
    const mainCursor = cursorRef.current;
    let animationFrameId = null;

    const moveCursor = (e) => {
      if (mainCursor) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(() => {
          mainCursor.style.left = `${e.clientX}px`;
          mainCursor.style.top = `${e.clientY}px`;
        });
      }
    };

    window.addEventListener("mousemove", moveCursor);
    return () => {
      window.removeEventListener("mousemove", moveCursor);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <div ref={cursorRef} className="cursor-follower" />
      <div className="andean-bg">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="andean-shape"
            style={{
              width: `${150 + i * 50}px`,
              height: `${150 + i * 50}px`,
              left: `${i * 20 - 10}%`,
              top: `${(i % 3) * 35}%`,
              animationDelay: `${i * -5}s`,
              opacity: 0.03 + i * 0.01,
            }}
          />
        ))}
      </div>
    </>
  );
};

// Controlador Global de Metadata (Favicon y Título)
const TenantMetaEffects = () => {
  const { tenant } = useTenantStore();

  useEffect(() => {
    if (!tenant) return;

    const config = tenant.configuracion_tienda || {};
    
    // 1. Título de la pestaña
    const title = config.nombre_negocio || tenant.nombre_negocio || 'MisTrajes SaaS';
    document.title = title;

    // 2. Favicon
    if (config.icono_url) {
      // Buscar todos los links de icono existentes
      const iconLinks = document.querySelectorAll("link[rel~='icon']");
      
      if (iconLinks.length > 0) {
        // Actualizar los existentes
        iconLinks.forEach(link => {
          link.href = config.icono_url;
          link.removeAttribute('type'); // CRÍTICO: Si era image/svg+xml, fallará al validar un base64 de PNG/JPG
        });
      } else {
        // Si no hay ninguno, crear los básicos
        const types = ['icon', 'shortcut icon', 'apple-touch-icon'];
        types.forEach(rel => {
          const newLink = document.createElement('link');
          newLink.rel = rel;
          newLink.href = config.icono_url;
          document.head.appendChild(newLink);
        });
      }
    }
  }, [tenant]);

  return null; // Componente invisible
};

// Envolvedor de Ruta Protegida
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuthStore();

  if (loading)
    return (
      <div className="min-h-screen flex justify-center items-center bg-[var(--bg-page)]">
        <Loader2 className="animate-spin h-8 w-8 text-[var(--color-primary)]" />
      </div>
    );
  if (!user || !profile) return <Navigate to="/iniciar-sesion" replace />;

  // Si tiene un rol pero no está dentro de los permitidos para esa ruta
  if (allowedRoles && !allowedRoles.includes(profile.rol)) {
    // Si es superadmin o admin, mandarlo a su dashboard respectivo
    if (profile.rol === "super_admin")
      return <Navigate to="/super-admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  // Verificar permisos específicos de módulo para empleados
  const currentPath = window.location.pathname;
  if (profile.rol === "tenant_empleado" && currentPath !== "/dashboard") {
    // Extraer el módulo de la ruta (ej: /caja/hoy -> caja)
    const moduloActual = currentPath.split("/")[1];
    const misPermisos = profile.permisos?.modulos || [];

    // Si intenta acceder a un módulo que requiere admin (según App.jsx) o que no tiene permitido individualmente
    // Note: App.jsx already handles the "allowedRoles" check above, so here we focus on individual module toggles
    if (moduloActual && !misPermisos.includes(moduloActual)) {
      // Permitir acceso a rutas básicas o comunes si es necesario,
      // pero aquí restringimos si no está explícitamente en sus permisos.
      // Listamos módulos que son "compartidos" pero requieren permiso individual
      const modulosRestringibles = [
        "calendario",
        "contratos",
        "pedidos-online",
        "productos",
        "piezas",
        "categorias",
        "clientes",
      ];

      if (modulosRestringibles.includes(moduloActual)) {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  return children;
};


function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const { tenant, error: tenantError, resolveTenant } = useTenantStore();
  const [isStorefrontMode, setIsStorefrontMode] = useState(false);

  useEffect(() => {
    initializeAuth();

    // --> LÓGICA PROFESIONAL DE RESOLUCIÓN DE TENANT <--
    const host = window.location.hostname;
    const searchParams = new URLSearchParams(window.location.search);
    const tenantParam = searchParams.get("t"); // Para probar localmente ej: localhost:5173/?t=andino

    let slug = null;
    let isStorefront = false;

    if (tenantParam) {
      // 1. Prioridad 1: Parámetro en URL para pruebas fáciles
      slug = tenantParam;
      isStorefront = true;
    } else if (host !== "localhost" && host !== "127.0.0.1") {
      // 2. Prioridad 2: Subdominio en producción o dominio personalizado
      if (host === "mistrajes.com" || host === "www.mistrajes.com") {
        isStorefront = false; // Raíz del sistema SaaS
      } else if (host.endsWith(".mistrajes.com")) {
        // Subdominio (ej: andino.mistrajes.com)
        slug = host.replace(".mistrajes.com", ""); // Esto deja solo el subdominio
        isStorefront = true;
      } else {
        // Dominio personalizado del inquilino (ej: vestidoslucy.com)
        slug = host;
        isStorefront = true;
      }
    }

    setIsStorefrontMode(isStorefront);

    // Si hay un slug detectado, intentar resolver la tienda.
    // Si no, NO forzamos nada y se muestra la Landing Page Principal.
    if (slug) {
      resolveTenant(slug);
    }
    // NOTA: Para probar la tienda de un tenant específico en tu PC, usa: http://localhost:5173/?t=el_nombre_del_tenant
  }, [initializeAuth, resolveTenant]);

  return (
    <BrowserRouter>
      <GlobalEffects />
      <TenantMetaEffects />
      <Routes>
        {/* Rutas Públicas de Marketing (SaaS) */}
        {!isStorefrontMode && (
          <Route element={<PublicLayout />}>
            <Route index element={<Landing />} />
            <Route path="caracteristicas" element={<Caracteristicas />} />
            <Route path="terminos-condiciones" element={<TerminosCondiciones />} />
            <Route path="politica-datos" element={<PoliticaDatos />} />
          </Route>
        )}

        {/* Tutoriales con layout reducido (solo copyright) */}
        {!isStorefrontMode && (
          <Route element={<TutorialesLayout />}>
            <Route path="tutoriales" element={<Tutoriales />} />
          </Route>
        )}

        {/* Ruta de Tienda Pública (Storefront) */}
        {isStorefrontMode && (
          <Route path="/" element={<TiendaPublica />} />
        )}
        <Route path="/reserva-web" element={<FlujoReservaWeb />} />

        {/* Rutas de Autenticación y Registro */}
        <Route path="/iniciar-sesion" element={<IniciarSesion />} />
        <Route path="/registro-negocio" element={<FlujoRegistro />} />
        <Route path="/registro-negocio/exito" element={<RegistroExitoso />} />

        {/* Rutas Privadas del Sistema de Gestión (Admin / Empleados) con Layout Principal */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["tenant_admin", "tenant_empleado"]}>
              <DiseñoAdministracion />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<AdminDashboard />} />

          {/* Configuraciones Generales (Ambos) */}
          <Route
            path="/configuraciones"
            element={
              <ModuleLayout
                title="Configuración"
                description="Ajustes de tu negocio y tienda online"
                tabs={[]}
              />
            }
          >
            <Route index element={
              <div className="p-4 md:p-8">
                <ConfiguracionesGenerales />
              </div>
            } />
          </Route>

          {/* Planes y Suscripciones (Ambos) */}
          <Route path="/planes" element={<Planes />} />
          <Route path="/planes/pagar" element={<PagarPlan />} />

          {/* Contratos (Ambos) */}
          <Route
            path="/contratos"
            element={
              <ModuleLayout
                title="Gestión de Contratos"
                description="Administra todos tus contratos de alquiler"
                tabs={[]}
              />
            }
          >
            <Route index element={<GestionContratos />} />
            <Route path="nuevo" element={<NuevoContrato />} />
          </Route>

          {/* Trajes/Productos (Ambos) */}
          <Route
            path="/productos"
            element={
              <ModuleLayout
                title="Catálogo de Trajes"
                description="Administra tu inventario de trajes y disfraces"
                tabs={[]}
              />
            }
          >
            <Route
              index
              element={<Navigate to="/productos/activos" replace />}
            />
            <Route path="activos" element={<Productos />} />
            <Route
              path="inactivos"
              element={
                <div className="p-6 text-white text-center">
                  Productos Inactivos
                </div>
              }
            />
            <Route
              path="nuevo"
              element={
                <div className="p-6 text-white text-center">Nuevo Producto</div>
              }
            />
          </Route>

          {/* Piezas/Elementos (Ambos) */}
          <Route
            path="/piezas"
            element={
              <ModuleLayout
                title="Piezas y Elementos"
                description="Gestiona las piezas individuales de tus trajes"
                tabs={[]}
              />
            }
          >
            <Route index element={<Navigate to="/piezas/activas" replace />} />
            <Route path="activas" element={<Piezas />} />
            <Route
              path="inactivas"
              element={
                <div className="p-6 text-white text-center">
                  Piezas Inactivas
                </div>
              }
            />
            <Route
              path="nueva"
              element={
                <div className="p-6 text-white text-center">Nueva Pieza</div>
              }
            />
          </Route>

          {/* Categorías y Subcategorías (Ambos) */}
          <Route
            path="/categorias"
            element={
              <ModuleLayout
                title="Categorías"
                description="Organiza el catálogo de tus productos y piezas"
                tabs={[]}
              />
            }
          >
            <Route index element={<Categorias />} />
          </Route>

          {/* Clientes (Ambos) */}
          <Route
            path="/clientes"
            element={
              <ModuleLayout
                title="Clientes"
                description="Base de datos de tus clientes"
                tabs={[]}
              />
            }
          >
            <Route index element={<Navigate to="lista" replace />} />
            <Route path="lista" element={<Clientes />} />
            <Route
              path="nuevo"
              element={
                <div className="p-6 text-white text-center">Nuevo Cliente</div>
              }
            />
          </Route>

          {/* Empleados (Solo Admin) */}
          <Route
            path="/empleados"
            element={
              <ProtectedRoute allowedRoles={["tenant_admin"]}>
                <ModuleLayout
                  title="Empleados"
                  description="Gestiona tu equipo de trabajo"
                  tabs={[]}
                />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/empleados/lista" replace />} />
            <Route path="lista" element={<Empleados />} />
            <Route
              path="nuevo"
              element={
                <div className="p-6 text-white text-center">Nuevo Empleado</div>
              }
            />
          </Route>

          {/* Ingresos (Solo Admin) */}
          <Route
            path="/ingresos"
            element={
              <ProtectedRoute allowedRoles={["tenant_admin"]}>
                <ModuleLayout
                  title="Ingresos"
                  description="Registro de todos los ingresos del negocio"
                  tabs={[]}
                />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/ingresos/hoy" replace />} />
            <Route path="hoy" element={<Ingresos />} />
            <Route
              path="historial"
              element={
                <div className="p-6 text-white text-center">
                  Historial Ingresos
                </div>
              }
            />
            <Route
              path="manual"
              element={
                <div className="p-6 text-white text-center">Ingreso Manual</div>
              }
            />
          </Route>

          {/* Egresos (Solo Admin) */}
          <Route
            path="/egresos"
            element={
              <ProtectedRoute allowedRoles={["tenant_admin"]}>
                <ModuleLayout
                  title="Egresos"
                  description="Registro de gastos y pagos del negocio"
                  tabs={[]}
                />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="nuevo" replace />} />
            <Route path="nuevo" element={<Egresos initialTab="registrar" />} />
            <Route
              path="historial"
              element={<Egresos initialTab="historial" />}
            />
            <Route path="deudas" element={<Egresos initialTab="deudas" />} />
          </Route>

          {/* Proveedores (Solo Admin) */}
          <Route
            path="/proveedores"
            element={
              <ProtectedRoute allowedRoles={["tenant_admin"]}>
                <ModuleLayout
                  title="Proveedores"
                  description="Directorio de tus proveedores"
                  tabs={[]}
                />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="lista" replace />} />
            <Route path="lista" element={<Proveedores />} />
            <Route
              path="nuevo"
              element={
                <div className="p-6 text-white text-center">
                  Nuevo Proveedor
                </div>
              }
            />
          </Route>

          {/* Tienda Online (Ambos) */}
          <Route
            path="/pedidos-online"
            element={
              <ModuleLayout
                title="Pedidos Online"
                description="Pedidos recibidos desde tu tienda pública"
                tabs={[]}
              />
            }
          >
            <Route
              index
              element={<Navigate to="/pedidos-online/pendientes" replace />}
            />
            <Route path="pendientes" element={<PedidosOnline />} />
            <Route
              path="historial"
              element={
                <div className="p-6 text-white text-center">Historial</div>
              }
            />
          </Route>

          {/* Caja (Solo Admin) */}
          <Route
            path="/caja"
            element={
              <ProtectedRoute allowedRoles={["tenant_admin"]}>
                <ModuleLayout
                  title="Caja Diaria"
                  description="Control del flujo de caja por día"
                  tabs={[]}
                />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="hoy" replace />} />
            <Route path="hoy" element={<CajaGeneral initialTab="dia" />} />
            <Route
              path="historial"
              element={<CajaGeneral initialTab="historial" />}
            />
          </Route>

          {/* Comprobantes (Solo Admin) */}
          <Route
            path="/comprobantes"
            element={
              <ProtectedRoute allowedRoles={["tenant_admin"]}>
                <ModuleLayout
                  title="Comprobantes"
                  description="Documentos generados"
                  tabs={[]}
                />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="lista" replace />} />
            <Route path="lista" element={<Comprobantes />} />
            <Route
              path="proformas"
              element={
                <div className="p-6 text-white text-center">Proformas</div>
              }
            />
          </Route>

          {/* Calendario (Ambos) */}
          <Route
            path="/calendario"
            element={
              <ModuleLayout
                title="Calendario"
                description="Vista semaforizada de entregas y devoluciones"
                tabs={[]}
              />
            }
          >
            <Route index element={<Navigate to="mes" replace />} />
            <Route
              path="mes"
              element={
                <div className="min-h-[600px]">
                  <Calendario />
                </div>
              }
            />
            <Route
              path="hoy"
              element={
                <div className="p-6 text-white text-center">
                  Contratos de hoy
                </div>
              }
            />
          </Route>

          <Route
            path="*"
            element={
              <div className="p-10 text-center text-white/50 animate-pulse">
                En Construcción...
              </div>
            }
          />
        </Route>

        {/* Rutas Super Admin */}
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <DiseñoAdministracion />
            </ProtectedRoute>
          }
        >
           <Route index element={<Navigate to="negocios" replace />} />
           <Route path="negocios" element={<GestionNegocios initialTab="tenants" />} />
           <Route path="pedidos" element={<GestionNegocios initialTab="pedidos" />} />
           <Route path="avisos" element={<GestionNegocios initialTab="avisos" />} />
           <Route path="tutoriales" element={<GestionTutoriales />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
