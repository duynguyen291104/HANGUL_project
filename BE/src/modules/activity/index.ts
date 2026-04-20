import express, { Request, Response } from 'express';
import { startOfWeek, endOfWeek, startOfDay } from 'date-fns';
import { prisma } from '../../lib/prisma';
import { checkAndAwardAchievements } from '../../utils/achievementTracker';

const router = express.Router();

// Helper: get current date string in UTC+7 (YYYY-MM-DD)
function getTodayUTC7(): string {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  return now.toISOString().split('T')[0];
}

// Helper: update streak based on UTC+7 date
async function updateStreak(userId: number): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentStreak: true, lastCheckinDate: true },
  });
  if (!user) return 0;

  const todayUTC7 = getTodayUTC7();
  const lastCheckin = user.lastCheckinDate
    ? new Date(user.lastCheckinDate.getTime() + 7 * 3600 * 1000).toISOString().split('T')[0]
    : null;

  // Already checked in today → don't increment
  if (lastCheckin === todayUTC7) {
    return user.currentStreak;
  }

  // Check if yesterday
  const yesterday = new Date(Date.now() + 7 * 3600 * 1000 - 86400 * 1000)
    .toISOString().split('T')[0];
  const newStreak = lastCheckin === yesterday ? user.currentStreak + 1 : 1;

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak: newStreak,
      lastCheckinDate: startOfDay(new Date()),
    },
  });

  return newStreak;
}

// GET /activity/weekly - Get weekly activity for current user
router.get('/weekly', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = user.id;

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday

    const activities = await prisma.userActivity.findMany({
      where: {
        userId: parseInt(userId),
        date: { gte: weekStart, lte: weekEnd },
      },
      orderBy: { date: 'asc' },
    });

    // Totals — use sessionCount for Sessions and Avg
    const totalSeconds = activities.reduce((sum, a) => sum + a.totalSeconds, 0);
    const totalSessions = activities.reduce((sum, a) => sum + a.sessionCount, 0);
    const totalHours = Math.round(totalSeconds / 3600);
    const avgSessionMinutes = totalSessions > 0
      ? Math.round((totalSeconds / totalSessions) / 60)
      : 0;

    // Group by day
    const dailyBreakdown = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayActivities = activities.filter(
        a => a.date.toISOString().split('T')[0] === dateStr
      );
      const daySeconds = dayActivities.reduce((sum, a) => sum + a.totalSeconds, 0);

      return {
        date: dateStr,
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i],
        seconds: daySeconds,
        minutes: Math.round(daySeconds / 60),
        hours: (daySeconds / 3600).toFixed(2),
      };
    });

    res.json({
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      totalSeconds,
      totalMinutes: Math.round(totalSeconds / 60),
      totalHours,
      avgSessionMinutes,
      totalSessions,
      activityCount: totalSessions, // sessions count (sum of sessionCount)
      daily: dailyBreakdown,
    });
  } catch (error) {
    console.error('❌ Error fetching weekly activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// POST /activity/log-time - Log time + update streak after completing a session
router.post('/log-time', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = parseInt(user.id);

    const { totalSeconds, skillType = 'mixed', sessionCount = 1 } = req.body;

    if (totalSeconds === undefined || totalSeconds < 0) {
      return res.status(400).json({ error: 'Invalid totalSeconds' });
    }

    // Get today's date at midnight (UTC)
    const today = startOfDay(new Date());

    // Upsert activity record for today
    const existingActivity = await prisma.userActivity.findUnique({
      where: { userId_date_skillType: { userId, date: today, skillType } },
    });

    let activity;
    if (existingActivity) {
      activity = await prisma.userActivity.update({
        where: { id: existingActivity.id },
        data: {
          totalSeconds: existingActivity.totalSeconds + totalSeconds,
          sessionCount: existingActivity.sessionCount + sessionCount,
        },
      });
    } else {
      activity = await prisma.userActivity.create({
        data: { userId, date: today, skillType, totalSeconds, sessionCount },
      });
    }

    // Update streak (once per UTC+7 day)
    const newStreak = await updateStreak(userId);

    // Check and award STREAK achievements
    const newAchievements = await checkAndAwardAchievements(userId);

    res.json({
      success: true,
      streak: newStreak,
      activity: {
        ...activity,
        hours: (activity.totalSeconds / 3600).toFixed(2),
        minutes: Math.round(activity.totalSeconds / 60),
      },
      newAchievements,
    });
  } catch (error) {
    console.error('❌ Error logging time:', error);
    res.status(500).json({ error: 'Failed to log time' });
  }
});

// GET /activity/today - Get today's activity
router.get('/today', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = user.id;

    const today = startOfDay(new Date());

    const activities = await prisma.userActivity.findMany({
      where: {
        userId: parseInt(userId),
        date: today,
      },
    });

    const totalSeconds = activities.reduce((sum, a) => sum + a.totalSeconds, 0);

    res.json({
      date: today.toISOString().split('T')[0],
      totalSeconds,
      minutes: Math.round(totalSeconds / 60),
      hours: (totalSeconds / 3600).toFixed(2),
      activities: activities.map(a => ({
        ...a,
        hours: (a.totalSeconds / 3600).toFixed(2),
        minutes: Math.round(a.totalSeconds / 60),
      })),
    });
  } catch (error) {
    console.error('❌ Error fetching today activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

export default router;
