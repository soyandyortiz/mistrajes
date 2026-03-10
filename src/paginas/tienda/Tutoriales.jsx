import { useState } from 'react';
import {
  PlayCircle,
  ChevronRight,
  ChevronDown,
  Clock,
  Menu,
  X,
  Database,
  FileText,
  DollarSign,
  Users,
  Store,
  CalendarDays,
  UserCog,
  LayoutDashboard,
  CheckCircle2,
} from 'lucide-react';

const modules = [
  {
    id: 'primeros-pasos',
    title: 'Primeros Pasos',
    icon: LayoutDashboard,
    lessons: [
      {
        id: 'intro-1',
        title: 'Tour por el Dashboard',
        duration: '5:24',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Recorre el panel de control principal: métricas en tiempo real de contratos abiertos, cartera de clientes, inventario activo y flujo de ingresos del mes. Aprende a usar los accesos rápidos y el widget de entregas del día.',
        keyPoints: [
          'Interpretar los 4 KPIs principales del dashboard',
          'Usar el widget de entregas del día',
          'Acceder a "Crear Contrato" y "Ver Tienda Online" desde el inicio',
        ],
      },
      {
        id: 'config-2',
        title: 'Configuración del Negocio',
        duration: '4:10',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Configura los datos esenciales de tu negocio: nombre, descripción, teléfono, dirección, moneda y parámetros regionales. Esta información aparece en tus contratos y tienda pública.',
        keyPoints: [
          'Completar los datos fiscales y de contacto',
          'Configurar moneda y parámetros regionales',
          'Aplicar cambios sin perder configuraciones previas',
        ],
      },
      {
        id: 'planes-3',
        title: 'Planes y Suscripción',
        duration: '2:50',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Entiende los planes disponibles (Básico, Profesional, Empresarial), sus diferencias de funcionalidad, y cómo realizar el pago de tu suscripción para mantener el acceso sin interrupciones.',
        keyPoints: [
          'Comparar funcionalidades por plan',
          'Realizar el pago de renovación',
          'Qué pasa si tu suscripción vence',
        ],
      },
    ],
  },
  {
    id: 'inventario',
    title: 'Inventario',
    icon: Database,
    lessons: [
      {
        id: 'prod-1',
        title: 'Registrar Productos (Trajes)',
        duration: '6:20',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Aprende a dar de alta trajes, vestidos y accesorios: nombre, categoría, precio, descuento y descripción. Incluye la carga de imágenes con conversión automática a WEBP y un límite de 5 MB por foto.',
        keyPoints: [
          'Completar ficha de producto con categoría y precio',
          'Subir y reordenar fotos (máx. 5 MB, formato WEBP automático)',
          'Vincular piezas y productos relacionados',
        ],
      },
      {
        id: 'prod-2',
        title: 'Activar e Inactivar Productos',
        duration: '2:40',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Gestiona el ciclo de vida de tu catálogo: cómo desactivar temporalmente un traje sin eliminarlo, consultarlo en la pestaña "Inactivos" y reactivarlo cuando esté disponible de nuevo.',
        keyPoints: [
          'Diferencia entre eliminar e inactivar',
          'Ver y buscar productos en cada pestaña',
          'Reactivar un producto inactivo',
        ],
      },
      {
        id: 'piezas-1',
        title: 'Gestionar Piezas y Elementos',
        duration: '5:00',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Las piezas son los componentes individuales de un traje (saco, pantalón, corbata, etc.). Aprende a crearlas, asignarles tallas con stock independiente y asociarlas a productos.',
        keyPoints: [
          'Crear una pieza con categoría y precio propio',
          'Agregar tallas (XS, S, M, L, XL, Estándar) con stock por talla',
          'Agregar tallas personalizadas',
        ],
      },
      {
        id: 'cat-1',
        title: 'Categorías y Subcategorías',
        duration: '3:20',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Organiza tu catálogo con una jerarquía de categorías y subcategorías. Una buena organización facilita la búsqueda en contratos y mejora la experiencia en tu tienda pública.',
        keyPoints: [
          'Crear y editar categorías principales',
          'Agregar subcategorías anidadas',
          'Reordenar visualmente el árbol de categorías',
        ],
      },
    ],
  },
  {
    id: 'contratos',
    title: 'Contratos',
    icon: FileText,
    lessons: [
      {
        id: 'cont-1',
        title: 'Crear un Nuevo Contrato',
        duration: '8:40',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Recorre el flujo de 4 pasos para generar un contrato de alquiler: selección de cliente, elección de productos y piezas, configuración de fechas, costos y anticipo, y generación del comprobante final.',
        keyPoints: [
          'Seleccionar o crear un cliente al vuelo',
          'Elegir productos y piezas con fechas de salida y devolución',
          'Configurar precio total, anticipo y garantía física',
        ],
      },
      {
        id: 'cont-2',
        title: 'Registrar Entrega al Cliente',
        duration: '3:30',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Cuando el cliente retira el traje, registra la entrega desde la lista de contratos activos. El sistema captura la garantía física entregada y actualiza el estado del contrato a "Entregado".',
        keyPoints: [
          'Localizar el contrato activo del cliente',
          'Registrar la garantía física recibida',
          'Cambio automático de estado a Entregado',
        ],
      },
      {
        id: 'cont-3',
        title: 'Registrar Devolución',
        duration: '4:00',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Al recibir el traje de vuelta, registra la devolución con notas de inspección. Si hubo daños, el sistema permite aplicar multas y calcular el saldo pendiente antes de cerrar el contrato.',
        keyPoints: [
          'Registrar notas de inspección del traje devuelto',
          'Aplicar cargos por daños o atraso',
          'Cierre del contrato y liberación del inventario',
        ],
      },
      {
        id: 'cont-4',
        title: 'Registrar un Abono',
        duration: '2:45',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Los clientes pueden pagar en parcialidades. Aprende a registrar abonos sobre contratos activos, seleccionar el método de pago y consultar el saldo pendiente actualizado.',
        keyPoints: [
          'Acceder al modal de abono desde contratos activos',
          'Ingresar monto y método de pago',
          'Consultar saldo restante del contrato',
        ],
      },
      {
        id: 'cont-5',
        title: 'Contratos con Problemas',
        duration: '3:50',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'La pestaña "Con Problemas" agrupa contratos con daños reportados, atrasos o multas pendientes. Aprende a gestionarlos, registrar acciones correctivas y anular contratos cuando sea necesario.',
        keyPoints: [
          'Identificar contratos con estados de alerta',
          'Registrar acciones correctivas o acuerdos',
          'Anular un contrato con motivo obligatorio',
        ],
      },
    ],
  },
  {
    id: 'calendario',
    title: 'Calendario',
    icon: CalendarDays,
    lessons: [
      {
        id: 'cal-1',
        title: 'Vista Mensual y Navegación',
        duration: '3:15',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'El calendario mensual muestra todas las entregas y devoluciones del mes con colores semafor­izados: azul (reservado), verde (entregado), rojo (con problemas). Navega entre meses y filtra por estado o cliente.',
        keyPoints: [
          'Navegar entre meses con los controles prev/next',
          'Leer el semáforo de colores por estado',
          'Filtrar por cliente o estado del contrato',
        ],
      },
      {
        id: 'cal-2',
        title: 'Entregas del Día',
        duration: '2:30',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Haz clic en cualquier fecha para ver el detalle de todos los contratos programados ese día: cliente, productos, hora de entrega y estado actual. Ideal para planificar la jornada.',
        keyPoints: [
          'Ver contratos programados para una fecha específica',
          'Acceder al detalle del contrato desde el calendario',
          'Usar la vista "Hoy" para el despacho diario',
        ],
      },
    ],
  },
  {
    id: 'clientes',
    title: 'Clientes',
    icon: Users,
    lessons: [
      {
        id: 'cli-1',
        title: 'Registrar un Cliente',
        duration: '3:40',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Agrega clientes a tu base de datos con sus datos de identificación (cédula o RUC), tipo de persona (natural o jurídica), provincia, dirección, teléfono y email para facilitar futuros contratos.',
        keyPoints: [
          'Completar datos de identificación y contacto',
          'Seleccionar tipo de documento (CI o RUC)',
          'Validación automática del número de documento',
        ],
      },
      {
        id: 'cli-2',
        title: 'Perfil e Historial del Cliente',
        duration: '4:10',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Desde el perfil de cada cliente puedes consultar todo su historial de contratos, montos pagados y deudas pendientes. También puedes editar sus datos o eliminarlo si no tiene contratos activos.',
        keyPoints: [
          'Consultar historial completo de contratos',
          'Editar datos de contacto y dirección',
          'Buscar clientes por nombre, documento o provincia',
        ],
      },
    ],
  },
  {
    id: 'tienda-online',
    title: 'Tienda Online',
    icon: Store,
    lessons: [
      {
        id: 'tienda-1',
        title: 'Configurar tu Tienda Pública',
        duration: '5:50',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Personaliza la tienda pública que ven tus clientes: nombre del negocio, descripción, logo, ícono de favicon, colores del tema y dominio personalizado. Los cambios se reflejan de inmediato en tu URL de tienda.',
        keyPoints: [
          'Subir logo e ícono de la tienda',
          'Personalizar colores y descripción del negocio',
          'Configurar dominio personalizado (si aplica)',
        ],
      },
      {
        id: 'tienda-2',
        title: 'Gestionar Pedidos Online',
        duration: '4:20',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Los clientes pueden hacer pedidos desde tu tienda pública. Revisa los pedidos pendientes, acepta o rechaza solicitudes, y consulta el historial de pedidos procesados.',
        keyPoints: [
          'Revisar pedidos pendientes en tiempo real',
          'Aceptar o rechazar un pedido con notificación',
          'Consultar historial de pedidos completados',
        ],
      },
    ],
  },
  {
    id: 'finanzas',
    title: 'Finanzas',
    icon: DollarSign,
    lessons: [
      {
        id: 'ing-1',
        title: 'Registrar y Consultar Ingresos',
        duration: '4:30',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Los ingresos de contratos se registran automáticamente. Aprende también a registrar ingresos manuales (ventas en efectivo, otros servicios) y a consultar el historial filtrado por fecha o método de pago.',
        keyPoints: [
          'Ver ingresos automáticos de contratos del día',
          'Registrar un ingreso manual con concepto y método de pago',
          'Filtrar historial por fecha y método de pago',
        ],
      },
      {
        id: 'egr-1',
        title: 'Registrar Egresos y Deudas',
        duration: '5:00',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Registra todos los gastos del negocio: pagos a proveedores, servicios, suministros y deudas pendientes. La pestaña "Deudas" te permite hacer seguimiento de lo que debes a cada proveedor.',
        keyPoints: [
          'Registrar un egreso con categoría y proveedor',
          'Gestionar deudas pendientes con proveedores',
          'Consultar historial de egresos con filtros',
        ],
      },
      {
        id: 'caja-1',
        title: 'Control de Caja Diaria',
        duration: '6:00',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'La caja consolida en tiempo real todos los ingresos y egresos del día. Consulta el saldo neto, el detalle de cada movimiento y el historial de cierres de los últimos 30 o 90 días.',
        keyPoints: [
          'Ver saldo neto del día (ingresos - egresos)',
          'Revisar todos los movimientos del día en detalle',
          'Consultar el historial diario de los últimos meses',
        ],
      },
      {
        id: 'comp-1',
        title: 'Comprobantes y Proformas',
        duration: '3:45',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Descarga e imprime comprobantes de contratos finalizados y proformas de cotizaciones. Útil para entregar documentación formal a tus clientes o para registros contables.',
        keyPoints: [
          'Buscar y descargar comprobantes de contratos',
          'Generar y enviar proformas de cotización',
          'Imprimir documentos en formato estándar',
        ],
      },
    ],
  },
  {
    id: 'equipo',
    title: 'Equipo y Permisos',
    icon: UserCog,
    lessons: [
      {
        id: 'emp-1',
        title: 'Agregar un Empleado',
        duration: '4:00',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Como administrador, puedes crear cuentas para tus empleados. El sistema crea automáticamente el usuario en Supabase Auth y lo vincula a tu negocio con el rol de empleado.',
        keyPoints: [
          'Ingresar nombre, email y rol del nuevo empleado',
          'Creación automática de cuenta de acceso',
          'Ver la lista de empleados activos',
        ],
      },
      {
        id: 'emp-2',
        title: 'Roles y Permisos por Módulo',
        duration: '3:30',
        youtubeId: 'dQw4w9WgXcQ',
        description: 'Controla exactamente a qué módulos tiene acceso cada empleado. Activa o desactiva permisos granulares: calendario, contratos, pedidos online, productos, piezas, categorías y clientes.',
        keyPoints: [
          'Diferencia entre tenant_admin y tenant_empleado',
          'Activar o desactivar módulos por empleado',
          'Los módulos de finanzas son exclusivos del admin',
        ],
      },
    ],
  },
];

const Tutoriales = () => {
  const [selectedTutorial, setSelectedTutorial] = useState(modules[0].lessons[0]);
  const [openSections, setOpenSections] = useState(['primeros-pasos']);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSection = (id) => {
    setOpenSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSelectLesson = (lesson) => {
    setSelectedTutorial(lesson);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const currentModuleIndex = modules.findIndex(m => m.lessons.some(l => l.id === selectedTutorial.id));
  const currentLessonIndex = modules[currentModuleIndex]?.lessons.findIndex(l => l.id === selectedTutorial.id);

  return (
    <div className="pt-20 min-h-screen text-[var(--text-primary)] flex flex-col lg:flex-row">

      {/* Mobile FAB */}
      <div className="lg:hidden fixed bottom-6 left-6 z-[60]">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="h-14 w-14 rounded-2xl bg-[var(--color-primary)] text-white shadow-2xl flex items-center justify-center border border-[var(--border-soft)]"
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`
          fixed lg:sticky top-[73px] left-0 h-[calc(100vh-73px)] w-full lg:w-[300px] xl:w-[340px]
          bg-[var(--bg-surface-3)]/95 backdrop-blur-3xl border-r border-[var(--border-soft)]
          overflow-y-auto z-50 transition-all duration-500 lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-5 lg:p-7 space-y-5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.45em] text-[var(--color-primary)] mb-1">Curriculum</p>
            <h3 className="text-xl font-black uppercase tracking-tighter text-[var(--text-primary)]">
              Módulos de <span className="text-gradient-guambra italic">Éxito</span>
            </h3>
          </div>

          <div className="space-y-1">
            {modules.map((module) => {
              const isOpen = openSections.includes(module.id);
              const hasActive = module.lessons.some(l => l.id === selectedTutorial.id);
              return (
                <div key={module.id}>
                  <button
                    onClick={() => toggleSection(module.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                      isOpen || hasActive
                        ? 'bg-[var(--bg-surface-2)] border-[var(--border-soft)]'
                        : 'bg-transparent border-transparent hover:bg-[var(--bg-surface-2)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center border shrink-0 ${
                        hasActive
                          ? 'bg-[var(--color-primary-dim)] border-[var(--color-primary-dim)] text-[var(--color-primary)]'
                          : 'bg-[var(--bg-surface-3)] border-[var(--border-soft)] text-[var(--text-muted)]'
                      }`}>
                        <module.icon className="h-3.5 w-3.5" />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${hasActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                        {module.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-black text-[var(--text-muted)] opacity-50">{module.lessons.length}</span>
                      {isOpen
                        ? <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                        : <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-50" />
                      }
                    </div>
                  </button>

                  <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="pl-3 pt-1 pb-2 space-y-0.5">
                      {module.lessons.map((lesson, idx) => (
                        <button
                          key={lesson.id}
                          onClick={() => handleSelectLesson(lesson)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-2.5 transition-colors group ${
                            selectedTutorial.id === lesson.id
                              ? 'bg-[var(--color-primary-dim)] border border-[var(--color-primary-dim)]'
                              : 'hover:bg-[var(--bg-surface-2)] border border-transparent'
                          }`}
                        >
                          <span className={`text-[9px] font-black mt-0.5 shrink-0 w-4 ${selectedTutorial.id === lesson.id ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]'}`}>
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className={`text-[10px] font-bold uppercase tracking-wider leading-tight ${selectedTutorial.id === lesson.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                              {lesson.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Clock className="h-2.5 w-2.5 text-[var(--text-muted)] shrink-0" />
                              <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">{lesson.duration}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 lg:p-14 xl:p-20 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-10">

          {/* Breadcrumb */}
          <div className="flex items-center gap-3 animate-in fade-in duration-700">
            <div className="h-px w-8 bg-[var(--color-primary-dim)]" />
            <span className="text-[9px] font-black uppercase tracking-[0.45em] text-[var(--color-primary)]">
              {modules[currentModuleIndex]?.title} · Lección {currentLessonIndex + 1}
            </span>
          </div>

          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-[var(--text-primary)] animate-in slide-in-from-left duration-700 leading-tight">
              {selectedTutorial.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-surface-2)] border border-[var(--border-soft)]">
                {(() => { const Mod = modules[currentModuleIndex]?.icon; return Mod ? <Mod className="h-3 w-3 text-[var(--color-primary)]" /> : null; })()}
                {modules[currentModuleIndex]?.title}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" /> {selectedTutorial.duration}
              </div>
            </div>
          </div>

          {/* Video Player */}
          <div className="relative group animate-in zoom-in-95 duration-700">
            <div className="absolute inset-0 bg-[var(--color-primary-dim)] blur-[80px] rounded-full opacity-70 pointer-events-none" />
            <div className="relative aspect-video w-full bg-black rounded-2xl border border-[var(--border-soft)] overflow-hidden shadow-2xl">
              <iframe
                key={selectedTutorial.id}
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${selectedTutorial.youtubeId}?autoplay=0&rel=0`}
                title={selectedTutorial.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          {/* Description + Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">

            {/* Left: description + key points */}
            <div className="lg:col-span-2 space-y-8 animate-in fade-in duration-700">
              <div className="space-y-3">
                <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-primary)]">Resumen</p>
                <div className="h-px bg-[var(--border-soft)]" />
                <p className="text-base text-[var(--text-secondary)] leading-relaxed border-l-2 border-[var(--color-primary-dim)] pl-5">
                  {selectedTutorial.description}
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--text-muted)]">Lo que aprenderás</p>
                <div className="space-y-2">
                  {selectedTutorial.keyPoints.map((point) => (
                    <div key={point} className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)]">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-primary)] mt-0.5 shrink-0" />
                      <span className="text-xs font-semibold text-[var(--text-secondary)] leading-snug">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: help + status */}
            <div className="lg:col-span-1 space-y-4 animate-in slide-in-from-right duration-700">
              <div className="p-6 rounded-2xl border border-[var(--color-primary-dim)] bg-[var(--color-primary-dim)]/20 space-y-4">
                <p className="text-xs font-black uppercase tracking-tighter text-[var(--text-primary)]">¿Necesitas ayuda?</p>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Nuestros expertos están disponibles para asistirte con configuraciones avanzadas.
                </p>
                <button className="btn-guambra-primary w-full !py-3 !text-xs shadow-lg shadow-[var(--color-primary-glow)]">
                  Solicitar Soporte
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Servicio en Línea</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider leading-relaxed">
                  Documentación actualizada · v4.2.1
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>

    </div>
  );
};

export default Tutoriales;
