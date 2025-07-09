import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { FileText, Edit, Trash2, Calendar, AlertTriangle, CheckCircle, Search, Eye, ListFilter } from 'lucide-react'
// Importações de GestaoCondicionantes para reuso (ou crie um componente CondicionanteCard separado)
import { Calendar as CalendarIcon, Paperclip, Loader2 } from 'lucide-react' // CheckCircle já importado, Adicionado Loader2
import { format } from "date-fns"
import { toast } from "sonner" // Importar toast
import { Skeleton } from "@/components/ui/skeleton" // Importar Skeleton
import { ptBR } from "date-fns/locale"


// Subcomponente para exibir um card de condicionante (simplificado de GestaoCondicionantes)
function CondicionanteCard({ condicionante }) {
  const getStatusBadgeCond = (status, diasRestantes, cumprida) => {
    if (cumprida) return <Badge variant="secondary" className="bg-green-100 text-green-800">Cumprida</Badge>;
    if (status === 'vencida' || (!cumprida && diasRestantes < 0)) return <Badge variant="destructive">Vencida</Badge>;
    if (diasRestantes <= 7) return <Badge variant="destructive">Urgente</Badge>;
    if (diasRestantes <= 30) return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Próximo do prazo</Badge>;
    return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Pendente</Badge>;
  };

  const getStatusIconCond = (status, diasRestantes, cumprida) => {
    if (cumprida) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status === 'vencida' || (!cumprida && diasRestantes < 0)) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (diasRestantes <= 7 && !cumprida) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (diasRestantes <= 30 && !cumprida) return <Calendar className="h-4 w-4 text-orange-600" />; // Usando Calendar Icon importado
    if (!cumprida) return <CalendarIcon className="h-4 w-4 text-blue-600" />;
    return <CalendarIcon className="h-4 w-4 text-muted-foreground" />;
  };

  // Recalcular dias restantes para exibição, pois o objeto pode ser antigo
  const hoje = new Date();
  const dataLimiteDate = new Date(condicionante.data_limite);
  const diasRestantesCalc = Math.floor((dataLimiteDate - hoje) / (1000 * 60 * 60 * 24));


  return (
    <div className="border rounded-lg p-3 space-y-2 bg-slate-50 dark:bg-slate-800/30">
      <div className="flex items-center space-x-2 mb-1">
        {getStatusIconCond(condicionante.status, diasRestantesCalc, condicionante.cumprida)}
        <h5 className="font-medium text-sm">Condicionante #{condicionante.id}</h5>
        {getStatusBadgeCond(condicionante.status, diasRestantesCalc, condicionante.cumprida)}
      </div>
      <p className="text-xs text-gray-700 dark:text-gray-300">{condicionante.descricao}</p>
      <div className="text-xs text-muted-foreground">
        <strong>Data Limite:</strong> {new Date(condicionante.data_limite).toLocaleDateString('pt-BR')}
        {!condicionante.cumprida && diasRestantesCalc >=0 && (<span> | <strong>Restam:</strong> {diasRestantesCalc} dias</span>)}
        {!condicionante.cumprida && diasRestantesCalc <0 && (<span className="text-red-500"> | <strong>Vencida há:</strong> {Math.abs(diasRestantesCalc)} dias</span>)}
      </div>
      {condicionante.responsavel && <p className="text-xs text-muted-foreground"><strong>Responsável:</strong> {condicionante.responsavel}</p>}
      {condicionante.cumprida && (
        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs space-y-0.5">
          <p className="font-semibold text-green-600 dark:text-green-400">Cumprida em: {new Date(condicionante.data_cumprimento).toLocaleDateString('pt-BR')}</p>
          {condicionante.anexo_comprovante && <p className="flex items-center"><Paperclip className="h-3 w-3 mr-1" /> {condicionante.anexo_comprovante}</p>}
          {condicionante.observacoes_cumprimento && <p><strong>Obs:</strong> {condicionante.observacoes_cumprimento}</p>}
        </div>
      )}
    </div>
  );
}


export function GestaoLicencas({
  API_BASE_URL,
  dialogOpen,
  setDialogOpen,
  editingLicenca,
  setEditingLicenca,
  formData,
  setFormData,
  empresas,
  todasAsCondicionantes // Recebe todas as condicionantes
}) {
  const [licencas, setLicencas] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false); // Novo estado para o botão de salvar
  const [termoBusca, setTermoBusca] = useState('');
  const [licencaSelecionadaId, setLicencaSelecionadaId] = useState(null);
  const [condicionantesDaLicenca, setCondicionantesDaLicenca] = useState([]);


  const fetchLicencas = async () => {
    if (!API_BASE_URL) return; // Não tenta buscar se API_BASE_URL não estiver pronto
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/licencas`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // O backend já deve retornar 'empresa' e 'dias_para_vencimento' no to_dict()
      // Se não, o processamento precisaria ser feito aqui, similar ao que era feito com dados simulados
      // mas idealmente o backend envia os dados prontos.
      const processadas = data.map(l => ({
        ...l,
        // Garante que empresa_nome exista, mesmo que empresa seja null (pouco provável com bom backend)
        empresa_nome: l.empresa?.razao_social || 'Empresa Desconhecida',
        // dias_para_vencimento já deve vir do backend pelo método to_dict() da licença
      }));
      setLicencas(processadas);
    } catch (error) {
      console.error('Erro ao carregar licenças:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicencas();
    // A dependência de 'empresas' foi removida daqui, pois a lista de empresas
    // para o select é gerenciada pelo App.jsx e passada como prop.
    // O nome da empresa na licença agora deve vir diretamente do backend.
  }, [API_BASE_URL]); // Adicionado API_BASE_URL como dependência

  const handleSubmitLicenca = async (e) => {
    e.preventDefault();
    if (!API_BASE_URL) return;
    setIsSaving(true);

    const payload = {
      empresa_id: formData.empresa_id ? parseInt(formData.empresa_id) : null,
      tipo_licenca: formData.tipo,
      numero_licenca: formData.numero,
      orgao_emissor: formData.orgao_emissor,
      data_emissao: formData.data_emissao, // Deve estar no formato YYYY-MM-DD
      data_vencimento: formData.data_validade, // Corrigido: envia data_validade como data_vencimento
      observacoes: formData.observacoes,
      // status é gerenciado pelo backend ou default
    };
    // Não precisa deletar tipo e numero se eles não existirem mais no formData após o mapeamento direto.
    // Se formData ainda tiver 'tipo' e 'numero' com nomes antigos, a abordagem de delete era correta.
    // A melhor prática é construir o payload explicitamente.

    try {
      const method = editingLicenca ? 'PUT' : 'POST';
      const url = editingLicenca
        ? `${API_BASE_URL}/api/licencas/${editingLicenca.id}`
        : `${API_BASE_URL}/api/licencas`;

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erro || `HTTP error! status: ${response.status}`);
      }
      fetchLicencas(); // Re-busca para atualizar a lista
      setDialogOpen(false); // Fecha o dialog
      // setEditingLicenca(null); // Resetado pelo App.jsx ao fechar o dialog
      toast.success(`Licença ${editingLicenca ? 'atualizada' : 'cadastrada'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao salvar licença:', error);
      toast.error(`Erro ao salvar licença: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditLicenca = (licenca) => {
    setEditingLicenca(licenca); // App.jsx controla 'editingLicenca'
    setFormData({ // App.jsx controla 'formData'
      empresa_id: licenca.empresa_id.toString(),
      tipo: licenca.tipo_licenca, // Corrigido para tipo_licenca
      numero: licenca.numero_licenca, // Corrigido para numero_licenca
      orgao_emissor: licenca.orgao_emissor,
      data_emissao: licenca.data_emissao, // Formato YYYY-MM-DD
      data_validade: licenca.data_vencimento, // Corrigido para data_vencimento e formato YYYY-MM-DD
      observacoes: licenca.observacoes || ''
    });
    setDialogOpen(true); // App.jsx controla 'dialogOpen'
  };

  const handleDeleteLicenca = async (id) => {
    if (!API_BASE_URL) return;
    if (confirm('Tem certeza que deseja excluir esta licença? As condicionantes associadas também podem ser afetadas.')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/licencas/${id}`, { method: 'DELETE' });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.erro || `HTTP error! status: ${response.status}`);
        }
        fetchLicencas(); // Re-busca para atualizar a lista
        if (licencaSelecionadaId === id) {
          setLicencaSelecionadaId(null);
          setCondicionantesDaLicenca([]);
        }
      } catch (error) {
        console.error('Erro ao excluir licença:', error);
        alert(`Erro ao excluir licença: ${error.message}`);
      }
    }
  };

  const handleVerCondicionantes = (licId) => {
    if (licencaSelecionadaId === licId) { // Se clicou na mesma, esconde
      setLicencaSelecionadaId(null);
      setCondicionantesDaLicenca([]);
    } else {
      setLicencaSelecionadaId(licId);
      const filtradas = todasAsCondicionantes?.filter(cond => cond.licenca_id === licId) || [];
      setCondicionantesDaLicenca(filtradas);
    }
  };

  const getStatusBadge = (status, diasParaVencimento) => {
    if (status === 'vencida' || diasParaVencimento < 0) return <Badge variant="destructive">Vencida</Badge>;
    if (diasParaVencimento <= 30) return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Vence em breve</Badge>;
    return <Badge variant="secondary" className="bg-green-100 text-green-800">Ativa</Badge>;
  };

  const getStatusIcon = (status, diasParaVencimento) => {
    if (status === 'vencida' || diasParaVencimento < 0) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (diasParaVencimento <= 30) return <Calendar className="h-4 w-4 text-orange-600" />;
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  const licencasFiltradas = licencas.filter(lic => {
    if (!termoBusca) return true;
    const lowerTermo = termoBusca.toLowerCase();
    return (
      lic.numero?.toLowerCase().includes(lowerTermo) ||
      lic.tipo?.toLowerCase().includes(lowerTermo) ||
      lic.empresa_nome?.toLowerCase().includes(lowerTermo) ||
      lic.orgao_emissor?.toLowerCase().includes(lowerTermo) ||
      lic.observacoes?.toLowerCase().includes(lowerTermo)
    );
  }).sort((a,b) => { // Ordenar por dias para vencimento (mais próximos primeiro, depois vencidas)
      if (a.dias_para_vencimento < 0 && b.dias_para_vencimento >=0) return 1; // Vencidas depois das não vencidas com prazo
      if (a.dias_para_vencimento >= 0 && b.dias_para_vencimento < 0) return -1;
      if (a.dias_para_vencimento < 0 && b.dias_para_vencimento < 0) return a.dias_para_vencimento - b.dias_para_vencimento; // Mais negativo (mais vencido) primeiro
      return a.dias_para_vencimento - b.dias_para_vencimento;
  });

  const LicencaCardSkeleton = () => (
    <div className="p-4 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex justify-end space-x-2 pt-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  );

  if (loading && licencas.length === 0 && API_BASE_URL) {
     // Tela de carregamento inicial para toda a seção de licenças
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-2">
          <div>
            <h3 className="text-xl font-semibold flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary" />
              Licenças Ambientais
            </h3>
            <p className="text-sm text-muted-foreground">
              Busque, visualize e gerencie as licenças.
            </p>
          </div>
          <Skeleton className="h-9 w-full sm:w-auto sm:max-w-xs" /> {/* Skeleton para input de busca */}
        </div>
        <Card className="shadow-md">
          <CardHeader>
            <Skeleton className="h-6 w-1/2" /> {/* Skeleton para título do card */}
          </CardHeader>
          <CardContent className="p-0">
            <LicencaCardSkeleton />
            <LicencaCardSkeleton />
            <LicencaCardSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  const empresasDisponiveis = empresas || [];

  return (
    <div className="space-y-6">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingLicenca ? 'Editar Licença' : 'Nova Licença'}</DialogTitle>
            <DialogDescription>Preencha os dados da licença ambiental.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitLicenca} className="space-y-4 pt-4">
            {/* Campos do formulário aqui (id dos inputs ajustados para evitar duplicidade se App tbm tiver forms) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gl_empresa_id">Empresa *</Label>
                <Select value={formData.empresa_id} onValueChange={(v) => setFormData(p => ({...p, empresa_id: v}))} required>
                  <SelectTrigger id="gl_empresa_id" className="w-full"> {/* Adicionado w-full para consistência, pode ajudar com layout */}
                    <span className="truncate"> {/* Adicionado span com truncate */}
                      <SelectValue placeholder="Selecione a empresa" />
                    </span>
                  </SelectTrigger>
                  <SelectContent>{empresasDisponiveis.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.razao_social}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gl_tipo">Tipo de Licença *</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData(p => ({...p, tipo: v}))} required>
                  <SelectTrigger id="gl_tipo"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Licença Prévia">Licença Prévia (LP)</SelectItem>
                    <SelectItem value="Licença de Instalação">Licença de Instalação (LI)</SelectItem>
                    <SelectItem value="Licença de Operação">Licença de Operação (LO)</SelectItem>
                    <SelectItem value="Licença de Operação - Renovação">LO - Renovação</SelectItem>
                    <SelectItem value="Licença Simplificada">Licença Simplificada (LS)</SelectItem>
                    <SelectItem value="Autorização Ambiental">Autorização Ambiental (AA)</SelectItem>
                    <SelectItem value="Termo de Compromisso Ambiental">Termo de Compromisso Ambiental (TCA)</SelectItem>
                    <SelectItem value="Outra">Outra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gl_numero">Número da Licença *</Label>
                <Input id="gl_numero" value={formData.numero} onChange={e => setFormData(p => ({...p, numero: e.target.value}))} placeholder="Ex: LO-001/2024" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gl_orgao">Órgão Emissor *</Label>
                <Input id="gl_orgao" value={formData.orgao_emissor} onChange={e => setFormData(p => ({...p, orgao_emissor: e.target.value}))} placeholder="Ex: IMA/AL" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gl_data_emissao">Data de Emissão *</Label>
                <Input id="gl_data_emissao" type="date" value={formData.data_emissao} onChange={e => setFormData(p => ({...p, data_emissao: e.target.value}))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gl_data_validade">Data de Validade *</Label>
                <Input id="gl_data_validade" type="date" value={formData.data_validade} onChange={e => setFormData(p => ({...p, data_validade: e.target.value}))} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gl_observacoes">Observações</Label>
              <Textarea id="gl_observacoes" value={formData.observacoes} onChange={e => setFormData(p => ({...p, observacoes: e.target.value}))} placeholder="Detalhes..." rows={3} />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingLicenca ? 'Atualizar Licença' : 'Cadastrar Licença'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-2">
        <div>
          <h3 className="text-xl font-semibold flex items-center">
            <FileText className="h-5 w-5 mr-2 text-primary" />
            Licenças Ambientais
          </h3>
          <p className="text-sm text-muted-foreground">
            Busque, visualize e gerencie as licenças.
          </p>
        </div>
        <div className="w-full sm:w-auto sm:max-w-xs">
            <Input
                type="text"
                placeholder="Buscar por nº, tipo, empresa..."
                value={termoBusca}
                onChange={e => setTermoBusca(e.target.value)}
                className="w-full"
            />
        </div>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <ListFilter className="h-4 w-4 mr-2" />
            {termoBusca ? `Resultados da Busca (${licencasFiltradas.length})` : `Licenças Cadastradas (${licencas.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            {licencasFiltradas.length === 0 ? (
                <div className="text-center py-10">
                    <Search className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="font-semibold">Nenhuma licença encontrada {termoBusca ? 'para "' + termoBusca + '"' : ''}.</p>
                    {!termoBusca && <p className="text-sm text-muted-foreground">Use o botão "+ Nova Licença" acima para adicionar.</p>}
                </div>
            ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {licencasFiltradas.map((licenca) => (
                    <div key={licenca.id} className="p-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center space-x-2">
                            {getStatusIcon(licenca.status, licenca.dias_para_vencimento)}
                            <h4 className="font-semibold text-gray-800 dark:text-gray-100">{licenca.tipo}</h4>
                            {getStatusBadge(licenca.status, licenca.dias_para_vencimento)}
                            </div>
                            <p className="text-xs text-muted-foreground"><strong>Empresa:</strong> {licenca.empresa_nome}</p>
                            <p className="text-xs text-muted-foreground"><strong>Número:</strong> {licenca.numero_licenca || licenca.numero} | <strong>Órgão:</strong> {licenca.orgao_emissor}</p>
                            <p className="text-xs text-muted-foreground">
                                <strong>Emissão:</strong> {licenca.data_emissao ? new Date(licenca.data_emissao + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'} |
                                <strong> Validade:</strong> {licenca.data_vencimento ? new Date(licenca.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}
                            </p>
                            {licenca.dias_para_vencimento >= 0 && !(licenca.status === 'vencida') &&(
                                <p className="text-xs text-muted-foreground"><strong>Vence em:</strong> {licenca.dias_para_vencimento} dias</p>
                            )}
                            {licenca.observacoes && <p className="text-xs text-gray-600 dark:text-gray-400 pt-1">{licenca.observacoes}</p>}
                        </div>
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                            <Button variant="outline" size="sm" onClick={() => handleVerCondicionantes(licenca.id)} className="w-full sm:w-auto">
                                <Eye className="h-3.5 w-3.5 mr-1.5" /> {licencaSelecionadaId === licenca.id ? "Ocultar" : "Ver"} Condicionantes ({todasAsCondicionantes?.filter(c => c.licenca_id === licenca.id).length || 0})
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEditLicenca(licenca)} className="w-full sm:w-auto"><Edit className="h-3.5 w-3.5" /></Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteLicenca(licenca.id)} className="w-full sm:w-auto text-red-600 hover:text-red-700 dark:border-red-600 dark:hover:bg-red-700/20"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                        </div>
                        {licencaSelecionadaId === licenca.id && (
                            <div className="mt-4 pl-4 border-l-2 border-blue-500 space-y-3">
                                <h5 className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                    Condicionantes Associadas à Licença {licenca.numero}:
                                </h5>
                                {condicionantesDaLicenca.length > 0 ? (
                                    condicionantesDaLicenca.map(cond => <CondicionanteCard key={cond.id} condicionante={cond} />)
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">Nenhuma condicionante associada a esta licença.</p>
                                )}
                            </div>
                        )}
                    </div>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
