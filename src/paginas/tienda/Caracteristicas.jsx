import {
  ShieldCheck,
  Zap,
  TrendingUp,
  Users,
  Database,
  Globe,
  ShoppingCart,
  FileText,
  CreditCard,
  PieChart,
  Layout,
  Bell,
  ArrowRight,
  Store,
  Clock,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Caracteristicas = () => {
  const modules = [
    {
      id: 'ventas',
      title: 'Ventas y Reservas',
      icon: ShoppingCart,
      description: 'Cierra acuerdos en segundos y mantén el control total de cada transacción.',
      features: [
        {
          title: 'Contratos Digitales',
          benefit: 'Protege tu inversión con términos legales claros generados automáticamente para cada cliente.',
          subFeatures: ['Generación PDF inmediata', 'Firmas personalizables', 'Cláusulas dinámicas']
        },
        {
          title: 'Reservas Anticipadas',
          benefit: 'Asegura la disponibilidad futura y evita el sobre-alquiler con nuestro calendario inteligente.',
          subFeatures: ['Bloqueo de fechas', 'Control de depósitos', 'Estados de reserva']
        },
        {
          title: 'Pagos Multicanal',
          benefit: 'Registra cobros en efectivo, tarjeta o transferencia con conciliación inmediata.',
          subFeatures: ['Historial de pagos', 'Saldos pendientes', 'Recibos digitales']
        }
      ]
    },
    {
      id: 'calendario',
      title: 'Calendario Semaforizado',
      icon: Calendar,
      description: 'Visualiza el estado de cada pedido de un vistazo. Cuatro colores, cero confusión.',
      features: [
        {
          title: 'Verde — Pedidos Pendientes',
          benefit: 'Identifica de inmediato qué pedidos están confirmados y esperan ser despachados a tu cliente.',
          subFeatures: ['Alertas de preparación', 'Fechas de entrega', 'Asignación de prendas'],
          dotColor: 'bg-emerald-500'
        },
        {
          title: 'Amarillo — Pedido Despachado',
          benefit: 'Sigue en tiempo real qué artículos ya salieron de tu local y están en manos del cliente.',
          subFeatures: ['Fecha de salida', 'Fecha límite de devolución', 'Recordatorios automáticos'],
          dotColor: 'bg-amber-400'
        },
        {
          title: 'Rojo — Devuelto con Problemas',
          benefit: 'Registra y gestiona devoluciones con daños, retrasos o cobros pendientes por resolver.',
          subFeatures: ['Registro de daños', 'Cobros de penalidad', 'Notificación al cliente'],
          dotColor: 'bg-red-500'
        },
        {
          title: 'Gris — Devuelto sin Problemas',
          benefit: 'Cierra el ciclo: el artículo volvió en perfecto estado y ya está disponible para el siguiente pedido.',
          subFeatures: ['Historial del artículo', 'Stock liberado', 'Depósito devuelto'],
          dotColor: 'bg-gray-400'
        }
      ]
    },
    {
      id: 'inventario',
      title: 'Inventario Profesional',
      icon: Database,
      description: 'Tu catálogo bajo control total, desde la pieza más pequeña hasta el traje principal.',
      features: [
        {
          title: 'Control por Tallas',
          benefit: 'Encuentra exactamente lo que tu cliente necesita filtrando por talla, color y estado.',
          subFeatures: ['Variantes ilimitadas', 'Fotos de alta calidad', 'QR para escaneo rápido']
        },
        {
          title: 'Gestión de Piezas',
          benefit: 'Combina elementos para crear conjuntos completos sin perder el rastro de la disponibilidad individual.',
          subFeatures: ['Kits personalizados', 'Accesorios asociados', 'Mantenimiento preventivo']
        },
        {
          title: 'Alertas de Stock',
          benefit: 'Recibe notificaciones cuando un traje necesite limpieza, reparación o esté por agotarse.',
          subFeatures: ['Detección de conflictos', 'Log de lavandería', 'Alertas de retraso']
        }
      ]
    },
    {
      id: 'clientes',
      title: 'CRM y Clientes',
      icon: Users,
      description: 'Convierte visitas ocasionales en clientes recurrentes con perfiles detallados.',
      features: [
        {
          title: 'Historial de Rentas',
          benefit: 'Conoce los gustos de tus clientes y sus tallas registradas para una atención personalizada.',
          subFeatures: ['Preferencias de estilo', 'Medidas guardadas', 'Notas internas']
        },
        {
          title: 'Notificaciones Automáticas',
          benefit: 'Reduce el retraso en devoluciones con recordatorios automáticos vía WhatsApp o Email.',
          subFeatures: ['Avisos de vencimiento', 'Promociones segmentadas', 'Confirmaciones de reserva']
        }
      ]
    },
    {
      id: 'finanzas',
      title: 'Finanzas y Reportes',
      icon: PieChart,
      description: 'Toma decisiones basadas en datos reales, no en suposiciones.',
      features: [
        {
          title: 'Cierre de Caja',
          benefit: 'Evita descuadres al final del día con arqueos automáticos y registro de egresos.',
          subFeatures: ['Conciliación bancaria', 'Reportes de turno', 'Control de gastos']
        },
        {
          title: 'Métricas de Rentabilidad',
          benefit: 'Identifica qué productos se alquilan más y cuáles generan mayor beneficio neto.',
          subFeatures: ['ROI por producto', 'Proyecciones de flujo', 'Gráficos comparativos']
        }
      ]
    }
  ];

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="pt-32 pb-20 px-6 min-h-screen text-[var(--text-primary)]">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <header className="mb-24 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-primary-dim)] border border-[var(--border-soft)] text-[10px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)]">
            <Zap className="h-3 w-3" /> Ecosistema Completo
          </div>
          <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none text-[var(--text-primary)]">
            Todo lo que tu <br />
            <span className="text-gradient-guambra italic">Negocio Necesita</span>
          </h1>
          <p className="text-[var(--text-secondary)] opacity-70 text-xl max-w-2xl mx-auto font-medium leading-relaxed">
            Hemos diseñado cada módulo pensando en la eficiencia operativa y el crecimiento de tu rentabilidad.
          </p>
        </header>

        {/* Anchor Navigation */}
        <div className="sticky top-[90px] z-40 mb-20 bg-[var(--bg-surface-2)]/80 backdrop-blur-xl border border-[var(--border-soft)] p-2 rounded-2xl hidden md:flex items-center justify-center gap-2 max-w-fit mx-auto shadow-2xl">
          {modules.map((module) => (
            <button
              key={module.id}
              onClick={() => scrollToSection(module.id)}
              className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-3)] transition-all"
            >
              {module.title}
            </button>
          ))}
        </div>

        {/* Modules Sections */}
        <div className="space-y-40">
          {modules.map((module, idx) => (
            <section key={module.id} id={module.id} className="scroll-mt-40">
              <div className={`grid grid-cols-1 lg:grid-cols-12 gap-16 items-start`}>
                
                {/* Module Header */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-48">
                  <div className="h-16 w-16 rounded-3xl bg-[var(--color-primary-dim)] border border-[var(--color-primary-dim)] flex items-center justify-center">
                    <module.icon className="h-8 w-8 text-[var(--color-primary)]" />
                  </div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter leading-none text-[var(--text-primary)]">{module.title}</h2>
                  <p className="text-[var(--text-secondary)] opacity-70 text-lg leading-relaxed">{module.description}</p>
                  <div className="pt-4 flex gap-2">
                    <div className="h-1 w-12 bg-[var(--color-primary)] rounded-full" />
                    <div className="h-1 w-4 bg-[var(--border-soft)] rounded-full" />
                    <div className="h-1 w-2 bg-[var(--bg-surface-3)] rounded-full" />
                  </div>
                </div>

                {/* Features Grid */}
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {module.features.map((feature, fIdx) => (
                    <div key={fIdx} className="glass-card p-10 group hover:border-[var(--color-primary)] transition-all">
                      <div className="flex items-center justify-between mb-8">
                         <div className={`p-3 rounded-2xl border transition-all ${
                           feature.dotColor
                             ? 'bg-[var(--bg-surface-3)] border-[var(--border-soft)]'
                             : 'bg-[var(--bg-surface-3)] border-[var(--border-soft)] group-hover:bg-[var(--color-primary-dim)] group-hover:border-[var(--color-primary)]'
                         }`}>
                           {feature.dotColor
                             ? <div className={`h-5 w-5 rounded-full ${feature.dotColor} shadow-lg`} />
                             : <CheckCircle2 className="h-5 w-5 text-[var(--color-primary)]" />
                           }
                         </div>
                         <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Funcionalidad</span>
                      </div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter mb-4 text-[var(--text-primary)]">{feature.title}</h3>
                      <p className="text-sm text-[var(--text-secondary)] opacity-70 leading-relaxed mb-8">
                        {feature.benefit}
                      </p>
                      <ul className="space-y-3">
                        {feature.subFeatures.map((sub, sIdx) => (
                          <li key={sIdx} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                            <div className="h-1 w-1 bg-[var(--color-primary)] rounded-full" />
                            {sub}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Global Stats / Trust Section */}
        <section className="mt-40 py-24 border-y border-[var(--border-soft)]">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
              {[
                { val: '+50', lab: 'Módulos Activos' },
                { val: '99.9%', lab: 'Uptime Garantizado' },
                { val: '24/7', lab: 'Soporte Técnico' },
                { val: 'SSL', lab: 'Seguridad Bancaria' }
              ].map((stat, i) => (
                <div key={i} className="space-y-2">
                   <div className="text-3xl md:text-5xl font-black text-[var(--text-primary)]">{stat.val}</div>
                   <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-primary)]">{stat.lab}</div>
                </div>
              ))}
           </div>
        </section>

        {/* Final Call to Action */}
        <div className="mt-40 relative group">
          <div className="absolute inset-0 bg-[var(--color-primary-dim)] blur-[150px] rounded-full opacity-30 group-hover:opacity-40 transition-opacity" />
          <div className="relative overflow-hidden rounded-[4rem] p-16 md:p-32 text-center border border-[var(--border-soft)] bg-[var(--bg-surface-2)] shadow-2xl">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Store className="h-64 w-64 text-[var(--text-primary)]" />
            </div>
            
            <div className="relative z-10 space-y-12">
              <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none text-[var(--text-primary)]">
                ¿Listo para <br /> <span className="text-gradient-guambra italic">Simplificar</span> tu Vida?
              </h2>
              <p className="text-lg md:text-xl text-[var(--text-secondary)] opacity-70 max-w-2xl mx-auto leading-relaxed">
                Únete a la nueva era de gestión multitenant. Activa tu demo hoy y experimenta el control total sin complicaciones técnicas.
              </p>
              <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
                <Link to="/registro-negocio" className="btn-guambra-primary !px-16 !py-6 !text-sm flex items-center gap-4 group/btn">
                  Probar Demo Gratis 
                  <ArrowRight className="h-5 w-5 group-hover/btn:translate-x-2 transition-transform" />
                </Link>
                <Link to="/tutoriales" className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  Explorar Guías de Uso
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Caracteristicas;
