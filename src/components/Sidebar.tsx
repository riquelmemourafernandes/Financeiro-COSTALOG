import React from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  Building2, 
  Truck, 
  Briefcase, 
  Settings, 
  ShieldCheck, 
  FileText,
  ArrowLeftRight,
  TrendingUp,
  Globe,
  LogOut
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

export type ViewType = 'dashboard' | 'cashflow' | 'comparison' | 'budget' | 'simulation' | 'api' | 'settings' | 'audit' | 'taxes' | 'dre' | 'spreadsheet';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active = false, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active?: boolean, 
  onClick: () => void 
}) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
      active 
        ? "bg-primary/20 text-primary border border-primary/30" 
        : "hover:bg-white/5 text-slate-400 hover:text-slate-200"
    )}
  >
    <Icon size={18} className={cn(active ? "text-primary" : "text-slate-500 group-hover:text-slate-300")} />
    <span className="text-sm font-medium flex-1 text-left">{label}</span>
  </button>
);

export const Sidebar = ({ currentView, onViewChange }: SidebarProps) => {
  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="size-10 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <TrendingUp size={24} />
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight uppercase tracking-tight">COSTA GROUP</h1>
          <p className="text-[10px] text-slate-500 font-medium">Financial Cockpit</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto py-2 custom-scrollbar">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-3 py-2 mt-2">Menu Principal</div>
        <SidebarItem 
          icon={LayoutDashboard} 
          label="Painel de Controle" 
          active={currentView === 'dashboard'} 
          onClick={() => onViewChange('dashboard')} 
        />
        <SidebarItem 
          icon={FileText} 
          label="Planilha de Dados" 
          active={currentView === 'spreadsheet'} 
          onClick={() => onViewChange('spreadsheet')} 
        />
        <SidebarItem 
          icon={FileText} 
          label="DRE Gerencial" 
          active={currentView === 'dre'} 
          onClick={() => onViewChange('dre')} 
        />
        <SidebarItem 
          icon={Wallet} 
          label="Fluxo de Caixa" 
          active={currentView === 'cashflow'} 
          onClick={() => onViewChange('cashflow')} 
        />
        <SidebarItem 
          icon={ArrowLeftRight} 
          label="Comparativo" 
          active={currentView === 'comparison'} 
          onClick={() => onViewChange('comparison')} 
        />
        <SidebarItem 
          icon={FileText} 
          label="Orçamento" 
          active={currentView === 'budget'} 
          onClick={() => onViewChange('budget')} 
        />
        <SidebarItem 
          icon={TrendingUp} 
          label="Simulação" 
          active={currentView === 'simulation'} 
          onClick={() => onViewChange('simulation')} 
        />
        <SidebarItem 
          icon={Globe} 
          label="Integrações API" 
          active={currentView === 'api'} 
          onClick={() => onViewChange('api')} 
        />

        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-3 py-2 mt-6">Empresas</div>
        <SidebarItem 
          icon={Building2} 
          label="A.C. DA COSTA" 
          active={false} 
          onClick={() => {}} 
        />
        <SidebarItem 
          icon={Truck} 
          label="COMEX COSTA LOG" 
          active={false} 
          onClick={() => {}} 
        />
        <SidebarItem 
          icon={Briefcase} 
          label="CRC COSTA" 
          active={false} 
          onClick={() => {}} 
        />

        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-3 py-2 mt-6">Sistema</div>
        <SidebarItem 
          icon={ShieldCheck} 
          label="Auditoria" 
          active={currentView === 'audit'} 
          onClick={() => onViewChange('audit')} 
        />
        <SidebarItem 
          icon={Settings} 
          label="Configurações" 
          active={currentView === 'settings'} 
          onClick={() => onViewChange('settings')} 
        />
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer">
          <div className="size-9 rounded-full bg-slate-700 overflow-hidden ring-2 ring-border group-hover:ring-primary/40 transition-all">
            <img 
              alt="User Profile" 
              src="https://picsum.photos/seed/executive/100/100" 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">Admin User</p>
            <p className="text-[10px] text-slate-500 truncate">Diretoria Financeira</p>
          </div>
          <button className="text-slate-500 hover:text-rose-500 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
