const { before, after, test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const bcrypt = require("bcrypt");

const app = require("../src/app");
const pool = require("../src/database/connection");

let agent;

before(async () => {
  agent = request.agent(app);

  await pool.query(`
    TRUNCATE TABLE
      ticket_history,
      ticket_messages,
      tickets,
      categories,
      user_sessions,
      users
    RESTART IDENTITY CASCADE;
  `);

  const passwordHash = await bcrypt.hash(
    "GerenteTeste@123",
    12
  );

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
      VALUES ($1, $2, $3, $4, $5, $6);
    `,
    [
      "Gerente Teste Automatizado",
      "manager.test@ticketflow.local",
      passwordHash,
      "Tecnologia",
      "Gerente de TI",
      "manager",
    ]
  );
});

after(async () => {
  await pool.query(`
    TRUNCATE TABLE
      ticket_history,
      ticket_messages,
      tickets,
      categories,
      user_sessions,
      users
    RESTART IDENTITY CASCADE;
  `);

  await pool.end();
});

test("GET /api/auth/csrf-token deve gerar um token CSRF", async () => {
  const response = await agent
    .get("/api/auth/csrf-token")
    .expect(200);

  assert.equal(
    typeof response.body.csrfToken,
    "string"
  );

  assert.ok(response.body.csrfToken.length > 0);
});

test("POST /api/auth/login deve bloquear requisição sem CSRF", async () => {
  const response = await agent
    .post("/api/auth/login")
    .send({
      email: "manager.test@ticketflow.local",
      password: "GerenteTeste@123",
    })
    .expect(403);

  assert.equal(
    response.body.message,
    "Token CSRF ausente ou inválido."
  );
});

test("login válido deve autenticar e regenerar o token CSRF", async () => {
  const csrfResponse = await agent
    .get("/api/auth/csrf-token")
    .expect(200);

  const oldToken = csrfResponse.body.csrfToken;

  const loginResponse = await agent
    .post("/api/auth/login")
    .set("X-CSRF-Token", oldToken)
    .send({
      email: "manager.test@ticketflow.local",
      password: "GerenteTeste@123",
    })
    .expect(200);

  assert.equal(
    loginResponse.body.user.email,
    "manager.test@ticketflow.local"
  );

  assert.equal(
    loginResponse.body.user.role,
    "manager"
  );

  assert.equal(
    typeof loginResponse.body.csrfToken,
    "string"
  );

  assert.notEqual(
    loginResponse.body.csrfToken,
    oldToken
  );
});

test("GET /api/auth/me deve retornar o usuário autenticado", async () => {
  const response = await agent
    .get("/api/auth/me")
    .expect(200);

  assert.equal(
    response.body.user.email,
    "manager.test@ticketflow.local"
  );

  assert.equal(
    response.body.user.role,
    "manager"
  );
});

test("token anterior ao login deve ser rejeitado", async () => {
  const secondAgent = request.agent(app);

  const csrfResponse = await secondAgent
    .get("/api/auth/csrf-token")
    .expect(200);

  const oldToken = csrfResponse.body.csrfToken;

  const loginResponse = await secondAgent
    .post("/api/auth/login")
    .set("X-CSRF-Token", oldToken)
    .send({
      email: "manager.test@ticketflow.local",
      password: "GerenteTeste@123",
    })
    .expect(200);

  const newToken = loginResponse.body.csrfToken;

  assert.notEqual(newToken, oldToken);

  const logoutWithOldToken = await secondAgent
    .post("/api/auth/logout")
    .set("X-CSRF-Token", oldToken)
    .expect(403);

  assert.equal(
    logoutWithOldToken.body.message,
    "Token CSRF ausente ou inválido."
  );

  await secondAgent
    .post("/api/auth/logout")
    .set("X-CSRF-Token", newToken)
    .expect(200);
});