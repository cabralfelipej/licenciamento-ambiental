from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users' # Definindo explicitamente o nome da tabela

    id = db.Column(db.Integer, primary_key=True)
    nome_completo = db.Column(db.String(150), nullable=True) # Mantendo nome_completo, tornando-o opcional
    email = db.Column(db.String(120), unique=True, nullable=False, index=True) # Email como identificador principal
    password_hash = db.Column(db.String(256), nullable=False) # Aumentado para 256 para hashes mais longos
    role = db.Column(db.String(50), nullable=False, default='visualizador') # Papéis: 'administrador', 'editor', 'visualizador'

    # Removido o campo username antigo, usando email para login.

    def __repr__(self):
        return f'<User {self.email} ({self.role})>'

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'nome_completo': self.nome_completo,
            'email': self.email,
            'role': self.role
            # Não incluir password_hash no to_dict por segurança
        }
