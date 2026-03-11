import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ChevronRight,
  BarChart3,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { FinancialService } from '@/src/services/api';
import { COMPANIES } from '@/src/constants/companies';

const KPICard = ({ title, company, value, change, trend, color, pct }: any) => (
  <div className="bg-surface p-6 rounded-xl border border-border flex flex-col justify-between hover-card-effect">
    <div>
      <div className="flex justify-between items-start mb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</span>
        {change !== undefined && (
          <span className={cn(
            "flex items-center text-xs font-bold px-2 py-0.5 rounded-full",
            trend === 'up' ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
          )}>
            {trend === 'up' ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
            {change}%
          </span>
        )}
      </div>
      <h3 className="text-xl font-bold text-slate-100">{company}</h3>
    </div>
    <div className="mt-4 flex items-end gap-3">
      <span className={cn("text-4xl font-black", color)}>{pct.toFixed(1)}%</span>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden mb-2">
        <div className={cn("h-full rounded-full", color.replace('text-', 'bg-'))} style={{ width: `${pct}%` }}></div>
      </div>
    </div>
  </div>
);

export const ComparisonView = ({ period, selectedCompanies }: { period: { month: number, year: number }, selectedCompanies: string[] }) => {
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState<any[]>([]);
  const [consolidated, setConsolidated] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch data for each selected company
      const results = await Promise.all(
        selectedCompanies.map(async (companyId) => {
          const data = await FinancialService.getDREData(period, [companyId], false, true);
          const company = COMPANIES.find(c => c.id === companyId);
          return {
            id: companyId,
            name: company?.name || companyId,
            color: company?.color || 'text-primary',
            ...data
          };
        })
      );

      // Consolidated data
      const totalRevenue = results.reduce((acc, curr) => acc + curr.totalRevenue, 0);
      const totalExpense = results.reduce((acc, curr) => acc + curr.totalExpense, 0);
      const totalResult = totalRevenue - totalExpense;

      setCompanyData(results);
      setConsolidated({
        totalRevenue,
        totalExpense,
        totalResult
      });
      setLoading(false);
    } catch (err) {
      console.error("Error fetching comparison data:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, selectedCompanies]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(val);
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
      {/* Header Info */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight mb-1">Comparativo entre Empresas</h2>
          <p className="text-slate-500">Visão consolidada e performance relativa do grupo para {period.month}/{period.year}.</p>
        </div>
        <button 
          onClick={fetchData}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
          title="Atualizar dados"
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* KPI Cards: Revenue Share */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companyData.map((company) => (
          <KPICard 
            key={company.id}
            title="Share de Receita" 
            company={company.name} 
            pct={consolidated.totalRevenue > 0 ? (company.totalRevenue / consolidated.totalRevenue) * 100 : 0} 
            trend="up" 
            color={company.color} 
          />
        ))}
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Bar Chart */}
        <div className="lg:col-span-2 bg-surface p-6 rounded-xl border border-border">
          <div className="flex justify-between items-center mb-10">
            <h3 className="font-bold text-lg">Métricas Financeiras Principais (R$)</h3>
            <div className="flex flex-wrap gap-4">
              {companyData.map(company => (
                <div key={company.id} className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <div className={cn("w-3 h-3 rounded-sm", company.color.replace('text-', 'bg-'))}></div> {company.name}
                </div>
              ))}
            </div>
          </div>
          <div className="relative h-[300px] flex items-end justify-around pb-6 border-b border-border">
            {[
              { label: 'Receita Bruta', key: 'totalRevenue' },
              { label: 'Custos Totais', key: 'totalExpense' },
              { label: 'Resultado Líquido', key: 'totalResult' },
            ].map((group, i) => {
              const maxVal = Math.max(...companyData.map(c => Math.abs(c[group.key === 'totalResult' ? 'totalRevenue' : group.key])));
              return (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div className="flex items-end gap-2 h-64">
                    {companyData.map(company => {
                      const val = group.key === 'totalResult' ? (company.totalRevenue - company.totalExpense) : company[group.key];
                      const height = maxVal > 0 ? (Math.abs(val) / maxVal) * 100 : 0;
                      return (
                        <motion.div 
                          key={company.id}
                          initial={{ height: 0 }} 
                          animate={{ height: `${height}%` }} 
                          className={cn("w-6 rounded-t-sm", company.color.replace('text-', 'bg-'), val < 0 && "opacity-50")} 
                          title={`${company.name}: ${formatCurrency(val)}`}
                        />
                      );
                    })}
                  </div>
                  <span className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-tighter">{group.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Efficiency and Margins */}
        <div className="bg-surface p-6 rounded-xl border border-border">
          <h3 className="font-bold text-lg mb-6">Margens Líquidas</h3>
          <div className="flex flex-col gap-6">
            {companyData.map(company => {
              const margin = company.totalRevenue > 0 ? ((company.totalRevenue - company.totalExpense) / company.totalRevenue) * 100 : 0;
              return (
                <div key={company.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-300">{company.name}</span>
                    <span className={cn("font-bold", margin >= 0 ? "text-emerald-500" : "text-rose-500")}>
                      {margin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}
                      className={cn("h-full rounded-full", company.color.replace('text-', 'bg-'))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h3 className="font-bold text-lg">Detalhamento Comparativo</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Indicador</th>
                {companyData.map(company => (
                  <th key={company.id} className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">{company.name}</th>
                ))}
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Consolidado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-6 py-4 text-sm font-semibold text-slate-300">Receita Bruta</td>
                {companyData.map(company => (
                  <td key={company.id} className="px-6 py-4 text-sm text-right text-slate-400">{formatCurrency(company.totalRevenue)}</td>
                ))}
                <td className="px-6 py-4 text-sm font-bold text-right text-slate-100">{formatCurrency(consolidated.totalRevenue)}</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-semibold text-slate-300">Custos e Despesas</td>
                {companyData.map(company => (
                  <td key={company.id} className="px-6 py-4 text-sm text-right text-rose-500">{formatCurrency(company.totalExpense)}</td>
                ))}
                <td className="px-6 py-4 text-sm font-bold text-right text-rose-500">{formatCurrency(consolidated.totalExpense)}</td>
              </tr>
              <tr className="bg-primary/5">
                <td className="px-6 py-4 text-sm font-bold text-primary">Resultado Líquido</td>
                {companyData.map(company => {
                  const res = company.totalRevenue - company.totalExpense;
                  return (
                    <td key={company.id} className={cn("px-6 py-4 text-sm text-right font-bold", res >= 0 ? "text-emerald-500" : "text-rose-500")}>
                      {formatCurrency(res)}
                    </td>
                  );
                })}
                <td className={cn("px-6 py-4 text-sm font-black text-right", consolidated.totalResult >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {formatCurrency(consolidated.totalResult)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
