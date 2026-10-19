const express = require("express");
const cors = require("cors");
const { pool, initDb } = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check (also confirms the DB is reachable)
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", database: "unreachable" });
  }
});

// List all tasks
app.get("/api/tasks", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, title, done, created_at FROM tasks ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Create a task
app.post("/api/tasks", async (req, res) => {
  const title = (req.body.title || "").trim();
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }
  try {
    const { rows } = await pool.query(
      "INSERT INTO tasks (title) VALUES ($1) RETURNING id, title, done, created_at",
      [title]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// Toggle done / not done
app.put("/api/tasks/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE tasks SET done = NOT done WHERE id = $1 RETURNING id, title, done, created_at",
      [req.params.id]
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

// Delete a task
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM tasks WHERE id = $1", [
      req.params.id,
    ]);
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
