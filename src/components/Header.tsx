import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Search, Bell, Download, ChevronDown, RefreshCw, Filter, Check } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { PDFService } from '@/src/services/pdfService';
import { FinancialService } from '@/src/services/api';
import { COMPANIES } from '@/src/constants/companies';
import { cn } from '@/src/lib/utils';

interface HeaderProps {
  title: string;
  period: { month: number; year: number };
  onPeriodChange: (period: { month: number; year: number }) => void;
  selectedCompanies: string[];
  onCompaniesChange: (companies: string[]) => void;
}

export const Header = ({ 
  title, 
  period, 
  onPeriodChange, 
  selectedCompanies, 
  onCompaniesChange 
}: HeaderProps) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isCompanyFilterOpen, setIsCompanyFilterOpen] = useState(false);
  
  const monthPickerRef = useRef<HTMLDivElement>(null);
  const companyFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
        setIsMonthPickerOpen(false);
      }
      if (companyFilterRef.current && !companyFilterRef.current.contains(event.target as Node)) {
        setIsCompanyFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    await PDFService.generatePDF('main-content', `Relatorio_${title.replace(/\s+/g, '_')}_${period.month}_${period.year}`);
    setIsExporting(false);
  };

  const handleRefreshHistorical = async () => {
    setIsRefreshing(true);
    await FinancialService.preLoadHistoricalData(selectedCompanies);
    setIsRefreshing(false);
    window.location.reload();
  };

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = [2024, 2025, 2026];

  const handleMonthChange = (direction: 'prev' | 'next') => {
    let newMonth = period.month + (direction === 'next' ? 1 : -1);
    let newYear = period.year;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    if (years.includes(newYear)) {
      onPeriodChange({ month: newMonth, year: newYear });
    }
  };

  const toggleCompany = (companyId: string) => {
    if (selectedCompanies.includes(companyId)) {
      if (selectedCompanies.length > 1) {
        onCompaniesChange(selectedCompanies.filter(id => id !== companyId));
      }
    } else {
      onCompaniesChange([...selectedCompanies, companyId]);
    }
  };

  const selectAllCompanies = () => {
    onCompaniesChange(COMPANIES.map(c => c.id));
  };

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-background/50 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-6">
        <h2 className="text-lg font-bold tracking-tight min-w-[200px]">{title}</h2>
        
        {/* Improved Month Picker */}
        <div className="flex items-center gap-2 bg-surface rounded-lg px-2 py-1 border border-border relative" ref={monthPickerRef}>
          <button 
            onClick={() => handleMonthChange('prev')}
            className="p-1 hover:bg-white/5 rounded transition-colors"
          >
            <ChevronDown size={14} className="rotate-90 text-slate-500" />
          </button>
          
          <div 
            className="flex items-center gap-2 px-2 cursor-pointer group min-w-[120px] justify-center"
            onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
          >
            <Calendar size={14} className="text-primary" />
            <span className="text-xs font-bold">{months[period.month - 1]} {period.year}</span>
            <ChevronDown size={12} className={cn("text-slate-500 transition-transform", isMonthPickerOpen && "rotate-180")} />
          </div>

          {isMonthPickerOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-surface border border-border rounded-xl shadow-2xl p-4 z-50">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Ano</p>
                  <div className="flex flex-col gap-1">
                    {years.map(year => (
                      <button
                        key={year}
                        onClick={() => onPeriodChange({ ...period, year })}
                        className={cn(
                          "text-left px-3 py-1.5 rounded-lg text-xs transition-colors",
                          period.year === year ? "bg-primary text-white" : "hover:bg-white/5 text-slate-400"
                        )}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Mês</p>
                  <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {months.map((month, idx) => (
                      <button
                        key={month}
                        onClick={() => onPeriodChange({ ...period, month: idx + 1 })}
                        className={cn(
                          "text-left px-3 py-1.5 rounded-lg text-xs transition-colors",
                          period.month === idx + 1 ? "bg-primary text-white" : "hover:bg-white/5 text-slate-400"
                        )}
                      >
                        {month}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={() => handleMonthChange('next')}
            className="p-1 hover:bg-white/5 rounded transition-colors"
          >
            <ChevronDown size={14} className="-rotate-90 text-slate-500" />
          </button>
        </div>

        {/* Company Filter */}
        <div className="relative" ref={companyFilterRef}>
          <button 
            onClick={() => setIsCompanyFilterOpen(!isCompanyFilterOpen)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-bold transition-all",
              selectedCompanies.length < COMPANIES.length ? "bg-primary/10 border-primary/30 text-primary" : "bg-surface text-slate-400 hover:text-white"
            )}
          >
            <Filter size={14} />
            <span>
              {selectedCompanies.length === COMPANIES.length 
                ? 'Todas as Empresas' 
                : `${selectedCompanies.length} ${selectedCompanies.length === 1 ? 'Empresa' : 'Empresas'}`}
            </span>
            <ChevronDown size={12} className={cn("transition-transform", isCompanyFilterOpen && "rotate-180")} />
          </button>

          {isCompanyFilterOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-surface border border-border rounded-xl shadow-2xl p-2 z-50">
              <div className="p-2 border-b border-border mb-1 flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-slate-500">Filtrar Empresas</span>
                <button 
                  onClick={selectAllCompanies}
                  className="text-[10px] text-primary hover:underline font-bold"
                >
                  Selecionar Todas
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {COMPANIES.map(company => (
                  <button
                    key={company.id}
                    onClick={() => toggleCompany(company.id)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full" style={{ backgroundColor: company.color }}></div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-white">{company.name}</p>
                        <p className="text-[10px] text-slate-500">{company.cnpj}</p>
                      </div>
                    </div>
                    {selectedCompanies.includes(company.id) && (
                      <Check size={14} className="text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input 
            className="bg-surface border-border rounded-lg text-xs pl-10 pr-4 py-2 w-64 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all" 
            placeholder="Pesquisar dados..." 
            type="text"
          />
        </div>
        <button 
          onClick={handleRefreshHistorical}
          disabled={isRefreshing}
          className="size-10 rounded-lg bg-surface border border-border flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-colors relative"
          title="Atualizar dados de anos anteriores"
        >
          <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-primary' : ''} />
        </button>
        <div className="relative">
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="size-10 rounded-lg bg-surface border border-border flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-colors relative"
          >
            <Bell size={18} />
            <span className="absolute top-2 right-2 size-2 bg-primary rounded-full border-2 border-surface"></span>
          </button>
          <NotificationCenter isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
        </div>
        <button 
          onClick={handleExport}
          disabled={isExporting}
          className="bg-primary hover:bg-primary/90 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />} 
          {isExporting ? 'Gerando PDF...' : 'Exportar Relatório'}
        </button>
      </div>
    </header>
  );
};
