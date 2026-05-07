/**
 * Kiến trúc chấm điểm luyện viết (2 tầng)
 * ----------------------------------------
 * Tầng 1 — HARD (fail ngay, score = 0):
 *   - Sai số nét so với template (`gradeCharacter`)
 *   - Nét quá ít điểm / quá ngắn / dữ liệu không hợp lệ
 *   - Hình dạng lệch nặng (DTW + ngưỡng shape)
 * Tầng 2 — SOFT (0..1 → trọng số trong điểm tổng):
 *   - Độ giống shape (DTW trên nét đã chuẩn hóa + resample)
 *   - Thứ tự / khớp nét (`checkOrder`)
 *   - Hướng nét (`checkDirection` — cosine vector đầu–cuối)
 *   - Vị trí tương đối (`positionScore`)
 *
 * API: `POST /api/writing/score-word` (cả từ, loose) · `POST /api/writing/grade` (một ký tự, strict)
 */
export interface StrokePointInput {
  x: number;
  y: number;
  t?: number;
}

export type Stroke = StrokePointInput[];
export type CharacterInput = { strokes: Stroke[] };

export interface GradeDetail {
  shape: number;     // 0..1
  order: number;     // 0..1
  direction: number; // 0..1
  position: number;  // 0..1
}

export interface GradeResponse {
  score: number; // 0..100
  detail?: GradeDetail;
  feedback?: string;
  error?: string;
  /** Nếu score = 0 vì luật cứng */
  failLayer?: 'hard';
}

export interface GradeProgressResponse extends GradeResponse {
  expectedCharacterCount: number;
  completedCharacterCount: number;
  characterScores: Array<{ index: number; score: number; error?: string; detail?: GradeDetail }>;
  breakdown?: {
    coverage: number; // 0..1
    extraPenalty: number; // 0..1
  };
}

interface Point2D {
  x: number;
  y: number;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// ===== Template generation (reuse JAMO_PATHS logic) =====
const CHOSEONG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JUNGSEONG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const JONGSEONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

const COMPOUND_JAMO: Record<string, string[]> = {
  'ㄲ': ['ㄱ', 'ㄱ'], 'ㄸ': ['ㄷ', 'ㄷ'], 'ㅃ': ['ㅂ', 'ㅂ'], 'ㅆ': ['ㅅ', 'ㅅ'], 'ㅉ': ['ㅈ', 'ㅈ'],
  'ㄳ': ['ㄱ', 'ㅅ'], 'ㄵ': ['ㄴ', 'ㅈ'], 'ㄶ': ['ㄴ', 'ㅎ'], 'ㄺ': ['ㄹ', 'ㄱ'], 'ㄻ': ['ㄹ', 'ㅁ'],
  'ㄼ': ['ㄹ', 'ㅂ'], 'ㄽ': ['ㄹ', 'ㅅ'], 'ㄾ': ['ㄹ', 'ㅌ'], 'ㄿ': ['ㄹ', 'ㅍ'], 'ㅀ': ['ㄹ', 'ㅎ'], 'ㅄ': ['ㅂ', 'ㅅ'],
};

const VERTICAL_VOWELS = new Set(['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅣ']);

// Same set as scoring.ts; kept here for a clean module boundary.
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
  // circle arc path "A"
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

export const composeTemplateStrokesForChar = (char: string): Point2D[][] => {
  const d = decomposeHangul(char);
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

export const composeTemplateCharactersForWord = (word: string): Point2D[][][] =>
  Array.from(word).map((ch) => composeTemplateStrokesForChar(ch));

// ===== Geometry helpers =====
const getBBox = (stroke: Point2D[]) => {
  const minX = Math.min(...stroke.map((p) => p.x));
  const minY = Math.min(...stroke.map((p) => p.y));
  const maxX = Math.max(...stroke.map((p) => p.x));
  const maxY = Math.max(...stroke.map((p) => p.y));
  return { minX, minY, maxX, maxY, w: Math.max(1e-6, maxX - minX), h: Math.max(1e-6, maxY - minY) };
};

export const normalizeStroke = (stroke: Point2D[]): Point2D[] => {
  const b = getBBox(stroke);
  return stroke.map((p) => ({ x: (p.x - b.minX) / b.w, y: (p.y - b.minY) / b.h }));
};

/** Chiều chủ đạo của nét (đầu → cuối), dùng so khớp hoặc debug. */
export type CardinalDirection = 'up' | 'down' | 'left' | 'right';

export function getStrokeDirectionLabel(stroke: Point2D[]): CardinalDirection | null {
  if (stroke.length < 2) return null;
  const start = stroke[0];
  const end = stroke[stroke.length - 1];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

function polylineLength(stroke: Point2D[]): number {
  let L = 0;
  for (let i = 1; i < stroke.length; i++) {
    L += Math.hypot(stroke[i].x - stroke[i - 1].x, stroke[i].y - stroke[i - 1].y);
  }
  return L;
}

export const resampleStroke = (points: Point2D[], n: number): Point2D[] => {
  if (points.length === 0) return [];
  if (points.length === 1) return Array.from({ length: n }, () => ({ ...points[0] }));
  const dists = [0];
  for (let i = 1; i < points.length; i++) {
    dists.push(dists[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const total = dists[dists.length - 1] || 1;
  const out: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * total;
    let idx = 1;
    while (idx < dists.length && dists[idx] < t) idx++;
    const i0 = Math.max(0, idx - 1);
    const i1 = Math.min(points.length - 1, idx);
    const p0 = points[i0];
    const p1 = points[i1];
    const span = Math.max(1e-6, dists[i1] - dists[i0]);
    const a = (t - dists[i0]) / span;
    out.push({ x: p0.x + (p1.x - p0.x) * a, y: p0.y + (p1.y - p0.y) * a });
  }
  return out;
};

// Dynamic time warping distance normalized
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

export const compareShape = (userStroke: Point2D[], templateStroke: Point2D[]): number => {
  const u = resampleStroke(normalizeStroke(userStroke), 32);
  const t = resampleStroke(normalizeStroke(templateStroke), 32);
  const dist = dtwDistance(u, t);
  // dist ~ [0..0.5+] → similarity in [0..1]
  return clamp01(1 - dist / 0.5);
};

export const checkDirection = (userStroke: Point2D[], templateStroke: Point2D[]): number => {
  if (userStroke.length < 2 || templateStroke.length < 2) return 0;
  const u0 = userStroke[0];
  const u1 = userStroke[userStroke.length - 1];
  const t0 = templateStroke[0];
  const t1 = templateStroke[templateStroke.length - 1];
  const uvx = u1.x - u0.x;
  const uvy = u1.y - u0.y;
  const tvx = t1.x - t0.x;
  const tvy = t1.y - t0.y;
  const mag = Math.max(1e-6, Math.hypot(uvx, uvy) * Math.hypot(tvx, tvy));
  const cos = (uvx * tvx + uvy * tvy) / mag;
  return clamp01((cos + 1) / 2);
};

export const checkOrder = (userStrokes: Point2D[][], templateStrokes: Point2D[][]): number => {
  // Strict: we already validate count equality. Here just score.
  let correct = 0;
  for (let i = 0; i < userStrokes.length; i++) {
    const u = userStrokes[i];
    const t = templateStrokes[i];
    const s = compareShape(u, t);
    if (s >= 0.4) correct++;
  }
  return correct / Math.max(1, userStrokes.length);
};

const strokeCenter = (stroke: Point2D[]) => {
  const n = Math.max(1, stroke.length);
  const sx = stroke.reduce((sum, p) => sum + p.x, 0);
  const sy = stroke.reduce((sum, p) => sum + p.y, 0);
  return { x: sx / n, y: sy / n };
};

const positionScore = (userStrokes: Point2D[][], templateStrokes: Point2D[][]): number => {
  // Compare average center displacement after normalization (loose, 0..1).
  const uCenters = userStrokes.map(strokeCenter);
  const tCenters = templateStrokes.map(strokeCenter);
  const n = Math.min(uCenters.length, tCenters.length);
  if (n === 0) return 0;
  let dist = 0;
  for (let i = 0; i < n; i++) {
    const dx = uCenters[i].x - tCenters[i].x;
    const dy = uCenters[i].y - tCenters[i].y;
    dist += Math.hypot(dx, dy);
  }
  dist /= n;
  return clamp01(1 - dist / 0.75);
};

// ===== Public grading APIs =====

/** Độ dài tối thiểu (pixel canvas) — loại “chấm một điểm” / nét quá ngắn */
const MIN_STROKE_PIXEL_LENGTH = 28;

export const gradeCharacter = (userStrokesRaw: Stroke[], templateStrokes: Point2D[][]): GradeResponse => {
  // Validate strokes count strictly
  if (userStrokesRaw.length !== templateStrokes.length) {
    return { score: 0, error: 'Sai số nét trong ký tự', failLayer: 'hard' };
  }

  // Validate each stroke points
  const MIN_POINTS = 5;
  for (const stroke of userStrokesRaw) {
    if (!Array.isArray(stroke) || stroke.length < MIN_POINTS) {
      return { score: 0, error: 'Nét không hợp lệ', failLayer: 'hard' };
    }
    for (const p of stroke) {
      if (!p || typeof p.x !== 'number' || typeof p.y !== 'number' || Number.isNaN(p.x) || Number.isNaN(p.y)) {
        return { score: 0, error: 'Dữ liệu nét không hợp lệ', failLayer: 'hard' };
      }
    }
  }

  const userStrokes: Point2D[][] = userStrokesRaw.map((s) => s.map((p) => ({ x: p.x, y: p.y })));

  for (const stroke of userStrokes) {
    if (polylineLength(stroke) < MIN_STROKE_PIXEL_LENGTH) {
      return { score: 0, error: 'Nét quá ngắn', failLayer: 'hard' };
    }
  }

  // HARD: hướng chủ đạo lệch hoàn toàn so với template (chỉ khi nét gần như ngang hoặc dọc thuần)
  for (let i = 0; i < userStrokes.length; i++) {
    const u = userStrokes[i];
    const t = templateStrokes[i];
    const du = getStrokeDirectionLabel(u);
    const dt = getStrokeDirectionLabel(t);
    if (du && dt && du !== dt) {
      const ratio =
        Math.abs(u[u.length - 1].x - u[0].x) / Math.max(1e-6, Math.abs(u[u.length - 1].y - u[0].y));
      const nearlyAxisAligned = ratio > 2.5 || ratio < 0.4;
      if (nearlyAxisAligned) {
        return { score: 0, error: 'Sai hướng nét', failLayer: 'hard' };
      }
    }
  }

  // Shape similarity per stroke
  const strokeSimilarities = userStrokes.map((u, i) => compareShape(u, templateStrokes[i]));
  const minStrokeSim = Math.min(...strokeSimilarities);
  if (minStrokeSim < 0.4) {
    return { score: 0, error: 'Nét sai hoàn toàn', failLayer: 'hard' };
  }
  const avgShape = strokeSimilarities.reduce((a, b) => a + b, 0) / strokeSimilarities.length;
  if (avgShape < 0.5) {
    return { score: 0, error: 'Hình dạng chữ không đúng', failLayer: 'hard' };
  }

  const dir = userStrokes.map((u, i) => checkDirection(u, templateStrokes[i]));
  const avgDir = dir.reduce((a, b) => a + b, 0) / dir.length;

  const order = checkOrder(userStrokes, templateStrokes);
  const pos = positionScore(userStrokes.map((s) => normalizeStroke(s)), templateStrokes.map((s) => normalizeStroke(s)));

  const score01 =
    0.7 * avgShape +
    0.15 * order +
    0.1 * avgDir +
    0.05 * pos;

  const score = Math.round(clamp01(score01) * 100);
  return {
    score,
    detail: { shape: avgShape, order, direction: avgDir, position: pos },
    feedback: score >= 80 ? 'Viết tốt' : score >= 60 ? 'Khá ổn' : 'Cần luyện thêm',
  };
};

export const gradeWord = (userCharacters: CharacterInput[], templateCharacters: Point2D[][][]): GradeResponse => {
  if (userCharacters.length !== templateCharacters.length) {
    return { score: 0, error: 'Chưa viết đủ số chữ' };
  }

  const characterScores: number[] = [];
  let avgDetail: GradeDetail | undefined;

  for (let i = 0; i < templateCharacters.length; i++) {
    const userChar = userCharacters[i];
    const tplChar = templateCharacters[i];
    const r = gradeCharacter(userChar?.strokes || [], tplChar);
    if (r.score === 0) {
      return { score: 0, error: 'Có ký tự viết sai hoàn toàn' };
    }
    characterScores.push(r.score);
    if (r.detail) {
      if (!avgDetail) avgDetail = { ...r.detail };
      else {
        avgDetail.shape += r.detail.shape;
        avgDetail.order += r.detail.order;
        avgDetail.direction += r.detail.direction;
        avgDetail.position += r.detail.position;
      }
    }
  }

  const score = Math.round(characterScores.reduce((a, b) => a + b, 0) / characterScores.length);
  if (avgDetail) {
    const n = templateCharacters.length;
    avgDetail = {
      shape: avgDetail.shape / n,
      order: avgDetail.order / n,
      direction: avgDetail.direction / n,
      position: avgDetail.position / n,
    };
  }

  return {
    score,
    detail: avgDetail,
    feedback: score >= 80 ? 'Từ viết tốt' : score >= 60 ? 'Từ khá ổn' : 'Từ cần luyện thêm',
  };
};

/**
 * Partial grading:
 * - Only grade characters that are "completed" (strokeCount matches template and strokes valid).
 * - If a completed character fails strict grading → that character contributes 0 and is marked error.
 * - If no character completed yet → score = 0 but NOT an error (still in-progress).
 */
export const gradeWordPartial = (
  userCharacters: CharacterInput[],
  templateCharacters: Point2D[][][]
): GradeProgressResponse => {
  const expectedCharacterCount = templateCharacters.length;
  const characterScores: Array<{ index: number; score: number; error?: string }> = [];

  let completedCharacterCount = 0;
  let sumScore = 0;

  let aggDetail: GradeDetail | undefined;
  const addDetail = (d: GradeDetail) => {
    if (!aggDetail) aggDetail = { ...d };
    else {
      aggDetail.shape += d.shape;
      aggDetail.order += d.order;
      aggDetail.direction += d.direction;
      aggDetail.position += d.position;
    }
  };

  for (let i = 0; i < expectedCharacterCount; i++) {
    const tpl = templateCharacters[i] || [];
    const user = userCharacters[i]?.strokes || [];

    // Not started
    if (!user || user.length === 0) continue;

    // Not completed yet → skip grading
    if (user.length !== tpl.length) {
      continue;
    }

    const r = gradeCharacter(user, tpl);
    completedCharacterCount++;
    if (r.score === 0) {
      characterScores.push({ index: i, score: 0, error: r.error || 'Sai ký tự' });
      // Fail-fast? In partial mode, we still keep it 0 but allow seeing progress.
      continue;
    }

    characterScores.push({ index: i, score: r.score });
    sumScore += r.score;
    if (r.detail) addDetail(r.detail);
  }

  if (completedCharacterCount === 0) {
    return {
      score: 0,
      expectedCharacterCount,
      completedCharacterCount: 0,
      characterScores: [],
      feedback: 'Chưa viết đủ một chữ để chấm',
    };
  }

  const score = Math.round(sumScore / Math.max(1, characterScores.filter((c) => c.error == null).length || completedCharacterCount));

  let detail = aggDetail;
  if (detail) {
    const n = characterScores.filter((c) => c.error == null).length || completedCharacterCount;
    detail = {
      shape: detail.shape / n,
      order: detail.order / n,
      direction: detail.direction / n,
      position: detail.position / n,
    };
  }

  const feedback =
    completedCharacterCount === expectedCharacterCount
      ? (score >= 80 ? 'Từ viết tốt' : score >= 60 ? 'Từ khá ổn' : 'Từ cần luyện thêm')
      : `Đã chấm ${completedCharacterCount}/${expectedCharacterCount} chữ`;

  return {
    score,
    expectedCharacterCount,
    completedCharacterCount,
    characterScores,
    detail,
    feedback,
  };
};

// ============================================================
// LOOSE GRADING (stroke-count not required)
// ============================================================

const MIN_POINTS = 5;

const validateLooseStrokes = (userStrokesRaw: Stroke[]): { ok: boolean; error?: string } => {
  for (const stroke of userStrokesRaw) {
    if (!Array.isArray(stroke) || stroke.length < MIN_POINTS) {
      return { ok: false, error: 'Nét không hợp lệ' };
    }
    for (const p of stroke) {
      if (!p || typeof p.x !== 'number' || typeof p.y !== 'number' || Number.isNaN(p.x) || Number.isNaN(p.y)) {
        return { ok: false, error: 'Dữ liệu nét không hợp lệ' };
      }
    }
  }
  return { ok: true };
};

/**
 * gradeCharacterLoose:
 * - Does NOT require user stroke count == template stroke count
 * - Matches each template stroke to the best user stroke (greedy) and measures similarity
 * - Penalizes missing coverage, extra strokes, and wrong directions
 * - Still fail-fast if the drawn strokes are wildly off (avg matched shape too low)
 */
export const gradeCharacterLoose = (userStrokesRaw: Stroke[], templateStrokes: Point2D[][]): GradeResponse => {
  if (!Array.isArray(userStrokesRaw) || userStrokesRaw.length === 0) {
    return { score: 0, error: 'Chưa viết chữ' };
  }
  const v = validateLooseStrokes(userStrokesRaw);
  if (!v.ok) return { score: 0, error: v.error };

  const userStrokes: Point2D[][] = userStrokesRaw.map((s) => s.map((p) => ({ x: p.x, y: p.y })));

  // Similarity matrix [template][user]
  const sim: number[][] = templateStrokes.map((tpl) => userStrokes.map((u) => compareShape(u, tpl)));

  // Greedy matching: for each template stroke, pick the best remaining user stroke
  const usedUser = new Set<number>();
  const matchedSims: number[] = [];
  const matchedDirs: number[] = [];

  for (let i = 0; i < templateStrokes.length; i++) {
    let bestJ = -1;
    let best = -1;
    for (let j = 0; j < userStrokes.length; j++) {
      if (usedUser.has(j)) continue;
      if (sim[i][j] > best) {
        best = sim[i][j];
        bestJ = j;
      }
    }
    // Only count as matched if similarity is non-trivial
    if (bestJ >= 0 && best >= 0.25) {
      usedUser.add(bestJ);
      matchedSims.push(best);
      matchedDirs.push(checkDirection(userStrokes[bestJ], templateStrokes[i]));
    }
  }

  const coverage = matchedSims.length / Math.max(1, templateStrokes.length); // 0..1
  const avgMatchedShape = matchedSims.length ? matchedSims.reduce((a, b) => a + b, 0) / matchedSims.length : 0;
  const avgDir = matchedDirs.length ? matchedDirs.reduce((a, b) => a + b, 0) / matchedDirs.length : 0;

  // Fail-fast for seriously wrong drawings (user drew something else)
  if (coverage < 0.25 || avgMatchedShape < 0.35) {
    return { score: 0, error: 'Hình dạng chữ không đúng' };
  }

  const extraPenalty = Math.max(0, (userStrokes.length - matchedSims.length) / Math.max(1, templateStrokes.length));
  const order = checkOrder(userStrokes.slice(0, templateStrokes.length), templateStrokes); // best-effort
  const pos = positionScore(userStrokes.map((s) => normalizeStroke(s)), templateStrokes.map((s) => normalizeStroke(s)));

  // If user writes far away from the template region, give 0.
  // This prevents getting points by scribbling elsewhere on the canvas.
  if (pos < 0.2) {
    return { score: 0, error: 'Viết ngoài vùng chữ' };
  }

  // Shape base includes coverage so missing strokes reduces score naturally
  const shape = clamp01(avgMatchedShape * (0.6 + 0.4 * coverage));
  const direction = clamp01(avgDir);
  const position = clamp01(pos);
  const orderScore = clamp01(order);

  let score01 = 0.7 * shape + 0.1 * direction + 0.1 * position + 0.1 * orderScore;
  score01 = clamp01(score01 - 0.15 * extraPenalty);

  const score = Math.round(score01 * 100);
  return {
    score,
    detail: { shape, order: orderScore, direction, position },
    feedback: score >= 80 ? 'Khá chuẩn' : score >= 60 ? 'Tạm ổn' : 'Chưa giống lắm',
  };
};

/**
 * gradeWordPartialLoose:
 * - Count a character as "written" if it has at least 1 valid stroke (>= MIN_POINTS).
 * - Score is the average of scored written characters.
 */
export const gradeWordPartialLoose = (
  userCharacters: CharacterInput[],
  templateCharacters: Point2D[][][]
): GradeProgressResponse => {
  const expectedCharacterCount = templateCharacters.length;
  const characterScores: Array<{ index: number; score: number; error?: string; detail?: GradeDetail }> = [];

  let completedCharacterCount = 0; // here means "written"
  let sum = 0;
  let count = 0;

  let aggDetail: GradeDetail | undefined;
  const addDetail = (d: GradeDetail) => {
    if (!aggDetail) aggDetail = { ...d };
    else {
      aggDetail.shape += d.shape;
      aggDetail.order += d.order;
      aggDetail.direction += d.direction;
      aggDetail.position += d.position;
    }
  };

  for (let i = 0; i < expectedCharacterCount; i++) {
    const tpl = templateCharacters[i] || [];
    const user = userCharacters[i]?.strokes || [];
    const hasAnyValidStroke = Array.isArray(user) && user.some((s) => Array.isArray(s) && s.length >= MIN_POINTS);
    if (!hasAnyValidStroke) continue;

    completedCharacterCount++;
    const r = gradeCharacterLoose(user, tpl);
    if (r.score === 0) {
      characterScores.push({ index: i, score: 0, error: r.error || 'Chữ chưa đúng', detail: r.detail });
      sum += 0;
      count += 1;
      continue;
    }
    characterScores.push({ index: i, score: r.score, detail: r.detail });
    sum += r.score;
    count += 1;
    if (r.detail) addDetail(r.detail);
  }

  if (completedCharacterCount === 0) {
    return {
      score: 0,
      expectedCharacterCount,
      completedCharacterCount: 0,
      characterScores: [],
      feedback: 'Chưa viết chữ nào',
    };
  }

  const score = Math.round(sum / Math.max(1, count));
  let detail = aggDetail;
  if (detail) {
    detail = {
      shape: detail.shape / count,
      order: detail.order / count,
      direction: detail.direction / count,
      position: detail.position / count,
    };
  }

  return {
    score,
    expectedCharacterCount,
    completedCharacterCount,
    characterScores,
    detail,
    breakdown: {
      coverage: completedCharacterCount / Math.max(1, expectedCharacterCount),
      extraPenalty: 0,
    },
    feedback: `Đã chấm ${completedCharacterCount}/${expectedCharacterCount} chữ`,
  };
};

