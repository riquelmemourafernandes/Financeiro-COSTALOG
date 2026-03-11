import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronDown, 
  MoreVertical, 
  Maximize2,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { FinancialService } from '@/src/services/api';

const SummaryCard = ({ title, value, change, trend, icon, color }: any) => (
  <div className="bg-surface border border-border p-5 rounded-xl">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-2 rounded-lg", color)}>
        {icon}
      </div>
      <span className={cn(
        "text-[10px] font-bold px-2 py-0.5 rounded-full",
        trend === 'up' ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
      )}>
        {change}
      </span>
    </div>
    <p className="text-xs font-medium text-slate-400">{title}</p>
    <p className="text-2xl font-black mt-1">{value}</p>
  </div>
);

import { cn } from '@/src/lib/utils';

export const CashFlowView = ({ period }: { period: { month: number, year: number } }) => {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const inflow = await FinancialService.getReceivablesSummary(period);
        const outflow = await FinancialService.getPayablesSummary(period);
        
        const prevPeriod = {
          month: period.month === 1 ? 12 : period.month - 1,
          year: period.month === 1 ? period.year - 1 : period.year
        };
        
        const prevInflow = await FinancialService.getReceivablesSummary(prevPeriod);
        const prevOutflow = await FinancialService.getPayablesSummary(prevPeriod);

        setData({
          inflow,
          outflow,
          net: inflow - outflow,
          prevNet: prevInflow - prevOutflow,
          changes: {
            inflow: prevInflow ? ((inflow - prevInflow) / prevInflow * 100).toFixed(1) : '0',
            outflow: prevOutflow ? ((outflow - prevOutflow) / prevOutflow * 100).toFixed(1) : '0',
            net: (prevInflow - prevOutflow) ? (((inflow - outflow) - (prevInflow - prevOutflow)) / Math.abs(prevInflow - prevOutflow) * 100).toFixed(1) : '0'
          }
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          title="Total Entradas" 
          value={formatCurrency(data.inflow)} 
          change={`${data.changes.inflow}%`} 
          trend={parseFloat(data.changes.inflow) >= 0 ? 'up' : 'down'} 
          icon={<ArrowUpRight className="text-emerald-500" />} 
          color="bg-emerald-500/10" 
        />
        <SummaryCard 
          title="Total Saídas" 
          value={formatCurrency(data.outflow)} 
          change={`${data.changes.outflow}%`} 
          trend={parseFloat(data.changes.outflow) <= 0 ? 'down' : 'up'} 
          icon={<ArrowDownRight className="text-rose-500" />} 
          color="bg-rose-500/10" 
        />
        <SummaryCard 
          title="Fluxo Líquido" 
          value={formatCurrency(data.net)} 
          change={`${data.changes.net}%`} 
          trend={parseFloat(data.changes.net) >= 0 ? 'up' : 'down'} 
          icon={<Wallet className="text-primary" />} 
          color="bg-primary/10" 
        />
        <div className="bg-primary p-5 rounded-xl text-white shadow-xl shadow-primary/20">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <Wallet size={20} />
            </div>
          </div>
          <p className="text-xs font-medium text-white/80">Saldo Final Estimado</p>
          <p className="text-2xl font-black mt-1">{formatCurrency(data.net)}</p>
        </div>
      </div>

      {/* Visualization Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Waterfall Chart Placeholder */}
        <div className="xl:col-span-2 bg-surface border border-border p-6 rounded-xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-base font-bold">Ponte de Fluxo de Caixa</h3>
              <p className="text-xs text-slate-500">Ponte entre Saldo de Abertura e Fechamento (FY 2024)</p>
            </div>
            <div className="flex gap-4 text-[10px] font-semibold">
              <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-700"></span> Abertura</div>
              <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500"></span> Positivo</div>
              <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-500"></span> Negativo</div>
              <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary"></span> Fechamento</div>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-4 px-4">
            {[
              { label: 'Abertura', val: 24, color: 'bg-slate-700', offset: 0 },
              { label: 'Operacional', val: 32, color: 'bg-emerald-500/80', offset: 24 },
              { label: 'Investimentos', val: 10, color: 'bg-rose-500/80', offset: 54 },
              { label: 'Financiamento', val: 6, color: 'bg-rose-500/80', offset: 52 },
              { label: 'Fechamento', val: 40, color: 'bg-primary', offset: 0 },
            ].map((bar, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <div 
                  className={cn("w-full rounded-t-sm relative transition-all", bar.color)}
                  style={{ 
                    height: `${bar.val * 2}px`,
                    transform: `translateY(-${bar.offset * 2}px)`
                  }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold">
                    {i === 0 || i === 4 ? `R$ ${(bar.val/10).toFixed(1)}M` : `${bar.val > 0 ? '+' : ''}${(bar.val/10).toFixed(1)}M`}
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 text-center">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Entity Breakdown */}
        <div className="bg-surface border border-border p-6 rounded-xl flex flex-col">
          <h3 className="text-base font-bold mb-4">Entradas por Categoria</h3>
          <div className="space-y-5 flex-1 overflow-y-auto">
            {[
              { label: 'Recebimentos de Clientes', val: 'R$ 3.2M', pct: 75, color: 'bg-primary' },
              { label: 'Receita de Juros', val: 'R$ 0.4M', pct: 10, color: 'bg-blue-400' },
              { label: 'Venda de Ativos', val: 'R$ 0.3M', pct: 7, color: 'bg-cyan-400' },
              { label: 'Outras Entradas', val: 'R$ 0.3M', pct: 8, color: 'bg-slate-400' },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-slate-500">{item.val} ({item.pct}%)</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={cn("h-full", item.color)} style={{ width: `${item.pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 text-xs font-bold text-primary border border-primary/20 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors">
            Ver Distribuição Detalhada
          </button>
        </div>
      </div>

      {/* Structured Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-bold">Detalhamento da Demonstração</h3>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-500"><Maximize2 size={18} /></button>
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-500"><MoreVertical size={18} /></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-white/5 text-slate-500 font-medium">
                <th className="px-6 py-4">Atividades e Itens</th>
                <th className="px-6 py-4 text-right">Período Atual</th>
                <th className="px-6 py-4 text-right">Período Anterior</th>
                <th className="px-6 py-4 text-right">Variação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="bg-white/5 font-bold text-slate-100">
                <td className="px-6 py-4 flex items-center gap-2"><ChevronDown size={14} className="text-primary" /> Caixa das Atividades Operacionais</td>
                <td className="px-6 py-4 text-right">R$ 2.145.000</td>
                <td className="px-6 py-4 text-right">R$ 1.850.000</td>
                <td className="px-6 py-4 text-right text-emerald-500">+15.9%</td>
              </tr>
              <tr className="text-slate-400">
                <td className="pl-12 pr-6 py-3 italic">Recebimentos de Clientes</td>
                <td className="px-6 py-3 text-right font-medium">R$ 3.240.000</td>
                <td className="px-6 py-3 text-right">R$ 2.900.000</td>
                <td className="px-6 py-3 text-right">+11.7%</td>
              </tr>
              <tr className="text-slate-400">
                <td className="pl-12 pr-6 py-3 italic">Pagamentos a Fornecedores</td>
                <td className="px-6 py-3 text-right font-medium text-rose-500">(R$ 980.000)</td>
                <td className="px-6 py-3 text-right">(R$ 920.000)</td>
                <td className="px-6 py-3 text-right">+6.5%</td>
              </tr>
              <tr className="bg-primary/5 font-black text-slate-100">
                <td className="px-6 py-6 uppercase tracking-wider">Aumento Líquido de Caixa</td>
                <td className="px-6 py-6 text-right">R$ 1.133.900</td>
                <td className="px-6 py-6 text-right">R$ 1.190.000</td>
                <td className="px-6 py-6 text-right text-rose-500">-4.7%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
