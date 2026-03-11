import { useRegistroNegocioStore } from '../../stores/registroNegocioStore';
import Paso1DatosNegocio from './Paso1DatosNegocio';
import Paso2AccesoDominio from './Paso2AccesoDominio';
import Paso3Confirmacion from './Paso3Confirmacion';

const steps = [
  { id: 1, name: 'Negocio' },
  { id: 2, name: 'Acceso' },
  { id: 3, name: 'Finalizar' }
];

const FlujoRegistro = () => {
  const currentStep = useRegistroNegocioStore((state) => state.currentStep);

  return (
    <div className="min-h-screen text-[var(--text-primary)] flex flex-col py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,_var(--color-primary-dim),_transparent)]"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-12 text-center relative z-10">
        <div className="inline-block px-4 py-1.5 rounded-full bg-[var(--color-primary-dim)] border border-[var(--border-soft)] text-[10px] font-bold text-[var(--color-primary)] mb-6 tracking-[0.4em] uppercase">
          GuambraWeb Enterprise
        </div>
        <h2 className="text-5xl font-black tracking-tighter uppercase text-[var(--text-primary)]">
          Mis Trajes
        </h2>
        <p className="mt-4 text-sm text-[var(--text-secondary)] font-normal tracking-wide opacity-60">
          Automatiza tu gestión de alquileres con tecnología de vanguardia.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-4xl relative z-10">
        <div className="glass-card p-8 sm:p-12 border border-[var(--border-soft)]">
          
          {/* Futuristic Progress Bar */}
          <nav aria-label="Progress" className="mb-14">
            <ol role="list" className="flex items-center w-full pointer-events-none">
              {steps.map((step, idx) => (
                <li key={step.name} className={`flex items-center ${idx !== steps.length - 1 ? 'flex-1' : ''}`}>
                  <div className="relative flex flex-col items-center">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 z-10
                      ${currentStep === step.id 
                        ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary-glow)] scale-110 ring-4 ring-[var(--color-primary-dim)]' 
                        : currentStep > step.id
                          ? 'bg-[var(--color-primary)]/40 text-[var(--text-primary)] border border-[var(--color-primary-dim)]'
                          : 'bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[var(--text-muted)]'}
                    `}>
                      {currentStep > step.id ? '✓' : step.id}
                    </div>
                    <span className={`
                      absolute top-14 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 whitespace-nowrap
                      ${currentStep === step.id 
                        ? 'text-[var(--text-primary)] font-black drop-shadow-[0_0_8px_var(--color-primary-dim)]' 
                        : currentStep > step.id
                          ? 'text-[var(--text-primary)] opacity-60'
                          : 'text-[var(--text-muted)] opacity-50'}
                    `}>
                      {step.name}
                    </span>
                  </div>
                  {idx !== steps.length - 1 && (
                    <div className="flex-1 h-[1px] bg-[var(--border-soft)] mx-2 sm:mx-4 relative z-0">
                      <div 
                        className="absolute top-0 left-0 h-full bg-[var(--color-primary)] transition-all duration-500"
                        style={{ width: currentStep > step.id ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {/* Dynamic Form Content */}
          <div className="mt-16">
            {currentStep === 1 && <Paso1DatosNegocio />}
            {currentStep === 2 && <Paso2AccesoDominio />}
            {currentStep === 3 && <Paso3Confirmacion />}
          </div>

        </div>
      </div>
    </div>
  );
};

export default FlujoRegistro;
