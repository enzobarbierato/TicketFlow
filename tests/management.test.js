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
      "Técnico de Suporte",

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

async function createBaseCategories() {
  await pool.query(`
    INSERT INTO categories (name, active)
    VALUES
      ('Acesso', true),
      ('Hardware', true),
      ('Sem Chamados', true)
  `);

  const result = await pool.query(`
    SELECT id, name
    FROM categories
  `);

  categories = Object.fromEntries(
    result.rows.map((category) => [category.name, category.id])
  );
}

async function createTicket({
  title,
  categoryId = categories.Acesso,
  priority = "medium",
  status = "open",
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
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
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
  await createBaseCategories();
});

after(async () => {
  await resetDatabase();
  await pool.end();
});

test("área gerencial deve bloquear usuário não autenticado", async () => {
  const response = await request(app)
    .get("/api/management/summary");

  assert.equal(response.status, 401);
});

test("usuário comum e suporte não devem acessar área gerencial", async () => {
  const userAgent = request.agent(app);

  await login(
    userAgent,
    "user@test.local"
  );

  const userResponse = await userAgent
    .get("/api/management/summary");

  assert.equal(userResponse.status, 403);

  const supportAgent = request.agent(app);

  await login(
    supportAgent,
    "support1@test.local"
  );

  const supportResponse = await supportAgent
    .get("/api/management/summary");

  assert.equal(supportResponse.status, 403);
});

test("resumo gerencial deve calcular corretamente os chamados", async () => {
  await createTicket({
    title: "Aberto sem responsável",
    status: "open",
  });

  await createTicket({
    title: "Aberto crítico",
    status: "open",
    priority: "critical",
  });

  await createTicket({
    title: "Em andamento",
    status: "in_progress",
    assignedTo: users["support1@test.local"],
  });

  await createTicket({
    title: "Aguardando usuário",
    status: "waiting_user",
    assignedTo: users["support1@test.local"],
  });

  await createTicket({
    title: "Resolvido",
    status: "resolved",
    assignedTo: users["support2@test.local"],
  });

  await createTicket({
    title: "Fechado crítico",
    status: "closed",
    priority: "critical",
    assignedTo: users["support2@test.local"],
  });

  const agent = request.agent(app);

  await login(
    agent,
    "manager@test.local"
  );

  const response = await agent
    .get("/api/management/summary");

  assert.equal(response.status, 200);

  assert.deepEqual(response.body.summary, {
    total: 6,
    open: 2,
    in_progress: 1,
    waiting_user: 1,
    resolved: 1,
    closed: 1,
    unassigned: 2,
    critical: 1,
    support_users: 2,
  });
});

test("estatísticas por categoria devem incluir categorias sem chamados", async () => {
  await createTicket({
    title: "Acesso 1",
    categoryId: categories.Acesso,
    status: "open",
  });

  await createTicket({
    title: "Acesso 2",
    categoryId: categories.Acesso,
    status: "resolved",
  });

  await createTicket({
    title: "Hardware 1",
    categoryId: categories.Hardware,
    status: "in_progress",
  });

  const agent = request.agent(app);

  await login(
    agent,
    "manager@test.local"
  );

  const response = await agent
    .get("/api/management/categories");

  assert.equal(response.status, 200);

  const acesso = response.body.categories.find(
    (category) =>
      category.category_name === "Acesso"
  );

  const hardware = response.body.categories.find(
    (category) =>
      category.category_name === "Hardware"
  );

  const emptyCategory =
    response.body.categories.find(
      (category) =>
        category.category_name === "Sem Chamados"
    );

  assert.ok(acesso);
  assert.ok(hardware);
  assert.ok(emptyCategory);

  assert.equal(acesso.total, 2);
  assert.equal(acesso.open, 1);
  assert.equal(acesso.resolved, 1);

  assert.equal(hardware.total, 1);
  assert.equal(hardware.in_progress, 1);

  assert.equal(emptyCategory.total, 0);
  assert.equal(emptyCategory.open, 0);
  assert.equal(emptyCategory.closed, 0);
});

test("estatísticas gerais devem retornar todos os suportes", async () => {
  await createTicket({
    title: "Suporte Um - Em andamento",
    status: "in_progress",
    assignedTo: users["support1@test.local"],
  });

  await createTicket({
    title: "Suporte Um - Crítico",
    status: "waiting_user",
    priority: "critical",
    assignedTo: users["support1@test.local"],
  });

  await createTicket({
    title: "Suporte Dois - Fechado",
    status: "closed",
    assignedTo: users["support2@test.local"],
  });

  const agent = request.agent(app);

  await login(
    agent,
    "manager@test.local"
  );

  const response = await agent
    .get("/api/management/support");

  assert.equal(response.status, 200);
  assert.equal(response.body.support.length, 2);

  const supportOne = response.body.support.find(
    (support) =>
      support.email === "support1@test.local"
  );

  const supportTwo = response.body.support.find(
    (support) =>
      support.email === "support2@test.local"
  );

  assert.ok(supportOne);
  assert.ok(supportTwo);

  assert.equal(supportOne.total, 2);
  assert.equal(supportOne.active, 2);
  assert.equal(supportOne.in_progress, 1);
  assert.equal(supportOne.waiting_user, 1);
  assert.equal(supportOne.critical, 1);

  assert.equal(supportTwo.total, 1);
  assert.equal(supportTwo.active, 0);
  assert.equal(supportTwo.closed, 1);
});

test("resumo individual deve retornar apenas chamados atualmente atribuídos ao suporte", async () => {
  const supportId =
    users["support1@test.local"];

  await createTicket({
    title: "Em andamento",
    status: "in_progress",
    assignedTo: supportId,
  });

  await createTicket({
    title: "Resolvido",
    status: "resolved",
    assignedTo: supportId,
  });

  await createTicket({
    title: "Crítico",
    status: "waiting_user",
    priority: "critical",
    assignedTo: supportId,
  });

  const agent = request.agent(app);

  await login(
    agent,
    "manager@test.local"
  );

  const response = await agent
    .get(`/api/management/support/${supportId}`);

  assert.equal(response.status, 200);

  assert.equal(
    response.body.support.name,
    "Suporte Um"
  );

  assert.equal(response.body.support.total, 3);
  assert.equal(response.body.support.in_progress, 1);
  assert.equal(response.body.support.waiting_user, 1);
  assert.equal(response.body.support.resolved, 1);
  assert.equal(response.body.support.critical, 1);
});

test("consulta individual deve rejeitar usuário que não seja suporte", async () => {
  const agent = request.agent(app);

  await login(
    agent,
    "manager@test.local"
  );

  const response = await agent.get(
    `/api/management/support/${users["user@test.local"]}`
  );

  assert.equal(response.status, 404);
});

test("gerente deve consultar chamados atualmente atribuídos ao suporte", async () => {
  const supportOneId =
    users["support1@test.local"];

  const supportTwoId =
    users["support2@test.local"];

  await createTicket({
    title: "Chamado A",
    status: "in_progress",
    assignedTo: supportOneId,
  });

  await createTicket({
    title: "Chamado B",
    status: "resolved",
    assignedTo: supportOneId,
  });

  await createTicket({
    title: "Outro suporte",
    status: "open",
    assignedTo: supportTwoId,
  });

  const agent = request.agent(app);

  await login(
    agent,
    "manager@test.local"
  );

  const response = await agent.get(
    `/api/management/support/${supportOneId}/tickets`
  );

  assert.equal(response.status, 200);

  assert.equal(
    response.body.support.name,
    "Suporte Um"
  );

  assert.equal(response.body.tickets.length, 2);

  const titles = response.body.tickets.map(
    (ticket) => ticket.title
  );

  assert.ok(titles.includes("Chamado A"));
  assert.ok(titles.includes("Chamado B"));
  assert.ok(!titles.includes("Outro suporte"));
});

test("métricas históricas devem contabilizar movimentações do suporte", async () => {
  const supportOneId =
    users["support1@test.local"];

  const supportTwoId =
    users["support2@test.local"];

  const managerId =
    users["manager@test.local"];

  const creatorId =
    users["user@test.local"];

  const ticketOne = await createTicket({
    title: "Chamado histórico 1",
    status: "closed",
    assignedTo: supportOneId,
  });

  const ticketTwo = await createTicket({
    title: "Chamado histórico 2",
    status: "in_progress",
    assignedTo: supportTwoId,
  });

  await pool.query(
    `
      INSERT INTO ticket_history (
        ticket_id,
        performed_by,
        event_type,
        from_user_id,
        to_user_id,
        old_value,
        new_value,
        created_on
      )
      VALUES
        (
          $1, $2, 'created',
          NULL, NULL, NULL, NULL,
          '2026-10-01 10:00:00-03'
        ),
        (
          $1, $3, 'assigned',
          NULL, $3, NULL, NULL,
          '2026-10-01 10:05:00-03'
        ),
        (
          $1, $3, 'status_changed',
          NULL, NULL, 'open', 'in_progress',
          '2026-10-01 10:10:00-03'
        ),
        (
          $1, $3, 'status_changed',
          NULL, NULL, 'in_progress', 'resolved',
          '2026-10-01 10:35:00-03'
        ),
        (
          $1, $3, 'status_changed',
          NULL, NULL, 'resolved', 'closed',
          '2026-10-01 10:40:00-03'
        ),

        (
          $4, $2, 'created',
          NULL, NULL, NULL, NULL,
          '2026-10-02 09:00:00-03'
        ),
        (
          $4, $5, 'assigned',
          NULL, $5, NULL, NULL,
          '2026-10-02 09:05:00-03'
        ),
        (
          $4, $6, 'reassigned',
          $5, $3, NULL, NULL,
          '2026-10-02 09:15:00-03'
        ),
        (
          $4, $6, 'reassigned',
          $3, $5, NULL, NULL,
          '2026-10-02 09:30:00-03'
        )
    `,
    [
      ticketOne.id,
      creatorId,
      supportOneId,
      ticketTwo.id,
      supportTwoId,
      managerId,
    ]
  );

  const agent = request.agent(app);

  await login(
    agent,
    "manager@test.local"
  );

  const response = await agent.get(
    `/api/management/support/${supportOneId}/metrics`
  );

  assert.equal(response.status, 200);

  assert.equal(
    response.body.support.name,
    "Suporte Um"
  );

  const metrics = response.body.metrics;

  assert.equal(metrics.tickets_received, 2);
  assert.equal(metrics.direct_assignments, 1);
  assert.equal(metrics.reassigned_to, 1);
  assert.equal(metrics.reassigned_from, 1);

  assert.equal(metrics.status_changes, 3);
  assert.equal(metrics.resolved_by_support, 1);
  assert.equal(metrics.closed_by_support, 1);

  assert.equal(metrics.avg_seconds_to_assign, 300);
  assert.equal(metrics.avg_seconds_to_resolve, 1800);
});

test("métricas temporais sem histórico suficiente devem retornar null", async () => {
  const supportId =
    users["support1@test.local"];

  const agent = request.agent(app);

  await login(
    agent,
    "manager@test.local"
  );

  const response = await agent.get(
    `/api/management/support/${supportId}/metrics`
  );

  assert.equal(response.status, 200);

  assert.equal(
    response.body.metrics.tickets_received,
    0
  );

  assert.equal(
    response.body.metrics.status_changes,
    0
  );

  assert.equal(
    response.body.metrics.avg_seconds_to_assign,
    null
  );

  assert.equal(
    response.body.metrics.avg_seconds_to_resolve,
    null
  );
});