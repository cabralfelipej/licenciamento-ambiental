import os
import json
from datetime import datetime, timedelta
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Escopos necessários para o Google Calendar
SCOPES = ['https://www.googleapis.com/auth/calendar']

class GoogleCalendarService:
    def __init__(self, credentials_file='credentials.json', token_file='token.json'):
        """
        Inicializa o serviço do Google Calendar
        
        Args:
            credentials_file: Arquivo de credenciais do Google (baixado do Console)
            token_file: Arquivo para armazenar o token de acesso
        """
        self.credentials_file = credentials_file
        self.token_file = token_file
        self.service = None
        self.creds = None
        
    def authenticate(self):
        """
        Realiza a autenticação com o Google Calendar API
        """
        creds = None
        
        # Verifica se já existe um token salvo
        if os.path.exists(self.token_file):
            creds = Credentials.from_authorized_user_file(self.token_file, SCOPES)
        
        # Se não há credenciais válidas disponíveis, solicita login
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                # Para desenvolvimento, vamos simular a autenticação
                # Em produção, seria necessário configurar OAuth2 adequadamente
                print("Autenticação simulada - Em produção seria necessário configurar OAuth2")
                return False
        
        self.creds = creds
        self.service = build('calendar', 'v3', credentials=creds)
        return True
    
    def create_event(self, summary, description, start_datetime, end_datetime, 
                    attendees=None, reminders=None):
        """
        Cria um evento no Google Calendar
        
        Args:
            summary: Título do evento
            description: Descrição do evento
            start_datetime: Data/hora de início (datetime object)
            end_datetime: Data/hora de fim (datetime object)
            attendees: Lista de emails dos participantes
            reminders: Lista de lembretes em minutos
            
        Returns:
            dict: Dados do evento criado ou None se erro
        """
        if not self.service:
            if not self.authenticate():
                return None
        
        try:
            # Configura lembretes padrão se não fornecidos
            if reminders is None:
                reminders = [
                    {'method': 'email', 'minutes': 24 * 60 * 7},  # 7 dias antes
                    {'method': 'email', 'minutes': 24 * 60 * 3},  # 3 dias antes
                    {'method': 'email', 'minutes': 24 * 60},      # 1 dia antes
                ]
            
            # Monta a estrutura do evento
            event = {
                'summary': summary,
                'description': description,
                'start': {
                    'dateTime': start_datetime.isoformat(),
                    'timeZone': 'America/Maceio',
                },
                'end': {
                    'dateTime': end_datetime.isoformat(),
                    'timeZone': 'America/Maceio',
                },
                'reminders': {
                    'useDefault': False,
                    'overrides': reminders,
                },
            }
            
            # Adiciona participantes se fornecidos
            if attendees:
                event['attendees'] = [{'email': email} for email in attendees]
            
            # Cria o evento
            event_result = self.service.events().insert(
                calendarId='primary',
                body=event
            ).execute()
            
            return event_result
            
        except HttpError as error:
            print(f'Erro ao criar evento: {error}')
            return None
    
    def update_event(self, event_id, summary=None, description=None, 
                    start_datetime=None, end_datetime=None):
        """
        Atualiza um evento existente
        
        Args:
            event_id: ID do evento no Google Calendar
            summary: Novo título (opcional)
            description: Nova descrição (opcional)
            start_datetime: Nova data/hora de início (opcional)
            end_datetime: Nova data/hora de fim (opcional)
            
        Returns:
            dict: Dados do evento atualizado ou None se erro
        """
        if not self.service:
            if not self.authenticate():
                return None
        
        try:
            # Busca o evento atual
            event = self.service.events().get(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            # Atualiza os campos fornecidos
            if summary:
                event['summary'] = summary
            if description:
                event['description'] = description
            if start_datetime:
                event['start'] = {
                    'dateTime': start_datetime.isoformat(),
                    'timeZone': 'America/Maceio',
                }
            if end_datetime:
                event['end'] = {
                    'dateTime': end_datetime.isoformat(),
                    'timeZone': 'America/Maceio',
                }
            
            # Atualiza o evento
            updated_event = self.service.events().update(
                calendarId='primary',
                eventId=event_id,
                body=event
            ).execute()
            
            return updated_event
            
        except HttpError as error:
            print(f'Erro ao atualizar evento: {error}')
            return None
    
    def delete_event(self, event_id):
        """
        Deleta um evento do Google Calendar
        
        Args:
            event_id: ID do evento no Google Calendar
            
        Returns:
            bool: True se sucesso, False se erro
        """
        if not self.service:
            if not self.authenticate():
                return False
        
        try:
            self.service.events().delete(
                calendarId='primary',
                eventId=event_id
            ).execute()
            return True
            
        except HttpError as error:
            print(f'Erro ao deletar evento: {error}')
            return False
    
    def create_condicionante_event(self, condicionante, empresa_nome):
        """
        Cria um evento específico para uma condicionante
        
        Args:
            condicionante: Objeto condicionante com dados
            empresa_nome: Nome da empresa
            
        Returns:
            dict: Dados do evento criado ou None se erro
        """
        if not condicionante.data_limite:
            return None
        
        # Define data/hora do evento (meio-dia da data limite)
        start_datetime = datetime.combine(condicionante.data_limite, datetime.min.time().replace(hour=12))
        end_datetime = start_datetime + timedelta(hours=1)
        
        # Monta título e descrição
        summary = f"Prazo: {condicionante.descricao[:50]}..."
        description = f"""
Empresa: {empresa_nome}
Condicionante: {condicionante.descricao}
Prazo: {condicionante.data_limite.strftime('%d/%m/%Y')}
Responsável: {condicionante.responsavel or 'Não definido'}
Status: {condicionante.status}

Este é um lembrete automático do Sistema de Licenciamento Ambiental.
        """.strip()
        
        return self.create_event(
            summary=summary,
            description=description,
            start_datetime=start_datetime,
            end_datetime=end_datetime
        )

# Função auxiliar para criar eventos de condicionantes
def criar_evento_condicionante(condicionante, empresa_nome):
    """
    Função auxiliar para criar eventos de condicionantes
    
    Args:
        condicionante: Objeto condicionante
        empresa_nome: Nome da empresa
        
    Returns:
        str: ID do evento criado ou None se erro
    """
    try:
        calendar_service = GoogleCalendarService()
        
        # Para desenvolvimento, vamos simular a criação do evento
        # Em produção, seria necessário configurar as credenciais OAuth2
        print(f"Simulando criação de evento para: {condicionante.descricao[:50]}...")
        
        # Simula um ID de evento
        event_id = f"sim_{condicionante.id}_{datetime.now().timestamp()}"
        
        return event_id
        
    except Exception as e:
        print(f"Erro ao criar evento: {e}")
        return None

def atualizar_evento_condicionante(event_id, condicionante, empresa_nome):
    """
    Função auxiliar para atualizar eventos de condicionantes
    
    Args:
        event_id: ID do evento no Google Calendar
        condicionante: Objeto condicionante atualizado
        empresa_nome: Nome da empresa
        
    Returns:
        bool: True se sucesso, False se erro
    """
    try:
        calendar_service = GoogleCalendarService()
        
        # Para desenvolvimento, vamos simular a atualização
        print(f"Simulando atualização de evento {event_id} para: {condicionante.descricao[:50]}...")
        
        return True
        
    except Exception as e:
        print(f"Erro ao atualizar evento: {e}")
        return False

def deletar_evento_condicionante(event_id):
    """
    Função auxiliar para deletar eventos de condicionantes
    
    Args:
        event_id: ID do evento no Google Calendar
        
    Returns:
        bool: True se sucesso, False se erro
    """
    try:
        calendar_service = GoogleCalendarService()
        
        # Para desenvolvimento, vamos simular a exclusão
        print(f"Simulando exclusão de evento {event_id}...")
        
        return True
        
    except Exception as e:
        print(f"Erro ao deletar evento: {e}")
        return False

