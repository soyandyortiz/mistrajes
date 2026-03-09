import { Outlet } from 'react-router-dom';
import SubNavbar from './SubNavbar';

/**
 * ModuleLayout - Layout genérico para módulos que incluyen SubNavbar
 * @param {string} title Título del módulo
 * @param {string} description Descripción del módulo
 * @param {Array} tabs Arreglo de tabs para la navegación interna
 */
export default function ModuleLayout({ title, description, tabs = [] }) {
  return (
    <div className="flex flex-col h-full w-full animate-in fade-in duration-500">
      {/* Si se pasan props, renderizar el SubNavbar automáticamente */}
      {(title || tabs.length > 0) && (
        <SubNavbar title={title} description={description} tabs={tabs} />
      )}
      
      <div className="flex-1 relative h-full flex flex-col">
         <Outlet />
      </div>
    </div>
  );
}
