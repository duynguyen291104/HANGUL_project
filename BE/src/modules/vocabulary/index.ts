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
// GET VOCABULARY BY USER LEVEL (for tournaments/games)
// ========================
router.get('/by-level/tournament', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's level
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { limit = 10 } = req.query;

    // Get vocabulary for user's level
    const vocabulary = await prisma.vocabulary.findMany({
      where: {
        level: user.level,
        isActive: true,
      },
      take: parseInt(limit as string),
      orderBy: { id: 'desc' },
      include: {
        topic: true,
      },
    });

    res.json({
      userLevel: user.level,
      count: vocabulary.length,
      data: vocabulary,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vocabulary by level' });
  }
});

// ========================
// GET ALL VOCABULARY
// ========================
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { level, topic, limit = 50 } = req.query;

    const where: any = { isActive: true };
    if (level) where.level = level;
    if (topic) where.topicId = parseInt(topic as string);

    const vocabulary = await prisma.vocabulary.findMany({
      where,
      take: parseInt(limit as string),
      include: {
        topic: true,
      },
    });

    res.json(vocabulary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vocabulary' });
  }
});

// ========================
// GET RANDOM VOCABULARY (for tournament games)
// Must be defined BEFORE /:id to avoid route conflict
// ========================
router.get('/random', async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    const take = Math.min(parseInt(limit as string) || 20, 100);

    // Build level filter based on authenticated user's level
    const where: any = { isActive: true };

    if (req.user) {
      const user = await prisma.vocabulary.findFirst()
        .then(() => prisma.user.findUnique({
          where: { id: req.user!.id },
          select: { level: true },
        }));

      if (user) {
        const levelMap: Record<string, string[]> = {
          NEWBIE:       ['NEWBIE'],
          BEGINNER:     ['NEWBIE', 'BEGINNER'],
          INTERMEDIATE: ['NEWBIE', 'BEGINNER', 'INTERMEDIATE'],
          UPPER:        ['NEWBIE', 'BEGINNER', 'INTERMEDIATE', 'UPPER'],
          ADVANCED:     ['NEWBIE', 'BEGINNER', 'INTERMEDIATE', 'UPPER', 'ADVANCED'],
        };
        where.level = { in: levelMap[user.level] || [user.level] };
      }
    }

    // Count total for random offset
    const total = await prisma.vocabulary.count({ where });

    if (total === 0) {
      return res.json([]);
    }

    // Random skip within available range
    const skip = total > take ? Math.floor(Math.random() * (total - take)) : 0;

    const vocabulary = await prisma.vocabulary.findMany({
      where,
      skip,
      take,
      select: {
        id: true,
        korean: true,
        english: true,
        vietnamese: true,
        romanization: true,
        level: true,
      },
    });

    // Shuffle result for extra randomness
    const shuffled = vocabulary.sort(() => Math.random() - 0.5);

    res.json(shuffled);
  } catch (error) {
    console.error('❌ Random vocabulary error:', error);
    res.status(500).json({ error: 'Failed to fetch random vocabulary' });
  }
});

// ========================
// GET VOCABULARY BY ID
// ========================
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const vocabulary = await prisma.vocabulary.findUnique({
      where: { id: parseInt(id) },
      include: {
        topic: true,
      },
    });

    if (!vocabulary) {
      return res.status(404).json({ error: 'Vocabulary not found' });
    }

    res.json(vocabulary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vocabulary' });
  }
});

// ========================
// ADD VOCABULARY TO USER (LEARNING)
// ========================
router.post('/:id/learn', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const vocabId = parseInt(id);

    // Check if vocabulary exists
    const vocab = await prisma.vocabulary.findUnique({
      where: { id: vocabId },
    });

    if (!vocab) {
      return res.status(404).json({ error: 'Vocabulary not found' });
    }

    // Add to user's vocabulary (using many-to-many relation)
    // Note: You may need to use connect if there's a junction table
    const updatedVocab = await prisma.vocabulary.update({
      where: { id: vocabId },
      data: {
        usersLearned: {
          connect: {
            id: req.user.id,
          },
        },
      },
    });

    res.json({
      message: 'Vocabulary added to learning list',
      vocabulary: updatedVocab,
    });
  } catch (error: any) {
    console.error(error);
    // Handle case where user-vocab relationship already exists
    if (error.code === 'P2025') {
      return res.status(400).json({ error: 'Vocabulary already in learning list' });
    }
    res.status(500).json({ error: 'Failed to add vocabulary' });
  }
});

// ========================
// ADMIN: CREATE VOCABULARY
// ========================
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can create vocabulary' });
    }

    const { korean, english, romanization, audioUrl, imageUrl, level, topicId } =
      req.body;

    if (!korean || !english || !topicId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const vocabulary = await prisma.vocabulary.create({
      data: {
        korean,
        english,
        vietnamese: english, // Use English as Vietnamese translation for now
        romanization: romanization || '',
        audioUrl: audioUrl || '',
        imageUrl: imageUrl || '',
        level: level || 'NEWBIE',
        topicId,
      } as any,
    });

    res.status(201).json(vocabulary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create vocabulary' });
  }
});

// ========================
// ADMIN: BULK CREATE VOCABULARY
// ========================
router.post('/bulk/create', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can create vocabulary' });
    }

    const { vocabularies } = req.body;

    if (!Array.isArray(vocabularies) || vocabularies.length === 0) {
      return res.status(400).json({ error: 'Invalid vocabulary list' });
    }

    const created = await prisma.vocabulary.createMany({
      data: vocabularies,
    });

    res.status(201).json({
      message: `Created ${created.count} vocabulary items`,
      count: created.count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create vocabulary' });
  }
});

// ========================
// ADMIN: UPDATE VOCABULARY
// ========================
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can update vocabulary' });
    }

    const { id } = req.params;
    const { korean, english, romanization, audioUrl, imageUrl, level } = req.body;

    const vocabulary = await prisma.vocabulary.update({
      where: { id: parseInt(id) },
      data: {
        korean,
        english,
        romanization,
        audioUrl,
        imageUrl,
        level,
        version: { increment: 1 },
      },
    });

    res.json(vocabulary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update vocabulary' });
  }
});

// ========================
// ADMIN: SOFT DELETE VOCABULARY
// ========================
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can delete vocabulary' });
    }

    const { id } = req.params;

    const vocabulary = await prisma.vocabulary.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    res.json({
      message: 'Vocabulary soft deleted',
      vocabulary,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete vocabulary' });
  }
});

// ========================
// SAVED VOCABULARY COLLECTION
// ========================

// GET user's saved vocabulary collection
router.get('/saved/collection', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { source, limit = 100, offset = 0 } = req.query;

    const where: any = { userId: req.user.id };
    if (source) where.source = source;

    const savedVocab = await prisma.savedVocabulary.findMany({
      where,
      include: {
        vocabulary: {
          include: { topic: true },
        },
      },
      skip: parseInt(offset as string),
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.savedVocabulary.count({ where });

    res.json({
      total,
      count: savedVocab.length,
      data: savedVocab.map((sv) => ({
        id: sv.id,
        vocabulary: sv.vocabulary,
        source: sv.source,
        savedAt: sv.createdAt,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch saved vocabulary' });
  }
});

// SAVE vocabulary to collection
router.post('/save', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { vocabularyId, source = 'manual', sourceId } = req.body;

    if (!vocabularyId) {
      return res.status(400).json({ error: 'vocabularyId is required' });
    }

    // Check if vocabulary exists
    const vocab = await prisma.vocabulary.findUnique({
      where: { id: vocabularyId },
    });

    if (!vocab) {
      return res.status(404).json({ error: 'Vocabulary not found' });
    }

    // Check if already saved
    const existing = await prisma.savedVocabulary.findFirst({
      where: {
        userId: req.user.id,
        vocabularyId,
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Already saved' });
    }

    // Create saved vocabulary record
    const saved = await prisma.savedVocabulary.create({
      data: {
        userId: req.user.id,
        vocabularyId,
        source,
        sourceId: sourceId || null,
      },
      include: {
        vocabulary: { include: { topic: true } },
      },
    });

    res.status(201).json({
      message: 'Vocabulary saved',
      data: saved,
    });
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Already saved' });
    }
    res.status(500).json({ error: 'Failed to save vocabulary' });
  }
});

// REMOVE vocabulary from collection
router.delete('/saved/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Check permission
    const saved = await prisma.savedVocabulary.findUnique({
      where: { id: parseInt(id) },
    });

    if (!saved || saved.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete
    await prisma.savedVocabulary.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Vocabulary removed from collection' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove vocabulary' });
  }
});

// ========================
// GET VOCABULARY BY TOPIC (stable order)
// Used by writing/pronunciation pages so F5 does not change the list.
// ========================
router.get('/by-topic/:topicId', async (req: AuthRequest, res: Response) => {
  try {
    const { topicId } = req.params;
    const { limit = 10 } = req.query;

    const topicIdNum = parseInt(topicId as string);
    const limitNum = parseInt(limit as string);

    if (isNaN(topicIdNum) || isNaN(limitNum)) {
      return res.status(400).json({ error: 'Invalid topicId or limit' });
    }

    const totalCount = await prisma.vocabulary.count({
      where: {
        topicId: topicIdNum,
        isActive: true,
      },
    });

    if (totalCount === 0) {
      return res.json({
        message: 'No vocabulary found for this topic',
        count: 0,
        total: 0,
        data: [],
      });
    }

    const vocabulary = await prisma.vocabulary.findMany({
      where: {
        topicId: topicIdNum,
        isActive: true,
      },
      orderBy: { id: 'asc' },
      take: limitNum,
    });

    return res.json({
      count: vocabulary.length,
      total: totalCount,
      data: vocabulary,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch vocabulary by topic' });
  }
});

// ========================
// GET RANDOM VOCABULARY BY TOPIC
// ========================
router.get('/random-by-topic/:topicId', async (req: AuthRequest, res: Response) => {
  try {
    const { topicId } = req.params;
    const { limit = 10 } = req.query;

    const topicIdNum = parseInt(topicId as string);
    const limitNum = parseInt(limit as string);

    if (isNaN(topicIdNum) || isNaN(limitNum)) {
      return res.status(400).json({ error: 'Invalid topicId or limit' });
    }

    // Get total count of vocabulary for this topic
    const totalCount = await prisma.vocabulary.count({
      where: {
        topicId: topicIdNum,
        isActive: true,
      },
    });

    if (totalCount === 0) {
      return res.json({
        message: 'No vocabulary found for this topic',
        count: 0,
        data: [],
      });
    }

    // Use PostgreSQL ORDER BY RANDOM() for random selection
    const vocabulary = await prisma.$queryRaw<any[]>`
      SELECT * FROM "Vocabulary"
      WHERE "topicId" = ${topicIdNum} AND "isActive" = true
      ORDER BY RANDOM()
      LIMIT ${limitNum}
    `;

    res.json({
      count: vocabulary.length,
      total: totalCount,
      data: vocabulary,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch random vocabulary' });
  }
});

export default router;
