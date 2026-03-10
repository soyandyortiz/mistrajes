import { Shield, FileText, Info } from 'lucide-react';

const TerminosCondiciones = () => {
  return (
    <div className="pt-40 pb-24 px-6 min-h-screen text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-primary-dim)] border border-[var(--border-soft)] text-[10px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)]">
            Legal
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-[var(--text-primary)]">
            Términos y <span className="text-gradient-guambra italic">Condiciones</span>
          </h1>
          <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">
            Última actualización: 06 de Marzo de 2026
          </p>
        </header>

        <div className="p-8 rounded-3xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-4">
          <Info className="h-5 w-5 text-amber-500 shrink-0 mt-1" />
          <p className="text-[11px] text-amber-500/80 font-medium leading-relaxed italic uppercase tracking-wider">
            Aviso Importante: El siguiente texto constituye un borrador de términos de servicio para una plataforma SaaS. No constituye asesoría legal definitiva y debe ser revisado por un profesional legal calificado en Ecuador antes de su implementación final.
          </p>
        </div>

        <article className="space-y-10 text-[var(--text-secondary)] leading-relaxed font-normal">
          <section className="space-y-4">
            <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-3">
              <div className="h-6 w-1 bg-[var(--color-primary)]" /> 1. Naturaleza del Servicio
            </h2>
            <p>
              MisTrajes es una plataforma de software como servicio (SaaS) diseñada para la gestión operativa de negocios de alquiler. El servicio se presta "tal cual" y según disponibilidad, permitiendo a los usuarios administrar inventarios, generar contratos y realizar seguimiento de sus operaciones comerciales.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-3">
              <div className="h-6 w-1 bg-[var(--color-primary)]" /> 2. Registro y Propiedad de la Cuenta
            </h2>
            <p>
              Para acceder a MisTrajes, el usuario debe registrar un negocio válido. Usted es responsable de mantener la confidencialidad de sus credenciales. El titular de la suscripción es el propietario único de los datos ingresados en su instancia multitenant.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-3">
              <div className="h-6 w-1 bg-[var(--color-primary)]" /> 3. Responsabilidad sobre los Contratos
            </h2>
            <p>
              La plataforma facilita la generación de contratos de alquiler. GuambraWeb Enterprise no es parte de dichos contratos ni asume responsabilidad por el incumplimiento de las partes involucradas en los alquileres gestionados a través del software.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-3">
              <div className="h-6 w-1 bg-[var(--color-primary)]" /> 4. Pagos y Suscripción
            </h2>
            <p>
              El acceso a las funciones avanzadas está sujeto al pago de una suscripción periódica. La falta de pago resultará en la restricción del acceso a la plataforma, conservando los datos del usuario por un periodo máximo de 90 días antes de su eliminación permanente.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-3">
              <div className="h-6 w-1 bg-[var(--color-primary)]" /> 5. Limitación de Responsabilidad
            </h2>
            <p>
              En la medida permitida por las leyes de la República del Ecuador, no seremos responsables por pérdidas de ingresos, interrupción de negocios o pérdida de datos causadas por el uso del software.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-3">
              <div className="h-6 w-1 bg-[var(--color-primary)]" /> 6. Legislación Aplicable
            </h2>
            <p>
              Cualquier controversia derivada de estos términos será resuelta de acuerdo con las leyes de la República del Ecuador, sometiéndose las partes a la jurisdicción de los tribunales de la ciudad de Quito.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
};

export default TerminosCondiciones;
