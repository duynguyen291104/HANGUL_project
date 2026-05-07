import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { getRank } from '../../utils/rankCalculator';

const userRouter = Router();

// ========================
// GET USER STATS
// ========================
userRouter.get('/stats', async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        totalXP: true,
        totalTrophy: true,
        currentStreak: true,
        level: true,
        lastCheckinDate: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const trophyValue = user.totalTrophy || 0;
    const isEligible = trophyValue >= 1000;
    const rank = getRank(trophyValue);

    console.log(`✅ User ${user.email}: Trophy=${trophyValue}, Rank=${rank}, Eligible=${isEligible}`);

    res.json({
      userId: user.id,
      name: user.name,
      email: user.email,
      trophy: trophyValue,
      rank,
      eligible: isEligible,
      // Other fields (informational only)
      xp: user.totalXP,
      streak: user.currentStreak,
      level: user.level,
      lastCheckinDate: user.lastCheckinDate,
    });
  } catch (error) {
    console.error('❌ USER STATS ERROR:', error);
    res.status(500).json({ error: 'Failed to load user stats' });
  }
});

// ========================
// GET USER PROFILE
// ========================
userRouter.get('/profile', async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        publicId: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        level: true,
        levelLocked: true,
        totalXP: true,
        totalTrophy: true,
        currentStreak: true,
        lastCheckinDate: true,
        provider: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate rank from trophy
    const rank = getRank(user.totalTrophy || 0);

    res.json({
      ...user,
      rank, // Add rank to response
    });
  } catch (error) {
    console.error(' USER PROFILE ERROR:', error);
    res.status(500).json({ error: 'Failed to load user profile' });
  }
});

// ========================
// UPDATE USER PROFILE (name, email)
// ========================
userRouter.put('/profile', async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { name, email } = req.body;

    if (!name && !email) {
      return res.status(400).json({ error: 'At least one field (name or email) is required' });
    }

    const data: any = {};
    if (name) data.name = name.trim();
    if (email) data.email = email.trim();

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true },
    });

    res.json({ message: 'Profile updated successfully', name: user.name, email: user.email });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email đã được sử dụng bởi tài khoản khác.' });
    }
    console.error('UPDATE PROFILE ERROR:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// NOTE: /set-level endpoint moved to learning-path module
// Use POST /api/learning-path/set-level or /api/user/set-level (same endpoint)

// ========================
// UPDATE LEVEL (From learning-map page)
// ========================
userRouter.put('/update-level', async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { level } = req.body;

    if (!level) {
      return res.status(400).json({ error: 'Level is required' });
    }

    const validLevels = ['NEWBIE', 'BEGINNER', 'INTERMEDIATE', 'UPPER', 'ADVANCED'];
    if (!validLevels.includes(level)) {
      return res.status(400).json({ error: 'Invalid level' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { level },
      select: {
        id: true,
        level: true,
      },
    });

    console.log(` Level updated for user ${userId}: ${level}`);
    res.json({ message: 'Level updated successfully', level: user.level });
  } catch (error) {
    console.error(' UPDATE LEVEL ERROR:', error);
    res.status(500).json({ error: 'Failed to update level' });
  }
});

export default userRouter;
