from flask import Blueprint, request, jsonify
from src.models.user import db
from src.models.licenciamento import Empresa, Licenca, Condicionante
from datetime import datetime, date, timedelta

licencas_bp = Blueprint('licencas', __name__)

@licencas_bp.route('/licencas', methods=['GET'])
def listar_licencas():
    """Lista todas as licenças"""
    try:
        # Parâmetros de filtro opcionais
        empresa_id = request.args.get('empresa_id', type=int)
        status = request.args.get('status')
        
        query = Licenca.query
        
        if empresa_id:
            query = query.filter_by(empresa_id=empresa_id)
        if status:
            query = query.filter_by(status=status)
        
        licencas = query.all()
        resultado = []
        
        for licenca in licencas:
            licenca_dict = licenca.to_dict()
            # Adiciona informações da empresa
            licenca_dict['empresa'] = licenca.empresa.to_dict()
            resultado.append(licenca_dict)
        
        return jsonify(resultado), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@licencas_bp.route('/licencas', methods=['POST'])
def criar_licenca():
    """Cria uma nova licença"""
    try:
        dados = request.get_json()
        
        # Validações básicas
        if not dados.get('empresa_id'):
            return jsonify({'erro': 'ID da empresa é obrigatório'}), 400
        if not dados.get('tipo_licenca'):
            return jsonify({'erro': 'Tipo de licença é obrigatório'}), 400
        if not dados.get('data_vencimento'):
            return jsonify({'erro': 'Data de vencimento é obrigatória'}), 400
        
        # Verifica se a empresa existe
        empresa = Empresa.query.get(dados['empresa_id'])
        if not empresa:
            return jsonify({'erro': 'Empresa não encontrada'}), 404
        
        # Converte datas
        data_emissao = None
        if dados.get('data_emissao'):
            data_emissao = datetime.strptime(dados['data_emissao'], '%Y-%m-%d').date()
        
        data_vencimento = datetime.strptime(dados['data_vencimento'], '%Y-%m-%d').date()
        
        # Cria nova licença
        licenca = Licenca(
            empresa_id=dados['empresa_id'],
            tipo_licenca=dados['tipo_licenca'],
            numero_licenca=dados.get('numero_licenca'),
            orgao_emissor=dados.get('orgao_emissor', 'IMA/AL'),
            data_emissao=data_emissao,
            data_vencimento=data_vencimento,
            status=dados.get('status', 'ativa'),
            observacoes=dados.get('observacoes')
        )
        
        db.session.add(licenca)
        db.session.commit()
        
        return jsonify(licenca.to_dict()), 201
    except ValueError as e:
        return jsonify({'erro': 'Formato de data inválido. Use YYYY-MM-DD'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@licencas_bp.route('/licencas/<int:licenca_id>', methods=['GET'])
def obter_licenca(licenca_id):
    """Obtém uma licença específica"""
    try:
        licenca = Licenca.query.get_or_404(licenca_id)
        licenca_dict = licenca.to_dict()
        licenca_dict['empresa'] = licenca.empresa.to_dict()
        # Ordena as condicionantes, por exemplo, por data_limite ou id
        condicionantes_ordenadas = sorted(licenca.condicionantes, key=lambda c: c.data_limite if c.data_limite else date.max)
        licenca_dict['condicionantes'] = [c.to_dict() for c in condicionantes_ordenadas]
        return jsonify(licenca_dict), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@licencas_bp.route('/licencas/<int:licenca_id>', methods=['PUT'])
def atualizar_licenca(licenca_id):
    """Atualiza uma licença"""
    try:
        licenca = Licenca.query.get_or_404(licenca_id)
        dados = request.get_json()
        
        # Atualiza campos se fornecidos
        if 'tipo_licenca' in dados:
            licenca.tipo_licenca = dados['tipo_licenca']
        if 'numero_licenca' in dados:
            licenca.numero_licenca = dados['numero_licenca']
        if 'orgao_emissor' in dados:
            licenca.orgao_emissor = dados['orgao_emissor']
        if 'data_emissao' in dados:
            licenca.data_emissao = datetime.strptime(dados['data_emissao'], '%Y-%m-%d').date()
        if 'data_vencimento' in dados:
            licenca.data_vencimento = datetime.strptime(dados['data_vencimento'], '%Y-%m-%d').date()
        if 'status' in dados:
            licenca.status = dados['status']
        if 'observacoes' in dados:
            licenca.observacoes = dados['observacoes']
        
        licenca.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify(licenca.to_dict()), 200
    except ValueError as e:
        return jsonify({'erro': 'Formato de data inválido. Use YYYY-MM-DD'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@licencas_bp.route('/licencas/<int:licenca_id>', methods=['DELETE'])
def deletar_licenca(licenca_id):
    """Deleta uma licença"""
    try:
        licenca = Licenca.query.get_or_404(licenca_id)
        
        db.session.delete(licenca)
        db.session.commit()
        
        return jsonify({'mensagem': 'Licença deletada com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@licencas_bp.route('/licencas/vencimento', methods=['GET'])
def licencas_por_vencer():
    """Lista licenças que estão próximas do vencimento"""
    try:
        dias_limite = request.args.get('dias', default=30, type=int)
        data_limite = date.today()
        
        # Busca licenças que vencem nos próximos X dias
        licencas = Licenca.query.filter(
            Licenca.data_vencimento <= date.today() + timedelta(days=dias_limite),
            Licenca.status == 'ativa'
        ).order_by(Licenca.data_vencimento).all()
        
        resultado = []
        for licenca in licencas:
            licenca_dict = licenca.to_dict()
            licenca_dict['empresa'] = licenca.empresa.to_dict()
            resultado.append(licenca_dict)
        
        return jsonify(resultado), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@licencas_bp.route('/licencas/<int:licenca_id>/condicionantes', methods=['GET'])
def listar_condicionantes_licenca(licenca_id):
    """Lista todas as condicionantes de uma licença"""
    try:
        licenca = Licenca.query.get_or_404(licenca_id)
        # Ordena as condicionantes, por exemplo, por data_limite ou id
        condicionantes = Condicionante.query.filter_by(licenca_id=licenca_id).order_by(Condicionante.data_limite.asc().nullslast(), Condicionante.id.asc()).all()
        return jsonify([condicionante.to_dict() for condicionante in condicionantes]), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

