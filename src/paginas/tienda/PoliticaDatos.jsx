import { Lock, Eye, ShieldCheck, Info } from 'lucide-react';

const PoliticaDatos = () => {
  return (
    <div className="pt-40 pb-24 px-6 min-h-screen text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-primary-dim)] border border-[var(--border-soft)] text-[10px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)]">
            Privacidad
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-[var(--text-primary)]">
            Política de <span className="text-gradient-guambra italic">Tratamiento de Datos</span>
          </h1>
          <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">
            Última actualización: 06 de Marzo de 2026
          </p>
        </header>

        <div className="p-8 rounded-3xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-4">
          <Info className="h-5 w-5 text-amber-500 shrink-0 mt-1" />
          <p className="text-[11px] text-amber-500/80 font-medium leading-relaxed italic uppercase tracking-wider">
            Aviso de Cumplimiento: Este documento describe nuestras prácticas de tratamiento de datos en cumplimiento con la Ley Orgánica de Protección de Datos Personales (LOPDP) de Ecuador. Se recomienda revisión legal profesional.
          </p>
        </div>

        <article className="space-y-10 text-[var(--text-secondary)] leading-relaxed font-normal">
          <section className="space-y-4">
            <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-3">
              <div className="h-6 w-1 bg-[var(--color-primary)]" /> 1. Datos Recopilados
            </h2>
            <p>
              Recopilamos información necesaria para la prestación del servicio SaaS, incluyendo: datos de contacto del negocio (nombre, RUC, correo), información de productos del inventario y datos de clientes finales ingresados por el usuario para la generación de contratos.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-3">
              <div className="h-6 w-1 bg-[var(--color-primary)]" /> 2. Finalidad del Tratamiento
            </h2>
            <p>
              Los datos son tratados exclusivamente para: (a) Proveer el servicio de gestión de alquileres, (b) Generar comprobantes y contratos, (c) Enviar notificaciones del sistema relativas a reservas y (d) Soporte técnico solicitado por el usuario.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-3">
              <div className="h-6 w-1 bg-[var(--color-primary)]" /> 3. Seguridad y Almacenamiento
            </h2>
            <p>
              Utilizamos infraestructura cifrada (SSL/TLS) y sistemas de aislamiento multitenant para garantizar que los datos de cada negocio permanezcan separados y seguros. Los datos se almacenan en servidores con altos estándares de seguridad y redundancia.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-3">
              <div className="h-6 w-1 bg-[var(--color-primary)]" /> 4. Derechos de los Titulares (ARCO+)
            </h2>
            <p>
              En cumplimiento con la LOPDP de Ecuador, garantizamos su derecho a: Acceder a sus datos personales, Rectificar información inexacta, Eliminar sus datos cuando ya no sean necesarios y Oponerse a ciertos tipos de tratamiento.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-3">
              <div className="h-6 w-1 bg-[var(--color-primary)]" /> 5. Transferencia de Datos
            </h2>
            <p>
              MisTrajes no vende ni alquila datos personales a terceros. Solo compartiremos información cuando sea estrictamente necesario para la operación del software (ej. pasarelas de pago, servicios de envío de correo) o por requerimiento legal de autoridad competente en Ecuador.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-3">
              <div className="h-6 w-1 bg-[var(--color-primary)]" /> 6. Contacto Delegado de Protección
            </h2>
            <p>
              Para ejercer sus derechos de protección de datos, puede contactarnos a través del área de Soporte en la plataforma o mediante los canales oficiales de GuambraWeb Enterprise.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
};

export default PoliticaDatos;
