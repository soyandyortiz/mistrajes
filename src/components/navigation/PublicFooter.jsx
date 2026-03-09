import { Link } from 'react-router-dom';
import { Store, Shield, Lock, FileText } from 'lucide-react';

const PublicFooter = () => {
  return (
    <footer className="py-24 border-t border-[var(--border-soft)] bg-[var(--bg-surface)]/40 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-8 flex flex-col gap-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
          
          {/* Brand Column */}
          <div className="md:col-span-4 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-[var(--color-primary)] rounded-xl flex items-center justify-center border border-[var(--border-soft)] shadow-lg shadow-[var(--color-primary)]/20">
                <Store className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-[var(--text-primary)] uppercase">
                Mis<span className="text-[var(--color-primary)] italic">Trajes</span>
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-xs font-medium uppercase tracking-wider">
              La plataforma SaaS de gestión de alquileres #1 en la región. Tecnología de vanguardia para negocios que no se detienen.
            </p>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-5 grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">Plataforma</h4>
              <ul className="space-y-4">
                <li><Link to="/" className="text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest">Inicio</Link></li>
                <li><Link to="/tutoriales" className="text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest">Tutoriales</Link></li>
                <li><Link to="/caracteristicas" className="text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest">Funciones</Link></li>
              </ul>
            </div>
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">Legal</h4>
              <ul className="space-y-4">
                <li><Link to="/terminos-condiciones" className="text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest">Términos</Link></li>
                <li><Link to="/politica-datos" className="text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest">Privacidad</Link></li>
                <li><Link to="/registro-negocio" className="text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors uppercase tracking-widest">Demo Gratis</Link></li>
              </ul>
            </div>
          </div>

          {/* Support Column */}
          <div className="md:col-span-3 space-y-6">
             <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">Soporte</h4>
             <div className="p-6 rounded-2xl bg-[var(--bg-surface-2)]/50 border border-[var(--border-soft)] space-y-4">
                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest italic">¿Necesitas ayuda técnica?</p>
                <div className="flex items-center gap-2 text-[var(--color-primary)] font-black text-xs uppercase cursor-pointer hover:underline">
                   WhatsApp Directo <ArrowRight className="h-4 w-4" />
                </div>
             </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-[var(--border-soft)] flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-[9px] font-black text-[var(--text-muted)] opacity-50 uppercase tracking-[0.4em] flex items-center gap-4">
            <Shield className="h-3 w-3" /> © 2026 GUAMBRAWEB ENTERPRISE • ECUADOR
          </div>
          <div className="flex items-center gap-6 opacity-40">
             <Lock className="h-4 w-4 text-[var(--text-primary)]" />
             <FileText className="h-4 w-4 text-[var(--text-primary)]" />
          </div>
        </div>
      </div>
    </footer>
  );
};

const ArrowRight = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

export default PublicFooter;
