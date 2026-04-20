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
// GET TOP USERS (All-time)
// ========================
router.get('/top', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const level = req.query.level as string;

    const where: any = {};
    if (level) where.level = level;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        avatar: true,
        level: true,
        totalXP: true,
        totalTrophy: true,
        currentStreak: true,
      },
      orderBy: [{ totalXP: 'desc' }, { totalTrophy: 'desc' }],
      take: limit,
    });

    const leaderboard = users.map((user: any, idx: number) => ({
      rank: idx + 1,
      userId: user.id,
      name: user.name,
      avatar: user.avatar,
      level: user.level,
      xp: user.totalXP,
      trophy: user.totalTrophy || 0,
      streak: user.currentStreak,
    }));

    res.json({ leaderboard, total: leaderboard.length });
  } catch (error) {
    console.error('❌ LEADERBOARD ERROR:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ========================
// GET WEEKLY LEADERBOARD
// ========================
router.get('/weekly', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get users who were active in the last week
    const users = await prisma.user.findMany({
      where: {
        lastCheckinDate: { gte: oneWeekAgo },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        level: true,
        totalXP: true,
        totalTrophy: true,
        currentStreak: true,
      },
      orderBy: [{ totalXP: 'desc' }],
      take: limit,
    });

    const leaderboard = users.map((user: any, idx: number) => ({
      rank: idx + 1,
      userId: user.id,
      name: user.name,
      avatar: user.avatar,
      level: user.level,
      xp: user.totalXP,
      trophy: user.totalTrophy || 0,
      streak: user.currentStreak,
    }));

    res.json({ leaderboard, total: leaderboard.length, period: 'weekly' });
  } catch (error) {
    console.error('❌ WEEKLY LEADERBOARD ERROR:', error);
    res.status(500).json({ error: 'Failed to fetch weekly leaderboard' });
  }
});

// ========================
// GET MONTHLY LEADERBOARD
// ========================
router.get('/monthly', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const users = await prisma.user.findMany({
      where: {
        lastCheckinDate: { gte: oneMonthAgo },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        level: true,
        totalXP: true,
        totalTrophy: true,
        currentStreak: true,
      },
      orderBy: [{ totalXP: 'desc' }],
      take: limit,
    });

    const leaderboard = users.map((user: any, idx: number) => ({
      rank: idx + 1,
      userId: user.id,
      name: user.name,
      avatar: user.avatar,
      level: user.level,
      xp: user.totalXP,
      trophy: user.totalTrophy || 0,
      streak: user.currentStreak,
    }));

    res.json({ leaderboard, total: leaderboard.length, period: 'monthly' });
  } catch (error) {
    console.error('❌ MONTHLY LEADERBOARD ERROR:', error);
    res.status(500).json({ error: 'Failed to fetch monthly leaderboard' });
  }
});

// ========================
// GET USER RANK
// ========================
router.get('/rank/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalXP: true, name: true, level: true, totalTrophy: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Count users with more XP
    const higherRanked = await prisma.user.count({
      where: { totalXP: { gt: user.totalXP } },
    });

    const totalUsers = await prisma.user.count();

    res.json({
      userId,
      name: user.name,
      level: user.level,
      xp: user.totalXP,
      trophy: user.totalTrophy || 0,
      rank: higherRanked + 1,
      totalUsers,
      percentile: Math.round(((totalUsers - higherRanked) / totalUsers) * 100),
    });
  } catch (error) {
    console.error('❌ USER RANK ERROR:', error);
    res.status(500).json({ error: 'Failed to fetch user rank' });
  }
});

// ========================
// GET NEARBY USERS (relative to current user)
// ========================
router.get('/nearby', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const range = parseInt(req.query.range as string) || 10;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalXP: true },
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get users around the same XP level
    const nearbyUsers = await prisma.user.findMany({
      where: {
        totalXP: {
          gte: Math.max(0, currentUser.totalXP - 500),
          lte: currentUser.totalXP + 500,
        },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        level: true,
        totalXP: true,
        totalTrophy: true,
      },
      orderBy: { totalXP: 'desc' },
      take: range * 2,
    });

    const leaderboard = nearbyUsers.map((user: any, idx: number) => ({
      rank: idx + 1,
      userId: user.id,
      name: user.name,
      avatar: user.avatar,
      level: user.level,
      xp: user.totalXP,
      trophy: user.totalTrophy || 0,
      isCurrentUser: user.id === userId,
    }));

    res.json({ leaderboard, total: leaderboard.length });
  } catch (error) {
    console.error('❌ NEARBY LEADERBOARD ERROR:', error);
    res.status(500).json({ error: 'Failed to fetch nearby leaderboard' });
  }
});

// ========================
// GET LEADERBOARD STATS
// ========================
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalXP = await prisma.user.aggregate({ _sum: { totalXP: true } });
    const avgXP = await prisma.user.aggregate({ _avg: { totalXP: true } });

    res.json({
      totalUsers,
      totalXP: totalXP._sum.totalXP || 0,
      averageXP: Math.round(avgXP._avg.totalXP || 0),
    });
  } catch (error) {
    console.error('❌ LEADERBOARD STATS ERROR:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
