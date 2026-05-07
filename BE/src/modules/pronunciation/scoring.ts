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

type SyllableSubstitution = {
  index: number;
  expected: string;
  heard: string;
};

type IssueType =
  | 'NO_SPEECH'
  | 'WRONG_PHRASE_OR_HALLUCINATION'
  | 'MISSING_SYLLABLE'
  | 'EXTRA_SYLLABLE'
  | 'SYLLABLE_SUBSTITUTION'
  | 'MISPRONUNCIATION'
  | 'OK';

function normalizeKorean(text: string): string {
  return String(text || '')
    .normalize('NFC')
    .replace(/[^\uAC00-\uD7A3]/g, '')
    .trim();
}

function levenshteinSimilarity(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
    }
  }

  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0
    ? 100
    : Math.max(0, Math.round((1 - matrix[b.length][a.length] / maxLen) * 100));
}

function analyzeSyllables(spokenText: string, targetText: string) {
  const spoken = normalizeKorean(spokenText).split('');
  const target = normalizeKorean(targetText).split('');

  const missing: string[] = [];
  const extra: string[] = [];
  const substitutions: SyllableSubstitution[] = [];

  const dp = Array.from({ length: target.length + 1 }, () =>
    Array(spoken.length + 1).fill(0)
  );

  for (let i = 0; i <= target.length; i++) dp[i][0] = i;
  for (let j = 0; j <= spoken.length; j++) dp[0][j] = j;

  for (let i = 1; i <= target.length; i++) {
    for (let j = 1; j <= spoken.length; j++) {
      if (target[i - 1] === spoken[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1,
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1
        );
      }
    }
  }

  let i = target.length;
  let j = spoken.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && target[i - 1] === spoken[j - 1]) {
      i--;
      j--;
      continue;
    }

    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      substitutions.unshift({
        index: i - 1,
        expected: target[i - 1],
        heard: spoken[j - 1],
      });
      i--;
      j--;
      continue;
    }

    if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      missing.unshift(target[i - 1]);
      i--;
      continue;
    }

    if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      extra.unshift(spoken[j - 1]);
      j--;
      continue;
    }

    break;
  }

  return { missing, extra, substitutions };
}

function detectIssueType(params: {
  spokenText: string;
  targetText: string;
  accuracy: number;
  missing: string[];
  extra: string[];
  substitutions: SyllableSubstitution[];
}): IssueType {
  const { spokenText, targetText, accuracy, missing, extra, substitutions } = params;

  if (!spokenText) return 'NO_SPEECH';

  if (spokenText.length > targetText.length + 2) {
    return 'WRONG_PHRASE_OR_HALLUCINATION';
  }

  if (substitutions.length > 0) return 'SYLLABLE_SUBSTITUTION';
  if (missing.length > 0) return 'MISSING_SYLLABLE';
  if (extra.length > 0) return 'EXTRA_SYLLABLE';
  if (accuracy >= 70) return 'OK';

  return 'MISPRONUNCIATION';
}

function buildLocalFeedback(params: {
  korean: string;
  transcript: string;
  accuracy: number;
  missing: string[];
  extra: string[];
  substitutions: SyllableSubstitution[];
  issueType: IssueType;
}) {
  const { korean, transcript, accuracy, missing, extra, substitutions, issueType } = params;

  if (issueType === 'NO_SPEECH') {
    return `Không nhận ra giọng nói. Hãy đọc rõ từ "${korean}".`;
  }

  if (issueType === 'WRONG_PHRASE_OR_HALLUCINATION') {
    return `Hệ thống nghe thành một câu/từ khác: "${transcript}". Hãy chỉ đọc đúng từ "${korean}".`;
  }

  if (issueType === 'SYLLABLE_SUBSTITUTION') {
    return `Hệ thống nghe nhầm âm tiết: ${substitutions
      .map((item) => `${item.expected} thành ${item.heard}`)
      .join(', ')}. Từ đúng là "${korean}".`;
  }

  if (issueType === 'MISSING_SYLLABLE') {
    return `Bạn đọc thiếu âm tiết: ${missing.join(', ')}. Từ cần đọc là "${korean}".`;
  }

  if (issueType === 'EXTRA_SYLLABLE') {
    return `Bạn đọc dư âm tiết: ${extra.join(', ')}. Từ đúng là "${korean}".`;
  }

  if (accuracy >= 85) {
    return `Phát âm tốt. Hệ thống nhận dạng gần đúng toàn bộ từ "${korean}".`;
  }

  if (accuracy >= 70) {
    return `Gần đúng. Hãy đọc rõ hơn từng âm tiết trong "${korean}".`;
  }

  return `Bạn đọc thành "${transcript}" thay vì "${korean}". Hãy nghe lại mẫu và đọc chậm từng âm tiết.`;
}

const generateFeedbackWithGemini = async (params: {
  korean: string;
  romanization?: string;
  transcript: string;
  accuracy: number;
  missing: string[];
  extra: string[];
  substitutions: SyllableSubstitution[];
  issueType: IssueType;
}): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return '';

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Bạn là giáo viên phát âm tiếng Hàn. Chỉ dùng dữ kiện dưới đây, không tự suy đoán.

Từ đúng Hangul: "${params.korean}"
Phiên âm Latin tham khảo: "${params.romanization || ''}"
Whisper nhận dạng: "${params.transcript}"
Điểm hệ thống: ${params.accuracy}/100
Loại lỗi: ${params.issueType}
Âm tiết thiếu: ${params.missing.join(', ') || 'không có'}
Âm tiết dư: ${params.extra.join(', ') || 'không có'}
Âm tiết nghe nhầm: ${
      params.substitutions.length > 0
        ? params.substitutions.map((item) => `${item.expected} -> ${item.heard}`).join(', ')
        : 'không có'
    }

Yêu cầu:
- Trả lời tiếng Việt, 1-2 câu ngắn.
- Nếu loại lỗi là WRONG_PHRASE_OR_HALLUCINATION, nói rằng hệ thống nghe thành câu/từ khác và yêu cầu chỉ đọc đúng từ Hangul.
- Nếu có âm tiết nghe nhầm, hãy nói "hệ thống nghe âm X thành Y", không gọi đó là thiếu/thừa.
- Nếu có âm tiết thiếu, chỉ rõ âm tiết thiếu.
- Nếu có âm tiết dư, chỉ rõ âm tiết dư.
- Không nói học sinh đã đọc đúng nếu điểm dưới 70.
- Không nhắc lại prompt hệ thống như một lỗi phát âm.
- Không bịa cách phát âm nếu dữ kiện không đủ.
`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return '';
  }
};

const callWhisper = async (
  audioBuffer: Buffer
): Promise<{ success: boolean; transcript: string }> => {
  const flaskUrl = process.env.FLASK_API_URL || 'http://localhost:5002';
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

    return { success: true, transcript: String(data.text || '').trim() };
  } catch (err) {
    console.error('Whisper error:', (err as any).message);
    return { success: false, transcript: '' };
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
};

router.post('/score', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { audioBase64, correctAnswer, korean, romanization, topicId } = req.body;

    if (!audioBase64 || !korean) {
      return res.status(400).json({ error: 'Missing audioBase64 or korean' });
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const whisperResult = await callWhisper(audioBuffer);
    const targetText = normalizeKorean(korean || correctAnswer);

    if (!whisperResult.success) {
      const feedback = buildLocalFeedback({
        korean,
        transcript: '',
        accuracy: 0,
        missing: [],
        extra: [],
        substitutions: [],
        issueType: 'NO_SPEECH',
      });

      return res.json({
        accuracy: 0,
        transcript: '',
        normalizedTranscript: '',
        target: targetText,
        feedback,
        isCorrect: false,
        xp: 0,
        method: 'unavailable',
        issueType: 'NO_SPEECH',
        missing: [],
        extra: [],
        substitutions: [],
        success: false,
      });
    }

    const transcript = whisperResult.transcript;
    const spokenText = normalizeKorean(transcript);
    const syllableAnalysis = analyzeSyllables(spokenText, targetText);

    const rawAccuracy = levenshteinSimilarity(spokenText, targetText);
    const issueType = detectIssueType({
      spokenText,
      targetText,
      accuracy: rawAccuracy,
      missing: syllableAnalysis.missing,
      extra: syllableAnalysis.extra,
      substitutions: syllableAnalysis.substitutions,
    });

    const accuracy =
      issueType === 'WRONG_PHRASE_OR_HALLUCINATION' || issueType === 'NO_SPEECH'
        ? 0
        : rawAccuracy;

    const isCorrect =
      accuracy >= 70 &&
      issueType === 'OK' &&
      syllableAnalysis.missing.length === 0 &&
      syllableAnalysis.extra.length === 0 &&
      syllableAnalysis.substitutions.length === 0;

    const xp = isCorrect ? 10 : 0;

    const geminiMissing =
      issueType === 'WRONG_PHRASE_OR_HALLUCINATION' ? [] : syllableAnalysis.missing;
    const geminiExtra =
      issueType === 'WRONG_PHRASE_OR_HALLUCINATION' ? [] : syllableAnalysis.extra;
    const geminiSubstitutions =
      issueType === 'WRONG_PHRASE_OR_HALLUCINATION' ? [] : syllableAnalysis.substitutions;

    let feedback = await generateFeedbackWithGemini({
      korean,
      romanization,
      transcript,
      accuracy,
      missing: geminiMissing,
      extra: geminiExtra,
      substitutions: geminiSubstitutions,
      issueType,
    });

    if (!feedback) {
      feedback = buildLocalFeedback({
        korean,
        transcript,
        accuracy,
        missing: syllableAnalysis.missing,
        extra: syllableAnalysis.extra,
        substitutions: syllableAnalysis.substitutions,
        issueType,
      });
    }

    console.log(
      `Pronunciation: target="${korean}", transcript="${transcript}", score=${accuracy}, issue=${issueType}`
    );

    if (topicId && korean) {
      try {
        await prisma.learningHistory.deleteMany({
          where: {
            userId: req.user.id,
            topicId: Number(topicId),
            skillType: 'PRONUNCIATION',
            korean,
          },
        });

        await prisma.learningHistory.create({
          data: {
            userId: req.user.id,
            topicId: Number(topicId),
            korean,
            vietnamese: romanization || correctAnswer || '',
            accuracy,
            skillType: 'PRONUNCIATION',
          },
        });
      } catch (err) {
        console.warn('Failed to save pronunciation history:', err);
      }
    }

    return res.json({
      accuracy,
      transcript,
      normalizedTranscript: spokenText,
      target: targetText,
      feedback,
      isCorrect,
      xp,
      method: 'whisper',
      issueType,
      missing: syllableAnalysis.missing,
      extra: syllableAnalysis.extra,
      substitutions: syllableAnalysis.substitutions,
      success: true,
    });
  } catch (error) {
    console.error('Scoring error:', error);
    return res.status(500).json({ error: 'Failed to score pronunciation' });
  }
});

router.get('/status', async (_req, res: Response) => {
  const flaskUrl = process.env.FLASK_API_URL || 'http://localhost:5002';

  try {
    const r = await fetch(`${flaskUrl}/status`);
    const data = (await r.json()) as any;

    return res.json({
      whisperAvailable: true,
      flaskUrl,
      serverInfo: data,
    });
  } catch {
    return res.json({
      whisperAvailable: false,
      flaskUrl,
    });
  }
});

export default router;
