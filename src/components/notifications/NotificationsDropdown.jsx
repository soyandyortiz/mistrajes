import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Bell, Check, ShoppingCart, Info, AlertTriangle } from 'lucide-react';

const NotificationsDropdown = () => {
  const { profile } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    if (!profile) return;

    try {
      // 1. Fetch system notices
      const { data: avisosData } = await supabase
        .from('avisos_sistema')
        .select('*')
        .eq('es_activo', true)
        .order('created_at', { ascending: false });

      let pedidosData = [];
      let contratosData = [];

      if (profile.tenant_id) {
        const { data: pData } = await supabase
          .from('contratos')
          .select('id, codigo, created_at')
          .eq('tenant_id', profile.tenant_id)
          .eq('canal', 'online')
          .eq('estado', 'pendiente_pago')
          .order('created_at', { ascending: false });
        pedidosData = pData || [];

        const { data: cData } = await supabase
          .from('contratos')
          .select('id, codigo, created_at')
          .eq('tenant_id', profile.tenant_id)
          .eq('estado', 'devuelto_con_problemas')
          .order('created_at', { ascending: false });
        contratosData = cData || [];
      }

      // Get dismissed notifications from local storage
      const dismissed = JSON.parse(localStorage.getItem(`dismissed_notifs_${profile.id}`) || '[]');

      let combined = [];

      if (avisosData) {
        avisosData.forEach(aviso => {
          combined.push({
            uid: `aviso_${aviso.id}`,
            type: 'aviso',
            title: aviso.titulo || 'Aviso del Sistema',
            description: aviso.mensaje || 'Información importante de Mantenimiento.',
            createdAt: new Date(aviso.created_at),
            icon: Info,
            color: 'text-blue-400 bg-blue-500/10 border-blue-500/30'
          });
        });
      }

      if (pedidosData) {
        pedidosData.forEach(pedido => {
          combined.push({
            uid: `pedido_${pedido.id}`,
            type: 'pedido',
            title: `Nuevo Pedido Online`,
            description: `Se ha recibido un nuevo pedido ${pedido.codigo || pedido.id.substring(0, 8).toUpperCase()}`,
            createdAt: new Date(pedido.created_at),
            icon: ShoppingCart,
            color: 'text-green-500 bg-green-500/10 border-green-500/30'
          });
        });
      }

      if (contratosData) {
        contratosData.forEach(contrato => {
          combined.push({
            uid: `contrato_${contrato.id}`,
            type: 'contrato',
            title: `Contrato con Problemas`,
            description: `El contrato ${contrato.codigo || contrato.id.substring(0, 8).toUpperCase()} fue devuelto con incidencias.`,
            createdAt: new Date(contrato.created_at),
            icon: AlertTriangle,
            color: 'text-red-500 bg-red-500/10 border-red-500/30'
          });
        });
      }

      // Sort by latest
      combined.sort((a, b) => b.createdAt - a.createdAt);

      // Filter out dismissed
      const activeNotifications = combined.filter(n => !dismissed.includes(n.uid));
      
      setNotifications(activeNotifications);
      setUnreadCount(activeNotifications.length);

    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [profile]);

  const handleDismiss = (e, uid) => {
    e.stopPropagation();
    const dismissed = JSON.parse(localStorage.getItem(`dismissed_notifs_${profile.id}`) || '[]');
    dismissed.push(uid);
    localStorage.setItem(`dismissed_notifs_${profile.id}`, JSON.stringify(dismissed));
    
    const updated = notifications.filter(n => n.uid !== uid);
    setNotifications(updated);
    setUnreadCount(updated.length);
  };

  return (
    <div className="relative group cursor-pointer mr-2" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all outline-none"
      >
        <Bell className="h-5 w-5 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white shadow-lg shadow-red-500/30">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-3 w-80 bg-[var(--bg-surface-3)]/95 backdrop-blur-xl border border-[var(--border-soft)] rounded-2xl shadow-2xl z-[100] overflow-hidden flex flex-col max-h-[400px] animate-in fade-in slide-in-from-top-2">
          <div className="px-4 py-3 border-b border-[var(--border-soft)] bg-[var(--bg-surface-2)]/50 flex items-center justify-between shrink-0">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">Notificaciones</h3>
            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{unreadCount} Pendientes</span>
          </div>

          <div className="overflow-y-auto w-full custom-scrollbar flex-1 relative">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="h-10 w-10 rounded-full mb-3 bg-[var(--bg-surface-2)] flex items-center justify-center">
                  <Bell className="h-4 w-4 text-[var(--text-muted)] opcity-20" />
                </div>
                <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Sin notificaciones</p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {notifications.map((notif) => {
                  const Icon = notif.icon;
                  return (
                    <li key={notif.uid} className="relative flex items-start p-4 hover:bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)] last:border-0 transition-colors group/item">
                      <div className={`shrink-0 mt-0.5 mr-3 p-2 rounded-xl border ${notif.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0 pr-10">
                        <p className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest mb-0.5">{notif.title}</p>
                        <p className="text-xs text-[var(--text-secondary)] leading-snug truncate">{notif.description}</p>
                        <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1.5">{notif.createdAt.toLocaleString('es-EC')}</p>
                      </div>
                      
                      <button 
                        onClick={(e) => handleDismiss(e, notif.uid)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all opacity-0 group-hover/item:opacity-100 translate-x-2 group-hover/item:translate-x-0 border border-green-500/20"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;
