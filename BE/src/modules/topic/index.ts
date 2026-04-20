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
// GET ALL TOPICS BY LEVEL
// ========================
router.get('/by-level/:level', async (req: Request, res: Response): Promise<void> => {
  try {
    const { level } = req.params;

    // Validate level
    const validLevels = ['NEWBIE', 'BEGINNER', 'INTERMEDIATE', 'UPPER', 'ADVANCED'];
    if (!validLevels.includes(level)) {
      res.status(400).json({ 
        error: 'Invalid level. Must be one of: ' + validLevels.join(', ') 
      });
      return;
    }

    const topics = await prisma.topic.findMany({
      where: {
        level: level,
      },
      orderBy: {
        order: 'asc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        description: true,
        level: true,
        order: true,
        vocabulary: {
          select: {
            id: true,
            korean: true,
            english: true,
            vietnamese: true,
          },
          take: 5, // Get first 5 vocabulary items for preview
        },
      },
    });

    // Add vocabulary count for each topic
    const topicsWithStats = topics.map((topic) => ({
      ...topic,
      vocabularyCount: topic.vocabulary.length,
    }));

    res.json({
      level,
      count: topicsWithStats.length,
      data: topicsWithStats,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch topics by level' });
  }
});

// ========================
// GET ALL TOPICS
// ========================
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const topics = await prisma.topic.findMany({
      orderBy: [
        { level: 'asc' },
        { order: 'asc' },
      ],
      include: {
        vocabulary: {
          select: {
            id: true,
          },
        },
      },
    });

    // Add vocabulary count for each topic
    const topicsWithStats = topics.map((topic) => ({
      ...topic,
      vocabularyCount: topic.vocabulary.length,
      vocabulary: undefined, // Remove the vocabulary array from response
    }));

    res.json(topicsWithStats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

// ========================
// GET TOPIC BY ID
// ========================
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const topic = await prisma.topic.findUnique({
      where: { id: parseInt(id) },
      include: {
        vocabulary: true,
      },
    });

    if (!topic) {
      res.status(404).json({ error: 'Topic not found' });
      return;
    }

    res.json(topic);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch topic' });
  }
});

// ========================
// GET TOPIC BY SLUG
// ========================
router.get('/slug/:slug', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const topic = await prisma.topic.findUnique({
      where: { slug: slug },
      include: {
        vocabulary: true,
      },
    });

    if (!topic) {
      res.status(404).json({ error: 'Topic not found' });
      return;
    }

    res.json(topic);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch topic by slug' });
  }
});

// ========================
// CREATE TOPIC (ADMIN ONLY)
// ========================
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Unauthorized: Admin access required' });
      return;
    }

    const { name, description, level, order } = req.body;

    if (!name || !level) {
      res.status(400).json({ 
        error: 'Missing required fields: name, level' 
      });
      return;
    }

    const topic = await prisma.topic.create({
      data: {
        name,
        description,
        level,
        order: order || 0,
      },
    });

    res.status(201).json(topic);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

// ========================
// UPDATE TOPIC (ADMIN ONLY)
// ========================
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Unauthorized: Admin access required' });
      return;
    }

    const { id } = req.params;
    const { name, description, level, order } = req.body;

    const topic = await prisma.topic.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(level && { level }),
        ...(order !== undefined && { order }),
      },
    });

    res.json(topic);
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Topic not found' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update topic' });
  }
});

// ========================
// DELETE TOPIC (ADMIN ONLY)
// ========================
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Unauthorized: Admin access required' });
      return;
    }

    const { id } = req.params;

    await prisma.topic.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Topic deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Topic not found' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
});

export default router;
