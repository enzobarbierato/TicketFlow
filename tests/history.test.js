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

  return response.body.ticket;
}

function assignTicket(agent, csrfToken, ticketId) {
  return agent
    .patch(`/api/tickets/${ticketId}/assign`)
    .set("X-CSRF-Token", csrfToken)
    .send({});
}

function assignTicketToUser(
  agent,
  csrfToken,
  ticketId,
  userId
) {
  return agent
    .patch(`/api/tickets/${ticketId}/assign-user`)
    .set("X-CSRF-Token", csrfToken)
    .send({
      userId,
    });
}

function updateStatus(
  agent,
  csrfToken,
  ticketId,
  status
) {
  return agent
    .patch(`/api/tickets/${ticketId}/status`)
    .set("X-CSRF-Token", csrfToken)
    .send({
      status,
    });
}

function updatePriority(
  agent,
  csrfToken,
  ticketId,
  priority
) {
  return agent
    .patch(`/api/tickets/${ticketId}/priority`)
    .set("X-CSRF-Token", csrfToken)
    .send({
      priority,
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

test("GET do histórico deve bloquear usuário não autenticado", async () => {
  const response = await request(app)
    .get("/api/tickets/1/history");

  assert.equal(response.status, 401);
});

test("criação do chamado deve registrar evento created", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(
    agent,
    "user1@test.local"
  );

  const ticket = await createTicket(
    agent,
    csrfToken
  );

  const response = await agent
    .get(`/api/tickets/${ticket.id}/history`);

  assert.equal(response.status, 200);
  assert.equal(response.body.history.length, 1);

  const event = response.body.history[0];

  assert.equal(event.event_type, "created");

  assert.equal(
    String(event.performed_by),
    String(users["user1@test.local"])
  );

  assert.equal(
    event.performed_by_name,
    "Usuário Um"
  );

  assert.equal(event.from_user_id, null);
  assert.equal(event.to_user_id, null);
  assert.equal(event.old_value, null);
  assert.equal(event.new_value, null);
});

test("outro usuário não deve acessar histórico de chamado alheio", async () => {
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
    .get(`/api/tickets/${ticket.id}/history`);

  assert.equal(response.status, 404);
});

test("gerente deve conseguir visualizar histórico de qualquer chamado", async () => {
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

  await login(
    managerAgent,
    "manager@test.local"
  );

  const response = await managerAgent
    .get(`/api/tickets/${ticket.id}/history`);

  assert.equal(response.status, 200);

  assert.equal(
    String(response.body.ticket.id),
    String(ticket.id)
  );

  assert.equal(
    response.body.ticket.title,
    "Problema de acesso"
  );

  assert.equal(response.body.history.length, 1);
});

test("suporte deve gerar evento assigned ao assumir chamado", async () => {
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

  await assignTicket(
    supportAgent,
    supportCsrf,
    ticket.id
  ).expect(200);

  const response = await supportAgent
    .get(`/api/tickets/${ticket.id}/history`);

  assert.equal(response.status, 200);

  const assignedEvent =
    response.body.history.find(
      (event) => event.event_type === "assigned"
    );

  assert.ok(assignedEvent);

  assert.equal(
    String(assignedEvent.performed_by),
    String(users["support1@test.local"])
  );

  assert.equal(
    assignedEvent.performed_by_name,
    "Suporte Um"
  );

  assert.equal(assignedEvent.from_user_id, null);

  assert.equal(
    String(assignedEvent.to_user_id),
    String(users["support1@test.local"])
  );

  assert.equal(
    assignedEvent.to_user_name,
    "Suporte Um"
  );
});

test("atribuição e reatribuição pelo gerente devem ser registradas", async () => {
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

  await assignTicketToUser(
    managerAgent,
    managerCsrf,
    ticket.id,
    users["support1@test.local"]
  ).expect(200);

  await assignTicketToUser(
    managerAgent,
    managerCsrf,
    ticket.id,
    users["support2@test.local"]
  ).expect(200);

  const response = await managerAgent
    .get(`/api/tickets/${ticket.id}/history`);

  assert.equal(response.status, 200);

  const assignedEvent =
    response.body.history.find(
      (event) => event.event_type === "assigned"
    );

  const reassignedEvent =
    response.body.history.find(
      (event) => event.event_type === "reassigned"
    );

  assert.ok(assignedEvent);
  assert.ok(reassignedEvent);

  assert.equal(
    String(assignedEvent.to_user_id),
    String(users["support1@test.local"])
  );

  assert.equal(
    String(reassignedEvent.from_user_id),
    String(users["support1@test.local"])
  );

  assert.equal(
    reassignedEvent.from_user_name,
    "Suporte Um"
  );

  assert.equal(
    String(reassignedEvent.to_user_id),
    String(users["support2@test.local"])
  );

  assert.equal(
    reassignedEvent.to_user_name,
    "Suporte Dois"
  );

  assert.equal(
    reassignedEvent.performed_by_name,
    "Gerente Teste"
  );
});

test("alteração de status deve registrar valor anterior e novo", async () => {
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

  await updateStatus(
    managerAgent,
    managerCsrf,
    ticket.id,
    "in_progress"
  ).expect(200);

  const response = await managerAgent
    .get(`/api/tickets/${ticket.id}/history`);

  const event = response.body.history.find(
    (item) => item.event_type === "status_changed"
  );

  assert.ok(event);
  assert.equal(event.old_value, "open");
  assert.equal(event.new_value, "in_progress");

  assert.equal(
    String(event.performed_by),
    String(users["manager@test.local"])
  );

  assert.equal(
    event.performed_by_name,
    "Gerente Teste"
  );
});

test("alteração de prioridade deve registrar valor anterior e novo", async () => {
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

  await updatePriority(
    managerAgent,
    managerCsrf,
    ticket.id,
    "high"
  ).expect(200);

  const response = await managerAgent
    .get(`/api/tickets/${ticket.id}/history`);

  const event = response.body.history.find(
    (item) => item.event_type === "priority_changed"
  );

  assert.ok(event);
  assert.equal(event.old_value, "medium");
  assert.equal(event.new_value, "high");

  assert.equal(
    event.performed_by_name,
    "Gerente Teste"
  );
});

test("histórico deve manter a ordem cronológica dos eventos", async () => {
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

  await assignTicketToUser(
    managerAgent,
    managerCsrf,
    ticket.id,
    users["support1@test.local"]
  ).expect(200);

  await assignTicketToUser(
    managerAgent,
    managerCsrf,
    ticket.id,
    users["support2@test.local"]
  ).expect(200);

  await updatePriority(
    managerAgent,
    managerCsrf,
    ticket.id,
    "high"
  ).expect(200);

  await updateStatus(
    managerAgent,
    managerCsrf,
    ticket.id,
    "in_progress"
  ).expect(200);

  const response = await managerAgent
    .get(`/api/tickets/${ticket.id}/history`);

  assert.equal(response.status, 200);

  const eventTypes = response.body.history.map(
    (event) => event.event_type
  );

  assert.deepEqual(eventTypes, [
    "created",
    "assigned",
    "reassigned",
    "priority_changed",
    "status_changed",
  ]);

  for (
    let index = 1;
    index < response.body.history.length;
    index += 1
  ) {
    const previous =
      response.body.history[index - 1];

    const current =
      response.body.history[index];

    const previousDate =
      new Date(previous.created_on);

    const currentDate =
      new Date(current.created_on);

    assert.ok(currentDate >= previousDate);

    if (
      currentDate.getTime() === previousDate.getTime()
    ) {
      assert.ok(
        Number(current.id) > Number(previous.id)
      );
    }
  }
});

test("suporte não deve acessar histórico atribuído a outro suporte", async () => {
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

  await assignTicketToUser(
    managerAgent,
    managerCsrf,
    ticket.id,
    users["support1@test.local"]
  ).expect(200);

  const supportTwoAgent = request.agent(app);

  await login(
    supportTwoAgent,
    "support2@test.local"
  );

  const response = await supportTwoAgent
    .get(`/api/tickets/${ticket.id}/history`);

  assert.equal(response.status, 404);
});