import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AvatarDisplay } from '../../utils/avatarConfig';

const UserProfileDropdown = () => {
  const { profile, signOut } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const nombre = profile?.nombre_completo || profile?.nombre || 'Usuario Activo';
  const rolLabel = profile?.rol?.replace('tenant_', '') || 'Administrador';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg-surface-2)] transition-colors group border border-transparent hover:border-[var(--border-soft)]"
      >
        <div className="flex-col items-end hidden md:flex text-right">
          <span className="text-[10px] font-black text-[var(--text-primary)]">{nombre}</span>
          <span className="text-[8px] font-bold text-primary uppercase tracking-widest">{rolLabel}</span>
        </div>

        <AvatarDisplay avatarId={profile?.avatar_id} size="sm" />

        <ChevronDown className={`h-3 w-3 text-[var(--text-muted)] transition-transform hidden sm:block ${isOpen ? 'rotate-180 text-[var(--text-primary)]' : 'group-hover:text-[var(--text-primary)]'}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[var(--bg-surface-3)] border border-[var(--border-soft)] shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">

          {/* Info móvil */}
          <div className="px-4 py-3 md:hidden border-b border-[var(--border-soft)] mb-2 flex items-center gap-3">
            <AvatarDisplay avatarId={profile?.avatar_id} size="sm" />
            <div>
              <p className="text-sm font-black text-[var(--text-primary)]">{nombre}</p>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{rolLabel}</p>
            </div>
          </div>

          <div className="px-2">
            <Link
              to="/perfil"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-xs font-bold uppercase tracking-widest"
            >
              <User className="h-4 w-4 text-primary/70" />
              Mi Perfil
            </Link>
            <Link
              to="/configuraciones"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-xs font-bold uppercase tracking-widest"
            >
              <Settings className="h-4 w-4 text-primary/70" />
              Configuraciones
            </Link>
          </div>

          <div className="h-px bg-[var(--border-soft)] my-2 mx-4" />

          <div className="px-2">
            <button
              onClick={() => { setIsOpen(false); signOut(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-400 transition-colors text-xs font-bold uppercase tracking-widest group"
            >
              <LogOut className="h-4 w-4 group-hover:text-red-500" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileDropdown;
