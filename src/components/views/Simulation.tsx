import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Save,
  Play,
  Info,
  BarChart3,
  Zap,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { FinancialService } from '@/src/services/api';

const SimulationControl = ({ label, value, color, min, max, step, onChange }: any) => (
  <div className="flex flex-col gap-3">
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <span className={cn("font-bold text-sm", color)}>{value > 0 ? '+' : ''}{value}%</span>
    </div>
    <input 
      className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary" 
      max={max} min={min} step={step} type="range" value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
      <span>{min}%</span>
      <span>0%</span>
      <span>{max}%</span>
    </div>
  </div>
);

export const SimulationView = ({ period, selectedCompanies }: { period: { month: number, year: number }, selectedCompanies: string[] }) => {
  const [revenue, setRevenue] = useState(0);
  const [costs, setCosts] = useState(0);
  const [invest, setInvest] = useState(0);
  const [loading, setLoading] = useState(true);
  const [baseData, setBaseData] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const dreData = await FinancialService.getDREData(period, selectedCompanies, false, true);
      setBaseData(dreData);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching simulation data:", err);
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, [period, selectedCompanies]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  const simulatedRevenue = baseData.totalRevenue * (1 + revenue / 100);
  const simulatedCosts = baseData.totalExpense * (1 + costs / 100);
  const simulatedResult = simulatedRevenue - simulatedCosts;
  const originalResult = baseData.totalRevenue - baseData.totalExpense;
  const difference = simulatedResult - originalResult;
  const diffPct = originalResult !== 0 ? (simulatedResult / originalResult - 1) * 100 : 0;

  return (
    <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
      {/* Sidebar: Simulation Controls */}
      <aside className="w-full lg:w-80 border-r border-border p-6 flex flex-col gap-8 bg-surface/50">
        <div>
          <h3 className="text-lg font-bold mb-1">Costa Group</h3>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Parâmetros de Simulação</p>
        </div>
        <div className="flex flex-col gap-6">
          <SimulationControl label="Crescimento de Receita" value={revenue} color="text-primary" min={-20} max={50} step={0.5} onChange={setRevenue} />
          <SimulationControl label="Redução Custo Op. (%)" value={costs} color="text-emerald-500" min={-30} max={30} step={0.5} onChange={setCosts} />
          <SimulationControl label="Ajuste de Investimento" value={invest} color="text-amber-500" min={-50} max={50} step={0.5} onChange={setInvest} />
        </div>
        <div className="mt-auto pt-6 border-t border-border flex flex-col gap-3">
          <button className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95">
            <Save size={16} /> Salvar Cenário
          </button>
          <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-100 font-bold rounded-lg transition-all flex items-center justify-center gap-2 active:scale-95">
            <Play size={16} /> Aplicar ao Orçamento
          </button>
        </div>
      </aside>

      {/* Main Content: Impact Analysis */}
      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight">Análise de Impacto</h1>
              <p className="text-slate-500">Comparativo entre cenário atual e projeção simulada para {period.month}/{period.year}.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface border border-border p-6 rounded-xl flex flex-col gap-2 hover-card-effect">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resultado Líquido Simulado</span>
              <div className="flex items-end gap-2">
                <span className={cn("text-2xl font-black", simulatedResult >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {formatCurrency(simulatedResult)}
                </span>
                <span className={cn("text-sm font-bold pb-1 flex items-center", diffPct >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {diffPct >= 0 ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                  {Math.abs(diffPct).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="bg-surface border border-border p-6 rounded-xl flex flex-col gap-2 hover-card-effect">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Diferença vs. Original</span>
              <div className={cn("flex items-end gap-2", difference >= 0 ? "text-emerald-500" : "text-rose-500")}>
                <span className="text-2xl font-black">{difference >= 0 ? '+' : ''} {formatCurrency(difference)}</span>
                <span className="text-slate-400 text-sm font-medium pb-1 ml-2">Mensal</span>
              </div>
            </div>
            <div className="bg-surface border border-border p-6 rounded-xl flex flex-col gap-2 hover-card-effect">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Margem Líquida Simulada</span>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black">
                  {simulatedRevenue !== 0 ? ((simulatedResult / simulatedRevenue) * 100).toFixed(1) : 0}%
                </span>
                <span className="text-slate-400 text-sm font-medium pb-1 ml-2">vs {baseData.totalRevenue !== 0 ? ((originalResult / baseData.totalRevenue) * 100).toFixed(1) : 0}% atual</span>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <h4 className="font-bold">Detalhamento da Simulação</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Indicador</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Atual</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Simulado</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Variação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-slate-300">Receita Bruta</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-400">{formatCurrency(baseData.totalRevenue)}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-primary">{formatCurrency(simulatedRevenue)}</td>
                    <td className="px-6 py-4 text-sm text-right text-primary">+{revenue}%</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-slate-300">Custos e Despesas</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-400">{formatCurrency(baseData.totalExpense)}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-rose-500">{formatCurrency(simulatedCosts)}</td>
                    <td className="px-6 py-4 text-sm text-right text-rose-500">{costs > 0 ? '+' : ''}{costs}%</td>
                  </tr>
                  <tr className="bg-primary/5">
                    <td className="px-6 py-4 text-sm font-bold text-white">Resultado Líquido</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-400">{formatCurrency(originalResult)}</td>
                    <td className={cn("px-6 py-4 text-sm text-right font-black", simulatedResult >= 0 ? "text-emerald-500" : "text-rose-500")}>
                      {formatCurrency(simulatedResult)}
                    </td>
                    <td className={cn("px-6 py-4 text-sm text-right font-bold", difference >= 0 ? "text-emerald-500" : "text-rose-500")}>
                      {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
