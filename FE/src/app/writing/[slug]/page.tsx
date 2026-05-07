'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import { useAuthStore } from '@/store/authStore';
import ResultSummary, { type ResultItem } from '@/components/ResultSummary';
import StrokeOrderGuide from '@/components/StrokeOrderGuide';
import Footer from '@/components/Footer';

interface ExercisePoint {
  x: number;
  y: number;
  t: number;
}

interface Vocabulary {
  id: number;
  korean: string;
  english: string;
  vietnamese: string;
  romanization: string;
}

const CANVAS_HEIGHT = 600;
const CANVAS_FONT_SIZE = 280;
const CANVAS_PADDING_X = 40; // horizontal padding on each side
const GUIDE_HIT_PADDING = 20;
const MIN_POINTS_PER_STROKE = 5;
const CHAR_CELL_GAP = 20;

const writingWordIndexKey = (topicSlug: string) => `hangul-writing:wordIndex:${topicSlug}`;

/** Cùng công thức ô chữ như `drawGuidelines` / `getCharIndexFromX` */
function getWritingCellMetrics(displayedWordChars: string[]) {
  let measuredWidth = CANVAS_HEIGHT;
  if (typeof document !== 'undefined' && displayedWordChars.length > 0) {
    const off = document.createElement('canvas');
    const offCtx = off.getContext('2d');
    if (offCtx) {
      offCtx.font = `bold ${CANVAS_FONT_SIZE}px 'Plus Jakarta Sans', serif`;
      measuredWidth = Math.ceil(
        Math.max(...displayedWordChars.map((ch) => offCtx.measureText(ch).width))
      );
    }
  }
  const cellWidth = Math.max(260, measuredWidth + 40);
  const startX = CANVAS_PADDING_X;
  return { measuredWidth, cellWidth, startX };
}

function getGuideHitRectForCell(
  cellIndex: number,
  metrics: { measuredWidth: number; cellWidth: number; startX: number }
) {
  const { measuredWidth, cellWidth, startX } = metrics;
  const cx = startX + cellIndex * (cellWidth + CHAR_CELL_GAP) + cellWidth / 2;
  const top = (CANVAS_HEIGHT - CANVAS_FONT_SIZE) / 2 - GUIDE_HIT_PADDING;
  const bottom = (CANVAS_HEIGHT + CANVAS_FONT_SIZE) / 2 + GUIDE_HIT_PADDING;
  const left = cx - measuredWidth / 2 - GUIDE_HIT_PADDING;
  const right = cx + measuredWidth / 2 + GUIDE_HIT_PADDING;
  return { left, right, top, bottom };
}

type Stroke = ExercisePoint[];
type CharacterAttempt = { id: number; strokes: Stroke[] };

export default function WritingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuthStore();
  const slug = params.slug as string;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(600);
  const [guideCharWidth, setGuideCharWidth] = useState(CANVAS_HEIGHT);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke>([]);
  const activeCharIndexRef = useRef(0);
  /** Lịch sử nét (để đồng bộ khi «Viết lại chữ này»). */
  const strokeHistoryRef = useRef<{ charIndex: number; strokeRef: Stroke }[]>([]);
  const [attempt, setAttempt] = useState<{
    word: string;
    template: { char: string; expectedStrokeCount: number }[];
    characters: CharacterAttempt[];
    currentCharIndexInWord: number;
  }>({ word: '', template: [], characters: [], currentCharIndexInWord: 0 });
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [scoreDetail, setScoreDetail] = useState<{
    shape?: number;
    order?: number;
    direction?: number;
    position?: number;
    completedCharacterCount?: number;
    expectedCharacterCount?: number;
    characterScores?: Array<{ index: number; score: number; error?: string; detail?: any }>;
  } | null>(null);
  const [charInkStyle, setCharInkStyle] = useState<Record<number, { color: string }>>({});
  const [brushSize, setBrushSize] = useState(3);
  const [brushColor, setBrushColor] = useState('#72564c');
  const [isCompleted, setIsCompleted] = useState(false);
  const [totalScores, setTotalScores] = useState<number[]>([]);
  const [characters, setCharacters] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [topicName, setTopicName] = useState('');
  const [topicId, setTopicId] = useState<number | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [_scoringMethod, setScoringMethod] = useState('');
  const [strokeValidation, setStrokeValidation] = useState<{
    expectedCharacterCount: number;
    currentCharacterCount: number;
    currentCharStrokeCount: number;
    expectedStrokeCountForCurrentChar: number;
    hasInvalidStroke: boolean;
  } | null>(null);
  const currentStrokeIdRef = useRef(0); // kept for compatibility, not used for grading anymore

  const colors = ['#72564c', '#8d6e63', '#5b4137', '#827470', '#504441', '#ffdbce'];

  // Fetch topic vocabulary
  useEffect(() => {
    const fetchTopic = async () => {
      if (!slug) return;
      
      try {
        // Step 1: Fetch topic info to get topicId
        const topicResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/topic/slug/${slug}`
        );
        
        if (topicResponse.ok) {
          const topicData = await topicResponse.json();
          setTopicName(topicData.name);
          setTopicId(topicData.id);
          
          // Step 2: Fetch random vocabulary from this topic
          if (topicData.id) {
            const vocabResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/public-vocab/by-topic/${topicData.id}?limit=10`
            );
            
            if (vocabResponse.ok) {
              const vocabData = await vocabResponse.json();
              if (vocabData.data && Array.isArray(vocabData.data)) {
                const list = vocabData.data as Vocabulary[];
                setCharacters(list);
                let idx = 0;
                if (typeof window !== 'undefined' && list.length > 0) {
                  const raw = sessionStorage.getItem(writingWordIndexKey(slug));
                  if (raw != null) {
                    const n = parseInt(raw, 10);
                    if (!Number.isNaN(n)) {
                      idx = Math.min(Math.max(0, n), list.length - 1);
                    }
                  }
                }
                setCurrentCharIndex(idx);
                setQuestionStartTime(Date.now());
              }
            }
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch topic:', error);
        setLoading(false);
      }
    };

    fetchTopic();
  }, [slug]);

  useEffect(() => {
    if (!slug || characters.length === 0 || typeof window === 'undefined') return;
    sessionStorage.setItem(writingWordIndexKey(slug), String(currentCharIndex));
  }, [slug, currentCharIndex, characters.length]);

  // Initialize canvas when component mounts or current character changes
  useEffect(() => {
    strokeHistoryRef.current = [];
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.height = CANVAS_HEIGHT;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, CANVAS_HEIGHT);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
    setCurrentStroke([]);
    setScore(null);
    setFeedback('');
  }, [currentCharIndex]);

  const currentWord = characters.length > 0 ? characters[currentCharIndex]?.korean : '한';
  const wordChars = Array.from(currentWord || '');
  const expectedCharacterCount = Math.max(1, attempt.template.length || wordChars.length || 1);
  const currentCharInWord = wordChars[attempt.currentCharIndexInWord] || wordChars[0] || '한';
  const displayedWordChars = wordChars.length > 0 ? wordChars : ['한'];

  const drawInk = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let idx = 0; idx < attempt.characters.length; idx++) {
      const ch = attempt.characters[idx];
      const style = charInkStyle[idx];
      ctx.strokeStyle = style?.color || brushColor;
      for (const stroke of ch?.strokes || []) {
        if (!stroke || stroke.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo(stroke[i].x, stroke[i].y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  const drawGuidelines = (opts?: { redrawInk?: boolean }) => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Measure max character width to compute dynamic canvas width
      const offscreen = document.createElement('canvas');
      const offCtx = offscreen.getContext('2d');
      let measuredWidth = CANVAS_HEIGHT; // default square
      if (offCtx) {
        offCtx.font = `bold ${CANVAS_FONT_SIZE}px 'Plus Jakarta Sans', serif`;
        measuredWidth = Math.ceil(
          Math.max(...displayedWordChars.map((ch) => offCtx.measureText(ch).width))
        );
      }
      const cellWidth = Math.max(260, measuredWidth + 40);
      const computedWidth = Math.max(
        400,
        CANVAS_PADDING_X * 2 + displayedWordChars.length * cellWidth + (displayedWordChars.length - 1) * CHAR_CELL_GAP
      );
      setGuideCharWidth(measuredWidth);

      canvas.width = computedWidth;
      canvas.height = CANVAS_HEIGHT;
      setCanvasWidth(computedWidth);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;
        const cellSize = 20;

        for (let x = 0; x <= canvas.width; x += cellSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }

        for (let y = 0; y <= canvas.height; y += cellSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        ctx.font = `bold ${CANVAS_FONT_SIZE}px 'Plus Jakarta Sans', serif`;
        ctx.fillStyle = '#f5e6d3';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Draw all characters in one canvas (each in a cell)
        const startX = CANVAS_PADDING_X;
        const topY = canvas.height / 2;
        for (let i = 0; i < displayedWordChars.length; i++) {
          const cx = startX + i * (cellWidth + CHAR_CELL_GAP) + cellWidth / 2;
          ctx.fillText(displayedWordChars[i], cx, topY);
          // subtle separator
          if (i < displayedWordChars.length - 1) {
            const sepX = startX + (i + 1) * cellWidth + i * CHAR_CELL_GAP + CHAR_CELL_GAP / 2;
            ctx.strokeStyle = '#f3ede7';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(sepX, 60);
            ctx.lineTo(sepX, canvas.height - 60);
            ctx.stroke();
          }
        }

        if (opts?.redrawInk) {
          drawInk(ctx);
        }
      }
    }
  };

  useEffect(() => {
    // Only redraw template when the word/template changes.
    // Switching active character must NOT clear existing ink.
    drawGuidelines({ redrawInk: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord, attempt.template.length]);

  const getCharIndexFromX = (x: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const offscreen = document.createElement('canvas');
    const offCtx = offscreen.getContext('2d');
    let measuredWidth = CANVAS_HEIGHT;
    if (offCtx) {
      offCtx.font = `bold ${CANVAS_FONT_SIZE}px 'Plus Jakarta Sans', serif`;
      measuredWidth = Math.ceil(
        Math.max(...displayedWordChars.map((ch) => offCtx.measureText(ch).width))
      );
    }
    const cellWidth = Math.max(260, measuredWidth + 40);
    const startX = CANVAS_PADDING_X;
    for (let i = 0; i < displayedWordChars.length; i++) {
      const left = startX + i * (cellWidth + CHAR_CELL_GAP);
      const right = left + cellWidth;
      if (x >= left && x <= right) return i;
    }
    return Math.max(0, Math.min(displayedWordChars.length - 1, attempt.currentCharIndexInWord));
  };

  const hasStrokeOnGuideLine = () => {
    if (currentStroke.length === 0) return false;

    const guideLeft = (canvasWidth - guideCharWidth) / 2 - GUIDE_HIT_PADDING;
    const guideRight = (canvasWidth + guideCharWidth) / 2 + GUIDE_HIT_PADDING;
    const guideTop = (CANVAS_HEIGHT - CANVAS_FONT_SIZE) / 2 - GUIDE_HIT_PADDING;
    const guideBottom = (CANVAS_HEIGHT + CANVAS_FONT_SIZE) / 2 + GUIDE_HIT_PADDING;

    return currentStroke.some((point) => {
      return (
        point.x >= guideLeft &&
        point.x <= guideRight &&
        point.y >= guideTop &&
        point.y <= guideBottom
      );
    });
  };

  const getGuideBounds = () => {
    const guideLeft = (canvasWidth - guideCharWidth) / 2 - GUIDE_HIT_PADDING;
    const guideRight = (canvasWidth + guideCharWidth) / 2 + GUIDE_HIT_PADDING;
    const guideTop = (CANVAS_HEIGHT - CANVAS_FONT_SIZE) / 2 - GUIDE_HIT_PADDING;
    const guideBottom = (CANVAS_HEIGHT + CANVAS_FONT_SIZE) / 2 + GUIDE_HIT_PADDING;
    return { left: guideLeft, right: guideRight, top: guideTop, bottom: guideBottom };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    activeCharIndexRef.current = getCharIndexFromX(x);
    // Update UI state without triggering a template redraw.
    setAttempt((prev) => ({ ...prev, currentCharIndexInWord: activeCharIndexRef.current }));

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
    setCurrentStroke([{ x, y, t: Date.now() }]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    setCurrentStroke((prev) => [...prev, { x, y, t: Date.now() }]);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    // Commit stroke to current character
    setCurrentStroke((stroke) => {
      if (stroke.length < MIN_POINTS_PER_STROKE) {
        // ignore noise stroke
        return [];
      }
      setAttempt((prev) => {
        const chars = [...prev.characters];
        const idx = activeCharIndexRef.current;
        const existing = chars[idx] || { id: idx + 1, strokes: [] };
        const updated: CharacterAttempt = { ...existing, strokes: [...existing.strokes, stroke] };
        chars[idx] = updated;
        strokeHistoryRef.current.push({ charIndex: idx, strokeRef: stroke });
        return { ...prev, characters: chars, currentCharIndexInWord: idx };
      });
      return [];
    });
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Clear user ink, then redraw template guidelines
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setCurrentStroke([]);
      setFeedback('');
      setScore(null);
      setScoringMethod('');
      setIsDrawing(false);
      setStrokeValidation(null);
    }
    drawGuidelines({ redrawInk: true });
  };

  /** Xóa toàn bộ nét của từ đang luyện (mọi ô), bắt đầu viết lại từ đầu. */
  const rewriteEntireWord = () => {
    strokeHistoryRef.current = [];
    setCharInkStyle({});
    setScore(null);
    setScoreDetail(null);
    setFeedback('');
    setScoringMethod('');
    setStrokeValidation(null);
    setCurrentStroke([]);
    setIsDrawing(false);
    setAttempt((prev) => {
      const len = Math.max(1, prev.characters.length || wordChars.length);
      return {
        ...prev,
        characters: Array.from({ length: len }, (_, idx) => ({ id: idx + 1, strokes: [] })),
        currentCharIndexInWord: 0,
      };
    });
    setTimeout(() => drawGuidelines({ redrawInk: true }), 0);
  };

  const clearCurrentCharacter = () => {
    clearCanvas();
    setAttempt((prev) => {
      const idx = prev.currentCharIndexInWord;
      strokeHistoryRef.current = strokeHistoryRef.current.filter((e) => e.charIndex !== idx);
      const chars = [...prev.characters];
      chars[idx] = { id: idx + 1, strokes: [] };
      return { ...prev, characters: chars };
    });
  };

  /** Từ vựng tiếp theo trong danh sách luyện (không phải ký tự hướng dẫn trong cùng một từ). */
  const goToNextVocabularyInList = () => {
    if (characters.length === 0 || currentCharIndex >= characters.length - 1) return;
    setStrokeValidation(null);
    setCharInkStyle({});
    setScoreDetail(null);
    setScoringMethod('');
    setScore(null);
    setFeedback('');
    setCurrentCharIndex((i) => i + 1);
    setQuestionStartTime(Date.now());
  };

  const goToWordIndex = (i: number) => {
    if (characters.length === 0 || i < 0 || i >= characters.length || i === currentCharIndex) return;
    setScore(null);
    setScoreDetail(null);
    setFeedback('');
    setCharInkStyle({});
    setStrokeValidation(null);
    setScoringMethod('');
    setCurrentCharIndex(i);
    setQuestionStartTime(Date.now());
  };

  const computeValidation = () => {
    const template = attempt.template;
    const expectedStrokeCountForCurrentChar =
      template[attempt.currentCharIndexInWord]?.expectedStrokeCount ?? 0;

    const chars = attempt.characters;
    const currentCharAttempt = chars[attempt.currentCharIndexInWord];
    const currentCharStrokeCount = currentCharAttempt?.strokes?.length || 0;
    const hasInvalidStroke =
      (currentCharAttempt?.strokes || []).some((s) => !s || s.length < MIN_POINTS_PER_STROKE);

    // Loose progress: count a character as "written" if it has at least one valid stroke
    const currentCharacterCount = chars.filter((c) => {
      if (!c || !Array.isArray(c.strokes)) return false;
      return c.strokes.some((s) => Array.isArray(s) && s.length >= MIN_POINTS_PER_STROKE);
    }).length;

    return {
      expectedCharacterCount,
      currentCharacterCount,
      currentCharStrokeCount,
      expectedStrokeCountForCurrentChar,
      hasInvalidStroke,
    };
  };

  const handleCheckWriting = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const v = computeValidation();
    setStrokeValidation(v);

    // Partial mode: allow scoring anytime. Only block if current character has invalid noise strokes.
    if (v.hasInvalidStroke) {
      setFeedback('Có nét quá ngắn / không hợp lệ. Vui lòng viết lại.');
      setScore(null);
      return;
    }

    const hasAnyValidStrokeInWord = attempt.characters.some((c) =>
      (c?.strokes || []).some((s) => Array.isArray(s) && s.length >= MIN_POINTS_PER_STROKE)
    );
    if (!hasAnyValidStrokeInWord) {
      setFeedback('Hãy viết ít nhất một nét hợp lệ trước khi chấm điểm.');
      setScore(null);
      return;
    }

    const guideChars = displayedWordChars.length > 0 ? displayedWordChars : ['한'];
    const cellMetrics = getWritingCellMetrics(guideChars);
    const guideRects = guideChars.map((_, i) => getGuideHitRectForCell(i, cellMetrics));
    const strokesTouchGuide = attempt.characters.some((c) =>
      (c?.strokes || []).some(
        (stroke) =>
          Array.isArray(stroke) &&
          stroke.length >= MIN_POINTS_PER_STROKE &&
          guideRects.some((r) =>
            stroke.some(
              (p) => p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom
            )
          )
      )
    );
    if (!strokesTouchGuide) {
      setScore(0);
      setScoreDetail(null);
      setCharInkStyle({});
      setFeedback('Không có nét nào chạm vùng chữ hướng dẫn — 0%.');
      setScoringMethod('client-validate');
      return;
    }

    setIsScoring(true);
    const currentCharData2 = characters[currentCharIndex];

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/writing/score-word`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            word: currentCharData2.korean,
            expectedCharacterCount,
            characters: attempt.characters.map((c) => ({ strokes: c?.strokes || [] })),
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setScore(typeof data.score === 'number' ? data.score : 0);
        const completed = data.completedCharacterCount ?? v.currentCharacterCount;
        const expected = data.expectedCharacterCount ?? v.expectedCharacterCount;
        setFeedback(data.error ? String(data.error) : (data.feedback || `Đã viết ${completed}/${expected} chữ`));
        setScoreDetail({
          shape: data.detail?.shape,
          order: data.detail?.order,
          direction: data.detail?.direction,
          position: data.detail?.position,
          completedCharacterCount: completed,
          expectedCharacterCount: expected,
          characterScores: data.characterScores,
        });
        if (Array.isArray(data.characterScores)) {
          const m: Record<number, { color: string }> = {};
          for (const c of data.characterScores) {
            if (c?.error || c?.score === 0) m[c.index] = { color: '#c62828' }; // red
            else if (c?.score >= 70) m[c.index] = { color: '#2e7d32' }; // green
            else m[c.index] = { color: '#815300' }; // amber
          }
          setCharInkStyle(m);
          // Redraw template + ink with highlight colors
          drawGuidelines({ redrawInk: true });
        }
        setScoringMethod('partial-word');
      } else {
        setScore(0);
        setFeedback('Không thể chấm điểm, hãy thử lại');
        setScoreDetail(null);
        setCharInkStyle({});
        setScoringMethod('error');
      }
    } catch {
      setScore(0);
      setFeedback('Lỗi kết nối server');
      setScoreDetail(null);
      setCharInkStyle({});
      setScoringMethod('error');
    } finally {
      setIsScoring(false);
    }
  };

  useEffect(() => {
    // load template per word for strict validation
    const loadTemplate = async () => {
      const word = currentWord;
      if (!word || !token) return;
      try {
        const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/writing/template?word=${encodeURIComponent(word)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          strokeHistoryRef.current = [];
          setAttempt({
            word,
            template: data.characters || [],
            characters: Array.from(word).map((_, idx) => ({ id: idx + 1, strokes: [] })),
            currentCharIndexInWord: 0,
          });
        }
      } catch {
        // non-blocking: keep empty template
      }
    };
    loadTemplate();
  }, [currentCharIndex, currentWord, token]);

  const saveWritingHistory = async (resultsToSave: ResultItem[]) => {
    try {
      console.log('💾 Saving writing history...');
      console.log('📦 Data being sent:', {
        questionCount: resultsToSave.length,
        slug,
        skillType: 'WRITING',
        questions: resultsToSave.map((r) => ({
          korean: r.question,
          accuracy: r.accuracy,
        })),
      });
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/quiz/save-learning-history`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            questions: resultsToSave.map((result) => ({
              korean: result.question,
              vietnamese: characters.find(c => c.korean === result.question)?.vietnamese || '',
              accuracy: result.accuracy,
            })),
            slug: slug,
            skillType: 'WRITING',
          }),
        }
      );

      console.log(`📡 Response status: ${response.status}`);
      
      const result = await response.json();
      if (response.ok) {
        console.log('✅ Writing history saved:', result);
      } else {
        console.warn('⚠️ Failed to save history:', result.message, result);
      }
    } catch (error) {
      console.error('❌ Error saving writing history:', error);
    }
  };

  const nextChar = async () => {
    if (score !== null) {      const currentChar = characters[currentCharIndex];
      const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
      const isCorrect = score >= 50;
      const xp = isCorrect ? 10 : 0;
      
      // Build result item
      const resultItem: ResultItem = {
        question: currentChar.korean,
        correctAnswer: currentChar.romanization,
        accuracy: score,
        isCorrect,
        xp,
        timeSpent,
      };
      
      // Add to results array
      setResults([...results, resultItem]);
      setTotalScores([...totalScores, score]);

      const nextIndex = currentCharIndex + 1;

      console.log(`📝 Progress: ${nextIndex}/${characters.length}, Score: ${score}%, Completed: ${nextIndex >= characters.length}`);

      // Check if completed all characters
      if (nextIndex >= characters.length) {
        console.log('🏁 All characters completed! Saving history...');
        const updatedResults = [...results, resultItem];
        const totalTimeSpent = updatedResults.reduce((sum, r) => sum + r.timeSpent, 0);
        
        await saveWritingHistory(updatedResults);
        await logLearningTime(totalTimeSpent, 'writing');
        
        console.log('✅ All save operations completed, setting isCompleted = true');
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(writingWordIndexKey(slug));
        }
        setIsCompleted(true);
        return;
      }

      setCurrentCharIndex(nextIndex);
      setQuestionStartTime(Date.now());
      setScoringMethod('');
      clearCanvas();
    } else {
      // No score yet — trigger AI scoring instead
      handleCheckWriting();
    }
  };

  const logLearningTime = async (totalSeconds: number, skillType: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/activity/log-time`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            totalSeconds: Math.round(totalSeconds),
            skillType,
            sessionCount: 1,
          }),
        }
      );

      if (response.ok) {
        console.log(`✅ Logged ${Math.round(totalSeconds)}s of ${skillType} learning`);
      } else {
        console.warn('⚠️ Failed to log learning time');
      }
    } catch (error) {
      console.warn('⚠️ Error logging learning time:', error);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#fafaf5]"
      style={{
        backgroundImage: 'radial-gradient(#d4c3be 0.5px, transparent 0.5px)',
        backgroundSize: '24px 24px',
      }}
    >
      <Header />

      {/* Loading Screen */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#72564c] border-t-transparent"></div>
          <p className="text-[#504441] font-medium">Đang tải các bài viết...</p>
        </div>
      ) : isCompleted ? (
        <ResultSummary
          results={results}
          mode="writing"
          topicName={topicName}
          backPath="/learning-map?refresh=true"
          continueAction={() => router.push('/learning-map?refresh=true')}
        />
      ) : (
        <>
          {/* 3-column grid: equal side columns so canvas centers with HANGUL logo */}
          <div className="grid min-h-screen" style={{ gridTemplateColumns: '360px 1fr 360px' }}>

          {/* ── LEFT SIDEBAR ─────────────────────────────── */}
          <aside className="flex flex-col pb-10" style={{ paddingLeft: '25px', paddingTop: '20px' }}>
            {/* Back Button — 20px below header spacer */}
            <button
              onClick={() => router.push('/writing')}
              className="flex items-center gap-2 px-4 py-2 text-[#72564c] hover:text-[#504441] font-semibold transition-all hover:scale-105 active:scale-95 self-start"
            >
              <span className="text-xl">←</span>
              <span>Quay lại</span>
            </button>

            {/* Current Character Display */}
            <div className="mt-4 bg-white rounded-xl shadow-[0_40px_100px_rgba(43,22,15,0.08)] p-8 text-left">
              <p className="text-xs uppercase tracking-widest text-[#72564c]/60 mb-3 font-bold">Nét vẽ hiện tại</p>
              <p className="text-7xl font-bold text-[#72564c]">{currentCharInWord}</p>
            </div>

            {/* 50px gap then Stroke Order Guide */}
            {currentCharInWord && (
              <div style={{ marginTop: '50px' }}>
                <StrokeOrderGuide word={currentCharInWord} />
              </div>
            )}
          </aside>

          {/* ── CENTER MAIN ──────────────────────────────── */}
          <main className="flex flex-col items-center pb-12" style={{ paddingTop: '30px' }}>

          {/* Topic Name — same vertical level as Quay lại button */}
          {topicName && (
            <div className="mb-6 text-center">
              <h2 className="text-4xl font-bold text-[#72564c]">{topicName}</h2>
            </div>
          )}
          
          {/* Current word display (to explain character count) */}
          {currentWord && (
            <div className="mb-4 text-center">
              <p className="text-xs uppercase tracking-widest text-[#72564c]/60 font-bold mb-1">Từ hiện tại</p>
              <p className="text-2xl font-extrabold text-[#504441]">
                {currentWord}
              </p>
            </div>
          )}

          {characters.length > 0 && (
            <div className="mb-6 w-full flex flex-col items-center px-2" style={{ maxWidth: 640 }}>
              <p className="text-sm font-bold text-[#72564c] mb-1">
                Đang viết từ{' '}
                <span className="text-lg text-[#504441]">{currentCharIndex + 1}</span>
                <span className="text-[#8d6e63] font-semibold"> / {characters.length}</span>
              </p>
              <p className="text-[11px] text-[#8d6e63] mb-3 text-center">
                Tiến độ được giữ khi tải lại trang (F5)
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {characters.map((voc, i) => (
                  <button
                    key={voc.id ?? i}
                    type="button"
                    title={voc.korean}
                    onClick={() => goToWordIndex(i)}
                    className={`h-10 min-w-[2.5rem] px-2 rounded-xl text-sm font-black transition-all border-2 ${
                      i === currentCharIndex
                        ? 'bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white border-[#5b4137] shadow-md scale-105'
                        : 'bg-white text-[#72564c] border-[#e8dcd4] hover:border-[#72564c] hover:bg-[#fafaf5]'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Canvas Container */}
          <div
            ref={canvasContainerRef}
            className="bg-white rounded-xl shadow-[0_40px_100px_rgba(43,22,15,0.08)] relative overflow-hidden flex items-center justify-center group mb-10 transition-all duration-200"
            style={{ width: `${canvasWidth}px`, height: '600px' }}
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
              <span className="text-[18rem] text-[#eeeee9] font-bold opacity-40">{currentCharInWord}</span>
            </div>

            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="absolute inset-0 w-full h-full cursor-crosshair"
              style={{ 
                width: '100%', 
                height: '100%',
                display: 'block'
              }}
            />
          </div>

          {/* Progress Indicator */}
          <div className="flex gap-6 mb-4" style={{ width: '600px' }}>
            <div className="flex-1 bg-white rounded-lg p-4 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-widest text-[#72564c]/60 font-bold">Tiến trình</span>
                <span className="text-sm font-bold text-[#72564c]">
                  {currentCharIndex + 1} / {characters.length}
                </span>
              </div>
              <div className="w-full bg-[#f0f0f0] rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-[#72564c] to-[#8d6e63] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentCharIndex + 1) / Math.max(1, characters.length)) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Character Validation Indicator */}
            {strokeValidation && (
              <div className={`flex-1 rounded-lg p-4 shadow-md transition-all ${
                strokeValidation.currentCharacterCount === strokeValidation.expectedCharacterCount
                  ? 'bg-green-50 border-2 border-green-200' 
                  : 'bg-red-50 border-2 border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase tracking-widest font-bold">
                    {strokeValidation.currentCharacterCount === strokeValidation.expectedCharacterCount ? '✅' : '⚠️'} So chu
                  </span>
                  <span className={`text-sm font-bold ${
                    strokeValidation.currentCharacterCount === strokeValidation.expectedCharacterCount
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {strokeValidation.currentCharacterCount} / {strokeValidation.expectedCharacterCount} chu
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full transition-all ${
                      strokeValidation.currentCharacterCount === strokeValidation.expectedCharacterCount
                        ? 'bg-green-500' 
                        : 'bg-red-400'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (strokeValidation.currentCharacterCount /
                          Math.max(1, strokeValidation.expectedCharacterCount)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-6 mb-8" style={{ width: '600px' }}>
            <button
              type="button"
              onClick={rewriteEntireWord}
              className="flex-1 bg-[#eeeee9] text-[#72564c] font-bold py-5 rounded-full border-b-4 border-[#d4c3be]/30 hover:bg-[#e8e8e3] transition-colors flex items-center justify-center gap-3 text-center leading-tight px-2"
            >
              Viết lại toàn bộ
            </button>
            <button
              onClick={score !== null ? nextChar : handleCheckWriting}
              disabled={isScoring}
              className="flex-[2] bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white font-black text-lg py-5 rounded-full shadow-[0_15px_30px_rgba(114,86,76,0.25)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
            >
              {isScoring ? (
                <><span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> Đang chấm điểm...</>
              ) : score !== null ? 'Ký tự tiếp theo' : 'Kiểm tra'}
            </button>
          </div>

          {/* Word progress (single page, write continuously) */}
          <div className="mb-8 flex items-center justify-between rounded-lg bg-white p-4 shadow-md" style={{ width: '600px' }}>
            <div className="flex flex-col justify-center">
              <span className="text-xs font-semibold text-[#8d6e63]">
                Đang viết chữ {attempt.currentCharIndexInWord + 1}/{expectedCharacterCount}:{' '}
                <span className="text-[#72564c]">{currentCharInWord}</span>
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearCurrentCharacter}
                className="rounded-lg border border-[#e8dcd4] bg-white px-3 py-2 text-xs font-bold text-[#504441] hover:bg-[#fafaf5] transition"
              >
                Viết lại chữ này
              </button>
              <button
                type="button"
                onClick={goToNextVocabularyInList}
                disabled={currentCharIndex >= characters.length - 1}
                className="rounded-lg bg-[#72564c] px-3 py-2 text-xs font-bold text-white hover:bg-[#5b4137] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#72564c]"
              >
                Chữ tiếp theo
              </button>
            </div>
          </div>

          {/* Brush Size & Color Palette */}
          <div className="flex gap-6 mb-8" style={{ width: '600px' }}>
            <div className="flex-1 bg-white rounded-lg p-6 shadow-md">
              <span className="text-xs uppercase tracking-widest text-[#72564c]/60 block mb-4 font-bold">Kích cỡ bút vẽ</span>
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setBrushSize(2)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    brushSize === 2 ? 'bg-gradient-to-r from-[#72564c] to-[#8d6e63] shadow-lg scale-105' : 'bg-[#eeeee9] border-2 border-[#72564c]/20 hover:translate-x-1'
                  }`}
                >
                  <div className={`rounded-full ${brushSize === 2 ? 'w-2 h-2 bg-white' : 'w-1 h-1 bg-[#72564c]'}`}></div>
                </button>
                <button
                  onClick={() => setBrushSize(3)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    brushSize === 3 ? 'bg-gradient-to-r from-[#72564c] to-[#8d6e63] shadow-lg scale-105' : 'bg-[#eeeee9] border-2 border-[#72564c]/20 hover:translate-x-1'
                  }`}
                >
                  <div className={`rounded-full ${brushSize === 3 ? 'w-3 h-3 bg-white' : 'w-2 h-2 bg-[#72564c]'}`}></div>
                </button>
                <button
                  onClick={() => setBrushSize(4)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    brushSize === 4 ? 'bg-gradient-to-r from-[#72564c] to-[#8d6e63] shadow-lg scale-105' : 'bg-[#eeeee9] border-2 border-[#72564c]/20 hover:translate-x-1'
                  }`}
                >
                  <div className={`rounded-full ${brushSize === 4 ? 'w-5 h-5 bg-white' : 'w-3 h-3 bg-[#72564c]'}`}></div>
                </button>
              </div>
            </div>

            <div className="flex-1 bg-white rounded-lg p-6 shadow-md">
              <span className="text-xs uppercase tracking-widest text-[#72564c]/60 block mb-4 font-bold">Màu bút vẽ</span>
              <div className="grid grid-cols-6 gap-3">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setBrushColor(color)}
                    className={`aspect-square rounded-full transition-all ${
                      brushColor === color ? 'scale-110 shadow-lg border-4 border-white' : 'border-2 border-white/50 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Feedback Modal */}
          {score !== null && (
            <>
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
              <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                <div className="bg-white rounded-2xl p-8 shadow-2xl border-3 border-[#72564c] w-80 pointer-events-auto">
                  <div className="text-center mb-6">
                    <p className="text-xs uppercase font-bold text-[#504441] tracking-wider mb-3">Score</p>
                    <p className="text-6xl font-black text-[#72564c] mb-4">{score}%</p>
                    <p className="text-lg font-bold text-[#8d6e63]">{feedback}</p>

                    {scoreDetail && (
                      <div className="mt-5 text-left bg-[#fafaf5] rounded-xl p-4 border border-[#e8dcd4]">
                        <p className="text-[11px] uppercase tracking-widest font-bold text-[#72564c]/70 mb-3">
                          Vì sao được điểm này
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-[#504441]">
                          <div>Hình dạng: {Math.round((scoreDetail.shape ?? 0) * 100)}%</div>
                          <div>Thứ tự: {Math.round((scoreDetail.order ?? 0) * 100)}%</div>
                          <div>Hướng nét: {Math.round((scoreDetail.direction ?? 0) * 100)}%</div>
                          <div>Vị trí: {Math.round((scoreDetail.position ?? 0) * 100)}%</div>
                        </div>
                        <div className="mt-3 text-xs text-[#8d6e63] font-bold">
                          Đã chấm: {scoreDetail.completedCharacterCount ?? 0}/{scoreDetail.expectedCharacterCount ?? expectedCharacterCount} chữ
                        </div>

                        {Array.isArray(scoreDetail.characterScores) && scoreDetail.characterScores.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {scoreDetail.characterScores.slice(0, 6).map((c) => (
                              <div key={c.index} className="flex items-center justify-between text-xs">
                                <span className="font-bold text-[#72564c]">Chữ {c.index + 1}</span>
                                <span className={`font-bold ${c.error ? 'text-red-600' : 'text-green-700'}`}>
                                  {c.score}%{c.error ? ` (${c.error})` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-6 pt-6 border-t-2 border-[#f0f0f0]">
                      <p className="text-xs uppercase font-bold text-[#72564c]/60 tracking-wider mb-2">Meaning</p>
                      <p className="text-md font-semibold text-[#72564c]">
                        {characters[currentCharIndex]?.english} - {characters[currentCharIndex]?.vietnamese}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={nextChar}
                      className="w-full bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white py-4 rounded-lg font-bold hover:scale-105 active:scale-95 transition-all shadow-lg"
                    >
                      Next Character
                    </button>
                    <button
                      onClick={clearCanvas}
                      className="w-full bg-[#f0e6e0] text-[#72564c] py-3 rounded-lg font-bold hover:bg-[#e8dcd4] active:scale-95 transition-all"
                    >
                      ↩ Viết lại
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>

          {/* ── RIGHT COLUMN ── Tiến độ aligned with Nét vẽ hiện tại ── */}
          {/* paddingTop = 20 (aside pt) + ~40 (back btn height) + 16 (mt-4) = ~76px */}
          <div className="pb-10" style={{ paddingLeft: '32px', paddingTop: '76px', paddingRight: '32px' }}>
            <div className="w-64 bg-white rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-[#72564c] uppercase">Tiến độ</span>
                <span className="text-sm font-bold text-[#8d6e63]">
                  {currentCharIndex + 1}/{Math.max(1, characters.length)}
                </span>
              </div>
              <div className="w-full bg-[#e8dcd3] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#72564c] to-[#8d6e63] h-2 transition-all duration-300"
                  style={{
                    width: `${((currentCharIndex + 1) / Math.max(1, characters.length)) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          </div>{/* end grid */}
        </>
      )}
      <Footer />
    </div>
  );
}
