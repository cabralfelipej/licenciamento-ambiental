import pytest
from src.main import create_app
from src.models.user import db as _db
import tempfile
import os

@pytest.fixture(scope='session')
def app():
    """Cria uma instância da aplicação Flask para testes."""
    # Cria um arquivo de banco de dados temporário para testes
    db_fd, db_path = tempfile.mkstemp(suffix='.db')

    app = create_app({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path}',
        'SQLALCHEMY_TRACK_MODIFICATIONS': False,
        'UPLOAD_FOLDER': tempfile.mkdtemp(), # Pasta temporária para uploads
        'WTF_CSRF_ENABLED': False, # Desabilitar CSRF para testes de formulário mais simples
        'LOGIN_DISABLED': True # Se você tiver autenticação, pode querer desabilitá-la para alguns testes
    })

    with app.app_context():
        _db.create_all()

    yield app

    # Limpeza após os testes
    with app.app_context(): # Adiciona contexto de aplicação para limpeza
        _db.session.remove()
        _db.drop_all()

    os.close(db_fd)
    os.unlink(db_path)
    # Limpar pasta de upload
    for root, dirs, files in os.walk(app.config['UPLOAD_FOLDER'], topdown=False):
        for name in files:
            os.remove(os.path.join(root, name))
        for name in dirs:
            os.rmdir(os.path.join(root, name))
    os.rmdir(app.config['UPLOAD_FOLDER'])


@pytest.fixture
def client(app):
    """Um cliente de teste para a aplicação."""
    return app.test_client()

@pytest.fixture
def db(app):
    """Sessão do banco de dados para testes, com limpeza antes de cada teste."""
    with app.app_context():
        # Limpa todas as tabelas antes de cada teste
        # Isso é destrutivo, mas garante isolamento para a maioria dos casos de teste.
        # Para performance em suítes grandes, transações podem ser uma alternativa.
        _db.session.remove()
        _db.drop_all()
        _db.create_all()
        yield _db

@pytest.fixture
def runner(app):
    """Um runner de comandos CLI para a aplicação, se você tiver comandos Flask."""
    return app.test_cli_runner()

# Adicionar aqui fixtures específicas para criar dados de teste (empresas, licenças, etc.)
# Exemplo:
# from src.models.licenciamento import Empresa
# @pytest.fixture
# def nova_empresa(db):
#     empresa = Empresa(razao_social="Empresa Teste", cnpj="12345678000199")
#     db.session.add(empresa)
#     db.session.commit()
#     return empresa
