import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../stores/themeStore';

/**
 * Botón de alternancia de tema (claro / oscuro).
 * Usa el store global — no tiene estado local.
 *
 * Props:
 *   size  — 'sm' (16px) | 'md' (20px, por defecto)
 *   className — clases adicionales para el botón
 */
const ThemeToggle = ({ size = 'md', className = '' }) => {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';
  const iconSize = size === 'sm' ? 16 : 20;

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className={`flex items-center justify-center rounded-lg
        bg-[var(--bg-surface-2)] border border-[var(--border-soft)]
        text-[var(--text-secondary)]
        hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]
        hover:bg-[var(--color-primary-dim)]
        transition-all duration-200
        ${size === 'sm' ? 'w-9 h-9' : 'w-10 h-10'}
        ${className}`}
    >
      {isDark
        ? <Sun size={iconSize} />
        : <Moon size={iconSize} />
      }
    </button>
  );
};

export default ThemeToggle;
