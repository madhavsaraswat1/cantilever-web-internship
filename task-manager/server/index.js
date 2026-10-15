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

const Task = mongoose.model(
  "Task",
  new mongoose.Schema(
    {
      title: { type: String, required: true },
      description: { type: String, default: "" },
      status: { type: String, enum: ["pending", "in-progress", "done"], default: "pending" },
      priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
      dueDate: Date,
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
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
app.get("/", (req, res) => res.send("Task Manager API is running"));

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

// ---------- Task CRUD (each user sees only their own tasks) ----------
// Example: GET /api/tasks?status=done&priority=high&sort=dueDate
app.get("/api/tasks", auth, wrap(async (req, res) => {
  const filter = { user: req.userId };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;
  const allowedSort = ["createdAt", "-createdAt", "dueDate", "-dueDate", "title"];
  const sortBy = allowedSort.includes(req.query.sort) ? req.query.sort : "-createdAt";
  res.json(await Task.find(filter).sort(sortBy));
}));

app.post("/api/tasks", auth, wrap(async (req, res) => {
  if (!req.body.title) return res.status(400).json({ message: "Title is required" });
  res.status(201).json(await Task.create({ ...req.body, user: req.userId }));
}));

app.put("/api/tasks/:id", auth, wrap(async (req, res) => {
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!task) return res.status(404).json({ message: "Task not found" });
  res.json(task);
}));

app.delete("/api/tasks/:id", auth, wrap(async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!task) return res.status(404).json({ message: "Task not found" });
  res.json({ message: "Deleted" });
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

app.listen(process.env.PORT || 5000, () => console.log("Server running"));
