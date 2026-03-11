import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  time: Date;
  read: boolean;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Load initial notifications or mock them
    const mockNotifications: Notification[] = [
      {
        id: '1',
        title: 'Dados Históricos',
        message: 'Pré-carregamento de dados de 2024 e 2025 iniciado para melhor performance.',
        type: 'info',
        time: new Date(),
        read: false
      },
      {
        id: '2',
        title: 'Sincronização Concluída',
        message: 'Os dados do mês corrente foram atualizados com sucesso.',
        type: 'success',
        time: new Date(Date.now() - 1000 * 60 * 5),
        read: true
      }
    ];
    setNotifications(mockNotifications);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return { notifications, markAsRead, clearAll };
};

export const NotificationCenter = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { notifications, markAsRead, clearAll } = useNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed top-16 right-8 w-80 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-primary" />
                <h3 className="text-sm font-bold">Notificações</h3>
                {unreadCount > 0 && (
                  <span className="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button onClick={clearAll} className="text-[10px] text-slate-500 hover:text-white uppercase font-bold tracking-wider">
                Limpar tudo
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={32} className="mx-auto text-slate-700 mb-2 opacity-20" />
                  <p className="text-xs text-slate-500">Nenhuma notificação por enquanto.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`p-4 border-b border-border/50 hover:bg-white/5 transition-colors cursor-pointer ${!n.read ? 'bg-primary/5' : ''}`}
                    onClick={() => markAsRead(n.id)}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5">
                        {n.type === 'success' && <CheckCircle size={14} className="text-emerald-500" />}
                        {n.type === 'error' && <AlertCircle size={14} className="text-rose-500" />}
                        {n.type === 'info' && <Info size={14} className="text-blue-500" />}
                        {n.type === 'warning' && <Clock size={14} className="text-amber-500" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <h4 className={`text-xs font-bold ${!n.read ? 'text-white' : 'text-slate-300'}`}>{n.title}</h4>
                          <span className="text-[10px] text-slate-500">
                            {n.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-3 bg-white/5 text-center border-t border-border">
              <button onClick={onClose} className="text-[10px] text-slate-400 hover:text-white uppercase font-bold tracking-widest">
                Fechar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
