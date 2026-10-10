# TicketFlow

O **TicketFlow** é um sistema web de gerenciamento de chamados desenvolvido para centralizar a abertura, o acompanhamento e a resolução de solicitações de suporte.

O projeto está sendo construído com foco em organização, segurança, controle de acesso, separação de responsabilidades e boas práticas de desenvolvimento de APIs.

## Tecnologias

- Node.js
- Express
- PostgreSQL
- JavaScript
- HTML e CSS — frontend planejado
- bcrypt
- express-session
- connect-pg-simple

## Objetivo

O TicketFlow permite que usuários registrem solicitações de suporte e acompanhem seus atendimentos.

A aplicação possui diferentes níveis de acesso:

- Usuário comum
- Suporte de TI
- Gerência de TI

Cada perfil possui permissões específicas dentro do sistema.

## Arquitetura

O backend utiliza uma arquitetura baseada em separação de responsabilidades.

```text
src/
├── config/
│   └── session.js
├── controllers/
│   ├── authController.js
│   ├── categoriesController.js
│   ├── dashboardController.js
│   ├── ticketMessagesController.js
│   ├── ticketsController.js
│   └── usersController.js
├── database/
│   ├── connection.js
│   └── schema.sql
├── middlewares/
│   ├── requireAuth.js
│   ├── requireRole.js
│   └── validateIdParam.js
├── routes/
│   ├── authRoutes.js
│   ├── categoriesRoutes.js
│   ├── dashboardRoutes.js
│   ├── ticketMessagesRoutes.js
│   ├── ticketsRoutes.js
│   └── usersRoutes.js
├── services/
│   ├── authService.js
│   ├── categoriesService.js
│   ├── dashboardService.js
│   ├── ticketMessagesService.js
│   ├── ticketStatusService.js
│   ├── ticketsService.js
│   └── usersService.js
├── utils/
│   └── validators.js
├── app.js
└── server.js
```

### Responsabilidades

- `routes/` — definição dos endpoints da API
- `controllers/` — tratamento das requisições e respostas HTTP
- `services/` — regras de negócio e operações no banco
- `middlewares/` — autenticação, autorização e validações das rotas
- `database/` — conexão e estrutura do PostgreSQL
- `config/` — configurações da aplicação
- `utils/` — funções reutilizáveis de validação
- `app.js` — configuração do Express
- `server.js` — inicialização da aplicação

## Perfis de acesso

O TicketFlow utiliza controle de acesso baseado em papéis — RBAC.

### `user`

Usuário comum.

Pode:

- Criar chamados
- Visualizar os próprios chamados
- Pesquisar e filtrar seus chamados
- Visualizar mensagens dos próprios chamados
- Enviar mensagens enquanto o chamado estiver aberto
- Consultar categorias disponíveis

### `support`

Equipe de suporte de TI.

Pode:

- Visualizar chamados ainda sem responsável
- Visualizar chamados atribuídos a ele
- Assumir chamados disponíveis
- Alterar o status dos chamados sob sua responsabilidade
- Visualizar e enviar mensagens nos chamados acessíveis
- Consultar o dashboard operacional do suporte

Um suporte não pode acessar ou alterar chamados atribuídos a outro técnico.

### `manager`

Gerência de TI.

Pode:

- Visualizar todos os chamados
- Filtrar e pesquisar todos os chamados
- Atribuir ou reatribuir chamados para técnicos de suporte
- Alterar prioridades
- Alterar status
- Visualizar técnicos de suporte
- Criar categorias
- Renomear categorias
- Ativar e desativar categorias

O dashboard operacional é exclusivo do perfil `support`.

## Funcionalidades implementadas

### Usuários

- [x] Cadastro de usuários
- [x] Hash de senha com bcrypt
- [x] Validação de nome
- [x] Validação básica de e-mail
- [x] Validação de senha
- [x] Validação de departamento
- [x] Validação de cargo
- [x] Normalização de campos antes do armazenamento
- [x] Listagem de técnicos de suporte para gerência

### Autenticação

- [x] Login
- [x] Logout
- [x] Consulta do usuário autenticado
- [x] Sessões com `express-session`
- [x] Sessões persistentes no PostgreSQL
- [x] Cookies `HttpOnly`
- [x] Middleware de autenticação
- [x] Controle de acesso por perfil

### Chamados

- [x] Abertura de chamados
- [x] Associação automática ao usuário autenticado
- [x] Visualização individual
- [x] Listagem baseada no perfil
- [x] Atribuição de chamados ao suporte
- [x] Atribuição e reatribuição pela gerência
- [x] Alteração de prioridade
- [x] Alteração de status
- [x] Fluxo controlado de transição de status
- [x] Validação de prioridade
- [x] Validação de categoria
- [x] Controle de acesso ao chamado
- [x] Busca textual
- [x] Filtros
- [x] Paginação

### Mensagens

- [x] Envio de mensagens
- [x] Histórico de mensagens
- [x] Identificação do autor da mensagem
- [x] Controle de acesso às mensagens
- [x] Validação de conteúdo
- [x] Limite de tamanho
- [x] Bloqueio de novas mensagens em chamados fechados

### Categorias

- [x] Tabela própria de categorias
- [x] Associação relacional com chamados
- [x] Listagem de categorias ativas
- [x] Criação pela gerência
- [x] Edição do nome
- [x] Ativação e desativação
- [x] Validação de tamanho
- [x] Unicidade sem diferenciar maiúsculas e minúsculas

### Dashboard

- [x] Dashboard operacional exclusivo para suporte
- [x] Chamados disponíveis
- [x] Chamados atribuídos ao técnico
- [x] Chamados em andamento
- [x] Chamados aguardando usuário
- [x] Chamados críticos
- [x] Chamados resolvidos

## Fluxo dos chamados

O TicketFlow utiliza uma máquina de estados para impedir transições incoerentes.

```text
open
  ↓
in_progress
  ↓
waiting_user
  ↕
in_progress
  ↓
resolved
  ↓
closed
```

Transições permitidas:

```text
open
→ in_progress

in_progress
→ waiting_user
→ resolved

waiting_user
→ in_progress
→ resolved

resolved
→ in_progress
→ closed

closed
→ estado final
```

Chamados com status `closed` não podem receber novas mensagens nem voltar para atendimento.

## Prioridades

Os chamados aceitam:

```text
low
medium
high
critical
```

A prioridade pode ser alterada apenas pela gerência.

## Categorias

As categorias são armazenadas separadamente na tabela `categories`.

Exemplo:

```text
categories
├── 1 | Acesso
├── 2 | Hardware e Periféricos
└── ...
```

Os chamados armazenam:

```text
category_id
```

e não o nome diretamente.

Isso permite alterar o nome ou desativar uma categoria sem quebrar chamados antigos.

Categorias desativadas:

- continuam associadas aos chamados existentes
- não aparecem na listagem para abertura de novos chamados
- não podem ser utilizadas em novos chamados

## Banco de dados

O TicketFlow utiliza PostgreSQL.

O banco possui atualmente as seguintes tabelas principais:

### `users`

Armazena usuários.

Principais campos:

```text
id
name
email
password_hash
department
job_title
role
created_on
created_by
```

### `categories`

Armazena categorias de chamados.

```text
id
name
active
created_on
```

Os nomes são únicos sem diferenciação entre maiúsculas e minúsculas.

### `tickets`

Armazena os chamados.

```text
id
title
description
category_id
priority
status
created_by
assigned_to
created_on
updated_on
closed_on
```

### `ticket_messages`

Armazena as interações dos chamados.

```text
id
ticket_id
user_id
message
created_on
```

### `user_sessions`

Armazena as sessões persistentes.

```text
sid
sess
expire
```

## Integridade do banco

O PostgreSQL também protege regras importantes.

### Roles válidas

```text
user
support
manager
```

### Prioridades válidas

```text
low
medium
high
critical
```

### Status válidos

```text
open
in_progress
waiting_user
resolved
closed
```

Também existem:

- Foreign keys
- Índices
- Constraints `CHECK`
- Unicidade de e-mail
- Unicidade case-insensitive de categorias
- Exclusão em cascata das mensagens quando necessário

## API

### Usuários

Criar usuário:

```http
POST /api/users
```

Listar técnicos de suporte:

```http
GET /api/users/support
```

Acesso: `manager`

---

### Autenticação

Login:

```http
POST /api/auth/login
```

Usuário autenticado:

```http
GET /api/auth/me
```

Logout:

```http
POST /api/auth/logout
```

---

### Chamados

Criar chamado:

```http
POST /api/tickets
```

Listar chamados:

```http
GET /api/tickets
```

Visualizar chamado:

```http
GET /api/tickets/:id
```

Alterar status:

```http
PATCH /api/tickets/:id/status
```

Acesso:

```text
support
manager
```

O suporte só pode alterar chamados atribuídos a ele.

Alterar prioridade:

```http
PATCH /api/tickets/:id/priority
```

Acesso:

```text
manager
```

Assumir chamado:

```http
PATCH /api/tickets/:id/assign
```

Acesso:

```text
support
```

Atribuir chamado a um técnico:

```http
PATCH /api/tickets/:id/assign-user
```

Acesso:

```text
manager
```

---

### Mensagens

Listar mensagens:

```http
GET /api/tickets/:ticketId/messages
```

Enviar mensagem:

```http
POST /api/tickets/:ticketId/messages
```

Chamados fechados permanecem disponíveis para consulta, mas não aceitam novas mensagens.

---

### Categorias

Listar categorias ativas:

```http
GET /api/categories
```

Criar categoria:

```http
POST /api/categories
```

Acesso:

```text
manager
```

Alterar nome:

```http
PATCH /api/categories/:id
```

Acesso:

```text
manager
```

Ativar ou desativar:

```http
PATCH /api/categories/:id/status
```

Acesso:

```text
manager
```

---

### Dashboard

Dashboard operacional:

```http
GET /api/dashboard
```

Acesso exclusivo:

```text
support
```

## Filtros e busca

A listagem de chamados aceita filtros opcionais.

### Status

```http
GET /api/tickets?status=open
```

### Prioridade

```http
GET /api/tickets?priority=critical
```

### Categoria

```http
GET /api/tickets?category_id=1
```

### Busca textual

```http
GET /api/tickets?search=email
```

A busca considera:

- título
- descrição
- nome da categoria

### Filtros combinados

```http
GET /api/tickets?status=open&priority=high&category_id=1
```

Os filtros sempre respeitam as permissões do usuário autenticado.

## Paginação

A listagem de chamados utiliza paginação.

```http
GET /api/tickets?page=1&limit=10
```

Valores padrão:

```text
page = 1
limit = 10
```

O limite máximo permitido é:

```text
100 registros por página
```

Exemplo de resposta:

```json
{
  "tickets": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "total_pages": 3
  }
}
```

Paginação e filtros podem ser combinados:

```http
GET /api/tickets?status=open&page=2&limit=10
```

## Segurança

Medidas já implementadas:

- Hash de senhas com bcrypt
- Senhas nunca retornadas pela API
- Variáveis sensíveis armazenadas no `.env`
- `.env` ignorado pelo Git
- Cookies `HttpOnly`
- Sessões persistentes no PostgreSQL
- Middleware de autenticação
- RBAC
- Autorização por propriedade e atribuição
- Queries parametrizadas
- Validação de IDs
- Validação de entradas
- Validação de transição de status
- Constraints no PostgreSQL
- Proteção contra categorias duplicadas
- Limitação de acesso entre técnicos de suporte

## Validações

A aplicação possui validadores reutilizáveis em:

```text
src/utils/validators.js
```

Entre as validações existentes:

- Strings vazias
- Strings contendo somente espaços
- E-mail
- Senhas
- IDs positivos
- Prioridades
- Status
- Categorias
- Paginação
- Limites de tamanho

IDs inválidos como:

```text
/api/tickets/abc
/api/tickets/-1
/api/categories/banana
```

são recusados antes de chegar ao PostgreSQL.

## Sessões

As sessões utilizam:

```text
express-session
+
connect-pg-simple
+
PostgreSQL
```

Isso significa que o usuário permanece autenticado mesmo que o processo Node.js seja reiniciado, desde que a sessão ainda seja válida.

## Executando o projeto

Clone:

```bash
git clone https://github.com/enzobarbierato/TicketFlow.git
```

Entre no diretório:

```bash
cd TicketFlow
```

Instale as dependências:

```bash
npm install
```

Crie:

```text
.env
```

baseado em:

```text
.env.example
```

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

Execute em desenvolvimento:

```bash
npm run dev
```

Ou:

```bash
npm start
```

A aplicação será disponibilizada em:

```text
http://localhost:3000
```

## Scripts

```text
npm start
→ node src/server.js

npm run dev
→ node --watch src/server.js
```

## Status do projeto

🚧 **Em desenvolvimento**

O backend principal já possui:

- Autenticação
- Sessões persistentes
- RBAC
- Usuários
- Chamados
- Mensagens
- Categorias
- Atribuição
- Prioridades
- Máquina de estados
- Busca
- Filtros
- Paginação
- Dashboard operacional de suporte
- Validações
- Proteções de banco e API

## Próximas etapas

- [ ] Área gerencial e relatórios
- [ ] Revisão final de consistência da API
- [ ] Testes automatizados
- [ ] Frontend
- [ ] Login visual
- [ ] Área do usuário
- [ ] Dashboard do suporte
- [ ] Área gerencial
- [ ] Interface de gerenciamento de categorias
- [ ] Responsividade
- [ ] Preparação para deploy
- [ ] Documentação final da API

## Autor

Desenvolvido por **Enzo Barbierato**.