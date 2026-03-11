import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  ShoppingCart, 
  ArrowRight,
  ChevronDown,
  BarChart3,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import { FinancialService } from '@/src/services/api';

interface StatProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
  color: string;
  isPrimary?: boolean;
}

const StatCard = ({ title, value, change, trend, icon, color, isPrimary, valueColor }: StatProps & { valueColor?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-surface p-6 rounded-xl border border-border relative overflow-hidden group hover-card-effect ${isPrimary ? 'border-l-4 border-l-primary' : ''}`}
  >
    <div className="flex justify-between items-start mb-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      <div className={`size-10 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
    </div>
    <h3 className={`text-2xl font-bold mb-1 ${valueColor || ''}`}>{value}</h3>
    <div className="flex items-center gap-2">
      <span className={`flex items-center text-xs font-bold ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
        {trend === 'up' ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
        {change}
      </span>
      <span className="text-[10px] text-slate-500">vs mês anterior</span>
    </div>
  </motion.div>
);

const CompanyCard = ({ name, value, bars, color, valueColor }: { name: string, value: string, bars: number[], color: string, valueColor?: string }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-surface p-5 rounded-xl border border-border hover-card-effect"
  >
    <div className="flex justify-between items-center mb-4">
      <h4 className="text-sm font-bold truncate">{name}</h4>
    </div>
    <div className="flex items-end justify-between">
      <div>
        <p className="text-xs text-slate-500">Resultado Líquido</p>
        <p className={`text-lg font-bold ${valueColor || ''}`}>{value}</p>
      </div>
      <div className="flex gap-1 items-end h-10 w-24">
        {bars.map((height, i) => (
          <div 
            key={i} 
            className={`w-2 rounded-t-sm transition-all cursor-pointer hover:brightness-125 ${i === bars.length - 1 ? color : color + '/30'}`}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  </motion.div>
);

export const DashboardView = ({ period, selectedCompanies }: { period: { month: number, year: number }, selectedCompanies: string[] }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Pre-load historical data in the background
    FinancialService.preLoadHistoricalData(selectedCompanies);
  }, [period, selectedCompanies]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Dashboard: Iniciando carga para ${period.month}/${period.year} com empresas: ${selectedCompanies.join(',')}`);
      
      // 1. FIRST PRIORITY: Load current month data immediately
      const dreData = await FinancialService.getDREData(period, selectedCompanies, false, true);
      const totalReceita = dreData.totalRevenue;
      const totalCustos = dreData.totalExpense;
      
      console.log(`Dashboard: Dados do mês atual carregados. Receita: ${totalReceita}`);

      // Set initial stats with current month data so user sees it ASAP
      setStats({
        receitaBruta: { value: totalReceita, change: '0.0', trend: 'neutral' },
        custosTotais: { value: totalCustos, change: '0.0', trend: 'neutral' },
        investimentos: { 
          value: (dreData.categories["4.1 - INVESTIMENTOS"]?.value || 0) + 
                 (dreData.categories["4.2 - FINANCIAMENTOS"]?.value || 0) + 
                 (dreData.categories["4.3 - CONSORCIOS"]?.value || 0) + 
                 (dreData.categories["4.4 - VENDA DE ATIVO"]?.value || 0), 
          change: '0.0', 
          trend: 'neutral' 
        },
        resultadoGerencial: { value: totalReceita - totalCustos, change: '0.0', trend: 'neutral' },
        distribution: [],
        evolution: [],
        companyBreakdown: dreData.companyBreakdown
      });
      
      // Show the UI as soon as we have the current month data
      setLoading(false);

      // 2. SECOND PRIORITY: Load previous month and evolution in background
      const prevPeriod = {
        month: period.month === 1 ? 12 : period.month - 1,
        year: period.month === 1 ? period.year - 1 : period.year
      };
      
      console.log(`Dashboard: Buscando dados comparativos e evolução...`);
      
      const [prevDRE, evolution] = await Promise.all([
        FinancialService.getDREData(prevPeriod, selectedCompanies, false, true),
        FinancialService.getEvolutionData(period, selectedCompanies, true)
      ]);
      
      console.log(`Dashboard: Evolução carregada com ${evolution.length} meses.`);
      
      const prevReceita = prevDRE.totalRevenue;
      const prevCustos = prevDRE.totalExpense;
      
      const calculateChange = (curr: number, prev: number) => {
        if (prev === 0) return 0;
        return ((curr - prev) / prev) * 100;
      };

      const resultado = totalReceita - totalCustos;
      const prevResultado = prevReceita - prevCustos;
      
      // Extract distribution for chart
      const distribution = Object.entries(dreData.categories)
        .filter(([key]) => !key.startsWith('1.') && !key.startsWith('2.6')) // Only expenses
        .map(([key, cat]: [string, any]) => ({
          label: key.split(' - ')[1] || key,
          value: cat.value,
          percent: totalCustos > 0 ? (cat.value / totalCustos) * 100 : 0
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 4);

      setStats({
        receitaBruta: { 
          value: totalReceita, 
          change: calculateChange(totalReceita, prevReceita).toFixed(1), 
          trend: totalReceita >= prevReceita ? 'up' : 'down' 
        },
        custosTotais: { 
          value: totalCustos, 
          change: calculateChange(totalCustos, prevCustos).toFixed(1), 
          trend: totalCustos <= prevCustos ? 'up' : 'down' 
        },
        investimentos: { 
          value: (dreData.categories["4.1 - INVESTIMENTOS"]?.value || 0) + 
                 (dreData.categories["4.2 - FINANCIAMENTOS"]?.value || 0) + 
                 (dreData.categories["4.3 - CONSORCIOS"]?.value || 0) + 
                 (dreData.categories["4.4 - VENDA DE ATIVO"]?.value || 0), 
          change: '0.0', 
          trend: 'neutral' 
        },
        resultadoGerencial: { 
          value: resultado, 
          change: calculateChange(resultado, prevResultado).toFixed(1), 
          trend: resultado >= prevResultado ? 'up' : 'down' 
        },
        distribution,
        evolution,
        companyBreakdown: dreData.companyBreakdown
      });
      
      setError(null);
    } catch (err: any) {
      console.error('Erro ao buscar dados:', err);
      setError('Não foi possível carregar os dados financeiros do período selecionado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-8">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse"></div>
          <div className="relative flex flex-col items-center gap-6">
            <div className="relative">
              <Loader2 className="animate-spin text-primary" size={48} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-2 bg-primary rounded-full animate-ping"></div>
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-bold text-white tracking-tight">Sincronizando com DSS</p>
              <p className="text-sm text-slate-400 max-w-[240px]">Buscando dados financeiros em tempo real. Isso pode levar alguns segundos.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="bg-surface border border-rose-500/30 p-8 rounded-2xl text-center max-w-md shadow-2xl shadow-rose-500/5">
          <div className="size-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <TrendingDown className="text-rose-500" size={32} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Falha na Conexão</h3>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Não foi possível estabelecer comunicação com o servidor DSS. 
            Verifique se as credenciais estão corretas ou se o servidor está online.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div id="main-content" className="flex-1 overflow-y-auto custom-scrollbar bg-background">
      <div className="p-8 space-y-8">
        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Receita Bruta" 
            value={formatCurrency(stats?.receitaBruta?.value || 0)} 
            change={`${stats?.receitaBruta?.change || 0}%`} 
            trend={stats?.receitaBruta?.trend || 'up'} 
            icon={<CreditCard size={20} />} 
            color="bg-emerald-500/10 text-emerald-500" 
          />
          <StatCard 
            title="Custos Totais" 
            value={formatCurrency(stats?.custosTotais?.value || 0)} 
            change={`${stats?.custosTotais?.change || 0}%`} 
            trend={stats?.custosTotais?.trend || 'down'} 
            icon={<ShoppingCart size={20} />} 
            color="bg-rose-500/10 text-rose-500" 
          />
          <StatCard 
            title="Investimentos" 
            value={formatCurrency(stats?.investimentos?.value || 0)} 
            change={`${stats?.investimentos?.change || 0}%`} 
            trend={stats?.investimentos?.trend || 'up'} 
            icon={<BarChart3 size={20} />} 
            color="bg-blue-500/10 text-blue-500" 
          />
          <StatCard 
            title="Resultado Gerencial" 
            value={formatCurrency(stats?.resultadoGerencial?.value || 0)} 
            change={`${stats?.resultadoGerencial?.change || 0}%`} 
            trend={stats?.resultadoGerencial?.trend || 'up'} 
            icon={<Wallet size={20} />} 
            color="bg-primary/10 text-primary" 
            valueColor={(stats?.resultadoGerencial?.value || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}
            isPrimary 
          />
        </div>

        {/* Company Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CompanyCard 
            name="A.C. DA COSTA" 
            value={formatCurrency(stats?.companyBreakdown?.["A.C. DA COSTA"]?.result || 0)} 
            valueColor={(stats?.companyBreakdown?.["A.C. DA COSTA"]?.result || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}
            bars={[40, 60, 45, 75, 90]} 
            color="bg-primary" 
          />
          <CompanyCard 
            name="COMEX COSTA LOG" 
            value={formatCurrency(stats?.companyBreakdown?.["COMEX COSTA LOG"]?.result || 0)} 
            valueColor={(stats?.companyBreakdown?.["COMEX COSTA LOG"]?.result || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}
            bars={[60, 50, 65, 80, 70]} 
            color="bg-emerald-500" 
          />
          <CompanyCard 
            name="CRC COSTA" 
            value={formatCurrency(stats?.companyBreakdown?.["CRC COSTA"]?.result || 0)} 
            valueColor={(stats?.companyBreakdown?.["CRC COSTA"]?.result || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}
            bars={[30, 40, 35, 55, 65]} 
            color="bg-blue-500" 
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 bg-surface p-6 rounded-xl border border-border">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-base font-bold">Evolução: Receita vs. Custos</h3>
                <p className="text-xs text-slate-400">Evolução mensal nos últimos 6 meses</p>
              </div>
            </div>
            <div className="h-64 flex items-end justify-between px-2 pb-6 border-b border-border relative">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="absolute inset-x-0 border-t border-white/5" style={{ top: `${i * 25}%` }}></div>
              ))}
              {(stats?.evolution || [
                { label: 'JAN', rev: 0, cost: 0 },
                { label: 'FEV', rev: 0, cost: 0 },
                { label: 'MAR', rev: 0, cost: 0 },
                { label: 'ABR', rev: 0, cost: 0 },
                { label: 'MAI', rev: 0, cost: 0 },
                { label: 'JUN', rev: 0, cost: 0 },
              ]).map((item: any, i: number) => {
                const maxVal = Math.max(...(stats?.evolution?.map((e: any) => Math.max(e.rev, e.cost)) || [100]));
                const revHeight = maxVal > 0 ? (item.rev / maxVal) * 100 : 0;
                const costHeight = maxVal > 0 ? (item.cost / maxVal) * 100 : 0;
                
                return (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1">
                    <div className="flex gap-1 items-end group">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${revHeight}%` }}
                        className={`w-4 bg-primary rounded-t-sm cursor-pointer hover:brightness-125 transition-all ${i === 5 ? 'shadow-[0_0_15px_rgba(20,75,184,0.4)]' : ''}`}
                      />
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${costHeight}%` }}
                        className="w-4 bg-slate-600 rounded-t-sm cursor-pointer hover:brightness-125 transition-all"
                      />
                    </div>
                    <span className={`text-[10px] uppercase ${i === 5 ? 'text-slate-200 font-bold' : 'text-slate-500'}`}>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-surface p-6 rounded-xl border border-border flex flex-col">
            <h3 className="text-base font-bold mb-6">Distribuição de Despesas</h3>
            <div className="space-y-6 flex-1">
              {(stats?.distribution || [
                { label: 'Folha de Pagamento', value: 0, percent: 0, color: 'bg-primary' },
                { label: 'Combustível', value: 0, percent: 0, color: 'bg-blue-400' },
                { label: 'Manutenção', value: 0, percent: 0, color: 'bg-slate-400' },
                { label: 'Outros Operacionais', value: 0, percent: 0, color: 'bg-emerald-400' },
              ]).map((item: any, i: number) => {
                const colors = ['bg-primary', 'bg-blue-400', 'bg-slate-400', 'bg-emerald-400'];
                return (
                  <div key={i} className="space-y-2 group cursor-pointer">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-400 group-hover:text-slate-200 transition-colors">{item.label}</span>
                      <span className="group-hover:text-white transition-colors">{formatCurrency(item.value)}</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percent}%` }}
                        className={`h-full ${colors[i % colors.length]} transition-all group-hover:brightness-110`} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
