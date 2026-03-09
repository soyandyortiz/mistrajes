import { useState, useEffect } from 'react';
import { useRegistroNegocioStore } from '../../stores/registroNegocioStore';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff, ShieldCheck, Mail, Globe } from 'lucide-react';

const Paso2AccesoDominio = () => {
  const { businessData, updateBusinessData, subdomain, setSubdomain, isSubdomainAvailable, nextStep, prevStep } = useRegistroNegocioStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [inputValue, setInputValue] = useState(subdomain);
  const [isChecking, setIsChecking] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce para el subdominio
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(inputValue);
    }, 500);
    return () => clearTimeout(handler);
  }, [inputValue]);

  // Verificar disponibilidad del subdominio
  useEffect(() => {
    const checkSubdomain = async () => {
      if (!debouncedSearch || debouncedSearch.length < 3) {
        setSubdomain(debouncedSearch, null);
        return;
      }

      setIsChecking(true);
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('slug')
          .eq('slug', debouncedSearch)
          .maybeSingle();

        if (error) {
           console.error('Error checking subdomain:', error);
           setSubdomain(debouncedSearch, false);
        } else {
           setSubdomain(debouncedSearch, data === null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsChecking(false);
      }
    };

    checkSubdomain();
  }, [debouncedSearch, setSubdomain]);

  const handleSubdomainChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setInputValue(val);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateBusinessData({ [name]: value });
  };

  const getPasswordStrength = (pwd) => {
    if (!pwd) return null;
    if (pwd.length < 8) return { label: 'Débil', color: 'text-red-500', width: '33%', bg: 'bg-red-500' };
    if (pwd.match(/[A-Z]/) && pwd.match(/[0-9]/) && pwd.length >= 10) return { label: 'Fuerte', color: 'text-green-500', width: '100%', bg: 'bg-green-500' };
    return { label: 'Media', color: 'text-yellow-500', width: '66%', bg: 'bg-yellow-500' };
  };

  const strength = getPasswordStrength(businessData.password);

  const handleNext = (e) => {
    e.preventDefault();
    if (businessData.password.length < 8) {
      alert("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (businessData.password !== businessData.confirmPassword) {
      alert("Las contraseñas no coinciden.");
      return;
    }
    if (!isSubdomainAvailable) {
      alert("El subdominio seleccionado no está disponible.");
      return;
    }
    nextStep();
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <form onSubmit={handleNext} className="space-y-10">
        
        {/* SECCIÓN: DATOS DE ACCESO */}
        <section className="space-y-8">
          <div className="border-b border-[var(--border-soft)] pb-4">
            <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight uppercase">Credenciales de Acceso</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Email de acceso al sistema *</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
                <input 
                  type="email" 
                  name="email"
                  required
                  value={businessData.email}
                  onChange={handleChange}
                  className="input-guambra !pl-12"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Contraseña *</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password"
                  required
                  value={businessData.password}
                  onChange={handleChange}
                  className="input-guambra !pr-12"
                  placeholder="Mínimo 8 caracteres"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              
              {/* Indicador de Fortaleza */}
              {strength && (
                <div className="mt-2 space-y-1 animate-in fade-in duration-300">
                  <div className="flex justify-between text-[9px] font-bold uppercase tracking-tight">
                    <span className="text-[var(--text-muted)]">Seguridad:</span>
                    <span className={strength.color}>{strength.label}</span>
                  </div>
                  <div className="h-1 w-full bg-[var(--bg-surface-2)] rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${strength.bg}`} style={{ width: strength.width }}></div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Confirmar contraseña *</label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  name="confirmPassword"
                  required
                  value={businessData.confirmPassword}
                  onChange={handleChange}
                  className={`input-guambra !pr-12 ${businessData.password && businessData.confirmPassword && businessData.password !== businessData.confirmPassword ? 'border-red-500/50' : ''}`}
                  placeholder="Repita su contraseña"
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {businessData.password && businessData.confirmPassword && businessData.password !== businessData.confirmPassword && (
                <p className="mt-1 text-[9px] text-red-500 font-bold uppercase tracking-tighter">Las contraseñas no coinciden</p>
              )}
            </div>
          </div>
        </section>

        {/* SECCIÓN: SUBDOMINIO */}
        <section className="space-y-8 pt-6">
          <div className="border-b border-[var(--border-soft)] pb-4">
            <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight uppercase">Identidad del Espacio</h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Subdominio exclusivo *</label>
              <div className="relative group">
                <div className="flex items-center bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-xl group-focus-within:ring-2 group-focus-within:ring-[var(--color-primary-dim)] transition-all duration-300">
                  <div className="pl-4 pr-2 bg-transparent">
                    <Globe className="h-5 w-5 text-[var(--text-muted)]" />
                  </div>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={handleSubdomainChange}
                    placeholder="mitienda"
                    className="flex-1 bg-transparent border-none py-4 text-lg font-bold text-[var(--text-primary)] placeholder-[var(--text-muted)] opacity-50 focus:opacity-100 focus:ring-0 outline-none"
                  />
                  <span className="pr-4 text-sm font-bold text-[var(--color-primary)] tracking-tight">.mistrajes.com</span>
                </div>
                <p className="mt-3 text-[10px] text-[var(--text-muted)] font-medium italic">
                  Tu subdominio es la dirección web exclusiva de tu negocio.
                </p>
              </div>
            </div>

            {/* Status del Subdominio */}
            <div className="min-h-[60px] flex items-center">
              {isChecking && (
                <div className="flex items-center text-[var(--color-primary)] px-4 py-2 rounded-lg bg-[var(--color-primary-dim)] border border-[var(--color-primary-dim)] animate-pulse">
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Verificando en red...</span>
                </div>
              )}
              
              {!isChecking && isSubdomainAvailable === true && (
                <div className="flex items-center text-green-400 px-4 py-2 rounded-lg bg-green-500/5 border border-green-500/20 animate-in zoom-in-95 duration-300">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Disponible para reclamar</span>
                </div>
              )}

              {!isChecking && isSubdomainAvailable === false && inputValue.length >= 3 && (
                <div className="flex items-center text-red-400 px-4 py-2 rounded-lg bg-red-500/5 border border-red-500/20 animate-in zoom-in-95 duration-300">
                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Este nombre ya está en uso</span>
                </div>
              )}
            </div>
            
            {/* Preview real-time */}
            {inputValue && (
              <div className="p-4 bg-[var(--color-primary-dim)] border border-[var(--color-primary-dim)] rounded-xl border-dashed">
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-[0.2em] mb-1">Vista Previa de Acceso:</p>
                <code className="text-[var(--text-primary)] font-mono text-sm">https://<span className="text-[var(--color-primary)] font-bold">{inputValue}</span>.mistrajes.com</code>
              </div>
            )}
          </div>
        </section>

        <div className="pt-12 flex justify-between items-center">
          <button
            type="button"
            onClick={prevStep}
            className="btn-guambra-secondary"
          >
            Atrás
          </button>
          
          <button
            type="submit"
            disabled={!isSubdomainAvailable || !businessData.email || businessData.password.length < 8}
            className="btn-guambra-primary disabled:opacity-20 flex items-center"
          >
            Siguiente
            <ShieldCheck className="ml-2 h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Paso2AccesoDominio;
