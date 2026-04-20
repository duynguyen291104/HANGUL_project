import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Helper: Check if two dates are the same day (ignoring time)
 */
function isSameDay(date1: Date | null, date2: Date | null): boolean {
  if (!date1 || !date2) return false;
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Helper: Check if date1 is yesterday relative to date2
 */
function isYesterday(date1: Date | null, date2: Date | null): boolean {
  if (!date1 || !date2) return false;
  
  const yesterday = new Date(date2);
  yesterday.setDate(date2.getDate() - 1);
  
  return isSameDay(yesterday, date1);
}

/**
 * Update user streak when they complete an activity (quiz, writing, pronunciation)
 * This should be called when user completes a quiz, writing practice, or pronunciation exercise
 */
export async function updateUserStreak(userId: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.error(`User ${userId} not found`);
      return null;
    }

    const now = new Date();
    const lastActiveAt = user.lastActiveAt;

    let newStreak = user.currentStreak;

    // Check if activity is on same day (don't increment)
    if (isSameDay(now, lastActiveAt)) {
      // Same day, don't change streak
    } 
    // Check if activity is on consecutive day (increment streak)
    else if (isYesterday(lastActiveAt, now)) {
      newStreak = user.currentStreak + 1;
    } 
    // Otherwise, reset to 1 (new activity after a gap)
    else {
      newStreak = 1;
    }

    // Update user with new streak and last activity date
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        lastActiveAt: now,
        streakStartDate: newStreak === 1 ? now : user.streakStartDate,
      },
      select: {
        id: true,
        currentStreak: true,
        lastActiveAt: true,
        streakStartDate: true,
      },
    });

    return updatedUser;
  } catch (error) {
    console.error('Error updating user streak:', error);
    return null;
  }
}

/**
 * Get user streak information
 */
export async function getUserStreak(userId: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        currentStreak: true,
        lastActiveAt: true,
        streakStartDate: true,
      },
    });

    if (!user) return null;

    // Check if streak should be reset (if last activity was more than 1 day ago)
    if (user.lastActiveAt) {
      const now = new Date();
      const dayDifference = Math.floor(
        (now.getTime() - user.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // If more than 1 day has passed since last activity, streak is broken
      if (dayDifference > 1) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            currentStreak: 0,
            streakStartDate: null,
          },
        });

        return {
          id: user.id,
          streak: 0,
          lastActiveAt: user.lastActiveAt,
          streakStartDate: null,
          isBroken: true,
        };
      }
    }

    return {
      id: user.id,
      streak: user.currentStreak,
      lastActiveAt: user.lastActiveAt,
      streakStartDate: user.streakStartDate,
      isBroken: false,
    };
  } catch (error) {
    console.error('Error getting user streak:', error);
    return null;
  }
}

/**
 * Reset user streak (when they miss a day or manually)
 */
export async function resetUserStreak(userId: number) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: 0,
        streakStartDate: null,
      },
    });
    return true;
  } catch (error) {
    console.error('Error resetting streak:', error);
    return false;
  }
}
