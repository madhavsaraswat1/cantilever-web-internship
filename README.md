# Cantilever Web Development Internship

Two full-stack projects built with **React (Vite), Node.js/Express, MongoDB and JWT authentication**.

| Project | Features |
|---|---|
| `blog-website` | Register / login / logout, create-read-update-delete blog posts, only the author can edit or delete a post |
| `task-manager` | Register / login / logout, task CRUD, filter by status and priority, sort by date or title, responsive design |

## Live demo
- Blog: _add your Netlify link_
- Task Manager: _add your Netlify link_

## How to run locally
For each project (`blog-website` or `task-manager`):

**Backend**
```bash
cd server
npm install
cp .env.example .env     # then fill in MONGO_URI and JWT_SECRET
npm run dev
```

**Frontend** (new terminal)
```bash
cd client
npm install
npm run dev
```
Open http://localhost:5173

## Tech stack
React, React Router, Axios, Node.js, Express, MongoDB (Mongoose), JWT, bcrypt, Netlify (frontend), Render (backend)
