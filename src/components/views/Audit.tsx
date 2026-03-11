import React from 'react';
import { 
  Shield, 
  History, 
  Users, 
  Lock, 
  Search, 
  Download, 
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  Settings
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const AuditStat = ({ title, value, change, trend, icon: Icon, color }: any) => (
  <div className="bg-surface border border-border p-6 rounded-xl shadow-sm hover-card-effect">
    <div className="flex items-center justify-between mb-2">
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <Icon className={cn("text-[20px]", color)} size={20} />
    </div>
    <div className="flex items-end gap-3">
      <h3 className="text-2xl font-bold text-slate-100">{value}</h3>
      <span className={cn(
        "text-sm font-semibold flex items-center mb-1",
        trend === 'up' ? "text-emerald-500" : "text-rose-500"
      )}>
        {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        {change}
      </span>
    </div>
  </div>
);

import { TrendingUp, TrendingDown } from 'lucide-react';

export const AuditView = ({ period }: { period: { month: number, year: number } }) => {
  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
      <header className="flex items-center justify-between">
        <h2 className="text-3xl font-black tracking-tight">Auditoria e Log de Alterações</h2>
        <div className="flex items-center gap-3">
          <button className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors active:scale-95">
            <Download size={18} /> Exportar Log
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AuditStat title="Alterações (24h)" value="1,284" change="12%" trend="up" icon={History} color="text-primary" />
        <AuditStat title="Usuários Ativos" value="42" change="5%" trend="up" icon={Users} color="text-primary" />
        <div className="bg-surface border border-border p-6 rounded-xl shadow-sm border-l-4 border-l-amber-500 hover-card-effect">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-sm font-medium">Alertas de Segurança</p>
            <Shield className="text-amber-500" size={20} />
          </div>
          <div className="flex items-end gap-3">
            <h3 className="text-2xl font-bold text-slate-100">3</h3>
            <span className="text-rose-500 text-sm font-semibold flex items-center mb-1">
              <TrendingDown size={14} /> 2%
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mr-2">
          <Filter size={18} /> Filtros:
        </div>
        {['Período: Últimos 7 dias', 'Usuário: Todos', 'Tipo: Todas'].map((f, i) => (
          <button key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-border rounded-lg text-sm hover:border-primary transition-colors">
            <span>{f}</span>
            <ChevronRight size={14} className="rotate-90" />
          </button>
        ))}
        <button className="ml-auto text-primary text-xs font-bold hover:underline">Limpar Filtros</button>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-border">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Data/Hora</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Usuário</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Ação</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Módulo</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">IP</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { time: '24/05/2024 14:32:05', user: 'Ricardo Costa', action: 'Alterou Orçamento', module: 'DRE', ip: '192.168.1.105', status: 'success' },
                { time: '24/05/2024 13:15:22', user: 'Ana Silva', action: 'Criou Chave API', module: 'CONFIG', ip: '187.45.12.33', status: 'warning' },
                { time: '24/05/2024 11:02:45', user: 'Marcus V.', action: 'Excluiu Investimento', module: 'INVEST', ip: '177.23.4.11', status: 'success' },
                { time: '24/05/2024 09:45:10', user: 'Sistema', action: 'Backup Automático', module: 'INFRA', ip: 'Interno', status: 'success', system: true },
              ].map((log, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{log.time}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {log.system ? (
                        <div className="size-8 rounded-full bg-primary flex items-center justify-center text-white"><Settings size={14} /></div>
                      ) : (
                        <div className="size-8 rounded-full bg-slate-700 overflow-hidden"><img src={`https://picsum.photos/seed/${log.user}/32/32`} referrerPolicy="no-referrer" /></div>
                      )}
                      <span className="text-sm font-semibold text-slate-200">{log.user}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-300">{log.action}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-slate-400 uppercase">{log.module}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500">{log.ip}</td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "flex items-center gap-1.5 text-xs font-bold",
                      log.status === 'success' ? "text-emerald-500" : "text-amber-500"
                    )}>
                      <div className={cn("size-2 rounded-full", log.status === 'success' ? "bg-emerald-500" : "bg-amber-500")}></div>
                      {log.status === 'success' ? 'Sucesso' : 'Aviso'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-white/5">
          <p className="text-xs text-slate-500">Mostrando 4 de 1,284 registros</p>
          <div className="flex items-center gap-2">
            <button className="p-1 rounded bg-surface border border-border text-slate-500 hover:text-primary transition-colors"><ChevronLeft size={18} /></button>
            <span className="text-xs font-bold px-3 py-1 bg-primary text-white rounded">1</span>
            <button className="p-1 rounded bg-surface border border-border text-slate-500 hover:text-primary transition-colors"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};
