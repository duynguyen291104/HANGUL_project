import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';

const router = Router();

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

// ========================
// ADMIN STATS
// ========================
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [totalVocab, totalQuestions, totalUsers, totalTopics, totalXPResult, topPlayers] =
      await Promise.all([
        prisma.vocabulary.count(),
        prisma.question.count(),
        prisma.user.count(),
        prisma.topic.count(),
        prisma.user.aggregate({ _sum: { totalXP: true } }),
        prisma.user.findMany({
          take: 5,
          orderBy: { totalTrophy: 'desc' },
          select: { id: true, name: true, email: true, level: true, totalXP: true, totalTrophy: true, isBanned: true },
        }),
      ]);

    res.json({
      totalVocab,
      totalQuestions,
      totalUsers,
      totalTopics,
      totalXP: totalXPResult._sum.totalXP ?? 0,
      topPlayers,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ========================
// USER MANAGEMENT
// ========================

// GET all users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        level: true,
        totalXP: true,
        totalTrophy: true,
        currentStreak: true,
        isBanned: true,
        createdAt: true,
        lastActiveAt: true,
      },
    });

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET single user detail
router.get('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userId = parseInt(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        level: true,
        totalXP: true,
        totalTrophy: true,
        currentStreak: true,
        isBanned: true,
        createdAt: true,
        lastActiveAt: true,
        _count: {
          select: {
            quizSessions: true,
            writingPractices: true,
            pronunciationAttempts: true,
          },
        },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST ban user
router.post('/users/:id/ban', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userId = parseInt(req.params.id);
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot ban yourself' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: true },
      select: { id: true, email: true, isBanned: true },
    });

    console.log(`🔒 Admin ${req.user.id} banned user ${userId}`);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// POST unban user
router.post('/users/:id/unban', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userId = parseInt(req.params.id);
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: false },
      select: { id: true, email: true, isBanned: true },
    });

    console.log(`🔓 Admin ${req.user.id} unbanned user ${userId}`);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// DELETE user
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userId = parseInt(req.params.id);
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    await prisma.user.delete({ where: { id: userId } });

    console.log(`🗑️ Admin ${req.user.id} deleted user ${userId}`);
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// POST adjust XP
router.post('/users/:id/adjust-xp', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userId = parseInt(req.params.id);
    const { amount, reason } = req.body;

    if (amount === undefined || !reason) {
      return res.status(400).json({ error: 'amount and reason are required' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { totalXP: { increment: parseInt(amount) } },
      select: { id: true, email: true, totalXP: true },
    });

    console.log(`📊 Admin ${req.user.id} adjusted XP for user ${userId} by ${amount}. Reason: ${reason}`);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error adjusting XP:', error);
    res.status(500).json({ error: 'Failed to adjust XP' });
  }
});

// POST adjust Trophy
router.post('/users/:id/adjust-trophy', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userId = parseInt(req.params.id);
    const { amount, reason } = req.body;

    if (amount === undefined || !reason) {
      return res.status(400).json({ error: 'amount and reason are required' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { totalTrophy: { increment: parseInt(amount) } },
      select: { id: true, email: true, totalTrophy: true },
    });

    console.log(`🏆 Admin ${req.user.id} adjusted Trophy for user ${userId} by ${amount}. Reason: ${reason}`);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error adjusting trophy:', error);
    res.status(500).json({ error: 'Failed to adjust trophy' });
  }
});

// POST reset score (XP + Trophy to 0)
router.post('/users/:id/reset-score', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userId = parseInt(req.params.id);
    const user = await prisma.user.update({
      where: { id: userId },
      data: { totalXP: 0, totalTrophy: 0, currentStreak: 0 },
      select: { id: true, email: true, totalXP: true, totalTrophy: true },
    });

    console.log(`🔄 Admin ${req.user.id} reset score for user ${userId}`);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error resetting score:', error);
    res.status(500).json({ error: 'Failed to reset score' });
  }
});

// POST set level manually
router.post('/users/:id/set-level', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userId = parseInt(req.params.id);
    const { level } = req.body;

    if (!level) {
      return res.status(400).json({ error: 'level is required' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { level },
      select: { id: true, email: true, level: true },
    });

    console.log(`📈 Admin ${req.user.id} set level for user ${userId} to ${level}`);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error setting level:', error);
    res.status(500).json({ error: 'Failed to set level' });
  }
});

// ========================
// TOURNAMENT MANAGEMENT
// ========================

// GET tournament leaderboard
router.get('/tournament/leaderboard', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const top = await prisma.user.findMany({
      take: 50,
      orderBy: { totalTrophy: 'desc' },
      select: { id: true, name: true, email: true, level: true, totalTrophy: true, totalXP: true, isBanned: true },
    });

    res.json({ success: true, data: top });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// POST reset all trophies (new season)
router.post('/tournament/reset-leaderboard', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.user.updateMany({ data: { totalTrophy: 0 } });

    console.log(`🏟️ Admin ${req.user.id} reset tournament leaderboard`);
    res.json({ success: true, message: 'Leaderboard reset. New season started.' });
  } catch (error) {
    console.error('Error resetting leaderboard:', error);
    res.status(500).json({ error: 'Failed to reset leaderboard' });
  }
});

// ========================
// VOCABULARY CRUD
// ========================

// GET all vocabulary with filtering
router.get('/vocabulary', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { level, topic, limit = 1000 } = req.query;

    const where: any = { isActive: true };
    if (level) where.level = level;
    if (topic) where.topicId = parseInt(topic as string);

    const vocabulary = await prisma.vocabulary.findMany({
      where,
      take: parseInt(limit as string),
      include: { topic: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(vocabulary);
  } catch (error) {
    console.error('Error fetching vocabulary:', error);
    res.status(500).json({ error: 'Failed to fetch vocabulary' });
  }
});

// POST create vocabulary
router.post('/vocabulary', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { korean, english, vietnamese, level, topicId, romanization, type } = req.body;

    if (!korean || !english || !topicId) {
      return res.status(400).json({ error: 'Missing required fields: korean, english, topicId' });
    }

    const vocabulary = await prisma.vocabulary.create({
      data: {
        korean,
        english,
        vietnamese: vietnamese || '',
        romanization: romanization || '',
        type: type || 'noun',
        level: level || 'NEWBIE',
        topic: { connect: { id: parseInt(topicId) } },
        isActive: true,
      },
      include: { topic: true },
    });

    res.status(201).json(vocabulary);
  } catch (error) {
    console.error('Error creating vocabulary:', error);
    res.status(500).json({ error: 'Failed to create vocabulary', details: error instanceof Error ? error.message : '' });
  }
});

// PUT update vocabulary
router.put('/vocabulary/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const { korean, english, vietnamese, level, topicId, romanization, type } = req.body;

    const vocabulary = await prisma.vocabulary.update({
      where: { id: parseInt(id) },
      data: {
        ...(korean && { korean }),
        ...(english && { english }),
        ...(vietnamese && { vietnamese }),
        ...(level && { level }),
        ...(romanization && { romanization }),
        ...(type && { type }),
        ...(topicId && { topicId: parseInt(topicId) }),
      },
      include: { topic: true },
    });

    res.json(vocabulary);
  } catch (error) {
    console.error('Error updating vocabulary:', error);
    res.status(500).json({ error: 'Failed to update vocabulary' });
  }
});

// DELETE vocabulary
router.delete('/vocabulary/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;

    await prisma.vocabulary.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Vocabulary deleted' });
  } catch (error) {
    console.error('Error deleting vocabulary:', error);
    res.status(500).json({ error: 'Failed to delete vocabulary' });
  }
});

// ========================
// QUESTIONS CRUD
// ========================

router.get('/questions', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { difficulty, topic, limit = 500 } = req.query;

    const where: any = { isActive: true };
    if (difficulty) where.difficulty = difficulty;
    if (topic) where.topicId = parseInt(topic as string);

    const questions = await prisma.question.findMany({
      where,
      take: parseInt(limit as string),
      include: { topic: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

router.post('/questions', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { questionText, options, correctAnswer, difficulty, topicId, explanation, explanation_vi } = req.body;

    if (!questionText || !options || !correctAnswer || !topicId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const question = await prisma.question.create({
      data: {
        questionText,
        options,
        correctAnswer,
        difficulty: difficulty || 'easy',
        language_from: 'korean',
        language_to: 'english',
        topic: { connect: { id: parseInt(topicId) } },
        explanation: explanation || '',
        explanation_vi: explanation_vi || '',
        isActive: true,
      },
      include: { topic: true },
    });

    res.status(201).json(question);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

router.put('/questions/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const { questionText, options, correctAnswer, difficulty, explanation, explanation_vi } = req.body;

    const question = await prisma.question.update({
      where: { id: parseInt(id) },
      data: {
        ...(questionText && { questionText }),
        ...(options && { options }),
        ...(correctAnswer && { correctAnswer }),
        ...(difficulty && { difficulty }),
        ...(explanation && { explanation }),
        ...(explanation_vi && { explanation_vi }),
      },
      include: { topic: true },
    });

    res.json(question);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

router.delete('/questions/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;

    await prisma.question.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Question deleted' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// ========================
// HANDWRITING CRUD
// ========================

router.get('/handwriting', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { level, topic } = req.query;
    const where: any = { isActive: true };
    if (level) where.level = level;
    if (topic) where.topicId = parseInt(topic as string);
    const exercises = await prisma.handwritingExercise.findMany({
      where,
      include: { topic: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(exercises);
  } catch (error) {
    console.error('Error fetching handwriting exercises:', error);
    res.status(500).json({ error: 'Failed to fetch handwriting exercises' });
  }
});

router.post('/handwriting', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { hangulChar, strokes, level, topicId } = req.body;
    if (!hangulChar || !topicId) {
      return res.status(400).json({ error: 'Missing required fields: hangulChar, topicId' });
    }
    const exercise = await prisma.handwritingExercise.create({
      data: {
        hangulChar,
        strokes: parseInt(strokes) || 1,
        level: level || 'NEWBIE',
        topic: { connect: { id: parseInt(topicId) } },
        isActive: true,
      },
      include: { topic: true },
    });
    res.status(201).json(exercise);
  } catch (error) {
    console.error('Error creating handwriting exercise:', error);
    res.status(500).json({ error: 'Failed to create handwriting exercise' });
  }
});

router.put('/handwriting/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { id } = req.params;
    const { hangulChar, strokes, level, topicId } = req.body;
    const exercise = await prisma.handwritingExercise.update({
      where: { id: parseInt(id) },
      data: {
        ...(hangulChar && { hangulChar }),
        ...(strokes && { strokes: parseInt(strokes) }),
        ...(level && { level }),
        ...(topicId && { topicId: parseInt(topicId) }),
      },
      include: { topic: true },
    });
    res.json(exercise);
  } catch (error) {
    console.error('Error updating handwriting exercise:', error);
    res.status(500).json({ error: 'Failed to update handwriting exercise' });
  }
});

router.delete('/handwriting/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { id } = req.params;
    await prisma.handwritingExercise.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Exercise deleted' });
  } catch (error) {
    console.error('Error deleting handwriting exercise:', error);
    res.status(500).json({ error: 'Failed to delete handwriting exercise' });
  }
});

// ========================
// PRONUNCIATION CRUD
// ========================

router.get('/pronunciation', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { level, topic } = req.query;
    const where: any = {};
    if (level) where.level = level;
    if (topic) where.topicId = parseInt(topic as string);
    const words = await prisma.pronunciationWord.findMany({
      where,
      include: { topic: true, vocabulary: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(words);
  } catch (error) {
    console.error('Error fetching pronunciation words:', error);
    res.status(500).json({ error: 'Failed to fetch pronunciation words' });
  }
});

router.post('/pronunciation', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { vocabId, nativeAudioUrl, level, topicId } = req.body;
    if (!vocabId || !nativeAudioUrl || !topicId) {
      return res.status(400).json({ error: 'Missing required fields: vocabId, nativeAudioUrl, topicId' });
    }
    const word = await prisma.pronunciationWord.create({
      data: {
        vocabulary: { connect: { id: parseInt(vocabId) } },
        nativeAudioUrl,
        level: level || 'NEWBIE',
        topic: { connect: { id: parseInt(topicId) } },
      },
      include: { topic: true, vocabulary: true },
    });
    res.status(201).json(word);
  } catch (error) {
    console.error('Error creating pronunciation word:', error);
    res.status(500).json({ error: 'Failed to create pronunciation word' });
  }
});

router.put('/pronunciation/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { id } = req.params;
    const { vocabId, nativeAudioUrl, level, topicId } = req.body;
    const word = await prisma.pronunciationWord.update({
      where: { id: parseInt(id) },
      data: {
        ...(vocabId && { vocabId: parseInt(vocabId) }),
        ...(nativeAudioUrl && { nativeAudioUrl }),
        ...(level && { level }),
        ...(topicId && { topicId: parseInt(topicId) }),
      },
      include: { topic: true, vocabulary: true },
    });
    res.json(word);
  } catch (error) {
    console.error('Error updating pronunciation word:', error);
    res.status(500).json({ error: 'Failed to update pronunciation word' });
  }
});

router.delete('/pronunciation/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { id } = req.params;
    await prisma.pronunciationWord.delete({ where: { id: parseInt(id) } });
    res.json({ success: true, message: 'Pronunciation word deleted' });
  } catch (error) {
    console.error('Error deleting pronunciation word:', error);
    res.status(500).json({ error: 'Failed to delete pronunciation word' });
  }
});

export default router;
