import { CheckCircle, Mail, ArrowRight, MessageCircle, Lock, Globe, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const RegistroExitoso = () => {
  // Recuperar credenciales de demostración guardadas durante el proceso de registro
  const email = sessionStorage.getItem('demo_email') || 'usuario@ejemplo.com';
  const password = sessionStorage.getItem('demo_pass') || '********';
  const subdominio = sessionStorage.getItem('demo_subdomain') || 'tienda';
  const nombreNegocio = sessionStorage.getItem('demo_negocio') || '';
  const nombrePlan = sessionStorage.getItem('demo_plan') || 'Demo Gratuita';

  const mensajeWhatsapp = encodeURIComponent(
    `Hola, acabo de solicitar una DEMO para mi negocio "${nombreNegocio}".\n\n` +
    `📧 Email: ${email}\n` +
    `🌐 URL: https://${subdominio}.mistrajes.com\n\n` +
    `Por favor, ayúdenme con la activación final.`
  );
  const urlWhatsapp = `https://wa.me/593982650929?text=${mensajeWhatsapp}`;

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-[#0a0a0c]">
      
      {/* Background Decorative Element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl aspect-square bg-primary/10 blur-[150px] rounded-full z-0 pointer-events-none opacity-40"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl relative z-10 text-center">
        <div className="glass-card p-10 sm:p-14 border-primary/30 shadow-[0_0_80px_rgba(51,92,255,0.15)] animate-in zoom-in-95 duration-700">
          
          <div className="relative mb-10 w-fit mx-auto">
            <div className="absolute inset-0 rounded-full bg-primary blur-2xl opacity-40 animate-pulse"></div>
            <div className="relative h-28 w-28 rounded-full bg-black/40 border-2 border-primary/40 flex items-center justify-center">
              <CheckCircle className="h-16 w-16 text-primary" aria-hidden="true" />
            </div>
          </div>
          
          <div className="space-y-4">
             <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase italic">
               ¡Solicitud <span className="text-primary italic">Recibida!</span>
             </h2>
             <p className="text-gray-400 font-medium tracking-wide max-w-lg mx-auto leading-relaxed">
               Excelente elección, <strong className="text-white">{nombreNegocio}</strong>. Hemos registrado tu pedido de DEMO gratuita. Tu sistema está siendo preparado.
             </p>
          </div>

          <div className="mt-12 space-y-6">
             {/* Credenciales Card */}
             <div className="p-8 rounded-[32px] bg-white/[0.03] border border-white/10 text-left space-y-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   <ShieldCheck className="h-24 w-24 text-white" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
                   {/* URL */}
                   <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">
                         <Globe className="h-3 w-3" /> URL Del Sistema
                      </div>
                      <div className="text-sm font-bold text-white font-mono bg-white/5 p-3 rounded-xl border border-white/5 select-all truncate">
                         {subdominio}.mistrajes.com
                      </div>
                   </div>

                   {/* Email */}
                   <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">
                         <Mail className="h-3 w-3" /> Usuario / Email
                      </div>
                      <div className="text-sm font-bold text-white font-mono bg-white/5 p-3 rounded-xl border border-white/5 select-all truncate">
                         {email}
                      </div>
                   </div>

                   {/* Password */}
                   <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">
                         <Lock className="h-3 w-3" /> Contraseña Temporal
                      </div>
                      <div className="text-sm font-bold text-white font-mono bg-white/5 p-3 rounded-xl border border-white/5 select-all">
                         {password}
                      </div>
                   </div>

                   {/* Plan */}
                   <div className="space-y-2 flex flex-col justify-end">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 w-fit">
                         <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></div>
                         <span className="text-[9px] font-black text-primary uppercase tracking-widest">{nombrePlan}</span>
                      </div>
                   </div>
                </div>

                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest bg-black/40 p-4 rounded-2xl border border-white/5 italic">
                   ⚠️ Por tu seguridad, una vez activado el acceso deberás cambiar tu contraseña desde tu perfil.
                </p>
             </div>
             
              {/* WhatsApp CTA */}
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 border border-white/10 rounded-[32px] p-8 sm:p-10 text-center sm:text-left shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
                 {/* Decorative background light */}
                 <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 blur-[80px] rounded-full group-hover:bg-white/20 transition-all duration-700"></div>
                 
                 <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
                   <div className="flex-1 space-y-2">
                      <h3 className="text-xl font-black text-white italic">¿Quieres activar tu DEMO ya mismo?</h3>
                      <p className="text-white/70 text-sm font-medium leading-snug">Escríbenos por WhatsApp para validar tu identidad y habilitar el acceso en minutos.</p>
                   </div>
                   <a 
                     href={urlWhatsapp} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="flex items-center justify-center gap-3 bg-white text-[#0a0a0c] hover:bg-gray-50 font-black py-4 px-10 rounded-2xl transition-all w-full sm:w-auto text-[10px] uppercase tracking-[0.15em] shadow-xl shadow-black/20 group hover:scale-[1.02] active:scale-[0.98]"
                   >
                     <MessageCircle className="h-5 w-5 text-[#25D366] fill-[#25D366]/10" />
                     Validar por WhatsApp
                   </a>
                </div>
             </div>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors flex items-center justify-center group"
            >
              <ArrowRight className="mr-2 h-4 w-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
              Volver al Inicio
            </Link>
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-4 opacity-20">
             <div className="h-px w-12 bg-white/30"></div>
             <p className="text-[9px] text-white font-bold uppercase tracking-[0.4em]">Enterprise Grade AI Systems</p>
             <div className="h-px w-12 bg-white/30"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistroExitoso;
