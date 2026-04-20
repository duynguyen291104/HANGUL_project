import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { authenticate } from '../../middleware/authenticate';
import { getIO } from '../../io';
import { getRank } from '../../utils/rankCalculator';
import { checkAndAwardAchievements } from '../../utils/achievementTracker';

const router = Router();

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

// ========================
// GET TOURNAMENT VOCABULARY (Mixed Levels)
// ========================
// IMPORTANT: Tournament allows MIXED levels (not just user level)
// Logic:
// - EASY level: only EASY vocab
// - BEGINNER: EASY + BEGINNER
// - INTERMEDIATE: EASY + BEGINNER + INTERMEDIATE
// - ADVANCED: EASY + BEGINNER + INTERMEDIATE + ADVANCED
// - EXPERT: ALL levels (random, 800 words possible)
router.get('/vocabulary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { limit = 20 } = req.query;

    // Get user with their current level
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine which levels to include based on user's level
    const levelMap: Record<string, string[]> = {
      NEWBIE: ['NEWBIE'],
      BEGINNER: ['NEWBIE', 'BEGINNER'],
      INTERMEDIATE: ['NEWBIE', 'BEGINNER', 'INTERMEDIATE'],
      ADVANCED: ['NEWBIE', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
      EXPERT: ['NEWBIE', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'],
    };

    const allowedLevels = levelMap[user.level] || [user.level];

    // Fetch vocabulary from PostgreSQL - RANDOMIZED for tournament
    const vocabulary = await prisma.vocabulary.findMany({
      where: {
        level: {
          in: allowedLevels,  // ← Mix of levels, not just user level
        },
        isActive: true,
      },
      take: parseInt(limit as string),
      orderBy: {
        id: 'asc', // NOTE: In production, use raw SQL RANDOM() for true randomization
        // For now, ascending order (frontend can shuffle if needed)
      },
      select: {
        id: true,
        korean: true,
        english: true,
        vietnamese: true,
        romanization: true,
        level: true,
        topic: { select: { id: true, name: true } },
      },
    });

    // If no data: return empty array (NOT JSON fallback)
    if (vocabulary.length === 0) {
      return res.json({
        userLevel: user.level,
        allowedLevels,
        count: 0,
        data: [],
        message: `No vocabulary available for tournament at ${user.level} level`,
      });
    }

    res.json({
      userLevel: user.level,
      allowedLevels,
      count: vocabulary.length,
      data: vocabulary,
    });
  } catch (error) {
    console.error('❌ Tournament vocabulary error:', error);
    res.status(500).json({ error: 'Failed to fetch tournament vocabulary' });
  }
});

// ========================
// SUBMIT TOURNAMENT SCORE & ADD TROPHY
// ========================
// CRITICAL: Tournament adds TROPHY, NOT XP
router.post('/submit', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { score = 0, correctAnswers = 0, gameType = '' } = req.body;

    const userId = req.user.id;

    // Trophy multiplier per game type:
    // flash-writing: 10 trophy per correct (10 questions, max 100)
    // speed-quiz / others: 5 trophy per correct (20 questions, max 100)
    const trophyPerCorrect = gameType === 'flash-writing' ? 10 : 5;
    const trophyGained = correctAnswers > 0
      ? correctAnswers * trophyPerCorrect
      : score >= 70 ? 5 : 1;

    // Update user TROPHY (NOT XP)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        totalTrophy: { increment: trophyGained },  // ← TROPHY only, not XP
      },
      select: {
        id: true,
        name: true,
        level: true,
        totalTrophy: true,
        totalXP: true,
        avatar: true,
      }
    });

    // ✅ EMIT WEBSOCKET EVENT to update leaderboard for all users at same level
    const io = getIO();
    if (io) {
      const roomName = `tournament_${updatedUser.level}`;
      
      // Trigger leaderboard update for this level
      io.emit('tournament:score-update', { 
        userId, 
        level: updatedUser.level 
      });
      
      // Calculate and emit rank update to user's personal room
      const newRank = getRank(updatedUser.totalTrophy);
      io.to(`user_${userId}`).emit('rankUpdate', {
        trophy: updatedUser.totalTrophy,
        rank: newRank,
      });
      
      console.log(`🎮 Emitted score update to room ${roomName}: ${updatedUser.name} +${trophyGained} Trophy | Rank: ${newRank}`);
    }

    // Check and award achievements after trophy update
    const newAchievements = await checkAndAwardAchievements(userId);

    res.json({
      success: true,
      trophyGained,
      correctAnswers,
      score,
      message: `${correctAnswers} câu đúng → +${trophyGained} Trophy`,
      newAchievements,
    });
  } catch (error) {
    console.error('❌ Tournament submit error:', error);
    res.status(500).json({ error: 'Failed to submit tournament score' });
  }
})

// ========================
// GET LEADERBOARD FOR CURRENT USER LEVEL
// ========================
// CRITICAL: Only show users at same level (EASY users see EASY leaderboard, etc.)
router.get('/leaderboard', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user level
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { 
        id: true,
        level: true, 
        totalTrophy: true, 
        totalXP: true,
        role: true,
        email: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get top users at SAME level only (exclude test/admin accounts)
    // Sorted by Trophy (tournament), then XP (practice)
    const leaderboard = await prisma.user.findMany({
      where: {
        level: user.level,  // ← CRITICAL: Same level only
        role: { not: 'ADMIN' },  // ← Exclude admin users
        email: {
          not: { contains: 'test' }  // ← Exclude test accounts
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        level: true,
        totalTrophy: true,
        totalXP: true,
        avatar: true,
      },
      orderBy: [
        { totalTrophy: 'desc' },  // Primary: Trophy (tournament)
        { totalXP: 'desc' },      // Secondary: XP (practice)
      ],
      take: 50,
    });

    // Format for frontend
    const formattedLeaderboard = leaderboard.map((u, index) => ({
      rank: index + 1,
      userId: u.id,
      name: u.name,
      avatar: u.avatar,
      level: u.level,
      trophy: u.totalTrophy,
      xp: u.totalXP,
    }));

    // Find current user's rank
    const userRank = formattedLeaderboard.findIndex(entry => entry.userId === user.id) + 1 || null;

    res.json({
      level: user.level,
      leaderboard: formattedLeaderboard,
      userRank: userRank || null,
      userInfo: {
        userId: user.id,
        trophy: user.totalTrophy,
        xp: user.totalXP,
      },
      message: `Leaderboard for ${user.level} level users`,
    });
  } catch (error) {
    console.error('❌ Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
