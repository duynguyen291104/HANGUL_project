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
// GET PRONUNCIATION VOCABULARY BY USER LEVEL
// ========================
router.get('/vocabulary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { topicId, limit = 10 } = req.query;

    // Get user with their current level
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build WHERE clause: MUST filter by user's level (NO random mixing)
    const where: any = {
      level: user.level,  // ← CRITICAL: Only same level vocabulary
      isActive: true,
    };

    if (topicId) {
      where.topicId = parseInt(topicId as string);
    }

    // Fetch vocabulary from PostgreSQL only
    const vocabulary = await prisma.vocabulary.findMany({
      where,
      take: parseInt(limit as string),
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
        topicId: topicId || null,
        count: 0,
        data: [],
        message: `No vocabulary available for ${user.level} level${topicId ? ' in this topic' : ''}`,
      });
    }

    res.json({
      userLevel: user.level,
      topicId: topicId || null,
      count: vocabulary.length,
      data: vocabulary,
    });
  } catch (error) {
    console.error('❌ Pronunciation vocabulary error:', error);
    res.status(500).json({ error: 'Failed to fetch pronunciation vocabulary' });
  }
});

// ========================
// SUBMIT PRONUNCIATION ATTEMPT & ADD XP
// ========================
router.post('/submit', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { vocabId, topicId, score = 0 } = req.body;

    if (!vocabId) {
      return res.status(400).json({ error: 'vocabId required' });
    }

    const userId = req.user.id;

    // Validate vocabulary exists
    const vocab = await prisma.vocabulary.findUnique({
      where: { id: parseInt(vocabId) },
    });

    if (!vocab) {
      return res.status(404).json({ error: 'Vocabulary not found' });
    }

    // Calculate XP: Passing score (>=70) = 15 XP
    const xpGained = score >= 70 ? 15 : 5;

    // Update user XP
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalXP: { increment: xpGained },
      },
    });

    // Save to LearningHistory (only if topicId provided)
    // This uses REPLACE semantics: delete old record for this topic/skillType, then create new one
    if (topicId) {
      try {
        // Delete old record for this user+topic+pronunciation skillType
        await prisma.learningHistory.deleteMany({
          where: {
            userId,
            topicId,
            skillType: 'pronunciation',
          },
        });

        // Create new record with vocabulary info and accuracy score
        await prisma.learningHistory.create({
          data: {
            userId,
            topicId,
            korean: vocab.korean,
            vietnamese: vocab.vietnamese || vocab.english,
            accuracy: score,
            skillType: 'pronunciation',
          },
        });

        console.log(`💾 Pronunciation history saved for vocab "${vocab.korean}" with score ${score}%`);
      } catch (err) {
        console.error('⚠️ Failed to save pronunciation history:', err);
        // Don't fail the request if history save fails
      }
    }

    // Save progress if topicId provided
    if (topicId) {
      const existing = await prisma.userProgress.findFirst({
        where: { userId, topicId, skillType: 'PRONUNCIATION' },
      });

      if (existing) {
        await prisma.userProgress.update({
          where: { id: existing.id },
          data: {
            completed: true,
            score: score,
            attempts: { increment: 1 },
          },
        });
      } else {
        await prisma.userProgress.create({
          data: {
            userId,
            topicId,
            skillType: 'PRONUNCIATION',
            completed: true,
            score: score,
            attempts: 1,
          },
        });
      }
    }

    res.json({
      success: true,
      xpGained,
      score,
      message: `Pronunciation score: ${score}%. +${xpGained} XP 🎧`,
    });
  } catch (error) {
    console.error('❌ Pronunciation submit error:', error);
    res.status(500).json({ error: 'Failed to submit pronunciation attempt' });
  }
});

export default router;
