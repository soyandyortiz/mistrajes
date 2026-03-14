import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const IniciarSesion = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();

  useEffect(() => {
    if (user && profile) {
       if (profile.rol === 'super_admin') {
           navigate('/super-admin', { replace: true });
       } else {
           navigate('/dashboard', { replace: true });
       }
    }
  }, [user, profile, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // El useEffect de arriba se encargará de redirigir 
      // automáticamente cuando authStore sea actualizado.
      
    } catch (err) {
      setError(err.message || 'Credenciales inválidas. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex-col justify-center px-6 py-12 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--color-primary-dim)] rounded-full blur-[120px] opacity-40"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--color-primary-dim)] rounded-full blur-[120px] opacity-40"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-8">
            <img src="/icono.svg" alt="MisTrajes" className="h-16 w-16 object-contain drop-shadow-xl" />
        </div>
        <h2 className="text-center text-4xl font-black tracking-tighter text-[var(--text-primary)] uppercase">
          Mis<span className="text-gradient-guambra">Trajes</span>
        </h2>
        <p className="mt-3 text-center text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.3em] opacity-60">
           Sistema de Gestión de Alquileres
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[440px] relative z-10">
        <div className="glass-card px-8 py-12 sm:px-10 border border-[var(--border-soft)]">
          <form className="space-y-6" onSubmit={handleLogin}>
            
            {error && (
              <div className="rounded-xl bg-red-500/10 p-4 border border-red-500/20 animate-in zoom-in-95 duration-300">
                 <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] text-center mb-1">Acceso Denegado</p>
                 <p className="text-[11px] text-[var(--text-primary)] text-center opacity-80">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3 ml-1">
                Identificador
              </label>
              <input
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-guambra"
                placeholder="usuario@dominio.com"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3 ml-1">
                Clave de Seguridad
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
                  <Lock className="h-4 w-4 text-[var(--text-muted)] opacity-40" aria-hidden="true" />
                </div>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-guambra !pl-14 !pr-14"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-5 text-[var(--text-muted)] opacity-40 hover:opacity-80 transition-opacity"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-guambra-primary w-full disabled:opacity-30 shadow-lg shadow-[var(--color-primary-glow)]"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <span className="flex items-center justify-center text-xs font-black tracking-widest">
                    INGRESAR AL SISTEMA
                    <ArrowRight className="ml-3 h-4 w-4" />
                  </span>
                )}
              </button>
            </div>
            
          </form>

          <footer className="mt-12 text-center text-[10px]">
            <p className="text-[var(--text-muted)] font-bold uppercase tracking-widest">
              ¿No tienes cuenta?{' '}
              <a href="/registro-negocio" className="text-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all border-b border-[var(--color-primary)]/20">
                Registrar Negocio
              </a>
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default IniciarSesion;
