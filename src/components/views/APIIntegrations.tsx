import React, { useEffect, useState } from 'react';
import { 
  Database, 
  Activity, 
  Globe, 
  Plus, 
  Copy, 
  Trash2, 
  Edit2, 
  Pause, 
  Play,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Zap,
  RefreshCw,
  Terminal
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { FinancialService } from '@/src/services/api';

const ConnectionCard = ({ title, status, lastSync, icon: Icon, color, isLoading }: any) => (
  <div className="bg-surface p-6 rounded-xl border border-border hover:border-primary/50 transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("size-12 rounded-lg flex items-center justify-center", color)}>
        <Icon size={24} />
      </div>
      <span className={cn(
        "flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold rounded-full uppercase",
        status === 'connected' ? "bg-emerald-500/10 text-emerald-500" : status === 'error' ? "bg-rose-500/10 text-rose-500" : "bg-blue-500/10 text-blue-500"
      )}>
        <span className={cn("size-1.5 rounded-full", 
          status === 'connected' ? "bg-emerald-500" : 
          status === 'error' ? "bg-rose-500" : 
          "bg-blue-500 animate-pulse",
          isLoading && "animate-spin"
        )}></span>
        {isLoading ? 'Verificando...' : status === 'connected' ? 'Conectado' : status === 'error' ? 'Erro' : 'Tempo Real'}
      </span>
    </div>
    <h4 className="font-bold text-slate-100">{title}</h4>
    <p className="text-xs text-slate-500 mt-1">{lastSync}</p>
  </div>
);

export const APIIntegrationsView = () => {
  const [dssStatus, setDssStatus] = useState<'connected' | 'error' | 'idle'>('idle');
  const [lastSync, setLastSync] = useState('Nunca sincronizado');
  const [isLoading, setIsLoading] = useState(false);
  const [sampleData, setSampleData] = useState<any>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState(FinancialService.getMockMode());

  const clearCache = async () => {
    try {
      await fetch('/api/proxy/clear', { method: 'POST' });
      setLastSync('Cache limpo. Teste a conexão novamente.');
      setSampleData(null);
    } catch (err) {
      console.error('Erro ao limpar cache:', err);
    }
  };

  const toggleMockMode = () => {
    const newState = !isMockMode;
    FinancialService.setMockMode(newState);
    setIsMockMode(newState);
  };

  const checkConnection = async () => {
    setIsLoading(true);
    setErrorDetails(null);
    try {
      // Fetch raw data first to show in console (current month as requested)
      const range = FinancialService.getCurrentMonthRange();
      const rawData = await FinancialService.getReceivables(range.start, range.end);
      
      // Calculate total
      const total = FinancialService.sumValues(rawData);
      
      setDssStatus('connected');
      setLastSync(`Sincronizado agora: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      
      // Show actual raw data in the "Terminal" view (limited to first few items)
      setSampleData({
        status: 200,
        endpoint: 'listar_contas_receber_get',
        timestamp: new Date().toLocaleString('pt-BR'),
        period: `${range.start} - ${range.end}`,
        items_count: Array.isArray(rawData) ? rawData.length : (rawData.registros?.length || 0),
        raw_preview: Array.isArray(rawData) ? rawData.slice(0, 2) : (rawData.registros?.slice(0, 2) || rawData)
      });
    } catch (err: any) {
      setDssStatus('error');
      setLastSync('Erro na última tentativa');
      setErrorDetails(err.message);
      setSampleData({
        status: 'Error',
        message: err.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Integrações e API</h2>
          <p className="text-slate-500 mt-1">Gerencie chaves de acesso, webhooks e status de integração com sistemas externos.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={clearCache}
            className="flex items-center gap-2 h-10 px-4 bg-surface border border-border rounded-lg text-sm font-semibold hover:bg-white/5 transition-colors"
            title="Limpar cache do servidor proxy"
          >
            <Trash2 size={16} /> Limpar Cache
          </button>
          <button 
            onClick={toggleMockMode}
            className={cn(
              "flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-bold transition-all border",
              isMockMode 
                ? "bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20" 
                : "bg-surface border-border text-slate-400 hover:bg-white/5"
            )}
          >
            <Zap size={16} className={cn(isMockMode && "fill-amber-500")} />
            {isMockMode ? 'Modo Simulação: ON' : 'Modo Simulação: OFF'}
          </button>
          <button 
            onClick={checkConnection}
            disabled={isLoading}
            className="flex items-center gap-2 h-10 px-4 bg-surface border border-border rounded-lg text-sm font-semibold hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={cn(isLoading && "animate-spin")} /> Testar Conexões
          </button>
          <button className="flex items-center gap-2 h-10 px-4 bg-primary text-white rounded-lg text-sm font-bold hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95">
            <Plus size={16} /> Gerar Nova Chave API
          </button>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Status das Conexões</h3>
          <span className={cn(
            "px-2 py-0.5 text-[10px] font-bold rounded-full border",
            dssStatus === 'connected' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
          )}>
            {dssStatus === 'connected' ? 'Sistemas Online' : 'Atenção Necessária'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ConnectionCard 
            title="DSS Informática (ERP)" 
            status={dssStatus === 'idle' ? 'realtime' : dssStatus} 
            lastSync={isLoading ? 'Verificando...' : lastSync} 
            icon={Database} 
            color="bg-orange-500/10 text-orange-500"
            isLoading={isLoading}
          />
          <ConnectionCard title="Power BI Service" status="connected" lastSync="Há 14 minutos" icon={Activity} color="bg-blue-500/10 text-blue-500" />
          <ConnectionCard title="Bancos (Open Finance)" status="realtime" lastSync="Conexão via Pluggy ativa" icon={Globe} color="bg-purple-500/10 text-purple-500" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Console de Resposta (Live)</h3>
            <span className="text-[10px] font-mono text-slate-500 uppercase">JSON Output</span>
          </div>
          <div className="bg-[#0f172a] rounded-xl border border-border p-6 font-mono text-xs overflow-hidden relative group shadow-2xl">
            <div className="absolute top-4 right-5 flex gap-3 z-10">
              <div className="size-3.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)] border border-rose-400/20"></div>
              <div className="size-3.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)] border border-amber-400/20"></div>
              <div className="size-3.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] border border-emerald-400/20"></div>
            </div>
            <div className="space-y-2 text-slate-300">
              <div className="flex gap-2 text-emerald-500">
                <Terminal size={14} />
                <span>costa-cockpit ~ % curl -X GET "DSS_API_ENDPOINT"</span>
              </div>
              {isLoading ? (
                <div className="animate-pulse text-slate-500 italic">Aguardando resposta do servidor...</div>
              ) : sampleData ? (
                <pre className="text-blue-300 whitespace-pre-wrap">
                  {JSON.stringify(sampleData, null, 2)}
                </pre>
              ) : (
                <div className="text-slate-500 italic">Nenhum dado capturado. Clique em "Testar Conexões".</div>
              )}
              {errorDetails && (
                <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded text-rose-400">
                  <p className="font-bold flex items-center gap-2">
                    <AlertCircle size={14} /> Erro Detectado:
                  </p>
                  <p className="mt-1">{errorDetails}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Configuração de Webhooks</h3>
            <button className="text-primary text-sm font-bold hover:underline">Novo Webhook</button>
          </div>
          <div className="bg-surface rounded-xl border border-border p-6 space-y-4">
            {[
              { url: 'https://api.erp-cliente.com/webhooks/costa', status: 'active', events: 'invoice.created, payment.confirmed' },
              { url: 'https://internal.test.dev/hooks', status: 'inactive', events: 'all_events' },
            ].map((w, i) => (
              <div key={i} className={cn("flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/5 rounded-lg gap-4", w.status === 'inactive' && "opacity-60")}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500">URL de Destino</span>
                    <span className={cn("px-2 py-0.5 text-[10px] rounded font-bold uppercase", w.status === 'active' ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-500")}>
                      {w.status === 'active' ? 'ATIVO' : 'INATIVO'}
                    </span>
                  </div>
                  <p className="text-sm font-mono truncate text-slate-300">{w.url}</p>
                  <p className="text-xs text-slate-500 mt-2">Eventos: <span className="text-primary">{w.events}</span></p>
                </div>
                <div className="flex gap-2 self-end md:self-center">
                  <button className="size-8 rounded bg-surface border border-border flex items-center justify-center hover:text-primary transition-all"><Edit2 size={14} /></button>
                  <button className="size-8 rounded bg-surface border border-border flex items-center justify-center hover:text-rose-500 transition-all">
                    {w.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="relative rounded-2xl overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-900 opacity-90"></div>
        <div className="relative px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h3 className="text-2xl font-bold text-white">Central de Desenvolvedores</h3>
            <p className="text-blue-100">Acesse nossa documentação completa, SDKs e exemplos de código para integrar o Costa Cockpit diretamente no seu fluxo de trabalho financeiro.</p>
            <div className="flex flex-wrap gap-4 mt-4">
              {[
                { label: 'Autenticação via JWT', icon: CheckCircle2 },
                { label: 'Respostas em JSON', icon: CheckCircle2 },
                { label: 'Rate Limit: 100 req/s', icon: CheckCircle2 },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-white/80 text-sm">
                  <item.icon size={14} /> {item.label}
                </div>
              ))}
            </div>
          </div>
          <button className="shrink-0 bg-white text-primary px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-xl shadow-black/20 active:scale-95">
            Abrir Documentação API
          </button>
        </div>
      </section>
    </div>
  );
};
