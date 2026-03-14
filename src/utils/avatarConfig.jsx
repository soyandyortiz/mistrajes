import {
  Crown, Briefcase, ShieldCheck, Star, Building2, Key,
  Scissors, Package, ClipboardList, Tag, Wrench, Headphones,
  User
} from 'lucide-react';

// ── Catálogo de avatares por rol ──────────────────────────────────────────────

export const AVATARES_ADMIN = [
  { id: 'admin_crown',     Icono: Crown,         label: 'Director',    bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30', ring: 'ring-violet-500/60' },
  { id: 'admin_briefcase', Icono: Briefcase,      label: 'Ejecutivo',   bg: 'bg-blue-500/20',   text: 'text-blue-400',   border: 'border-blue-500/30',   ring: 'ring-blue-500/60'   },
  { id: 'admin_shield',    Icono: ShieldCheck,    label: 'Gestor',      bg: 'bg-emerald-500/20',text: 'text-emerald-400',border: 'border-emerald-500/30',ring: 'ring-emerald-500/60'},
  { id: 'admin_star',      Icono: Star,           label: 'Maestro',     bg: 'bg-amber-500/20',  text: 'text-amber-400',  border: 'border-amber-500/30',  ring: 'ring-amber-500/60'  },
  { id: 'admin_building',  Icono: Building2,      label: 'Fundador',    bg: 'bg-rose-500/20',   text: 'text-rose-400',   border: 'border-rose-500/30',   ring: 'ring-rose-500/60'   },
  { id: 'admin_key',       Icono: Key,            label: 'Propietario', bg: 'bg-cyan-500/20',   text: 'text-cyan-400',   border: 'border-cyan-500/30',   ring: 'ring-cyan-500/60'   },
];

export const AVATARES_EMPLEADO = [
  { id: 'emp_scissors',    Icono: Scissors,       label: 'Sastre',      bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30', ring: 'ring-indigo-500/60' },
  { id: 'emp_package',     Icono: Package,        label: 'Logística',   bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', ring: 'ring-orange-500/60' },
  { id: 'emp_clipboard',   Icono: ClipboardList,  label: 'Operaciones', bg: 'bg-teal-500/20',   text: 'text-teal-400',   border: 'border-teal-500/30',   ring: 'ring-teal-500/60'   },
  { id: 'emp_tag',         Icono: Tag,            label: 'Ventas',      bg: 'bg-pink-500/20',   text: 'text-pink-400',   border: 'border-pink-500/30',   ring: 'ring-pink-500/60'   },
  { id: 'emp_wrench',      Icono: Wrench,         label: 'Técnico',     bg: 'bg-green-500/20',  text: 'text-green-400',  border: 'border-green-500/30',  ring: 'ring-green-500/60'  },
  { id: 'emp_headphones',  Icono: Headphones,     label: 'Soporte',     bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', ring: 'ring-purple-500/60' },
];

export const TODOS_AVATARES = [...AVATARES_ADMIN, ...AVATARES_EMPLEADO];

export const getAvatarById = (id) => TODOS_AVATARES.find(a => a.id === id) ?? null;

export const getAvataresPorRol = (rol) =>
  rol === 'tenant_empleado' ? AVATARES_EMPLEADO : AVATARES_ADMIN;

// ── Componente reutilizable para mostrar un avatar ────────────────────────────

const SIZE_MAP = {
  sm:  { wrap: 'h-8 w-8',   icon: 'h-4 w-4',   radius: 'rounded-xl' },
  md:  { wrap: 'h-10 w-10', icon: 'h-5 w-5',   radius: 'rounded-xl' },
  lg:  { wrap: 'h-16 w-16', icon: 'h-8 w-8',   radius: 'rounded-2xl' },
  xl:  { wrap: 'h-24 w-24', icon: 'h-12 w-12', radius: 'rounded-3xl' },
};

export const AvatarDisplay = ({ avatarId, size = 'md', className = '' }) => {
  const avatar = getAvatarById(avatarId);
  const s = SIZE_MAP[size] ?? SIZE_MAP.md;

  if (!avatar) {
    return (
      <div className={`${s.wrap} ${s.radius} bg-[var(--color-primary-dim)] border border-[var(--color-primary)]/20 flex items-center justify-center shrink-0 ${className}`}>
        <User className={`${s.icon} text-[var(--color-primary)]`} />
      </div>
    );
  }

  const { Icono, bg, text, border } = avatar;
  return (
    <div className={`${s.wrap} ${s.radius} ${bg} border ${border} flex items-center justify-center shrink-0 ${className}`}>
      <Icono className={`${s.icon} ${text}`} />
    </div>
  );
};
