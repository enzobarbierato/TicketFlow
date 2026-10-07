require("dotenv").config();

const app = require("./app");
const pool = require("./database/connection");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await pool.query("SELECT 1");

    console.log("PostgreSQL conectado com sucesso.");

    app.listen(PORT, () => {
      console.log(`TicketFlow rodando em http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Erro ao conectar ao PostgreSQL:");
    console.error(error.message);
    process.exit(1);
  }
}

startServer();