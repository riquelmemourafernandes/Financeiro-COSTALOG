import React from 'react';
import { 
  User, 
  Settings, 
  Users, 
  Building2, 
  Truck,
  Wallet, 
  Bell, 
  Smartphone,
  Globe,
  Moon,
  Sun,
  Lock,
  Camera,
  LogOut,
  ChevronRight,
  Info,
  Edit2,
  Trash2,
  Plus
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const SettingsSection = ({ title, description, children, id }: any) => (
  <section id={id} className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
    <div className="p-6 border-b border-border flex justify-between items-center">
      <div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <button className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all active:scale-95">
        Salvar Alterações
      </button>
    </div>
    <div className="p-8">
      {children}
    </div>
  </section>
);

export const SettingsView = () => {
  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight">Configurações Gerais</h1>
      </header>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Profile */}
        <SettingsSection title="Meu Perfil" description="Gerencie suas informações pessoais e credenciais de acesso." id="perfil">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="relative group">
              <div className="size-32 rounded-full overflow-hidden border-4 border-white/5 ring-2 ring-border group-hover:ring-primary/40 transition-all">
                <img className="w-full h-full object-cover" src="https://picsum.photos/seed/admin/200/200" referrerPolicy="no-referrer" />
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform">
                <Camera size={16} />
              </button>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome Completo</label>
                <input className="w-full bg-white/5 border-border rounded-lg focus:ring-primary text-sm p-2.5" type="text" defaultValue="João Silva" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">E-mail Corporativo</label>
                <input className="w-full bg-white/5 border-border rounded-lg focus:ring-primary text-sm p-2.5" type="email" defaultValue="joao.silva@costa.com.br" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cargo</label>
                <div className="w-full p-2.5 bg-white/5 border border-transparent rounded-lg text-slate-500 cursor-not-allowed text-sm">Diretor Financeiro</div>
              </div>
              <div className="flex items-end">
                <button className="flex items-center gap-2 text-primary font-semibold hover:underline text-sm">
                  <Lock size={14} /> Alterar Senha de Acesso
                </button>
              </div>
            </div>
          </div>
        </SettingsSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* System */}
          <section className="bg-surface rounded-xl border border-border shadow-sm">
            <div className="p-6 border-b border-border"><h3 className="text-lg font-bold">Sistema</h3></div>
            <div className="p-6 space-y-6">
              {[
                { label: 'Notificações por E-mail', desc: 'Alertas de orçamentos e relatórios semanais.', icon: Bell, active: true },
                { label: 'Notificações Push', desc: 'Notificações no app mobile Costa Cockpit.', icon: Smartphone, active: false },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <item.icon className="text-slate-500" size={20} />
                    <div>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                  <button className={cn(
                    "w-11 h-6 rounded-full relative transition-all",
                    item.active ? "bg-primary" : "bg-white/10"
                  )}>
                    <div className={cn("size-4 bg-white rounded-full absolute top-1 transition-all", item.active ? "right-1" : "left-1")}></div>
                  </button>
                </div>
              ))}
              <div className="pt-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Idioma</label>
                  <select className="w-full bg-white/5 border-border rounded-lg focus:ring-primary text-sm p-2.5">
                    <option>Português (Brasil)</option>
                    <option>English (US)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tema</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="flex items-center justify-center gap-2 p-2 rounded-lg border border-border bg-white/5 text-slate-500 text-sm">
                      <Sun size={14} /> Claro
                    </button>
                    <button className="flex items-center justify-center gap-2 p-2 rounded-lg border-2 border-primary bg-primary/10 text-primary text-sm">
                      <Moon size={14} /> Escuro
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Finance */}
          <section className="bg-surface rounded-xl border border-border shadow-sm">
            <div className="p-6 border-b border-border"><h3 className="text-lg font-bold">Financeiro</h3></div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Moeda</label>
                  <select className="w-full bg-white/5 border-border rounded-lg focus:ring-primary text-sm p-2.5">
                    <option>Real (R$)</option>
                    <option>Dólar (US$)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ano Fiscal</label>
                  <select className="w-full bg-white/5 border-border rounded-lg focus:ring-primary text-sm p-2.5">
                    <option>Janeiro</option>
                    <option>Abril</option>
                  </select>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Limites de Alerta</label>
                {[
                  { label: 'Alerta Amarelo', val: 80, color: 'accent-yellow-500', text: 'text-yellow-500' },
                  { label: 'Alerta Crítico', val: 95, color: 'accent-rose-500', text: 'text-rose-500' },
                ].map((a, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-500 w-24">{a.label}</span>
                    <input className={cn("flex-1", a.color)} max="100" min="50" type="range" defaultValue={a.val} />
                    <span className={cn("text-sm font-bold w-10 text-right", a.text)}>{a.val}%</span>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex gap-3">
                <Info className="text-primary shrink-0" size={16} />
                <p className="text-[10px] text-slate-500">As configurações de limites afetam todos os centros de custo consolidados do grupo Costa.</p>
              </div>
            </div>
          </section>
        </div>

        {/* Users */}
        <section className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden" id="usuarios">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h3 className="text-lg font-bold">Gestão de Usuários</h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 active:scale-95 transition-all">
              <Plus size={16} /> Adicionar Usuário
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuário</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nível</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { name: 'João Silva', email: 'joao.silva@costa.com.br', role: 'Administrador', status: 'Ativo' },
                  { name: 'Maria Costa', email: 'maria.costa@costa.com.br', role: 'Editor', status: 'Ativo' },
                  { name: 'Ricardo Lima', email: 'ricardo.lima@costa.com.br', role: 'Visualizador', status: 'Pendente' },
                ].map((u, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-[10px] text-primary">
                          {u.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{u.name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 text-[10px] font-bold rounded-full uppercase",
                        u.role === 'Administrador' ? "bg-primary/10 text-primary" : "bg-white/10 text-slate-400"
                      )}>{u.role}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className={cn("size-2 rounded-full", u.status === 'Ativo' ? "bg-emerald-500" : "bg-slate-500")}></div>
                        <span className="text-xs text-slate-500">{u.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-500 hover:text-primary transition-colors"><Edit2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Companies */}
        <section className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden mb-12" id="empresas">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-bold">Empresas e Unidades</h3>
            <p className="text-sm text-slate-500">Configure as entidades legais e suas respectivas parametrizações fiscais.</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'A.C. DA COSTA', cnpj: '12.345.678/0001-90', type: 'MATRIZ', status: 'OK', icon: Building2 },
              { name: 'COMEX COSTA LOG', cnpj: '23.456.789/0001-01', type: 'FILIAL', status: 'OK', icon: Truck },
              { name: 'CRC COSTA', cnpj: '34.567.890/0001-12', type: 'FILIAL', status: 'PENDENTE', icon: Wallet },
            ].map((c, i) => (
              <div key={i} className="p-4 rounded-xl border border-border hover:border-primary/50 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div className="size-10 bg-white/5 rounded-lg flex items-center justify-center text-primary">
                    <c.icon size={20} />
                  </div>
                  <button className="text-slate-500 hover:text-primary transition-colors"><Settings size={16} /></button>
                </div>
                <h4 className="font-bold text-sm text-slate-200">{c.name}</h4>
                <p className="text-xs text-slate-500 mb-4">CNPJ: {c.cnpj}</p>
                <div className="flex gap-2">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded font-bold", c.type === 'MATRIZ' ? "bg-emerald-500/10 text-emerald-500" : "bg-white/10 text-slate-500")}>{c.type}</span>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded font-bold", c.status === 'OK' ? "bg-blue-500/10 text-blue-500" : "bg-yellow-500/10 text-yellow-500")}>FISCAL {c.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
