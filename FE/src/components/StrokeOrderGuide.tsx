'use client';

import { useEffect, useRef, useState } from 'react';

// ============================================================
// Colors – one per stroke (rainbow sequence)
// ============================================================
const STROKE_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
  '#1abc9c', '#3498db', '#9b59b6', '#e91e63',
  '#00b894', '#fd79a8',
];

interface StrokeInfo {
  path: string;
  color: string;
  number: number;
}

// ============================================================
// ============================================================
// SVG stroke paths — standalone jamo, viewBox 0 0 100 100
//
// Rules applied:
//   • Horizontal before vertical; top→bottom; left→right
//   • Each M…L/A segment = one pen-down stroke
//   • All strokes together form the EXACT visual shape of the jamo
//
// KEY distinctions:
//   ㅗ : wide horizontal at y≈55 (lower) + short tick ↓  (⊥-like shape)
//   ㅜ : wide horizontal at y≈28 (upper) + long  tick ↓  (T-like shape)
//   ㅏ : center vertical + right tick →
//   ㅓ : center vertical + left  tick ←
//   ㄹ : 5 straight strokes (no curves) forming a Z double-box
// ============================================================
const JAMO_PATHS: Record<string, string[]> = {

  // ── CONSONANTS ──────────────────────────────────────────

  // ㄱ ┐  stroke1: horizontal →   stroke2: vertical ↓ from right end
  'ㄱ': [
    'M 14,24 L 80,24',
    'M 80,24 L 80,82',
  ],

  // ㄲ  two ㄱ side-by-side
  'ㄲ': [
    'M 5,24 L 38,24',  'M 38,24 L 38,80',
    'M 50,24 L 88,24', 'M 88,24 L 88,80',
  ],

  // ㄴ └  stroke1: vertical ↓   stroke2: horizontal → at bottom
  'ㄴ': [
    'M 20,14 L 20,82',
    'M 20,82 L 84,82',
  ],

  // ㄷ ∐  top → / left ↓ / bottom →
  'ㄷ': [
    'M 14,18 L 84,18',
    'M 14,18 L 14,82',
    'M 14,82 L 84,82',
  ],

  // ㄸ  two ㄷ side-by-side
  'ㄸ': [
    'M 4,18 L 44,18',  'M 4,18 L 4,82',   'M 4,82 L 44,82',
    'M 54,18 L 94,18', 'M 54,18 L 54,82', 'M 54,82 L 94,82',
  ],

  // ㄹ  5 straight strokes: top→ / upper-left↓ / mid→ / lower-right↓ / bottom→
  'ㄹ': [
    'M 14,16 L 84,16',
    'M 14,16 L 14,50',
    'M 14,50 L 84,50',
    'M 84,50 L 84,74',
    'M 14,74 L 84,74',
  ],

  // ㅁ □  top→ / left↓ / right↓ / bottom→
  'ㅁ': [
    'M 18,18 L 82,18',
    'M 18,18 L 18,82',
    'M 82,18 L 82,82',
    'M 18,82 L 82,82',
  ],

  // ㅂ  left↓ / right↓ / middle→ / top→ / bottom→
  'ㅂ': [
    'M 20,18 L 20,82',
    'M 80,18 L 80,82',
    'M 20,50 L 80,50',
    'M 20,18 L 80,18',
    'M 20,82 L 80,82',
  ],

  // ㅃ  two ㅂ
  'ㅃ': [
    'M 6,18 L 6,82',   'M 42,18 L 42,82', 'M 6,50 L 42,50',  'M 6,18 L 42,18',  'M 6,82 L 42,82',
    'M 54,18 L 54,82', 'M 92,18 L 92,82', 'M 54,50 L 92,50', 'M 54,18 L 92,18', 'M 54,82 L 92,82',
  ],

  // ㅅ  two diagonals from top-center ↙ ↘
  'ㅅ': [
    'M 50,12 L 15,84',
    'M 50,12 L 85,84',
  ],

  // ㅆ  two ㅅ
  'ㅆ': [
    'M 28,12 L 5,84',  'M 28,12 L 46,84',
    'M 68,12 L 50,84', 'M 68,12 L 92,84',
  ],

  // ㅇ  circle — center (50,50) r=32, clockwise full arc
  'ㅇ': [
    'M 50,18 A 32,32 0 1,1 49.9,18',
  ],

  // ㅈ  horizontal bar → / left diagonal ↙ / right diagonal ↘
  'ㅈ': [
    'M 14,26 L 86,26',
    'M 50,26 L 15,84',
    'M 50,26 L 85,84',
  ],

  // ㅉ  two ㅈ
  'ㅉ': [
    'M 5,26 L 44,26',  'M 24,26 L 5,84',  'M 24,26 L 44,84',
    'M 54,26 L 93,26', 'M 73,26 L 54,84', 'M 73,26 L 93,84',
  ],

  // ㅊ  small dash on top + ㅈ
  'ㅊ': [
    'M 44,8 L 56,8',
    'M 14,26 L 86,26',
    'M 50,26 L 15,84',
    'M 50,26 L 85,84',
  ],

  // ㅋ  top→ / middle→ (shorter, ends at kink point) / right↓
  'ㅋ': [
    'M 14,22 L 82,22',
    'M 14,52 L 72,52',
    'M 72,22 L 72,82',
  ],

  // ㅌ  top→ / left↓ / middle→ / bottom→
  'ㅌ': [
    'M 14,18 L 84,18',
    'M 14,18 L 14,82',
    'M 14,50 L 84,50',
    'M 14,82 L 84,82',
  ],

  // ㅍ  top→ / bottom→ / left↓ / right↓  (H-shape)
  'ㅍ': [
    'M 14,20 L 86,20',
    'M 14,82 L 86,82',
    'M 28,20 L 28,82',
    'M 72,20 L 72,82',
  ],

  // ㅎ  small dash + circle + bottom bar
  'ㅎ': [
    'M 44,8 L 56,8',
    'M 50,20 A 20,20 0 1,1 49.9,20',
    'M 14,68 L 86,68',
  ],

  // ── VOWELS ──────────────────────────────────────────────
  // Right-family (ㅏ,ㅐ,ㅑ,ㅒ): vertical + ticks going RIGHT →
  // Left-family  (ㅓ,ㅔ,ㅕ,ㅖ): vertical + ticks going LEFT ←
  // Bottom-family (ㅗ,ㅛ): horizontal lower (y≈55) + tick(s) ↓
  // Top-family    (ㅜ,ㅠ): horizontal upper (y≈28) + tick(s) ↓

  // ㅏ  vertical ↓ + right tick →
  'ㅏ': [
    'M 50,10 L 50,90',
    'M 50,50 L 84,50',
  ],

  // ㅐ  left-vertical ↓ + short right tick → + right-vertical ↓
  'ㅐ': [
    'M 34,10 L 34,90',
    'M 34,50 L 60,50',
    'M 68,10 L 68,90',
  ],

  // ㅑ  vertical ↓ + upper right tick → + lower right tick →
  'ㅑ': [
    'M 50,10 L 50,90',
    'M 50,33 L 84,33',
    'M 50,60 L 84,60',
  ],

  // ㅒ  left-vertical ↓ + upper right tick + lower right tick + right-vertical ↓
  'ㅒ': [
    'M 28,10 L 28,90',
    'M 28,33 L 58,33',
    'M 28,60 L 58,60',
    'M 68,10 L 68,90',
  ],

  // ㅓ  vertical ↓ + LEFT tick ← (tick starts at vertical, goes left)
  'ㅓ': [
    'M 50,10 L 50,90',
    'M 50,50 L 16,50',
  ],

  // ㅔ  left-vertical ↓ + LEFT tick ← + right-vertical ↓
  'ㅔ': [
    'M 32,10 L 32,90',
    'M 32,50 L 14,50',
    'M 68,10 L 68,90',
  ],

  // ㅕ  vertical ↓ + upper LEFT tick ← + lower LEFT tick ←
  'ㅕ': [
    'M 50,10 L 50,90',
    'M 50,33 L 16,33',
    'M 50,60 L 16,60',
  ],

  // ㅖ  left-vertical ↓ + upper left tick + lower left tick + right-vertical ↓
  'ㅖ': [
    'M 32,10 L 32,90',
    'M 32,33 L 14,33',
    'M 32,60 L 14,60',
    'M 68,10 L 68,90',
  ],

  // ㅗ  wide horizontal at y=55 (lower area) + short center tick ↓
  //     Result: ⊥-like compact T-shape
  'ㅗ': [
    'M 14,55 L 86,55',
    'M 50,55 L 50,88',
  ],

  // ㅘ  ㅗ-portion (left) + ㅏ-portion (right)
  'ㅘ': [
    'M 8,52 L 42,52',
    'M 25,52 L 25,86',
    'M 55,10 L 55,90',
    'M 55,50 L 88,50',
  ],

  // ㅙ  ㅗ-left + ㅐ-right
  'ㅙ': [
    'M 5,52 L 35,52',
    'M 20,52 L 20,86',
    'M 46,10 L 46,90',
    'M 46,50 L 65,50',
    'M 74,10 L 74,90',
  ],

  // ㅚ  ㅗ-left + ㅣ-right
  'ㅚ': [
    'M 10,52 L 58,52',
    'M 34,52 L 34,86',
    'M 74,10 L 74,90',
  ],

  // ㅛ  wide horizontal at y=55 + TWO ticks ↓
  'ㅛ': [
    'M 14,55 L 86,55',
    'M 34,55 L 34,88',
    'M 66,55 L 66,88',
  ],

  // ㅜ  wide horizontal at y=28 (upper area) + long center tick ↓
  //     Result: tall T-shape
  'ㅜ': [
    'M 14,28 L 86,28',
    'M 50,28 L 50,88',
  ],

  // ㅝ  ㅜ-portion (left) + ㅓ-portion (right)
  'ㅝ': [
    'M 6,32 L 42,32',
    'M 24,32 L 24,72',
    'M 58,10 L 58,90',
    'M 58,52 L 22,52',
  ],

  // ㅞ  ㅜ-left + ㅔ-right
  'ㅞ': [
    'M 4,32 L 36,32',
    'M 20,32 L 20,72',
    'M 48,10 L 48,90',
    'M 48,52 L 18,52',
    'M 72,10 L 72,90',
  ],

  // ㅟ  ㅜ-left + ㅣ-right
  'ㅟ': [
    'M 10,32 L 58,32',
    'M 34,32 L 34,76',
    'M 74,10 L 74,90',
  ],

  // ㅠ  wide horizontal at y=28 + TWO ticks ↓
  'ㅠ': [
    'M 14,28 L 86,28',
    'M 34,28 L 34,88',
    'M 66,28 L 66,88',
  ],

  // ㅡ  single horizontal stroke
  'ㅡ': [
    'M 14,52 L 86,52',
  ],

  // ㅢ  ㅡ-left + ㅣ-right
  'ㅢ': [
    'M 10,52 L 52,52',
    'M 72,10 L 72,90',
  ],

  // ㅣ  single vertical stroke
  'ㅣ': [
    'M 50,10 L 50,90',
  ],
};


// Compound jamo → base jamo parts
const COMPOUND_JAMO: Record<string, string[]> = {
  'ㄲ': ['ㄱ', 'ㄱ'], 'ㄸ': ['ㄷ', 'ㄷ'], 'ㅃ': ['ㅂ', 'ㅂ'],
  'ㅆ': ['ㅅ', 'ㅅ'], 'ㅉ': ['ㅈ', 'ㅈ'],
  'ㄳ': ['ㄱ', 'ㅅ'], 'ㄵ': ['ㄴ', 'ㅈ'], 'ㄶ': ['ㄴ', 'ㅎ'],
  'ㄺ': ['ㄹ', 'ㄱ'], 'ㄻ': ['ㄹ', 'ㅁ'], 'ㄼ': ['ㄹ', 'ㅂ'],
  'ㄽ': ['ㄹ', 'ㅅ'], 'ㄾ': ['ㄹ', 'ㅌ'], 'ㄿ': ['ㄹ', 'ㅍ'],
  'ㅀ': ['ㄹ', 'ㅎ'], 'ㅄ': ['ㅂ', 'ㅅ'],
};

// Hangul syllable decomposition tables
const CHOSEONG  = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNGSEONG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONGSEONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

function decomposeHangul(char: string) {
  const code = char.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return null;
  const offset = code - 0xAC00;
  const jongIdx = offset % 28;
  const jungIdx = ((offset - jongIdx) / 28) % 21;
  const choIdx  = Math.floor(offset / (21 * 28));
  return { cho: CHOSEONG[choIdx], jung: JUNGSEONG[jungIdx], jong: JONGSEONG[jongIdx] };
}

function strokesForJamo(jamo: string, startIndex: number): StrokeInfo[] {
  if (!jamo) return [];
  const paths = JAMO_PATHS[jamo];
  if (paths) {
    return paths.map((path, i) => ({
      path,
      color: STROKE_COLORS[(startIndex + i) % STROKE_COLORS.length],
      number: startIndex + i + 1,
    }));
  }
  // Compound jamo fallback
  const parts = COMPOUND_JAMO[jamo];
  if (parts) {
    let idx = startIndex;
    const result: StrokeInfo[] = [];
    for (const part of parts) {
      const pp = JAMO_PATHS[part] ?? [];
      pp.forEach((path, i) => result.push({
        path,
        color: STROKE_COLORS[(idx + i) % STROKE_COLORS.length],
        number: idx + i + 1,
      }));
      idx += pp.length;
    }
    return result;
  }
  return [];
}

function firstPoint(d: string) {
  const m = d.match(/M\s*([\d.]+)[,\s]*([\d.]+)/);
  return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 10, y: 10 };
}

// ============================================================
// JamoPanel – animated SVG for a single jamo
// ============================================================
const STROKE_DUR = 0.6;
const STROKE_GAP = 0.08;

interface JamoPanelProps {
  label: string;
  jamo: string;
  strokes: StrokeInfo[];
  animKey: number;
  globalDelay: number;
  size: number;
}

function JamoPanel({ label, jamo: _jamo, strokes, animKey, globalDelay, size }: JamoPanelProps) {
  const refs = useRef<(SVGPathElement | null)[]>([]);
  const [lengths, setLengths] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    refs.current = refs.current.slice(0, strokes.length);
    const t = setTimeout(() => {
      const ls = refs.current.map(r => {
        try { return r ? Math.max(r.getTotalLength(), 1) : 200; }
        catch { return 200; }
      });
      setLengths(ls);
      setReady(true);
    }, 40);
    return () => clearTimeout(t);
  }, [strokes, animKey]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-sm font-black uppercase tracking-wider text-[#8d6e63]">{label}</span>
      <div className="rounded-xl bg-[#fdf8f5] border-2 border-[#e8dcd4] overflow-hidden">
        <svg viewBox="0 0 100 100" width={size} height={size}>
          {/* Background fill */}
          <rect x="0" y="0" width="100" height="100" fill="#fdf8f5" />

          {/* Guide paths – static gray backdrop (exact same paths as animation) */}
          {strokes.map((s, i) => (
            <path
              key={`g${i}`} d={s.path}
              stroke="#d8c9c0" strokeWidth={6} fill="none"
              strokeLinecap="round" strokeLinejoin="round"
            />
          ))}

          {/* Measure-only invisible paths (rendered before ready) */}
          {!ready && strokes.map((s, i) => (
            <path
              key={`m${i}`}
              ref={el => { refs.current[i] = el; }}
              d={s.path} stroke="transparent" strokeWidth={1} fill="none"
            />
          ))}

          {/* Animated colored strokes */}
          {ready && strokes.map((s, i) => {
            const len   = lengths[i] ?? 200;
            const delay = globalDelay + i * (STROKE_DUR + STROKE_GAP);
            const pt    = firstPoint(s.path);
            return (
              <g key={`a-${animKey}-${i}`}>
                {/* Stroke path animation */}
                <path
                  ref={el => { refs.current[i] = el; }}
                  d={s.path}
                  stroke={s.color}
                  strokeWidth={6}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: len,
                    strokeDashoffset: len,
                    animation: `hangulDraw ${STROKE_DUR}s ease forwards`,
                    animationDelay: `${delay}s`,
                  }}
                />
                {/* Dot at start point */}
                <circle
                  cx={pt.x} cy={pt.y} r={6} fill={s.color}
                  style={{
                    opacity: 0,
                    animation: 'hangulShow 0.01s step-end forwards',
                    animationDelay: `${delay}s`,
                  }}
                />
                {/* Stroke number */}
                <text
                  x={Math.min(Math.max(pt.x + 5, 8), 88)}
                  y={Math.max(pt.y - 7, 12)}
                  fontSize="11" fontWeight="bold"
                  fill={s.color}
                  style={{
                    opacity: 0,
                    animation: 'hangulShow 0.01s step-end forwards',
                    animationDelay: `${delay}s`,
                  }}
                >
                  {s.number}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ============================================================
// Main StrokeOrderGuide
// ============================================================
interface StrokeOrderGuideProps {
  /** Full Korean word – guide shows each syllable */
  word: string;
}

export default function StrokeOrderGuide({ word }: StrokeOrderGuideProps) {
  // Extract Hangul syllables from the word
  const syllables = Array.from(word).filter(c => {
    const code = c.charCodeAt(0);
    return code >= 0xAC00 && code <= 0xD7A3;
  });

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  // Reset when word changes
  useEffect(() => {
    setSelectedIdx(0);
    setAnimKey(k => k + 1);
  }, [word]);

  if (syllables.length === 0) return null;

  const syllable   = syllables[Math.min(selectedIdx, syllables.length - 1)];
  const decomposed = decomposeHangul(syllable);
  if (!decomposed) return null;

  const { cho, jung, jong } = decomposed;
  const choStrokes  = strokesForJamo(cho,  0);
  const jungStrokes = strokesForJamo(jung, choStrokes.length);
  const jongStrokes = jong ? strokesForJamo(jong, choStrokes.length + jungStrokes.length) : [];
  const totalStrokes = choStrokes.length + jungStrokes.length + jongStrokes.length;

  const jungDelay = 0.2 + choStrokes.length  * (STROKE_DUR + STROKE_GAP);
  const jongDelay = jungDelay + jungStrokes.length * (STROKE_DUR + STROKE_GAP);

  // SVG size: larger after font doubling
  const svgSize = jong ? 110 : 125;

  return (
    <div
      className="bg-white rounded-2xl shadow-lg border border-[#e8dcd4] p-5 flex flex-col gap-3"
      style={{ width: '380px', minHeight: '600px' }}
    >
      {/* CSS keyframes */}
      <style>{`
        @keyframes hangulDraw { to { stroke-dashoffset: 0; } }
        @keyframes hangulShow { to { opacity: 1; } }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-wider text-[#72564c]">Hướng dẫn nét vẽ</p>
          <p className="text-xs text-[#8d6e63] mt-0.5">
            Tổng cộng <span className="font-bold text-[#72564c]">{totalStrokes} nét</span>
          </p>
        </div>
        <button
          onClick={() => setAnimKey(k => k + 1)}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-[#f0e6e0] text-[#72564c] hover:bg-[#e8dcd4] transition-colors font-bold"
        >
          ↺ Vẽ lại
        </button>
      </div>

      {/* Syllable tabs (if word has multiple syllables) */}
      {syllables.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {syllables.map((syl, i) => (
            <button
              key={i}
              onClick={() => { setSelectedIdx(i); setAnimKey(k => k + 1); }}
              className={`px-3 py-1.5 rounded-xl text-base font-bold transition-all ${
                i === selectedIdx
                  ? 'bg-[#72564c] text-white shadow-md'
                  : 'bg-[#f0e6e0] text-[#72564c] hover:bg-[#e8dcd4]'
              }`}
            >
              {syl}
            </button>
          ))}
        </div>
      )}

      {/* Big syllable character preview */}
      <div
        className="flex-1 flex items-center justify-center rounded-2xl bg-[#fdf8f5] border-2 border-[#e8dcd4]"
        style={{ minHeight: '160px' }}
      >
        <p
          className="font-bold text-[#72564c] leading-none select-none"
          style={{ fontSize: '120px' }}
        >
          {syllable}
        </p>
      </div>

      {/* Jamo panels – side by side */}
      <div className="flex gap-2 justify-center">
        <JamoPanel
          key={`cho-${animKey}-${syllable}`}
          label="Phụ âm đầu"
          jamo={cho}
          strokes={choStrokes}
          animKey={animKey}
          globalDelay={0.2}
          size={svgSize}
        />
        <JamoPanel
          key={`jung-${animKey}-${syllable}`}
          label="Nguyên âm"
          jamo={jung}
          strokes={jungStrokes}
          animKey={animKey}
          globalDelay={jungDelay}
          size={svgSize}
        />
        {jong && (
          <JamoPanel
            key={`jong-${animKey}-${syllable}`}
            label="Phụ âm cuối"
            jamo={jong}
            strokes={jongStrokes}
            animKey={animKey}
            globalDelay={jongDelay}
            size={svgSize}
          />
        )}
      </div>

      {/* Stroke color legend */}
      <div className="pt-3 border-t border-[#f0e6e0] flex flex-wrap gap-2 justify-center">
        {[...choStrokes, ...jungStrokes, ...jongStrokes].map((s, i) => (
          <span key={i} className="text-xs font-bold px-2 py-1 rounded-lg"
            style={{ color: s.color, backgroundColor: s.color + '22' }}
          >
            Nét {s.number}
          </span>
        ))}
      </div>
    </div>
  );
}
