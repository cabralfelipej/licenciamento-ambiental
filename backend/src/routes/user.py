from flask import Blueprint, jsonify, request, current_app
from src.models.user import User, db
import jwt
from datetime import datetime, timedelta, timezone

user_bp = Blueprint('user', __name__) # Pode ser renomeado para auth_bp se preferir separar

# Endpoint de Registro
@user_bp.route('/register', methods=['POST'])
def register_user():
    data = request.get_json()

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'erro': 'Email e senha são obrigatórios'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'erro': 'Este email já está registrado'}), 400

    new_user = User(
        email=data['email'],
        nome_completo=data.get('nome_completo'),
        role=data.get('role', 'visualizador') # Default role
    )
    new_user.set_password(data['password'])

    db.session.add(new_user)
    db.session.commit()

    return jsonify(new_user.to_dict()), 201

# Endpoint de Login
@user_bp.route('/login', methods=['POST'])
def login_user():
    data = request.get_json()

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'erro': 'Email e senha são obrigatórios'}), 401 # 401 para falha de autenticação

    user = User.query.filter_by(email=data['email']).first()

    if not user or not user.check_password(data['password']):
        return jsonify({'erro': 'Credenciais inválidas'}), 401

    # Gerar token JWT
    payload = {
        'user_id': user.id,
        'role': user.role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=current_app.config.get('JWT_EXPIRATION_HOURS', 24)) # Adicionado timezone.utc
    }
    token = jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')

    return jsonify({'token': token, 'user': user.to_dict()}), 200


# Manter rotas CRUD existentes, mas elas precisarão de proteção e ajustes para o novo modelo.
# Por enquanto, vamos focar em registro e login.
# O endpoint GET /users pode ser usado por um admin no futuro.
@user_bp.route('/users', methods=['GET'])
def get_users():
    # TODO: Proteger esta rota (somente admin)
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

# O endpoint POST /users original foi substituído por /register.
# Se for necessário um endpoint para admin criar usuários, ele pode ser recriado com proteção.

@user_bp.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    # TODO: Proteger esta rota (usuário logado pode ver o seu, admin pode ver qualquer um)
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())

@user_bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.json
    user.username = data.get('username', user.username)
    user.email = data.get('email', user.email)
    db.session.commit()
    return jsonify(user.to_dict())

@user_bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return '', 204
