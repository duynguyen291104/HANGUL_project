import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Jimp } from 'jimp';
import {
  composeTemplateCharactersForWord,
  composeTemplateStrokesForChar,
  gradeCharacter as gradeHangulCharacterStrokes,
  gradeWordPartialLoose,
  type CharacterInput,
} from './grading';

const router = Router();

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

interface StrokePoint {
  x: number;
  y: number;
  time: number;
  strokeId: number;
}

interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface Point2D {
  x: number;
  y: number;
}

// ========================
// TEMPLATE INFO (for FE validation)
// ========================
// GET /writing/template?word=...
router.get('/template', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const word = String(req.query.word || '').trim();
    if (!word) return res.status(400).json({ error: 'Missing word' });

    const template = composeTemplateCharactersForWord(word);
    const characters = Array.from(word).map((ch, idx) => ({
      char: ch,
      expectedStrokeCount: template[idx]?.length || 0,
    }));

    return res.json({
      word,
      expectedCharacterCount: characters.length,
      characters,
    });
  } catch (e) {
    console.error('❌ Writing template error:', e);
    return res.status(500).json({ error: 'Failed to get template' });
  }
});

// ========================
// SINGLE CHARACTER (strict) — spec: POST /grade
// ========================
// POST /writing/grade  Body: { char: "가", strokes: [[{x,y,t?}, ...], ...] }
router.post('/grade', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { char, strokes } = req.body as { char?: string; strokes?: CharacterInput['strokes'] };
    const ch = String(char ?? '')
      .trim()
      .normalize('NFC');
    const chars = [...ch];
    if (chars.length !== 1) {
      return res.status(400).json({ score: 0, reason: 'char phải đúng một ký tự', failLayer: 'hard' });
    }
    if (!Array.isArray(strokes)) {
      return res.status(400).json({ score: 0, reason: 'strokes phải là mảng các nét', failLayer: 'hard' });
    }
    const template = composeTemplateStrokesForChar(chars[0]);
    if (template.length === 0) {
      return res.status(400).json({ score: 0, reason: 'Không có template cho ký tự này', failLayer: 'hard' });
    }
    const result = gradeHangulCharacterStrokes(strokes, template);
    return res.json({
      score: result.score,
      reason: result.error ?? null,
      error: result.error,
      failLayer: result.failLayer,
      feedback: result.feedback,
      breakdown: result.detail,
      detail: result.detail,
    });
  } catch (e) {
    console.error('❌ Writing /grade error:', e);
    return res.status(500).json({ score: 0, reason: 'Chấm điểm thất bại' });
  }
});

// ========================
// STRICT WORD GRADING
// ========================
// POST /writing/score-word
// Body: { word, expectedCharacterCount, characters:[{strokes:[[ {x,y,t}, ...], ...]}] }
router.post('/score-word', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { word, expectedCharacterCount, characters } = req.body as {
      word?: string;
      expectedCharacterCount?: number;
      characters?: CharacterInput[];
    };

    const normalizedWord = String(word || '').trim();
    if (!normalizedWord) return res.status(400).json({ score: 0, error: 'Missing word' });

    const templateCharacters = composeTemplateCharactersForWord(normalizedWord);
    const expectedCount = templateCharacters.length;

    // In partial mode, FE may call anytime; still keep expected count sanity check if provided.
    if (Number(expectedCharacterCount) && Number(expectedCharacterCount) !== expectedCount) {
      return res.json({
        score: 0,
        expectedCharacterCount: expectedCount,
        completedCharacterCount: 0,
        characterScores: [],
        error: 'Sai số chữ',
      });
    }

    if (!Array.isArray(characters)) {
      return res.json({ score: 0, error: 'Dữ liệu không hợp lệ' });
    }

    const result = gradeWordPartialLoose(characters, templateCharacters);
    return res.json(result);
  } catch (e) {
    console.error('❌ Writing score-word error:', e);
    return res.status(500).json({ score: 0, error: 'Failed to score word' });
  }
});

const CHOSEONG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JUNGSEONG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const JONGSEONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

const COMPOUND_JAMO: Record<string, string[]> = {
  'ㄲ': ['ㄱ', 'ㄱ'], 'ㄸ': ['ㄷ', 'ㄷ'], 'ㅃ': ['ㅂ', 'ㅂ'], 'ㅆ': ['ㅅ', 'ㅅ'], 'ㅉ': ['ㅈ', 'ㅈ'],
  'ㄳ': ['ㄱ', 'ㅅ'], 'ㄵ': ['ㄴ', 'ㅈ'], 'ㄶ': ['ㄴ', 'ㅎ'], 'ㄺ': ['ㄹ', 'ㄱ'], 'ㄻ': ['ㄹ', 'ㅁ'],
  'ㄼ': ['ㄹ', 'ㅂ'], 'ㄽ': ['ㄹ', 'ㅅ'], 'ㄾ': ['ㄹ', 'ㅌ'], 'ㄿ': ['ㄹ', 'ㅍ'], 'ㅀ': ['ㄹ', 'ㅎ'], 'ㅄ': ['ㅂ', 'ㅅ'],
};

const VERTICAL_VOWELS = new Set(['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅣ']);

const JAMO_PATHS: Record<string, string[]> = {
  'ㄱ': ['M 14,24 L 80,24', 'M 80,24 L 80,82'],
  'ㄲ': ['M 5,24 L 38,24', 'M 38,24 L 38,80', 'M 50,24 L 88,24', 'M 88,24 L 88,80'],
  'ㄴ': ['M 20,14 L 20,82', 'M 20,82 L 84,82'],
  'ㄷ': ['M 14,18 L 84,18', 'M 14,18 L 14,82', 'M 14,82 L 84,82'],
  'ㄸ': ['M 4,18 L 44,18', 'M 4,18 L 4,82', 'M 4,82 L 44,82', 'M 54,18 L 94,18', 'M 54,18 L 54,82', 'M 54,82 L 94,82'],
  'ㄹ': ['M 14,16 L 84,16', 'M 14,16 L 14,50', 'M 14,50 L 84,50', 'M 84,50 L 84,74', 'M 14,74 L 84,74'],
  'ㅁ': ['M 18,18 L 82,18', 'M 18,18 L 18,82', 'M 82,18 L 82,82', 'M 18,82 L 82,82'],
  'ㅂ': ['M 20,18 L 20,82', 'M 80,18 L 80,82', 'M 20,50 L 80,50', 'M 20,18 L 80,18', 'M 20,82 L 80,82'],
  'ㅅ': ['M 50,12 L 15,84', 'M 50,12 L 85,84'],
  'ㅆ': ['M 28,12 L 5,84', 'M 28,12 L 46,84', 'M 68,12 L 50,84', 'M 68,12 L 92,84'],
  'ㅇ': ['M 50,18 A 32,32 0 1,1 49.9,18'],
  'ㅈ': ['M 14,26 L 86,26', 'M 50,26 L 15,84', 'M 50,26 L 85,84'],
  'ㅉ': ['M 5,26 L 44,26', 'M 24,26 L 5,84', 'M 24,26 L 44,84', 'M 54,26 L 93,26', 'M 73,26 L 54,84', 'M 73,26 L 93,84'],
  'ㅊ': ['M 44,8 L 56,8', 'M 14,26 L 86,26', 'M 50,26 L 15,84', 'M 50,26 L 85,84'],
  'ㅋ': ['M 14,22 L 82,22', 'M 14,52 L 72,52', 'M 72,22 L 72,82'],
  'ㅌ': ['M 14,18 L 84,18', 'M 14,18 L 14,82', 'M 14,50 L 84,50', 'M 14,82 L 84,82'],
  'ㅍ': ['M 14,20 L 86,20', 'M 14,82 L 86,82', 'M 28,20 L 28,82', 'M 72,20 L 72,82'],
  'ㅎ': ['M 44,8 L 56,8', 'M 50,20 A 20,20 0 1,1 49.9,20', 'M 14,68 L 86,68'],
  'ㅏ': ['M 50,10 L 50,90', 'M 50,50 L 84,50'],
  'ㅐ': ['M 34,10 L 34,90', 'M 34,50 L 60,50', 'M 68,10 L 68,90'],
  'ㅑ': ['M 50,10 L 50,90', 'M 50,33 L 84,33', 'M 50,60 L 84,60'],
  'ㅒ': ['M 28,10 L 28,90', 'M 28,33 L 58,33', 'M 28,60 L 58,60', 'M 68,10 L 68,90'],
  'ㅓ': ['M 50,10 L 50,90', 'M 50,50 L 16,50'],
  'ㅔ': ['M 32,10 L 32,90', 'M 32,50 L 14,50', 'M 68,10 L 68,90'],
  'ㅕ': ['M 50,10 L 50,90', 'M 50,33 L 16,33', 'M 50,60 L 16,60'],
  'ㅖ': ['M 32,10 L 32,90', 'M 32,33 L 14,33', 'M 32,60 L 14,60', 'M 68,10 L 68,90'],
  'ㅗ': ['M 14,55 L 86,55', 'M 50,55 L 50,88'],
  'ㅘ': ['M 8,52 L 42,52', 'M 25,52 L 25,86', 'M 55,10 L 55,90', 'M 55,50 L 88,50'],
  'ㅙ': ['M 5,52 L 35,52', 'M 20,52 L 20,86', 'M 46,10 L 46,90', 'M 46,50 L 65,50', 'M 74,10 L 74,90'],
  'ㅚ': ['M 10,52 L 58,52', 'M 34,52 L 34,86', 'M 74,10 L 74,90'],
  'ㅛ': ['M 14,55 L 86,55', 'M 34,55 L 34,88', 'M 66,55 L 66,88'],
  'ㅜ': ['M 14,28 L 86,28', 'M 50,28 L 50,88'],
  'ㅝ': ['M 6,32 L 42,32', 'M 24,32 L 24,72', 'M 58,10 L 58,90', 'M 58,52 L 22,52'],
  'ㅞ': ['M 4,32 L 36,32', 'M 20,32 L 20,72', 'M 48,10 L 48,90', 'M 48,52 L 18,52', 'M 72,10 L 72,90'],
  'ㅟ': ['M 10,32 L 58,32', 'M 34,32 L 34,76', 'M 74,10 L 74,90'],
  'ㅠ': ['M 14,28 L 86,28', 'M 34,28 L 34,88', 'M 66,28 L 66,88'],
  'ㅡ': ['M 14,52 L 86,52'],
  'ㅢ': ['M 10,52 L 52,52', 'M 72,10 L 72,90'],
  'ㅣ': ['M 50,10 L 50,90'],
};

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

const decomposeHangul = (char: string) => {
  const code = char.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return null;
  const offset = code - 0xac00;
  const jongIdx = offset % 28;
  const jungIdx = ((offset - jongIdx) / 28) % 21;
  const choIdx = Math.floor(offset / (21 * 28));
  return { cho: CHOSEONG[choIdx], jung: JUNGSEONG[jungIdx], jong: JONGSEONG[jongIdx] };
};

const getJamoStrokePaths = (jamo: string): string[] => {
  if (!jamo) return [];
  if (JAMO_PATHS[jamo]) return JAMO_PATHS[jamo];
  const parts = COMPOUND_JAMO[jamo] || [];
  return parts.flatMap((part) => JAMO_PATHS[part] || []);
};

const pathToPoints = (path: string): Point2D[] => {
  if (path.includes('A')) {
    const nums = path.match(/-?\d+(\.\d+)?/g)?.map(Number) || [];
    if (nums.length >= 4) {
      const startX = nums[0];
      const startY = nums[1];
      const r = nums[2];
      const centerX = startX;
      const centerY = startY + r;
      const sample: Point2D[] = [];
      for (let i = 0; i < 40; i++) {
        const t = (i / 39) * Math.PI * 2 - Math.PI / 2;
        sample.push({ x: centerX + Math.cos(t) * r, y: centerY + Math.sin(t) * r });
      }
      return sample;
    }
  }
  const nums = path.match(/-?\d+(\.\d+)?/g)?.map(Number) || [];
  const points: Point2D[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) points.push({ x: nums[i], y: nums[i + 1] });
  return points;
};

const applyBoxTransform = (pts: Point2D[], box: { x: number; y: number; w: number; h: number }): Point2D[] =>
  pts.map((p) => ({ x: box.x + (p.x / 100) * box.w, y: box.y + (p.y / 100) * box.h }));

const composeTemplateStrokes = (korean: string): Point2D[][] => {
  const first = Array.from(korean)[0];
  const d = decomposeHangul(first);
  if (!d) return [];
  const hasJong = !!d.jong;
  const vertical = VERTICAL_VOWELS.has(d.jung);
  const topHeight = hasJong ? 72 : 100;
  const choBox = vertical ? { x: 0, y: 0, w: 55, h: topHeight } : { x: 15, y: 0, w: 70, h: hasJong ? 52 : 62 };
  const jungBox = vertical ? { x: 45, y: 0, w: 55, h: topHeight } : { x: 15, y: hasJong ? 50 : 58, w: 70, h: hasJong ? 26 : 40 };
  const jongBox = { x: 15, y: 76, w: 70, h: 24 };

  const cho = getJamoStrokePaths(d.cho).map((p) => applyBoxTransform(pathToPoints(p), choBox));
  const jung = getJamoStrokePaths(d.jung).map((p) => applyBoxTransform(pathToPoints(p), jungBox));
  const jong = hasJong ? getJamoStrokePaths(d.jong).map((p) => applyBoxTransform(pathToPoints(p), jongBox)) : [];
  return [...cho, ...jung, ...jong];
};

const groupUserStrokes = (strokes: StrokePoint[]): Point2D[][] => {
  const grouped = new Map<number, StrokePoint[]>();
  strokes.forEach((p) => {
    if (!grouped.has(p.strokeId)) grouped.set(p.strokeId, []);
    grouped.get(p.strokeId)!.push(p);
  });
  return [...grouped.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, pts]) => pts.sort((a, b) => a.time - b.time).map((p) => ({ x: p.x, y: p.y })));
};

const getBBox = (strokes: Point2D[][]) => {
  const all = strokes.flat();
  const minX = Math.min(...all.map((p) => p.x));
  const minY = Math.min(...all.map((p) => p.y));
  const maxX = Math.max(...all.map((p) => p.x));
  const maxY = Math.max(...all.map((p) => p.y));
  return { minX, minY, maxX, maxY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
};

const normalizeStrokes = (strokes: Point2D[][]): Point2D[][] => {
  const b = getBBox(strokes);
  return strokes.map((s) => s.map((p) => ({ x: (p.x - b.minX) / b.w, y: (p.y - b.minY) / b.h })));
};

const resampleStroke = (points: Point2D[], n: number): Point2D[] => {
  if (points.length === 0) return [];
  if (points.length === 1) return Array.from({ length: n }, () => ({ ...points[0] }));
  const dists = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    dists.push(dists[i - 1] + Math.hypot(dx, dy));
  }
  const total = dists[dists.length - 1] || 1;
  const out: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * total;
    let idx = 1;
    while (idx < dists.length && dists[idx] < t) idx++;
    const p1 = points[Math.max(0, idx - 1)];
    const p2 = points[Math.min(points.length - 1, idx)];
    const span = Math.max(1e-6, dists[Math.min(dists.length - 1, idx)] - dists[Math.max(0, idx - 1)]);
    const a = (t - dists[Math.max(0, idx - 1)]) / span;
    out.push({ x: p1.x + (p2.x - p1.x) * a, y: p1.y + (p2.y - p1.y) * a });
  }
  return out;
};

const dtwDistance = (a: Point2D[], b: Point2D[]): number => {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(Infinity));
  dp[0][0] = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = Math.hypot(a[i - 1].x - b[j - 1].x, a[i - 1].y - b[j - 1].y);
      dp[i][j] = cost + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[n][m] / (n + m);
};

const strokeCenter = (stroke: Point2D[]) => {
  const n = Math.max(1, stroke.length);
  const sx = stroke.reduce((sum, p) => sum + p.x, 0);
  const sy = stroke.reduce((sum, p) => sum + p.y, 0);
  return { x: sx / n, y: sy / n };
};

const directionScore = (a: Point2D[], b: Point2D[]) => {
  if (a.length < 2 || b.length < 2) return 0;
  const av = { x: a[a.length - 1].x - a[0].x, y: a[a.length - 1].y - a[0].y };
  const bv = { x: b[b.length - 1].x - b[0].x, y: b[b.length - 1].y - b[0].y };
  const dot = av.x * bv.x + av.y * bv.y;
  const mag = Math.max(1e-6, Math.hypot(av.x, av.y) * Math.hypot(bv.x, bv.y));
  const cos = dot / mag;
  return clamp(((cos + 1) / 2) * 100);
};

const bboxIoU = (a: Bounds, b: Bounds): number => {
  const left = Math.max(a.left, b.left);
  const right = Math.min(a.right, b.right);
  const top = Math.max(a.top, b.top);
  const bottom = Math.min(a.bottom, b.bottom);
  const inter = Math.max(0, right - left) * Math.max(0, bottom - top);
  const areaA = Math.max(0, a.right - a.left) * Math.max(0, a.bottom - a.top);
  const areaB = Math.max(0, b.right - b.left) * Math.max(0, b.bottom - b.top);
  const union = Math.max(1e-6, areaA + areaB - inter);
  return inter / union;
};

// ============================================================
// NEW GRADING SYSTEM: gradeCharacter
// Compares each stroke individually with proper thresholds
// ============================================================

interface StrokeGrade {
  strokeIndex: number;
  shapeScore: number;      // 0-100: shape similarity
  orderScore: number;     // 0-100: correct position in sequence
  directionScore: number; // 0-100: correct direction (not reversed)
  isValid: boolean;       // true if shape >= 40%
}

interface GradeResult {
  accuracy: number;           // Final score 0-100
  isCorrect: boolean;          // Pass if accuracy >= 50
  feedback: string;            // Human-readable feedback
  strokeGrades: StrokeGrade[]; // Per-stroke breakdown
  details: {
    shapeScore: number;       // Weighted shape (70%)
    orderScore: number;       // Weighted order (15%)
    directionScore: number;   // Weighted direction (10%)
    positionScore: number;    // Weighted position (5%)
  };
  issues: string[];           // List of specific issues
}

/**
 * Grade a single stroke: compare user stroke vs expected stroke
 * Uses DTW for shape similarity, direction comparison
 */
const gradeSingleStroke = (
  userStroke: Point2D[],
  expectedStroke: Point2D[],
  strokeIndex: number
): StrokeGrade => {
  // Step 1: Resample both strokes to same number of points (32)
  const userResampled = resampleStroke(userStroke, 32);
  const expectedResampled = resampleStroke(expectedStroke, 32);
  
  if (userResampled.length === 0 || expectedResampled.length === 0) {
    return {
      strokeIndex,
      shapeScore: 0,
      orderScore: 0,
      directionScore: 0,
      isValid: false,
    };
  }
  
  // Step 2: Normalize strokes (scale to 0-1)
  const userNorm = normalizeStrokes([userResampled])[0];
  const expectedNorm = normalizeStrokes([expectedResampled])[0];
  
  // Step 3: Calculate shape similarity using DTW
  // DTW gives distance, convert to similarity score
  const shapeDistance = dtwDistance(userNorm, expectedNorm);
  // Max reasonable distance is ~0.5, normalize to 0-100
  const shapeScore = clamp(100 * (1 - shapeDistance / 0.5));
  
  // Step 4: Calculate direction score
  // Compare start→end vectors
  const userStart = userNorm[0];
  const userEnd = userNorm[userNorm.length - 1];
  const expStart = expectedNorm[0];
  const expEnd = expectedNorm[expectedNorm.length - 1];
  
  const userVec = { x: userEnd.x - userStart.x, y: userEnd.y - userStart.y };
  const expVec = { x: expEnd.x - expStart.x, y: expEnd.y - expStart.y };
  
  const userMag = Math.hypot(userVec.x, userVec.y);
  const expMag = Math.hypot(expVec.x, expVec.y);
  
  let directionScore = 100;
  if (userMag > 0.01 && expMag > 0.01) {
    const dot = (userVec.x * expVec.x + userVec.y * expVec.y) / (userMag * expMag);
    // If dot < 0, direction is reversed
    directionScore = clamp(((dot + 1) / 2) * 100);
  }
  
  // Step 5: Order score (based on stroke center position)
  // This is calculated at character level, not per-stroke
  const orderScore = 100; // Will be calculated in gradeCharacter
  
  // Step 6: Apply threshold - if shape < 40%, stroke is invalid
  const isValid = shapeScore >= 40;
  
  return {
    strokeIndex,
    shapeScore: Math.round(shapeScore),
    orderScore,
    directionScore: Math.round(directionScore),
    isValid,
  };
};

/**
 * Calculate stroke order score by matching user strokes to expected positions
 */
const calculateOrderScore = (
  userStrokes: Point2D[][],
  expectedStrokes: Point2D[][]
): { orderScore: number; orderIssues: string[] } => {
  if (userStrokes.length !== expectedStrokes.length) {
    const countPenalty = Math.abs(userStrokes.length - expectedStrokes.length) * 15;
    return {
      orderScore: clamp(100 - countPenalty),
      orderIssues: [`Số nét không khớp: user=${userStrokes.length}, expected=${expectedStrokes.length}`],
    };
  }
  
  // Calculate center of each user stroke
  const userCenters = userStrokes.map(s => strokeCenter(s));
  const expectedCenters = expectedStrokes.map(s => strokeCenter(s));
  
  // Match each user stroke to closest expected stroke
  const matchedIndices: number[] = [];
  const orderIssues: string[] = [];
  
  userCenters.forEach((uc, userIdx) => {
    let bestMatch = -1;
    let minDist = Infinity;
    
    expectedCenters.forEach((ec, expIdx) => {
      if (!matchedIndices.includes(expIdx)) {
        const dist = Math.hypot(uc.x - ec.x, uc.y - ec.y);
        if (dist < minDist) {
          minDist = dist;
          bestMatch = expIdx;
        }
      }
    });
    
    matchedIndices.push(bestMatch);
    
    // If stroke is matched to wrong position
    if (bestMatch !== userIdx) {
      orderIssues.push(`Nét ${userIdx + 1} sai thứ tự (vị trí ${bestMatch + 1})`);
    }
  });
  
  // Calculate order score
  const correctPositions = matchedIndices.filter((idx, i) => idx === i).length;
  const orderScore = (correctPositions / userStrokes.length) * 100;
  
  return { orderScore, orderIssues };
};

/**
 * Main grading function: gradeCharacter
 * 
 * Algorithm:
 * 1. Group user strokes by strokeId
 * 2. Get expected template strokes
 * 3. For each expected stroke, find best matching user stroke
 * 4. Grade each stroke individually (shape, direction)
 * 5. Apply thresholds:
 *    - If single stroke shape < 40% → that stroke = 0
 *    - If average shape < 50% → total score = 0
 * 6. Calculate final score with weights:
 *    - 70% shape similarity
 *    - 15% stroke order
 *    - 10% stroke direction
 *    - 5% position
 * 7. Return detailed feedback
 */
const gradeCharacter = (
  userStrokes: StrokePoint[],
  korean: string,
  guideBounds?: Bounds
): GradeResult => {
  // Step 1: Group user strokes by strokeId
  const user = groupUserStrokes(userStrokes);
  const expected = composeTemplateStrokes(korean);
  
  console.log(`📊 Grading: userStrokes=${user.length}, expectedStrokes=${expected.length}`);
  
  // Validation: must have strokes
  if (user.length === 0 || expected.length === 0) {
    return {
      accuracy: 0,
      isCorrect: false,
      feedback: 'Không đủ dữ liệu nét để chấm điểm',
      strokeGrades: [],
      details: { shapeScore: 0, orderScore: 0, directionScore: 0, positionScore: 0 },
      issues: ['Không có dữ liệu nét'],
    };
  }
  
  // Step 2: Grade each stroke individually
  const strokeGrades: StrokeGrade[] = [];
  const shapeScores: number[] = [];
  const directionScores: number[] = [];
  const issues: string[] = [];
  
  // Match each expected stroke to best user stroke
  expected.forEach((expStroke, expIdx) => {
    // Find best matching user stroke
    let bestMatchIdx = -1;
    let bestScore = -1;
    
    user.forEach((userStroke, userIdx) => {
      const grade = gradeSingleStroke(userStroke, expStroke, expIdx);
      if (grade.shapeScore > bestScore) {
        bestScore = grade.shapeScore;
        bestMatchIdx = userIdx;
      }
    });
    
    if (bestMatchIdx >= 0) {
      const grade = gradeSingleStroke(user[bestMatchIdx], expStroke, expIdx);
      strokeGrades.push(grade);
      shapeScores.push(grade.shapeScore);
      directionScores.push(grade.directionScore);
      
      // Add issues for invalid strokes
      if (!grade.isValid) {
        issues.push(`Nét ${expIdx + 1}: hình dạng không đúng (${grade.shapeScore}%)`);
      }
      if (grade.directionScore < 50) {
        issues.push(`Nét ${expIdx + 1}: vẽ ngược hướng (${grade.directionScore}%)`);
      }
    } else {
      // Missing stroke
      strokeGrades.push({
        strokeIndex: expIdx,
        shapeScore: 0,
        orderScore: 0,
        directionScore: 0,
        isValid: false,
      });
      shapeScores.push(0);
      directionScores.push(0);
      issues.push(`Nét ${expIdx + 1}: thiếu nét`);
    }
  });
  
  // Step 3: Calculate average scores
  const avgShape = shapeScores.reduce((a, b) => a + b, 0) / Math.max(1, shapeScores.length);
  const avgDirection = directionScores.reduce((a, b) => a + b, 0) / Math.max(1, directionScores.length);
  
  // Step 4: Calculate stroke order score
  const { orderScore, orderIssues } = calculateOrderScore(user, expected);
  issues.push(...orderIssues);
  
  // Step 5: Calculate position score (bounding box overlap)
  let positionScore = 100;
  if (guideBounds) {
    const userBox = getBBox(user);
    const userBounds: Bounds = {
      left: userBox.minX,
      right: userBox.maxX,
      top: userBox.minY,
      bottom: userBox.maxY,
    };
    positionScore = clamp(bboxIoU(userBounds, guideBounds) * 100);
  }
  
  // Step 6: Apply thresholds
  // Threshold 1: If average shape < 50%, total score = 0
  const shapeThreshold = 50;
  const directionThreshold = 30;
  
  let finalShape = avgShape;
  let finalDirection = avgDirection;
  
  if (avgShape < shapeThreshold) {
    issues.unshift(`Hình dạng quá kém (${Math.round(avgShape)}% < ${shapeThreshold}%)`);
    finalShape = 0; // Apply threshold
  }
  
  if (avgDirection < directionThreshold) {
    issues.push(`Hướng nét sai nhiều (${Math.round(avgDirection)}% < ${directionThreshold}%)`);
    finalDirection = 0;
  }
  
  // Step 7: Calculate final score with weights
  // Score = 0.7 * shape + 0.15 * order + 0.1 * direction + 0.05 * position
  const weightedShape = finalShape * 0.7;
  const weightedOrder = orderScore * 0.15;
  const weightedDirection = finalDirection * 0.1;
  const weightedPosition = positionScore * 0.05;
  
  const accuracy = clamp(Math.round(weightedShape + weightedOrder + weightedDirection + weightedPosition));
  const isCorrect = accuracy >= 50;
  
  // Step 8: Generate feedback
  let feedback = '';
  if (accuracy === 0) {
    feedback = 'Viết chưa đúng, cần luyện thêm';
  } else if (accuracy < 40) {
    feedback = 'Hình dạng chưa đúng, cần viết chuẩn hơn';
  } else if (accuracy < 60) {
    feedback = 'Viết được nhưng cần chú ý thứ tự và hướng nét';
  } else if (accuracy < 80) {
    feedback = 'Viết tốt, còn một vài nét chưa chuẩn';
  } else {
    feedback = 'Viết rất tốt!';
  }
  
  // Add specific feedback about issues
  if (issues.length > 0 && accuracy < 70) {
    feedback += ' ' + issues.slice(0, 2).join(', ');
  }
  
  console.log(`📊 Grade result: shape=${Math.round(finalShape)}%, order=${Math.round(orderScore)}%, direction=${Math.round(finalDirection)}%, position=${Math.round(positionScore)}% → accuracy=${accuracy}%`);
  
  return {
    accuracy,
    isCorrect,
    feedback,
    strokeGrades,
    details: {
      shapeScore: Math.round(finalShape),
      orderScore: Math.round(orderScore),
      directionScore: Math.round(finalDirection),
      positionScore: Math.round(positionScore),
    },
    issues,
  };
};

// Keep old function for backward compatibility but use new grading
const evaluateWithGeometry = (params: { korean: string; strokes: StrokePoint[]; guideBounds?: Bounds }) => {
  const result = gradeCharacter(params.strokes, params.korean, params.guideBounds);
  
  return {
    accuracy: result.accuracy,
    feedback: result.feedback,
    details: result.details,
  };
};

/**
 * Pixel-based fallback: analyzes canvas PNG to count non-background ink pixels.
 * Canvas has white background + light gray grid. Ink = dark pixels.
 */
const evaluateWithPixels = async (imageBase64: string): Promise<{ accuracy: number; feedback: string }> => {
  try {
    const buf = Buffer.from(imageBase64, 'base64');
    const image = await Jimp.read(buf);
    const width = image.width;
    const height = image.height;
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

    const { imageBase64, korean, romanization, meaning = '', topicId, strokes, guideBounds } = req.body;

    if (!imageBase64 || !korean) {
      return res.status(400).json({ error: 'Missing imageBase64 or korean' });
    }

    // Strip data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    console.log(`🖊️ Evaluating writing for "${korean}" — image size: ${base64Data.length} chars`);

    // ===== VALIDATION: Check minimum stroke groups =====
    // Each Korean character = 1 stroke group minimum
    // If user has fewer stroke groups than expected, reject or heavily penalize
    let userStrokeGroups = 0;
    if (Array.isArray(strokes) && strokes.length > 0) {
      // Count unique stroke IDs to get number of stroke groups
      const strokeIds = new Set(strokes.map((s: StrokePoint) => s.strokeId));
      userStrokeGroups = strokeIds.size;
    }
    
    // Get expected minimum stroke groups for this character
    const expectedTemplate = composeTemplateStrokes(korean);
    const expectedStrokeGroups = expectedTemplate.length;
    
    // Validation threshold: user must have at least 50% of expected strokes
    const minRequiredGroups = Math.max(1, Math.ceil(expectedStrokeGroups * 0.5));
    
    console.log(`📊 Stroke validation: user=${userStrokeGroups}, expected=${expectedStrokeGroups}, min required=${minRequiredGroups}`);
    
    // If user has too few stroke groups, reject with score 0
    if (userStrokeGroups > 0 && userStrokeGroups < minRequiredGroups) {
      return res.json({
        score: 0,
        accuracy: 0,
        feedback: `Chưa viết đủ nét (${userStrokeGroups}/${expectedStrokeGroups} nhóm nét). Vui lòng viết đầy đủ ký tự.`,
        error: 'Chưa viết đủ chữ',
        isCorrect: false,
        xp: 0,
        method: 'validation',
        success: false,
        strokeValidation: {
          userGroups: userStrokeGroups,
          expectedGroups: expectedStrokeGroups,
          minRequired: minRequiredGroups,
        }
      });
    }
    // ===== END VALIDATION =====

    let accuracy: number;
    let feedback: string;
    let method: string;
    let gradeDetails: any = null;
    let issues: string[] = [];
    
    if (Array.isArray(strokes) && strokes.length > 0) {
      // Use new gradeCharacter function
      const gradeResult = gradeCharacter(
        strokes as StrokePoint[], 
        korean, 
        guideBounds as Bounds | undefined
      );
      accuracy = gradeResult.accuracy;
      feedback = gradeResult.feedback;
      method = 'geometry';
      gradeDetails = gradeResult.details;
      issues = gradeResult.issues;
      console.log(`📐 Geometry writing score: "${korean}" → ${accuracy}%`);
    } else {
      const geminiResult = await evaluateWritingWithGemini({
        imageBase64: base64Data,
        korean,
        romanization: romanization || '',
        meaning,
      });
      if (geminiResult.success) {
        accuracy = geminiResult.accuracy;
        feedback = geminiResult.feedback;
        method = 'gemini';
      } else {
        const pixelResult = await evaluateWithPixels(base64Data);
        accuracy = pixelResult.accuracy;
        feedback = pixelResult.feedback;
        method = 'pixel';
      }
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

    res.json({ 
      accuracy, 
      feedback, 
      isCorrect, 
      xp, 
      method, 
      success: true,
      strokeValidation: {
        userGroups: userStrokeGroups,
        expectedGroups: expectedStrokeGroups,
        minRequired: minRequiredGroups,
      },
      // New detailed grading info
      details: gradeDetails,
      issues: issues.length > 0 ? issues : undefined,
    });
  } catch (error) {
    console.error('❌ Writing scoring error:', error);
    res.status(500).json({ error: 'Failed to score writing' });
  }
});

export default router;
