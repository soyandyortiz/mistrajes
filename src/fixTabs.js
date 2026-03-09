const fs = require('fs');
const glob = require('fs').readdirSync;

const files = [
  'c:/Users/andyo/.gemini/antigravity/scratch/multitenant-alquiler/src/paginas/administracion/Operaciones/PedidosOnline.jsx',
  'c:/Users/andyo/.gemini/antigravity/scratch/multitenant-alquiler/src/paginas/administracion/Operaciones/Comprobantes.jsx',
  'c:/Users/andyo/.gemini/antigravity/scratch/multitenant-alquiler/src/paginas/administracion/Mantenimiento/Proveedores.jsx',
  'c:/Users/andyo/.gemini/antigravity/scratch/multitenant-alquiler/src/paginas/administracion/Mantenimiento/Productos.jsx',
  'c:/Users/andyo/.gemini/antigravity/scratch/multitenant-alquiler/src/paginas/administracion/Mantenimiento/Piezas.jsx',
  'c:/Users/andyo/.gemini/antigravity/scratch/multitenant-alquiler/src/paginas/administracion/Mantenimiento/Empleados.jsx',
  'c:/Users/andyo/.gemini/antigravity/scratch/multitenant-alquiler/src/paginas/administracion/Mantenimiento/Clientes.jsx',
  'c:/Users/andyo/.gemini/antigravity/scratch/multitenant-alquiler/src/paginas/administracion/Mantenimiento/Categorias.jsx',
  'c:/Users/andyo/.gemini/antigravity/scratch/multitenant-alquiler/src/paginas/administracion/GestionContratos.jsx',
  'c:/Users/andyo/.gemini/antigravity/scratch/multitenant-alquiler/src/paginas/administracion/Finanzas/Ingresos.jsx',
  'c:/Users/andyo/.gemini/antigravity/scratch/multitenant-alquiler/src/paginas/administracion/Finanzas/Egresos.jsx',
  'c:/Users/andyo/.gemini/antigravity/scratch/multitenant-alquiler/src/paginas/administracion/Finanzas/CajaGeneral.jsx',
  'c:/Users/andyo/.gemini/antigravity/scratch/multitenant-alquiler/src/paginas/administracion/Operaciones/Calendario.jsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  
  const originalCode = code;

  // Replace className in ModuleNavbar buttons
  // The ModuleNavbar looks like:
  // const ModuleNavbar = ({ currentTab, setTab }) => (
  //   <div className="border-b border-[var(--border-soft)] pb-px mb-8 overflow-x-auto no-scrollbar">...</div>
  // );

  // Using a simpler string replace mechanism
  const startIdx = code.indexOf('const ModuleNavbar');
  if (startIdx !== -1) {
      let navBarBlockEnd = code.indexOf(');', startIdx);
      if (navBarBlockEnd !== -1) {
          let navBody = code.substring(startIdx, navBarBlockEnd + 2);
          
          navBody = navBody.replace(/className={\`[\s\S]*?\`}/g, (match) => {
              if (match.includes('border-transparent text-[var(--text-muted)] hover:text-white') || match.includes('currentTab ===') || match.includes('text-[var(--text-muted)]')) {
                  // Capture the condition
                  const m = match.match(/\$\{([^?]+)\?/);
                  if (m && m[1]) {
                      const condition = m[1].trim();
                      return `className={\`pb-3 px-5 text-xs font-semibold tracking-widest uppercase transition-all duration-200 cursor-pointer bg-transparent border-b-2 flex items-center justify-center gap-2 whitespace-nowrap \${${condition} ? 'text-[var(--color-primary)] border-[var(--color-primary)]' : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)] hover:border-[var(--border-medium)]'}\`}`;
                  }
              }
              return match;
          });
          
          code = code.replace(code.substring(startIdx, navBarBlockEnd + 2), navBody);
      }
  }

  if (code !== originalCode) {
      fs.writeFileSync(file, code);
      console.log('Fixed tabs in: ' + file);
  }
});
