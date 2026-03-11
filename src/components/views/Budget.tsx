import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2,
  AlertCircle,
  Download,
  Calendar,
  History,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { FinancialService } from '@/src/services/api';

const BudgetKPI = ({ title, current, budget, pct, trend, trendVal, status }: any) => (
  <div className="bg-surface border border-border p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
    <div className="flex justify-between items-start mb-4">
      <p className="text-sm font-semibold text-slate-400">{title}</p>
      <div className={cn(
        "p-2 rounded-lg",
        status === 'warning' ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"
      )}>
        <TrendingUp size={18} />
      </div>
    </div>
    <div className="flex items-baseline gap-2 mb-2">
      <h3 className="text-2xl font-bold text-slate-100">{current}</h3>
      <span className="text-slate-500 font-medium">/ {budget}</span>
    </div>
    <div className="w-full bg-white/5 rounded-full h-2 mb-2">
      <div className={cn("h-2 rounded-full transition-all duration-1000", status === 'warning' ? "bg-amber-500" : "bg-primary")} style={{ width: `${pct}%` }}></div>
    </div>
    <div className="flex justify-between items-center">
      <p className={cn("text-xs font-bold flex items-center gap-1", trend === 'up' ? "text-emerald-500" : "text-rose-500")}>
        {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {trendVal} vs. Meta
      </p>
      <p className="text-xs text-slate-500">{pct}% atingido</p>
    </div>
  </div>
);

export const BudgetView = ({ period, selectedCompanies }: { period: { month: number, year: number }, selectedCompanies: string[] }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentDRE = await FinancialService.getDREData(period, selectedCompanies, false, true);
      
      const prevPeriod = {
        month: period.month === 1 ? 12 : period.month - 1,
        year: period.month === 1 ? period.year - 1 : period.year
      };
      const prevDRE = await FinancialService.getDREData(prevPeriod, selectedCompanies, false, true);

      // We'll treat "Budget" as Previous Month + 5% for this demo
      // In a real app, this would come from a specific budget endpoint
      const budgetMultiplier = 1.05;
      
      const budgetData = {
        revenue: prevDRE.totalRevenue * budgetMultiplier,
        expense: prevDRE.totalExpense * budgetMultiplier,
        result: (prevDRE.totalRevenue - prevDRE.totalExpense) * budgetMultiplier
      };

      setData({
        current: currentDRE,
        budget: budgetData,
        revenuePct: Math.min(100, (currentDRE.totalRevenue / budgetData.revenue) * 100),
        expensePct: Math.min(100, (currentDRE.totalExpense / budgetData.expense) * 100),
        resultPct: Math.min(100, ((currentDRE.totalRevenue - currentDRE.totalExpense) / budgetData.result) * 100)
      });
      
      setLoading(false);
    } catch (err) {
      console.error("Error fetching budget data:", err);
      setError("Falha ao carregar dados do orçamento.");
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

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-100">Acompanhamento Orçamentário</h1>
          <p className="text-slate-500 font-medium">Cockpit Financeiro — Realizado vs. Meta (Baseado no mês anterior +5%)</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={fetchData}
            className="p-2 bg-surface border border-border rounded-lg text-slate-400 hover:text-white transition-all"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20">
            <Download size={14} /> Exportar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <BudgetKPI 
          title="Receita Total" 
          current={formatCurrency(data.current.totalRevenue)} 
          budget={formatCurrency(data.budget.revenue)} 
          pct={data.revenuePct.toFixed(1)} 
          trend={data.current.totalRevenue >= data.budget.revenue ? "up" : "down"} 
          trendVal={`${(data.revenuePct - 100).toFixed(1)}%`} 
        />
        <BudgetKPI 
          title="Despesas" 
          current={formatCurrency(data.current.totalExpense)} 
          budget={formatCurrency(data.budget.expense)} 
          pct={data.expensePct.toFixed(1)} 
          trend={data.current.totalExpense <= data.budget.expense ? "up" : "down"} 
          trendVal={`${(100 - data.expensePct).toFixed(1)}%`} 
          status={data.current.totalExpense > data.budget.expense ? 'warning' : 'success'} 
        />
        <div className="bg-surface border border-border p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-semibold text-slate-400">Resultado Líquido</p>
            <div className={cn(
              "p-2 rounded-lg",
              data.current.netResult >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            )}>
              {data.current.netResult >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className={cn("text-2xl font-bold", data.current.netResult >= 0 ? "text-emerald-500" : "text-rose-500")}>
              {formatCurrency(data.current.netResult)}
            </h3>
          </div>
          <div className={cn("w-full h-2 rounded-full mb-2", data.current.netResult >= 0 ? "bg-emerald-500" : "bg-rose-500")}></div>
          <div className="flex justify-between items-center">
            <p className={cn("text-xs font-bold flex items-center gap-1", data.current.netResult >= data.budget.result ? "text-emerald-500" : "text-rose-500")}>
              {data.current.netResult >= data.budget.result ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {((data.current.netResult / data.budget.result - 1) * 100).toFixed(1)}% vs. Meta
            </p>
            <p className="text-xs text-slate-500">Saldo {data.current.netResult >= 0 ? 'Positivo' : 'Negativo'}</p>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h3 className="font-bold text-lg">Análise de Variação por Categoria</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Categoria</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Meta (R$)</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Realizado (R$)</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Variação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(data.current.categories).map(([key, cat]: any) => {
                const real = cat.value;
                const budget = real * 0.95; // Mock budget for categories
                const diff = ((real / budget - 1) * 100);
                const isRevenue = key.startsWith('1.') || key.startsWith('2.6');
                const isSuccess = isRevenue ? diff >= 0 : diff <= 0;

                return (
                  <tr key={key} className="hover:bg-white/5 transition-colors cursor-pointer">
                    <td className="px-6 py-4 font-semibold text-sm text-slate-300">{cat.label}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 text-right">{formatCurrency(budget)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-100 text-right">{formatCurrency(real)}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span className={cn(
                        "px-2 py-1 rounded font-bold",
                        isSuccess ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                      )}>{diff > 0 ? '+' : ''}{diff.toFixed(1)}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
