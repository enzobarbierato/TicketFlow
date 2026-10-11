const express = require("express");
const helmet = require("helmet");

const sessionMiddleware = require("./config/session");

const usersRoutes = require("./routes/usersRoutes");
const authRoutes = require("./routes/authRoutes");
const ticketsRoutes = require("./routes/ticketsRoutes");
const ticketMessagesRoutes = require("./routes/ticketMessagesRoutes");
const categoriesRoutes = require("./routes/categoriesRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const managementRoutes = require("./routes/managementRoutes");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.set("json spaces", 2);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(sessionMiddleware);

app.get("/", (req, res) => {
  res.send("TicketFlow API está funcionando.");
});

app.use("/api/users", usersRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketsRoutes);
app.use("/api/tickets", ticketMessagesRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/management", managementRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;