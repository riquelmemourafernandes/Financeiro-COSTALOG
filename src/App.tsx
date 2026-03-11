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

