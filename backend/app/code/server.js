const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool, initDb } = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

app.use(cors());
app.use(express.json());

function signToken(user) {
  return jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "8h" });
}

// Middleware: only logged-in users (valid token) may continue
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Login required" });
  }
  try {
    req.userId = jwt.verify(token, JWT_SECRET).id;
    next();
  } catch (err) {
    res.status(401).json({ error: "Session expired, please log in again" });
  }
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// ---------- Health ----------
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", database: "unreachable" });
  }
});

// ---------- Auth ----------
app.post("/api/auth/register", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are required" });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, hash]
    );
    res.status(201).json({ token: signToken(rows[0]), user: rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email is already registered" });
    }
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, password_hash FROM users WHERE email = $1",
      [email]
    );
    const user = rows[0];
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    res.json({
      token: signToken(user),
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Who am I? (used by the frontend to restore a session)
app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email FROM users WHERE id = $1",
      [req.userId]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: "User no longer exists" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

// ---------- Tasks (each user only sees their own) ----------
app.get("/api/tasks", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, title, done, created_at FROM tasks WHERE user_id = $1 ORDER BY id DESC",
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

app.post("/api/tasks", requireAuth, async (req, res) => {
  const title = String(req.body.title || "").trim();
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }
  try {
    const { rows } = await pool.query(
      "INSERT INTO tasks (title, user_id) VALUES ($1, $2) RETURNING id, title, done, created_at",
      [title, req.userId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

app.put("/api/tasks/:id", requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: "Task not found" });
  try {
    const { rows } = await pool.query(
      "UPDATE tasks SET done = NOT done WHERE id = $1 AND user_id = $2 RETURNING id, title, done, created_at",
      [id, req.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: "Task not found" });
  try {
    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2",
      [id, req.userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
