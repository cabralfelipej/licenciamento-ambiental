from flask import Blueprint, request, jsonify, current_app
from src.models.user import db
from src.models.licenciamento import Licenca, Condicionante, Notificacao
from datetime import datetime, date, timedelta
import os
from werkzeug.utils import secure_filename

condicionantes_bp = Blueprint('condicionantes', __name__)

UPLOAD_FOLDER = 'uploads/comprovantes'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@condicionantes_bp.route('/condicionantes', methods=['GET'])
def listar_condicionantes():
    """Lista todas as condicionantes"""
    try:
        # Parâmetros de filtro opcionais
        licenca_id = request.args.get('licenca_id', type=int)
        status = request.args.get('status')
        
        query = Condicionante.query
        
        if licenca_id:
            query = query.filter_by(licenca_id=licenca_id)
        if status:
            query = query.filter_by(status=status)
        
        condicionantes = query.all()
        resultado = []
        
        for condicionante in condicionantes:
            condicionante_dict = condicionante.to_dict()
            # Adiciona informações da licença e empresa
            condicionante_dict['licenca'] = condicionante.licenca.to_dict()
            condicionante_dict['empresa'] = condicionante.licenca.empresa.to_dict()
            resultado.append(condicionante_dict)
        
        return jsonify(resultado), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@condicionantes_bp.route('/condicionantes', methods=['POST'])
def criar_condicionante():
    """Cria uma nova condicionante"""
    try:
        dados = request.get_json()
        
        # Validações básicas
        if not dados.get('licenca_id'):
            return jsonify({'erro': 'ID da licença é obrigatório'}), 400
        if not dados.get('descricao'):
            return jsonify({'erro': 'Descrição é obrigatória'}), 400
        
        # Verifica se a licença existe
        licenca = Licenca.query.get(dados['licenca_id'])
        if not licenca:
            return jsonify({'erro': 'Licença não encontrada'}), 404
        
        # Cria nova condicionante
        condicionante = Condicionante(
            licenca_id=dados['licenca_id'],
            descricao=dados['descricao'],
            prazo_dias=dados.get('prazo_dias'),
            responsavel=dados.get('responsavel'),
            observacoes=dados.get('observacoes'),
            status=dados.get('status', 'pendente')
        )
        
        # Calcula data limite se prazo_dias foi fornecido
        if dados.get('prazo_dias'):
            data_base = licenca.data_emissao or date.today()
            condicionante.calcular_data_limite(data_base)
        elif dados.get('data_limite'):
            condicionante.data_limite = datetime.strptime(dados['data_limite'], '%Y-%m-%d').date()
        
        db.session.add(condicionante)
        db.session.commit()
        
        return jsonify(condicionante.to_dict()), 201
    except ValueError as e:
        return jsonify({'erro': 'Formato de data inválido. Use YYYY-MM-DD'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@condicionantes_bp.route('/condicionantes/<int:condicionante_id>', methods=['GET'])
def obter_condicionante(condicionante_id):
    """Obtém uma condicionante específica"""
    try:
        condicionante = Condicionante.query.get_or_404(condicionante_id)
        condicionante_dict = condicionante.to_dict()
        condicionante_dict['licenca'] = condicionante.licenca.to_dict()
        condicionante_dict['empresa'] = condicionante.licenca.empresa.to_dict()
        return jsonify(condicionante_dict), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@condicionantes_bp.route('/condicionantes/<int:condicionante_id>', methods=['PUT'])
def atualizar_condicionante(condicionante_id):
    """Atualiza uma condicionante"""
    try:
        condicionante = Condicionante.query.get_or_404(condicionante_id)
        dados = request.get_json()
        
        # Atualiza campos se fornecidos
        if 'descricao' in dados:
            condicionante.descricao = dados['descricao']
        if 'prazo_dias' in dados:
            condicionante.prazo_dias = dados['prazo_dias']
            # Recalcula data limite se prazo mudou
            if condicionante.prazo_dias:
                data_base = condicionante.licenca.data_emissao or date.today()
                condicionante.calcular_data_limite(data_base)
        if 'data_limite' in dados:
            condicionante.data_limite = datetime.strptime(dados['data_limite'], '%Y-%m-%d').date()
        if 'status' in dados:
            condicionante.status = dados['status']
        if 'responsavel' in dados:
            condicionante.responsavel = dados['responsavel']
        if 'observacoes' in dados:
            condicionante.observacoes = dados['observacoes']
        if 'data_envio_cumprimento' in dados and dados['data_envio_cumprimento']:
            try:
                condicionante.data_envio_cumprimento = datetime.strptime(dados['data_envio_cumprimento'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'erro': 'Formato de data de envio/cumprimento inválido. Use YYYY-MM-DD'}), 400
        
        condicionante.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify(condicionante.to_dict()), 200
    except ValueError as e:
        return jsonify({'erro': 'Formato de data inválido. Use YYYY-MM-DD'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@condicionantes_bp.route('/condicionantes/<int:condicionante_id>', methods=['DELETE'])
def deletar_condicionante(condicionante_id):
    """Deleta uma condicionante"""
    try:
        condicionante = Condicionante.query.get_or_404(condicionante_id)
        
        db.session.delete(condicionante)
        db.session.commit()
        
        return jsonify({'mensagem': 'Condicionante deletada com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@condicionantes_bp.route('/condicionantes/vencimento', methods=['GET'])
def condicionantes_por_vencer():
    """Lista condicionantes que estão próximas do vencimento"""
    try:
        dias_limite = request.args.get('dias', default=30, type=int)
        
        # Busca condicionantes que vencem nos próximos X dias
        condicionantes = Condicionante.query.filter(
            Condicionante.data_limite <= date.today() + timedelta(days=dias_limite),
            Condicionante.status == 'pendente'
        ).order_by(Condicionante.data_limite).all()
        
        resultado = []
        for condicionante in condicionantes:
            condicionante_dict = condicionante.to_dict()
            condicionante_dict['licenca'] = condicionante.licenca.to_dict()
            condicionante_dict['empresa'] = condicionante.licenca.empresa.to_dict()
            resultado.append(condicionante_dict)
        
        return jsonify(resultado), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@condicionantes_bp.route('/condicionantes/<int:condicionante_id>/marcar-cumprida-rapido', methods=['POST'])
def marcar_condicionante_cumprida_rapido(condicionante_id):
    """Marca uma condicionante como cumprida (versão rápida sem formulário)"""
    try:
        condicionante = Condicionante.query.get_or_404(condicionante_id)
        
        condicionante.status = 'cumprida'
        condicionante.data_envio_cumprimento = date.today()
        condicionante.observacoes = None # Limpa observações de cumprimento anterior
        condicionante.comprovante_path = None # Limpa comprovante anterior

        condicionante.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify(condicionante.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao marcar condicionante como cumprida (rápido): {str(e)}")
        return jsonify({'erro': str(e)}), 500

@condicionantes_bp.route('/condicionantes/<int:condicionante_id>/marcar-pendente', methods=['POST'])
def marcar_condicionante_pendente(condicionante_id):
    """Marca uma condicionante como pendente, limpando os dados de cumprimento."""
    try:
        condicionante = Condicionante.query.get_or_404(condicionante_id)

        condicionante.status = 'pendente'
        condicionante.data_envio_cumprimento = None
        condicionante.observacoes = None # Limpa observações de cumprimento anterior
        condicionante.comprovante_path = None # Limpa comprovante anterior

        condicionante.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify(condicionante.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro ao marcar condicionante como pendente: {str(e)}")
        return jsonify({'erro': str(e)}), 500

@condicionantes_bp.route('/dashboard/resumo', methods=['GET'])
def dashboard_resumo():
    """Retorna resumo para o dashboard"""
    try:
        hoje = date.today()
        
        # Contadores gerais
        total_empresas = db.session.query(db.func.count(db.distinct(Licenca.empresa_id))).scalar()
        total_licencas = Licenca.query.filter_by(status='ativa').count()
        total_condicionantes = Condicionante.query.filter_by(status='pendente').count()
        
        # Licenças por vencer (próximos 30 dias)
        licencas_vencimento = Licenca.query.filter(
            Licenca.data_vencimento <= hoje + timedelta(days=30),
            Licenca.status == 'ativa'
        ).count()
        
        # Condicionantes por vencer (próximos 30 dias)
        condicionantes_vencimento = Condicionante.query.filter(
            Condicionante.data_limite <= hoje + timedelta(days=30),
            Condicionante.status == 'pendente'
        ).count()
        
        # Condicionantes vencidas
        condicionantes_vencidas = Condicionante.query.filter(
            Condicionante.data_limite < hoje,
            Condicionante.status == 'pendente'
        ).count()
        
        # Próximas ações (condicionantes mais urgentes)
        proximas_acoes = Condicionante.query.filter(
            Condicionante.status == 'pendente'
        ).order_by(Condicionante.data_limite).limit(5).all()
        
        resultado = {
            'totais': {
                'empresas': total_empresas,
                'licencas': total_licencas,
                'condicionantes': total_condicionantes
            },
            'alertas': {
                'licencas_vencimento': licencas_vencimento,
                'condicionantes_vencimento': condicionantes_vencimento,
                'condicionantes_vencidas': condicionantes_vencidas
            },
            'proximas_acoes': [
                {
                    **condicionante.to_dict(),
                    'empresa': condicionante.licenca.empresa.razao_social,
                    'tipo_licenca': condicionante.licenca.tipo_licenca
                }
                for condicionante in proximas_acoes
            ]
        }
        
        return jsonify(resultado), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

