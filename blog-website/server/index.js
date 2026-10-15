require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err.message));

// ---------- Models ----------
const User = mongoose.model(
  "User",
  new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
  })
);

const Post = mongoose.model(
  "Post",
  new mongoose.Schema(
    {
      title: { type: String, required: true },
      content: { type: String, required: true },
      author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
  )
);

// ---------- Helpers ----------
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Please login first" });
  try {
    req.userId = jwt.verify(token, process.env.JWT_SECRET).id;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ---------- Auth routes ----------
app.get("/", (req, res) => res.send("Blog API is running"));

app.post("/api/register", wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ message: "Name, email and a password of 6+ characters are required" });
  if (await User.findOne({ email: email.toLowerCase() }))
    return res.status(400).json({ message: "Email already registered" });
  const hashed = await bcrypt.hash(password, 10);
  await User.create({ name, email, password: hashed });
  res.status(201).json({ message: "Registered successfully" });
}));

app.post("/api/login", wrap(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || "").toLowerCase() });
  if (!user || !(await bcrypt.compare(password || "", user.password)))
    return res.status(400).json({ message: "Wrong email or password" });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user._id, name: user.name } });
}));

// ---------- Blog CRUD ----------
app.get("/api/posts", wrap(async (req, res) => {
  res.json(await Post.find().populate("author", "name").sort({ createdAt: -1 }));
}));

app.get("/api/posts/:id", wrap(async (req, res) => {
  const post = await Post.findById(req.params.id).populate("author", "name");
  if (!post) return res.status(404).json({ message: "Post not found" });
  res.json(post);
}));

app.post("/api/posts", auth, wrap(async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ message: "Title and content required" });
  res.status(201).json(await Post.create({ title, content, author: req.userId }));
}));

app.put("/api/posts/:id", auth, wrap(async (req, res) => {
  const { title, content } = req.body;
  const post = await Post.findOneAndUpdate(
    { _id: req.params.id, author: req.userId }, // only the owner can edit
    { title, content },
    { new: true }
  );
  if (!post) return res.status(404).json({ message: "Post not found or not yours" });
  res.json(post);
}));

app.delete("/api/posts/:id", auth, wrap(async (req, res) => {
  const post = await Post.findOneAndDelete({ _id: req.params.id, author: req.userId });
  if (!post) return res.status(404).json({ message: "Post not found or not yours" });
  res.json({ message: "Deleted" });
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

app.listen(process.env.PORT || 5000, () => console.log("Server running"));
