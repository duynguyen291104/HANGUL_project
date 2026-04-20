import { prisma } from '../lib/prisma';

/**
 * Save user progress for a skill on a topic
 * Called after quiz/writing/pronunciation is completed
 */
export async function saveUserProgress(
  userId: number,
  topicId: number,
  skillType: 'QUIZ' | 'WRITING' | 'PRONUNCIATION',
  score: number,
  isComplete: boolean
) {
  try {
    // Save or update progress
    const progress = await prisma.userProgress.upsert({
      where: {
        userId_topicId_skillType: {
          userId,
          topicId,
          skillType,
        },
      },
      update: {
        completed: isComplete || score >= 70,
        score,
        attempts: { increment: 1 },
        completedAt: isComplete || score >= 70 ? new Date() : null,
        updatedAt: new Date(),
      },
      create: {
        userId,
        topicId,
        skillType,
        completed: isComplete || score >= 70,
        score,
        attempts: 1,
        completedAt: isComplete || score >= 70 ? new Date() : null,
      },
    });

    console.log(`✅ Progress saved: ${skillType} for topic ${topicId}`);
    return progress;
  } catch (error) {
    console.error('❌ Error saving progress:', error);
    throw error;
  }
}

/**
 * Add XP to user
 * Different XP amounts for different skills
 */
export async function addUserXP(userId: number, skillType: 'QUIZ' | 'WRITING' | 'PRONUNCIATION', score: number) {
  try {
    // Only add XP if score >= 70 (passed)
    if (score < 70) {
      return 0;
    }

    // Calculate XP based on skill type
    let xpGained = 0;
    switch (skillType) {
      case 'QUIZ':
        xpGained = Math.floor(score / 10); // 7-10 XP
        break;
      case 'WRITING':
        xpGained = Math.floor(score / 12); // 5-8 XP
        break;
      case 'PRONUNCIATION':
        xpGained = Math.floor(score / 11); // 6-9 XP
        break;
    }

    // Update user XP
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        totalXP: { increment: xpGained },
      },
    });

    console.log(`✅ XP added: +${xpGained} XP (Total: ${user.totalXP})`);
    return xpGained;
  } catch (error) {
    console.error('❌ Error adding XP:', error);
    throw error;
  }
}

/**
 * Check and create level test unlock
 * When user reaches XP/Trophy requirements for next level
 */
export async function checkLevelTestUnlock(userId: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    const LEVEL_REQUIREMENTS: Record<string, { xp: number; trophy: number }> = {
      'CỰC_CƠ_BẢN': { xp: 0, trophy: 0 },
      'CƠ_BẢN': { xp: 1500, trophy: 500 },
      'TRUNG_CẤP': { xp: 2500, trophy: 1000 },
      'NÂNG_CAO': { xp: 3500, trophy: 2000 },
      'LÃO_LUYỆN': { xp: 5000, trophy: 4000 },
    };

    const LEVEL_ORDER = ['CỰC_CƠ_BẢN', 'CƠ_BẢN', 'TRUNG_CẤP', 'NÂNG_CAO', 'LÃO_LUYỆN'];

    // Find next level
    const currentLevelIndex = LEVEL_ORDER.indexOf(user.level);
    if (currentLevelIndex >= LEVEL_ORDER.length - 1) {
      return null; // Already at max level
    }

    const nextLevel = LEVEL_ORDER[currentLevelIndex + 1];
    const requirements = LEVEL_REQUIREMENTS[nextLevel];

    // Check if user meets requirements
    if (user.totalXP >= requirements.xp && user.totalTrophy >= requirements.trophy) {
      // Check if test progress already exists
      const existingTest = await prisma.levelTestProgress.findUnique({
        where: {
          userId_targetLevel: {
            userId,
            targetLevel: nextLevel,
          },
        },
      });

      if (!existingTest) {
        // Create new test unlock record
        const testProgress = await prisma.levelTestProgress.create({
          data: {
            userId,
            targetLevel: nextLevel,
            requiredXP: requirements.xp,
            requiredTrophy: requirements.trophy,
            isTestUnlocked: true,
          },
        });

        console.log(`✅ Level test unlocked: ${nextLevel}`);
        return testProgress;
      }

      // Already has record, just return it
      return existingTest;
    }

    return null;
  } catch (error) {
    console.error('❌ Error checking level test unlock:', error);
    throw error;
  }
}
