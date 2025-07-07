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
  const [isSavingCondicionante, setIsSavingCondicionante] = useState(false); // Para formulário principal
  const [isSavingCumprimento, setIsSavingCumprimento] = useState(false); // Para formulário de cumprimento
  const [dialogOpen, setDialogOpen] = useState(false) // Para form nova/editar condicionante
  const [editingCondicionante, setEditingCondicionante] = useState(null)
  const [cumprimentoDialogOpen, setCumprimentoDialogOpen] = useState(false)
  const [condicionanteParaCumprir, setCondicionanteParaCumprir] = useState(null)
  const [cumprimentoFormData, setCumprimentoFormData] = useState({
    data_cumprimento: null, // Será new Date() no handleOpen
    data_envio_comprovante: null,
    anexo_comprovante: null, // Será File object ou null
    observacoes_cumprimento: ''
  });
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

  const handleOpenCumprimentoDialog = (condicionante) => {
    setCondicionanteParaCumprir(condicionante);
    setCumprimentoFormData({
      data_cumprimento: condicionante.data_envio_cumprimento // Backend usa data_envio_cumprimento como data de cumprimento efetivo
        ? new Date(condicionante.data_envio_cumprimento + "T00:00:00") // Adiciona T00:00:00 para evitar problemas de fuso ao converter para Date
        : new Date(),
      data_envio_comprovante: condicionante.data_envio_comprovante // Se já tiver, usa. Backend pode usar este campo.
        ? new Date(condicionante.data_envio_comprovante + "T00:00:00")
        : null,
      anexo_comprovante: null, // Sempre reseta o anexo para um novo upload ou nenhum
      observacoes_cumprimento: condicionante.observacoes_cumprimento || ''
    });
    setCumprimentoDialogOpen(true);
  };

  const handleSaveCumprimento = async () => {
    if (!condicionanteParaCumprir || !cumprimentoFormData.data_cumprimento) {
      alert("Data de cumprimento é obrigatória.");
      return;
    }
    setIsSavingCumprimento(true);
    const payload = new FormData(); // Usar FormData para enviar arquivos

    // Formata a data_envio_cumprimento para YYYY-MM-DD, que será a data do cumprimento
    payload.append('data_envio_cumprimento', format(cumprimentoFormData.data_cumprimento, "yyyy-MM-dd"));

    if (cumprimentoFormData.observacoes_cumprimento) {
      payload.append('observacoes', cumprimentoFormData.observacoes_cumprimento);
    }
    if (cumprimentoFormData.anexo_comprovante instanceof File) {
      payload.append('comprovante', cumprimentoFormData.anexo_comprovante);
    }

    // Não precisamos enviar data_cumprimento separadamente se o backend usa data_envio_cumprimento

    try {
      const response = await fetch(`${API_BASE_URL}/api/condicionantes/${condicionanteParaCumprir.id}/marcar-cumprida`, {
        method: 'POST',
        body: payload, // Não definir Content-Type, o navegador fará isso automaticamente para FormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erro || `HTTP error! status: ${response.status}`);
      }

      fetchCondicionantesELicencas();
      setCumprimentoDialogOpen(false);
      resetCumprimentoForm();
      toast.success("Cumprimento da condicionante salvo com sucesso!");
    } catch (error) {
      console.error('Erro ao salvar cumprimento:', error);
      toast.error(`Erro ao salvar cumprimento: ${error.message}`);
    } finally {
      setIsSavingCumprimento(false);
    }
  };

  const resetForm = () => {
    setFormData({ licenca_id: '', descricao: '', prazo_dias: '', data_limite: '', responsavel: '', observacoes: '' });
    setEditingCondicionante(null);
  };

  const resetCumprimentoForm = () => {
    setCondicionanteParaCumprir(null);
    setCumprimentoFormData({ data_cumprimento: null, data_envio_comprovante: null, anexo_comprovante: null, observacoes_cumprimento: '' });
  };

  const getStatusBadge = (status, diasRestantes, cumprida) => {
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
  //   );
  // }

  return (
    <div>Conteúdo Simples Para Teste de Build</div>
  );
}
