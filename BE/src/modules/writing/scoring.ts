import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
// @ts-ignore
import Jimp from 'jimp';

const router = Router();

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Pixel-based fallback: analyzes canvas PNG to count non-background ink pixels.
 * Canvas has white background + light gray grid. Ink = dark pixels.
 */
const evaluateWithPixels = async (imageBase64: string): Promise<{ accuracy: number; feedback: string }> => {
  try {
    const buf = Buffer.from(imageBase64, 'base64');
    const image = await Jimp.read(buf);
    const width = image.getWidth();
    const height = image.getHeight();
    const total = width * height;

    let inkPixels = 0;
    image.scan(0, 0, width, height, (_x: number, _y: number, idx: number) => {
      const r = image.bitmap.data[idx];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];
      // Count pixels darker than threshold (ink = dark strokes, background = white/light gray)
      if (r < 180 && g < 180 && b < 180) inkPixels++;
    });

    const inkRatio = inkPixels / total;

    if (inkRatio < 0.005) {
      return { accuracy: 0, feedback: 'Canvas trắng, chưa viết gì cả' };
    } else if (inkRatio < 0.02) {
      return { accuracy: 30, feedback: 'Nét viết quá mờ hoặc thiếu nhiều nét' };
    } else if (inkRatio < 0.05) {
      return { accuracy: 55, feedback: 'Viết được nhưng cần luyện thêm độ đậm và đầy đủ nét' };
    } else if (inkRatio < 0.12) {
      return { accuracy: 72, feedback: 'Viết ổn, tiếp tục luyện tập để chuẩn hơn' };
    } else {
      return { accuracy: 85, feedback: 'Nét viết đầy đặn, rất tốt!' };
    }
  } catch (err) {
    console.error('❌ Pixel analysis error:', err);
    return { accuracy: 50, feedback: 'Không thể phân tích chi tiết, hãy tiếp tục luyện tập' };
  }
};

/**
 * Use Gemini Vision to evaluate a handwritten Korean character canvas image.
 * imageBase64: raw base64 (no data URL prefix), PNG format
 */
const evaluateWritingWithGemini = async (params: {
  imageBase64: string;
  korean: string;
  romanization: string;
  meaning: string;
}): Promise<{ accuracy: number; feedback: string; success: boolean }> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    return { accuracy: 0, feedback: '', success: false };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Bạn là giáo viên chuyên dạy viết chữ Hàn Quốc (Hangul).

Học sinh đang luyện viết ký tự tiếng Hàn: "${params.korean}" (phiên âm: "${params.romanization}", nghĩa: "${params.meaning}")

Hình ảnh dưới đây là bài viết tay của học sinh trên canvas. Nền trắng, có lưới ô, và có ký tự mẫu màu nhạt làm nền.

Hãy đánh giá:
1. Nét viết có đúng hình dạng ký tự "${params.korean}" không?
2. Tỉ lệ và vị trí các nét có cân đối không?
3. Độ rõ ràng và đầy đủ của các nét

Cho điểm từ 0-100 và nhận xét ngắn bằng tiếng Việt (tối đa 15 từ).

Nếu canvas trắng hoặc không có nét viết nào → cho 0 điểm.

Trả lời CHÍNH XÁC theo JSON (không thêm gì khác):
{"accuracy": <số 0-100>, "feedback": "<nhận xét ngắn gọn bằng tiếng Việt>"}

Tiêu chí điểm:
- 90-100: nét viết rất chuẩn, đẹp
- 70-89: viết tốt, có thể nhận ra
- 50-69: tạm được, cần luyện thêm  
- 1-49: sai hình dạng hoặc thiếu nét
- 0: không có nét viết`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/png',
          data: params.imageBase64,
        },
      },
      { text: prompt },
    ]);

    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Gemini response');

    const parsed = JSON.parse(jsonMatch[0]);
    const accuracy = Math.min(100, Math.max(0, Math.round(Number(parsed.accuracy) || 0)));
    const feedback = String(parsed.feedback || '');

    return { accuracy, feedback, success: true };
  } catch (error) {
    console.error('❌ Gemini writing evaluation error:', (error as any).message);
    return { accuracy: 0, feedback: '', success: false };
  }
};

/**
 * ENDPOINT: POST /writing/score
 *
 * Body: { imageBase64, korean, romanization, meaning, topicId? }
 * - imageBase64: canvas exported as PNG base64 (may include "data:image/png;base64," prefix)
 * - korean: target character e.g. "한"
 * - romanization: romanization e.g. "han"
 * - meaning: Vietnamese/English meaning
 * - topicId: optional, for saving history
 */
router.post('/score', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { imageBase64, korean, romanization, meaning = '', topicId } = req.body;

    if (!imageBase64 || !korean) {
      return res.status(400).json({ error: 'Missing imageBase64 or korean' });
    }

    // Strip data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    console.log(`🖊️ Evaluating writing for "${korean}" — image size: ${base64Data.length} chars`);

    const geminiResult = await evaluateWritingWithGemini({
      imageBase64: base64Data,
      korean,
      romanization: romanization || '',
      meaning,
    });

    let accuracy: number;
    let feedback: string;
    let method: string;

    if (geminiResult.success) {
      accuracy = geminiResult.accuracy;
      feedback = geminiResult.feedback;
      method = 'gemini';
      console.log(`🤖 Gemini writing score: "${korean}" → ${accuracy}% — ${feedback}`);
    } else {
      // Gemini unavailable (quota/key issue) → pixel-based analysis
      console.warn(`⚠️ Gemini unavailable for "${korean}", using pixel analysis`);
      const pixelResult = await evaluateWithPixels(base64Data);
      accuracy = pixelResult.accuracy;
      feedback = pixelResult.feedback;
      method = 'pixel';
      console.log(`🎨 Pixel score: "${korean}" → ${accuracy}%`);
    }

    const isCorrect = accuracy >= 50;
    const xp = isCorrect ? 10 : 0;

    // Save to LearningHistory if topicId provided
    if (topicId && korean) {
      try {
        await prisma.learningHistory.deleteMany({
          where: {
            userId: req.user.id,
            topicId: Number(topicId),
            skillType: 'WRITING',
            korean,
          },
        });
        await prisma.learningHistory.create({
          data: {
            userId: req.user.id,
            topicId: Number(topicId),
            korean,
            vietnamese: meaning,
            accuracy,
            skillType: 'WRITING',
          },
        });
        console.log(`💾 Writing history saved: "${korean}" ${accuracy}%`);
      } catch (err) {
        console.warn('⚠️ Failed to save writing history:', err);
      }
    }

    res.json({ accuracy, feedback, isCorrect, xp, method, success: true });
  } catch (error) {
    console.error('❌ Writing scoring error:', error);
    res.status(500).json({ error: 'Failed to score writing' });
  }
});

export default router;
