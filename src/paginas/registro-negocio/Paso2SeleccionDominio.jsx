import { useState, useEffect } from 'react';
import { useRegistroNegocioStore } from '../../stores/registroNegocioStore';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const Paso2SeleccionDominio = () => {
  const { subdomain, setSubdomain, isSubdomainAvailable, nextStep, prevStep } = useRegistroNegocioStore();
  const [inputValue, setInputValue] = useState(subdomain);
  const [isChecking, setIsChecking] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce the input to avoid hitting the DB on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(inputValue);
    }, 500);
    return () => clearTimeout(handler);
  }, [inputValue]);

  // Check availability when debounced input changes
  useEffect(() => {
    const checkSubdomain = async () => {
      if (!debouncedSearch || debouncedSearch.length < 3) {
        setSubdomain(debouncedSearch, null);
        return;
      }

      setIsChecking(true);
      try {
        // Query the tenants table to see if the subdomain exists
        const { data, error } = await supabase
          .from('tenants')
          .select('slug')
          .eq('slug', debouncedSearch)
          .maybeSingle();

        if (error) {
           console.error('Error checking subdomain:', error);
           setSubdomain(debouncedSearch, false);
        } else {
           // If data is null, the subdomain is available
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

  const handleChange = (e) => {
    // Only allow lowercase alphanumeric and hyphens
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setInputValue(val);
  };

  const handleNext = () => {
    if (isSubdomainAvailable) {
      nextStep();
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="border-b border-white/10 pb-6">
        <h3 className="text-3xl font-black text-white tracking-tighter">Tu Identidad Digital</h3>
        <p className="mt-2 text-sm text-gray-400">Define el punto de acceso exclusivo para tu negocio.</p>
      </div>

      <div className="space-y-10">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
            Subdominio de la Tienda
          </label>
          <div className="relative group">
            <div className="flex items-center px-4 py-4 bg-white/5 border border-white/10 rounded-2xl group-focus-within:ring-2 group-focus-within:ring-primary/40 transition-all duration-300">
              <input
                type="text"
                name="subdomain"
                value={inputValue}
                onChange={handleChange}
                placeholder="TuMarca"
                className="flex-1 bg-transparent border-none text-xl font-bold text-white placeholder-white/20 focus:ring-0 outline-none"
              />
              <span className="text-xl font-bold text-gradient-guambra tracking-tight ml-2">
                .mistrajes.com
              </span>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-medium tracking-wide">
               Minúsculas, números y guiones. Mínimo 3 caracteres.
            </p>
          </div>
        </div>

        {/* Futuristic Status Indicator */}
        <div className="min-h-[80px] flex items-center transition-all duration-500">
          {isChecking && (
            <div className="flex items-center text-primary/80 px-6 py-4 rounded-2xl bg-primary/5 border border-primary/20 w-fit">
              <Loader2 className="animate-spin h-5 w-5 mr-3" />
              <span className="text-sm font-bold tracking-wide uppercase italic">Verificando en red...</span>
            </div>
          )}
          
          {!isChecking && isSubdomainAvailable === true && (
            <div className="flex items-center text-green-400 px-6 py-4 rounded-2xl bg-green-500/5 border border-green-500/20 w-full animate-in zoom-in-95 duration-300 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
              <CheckCircle2 className="h-6 w-6 mr-4 flex-shrink-0 text-green-500" />
              <div className="flex flex-col">
                <span className="text-sm font-bold uppercase tracking-wider">¡Éxito! Nodo Disponible</span>
                <span className="text-xs text-green-500/70 font-medium">El dominio {inputValue}.mistrajes.com está listo para ser reclamado.</span>
              </div>
            </div>
          )}

          {!isChecking && isSubdomainAvailable === false && inputValue.length >= 3 && (
            <div className="flex items-center text-red-400 px-6 py-4 rounded-2xl bg-red-500/5 border border-red-500/20 w-full animate-in zoom-in-95 duration-300">
              <XCircle className="h-6 w-6 mr-4 flex-shrink-0 text-red-500" />
              <div className="flex flex-col">
                <span className="text-sm font-bold uppercase tracking-wider">Conflicto de Nodo</span>
                <span className="text-xs text-red-500/70 font-medium">El identificador ya existe en la red. Intenta una variante.</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-10 flex justify-between items-center">
          <button
            type="button"
            onClick={prevStep}
            className="btn-guambra-secondary"
          >
            Regresar
          </button>
          
          <button
            type="button"
            onClick={handleNext}
            disabled={!isSubdomainAvailable}
            className="btn-guambra-primary disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed group"
          >
            Reservar Identidad
            <CheckCircle2 className="ml-2 h-5 w-5 transition-transform group-hover:scale-110" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Paso2SeleccionDominio;
