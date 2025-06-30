from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from src.models.user import db

class Empresa(db.Model):
    __tablename__ = 'empresas'
    
    id = db.Column(db.Integer, primary_key=True)
    razao_social = db.Column(db.String(200), nullable=False)
    cnpj = db.Column(db.String(18), unique=True, nullable=False)
    telefone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    endereco = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamento com licenças
    licencas = db.relationship('Licenca', backref='empresa', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Empresa {self.razao_social}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'razao_social': self.razao_social,
            'cnpj': self.cnpj,
            'telefone': self.telefone,
            'email': self.email,
            'endereco': self.endereco,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Licenca(db.Model):
    __tablename__ = 'licencas'
    
    id = db.Column(db.Integer, primary_key=True)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=False)
    tipo_licenca = db.Column(db.String(100), nullable=False)  # Ex: "Licença de Operação - Renovação"
    numero_licenca = db.Column(db.String(50))
    orgao_emissor = db.Column(db.String(100), default='IMA/AL')
    data_emissao = db.Column(db.Date)
    data_vencimento = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default='ativa')  # ativa, vencida, cancelada
    observacoes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamento com condicionantes
    condicionantes = db.relationship('Condicionante', backref='licenca', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Licenca {self.tipo_licenca} - {self.numero_licenca}>'
    
    def dias_para_vencimento(self):
        """Calcula quantos dias faltam para o vencimento"""
        if self.data_vencimento:
            delta = self.data_vencimento - datetime.now().date()
            return delta.days
        return None
    
    def to_dict(self):
        return {
            'id': self.id,
            'empresa_id': self.empresa_id,
            'tipo_licenca': self.tipo_licenca,
            'numero_licenca': self.numero_licenca,
            'orgao_emissor': self.orgao_emissor,
            'data_emissao': self.data_emissao.isoformat() if self.data_emissao else None,
            'data_vencimento': self.data_vencimento.isoformat() if self.data_vencimento else None,
            'status': self.status,
            'observacoes': self.observacoes,
            'dias_para_vencimento': self.dias_para_vencimento(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Condicionante(db.Model):
    __tablename__ = 'condicionantes'
    
    id = db.Column(db.Integer, primary_key=True)
    licenca_id = db.Column(db.Integer, db.ForeignKey('licencas.id'), nullable=False)
    descricao = db.Column(db.Text, nullable=False)
    prazo_dias = db.Column(db.Integer)  # Prazo em dias (ex: 120, 30, etc.)
    data_limite = db.Column(db.Date)  # Data limite calculada
    status = db.Column(db.String(20), default='pendente')  # pendente, cumprida, vencida
    responsavel = db.Column(db.String(100))
    observacoes = db.Column(db.Text)
    data_envio_cumprimento = db.Column(db.Date) # Nova coluna para data de envio/cumprimento
    comprovante_path = db.Column(db.String(255)) # Nova coluna para caminho do arquivo de comprovante
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamento com notificações
    notificacoes = db.relationship('Notificacao', backref='condicionante', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Condicionante {self.id} - {self.descricao[:50]}...>'
    
    def dias_para_vencimento(self):
        """Calcula quantos dias faltam para o vencimento da condicionante"""
        if self.data_limite:
            delta = self.data_limite - datetime.now().date()
            return delta.days
        return None
    
    def calcular_data_limite(self, data_base=None):
        """Calcula a data limite baseada no prazo em dias"""
        if self.prazo_dias:
            base = data_base or datetime.now().date()
            self.data_limite = base + timedelta(days=self.prazo_dias)
    
    def to_dict(self):
        return {
            'id': self.id,
            'licenca_id': self.licenca_id,
            'descricao': self.descricao,
            'prazo_dias': self.prazo_dias,
            'data_limite': self.data_limite.isoformat() if self.data_limite else None,
            'status': self.status,
            'responsavel': self.responsavel,
            'observacoes': self.observacoes,
            'data_envio_cumprimento': self.data_envio_cumprimento.isoformat() if self.data_envio_cumprimento else None,
            'comprovante_path': self.comprovante_path,
            'dias_para_vencimento': self.dias_para_vencimento(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Notificacao(db.Model):
    __tablename__ = 'notificacoes'
    
    id = db.Column(db.Integer, primary_key=True)
    condicionante_id = db.Column(db.Integer, db.ForeignKey('condicionantes.id'), nullable=False)
    tipo = db.Column(db.String(20), nullable=False)  # email, calendar
    data_envio = db.Column(db.DateTime)
    status = db.Column(db.String(20), default='pendente')  # pendente, enviada, erro
    google_event_id = db.Column(db.String(100))  # ID do evento no Google Calendar
    mensagem = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Notificacao {self.tipo} - {self.status}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'condicionante_id': self.condicionante_id,
            'tipo': self.tipo,
            'data_envio': self.data_envio.isoformat() if self.data_envio else None,
            'status': self.status,
            'google_event_id': self.google_event_id,
            'mensagem': self.mensagem,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

