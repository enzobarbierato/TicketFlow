const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(process.cwd(), ".env.test"),
  override: true,
});

if (process.env.NODE_ENV !== "test") {
  throw new Error(
    "Os testes só podem ser executados com NODE_ENV=test."
  );
}

if (process.env.DB_NAME !== "ticketflow_test") {
  throw new Error(
    "Os testes só podem utilizar o banco ticketflow_test."
  );
}