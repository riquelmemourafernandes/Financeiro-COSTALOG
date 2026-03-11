/**
 * Centralized API Service for Costa Group Financial Cockpit
 * 
 * This service handles all communication with external APIs.
 * It includes helper methods for common HTTP operations and
 * specific methods for fetching financial data.
 */

// Use environment variables for API configuration
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://costalog.dssinformatica.com.br:5000/wsdss/').trim();
const API_USER = (import.meta.env.VITE_API_USER || 'wsdss_costalog').trim();
// Use the literal password to avoid encoding issues
const API_PASS = (import.meta.env.VITE_API_PASS || '*iJJ%254_mJ%23').trim();
const API_DB = (import.meta.env.VITE_API_DB || 'bd_costalog').trim();

import { CATEGORY_MAPPING } from '../constants/categories';

// Global request queue with priority support
type QueueItem = {
  task: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  priority: boolean;
};

const queue: QueueItem[] = [];
let isProcessingQueue = false;
const QUEUE_DELAY = 200; // Further reduced to 200ms

async function processQueue() {
  if (isProcessingQueue || queue.length === 0) return;
  isProcessingQueue = true;

  while (queue.length > 0) {
    // Sort queue: priority items first
    queue.sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0));
    
    const item = queue.shift();
    if (item) {
      try {
        const result = await item.task();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
      // Wait before next request
      await new Promise(resolve => setTimeout(resolve, QUEUE_DELAY));
    }
  }

  isProcessingQueue = false;
}

function addToQueue(task: () => Promise<any>, priority = false): Promise<any> {
  return new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject, priority });
    processQueue();
  });
}

// Cache for historical data (2024, 2025) - Persisted with safety
const historicalCache: Record<string, any> = (() => {
  try {
    const cached = localStorage.getItem('financial_historical_cache');
    return cached ? JSON.parse(cached) : {};
  } catch (e) {
    console.error('FinancialService: Erro ao carregar cache do localStorage', e);
    return {};
  }
})();

// Cache for current session (all months) - In memory
const sessionCache: Record<string, any> = {};
// Cache for raw API responses to avoid redundant network calls
const rawCache: Record<string, any> = {};
let isPreloading = false;

// Mock mode flag - can be toggled from UI
let isMockMode = false;

// Helper for handling API responses
async function handleResponse(response: Response) {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  if (!response.ok) {
    let message = `Erro na requisição: ${response.status}`;
    let details = '';
    
    try {
      if (isJson) {
        const error = await response.json();
        message = error.message || error.error || message;
        details = error.details ? ` (${error.details})` : '';
      } else {
        const text = await response.text();
        details = text ? ` (${text.substring(0, 100).replace(/<[^>]*>?/gm, '')})` : '';
      }
    } catch (e) {
      // Ignore error parsing failures
    }
    
    throw new Error(`${message}${details}`);
  }

  if (isJson) {
    return response.json();
  }
  
  // If not JSON but OK, try to parse as JSON anyway just in case content-type is wrong
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error('A resposta do servidor não é um JSON válido');
  }
}

// Helper to get date range for a specific month/year
function getPeriodRange(month: number, year: number) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const monthStr = String(date.getMonth() + 1).padStart(2, '0');
    const yearStr = date.getFullYear();
    return `${day}/${monthStr}/${yearStr}`;
  };

  return {
    start: formatDate(firstDay),
    end: formatDate(lastDay)
  };
}

// Base fetcher for the specific API structure via backend proxy
async function fetchDss(endpoint: string, params: Record<string, string> = {}, priority = false) {
  return addToQueue(async () => {
    // We want the base to be strictly the root path
    let baseUrl = API_BASE_URL.split('?')[0];
    
    if (baseUrl.includes('costalog.dssinformatica.com.br')) {
      baseUrl = 'http://costalog.dssinformatica.com.br:5000/wsdss/';
    }
    
    baseUrl = baseUrl.replace(/\/+$/, '') + '/';

    const decodedPass = API_PASS.includes('%') ? decodeURIComponent(API_PASS) : API_PASS;
    
    const searchParams = new URLSearchParams();
    searchParams.append('nome_banco_dados', API_DB);
    searchParams.append('banco', API_DB);
    searchParams.append('usuario', API_USER);
    searchParams.append('senha', decodedPass);

    for (const [key, value] of Object.entries(params)) {
      searchParams.append(key, value);
    }

    const queryStr = searchParams.toString().replace(/%2F/g, '/');
    const targetUrl = `${baseUrl}${endpoint}?${queryStr}`;
    
    // Check raw cache first
    if (rawCache[targetUrl]) {
      console.log(`FinancialService: Retornando dados do cache bruto para: ${endpoint}`);
      return rawCache[targetUrl];
    }

    console.log(`FinancialService: [${priority ? 'PRIORITY' : 'QUEUE'}] Chamando URL: ${targetUrl.replace(/senha=[^&]+/, 'senha=***')}`);
    
    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });
      
      const data = await handleResponse(response);
      rawCache[targetUrl] = data;
      return data;
    } catch (error: any) {
      if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
        console.warn('FinancialService: Detectado erro 500, tentando fallback sem nome_banco_dados...');
        
        const fallbackParams = new URLSearchParams(searchParams);
        fallbackParams.delete('nome_banco_dados');
        const fallbackUrl = `${baseUrl}${endpoint}?${fallbackParams.toString().replace(/%2F/g, '/')}`;
        
        // Check fallback in cache too
        if (rawCache[fallbackUrl]) return rawCache[fallbackUrl];

        const retryResponse = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: fallbackUrl })
        });
        
        const retryData = await handleResponse(retryResponse);
        rawCache[fallbackUrl] = retryData;
        return retryData;
      }
      
      throw error;
    }
  }, priority);
}

export const FinancialService = {
  /**
   * Toggle mock mode
   */
  setMockMode(enabled: boolean) {
    isMockMode = enabled;
    console.log(`FinancialService: Mock Mode ${enabled ? 'ATIVADO' : 'DESATIVADO'}`);
  },

  /**
   * Get current mock mode status
   */
  getMockMode() {
    return isMockMode;
  },

  /**
   * Helper to get date range for current month
   */
  getCurrentMonthRange() {
    const now = new Date();
    return getPeriodRange(now.getMonth() + 1, now.getFullYear());
  },

  /**
   * Helper to get date range for specific period
   */
  getPeriodRange(month: number, year: number) {
    return getPeriodRange(month, year);
  },

  /**
   * Fetches receivables summary for a period
   */
  async getReceivablesSummary(period?: { month: number, year: number }) {
    const range = period ? getPeriodRange(period.month, period.year) : this.getCurrentMonthRange();
    const data = await fetchDss('listar_contas_receber_get', { 
      data_inicio: range.start, data_fim: range.end 
    });
    return this.sumValues(data);
  },

  /**
   * Fetches payables summary for a period
   */
  async getPayablesSummary(period?: { month: number, year: number }) {
    const range = period ? getPeriodRange(period.month, period.year) : this.getCurrentMonthRange();
    const data = await fetchDss('listar_contas_pagar_get', { 
      data_inicio: range.start, data_fim: range.end 
    });
    return this.sumValues(data);
  },

  /**
   * Helper to sum values from API response
   */
  sumValues(data: any) {
    let items: any[] = [];
    
    console.log('FinancialService: Analisando dados recebidos:', data);

    // Check for error message in the specific format
    if (data && data.mensagemErro && data.mensagemErro.trim() !== "") {
      console.error('FinancialService: Erro retornado pela API:', data.mensagemErro);
      return 0;
    }

    if (Array.isArray(data)) {
      items = data;
    } else if (data && typeof data === 'object') {
      // Prioritize 'registros' as per user example
      if (Array.isArray(data.registros)) {
        items = data.registros;
      } else {
        // Fallback to other common array properties
        const possibleArray = data.dados || data.items || data.data || data.rows || data.result;
        if (Array.isArray(possibleArray)) {
          items = possibleArray;
        } else {
          // If no obvious array, check all properties
          const firstArrayProp = Object.values(data).find(val => Array.isArray(val));
          if (firstArrayProp) items = firstArrayProp as any[];
        }
      }
    }

    console.log(`FinancialService: Encontrados ${items.length} itens para somar`);

    // Filter out items:
    // 1. Transfers (starting with "TRANSF" or "TRASNF")
    // 2. Items without a partner (parceiro/cliente/fornecedor)
    // 3. Items from company "IDEALLOG"
    // 4. Items without an emission date
    // 5. Items with category "Á DEFINIR" or "SEM CLASSIFICAÇÃO"
    const filteredItems = items.filter(item => {
      const desc = (item.descricao || item.historico || item.cliente || item.fornecedor || '').toString().toUpperCase();
      const isTransfer = desc.startsWith('TRANSF') || desc.startsWith('TRASNF');
      
      const partner = item.parceiro || item.nome_parceiro || item.cliente || item.fornecedor || item.nome_cliente || item.nome_fornecedor;
      const hasPartner = partner && partner.toString().trim() !== "" && partner.toString().toUpperCase() !== "N/A";

      const company = (item.empresa || item.nome_empresa || '').toString().toUpperCase();
      const isIdeallog = company === 'IDEALLOG';

      const hasDate = !!(item.dataEmissao || item.data_emissao);

      // Category check
      const rawAccount = (item.conta || item.nome_conta || item.conta_corrente || item.banco || '').toString().trim();
      const accountName = rawAccount.replace(/^[\d.\s-]+/, '').trim();
      const mapping = CATEGORY_MAPPING[accountName];
      const isExcludedCategory = mapping && (mapping.category === "Á DEFINIR" || mapping.category === "SEM CLASSIFICAÇÃO");

      return !isTransfer && hasPartner && !isIdeallog && hasDate && !isExcludedCategory;
    });

    if (filteredItems.length !== items.length) {
      console.log(`FinancialService: Desconsiderando ${items.length - filteredItems.length} itens (transferências, sem parceiro, IDEALLOG, sem data ou categoria excluída)`);
    }

    if (filteredItems.length === 0) return 0;
    
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

    return filteredItems.reduce((acc, item) => {
      // Extremely aggressive value extraction
      // 1. Check known fields
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

      // 2. If still undefined/null, look for any property that looks like a value
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
      
      return acc + Math.abs(parseValue(val ?? 0));
    }, 0);
  },

  /**
   * Pre-loads historical data for 2024 and 2025
   * Uses localStorage to avoid API calls on every reload
   */
  async preLoadHistoricalData(currentPeriod: { month: number, year: number }, selectedCompanies?: string[]) {
    if (isPreloading) return;
    
    const periods: { month: number; year: number }[] = [];
    let m = currentPeriod.month;
    let y = currentPeriod.year;

    // Go back until Jan 2024
    while (y > 2024 || (y === 2024 && m >= 1)) {
      // Skip current month as it's already loaded
      if (!(y === currentPeriod.year && m === currentPeriod.month)) {
        periods.push({ month: m, year: y });
      }
      
      m--;
      if (m === 0) {
        m = 12;
        y--;
      }
    }

    if (periods.length === 0) return;

    isPreloading = true;
    console.log(`FinancialService: Iniciando pré-carregamento de ${periods.length} períodos históricos (do mais recente para o mais antigo)...`);
    
    // We fetch sequentially to respect the queue and not overload the API
    for (const period of periods) {
      try {
        await this.getDREData(period, selectedCompanies);
        
        // Small delay between starting each background fetch to not choke the queue
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (e) {
        console.error(`FinancialService: Erro ao pré-carregar ${period.month}/${period.year}`, e);
      }
    }
    
    isPreloading = false;
    console.log('FinancialService: Pré-carregamento concluído.');
  },

  /**
   * Fetches P&L (DRE) data structured by the fixed categories
   */
  async getDREData(period: { month: number, year: number }, selectedCompanies?: string[], skipCache = false, priority = false) {
    const cacheKey = `${period.year}-${period.month}_${(selectedCompanies || []).sort().join(',')}`;
    
    // 1. Return from session cache if available (fastest, no network)
    if (!skipCache && sessionCache[cacheKey]) {
      console.log(`FinancialService: Retornando dados do cache de sessão para ${cacheKey}`);
      return sessionCache[cacheKey];
    }

    // 2. Return from persistent historical cache if available
    if (!skipCache && (period.year === 2024 || period.year === 2025) && historicalCache[cacheKey]) {
      console.log(`FinancialService: Retornando dados do cache persistente para ${cacheKey}`);
      // Also populate session cache for next time
      sessionCache[cacheKey] = historicalCache[cacheKey];
      return historicalCache[cacheKey];
    }

    const range = getPeriodRange(period.month, period.year);
    
    const [receivablesData, payablesData] = await Promise.all([
      fetchDss('listar_contas_receber_get', { data_inicio: range.start, data_fim: range.end }, priority),
      fetchDss('listar_contas_pagar_get', { data_inicio: range.start, data_fim: range.end }, priority)
    ]);

    const normalize = (data: any) => {
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.registros)) return data.registros;
      return [];
    };

    const receivables = normalize(receivablesData);
    const payables = normalize(payablesData);

    const parseValue = (val: any): number => {
      if (typeof val === 'number') return val;
      if (typeof val !== 'string') return 0;
      const onlyNumbers = val.replace(/[^\d,.-]/g, '');
      if (onlyNumbers.includes('.') && onlyNumbers.includes(',')) {
        return parseFloat(onlyNumbers.replace(/\./g, '').replace(',', '.')) || 0;
      }
      if (onlyNumbers.includes(',') && !onlyNumbers.includes('.')) {
        return parseFloat(onlyNumbers.replace(',', '.')) || 0;
      }
      return parseFloat(onlyNumbers) || 0;
    };

    const getValue = (item: any) => {
      let val = item.valor ?? item.valor_total ?? item.total ?? item.valor_titulo ?? item.valor_liquido ?? item.valor_bruto ?? item.valor_parcela ?? item.valor_aberto ?? item.vlr_total ?? item.vlr_liquido ?? item.vlr_bruto ?? item.valor_pago ?? item.vlr_pago ?? item.valor_original ?? item.vlr_original;
      if (val === undefined || val === null) {
        const valueKeys = Object.keys(item).filter(k => k.toLowerCase().includes('valor') || k.toLowerCase().includes('vlr') || k.toLowerCase().includes('total') || k.toLowerCase().includes('liquido'));
        for (const key of valueKeys) {
          const candidate = item[key];
          if (candidate !== undefined && candidate !== null && candidate !== '') {
            val = candidate;
            break;
          }
        }
      }
      return Math.abs(parseValue(val ?? 0));
    };

    const dre: Record<string, { label: string, value: number, subcategories: Record<string, number> }> = {};
    const companyBreakdown: Record<string, { revenue: number, expense: number, result: number }> = {
      "A.C. DA COSTA": { revenue: 0, expense: 0, result: 0 },
      "COMEX COSTA LOG": { revenue: 0, expense: 0, result: 0 },
      "CRC COSTA": { revenue: 0, expense: 0, result: 0 },
      "OUTROS": { revenue: 0, expense: 0, result: 0 }
    };

    const foundCompanies = new Set<string>();

    const processItems = (items: any[], isRevenue: boolean) => {
      if (items.length === 0) {
        console.warn(`FinancialService: Nenhum item recebido para ${isRevenue ? 'Receita' : 'Despesa'} em ${period.month}/${period.year}`);
      }
      items.forEach(item => {
        // Apply global filters
        const desc = (item.descricao || item.historico || item.cliente || item.fornecedor || '').toString().toUpperCase();
        const isTransfer = desc.startsWith('TRANSF') || desc.startsWith('TRASNF');
        const partner = item.parceiro || item.nome_parceiro || item.cliente || item.fornecedor || item.nome_cliente || item.nome_fornecedor;
        const hasPartner = partner && partner.toString().trim() !== "" && partner.toString().toUpperCase() !== "N/A";
        const companyRaw = (item.empresa || item.nome_empresa || item.fantasia || '').toString().toUpperCase();
        foundCompanies.add(companyRaw);
        const isIdeallog = companyRaw === 'IDEALLOG';
        const hasDate = !!(item.dataEmissao || item.data_emissao);

        if (isTransfer || !hasPartner || isIdeallog || !hasDate) return;

        // Company filtering logic
        let targetCompanyId = "OTHER";
        if (companyRaw.includes("A.C. DA COSTA") || companyRaw.includes("AC DA COSTA") || companyRaw.includes("A. C. DA COSTA")) targetCompanyId = "AC_DA_COSTA";
        else if (companyRaw.includes("COMEX")) targetCompanyId = "COMEX_COSTA_LOG";
        else if (companyRaw.includes("CRC")) targetCompanyId = "CRC_COSTA";

        // If specific companies are selected, filter by them
        if (selectedCompanies && selectedCompanies.length > 0) {
          if (!selectedCompanies.includes(targetCompanyId)) return;
        }

        const rawAccount = (item.conta || item.nome_conta || item.conta_corrente || item.banco || '').toString().trim();
        const accountName = rawAccount.replace(/^[\d.\s-]+/, '').trim();
        const mapping = CATEGORY_MAPPING[accountName];

        if (!mapping || mapping.category === "Á DEFINIR" || mapping.category === "SEM CLASSIFICAÇÃO") return;

        const { category, subcategory } = mapping;
        const value = getValue(item);

        // Company breakdown for display
        const displayCompanyName = targetCompanyId === "AC_DA_COSTA" ? "A.C. DA COSTA" : 
                                  targetCompanyId === "COMEX_COSTA_LOG" ? "COMEX COSTA LOG" : 
                                  targetCompanyId === "CRC_COSTA" ? "CRC COSTA" : "OUTROS";

        if (companyBreakdown[displayCompanyName]) {
          if (isRevenue) companyBreakdown[displayCompanyName].revenue += value;
          else companyBreakdown[displayCompanyName].expense += value;
          companyBreakdown[displayCompanyName].result = companyBreakdown[displayCompanyName].revenue - companyBreakdown[displayCompanyName].expense;
        }
        
        if (!dre[category]) {
          dre[category] = { label: category, value: 0, subcategories: {} };
        }

        dre[category].value += value;
        
        if (!dre[category].subcategories[subcategory]) {
          dre[category].subcategories[subcategory] = 0;
        }
        dre[category].subcategories[subcategory] += value;
      });
    };

    processItems(receivables, true);
    processItems(payables, false);

    if (foundCompanies.size > 0) {
      console.log(`FinancialService: Empresas encontradas em ${period.month}/${period.year}:`, Array.from(foundCompanies));
    }

    // Calculate totals
    let totalRevenue = 0;
    let totalExpense = 0;

    Object.keys(dre).forEach(catKey => {
      // Categories starting with 1.x are revenue, others are expenses (simplified based on image)
      if (catKey.startsWith('1.') || catKey.startsWith('2.6')) {
        totalRevenue += dre[catKey].value;
      } else {
        totalExpense += dre[catKey].value;
      }
    });

    const result = {
      categories: dre,
      totalRevenue,
      totalExpense,
      netResult: totalRevenue - totalExpense,
      companyBreakdown
    };

    // Store in session cache
    sessionCache[cacheKey] = result;
    
    return result;
  },

  /**
   * Fetches monthly evolution for the last 6 months
   */
  async getEvolutionData(period: { month: number, year: number }, selectedCompanies?: string[], priority = false) {
    const months = [];
    const now = new Date(period.year, period.month - 1);
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    }

    const evolution = await Promise.all(months.map(async (m) => {
      const data = await this.getDREData(m, selectedCompanies, false, priority);
      const monthNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      return {
        label: monthNames[m.month - 1],
        rev: data.totalRevenue,
        cost: data.totalExpense
      };
    }));

    return evolution;
  },

  /**
   * Fetches raw receivables
   */
  async getReceivables(start: string, end: string, priority = false) {
    return fetchDss('listar_contas_receber_get', { 
      data_inicio: start, data_fim: end 
    }, priority);
  },

  /**
   * Fetches raw payables
   */
  async getPayables(start: string, end: string, priority = false) {
    return fetchDss('listar_contas_pagar_get', { 
      data_inicio: start, data_fim: end 
    }, priority);
  }
};
