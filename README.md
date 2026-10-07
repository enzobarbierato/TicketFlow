# TicketFlow

O TicketFlow é um sistema web de gerenciamento de chamados desenvolvido para facilitar a abertura, o acompanhamento e a resolução de solicitações de suporte.

## Tecnologias

- Node.js
- Express
- PostgreSQL
- HTML
- CSS
- JavaScript

## Objetivo

O projeto tem como objetivo centralizar solicitações de suporte em uma aplicação organizada, permitindo que usuários abram chamados e acompanhem seu andamento enquanto a equipe responsável gerencia prioridades, status e interações.

## Funcionalidades planejadas

- Cadastro e autenticação de usuários
- Abertura de chamados
- Definição de categoria e prioridade
- Acompanhamento de status
- Histórico de interações
- Área administrativa
- Gerenciamento de chamados
- Filtros e busca
- Dashboard

## Status do projeto

🚧 Em desenvolvimento.

### Etapas concluídas

- [x] Criação do repositório
- [x] Inicialização do projeto Node.js
- [x] Configuração inicial do Express
- [x] Estrutura de diretórios
- [x] Servidor local funcionando
- [x] Instalação do PostgreSQL
- [x] Configuração da conexão com o banco de dados
- [x] Criação da tabela de usuários
- [x] Criação da tabela de chamados
- [x] Criação da tabela de mensagens dos chamados
- [x] Definição dos relacionamentos entre as tabelas
- [ ] Sistema de usuários
- [ ] Sistema de autenticação
- [ ] Abertura de chamados
- [ ] Gerenciamento de chamados
- [ ] Sistema de mensagens
- [ ] Filtros e busca
- [ ] Dashboard administrativo

## Banco de dados

O TicketFlow utiliza PostgreSQL como sistema de gerenciamento de banco de dados.

A estrutura inicial possui três tabelas principais:

### users

Responsável pelo armazenamento dos usuários do sistema.

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

### tickets

Responsável pelo armazenamento e gerenciamento dos chamados.

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

### ticket_messages

Responsável pelas mensagens e interações realizadas dentro de cada chamado.

Principais campos:

- `id`
- `ticket_id`
- `user_id`
- `message`
- `created_on`

### Relacionamentos

- Um usuário pode criar vários chamados.
- Um chamado pode ser atribuído a um usuário responsável.
- Um chamado pode possuir várias mensagens.
- Cada mensagem pertence a um chamado e é criada por um usuário.

## Executando o projeto

Clone o repositório:

```bash
git clone https://github.com/enzobarbierato/TicketFlow.git