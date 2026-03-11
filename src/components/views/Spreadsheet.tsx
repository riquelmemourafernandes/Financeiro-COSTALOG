import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  Calendar,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  X,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FinancialService } from '@/src/services/api';
import { CATEGORY_MAPPING } from '@/src/constants/categories';
import { cn } from '@/src/lib/utils';

export const SpreadsheetView = ({ period, selectedCompanies }: { period: { month: number, year: number }, selectedCompanies: string[] }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'revenue' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState(FinancialService.getPeriodRange(period.month, period.year));
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ id: string, category: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Update dateRange when period changes
  useEffect(() => {
    setDateRange(FinancialService.getPeriodRange(period.month, period.year));
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [receivables, payables] = await Promise.all([
        FinancialService.getReceivables(dateRange.start, dateRange.end, true),
        FinancialService.getPayables(dateRange.start, dateRange.end, true)
      ]);

      const normalize = (items: any, type: 'revenue' | 'expense') => {
        let list = [];
        if (Array.isArray(items)) list = items;
        else if (items && items.registros) list = items.registros;
        
        return list.map((item: any) => {
          const companyRaw = (item.empresa || item.nome_empresa || '').toString().toUpperCase();
          let targetCompanyId = "OTHER";
          if (companyRaw.includes("A.C. DA COSTA") || companyRaw.includes("AC DA COSTA")) targetCompanyId = "AC_DA_COSTA";
          else if (companyRaw.includes("COMEX")) targetCompanyId = "COMEX_COSTA_LOG";
          else if (companyRaw.includes("CRC")) targetCompanyId = "CRC_COSTA";

          return { ...item, type, targetCompanyId };
        }).filter((item: any) => {
          if (selectedCompanies && selectedCompanies.length > 0) {
            return selectedCompanies.includes(item.targetCompanyId);
          }
          return true;
        }).map((item: any) => {
          // Aggressive value extraction
          let val = item.valor ?? 
                    item.valor_total ?? 
                    item.total ?? 
                    item.valor_titulo ?? 
                    item.valor_liquido ?? 
                    item.valor_bruto ?? 
                    item.valor_parcela ?? 
                    item.valor_aberto ?? 
                    item.vlr_total ?? 
                    item.vlr_liquido ?? 
                    item.vlr_bruto ?? 
                    item.valor_pago ?? 
                    item.vlr_pago ?? 
                    item.valor_original ?? 
                    item.vlr_original;

          if (val === undefined || val === null) {
            const valueKeys = Object.keys(item).filter(k => 
              k.toLowerCase().includes('valor') || 
              k.toLowerCase().includes('vlr') || 
              k.toLowerCase().includes('total') ||
              k.toLowerCase().includes('liquido')
            );
            for (const key of valueKeys) {
              const candidate = item[key];
              if (candidate !== undefined && candidate !== null && candidate !== '') {
                val = candidate;
                break;
              }
            }
          }

          const description = (item.descricao || item.historico || item.cliente || item.fornecedor || 'Sem descrição').toString();
          const isTransfer = description.toUpperCase().startsWith('TRANSF') || description.toUpperCase().startsWith('TRASNF');
          
          // Partner extraction
          const rawPartner = item.parceiro || item.nome_parceiro || item.cliente || item.fornecedor || item.nome_cliente || item.nome_fornecedor;
          const hasPartner = rawPartner && rawPartner.toString().trim() !== "" && rawPartner.toString().toUpperCase() !== "N/A";
          const partner = hasPartner ? rawPartner.toString() : 'N/A';
          
          // Company extraction
          const company = (item.empresa || item.nome_empresa || '').toString().toUpperCase();
          const isIdeallog = company === 'IDEALLOG';
          
          // Date extraction & check
          const emissionDate = item.dataEmissao || item.data_emissao;
          const hasDate = !!emissionDate;
          
          const shouldExclude = isTransfer || !hasPartner || isIdeallog || !hasDate;
          
          // Category logic
          const rawAccount = (item.conta || item.nome_conta || item.conta_corrente || item.banco || '').toString().trim();
          const accountName = rawAccount.replace(/^[\d.\s-]+/, '').trim();
          const mapping = CATEGORY_MAPPING[accountName];
          const isExcludedCategory = mapping && (mapping.category === "Á DEFINIR" || mapping.category === "SEM CLASSIFICAÇÃO");
          
          let category = mapping ? mapping.category : (item.categoria || 'Não categorizado');
          
          if (isTransfer) {
            category = 'Transferencia entre contas';
          } else if (shouldExclude || isExcludedCategory) {
            category = 'Desconsiderado';
          }

          const finalExclude = shouldExclude || isExcludedCategory;

          const invoice = item.fatura || item.numero_fatura || item.documento || item.numero_documento || 'N/A';

          return {
            ...item,
            _type: type,
            _id: item.id || item.codigo || Math.random().toString(36).substr(2, 9),
            _date: emissionDate || item.data_vencimento || item.data || 'N/A',
            _value: Math.abs(parseValue(val ?? 0)),
            _description: description,
            _category: category,
            _subcategory: mapping ? mapping.subcategory : 'N/A',
            _account: accountName, // Use cleaned name for display too
            _partner: partner,
            _invoice: invoice,
            _isTransfer: isTransfer,
            _hasPartner: hasPartner,
            _isIdeallog: isIdeallog,
            _hasDate: hasDate,
            _isExcludedCategory: isExcludedCategory,
            _shouldExclude: finalExclude
          };
        });
      };

      const combined = [
        ...normalize(receivables, 'revenue'),
        ...normalize(payables, 'expense')
      ];

      setData(combined);
      setFilteredData(combined);
    } catch (err) {
      console.error('Erro ao buscar dados para planilha:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = (id: string, newCategory: string) => {
    const updatedData = data.map(item => 
      item._id === id ? { ...item, _category: newCategory } : item
    );
    setData(updatedData);
    setEditingCategory(null);
    // In a real app, we would call an API here to save the category
    console.log(`Categoria do item ${id} alterada para: ${newCategory}`);
  };

  const parseValue = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val !== 'string') return 0;
    
    // Remove currency symbols, spaces and other non-numeric chars except , . -
    const onlyNumbers = val.replace(/[^\d,.-]/g, '');
    
    // If it has both . and , we assume . is thousand and , is decimal (Brazilian)
    if (onlyNumbers.includes('.') && onlyNumbers.includes(',')) {
      const cleaned = onlyNumbers.replace(/\./g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
    }
    
    // If it only has , we assume it's decimal
    if (onlyNumbers.includes(',') && !onlyNumbers.includes('.')) {
      const cleaned = onlyNumbers.replace(',', '.');
      return parseFloat(cleaned) || 0;
    }
    
    return parseFloat(onlyNumbers) || 0;
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  useEffect(() => {
    let result = [...data];

    if (typeFilter !== 'all') {
      result = result.filter(item => item._type === typeFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        item._description.toLowerCase().includes(term) || 
        item._category.toLowerCase().includes(term) ||
        item._account.toLowerCase().includes(term) ||
        item._partner.toLowerCase().includes(term) ||
        item._invoice.toLowerCase().includes(term)
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'uncategorized') {
        result = result.filter(item => item._category === 'Não categorizado');
      } else {
        result = result.filter(item => item._category === categoryFilter);
      }
    }

    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredData(result);
  }, [typeFilter, searchTerm, data, sortConfig]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };
  
  const handleExportCSV = () => {
    if (filteredData.length === 0) return;

    // Define headers
    const headers = ['Data', 'Fatura', 'Descrição', 'Conta', 'Parceiro', 'Categoria', 'Tipo', 'Valor', 'Status'];
    
    // Map data to rows
    const rows = filteredData.map(item => [
      item._date,
      item._invoice,
      item._description,
      item._account,
      item._partner,
      item._category,
      item._type === 'revenue' ? 'Receita' : 'Custo',
      item._value.toString().replace('.', ','),
      item._shouldExclude ? (item._isIdeallog ? 'Empresa IDEALLOG' : 'Desconsiderado') : 'Válido'
    ]);

    // Combine headers and rows - using semicolon for better Excel compatibility in BR
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    // Create blob and download (with BOM for Excel UTF-8)
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lancamentos_${dateRange.start}_${dateRange.end}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totals = {
    revenue: filteredData.filter(i => i._type === 'revenue' && !i._shouldExclude).reduce((acc, i) => acc + i._value, 0),
    expense: filteredData.filter(i => i._type === 'expense' && !i._shouldExclude).reduce((acc, i) => acc + i._value, 0)
  };

  return (
    <div id="main-content" className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Spreadsheet Header/Filters */}
      <div className="p-6 border-b border-border bg-surface/30 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">Planilha de Lançamentos</h2>
            <button 
              onClick={() => fetchData()}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            <div className="flex bg-black/20 p-1 rounded-lg border border-border">
              <button 
                onClick={() => setTypeFilter('all')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                  typeFilter === 'all' ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                )}
              >
                Todos
              </button>
              <button 
                onClick={() => setTypeFilter('revenue')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                  typeFilter === 'revenue' ? "bg-emerald-500 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                )}
              >
                Receitas
              </button>
              <button 
                onClick={() => setTypeFilter('expense')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                  typeFilter === 'expense' ? "bg-rose-500 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                )}
              >
                Custos
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-1.5">
              <Filter size={14} className="text-slate-500" />
              <select 
                className="bg-transparent text-[10px] font-bold outline-none cursor-pointer uppercase tracking-wider"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Categorias</option>
                <option value="uncategorized">Não categorizado</option>
                {Array.from(new Set(data.map(i => i._category))).filter(c => c !== 'Não categorizado' && c !== 'Desconsiderado' && c !== 'Transferencia entre contas').sort().map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input 
                type="text"
                placeholder="Pesquisar descrição ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-surface border border-border rounded-lg text-xs pl-10 pr-4 py-2 w-64 focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-xs font-bold hover:bg-white/5 transition-all"
            >
              <Download size={14} /> Exportar CSV
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-slate-500" />
            <span className="text-xs text-slate-400">Período:</span>
            <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-lg border border-border">
              <input 
                type="text" 
                value={dateRange.start} 
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="bg-transparent text-xs w-20 outline-none"
              />
              <span className="text-slate-600">até</span>
              <input 
                type="text" 
                value={dateRange.end} 
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="bg-transparent text-xs w-20 outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-full bg-emerald-500"></div>
              <span className="text-slate-400">Receitas: <span className="text-emerald-500 font-bold">{formatCurrency(totals.revenue)}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-full bg-rose-500"></div>
              <span className="text-slate-400">Custos: <span className="text-rose-500 font-bold">{formatCurrency(totals.expense)}</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Spreadsheet Content */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-slate-400 text-sm font-medium">Processando dados da planilha...</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm shadow-sm">
              <tr className="text-[10px] uppercase font-bold text-slate-500 tracking-widest border-b border-border">
                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('_date')}>
                  <div className="flex items-center gap-2">Data <ArrowUpDown size={12} /></div>
                </th>
                <th className="px-6 py-4">Fatura</th>
                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('_description')}>
                  <div className="flex items-center gap-2">Descrição / Lançamento <ArrowUpDown size={12} /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('_account')}>
                  <div className="flex items-center gap-2">Conta <ArrowUpDown size={12} /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('_partner')}>
                  <div className="flex items-center gap-2">Parceiro <ArrowUpDown size={12} /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('_category')}>
                  <div className="flex items-center gap-2">Categoria <ArrowUpDown size={12} /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('_type')}>
                  <div className="flex items-center gap-2">Tipo <ArrowUpDown size={12} /></div>
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('_value')}>
                  <div className="flex items-center gap-2 justify-end">Valor <ArrowUpDown size={12} /></div>
                </th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item._id} className={cn(
                    "hover:bg-white/5 transition-colors group",
                    item._shouldExclude && "opacity-40 grayscale-[0.5]"
                  )}>
                    <td className="px-6 py-4 text-xs font-medium text-slate-400">{item._date}</td>
                    <td className="px-6 py-4 text-[10px] font-mono text-slate-500">{item._invoice}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-200">{item._description}</span>
                          {item._shouldExclude && (
                            <span className={cn(
                              "text-[8px] px-1.5 py-0.5 rounded border uppercase font-black",
                              (item._isIdeallog || !item._hasDate) 
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/20" 
                                : "bg-rose-500/20 text-rose-400 border-rose-500/20"
                            )}>
                              {item._isIdeallog ? 'Empresa IDEALLOG' : (!item._hasDate ? 'Sem Data Emissão' : 'Desconsiderado')}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">ID: {item._id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-400">{item._account}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-400">{item._partner}</span>
                    </td>
                    <td className="px-6 py-4">
                      {editingCategory?.id === item._id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="text"
                            value={editingCategory.category}
                            onChange={(e) => setEditingCategory({ ...editingCategory, category: e.target.value })}
                            className="bg-surface border border-primary/50 rounded px-2 py-1 text-xs outline-none w-32"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveCategory(item._id, editingCategory.category);
                              if (e.key === 'Escape') setEditingCategory(null);
                            }}
                          />
                          <button 
                            onClick={() => handleSaveCategory(item._id, editingCategory.category)}
                            className="text-emerald-500 hover:text-emerald-400"
                          >
                            <ArrowUpRight size={14} />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => setEditingCategory({ id: item._id, category: item._category })}
                          className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-border w-fit group-hover:border-primary/30 transition-all cursor-pointer"
                        >
                          <Tag size={10} className="text-slate-500" />
                          <span className="text-xs font-medium text-slate-300">{item._category}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        item._type === 'revenue' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                      )}>
                        {item._type === 'revenue' ? 'Receita' : 'Custo'}
                      </span>
                    </td>
                    <td className={cn(
                      "px-6 py-4 text-sm font-bold text-right",
                      item._type === 'revenue' ? "text-emerald-500" : "text-rose-500"
                    )}>
                      <div className="flex items-center justify-end gap-1">
                        {item._type === 'revenue' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {formatCurrency(item._value)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-primary transition-all" title="Editar categoria">
                          <Filter size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedItem(item);
                            setIsDetailsOpen(true);
                          }}
                          className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-all" 
                          title="Ver detalhes"
                        >
                          <Search size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Spreadsheet Footer */}
      <div className="p-4 border-t border-border bg-surface/50 flex justify-between items-center">
        <div className="text-xs text-slate-500">
          Exibindo <span className="text-slate-200 font-bold">{filteredData.length}</span> de <span className="text-slate-200 font-bold">{data.length}</span> lançamentos
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg border border-border hover:bg-white/5 disabled:opacity-30" disabled>
            <ChevronLeft size={16} />
          </button>
          <div className="flex gap-1">
            <button className="size-8 rounded-lg bg-primary text-white text-xs font-bold">1</button>
          </div>
          <button className="p-2 rounded-lg border border-border hover:bg-white/5 disabled:opacity-30" disabled>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      {/* Details Modal */}
      <AnimatePresence>
        {isDetailsOpen && selectedItem && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setIsDetailsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-white/5">
                <div>
                  <h3 className="text-lg font-bold">Detalhes do Lançamento</h3>
                  <p className="text-xs text-slate-500">ID: {selectedItem._id}</p>
                </div>
                <button 
                  onClick={() => setIsDetailsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data de Emissão</p>
                    <p className="text-sm font-medium">{selectedItem._date}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Valor</p>
                    <p className={`text-sm font-bold ${selectedItem._type === 'revenue' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {formatCurrency(selectedItem._value)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fatura / Documento</p>
                    <p className="text-sm font-mono text-primary">{selectedItem._invoice}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipo</p>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedItem._type === 'revenue' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {selectedItem._type === 'revenue' ? 'Receita' : 'Custo'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Descrição / Histórico</p>
                  <p className="text-sm bg-white/5 p-3 rounded-lg border border-border/50 leading-relaxed">
                    {selectedItem._description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Parceiro (Cliente/Fornecedor)</p>
                    <p className="text-sm">{selectedItem._partner}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Conta Financeira</p>
                    <p className="text-sm">{selectedItem._account}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Categoria Gerencial</p>
                    <p className="text-sm font-bold text-slate-200">{selectedItem._category}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subcategoria</p>
                    <p className="text-sm">{selectedItem._subcategory}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Dados Brutos da API</p>
                  <div className="bg-black/40 p-4 rounded-lg overflow-x-auto">
                    <pre className="text-[10px] text-slate-400 font-mono">
                      {JSON.stringify(selectedItem, (key, value) => key.startsWith('_') ? undefined : value, 2)}
                    </pre>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-white/5 border-t border-border flex justify-end">
                <button 
                  onClick={() => setIsDetailsOpen(false)}
                  className="px-6 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
