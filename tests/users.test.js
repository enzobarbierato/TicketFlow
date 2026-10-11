const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const bcrypt = require("bcrypt");

const app = require("../src/app");
const pool = require("../src/database/connection");

const TEST_PASSWORD = "SenhaTeste123!";
let passwordHash;

async function resetDatabase() {
  await pool.query(`
    TRUNCATE TABLE
      ticket_history,
      ticket_messages,
      tickets,
      user_sessions,
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
        ($10, $11, $3, $12, $13, 'user')
    `,
    [
      "Gerente Teste",
      "manager@test.local",
      passwordHash,
      "Tecnologia",
      "Gerente de TI",

      "Suporte Teste",
      "support@test.local",
      "Tecnologia",
      "Analista de Suporte",

      "Usuário Teste",
      "user@test.local",
      "Financeiro",
      "Assistente Administrativo",
    ]
  );
}

function createUserPayload(overrides = {}) {
  return {
    name: "Novo Usuário",
    email: "novo@test.local",
    password: "OutraSenha123!",
    department: "Tecnologia",
    job_title: "Analista",
    role: "user",
    ...overrides,
  };
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
});

after(async () => {
  await resetDatabase();
  await pool.end();
});

test("POST /api/users deve bloquear usuário não autenticado", async () => {
  const agent = request.agent(app);
  const csrfToken = await getCsrfToken(agent);

  const response = await agent
    .post("/api/users")
    .set("X-CSRF-Token", csrfToken)
    .send(createUserPayload());

  assert.equal(response.status, 401);
});

test("POST /api/users deve bloquear usuário comum", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "user@test.local");

  const response = await agent
    .post("/api/users")
    .set("X-CSRF-Token", csrfToken)
    .send(createUserPayload());

  assert.equal(response.status, 403);
});

test("POST /api/users deve bloquear suporte", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "support@test.local");

  const response = await agent
    .post("/api/users")
    .set("X-CSRF-Token", csrfToken)
    .send(createUserPayload());

  assert.equal(response.status, 403);
});

test("gerente deve conseguir criar usuário comum", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "manager@test.local");

  const response = await agent
    .post("/api/users")
    .set("X-CSRF-Token", csrfToken)
    .send(
      createUserPayload({
        name: "Usuário Criado",
        email: "usuario.criado@test.local",
        department: "Financeiro",
        job_title: "Assistente Financeiro",
        role: "user",
      })
    );

  assert.equal(response.status, 201);

  const result = await pool.query(
    `
      SELECT
        name,
        email,
        department,
        job_title,
        role
      FROM users
      WHERE email = $1
    `,
    ["usuario.criado@test.local"]
  );

  assert.equal(result.rowCount, 1);
  assert.equal(result.rows[0].name, "Usuário Criado");
  assert.equal(result.rows[0].email, "usuario.criado@test.local");
  assert.equal(result.rows[0].department, "Financeiro");
  assert.equal(result.rows[0].job_title, "Assistente Financeiro");
  assert.equal(result.rows[0].role, "user");
});

test("gerente deve conseguir criar usuário de suporte", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "manager@test.local");

  const response = await agent
    .post("/api/users")
    .set("X-CSRF-Token", csrfToken)
    .send(
      createUserPayload({
        name: "Novo Suporte",
        email: "novo.suporte@test.local",
        department: "Tecnologia",
        job_title: "Técnico de Suporte",
        role: "support",
      })
    );

  assert.equal(response.status, 201);

  const result = await pool.query(
    `
      SELECT
        name,
        email,
        department,
        job_title,
        role
      FROM users
      WHERE email = $1
    `,
    ["novo.suporte@test.local"]
  );

  assert.equal(result.rowCount, 1);
  assert.equal(result.rows[0].name, "Novo Suporte");
  assert.equal(result.rows[0].role, "support");
  assert.equal(result.rows[0].department, "Tecnologia");
  assert.equal(result.rows[0].job_title, "Técnico de Suporte");
});

test("gerente não deve conseguir criar outro gerente pela API", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "manager@test.local");

  const response = await agent
    .post("/api/users")
    .set("X-CSRF-Token", csrfToken)
    .send(
      createUserPayload({
        name: "Gerente Indevido",
        email: "gerente.indevido@test.local",
        department: "Tecnologia",
        job_title: "Gerente de TI",
        role: "manager",
      })
    );

  assert.equal(response.status, 400);

  const result = await pool.query(
    `
      SELECT id
      FROM users
      WHERE email = $1
    `,
    ["gerente.indevido@test.local"]
  );

  assert.equal(result.rowCount, 0);
});

test("POST /api/users deve rejeitar email duplicado", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "manager@test.local");

  const response = await agent
    .post("/api/users")
    .set("X-CSRF-Token", csrfToken)
    .send(
      createUserPayload({
        name: "Email Repetido",
        email: "user@test.local",
        department: "Financeiro",
        job_title: "Analista Financeiro",
        role: "user",
      })
    );

  assert.equal(response.status, 409);
});