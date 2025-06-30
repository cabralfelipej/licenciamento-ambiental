import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Calendar, RefreshCw, CheckCircle, AlertCircle, Clock, Settings } from 'lucide-react'

export function GoogleCalendarIntegration() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // Simula dados de status da sincronização
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Dados simulados para desenvolvimento
        const statusSimulado = {
          total_condicionantes: 28,
          sincronizadas: 15,
          nao_sincronizadas: 13,
          percentual_sincronizado: 53.6,
          ultimas_sincronizacoes: [
            {
              condicionante_id: 1,
              data_envio: '2025-06-18T00:00:00',
              event_id: 'sim_1_1734480000',
              mensagem: 'Evento criado para: Renovação da Licença de Operação...'
            },
            {
              condicionante_id: 2,
              data_envio: '2025-06-17T23:30:00',
              event_id: 'sim_2_1734478200',
              mensagem: 'Evento criado para: Apresentar ao IMA/AL o Relatório...'
            }
          ]
        }
        
        setStatus(statusSimulado)
        setLoading(false)
      } catch (error) {
        console.error('Erro ao carregar status:', error)
        setLoading(false)
      }
    }

    fetchStatus()
  }, [])

  const handleSyncAll = async () => {
    setSyncing(true)
    try {
      // Simula sincronização
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Atualiza status após sincronização
      setStatus(prev => ({
        ...prev,
        sincronizadas: prev.total_condicionantes,
        nao_sincronizadas: 0,
        percentual_sincronizado: 100
      }))
      
      console.log('Sincronização concluída')
    } catch (error) {
      console.error('Erro na sincronização:', error)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return <div>Carregando status do Google Calendar...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-600" />
            Integração Google Calendar
          </h3>
          <p className="text-sm text-muted-foreground">
            Sincronize prazos de condicionantes com sua agenda
          </p>
        </div>
        <Button 
          onClick={handleSyncAll} 
          disabled={syncing}
          className="flex items-center"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Tudo'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Condicionantes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.total_condicionantes}</div>
            <p className="text-xs text-muted-foreground">Com prazos definidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sincronizadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{status.sincronizadas}</div>
            <p className="text-xs text-muted-foreground">
              {status.percentual_sincronizado}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{status.nao_sincronizadas}</div>
            <p className="text-xs text-muted-foreground">Aguardando sincronização</p>
          </CardContent>
        </Card>
      </div>

      {status.nao_sincronizadas > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Existem {status.nao_sincronizadas} condicionantes que ainda não foram sincronizadas com o Google Calendar.
            Clique em "Sincronizar Tudo" para criar os eventos automaticamente.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Últimas Sincronizações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {status.ultimas_sincronizacoes.map((sync, index) => (
              <div key={index} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm font-medium">{sync.mensagem}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(sync.data_envio).toLocaleString('pt-BR')}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  ID: {sync.event_id.substring(0, 8)}...
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Configuração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Status:</span>
              <Badge variant="secondary">Modo Desenvolvimento</Badge>
            </div>
            <div className="flex justify-between">
              <span>Lembretes:</span>
              <span className="text-muted-foreground">7, 3 e 1 dia antes</span>
            </div>
            <div className="flex justify-between">
              <span>Fuso Horário:</span>
              <span className="text-muted-foreground">America/Maceio</span>
            </div>
          </div>
          <Alert className="mt-4">
            <AlertDescription className="text-xs">
              <strong>Modo Desenvolvimento:</strong> Os eventos estão sendo simulados. 
              Para produção, configure as credenciais OAuth2 do Google Calendar.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}

