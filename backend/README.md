# Backend da Aplicação de Licenciamento Ambiental

Este diretório contém o código-fonte para o backend da aplicação de gerenciamento de licenciamento ambiental.

## Configuração do Banco de Dados

A aplicação foi configurada para usar PostgreSQL como banco de dados.

### Ambiente de Desenvolvimento Local

Por padrão, se a variável de ambiente `DATABASE_URL` não estiver definida, a aplicação tentará se conectar a uma instância PostgreSQL usando a seguinte URL externa (exemplo para o Render):

`postgresql://licenciamento_storage_user:yIYbB0o7ula7K0rugmLpi7OttN3DWqsX@dpg-d1i77gre5dus739dl17g-a.virginia-postgres.render.com/licenciamento_storage`

Certifique-se de que o banco de dados esteja acessível a partir do seu ambiente de desenvolvimento se você não definir `DATABASE_URL`.

### Ambiente de Produção (Render)

Quando implantado no Render (ou em qualquer outro ambiente de produção), a aplicação espera que a variável de ambiente `DATABASE_URL` seja configurada com a string de conexão correta para o banco de dados PostgreSQL.

O Render normalmente fornece essa URL automaticamente quando você vincula um serviço de banco de dados PostgreSQL a um serviço web. A aplicação irá priorizar o valor de `DATABASE_URL` se estiver definido.

**Exemplo de configuração no Render:**

No seu serviço web no Render, vá para "Environment" e adicione uma variável de ambiente:

-   **Key**: `DATABASE_URL`
-   **Value**: A URL de conexão fornecida pelo seu serviço de banco de dados PostgreSQL no Render (geralmente a "Internal Connection String" se o backend e o banco estiverem na mesma região do Render, ou a "External Connection String" se necessário).

## Instalação de Dependências

Para instalar as dependências Python, execute:

```bash
pip install -r requirements.txt
```

## Executando os Testes

Para executar os testes (após instalar as dependências, incluindo `pytest`):

```bash
python -m pytest src/tests/
```

## Executando a Aplicação Localmente

Para iniciar o servidor de desenvolvimento Flask:

```bash
python src/main.py
```

A aplicação estará disponível em `http://localhost:5001` por padrão.
