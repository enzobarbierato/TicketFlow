const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const bcrypt = require("bcrypt");

const app = require("../src/app");
const pool = require("../src/database/connection");

const TEST_PASSWORD = "SenhaTeste123!";

let passwordHash;
let categories = {};
let users = {};

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
    VALUES
      ('Acesso', true),
      ('Hardware', true),
      ('Categoria Desativada', false)
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

function createTicketPayload(overrides = {}) {
  return {
    title: "Problema de acesso",
    description: "Usuário não consegue acessar o sistema.",
    category_id: categories.Acesso,
    priority: "medium",
    ...overrides,
  };
}

async function createTicket(agent, csrfToken, overrides = {}) {
  const response = await agent
    .post("/api/tickets")
    .set("X-CSRF-Token", csrfToken)
    .send(createTicketPayload(overrides))
    .expect(201);

  assert.ok(response.body.ticket);

  return response.body.ticket;
}

function updateStatus(agent, csrfToken, ticketId, status) {
  return agent
    .patch(`/api/tickets/${ticketId}/status`)
    .set("X-CSRF-Token", csrfToken)
    .send({ status });
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

test("POST /api/tickets deve bloquear usuário não autenticado", async () => {
  const agent = request.agent(app);
  const csrfToken = await getCsrfToken(agent);

  const response = await agent
    .post("/api/tickets")
    .set("X-CSRF-Token", csrfToken)
    .send(createTicketPayload());

  assert.equal(response.status, 401);
});

test("usuário autenticado deve conseguir criar chamado", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "user1@test.local");

  const ticket = await createTicket(agent, csrfToken);

  const result = await pool.query(
    `
      SELECT
        title,
        description,
        category_id,
        priority,
        status,
        created_by,
        assigned_to
      FROM tickets
      WHERE id = $1
    `,
    [ticket.id]
  );

  assert.equal(result.rowCount, 1);

  const savedTicket = result.rows[0];

  assert.equal(savedTicket.title, "Problema de acesso");
  assert.equal(
    savedTicket.description,
    "Usuário não consegue acessar o sistema."
  );
  assert.equal(
    String(savedTicket.category_id),
    String(categories.Acesso)
  );
  assert.equal(savedTicket.priority, "medium");
  assert.equal(savedTicket.status, "open");
  assert.equal(
    String(savedTicket.created_by),
    String(users["user1@test.local"])
  );
  assert.equal(savedTicket.assigned_to, null);
});

test("criação deve rejeitar categoria desativada", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "user1@test.local");

  const response = await agent
    .post("/api/tickets")
    .set("X-CSRF-Token", csrfToken)
    .send(
      createTicketPayload({
        category_id: categories["Categoria Desativada"],
      })
    );

  assert.equal(response.status, 400);
});

test("criação deve rejeitar prioridade inválida", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "user1@test.local");

  const response = await agent
    .post("/api/tickets")
    .set("X-CSRF-Token", csrfToken)
    .send(
      createTicketPayload({
        priority: "urgentissima",
      })
    );

  assert.equal(response.status, 400);
});

test("usuário não deve acessar chamado pertencente a outro usuário", async () => {
  const ownerAgent = request.agent(app);
  const ownerCsrf = await login(ownerAgent, "user1@test.local");

  const ticket = await createTicket(ownerAgent, ownerCsrf);

  const otherAgent = request.agent(app);
  await login(otherAgent, "user2@test.local");

  const response = await otherAgent
    .get(`/api/tickets/${ticket.id}`);

  assert.equal(response.status, 404);
});

test("criador e gerente devem conseguir consultar o chamado", async () => {
  const userAgent = request.agent(app);
  const userCsrf = await login(userAgent, "user1@test.local");

  const ticket = await createTicket(userAgent, userCsrf);

  const ownerResponse = await userAgent
    .get(`/api/tickets/${ticket.id}`);

  assert.equal(ownerResponse.status, 200);
  assert.equal(
    String(ownerResponse.body.ticket.id),
    String(ticket.id)
  );

  const managerAgent = request.agent(app);
  await login(managerAgent, "manager@test.local");

  const managerResponse = await managerAgent
    .get(`/api/tickets/${ticket.id}`);

  assert.equal(managerResponse.status, 200);
  assert.equal(
    String(managerResponse.body.ticket.id),
    String(ticket.id)
  );
});

test("suporte deve conseguir assumir chamado aberto e não atribuído", async () => {
  const userAgent = request.agent(app);
  const userCsrf = await login(userAgent, "user1@test.local");
  const ticket = await createTicket(userAgent, userCsrf);

  const supportAgent = request.agent(app);
  const supportCsrf = await login(
    supportAgent,
    "support1@test.local"
  );

  const response = await supportAgent
    .patch(`/api/tickets/${ticket.id}/assign`)
    .set("X-CSRF-Token", supportCsrf)
    .send({});

  assert.equal(response.status, 200);

  const result = await pool.query(
    `
      SELECT assigned_to
      FROM tickets
      WHERE id = $1
    `,
    [ticket.id]
  );

  assert.equal(
    String(result.rows[0].assigned_to),
    String(users["support1@test.local"])
  );
});

test("segundo suporte não deve conseguir assumir chamado já atribuído", async () => {
  const userAgent = request.agent(app);
  const userCsrf = await login(userAgent, "user1@test.local");
  const ticket = await createTicket(userAgent, userCsrf);

  const supportOneAgent = request.agent(app);
  const supportOneCsrf = await login(
    supportOneAgent,
    "support1@test.local"
  );

  await supportOneAgent
    .patch(`/api/tickets/${ticket.id}/assign`)
    .set("X-CSRF-Token", supportOneCsrf)
    .send({})
    .expect(200);

  const supportTwoAgent = request.agent(app);
  const supportTwoCsrf = await login(
    supportTwoAgent,
    "support2@test.local"
  );

  const response = await supportTwoAgent
    .patch(`/api/tickets/${ticket.id}/assign`)
    .set("X-CSRF-Token", supportTwoCsrf)
    .send({});

  assert.equal(response.status, 409);
});

test("gerente deve conseguir atribuir e reatribuir chamado entre suportes", async () => {
  const userAgent = request.agent(app);
  const userCsrf = await login(userAgent, "user1@test.local");
  const ticket = await createTicket(userAgent, userCsrf);

  const managerAgent = request.agent(app);
  const managerCsrf = await login(
    managerAgent,
    "manager@test.local"
  );

  const firstAssignment = await managerAgent
    .patch(`/api/tickets/${ticket.id}/assign-user`)
    .set("X-CSRF-Token", managerCsrf)
    .send({
      userId: users["support1@test.local"],
    });

  assert.equal(firstAssignment.status, 200);

  const secondAssignment = await managerAgent
    .patch(`/api/tickets/${ticket.id}/assign-user`)
    .set("X-CSRF-Token", managerCsrf)
    .send({
      userId: users["support2@test.local"],
    });

  assert.equal(secondAssignment.status, 200);

  const result = await pool.query(
    `
      SELECT assigned_to
      FROM tickets
      WHERE id = $1
    `,
    [ticket.id]
  );

  assert.equal(
    String(result.rows[0].assigned_to),
    String(users["support2@test.local"])
  );
});

test("gerente não deve atribuir chamado a usuário que não seja suporte", async () => {
  const userAgent = request.agent(app);
  const userCsrf = await login(userAgent, "user1@test.local");
  const ticket = await createTicket(userAgent, userCsrf);

  const managerAgent = request.agent(app);
  const managerCsrf = await login(
    managerAgent,
    "manager@test.local"
  );

  const response = await managerAgent
    .patch(`/api/tickets/${ticket.id}/assign-user`)
    .set("X-CSRF-Token", managerCsrf)
    .send({
      userId: users["user2@test.local"],
    });

  assert.equal(response.status, 400);
});

test("usuário comum não deve alterar atribuição, status ou prioridade", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "user1@test.local");
  const ticket = await createTicket(agent, csrfToken);

  const assignResponse = await agent
    .patch(`/api/tickets/${ticket.id}/assign`)
    .set("X-CSRF-Token", csrfToken)
    .send({});

  assert.equal(assignResponse.status, 403);

  const statusResponse = await agent
    .patch(`/api/tickets/${ticket.id}/status`)
    .set("X-CSRF-Token", csrfToken)
    .send({
      status: "in_progress",
    });

  assert.equal(statusResponse.status, 403);

  const priorityResponse = await agent
    .patch(`/api/tickets/${ticket.id}/priority`)
    .set("X-CSRF-Token", csrfToken)
    .send({
      priority: "high",
    });

  assert.equal(priorityResponse.status, 403);
});

test("suporte responsável deve seguir transições válidas até fechar o chamado", async () => {
  const userAgent = request.agent(app);
  const userCsrf = await login(userAgent, "user1@test.local");
  const ticket = await createTicket(userAgent, userCsrf);

  const supportAgent = request.agent(app);
  const supportCsrf = await login(
    supportAgent,
    "support1@test.local"
  );

  await supportAgent
    .patch(`/api/tickets/${ticket.id}/assign`)
    .set("X-CSRF-Token", supportCsrf)
    .send({})
    .expect(200);

  let response = await updateStatus(
    supportAgent,
    supportCsrf,
    ticket.id,
    "in_progress"
  );

  assert.equal(response.status, 200);

  response = await updateStatus(
    supportAgent,
    supportCsrf,
    ticket.id,
    "waiting_user"
  );

  assert.equal(response.status, 200);

  response = await updateStatus(
    supportAgent,
    supportCsrf,
    ticket.id,
    "resolved"
  );

  assert.equal(response.status, 200);

  response = await updateStatus(
    supportAgent,
    supportCsrf,
    ticket.id,
    "closed"
  );

  assert.equal(response.status, 200);

  const result = await pool.query(
    `
      SELECT status
      FROM tickets
      WHERE id = $1
    `,
    [ticket.id]
  );

  assert.equal(result.rows[0].status, "closed");
});

test("chamado fechado não deve permitir nova transição de status", async () => {
  const userAgent = request.agent(app);
  const userCsrf = await login(userAgent, "user1@test.local");
  const ticket = await createTicket(userAgent, userCsrf);

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

  await updateStatus(
    managerAgent,
    managerCsrf,
    ticket.id,
    "resolved"
  ).expect(200);

  await updateStatus(
    managerAgent,
    managerCsrf,
    ticket.id,
    "closed"
  ).expect(200);

  const response = await updateStatus(
    managerAgent,
    managerCsrf,
    ticket.id,
    "in_progress"
  );

  assert.equal(response.status, 400);
});

test("transição direta de open para resolved deve ser rejeitada", async () => {
  const userAgent = request.agent(app);
  const userCsrf = await login(userAgent, "user1@test.local");
  const ticket = await createTicket(userAgent, userCsrf);

  const managerAgent = request.agent(app);
  const managerCsrf = await login(
    managerAgent,
    "manager@test.local"
  );

  const response = await updateStatus(
    managerAgent,
    managerCsrf,
    ticket.id,
    "resolved"
  );

  assert.equal(response.status, 400);
});

test("gerente deve conseguir alterar prioridade do chamado", async () => {
  const userAgent = request.agent(app);
  const userCsrf = await login(userAgent, "user1@test.local");
  const ticket = await createTicket(userAgent, userCsrf);

  const managerAgent = request.agent(app);
  const managerCsrf = await login(
    managerAgent,
    "manager@test.local"
  );

  const response = await managerAgent
    .patch(`/api/tickets/${ticket.id}/priority`)
    .set("X-CSRF-Token", managerCsrf)
    .send({
      priority: "high",
    });

  assert.equal(response.status, 200);

  const result = await pool.query(
    `
      SELECT priority
      FROM tickets
      WHERE id = $1
    `,
    [ticket.id]
  );

  assert.equal(result.rows[0].priority, "high");
});

test("alterar prioridade para o valor atual deve retornar conflito", async () => {
  const userAgent = request.agent(app);
  const userCsrf = await login(userAgent, "user1@test.local");

  const ticket = await createTicket(userAgent, userCsrf, {
    priority: "high",
  });

  const managerAgent = request.agent(app);
  const managerCsrf = await login(
    managerAgent,
    "manager@test.local"
  );

  const response = await managerAgent
    .patch(`/api/tickets/${ticket.id}/priority`)
    .set("X-CSRF-Token", managerCsrf)
    .send({
      priority: "high",
    });

  assert.equal(response.status, 409);
});

test("chamado fechado não deve permitir alteração de prioridade", async () => {
  const userAgent = request.agent(app);
  const userCsrf = await login(userAgent, "user1@test.local");
  const ticket = await createTicket(userAgent, userCsrf);

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

  await updateStatus(
    managerAgent,
    managerCsrf,
    ticket.id,
    "resolved"
  ).expect(200);

  await updateStatus(
    managerAgent,
    managerCsrf,
    ticket.id,
    "closed"
  ).expect(200);

  const response = await managerAgent
    .patch(`/api/tickets/${ticket.id}/priority`)
    .set("X-CSRF-Token", managerCsrf)
    .send({
      priority: "critical",
    });

  assert.equal(response.status, 409);
});

test("chamado resolvido não deve permitir nova atribuição", async () => {
  const userAgent = request.agent(app);
  const userCsrf = await login(userAgent, "user1@test.local");
  const ticket = await createTicket(userAgent, userCsrf);

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

  await updateStatus(
    managerAgent,
    managerCsrf,
    ticket.id,
    "resolved"
  ).expect(200);

  const response = await managerAgent
    .patch(`/api/tickets/${ticket.id}/assign-user`)
    .set("X-CSRF-Token", managerCsrf)
    .send({
      userId: users["support1@test.local"],
    });

  assert.equal(response.status, 409);
});

test("listagem deve permitir filtro por prioridade", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "user1@test.local");

  await createTicket(agent, csrfToken, {
    title: "VPN Corporativa",
    priority: "high",
  });

  await createTicket(agent, csrfToken, {
    title: "Mouse sem funcionamento",
    category_id: categories.Hardware,
    priority: "low",
  });

  await createTicket(agent, csrfToken, {
    title: "Sistema indisponível",
    priority: "critical",
  });

  const response = await agent
    .get("/api/tickets")
    .query({
      priority: "high",
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.tickets.length, 1);
  assert.equal(response.body.tickets[0].priority, "high");
});

test("listagem deve permitir busca textual", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "user1@test.local");

  await createTicket(agent, csrfToken, {
    title: "VPN Corporativa",
    priority: "high",
  });

  await createTicket(agent, csrfToken, {
    title: "Mouse sem funcionamento",
    category_id: categories.Hardware,
  });

  const response = await agent
    .get("/api/tickets")
    .query({
      search: "VPN",
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.tickets.length, 1);
  assert.equal(response.body.tickets[0].title, "VPN Corporativa");
});

test("listagem deve respeitar paginação", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "user1@test.local");

  await createTicket(agent, csrfToken, {
    title: "Chamado 1",
  });

  await createTicket(agent, csrfToken, {
    title: "Chamado 2",
  });

  await createTicket(agent, csrfToken, {
    title: "Chamado 3",
  });

  const response = await agent
    .get("/api/tickets")
    .query({
      page: 1,
      limit: 2,
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.tickets.length, 2);
  assert.equal(response.body.pagination.page, 1);
  assert.equal(response.body.pagination.limit, 2);
  assert.equal(response.body.pagination.total, 3);
  assert.equal(response.body.pagination.total_pages, 2);
});

test("listagem deve rejeitar filtros inválidos", async () => {
  const agent = request.agent(app);
  await login(agent, "user1@test.local");

  let response = await agent
    .get("/api/tickets")
    .query({
      status: "status_inexistente",
    });

  assert.equal(response.status, 400);

  response = await agent
    .get("/api/tickets")
    .query({
      priority: "urgente",
    });

  assert.equal(response.status, 400);

  response = await agent
    .get("/api/tickets")
    .query({
      page: 0,
    });

  assert.equal(response.status, 400);

  response = await agent
    .get("/api/tickets")
    .query({
      limit: 101,
    });

  assert.equal(response.status, 400);
});