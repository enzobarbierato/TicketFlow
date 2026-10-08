# TicketFlow

O **TicketFlow** é um sistema web de gerenciamento de chamados desenvolvido para facilitar a abertura, o acompanhamento e a resolução de solicitações de suporte.

O projeto está sendo desenvolvido com foco em organização, segurança, separação de responsabilidades e boas práticas de desenvolvimento.

## Tecnologias

- Node.js
- Express
- PostgreSQL
- JavaScript
- HTML
- CSS
- bcrypt
- express-session

## Objetivo

O TicketFlow tem como objetivo centralizar solicitações de suporte em uma aplicação organizada.

Usuários poderão abrir e acompanhar chamados, enquanto a equipe responsável poderá gerenciar prioridades, status, responsáveis e interações durante o atendimento.

## Arquitetura

O back-end está organizado com separação de responsabilidades entre rotas, controllers, services, middlewares e camada de banco de dados.

```text
src/
├── config/
├── controllers/
├── database/
├── middlewares/
├── routes/
├── services/
├── app.js
└── server.js
```

### Responsabilidades

- `routes/` — definição dos endpoints da API
- `controllers/` — tratamento das requisições e respostas HTTP
- `services/` — regras de negócio e acesso ao banco
- `middlewares/` — autenticação e controles intermediários
- `database/` — conexão e estrutura do PostgreSQL
- `config/` — configurações da aplicação
- `app.js` — configuração do Express
- `server.js` — inicialização do servidor

## Funcionalidades

### Implementadas

- [x] Cadastro de usuários
- [x] Hash seguro de senhas com bcrypt
- [x] Autenticação por e-mail e senha
- [x] Sessão de usuário
- [x] Cookie de sessão HTTP-only
- [x] Middleware de autenticação
- [x] Consulta do usuário autenticado
- [x] Logout
- [x] Abertura de chamados
- [x] Associação automática do chamado ao usuário autenticado

### Planejadas

- [ ] Listagem dos chamados do usuário
- [ ] Visualização individual de chamados
- [ ] Sistema de mensagens nos chamados
- [ ] Atualização de status
- [ ] Atribuição de responsável
- [ ] Gerenciamento de prioridade
- [ ] Área administrativa
- [ ] Filtros e busca
- [ ] Dashboard
- [ ] Persistência das sessões no PostgreSQL
- [ ] Interface web

## Banco de dados

O TicketFlow utiliza **PostgreSQL**.

A estrutura inicial do banco pode ser recriada através do arquivo:

```text
src/database/schema.sql
```

Atualmente o banco possui três tabelas principais.

### `users`

Armazena os usuários do sistema.

Principais campos:

- `id`
- `name`
- `email`
- `password_hash`
- `department`
- `job_title`
- `role`
- `created_on`
- `created_by`

### `tickets`

Armazena os chamados.

Principais campos:

- `id`
- `title`
- `description`
- `category`
- `priority`
- `status`
- `created_by`
- `assigned_to`
- `created_on`
- `updated_on`
- `closed_on`

### `ticket_messages`

Armazena as interações realizadas dentro dos chamados.

Principais campos:

- `id`
- `ticket_id`
- `user_id`
- `message`
- `created_on`

## Relacionamentos

- Um usuário pode criar vários chamados.
- Um chamado pertence ao usuário que o criou.
- Um chamado pode ser atribuído a outro usuário.
- Um chamado pode possuir várias mensagens.
- Cada mensagem pertence a um chamado e a um usuário.

## Endpoints disponíveis

### Usuários

```text
POST /api/users
```

Cadastra um novo usuário.

### Autenticação

```text
POST /api/auth/login
```

Autentica um usuário e cria uma sessão.

```text
GET /api/auth/me
```

Retorna o usuário atualmente autenticado.

```text
POST /api/auth/logout
```

Encerra a sessão atual.

### Chamados

```text
POST /api/tickets
```

Cria um novo chamado associado ao usuário autenticado.

## Executando o projeto

Clone o repositório:

```bash
git clone https://github.com/enzobarbierato/TicketFlow.git
```

Entre na pasta:

```bash
cd TicketFlow
```

Instale as dependências:

```bash
npm install
```

Crie um arquivo `.env` baseado no `.env.example`.

Exemplo:

```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=sua_chave_de_sessao

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticketflow
DB_USER=admflow
DB_PASSWORD=sua_senha
```

Crie a estrutura do banco:

```bash
psql -h localhost -U admflow -d ticketflow -f src/database/schema.sql
```

Inicie o servidor em modo de desenvolvimento:

```bash
npm run dev
```

A aplicação será executada por padrão em:

```text
http://localhost:3000
```

## Segurança

Algumas medidas já implementadas:

- Senhas não são armazenadas em texto puro.
- Hash de senhas utilizando bcrypt.
- Credenciais sensíveis armazenadas no `.env`.
- `.env` não é versionado.
- Cookies de sessão configurados como `HttpOnly`.
- Rotas protegidas por middleware de autenticação.
- O usuário responsável pela criação de um chamado é obtido diretamente da sessão.

## Status

🚧 **Em desenvolvimento**

Atualmente, o TicketFlow possui cadastro, autenticação, controle de sessão e abertura de chamados funcionando.

A próxima etapa será implementar a listagem e o gerenciamento dos chamados.

## Autor

Desenvolvido por **Enzo Barbierato**.