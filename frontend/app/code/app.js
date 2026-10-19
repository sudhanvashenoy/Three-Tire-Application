const API = window.API_URL;

const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const list = document.getElementById("task-list");
const empty = document.getElementById("empty");
const statusEl = document.getElementById("status");

async function checkHealth() {
  try {
    const res = await fetch(`${API}/health`);
    const data = await res.json();
    statusEl.textContent = `Backend: ${data.status} | Database: ${data.database}`;
    statusEl.className = "status ok";
  } catch (err) {
    statusEl.textContent = "Backend unreachable. Is it running on " + API + " ?";
    statusEl.className = "status error";
  }
}

async function loadTasks() {
  try {
    const res = await fetch(`${API}/tasks`);
    const tasks = await res.json();
    render(tasks);
  } catch (err) {
    console.error(err);
  }
}

function render(tasks) {
  list.innerHTML = "";
  empty.hidden = tasks.length > 0;

  tasks.forEach((task) => {
    const li = document.createElement("li");
    if (task.done) li.classList.add("done");

    const span = document.createElement("span");
    span.textContent = task.title;
    span.addEventListener("click", () => toggleTask(task.id));

    const del = document.createElement("button");
    del.textContent = "Delete";
    del.className = "delete";
    del.addEventListener("click", () => deleteTask(task.id));

    li.append(span, del);
    list.appendChild(li);
  });
}

async function addTask(title) {
  await fetch(`${API}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  loadTasks();
}

async function toggleTask(id) {
  await fetch(`${API}/tasks/${id}`, { method: "PUT" });
  loadTasks();
}

async function deleteTask(id) {
  await fetch(`${API}/tasks/${id}`, { method: "DELETE" });
  loadTasks();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  input.value = "";
  addTask(title);
});

checkHealth();
loadTasks();
