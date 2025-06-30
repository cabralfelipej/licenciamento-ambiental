import pytest
import json
from datetime import date, timedelta, datetime
from src.models.licenciamento import Empresa, Licenca, Condicionante

# Usar CNPJs "Padrão Ouro"
EMPRESA_CNPJ_LIC_TEST = "33.000.167/0001-01" # CNPJ_PETRO
EMPRESA_CNPJ_LIC_TEST_2 = "33.592.510/0001-54" # CNPJ_VALE


@pytest.fixture
def setup_empresa_para_licenca(client, db):
    """Cria uma empresa para ser usada nos testes de licença."""
    response = client.post('/api/empresas', json={
        'razao_social': 'Empresa Teste Licenças',
        'cnpj': EMPRESA_CNPJ_LIC_TEST
    })
    assert response.status_code == 201, response.get_data(as_text=True)
    return response.get_json()['id']

def test_criar_licenca_sucesso(client, db, setup_empresa_para_licenca):
    """Testa a criação de uma licença com sucesso."""
    empresa_id = setup_empresa_para_licenca
    data_emissao = (date.today() - timedelta(days=10)).isoformat()
    data_vencimento = (date.today() + timedelta(days=355)).isoformat()

    response = client.post('/api/licencas', json={
        'empresa_id': empresa_id,
        'tipo_licenca': 'Licença Prévia',
        'numero_licenca': 'LP001',
        'data_emissao': data_emissao,
        'data_vencimento': data_vencimento,
        'orgao_emissor': 'SEC Municipal'
    })
    assert response.status_code == 201, response.get_data(as_text=True)
    data = response.get_json()
    assert data['empresa_id'] == empresa_id
    assert data['tipo_licenca'] == 'Licença Prévia'
    assert data['numero_licenca'] == 'LP001'
    assert data['data_emissao'] == data_emissao
    assert data['data_vencimento'] == data_vencimento
    assert data['status'] == 'ativa' # default

    licenca_db = db.session.get(Licenca, data['id'])
    assert licenca_db is not None

def test_obter_licenca_com_condicionantes_ordenadas(client, db, setup_empresa_para_licenca):
    """Testa obter uma licença e suas condicionantes, verificando a ordenação."""
    empresa_id = setup_empresa_para_licenca
    res_lic = client.post('/api/licencas', json={
        'empresa_id': empresa_id, 'tipo_licenca': 'LO Teste',
        'data_emissao': (date.today() - timedelta(days=1)).isoformat(), # Adicionar data_emissao para cálculo de data_limite
        'data_vencimento': (date.today() + timedelta(days=100)).isoformat()
    })
    assert res_lic.status_code == 201, res_lic.get_data(as_text=True)
    licenca_id = res_lic.get_json()['id']

    # Adiciona condicionantes com datas limite diferentes e uma sem data limite (prazo_dias)
    # A ordem de criação não deve influenciar a ordem de retorno
    res_cond_c = client.post('/api/condicionantes', json={
        'licenca_id': licenca_id, 'descricao': 'Condicionante C (mais antiga)',
        'data_limite': (date.today() + timedelta(days=30)).isoformat() # Mais antiga
    })
    assert res_cond_c.status_code == 201, res_cond_c.get_data(as_text=True)

    res_cond_a = client.post('/api/condicionantes', json={
        'licenca_id': licenca_id, 'descricao': 'Condicionante A (mais recente)',
        'data_limite': (date.today() + timedelta(days=10)).isoformat() # Mais recente
    })
    assert res_cond_a.status_code == 201, res_cond_a.get_data(as_text=True)

    res_cond_b = client.post('/api/condicionantes', json={
        'licenca_id': licenca_id, 'descricao': 'Condicionante B (intermediária)',
        'data_limite': (date.today() + timedelta(days=20)).isoformat() # Intermediária
    })
    assert res_cond_b.status_code == 201, res_cond_b.get_data(as_text=True)

    # Condicionante com prazo_dias (data_limite será data_emissao_licenca + 5 dias)
    # data_emissao_licenca foi ontem, então data_limite será daqui a 4 dias.
    res_cond_prazo = client.post('/api/condicionantes', json={
        'licenca_id': licenca_id, 'descricao': 'Condicionante Prazo (5 dias da emissão)',
        'prazo_dias': 5
    })
    assert res_cond_prazo.status_code == 201, res_cond_prazo.get_data(as_text=True)


    response = client.get(f'/api/licencas/{licenca_id}')
    assert response.status_code == 200, response.get_data(as_text=True)
    data = response.get_json()

    assert 'condicionantes' in data
    condicionantes_retornadas = data['condicionantes']
    assert len(condicionantes_retornadas) == 4

    # Verifica a ordem (data_limite ascendente, nulls last, then by id)
    # O endpoint /licencas/{id} usa: sorted(licenca.condicionantes, key=lambda c: c.data_limite if c.data_limite else date.max)

    descricoes_esperadas_ordenadas = [
        'Condicionante Prazo (5 dias da emissão)', # (ontem + 5 dias) = 4 dias a partir de hoje
        'Condicionante A (mais recente)',         # 10 dias a partir de hoje
        'Condicionante B (intermediária)',        # 20 dias a partir de hoje
        'Condicionante C (mais antiga)',          # 30 dias a partir de hoje
    ]
    descricoes_obtidas = [c['descricao'] for c in condicionantes_retornadas]

    # print("Obtidas (test_obter_licenca_com_condicionantes_ordenadas):", descricoes_obtidas) # Para debug
    # print("Esperadas:", descricoes_esperadas_ordenadas)

    assert descricoes_obtidas == descricoes_esperadas_ordenadas, \
        f"Ordenação incorreta. Esperado: {descricoes_esperadas_ordenadas}, Obtido: {descricoes_obtidas}"

    # Verifica se as datas estão em ordem crescente.
    datas_limite_obtidas = [datetime.strptime(c['data_limite'], '%Y-%m-%d').date() for c in condicionantes_retornadas if c['data_limite']]
    assert all(datas_limite_obtidas[i] <= datas_limite_obtidas[i+1] for i in range(len(datas_limite_obtidas)-1)), \
        f"Datas limite não estão ordenadas: {datas_limite_obtidas}"


def test_listar_condicionantes_de_licenca_ordenadas(client, db, setup_empresa_para_licenca):
    """Testa a rota /licencas/{id}/condicionantes verificando a ordenação."""
    empresa_id = setup_empresa_para_licenca
    data_emissao_licenca = date.today() # Para cálculo da data_limite da cond_b_res
    res_lic = client.post('/api/licencas', json={
        'empresa_id': empresa_id, 'tipo_licenca': 'LO Cond Ordenadas',
        'data_emissao': data_emissao_licenca.isoformat(),
        'data_vencimento': (date.today() + timedelta(days=100)).isoformat()
    })
    assert res_lic.status_code == 201, res_lic.get_data(as_text=True)
    licenca_id = res_lic.get_json()['id']

    # Adiciona condicionantes
    cond_c_res = client.post('/api/condicionantes', json={ # Data limite: hoje + 30 dias
        'licenca_id': licenca_id, 'descricao': 'Cond C - Data Antiga',
        'data_limite': (date.today() + timedelta(days=30)).isoformat()
    })
    assert cond_c_res.status_code == 201, cond_c_res.get_data(as_text=True)

    cond_a_res = client.post('/api/condicionantes', json={ # Data limite: hoje + 10 dias
        'licenca_id': licenca_id, 'descricao': 'Cond A - Data Recente',
        'data_limite': (date.today() + timedelta(days=10)).isoformat()
    })
    assert cond_a_res.status_code == 201, cond_a_res.get_data(as_text=True)

    cond_b_res = client.post('/api/condicionantes', json={ # Data limite: data_emissao_licenca + 15 dias = hoje + 15 dias
        'licenca_id': licenca_id, 'descricao': 'Cond B - Prazo Dias',
        'prazo_dias': 15
    })
    assert cond_b_res.status_code == 201, cond_b_res.get_data(as_text=True)

    id_cond_a = cond_a_res.get_json()['id']
    id_cond_b = cond_b_res.get_json()['id']
    id_cond_c = cond_c_res.get_json()['id']

    response = client.get(f'/api/licencas/{licenca_id}/condicionantes')
    assert response.status_code == 200, response.get_data(as_text=True)
    condicionantes_retornadas = response.get_json()

    assert len(condicionantes_retornadas) == 3

    descricoes_obtidas = [c['descricao'] for c in condicionantes_retornadas]
    # print(f"Obtidas (test_listar_condicionantes_de_licenca_ordenadas): {descricoes_obtidas}")
    # print(f"Datas limite obtidas: {[c['data_limite'] for c in condicionantes_retornadas]}")

    # Ordenação esperada pela rota: data_limite.asc().nullslast(), Condicionante.id.asc()
    # Cond A (10 dias), Cond B (15 dias), Cond C (30 dias)
    assert descricoes_obtidas[0] == 'Cond A - Data Recente'
    assert condicionantes_retornadas[0]['id'] == id_cond_a

    assert descricoes_obtidas[1] == 'Cond B - Prazo Dias'
    assert condicionantes_retornadas[1]['id'] == id_cond_b

    assert descricoes_obtidas[2] == 'Cond C - Data Antiga'
    assert condicionantes_retornadas[2]['id'] == id_cond_c

def test_listar_licencas_filtros(client, db, setup_empresa_para_licenca):
    """Testa os filtros da listagem de licenças."""
    empresa_id_1 = setup_empresa_para_licenca
    # Cria outra empresa (precisa de CNPJ válido diferente)
    res_empresa_2 = client.post('/api/empresas', json={'razao_social': 'Outra Empresa Lic', 'cnpj': EMPRESA_CNPJ_LIC_TEST_2})
    assert res_empresa_2.status_code == 201, f"Falha ao criar empresa 2: {res_empresa_2.get_data(as_text=True)}"

    response_data_empresa_2 = res_empresa_2.get_json()
    # print(f"Resposta ao criar empresa 2: {response_data_empresa_2}") # Linha de depuração
    assert response_data_empresa_2 is not None, "JSON da empresa 2 é None"
    assert 'id' in response_data_empresa_2, f"ID não encontrado na resposta da empresa 2: {response_data_empresa_2}"
    empresa_id_2 = response_data_empresa_2['id']

    # Licenças para empresa 1
    client.post('/api/licencas', json={'empresa_id': empresa_id_1, 'tipo_licenca': 'LO', 'status': 'ativa', 'data_vencimento': '2025-01-01'})
    client.post('/api/licencas', json={'empresa_id': empresa_id_1, 'tipo_licenca': 'LP', 'status': 'vencida', 'data_vencimento': '2023-01-01'})
    # Licenças para empresa 2
    client.post('/api/licencas', json={'empresa_id': empresa_id_2, 'tipo_licenca': 'LI', 'status': 'ativa', 'data_vencimento': '2025-06-01'})

    # Filtro por empresa_id
    response = client.get(f'/api/licencas?empresa_id={empresa_id_1}')
    assert response.status_code == 200, response.get_data(as_text=True)
    data = response.get_json()
    assert len(data) == 2
    assert all(l['empresa_id'] == empresa_id_1 for l in data)

    # Filtro por status
    response = client.get('/api/licencas?status=ativa')
    assert response.status_code == 200, response.get_data(as_text=True)
    data = response.get_json()
    assert len(data) == 2 # Uma da empresa 1, uma da empresa 2
    assert all(l['status'] == 'ativa' for l in data)

    # Filtro por empresa_id e status
    response = client.get(f'/api/licencas?empresa_id={empresa_id_1}&status=ativa')
    assert response.status_code == 200, response.get_data(as_text=True)
    data = response.get_json()
    assert len(data) == 1
    assert data[0]['empresa_id'] == empresa_id_1
    assert data[0]['status'] == 'ativa'
    assert data[0]['tipo_licenca'] == 'LO'

# Adicionar mais testes para atualização, deleção de licenças, etc.
# Teste de deleção de licença com condicionantes (deve deletar em cascata)
# Teste de dias_para_vencimento no to_dict
