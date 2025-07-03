import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Building2, FileText, AlertTriangle, Calendar, Plus, Search } from 'lucide-react'
import { GestaoEmpresas } from './components/GestaoEmpresas.jsx'
import { GestaoLicencas } from './components/GestaoLicencas.jsx'
import { GestaoCondicionantes } from './components/GestaoCondicionantes.jsx'
import { GoogleCalendarIntegration } from './components/GoogleCalendarIntegration.jsx'
import './App.css'

// Definindo a URL base da API do backend
// Prioriza a variável de ambiente, com fallback para o localhost (desenvolvimento) ou uma URL de produção hardcoded se necessário.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
// Se souber a URL de produção final do backend no Render, pode usar como fallback final:
// const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://seu-backend-no-render.onrender.com';


// Componente do Dashboard
function Dashboard({ resumo } ) {
  const [urgentActions, setUrgentActions] = useState([]);

  useEffect(() => {
    const fetchUrgentActions = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/condicionantes/urgentes`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setUrgentActions(data);
      } catch (error) {
        console.error("Erro ao buscar ações urgentes:", error);
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
            <div className="text-2xl font-bold">{resumo.total_empresas}</div>
            <p className="text-xs text-muted-foreground">+20.1% do mês passado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Licenças</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo.total_licencas}</div>
            <p className="text-xs text-muted-foreground">+180.1% do mês passado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Licenças Vencendo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo.licencas_vencendo}</div>
            <p className="text-xs text-muted-foreground">{resumo.licencas_vencidas} vencidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Condicionantes Urgentes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo.condicionantes_urgentes}</div>
            <p className="text-xs text-muted-foreground">{resumo.condicionantes_vencidas} vencidas</p>
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
            <div className="space-y-4">
              {urgentActions.length > 0 ? (
                urgentActions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{action.descricao}</p>
                      <p className="text-xs text-muted-foreground">{action.empresa_nome} - Prazo: {new Date(action.data_prazo).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={getBadgeVariant(action.dias_restantes)}>
                      {action.dias_restantes < 0 ? `Vencida há ${Math.abs(action.dias_restantes)} dias` : `Vence em ${action.dias_restantes} dias`}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">Nenhuma ação urgente no momento.</p>
              )}
            </div>
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

// Componente principal da aplicação
function App() {
  const [resumo, setResumo] = useState({
    total_empresas: 0,
    total_licencas: 0,
    licencas_vencendo: 0,
    licencas_vencidas: 0,
    condicionantes_urgentes: 0,
    condicionantes_vencidas: 0,
  });
  // const [activeTab, setActiveTab] = useState("dashboard");
  // Persistência da aba ativa
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('activeLicenciamentoTab');
    return savedTab || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('activeLicenciamentoTab', activeTab);
  }, [activeTab]);

  // Estados para o formulário de Licença (elevados de GestaoLicencas)
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

  // Função para buscar/atualizar empresas para o select, pode ser chamada externamente se necessário
  const fetchEmpresasParaSelect = async () => {
    try {
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

  useEffect(() => {
    const fetchDashboardSummary = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/resumo`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setResumo(data);
      } catch (error) {
        console.error("Erro ao buscar resumo do dashboard:", error);
      }
    };

    const fetchEmpresasParaSelect = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/empresas`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Mapeia para o formato esperado pelo Select (id, razao_social)
        setEmpresasParaSelect(data.map(emp => ({ id: emp.id, razao_social: emp.razao_social })));
      } catch (error) {
        console.error("Erro ao buscar empresas para select:", error);
        setEmpresasParaSelect([]); // Define como array vazio em caso de erro
      }
    };

    const fetchTodasCondicionantes = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/condicionantes`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // O backend já deve retornar os dados processados com dias_restantes, etc.
        // Se precisar de algum processamento adicional no frontend, fazer aqui.
        // Por exemplo, garantir que 'cumprida' seja booleano baseado em 'status' ou 'data_envio_cumprimento'
        const condicionantesProcessadas = data.map(c => ({
          ...c,
          cumprida: c.status === 'cumprida' || !!c.data_envio_cumprimento,
          // Adicionar licenca_numero e empresa_nome se não vierem diretamente da API /api/condicionantes
          // Isso pode exigir uma lógica mais complexa se a API /api/condicionantes não aninhar esses dados.
          // Idealmente, a API /api/condicionantes já retorna 'licenca' e 'empresa' aninhados.
          licenca_numero: c.licenca?.numero_licenca || c.licenca_numero || 'N/A',
          empresa_nome: c.empresa?.razao_social || c.empresa_nome || 'N/A',
        }));
        setTodasAsCondicionantes(condicionantesProcessadas);
      } catch (error) {
        console.error("Erro ao buscar todas as condicionantes:", error);
        setTodasAsCondicionantes([]); // Define como array vazio em caso de erro
      }
    };

    fetchDashboardSummary();
    fetchEmpresasParaSelect(); // Chamada inicial
    fetchTodasCondicionantes();

  }, [API_BASE_URL]);

  // Callback para ser chamado por GestaoEmpresas após um novo cadastro/edição
  const handleEmpresaAtualizada = () => {
    fetchEmpresasParaSelect(); // Re-busca as empresas para o select
    fetchDashboardSummary(); // Opcional: Re-busca o resumo do dashboard se o total de empresas mudou
  };

  const handleOpenNovaLicencaDialog = () => {
    resetLicencaForm(); // Reseta o formulário e a licença em edição
    setLicencaDialogOpen(true);
    setActiveTab("licencas"); // Mudar para a aba de licenças
  };

  // Função para ser passada como setDialogOpen para GestaoLicencas
  // Garante que o formulário seja resetado ao fechar o dialog
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
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard resumo={resumo} />
          </TabsContent>

          <TabsContent value="empresas" className="space-y-6">
            <GestaoEmpresas API_BASE_URL={API_BASE_URL} onEmpresaAtualizada={handleEmpresaAtualizada} />
          </TabsContent>

          <TabsContent value="licencas" className="space-y-6">
            <GestaoLicencas
              API_BASE_URL={API_BASE_URL}
              dialogOpen={licencaDialogOpen}
              setDialogOpen={handleLicencaDialogOpenChange} // Usar a nova função
              editingLicenca={editingLicenca}
              setEditingLicenca={setEditingLicenca}
              formData={licencaFormData}
              setFormData={setLicencaFormData}
              empresas={empresasParaSelect}
              todasAsCondicionantes={todasAsCondicionantes} // Passando todas as condicionantes
            />
          </TabsContent>

          <TabsContent value="condicionantes" className="space-y-6">
            <GestaoCondicionantes API_BASE_URL={API_BASE_URL} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;
