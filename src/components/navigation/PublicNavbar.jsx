import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Store } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';

const PublicNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Inicio', path: '/' },
    { name: 'Características', path: '/caracteristicas' },
    { name: 'Precios', path: '/precios' },
    { name: 'Tutoriales', path: '/tutoriales' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled || isOpen
          ? 'backdrop-blur-xl bg-[var(--bg-page)]/60 border-b border-[var(--border-soft)] py-4'
          : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 bg-[var(--color-primary)] rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
            <Store className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl md:text-2xl font-black tracking-tighter text-[var(--text-primary)] uppercase">
            Mis<span className="text-gradient-guambra">Trajes</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-xs font-black uppercase tracking-[0.2em] transition-all hover:text-[var(--color-primary)] ${
                isActive(link.path) ? 'text-[var(--color-primary)]' : 'text-[var(--text-secondary)]'
              }`}
            >
              {link.name}
            </Link>
          ))}

          <div className="flex items-center gap-4 ml-4">
            <ThemeToggle size="sm" />
            <Link to="/iniciar-sesion" className="text-xs font-black text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-[0.2em]">
              Entrar
            </Link>
            <Link to="/registro-negocio" className="btn-guambra-primary !py-2.5 !px-6 !text-[10px]">
              Demo Gratis
            </Link>
          </div>
        </div>

        {/* Mobile Menu Button + Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle size="sm" />
          <button
            className="text-[var(--text-primary)] p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-x-0 top-[73px] bg-[var(--bg-page)]/95 backdrop-blur-2xl border-b border-[var(--border-soft)] transition-all duration-300 md:hidden overflow-hidden ${
          isOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="px-6 py-8 flex flex-col gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={`text-sm font-black uppercase tracking-[0.2em] transition-all ${
                isActive(link.path) ? 'text-[var(--color-primary)] translate-x-2' : 'text-[var(--text-secondary)]'
              }`}
            >
              {link.name}
            </Link>
          ))}
          <div className="h-px bg-[var(--border-soft)] my-2" />
          <Link
            to="/iniciar-sesion"
            onClick={() => setIsOpen(false)}
            className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]"
          >
            Entrar
          </Link>
          <Link
            to="/registro-negocio"
            onClick={() => setIsOpen(false)}
            className="btn-guambra-primary w-full justify-center"
          >
            Demo Gratis
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default PublicNavbar;
