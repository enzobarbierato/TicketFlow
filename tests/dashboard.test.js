const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const bcrypt = require("bcrypt");

const app = require("../src/app");
const pool = require("../src/database/connection");

const TEST_PASSWORD = "SenhaTeste123!";

let passwordHash;
let users = {};
let categoryId;

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
        ($14, $15, $3, $16, $17, 'user')
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

      "Usuário Teste",
      "user@test.local",
      "Financeiro",
      "Assistente Financeiro",
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

async function createBaseCategory() {
  const result = await pool.query(`
    INSERT INTO categories (name, active)
    VALUES ('Acesso', true)
    RETURNING id
  `);

  categoryId = result.rows[0].id;
}

async function createTicket({
  title,
  status = "open",
  priority = "medium",
  assignedTo = null,
}) {
  const result = await pool.query(
    `
      INSERT INTO tickets (
        title,
        description,
        category_id,
        priority,
        status,
        created_by,
        assigned_to
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
      )
      RETURNING id
    `,
    [
      title,
      "Descrição do chamado de teste.",
      categoryId,
      priority,
      status,
      users["user@test.local"],
      assignedTo,
    ]
  );

  return result.rows[0];
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

before(async () => {
  passwordHash = await bcrypt.hash(TEST_PASSWORD, 4);
});

beforeEach(async () => {
  await resetDatabase();
  await createBaseUsers();
  await createBaseCategory();
});

after(async () => {
  await resetDatabase();
  await pool.end();
});

test("GET /api/dashboard deve bloquear usuário não autenticado", async () => {
  const response = await request(app)
    .get("/api/dashboard");

  assert.equal(response.status, 401);
});

test("usuário comum não deve acessar dashboard do suporte", async () => {
  const agent = request.agent(app);

  await login(agent, "user@test.local");

  const response = await agent
    .get("/api/dashboard");

  assert.equal(response.status, 403);
});

test("gerente não deve acessar dashboard do suporte", async () => {
  const agent = request.agent(app);

  await login(agent, "manager@test.local");

  const response = await agent
    .get("/api/dashboard");

  assert.equal(response.status, 403);
});

test("suporte deve acessar dashboard operacional", async () => {
  const agent = request.agent(app);

  await login(agent, "support1@test.local");

  const response = await agent
    .get("/api/dashboard");

  assert.equal(response.status, 200);
  assert.ok(response.body.dashboard);

  assert.deepEqual(response.body.dashboard, {
    available: 0,
    assigned_to_me: 0,
    in_progress: 0,
    waiting_user: 0,
    critical: 0,
    resolved: 0,
  });
});

test("dashboard deve calcular corretamente todas as métricas do suporte", async () => {
  const supportOneId =
    users["support1@test.local"];

  const supportTwoId =
    users["support2@test.local"];

  await createTicket({
    title: "Disponível comum",
    status: "open",
  });

  await createTicket({
    title: "Disponível crítico",
    status: "open",
    priority: "critical",
  });

  await createTicket({
    title: "Em andamento do suporte",
    status: "in_progress",
    assignedTo: supportOneId,
  });

  await createTicket({
    title: "Aguardando usuário",
    status: "waiting_user",
    assignedTo: supportOneId,
  });

  await createTicket({
    title: "Crítico atribuído ao suporte",
    status: "in_progress",
    priority: "critical",
    assignedTo: supportOneId,
  });

  await createTicket({
    title: "Resolvido pelo suporte",
    status: "resolved",
    assignedTo: supportOneId,
  });

  await createTicket({
    title: "Fechado do suporte",
    status: "closed",
    priority: "critical",
    assignedTo: supportOneId,
  });

  await createTicket({
    title: "Chamado de outro suporte",
    status: "in_progress",
    priority: "critical",
    assignedTo: supportTwoId,
  });

  const agent = request.agent(app);

  await login(
    agent,
    "support1@test.local"
  );

  const response = await agent
    .get("/api/dashboard");

  assert.equal(response.status, 200);

  assert.deepEqual(response.body.dashboard, {
    available: 2,
    assigned_to_me: 4,
    in_progress: 2,
    waiting_user: 1,
    critical: 2,
    resolved: 1,
  });
});

test("dashboard deve considerar apenas os chamados atribuídos ao suporte autenticado", async () => {
  const supportOneId =
    users["support1@test.local"];

  const supportTwoId =
    users["support2@test.local"];

  await createTicket({
    title: "Chamado suporte um",
    status: "in_progress",
    assignedTo: supportOneId,
  });

  await createTicket({
    title: "Chamado suporte dois",
    status: "in_progress",
    assignedTo: supportTwoId,
  });

  await createTicket({
    title: "Resolvido suporte dois",
    status: "resolved",
    assignedTo: supportTwoId,
  });

  const agent = request.agent(app);

  await login(
    agent,
    "support1@test.local"
  );

  const response = await agent
    .get("/api/dashboard");

  assert.equal(response.status, 200);

  assert.equal(
    response.body.dashboard.assigned_to_me,
    1
  );

  assert.equal(
    response.body.dashboard.in_progress,
    1
  );

  assert.equal(
    response.body.dashboard.resolved,
    0
  );
});