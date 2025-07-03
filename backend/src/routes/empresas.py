from flask import Blueprint, request, jsonify, current_app
from src.models.user import db
from src.models.licenciamento import Empresa, Licenca, Condicionante
from validate_docbr import CNPJ
from datetime import datetime
from werkzeug.exceptions import HTTPException

empresas_bp = Blueprint('empresas', __name__)

@empresas_bp.route('/empresas', methods=['GET'])
def listar_empresas():
    """Lista todas as empresas"""
    try:
        empresas = Empresa.query.all()
        return jsonify([empresa.to_dict() for empresa in empresas]), 200
    except Exception as e:
        # Idealmente, logar o erro: current_app.logger.error(f"Erro em listar_empresas: {str(e)}")
        return jsonify({'erro': 'Erro interno do servidor', 'detalhe': str(e)}), 500

@empresas_bp.route('/empresas', methods=['POST'])
def criar_empresa():
    """Cria uma nova empresa"""
    try:
        dados = request.get_json()
        
        if not dados:
            return jsonify({'erro': 'Corpo da requisição não é JSON válido'}), 400
        if not dados.get('razao_social'):
            return jsonify({'erro': 'Razão social é obrigatória'}), 400
        if not dados.get('cnpj'):
            return jsonify({'erro': 'CNPJ é obrigatório'}), 400
        
        cnpj_validator = CNPJ()
        if not cnpj_validator.validate(dados['cnpj']):
            return jsonify({'erro': 'CNPJ inválido'}), 400

        cnpj_limpo = ''.join(filter(str.isdigit, dados['cnpj']))

        empresa_existente = Empresa.query.filter_by(cnpj=cnpj_limpo).first()
        if empresa_existente:
            return jsonify({'erro': 'CNPJ já cadastrado'}), 400
        
        empresa = Empresa(
            razao_social=dados['razao_social'],
            cnpj=cnpj_limpo,
            # telefone=dados.get('telefone'), # Removido
            email=dados.get('email'),
            endereco=dados.get('endereco')
        )
        
        db.session.add(empresa)
        db.session.commit()
        
        return jsonify(empresa.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        # Idealmente, logar o erro: current_app.logger.error(f"Erro em criar_empresa: {str(e)}")
        return jsonify({'erro': 'Erro interno do servidor', 'detalhe': str(e)}), 500

@empresas_bp.route('/empresas/<int:empresa_id>', methods=['GET'])
def obter_empresa(empresa_id):
    """Obtém uma empresa específica"""
    try:
        empresa = Empresa.query.get_or_404(empresa_id) # get_or_404 levanta NotFound (uma HTTPException)
        return jsonify(empresa.to_dict()), 200
    except HTTPException as e:
        raise e # Re-levanta HTTPExceptions para o Flask tratar
    except Exception as e:
        current_app.logger.error(f"Erro inesperado ao obter empresa {empresa_id}: {str(e)}")
        return jsonify({'erro': 'Erro interno do servidor', 'detalhe': str(e)}), 500

@empresas_bp.route('/empresas/<int:empresa_id>', methods=['PUT'])
def atualizar_empresa(empresa_id):
    """Atualiza uma empresa"""
    try:
        empresa = Empresa.query.get_or_404(empresa_id)
        dados = request.get_json()

        if not dados:
            return jsonify({'erro': 'Corpo da requisição não é JSON válido'}), 400

        if 'razao_social' in dados:
            empresa.razao_social = dados['razao_social']
        if 'cnpj' in dados:
            cnpj_validator = CNPJ()
            if not cnpj_validator.validate(dados['cnpj']):
                return jsonify({'erro': 'CNPJ inválido'}), 400

            cnpj_limpo = ''.join(filter(str.isdigit, dados['cnpj']))
            empresa_existente = Empresa.query.filter_by(cnpj=cnpj_limpo).first()
            if empresa_existente and empresa_existente.id != empresa_id:
                return jsonify({'erro': 'CNPJ já cadastrado'}), 400
            empresa.cnpj = cnpj_limpo

        # Atualiza outros campos se fornecidos
        for campo in ['email', 'endereco']: # 'telefone' removido da lista
            if campo in dados:
                setattr(empresa, campo, dados[campo])
        if 'telefone' in dados: # Explicitamente não faz nada com telefone se enviado
            pass
        
        empresa.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify(empresa.to_dict()), 200
    except HTTPException as e:
        raise e
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro inesperado ao atualizar empresa {empresa_id}: {str(e)}")
        return jsonify({'erro': 'Erro interno do servidor', 'detalhe': str(e)}), 500

@empresas_bp.route('/empresas/<int:empresa_id>', methods=['DELETE'])
def deletar_empresa(empresa_id):
    """Deleta uma empresa"""
    try:
        empresa = Empresa.query.get_or_404(empresa_id)
        
        if empresa.licencas: # Verifica se a lista de licenças não está vazia
            return jsonify({'erro': 'Não é possível deletar empresa com licenças associadas'}), 400
        
        db.session.delete(empresa)
        db.session.commit()
        
        return jsonify({'mensagem': 'Empresa deletada com sucesso'}), 200
    except HTTPException as e:
        raise e
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erro inesperado ao deletar empresa {empresa_id}: {str(e)}")
        return jsonify({'erro': 'Erro interno do servidor', 'detalhe': str(e)}), 500

@empresas_bp.route('/empresas/<int:empresa_id>/licencas', methods=['GET'])
def listar_licencas_empresa(empresa_id):
    """Lista todas as licenças de uma empresa"""
    try:
        empresa = Empresa.query.get_or_404(empresa_id)
        licencas = Licenca.query.filter_by(empresa_id=empresa_id).all()
        return jsonify([licenca.to_dict() for licenca in licencas]), 200
    except HTTPException as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Erro inesperado ao listar licenças da empresa {empresa_id}: {str(e)}")
        return jsonify({'erro': 'Erro interno do servidor', 'detalhe': str(e)}), 500
