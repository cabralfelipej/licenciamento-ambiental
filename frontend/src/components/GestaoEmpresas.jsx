import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx'
import { Plus, Edit, Trash2, Building2 } from 'lucide-react'

// Componente para formulário de empresa
function FormularioEmpresa({ empresa, onSave, onCancel }) {
  const initialFormData = {
    razao_social: empresa?.razao_social || '',
    cnpj: empresa?.cnpj || '',
    // telefone: empresa?.telefone || '', // Removido
    email: empresa?.email || '',
    endereco: empresa?.endereco || ''
  };
  const [formData, setFormData] = useState(initialFormData);
  const [cnpjError, setCnpjError] = useState('')

  const formatCnpj = (value) => {
    const cleanedValue = value.replace(/\D/g, '').substring(0, 14); // Pega no máximo 14 dígitos
    let formattedValue = '';

    for (let i = 0; i < cleanedValue.length; i++) {
      formattedValue += cleanedValue[i];
      if (i === 1 && cleanedValue.length > 2) formattedValue += '.';
      else if (i === 4 && cleanedValue.length > 5) formattedValue += '.';
      else if (i === 7 && cleanedValue.length > 8) formattedValue += '/';
      else if (i === 11 && cleanedValue.length > 12) formattedValue += '-';
    }
    return formattedValue;
  };

  const validateCnpj = (cnpj) => {
    const cleanedValue = cnpj.replace(/\D/g, '')
    if (cleanedValue.length > 0 && cleanedValue.length < 14) {
      return 'CNPJ incompleto.'
    }
    // Adicionar aqui validações mais robustas de CNPJ se necessário (ex: algoritmo de validação)
    // Por enquanto, apenas verificamos o comprimento.
    if (cleanedValue.length === 14) {
        // Validação básica de formato (não verifica dígitos verificadores, apenas estrutura)
        // Esta é uma validação simples de exemplo. Uma validação completa de CNPJ é mais complexa.
        const cnpjPattern = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
        if (!cnpjPattern.test(formatCnpj(cleanedValue))) {
            // Se formatado não bate com o padrão, mas tem 14 dígitos limpos, é erro de formatação manual.
            // A formatação automática deve prevenir isso, mas é uma checagem extra.
        }
    }
    return ''
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const cnpjValidationError = validateCnpj(formData.cnpj)
    if (cnpjValidationError) {
      setCnpjError(cnpjValidationError)
      return
    }
    setCnpjError('')
    onSave(formData)
  }

  const handleChange = (field, value) => {
    let processedValue = value
    if (field === 'cnpj') {
      const formatted = formatCnpj(value)
      processedValue = formatted
      const validationError = validateCnpj(formatted)
      setCnpjError(validationError)
    }
    setFormData(prev => ({ ...prev, [field]: processedValue }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="razao_social">Razão Social *</Label>
          <Input
            id="razao_social"
            value={formData.razao_social}
            onChange={(e) => handleChange('razao_social', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ *</Label>
          <Input
            id="cnpj"
            value={formData.cnpj}
            onChange={(e) => handleChange('cnpj', e.target.value)}
            placeholder="00.000.000/0000-00"
            maxLength={18}
            required
          />
          {cnpjError && <p className="text-sm text-red-500 mt-1">{cnpjError}</p>}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Campo Telefone Removido */}
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="empresa@exemplo.com"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="endereco">Endereço</Label>
        <Textarea
          id="endereco"
          value={formData.endereco}
          onChange={(e) => handleChange('endereco', e.target.value)}
          placeholder="Endereço completo da empresa"
          rows={3}
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {empresa ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  )
}

// Componente principal de gestão de empresas
// Helper function para formatar CNPJ (pode ser movida para um arquivo de utils se usada em mais lugares)
const formatCnpjDisplay = (value) => {
  if (!value) return '';
  const cleanedValue = String(value).replace(/\D/g, '').substring(0, 14);
  let formattedValue = '';
  for (let i = 0; i < cleanedValue.length; i++) {
    formattedValue += cleanedValue[i];
    if (i === 1 && cleanedValue.length > 2) formattedValue += '.';
    else if (i === 4 && cleanedValue.length > 5) formattedValue += '.';
    else if (i === 7 && cleanedValue.length > 8) formattedValue += '/';
    else if (i === 11 && cleanedValue.length > 12) formattedValue += '-';
  }
  return formattedValue;
};

export function GestaoEmpresas({ onEmpresaAtualizada }) { // Adicionada prop onEmpresaAtualizada
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [empresaEditando, setEmpresaEditando] = useState(null)

  // Hook para buscar empresas da API
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  const fetchEmpresas = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/empresas`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setEmpresas(data);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      // Poderia adicionar um estado para exibir erro na UI
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const handleSaveEmpresa = async (formData) => {
    try {
      const method = empresaEditando ? 'PUT' : 'POST';
      const url = empresaEditando
        ? `${API_BASE_URL}/api/empresas/${empresaEditando.id}`
        : `${API_BASE_URL}/api/empresas`;

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erro || `HTTP error! status: ${response.status}`);
      }

      // const savedEmpresa = await response.json(); // Descomentar se precisar do objeto retornado

      fetchEmpresas(); // Re-busca as empresas para atualizar a lista
      if (onEmpresaAtualizada) {
        onEmpresaAtualizada(); // Chama o callback para App.jsx atualizar sua lista de empresas
      }
      setDialogOpen(false);
      setEmpresaEditando(null);
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
      alert(`Erro ao salvar empresa: ${error.message}`); // Exibe erro para o usuário
    }
  };

  const handleEditEmpresa = (empresa) => {
    setEmpresaEditando(empresa);
    setDialogOpen(true);
  };

  const handleDeleteEmpresa = async (empresaId) => {
    if (confirm('Tem certeza que deseja excluir esta empresa? Essa ação não pode ser desfeita.')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/empresas/${empresaId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.erro || `HTTP error! status: ${response.status}`);
        }

        // alert((await response.json()).mensagem); // Exibe mensagem de sucesso
        fetchEmpresas(); // Re-busca as empresas para atualizar a lista
      } catch (error) {
        console.error('Erro ao excluir empresa:', error);
        alert(`Erro ao excluir empresa: ${error.message}`);
      }
    }
  };

  const handleNovaEmpresa = () => {
    setEmpresaEditando(null)
    setDialogOpen(true)
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando empresas...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Empresas</h2>
          <p className="text-muted-foreground">Cadastro e gerenciamento de empresas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNovaEmpresa}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {empresaEditando ? 'Editar Empresa' : 'Nova Empresa'}
              </DialogTitle>
              <DialogDescription>
                {empresaEditando 
                  ? 'Atualize as informações da empresa' 
                  : 'Preencha os dados para cadastrar uma nova empresa'
                }
              </DialogDescription>
            </DialogHeader>
            <FormularioEmpresa
              empresa={empresaEditando}
              onSave={handleSaveEmpresa}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Empresas Cadastradas ({empresas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {empresas.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma empresa cadastrada</p>
              <Button onClick={handleNovaEmpresa} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Primeira Empresa
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>CNPJ</TableHead>
                  {/* <TableHead>Telefone</TableHead> Removido */}
                  <TableHead>E-mail</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empresas.map((empresa) => (
                  <TableRow key={empresa.id}>
                    <TableCell className="font-medium">{empresa.razao_social}</TableCell>
                    <TableCell>{formatCnpjDisplay(empresa.cnpj)}</TableCell>
                    {/* <TableCell>{empresa.telefone}</TableCell> Removido */}
                    <TableCell>{empresa.email}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditEmpresa(empresa)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteEmpresa(empresa.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

