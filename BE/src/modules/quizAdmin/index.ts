import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { createQuizQuestion, getQuizQuestionWithAnswers } from '../../utils/quizGenerator';

const router = Router();

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

// ========================
// CREATE QUIZ QUESTION (ADMIN)
// ========================
router.post(
  '/admin/create',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        vocabularyId,
        topicId,
        questionText,
        wrongAnswerIds,
        level,
        questionType = 'vocabulary',
      } = req.body;

      // Validate input
      if (!vocabularyId || !topicId || !questionText || !wrongAnswerIds || !level) {
        return res.status(400).json({
          error:
            'Missing required fields: vocabularyId, topicId, questionText, wrongAnswerIds, level',
        });
      }

      if (!Array.isArray(wrongAnswerIds) || wrongAnswerIds.length !== 3) {
        return res.status(400).json({ error: 'wrongAnswerIds must be array of exactly 3 IDs' });
      }

      // Get correct answer text from vocabulary
      const correctVocab = await prisma.vocabulary.findUnique({
        where: { id: vocabularyId },
      });

      if (!correctVocab) {
        return res.status(404).json({ error: 'Vocabulary not found' });
      }

      // Create question
      const result = await createQuizQuestion({
        vocabularyId,
        topicId,
        questionText,
        correctAnswerText: correctVocab.vietnamese,
        wrongAnswerIds,
        level,
        questionType,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        message: 'Quiz question created successfully',
        quizQuestion: result.quizQuestion,
      });
    } catch (error) {
      console.error('❌ Create quiz question error:', error);
      res.status(500).json({ error: 'Failed to create quiz question' });
    }
  }
);

// ========================
// UPDATE QUIZ QUESTION (ADMIN)
// ========================
router.put(
  '/admin/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { questionText, wrongAnswerIds, isActive } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Quiz question ID is required' });
      }

      // Validate question exists
      const question = await prisma.quizQuestion.findUnique({
        where: { id: parseInt(id) },
      });

      if (!question) {
        return res.status(404).json({ error: 'Quiz question not found' });
      }

      // If updating wrong answers, validate
      if (wrongAnswerIds) {
        if (!Array.isArray(wrongAnswerIds) || wrongAnswerIds.length !== 3) {
          return res.status(400).json({ error: 'wrongAnswerIds must be array of exactly 3 IDs' });
        }

        // Validate all exist and are from same level + topic
        const wrongAnswers = await prisma.vocabulary.findMany({
          where: { id: { in: wrongAnswerIds } },
        });

        if (wrongAnswers.length !== 3) {
          return res.status(400).json({ error: 'Some wrong answers do not exist' });
        }

        for (const wa of wrongAnswers) {
          if (wa.topicId !== question.topicId || wa.level !== question.level) {
            return res.status(400).json({
              error: 'All wrong answers must be from same topic and level',
            });
          }
        }
      }

      // Update question
      const updated = await prisma.quizQuestion.update({
        where: { id: parseInt(id) },
        data: {
          ...(questionText && { questionText }),
          ...(wrongAnswerIds && { wrongAnswerIds }),
          ...(isActive !== undefined && { isActive }),
          updatedAt: new Date(),
        },
        include: {
          vocabulary: {
            select: { korean: true, english: true, vietnamese: true },
          },
        },
      });

      res.json({
        success: true,
        message: 'Quiz question updated successfully',
        quizQuestion: updated,
      });
    } catch (error) {
      console.error('❌ Update quiz question error:', error);
      res.status(500).json({ error: 'Failed to update quiz question' });
    }
  }
);

// ========================
// DELETE QUIZ QUESTION (ADMIN)
// ========================
router.delete(
  '/admin/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'Quiz question ID is required' });
      }

      // Check if question exists
      const question = await prisma.quizQuestion.findUnique({
        where: { id: parseInt(id) },
      });

      if (!question) {
        return res.status(404).json({ error: 'Quiz question not found' });
      }

      // Delete
      await prisma.quizQuestion.delete({
        where: { id: parseInt(id) },
      });

      res.json({
        success: true,
        message: 'Quiz question deleted successfully',
      });
    } catch (error) {
      console.error('❌ Delete quiz question error:', error);
      res.status(500).json({ error: 'Failed to delete quiz question' });
    }
  }
);

// ========================
// GET ALL QUIZ QUESTIONS (ADMIN - FOR MANAGEMENT)
// ========================
router.get(
  '/admin/list',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { topicId, level, page = 1, limit = 20 } = req.query;

      const where: any = {};

      if (topicId) {
        where.topicId = parseInt(topicId as string);
      }

      if (level) {
        where.level = level as string;
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const questions = await prisma.quizQuestion.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          vocabulary: {
            select: {
              id: true,
              korean: true,
              english: true,
              vietnamese: true,
              level: true,
            },
          },
          topic: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const total = await prisma.quizQuestion.count({ where });

      res.json({
        success: true,
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string)),
        questions,
      });
    } catch (error) {
      console.error('❌ List quiz questions error:', error);
      res.status(500).json({ error: 'Failed to list quiz questions' });
    }
  }
);

// ========================
// GET SINGLE QUIZ QUESTION WITH ANSWERS (FOR PREVIEW)
// ========================
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Quiz question ID is required' });
    }

    const result = await getQuizQuestionWithAnswers(parseInt(id));

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Get quiz question error:', error);
    res.status(500).json({ error: 'Failed to get quiz question' });
  }
});

// ========================
// GET QUIZ QUESTIONS BY TOPIC (FOR DISPLAY)
// ========================
router.get('/topic/:topicId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { topicId } = req.params;
    const { limit = 10 } = req.query;

    if (!topicId) {
      return res.status(400).json({ error: 'topicId is required' });
    }

    // Validate topic exists
    const topic = await prisma.topic.findUnique({
      where: { id: parseInt(topicId) },
    });

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Get user level
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get quiz questions for user's level + topic
    const questions = await prisma.quizQuestion.findMany({
      where: {
        topicId: parseInt(topicId),
        level: user.level,
        isActive: true,
      },
      take: parseInt(limit as string),
      select: {
        id: true,
        questionText: true,
        level: true,
        vocabulary: {
          select: { korean: true, english: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (questions.length === 0) {
      return res.json({
        success: true,
        message: `No quiz questions found for ${user.level} level in this topic`,
        questions: [],
      });
    }

    res.json({
      success: true,
      userLevel: user.level,
      topicId: parseInt(topicId),
      count: questions.length,
      questions,
    });
  } catch (error) {
    console.error('❌ Get topic questions error:', error);
    res.status(500).json({ error: 'Failed to get topic questions' });
  }
});

export default router;
