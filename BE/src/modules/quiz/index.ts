import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { authenticate } from '../../middleware/authenticate';
import { generateQuizQuestions, createQuizQuestion, getQuizQuestionWithAnswers } from '../../utils/quizGenerator';
import { checkAndAwardAchievements } from '../../utils/achievementTracker';

const router = Router();

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

// ========================
// GENERATE QUIZ QUESTIONS DYNAMICALLY (10 questions from vocabulary)
// ========================
router.get('/generate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { topicId } = req.query;
    console.log('📝 Quiz generate request:', { userId: req.user.id, topicId, queryKeys: Object.keys(req.query) });

    if (!topicId) {
      return res.status(400).json({ error: 'topicId is required' });
    }

    // Validate topic exists
    const topic = await prisma.topic.findUnique({
      where: { id: parseInt(topicId as string) },
    });

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Generate 10 quiz questions dynamically from vocabulary
    const result = await generateQuizQuestions(req.user.id, parseInt(topicId as string), 10);

    if (!result.success) {
      console.error('❌ Quiz generation failed:', result);
      return res.status(400).json(result);
    }

    res.json({
      ...result,
      topicName: topic.name,
    });
  } catch (error) {
    console.error('❌ Quiz generation error:', error);
    res.status(500).json({ error: 'Failed to generate quiz questions' });
  }
});

// ========================
// GET 10 RANDOM QUESTIONS BY SLUG (No auth needed - client side transform)
// ========================
router.get('/random-questions/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    // Find topic by slug
    const topic = await prisma.topic.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        level: true,
        slug: true,
      },
    });

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Get vocabulary from this topic, randomized, limit 10
    // Using raw SQL for better control over RANDOM()
    const vocabulary = await prisma.$queryRaw<any[]>`
      SELECT * FROM "Vocabulary"
      WHERE "topicId" = ${topic.id}
      AND "isActive" = true
      ORDER BY RANDOM()
      LIMIT 10
    `;

    if (vocabulary.length === 0) {
      return res.status(404).json({ error: 'No vocabulary found in this topic' });
    }

    console.log(`✅ Random 10 questions from topic "${slug}":`, vocabulary.length);

    res.json({
      topicId: topic.id,
      topicName: topic.name,
      topicLevel: topic.level,
      topicSlug: topic.slug,
      vocabulary: vocabulary,
      count: vocabulary.length,
    });
  } catch (error) {
    console.error('❌ Random questions error:', error);
    res.status(500).json({ error: 'Failed to fetch random questions' });
  }
});

// ========================
// SUBMIT SINGLE ANSWER (Check if correct/wrong)
// ========================
router.post('/submit-answer', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { questionId, userAnswer, topicId } = req.body;

    if (!questionId || !userAnswer) {
      return res.status(400).json({ error: 'questionId and userAnswer are required' });
    }

    // Get the vocabulary item to check correct answer
    const vocab = await prisma.vocabulary.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        korean: true,
        english: true,
        vietnamese: true,
        level: true,
      },
    });

    if (!vocab) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check if the user's answer matches the correct Vietnamese translation
    const isCorrect = userAnswer.toLowerCase().trim() === vocab.vietnamese.toLowerCase().trim();

    console.log('📊 Answer check:', { 
      userAnswer, 
      correctAnswer: vocab.vietnamese, 
      isCorrect,
      korean: vocab.korean 
    });

    // Save this answer to QuizHistory
    if (topicId) {
      try {
        await prisma.quizHistory.create({
          data: {
            userId: req.user.id,
            vocabularyId: questionId,
            topicId: topicId,
            userAnswer: userAnswer,
            correctAnswer: vocab.vietnamese,
            isCorrect: isCorrect,
          },
        });
        console.log('💾 Answer history saved');
      } catch (err) {
        console.error('⚠️ Failed to save answer history:', err);
        // Don't fail the request if history save fails
      }
    }

    res.json({
      isCorrect,
      correctAnswer: vocab.vietnamese,
      questionId,
      korean: vocab.korean,
      english: vocab.english,
      explanation: `"${vocab.korean}" (${vocab.english}) nghĩa là "${vocab.vietnamese}"`,
    });
  } catch (error) {
    console.error('❌ Answer submission error:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// ========================
// GET QUIZ VOCABULARY BY USER LEVEL (LEGACY - for compatibility)
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
    console.error('❌ Quiz vocabulary error:', error);
    res.status(500).json({ error: 'Failed to fetch quiz vocabulary' });
  }
});

// ========================
// SUBMIT QUIZ ANSWERS & ADD XP
// ========================
router.post('/submit', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { answers, topicId, slug, score } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid answers format' });
    }

    if (!topicId && !slug) {
      return res.status(400).json({ error: 'topicId or slug is required' });
    }

    const userId = req.user.id;
    
    // If slug is provided instead of topicId, resolve it first
    let actualTopicId = topicId;
    if (!topicId && slug) {
      const topic = await prisma.topic.findUnique({
        where: { slug }
      });
      if (!topic) {
        return res.status(404).json({ error: 'Topic not found' });
      }
      actualTopicId = topic.id;
    }
    
    // Check for isCorrect field (from frontend)
    const correctCount = answers.filter((a: any) => a.isCorrect || a.correct).length;
    const totalCount = answers.length;
    const percentage = Math.round((correctCount / totalCount) * 100);

    console.log('📝 Quiz results:', { correctCount, totalCount, percentage, topicId: actualTopicId });
    
    // 🔥 DEBUG: Log each answer detail
    answers.forEach((a: any, idx: number) => {
      console.log(`   Q${idx + 1}: selected="${a.selectedAnswer}", correct="${a.correctAnswer || a.answer}", isCorrect=${a.isCorrect || a.correct}`);
    });

    // Calculate XP: 10 XP per correct answer
    const xpGained = correctCount * 10;

    // Update user XP
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalXP: { increment: xpGained },
      },
    });

    // Save learning history using REPLACE semantics
    // Delete old records for this topic+skillType, then create new batch
    if (actualTopicId) {
      try {
        // Delete old records
        const deleteResult = await prisma.learningHistory.deleteMany({
          where: {
            userId,
            topicId: actualTopicId,
            skillType: { in: ['quiz', 'QUIZ'] },
          },
        });

        // Build history data for all answers
        const historyData = answers.map((answer: any) => ({
          userId,
          topicId: actualTopicId,
          questionText: answer.questionText || '',
          correctAnswer: answer.correctAnswer || answer.answer || '',
          selectedAnswer: answer.selectedAnswer || answer.userAnswer || '',
          isCorrect: answer.isCorrect || answer.correct || false,
          skillType: 'QUIZ',
        }));

        // Create new batch
        const createResult = await prisma.learningHistory.createMany({
          data: historyData,
        });

        console.log(`🗑️ Deleted ${deleteResult.count} old records, 💾 saved ${createResult.count} new records for topic ${actualTopicId}`);
      } catch (err) {
        console.error('⚠️ Failed to save quiz history:', err);
        // Don't fail the request if history save fails
      }
    }

    // Save progress if actualTopicId provided
    if (actualTopicId) {
      const existing = await prisma.userProgress.findFirst({
        where: { userId, topicId: actualTopicId, skillType: 'QUIZ' },
      });

      if (existing) {
        await prisma.userProgress.update({
          where: { id: existing.id },
          data: {
            completed: true,
            score: percentage,
            attempts: { increment: 1 },
          },
        });
        console.log('✅ Progress updated for topic', actualTopicId);
      } else {
        await prisma.userProgress.create({
          data: {
            userId,
            topicId: actualTopicId,
            skillType: 'QUIZ',
            completed: true,
            score: percentage,
            attempts: 1,
          },
        });
        console.log('✅ Progress created for topic', actualTopicId);
      }
    }

    // Check and award achievements after quiz+XP update
    const newAchievements = await checkAndAwardAchievements(userId);

    res.json({
      success: true,
      xpGained,
      correctCount,
      totalCount,
      percentage,
      message: `${correctCount}/${totalCount} correct. +${xpGained} XP`,
      newAchievements,
    });
  } catch (error) {
    console.error('❌ Quiz submit error:', error);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
})

// ========================
// GET QUESTIONS BY TOPIC (for learning map)
// ========================
router.get('/by-topic/:topicId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { topicId } = req.params;

    if (!topicId) {
      return res.status(400).json({ error: 'topicId is required' });
    }

    const parsedTopicId = parseInt(topicId);

    // Validate topic exists
    const topic = await prisma.topic.findUnique({
      where: { id: parsedTopicId },
    });

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Get user level
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get vocabulary for this topic and user's level
    const vocabulary = await prisma.vocabulary.findMany({
      where: {
        topicId: parsedTopicId,
        level: user.level,
        isActive: true,
      },
    });

    res.json({
      data: vocabulary,
      count: vocabulary.length,
      topic: topic.name,
    });
  } catch (error) {
    console.error('❌ Get questions by topic error:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// ========================
// GET USER PROGRESS FOR QUIZ TOPIC
// ========================
router.get('/user-progress/:topicId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { topicId } = req.params;

    if (!topicId) {
      return res.status(400).json({ error: 'topicId is required' });
    }

    const parsedTopicId = parseInt(topicId);

    // Get total questions for this topic (so we can calculate completed count)
    const totalQuestions = await prisma.vocabulary.count({
      where: { topicId: parsedTopicId, isActive: true },
    });

    // Get user's progress for this topic
    const progress = await prisma.userProgress.findFirst({
      where: {
        userId: req.user.id,
        topicId: parsedTopicId,
        skillType: 'QUIZ',
      },
    });

    if (!progress) {
      // Return default progress (not completed)
      return res.json({
        data: {
          completed: 0,
          total: totalQuestions,
          completedQuestions: 0,
          totalQuestions: totalQuestions,
          score: 0,
          attempts: 0,
          message: 'Not started',
        },
      });
    }

    // Calculate completed count from score percentage
    const completedCount = Math.round((progress.score! / 100) * 10);

    res.json({
      data: {
        completed: completedCount,
        total: totalQuestions,
        completedQuestions: completedCount,
        totalQuestions: totalQuestions,
        score: progress.score || 0,
        attempts: progress.attempts || 0,
        message: progress.completed ? `${progress.score}% - ${progress.attempts} attempt(s)` : 'Not completed',
      },
    });
  } catch (error) {
    console.error('❌ Get user progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// ========================
// SAVE LEARNING HISTORY (For quiz/writing/pronunciation)
// ========================
// Uses REPLACE semantics: Delete old records first, then create new ones
// This ensures only the latest batch per (userId, topicId, skillType) is stored
router.post('/save-learning-history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { questions, topicId, slug, skillType = 'QUIZ' } = req.body;

    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Invalid questions format' });
    }

    if (!topicId && !slug) {
      return res.status(400).json({ error: 'topicId or slug is required' });
    }

    const userId = req.user.id;
    
    // Normalize skillType to uppercase
    const normalizedSkillType = (skillType || 'QUIZ').toUpperCase();
    
    // If slug is provided, resolve it to topicId
    let actualTopicId = topicId;
    if (!topicId && slug) {
      const topic = await prisma.topic.findUnique({
        where: { slug }
      });
      if (!topic) {
        console.error('❌ Topic not found for slug:', slug);
        return res.status(404).json({ error: 'Topic not found' });
      }
      actualTopicId = topic.id;
      console.log('✅ Resolved slug to topicId:', { slug, topicId: actualTopicId });
    }

    // Delete old records for this user+topic+skillType combination
    // This implements REPLACE semantics instead of APPEND
    const deleteResult = await prisma.learningHistory.deleteMany({
      where: {
        userId,
        topicId: actualTopicId,
        skillType: normalizedSkillType,
      },
    });

    console.log(`🗑️ Deleted ${deleteResult.count} old records for topic ${actualTopicId}, skillType: ${normalizedSkillType}`);

    // Now save the new batch of learning history
    // Build data array based on skillType to store only relevant fields
    const historyData = questions.map((question: any) => {
      const baseData = {
        userId,
        topicId: actualTopicId,
        skillType: normalizedSkillType,
      };

      if (normalizedSkillType === 'QUIZ') {
        // For quiz: store full question details + correct/selected answers
        return {
          ...baseData,
          questionText: question.questionText || question.question || '',
          correctAnswer: question.correctAnswer || question.answer || '',
          selectedAnswer: question.selectedAnswer || question.userAnswer || '',
          isCorrect: question.isCorrect || question.correct || false,
        };
      } else if (normalizedSkillType === 'WRITING' || normalizedSkillType === 'PRONUNCIATION') {
        // For writing/pronunciation: store vocabulary + accuracy + isCorrect (>= 50 passing threshold)
        return {
          ...baseData,
          korean: question.korean || '',
          vietnamese: question.vietnamese || question.meaning || '',
          accuracy: question.accuracy || question.score || null,
          isCorrect: (question.accuracy || question.score || 0) >= 50,
        };
      } else {
        return baseData;
      }
    });

    // Batch create new records
    const createResult = await prisma.learningHistory.createMany({
      data: historyData,
    });

    console.log(`💾 Learning history saved: ${createResult.count} items for topic ${actualTopicId}, skill type: ${normalizedSkillType}`);

    // Upsert UserProgress for WRITING / PRONUNCIATION so the card shows as done
    if (actualTopicId && (normalizedSkillType === 'WRITING' || normalizedSkillType === 'PRONUNCIATION')) {
      const correctItems = historyData.filter((h: any) => h.accuracy >= 80).length;
      const totalItems = historyData.length;
      const percentage = totalItems > 0 ? Math.round((correctItems / totalItems) * 100) : 0;

      const existingProgress = await prisma.userProgress.findFirst({
        where: { userId, topicId: actualTopicId, skillType: normalizedSkillType },
      });

      if (existingProgress) {
        await prisma.userProgress.update({
          where: { id: existingProgress.id },
          data: { completed: true, score: percentage, attempts: { increment: 1 } },
        });
      } else {
        await prisma.userProgress.create({
          data: { userId, topicId: actualTopicId, skillType: normalizedSkillType, completed: true, score: percentage, attempts: 1 },
        });
      }
      console.log(`✅ UserProgress upserted for ${normalizedSkillType}, topic ${actualTopicId}`);
    }

    res.json({
      success: true,
      savedCount: createResult.count,
      message: `${createResult.count} items saved to learning history`,
    });
  } catch (error) {
    console.error('❌ Save learning history error:', error);
    res.status(500).json({ error: 'Failed to save learning history' });
  }
});

export default router;
