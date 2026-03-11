import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Download,
  Calendar,
  Building2,
  Lightbulb,
  Rocket,
  ArrowRight,
  Search,
  Percent,
  Wallet,
  CreditCard
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

const TaxSummaryCard = ({ title, value, change, trend, icon: Icon, color }: any) => (
  <div className="bg-surface p-6 rounded-xl border border-border shadow-sm hover-card-effect">
    <div className="flex items-center justify-between mb-4">
      <div className={cn("p-2 rounded-lg", color)}>
        <Icon size={20} />
      </div>
      <span className={cn(
        "text-xs font-bold flex items-center",
        trend === 'up' ? "text-emerald-500" : "text-rose-500"
      )}>
        {change} {trend === 'up' ? <TrendingUp size={14} className="ml-1" /> : <TrendingDown size={14} className="ml-1" />}
      </span>
    </div>
    <p className="text-sm font-medium text-slate-500">{title}</p>
    <h3 className="text-2xl font-bold mt-1 tracking-tight text-slate-100">{value}</h3>
  </div>
);

export const TaxesView = ({ period }: { period: { month: number, year: number } }) => {
  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatório de Impostos e Tributos</h1>
          <p className="text-sm text-slate-500">Visão consolidada do grupo financeiro</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-surface border border-border rounded-lg px-3 py-1.5 shadow-sm">
            <Calendar size={16} className="text-slate-500 mr-2" />
            <select className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer text-slate-300">
              <option>Últimos 12 meses</option>
              <option>Este Ano</option>
            </select>
          </div>
          <button className="bg-primary text-white p-2 rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            <Download size={18} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <TaxSummaryCard title="Total de Impostos Pagos" value="R$ 4.280.000" change="+5.2%" trend="up" icon={CreditCard} color="bg-blue-500/10 text-blue-500" />
        <TaxSummaryCard title="Economia Tributária" value="R$ 520.000" change="-2.1%" trend="down" icon={Wallet} color="bg-emerald-500/10 text-emerald-500" />
        <TaxSummaryCard title="Carga Tributária Média" value="22,5%" change="+0.4%" trend="up" icon={Percent} color="bg-amber-500/10 text-amber-500" />
        <TaxSummaryCard title="Impostos a Recuperar" value="R$ 890.000" change="+12.8%" trend="up" icon={Rocket} color="bg-purple-500/10 text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold">Impostos por Unidade (Milhares R$)</h4>
          </div>
          <div className="h-64 flex items-end gap-12 px-4">
            {[
              { label: 'A.C. DA COSTA', val: 80, fill: 65 },
              { label: 'COMEX', val: 60, fill: 45 },
              { label: 'CRC', val: 45, fill: 30 },
            ].map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center group">
                <div className="w-full bg-primary/10 rounded-t-lg relative h-full transition-all hover:bg-primary/20">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${item.fill}%` }}
                    className="absolute bottom-0 w-full bg-primary rounded-t-lg"
                  />
                </div>
                <span className="mt-3 text-xs font-medium text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
          <h4 className="font-bold mb-6">Composição por Esfera</h4>
          <div className="relative h-48 flex items-center justify-center">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle className="text-white/5" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeWidth="20"></circle>
              <circle className="text-primary" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeDasharray="440" strokeDashoffset="132" strokeWidth="20"></circle>
              <circle className="text-emerald-500" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeDasharray="440" strokeDashoffset="352" strokeWidth="20"></circle>
              <circle className="text-amber-500" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeDasharray="440" strokeDashoffset="418" strokeWidth="20"></circle>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-slate-100">100%</span>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            {[
              { label: 'Federal', pct: 70, color: 'bg-primary' },
              { label: 'Estadual', pct: 20, color: 'bg-emerald-500' },
              { label: 'Municipal', pct: 10, color: 'bg-amber-500' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("size-3 rounded-full", item.color)}></span>
                  <span className="text-xs font-medium text-slate-400">{item.label}</span>
                </div>
                <span className="text-xs font-bold text-slate-200">{item.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h4 className="font-bold">Detalhamento de Tributos</h4>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input className="pl-10 pr-4 py-2 bg-white/5 border border-border rounded-lg text-sm focus:ring-primary text-slate-300" placeholder="Filtrar tributo..." type="text" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Tributo</th>
                <th className="px-6 py-4 font-semibold">Base de Cálculo</th>
                <th className="px-6 py-4 font-semibold">Alíquota</th>
                <th className="px-6 py-4 font-semibold">Valor Devido</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { name: 'IRPJ', sphere: 'Federal', base: 'R$ 12.450.000', rate: '15%', value: 'R$ 1.867.500', status: 'Aguardando', color: 'text-amber-500' },
                { name: 'CSLL', sphere: 'Federal', base: 'R$ 12.450.000', rate: '9%', value: 'R$ 1.120.500', status: 'Pago', color: 'text-emerald-500' },
                { name: 'ICMS', sphere: 'Estadual', base: 'R$ 2.150.000', rate: '18%', value: 'R$ 387.000', status: 'Em Aberto', color: 'text-blue-500' },
              ].map((t, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-200">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.sphere}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{t.base}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-300">{t.rate}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-100">{t.value}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase border", t.color.replace('text-', 'bg-').replace('500', '500/10'), t.color.replace('text-', 'border-').replace('500', '500/20'), t.color)}>{t.status}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 text-primary">
          <Lightbulb size={120} />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-3 mb-4 text-primary">
            <Rocket size={24} />
            <h4 className="text-lg font-bold">Insight Fiscal: Aproveitamento de Créditos</h4>
          </div>
          <p className="text-slate-300 leading-relaxed mb-6">
            Identificamos uma oportunidade de otimização no aproveitamento de créditos de PIS/COFINS sobre insumos logísticos da unidade COMEX. A revisão da base de cálculo nos últimos 24 meses pode gerar uma recuperação estimada de <span className="font-bold text-primary">R$ 145.000,00</span> via PER/DCOMP.
          </p>
          <div className="flex gap-4">
            <button className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all flex items-center gap-2 active:scale-95">
              Iniciar Revisão
            </button>
            <button className="bg-white/5 border border-border px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-white/10 transition-all text-slate-300">
              Ver Detalhes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
