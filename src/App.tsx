import React, { useState } from 'react';
import { Sidebar, ViewType } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/views/Dashboard';
import { CashFlowView } from './components/views/CashFlow';
import { ComparisonView } from './components/views/Comparison';
import { BudgetView } from './components/views/Budget';
import { SimulationView } from './components/views/Simulation';
import { APIIntegrationsView } from './components/views/APIIntegrations';
import { SettingsView } from './components/views/Settings';
import { AuditView } from './components/views/Audit';
import { TaxesView } from './components/views/Taxes';
import { PAndLView } from './components/views/PAndL';
import { SpreadsheetView } from './components/views/Spreadsheet';
import { COMPANIES } from './constants/companies';

export default function App() {
  const [accessPassword, setAccessPassword] = useState(() => sessionStorage.getItem('finance_access_password') || '');
  const [authenticated, setAuthenticated] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  React.useEffect(() => {
    const saved = sessionStorage.getItem('finance_access_password');
    if (!saved) return;
    fetch('/api/financeiro/auth', { method: 'POST', headers: { 'x-finance-password': saved } })
      .then(response => { if (response.ok) setAuthenticated(true); else sessionStorage.removeItem('finance_access_password'); })
      .catch(() => setLoginError('Não foi possível validar o acesso. Verifique a conexão.'));
  }, []);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const response = await fetch('/api/financeiro/auth', {
        method: 'POST',
        headers: { 'x-finance-password': accessPassword }
      });
      if (!response.ok) {
        if (response.status === 503) throw new Error('A senha de acesso ainda não foi configurada no servidor.');
        throw new Error('Senha incorreta ou acesso não autorizado.');
      }
      sessionStorage.setItem('finance_access_password', accessPassword);
      setAuthenticated(true);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Falha ao entrar.');
    } finally {
      setLoginLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-slate-100 px-4">
        <form onSubmit={handleLogin} className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
          <h1 className="text-2xl font-semibold mb-2">Financeiro COSTALOG</h1>
          <p className="text-sm text-slate-400 mb-6">Informe a senha de acesso autorizada para abrir o painel financeiro.</p>
          <label htmlFor="finance-password" className="block text-sm mb-2">Senha de acesso</label>
          <input id="finance-password" type="password" autoComplete="current-password" required value={accessPassword} onChange={event => setAccessPassword(event.target.value)} className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-3 outline-none focus:border-blue-500" />
          {loginError && <p role="alert" className="text-sm text-red-400 mt-3">{loginError}</p>}
          <button type="submit" disabled={loginLoading} className="w-full mt-5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 px-4 py-3 font-medium">
            {loginLoading ? 'Validando...' : 'Entrar'}
          </button>
        </form>
      </div>
    );
  }
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(COMPANIES.map(c => c.id));

  const renderView = () => {
    const props = { 
      period: selectedPeriod, 
      selectedCompanies 
    };

    switch (currentView) {
      case 'dashboard': return <DashboardView {...props} />;
      case 'cashflow': return <CashFlowView {...props} />;
      case 'comparison': return <ComparisonView {...props} />;
      case 'budget': return <BudgetView {...props} />;
      case 'simulation': return <SimulationView {...props} />;
      case 'api': return <APIIntegrationsView />;
      case 'settings': return <SettingsView />;
      case 'audit': return <AuditView {...props} />;
      case 'taxes': return <TaxesView {...props} />;
      case 'dre': return <PAndLView {...props} />;
      case 'spreadsheet': return <SpreadsheetView {...props} />;
      default: return <DashboardView {...props} />;
    }
  };

  const getTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Painel de Desempenho do Grupo';
      case 'cashflow': return 'Demonstração de Fluxo de Caixa';
      case 'comparison': return 'Comparativo entre Empresas';
      case 'budget': return 'Acompanhamento Orçamentário';
      case 'simulation': return 'Simulação de Cenários';
      case 'api': return 'Integrações e API';
      case 'settings': return 'Configurações Gerais';
      case 'audit': return 'Auditoria e Log';
      case 'taxes': return 'Relatório de Impostos';
      case 'dre': return 'DRE - Demonstrativo de Resultados';
      case 'spreadsheet': return 'Planilha de Lançamentos';
      default: return 'Finance Cockpit';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-slate-100">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={getTitle()} 
          period={selectedPeriod} 
          onPeriodChange={setSelectedPeriod} 
          selectedCompanies={selectedCompanies}
          onCompaniesChange={setSelectedCompanies}
        />
        {renderView()}
      </main>
    </div>
  );
}

