import pytest
import json
from src.models.licenciamento import Empresa

# CNPJs "Padrão Ouro" - Confirmados como válidos pela validate_docbr==1.11.1
CNPJ_PETRO = "33.000.167/0001-01"
CNPJ_PETRO_FMT = "33000167000101"
CNPJ_VALE = "33.592.510/0001-54"
CNPJ_VALE_FMT = "33592510000154"
CNPJ_BRADESCO = "60.746.948/0001-12"
CNPJ_BRADESCO_FMT = "60746948000112"

# CNPJs inválidos para teste
INVALIDO_CNPJ_DIGITO = "33.000.167/0001-00" # Petrobras com dígito errado
INVALIDO_CNPJ_FORMATO = "12.345.678/0001-AA" # Letras no CNPJ


def test_criar_empresa_sucesso(client, db):
    """Testa a criação de uma empresa com dados válidos."""
    response = client.post('/api/empresas', json={
        'razao_social': 'Empresa de Teste LTDA',
        'cnpj': CNPJ_PETRO,
        'telefone': '11999998888',
        'email': 'contato@empresateste.com',
        'endereco': 'Rua dos Testes, 123'
    })
    assert response.status_code == 201, response.get_data(as_text=True)
    data = response.get_json()
    assert data['razao_social'] == 'Empresa de Teste LTDA'
    assert data['cnpj'] == CNPJ_PETRO_FMT

    empresa_db = db.session.get(Empresa, data['id'])
    assert empresa_db is not None
    assert empresa_db.cnpj == CNPJ_PETRO_FMT

def test_criar_empresa_cnpj_invalido(client, db):
    """Testa a criação de uma empresa com CNPJ inválido (dígito)."""
    response = client.post('/api/empresas', json={
        'razao_social': 'Empresa CNPJ Inválido Dígito',
        'cnpj': INVALIDO_CNPJ_DIGITO
    })
    assert response.status_code == 400, response.get_data(as_text=True)
    data = response.get_json()
    assert 'erro' in data
    assert data['erro'] == 'CNPJ inválido'

def test_criar_empresa_cnpj_invalido_formato(client, db):
    """Testa a criação de uma empresa com CNPJ em formato inválido."""
    response = client.post('/api/empresas', json={
        'razao_social': 'Empresa CNPJ Formato Inválido',
        'cnpj': INVALIDO_CNPJ_FORMATO
    })
    assert response.status_code == 400, response.get_data(as_text=True)
    data = response.get_json()
    assert 'erro' in data
    assert data['erro'] == 'CNPJ inválido'


def test_criar_empresa_cnpj_duplicado(client, db):
    """Testa a criação de uma empresa com CNPJ já existente."""
    # Cria uma empresa primeiro
    res_primeira = client.post('/api/empresas', json={
        'razao_social': 'Primeira Empresa',
        'cnpj': CNPJ_PETRO
    })
    assert res_primeira.status_code == 201, res_primeira.get_data(as_text=True)

    # Tenta criar outra com o mesmo CNPJ
    response = client.post('/api/empresas', json={
        'razao_social': 'Segunda Empresa Mesmo CNPJ',
        'cnpj': CNPJ_PETRO
    })
    assert response.status_code == 400, response.get_data(as_text=True)
    data = response.get_json()
    assert 'erro' in data
    assert data['erro'] == 'CNPJ já cadastrado'

def test_criar_empresa_sem_razao_social(client, db):
    """Testa a criação de empresa sem razão social."""
    response = client.post('/api/empresas', json={
        'cnpj': CNPJ_PETRO
    })
    assert response.status_code == 400, response.get_data(as_text=True)
    data = response.get_json()
    assert 'erro' in data
    assert data['erro'] == 'Razão social é obrigatória'

def test_criar_empresa_sem_cnpj(client, db):
    """Testa a criação de empresa sem CNPJ."""
    response = client.post('/api/empresas', json={
        'razao_social': 'Empresa Sem CNPJ'
    })
    assert response.status_code == 400, response.get_data(as_text=True)
    data = response.get_json()
    assert 'erro' in data
    assert data['erro'] == 'CNPJ é obrigatório'

def test_listar_empresas(client, db):
    """Testa a listagem de empresas."""
    res_a = client.post('/api/empresas', json={'razao_social': 'Empresa A', 'cnpj': CNPJ_PETRO})
    assert res_a.status_code == 201, res_a.get_data(as_text=True)
    res_b = client.post('/api/empresas', json={'razao_social': 'Empresa B', 'cnpj': CNPJ_VALE})
    assert res_b.status_code == 201, res_b.get_data(as_text=True)

    response = client.get('/api/empresas')
    assert response.status_code == 200, response.get_data(as_text=True)
    data = response.get_json()
    assert len(data) == 2
    # A ordem pode variar, então verificamos a presença
    assert any(e['razao_social'] == 'Empresa A' and e['cnpj'] == CNPJ_PETRO_FMT for e in data)
    assert any(e['razao_social'] == 'Empresa B' and e['cnpj'] == CNPJ_VALE_FMT for e in data)


def test_obter_empresa(client, db):
    """Testa obter uma empresa específica."""
    res_post = client.post('/api/empresas', json={'razao_social': 'Empresa Detalhe', 'cnpj': CNPJ_BRADESCO})
    assert res_post.status_code == 201, res_post.get_data(as_text=True)
    empresa_id = res_post.get_json()['id']

    response = client.get(f'/api/empresas/{empresa_id}')
    assert response.status_code == 200, response.get_data(as_text=True)
    data = response.get_json()
    assert data['razao_social'] == 'Empresa Detalhe'
    assert data['cnpj'] == CNPJ_BRADESCO_FMT

def test_obter_empresa_nao_existente(client, db):
    """Testa obter uma empresa que não existe."""
    response = client.get('/api/empresas/999999') # Usar um ID improvável
    assert response.status_code == 404, response.get_data(as_text=True)

def test_atualizar_empresa_sucesso(client, db):
    """Testa a atualização de uma empresa com sucesso."""
    res_post = client.post('/api/empresas', json={'razao_social': 'Empresa Original', 'cnpj': CNPJ_PETRO})
    assert res_post.status_code == 201, res_post.get_data(as_text=True)
    empresa_id = res_post.get_json()['id']

    response = client.put(f'/api/empresas/{empresa_id}', json={
        'razao_social': 'Empresa Atualizada',
        'cnpj': CNPJ_VALE,
        'email': 'novoemail@empresa.com'
    })
    assert response.status_code == 200, response.get_data(as_text=True)
    data = response.get_json()
    assert data['razao_social'] == 'Empresa Atualizada'
    assert data['cnpj'] == CNPJ_VALE_FMT
    assert data['email'] == 'novoemail@empresa.com'

    empresa_db = db.session.get(Empresa, empresa_id)
    assert empresa_db is not None
    assert empresa_db.razao_social == 'Empresa Atualizada'
    assert empresa_db.cnpj == CNPJ_VALE_FMT

def test_atualizar_empresa_cnpj_invalido(client, db):
    """Testa a atualização de uma empresa para um CNPJ inválido."""
    res_post = client.post('/api/empresas', json={'razao_social': 'Empresa CNPJ Atualizar', 'cnpj': CNPJ_PETRO})
    assert res_post.status_code == 201, res_post.get_data(as_text=True)
    empresa_id = res_post.get_json()['id']

    response = client.put(f'/api/empresas/{empresa_id}', json={'cnpj': INVALIDO_CNPJ_DIGITO})
    assert response.status_code == 400, response.get_data(as_text=True)
    data = response.get_json()
    assert 'erro' in data
    assert data['erro'] == 'CNPJ inválido'

def test_atualizar_empresa_cnpj_duplicado(client, db):
    """Testa a atualização de uma empresa para um CNPJ que já pertence a outra."""
    res_fixa = client.post('/api/empresas', json={'razao_social': 'Empresa Fixa', 'cnpj': CNPJ_PETRO})
    assert res_fixa.status_code == 201, res_fixa.get_data(as_text=True)

    res_atualizar = client.post('/api/empresas', json={'razao_social': 'Empresa a Atualizar', 'cnpj': CNPJ_VALE})
    assert res_atualizar.status_code == 201, res_atualizar.get_data(as_text=True)
    empresa_id_atualizar = res_atualizar.get_json()['id']

    response = client.put(f'/api/empresas/{empresa_id_atualizar}', json={'cnpj': CNPJ_PETRO})
    assert response.status_code == 400, response.get_data(as_text=True)
    data = response.get_json()
    assert 'erro' in data
    assert data['erro'] == 'CNPJ já cadastrado'

def test_deletar_empresa_sucesso(client, db):
    """Testa deletar uma empresa sem licenças associadas."""
    res_post = client.post('/api/empresas', json={'razao_social': 'Empresa a Deletar', 'cnpj': CNPJ_PETRO})
    assert res_post.status_code == 201, res_post.get_data(as_text=True)
    empresa_id = res_post.get_json()['id']

    response = client.delete(f'/api/empresas/{empresa_id}')
    assert response.status_code == 200, response.get_data(as_text=True)
    data = response.get_json()
    assert data['mensagem'] == 'Empresa deletada com sucesso'

    empresa_db = db.session.get(Empresa, empresa_id)
    assert empresa_db is None

def test_deletar_empresa_com_licencas(client, db):
    """Testa tentativa de deletar empresa com licenças associadas."""
    # Criar empresa
    res_empresa = client.post('/api/empresas', json={'razao_social': 'Empresa Com Licenca', 'cnpj': CNPJ_PETRO})
    assert res_empresa.status_code == 201, res_empresa.get_data(as_text=True)
    empresa_id = res_empresa.get_json()['id']

    # Criar licença para a empresa (precisa de data_vencimento válida)
    res_licenca = client.post('/api/licencas', json={
        'empresa_id': empresa_id,
        'tipo_licenca': 'LO',
        'data_vencimento': '2025-12-31' # Exemplo de data
    })
    assert res_licenca.status_code == 201, res_licenca.get_data(as_text=True)

    response = client.delete(f'/api/empresas/{empresa_id}')
    assert response.status_code == 400, response.get_data(as_text=True)
    data = response.get_json()
    assert 'erro' in data
    assert data['erro'] == 'Não é possível deletar empresa com licenças associadas'

    empresa_db = db.session.get(Empresa, empresa_id)
    assert empresa_db is not None # Empresa não deve ser deletada
