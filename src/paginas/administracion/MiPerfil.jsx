import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { User, Lock, Eye, EyeOff, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { getAvataresPorRol, getAvatarById, AvatarDisplay } from '../../utils/avatarConfig';

// ── Sub-nav de tabs ───────────────────────────────────────────────────────────

const ModuleNavbar = ({ tab, setTab }) => (
  <div className="border-b border-[var(--border-soft)] pb-px mb-8 overflow-x-auto no-scrollbar">
    <nav className="-mb-px flex gap-6">
      {[
        { id: 'avatar',     label: 'Identidad Visual', icon: User },
        { id: 'seguridad',  label: 'Seguridad',         icon: Lock },
      ].map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setTab(id)}
          className={`whitespace-nowrap py-3 px-1 border-b-2 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2
            ${tab === id
              ? 'border-primary text-primary'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-soft)]'
            }`}
        >
          <Icon className="w-3 h-3" />
          {label}
        </button>
      ))}
    </nav>
  </div>
);

// ── Componente Principal ──────────────────────────────────────────────────────

export default function MiPerfil() {
  const { user, profile, updateAvatar } = useAuthStore();

  const [tab, setTab] = useState('avatar');

  // — Avatar
  const [avatarSeleccionado, setAvatarSeleccionado] = useState(profile?.avatar_id ?? null);
  const [guardandoAvatar, setGuardandoAvatar] = useState(false);
  const avatarActual = getAvatarById(profile?.avatar_id ?? null);
  const avataresPorRol = getAvataresPorRol(profile?.rol);
  const cambioDeAvatar = avatarSeleccionado !== (profile?.avatar_id ?? null);

  // — Contraseña
  const [claveActual,    setClaveActual]    = useState('');
  const [claveNueva,     setClaveNueva]     = useState('');
  const [claveConfirmar, setClaveConfirmar] = useState('');
  const [mostrarClaves,  setMostrarClaves]  = useState({ actual: false, nueva: false, confirmar: false });
  const [guardandoClave, setGuardandoClave] = useState(false);

  const toggleVer = (campo) => setMostrarClaves(p => ({ ...p, [campo]: !p[campo] }));

  // ── Guardar avatar ─────────────────────────────────────────────────────────

  const handleGuardarAvatar = async () => {
    if (!cambioDeAvatar) return;
    setGuardandoAvatar(true);
    try {
      await updateAvatar(avatarSeleccionado);
      toast.success('Foto de perfil actualizada');
    } catch (err) {
      toast.error(err.message || 'Error al guardar la foto');
    } finally {
      setGuardandoAvatar(false);
    }
  };

  // ── Cambiar contraseña ─────────────────────────────────────────────────────

  const handleCambiarClave = async (e) => {
    e.preventDefault();

    if (claveNueva.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (claveNueva !== claveConfirmar) {
      toast.error('Las contraseñas nuevas no coinciden');
      return;
    }

    setGuardandoClave(true);
    try {
      // 1. Verificar contraseña actual re-autenticando
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: claveActual,
      });
      if (signInErr) throw new Error('La contraseña actual es incorrecta');

      // 2. Actualizar a la nueva contraseña
      const { error: updateErr } = await supabase.auth.updateUser({ password: claveNueva });
      if (updateErr) throw updateErr;

      toast.success('Contraseña actualizada correctamente');
      setClaveActual('');
      setClaveNueva('');
      setClaveConfirmar('');
    } catch (err) {
      toast.error(err.message || 'No se pudo cambiar la contraseña');
    } finally {
      setGuardandoClave(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const rolLabel = {
    tenant_admin:    'Administrador',
    tenant_empleado: 'Empleado',
    super_admin:     'Super Admin',
  }[profile?.rol] ?? 'Usuario';

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <ModuleNavbar tab={tab} setTab={setTab} />

      {/* ── TAB: IDENTIDAD VISUAL ─────────────────────────────────────────── */}
      {tab === 'avatar' && (
        <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-right-4">

          {/* Tarjeta de perfil actual */}
          <div className="glass-card p-8 flex flex-col sm:flex-row items-center gap-6">
            <AvatarDisplay avatarId={avatarSeleccionado} size="xl" />
            <div>
              <p className="text-xl font-black text-[var(--text-primary)] tracking-tight">
                {profile?.nombre_completo || 'Usuario'}
              </p>
              <p className="text-xs font-bold text-primary uppercase tracking-[0.2em] mt-1">
                {rolLabel}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-2">{user?.email}</p>
              {!profile?.avatar_id && (
                <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mt-3 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Sin foto asignada — elige una abajo
                </p>
              )}
              {avatarActual && !cambioDeAvatar && (
                <p className="text-[10px] text-[var(--text-muted)] mt-3 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                  Foto actual: <span className="font-bold text-[var(--text-secondary)]">{avatarActual.label}</span>
                </p>
              )}
            </div>
          </div>

          {/* Grid de selección */}
          <div className="glass-card p-6 md:p-8">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-6 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-primary" />
              Elige tu foto de perfil
              <span className="ml-auto text-[9px] text-[var(--text-muted)] normal-case tracking-normal font-medium">
                Fotos disponibles para {rolLabel.toLowerCase()}s
              </span>
            </h3>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {avataresPorRol.map((av) => {
                const seleccionado = avatarSeleccionado === av.id;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setAvatarSeleccionado(av.id)}
                    className={`group flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all duration-200
                      ${seleccionado
                        ? `${av.bg} ${av.border} ring-2 ${av.ring} ring-offset-2 ring-offset-[var(--bg-surface-1)]`
                        : 'border-[var(--border-soft)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-surface-2)]'
                      }`}
                  >
                    <div className={`h-12 w-12 rounded-2xl ${av.bg} border ${av.border} flex items-center justify-center transition-transform group-hover:scale-105`}>
                      <av.Icono className={`h-6 w-6 ${av.text}`} />
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest leading-tight text-center
                      ${seleccionado ? av.text : 'text-[var(--text-muted)]'}`}>
                      {av.label}
                    </span>
                    {seleccionado && (
                      <CheckCircle2 className={`w-3 h-3 ${av.text} -mt-1`} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-[var(--border-soft)] flex justify-end">
              <button
                onClick={handleGuardarAvatar}
                disabled={!cambioDeAvatar || guardandoAvatar}
                className="btn-guambra-primary h-12 px-8 min-w-[180px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {guardandoAvatar
                  ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  : 'Guardar Foto de Perfil'
                }
              </button>
            </div>
          </div>

          <p className="text-center text-[10px] text-[var(--text-muted)] uppercase tracking-widest">
            Las fotos de perfil son imágenes preestablecidas del sistema — no se pueden subir fotos personalizadas.
          </p>
        </div>
      )}

      {/* ── TAB: SEGURIDAD ────────────────────────────────────────────────── */}
      {tab === 'seguridad' && (
        <div className="max-w-lg mx-auto animate-in slide-in-from-right-4">
          <div className="glass-card p-6 md:p-10">

            {/* Encabezado */}
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[var(--border-soft)]">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest">Cambiar Contraseña</h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{user?.email}</p>
              </div>
            </div>

            <form onSubmit={handleCambiarClave} className="space-y-5">

              {/* Contraseña actual */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Contraseña Actual <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    required
                    type={mostrarClaves.actual ? 'text' : 'password'}
                    className="input-guambra h-12 pr-11 w-full"
                    placeholder="Tu contraseña actual"
                    value={claveActual}
                    onChange={e => setClaveActual(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVer('actual')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {mostrarClaves.actual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="h-px bg-[var(--border-soft)]" />

              {/* Nueva contraseña */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Nueva Contraseña <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    required
                    type={mostrarClaves.nueva ? 'text' : 'password'}
                    className="input-guambra h-12 pr-11 w-full"
                    placeholder="Mínimo 8 caracteres"
                    value={claveNueva}
                    onChange={e => setClaveNueva(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVer('nueva')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {mostrarClaves.nueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Indicador de fortaleza */}
                {claveNueva.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {[
                      { ok: claveNueva.length >= 8,  label: 'Al menos 8 caracteres' },
                      { ok: /[A-Z]/.test(claveNueva), label: 'Una letra mayúscula' },
                      { ok: /[0-9]/.test(claveNueva), label: 'Un número' },
                    ].map(({ ok, label }) => (
                      <div key={label} className={`flex items-center gap-1.5 text-[10px] font-bold transition-colors ${ok ? 'text-green-400' : 'text-[var(--text-muted)]'}`}>
                        <span className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${ok ? 'bg-green-500/20 border-green-500/40' : 'border-[var(--border-soft)]'}`}>
                          {ok && <CheckCircle2 className="w-2 h-2" />}
                        </span>
                        {label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Confirmar Nueva Contraseña <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    required
                    type={mostrarClaves.confirmar ? 'text' : 'password'}
                    className={`input-guambra h-12 pr-11 w-full transition-colors ${
                      claveConfirmar.length > 0
                        ? claveNueva === claveConfirmar
                          ? 'border-green-500/50 focus:border-green-500'
                          : 'border-red-500/50 focus:border-red-500'
                        : ''
                    }`}
                    placeholder="Repite la nueva contraseña"
                    value={claveConfirmar}
                    onChange={e => setClaveConfirmar(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleVer('confirmar')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {mostrarClaves.confirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {claveConfirmar.length > 0 && claveNueva !== claveConfirmar && (
                  <p className="text-[10px] text-red-400 font-bold mt-1.5">Las contraseñas no coinciden</p>
                )}
              </div>

              <div className="pt-4 border-t border-[var(--border-soft)]">
                <button
                  type="submit"
                  disabled={guardandoClave || !claveActual || !claveNueva || !claveConfirmar}
                  className="btn-guambra-primary h-12 w-full disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {guardandoClave
                    ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    : 'Actualizar Contraseña'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
