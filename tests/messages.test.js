const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const bcrypt = require("bcrypt");

const app = require("../src/app");
const pool = require("../src/database/connection");

const TEST_PASSWORD = "SenhaTeste123!";

let passwordHash;
let users = {};
let categories = {};

async function resetDatabase() {
  await pool.query(`
    TRUNCATE TABLE
      ticket_history,
      ticket_messages,
      tickets,
      user_sessions,
      categories,
      users
    RESTART IDENTITY CASCADE
  `);
}

async function createBaseUsers() {
  await pool.query(
    `
      INSERT INTO users (
        name,
        email,
        password_hash,
        department,
        job_title,
        role
      )
      VALUES
        ($1, $2, $3, $4, $5, 'manager'),
        ($6, $7, $3, $8, $9, 'support'),
        ($10, $11, $3, $12, $13, 'support'),
        ($14, $15, $3, $16, $17, 'user'),
        ($18, $19, $3, $20, $21, 'user')
    `,
    [
      "Gerente Teste",
      "manager@test.local",
      passwordHash,
      "Tecnologia",
      "Gerente de TI",

      "Suporte Um",
      "support1@test.local",
      "Tecnologia",
      "Analista de Suporte",

      "Suporte Dois",
      "support2@test.local",
      "Tecnologia",
      "Analista de Suporte",

      "Usuário Um",
      "user1@test.local",
      "Financeiro",
      "Assistente Financeiro",

      "Usuário Dois",
      "user2@test.local",
      "Recursos Humanos",
      "Assistente de RH",
    ]
  );

  const result = await pool.query(`
    SELECT id, email
    FROM users
  `);

  users = Object.fromEntries(
    result.rows.map((user) => [user.email, user.id])
  );
}

async function createBaseCategories() {
  await pool.query(`
    INSERT INTO categories (name, active)
    VALUES ('Acesso', true)
  `);

  const result = await pool.query(`
    SELECT id, name
    FROM categories
  `);

  categories = Object.fromEntries(
    result.rows.map((category) => [category.name, category.id])
  );
}

async function getCsrfToken(agent) {
  const response = await agent
    .get("/api/auth/csrf-token")
    .expect(200);

  assert.ok(response.body.csrfToken);

  return response.body.csrfToken;
}

async function login(agent, email) {
  const csrfToken = await getCsrfToken(agent);

  const response = await agent
    .post("/api/auth/login")
    .set("X-CSRF-Token", csrfToken)
    .send({
      email,
      password: TEST_PASSWORD,
    })
    .expect(200);

  assert.ok(response.body.csrfToken);

  return response.body.csrfToken;
}

async function createTicket(agent, csrfToken) {
  const response = await agent
    .post("/api/tickets")
    .set("X-CSRF-Token", csrfToken)
    .send({
      title: "Problema de acesso",
      description: "Usuário não consegue acessar o sistema.",
      category_id: categories.Acesso,
      priority: "medium",
    })
    .expect(201);

  assert.ok(response.body.ticket);

  return response.body.ticket;
}

function createMessage(
  agent,
  csrfToken,
  ticketId,
  message = "Mensagem de teste"
) {
  return agent
    .post(`/api/tickets/${ticketId}/messages`)
    .set("X-CSRF-Token", csrfToken)
    .send({
      message,
    });
}

before(async () => {
  passwordHash = await bcrypt.hash(TEST_PASSWORD, 4);
});

beforeEach(async () => {
  await resetDatabase();
  await createBaseUsers();
  await createBaseCategories();
});

after(async () => {
  await resetDatabase();
  await pool.end();
});

test("GET de mensagens deve bloquear usuário não autenticado", async () => {
  const response = await request(app)
    .get("/api/tickets/1/messages");

  assert.equal(response.status, 401);
});

test("POST de mensagem deve bloquear usuário não autenticado", async () => {
  const agent = request.agent(app);
  const csrfToken = await getCsrfToken(agent);

  const response = await createMessage(
    agent,
    csrfToken,
    1,
    "Mensagem indevida"
  );

  assert.equal(response.status, 401);
});

test("criador do chamado deve conseguir enviar mensagem", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(
    agent,
    "user1@test.local"
  );

  const ticket = await createTicket(agent, csrfToken);

  const response = await createMessage(
    agent,
    csrfToken,
    ticket.id,
    "Preciso de ajuda com este acesso."
  );

  assert.equal(response.status, 201);
  assert.ok(response.body.ticket_message);
});

test("mensagem deve ser salva sem espaços excedentes", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(
    agent,
    "user1@test.local"
  );

  const ticket = await createTicket(agent, csrfToken);

  const response = await createMessage(
    agent,
    csrfToken,
    ticket.id,
    "   Mensagem com espaços   "
  );

  assert.equal(response.status, 201);
  assert.equal(
    response.body.ticket_message.message,
    "Mensagem com espaços"
  );
});

test("mensagem vazia deve ser rejeitada", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(
    agent,
    "user1@test.local"
  );

  const ticket = await createTicket(agent, csrfToken);

  const response = await createMessage(
    agent,
    csrfToken,
    ticket.id,
    "   "
  );

  assert.equal(response.status, 400);
});

test("mensagem com mais de 5000 caracteres deve ser rejeitada", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(
    agent,
    "user1@test.local"
  );

  const ticket = await createTicket(agent, csrfToken);

  const response = await createMessage(
    agent,
    csrfToken,
    ticket.id,
    "A".repeat(5001)
  );

  assert.equal(response.status, 400);
});

test("criador do chamado deve conseguir consultar mensagens", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(
    agent,
    "user1@test.local"
  );

  const ticket = await createTicket(agent, csrfToken);

  await createMessage(
    agent,
    csrfToken,
    ticket.id,
    "Primeira mensagem"
  ).expect(201);

  await createMessage(
    agent,
    csrfToken,
    ticket.id,
    "Segunda mensagem"
  ).expect(201);

  const response = await agent
    .get(`/api/tickets/${ticket.id}/messages`);

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.messages));
  assert.equal(response.body.messages.length, 2);

  const messages = response.body.messages.map(
    (item) => item.message
  );

  assert.ok(messages.includes("Primeira mensagem"));
  assert.ok(messages.includes("Segunda mensagem"));
});

test("outro usuário não deve consultar mensagens de chamado alheio", async () => {
  const ownerAgent = request.agent(app);
  const ownerCsrf = await login(
    ownerAgent,
    "user1@test.local"
  );

  const ticket = await createTicket(
    ownerAgent,
    ownerCsrf
  );

  const otherAgent = request.agent(app);

  await login(
    otherAgent,
    "user2@test.local"
  );

  const response = await otherAgent
    .get(`/api/tickets/${ticket.id}/messages`);

  assert.equal(response.status, 404);
});

test("outro usuário não deve enviar mensagem em chamado alheio", async () => {
  const ownerAgent = request.agent(app);
  const ownerCsrf = await login(
    ownerAgent,
    "user1@test.local"
  );

  const ticket = await createTicket(
    ownerAgent,
    ownerCsrf
  );

  const otherAgent = request.agent(app);
  const otherCsrf = await login(
    otherAgent,
    "user2@test.local"
  );

  const response = await createMessage(
    otherAgent,
    otherCsrf,
    ticket.id,
    "Tentativa indevida"
  );

  assert.equal(response.status, 404);
});

test("gerente deve conseguir consultar mensagens de qualquer chamado", async () => {
  const userAgent = request.agent(app);
  const userCsrf = await login(
    userAgent,
    "user1@test.local"
  );

  const ticket = await createTicket(
    userAgent,
    userCsrf
  );

  await createMessage(
    userAgent,
    userCsrf,
    ticket.id,
    "Mensagem do usuário"
  ).expect(201);

  const managerAgent = request.agent(app);

  await login(
    managerAgent,
    "manager@test.local"
  );

  const response = await managerAgent
    .get(`/api/tickets/${ticket.id}/messages`);

  assert.equal(response.status, 200);
  assert.equal(response.body.messages.length, 1);
});

test("gerente deve conseguir enviar mensagem em chamado acessível", async () => {
  const userAgent = request.agent(app);
  const userCsrf = await login(
    userAgent,
    "user1@test.local"
  );

  const ticket = await createTicket(
    userAgent,
    userCsrf
  );

  const managerAgent = request.agent(app);
  const managerCsrf = await login(
    managerAgent,
    "manager@test.local"
  );

  const response = await createMessage(
    managerAgent,
    managerCsrf,
    ticket.id,
    "Mensagem do gerente"
  );

  assert.equal(response.status, 201);
});

test("suporte deve conseguir acessar chamado não atribuído", async () => {
  const userAgent = request.agent(app);
  const userCsrf = await login(
    userAgent,
    "user1@test.local"
  );

  const ticket = await createTicket(
    userAgent,
    userCsrf
  );

  const supportAgent = request.agent(app);
  const supportCsrf = await login(
    supportAgent,
    "support1@test.local"
  );

  const response = await createMessage(
    supportAgent,
    supportCsrf,
    ticket.id,
    "Mensagem do suporte"
  );

  assert.equal(response.status, 201);
});

test("suporte não deve acessar chamado atribuído a outro suporte", async () => {
  const userAgent = request.agent(app);
  const userCsrf = await login(
    userAgent,
    "user1@test.local"
  );

  const ticket = await createTicket(
    userAgent,
    userCsrf
  );

  await pool.query(
    `
      UPDATE tickets
      SET assigned_to = $1
      WHERE id = $2
    `,
    [
      users["support1@test.local"],
      ticket.id,
    ]
  );

  const supportTwoAgent = request.agent(app);

  await login(
    supportTwoAgent,
    "support2@test.local"
  );

  const response = await supportTwoAgent
    .get(`/api/tickets/${ticket.id}/messages`);

  assert.equal(response.status, 404);
});

test("chamado fechado não deve aceitar novas mensagens", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(
    agent,
    "user1@test.local"
  );

  const ticket = await createTicket(
    agent,
    csrfToken
  );

  await pool.query(
    `
      UPDATE tickets
      SET status = 'closed'
      WHERE id = $1
    `,
    [ticket.id]
  );

  const response = await createMessage(
    agent,
    csrfToken,
    ticket.id,
    "Mensagem depois do fechamento"
  );

  assert.equal(response.status, 409);
});

test("mensagens de chamado fechado devem continuar disponíveis para leitura", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(
    agent,
    "user1@test.local"
  );

  const ticket = await createTicket(
    agent,
    csrfToken
  );

  await createMessage(
    agent,
    csrfToken,
    ticket.id,
    "Mensagem antes do fechamento"
  ).expect(201);

  await pool.query(
    `
      UPDATE tickets
      SET status = 'closed'
      WHERE id = $1
    `,
    [ticket.id]
  );

  const response = await agent
    .get(`/api/tickets/${ticket.id}/messages`);

  assert.equal(response.status, 200);
  assert.equal(response.body.messages.length, 1);
  assert.equal(
    response.body.messages[0].message,
    "Mensagem antes do fechamento"
  );
});

test("chamado resolvido ainda deve permitir mensagens", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(
    agent,
    "user1@test.local"
  );

  const ticket = await createTicket(
    agent,
    csrfToken
  );

  await pool.query(
    `
      UPDATE tickets
      SET status = 'resolved'
      WHERE id = $1
    `,
    [ticket.id]
  );

  const response = await createMessage(
    agent,
    csrfToken,
    ticket.id,
    "Mensagem após resolução"
  );

  assert.equal(response.status, 201);
});