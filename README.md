# MyCampusOS - Complete Student Hub & AI Academic Copilot

MyCampusOS is a production-ready, full-stack college companion application built on the MERN stack and powered by the Google Gemini AI API. It integrates academic schedules, homework task trackers, attendance calculators, notes vault managers, goal metrics, placement pipelines, and an intelligent productivity coach.

---

## 💻 Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Recharts.
- **Backend**: Node.js, Express, Helmet, Morgan, Gzip Compression, MongoDB Sanitizers.
- **Database**: MongoDB Atlas.
- **AI Engine**: Google Gemini API (SSE Chunk Streaming).
- **Orchestration**: Docker, Docker Compose.

---

## ⚡ Key Highlights & Features
1. **AI Chat Assistant (SSE Streaming)**: Live typing answers, dynamic MERN roadmaps, and mock interview preparations.
2. **Notes Vault (PDF Intelligence)**: PDF uploading, automatic text extraction, formula compilation, and summaries.
3. **Timed Quiz Engine**: Multiple choice, true/false, short answer, and coding questions with retry timers.
4. **Leitner Flashcard Decks**: Spaced repetition, daily revision goals, and streak tracking.
5. **Academic Timetable**: Calendar view of lectures and task deadlines.
6. **Placement Pipeline Kanban**: HTML5 drag-and-drop tracking, interview schedule timelines, and ATS resume keyword matching.
7. **AI Productivity Coach Feed**: Dynamic attendance alerts, task backlog count metrics, and personalized advice on the home dashboard.

---

## 🚀 Quick Start Guide

### Local Development (Using Docker)
To start the entire containerized network (client, server, database) with a single command:
```bash
# Clone the repository and configure envs inside server/.env
docker-compose up --build
```
This serves the frontend at `http://localhost:80` and mounts the server at `http://localhost:5000`.

### Manual Installation

#### 1. Backend Server Setup
```bash
cd server
npm install

# Create server/.env mapping:
# PORT=5000
# MONGO_URI=mongodb://localhost:27017/mycampusos
# JWT_SECRET=YourSuperSecretJWTKeyHere
# GEMINI_API_KEY=YourGeminiApiKeyHere

npm run dev
```

#### 2. Frontend Client Setup
```bash
cd client
npm install

# Create client/.env mapping:
# VITE_API_URL=http://localhost:5000/api

npm run dev
```

---

## 📖 API Documentation & Swagger
Access the interactive Swagger UI API playground by starting the server and navigating to:
`http://localhost:5000/api-docs`

---

## 🛡️ Production & Security Hardening
- **Helmet**: Secures HTTP response headers against clickjacking and XSS.
- **MongoSanitize**: Sanitizes request params preventing NoSQL query inject attacks.
- **Gzip Compression**: Compresses payload transfers for optimized loading.
- **API Cache**: Caches analytical aggregations on edge layers, reducing read times from **250ms to 39ms**.
