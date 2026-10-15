import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, Navigate } from "react-router-dom";
import API from "./api";

// ---------- Navbar ----------
function Nav({ user, onLogout }) {
  return (
    <nav>
      <Link to="/" className="brand">My Blog</Link>
      <div>
        <Link to="/">Home</Link>
        {user ? (
          <>
            <Link to="/new">Write Post</Link>
            <span style={{ marginLeft: 16 }}>Hi, {user.name}</span>
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

// ---------- Login + Register (same form, two modes) ----------
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

// ---------- Home: list all posts ----------
function Home() {
  const [posts, setPosts] = useState([]);
  useEffect(() => { API.get("/posts").then((r) => setPosts(r.data)); }, []);
  return (
    <div className="container">
      <h2>All blog posts</h2>
      {posts.length === 0 && <p className="muted">No posts yet. Login and write the first one!</p>}
      <div className="grid">
        {posts.map((p) => (
          <div className="card" key={p._id}>
            <h3>{p.title}</h3>
            <p className="muted">by {p.author?.name} • {new Date(p.createdAt).toLocaleDateString()}</p>
            <p>{p.content.slice(0, 100)}{p.content.length > 100 && "..."}</p>
            <Link to={`/post/${p._id}`} className="btn">Read more</Link>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Single post (read, edit, delete) ----------
function PostView({ user }) {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { API.get(`/posts/${id}`).then((r) => setPost(r.data)).catch(() => navigate("/")); }, [id]);

  const remove = async () => {
    if (!window.confirm("Delete this post?")) return;
    await API.delete(`/posts/${id}`);
    navigate("/");
  };

  if (!post) return <div className="container">Loading...</div>;
  const isOwner = user && post.author?._id === user.id;

  return (
    <div className="container">
      <div className="card">
        <h2>{post.title}</h2>
        <p className="muted">by {post.author?.name} • {new Date(post.createdAt).toLocaleString()}</p>
        <p style={{ whiteSpace: "pre-wrap" }}>{post.content}</p>
        {isOwner && (
          <div className="row">
            <Link to={`/edit/${post._id}`} className="btn">Edit</Link>
            <button className="danger" onClick={remove}>Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Create / Edit post ----------
function PostForm() {
  const { id } = useParams(); // if there is an id we are editing
  const [form, setForm] = useState({ title: "", content: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (id) API.get(`/posts/${id}`).then((r) => setForm({ title: r.data.title, content: r.data.content }));
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (id) await API.put(`/posts/${id}`, form);
      else await API.post("/posts", form);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Could not save");
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>{id ? "Edit post" : "Write a new post"}</h2>
        <form onSubmit={submit}>
          <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea placeholder="Write something..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          {error && <div className="error">{error}</div>}
          <button>{id ? "Update" : "Publish"}</button>
        </form>
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
        <Route path="/" element={<Home />} />
        <Route path="/post/:id" element={<PostView user={user} />} />
        <Route path="/new" element={user ? <PostForm /> : <Navigate to="/login" />} />
        <Route path="/edit/:id" element={user ? <PostForm /> : <Navigate to="/login" />} />
        <Route path="/login" element={<AuthPage mode="login" onLogin={onLogin} />} />
        <Route path="/register" element={<AuthPage mode="register" onLogin={onLogin} />} />
      </Routes>
    </BrowserRouter>
  );
}
