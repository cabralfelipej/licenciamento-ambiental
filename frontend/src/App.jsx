import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Building2, FileText, AlertTriangle, Calendar, Plus, Search } from 'lucide-react'
import { GestaoEmpresas } from './components/GestaoEmpresas.jsx'
import { GestaoLicencas } from './components/GestaoLicencas.jsx'
import { GestaoCondicionantes } from './components/GestaoCondicionantes.jsx'
import { GoogleCalendarIntegration } from './components/GoogleCalendarIntegration.jsx'
import { Toaster } from '@/components/ui/sonner.jsx' // Importar o Toaster
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'

// Definindo a URL base da API do backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

import { Skeleton } from "@/components/ui/skeleton" // Importar Skeleton
import { LoginPage } from './components/LoginPage.jsx'; // Importar LoginPage
import { AuthProvider } from './contexts/AuthContext.jsx'; // Importar AuthProvider
import { ProtectedRoute } from './components/ProtectedRoute.jsx'; // Importar ProtectedRoute

// Componente do Dashboard (conteúdo original do Dashboard)
function DashboardContent({ resumo, loadingResumo } ) {
  const [urgentActions, setUrgentActions] = useState([]);
  const [loadingUrgentActions, setLoadingUrgentActions] = useState(true);

  useEffect(() => {
    const fetchUrgentActions = async () => {
      setLoadingUrgentActions(true);
      try {
        // TODO: Usar token JWT para autenticar esta chamada se necessário no futuro
        const response = await fetch(`${API_BASE_URL}/api/condicionantes/urgentes`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setUrgentActions(data);
      } catch (error) {
        console.error("Erro ao buscar ações urgentes:", error);
        setUrgentActions([]);
      } finally {
        setLoadingUrgentActions(false);
      }
    };

    fetchUrgentActions();
  }, []);

  const getBadgeVariant = (diasRestantes) => {
    if (diasRestantes < 0) return "destructive";
    if (diasRestantes <= 30) return "warning";
    return "default";
  };

  return (
    <div className="dashboard-content">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingResumo ? <Skeleton className="h-8 w-1/2 mb-1" /> : <div className="text-2xl font-bold">{resumo.total_empresas}</div>}
            {loadingResumo ? <Skeleton className="h-4 w-3/4" /> : <p className="text-xs text-muted-foreground">+20.1% do mês passado</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Licenças</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingResumo ? <Skeleton className="h-8 w-1/2 mb-1" /> : <div className="text-2xl font-bold">{resumo.total_licencas}</div>}
            {loadingResumo ? <Skeleton className="h-4 w-3/4" /> : <p className="text-xs text-muted-foreground">+180.1% do mês passado</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Licenças Vencendo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingResumo ? <Skeleton className="h-8 w-1/2 mb-1" /> : <div className="text-2xl font-bold">{resumo.licencas_vencendo}</div>}
            {loadingResumo ? <Skeleton className="h-4 w-3/4" /> : <p className="text-xs text-muted-foreground">{resumo.licencas_vencidas} vencidas</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Condicionantes Urgentes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingResumo ? <Skeleton className="h-8 w-1/2 mb-1" /> : <div className="text-2xl font-bold">{resumo.condicionantes_urgentes}</div>}
            {loadingResumo ? <Skeleton className="h-4 w-3/4" /> : <p className="text-xs text-muted-foreground">{resumo.condicionantes_vencidas} vencidas</p>}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Próximas Ações Urgentes</CardTitle>
            <CardDescription>Condicionantes com prazos próximos ou vencidos.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUrgentActions ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : urgentActions.length > 0 ? (
              urgentActions.map((action) => (
                <div key={action.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div>
                    <p className="text-sm font-medium">{action.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.empresa_nome || action.empresa?.razao_social || 'N/A'} - Prazo: {action.data_limite ? new Date(action.data_limite + 'T00:00:00').toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <Badge variant={getBadgeVariant(action.dias_para_vencimento)}>
                    {action.dias_para_vencimento < 0
                      ? `Vencida há ${Math.abs(action.dias_para_vencimento)} dias`
                      : action.dias_para_vencimento !== null
                        ? `Vence em ${action.dias_para_vencimento} dias`
                        : 'Prazo Indefinido'}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Nenhuma ação urgente no momento.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Seção de Integração Google Calendar */}
      <div className="mt-8">
        <GoogleCalendarIntegration API_BASE_URL={API_BASE_URL} />
      </div>
    </div>
  );
}


// Componente que representa o Layout Principal da Aplicação (antigo App)
function MainLayout() {
  const [resumo, setResumo] = useState(null);
  const [loadingResumo, setLoadingResumo] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('activeLicenciamentoTab');
    return savedTab || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('activeLicenciamentoTab', activeTab);
  }, [activeTab]);

  const [licencaDialogOpen, setLicencaDialogOpen] = useState(false);
  const [editingLicenca, setEditingLicenca] = useState(null);
  const [licencaFormData, setLicencaFormData] = useState({
    empresa_id: '',
    tipo: '',
    numero: '',
    orgao_emissor: '',
    data_emissao: '',
    data_validade: '',
    observacoes: ''
  });
  const [empresasParaSelect, setEmpresasParaSelect] = useState([]);
  const [todasAsCondicionantes, setTodasAsCondicionantes] = useState([]);

  const fetchEmpresasParaSelect = async () => {
    try {
      // TODO: Usar token JWT para autenticar esta chamada
      const response = await fetch(`${API_BASE_URL}/api/empresas`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setEmpresasParaSelect(data.map(emp => ({ id: emp.id, razao_social: emp.razao_social })));
    } catch (error) {
      console.error("Erro ao buscar empresas para select:", error);
      setEmpresasParaSelect([]);
    }
  };

  const resetLicencaForm = () => {
    setEditingLicenca(null);
    setLicencaFormData({
      empresa_id: '',
      tipo: '',
      numero: '',
      orgao_emissor: '',
      data_emissao: '',
      data_validade: '',
      observacoes: ''
    });
  };

  const fetchDashboardSummary = async () => {
    setLoadingResumo(true);
    try {
      // TODO: Usar token JWT para autenticar esta chamada
      const response = await fetch(`${API_BASE_URL}/api/dashboard/resumo`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setResumo({
        total_empresas: data.totais?.empresas ?? 0,
        total_licencas: data.totais?.licencas ?? 0,
        licencas_vencendo: data.alertas?.licencas_vencimento ?? 0,
        licencas_vencidas: data.alertas?.licencas_vencidas ?? 0,
        condicionantes_urgentes: data.alertas?.condicionantes_vencimento ?? 0,
        condicionantes_vencidas: data.alertas?.condicionantes_vencidas ?? 0,
      });
    } catch (error) {
      console.error("Erro ao buscar resumo do dashboard:", error);
      setResumo({ total_empresas: 0, total_licencas: 0, licencas_vencendo: 0, licencas_vencidas: 0, condicionantes_urgentes: 0, condicionantes_vencidas: 0 });
    } finally {
      setLoadingResumo(false);
    }
  };

  const fetchTodasCondicionantes = async () => {
    try {
      // TODO: Usar token JWT para autenticar esta chamada
      const response = await fetch(`${API_BASE_URL}/api/condicionantes`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const condicionantesProcessadas = data.map(c => ({
        ...c,
        cumprida: c.status === 'cumprida' || !!c.data_envio_cumprimento,
        licenca_numero: c.licenca?.numero_licenca || c.licenca_numero || 'N/A',
        empresa_nome: c.empresa?.razao_social || c.empresa_nome || 'N/A',
      }));
      setTodasAsCondicionantes(condicionantesProcessadas);
    } catch (error) {
      console.error("Erro ao buscar todas as condicionantes:", error);
      setTodasAsCondicionantes([]);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        fetchDashboardSummary(),
        fetchEmpresasParaSelect(),
        fetchTodasCondicionantes()
      ]);
    };
    loadInitialData();
  }, []);

  const handleEmpresaAtualizada = () => {
    fetchEmpresasParaSelect();
    fetchDashboardSummary();
  };

  const handleOpenNovaLicencaDialog = () => {
    resetLicencaForm();
    setLicencaDialogOpen(true);
    setActiveTab("licencas");
  };

  const handleLicencaDialogOpenChange = (isOpen) => {
    setLicencaDialogOpen(isOpen);
    if (!isOpen) {
      resetLicencaForm();
    }
  };

  return (
    <div className="min-h-screen w-full bg-muted/40">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
        <h1 className="text-3xl font-bold">Sistema de Licenciamento Ambiental</h1>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              className="flex h-9 w-[250px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleOpenNovaLicencaDialog}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
          >
            <Plus className="h-4 w-4 mr-2" /> Nova Licença
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="empresas">Empresas</TabsTrigger>
            <TabsTrigger value="licencas">Licenças</TabsTrigger>
            <TabsTrigger value="condicionantes">Condicionantes</TabsTrigger>
            {/* TODO: Adicionar aba de "Gerenciar Usuários" condicionalmente para admins */}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardContent resumo={resumo} loadingResumo={loadingResumo} />
          </TabsContent>

          <TabsContent value="empresas" className="space-y-6">
            <GestaoEmpresas API_BASE_URL={API_BASE_URL} onEmpresaAtualizada={handleEmpresaAtualizada} />
          </TabsContent>

          <TabsContent value="licencas" className="space-y-6">
            <GestaoLicencas
              API_BASE_URL={API_BASE_URL}
              dialogOpen={licencaDialogOpen}
              setDialogOpen={handleLicencaDialogOpenChange}
              editingLicenca={editingLicenca}
              setEditingLicenca={setEditingLicenca}
              formData={licencaFormData}
              setFormData={setLicencaFormData}
              empresas={empresasParaSelect}
              todasAsCondicionantes={todasAsCondicionantes}
            />
          </TabsContent>

          <TabsContent value="condicionantes" className="space-y-6">
            <GestaoCondicionantes API_BASE_URL={API_BASE_URL} />
          </TabsContent>
        </Tabs>
      </main>
      <Toaster richColors />
    </div>
  );
}

// Componente App principal agora apenas configura o Router
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          />
          {/* Exemplo de rota específica para admin no futuro:
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['administrador']}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          */}
          <Route path="*" element={<Navigate to="/" />} /> {/* Redireciona rotas não encontradas */}
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
