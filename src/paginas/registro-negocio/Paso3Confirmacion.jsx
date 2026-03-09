import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegistroNegocioStore } from '../../stores/registroNegocioStore';
import { supabase } from '../../lib/supabase';
import { Loader2, Rocket, RefreshCw, CheckCircle } from 'lucide-react';

const Paso3Confirmacion = () => {
  const navigate = useNavigate();
  const { businessData, subdomain, updateBusinessData, prevStep, reset } = useRegistroNegocioStore();
  
  const [captcha, setCaptcha] = useState({ a: 0, b: 0, result: 0 });
  const [userCaptcha, setUserCaptcha] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Generar CAPTCHA aleatorio al cargar
  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ a, b, result: a + b });
    setUserCaptcha('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    updateBusinessData({ [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validar CAPTCHA
    if (parseInt(userCaptcha) !== captcha.result) {
      alert("La respuesta del CAPTCHA es incorrecta. Inténtelo de nuevo.");
      generateCaptcha();
      return;
    }

    if (!businessData.termsAccepted) {
      alert("Debe aceptar los términos y condiciones.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        nombre_negocio: businessData.name,
        ruc_negocio: businessData.businessRuc,
        slug: subdomain,
        plan_id: businessData.plan_id,
        nombre_propietario: businessData.contactName,
        cedula_ruc_propietario: businessData.documentId,
        email_propietario: businessData.email,
        whatsapp_propietario: businessData.whatsapp,
        pais: businessData.country,
        provincia: businessData.province,
        ciudad: businessData.city,
        direccion: businessData.address,
        tipo_alquiler: businessData.rentalType,
        tipo_alquiler_otro: businessData.rentalTypeOther,
        cargo_responsable: businessData.responsibleRole,
        password: businessData.password,
        como_nos_encontro: businessData.howFound,
        terminos_aceptados: businessData.termsAccepted,
        estado: 'pendiente'
      };

      const { error: dbError } = await supabase
        .from('solicitudes_registro')
        .insert([payload]);

      if (dbError) throw dbError;

      // PERSISTENCIA TEMPORAL: Guardar credenciales para la pantalla de éxito
      sessionStorage.setItem('demo_email', businessData.email);
      sessionStorage.setItem('demo_pass', businessData.password);
      sessionStorage.setItem('demo_subdomain', subdomain);
      sessionStorage.setItem('demo_negocio', businessData.name);
      sessionStorage.setItem('demo_plan', 'Demo Gratuita'); // Por defecto para este flujo

      // Éxito: Limpiar store y navegar
      reset();
      navigate('/registro-negocio/exito');

    } catch (err) {
      console.error('Error enviando solicitud:', err);
      setError(err.message || 'Ocurrió un error al procesar su solicitud. Por favor intente más tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = businessData.howFound && businessData.termsAccepted && userCaptcha.length > 0;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <form onSubmit={handleSubmit} className="space-y-10">
        
        {/* SECCIÓN: ORIGEN */}
        <section className="space-y-8">
          <div className="border-b border-[var(--border-soft)] pb-4">
            <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight uppercase">Casi listos</h3>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">¿Cómo nos encontró? *</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Facebook', 'Instagram', 'TikTok', 'YouTube', 'Google', 'ChatGPT / Gemini / IA', 'Recomendación', 'Otro'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => updateBusinessData({ howFound: option })}
                  className={`px-4 py-3 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                    businessData.howFound === option 
                      ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary-glow)]' 
                      : 'bg-[var(--bg-surface-2)] border-[var(--border-soft)] text-[var(--text-muted)] hover:border-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* SECCIÓN: CAPTCHA Y T&C */}
        <section className="space-y-10 pt-6">
          <div className="glass-card p-8 border-[var(--color-primary-dim)] bg-[var(--color-primary-dim)]/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              
              {/* CAPTCHA LOCAL */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-2 w-2 rounded-full bg-[var(--color-primary)] animate-pulse"></div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Verificación de Seguridad</h4>
                </div>
                <div className="flex items-center gap-4 bg-[var(--bg-surface-3)]/40 p-6 rounded-2xl border border-[var(--border-soft)]">
                  <span className="text-2xl font-black text-[var(--text-primary)] tracking-tighter italic">
                    ¿ Cuánto es {captcha.a} + {captcha.b} ?
                  </span>
                  <input
                    type="number"
                    required
                    value={userCaptcha}
                    onChange={(e) => setUserCaptcha(e.target.value)}
                    className="w-20 bg-[var(--bg-surface-2)] border-[var(--border-soft)] text-[var(--text-primary)] text-center text-xl font-bold rounded-xl py-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] outline-none"
                    placeholder="?"
                  />
                  <button 
                    type="button" 
                    onClick={generateCaptcha}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors"
                    title="Regenerar CAPTCHA"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* TÉRMINOS Y CONDICIONES */}
              <div className="space-y-4">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <div className="relative flex items-center h-6">
                    <input
                      type="checkbox"
                      name="termsAccepted"
                      required
                      checked={businessData.termsAccepted}
                      onChange={handleChange}
                      className="h-5 w-5 rounded border-[var(--border-soft)] bg-[var(--bg-surface-2)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/40 focus:ring-offset-0"
                    />
                  </div>
                  <span className="text-[11px] leading-relaxed text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors mt-0.5">
                    He leído y acepto los <a href="#" className="text-[var(--color-primary)] font-bold hover:underline">Términos y condiciones</a> y la <a href="#" className="text-[var(--color-primary)] font-bold hover:underline">Política de tratamiento de datos</a>.
                  </span>
                </label>
              </div>

            </div>
          </div>
        </section>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-in zoom-in-95 duration-300">
            <p className="text-xs text-red-400 font-bold uppercase tracking-widest text-center">{error}</p>
          </div>
        )}

        <div className="pt-8 flex justify-between items-center">
          <button
            type="button"
            onClick={prevStep}
            disabled={isSubmitting}
            className="btn-guambra-secondary disabled:opacity-30"
          >
            Atrás
          </button>
          
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="btn-guambra-primary !px-10 disabled:opacity-20 flex items-center shadow-lg shadow-[var(--color-primary-glow)]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                Solicitar DEMO gratuita
                <Rocket className="ml-3 h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Paso3Confirmacion;
