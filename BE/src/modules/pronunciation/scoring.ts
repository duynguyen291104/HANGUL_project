import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import FormData = require('form-data');
import fetch from 'node-fetch';
import fs = require('fs');
import path = require('path');
import os = require('os');
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
}

/**
 * Use Gemini to generate a meaningful pronunciation feedback.
 * Falls back to template string if Gemini is unavailable.
 */
const generateFeedbackWithGemini = async (params: {
  korean: string;
  correctAnswer: string;
  transcript: string;
  accuracy: number;
}): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return '';
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `Bạn là giáo viên dạy tiếng Hàn. Học sinh đang luyện phát âm từ "${params.korean}" (phiên âm La-tinh: "${params.correctAnswer}").
Hệ thống nhận dạng giọng nói (Whisper) ghi nhận học sinh đọc là: "${params.transcript}".
Độ chính xác: ${params.accuracy}%.

Hãy viết 1-2 câu nhận xét ngắn gọn bằng tiếng Việt:
- Chỉ ra điểm sai cụ thể (âm nào sai, thiếu âm gì) nếu có
- Gợi ý cách phát âm đúng hơn
- Không dùng emoji
- Không khen ngợi chung chung`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return '';
  }
};

/**
 * Levenshtein similarity — returns 0-100
 */
function levenshteinSimilarity(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 100 : Math.max(0, Math.round((1 - matrix[b.length][a.length] / maxLen) * 100));
}

/**
 * Call Flask Whisper server to transcribe audio
 */
const callWhisper = async (audioBuffer: Buffer): Promise<{ success: boolean; transcript: string }> => {
  const flaskUrl = process.env.FLASK_API_URL || 'http://localhost:5001';
  const tempPath = path.join(os.tmpdir(), `whisper_${Date.now()}.webm`);
  fs.writeFileSync(tempPath, audioBuffer);
  try {
    const form = new FormData();
    form.append('audio', fs.createReadStream(tempPath), {
      filename: 'audio.webm',
      contentType: 'audio/webm',
    });
    form.append('language', 'ko');

    const response = await fetch(`${flaskUrl}/transcribe`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    } as any);

    if (!response.ok) throw new Error(`Whisper returned ${response.status}`);
    const data = (await response.json()) as any;
    if (!data.success) throw new Error(data.error || 'Transcription failed');

    return { success: true, transcript: (data.text || '').trim() };
  } catch (err) {
    console.error('❌ Whisper error:', (err as any).message);
    return { success: false, transcript: '' };
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
};

/**
 * POST /pronunciation/score
 *
 * Body: { audioBase64, correctAnswer, korean, topicId?, vocabId? }
 * Pipeline: audio → Whisper (Flask:5001) → transcript → Levenshtein → score
 */
router.post('/score', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { audioBase64, correctAnswer, korean, topicId, vocabId } = req.body;
    if (!audioBase64 || !correctAnswer || !korean) {
      return res.status(400).json({ error: 'Missing audioBase64, correctAnswer, or korean' });
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const whisperResult = await callWhisper(audioBuffer);

    // Whisper unavailable — return score 0 with informative feedback instead of 503
    if (!whisperResult.success) {
      return res.json({
        accuracy: 0,
        transcript: '',
        feedback: `Whisper server chưa chạy. Phiên âm cần đọc: "${correctAnswer}". Hãy khởi động AI service và thử lại.`,
        isCorrect: false,
        xp: 0,
        method: 'unavailable',
        success: false,
      });
    }

    // Empty transcript = silence or too short — return score 0 instead of error
    if (!whisperResult.transcript) {
      return res.json({
        accuracy: 0,
        transcript: '',
        feedback: 'Không nhận ra giọng nói. Hãy nói to và rõ hơn, phiên âm cần đọc: "' + correctAnswer + '".',
        isCorrect: false,
        xp: 0,
        method: 'whisper',
        success: true,
      });
    }

    const transcript = whisperResult.transcript;
    const accuracy = levenshteinSimilarity(transcript.toLowerCase(), correctAnswer.toLowerCase());
    const isCorrect = accuracy >= 50;
    const xp = isCorrect ? 10 : 0;

    // Try Gemini feedback first, fall back to template
    let feedback = await generateFeedbackWithGemini({ korean, correctAnswer, transcript, accuracy });
    if (!feedback) {
      if (!transcript) {
        feedback = `Không nhận ra giọng nói. Hãy nói rõ hơn, phiên âm là: "${correctAnswer}".`;
      } else if (accuracy >= 80) {
        feedback = `Phát âm khá chuẩn. Whisper nhận dạng: "${transcript}", phiên âm đúng: "${correctAnswer}".`;
      } else if (accuracy >= 60) {
        feedback = `Gần đúng nhưng chưa khớp. Bạn đọc: "${transcript}", cần đọc là: "${correctAnswer}".`;
      } else if (accuracy >= 40) {
        feedback = `Chưa đúng phiên âm. Bạn đọc: "${transcript}", phiên âm đúng là: "${correctAnswer}".`;
      } else {
        feedback = `Sai phiên âm. Bạn đọc: "${transcript}", cần đọc chính xác là: "${correctAnswer}".`;
      }
    }

    console.log(`🎤 Whisper: "${korean}" → "${transcript}" | score: ${accuracy}%`);

    // Save learning history
    if (topicId && korean) {
      try {
        await prisma.learningHistory.deleteMany({
          where: { userId: req.user.id, topicId: Number(topicId), skillType: 'PRONUNCIATION', korean },
        });
        await prisma.learningHistory.create({
          data: { userId: req.user.id, topicId: Number(topicId), korean, vietnamese: correctAnswer, accuracy, skillType: 'PRONUNCIATION' },
        });
      } catch (err) {
        console.warn('⚠️ Failed to save history:', err);
      }
    }

    res.json({ accuracy, transcript, feedback, isCorrect, xp, method: 'whisper', success: true });
  } catch (error) {
    console.error('❌ Scoring error:', error);
    res.status(500).json({ error: 'Failed to score pronunciation' });
  }
});

/**
 * GET /pronunciation/status
 */
router.get('/status', async (_req, res: Response) => {
  try {
    const flaskUrl = process.env.FLASK_API_URL || 'http://localhost:5001';
    const r = await fetch(`${flaskUrl}/status`);
    const data = await r.json() as any;
    res.json({ whisperAvailable: true, flaskUrl, serverInfo: data });
  } catch {
    res.json({ whisperAvailable: false, flaskUrl: process.env.FLASK_API_URL || 'http://localhost:5001' });
  }
});

export default router;
