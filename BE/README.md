# HANGUL Learning App - Backend

A Node.js/Express API server for the HANGUL learning application with PostgreSQL database and Prisma ORM.

## Features

- 🔐 **Authentication** - JWT-based user authentication and authorization
- 📚 **Content Management** - Admin can manage vocabulary, questions, exercises
- 🧪 **Quiz System** - Dynamic quiz generation with scoring
- 📖 **Listening Exercises** - Audio-based learning
- ✍️ **Handwriting Practice** - Character recognition and scoring
- 🎤 **Pronunciation Training** - Audio recording and analysis
- 📷 **Camera Detection** - AI-powered object detection integration
- 👥 **User Management** - User profiles and progress tracking

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Password**: bcrypt
- **File Handling**: Multer

## Project Structure

```
src/
├── app.ts              # Express app setup
├── controllers/        # Request handlers
├── services/           # Business logic
├── models/            # Database models/queries
├── routes/            # API routes
├── middleware/        # Auth, validation, error handling
├── config/            # Configuration files
└── utils/             # Helper functions

prisma/
└── schema.prisma      # Database schema
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
cd BE
npm install
npx prisma generate
```

### Environment Variables

Create `.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/hangul_db"
JWT_SECRET="your-secret-key-here"
JWT_EXPIRE="7d"
NODE_ENV="development"
PORT=5000
FLASK_API_URL="http://localhost:5001"
```

### Database Setup

```bash
# Create/migrate database
npx prisma migrate dev --name init

# View database (optional)
npx prisma studio
```

### Development

```bash
npm run dev
```

Server runs on [http://localhost:5000](http://localhost:5000)

### Build & Production

```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Vocabulary (USER)
- `GET /api/vocabulary` - Get all vocabulary
- `GET /api/vocabulary/:id` - Get vocabulary by ID
- `POST /api/vocabulary/:id/learn` - Add to user's learning list

### Vocabulary (ADMIN)
- `POST /api/vocabulary` - Create vocabulary
- `POST /api/vocabulary/bulk/create` - Bulk create
- `PUT /api/vocabulary/:id` - Update vocabulary
- `DELETE /api/vocabulary/:id` - Soft delete vocabulary

### Quiz
- `POST /api/quiz/start` - Start quiz session
- `POST /api/quiz/answer` - Submit answer
- `POST /api/quiz/end/:sessionId` - End quiz
- `GET /api/quiz/history` - Get user's quiz history

### Camera Detection
- `POST /api/camera/detect` - Detect objects in image

## Database Schema

Key tables:
- **User** - User accounts and profiles
- **Vocabulary** - Korean-English vocabulary with versioning
- **Question** - Quiz questions with multiple versions
- **QuizSession** - User quiz sessions
- **QuizAnswer** - User answers with scoring
- **ListeningQuestion** - Listening exercises
- **HandwritingExercise** - Handwriting practice
- **PronunciationWord** - Pronunciation exercises
- **Achievement** - User achievements and badges
- **FeedPost** - Community posts

## Role-Based Access Control (RBAC)

### USER Role
- View vocabulary
- Take quizzes and exercises
- Track own progress
- View public achievements

### ADMIN Role
- Create/update/delete vocabulary
- Create/update/delete questions and exercises
- View user analytics
- Manage content

### SUPER_ADMIN Role (Optional)
- All admin permissions
- Manage other admins
- System configuration

## Important Design Patterns

### Data Versioning
- All content has `version` field to track changes
- Admin edits create new versions, don't affect past user data

### Soft Delete
- Content uses `isActive` flag instead of hard delete
- Preserves historical data and references

### Session-Based Scoring
- Quiz answers stored with session snapshots
- Prevents score manipulation
- Enables detailed analytics

## Connecting to Flask AI Service

The camera detection endpoint calls the Flask backend:

```typescript
POST /api/camera/detect
Body: { image: base64String }
Response: { objects: [{name, korean, confidence}] }
```

## Development Tips

- Use `npx prisma studio` to visualize data
- All routes require authentication (except /auth/register, /auth/login, /api/health)
- Admin-only routes check `user.role === 'ADMIN'`
- Use Postman or VS Code REST Client for API testing

## Contributing

- Follow Express.js conventions
- Use TypeScript strict mode
- Add proper error handling
- Document new endpoints

## License

MIT
