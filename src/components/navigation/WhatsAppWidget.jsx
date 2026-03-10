import { useState } from 'react';
import { X, Send, MessageCircle, Zap } from 'lucide-react';

const WhatsAppWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', mensaje: '' });

  const WHATSAPP_NUMBER = '593982650929';

  const handleSend = (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.mensaje) return;
    const text = `¡Hola! 👋 Mi nombre es ${formData.nombre}. Mi consulta es: ${formData.mensaje}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
    setIsOpen(false);
    setFormData({ nombre: '', mensaje: '' });
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 font-sans">

      {/* Chat window */}
      <div
        className={`
          w-[320px] md:w-[360px] overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface-2)] shadow-2xl
          transition-all duration-300 ease-out
          ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95 pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="relative overflow-hidden px-5 py-4 flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg-surface-3)]">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary-dim)] via-transparent to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="relative h-9 w-9 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-soft)] flex items-center justify-center shrink-0">
              <MessageCircle className="h-4 w-4 text-[var(--color-primary)]" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-[#25D366] rounded-full border-2 border-[var(--bg-surface-3)]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[var(--color-primary)] leading-none mb-0.5">Centro de Ayuda</p>
              <p className="text-xs font-semibold text-[var(--text-primary)] leading-none">MisTrajes</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="relative h-7 w-7 rounded-lg hover:bg-[var(--bg-surface-2)] flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">

          {/* Bot message */}
          <div className="flex items-start gap-2">
            <div className="h-6 w-6 rounded-lg bg-[var(--bg-surface-3)] border border-[var(--border-soft)] flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="h-3 w-3 text-[var(--color-primary)]" />
            </div>
            <div className="bg-[var(--bg-surface-3)] border border-[var(--border-soft)] rounded-xl rounded-tl-none px-3 py-2.5 text-xs text-[var(--text-secondary)] leading-relaxed max-w-[85%]">
              ¡Hola! 👋 Déjanos tu nombre y consulta, te respondemos al instante por WhatsApp.
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSend} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">Tu Nombre</label>
              <input
                type="text"
                required
                placeholder="Ej: Juan Pérez"
                className="w-full bg-[var(--bg-surface-3)] border border-[var(--border-soft)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">Tu Consulta</label>
              <textarea
                required
                rows="3"
                placeholder="¿En qué te podemos ayudar?"
                className="w-full bg-[var(--bg-surface-3)] border border-[var(--border-soft)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
                value={formData.mensaje}
                onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-95 text-white text-xs font-black uppercase tracking-widest py-3 rounded-xl transition-all"
            >
              <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.394 0 12.03c0 2.12.554 4.189 1.604 6.04L0 24l6.104-1.602a11.803 11.803 0 005.94 1.597h.005c6.634 0 12.032-5.394 12.036-12.031a11.78 11.78 0 00-3.483-8.479" />
              </svg>
              Enviar por WhatsApp
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[var(--border-soft)] bg-[var(--bg-surface-3)]">
          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">
            Atención inmediata · WhatsApp Web
          </p>
        </div>
      </div>

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          h-14 w-14 bg-[#25D366] rounded-2xl flex items-center justify-center
          shadow-[0_8px_24px_rgba(37,211,102,0.35)] transition-all duration-300
          hover:scale-105 hover:shadow-[0_12px_32px_rgba(37,211,102,0.45)] active:scale-95
          ${!isOpen ? 'animate-bounce' : ''}
        `}
        style={{ animationDuration: '3s' }}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <div className="relative">
            <svg className="h-7 w-7 text-white fill-current" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.394 0 12.03c0 2.12.554 4.189 1.604 6.04L0 24l6.104-1.602a11.803 11.803 0 005.94 1.597h.005c6.634 0 12.032-5.394 12.036-12.031a11.78 11.78 0 00-3.483-8.479" />
            </svg>
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-500 rounded-full border-2 border-[#25D366] animate-pulse" />
          </div>
        )}
      </button>

    </div>
  );
};

export default WhatsAppWidget;
