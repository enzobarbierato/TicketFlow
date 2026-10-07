const express = require("express");
const usersRoutes = require("./routes/usersRoutes");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("TicketFlow API está funcionando.");
});

app.use("/api/users", usersRoutes);

module.exports = app;