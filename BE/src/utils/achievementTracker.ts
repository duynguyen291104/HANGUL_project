import prismaLib from '../lib/prisma';

const prisma = prismaLib;

export interface NewAchievement {
  id: number;
  name: string;
  description: string;
  criteria: string;
}

/**
 * Check all unearned achievements for a user and award any that are now met.
 * Returns the list of newly awarded achievements (to be sent to the client).
 */
export async function checkAndAwardAchievements(userId: number): Promise<NewAchievement[]> {
  try {
    // Fetch current user stats in one query
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalXP: true,
        currentStreak: true,
        totalTrophy: true,
        _count: {
          select: { vocabularyLearned: true },
        },
      },
    });

    if (!user) return [];

    // Count completed quiz sessions (distinct topics where QUIZ was completed)
    const quizCount = await prisma.userProgress.count({
      where: { userId, skillType: 'QUIZ', completed: true },
    });

    const vocabCount = user._count.vocabularyLearned;

    const userValues: Record<string, number> = {
      QUIZ_COUNT: quizCount,
      XP: user.totalXP,
      STREAK: user.currentStreak,
      VOCAB_COUNT: vocabCount,
      TROPHY: user.totalTrophy,
    };

    // Get achievements already earned
    const earned = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });
    const earnedSet = new Set(earned.map((e: { achievementId: number }) => e.achievementId));

    // Check all achievements
    const allAchievements = await prisma.achievement.findMany({ orderBy: { id: 'asc' } });
    const newlyUnlocked: NewAchievement[] = [];

    for (const ach of allAchievements) {
      if (earnedSet.has(ach.id)) continue;
      if (ach.target === null || ach.target === undefined) continue;

      const current = userValues[ach.criteria] ?? 0;
      let met = false;
      if (ach.condition === 'gte') met = current >= ach.target;
      else if (ach.condition === 'gt') met = current > ach.target;
      else if (ach.condition === 'eq') met = current === ach.target;

      if (met) {
        await prisma.userAchievement.create({
          data: {
            userId,
            achievementId: ach.id,
            completed: true,
            completedAt: new Date(),
            progress: ach.target,
          },
        });
        newlyUnlocked.push({
          id: ach.id,
          name: ach.name,
          description: ach.description,
          criteria: ach.criteria,
        });
      }
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
}
