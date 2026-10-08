const session = require("express-session");

const sessionMiddleware = session({
  name: "ticketflow.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,

  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 8,
  },
});

module.exports = sessionMiddleware;