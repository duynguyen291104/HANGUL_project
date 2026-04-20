# 🇰🇷 HANGUL Learning Application

A comprehensive, full-stack Korean language learning platform inspired by Duolingo, with AI-powered features, interactive exercises, and gamification.

## 📋 Project Overview

HANGUL is a modern web application designed to teach Korean language through:

- **📷 Camera-Based Learning** - Detect objects and learn vocabulary
- **✏️ Handwriting Practice** - Practice writing Hangul characters with AI feedback
- **🎤 Pronunciation Training** - Record audio and get AI-based scoring
- **🎮 Interactive Games** - Quiz, Listening exercises, Matching, Speed tests
- **📊 Progress Tracking** - Streak system, XP, achievements, leaderboards
- **👥 Community Features** - Feed, discussions, competitive elements

## 🏗️ Architecture

```
HANGUL/
├── FE/              # Next.js 14 Frontend (React + TypeScript)
├── BE/              # Node.js/Express Backend (TypeScript)
├── AI/              # Flask AI Services (Python)
└── docker-compose.yml
```

### Tech Stack Summary

**Frontend**
- Next.js 14 + React 18
- TypeScript
- TailwindCSS + shadcn/ui
- Zustand (state management)
- IndexedDB + localStorage

**Backend**
- Node.js + Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication

**AI/ML**
- Flask
- YOLOv8 (object detection)
- Azure Speech Services (pronunciation)
- Google Cloud TTS

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose (recommended)
- OR:
  - Node.js 18+
  - Python 3.9+
  - PostgreSQL 14+

### Option 1: Docker (Recommended)

```bash
# Clone and navigate
cd /home/ngocduy/HANGUL

# Create environment files
cp FE/.env.example FE/.env.local
cp BE/.env.example BE/.env
cp AI/.env.example AI/.env

# Start all services
docker-compose up -d

# Database initialization (first time)
docker-compose exec backend npm run prisma:migrate
```

Access:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Flask AI: http://localhost:5001
- Database: localhost:5432

### Option 2: Local Development

#### Frontend Setup
```bash
cd FE
npm install
cp .env.example .env.local
npm run dev  # http://localhost:3000
```

#### Backend Setup
```bash
cd BE
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run dev  # http://localhost:5000
```

#### Flask AI Setup
```bash
cd AI
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py  # http://localhost:5001
```

## 📁 Project Structure

### Frontend (FE)
```
src/
├── components/        # Reusable UI components
├── pages/            # Application pages (home, quiz, handwriting, etc.)
├── layouts/          # Page layout wrappers
├── routes/           # Route definitions
├── services/         # API service layer
├── store/            # Zustand stores (auth, vocabulary, progress)
├── hooks/            # Custom React hooks
├── utils/            # Helper functions
├── types/            # TypeScript types
├── assets/           # Images, icons, fonts
└── styles/           # Global CSS
```

### Backend (BE)
```
src/
├── app.ts            # Express app initialization
├── controllers/      # Request handlers
├── services/         # Business logic
├── models/          # Database models
├── routes/          # API routes
├── middleware/      # Auth, validation, error handling
├── config/          # Configuration
└── utils/           # Helper functions

prisma/
└── schema.prisma    # Database schema
```

### AI Backend (AI)
```
├── app.py           # Flask app
├── models/          # YOLOv8 weights (downloaded on first run)
├── scripts/         # Training/preprocessing scripts
└── requirements.txt # Python dependencies
```

## 🔐 Role-Based Access Control

### USER Role
- ✅ Take quizzes and exercises
- ✅ Learn vocabulary
- ✅ Track progress
- ✅ View public community
- ❌ Cannot create/edit content

### ADMIN Role
- ✅ Create/update/delete vocabulary
- ✅ Create/update/delete questions & exercises
- ✅ View user analytics
- ✅ Manage topics and levels
- ✅ All USER permissions

### SUPER_ADMIN Role (Optional)
- ✅ Manage other admins
- ✅ System configuration
- ✅ All ADMIN permissions

## 📚 Key Features Implementation

### 1. Streak System
- User gets +1 streak for completing ≥1 exercise per day
- Automatic reset if day is skipped
- Stored in `User.currentStreak` + `User.lastCheckinDate`

### 2. Quiz System
- Admin creates questions with multiple choice answers
- Questions stored with versioning for historical accuracy
- User submissions saved with session snapshots
- Prevents score manipulation

### 3. Vocabulary Management
- 500+ vocabulary items organized by level (NEWBIE → ADVANCED)
- Soft delete with `isActive` flag
- Versioning for content changes
- Users can add to personal learning list

### 4. Handwriting Practice
- Canvas-based drawing
- IoU (Intersection over Union) based scoring
- Pixel-level character comparison
- Real-time feedback

### 5. Pronunciation Scoring
- Browser MediaRecorder API for audio capture
- Upload to Flask backend for processing
- Azure Speech Services for phoneme-level analysis
- Feedback on accuracy, fluency, completeness

### 6. Camera Detection
- YOLOv8 model for real-time object detection
- Detected objects mapped to vocabulary
- Instant Korean translation and pronunciation
- Add recognized items to vocabulary list

## 🗄️ Database Schema Highlights

### Core Tables
- **User** - User accounts with roles and progress
- **Vocabulary** - Korean-English vocabulary items
- **Question** - Quiz questions with options
- **QuizSession** & **QuizAnswer** - Quiz history and scoring
- **ListeningQuestion** - Audio-based exercises
- **HandwritingExercise** & **HandwritingAttempt** - Character practice
- **PronunciationWord** & **PronunciationAttempt** - Speaking practice
- **Achievement** & **UserAchievement** - Badges and milestones
- **Topic** - Vocabulary organization by theme
- **FeedPost** & **Comment** - Community features

### Design Principles
- ✅ Soft deletes (preserve data)
- ✅ Content versioning (track changes)
- ✅ Session-based scoring (prevent manipulation)
- ✅ Timestamp tracking (audit trails)

## 🔗 API Endpoints

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
```

### Vocabulary (USER)
```
GET    /api/vocabulary
GET    /api/vocabulary/:id
POST   /api/vocabulary/:id/learn
```

### Vocabulary (ADMIN)
```
POST   /api/vocabulary
POST   /api/vocabulary/bulk/create
PUT    /api/vocabulary/:id
DELETE /api/vocabulary/:id
```

### Quiz
```
POST   /api/quiz/start
POST   /api/quiz/answer
POST   /api/quiz/end/:sessionId
GET    /api/quiz/history
```

### Camera Detection
```
POST   /api/camera/detect
```

See individual README files in FE/, BE/, and AI/ for complete API documentation.

## 🎮 Key User Flows

### Learning Flow
1. User registers/logs in
2. Selects learning level (NEWBIE → ADVANCED)
3. Browses available topics
4. Chooses activity (Quiz, Handwriting, Pronunciation, etc.)
5. Completes exercise
6. Receives feedback and XP
7. Progress updated in database

### Quiz Flow
1. Click "Start Quiz"
2. Backend generates 10 random questions
3. Frontend displays questions (correct answers NOT shown)
4. User selects answer
5. Backend validates and returns feedback
6. Score updated only on backend
7. Session ends and results saved

### Streak System Flow
1. User completes exercise
2. Backend checks `lastCheckinDate`
3. If today → skip (already checked)
4. If yesterday → increment streak
5. Otherwise → reset to 1
6. Update `lastCheckinDate` to today

## 🛠️ Development Commands

### Frontend
```bash
cd FE
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Check code quality
npm run type-check   # TypeScript validation
```

### Backend
```bash
cd BE
npm run dev                    # Start dev server with watch
npm run build                  # TypeScript compilation
npm run prisma:generate       # Generate Prisma client
npm run prisma:migrate        # Create/apply migrations
npm run prisma:studio         # Open Prisma Studio
npm run lint                  # Check code quality
```

### Flask AI
```bash
cd AI
source venv/bin/activate      # Activate virtual environment
python app.py                 # Start server
python -m pip freeze         # List dependencies
```

## 📦 Environment Files

### BE/.env
```
DATABASE_URL="postgresql://user:pass@localhost:5432/hangul_db"
JWT_SECRET="your-secret"
JWT_EXPIRE="7d"
NODE_ENV="development"
PORT=5000
FLASK_API_URL="http://localhost:5001"
```

### FE/.env.local
```
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
NEXT_PUBLIC_FLASK_API_URL="http://localhost:5001"
```

### AI/.env
```
FLASK_ENV=development
FLASK_APP=app.py
YOLO_MODEL_PATH=models/yolov8n.pt
AZURE_SPEECH_KEY=your-key
```

## 🎯 MVP Checklist

- [x] Project structure
- [x] Database schema (Prisma)
- [x] Authentication (JWT + bcrypt)
- [x] Role-based access control
- [ ] Core API routes (in progress)
- [ ] Frontend pages
- [ ] Zustand stores
- [ ] Quiz system
- [ ] Handwriting practice
- [ ] Pronunciation training
- [ ] Camera detection
- [ ] Community features
- [ ] Progress tracking
- [ ] Docker deployment

## 🚀 Deployment

### Production Build
```bash
# Backend
cd BE
npm run build
npm start

# Frontend
cd FE
npm run build
npm start

# Flask
cd AI
python app.py
```

### Docker Production
```bash
docker-compose -f docker-compose.yml up -d
```

### Database Backup
```bash
docker-compose exec postgres pg_dump -U hangul hangul_db > backup.sql
```

## 📝 Best Practices

1. **Always use TypeScript** - Strict mode enabled
2. **Soft deletes only** - Never hard delete user data
3. **Version content** - Track changes to questions/vocabulary
4. **Validate on backend** - Don't trust frontend validation
5. **Hash passwords** - Use bcrypt (10 rounds min)
6. **Secure tokens** - Use environment variables for secrets
7. **CORS configured** - Frontend and backend properly linked
8. **Error handling** - Meaningful error messages
9. **Logging** - Track important events
10. **API documentation** - Keep README files updated

## 🤝 Contributing

1. Follow project structure
2. Use TypeScript strict mode
3. Add proper error handling
4. Document new features
5. Test before committing
6. Update relevant README files

## 📄 License

MIT License - See LICENSE file

## 👨‍💻 Development Team

Created with ❤️ for Korean language learners worldwide.

---

**Last Updated**: March 23, 2026
**Status**: In Development (MVP Phase)
