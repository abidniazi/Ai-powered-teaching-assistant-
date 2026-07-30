# AoA Virtual Assistant - Complete Codebase Documentation

**Project Name:** AoA Virtual Assistant (Analysis of Algorithms AI Tutor)  
**Version:** 0.1.0  
**Status:** Active Development  
**Last Updated:** May 5, 2026

---

## 📑 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Core Features](#core-features)
8. [Frontend Components](#frontend-components)
9. [Backend Utilities & Logic](#backend-utilities--logic)
10. [Data Flow & Workflows](#data-flow--workflows)
11. [Authentication System](#authentication-system)
12. [Current Status & Issues](#current-status--issues)
13. [Setup & Installation](#setup--installation)

---

## 🎓 Project Overview

### What is AoA Virtual Assistant?

**AoA Virtual Assistant** is a voice-enabled, domain-specific AI teaching assistant designed specifically for **Analysis of Algorithms (AoA)** education. It combines:

- **Custom AI Model** (Ollama + aoa-tutor) - Local LLM, no external API dependency
- **Smart Query Matching** - TF-IDF + cosine similarity for query-to-topic matching
- **Voice Interaction** - Speech-to-Text (STT) and Text-to-Speech (TTS)
- **User Authentication** - JWT-based login/signup system
- **Progress Tracking** - Records user queries and learning history
- **Domain Knowledge** - Comprehensive knowledge base for AoA topics

### Problem Statement

Traditional chatbots for learning:
- Generic responses (not domain-specific)
- Depend on external APIs (latency, cost, privacy)
- No learning/self-improvement

**AoA Assistant solves this** by:
- Using a curated knowledge base specific to Algorithms
- Running locally (no API dependency)
- Combining structured knowledge with AI reasoning
- Supporting voice interaction for accessibility

### Target Users

- Students learning Analysis of Algorithms
- Instructors seeking interactive teaching tools
- Self-learners wanting voice-based tutoring

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose | Version |
|------------|---------|---------|
| **React.js** | UI framework | 19.2.5 |
| **Tailwind CSS** | Styling | 3.3.5 |
| **Axios** | HTTP client | 1.15.0 |
| **Web Speech API** | Speech-to-Text & Text-to-Speech | Native |
| **React Scripts** | Build & dev server | 5.0.1 |

### Backend
| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime | Latest |
| **Express.js** | Web framework | 5.2.1 |
| **MongoDB** | Database | Via Mongoose 9.4.1 |
| **Mongoose** | ODM | 9.4.1 |
| **JWT** | Authentication | 9.0.3 |
| **bcryptjs** | Password hashing | 3.0.3 |
| **CORS** | Cross-origin requests | 2.8.6 |
| **Ollama** | Local LLM | 0.6.3 |
| **Nodemon** | Dev auto-reload | 3.1.14 |

### AI/ML
| Component | Purpose |
|-----------|---------|
| **Ollama** | Runs local LLMs on port 11434 |
| **aoa-tutor** | Custom-fine-tuned model (built from Modelfile) |
| **Llama3-8B** | Base model for aoa-tutor |
| **TF-IDF** | Query text embedding (implemented in matcher.js) |
| **Cosine Similarity** | Topic relevance scoring |

---

## 🏗️ Architecture

### High-Level Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER INTERACTION                          │
├──────────────────────────────────────────────────────────────────┤
│  Voice Input (STT)  →  Text Input  →  React Component           │
└───────────────────────────────┬────────────────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │  sendQuery() API Call  │
                    │  (via Axios)           │
                    └───────────┬────────────┘
                                │
        ┌───────────────────────▼──────────────────────┐
        │         EXPRESS BACKEND (Node.js)            │
        │              PORT: 3001                      │
        └───┬────────────────────────────────────────┬─┘
            │                                        │
    ┌───────▼─────────┐              ┌──────────────▼────┐
    │  Check Ollama   │              │  Query Routes     │
    │  Available?     │              │  (/query, etc)    │
    └────────┬────────┘              └────────┬─────────┘
             │                                │
    ┌────────▼──────────────────────────────────▼──────┐
    │   If Ollama Available → askAI() (Llama Response) │
    │   If Not Available → matchTopic() + KB Response  │
    └─────────────────┬────────────────────────────────┘
                      │
        ┌─────────────▼─────────────┐
        │   Response Builder        │
        │  (Format structured resp) │
        └──────────────┬────────────┘
                       │
        ┌──────────────▼────────────┐
        │   Save to MongoDB         │
        │  - Query log              │
        │  - User progress          │
        │  - Topic visited          │
        └──────────────┬────────────┘
                       │
        ┌──────────────▼────────────┐
        │   Send JSON Response      │
        │   Back to Frontend        │
        └──────────────┬────────────┘
                       │
        ┌──────────────▼────────────┐
        │  React Displays Response  │
        │  & Text-to-Speech (TTS)   │
        └───────────────────────────┘
```

### System Components

1. **Frontend (React)**
   - Handles user interaction (text/voice input)
   - Sends queries to backend via API
   - Displays responses with formatting
   - Manages UI state

2. **Backend (Express + Node)**
   - Receives queries
   - Routes to AI or knowledge base
   - Manages user authentication
   - Stores data in MongoDB

3. **AI Engine (Ollama + aoa-tutor)**
   - Local LLM running on port 11434
   - Provides intelligent responses for complex queries
   - Falls back if not available

4. **Knowledge Base (MongoDB)**
   - Topics collection: AoA concepts, algorithms, data structures
   - Queries collection: User query logs
   - Users collection: Authentication & profiles
   - Progress collection: Learning history

5. **Utilities (Matcher, Scorer, etc.)**
   - Query preprocessing
   - Topic matching using TF-IDF
   - Intent detection
   - Response formatting

---

## 📁 Project Structure

```
aoa-assistant/
│
├── package.json                 [Root dependencies: React, Tailwind, etc]
├── tailwind.config.js          [Tailwind CSS configuration]
├── postcss.config.js           [PostCSS configuration]
├── README.md                   [Project overview]
├── LICENSE                     [License file]
│
├── public/                     [Static assets]
│   ├── index.html             [HTML entry point]
│   ├── manifest.json          [PWA manifest]
│   └── robots.txt             [SEO robots file]
│
├── src/                        [Frontend - React]
│   ├── index.js               [React entry point]
│   ├── App.js                 [Root component]
│   ├── App.css                [Global styles]
│   ├── index.css              [Base CSS]
│   ├── reportWebVitals.js     [Performance metrics]
│   ├── setupTests.js          [Jest configuration]
│   │
│   ├── components/            [React components]
│   │   ├── MessageBubble.jsx        [Display messages]
│   │   ├── Navbar.jsx              [Navigation bar]
│   │   ├── ResponseCard.jsx        [Display AI responses]
│   │   ├── SpeechPlayer.jsx        [TTS playback]
│   │   └── VoiceButton.jsx         [STT recording button]
│   │
│   ├── pages/                 [Page components]
│   │   └── ChatPage.jsx            [Main chat interface]
│   │
│   └── services/              [API & utilities]
│       └── api.js                  [Axios instance + API calls]
│
└── aoa-backend/               [Backend - Express + Node]
    ├── package.json           [Backend dependencies]
    ├── server.js              [Express server entry point]
    ├── db.js                  [MongoDB connection]
    ├── Modelfile              [Ollama model definition]
    │
    ├── models/                [Mongoose schemas]
    │   ├── User.js                 [User schema]
    │   ├── Query.js                [Query log schema]
    │   ├── Topic.js                [Topic/Knowledge schema]
    │   ├── Progress.js             [User progress schema]
    │   └── UnknownQuery.js         [Unknown queries log]
    │
    ├── controllers/           [Request handlers]
    │   ├── authController.js       [Login/signup logic]
    │   ├── queryController.js      [Query handling logic]
    │   ├── topicController.js      [Topic retrieval]
    │   └── progressController.js   [Progress tracking]
    │
    ├── routes/                [API route definitions]
    │   ├── authRoutes.js           [POST /auth/signup, /auth/login]
    │   ├── queryRoutes.js          [POST /query]
    │   ├── topicRoutes.js          [GET /topics]
    │   └── progressRoutes.js       [GET /progress]
    │
    ├── middleware/            [Express middleware]
    │   └── auth.js                 [JWT verification]
    │
    ├── utils/                 [Core logic & helpers]
    │   ├── aiEngine.js             [Ollama integration]
    │   ├── intentDetector.js       [Query intent classification]
    │   ├── matcher.js              [Topic matching (TF-IDF)]
    │   ├── mathSolver.js           [Math problem solver]
    │   ├── preprocessor.js         [Text preprocessing]
    │   ├── responseBuilder.js      [Structure responses]
    │   ├── scorer.js               [Relevance scoring]
    │   ├── seeder.js               [Database seeding]
    │   ├── selfLearning.js         [Learn from unknown queries]
    │   └── synonyms.js             [Synonym expansion]
    │
    └── data/                  [Data files]
        └── knowledge_base.json     [Initial knowledge base data]

```

---

## 💾 Database Schema

### Collections in MongoDB

#### 1. **User Collection**
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed with bcrypt),
  role: String ("student" or "admin"),
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. **Query Collection**
```javascript
{
  _id: ObjectId,
  userId: ObjectId (null for guest queries),
  queryText: String,
  matchedTopic: String (topic name matched),
  responseGiven: Boolean,
  inputMode: String ("text" or "voice"),
  createdAt: Date,
  updatedAt: Date
}
```

#### 3. **Topic Collection** (Knowledge Base)
```javascript
{
  _id: ObjectId,
  id: String,
  name: String,                    // e.g., "Merge Sort"
  aliases: [String],               // e.g., ["merge sort", "mergesort"]
  keywords: [String],              // Search keywords
  category: String,                // e.g., "Sorting", "DP"
  difficulty: String,              // "easy", "medium", "hard"
  definition: String,              // Formal definition
  intuition: String,               // Explanation
  steps: [String],                 // Algorithm steps
  pseudocode: String,              // Code representation
  example: Object,                 // Worked example
  complexity: {                    // Time/Space complexity
    time: String,
    space: String
  },
  advantages: [String],
  disadvantages: [String],
  comparisons: Object,             // vs other algorithms
  use_cases: [String],
  related_topics: [String],
  clo_mapping: [String],           // Course learning outcomes
  createdAt: Date,
  updatedAt: Date
}
```

#### 4. **Progress Collection**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  topicsViewed: [String],          // Topics user has queried
  totalQueries: Number,
  lastActive: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### 5. **UnknownQuery Collection** (Self-Learning)
```javascript
{
  _id: ObjectId,
  queryText: String,               // Queries not matched to topics
  userId: ObjectId (optional),
  timestamp: Date
}
```

---

## 🔌 API Endpoints

### Base URL: `http://localhost:3001`

#### **Authentication Routes** (`/auth`)

| Method | Endpoint | Body | Response | Description |
|--------|----------|------|----------|-------------|
| POST | `/auth/signup` | `{ name, email, password }` | `{ message, token, user }` | Register new user |
| POST | `/auth/login` | `{ email, password }` | `{ message, token, user }` | Login user |

#### **Query Routes** (`/query`)

| Method | Endpoint | Body | Response | Description |
|--------|----------|------|----------|-------------|
| POST | `/query` | `{ query, inputMode }` | `{ success, source, structured }` | Submit a query (AI or KB) |

**Response Structure (from /query):**
```javascript
{
  success: Boolean,
  source: "llama3" or "knowledge_base",
  structured: {
    type: "conceptual" | "comparative" | "mathematical" | "procedural" | "complexity",
    topic: String,
    answer: String,
    keyPoints: [String],
    complexity: { time: String, space: String },
    followUp: [String],
    examples: [String]
  }
}
```

#### **Topic Routes** (`/topics`)

| Method | Endpoint | Response | Description |
|--------|----------|----------|-------------|
| GET | `/topics` | `[{ topic objects }]` | Get all topics |
| GET | `/topics/:id` | `{ topic object }` | Get specific topic |

#### **Progress Routes** (`/progress`)

| Method | Endpoint | Response | Description |
|--------|----------|----------|-------------|
| GET | `/progress` | `{ topicsViewed, totalQueries, lastActive }` | Get user's learning progress |

#### **Health Check**

| Method | Endpoint | Response | Description |
|--------|----------|----------|-------------|
| GET | `/` | `{ message: "✅ AoA Assistant Backend is running!" }` | Health check |
| GET | `/ai-status` | `{ ollama, models, aoaTutor }` | Check Ollama status |

---

## 🎯 Core Features

### 1. **Voice Interaction** 🎤
- **Speech-to-Text (STT):** Web Speech API captures user voice
- **Text-to-Speech (TTS):** Responses spoken back to user
- Component: `VoiceButton.jsx`, `SpeechPlayer.jsx`

### 2. **Intelligent Query Processing** 🧠
Three-tier query handling:

**Tier 1: Intent Detection** 
- Classifies query type: conceptual, comparative, mathematical, procedural, example
- File: `intentDetector.js`

**Tier 2: Topic Matching**
- Fast path: Exact keyword/alias match
- Slow path: TF-IDF + cosine similarity
- File: `matcher.js`

**Tier 3: Response Generation**
- If Ollama available: AI-generated response
- If not available: Template-based from knowledge base
- Files: `aiEngine.js`, `responseBuilder.js`

### 3. **AI Integration (Ollama)** 🤖
- Runs locally on port 11434
- Uses `aoa-tutor` model (custom-fine-tuned)
- Falls back gracefully if unavailable
- File: `aiEngine.js`

### 4. **Knowledge Base** 📚
- 200+ AoA topics with rich metadata
- Includes: definitions, algorithms, complexity, examples
- File: `data/knowledge_base.json`
- Loaded into MongoDB Topic collection on startup

### 5. **Authentication** 🔐
- JWT-based login/signup
- Password hashing with bcryptjs
- Role-based access: "student" or "admin"
- File: `authController.js`

### 6. **Progress Tracking** 📊
- Records all user queries
- Tracks topics viewed
- Measures learning engagement
- File: `progressController.js`

### 7. **Self-Learning** 🔄
- Logs unknown/unmatched queries
- Can be reviewed to improve knowledge base
- File: `selfLearning.js`

---

## 🎨 Frontend Components

### Component Hierarchy

```
App.js
├── Navbar.jsx                  [Header with logo/nav]
└── ChatPage.jsx               [Main page]
    ├── VoiceButton.jsx        [Microphone button for STT]
    ├── MessageBubble.jsx      [Display sent messages]
    ├── ResponseCard.jsx       [Display AI responses]
    └── SpeechPlayer.jsx       [Play TTS audio]
```

### Component Details

| Component | Purpose | Props | State |
|-----------|---------|-------|-------|
| **App.js** | Root component | - | - |
| **Navbar.jsx** | Navigation header | logo, title | - |
| **ChatPage.jsx** | Main chat interface | - | messages[], query, loading |
| **VoiceButton.jsx** | STT control | onResult | recording, listening |
| **MessageBubble.jsx** | Display messages | message, sender | - |
| **ResponseCard.jsx** | Display full responses | response | expanded |
| **SpeechPlayer.jsx** | TTS playback | text, autoPlay | playing |

### Key Interactions

1. **User speaks** → VoiceButton captures via Web Speech API
2. **STT converts** to text → MessageBubble displays it
3. **Message sent** → api.sendQuery() to backend
4. **Response received** → ResponseCard displays it
5. **User clicks play** → SpeechPlayer does TTS

---

## ⚙️ Backend Utilities & Logic

### 1. **aiEngine.js** - Ollama Integration
```javascript
askAI(userQuery)        // Send query to Ollama
checkOllama()           // Check if Ollama is running
// Uses streaming to get faster first response
// Attempts to parse JSON from response
```

### 2. **intentDetector.js** - Query Classification
```javascript
detectIntent(query)     // Returns: "conceptual" | "comparative" | 
                        // "mathematical" | "procedural" | "example"
// Uses regex patterns for fast classification
```

### 3. **matcher.js** - Topic Matching
```javascript
matchTopic(queryText, topics)
// Fast path: Check aliases
// Slow path: TF-IDF scoring
// Returns best matching Topic or null
```

### 4. **scorer.js** - TF-IDF Scoring
```javascript
rankTopics(query, topics)  // Score all topics
// Returns topic with highest cosine similarity
```

### 5. **preprocessor.js** - Text Cleaning
```javascript
preprocess(text)        // Lowercase, remove special chars, etc
tokenize(text)          // Split into words
```

### 6. **responseBuilder.js** - Response Formatting
```javascript
buildConceptualResponse()   // Explain what something is
buildProceduralResponse()   // How to do something
buildComparativeResponse()  // Compare two concepts
buildMathResponse()         // Handle recurrence/complexity
buildComplexityResponse()   // Complexity analysis
```

### 7. **mathSolver.js** - Mathematical Problems
```javascript
parseRecurrence(equation)    // Parse recurrence relations
solveMasterTheorem(a, b, f)  // Apply master theorem
getComplexity(algorithm)     // Return complexity
```

### 8. **selfLearning.js** - Unknown Query Handling
```javascript
logUnknownQuery(query)  // Save unmatched queries for review
// Helps identify gaps in knowledge base
```

### 9. **synonyms.js** - Synonym Expansion
```javascript
expandSynonyms(text)    // Expand keywords for better matching
// "DFS" → "depth first search"
```

### 10. **seeder.js** - Database Seeding
```javascript
seedTopics()            // Load knowledge_base.json into MongoDB
seedUsers()             // Create default users
```

---

## 📊 Data Flow & Workflows

### Workflow 1: Text Query Submission
```
1. User types query in ChatPage
2. Clicks send
3. api.sendQuery(query) → POST /query
4. Backend queryController processes:
   a. Detect intent
   b. Check if Ollama available
   c. If YES → askAI()
      - Send to Ollama aoa-tutor model
      - Parse JSON response
      - Build structured response
   d. If NO → matchTopic()
      - Find matching topic in MongoDB
      - Build template response from knowledge
5. Save query to MongoDB
6. Update user progress
7. Return structured response
8. Frontend displays in ResponseCard
9. Optional: SpeechPlayer reads response
```

### Workflow 2: Voice Query Submission
```
1. User clicks VoiceButton (microphone)
2. Browser Web Speech API captures audio
3. STT converts speech to text
4. MessageBubble displays recognized text
5. Same as text query workflow (step 3 onwards)
6. Response spoken via SpeechPlayer
```

### Workflow 3: User Login
```
1. User fills login form
2. api.login(email, password) → POST /auth/login
3. Backend authController:
   a. Find user by email
   b. bcrypt.compare() password
   c. Generate JWT token
   d. Return token + user info
4. Frontend stores token in localStorage
5. Token sent in Authorization header for future requests
```

### Workflow 4: Query Routing Decision
```
Received Query
    ↓
Is Ollama running?
    ├─ YES → askAI()      [Path A: AI Response]
    │   └→ Parse Ollama JSON
    │   └→ Structured response
    │
    └─ NO → matchTopic()   [Path B: KB Response]
        └→ TF-IDF scoring
        └→ Template response
        
Log unknown queries → selfLearning.js
```

---

## 🔐 Authentication System

### JWT Token Flow

1. **Signup/Login** creates token with user ID
2. Token format: `JWT(payload={id: userId}, secret=process.env.JWT_SECRET, expires=7d)`
3. Client stores as `localStorage.token`
4. Sent in request headers: `Authorization: Bearer <token>`
5. Middleware verifies token for protected routes

### User Roles

- **student** (default): Can send queries, view progress
- **admin**: Can manage topics, view all queries

### Password Security

- Hashed with bcryptjs (10 salt rounds)
- Never stored in plain text
- Compared using bcryptjs.compare()

---

## 📋 Current Status & Issues

### ✅ What's Working

- ✅ React frontend with responsive UI
- ✅ Node.js/Express backend
- ✅ MongoDB integration
- ✅ User authentication (JWT)
- ✅ Basic query routing
- ✅ Voice input/output (Web Speech API)
- ✅ Knowledge base structure
- ✅ API endpoints defined
- ✅ Progress tracking
- ✅ Intent detection

### ⚠️ Known Issues

1. **Ollama Not Running (Critical)**
   - Status: Server detects no Ollama on startup
   - Error: `⚠️ Ollama not reachable: fetch failed`
   - Impact: AI features disabled (falls back to KB)
   - Solution: 
     - Install Ollama from https://ollama.ai
     - Run Ollama on port 11434
     - Create aoa-tutor model: `ollama create aoa-tutor -f Modelfile`

2. **Slow AI Response Times**
   - Issue: Ollama responses take 10-30+ seconds
   - Cause: Local model inference, network latency
   - Suggestions:
     - Implement response streaming
     - Add query caching
     - Use knowledge base for frequent questions
     - Reduce num_predict parameter
     - Use smaller quantized model

3. **Knowledge Base Integration**
   - Load status unclear
   - Seeding file exists but may need execution
   - Solution: Run seeder on server startup

4. **Error Handling**
   - Some error messages not user-friendly
   - Solution: Wrap errors in try-catch with meaningful messages

### 🚀 Future Enhancements

- [ ] Real-time response streaming to frontend
- [ ] Query caching mechanism
- [ ] Hybrid routing (KB first, AI for complex)
- [ ] Advanced analytics dashboard
- [ ] Conversation context (multi-turn)
- [ ] Model fine-tuning based on user feedback
- [ ] Mobile app version
- [ ] Offline mode
- [ ] Multi-language support

---

## 💻 Setup & Installation

### Prerequisites

- Node.js 16+ 
- MongoDB (local or cloud)
- Ollama (for AI features)
- npm or yarn

### Backend Setup

```bash
cd aoa-backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PORT=3001
MONGO_URI=mongodb://localhost:27017/aoa-assistant
JWT_SECRET=your_jwt_secret_key_here
EOF

# Run development server
npm run dev

# Or production
npm start
```

### Frontend Setup

```bash
cd ..

# Install dependencies
npm install

# Start development server
npm start

# Production build
npm run build
```

### Ollama Setup

```bash
# Install Ollama from https://ollama.ai

# Start Ollama service
ollama serve

# In another terminal, create aoa-tutor model
cd aoa-backend
ollama create aoa-tutor -f Modelfile

# Verify
ollama list
```

### Verify Setup

1. **Backend health:** GET http://localhost:3001
2. **Ollama status:** GET http://localhost:3001/ai-status
3. **Frontend:** http://localhost:3000
4. **MongoDB:** Check if running on localhost:27017

---

## 📝 Key File Descriptions

| File | Purpose | Key Exports/Functions |
|------|---------|----------------------|
| `server.js` | Express app entry point | Express app, routes, startup |
| `db.js` | MongoDB connection | connectDB() |
| `models/*.js` | Database schemas | Mongoose models |
| `controllers/*.js` | Request handlers | signup, login, handleQuery, etc |
| `routes/*.js` | URL routing | Express routers |
| `utils/aiEngine.js` | Ollama integration | askAI(), checkOllama() |
| `utils/matcher.js` | Topic matching | matchTopic() |
| `utils/intentDetector.js` | Query classification | detectIntent() |
| `utils/responseBuilder.js` | Response formatting | buildConceptualResponse(), etc |
| `utils/mathSolver.js` | Math problems | parseRecurrence(), solveMasterTheorem() |
| `utils/scorer.js` | TF-IDF scoring | rankTopics() |
| `src/App.js` | React root | App component |
| `src/services/api.js` | API client | sendQuery(), login(), signup() |

---

## 🔍 Debugging Tips

### Enable Verbose Logging

Edit `server.js` and `queryController.js` to add console.log() statements showing:
- Query received
- Ollama availability
- Topic matching scores
- Response generation steps

### Check Ollama Connection

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Test connection
curl http://localhost:11434/api/tags

# Terminal 3: Test with query
curl -X POST http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model":"aoa-tutor","messages":[{"role":"user","content":"What is merge sort?"}]}'
```

### MongoDB Inspection

```bash
# Connect to MongoDB
mongosh

# View databases
show dbs

# View collections
use aoa-assistant
show collections

# Check documents
db.topics.count()
db.queries.count()
db.users.count()
```

---

## 📚 References & Documentation

- **Express.js:** https://expressjs.com/
- **Mongoose:** https://mongoosejs.com/
- **React:** https://react.dev/
- **Web Speech API:** https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- **Ollama:** https://github.com/ollama/ollama
- **JWT:** https://jwt.io/
- **TF-IDF:** https://en.wikipedia.org/wiki/Tf%E2%80%93idf
- **Tailwind CSS:** https://tailwindcss.com/

---

## 📞 Support & Contact

For issues or questions, refer to:
1. Backend logs: `npm run dev` output
2. Browser console: F12 Developer Tools
3. MongoDB logs: Check database
4. Ollama logs: Ollama terminal output

---

**Last Updated:** May 5, 2026  
**Documentation Version:** 1.0  
**Maintainers:** AoA Development Team
