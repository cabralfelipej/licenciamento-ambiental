import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from src.models.user import db
from src.models.licenciamento import Empresa, Licenca, Condicionante, Notificacao
from src.routes.user import user_bp
from src.routes.empresas import empresas_bp
from src.routes.licencas import licencas_bp
from src.routes.condicionantes import condicionantes_bp
from src.routes.calendar import calendar_bp

def create_app(config_overrides=None):
    """Cria e configura uma instância da aplicação Flask."""
    app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
    app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT' # Mantenha ou substitua por uma chave segura

    # Configurações padrão
    database_url = os.environ.get('DATABASE_URL')
    if database_url and database_url.startswith('postgres://'): # Render usa postgres://
        database_url = database_url.replace('postgres://', 'postgresql://', 1)

    app.config.from_mapping(
        SQLALCHEMY_DATABASE_URI=database_url or f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}", # Fallback para SQLite localmente
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        UPLOAD_FOLDER=os.path.join(os.path.dirname(__file__), 'uploads') # Pasta padrão para uploads
    )

    # Sobrescreve com configurações específicas (para testes, por exemplo)
    if config_overrides:
        app.config.from_mapping(config_overrides)

    # Habilita CORS para todas as rotas
    CORS(app)

    # Registra blueprints
    app.register_blueprint(user_bp, url_prefix='/api')
    app.register_blueprint(empresas_bp, url_prefix='/api')
    app.register_blueprint(licencas_bp, url_prefix='/api')
    app.register_blueprint(condicionantes_bp, url_prefix='/api')
    app.register_blueprint(calendar_bp, url_prefix='/api')

    # Inicializa o banco de dados
    db.init_app(app)
    with app.app_context():
        db.create_all()
        # Cria a pasta de uploads se não existir
        if not os.path.exists(app.config['UPLOAD_FOLDER']):
            os.makedirs(app.config['UPLOAD_FOLDER'])

        comprovantes_folder = os.path.join(app.config['UPLOAD_FOLDER'], 'comprovantes')
        if not os.path.exists(comprovantes_folder):
            os.makedirs(comprovantes_folder)


    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        static_folder_path = app.static_folder
        if static_folder_path is None:
                return "Static folder not configured", 404

        if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
            return send_from_directory(static_folder_path, path)
        else:
            index_path = os.path.join(static_folder_path, 'index.html')
            if os.path.exists(index_path):
                return send_from_directory(static_folder_path, 'index.html')
            else:
                return "index.html not found", 404

    return app

app = create_app()

if __name__ == '__main__':
    # Garante que a pasta de uploads principal e a de comprovantes existem ao rodar diretamente
    # Embora já seja feito no create_app, é uma garantia extra ao rodar `python src/main.py`
    upload_dir = app.config.get('UPLOAD_FOLDER', os.path.join(os.path.dirname(__file__), 'uploads'))
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)

    comprovantes_dir = os.path.join(upload_dir, 'comprovantes')
    if not os.path.exists(comprovantes_dir):
        os.makedirs(comprovantes_dir)

    app.run(host='0.0.0.0', port=5001, debug=True)
