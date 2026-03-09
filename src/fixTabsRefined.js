const fs = require('fs');

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
  const original = code;

  const startNavbar = code.indexOf('const ModuleNavbar =');
  if (startNavbar === -1) return;
  
  let endNavbar = code.indexOf(');', startNavbar);
  if (endNavbar === -1) endNavbar = code.indexOf('};', startNavbar);
  if (endNavbar === -1) return;
  
  let navBlock = code.substring(startNavbar, endNavbar + 2);
  
  navBlock = navBlock.replace(/className=\{\`([\s\S]*?)\`\}/g, (match, content) => {
    if (content.includes('currentTab') || content.includes('activeTab') || content.includes('setTab') || content.includes('tabId')) {
       const condMatch = content.match(/\$\{([^?]+)\?/);
       if (condMatch) {
         const condition = condMatch[1].trim();
         return `className={\`pb-3 px-5 text-xs font-semibold tracking-widest uppercase transition-all duration-200 cursor-pointer bg-transparent border-b-2 flex items-center justify-center gap-2 whitespace-nowrap \${${condition} ? 'text-[var(--color-primary)] border-[var(--color-primary)]' : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)] hover:border-[var(--border-medium)]'}\`}`;
       }
    }
    return match;
  });
  
  navBlock = navBlock.replace(/className=\"border-b[^\"]*\"/, 'className="border-b border-[var(--border-soft)] pb-px mb-8 overflow-x-auto no-scrollbar"');

  code = code.replace(code.substring(startNavbar, endNavbar + 2), navBlock);
  if (code !== original) {
    fs.writeFileSync(file, code);
    console.log('Updated ' + file);
  }
});
