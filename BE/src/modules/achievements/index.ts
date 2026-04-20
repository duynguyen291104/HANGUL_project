import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

// ========================
// GET ALL ACHIEVEMENTS
// ========================
router.get('/', async (_req: Request, res: Response) => {
  try {
    const achievements = await prisma.achievement.findMany({
      orderBy: { id: 'asc' },
    });

    res.json({ achievements });
  } catch (error) {
    console.error('❌ ACHIEVEMENTS ERROR:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// ========================
// GET UNLOCKED ACHIEVEMENTS (for current user)
// ========================
router.get('/unlocked', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const unlocked = await prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
      orderBy: { unlockedAt: 'desc' },
    });

    res.json({
      achievements: unlocked.map((ua: any) => ({
        id: ua.achievement.id,
        name: ua.achievement.name,
        description: ua.achievement.description,
        badge: ua.achievement.badge,
        unlockedAt: ua.unlockedAt,
      })),
      total: unlocked.length,
    });
  } catch (error) {
    console.error('❌ UNLOCKED ACHIEVEMENTS ERROR:', error);
    res.status(500).json({ error: 'Failed to fetch unlocked achievements' });
  }
});

// ========================
// GET ACHIEVEMENT PROGRESS
// ========================
router.get('/progress', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const allAchievements = await prisma.achievement.findMany({
      orderBy: { id: 'asc' },
    });

    const unlockedIds = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });

    const unlockedSet = new Set(unlockedIds.map((ua: any) => ua.achievementId));

    // Get user stats for progress calculation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalXP: true,
        currentStreak: true,
        _count: {
          select: {
            quizSessions: true,
            vocabularyLearned: true,
          },
        },
      },
    });

    const progress = allAchievements.map((ach: any) => ({
      id: ach.id,
      name: ach.name,
      description: ach.description,
      badge: ach.badge,
      criteria: ach.criteria,
      unlocked: unlockedSet.has(ach.id),
    }));

    res.json({
      achievements: progress,
      totalAchievements: allAchievements.length,
      unlockedCount: unlockedSet.size,
      completionPercentage: allAchievements.length > 0
        ? Math.round((unlockedSet.size / allAchievements.length) * 100)
        : 0,
      userStats: {
        totalXP: user?.totalXP || 0,
        streak: user?.currentStreak || 0,
        quizCount: user?._count?.quizSessions || 0,
        vocabCount: user?._count?.vocabularyLearned || 0,
      },
    });
  } catch (error) {
    console.error('❌ ACHIEVEMENT PROGRESS ERROR:', error);
    res.status(500).json({ error: 'Failed to fetch achievement progress' });
  }
});

// ========================
// CHECK AND AWARD ACHIEVEMENTS
// ========================
router.post('/check', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalXP: true,
        currentStreak: true,
        _count: {
          select: {
            quizSessions: true,
            vocabularyLearned: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all achievements that user hasn't unlocked yet
    const unlockedIds = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });
    const unlockedSet = new Set(unlockedIds.map((ua: any) => ua.achievementId));

    const allAchievements = await prisma.achievement.findMany();

    const newlyUnlocked: any[] = [];

    for (const ach of allAchievements) {
      if (unlockedSet.has(ach.id)) continue;

      // Parse criteria and check conditions
      let criteria: any;
      try {
        criteria = JSON.parse(ach.criteria);
      } catch {
        continue;
      }

      let shouldUnlock = false;

      if (criteria.type === 'quiz_count' && user._count.quizSessions >= (criteria.value || 1)) {
        shouldUnlock = true;
      } else if (criteria.type === 'vocab_count' && user._count.vocabularyLearned >= (criteria.value || 1)) {
        shouldUnlock = true;
      } else if (criteria.type === 'xp' && user.totalXP >= (criteria.value || 100)) {
        shouldUnlock = true;
      } else if (criteria.type === 'streak' && user.currentStreak >= (criteria.value || 7)) {
        shouldUnlock = true;
      }

      if (shouldUnlock) {
        const ua = await prisma.userAchievement.create({
          data: {
            userId,
            achievementId: ach.id,
          },
          include: { achievement: true },
        });
        newlyUnlocked.push({
          id: ach.id,
          name: ach.name,
          description: ach.description,
          badge: ach.badge,
          unlockedAt: ua.unlockedAt,
        });
      }
    }

    res.json({
      newlyUnlocked,
      count: newlyUnlocked.length,
      message: newlyUnlocked.length > 0
        ? `🎉 ${newlyUnlocked.length} achievement(s) unlocked!`
        : 'No new achievements unlocked',
    });
  } catch (error) {
    console.error('❌ CHECK ACHIEVEMENTS ERROR:', error);
    res.status(500).json({ error: 'Failed to check achievements' });
  }
});

// ========================
// GET ACHIEVEMENT STATS
// ========================
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const totalAchievements = await prisma.achievement.count();
    const unlockedCount = await prisma.userAchievement.count({
      where: { userId },
    });

    const recentUnlocks = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
      take: 5,
    });

    res.json({
      totalAchievements,
      unlockedCount,
      lockedCount: totalAchievements - unlockedCount,
      completionPercentage: totalAchievements > 0
        ? Math.round((unlockedCount / totalAchievements) * 100)
        : 0,
      recentUnlocks: recentUnlocks.map((ua: any) => ({
        name: ua.achievement.name,
        badge: ua.achievement.badge,
        unlockedAt: ua.unlockedAt,
      })),
    });
  } catch (error) {
    console.error('❌ ACHIEVEMENT STATS ERROR:', error);
    res.status(500).json({ error: 'Failed to fetch achievement stats' });
  }
});

export default router;
