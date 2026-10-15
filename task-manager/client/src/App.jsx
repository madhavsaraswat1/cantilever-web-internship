import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate } from "react-router-dom";
import API from "./api";

// ---------- Navbar ----------
function Nav({ user, onLogout }) {
  return (
    <nav>
      <Link to="/" className="brand">Task Manager</Link>
      <div>
        {user ? (
          <>
            <span>Hi, {user.name}</span>
            <a href="#logout" onClick={(e) => { e.preventDefault(); onLogout(); }}>Logout</a>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

// ---------- Login + Register ----------
function AuthPage({ mode, onLogin }) {
  const isRegister = mode === "register";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) {
        await API.post("/register", form);
        navigate("/login");
      } else {
        const { data } = await API.post("/login", form);
        onLogin(data.token, data.user);
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <div className="card">
        <h2>{isRegister ? "Create account" : "Login"}</h2>
        <form onSubmit={submit}>
          {isRegister && (
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          )}
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input type="password" placeholder="Password (min 6 characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {error && <div className="error">{error}</div>}
          <button>{isRegister ? "Register" : "Login"}</button>
        </form>
      </div>
    </div>
  );
}

// ---------- Tasks page ----------
const emptyForm = { title: "", description: "", priority: "medium", status: "pending", dueDate: "" };

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({ status: "", priority: "", sort: "-createdAt" });
  const [error, setError] = useState("");

  const load = async () => {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    params.sort = filters.sort;
    const { data } = await API.get("/tasks", { params });
    setTasks(data);
  };
  useEffect(() => { load(); }, [filters]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const body = { ...form, dueDate: form.dueDate || null };
      if (editingId) await API.put(`/tasks/${editingId}`, body);
      else await API.post("/tasks", body);
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save task");
    }
  };

  const startEdit = (t) => {
    setEditingId(t._id);
    setForm({
      title: t.title,
      description: t.description || "",
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeStatus = async (t, status) => { await API.put(`/tasks/${t._id}`, { status }); load(); };
  const remove = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    await API.delete(`/tasks/${id}`);
    load();
  };

  return (
    <div className="container">
      {/* Create / Update form */}
      <div className="card">
        <h2>{editingId ? "Edit task" : "Add a new task"}</h2>
        <form onSubmit={submit}>
          <input placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea style={{ minHeight: 70 }} placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="row">
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="pending">Pending</option>
              <option value="in-progress">In progress</option>
              <option value="done">Done</option>
            </select>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          {error && <div className="error">{error}</div>}
          <div className="row">
            <button>{editingId ? "Update task" : "Add task"}</button>
            {editingId && <button type="button" className="gray" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button>}
          </div>
        </form>
      </div>

      {/* Filter + sort */}
      <div className="card row">
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In progress</option>
          <option value="done">Done</option>
        </select>
        <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
          <option value="-createdAt">Newest first</option>
          <option value="createdAt">Oldest first</option>
          <option value="dueDate">Due date (earliest)</option>
          <option value="-dueDate">Due date (latest)</option>
          <option value="title">Title (A-Z)</option>
        </select>
      </div>

      {/* Task list */}
      {tasks.length === 0 && <p className="muted">No tasks found.</p>}
      <div className="grid">
        {tasks.map((t) => (
          <div className="card" key={t._id}>
            <h3 className={t.status === "done" ? "done" : ""}>{t.title}</h3>
            <p className="muted">{t.description}</p>
            <p>
              <span className={`badge ${t.priority}`}>{t.priority}</span>{" "}
              {t.dueDate && <span className="muted">Due: {new Date(t.dueDate).toLocaleDateString()}</span>}
            </p>
            <select value={t.status} onChange={(e) => changeStatus(t, e.target.value)}>
              <option value="pending">Pending</option>
              <option value="in-progress">In progress</option>
              <option value="done">Done</option>
            </select>
            <div className="row" style={{ marginTop: 10 }}>
              <button onClick={() => startEdit(t)}>Edit</button>
              <button className="danger" onClick={() => remove(t._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- App + routes ----------
export default function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));

  const onLogin = (token, u) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
  };
  const onLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Nav user={user} onLogout={onLogout} />
      <Routes>
        <Route path="/" element={user ? <Tasks /> : <Navigate to="/login" />} />
        <Route path="/login" element={<AuthPage mode="login" onLogin={onLogin} />} />
        <Route path="/register" element={<AuthPage mode="register" onLogin={onLogin} />} />
      </Routes>
    </BrowserRouter>
  );
}
