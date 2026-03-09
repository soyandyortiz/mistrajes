import { NavLink } from 'react-router-dom';

/**
 * SubNavbar - Header de Navegación Interna para Módulos.
 *
 * Cada módulo debe envolverse o incluir este componente para 
 * mostrar sus secciones internas (tabs/sub-navbar).
 * 
 * @param {string} title Título del módulo (ej. "Contratos")
 * @param {string} description Descripción corta (ej. "Gestión y creación de contratos")
 * @param {Array} tabs Arreglo de tabs: [{ name: 'Todos', href: '/contratos' }, ...]
 */
const SubNavbar = ({ title, description, tabs = [] }) => {
  return (
    <div className="mb-6 space-y-6">
      {/* Módulo Header */}
      <div>
        <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">{title}</h2>
        {description && (
           <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>
        )}
      </div>

      {/* Navegación Interna (Tabs) */}
      {tabs.length > 0 && (
        <div className="border-b border-[var(--border-soft)] pb-px">
          <nav className="-mb-px flex gap-6 overflow-x-auto custom-scrollbar">
            {tabs.map((tab) => (
              <NavLink
                key={tab.name}
                to={tab.href}
                end={tab.end}
                className={({ isActive }) => `
                  whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all
                  ${isActive 
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]' 
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-medium)]'}
                `}
              >
                {tab.name}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
};

export default SubNavbar;
