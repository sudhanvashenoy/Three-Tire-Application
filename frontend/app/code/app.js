const API = window.API_URL;
const TOKEN_KEY = "token";

const statusEl = document.getElementById("status");
const authView = document.getElementById("auth-view");
const appView = document.getElementById("app-view");
const authForm = document.getElementById("auth-form");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authSubmit = document.getElementById("auth-submit");
const authError = document.getElementById("auth-error");
const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const welcome = document.getElementById("welcome");
const logoutBtn = document.getElementById("logout");
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const list = document.getElementById("task-list");
const empty = document.getElementById("empty");

let mode = "login";

// ---------- helpers ----------
function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
}
function setToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch (e) {}
}
function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
}

// Calls the backend and adds the login token automatically
async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });

  let data = null;
  if (res.status !== 204) {
    try { data = await res.json(); } catch (e) {}
  }
  if (res.status === 401 && token) {
    logout();
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    throw new Error((data && data.error) || "Request failed");
  }
  return data;
}

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

// ---------- views ----------
function showAuth() {
  appView.hidden = true;
  authView.hidden = false;
}

function showApp(user) {
  authView.hidden = true;
  appView.hidden = false;
  welcome.textContent = `Hello, ${user.name}`;
  loadTasks();
}

function setMode(newMode) {
  mode = newMode;
  const isRegister = mode === "register";
  tabLogin.classList.toggle("active", !isRegister);
  tabRegister.classList.toggle("active", isRegister);
  nameInput.hidden = !isRegister;
  nameInput.required = isRegister;
  authSubmit.textContent = isRegister ? "Create account" : "Login";
  passwordInput.autocomplete = isRegister ? "new-password" : "current-password";
  authError.hidden = true;
}

function logout() {
  clearToken();
  list.innerHTML = "";
  authForm.reset();
  setMode("login");
  showAuth();
}

// ---------- login / register ----------
tabLogin.addEventListener("click", () => setMode("login"));
tabRegister.addEventListener("click", () => setMode("register"));
logoutBtn.addEventListener("click", logout);

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.hidden = true;

  const body = { email: emailInput.value, password: passwordInput.value };
  if (mode === "register") body.name = nameInput.value;

  try {
    const data = await api(`/auth/${mode}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    setToken(data.token);
    authForm.reset();
    showApp(data.user);
  } catch (err) {
    authError.textContent = err.message;
    authError.hidden = false;
  }
});

// ---------- tasks ----------
async function loadTasks() {
  try {
    const tasks = await api("/tasks");
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
  await api("/tasks", { method: "POST", body: JSON.stringify({ title }) });
  loadTasks();
}

async function toggleTask(id) {
  await api(`/tasks/${id}`, { method: "PUT" });
  loadTasks();
}

async function deleteTask(id) {
  await api(`/tasks/${id}`, { method: "DELETE" });
  loadTasks();
}

taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;
  taskInput.value = "";
  addTask(title).catch((err) => console.error(err));
});

// ---------- start ----------
async function start() {
  setMode("login");
  checkHealth();
  if (!getToken()) return showAuth();
  try {
    const user = await api("/auth/me");
    showApp(user);
  } catch (err) {
    showAuth();
  }
}

start();
