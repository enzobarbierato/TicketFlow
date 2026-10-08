const express = require("express");

const sessionMiddleware = require("./config/session");

const usersRoutes = require("./routes/usersRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(sessionMiddleware);

app.get("/", (req, res) => {
  res.send("TicketFlow API está funcionando.");
});

app.use("/api/users", usersRoutes);
app.use("/api/auth", authRoutes);

module.exports = app;