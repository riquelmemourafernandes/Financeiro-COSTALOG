import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Download,
  Calendar,
  Filter,
  ChevronRight,
  ChevronDown,
  Info,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { FinancialService, saveCustomCategoryMapping, type CategoryMapping } from '@/src/services/api';
import { CATEGORY_MAPPING } from '@/src/constants/categories';

interface DRERowProps {
  label: string;
  value: string;
  previous: string;
  variation: string;
  trend: 'up' | 'down' | 'neutral';
  isBold?: boolean;
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: boolean;
  children?: React.ReactNode;
  key?: string | number;
}

const DRERow = ({ label, value, previous, variation, trend, isBold, isSubtotal, isTotal, indent, children }: DRERowProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = !!children;

  return (
    <>
      <tr 
        className={cn(
          "transition-colors group border-b border-border/50",
          isTotal ? "bg-primary/10 border-t-2 border-primary/30" : isSubtotal ? "bg-white/5" : "hover:bg-white/5",
          hasChildren && "cursor-pointer"
        )}
        onClick={() => hasChildren && setIsOpen(!isOpen)}
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            {hasChildren && (
              <div className={cn("transition-transform", isOpen ? "rotate-0" : "-rotate-90")}>
                <ChevronDown size={14} className="text-slate-500" />
              </div>
            )}
            <span className={cn(
              "text-sm",
              indent && "ml-6",
              isBold || isTotal || isSubtotal ? "font-bold text-slate-100" : "text-slate-300"
            )}>
              {label}
            </span>
          </div>
        </td>
        <td className={cn("px-6 py-4 text-sm text-right", isTotal ? "text-primary font-black" : isBold || isSubtotal ? "text-slate-100 font-bold" : "text-slate-300")}>
          {value}
        </td>
        <td className="px-6 py-4 text-sm text-slate-500 text-right">
          {previous}
        </td>
        <td className={cn(
          "px-6 py-4 text-sm font-bold text-right",
          trend === 'up' ? "text-emerald-500" : trend === 'down' ? "text-rose-500" : "text-slate-400"
        )}>
          {variation}
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex justify-end">
            {trend === 'up' ? <ArrowUpRight size={16} className="text-emerald-500" /> : trend === 'down' ? <ArrowDownRight size={16} className="text-rose-500" /> : null}
          </div>
        </td>
      </tr>
      {hasChildren && isOpen && (
        <>{children}</>
      )}
    </>
  );
};

export const PAndLView = ({ period, selectedCompanies }: { period: { month: number, year: number }, selectedCompanies: string[] }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMappings, setSelectedMappings] = useState<Record<string, string>>({});
  const [savingLabel, setSavingLabel] = useState<string | null>(null);
  const [mappingMessage, setMappingMessage] = useState('');

  const mappingOptions = Array.from(
    new Map(
      Object.values(CATEGORY_MAPPING).map((mapping: CategoryMapping) => [
        `${mapping.category}||${mapping.subcategory}`,
        mapping
      ])
    ).values()
  ).sort((a, b) => a.category.localeCompare(b.category) || a.subcategory.localeCompare(b.subcategory));

  const applyMapping = async (label: string) => {
    const selected = selectedMappings[label];
    if (!selected) return;
    const [category, subcategory] = selected.split('||');
    setSavingLabel(label);
    setMappingMessage('');
    try {
      saveCustomCategoryMapping(label, { category, subcategory });
      setMappingMessage(`Classificação de "${label}" salva. Atualizando DRE...`);
      await fetchData();
      setSelectedMappings(current => {
        const next = { ...current };
        delete next[label];
        return next;
      });
      setMappingMessage(`"${label}" classificada com sucesso.`);
    } catch (e) {
      setMappingMessage('Não foi possível salvar a classificação neste navegador.');
    } finally {
      setSavingLabel(null);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      // 1. Load current period first
      const currentDRE = await FinancialService.getDREData(period, selectedCompanies, false, true);
      
      // Set initial data so user sees it immediately
      setData({
        current: currentDRE,
        previous: currentDRE, // Temporary fallback
        changes: { receita: '0.0', custos: '0.0', lucro: '0.0' }
      });
      setLoading(false);
      
      const prevPeriod = {
        month: period.month === 1 ? 12 : period.month - 1,
        year: period.month === 1 ? period.year - 1 : period.year
      };
      
      // Load previous period in background
      const prevDRE = await FinancialService.getDREData(prevPeriod, selectedCompanies, false, true);

      const calculateChange = (curr: number, prev: number) => {
        if (prev === 0) return 0;
        return ((curr - prev) / prev) * 100;
      };

      setData({
        current: currentDRE,
        previous: prevDRE,
        changes: {
          receita: calculateChange(currentDRE.totalRevenue, prevDRE.totalRevenue).toFixed(1),
          custos: calculateChange(currentDRE.totalExpense, prevDRE.totalExpense).toFixed(1),
          lucro: calculateChange(currentDRE.netResult, prevDRE.netResult).toFixed(1)
        }
      });
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar DRE:', err);
      setError('Erro ao carregar DRE');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, selectedCompanies]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-rose-500 font-bold mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // Helper to get category data safely
  const getCat = (dre: any, label: string) => dre.categories[label] || { value: 0, subcategories: {} };
  
  const calculateVar = (currLabel: string, prevLabel: string) => {
    const curr = getCat(data.current, currLabel).value;
    const prev = getCat(data.previous, prevLabel).value;
    if (prev === 0) return '0.0%';
    return `${((curr - prev) / prev * 100).toFixed(1)}%`;
  };

  const getTrend = (currLabel: string, prevLabel: string, inverse = false) => {
    const curr = (getCat(data.current, currLabel).value) as number;
    const prev = (getCat(data.previous, prevLabel).value) as number;
    if (curr === prev) return 'neutral';
    if (inverse) return curr < prev ? 'up' : 'down';
    return curr > prev ? 'up' : 'down';
  };

  const categoriesToShow = [
    "1.1 - RECEITA BRUTA",
    "2.1 - CUSTOS OPERACIONAIS",
    "2.2 - DESPESA ADMINISTRATIVA",
    "2.3 - FOLHA DE PAGAMENTO",
    "2.4 - MANUTENÇÃO",
    "2.5 - OCUPAÇÃO",
    "2.6 - OUTRAS RECEITAS",
    "2.7 - REC./DESP. FINANCEIRA",
    "3.1 - IMPOSTOS S/FATURAMENTO",
    "4.1 - INVESTIMENTOS",
    "4.2 - FINANCIAMENTOS",
    "4.3 - CONSORCIOS",
    "4.4 - VENDA DE ATIVO",
    "5.1 - EMPRÉSTIMOS",
    "6.1 - PARCELAMENTO TRIBUTOS",
    "7.1 - RESERVA"
  ];

  return (
    <div id="main-content" className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DRE - Demonstrativo de Resultados</h1>
          <p className="text-sm text-slate-500">Visão gerencial consolidada do grupo</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchData()}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
            <Download size={16} /> Exportar PDF
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Receita Bruta</p>
          <div className="flex items-end justify-between">
            <h3 className="text-xl font-black tracking-tight text-emerald-500">{formatCurrency(data.current.totalRevenue)}</h3>
            <span className={cn("text-xs font-bold", parseFloat(data.changes.receita) >= 0 ? "text-emerald-500" : "text-rose-500")}>
              {data.changes.receita}%
            </span>
          </div>
        </div>
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Custos Totais</p>
          <div className="flex items-end justify-between">
            <h3 className="text-xl font-black tracking-tight text-rose-500">{formatCurrency(data.current.totalExpense)}</h3>
            <span className={cn("text-xs font-bold", parseFloat(data.changes.custos) <= 0 ? "text-emerald-500" : "text-rose-500")}>
              {data.changes.custos}%
            </span>
          </div>
        </div>
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Resultado Líquido</p>
          <div className="flex items-end justify-between">
            <h3 className="text-xl font-black tracking-tight text-primary">{formatCurrency(data.current.netResult)}</h3>
            <span className={cn("text-xs font-bold", parseFloat(data.changes.lucro) >= 0 ? "text-emerald-500" : "text-rose-500")}>
              {data.changes.lucro}%
            </span>
          </div>
        </div>
      </div>

      {(data.current.unmappedCategories || []).length > 0 && (
        <section className="bg-surface rounded-xl border border-amber-500/30 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Classificar lançamentos pendentes</h2>
                <p className="text-sm text-slate-400 mt-1">
                  O sistema encontrou categorias ainda não classificadas neste período. Escolha a classificação correta; ela será reutilizada nos próximos meses quando o mesmo nome aparecer.
                </p>
              </div>
              <span className="rounded-full bg-amber-500/10 text-amber-300 px-3 py-1 text-xs font-bold">
                {(data.current.unmappedCategories || []).reduce((sum: number, item: any) => sum + item.count, 0)} lançamentos
              </span>
            </div>
            {mappingMessage && <p role="status" className="text-sm text-emerald-400 mt-3">{mappingMessage}</p>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                <tr>
                  <th className="px-5 py-3">Categoria do DSS</th>
                  <th className="px-5 py-3 text-right">Lançamentos</th>
                  <th className="px-5 py-3">Classificar como</th>
                  <th className="px-5 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {(data.current.unmappedCategories || []).map((item: { label: string; count: number }) => (
                  <tr key={item.label} className="border-t border-border/50">
                    <td className="px-5 py-3 text-sm font-medium text-slate-200">{item.label}</td>
                    <td className="px-5 py-3 text-sm text-right text-slate-400">{item.count}</td>
                    <td className="px-5 py-3 min-w-[320px]">
                      <select
                        value={selectedMappings[item.label] || ''}
                        onChange={event => setSelectedMappings(current => ({ ...current, [item.label]: event.target.value }))}
                        className="w-full rounded-lg border border-border bg-slate-900 px-3 py-2 text-sm text-slate-100"
                        aria-label={`Classificação para ${item.label}`}
                      >
                        <option value="">Selecione categoria e subcategoria...</option>
                        {mappingOptions.map(option => (
                          <option key={`${option.category}||${option.subcategory}`} value={`${option.category}||${option.subcategory}`}>
                            {option.category} — {option.subcategory}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        disabled={!selectedMappings[item.label] || savingLabel !== null}
                        onClick={() => applyMapping(item.label)}
                        className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                      >
                        {savingLabel === item.label ? 'Salvando...' : 'Salvar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-3 text-xs text-slate-500">
            As classificações ficam salvas neste navegador e são aplicadas ao DRE após atualizar. Para compartilhar entre computadores e usuários, será necessário configurar um armazenamento compartilhado no servidor.
          </p>
        </section>
      )}

      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/5 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
              <tr>
                <th className="px-6 py-4">Estrutura de Resultados</th>
                <th className="px-6 py-4 text-right">Realizado</th>
                <th className="px-6 py-4 text-right">Anterior</th>
                <th className="px-6 py-4 text-right">Var %</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {categoriesToShow.map(cat => {
                const current = getCat(data.current, cat);
                const previous = getCat(data.previous, cat);
                const isRevenue = cat.startsWith('1.') || cat.startsWith('2.6');
                
                return (
                  <DRERow 
                    key={cat}
                    label={cat} 
                    value={formatCurrency(current.value)} 
                    previous={formatCurrency(previous.value)} 
                    variation={calculateVar(cat, cat)} 
                    trend={getTrend(cat, cat, !isRevenue)} 
                    isBold={true}
                  >
                    {Object.entries(current.subcategories).map(([sub, val]) => {
                      const v = val as number;
                      const prevSubVal = (previous.subcategories[sub] || 0) as number;
                      const subVar = prevSubVal === 0 ? '0.0%' : `${((v - prevSubVal) / prevSubVal * 100).toFixed(1)}%`;
                      const subTrend = v === prevSubVal ? 'neutral' : (!isRevenue ? (v < prevSubVal ? 'up' : 'down') : (v > prevSubVal ? 'up' : 'down'));
                      
                      return (
                        <DRERow 
                          key={sub}
                          label={sub}
                          value={formatCurrency(v)}
                          previous={formatCurrency(prevSubVal)}
                          variation={subVar}
                          trend={subTrend}
                          indent
                        />
                      );
                    })}
                  </DRERow>
                );
              })}
              
              <DRERow 
                label="RESULTADO LÍQUIDO FINAL" 
                value={formatCurrency(data.current.netResult)} 
                previous={formatCurrency(data.previous.netResult)} 
                variation={`${data.changes.lucro}%`} 
                trend={parseFloat(data.changes.lucro) >= 0 ? 'up' : 'down'} 
                isTotal 
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
