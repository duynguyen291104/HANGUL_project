const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { prisma } = require('./lib/prisma');
const { setIO } = require('./io');
require('dotenv').config();

// Import module routes (new modular structure)
// Note: Using .default because modules export as ES6 but app.ts uses CommonJS require()
const authRouter = require('./modules/auth/auth.routes').default;
const userRouter = require('./modules/user/index').default;
const vocabularyRouter = require('./modules/vocabulary/index').default;
const quizRouter = require('./modules/quiz/index').default;
const quizAdminRouter = require('./modules/quizAdmin/index').default;
const pronunciationRouter = require('./modules/pronunciation/index').default;
const pronunciationScoringRouter = require('./modules/pronunciation/scoring').default;
const cameraRouter = require('./modules/camera/index').default;
const topicRouter = require('./modules/topic/index').default;
const writingRouter = require('./modules/writing/index').default;
const writingScoringRouter = require('./modules/writing/scoring').default;
const leaderboardRouter = require('./modules/leaderboard/index').default;
const tournamentRouter = require('./modules/tournament/index').default;
const achievementsRouter = require('./modules/achievements/index').default;
const learningPathRouter = require('./modules/learning-path/controller').default;
const adminRouter = require('./modules/admin/index').default;
const activityRouter = require('./modules/activity/index').default;

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/authenticate');

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Set global io instance for use in other modules
setIO(io);

// Store active connections with level info for level-based leaderboard
const tournamentPlayers = new Map();

// ========================
// SOCKET.IO EVENTS
// ========================
io.on('connection', (socket: any) => {
  console.log(`🎮 Tournament player connected: ${socket.id}`);

  // Join tournament room with level-based room assignment
  socket.on('tournament:join', async (data: any) => {
    const { userId, name } = data;
    
    try {
      // Get user's level from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { level: true },
      });

      if (!user) {
        console.error(`❌ User not found: ${userId}`);
        return;
      }

      // Store player info with level
      tournamentPlayers.set(userId, { 
        socketId: socket.id, 
        name, 
        level: user.level 
      });

      // Join level-based room (e.g., "tournament_NEWBIE")
      const roomName = `tournament_${user.level}`;
      socket.join(roomName);
      
      // Join personal user room for rank updates
      socket.join(`user_${userId}`);
      
      console.log(`📍 ${name} (${user.level}) joined room: ${roomName} + user_${userId}`);
    } catch (error) {
      console.error('Error joining tournament:', error);
    }
  });

  // When player scores updated - emit only to same level room
  socket.on('tournament:score-update', async (data: any) => {
    const { userId } = data;
    
    try {
      // Get user's current level
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { level: true, role: true, email: true },
      });

      if (!user) {
        console.error(`❌ User not found: ${userId}`);
        return;
      }

      // Skip test/admin users
      if (user.role === 'ADMIN' || user.email.includes('test')) {
        console.log(`⏭️ Skipping test/admin user for leaderboard: ${userId}`);
        return;
      }

      const roomName = `tournament_${user.level}`;

      // Get leaderboard only for users at same level (exclude test/admin)
      const levelLeaderboard = await prisma.user.findMany({
        where: { 
          level: user.level,
          role: { not: 'ADMIN' },
          email: { not: { contains: 'test' } }
        },
        select: {
          id: true,
          name: true,
          avatar: true,
          totalTrophy: true,
          level: true,
          totalXP: true,
        },
        orderBy: [
          { totalTrophy: 'desc' },
          { totalXP: 'desc' }
        ],
        take: 50,
      });

      const formatted = levelLeaderboard.map((u: any, idx: number) => ({
        rank: idx + 1,
        userId: u.id,
        name: u.name,
        avatar: u.avatar,
        trophy: u.totalTrophy,
        level: u.level,
        xp: u.totalXP,
      }));

      // Emit ONLY to users at same level
      io.to(roomName).emit('tournament:leaderboard-updated', {
        level: user.level,
        leaderboard: formatted,
        timestamp: new Date().toISOString(),
      });

      console.log(`🏆 Leaderboard updated for ${roomName}: ${formatted.length} users`);
    } catch (error) {
      console.error('❌ Error updating leaderboard:', error);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`❌ Player disconnected: ${socket.id}`);
    for (let [userId, player] of tournamentPlayers) {
      if (player.socketId === socket.id) {
        tournamentPlayers.delete(userId);
        console.log(`🚪 ${player.name} (${player.level}) left tournament`);
        break;
      }
    }
  });
});

// Export io for use in routes
module.exports.io = io;
// Allow multiple frontend URLs for development
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
];

app.use(cors({
  origin: function (origin: string | undefined, callback: any) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ========================
// ROUTES
// ========================
app.use('/api/auth', authRouter);

// Admin routes (require admin authentication)
app.use('/api/admin', authenticate, adminRouter);

// Protected routes (require authentication)
app.use('/api/user', authenticate, learningPathRouter);  // Learning path endpoints (includes set-level)
app.use('/api/learning-path', authenticate, learningPathRouter);  // Also available at this path
app.use('/api/user', authenticate, userRouter);  // User management endpoints
app.use('/api/vocabulary', authenticate, vocabularyRouter);

// Public vocabulary routes (no authentication required)
app.use('/api/public-vocab', vocabularyRouter);

app.use('/api/quiz', quizRouter);  // Quiz endpoints (generate, submit)
app.use('/api/question', quizRouter);  // Also available as /api/question for learning map
app.use('/api/quiz', quizAdminRouter);  // Admin quiz management endpoints
app.use('/api/writing', authenticate, writingRouter);
app.use('/api/writing', authenticate, writingScoringRouter);
app.use('/api/topic', topicRouter);  // Topic endpoints are public for GET, protected for POST/PUT/DELETE

// Semi-public routes (some endpoints public, some protected)
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/tournament', authenticate, tournamentRouter);
app.use('/api/achievements', achievementsRouter);

// Camera detection route (requires authentication for saving)
app.use('/api/camera', authenticate, cameraRouter);

// Pronunciation route (public for testing)
app.use('/api/pronunciation', pronunciationRouter);

// Pronunciation scoring (requires authentication)
app.use('/api/pronunciation', authenticate, pronunciationScoringRouter);

// Activity tracking (requires authentication)
app.use('/api/activity', authenticate, activityRouter);

// ========================
// 404 HANDLER
// ========================
// @ts-ignore
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ========================
// ERROR HANDLER (Must be last)
// ========================
app.use(errorHandler);

// ========================
// GLOBAL ERROR HANDLERS
// ========================
// Handle unhandled promise rejections (e.g., from Google Cloud auth attempts)
process.on('unhandledRejection', (reason, promise) => {
  if (reason && reason.toString && reason.toString().includes('Could not load the default credentials')) {
    console.warn('⚠️ Google Cloud credentials not configured - fallback scoring enabled');
  } else {
    console.error('Unhandled Rejection:', reason);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  if (error.message && error.message.includes('Could not load the default credentials')) {
    console.warn('⚠️ Google Cloud credentials not configured - fallback scoring enabled');
  } else {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  }
});

// ========================
// START SERVER
// ========================
server.listen(PORT, () => {
  console.log(` HANGUL Backend running on port ${PORT}`);
  console.log(`🎮 Socket.IO running for tournament`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
