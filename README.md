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

Usuários podem abrir chamados, acompanhar suas solicitações e interagir através de mensagens. O sistema será expandido para permitir que equipes de suporte e gestores realizem o atendimento, atribuição e gerenciamento dos chamados.

## Arquitetura

O back-end utiliza separação de responsabilidades entre rotas, controllers, services, middlewares, configurações e camada de banco de dados.

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
- `services/` — regras de negócio e acesso ao banco de dados
- `middlewares/` — autenticação e controles de acesso
- `database/` — conexão e estrutura do PostgreSQL
- `config/` — configurações da aplicação
- `app.js` — configuração do Express
- `server.js` — inicialização do servidor

## Funcionalidades

### Implementadas

- [x] Cadastro de usuários
- [x] Hash de senhas com bcrypt
- [x] Autenticação por e-mail e senha
- [x] Sessão de usuário
- [x] Cookie de sessão HTTP-only
- [x] Middleware de autenticação
- [x] Consulta do usuário autenticado
- [x] Logout
- [x] Abertura de chamados
- [x] Associação automática do chamado ao usuário autenticado
- [x] Listagem dos chamados do usuário
- [x] Visualização individual de chamados
- [x] Envio de mensagens dentro dos chamados
- [x] Listagem do histórico de mensagens
- [x] Identificação do usuário responsável por cada mensagem

### Planejadas

- [ ] Controle de acesso por perfil
- [ ] Perfil de usuário comum
- [ ] Perfil de suporte de TI
- [ ] Perfil de gerência de TI
- [ ] Atualização do status dos chamados
- [ ] Atribuição de chamados aos técnicos
- [ ] Alteração de prioridade
- [ ] Gerenciamento de categorias
- [ ] Área administrativa
- [ ] Filtros e busca
- [ ] Dashboard
- [ ] Métricas de atendimento
- [ ] Persistência das sessões no PostgreSQL
- [ ] Interface web

## Modelo de acesso planejado

O TicketFlow utilizará controle de acesso baseado em papéis.

### `user`

Usuário comum do sistema.

Permissões planejadas:

- Criar chamados
- Visualizar os próprios chamados
- Visualizar mensagens
- Enviar mensagens

### `support`

Equipe responsável pelo atendimento dos chamados.

Permissões planejadas:

- Visualizar chamados disponíveis ou atribuídos
- Assumir chamados
- Responder usuários
- Alterar status durante o atendimento

### `manager`

Responsável pela gestão da operação de suporte.

Permissões planejadas:

- Visualizar todos os chamados
- Atribuir e reatribuir responsáveis
- Alterar prioridades
- Alterar status
- Acompanhar métricas e operação da equipe

> O controle de permissões por perfil ainda está em desenvolvimento.

## Fluxo planejado dos chamados

```text
open
  ↓
in_progress
  ↓
waiting_user
  ↓
resolved
  ↓
closed
```

- `open` — chamado aberto e aguardando atendimento
- `in_progress` — chamado em atendimento
- `waiting_user` — aguardando retorno do usuário
- `resolved` — problema solucionado
- `closed` — chamado encerrado

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

Armazena os chamados registrados no sistema.

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
- Cada mensagem pertence a um chamado.
- Cada mensagem é associada ao usuário que a enviou.

## Endpoints disponíveis

### Usuários

#### Cadastrar usuário

```http
POST /api/users
```

---

### Autenticação

#### Login

```http
POST /api/auth/login
```

#### Usuário autenticado

```http
GET /api/auth/me
```

#### Logout

```http
POST /api/auth/logout
```

---

### Chamados

#### Criar chamado

```http
POST /api/tickets
```

#### Listar chamados do usuário

```http
GET /api/tickets
```

#### Visualizar chamado específico

```http
GET /api/tickets/:id
```

---

### Mensagens dos chamados

#### Adicionar mensagem

```http
POST /api/tickets/:ticketId/messages
```

#### Listar mensagens

```http
GET /api/tickets/:ticketId/messages
```

## Segurança

Algumas medidas já implementadas:

- Senhas não são armazenadas em texto puro
- Hash de senhas utilizando bcrypt
- Credenciais armazenadas em variáveis de ambiente
- `.env` não é versionado
- Cookies de sessão configurados como `HttpOnly`
- Rotas privadas protegidas por middleware de autenticação
- O usuário responsável por um chamado é obtido diretamente da sessão
- O autor de uma mensagem é obtido diretamente da sessão
- Usuários comuns só conseguem consultar chamados associados às suas contas

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

Inicie o servidor:

```bash
npm run dev
```

Por padrão, a aplicação será executada em:

```text
http://localhost:3000
```

## Status do projeto

🚧 **Em desenvolvimento**

Atualmente o TicketFlow possui:

- Cadastro de usuários
- Autenticação e sessões
- Proteção de rotas
- Gerenciamento básico de chamados
- Histórico de mensagens dentro dos chamados

A próxima etapa será implementar o **controle de acesso por perfil**, preparando os papéis `user`, `support` e `manager`.

## Autor

Desenvolvido por **Enzo Barbierato**.