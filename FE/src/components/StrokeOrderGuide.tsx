'use client';

import { useEffect, useRef, useState } from 'react';

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

type Box = { x: number; y: number; w: number; h: number };

const JAMO_PATHS: Record<string, string[]> = {
  'ㄱ': ['M 14,24 L 80,24', 'M 80,24 L 80,82'],
  'ㄲ': ['M 5,24 L 38,24', 'M 38,24 L 38,80', 'M 50,24 L 88,24', 'M 88,24 L 88,80'],
  'ㄴ': ['M 20,14 L 20,82', 'M 20,82 L 84,82'],
  'ㄷ': ['M 14,18 L 84,18', 'M 14,18 L 14,82', 'M 14,82 L 84,82'],
  'ㄸ': ['M 4,18 L 44,18', 'M 4,18 L 4,82', 'M 4,82 L 44,82', 'M 54,18 L 94,18', 'M 54,18 L 54,82', 'M 54,82 L 94,82'],
  'ㄹ': ['M 14,16 L 84,16', 'M 14,16 L 14,50', 'M 14,50 L 84,50', 'M 84,50 L 84,74', 'M 14,74 L 84,74'],
  'ㅁ': ['M 18,18 L 82,18', 'M 18,18 L 18,82', 'M 82,18 L 82,82', 'M 18,82 L 82,82'],
  'ㅂ': ['M 20,18 L 20,82', 'M 80,18 L 80,82', 'M 20,50 L 80,50', 'M 20,18 L 80,18', 'M 20,82 L 80,82'],
  'ㅃ': ['M 6,18 L 6,82', 'M 42,18 L 42,82', 'M 6,50 L 42,50', 'M 6,18 L 42,18', 'M 6,82 L 42,82', 'M 54,18 L 54,82', 'M 92,18 L 92,82', 'M 54,50 L 92,50', 'M 54,18 L 92,18', 'M 54,82 L 92,82'],
  'ㅅ': ['M 50,12 C 42,38 28,62 15,84', 'M 50,12 C 58,38 72,62 85,84'],
  'ㅆ': ['M 28,12 C 22,38 12,62 5,84', 'M 28,12 C 34,38 42,62 46,84', 'M 68,12 C 62,38 54,62 50,84', 'M 68,12 C 76,38 86,62 92,84'],

  'ㅇ': [
    'M 50,18 C 69,18 84,32 84,50 C 84,69 69,84 50,84 C 31,84 16,69 16,50 C 16,32 31,18 50,18',
  ],

  'ㅈ': ['M 14,26 L 86,26', 'M 50,26 C 42,48 28,68 15,84', 'M 50,26 C 58,48 72,68 85,84'],
  'ㅉ': ['M 5,26 L 44,26', 'M 24,26 C 18,48 10,68 5,84', 'M 24,26 C 30,48 38,68 44,84', 'M 54,26 L 93,26', 'M 73,26 C 66,48 58,68 54,84', 'M 73,26 C 80,48 88,68 93,84'],
  'ㅊ': ['M 44,8 L 56,8', 'M 14,26 L 86,26', 'M 50,26 C 42,48 28,68 15,84', 'M 50,26 C 58,48 72,68 85,84'],
  'ㅋ': ['M 14,22 L 82,22', 'M 14,52 L 72,52', 'M 72,22 L 72,82'],
  'ㅌ': ['M 14,18 L 84,18', 'M 14,18 L 14,82', 'M 14,50 L 84,50', 'M 14,82 L 84,82'],
  'ㅍ': ['M 14,20 L 86,20', 'M 14,82 L 86,82', 'M 28,20 L 28,82', 'M 72,20 L 72,82'],

  'ㅎ': [
    'M 43,12 C 47,11 53,11 57,12',
    'M 24,30 C 38,28 62,28 76,30',
    'M 50,47 C 65,47 76,58 76,70 C 76,83 65,92 50,92 C 35,92 24,83 24,70 C 24,58 35,47 50,47',
  ],

  'ㅏ': ['M 50,10 L 50,90', 'M 50,50 L 84,50'],
  'ㅐ': ['M 34,10 L 34,90', 'M 34,50 L 60,50', 'M 68,10 L 68,90'],
  'ㅑ': ['M 50,10 L 50,90', 'M 50,33 L 84,33', 'M 50,60 L 84,60'],
  'ㅒ': ['M 28,10 L 28,90', 'M 28,33 L 58,33', 'M 28,60 L 58,60', 'M 68,10 L 68,90'],
  'ㅓ': ['M 50,10 L 50,90', 'M 50,50 L 16,50'],
  'ㅔ': ['M 32,10 L 32,90', 'M 32,50 L 14,50', 'M 68,10 L 68,90'],
  'ㅕ': ['M 50,10 L 50,90', 'M 50,33 L 16,33', 'M 50,60 L 16,60'],
  'ㅖ': ['M 32,10 L 32,90', 'M 32,33 L 14,33', 'M 32,60 L 14,60', 'M 68,10 L 68,90'],

  'ㅗ': ['M 16,66 C 34,65 66,65 84,66', 'M 50,34 C 50,45 50,56 50,66'],
  'ㅛ': ['M 16,68 C 34,67 66,67 84,68', 'M 34,38 C 34,48 34,58 34,68', 'M 66,38 C 66,48 66,58 66,68'],
  'ㅜ': ['M 16,34 C 34,35 66,35 84,34', 'M 50,34 C 50,50 50,70 50,88'],
  'ㅠ': ['M 16,34 C 34,35 66,35 84,34', 'M 34,34 C 34,50 34,70 34,88', 'M 66,34 C 66,50 66,70 66,88'],

  'ㅘ': ['M 8,62 L 42,62', 'M 25,36 L 25,62', 'M 58,10 L 58,90', 'M 58,50 L 88,50'],
  'ㅙ': ['M 5,62 L 35,62', 'M 20,36 L 20,62', 'M 46,10 L 46,90', 'M 46,50 L 65,50', 'M 74,10 L 74,90'],
  'ㅚ': ['M 10,62 L 58,62', 'M 34,36 L 34,62', 'M 74,10 L 74,90'],
  'ㅝ': ['M 6,34 L 42,34', 'M 24,34 L 24,72', 'M 58,10 L 58,90', 'M 58,52 L 22,52'],
  'ㅞ': ['M 4,34 L 36,34', 'M 20,34 L 20,72', 'M 48,10 L 48,90', 'M 48,52 L 18,52', 'M 72,10 L 72,90'],
  'ㅟ': ['M 10,34 L 58,34', 'M 34,34 L 34,76', 'M 74,10 L 74,90'],

  'ㅡ': ['M 14,52 L 86,52'],
  'ㅢ': ['M 10,52 L 52,52', 'M 72,10 L 72,90'],
  'ㅣ': ['M 50,10 L 50,90'],
};

const COMPOUND_JAMO: Record<string, string[]> = {
  'ㄲ': ['ㄱ', 'ㄱ'], 'ㄸ': ['ㄷ', 'ㄷ'], 'ㅃ': ['ㅂ', 'ㅂ'],
  'ㅆ': ['ㅅ', 'ㅅ'], 'ㅉ': ['ㅈ', 'ㅈ'],
  'ㄳ': ['ㄱ', 'ㅅ'], 'ㄵ': ['ㄴ', 'ㅈ'], 'ㄶ': ['ㄴ', 'ㅎ'],
  'ㄺ': ['ㄹ', 'ㄱ'], 'ㄻ': ['ㄹ', 'ㅁ'], 'ㄼ': ['ㄹ', 'ㅂ'],
  'ㄽ': ['ㄹ', 'ㅅ'], 'ㄾ': ['ㄹ', 'ㅌ'], 'ㄿ': ['ㄹ', 'ㅍ'],
  'ㅀ': ['ㄹ', 'ㅎ'], 'ㅄ': ['ㅂ', 'ㅅ'],
};

const CHOSEONG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNGSEONG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONGSEONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const VERTICAL_VOWELS = new Set(['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅣ']);

function decomposeHangul(char: string) {
  const code = char.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return null;
  const offset = code - 0xac00;
  const jongIdx = offset % 28;
  const jungIdx = ((offset - jongIdx) / 28) % 21;
  const choIdx = Math.floor(offset / (21 * 28));
  return { cho: CHOSEONG[choIdx], jung: JUNGSEONG[jungIdx], jong: JONGSEONG[jongIdx] };
}

function strokesForJamo(jamo: string, startIndex: number): StrokeInfo[] {
  if (!jamo) return [];

  const paths = JAMO_PATHS[jamo] ?? COMPOUND_JAMO[jamo]?.flatMap(part => JAMO_PATHS[part] ?? []) ?? [];

  return paths.map((path, i) => ({
    path,
    color: STROKE_COLORS[(startIndex + i) % STROKE_COLORS.length],
    number: startIndex + i + 1,
  }));
}

function fmt(n: number) {
  return Number(n.toFixed(2)).toString();
}

function transformPathToBox(path: string, box: Box) {
  const tokens = path.match(/[MLCQA]|-?\d+(?:\.\d+)?/g) ?? [];
  let i = 0;
  const out: string[] = [];

  const tx = (v: number) => fmt(box.x + (v / 100) * box.w);
  const ty = (v: number) => fmt(box.y + (v / 100) * box.h);
  const sx = (v: number) => fmt((v / 100) * box.w);
  const sy = (v: number) => fmt((v / 100) * box.h);

  while (i < tokens.length) {
    const cmd = tokens[i++];

    if (cmd === 'M' || cmd === 'L') {
      const x = Number(tokens[i++]);
      const y = Number(tokens[i++]);
      out.push(`${cmd} ${tx(x)},${ty(y)}`);
    } else if (cmd === 'C') {
      const x1 = Number(tokens[i++]);
      const y1 = Number(tokens[i++]);
      const x2 = Number(tokens[i++]);
      const y2 = Number(tokens[i++]);
      const x = Number(tokens[i++]);
      const y = Number(tokens[i++]);
      out.push(`C ${tx(x1)},${ty(y1)} ${tx(x2)},${ty(y2)} ${tx(x)},${ty(y)}`);
    } else if (cmd === 'Q') {
      const x1 = Number(tokens[i++]);
      const y1 = Number(tokens[i++]);
      const x = Number(tokens[i++]);
      const y = Number(tokens[i++]);
      out.push(`Q ${tx(x1)},${ty(y1)} ${tx(x)},${ty(y)}`);
    } else if (cmd === 'A') {
      const rx = Number(tokens[i++]);
      const ry = Number(tokens[i++]);
      const rot = Number(tokens[i++]);
      const large = Number(tokens[i++]);
      const sweep = Number(tokens[i++]);
      const x = Number(tokens[i++]);
      const y = Number(tokens[i++]);
      out.push(`A ${sx(rx)},${sy(ry)} ${rot} ${large},${sweep} ${tx(x)},${ty(y)}`);
    }
  }

  return out.join(' ');
}

function composeSyllableGuideStrokes(syllable: string): StrokeInfo[] {
  const d = decomposeHangul(syllable);
  if (!d) return [];

  const hasJong = Boolean(d.jong);
  const vertical = VERTICAL_VOWELS.has(d.jung);

  const choBox = vertical
    ? { x: 3, y: 4, w: 52, h: hasJong ? 66 : 92 }
    : { x: 15, y: 2, w: 70, h: hasJong ? 48 : 58 };

  const jungBox = vertical
    ? { x: 45, y: 4, w: 52, h: hasJong ? 66 : 92 }
    : { x: 15, y: hasJong ? 50 : 58, w: 70, h: hasJong ? 25 : 38 };

  const jongBox = { x: 15, y: 76, w: 70, h: 22 };

  let start = 0;
  const take = (jamo: string, box: Box) => {
    const strokes = strokesForJamo(jamo, start);
    start += strokes.length;
    return strokes.map(s => ({ ...s, path: transformPathToBox(s.path, box) }));
  };

  return [
    ...take(d.cho, choBox),
    ...take(d.jung, jungBox),
    ...(d.jong ? take(d.jong, jongBox) : []),
  ];
}

function firstPoint(d: string) {
  const m = d.match(/M\s*(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
  return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 10, y: 10 };
}

const STROKE_DUR = 0.6;
const STROKE_GAP = 0.08;

interface SvgStrokePanelProps {
  label?: string;
  syllable?: string;
  strokes: StrokeInfo[];
  animKey: number;
  globalDelay: number;
  size?: number;
  composed?: boolean;
}

function SvgStrokePanel({ label, syllable, strokes, animKey, globalDelay, size = 125, composed = false }: SvgStrokePanelProps) {
  const refs = useRef<(SVGPathElement | null)[]>([]);
  const [lengths, setLengths] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    refs.current = refs.current.slice(0, strokes.length);

    const t = setTimeout(() => {
      const ls = refs.current.map(r => {
        try {
          return r ? Math.max(r.getTotalLength(), 1) : 200;
        } catch {
          return 200;
        }
      });
      setLengths(ls);
      setReady(true);
    }, 40);

    return () => clearTimeout(t);
  }, [strokes, animKey]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      {label && (
        <span className="font-black uppercase tracking-wider text-[#8d6e63]" style={{ fontSize: composed ? '18px' : '20px' }}>
          {label}
        </span>
      )}

      <div className="rounded-xl bg-[#fdf8f5] border-2 border-[#e8dcd4] overflow-hidden">
        <svg viewBox="0 0 100 100" width={composed ? 330 : size} height={composed ? 210 : size} preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="100" height="100" fill="#fdf8f5" />

          {composed && syllable && (
            <text
              x="50"
              y="62"
              textAnchor="middle"
              fontSize="76"
              fontWeight="800"
              fontFamily="'Noto Sans KR', 'Noto Sans CJK KR', 'Apple SD Gothic Neo', sans-serif"
              fill="#72564c"
              opacity="0.11"
            >
              {syllable}
            </text>
          )}

          {strokes.map((s, i) => (
            <path
              key={`guide-${i}`}
              d={s.path}
              stroke="#d8c9c0"
              strokeWidth={composed ? 4.8 : 6}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {!ready && strokes.map((s, i) => (
            <path
              key={`measure-${i}`}
              ref={el => { refs.current[i] = el; }}
              d={s.path}
              stroke="transparent"
              strokeWidth={1}
              fill="none"
            />
          ))}

          {ready && strokes.map((s, i) => {
            const len = lengths[i] ?? 200;
            const delay = globalDelay + i * (STROKE_DUR + STROKE_GAP);
            const pt = firstPoint(s.path);

            return (
              <g key={`stroke-${animKey}-${i}`}>
                <path
                  ref={el => { refs.current[i] = el; }}
                  d={s.path}
                  stroke={s.color}
                  strokeWidth={composed ? 4.8 : 6}
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

                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={composed ? 3.8 : 6}
                  fill={s.color}
                  style={{
                    opacity: 0,
                    animation: 'hangulShow 0.01s step-end forwards',
                    animationDelay: `${delay}s`,
                  }}
                />

                <text
                  x={Math.min(Math.max(pt.x + 4, 7), 90)}
                  y={Math.max(pt.y - 4, 9)}
                  fontSize={composed ? '7' : '11'}
                  fontWeight="800"
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

interface StrokeOrderGuideProps {
  word: string;
}

export default function StrokeOrderGuide({ word }: StrokeOrderGuideProps) {
  const syllables = Array.from(word).filter(c => {
    const code = c.charCodeAt(0);
    return code >= 0xac00 && code <= 0xd7a3;
  });

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setSelectedIdx(0);
    setAnimKey(k => k + 1);
  }, [word]);

  if (syllables.length === 0) return null;

  const syllable = syllables[Math.min(selectedIdx, syllables.length - 1)];
  const decomposed = decomposeHangul(syllable);
  if (!decomposed) return null;

  const { cho, jung, jong } = decomposed;
  const choStrokes = strokesForJamo(cho, 0);
  const jungStrokes = strokesForJamo(jung, choStrokes.length);
  const jongStrokes = jong ? strokesForJamo(jong, choStrokes.length + jungStrokes.length) : [];
  const composedStrokes = composeSyllableGuideStrokes(syllable);
  const totalStrokes = composedStrokes.length;

  const jungDelay = 0.2 + choStrokes.length * (STROKE_DUR + STROKE_GAP);
  const jongDelay = jungDelay + jungStrokes.length * (STROKE_DUR + STROKE_GAP);
  const svgSize = jong ? 104 : 118;

  return (
    <div
      className="bg-white rounded-2xl shadow-lg border-[3px] border-[#72564c] p-5 flex flex-col gap-3"
      style={{ width: '380px' }}
    >
      <style>{`
        @keyframes hangulDraw { to { stroke-dashoffset: 0; } }
        @keyframes hangulShow { to { opacity: 1; } }
      `}</style>

      <div className="flex items-center justify-between">
        <div>
          <p className="font-black uppercase tracking-wider text-[#72564c]" style={{ fontSize: '20px' }}>
            Hướng dẫn nét vẽ
          </p>
          <p className="text-[#8d6e63] mt-0.5" style={{ fontSize: '18px' }}>
            Tổng cộng <span className="font-bold text-[#72564c]">{totalStrokes} nét</span>
          </p>
        </div>

        <button
          onClick={() => setAnimKey(k => k + 1)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f0e6e0] text-[#72564c] hover:bg-[#e8dcd4] transition-colors font-bold"
          style={{ fontSize: '18px' }}
        >
          ↺ Vẽ lại
        </button>
      </div>

      {syllables.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {syllables.map((syl, i) => (
            <button
              key={i}
              onClick={() => {
                setSelectedIdx(i);
                setAnimKey(k => k + 1);
              }}
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

      <div
        className="flex-1 flex items-center justify-center rounded-2xl bg-[#fdf8f5] border-2 border-[#e8dcd4]"
        style={{ minHeight: '150px' }}
      >
        <p
          className="font-bold text-[#72564c] leading-none select-none"
          style={{
            fontSize: '118px',
            fontFamily: "'Noto Sans KR', 'Noto Sans CJK KR', 'Apple SD Gothic Neo', sans-serif",
          }}
        >
          {syllable}
        </p>
      </div>

      <SvgStrokePanel
        label="Âm tiết ghép"
        syllable={syllable}
        strokes={composedStrokes}
        animKey={animKey}
        globalDelay={0.2}
        composed
      />

      <div className="flex gap-2 justify-center">
        <SvgStrokePanel
          key={`cho-${animKey}-${syllable}`}
          label="Phụ âm đầu"
          strokes={choStrokes}
          animKey={animKey}
          globalDelay={0.2}
          size={svgSize}
        />

        <SvgStrokePanel
          key={`jung-${animKey}-${syllable}`}
          label="Nguyên âm"
          strokes={jungStrokes}
          animKey={animKey}
          globalDelay={jungDelay}
          size={svgSize}
        />

        {jong && (
          <SvgStrokePanel
            key={`jong-${animKey}-${syllable}`}
            label="Phụ âm cuối"
            strokes={jongStrokes}
            animKey={animKey}
            globalDelay={jongDelay}
            size={svgSize}
          />
        )}
      </div>

      <div className="pt-3 border-t border-[#f0e6e0] flex flex-wrap gap-2 justify-center">
        {composedStrokes.map((s, i) => (
          <span
            key={i}
            className="font-bold px-2 py-1 rounded-lg"
            style={{ fontSize: '18px', color: s.color, backgroundColor: `${s.color}22` }}
          >
            Nét {s.number}
          </span>
        ))}
      </div>
    </div>
  );
}
