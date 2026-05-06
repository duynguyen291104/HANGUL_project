import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import prisma from '../../lib/prisma';

const router = Router();

// ========================
// LEVEL REQUIREMENTS  (updated to match spec)
// ========================
const LEVEL_REQUIREMENTS: Record<string, { xp: [number, number]; trophy: [number, number] }> = {
  'NEWBIE':        { xp: [0,    999],  trophy: [0,    499]  },
  'BEGINNER':      { xp: [1000, 1999], trophy: [500,  999]  },
  'INTERMEDIATE':  { xp: [2000, 2999], trophy: [1000, 1999] },
  'UPPER':         { xp: [3000, 3999], trophy: [2000, 3999] },
  'ADVANCED':      { xp: [4000, Infinity], trophy: [4000, Infinity] },
};

// Legacy Vietnamese names → English
const VI_TO_EN: Record<string, string> = {
  'CỰC_CƠ_BẢN': 'NEWBIE', 'CƠ_BẢN': 'BEGINNER',
  'TRUNG_CẤP': 'INTERMEDIATE', 'NÂNG_CAO': 'UPPER', 'LÃO_LUYỆN': 'ADVANCED',
};

const LEVEL_ORDER = ['NEWBIE', 'BEGINNER', 'INTERMEDIATE', 'UPPER', 'ADVANCED'];

function normalizeLevel(l: string) { return VI_TO_EN[l] ?? l; }

/** Check if user's XP+Trophy satisfy requirements for a given level */
function meetsRequirements(xp: number, trophy: number, level: string): boolean {
  const l = normalizeLevel(level);
  const req = LEVEL_REQUIREMENTS[l];
  if (!req) return false;
  return xp >= req.xp[0] && trophy >= req.trophy[0];
}

// ========================
// 1. SET LEVEL
// ========================
router.post('/set-level', authenticate, async (req, res) => {
  try {
    const { level, force } = req.body;
    const userId = (req as any).user!.id;
    const normalizedLevel = normalizeLevel(level);

    if (!LEVEL_REQUIREMENTS[normalizedLevel]) {
      return res.status(400).json({ error: 'Invalid level' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // force=true means going back to an already-passed level: require 4000 trophy
    if (force && user.totalTrophy < 4000) {
      return res.status(400).json({
        error: 'Cần ít nhất 4000 Trophy để quay lại cấp cũ',
        current: { trophy: user.totalTrophy },
        required: { trophy: 4000 },
      });
    }

    // Normal level-up: check XP + trophy requirements
    if (!force && !meetsRequirements(user.totalXP, user.totalTrophy, normalizedLevel)) {
      return res.status(400).json({
        error: 'Insufficient XP or Trophy',
        current: { xp: user.totalXP, trophy: user.totalTrophy },
        required: LEVEL_REQUIREMENTS[normalizedLevel],
      });
    }

    // force=true (review: going back to old level) → deduct 4000 trophy
    // normal (going up to new level) → reset trophy to 0
    const newTrophy = force
      ? Math.max(0, user.totalTrophy - 4000)
      : 0;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { level: normalizedLevel, levelLocked: true, levelUnlockedAt: new Date(), totalTrophy: newTrophy },
    });

    res.json({
      success: true,
      level: updatedUser.level,
      xp: updatedUser.totalXP,
      trophy: updatedUser.totalTrophy,
      message: `Cấp độ đã được nâng lên: ${normalizedLevel}`,
    });
  } catch (error) {
    console.error('❌ Error setting level:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// 2. GET LEVEL STATUS
// ========================
router.get('/level-status', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentLevelIndex = LEVEL_ORDER.indexOf(user.level);
    const nextLevel = currentLevelIndex < LEVEL_ORDER.length - 1 
      ? LEVEL_ORDER[currentLevelIndex + 1] 
      : null;

    const nextRequirements = nextLevel ? LEVEL_REQUIREMENTS[nextLevel] : null;

    const canUnlockTest = nextRequirements
      ? user.totalXP >= nextRequirements.xp[0] && user.totalTrophy >= nextRequirements.trophy[0]
      : false;

    res.json({
      currentLevel: user.level,
      xp: user.totalXP,
      trophy: user.totalTrophy,
      nextLevel: nextLevel || null,
      requirements: nextRequirements || null,
      canUnlockTest,
      progressToNext: nextRequirements
        ? {
            xp: Math.min(user.totalXP, nextRequirements.xp[0]),
            xpNeeded: Math.max(0, nextRequirements.xp[0] - user.totalXP),
            trophy: Math.min(user.totalTrophy, nextRequirements.trophy[0]),
            trophyNeeded: Math.max(0, nextRequirements.trophy[0] - user.totalTrophy),
          }
        : null,
    });
  } catch (error) {
    console.error('❌ Error getting level status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// 3. GET LEARNING PATH
// ========================
router.get('/learning-path', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user!.id;
    console.log('📍 GET /learning-path userId:', userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ User found:', { id: user.id, level: user.level, totalXP: user.totalXP });

    // Get all topics for current level
    const topics = await prisma.topic.findMany({
      where: { level: user.level },
      orderBy: { order: 'asc' },
      include: {
        userProgress: {
          where: { userId },
        },
      },
    });

    console.log('📚 Topics found:', topics.length, 'for level:', user.level);

    // Calculate correct count for QUIZ (from LearningHistory with skillType='quiz' OR 'QUIZ')
    const quizHistoryItems = await prisma.learningHistory.findMany({
      where: { 
        userId,
        skillType: { in: ['quiz', 'QUIZ'] },
      },
      select: { topicId: true, isCorrect: true },
    });
    
    console.log(`🔍 QUIZ DEBUG: Found ${quizHistoryItems.length} quiz history items for user ${userId}`);
    if (quizHistoryItems.length > 0) {
      console.log('   Sample:', quizHistoryItems.slice(0, 3));
    }

    const quizCorrectMap = new Map<number, number>();
    const quizTotalMap = new Map<number, number>();

    for (const item of quizHistoryItems) {
      if (!quizTotalMap.has(item.topicId)) {
        quizTotalMap.set(item.topicId, 0);
      }
      quizTotalMap.set(item.topicId, quizTotalMap.get(item.topicId)! + 1);

      if (item.isCorrect) {
        if (!quizCorrectMap.has(item.topicId)) {
          quizCorrectMap.set(item.topicId, 0);
        }
        quizCorrectMap.set(item.topicId, quizCorrectMap.get(item.topicId)! + 1);
      }
    }

    // Calculate correct count for WRITING (from LearningHistory with skillType='writing' or 'WRITING')
    const writingHistoryItems = await prisma.learningHistory.findMany({
      where: { 
        userId,
        skillType: { in: ['writing', 'WRITING'] },
      },
      select: { topicId: true, accuracy: true, isCorrect: true },
    });

    const writingCorrectMap = new Map<number, number>();
    const writingTotalMap = new Map<number, number>();

    for (const item of writingHistoryItems) {
      const correct = item.isCorrect === true || (item.accuracy != null && item.accuracy >= 50);

      if (!writingTotalMap.has(item.topicId)) {
        writingTotalMap.set(item.topicId, 0);
      }
      writingTotalMap.set(item.topicId, writingTotalMap.get(item.topicId)! + 1);

      if (correct) {
        if (!writingCorrectMap.has(item.topicId)) {
          writingCorrectMap.set(item.topicId, 0);
        }
        writingCorrectMap.set(item.topicId, writingCorrectMap.get(item.topicId)! + 1);
      }
    }

    // Calculate correct count for PRONUNCIATION (from LearningHistory with skillType='PRONUNCIATION')
    const pronunciationHistoryItems = await prisma.learningHistory.findMany({
      where: { 
        userId,
        skillType: { in: ['pronunciation', 'PRONUNCIATION'] },
      },
      select: { topicId: true, accuracy: true, isCorrect: true },
    });

    const pronunciationCorrectMap = new Map<number, number>();
    const pronunciationTotalMap = new Map<number, number>();

    for (const item of pronunciationHistoryItems) {
      const correct = item.isCorrect === true || (item.accuracy != null && item.accuracy >= 50);

      if (!pronunciationTotalMap.has(item.topicId)) {
        pronunciationTotalMap.set(item.topicId, 0);
      }
      pronunciationTotalMap.set(item.topicId, pronunciationTotalMap.get(item.topicId)! + 1);

      if (correct) {
        if (!pronunciationCorrectMap.has(item.topicId)) {
          pronunciationCorrectMap.set(item.topicId, 0);
        }
        pronunciationCorrectMap.set(item.topicId, pronunciationCorrectMap.get(item.topicId)! + 1);
      }
    }

    // Build response with correct counts
    const topicsWithProgress = topics.map((topic) => {
      const quizCorrect = quizCorrectMap.get(topic.id) || 0;
      const quizTotalRaw = quizTotalMap.get(topic.id) || 0;
      const quizTotal = Math.min(quizTotalRaw, 10); // cap at 10 questions per session
      const quizCorrectCapped = Math.min(quizCorrect, quizTotal);
      // Use UserProgress.completed for done status (user finished the quiz regardless of score)
      const quizProgress = topic.userProgress.find((p: any) => p.skillType === 'QUIZ');
      const quizDone = quizProgress?.completed === true;

      const writingCorrectRaw = writingCorrectMap.get(topic.id) || 0;
      const writingTotalRaw = writingTotalMap.get(topic.id) || 0;
      const writingTotal = Math.min(writingTotalRaw, 10);
      const writingCorrect = Math.min(writingCorrectRaw, writingTotal);
      const writingProgress = topic.userProgress.find((p: any) => p.skillType === 'WRITING');
      const writingDone = writingProgress?.completed === true;

      const pronunciationCorrectRaw = pronunciationCorrectMap.get(topic.id) || 0;
      const pronunciationTotalRaw = pronunciationTotalMap.get(topic.id) || 0;
      const pronunciationTotal = Math.min(pronunciationTotalRaw, 10);
      const pronunciationCorrect = Math.min(pronunciationCorrectRaw, pronunciationTotal);
      const pronunciationProgress = topic.userProgress.find((p: any) => p.skillType === 'PRONUNCIATION');
      const pronunciationDone = pronunciationProgress?.completed === true;

      return {
        id: topic.id,
        name: topic.name,
        description: topic.description,
        order: topic.order,
        quiz: {
          done: quizDone,
          correct: quizCorrectCapped,
          total: quizTotal,
          progress: `${quizCorrectCapped}/${quizTotal}`,
        },
        writing: {
          done: writingDone,
          correct: writingCorrect,
          total: writingTotal,
          progress: `${writingCorrect}/${writingTotal}`,
        },
        pronunciation: {
          done: pronunciationDone,
          correct: pronunciationCorrect,
          total: pronunciationTotal,
          progress: `${pronunciationCorrect}/${pronunciationTotal}`,
        },
      };
    });

    // Calculate stats:
    // - completedSkills = skills with any activity (total > 0), used for progress bar
    // - fullyDoneSkills = skills where correct === total (100% accuracy), used for checkmarks
    const totalSkills = topicsWithProgress.length * 3;
    const completedSkills = topicsWithProgress.reduce(
      (sum, topic) =>
        sum +
        (topic.quiz.total > 0 ? 1 : 0) +
        (topic.writing.total > 0 ? 1 : 0) +
        (topic.pronunciation.total > 0 ? 1 : 0),
      0
    );

    res.json({
      level: user.level,
      totalTopics: topicsWithProgress.length,
      completedSkills,
      totalSkills,
      progressPercentage: totalSkills > 0 ? Math.round((completedSkills / totalSkills) * 100) : 0,
      topics: topicsWithProgress,
      xp: user.totalXP,
      trophy: user.totalTrophy,
      stats: {
        message: '✅ Progress tính chỉ Đúng, không tính Sai',
      }
    });
  } catch (error) {
    console.error('❌ Error getting learning path:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// 4. GET TOPIC PROGRESS
// ========================
router.get('/topic-progress/:topicId', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user!.id;
    const { topicId } = req.params;

    const topic = await prisma.topic.findUnique({
      where: { id: parseInt(topicId) },
    });

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    const progress = await prisma.userProgress.findMany({
      where: {
        userId,
        topicId: parseInt(topicId),
      },
    });

    const progressMap = new Map(progress.map((p) => [p.skillType, p]));

    res.json({
      topic: {
        id: topic.id,
        name: topic.name,
        description: topic.description,
        level: topic.level,
      },
      progress: {
        quiz: progressMap.get('QUIZ')
          ? {
              done: progressMap.get('QUIZ')!.completed,
              score: progressMap.get('QUIZ')!.score,
              fullScore: 100,
              attempts: progressMap.get('QUIZ')!.attempts,
              completedAt: progressMap.get('QUIZ')!.completedAt,
              xpGained: progressMap.get('QUIZ')!.score
                ? Math.floor(progressMap.get('QUIZ')!.score! / 10)
                : 0,
            }
          : { done: false, attempts: 0, xpGained: 0 },
        writing: progressMap.get('WRITING')
          ? {
              done: progressMap.get('WRITING')!.completed,
              score: progressMap.get('WRITING')!.score,
              fullScore: 100,
              attempts: progressMap.get('WRITING')!.attempts,
              completedAt: progressMap.get('WRITING')!.completedAt,
              xpGained: progressMap.get('WRITING')!.score
                ? Math.floor(progressMap.get('WRITING')!.score! / 12)
                : 0,
            }
          : { done: false, attempts: 0, xpGained: 0 },
        pronunciation: progressMap.get('PRONUNCIATION')
          ? {
              done: progressMap.get('PRONUNCIATION')!.completed,
              score: progressMap.get('PRONUNCIATION')!.score,
              fullScore: 100,
              attempts: progressMap.get('PRONUNCIATION')!.attempts,
              completedAt: progressMap.get('PRONUNCIATION')!.completedAt,
              xpGained: progressMap.get('PRONUNCIATION')!.score
                ? Math.floor(progressMap.get('PRONUNCIATION')!.score! / 11)
                : 0,
            }
          : { done: false, attempts: 0, xpGained: 0 },
      },
      canProceedToNext: 
        progressMap.get('QUIZ')?.completed ||
        progressMap.get('WRITING')?.completed ||
        progressMap.get('PRONUNCIATION')?.completed,
    });
  } catch (error) {
    console.error('❌ Error getting topic progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// 4. GET ANSWER HISTORY (for collapsed view)
// ========================
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user!.id;
    const { topicId, skillType } = req.query;

    if (!topicId || !skillType) {
      return res.status(400).json({ error: 'topicId and skillType are required' });
    }

    console.log('📋 Getting history for:', { userId, topicId, skillType });

    const history = await prisma.userAnswerHistory.findMany({
      where: {
        userId,
        topicId: parseInt(topicId as string),
        skillType: skillType as string,
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Latest 50 answers
    });

    console.log('✅ History found:', history.length);

    res.json(history);
  } catch (error) {
    console.error('❌ Error getting history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// ========================
// 6. GET LEARNING HISTORY (Quiz questions review)
// ========================
router.get('/learning-history', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user!.id;
    const { topicId, skillType, limit = 50 } = req.query;

    console.log('📋 Getting learning history for:', { userId, topicId, skillType, limitParam: limit });

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const where: any = { userId };
    if (topicId) {
      const parsedTopicId = parseInt(topicId as string);
      if (isNaN(parsedTopicId)) {
        return res.status(400).json({ error: 'Invalid topicId' });
      }
      where.topicId = parsedTopicId;
    }
    if (skillType) {
      // Normalize skillType to uppercase for case-insensitive matching
      where.skillType = (skillType as string).toUpperCase();
    }

    const limitNum = parseInt(limit as string) || 50;

    console.log('🔍 Query params:', { where, limitNum });

    const history = await prisma.learningHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limitNum,
      include: {
        topic: { select: { id: true, name: true, slug: true } },
      },
    });

    console.log('✅ Learning history found:', history.length);

    // Return data with fields relevant to each skillType
    res.json({
      success: true,
      count: history.length,
      data: history.map((item) => {
        // Common fields for all skill types
        const baseData = {
          id: item.id,
          skillType: item.skillType,
          createdAt: item.createdAt,
          topicId: item.topicId,
          topicName: item.topic?.name,
        };

        // Add skill-specific fields (normalize to uppercase for comparison)
        const normalizedSkillType = item.skillType?.toUpperCase() || 'QUIZ';
        if (normalizedSkillType === 'QUIZ') {
          return {
            ...baseData,
            questionText: item.questionText,
            correctAnswer: item.correctAnswer,
            selectedAnswer: item.selectedAnswer || null,
            isCorrect: item.isCorrect || null,
          };
        } else if (normalizedSkillType === 'WRITING' || normalizedSkillType === 'PRONUNCIATION') {
          return {
            ...baseData,
            korean: item.korean,
            vietnamese: item.vietnamese,
            accuracy: item.accuracy,
          };
        } else {
          return baseData;
        }
      }),
    });
  } catch (error) {
    console.error('❌ Error getting learning history:', error);
    
    // Return detailed error in development
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Failed to fetch learning history',
      details: errorMessage,
    });
  }
});

// ========================
// 7. SAVE VOCABULARY FROM HISTORY (Only correct answer)
// ========================
router.post('/save-vocab-from-history', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user!.id;
    const { word, meaning, type } = req.body;

    if (!word || !meaning || !type) {
      return res.status(400).json({ error: 'Missing required fields: word, meaning, type' });
    }

    const normalizedType = type.toLowerCase(); // "quiz" | "writing" | "pronunciation"

    console.log('💾 Saving vocab from history:', { userId, word, meaning, type: normalizedType });

    // Save to SavedVocabulary — source mirrors type for learning-path saves
    const saved = await prisma.savedVocabulary.upsert({
      where: {
        userId_koreanWord_type: {
          userId,
          koreanWord: word,
          type: normalizedType,
        },
      },
      update: {},
      create: {
        userId,
        koreanWord: word,
        meaning,
        source: normalizedType, // required field
        type: normalizedType,
      },
    });

    console.log('✅ Vocabulary saved:', { id: saved.id, korean: saved.koreanWord, type: saved.type });

    res.json({
      success: true,
      message: 'Lưu từ vựng thành công',
      saved: true,
      vocabulary: {
        id: saved.id,
        korean: saved.koreanWord,
        meaning: saved.meaning,
        type: saved.type,
      },
    });
  } catch (error) {
    console.error('❌ Error saving vocabulary from history:', error);
    res.status(500).json({ error: 'Failed to save vocabulary' });
  }
});

// ========================
// 8. GET SAVED VOCABULARY COLLECTION
// ========================
router.get('/saved-vocabulary', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user!.id;
    const { source, limit = 100 } = req.query;

    console.log('📚 Getting saved vocabulary for:', { userId, source });

    const where: any = { userId };
    if (source) {
      where.source = source as string;
    }

    const savedVocabList = await prisma.userSavedVocabulary.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      include: {
        vocabulary: {
          select: {
            id: true,
            korean: true,
            english: true,
            vietnamese: true,
            romanization: true,
            type: true,
            audioUrl: true,
            imageUrl: true,
            level: true,
            topic: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    console.log('✅ Saved vocabulary found:', savedVocabList.length);

    res.json({
      success: true,
      count: savedVocabList.length,
      data: savedVocabList.map((item) => ({
        id: item.id,
        savedAt: item.createdAt,
        source: item.source,
        sourceId: item.sourceId,
        isLearned: item.isLearned,
        attempts: item.attempts,
        score: item.score,
        notes: item.notes,
        vocabulary: item.vocabulary,
      })),
    });
  } catch (error) {
    console.error('❌ Error getting saved vocabulary:', error);
    res.status(500).json({ error: 'Failed to fetch saved vocabulary' });
  }
});

// ========================
// 9. DELETE SAVED VOCABULARY
// ========================
router.delete('/saved-vocabulary/:id', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user!.id;
    const { id } = req.params;

    console.log('🗑️ Deleting saved vocabulary:', { userId, id });

    // Get the saved vocabulary to verify ownership
    const saved = await prisma.userSavedVocabulary.findUnique({
      where: { id: parseInt(id) },
    });

    if (!saved) {
      return res.status(404).json({ error: 'Saved vocabulary not found' });
    }

    // Verify ownership
    if (saved.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete it
    await prisma.userSavedVocabulary.delete({
      where: { id: parseInt(id) },
    });

    console.log('✅ Saved vocabulary deleted');

    res.json({
      success: true,
      message: 'Đã xóa từ vựng khỏi bộ sưu tập',
    });
  } catch (error) {
    console.error('❌ Error deleting saved vocabulary:', error);
    res.status(500).json({ error: 'Failed to delete saved vocabulary' });
  }
});

// ========================
// SAVE VOCABULARY WITH TYPE (for vocabulary-collection filtering)
// ========================
router.post('/save-word-to-collection', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user!.id;
    const { koreanWord, meaning, type } = req.body;

    if (!koreanWord || !meaning || !type) {
      return res.status(400).json({ error: 'koreanWord, meaning, and type are required' });
    }

    console.log('💾 Saving word to collection:', { userId, koreanWord, type });

    const saved = await prisma.savedVocabulary.upsert({
      where: {
        userId_koreanWord_type: {
          userId,
          koreanWord,
          type,
        },
      },
      update: {
        updatedAt: new Date(),
      },
      create: {
        userId,
        koreanWord,
        meaning,
        type,
        source: type,
      },
    });

    console.log('✅ Word saved:', saved.id);

    res.json({
      success: true,
      data: saved,
      message: `Đã lưu từ "${koreanWord}" vào bộ sưu tập`,
    });
  } catch (error: any) {
    console.error('❌ Error saving word:', error);
    res.status(500).json({ error: 'Failed to save word' });
  }
});

// ========================
// GET VOCABULARY COLLECTION (with type filtering)
// ========================
router.get('/vocabulary-collection', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user!.id;
    const { type } = req.query;

    console.log('📚 Getting vocabulary collection:', { userId, type });

    const where: any = { userId };

    // Filter by type if specified
    if (type && type !== 'all') {
      where.type = type;
    }

    const data = await prisma.savedVocabulary.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        koreanWord: true,
        meaning: true,
        source: true,
        type: true,
        createdAt: true,
      },
    });

    console.log(`✅ Found ${data.length} words`);

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error: any) {
    console.error('❌ Error fetching vocabulary collection:', error);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

// ========================
// DELETE FROM VOCABULARY COLLECTION
// DELETE /vocabulary-collection/:id
// ========================
router.delete('/vocabulary-collection/:id', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user!.id;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const saved = await prisma.savedVocabulary.findUnique({ where: { id } });

    if (!saved) {
      return res.status(404).json({ error: 'Vocabulary not found' });
    }

    if (saved.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.savedVocabulary.delete({ where: { id } });

    console.log('✅ Deleted savedVocabulary id:', id);

    res.json({ success: true, message: 'Đã xóa từ vựng khỏi bộ sưu tập' });
  } catch (error) {
    console.error('❌ Error deleting vocabulary:', error);
    res.status(500).json({ error: 'Failed to delete vocabulary' });
  }
});

// ========================
// LEVEL SKIP – CHECK ELIGIBILITY
// GET /level-test/eligibility?targetLevel=BEGINNER
// ========================
router.get('/level-test/eligibility', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user!.id;
    const targetLevel = normalizeLevel((req.query.targetLevel as string) ?? '');

    if (!LEVEL_REQUIREMENTS[targetLevel]) {
      return res.status(400).json({ error: 'Invalid targetLevel' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const currentLevel = normalizeLevel(user.level);
    const currentIdx = LEVEL_ORDER.indexOf(currentLevel);
    const targetIdx  = LEVEL_ORDER.indexOf(targetLevel);

    // Must be jumping forward at least one level
    if (targetIdx <= currentIdx) {
      return res.json({
        eligible: false,
        reason: 'Bạn đã ở cấp này hoặc cao hơn.',
        alreadyPassed: true,
        currentLevel,
        targetLevel,
      });
    }

    // Check if previously passed this target level
    const previous = await prisma.levelTestProgress.findUnique({
      where: { userId_targetLevel: { userId, targetLevel } },
    });

    if (previous?.testPassed) {
      return res.json({
        eligible: true,
        reason: 'Bạn đã từng vượt cấp này trước đây.',
        alreadyPassed: true,
        currentLevel,
        targetLevel,
        xp: user.totalXP,
        trophy: user.totalTrophy,
      });
    }

    // Check XP + Trophy meet minimum requirement for target level
    const eligible = meetsRequirements(user.totalXP, user.totalTrophy, targetLevel);
    const req_ = LEVEL_REQUIREMENTS[targetLevel];

    return res.json({
      eligible,
      alreadyPassed: false,
      currentLevel,
      targetLevel,
      xp: user.totalXP,
      trophy: user.totalTrophy,
      required: { xp: req_.xp[0], trophy: req_.trophy[0] },
      reason: eligible
        ? 'Đủ điều kiện thi vượt cấp.'
        : `Cần ít nhất ${req_.xp[0]} XP và ${req_.trophy[0]} Trophy.`,
    });
  } catch (error) {
    console.error('❌ Error checking level eligibility:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// LEVEL SKIP – GET TEST QUESTIONS
// GET /level-test/questions?targetLevel=BEGINNER
// ========================
router.get('/level-test/questions', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user!.id;
    const targetLevel = normalizeLevel((req.query.targetLevel as string) ?? '');

    if (!LEVEL_REQUIREMENTS[targetLevel]) {
      return res.status(400).json({ error: 'Invalid targetLevel' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const currentLevel = normalizeLevel(user.level);

    // Helpers
    const shuffle = <T>(arr: T[]): T[] => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };
    const pick = <T>(arr: T[], n: number): T[] => shuffle([...arr]).slice(0, n);

    // Fetch vocab pools
    const [currentPool, targetPool] = await Promise.all([
      prisma.vocabulary.findMany({
        where: { level: currentLevel, isActive: true },
        select: { id: true, korean: true, vietnamese: true, english: true, romanization: true },
      }),
      prisma.vocabulary.findMany({
        where: { level: targetLevel, isActive: true },
        select: { id: true, korean: true, vietnamese: true, english: true, romanization: true },
      }),
    ]);

    if (currentPool.length < 7) {
      return res.status(400).json({ error: `Không đủ từ vựng ở cấp ${currentLevel} để tạo đề thi.` });
    }
    if (targetPool.length < 3) {
      return res.status(400).json({ error: `Không đủ từ vựng ở cấp ${targetLevel} để tạo đề thi.` });
    }

    // All-vocab pool for distractor options
    const allVocab = await prisma.vocabulary.findMany({
      where: { isActive: true },
      select: { id: true, korean: true, vietnamese: true },
    });

    /** 4 Vietnamese options (correct + 3 wrong) */
    const makeVietnameseOptions = (correctVietnamese: string): string[] => {
      const wrongs = allVocab
        .filter(v => v.vietnamese !== correctVietnamese)
        .map(v => v.vietnamese);
      return shuffle([correctVietnamese, ...pick(wrongs, 3)]);
    };

    /** 4 Korean options (correct + 3 wrong) for arrangement questions */
    const makeKoreanOptions = (correctKorean: string): string[] => {
      const wrongs = allVocab
        .filter(v => v.korean !== correctKorean)
        .map(v => v.korean);
      return shuffle([correctKorean, ...pick(wrongs, 3)]);
    };

    if (currentPool.length < 8) {
      return res.status(400).json({ error: `Không đủ từ vựng ở cấp ${currentLevel} để tạo đề thi (cần ít nhất 8 từ).` });
    }

    // Build 8 current-level questions: 3 arrangement + 3 writing + 2 pronunciation
    const currentPicked = pick(currentPool, 8);
    const arrangItems  = currentPicked.slice(0, 3);
    const writingItems = currentPicked.slice(3, 6);
    const pronItems    = currentPicked.slice(6, 8);

    const currentQuestions = [
      // 3 arrangement: show Vietnamese prompt → select correct Korean chip
      ...arrangItems.map(v => ({
        id: v.id,
        type: 'arrangement' as const,
        korean: v.korean,
        vietnamese: v.vietnamese,
        english: v.english,
        romanization: v.romanization,
        options: makeKoreanOptions(v.korean),  // Korean word chips
        level: currentLevel,
        isTargetLevel: false,
      })),
      // 3 writing: show Korean → type Vietnamese meaning
      ...writingItems.map(v => ({
        id: v.id,
        type: 'writing' as const,
        korean: v.korean,
        vietnamese: v.vietnamese,
        english: v.english,
        romanization: v.romanization,
        level: currentLevel,
        isTargetLevel: false,
      })),
      // 2 pronunciation: show Korean → user speaks
      ...pronItems.map(v => ({
        id: v.id,
        type: 'pronunciation' as const,
        korean: v.korean,
        vietnamese: v.vietnamese,
        english: v.english,
        romanization: v.romanization,
        level: currentLevel,
        isTargetLevel: false,
      })),
    ];

    // Build 3 target-level questions (quiz: Korean → select Vietnamese)
    const targetPicked = pick(targetPool, 3);
    const targetQuestions = targetPicked.map(v => ({
      id: v.id,
      type: 'quiz' as const,
      korean: v.korean,
      vietnamese: v.vietnamese,
      english: v.english,
      romanization: v.romanization,
      options: makeVietnameseOptions(v.vietnamese),
      level: targetLevel,
      isTargetLevel: true,
    }));

    // Total = 11 questions; shuffle to mix types
    const questions = shuffle([...currentQuestions, ...targetQuestions]);
    res.json({ success: true, total: questions.length, questions });
  } catch (error) {
    console.error('❌ Error generating level test questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// LEVEL SKIP – SUBMIT TEST
// POST /level-test/submit
// Body: { targetLevel, answers: [{ questionId, userAnswer, questionType, correctAnswer }] }
// ========================
router.post('/level-test/submit', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user!.id;
    const { targetLevel: rawTarget, answers } = req.body as {
      targetLevel: string;
      answers: { questionId: number; userAnswer: string; questionType: string; correctAnswer: string }[];
    };

    const targetLevel = normalizeLevel(rawTarget ?? '');
    if (!LEVEL_REQUIREMENTS[targetLevel]) {
      return res.status(400).json({ error: 'Invalid targetLevel' });
    }
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'answers array is required' });
    }

    // Score answers
    const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '');
    let correct = 0;
    const results = answers.map(a => {
      const isCorrect = normalize(a.userAnswer) === normalize(a.correctAnswer);
      if (isCorrect) correct++;
      return { questionId: a.questionId, isCorrect, userAnswer: a.userAnswer, correctAnswer: a.correctAnswer };
    });

    const total = answers.length;
    const passed = correct >= 7;

    // Upsert LevelTestProgress
    const existing = await prisma.levelTestProgress.findUnique({
      where: { userId_targetLevel: { userId, targetLevel } },
    });

    await prisma.levelTestProgress.upsert({
      where: { userId_targetLevel: { userId, targetLevel } },
      create: {
        userId,
        targetLevel,
        requiredXP: LEVEL_REQUIREMENTS[targetLevel].xp[0],
        requiredTrophy: LEVEL_REQUIREMENTS[targetLevel].trophy[0],
        isTestUnlocked: true,
        testStartedAt: new Date(),
        testPassed: passed,
        passedAt: passed ? new Date() : null,
        score: correct,
        attempts: 1,
      },
      update: {
        testPassed: passed || (existing?.testPassed ?? false),
        passedAt: passed ? new Date() : (existing?.passedAt ?? null),
        score: correct,
        attempts: { increment: 1 },
      },
    });

    // Advance user level on pass — reset trophy to 0
    let newLevel: string | null = null;
    if (passed) {
      await prisma.user.update({
        where: { id: userId },
        data: { level: targetLevel, levelLocked: true, levelUnlockedAt: new Date(), totalTrophy: 0 },
      });
      newLevel = targetLevel;
    }

    return res.json({
      passed,
      score: correct,
      total,
      results,
      newLevel,
      message: passed
        ? `🎉 Chúc mừng! Bạn đã vượt cấp lên ${targetLevel} (${correct}/${total})`
        : `❌ Chưa đạt. Bạn cần ít nhất 7/${total} câu đúng. (${correct}/${total})`,
    });
  } catch (error) {
    console.error('❌ Error submitting level test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
