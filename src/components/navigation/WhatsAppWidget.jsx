import { useState } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';

const WhatsAppWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    mensaje: ''
  });

  const WHATSAPP_NUMBER = '593982650929';

  const handleSend = (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.mensaje) return;

    const text = `¡Hola! 👋 Mi nombre es ${formData.nombre}. Mi consulta es: ${formData.mensaje}`;
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedText}`;
    
    window.open(whatsappUrl, '_blank');
    setIsOpen(false);
    setFormData({ nombre: '', mensaje: '' });
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-4 font-sans">
      
      {/* Chat window */}
      <div 
        className={`
          w-[320px] md:w-[360px] bg-[var(--bg-surface-3)] rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 ease-in-out border border-[var(--border-soft)]
          ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95 pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="bg-[#075e54] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div className="absolute bottom-0 right-0 h-3 w-3 bg-[#25D366] rounded-full border-2 border-[#075e54]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">Centro de Ayuda</h3>
              <p className="text-[10px] text-white/60 font-medium uppercase tracking-widest">En línea</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5 text-white/70" />
          </button>
        </div>

        {/* Chat Body (WhatsApp Background Style) */}
        <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
          
          {/* Incoming Message */}
          <div className="flex flex-col items-start max-w-[85%]">
            <div className="bg-[var(--bg-surface-2)] p-3 rounded-2xl rounded-tl-none shadow-sm relative text-[13px] text-[var(--text-primary)] leading-relaxed font-medium border border-[var(--border-soft)]">
              ¡Hola! 👋 Bienvenido al Centro de Ayuda de MisTrajes.
              <br /><br />
              Por favor, cuéntanos tu nombre y en qué podemos ayudarte hoy.
              <span className="block text-[9px] text-[var(--text-muted)] mt-1 text-right">09:00 AM</span>
            </div>
          </div>

          {/* Form inside chat */}
          <form onSubmit={handleSend} className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Tu Nombre</label>
              <input 
                type="text" 
                required
                placeholder="Ej: Juan Pérez"
                className="w-full bg-[var(--bg-surface-2)]/90 backdrop-blur-sm border border-[var(--border-soft)] rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#25D366] transition-all text-[var(--text-primary)] placeholder-[var(--text-muted)] font-medium"
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Tu Consulta</label>
              <textarea 
                required
                rows="3"
                placeholder="¿En qué te podemos ayudar?"
                className="w-full bg-[var(--bg-surface-2)]/90 backdrop-blur-sm border border-[var(--border-soft)] rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#25D366] transition-all text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none font-medium"
                value={formData.mensaje}
                onChange={(e) => setFormData({...formData, mensaje: e.target.value})}
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-[#25D366] hover:bg-[#128c7e] text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95 text-sm uppercase tracking-widest"
            >
              <Send className="h-4 w-4" /> Enviar por WhatsApp
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="bg-[var(--bg-surface-2)]/50 backdrop-blur-md p-2 text-center border-t border-[var(--border-soft)]">
          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter italic">
            Atención Inmediata vía WhatsApp Web
          </p>
        </div>
      </div>

      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`
          h-16 w-16 bg-[#25D366] rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(37,211,102,0.4)] transition-all duration-300 group hover:scale-110 active:scale-90
          ${isOpen ? 'rotate-90' : 'animate-bounce'}
        `}
        style={{ animationDuration: '3s' }}
      >
        {isOpen ? (
          <X className="h-8 w-8 text-white" />
        ) : (
          <div className="relative">
            <svg 
              className="h-8 w-8 text-white fill-current" 
              viewBox="0 0 24 24"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.394 0 12.03c0 2.12.554 4.189 1.604 6.04L0 24l6.104-1.602a11.803 11.803 0 005.94 1.597h.005c6.634 0 12.032-5.394 12.036-12.031a11.78 11.78 0 00-3.483-8.479" />
            </svg>
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-[#25D366] animate-pulse" />
          </div>
        )}
      </button>

    </div>
  );
};

export default WhatsAppWidget;
