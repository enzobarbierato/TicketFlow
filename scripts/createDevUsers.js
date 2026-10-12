require("dotenv").config();

const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");
const bcrypt = require("bcrypt");

const pool = require("../src/database/connection");

const SALT_ROUNDS = 12;

async function main() {
  if (process.env.DB_NAME !== "ticketflow") {
    throw new Error(
      `Operação cancelada: banco atual é "${process.env.DB_NAME}".`
    );
  }

  const existingUsers = await pool.query(
    "SELECT COUNT(*)::INTEGER AS total FROM users"
  );

  if (existingUsers.rows[0].total > 0) {
    throw new Error(
      "Já existem usuários no banco. Operação cancelada."
    );
  }

  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
  });

  try {
    console.log("\nCriação das contas do TicketFlow\n");

    const managerPassword = await rl.question(
      "Senha do gerente: "
    );

    const supportPassword = await rl.question(
      "Senha do suporte: "
    );

    const userPassword = await rl.question(
      "Senha do usuário: "
    );

    if (
      !managerPassword ||
      !supportPassword ||
      !userPassword
    ) {
      throw new Error(
        "Todas as contas precisam possuir uma senha."
      );
    }

    const [
      managerHash,
      supportHash,
      userHash,
    ] = await Promise.all([
      bcrypt.hash(managerPassword, SALT_ROUNDS),
      bcrypt.hash(supportPassword, SALT_ROUNDS),
      bcrypt.hash(userPassword, SALT_ROUNDS),
    ]);

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const managerResult = await client.query(
        `
          INSERT INTO users (
            name,
            email,
            password_hash,
            department,
            job_title,
            role
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            'manager'
          )
          RETURNING id
        `,
        [
          "Marina Costa",
          "enzo.barbierato@ticketflow.com",
          managerHash,
          "Tecnologia",
          "Gerente de TI",
        ]
      );

      const managerId =
        managerResult.rows[0].id;

      await client.query(
        `
          INSERT INTO users (
            name,
            email,
            password_hash,
            department,
            job_title,
            created_by,
            role
          )
          VALUES
            (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              'support'
            ),
            (
              $7,
              $8,
              $9,
              $10,
              $11,
              $6,
              'user'
            )
        `,
        [
          "Lucas Almeida",
          "lucas.almeida@ticketflow.com",
          supportHash,
          "Tecnologia",
          "Analista de Suporte",
          managerId,

          "Ana Souza",
          "ana.souza@ticketflow.com",
          userHash,
          "Financeiro",
          "Analista Financeiro",
        ]
      );

      await client.query("COMMIT");

      console.log("\nContas criadas com sucesso:\n");
      console.log(
        "Gerente : enzo.barbierato@ticketflow.com"
      );
      console.log(
        "Suporte : lucas.almeida@ticketflow.com"
      );
      console.log(
        "Usuário : ana.souza@ticketflow.com"
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    rl.close();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("\nErro:", error.message);
  process.exitCode = 1;
});