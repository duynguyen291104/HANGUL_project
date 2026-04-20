import { Router, Request, Response } from 'express';
import axios from 'axios';
import prisma from '../../lib/prisma';

const router = Router();

// AI Backend URL - Flask running on port 5001
const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://flask:5001';

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

// Camera detection route - processes image and sends to Flask AI, then saves to DB
router.post('/detect', async (req: AuthRequest, res: Response) => {
  try {
    const { image } = req.body; // base64 image data
    const userId = req.user?.id;

    if (!image) {
      return res.status(400).json({ error: 'Image data required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`🎥 [${new Date().toISOString()}] User ${userId} sending detection request...`);
    
    try {
      // Call Flask AI detection backend
      const aiResponse = await axios.post(
        `${AI_BACKEND_URL}/detect`,
        { image },
        { 
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const detectedObjects = aiResponse.data.objects || [];
      
      console.log(`✅ Detected ${detectedObjects.length} objects`);
      
      // Save detection to database
      const detection = await prisma.yOLODetection.create({
        data: {
          userId,
          label: detectedObjects.length ? detectedObjects[0].label : 'unknown',
          confidence: aiResponse.data.confidence || 0,
          bbox: JSON.stringify(detectedObjects.length ? detectedObjects[0].bbox : []),
          source: 'webcam',
          status: 'COMPLETED',
        },
      });

      console.log(`📝 Detection ${detection.id} saved to database`);

      // Format results to match frontend expectations
      const response = {
        success: true,
        detectionId: detection.id,
        detections: detectedObjects,
        timestamp: detection.createdAt.toISOString(),
        count: detectedObjects.length,
        confidence: aiResponse.data.confidence || 0,
      };

      res.json(response);
    } catch (aiError: any) {
      console.error(`❌ AI Backend error: ${aiError.message}`);
      
      // Log failed detection attempt to DB
      try {
        await prisma.yOLODetection.create({
          data: {
            userId,
            label: 'error',
            confidence: 0,
            bbox: '[]',
            source: 'webcam',
            status: 'FAILED',
          },
        });
      } catch (dbError) {
        console.error('Failed to log detection error to DB:', dbError);
      }

      // Return error response
      res.status(502).json({
        success: false,
        message: 'AI backend unavailable',
        error: aiError.message,
        objects: [],
      });
    }
  } catch (error: any) {
    console.error(`❌ Detection error: ${error.message}`);
    res.status(500).json({ 
      success: false,
      error: 'Detection failed',
      message: error.message 
    });
  }
});

// Get user's detection history
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const limit = parseInt(req.query.limit as string) || 20;

    const detections = await prisma.yOLODetection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        label: true,
        confidence: true,
        bbox: true,
        status: true,
        createdAt: true,
      },
    });

    // Parse JSON strings back to objects
    const formatted = detections.map((d) => ({
      ...d,
      detections: [{ label: d.label, confidence: d.confidence, bbox: JSON.parse(d.bbox || '[]') }],
    }));

    res.json({ detections: formatted, total: formatted.length });
  } catch (error) {
    console.error('❌ Error fetching detection history:', error);
    res.status(500).json({ error: 'Failed to fetch detection history' });
  }
});

// Get detection by ID
router.get('/:detectionId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const detectionId = parseInt(req.params.detectionId);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const detection = await prisma.yOLODetection.findUnique({
      where: { id: detectionId },
    });

    if (!detection) {
      return res.status(404).json({ error: 'Detection not found' });
    }

    if (detection.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({
      ...detection,
      detections: [{ label: detection.label, confidence: detection.confidence, bbox: JSON.parse(detection.bbox || '[]') }],
    });
  } catch (error) {
    console.error('❌ Error fetching detection:', error);
    res.status(500).json({ error: 'Failed to fetch detection' });
  }
});

export default router;

