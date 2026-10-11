const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const bcrypt = require("bcrypt");

const app = require("../src/app");
const pool = require("../src/database/connection");

const TEST_PASSWORD = "SenhaTeste123!";

let passwordHash;
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
      "Assistente Financeiro",
    ]
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

test("GET /api/categories deve bloquear usuário não autenticado", async () => {
  const response = await request(app)
    .get("/api/categories");

  assert.equal(response.status, 401);
});

test("usuário autenticado deve visualizar somente categorias ativas", async () => {
  const agent = request.agent(app);

  await login(agent, "user@test.local");

  const response = await agent
    .get("/api/categories");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.categories));

  const names = response.body.categories.map(
    (category) => category.name
  );

  assert.ok(names.includes("Acesso"));
  assert.ok(names.includes("Hardware"));
  assert.ok(!names.includes("Categoria Desativada"));
});

test("usuário comum não deve criar categoria", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "user@test.local");

  const response = await agent
    .post("/api/categories")
    .set("X-CSRF-Token", csrfToken)
    .send({
      name: "Software",
    });

  assert.equal(response.status, 403);
});

test("suporte não deve criar categoria", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "support@test.local");

  const response = await agent
    .post("/api/categories")
    .set("X-CSRF-Token", csrfToken)
    .send({
      name: "Software",
    });

  assert.equal(response.status, 403);
});

test("gerente deve conseguir criar categoria", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "manager@test.local");

  const response = await agent
    .post("/api/categories")
    .set("X-CSRF-Token", csrfToken)
    .send({
      name: "  Software e Sistemas  ",
    });

  assert.equal(response.status, 201);
  assert.equal(
    response.body.category.name,
    "Software e Sistemas"
  );

  const result = await pool.query(
    `
      SELECT name, active
      FROM categories
      WHERE name = $1
    `,
    ["Software e Sistemas"]
  );

  assert.equal(result.rowCount, 1);
  assert.equal(result.rows[0].active, true);
});

test("criação deve rejeitar nome vazio", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "manager@test.local");

  const response = await agent
    .post("/api/categories")
    .set("X-CSRF-Token", csrfToken)
    .send({
      name: "   ",
    });

  assert.equal(response.status, 400);
});

test("criação deve rejeitar nome com mais de 100 caracteres", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "manager@test.local");

  const response = await agent
    .post("/api/categories")
    .set("X-CSRF-Token", csrfToken)
    .send({
      name: "A".repeat(101),
    });

  assert.equal(response.status, 400);
});

test("categoria duplicada deve retornar conflito", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "manager@test.local");

  const response = await agent
    .post("/api/categories")
    .set("X-CSRF-Token", csrfToken)
    .send({
      name: "acesso",
    });

  assert.equal(response.status, 409);
});

test("gerente deve conseguir renomear categoria", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "manager@test.local");

  const response = await agent
    .patch(`/api/categories/${categories.Acesso}`)
    .set("X-CSRF-Token", csrfToken)
    .send({
      name: "Acessos e Permissões",
    });

  assert.equal(response.status, 200);
  assert.equal(
    response.body.category.name,
    "Acessos e Permissões"
  );

  const result = await pool.query(
    `
      SELECT name
      FROM categories
      WHERE id = $1
    `,
    [categories.Acesso]
  );

  assert.equal(
    result.rows[0].name,
    "Acessos e Permissões"
  );
});

test("renomear categoria para nome já existente deve retornar conflito", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "manager@test.local");

  const response = await agent
    .patch(`/api/categories/${categories.Acesso}`)
    .set("X-CSRF-Token", csrfToken)
    .send({
      name: "hardware",
    });

  assert.equal(response.status, 409);
});

test("gerente deve conseguir desativar categoria", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "manager@test.local");

  const response = await agent
    .patch(`/api/categories/${categories.Acesso}/status`)
    .set("X-CSRF-Token", csrfToken)
    .send({
      active: false,
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.category.active, false);

  const listResponse = await agent
    .get("/api/categories");

  const names = listResponse.body.categories.map(
    (category) => category.name
  );

  assert.ok(!names.includes("Acesso"));
});

test("gerente deve conseguir reativar categoria", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "manager@test.local");

  const response = await agent
    .patch(
      `/api/categories/${categories["Categoria Desativada"]}/status`
    )
    .set("X-CSRF-Token", csrfToken)
    .send({
      active: true,
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.category.active, true);

  const listResponse = await agent
    .get("/api/categories");

  const names = listResponse.body.categories.map(
    (category) => category.name
  );

  assert.ok(names.includes("Categoria Desativada"));
});

test("alteração de status deve exigir valor booleano", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "manager@test.local");

  const response = await agent
    .patch(`/api/categories/${categories.Acesso}/status`)
    .set("X-CSRF-Token", csrfToken)
    .send({
      active: "false",
    });

  assert.equal(response.status, 400);
});

test("usuário comum não deve renomear nem alterar status de categoria", async () => {
  const agent = request.agent(app);
  const csrfToken = await login(agent, "user@test.local");

  const renameResponse = await agent
    .patch(`/api/categories/${categories.Acesso}`)
    .set("X-CSRF-Token", csrfToken)
    .send({
      name: "Nome Indevido",
    });

  assert.equal(renameResponse.status, 403);

  const statusResponse = await agent
    .patch(`/api/categories/${categories.Acesso}/status`)
    .set("X-CSRF-Token", csrfToken)
    .send({
      active: false,
    });

  assert.equal(statusResponse.status, 403);
});