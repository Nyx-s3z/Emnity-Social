require("dotenv").config();

const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Pool } = require("pg");
const PgSession = require("connect-pg-simple")(session);
const crypto = require("crypto");
const path = require("path");

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 3000);

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL. Copy .env.example to .env and configure PostgreSQL.");
  process.exit(1);
}
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.error("SESSION_SECRET must be a random value at least 32 characters long.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
app.set("trust proxy", isProduction ? 1 : false);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));

app.use(session({
  store: new PgSession({ pool, tableName: "emnity_sessions", createTableIfMissing: true }),
  name: "emnity.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use(express.static(path.join(__dirname, "public")));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a little and try again." }
});

const cleanUsername = value => typeof value === "string" ? value.trim() : "";
const validUsername = value => /^[a-zA-Z0-9_]{3,20}$/.test(value);
const validPassword = value => typeof value === "string" && value.length >= 12 && value.length <= 128;

function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(key.toString("hex")));
  });
}
async function verifyPassword(password, salt, storedHash) {
  const candidate = Buffer.from(await hashPassword(password, salt), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}
function publicUser(row) {
  return { id: row.id, username: row.username, displayName: row.display_name || row.username, createdAt: row.created_at };
}
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Please sign in first." });
  next();
}
function requireSameOrigin(req, res, next) {
  const origin = req.get("origin");
  if (!origin) return next();
  try {
    if (new URL(origin).host !== req.get("host")) return res.status(403).json({ error: "Request origin was not accepted." });
  } catch {
    return res.status(403).json({ error: "Invalid request origin." });
  }
  next();
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username VARCHAR(20) NOT NULL UNIQUE,
      display_name VARCHAR(32) NOT NULL,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Database ready.");
}

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "Emnity Social" }));

app.get("/api/me", async (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  try {
    const result = await pool.query("SELECT id, username, display_name, created_at FROM users WHERE id = $1", [req.session.userId]);
    if (!result.rows[0]) {
      req.session.destroy(() => {});
      return res.json({ user: null });
    }
    res.json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    console.error("Session lookup failed:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

app.post("/api/register", authLimiter, requireSameOrigin, async (req, res) => {
  const username = cleanUsername(req.body.username).toLowerCase();
  const displayName = typeof req.body.displayName === "string" ? req.body.displayName.trim().slice(0, 32) : username;
  const password = req.body.password;
  if (!validUsername(username)) return res.status(400).json({ error: "Username must be 3–20 characters using letters, numbers, or underscores." });
  if (!validPassword(password)) return res.status(400).json({ error: "Password must be between 12 and 128 characters." });

  try {
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = await hashPassword(password, salt);
    const result = await pool.query(
      `INSERT INTO users (username, display_name, password_salt, password_hash)
       VALUES ($1, $2, $3, $4) RETURNING id, username, display_name, created_at`,
      [username, displayName || username, salt, passwordHash]
    );
    req.session.regenerate(error => {
      if (error) {
        console.error("Session regeneration failed:", error);
        return res.status(500).json({ error: "Account created, but sign-in failed. Please sign in." });
      }
      req.session.userId = result.rows[0].id;
      req.session.save(saveError => {
        if (saveError) return res.status(500).json({ error: "Account created, but sign-in failed. Please sign in." });
        res.status(201).json({ user: publicUser(result.rows[0]) });
      });
    });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "That username is already taken." });
    console.error("Registration failed:", error);
    res.status(500).json({ error: "Could not create your account right now." });
  }
});

app.post("/api/login", authLimiter, requireSameOrigin, async (req, res) => {
  const username = cleanUsername(req.body.username).toLowerCase();
  const password = req.body.password;
  if (!username || typeof password !== "string") return res.status(400).json({ error: "Enter your username and password." });
  try {
    const result = await pool.query(
      "SELECT id, username, display_name, password_salt, password_hash, created_at FROM users WHERE LOWER(username) = LOWER($1)",
      [username]
    );
    const user = result.rows[0];
    if (!user || !(await verifyPassword(password, user.password_salt, user.password_hash))) {
      return res.status(401).json({ error: "Incorrect username or password." });
    }
    req.session.regenerate(error => {
      if (error) return res.status(500).json({ error: "Could not start your session." });
      req.session.userId = user.id;
      req.session.save(saveError => {
        if (saveError) return res.status(500).json({ error: "Could not start your session." });
        res.json({ user: publicUser(user) });
      });
    });
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({ error: "Could not sign in right now." });
  }
});

app.post("/api/logout", requireSameOrigin, (req, res) => {
  req.session.destroy(error => {
    if (error) return res.status(500).json({ error: "Could not sign out." });
    res.clearCookie("emnity.sid", { httpOnly: true, secure: process.env.COOKIE_SECURE === "true", sameSite: "lax" });
    res.json({ ok: true });
  });
});

app.patch("/api/profile", requireAuth, requireSameOrigin, async (req, res) => {
  const displayName = typeof req.body.displayName === "string" ? req.body.displayName.trim() : "";
  if (displayName.length < 1 || displayName.length > 32) return res.status(400).json({ error: "Display name must be 1–32 characters." });
  try {
    const result = await pool.query(
      "UPDATE users SET display_name = $1 WHERE id = $2 RETURNING id, username, display_name, created_at",
      [displayName, req.session.userId]
    );
    res.json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    console.error("Profile update failed:", error);
    res.status(500).json({ error: "Could not update your profile." });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

initializeDatabase()
  .then(() => app.listen(port, () => console.log(`Emnity Social running on port ${port}`)))
  .catch(error => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
