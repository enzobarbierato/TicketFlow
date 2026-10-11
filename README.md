# TicketFlow

O **TicketFlow** é um sistema web de gerenciamento de chamados desenvolvido para centralizar a abertura, o acompanhamento, a atribuição e a resolução de solicitações de suporte.

O projeto está sendo desenvolvido com foco em:

- organização de código
- segurança
- controle de acesso
- rastreabilidade
- integridade dos dados
- separação de responsabilidades
- métricas operacionais
- boas práticas de desenvolvimento de APIs

---

# Tecnologias

Backend:

- Node.js
- Express
- PostgreSQL
- JavaScript

Segurança e autenticação:

- bcrypt
- express-session
- connect-pg-simple
- express-rate-limit
- Helmet

Frontend planejado:

- HTML
- CSS
- JavaScript

---

# Objetivo

O TicketFlow permite que usuários registrem solicitações de suporte e acompanhem o andamento de seus chamados.

A aplicação possui três perfis:

```text
user
support
manager
```

Cada perfil possui permissões específicas dentro do sistema.

---

# Arquitetura

O backend utiliza separação entre rotas, controllers, services, middlewares, configurações e acesso ao banco de dados.

```text
src/
├── config/
│   ├── env.js
│   └── session.js
│
├── constants/
│   ├── ticketConstants.js
│   └── userConstants.js
│
├── controllers/
│   ├── authController.js
│   ├── categoriesController.js
│   ├── dashboardController.js
│   ├── managementController.js
│   ├── ticketHistoryController.js
│   ├── ticketMessagesController.js
│   ├── ticketsController.js
│   └── usersController.js
│
├── database/
│   ├── connection.js
│   └── schema.sql
│
├── middlewares/
│   ├── loginRateLimit.js
│   ├── requireAuth.js
│   ├── requireRole.js
│   └── validateIdParam.js
│
├── routes/
│   ├── authRoutes.js
│   ├── categoriesRoutes.js
│   ├── dashboardRoutes.js
│   ├── managementRoutes.js
│   ├── ticketMessagesRoutes.js
│   ├── ticketsRoutes.js
│   └── usersRoutes.js
│
├── services/
│   ├── authService.js
│   ├── categoriesService.js
│   ├── dashboardService.js
│   ├── managementService.js
│   ├── ticketHistoryService.js
│   ├── ticketMessagesService.js
│   ├── ticketStatusService.js
│   ├── ticketsService.js
│   └── usersService.js
│
├── utils/
│   └── validators.js
│
├── app.js
└── server.js
```

## Responsabilidades

```text
routes/
→ definição dos endpoints

controllers/
→ requisição e resposta HTTP

services/
→ regras de negócio e banco de dados

middlewares/
→ autenticação, autorização e validações

constants/
→ valores reutilizáveis do domínio

config/
→ configuração da aplicação

database/
→ conexão e estrutura PostgreSQL

utils/
→ funções auxiliares e validações
```

---

# Perfis de acesso

## User

Usuário comum do sistema.

Pode:

- visualizar os próprios chamados
- criar chamados
- consultar categorias disponíveis
- visualizar mensagens
- enviar mensagens em chamados permitidos
- consultar o histórico de chamados aos quais possui acesso

---

## Support

Funcionário responsável pelo atendimento.

Pode:

- visualizar chamados ainda sem responsável
- visualizar chamados atribuídos a ele
- assumir chamados disponíveis
- alterar o status de chamados sob sua responsabilidade
- visualizar mensagens
- enviar mensagens
- consultar o histórico dos chamados acessíveis
- acessar o dashboard operacional

Um técnico de suporte não pode alterar chamados atribuídos a outro técnico.

---

## Manager

Responsável pela gestão da operação.

Pode:

- visualizar todos os chamados
- pesquisar e filtrar chamados
- alterar status
- alterar prioridades
- atribuir chamados
- reatribuir chamados
- visualizar técnicos de suporte
- visualizar métricas da operação
- visualizar métricas individuais dos técnicos
- consultar chamados atribuídos a cada técnico
- gerenciar categorias
- criar contas de usuário e suporte

O perfil `manager` não pode ser criado através do endpoint comum de criação de usuários.

---

# Usuários

A criação de usuários é protegida e disponível somente para gerentes.

```http
POST /api/users
```

Perfis permitidos:

```text
user
support
```

Não é permitido criar:

```text
manager
```

através desse endpoint.

Senhas são armazenadas utilizando hash com bcrypt.

---

# Autenticação

O TicketFlow utiliza autenticação baseada em sessão.

Endpoints:

```http
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

As sessões são persistidas no PostgreSQL através de:

```text
express-session
+
connect-pg-simple
```

Isso permite que sessões continuem válidas mesmo após reinicializações do processo Node.js.

---

# Proteções de autenticação

## Session fixation

Após um login válido, o identificador da sessão é regenerado antes do usuário ser associado à sessão.

Fluxo:

```text
Credenciais válidas
        ↓
Nova sessão
        ↓
Usuário associado
        ↓
Sessão persistida no PostgreSQL
```

---

## Rate limiting

O endpoint de login possui proteção contra tentativas repetidas.

Configuração atual:

```text
10 tentativas falhas
a cada 15 minutos
```

Tentativas de login bem-sucedidas não entram na contagem.

---

# Chamados

Os chamados possuem:

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

---

# Prioridades

Prioridades válidas:

```text
low
medium
high
critical
```

A alteração de prioridade é restrita à gerência.

---

# Status

Status disponíveis:

```text
open
in_progress
waiting_user
resolved
closed
```

---

# Fluxo de status

O TicketFlow possui controle de transição de estados.

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

Chamados fechados não podem receber novas mensagens.

---

# Categorias

As categorias ficam armazenadas em uma tabela própria.

```text
categories
```

Um chamado referencia:

```text
category_id
```

em vez de armazenar diretamente o nome.

Isso permite que categorias sejam renomeadas ou desativadas sem modificar chamados históricos.

Funcionalidades:

```text
listar categorias ativas
criar categoria
editar categoria
ativar categoria
desativar categoria
```

A unicidade do nome é case-insensitive.

Ou seja:

```text
Acesso
acesso
ACESSO
```

são consideradas a mesma categoria.

---

# Mensagens

Chamados possuem histórico de mensagens.

Endpoints:

```http
GET  /api/tickets/:ticketId/messages
POST /api/tickets/:ticketId/messages
```

As mensagens possuem:

```text
ticket_id
user_id
message
created_on
```

Chamados com status `closed` continuam disponíveis para consulta, mas não aceitam novas mensagens.

---

# Histórico de movimentações

O TicketFlow possui rastreamento das principais alterações de um chamado.

Tabela:

```text
ticket_history
```

Eventos registrados:

```text
created
assigned
reassigned
status_changed
priority_changed
```

Cada evento pode registrar:

```text
ticket_id
performed_by
event_type
from_user_id
to_user_id
old_value
new_value
created_on
```

Exemplo:

```text
Chamado criado
        ↓
Atribuído ao suporte
        ↓
Status alterado
        ↓
Prioridade alterada
        ↓
Reatribuído
        ↓
Resolvido
        ↓
Fechado
```

As operações importantes utilizam transações PostgreSQL.

Exemplo:

```text
BEGIN
   ↓
alterar chamado
   ↓
registrar histórico
   ↓
COMMIT
```

Se alguma operação falhar:

```text
ROLLBACK
```

Isso evita que o chamado seja alterado sem o respectivo registro histórico.

---

# Consulta do histórico

```http
GET /api/tickets/:id/history
```

As mesmas regras de acesso do chamado são aplicadas ao histórico.

---

# Atribuição de chamados

## Suporte assume chamado

```http
PATCH /api/tickets/:id/assign
```

Somente chamados sem responsável podem ser assumidos.

O sistema registra:

```text
event_type = assigned
```

---

## Gerência atribui ou reatribui

```http
PATCH /api/tickets/:id/assign-user
```

Se o chamado não possui responsável:

```text
assigned
```

Se já possui outro responsável:

```text
reassigned
```

O sistema registra:

```text
quem realizou a alteração
responsável anterior
novo responsável
data da alteração
```

Reatribuir um chamado para o mesmo funcionário é bloqueado.

---

# Busca e filtros

A listagem de chamados aceita filtros.

## Status

```http
GET /api/tickets?status=open
```

## Prioridade

```http
GET /api/tickets?priority=critical
```

## Categoria

```http
GET /api/tickets?category_id=1
```

## Pesquisa

```http
GET /api/tickets?search=email
```

A busca considera:

```text
título
descrição
categoria
```

Também é possível combinar filtros.

```http
GET /api/tickets?status=open&priority=high&category_id=1
```

---

# Paginação

```http
GET /api/tickets?page=1&limit=10
```

Padrões:

```text
page = 1
limit = 10
```

Limite máximo:

```text
100
```

Exemplo:

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

---

# Dashboard do suporte

O dashboard operacional é exclusivo do perfil:

```text
support
```

Endpoint:

```http
GET /api/dashboard
```

Métricas:

```text
chamados disponíveis
chamados atribuídos ao técnico
em andamento
aguardando usuário
críticos
resolvidos
```

O dashboard não é acessível por `user` nem por `manager`.

---

# Área gerencial

A gerência possui endpoints próprios.

## Resumo geral

```http
GET /api/management/summary
```

Exibe:

```text
total de chamados
abertos
em andamento
aguardando usuário
resolvidos
fechados
sem responsável
críticos
quantidade de técnicos
```

---

## Estatísticas por categoria

```http
GET /api/management/categories
```

Exibe quantidade de chamados por:

```text
categoria
status
```

---

# Estatísticas por funcionário

## Comparação entre técnicos

```http
GET /api/management/support
```

Exibe:

```text
total
ativos
abertos
em andamento
aguardando usuário
resolvidos
fechados
críticos
```

---

## Resumo individual

```http
GET /api/management/support/:id
```

Retorna informações e indicadores do funcionário.

---

## Chamados do funcionário

```http
GET /api/management/support/:id/tickets
```

Retorna os chamados atualmente atribuídos ao técnico.

---

## Métricas históricas

```http
GET /api/management/support/:id/metrics
```

Métricas disponíveis:

```text
tickets_received
direct_assignments
reassigned_to
reassigned_from
status_changes
resolved_by_support
closed_by_support
avg_seconds_to_assign
avg_seconds_to_resolve
```

---

# Métricas de tempo

## Tempo médio para assumir

Representa o tempo entre:

```text
created
→
assigned
```

quando o próprio técnico assume o chamado.

---

## Tempo médio de resolução

Representa o tempo entre:

```text
assigned/reassigned
→
resolved
```

para o técnico responsável.

Os valores são retornados em segundos.

Exemplo:

```json
{
  "avg_seconds_to_assign": 420,
  "avg_seconds_to_resolve": 5400
}
```

O frontend futuramente poderá apresentar:

```text
420 segundos
→ 7 minutos

5400 segundos
→ 1 hora e 30 minutos
```

Se não houver dados históricos suficientes:

```json
null
```

é retornado.

As métricas históricas são válidas a partir da implantação do `ticket_history`.

---

# Banco de dados

Tabelas atuais:

```text
users
categories
tickets
ticket_messages
ticket_history
user_sessions
```

---

# Integridade do banco

O PostgreSQL possui regras próprias para impedir estados inválidos.

Entre elas:

```text
foreign keys
constraints CHECK
índices
unicidade
integridade referencial
```

Roles válidas:

```text
user
support
manager
```

Prioridades válidas:

```text
low
medium
high
critical
```

Status válidos:

```text
open
in_progress
waiting_user
resolved
closed
```

---

# Segurança

Medidas já implementadas:

```text
bcrypt para senhas
queries parametrizadas
variáveis sensíveis em .env
.env ignorado pelo Git
sessões persistentes
cookies HttpOnly
sameSite=Lax
cookie Secure em produção
session regeneration após login
rate limiting no login
Helmet
remoção do X-Powered-By
trust proxy em produção
controle de acesso por perfil
controle de acesso por chamado
validação de IDs
validação de entradas
constraints no PostgreSQL
transações nas alterações críticas
```

---

# Headers de segurança

O projeto utiliza Helmet.

Entre os headers enviados estão:

```text
Cross-Origin-Opener-Policy
Cross-Origin-Resource-Policy
Referrer-Policy
Strict-Transport-Security
X-Content-Type-Options
X-Frame-Options
X-DNS-Prefetch-Control
```

O header:

```text
X-Powered-By
```

é desabilitado.

A Content Security Policy será configurada quando o frontend for desenvolvido.

---

# Variáveis de ambiente

A aplicação valida as configurações obrigatórias antes da inicialização.

Variáveis:

```env
PORT=3000
NODE_ENV=development

SESSION_SECRET=

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticketflow
DB_USER=
DB_PASSWORD=
```

São validados:

```text
SESSION_SECRET
DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
NODE_ENV
PORT
```

Se uma configuração obrigatória estiver incorreta, a aplicação não inicia.

---

# Validações

A aplicação possui validadores reutilizáveis em:

```text
src/utils/validators.js
```

Validações atuais incluem:

```text
strings vazias
e-mail
senha
IDs positivos
status
prioridade
categoria
paginação
limites de tamanho
```

Exemplos de IDs inválidos:

```text
/api/tickets/abc
/api/tickets/-1
/api/categories/teste
```

são recusados antes de chegar ao PostgreSQL.

---

# Constantes

Valores reutilizáveis do domínio estão sendo centralizados em:

```text
src/constants/
```

Arquivos:

```text
ticketConstants.js
userConstants.js
```

Isso evita duplicação de listas de:

```text
status
prioridades
roles
```

em diferentes partes da aplicação.

---

# Executando o projeto

Clone:

```bash
git clone https://github.com/enzobarbierato/TicketFlow.git
```

Entre no projeto:

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

com base em:

```text
.env.example
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

Servidor padrão:

```text
http://localhost:3000
```

---

# Scripts

```text
npm start
→ node src/server.js

npm run dev
→ node --watch src/server.js
```

---

# Status atual

O backend já possui:

```text
Autenticação
Sessões persistentes
RBAC
Usuários
Chamados
Mensagens
Categorias
Atribuição
Reatribuição
Prioridades
Máquina de estados
Histórico de movimentações
Busca
Filtros
Paginação
Dashboard operacional
Área gerencial
Métricas por funcionário
Métricas históricas
Métricas de tempo
Rate limiting
Headers de segurança
Validação de ambiente
Transações PostgreSQL
```

---

# Roadmap

## Parte 1 — Área gerencial

```text
[x] Resumo geral
[x] Estatísticas por categoria
[x] Comparação entre funcionários
[x] Detalhamento individual
[x] Chamados por funcionário
```

## Parte 2 — Histórico

```text
[x] Criação do chamado
[x] Atribuição
[x] Reatribuição
[x] Mudança de status
[x] Mudança de prioridade
[x] Consulta pela API
```

## Parte 3 — Métricas

```text
[x] Chamados recebidos
[x] Atribuições
[x] Reatribuições
[x] Chamados resolvidos
[x] Chamados fechados
[x] Tempo médio para assumir
[x] Tempo médio de resolução
```

## Parte 4 — Backend e segurança

```text
[x] Remover cadastro público
[x] Controle de criação de perfis
[x] Rate limiting no login
[x] Helmet
[x] Remover X-Powered-By
[x] Proteção contra session fixation
[x] Trust proxy para produção
[x] Validação de ambiente
[x] Centralização inicial de constantes

[ ] Tratamento global de erros
[ ] Limpeza de código não utilizado
[ ] Revisão final de regras de negócio
[ ] Revisão de CSRF
[ ] Revisão final de segurança
```

## Parte 5 — Testes automatizados

```text
[ ] Configurar ambiente de testes
[ ] Autenticação
[ ] Usuários
[ ] Chamados
[ ] Permissões
[ ] Categorias
[ ] Mensagens
[ ] Histórico
[ ] Dashboard
[ ] Área gerencial
```

## Parte 6 — Frontend

```text
[ ] Login
[ ] Área do usuário
[ ] Criação de chamados
[ ] Visualização de chamados
[ ] Histórico do chamado
[ ] Dashboard do suporte
[ ] Painel gerencial
[ ] Visualização por funcionário
[ ] Gerenciamento de categorias
[ ] Responsividade
[ ] Content Security Policy
```

---

# Autor

Desenvolvido por **Enzo Barbierato**.