import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from '@/components/ui/textarea.jsx'
import { AlertTriangle, Plus, Edit, Trash2, Calendar as CalendarIcon, CheckCircle, Clock, User, Paperclip, Upload, Loader2 } from 'lucide-react' // Adicionado Loader2
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner" // Adicionado toast
import { Skeleton } from "@/components/ui/skeleton" // Adicionado Skeleton

export function GestaoCondicionantes() {
  const [condicionantes, setCondicionantes] = useState([])
  const [licencas, setLicencas] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSavingCondicionante, setIsSavingCondicionante] = useState(false); // Para formulário principal e agora também para ações rápidas de cumprimento
  // const [isSavingCumprimento, setIsSavingCumprimento] = useState(false); // Removido - Usar isSavingCondicionante
  const [dialogOpen, setDialogOpen] = useState(false) // Para form nova/editar condicionante
  const [editingCondicionante, setEditingCondicionante] = useState(null)
  // const [cumprimentoDialogOpen, setCumprimentoDialogOpen] = useState(false) // Removido - não haverá mais diálogo de cumprimento
  // const [condicionanteParaCumprir, setCondicionanteParaCumprir] = useState(null) // Removido
  // const [cumprimentoFormData, setCumprimentoFormData] = useState({ // Removido
  // data_cumprimento: null,
  // data_envio_comprovante: null,
  // anexo_comprovante: null,
  // observacoes_cumprimento: ''
  // });
  const [formData, setFormData] = useState({
    licenca_id: '',
    descricao: '',
    prazo_dias: '',
    data_limite: '', // YYYY-MM-DD
    responsavel: '',
    observacoes: '',
  });
  const [isRenovacao, setIsRenovacao] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const fetchCondicionantesELicencas = async () => {
    setLoading(true);
    try {
      const [condicionantesRes, licencasRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/condicionantes`),
        fetch(`${API_BASE_URL}/api/licencas?flat=true`) // Supondo um param flat para estrutura simples
      ]);

      if (!condicionantesRes.ok) throw new Error(`Erro ao buscar condicionantes: ${condicionantesRes.status}`);
      if (!licencasRes.ok) throw new Error(`Erro ao buscar licenças: ${licencasRes.status}`);

      const condicionantesData = await condicionantesRes.json();
      const licencasData = await licencasRes.json();

      const hoje = new Date();
      const condicionantesComDias = condicionantesData.map(c => ({
        ...c,
        dias_restantes: c.data_limite ? Math.floor((new Date(c.data_limite) - hoje) / (1000 * 60 * 60 * 24)) : null,
        // Garante que o status seja 'cumprida' se data_envio_cumprimento existir, backend deve cuidar disso mas é uma segurança.
        status: c.data_envio_cumprimento ? 'cumprida' : c.status,
        cumprida: !!c.data_envio_cumprimento, // Ou baseado no status 'cumprida' vindo do backend
        licenca_numero: c.licenca?.numero_licenca || 'N/A', // Ajustar conforme estrutura da API
        empresa_nome: c.empresa?.razao_social || 'N/A' // Ajustar conforme estrutura da API
      }));

      setCondicionantes(condicionantesComDias);
      // Mapear licenças para o formato esperado pelo Select, incluindo empresa_nome
      setLicencas(licencasData.map(l => ({
        id: l.id,
        numero: l.numero_licenca,
        tipo: l.tipo_licenca,
        empresa_nome: l.empresa?.razao_social || 'Empresa Desconhecida',
        data_emissao: l.data_emissao, // Para cálculo do prazo normal
        data_vencimento: l.data_vencimento // Para cálculo da renovação
      })));

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      // Adicionar feedback de erro para o usuário
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCondicionantesELicencas();
  }, []); // Roda apenas uma vez ao montar o componente

  // useEffect para calcular data_limite automaticamente
  useEffect(() => {
    // Só executa se uma licença estiver selecionada
    if (!formData.licenca_id) {
      // Se nenhuma licença estiver selecionada, e não for edição, talvez limpar data_limite
      // No entanto, para edição, queremos manter a data_limite original até que algo mude.
      // Se não for edição e não houver licença, limpa data_limite.
      if (!editingCondicionante) {
         setFormData(prev => ({ ...prev, data_limite: '' }));
      }
      return;
    }

    const licencaSelecionada = licencas.find(l => l.id.toString() === formData.licenca_id);

    if (!licencaSelecionada) {
      if (!editingCondicionante) { // Se não for edição e a licença sumir (improvável), limpa
        setFormData(prev => ({ ...prev, data_limite: '' }));
      }
      return;
    }

    if (isRenovacao) {
      if (licencaSelecionada.data_vencimento) {
        try {
          const dataVencimento = new Date(licencaSelecionada.data_vencimento + "T00:00:00Z"); // Usar Z para UTC
          // Subtrair 120 dias
          dataVencimento.setDate(dataVencimento.getDate() - 120);
          setFormData(prev => ({
            ...prev,
            data_limite: format(dataVencimento, 'yyyy-MM-dd'),
            prazo_dias: '' // Limpa prazo_dias quando renovação é ativa
          }));
        } catch (error) {
          console.error("Erro ao calcular data limite para renovação:", error);
          setFormData(prev => ({ ...prev, data_limite: '' }));
        }
      } else {
        // Licença não tem data de vencimento, limpar data_limite
        setFormData(prev => ({ ...prev, data_limite: '' }));
      }
    } else if (formData.prazo_dias) { // Se não é renovação, mas tem prazo em dias
      if (licencaSelecionada.data_emissao) {
        try {
          const dataEmissao = new Date(licencaSelecionada.data_emissao + "T00:00:00Z"); // Usar Z para UTC
          const prazoDiasNum = parseInt(formData.prazo_dias);
          if (!isNaN(prazoDiasNum)) {
            // Adicionar prazoDiasNum à dataEmissao
            dataEmissao.setDate(dataEmissao.getDate() + prazoDiasNum);
            setFormData(prev => ({
              ...prev,
              data_limite: format(dataEmissao, 'yyyy-MM-dd')
            }));
          } else {
             setFormData(prev => ({ ...prev, data_limite: '' })); // Prazo inválido
          }
        } catch (error) {
          console.error("Erro ao calcular data limite com prazo:", error);
          setFormData(prev => ({ ...prev, data_limite: '' }));
        }
      } else {
        // Licença não tem data de emissão, limpar data_limite
        setFormData(prev => ({ ...prev, data_limite: '' }));
      }
    } else if (!formData.data_limite) {
        // Se não for renovação, nem tiver prazo, E data_limite também estiver vazia (ex: usuário limpou),
        // garante que o campo data_limite no estado seja vazio.
        // Isso cobre o caso de o usuário limpar o campo de data manualmente.
        // No entanto, se data_limite tiver um valor (digitado manualmente), ele é mantido.
        // A lógica de limpar prazo_dias quando data_limite é editada manualmente já está no onChange do Input.
    }
  }, [formData.licenca_id, formData.prazo_dias, isRenovacao, licencas, editingCondicionante]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSavingCondicionante(true);
    try {
      let payload = { ...formData };
      if (payload.prazo_dias) payload.prazo_dias = parseInt(payload.prazo_dias);
      if (!payload.data_limite) delete payload.data_limite; // Envia nulo se vazio
      if (!payload.prazo_dias) delete payload.prazo_dias; // Envia nulo se vazio

      const method = editingCondicionante ? 'PUT' : 'POST';
      const url = editingCondicionante
        ? `${API_BASE_URL}/api/condicionantes/${editingCondicionante.id}`
        : `${API_BASE_URL}/api/condicionantes`;

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erro || `HTTP error! status: ${response.status}`);
      }

      fetchCondicionantesELicencas();
      setDialogOpen(false);
      resetForm();
      toast.success(`Condicionante ${editingCondicionante ? 'atualizada' : 'cadastrada'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao salvar condicionante:', error);
      toast.error(`Erro ao salvar condicionante: ${error.message}`);
    } finally {
      setIsSavingCondicionante(false);
    }
  };

  const handleEdit = (condicionante) => {
    setFormData({
      licenca_id: condicionante.licenca_id.toString(),
      descricao: condicionante.descricao,
      prazo_dias: condicionante.prazo_dias?.toString() || '',
      data_limite: condicionante.data_limite || '',
      responsavel: condicionante.responsavel || '',
      observacoes: condicionante.observacoes || '',
    });
    setEditingCondicionante(condicionante);
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Tem certeza que deseja excluir esta condicionante?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/condicionantes/${id}`, { method: 'DELETE' });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.erro || `HTTP error! status: ${response.status}`);
        }
        fetchCondicionantesELicencas();
      } catch (error) {
        console.error('Erro ao excluir condicionante:', error);
        alert(`Erro ao excluir condicionante: ${error.message}`);
      }
    }
  };

  // const handleOpenCumprimentoDialog = (condicionante) => { // Removido
  //   setCondicionanteParaCumprir(condicionante);
  //   setCumprimentoFormData({
  //     data_cumprimento: condicionante.data_envio_cumprimento
  //       ? new Date(condicionante.data_envio_cumprimento + "T00:00:00")
  //       : new Date(),
  //     data_envio_comprovante: condicionante.data_envio_comprovante
  //       ? new Date(condicionante.data_envio_comprovante + "T00:00:00")
  //       : null,
  //     anexo_comprovante: null,
  //     observacoes_cumprimento: condicionante.observacoes_cumprimento || ''
  //   });
  //   setCumprimentoDialogOpen(true);
  // };

  // const handleSaveCumprimento = async () => { // Removido
  //   if (!condicionanteParaCumprir || !cumprimentoFormData.data_cumprimento) {
  //     alert("Data de cumprimento é obrigatória.");
  //     return;
  //   }
  //   setIsSavingCumprimento(true);
  //   const payload = new FormData();

  //   payload.append('data_envio_cumprimento', format(cumprimentoFormData.data_cumprimento, "yyyy-MM-dd"));

  //   if (cumprimentoFormData.observacoes_cumprimento) {
  //     payload.append('observacoes', cumprimentoFormData.observacoes_cumprimento);
  //   }
  //   if (cumprimentoFormData.anexo_comprovante instanceof File) {
  //     payload.append('comprovante', cumprimentoFormData.anexo_comprovante);
  //   }

  //   try {
  //     const response = await fetch(`${API_BASE_URL}/api/condicionantes/${condicionanteParaCumprir.id}/marcar-cumprida`, {
  //       method: 'POST',
  //       body: payload,
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.erro || `HTTP error! status: ${response.status}`);
  //     }

  //     fetchCondicionantesELicencas();
  //     setCumprimentoDialogOpen(false);
  //     resetCumprimentoForm();
  //     toast.success("Cumprimento da condicionante salvo com sucesso!");
  //   } catch (error) {
  //     console.error('Erro ao salvar cumprimento:', error);
  //     toast.error(`Erro ao salvar cumprimento: ${error.message}`);
  //   } finally {
  //     setIsSavingCumprimento(false);
  //   }
  // };

  const resetForm = () => {
    setFormData({ licenca_id: '', descricao: '', prazo_dias: '', data_limite: '', responsavel: '', observacoes: '' });
    setEditingCondicionante(null);
  };

  // const resetCumprimentoForm = () => { // Removido
  //   setCondicionanteParaCumprir(null);
  //   setCumprimentoFormData({ data_cumprimento: null, data_envio_comprovante: null, anexo_comprovante: null, observacoes_cumprimento: '' });
  // };

  const handleMarcarCumprida = async (condicionanteId) => {
    setIsSavingCondicionante(true); // Reutilizar este estado para indicar carregamento
    try {
      const response = await fetch(`${API_BASE_URL}/api/condicionantes/${condicionanteId}/marcar-cumprida-rapido`, { // Novo endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Não precisa de body se a data for definida no backend
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erro || `HTTP error! status: ${response.status}`);
      }
      fetchCondicionantesELicencas(); // Re-fetch para atualizar a lista
      toast.success("Condicionante marcada como cumprida!");
    } catch (error) {
      console.error('Erro ao marcar condicionante como cumprida:', error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsSavingCondicionante(false);
    }
  };

  const handleMarcarPendente = async (condicionanteId) => {
    if (!confirm('Tem certeza que deseja marcar esta condicionante como pendente?')) {
      return;
    }
    setIsSavingCondicionante(true); // Reutilizar este estado para indicar carregamento
    try {
      const response = await fetch(`${API_BASE_URL}/api/condicionantes/${condicionanteId}/marcar-pendente`, { // Novo endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erro || `HTTP error! status: ${response.status}`);
      }
      fetchCondicionantesELicencas(); // Re-fetch para atualizar a lista
      toast.success("Condicionante marcada como pendente!");
    } catch (error) {
      console.error('Erro ao marcar condicionante como pendente:', error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsSavingCondicionante(false);
    }
  };

  const getStatusBadge = (status, diasRestantes, cumprida) => {
    // A lógica de 'cumprida' agora vem diretamente do estado da condicionante (c.status === 'cumprida' ou c.cumprida)
    if (cumprida) return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-700/30 dark:text-green-300">Cumprida</Badge>;
    if (status === 'vencida' || (!cumprida && diasRestantes < 0) ) return <Badge variant="destructive">Vencida</Badge>;
    if (diasRestantes <= 7) return <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-700/30 dark:text-red-300">Urgente</Badge>;
    if (diasRestantes <= 30) return <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-700/30 dark:text-orange-300">Próximo</Badge>;
    return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-700/30 dark:text-blue-300">Pendente</Badge>;
  };

  const getStatusIcon = (status, diasRestantes, cumprida) => {
    if (cumprida) return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
    if (status === 'vencida' || (!cumprida && diasRestantes < 0)) return <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />;
    if (diasRestantes <= 7 && !cumprida) return <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />;
    if (diasRestantes <= 30 && !cumprida) return <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
    if (!cumprida) return <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    return <CalendarIcon className="h-4 w-4 text-muted-foreground" />;
  };

  const filteredCondicionantes = condicionantes
    .map(c => ({
        ...c,
        dias_restantes: c.data_limite ? Math.floor((new Date(c.data_limite) - new Date()) / (1000 * 60 * 60 * 24)) : Infinity,
    }))
    .sort((a, b) => {
        const getUrgencia = (cond) => {
        if (cond.cumprida) return 5;
        if (cond.dias_restantes < 0) return 1;
        if (cond.dias_restantes <= 7) return 2;
        if (cond.dias_restantes <= 30) return 3;
        return 4;
        };
        return getUrgencia(a) - getUrgencia(b);
  });

  const CondicionanteCardSkeleton = () => (
    <div className="p-4 space-y-2 border rounded-lg">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="flex justify-end space-x-2 pt-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  );

  // if (loading && condicionantes.length === 0) {
  //   // Tela de carregamento inicial para toda a seção de condicionantes
  //   return (
  //    <div className="space-y-6">
  //      <div className="flex justify-between items-center mb-6">
  //        <div>
  //          <h3 className="text-2xl font-bold flex items-center"><AlertTriangle className="h-6 w-6 mr-2 text-orange-500" />Gestão de Condicionantes</h3>
  //          <p className="text-base text-muted-foreground">Acompanhe e gerencie todas as condicionantes ambientais.</p>
  //        </div>
  //        <Button disabled> {/* Botão desabilitado durante o loading inicial */}
  //          <Plus className="h-4 w-4 mr-2" />
  //          Nova Condicionante
  //        </Button>
  //      </div>
  //      <Card className="shadow-lg">
  //        <CardHeader className="bg-gray-50 dark:bg-gray-800 rounded-t-lg">
  //           <Skeleton className="h-6 w-1/2" />
  //         </CardHeader>
  //         <CardContent className="p-0">
  //           <div className="divide-y divide-gray-200 dark:divide-gray-700">
  //             <CondicionanteCardSkeleton />
  //             <CondicionanteCardSkeleton />
  //             <CondicionanteCardSkeleton />
  //           </div>
  //         </CardContent>
  //       </Card>
  //     </div>
  if (loading && condicionantes.length === 0) {
    // Tela de carregamento inicial para toda a seção de condicionantes
    return (
     <div className="space-y-6">
       <div className="flex justify-between items-center mb-6">
         <div>
           <h3 className="text-2xl font-bold flex items-center"><AlertTriangle className="h-6 w-6 mr-2 text-orange-500" />Gestão de Condicionantes</h3>
           <p className="text-base text-muted-foreground">Acompanhe e gerencie todas as condicionantes ambientais.</p>
         </div>
         <Button disabled> {/* Botão desabilitado durante o loading inicial */}
           <Plus className="h-4 w-4 mr-2" />
           Nova Condicionante
         </Button>
       </div>
       <Card className="shadow-lg">
         <CardHeader className="bg-gray-50 dark:bg-gray-800 rounded-t-lg">
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <CondicionanteCardSkeleton />
              <CondicionanteCardSkeleton />
              <CondicionanteCardSkeleton />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Dialog open={dialogOpen} onOpenChange={(isOpen) => {
        if (!isSavingCondicionante) setDialogOpen(isOpen);
        if (!isOpen) {
          resetForm();
          setIsRenovacao(false);
        }
      }}>
        {/* O DialogTrigger foi movido para fora do DialogContent mas continua dentro do Dialog */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold flex items-center"><AlertTriangle className="h-6 w-6 mr-2 text-orange-500" />Gestão de Condicionantes</h3>
            <p className="text-base text-muted-foreground">Acompanhe e gerencie todas as condicionantes ambientais.</p>
          </div>
          <DialogTrigger asChild>
            <Button onClick={() => {
              resetForm();
              setIsRenovacao(false);
              setDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Condicionante
            </Button>
          </DialogTrigger>
        </div>

        <DialogContent className="max-w-2xl overflow-y-auto"> {/* Mantendo max-w-2xl para consistência */}
          <DialogHeader>
            <DialogTitle>{editingCondicionante ? 'Editar Condicionante' : 'Nova Condicionante'}</DialogTitle>
            <DialogDescription>Preencha os dados da condicionante da licença.</DialogDescription>
          </DialogHeader>
          <div className="w-full"> {/* Wrapper adicionado */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-4 w-full"> {/* w-full adicionado ao form */}
              {/* Campos do formulário */}
              <div className="space-y-2 min-w-0">
                <Label htmlFor="cond_licenca_id">Licença *</Label>
              <Select value={formData.licenca_id} onValueChange={(v) => setFormData(p => ({ ...p, licenca_id: v }))} required>
                <SelectTrigger id="cond_licenca_id" className="w-full overflow-hidden truncate">
                  {/* Simplificado para aplicar truncate diretamente no trigger.
                      Pode ser necessário ajustar se o ícone do select for sobreposto. */}
                  <SelectValue placeholder="Selecione a licença" />
                </SelectTrigger>
                <SelectContent>
                  {licencas.map(l => (
                    <SelectItem key={l.id} value={l.id.toString()}>
                      <span className="block truncate">{l.numero} - {l.tipo} ({l.empresa_nome})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cond_descricao">Descrição da Condicionante *</Label>
              <Textarea id="cond_descricao" value={formData.descricao} onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))} placeholder="Descreva a condicionante..." rows={3} required className="w-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="space-y-2">
                <Label htmlFor="cond_prazo_dias">Prazo em Dias</Label>
                <Select
                  value={isRenovacao ? '' : formData.prazo_dias}
                  onValueChange={(value) => {
                    if (!isRenovacao) {
                      setFormData(prev => ({ ...prev, prazo_dias: value, data_limite: '' }));
                    }
                  }}
                  disabled={isRenovacao}
                >
                  <SelectTrigger id="cond_prazo_dias" className="w-full">
                    <SelectValue placeholder="Selecione um prazo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                    <SelectItem value="120">120 dias</SelectItem>
                    <SelectItem value="180">180 dias</SelectItem>
                    <SelectItem value="360">360 dias</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Preencha OU a data limite OU marque renovação.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cond_data_limite">Data Limite</Label>
                <Input
                  id="cond_data_limite"
                  type="date"
                  value={formData.data_limite}
                  onChange={e => {
                    if (!isRenovacao) {
                      setFormData(p => ({ ...p, data_limite: e.target.value, prazo_dias: '' }))
                    }
                  }}
                  disabled={isRenovacao}
                />
                 <p className="text-xs text-muted-foreground">Preenchido automaticamente ou manualmente.</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="cond_renovacao"
                checked={isRenovacao}
                onCheckedChange={(checked) => {
                  setIsRenovacao(checked);
                  if (checked) {
                    setFormData(prev => ({ ...prev, prazo_dias: '' }));
                  }
                }}
              />
              <Label htmlFor="cond_renovacao" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Calcular para Renovação (120 dias antes do vencimento da licença)
              </Label>
            </div>
            <div className="space-y-2 pt-2">
              <Label htmlFor="cond_responsavel">Responsável</Label>
              <Input id="cond_responsavel" value={formData.responsavel} onChange={e => setFormData(p => ({ ...p, responsavel: e.target.value }))} placeholder="Ex: Depto. Ambiental" className="w-full" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cond_observacoes">Observações</Label>
              <Textarea id="cond_observacoes" value={formData.observacoes} onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))} placeholder="Notas adicionais..." rows={2} className="w-full" />
            </div>
            {/* Botões do formulário */}
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); setIsRenovacao(false); }} disabled={isSavingCondicionante}>Cancelar</Button>
              <Button type="submit" disabled={isSavingCondicionante}>
                {isSavingCondicionante && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingCondicionante ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </div> {/* Fechamento do Wrapper adicionado */}
        </DialogContent>
      </Dialog>

      {/* Dialog para Registrar Cumprimento */}
      <Dialog open={cumprimentoDialogOpen} onOpenChange={(isOpen) => {
        if (!isSavingCumprimento) setCumprimentoDialogOpen(isOpen);
        if (!isOpen) {
          resetCumprimentoForm();
        }
      }}>
        <DialogContent className="max-w-lg"> {/* Reduzido para max-w-lg para melhor layout */}
          <DialogHeader>
            <DialogTitle>Registrar Cumprimento da Condicionante #{condicionanteParaCumprir?.id}</DialogTitle>
            {condicionanteParaCumprir && <DialogDescription className="pt-1 text-sm text-muted-foreground truncate">{condicionanteParaCumprir.descricao}</DialogDescription>}
          </DialogHeader>
          <div className="w-full"> {/* Wrapper adicionado */}
            <form onSubmit={(e) => { e.preventDefault(); handleSaveCumprimento(); }} className="space-y-4 pt-4 w-full"> {/* w-full adicionado ao form */}
              <div className="space-y-2">
                <Label htmlFor="data_cumprimento">Data de Cumprimento *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="justify-start text-left font-normal max-w-64"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {cumprimentoFormData.data_cumprimento ? format(cumprimentoFormData.data_cumprimento, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={cumprimentoFormData.data_cumprimento}
                    onSelect={(date) => setCumprimentoFormData(prev => ({ ...prev, data_cumprimento: date }))}
                    initialFocus
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="anexo_comprovante">Anexo Comprovante</Label>
              <Input
                id="anexo_comprovante"
                type="file"
                onChange={(e) => setCumprimentoFormData(prev => ({ ...prev, anexo_comprovante: e.target.files ? e.target.files[0] : null }))}
                className="max-w-md"
              />
              {/* Preview do nome do arquivo existente, se houver e for string (path) */}
              {condicionanteParaCumprir?.anexo_comprovante && typeof condicionanteParaCumprir.anexo_comprovante === 'string' && !cumprimentoFormData.anexo_comprovante && (
                <p className="text-xs text-muted-foreground">
                  Anexo atual: <a href={`${API_BASE_URL}/uploads/${condicionanteParaCumprir.anexo_comprovante}`} target="_blank" rel="noopener noreferrer" className="underline">{condicionanteParaCumprir.anexo_comprovante.split('/').pop()}</a>
                  <br/>(Selecionar um novo arquivo irá substituí-lo)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes_cumprimento">Observações do Cumprimento</Label>
              <Textarea
                id="observacoes_cumprimento"
                value={cumprimentoFormData.observacoes_cumprimento}
                onChange={(e) => setCumprimentoFormData(prev => ({ ...prev, observacoes_cumprimento: e.target.value }))}
                placeholder="Descreva as ações tomadas para o cumprimento..."
                rows={3}
                className="max-w-md"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setCumprimentoDialogOpen(false); resetCumprimentoForm(); }} disabled={isSavingCumprimento}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!cumprimentoFormData.data_cumprimento || isSavingCumprimento}>
                {isSavingCumprimento && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Cumprimento
              </Button>
            </div>
          </form>
        </div> {/* Fechamento do Wrapper adicionado */}
        </DialogContent>
      </Dialog>

      {/* Card e lista de condicionantes - FORA DO DIALOG DO FORMULÁRIO */}
      {(!loading || condicionantes.length > 0) && (
        <Card className="shadow-lg">
        <CardHeader className="bg-gray-50 dark:bg-gray-800 rounded-t-lg">
          <CardTitle className="text-lg flex items-center"><CalendarIcon className="h-5 w-5 mr-3 text-primary" />Condicionantes Cadastradas ({filteredCondicionantes.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredCondicionantes.length === 0 ? (
            <div className="text-center py-12"><AlertTriangle className="h-16 w-16 mx-auto text-gray-400 mb-4" /><p className="text-xl font-semibold text-gray-600 dark:text-gray-300">Nenhuma condicionante encontrada.</p><p className="text-muted-foreground mt-1">Crie uma nova condicionante para começar.</p><Button onClick={() => { resetForm(); setDialogOpen(true);}} className="mt-6"><Plus className="h-4 w-4 mr-2" />Cadastrar Primeira Condicionante</Button></div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCondicionantes.map((c) => (
                <div key={c.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center space-x-3 mb-1">
                        {getStatusIcon(c.status, c.dias_restantes, c.cumprida)}
                        <h4 className="font-semibold text-base text-gray-800 dark:text-gray-100">Condicionante #{c.id}</h4>
                        {getStatusBadge(c.status, c.dias_restantes, c.cumprida)}
                      </div>
                      <p className="text-sm text-muted-foreground"><strong>Licença:</strong> {c.licenca_numero} ({c.empresa_nome})</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{c.descricao}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                        <div><strong>Data Limite:</strong> {new Date(c.data_limite).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                        {!c.cumprida && c.dias_restantes >= 0 && (<div><strong>Dias Restantes:</strong> {c.dias_restantes}</div>)}
                        {!c.cumprida && c.dias_restantes < 0 && (<div className="text-red-600 font-medium"><strong>Vencida há:</strong> {Math.abs(c.dias_restantes)} dias</div>)}
                        {c.responsavel && (<div className="col-span-full sm:col-span-1"><User className="h-3 w-3 inline mr-1.5" /><strong>Responsável:</strong> {c.responsavel}</div>)}
                      </div>
                      {c.observacoes && (<p className="text-xs text-gray-500 dark:text-gray-400 pt-1 italic"><strong>Obs.:</strong> {c.observacoes}</p>)}
                      {c.cumprida && c.data_envio_cumprimento && ( // Adicionado c.data_envio_cumprimento para garantir que a data exista
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-md border border-green-200 dark:border-green-700 text-xs space-y-1">
                          <p className="font-semibold text-green-700 dark:text-green-300">Cumprida em:</p>
                          <p><strong>Data:</strong> {new Date(c.data_envio_cumprimento + "T00:00:00Z").toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p> {/* Adicionado T00:00:00Z e UTC para consistência */}
                          {/* Campos de anexo e observações de cumprimento foram removidos conforme solicitado */}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col space-y-2 md:w-auto w-full pt-2 md:pt-0">
                      {!c.cumprida ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarcarCumprida(c.id)}
                          className="text-green-600 hover:text-green-700 border-green-300 hover:bg-green-50 dark:border-green-600 dark:hover:bg-green-700/20 w-full"
                          disabled={isSavingCondicionante} // Usar isSavingCondicionante
                        >
                          {isSavingCondicionante ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                          Marcar como Cumprida
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarcarPendente(c.id)}
                          className="text-orange-600 hover:text-orange-700 border-orange-300 hover:bg-orange-50 dark:border-orange-600 dark:hover:bg-orange-700/20 w-full"
                          disabled={isSavingCondicionante} // Usar isSavingCondicionante
                        >
                          {isSavingCondicionante ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="h-3.5 w-3.5 mr-2" />}
                          Marcar como Pendente
                        </Button>
                      )}
                      <div className="flex space-x-2 w-full">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(c)} className="flex-1" disabled={c.cumprida /* Manter desabilitado se cumprida, pois a edição simplificada é via 'Marcar Pendente' */}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(c.id)} className="flex-1 text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50 dark:border-red-600 dark:hover:bg-red-700/20"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )}
    </div>
  );
}
