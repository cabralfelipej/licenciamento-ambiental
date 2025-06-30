import pytest
import json
from datetime import date, timedelta, datetime
from src.models.licenciamento import Empresa, Licenca, Condicionante
import os
from io import BytesIO

# Usar CNPJs "Padrão Ouro"
EMPRESA_CNPJ_COND_TEST = "60.746.948/0001-12" # CNPJ_BRADESCO
LICENCA_TIPO = "Licença de Operação"
CONDICIONANTE_DESCRICAO = "Monitorar efluentes trimestralmente"

@pytest.fixture
def setup_empresa_licenca(client, db):
    """Fixture para criar uma empresa e uma licença base para os testes."""
    res_empresa = client.post('/api/empresas', json={
        'razao_social': 'Empresa Base Condicionantes',
        'cnpj': EMPRESA_CNPJ_COND_TEST # Usar o CNPJ válido definido acima
    })
    assert res_empresa.status_code == 201, res_empresa.get_data(as_text=True)
    empresa_id = res_empresa.get_json()['id']

    data_emissao = date.today() - timedelta(days=30)
    data_vencimento = date.today() + timedelta(days=365)

    res_licenca = client.post('/api/licencas', json={
        'empresa_id': empresa_id,
        'tipo_licenca': LICENCA_TIPO,
        'numero_licenca': 'L0123',
        'data_emissao': data_emissao.isoformat(),
        'data_vencimento': data_vencimento.isoformat()
    })
    assert res_licenca.status_code == 201, res_licenca.get_data(as_text=True)
    licenca_id = res_licenca.get_json()['id']

    return empresa_id, licenca_id, data_emissao

def test_criar_condicionante_sucesso(client, db, setup_empresa_licenca):
    """Testa a criação de uma condicionante com sucesso."""
    _, licenca_id, data_emissao_licenca = setup_empresa_licenca

    prazo_dias = 90
    data_limite_esperada = data_emissao_licenca + timedelta(days=prazo_dias)

    response = client.post('/api/condicionantes', json={
        'licenca_id': licenca_id,
        'descricao': CONDICIONANTE_DESCRICAO,
        'prazo_dias': prazo_dias,
        'responsavel': 'Ambiental Co.'
    })
    assert response.status_code == 201, response.get_data(as_text=True)
    data = response.get_json()
    assert data['descricao'] == CONDICIONANTE_DESCRICAO
    assert data['licenca_id'] == licenca_id
    assert data['prazo_dias'] == prazo_dias
    assert data['data_limite'] == data_limite_esperada.isoformat()
    assert data['status'] == 'pendente'
    assert data['data_envio_cumprimento'] is None
    assert data['comprovante_path'] is None

    cond_db = db.session.get(Condicionante, data['id'])
    assert cond_db is not None
    assert cond_db.data_limite == data_limite_esperada

def test_criar_condicionante_com_data_limite_direta(client, db, setup_empresa_licenca):
    """Testa a criação de uma condicionante fornecendo a data limite diretamente."""
    _, licenca_id, _ = setup_empresa_licenca
    data_limite_fornecida = (date.today() + timedelta(days=60)).isoformat()

    response = client.post('/api/condicionantes', json={
        'licenca_id': licenca_id,
        'descricao': "Outra Condicionante",
        'data_limite': data_limite_fornecida,
    })
    assert response.status_code == 201, response.get_data(as_text=True)
    data = response.get_json()
    assert data['data_limite'] == data_limite_fornecida

def test_marcar_condicionante_cumprida_sem_arquivo(client, db, setup_empresa_licenca):
    """Testa marcar uma condicionante como cumprida sem enviar arquivo."""
    _, licenca_id, _ = setup_empresa_licenca
    res_cond = client.post('/api/condicionantes', json={
        'licenca_id': licenca_id, 'descricao': 'Condicionante a cumprir'
    })
    assert res_cond.status_code == 201, res_cond.get_data(as_text=True)
    cond_id = res_cond.get_json()['id']

    data_cumprimento = date.today().isoformat()
    observacoes = "Cumprida conforme relatório X."

    response = client.post(f'/api/condicionantes/{cond_id}/marcar-cumprida', data={
        'data_envio_cumprimento': data_cumprimento,
        'observacoes': observacoes
    }) # application/x-www-form-urlencoded ou multipart/form-data

    assert response.status_code == 200, response.get_data(as_text=True)
    data = response.get_json()
    assert data['status'] == 'cumprida'
    assert data['data_envio_cumprimento'] == data_cumprimento
    assert data['observacoes'] == observacoes
    assert data['comprovante_path'] is None

    cond_db = db.session.get(Condicionante, cond_id)
    assert cond_db.status == 'cumprida'
    assert cond_db.data_envio_cumprimento.isoformat() == data_cumprimento

def test_marcar_condicionante_cumprida_com_arquivo_valido(client, app, db, setup_empresa_licenca):
    """Testa marcar condicionante como cumprida com upload de arquivo válido."""
    _, licenca_id, _ = setup_empresa_licenca
    res_cond = client.post('/api/condicionantes', json={
        'licenca_id': licenca_id, 'descricao': 'Condicionante com anexo'
    })
    assert res_cond.status_code == 201, res_cond.get_data(as_text=True)
    cond_id = res_cond.get_json()['id']

    # Cria um arquivo de teste em memória
    file_content = b"Este e um arquivo de teste PDF."
    file_data = {'comprovante': (BytesIO(file_content), 'teste.pdf')}

    data_cumprimento = date.today()

    response = client.post(f'/api/condicionantes/{cond_id}/marcar-cumprida',
                           content_type='multipart/form-data',
                           data={
                               'data_envio_cumprimento': data_cumprimento.isoformat(),
                               'observacoes': 'Comprovante em anexo.',
                               'comprovante': (BytesIO(file_content), 'teste.pdf') # Chave 'comprovante'
                           })

    assert response.status_code == 200, response.get_data(as_text=True)
    data = response.get_json()
    assert data['status'] == 'cumprida'
    assert data['comprovante_path'] is not None

    # Verifica se o arquivo foi salvo (o caminho é relativo a UPLOAD_FOLDER/comprovantes)
    # O nome do arquivo no servidor terá um timestamp, então verificamos a existência e o final do nome.
    comprovante_path_no_servidor = os.path.join(app.config['UPLOAD_FOLDER'], data['comprovante_path'])
    assert os.path.exists(comprovante_path_no_servidor)
    assert data['comprovante_path'].endswith("_teste.pdf")

    # Limpa o arquivo criado para não interferir em outros testes, se necessário
    # (o conftest.py já deve limpar a pasta de uploads inteira no final da sessão)
    # if os.path.exists(comprovante_path_no_servidor):
    #     os.remove(comprovante_path_no_servidor)

def test_marcar_condicionante_cumprida_com_arquivo_invalido_tipo(client, db, setup_empresa_licenca):
    """Testa marcar condicionante como cumprida com upload de arquivo de tipo não permitido."""
    _, licenca_id, _ = setup_empresa_licenca
    res_cond = client.post('/api/condicionantes', json={
        'licenca_id': licenca_id, 'descricao': 'Condicionante com anexo invalido'
    })
    assert res_cond.status_code == 201, res_cond.get_data(as_text=True)
    cond_id = res_cond.get_json()['id']

    file_content = b"Este e um arquivo .exe"

    response = client.post(f'/api/condicionantes/{cond_id}/marcar-cumprida',
                           content_type='multipart/form-data',
                           data={
                               'comprovante': (BytesIO(file_content), 'aplicativo.exe')
                           })

    assert response.status_code == 400, response.get_data(as_text=True)
    data = response.get_json()
    assert 'erro' in data
    assert data['erro'] == 'Tipo de arquivo não permitido'

    cond_db = db.session.get(Condicionante, cond_id)
    assert cond_db.status == 'pendente' # Não deve ter sido alterada
    assert cond_db.comprovante_path is None

def test_marcar_condicionante_cumprida_data_envio_default(client, db, setup_empresa_licenca):
    """Testa se a data de envio é definida para hoje se não fornecida."""
    _, licenca_id, _ = setup_empresa_licenca
    res_cond = client.post('/api/condicionantes', json={
        'licenca_id': licenca_id, 'descricao': 'Condicionante data default'
    })
    assert res_cond.status_code == 201, res_cond.get_data(as_text=True)
    cond_id = res_cond.get_json()['id']

    response = client.post(f'/api/condicionantes/{cond_id}/marcar-cumprida', data={})

    assert response.status_code == 200, response.get_data(as_text=True)
    data = response.get_json()
    assert data['status'] == 'cumprida'
    assert data['data_envio_cumprimento'] == date.today().isoformat()


def test_atualizar_condicionante_data_envio(client, db, setup_empresa_licenca):
    """Testa a atualização da data de envio de uma condicionante via PUT."""
    _, licenca_id, _ = setup_empresa_licenca
    res_cond = client.post('/api/condicionantes', json={
        'licenca_id': licenca_id, 'descricao': 'Condicionante para atualizar data envio'
    })
    assert res_cond.status_code == 201, res_cond.get_data(as_text=True)
    cond_id = res_cond.get_json()['id']

    nova_data_envio = (date.today() - timedelta(days=5)).isoformat()

    response = client.put(f'/api/condicionantes/{cond_id}', json={
        'data_envio_cumprimento': nova_data_envio,
        'status': 'cumprida' # É comum atualizar o status junto
    })

    assert response.status_code == 200, response.get_data(as_text=True)
    data = response.get_json()
    assert data['data_envio_cumprimento'] == nova_data_envio
    assert data['status'] == 'cumprida'

    cond_db = db.session.get(Condicionante, cond_id)
    assert cond_db.data_envio_cumprimento.isoformat() == nova_data_envio

def test_listar_condicionantes_por_licenca(client, db, setup_empresa_licenca):
    """Testa a listagem de condicionantes filtradas por licença."""
    empresa_id, licenca_id_1, _ = setup_empresa_licenca

    # Cria outra licença para a mesma empresa
    res_licenca_2 = client.post('/api/licencas', json={
        'empresa_id': empresa_id, 'tipo_licenca': 'LP',
        'data_emissao': (date.today() - timedelta(days=10)).isoformat(), # Adiciona data de emissao
        'data_vencimento': (date.today() + timedelta(days=100)).isoformat()
    })
    assert res_licenca_2.status_code == 201, res_licenca_2.get_data(as_text=True)
    licenca_id_2 = res_licenca_2.get_json()['id']

    # Condicionantes para a primeira licença
    res_c1_l1 = client.post('/api/condicionantes', json={'licenca_id': licenca_id_1, 'descricao': 'Cond 1 Lic 1', 'prazo_dias': 10})
    assert res_c1_l1.status_code == 201, res_c1_l1.get_data(as_text=True)
    res_c2_l1 = client.post('/api/condicionantes', json={'licenca_id': licenca_id_1, 'descricao': 'Cond 2 Lic 1', 'prazo_dias': 20})
    assert res_c2_l1.status_code == 201, res_c2_l1.get_data(as_text=True)
    # Condicionante para a segunda licença
    res_c1_l2 = client.post('/api/condicionantes', json={'licenca_id': licenca_id_2, 'descricao': 'Cond 1 Lic 2', 'prazo_dias': 30})
    assert res_c1_l2.status_code == 201, res_c1_l2.get_data(as_text=True)


    response = client.get(f'/api/condicionantes?licenca_id={licenca_id_1}')
    assert response.status_code == 200, response.get_data(as_text=True)
    data = response.get_json()
    assert len(data) == 2
    # A ordem pode variar, verificar presença
    descricoes_obtidas = [c['descricao'] for c in data]
    assert 'Cond 1 Lic 1' in descricoes_obtidas
    assert 'Cond 2 Lic 1' in descricoes_obtidas
    assert all(c['licenca_id'] == licenca_id_1 for c in data)

def test_obter_condicionante_especifica(client, db, setup_empresa_licenca):
    """Testa obter uma condicionante específica."""
    _, licenca_id, _ = setup_empresa_licenca
    res_post = client.post('/api/condicionantes', json={
        'licenca_id': licenca_id, 'descricao': 'Condicionante Detalhe', 'prazo_dias': 5
    })
    cond_id = res_post.get_json()['id']

    response = client.get(f'/api/condicionantes/{cond_id}')
    assert response.status_code == 200, response.get_data(as_text=True)
    data = response.get_json()
    assert data['id'] == cond_id
    assert data['descricao'] == 'Condicionante Detalhe'
    assert data['licenca']['id'] == licenca_id # Verifica se dados da licença e empresa são incluídos
    assert data['empresa']['cnpj'] == EMPRESA_CNPJ_COND_TEST.replace('.', '').replace('/', '').replace('-', '')
