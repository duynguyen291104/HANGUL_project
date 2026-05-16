'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import { useAuthStore } from '@/store/authStore';
import ResultSummary, { type ResultItem } from '@/components/ResultSummary';
import StrokeOrderGuide from '@/components/StrokeOrderGuide';
import Footer from '@/components/Footer';

function AutoFitText({
  text,
  maxFontPx = 288,
  minFontPx = 24,
}: {
  text: string;
  maxFontPx?: number;
  minFontPx?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);
  const [fontPx, setFontPx] = useState(maxFontPx);

  useLayoutEffect(() => {
    const fit = () => {
      const container = containerRef.current;
      const span = spanRef.current;
      if (!container || !span) return;

      const cw = container.clientWidth;
      const ch = container.clientHeight;
      let lo = minFontPx;
      let hi = maxFontPx;

      while (lo < hi) {
        const mid = Math.floor((lo + hi + 1) / 2);
        span.style.fontSize = `${mid}px`;

        if (span.scrollWidth <= cw && span.scrollHeight <= ch) {
          lo = mid;
        } else {
          hi = mid - 1;
        }
      }

      setFontPx(lo);
      span.style.fontSize = `${lo}px`;
    };

    fit();

    const ro = new ResizeObserver(fit);
    if (containerRef.current) ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, [text, maxFontPx, minFontPx]);

  return (
    <div ref={containerRef} className="w-[90%] h-[90%] flex items-center justify-center mx-auto overflow-hidden">
      <span
        ref={spanRef}
        className="text-[#eeeee9] opacity-40 text-center"
        style={{
          fontSize: `${fontPx}px`,
          lineHeight: 1.2,
          fontWeight: 700,
          whiteSpace: 'normal',
          wordBreak: 'keep-all',
          overflowWrap: 'break-word',
        }}
      >
        {text}
      </span>
    </div>
  );
}

interface ExercisePoint {
  x: number;
  y: number;
  time: number;
  strokeId: number;
}

interface Vocabulary {
  id: number;
  korean: string;
  english: string;
  vietnamese: string;
  romanization: string;
}

interface ScoreDetail {
  shape?: number;
  order?: number;
  direction?: number;
  position?: number;
}

const CANVAS_HEIGHT = 600;
const CANVAS_FONT_SIZE = 280;
const CANVAS_PADDING_X = 100;

function normalizeScoreDetail(data: any): ScoreDetail | null {
  const raw = data?.detail ?? data?.scoreDetail ?? data?.details ?? data?.breakdown;
  if (!raw) return null;

  const toUnit = (value: unknown) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return undefined;
    return n > 1 ? n / 100 : n;
  };

  const detail: ScoreDetail = {
    shape: toUnit(raw.shape ?? raw.shapeScore),
    order: toUnit(raw.order ?? raw.orderScore),
    direction: toUnit(raw.direction ?? raw.directionScore),
    position: toUnit(raw.position ?? raw.positionScore),
  };

  return Object.values(detail).some((v) => typeof v === 'number') ? detail : null;
}

export default function WritingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuthStore();
  const slug = params.slug as string;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const strokeHistoryRef = useRef<ImageData[]>([]);
  const brushSizesUsed = useRef<number[]>([]);
  const currentStrokeIdRef = useRef(0);

  const [canvasWidth, setCanvasWidth] = useState(670);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<ExercisePoint[]>([]);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [scoreDetail, setScoreDetail] = useState<ScoreDetail | null>(null);
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
  const [activePanel, setActivePanel] = useState<'brush' | 'color' | 'guide' | null>(null);

  const colors = ['#72564c', '#8d6e63', '#5b4137', '#827470', '#504441', '#ffdbce'];
  const currentChar = characters.length > 0 ? characters[currentCharIndex]?.korean : '한';

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
    ctx.fillText(currentChar, canvas.width / 2, canvas.height / 2);
  };

  useEffect(() => {
    const fetchTopic = async () => {
      if (!slug) return;

      try {
        const topicResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/topic/slug/${slug}`);

        if (topicResponse.ok) {
          const topicData = await topicResponse.json();
          setTopicName(topicData.name);
          setTopicId(topicData.id);

          if (topicData.id) {
            const vocabResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/public-vocab/random-by-topic/${topicData.id}?limit=10`
            );

            if (vocabResponse.ok) {
              const vocabData = await vocabResponse.json();

              if (vocabData.data && Array.isArray(vocabData.data)) {
                setCharacters(vocabData.data);
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

    setStrokes([]);
    setScore(null);
    setScoreDetail(null);
    setFeedback('');
    strokeHistoryRef.current = [];
    brushSizesUsed.current = [];
    currentStrokeIdRef.current = 0;
  }, [currentCharIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const offscreen = document.createElement('canvas');
    const offCtx = offscreen.getContext('2d');
    let measuredWidth = CANVAS_HEIGHT;

    if (offCtx) {
      offCtx.font = `bold ${CANVAS_FONT_SIZE}px 'Plus Jakarta Sans', serif`;
      measuredWidth = Math.ceil(offCtx.measureText(currentChar).width);
    }

    const computedWidth = Math.max(650, measuredWidth + CANVAS_PADDING_X * 2);
    const maxCanvasWidth = Math.floor(window.innerWidth * 0.9);
    const finalWidth = Math.min(computedWidth, maxCanvasWidth);

    canvas.width = finalWidth;
    canvas.height = CANVAS_HEIGHT;
    setCanvasWidth(finalWidth);

    redrawCanvas();
  }, [currentChar]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      strokeHistoryRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }

    currentStrokeIdRef.current += 1;
    brushSizesUsed.current.push(brushSize);
    setIsDrawing(true);

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const now = Date.now();

    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    setStrokes((prev) => [
      ...prev,
      {
        x: (x / canvas.width) * 100,
        y: (y / canvas.height) * 100,
        time: now,
        strokeId: currentStrokeIdRef.current,
      },
    ]);
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

    setStrokes((prev) => [
      ...prev,
      {
        x: (x / canvas.width) * 100,
        y: (y / canvas.height) * 100,
        time: Date.now(),
        strokeId: currentStrokeIdRef.current,
      },
    ]);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const undoLastStroke = () => {
    const canvas = canvasRef.current;
    if (!canvas || strokeHistoryRef.current.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const snapshot = strokeHistoryRef.current.pop()!;
    ctx.putImageData(snapshot, 0, 0);
    brushSizesUsed.current.pop();

    setStrokes((prev) => {
      const lastStrokeId = prev.at(-1)?.strokeId;
      if (!lastStrokeId) return prev;
      return prev.filter((p) => p.strokeId !== lastStrokeId);
    });
  };

  const clearCanvas = () => {
    redrawCanvas();
    setStrokes([]);
    setFeedback('');
    setScore(null);
    setScoreDetail(null);
    setScoringMethod('');
    setIsDrawing(false);
    strokeHistoryRef.current = [];
    brushSizesUsed.current = [];
    currentStrokeIdRef.current = 0;
  };

  const handleCheckWriting = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (strokes.length === 0) {
      setFeedback('Hãy viết ký tự trước khi chấm điểm!');
      setScore(0);
      setScoreDetail(null);
      setIsScoring(false);
      return;
    }

    setIsScoring(true);
    const currentCharData = characters[currentCharIndex];

    try {
      const imageBase64 = canvas.toDataURL('image/png');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/writing/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageBase64,
          korean: currentCharData.korean,
          romanization: currentCharData.romanization,
          meaning: currentCharData.vietnamese,
          topicId,
          strokes,
          brushMetadata: {
            sizes: brushSizesUsed.current,
            strokeCount: brushSizesUsed.current.length,
            avgSize:
              brushSizesUsed.current.length > 0
                ? brushSizesUsed.current.reduce((a, b) => a + b, 0) / brushSizesUsed.current.length
                : brushSize,
            maxSize: brushSizesUsed.current.length > 0 ? Math.max(...brushSizesUsed.current) : brushSize,
            minSize: brushSizesUsed.current.length > 0 ? Math.min(...brushSizesUsed.current) : brushSize,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setScore(data.accuracy);
        setFeedback(data.feedback || '');
        setScoreDetail(normalizeScoreDetail(data));
        setScoringMethod(data.method || '');
      } else {
        setScore(50);
        setFeedback('Không thể chấm điểm, hãy thử lại');
        setScoreDetail(null);
        setScoringMethod('error');
      }
    } catch {
      setScore(50);
      setFeedback('Lỗi kết nối server');
      setScoreDetail(null);
      setScoringMethod('error');
    } finally {
      setIsScoring(false);
    }
  };

  const saveWritingHistory = async (resultsToSave: ResultItem[]) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/quiz/save-learning-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questions: resultsToSave.map((result) => ({
            korean: result.question,
            vietnamese: characters.find((c) => c.korean === result.question)?.vietnamese || '',
            accuracy: result.accuracy,
          })),
          slug,
          skillType: 'WRITING',
        }),
      });

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

  const logLearningTime = async (totalSeconds: number, skillType: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/activity/log-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          totalSeconds: Math.round(totalSeconds),
          skillType,
          sessionCount: 1,
        }),
      });

      if (response.ok) {
        console.log(`✅ Logged ${Math.round(totalSeconds)}s of ${skillType} learning`);
      } else {
        console.warn('⚠️ Failed to log learning time');
      }
    } catch (error) {
      console.warn('⚠️ Error logging learning time:', error);
    }
  };

  const nextChar = async () => {
    if (score !== null) {
      setActivePanel(null);

      const currentCharData = characters[currentCharIndex];
      const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
      const isCorrect = score >= 50;
      const xp = isCorrect ? 10 : 0;

      const resultItem: ResultItem = {
        question: currentCharData.korean,
        correctAnswer: currentCharData.romanization,
        accuracy: score,
        isCorrect,
        xp,
        timeSpent,
        english: currentCharData.english,
        vietnamese: currentCharData.vietnamese,
      };

      const updatedResults = [...results, resultItem];
      setResults(updatedResults);
      setTotalScores((prev) => [...prev, score]);

      const nextIndex = currentCharIndex + 1;

      if (nextIndex >= characters.length) {
        const totalTimeSpent = updatedResults.reduce((sum, r) => sum + r.timeSpent, 0);

        await saveWritingHistory(updatedResults);
        await logLearningTime(totalTimeSpent, 'writing');

        setIsCompleted(true);
        return;
      }

      setCurrentCharIndex(nextIndex);
      setQuestionStartTime(Date.now());
      setScoringMethod('');
      setScoreDetail(null);
      clearCanvas();
    } else {
      handleCheckWriting();
    }
  };

  if (isCompleted) {
    return (
      <ResultSummary
        results={results}
        mode="writing"
        topicName={topicName}
        backPath="/learning-map?refresh=true"
        continueAction={() => router.push('/writing')}
      />
    );
  }

  return (
    <div
      className="w-full min-h-screen bg-[#fafaf5]"
      style={{
        backgroundImage: 'radial-gradient(#d4c3be 0.5px, transparent 0.5px)',
        backgroundSize: '24px 24px',
      }}
    >
      <Header />

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight: 'calc(100vh - 75px)' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#72564c] border-t-transparent" />
          <p className="text-[#504441] font-medium">Đang tải các bài viết...</p>
        </div>
      ) : (
        <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 75px)' }}>
          <div style={{ paddingTop: '20px', paddingLeft: '25px', paddingRight: '25px' }}>
            <button
              onClick={() => router.push('/writing')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[#72564c] hover:text-[#504441] font-semibold transition-all hover:scale-105 active:scale-95"
              style={{ fontSize: '20px' }}
            >
              <span>←</span>
              <span>Quay lại</span>
            </button>
          </div>

          <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 pb-4" style={{ paddingTop: '20px' }}>
            <section className="shrink-0 w-full">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[#72564c] tracking-tight" style={{ fontSize: '20px' }}>
                  Chủ đề bài học: {topicName || 'Luyện viết'}
                </span>
                <span className="font-bold text-[#72564c]/60" style={{ fontSize: '20px' }}>
                  {currentCharIndex + 1} / {characters.length || 10}
                </span>
              </div>

              <div className="w-full h-2 bg-[#eeeee9] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#72564c] to-[#8d6e63] rounded-full transition-all duration-500"
                  style={{ width: `${((currentCharIndex + 1) / (characters.length || 10)) * 100}%` }}
                />
              </div>
            </section>

            <div className="shrink-0 flex flex-col items-center" style={{ marginTop: '20px', marginBottom: '20px' }}>
              <p className="font-bold text-[#72564c] leading-none text-center" style={{ fontSize: '36px' }}>
                Luyện nét chữ của bạn cho từ &ldquo;{currentChar}&rdquo;
              </p>

              {characters[currentCharIndex] && (
                <div className="flex items-center gap-4" style={{ marginTop: '20px' }}>
                  <span className="text-[#504441]/70" style={{ fontSize: '20px' }}>
                    Phiên âm:{' '}
                    <span className="font-bold text-[#72564c]">{characters[currentCharIndex].romanization}</span>
                  </span>
                  <span className="text-[#504441]/40">·</span>
                  <span className="text-[#504441]/70" style={{ fontSize: '20px' }}>
                    Nghĩa:{' '}
                    <span className="font-bold text-[#72564c]">{characters[currentCharIndex].vietnamese}</span>
                  </span>
                </div>
              )}
            </div>

            <div className="relative flex-1" style={{ minHeight: '600px' }}>
              {activePanel && <div className="fixed inset-0 z-[39]" onClick={() => setActivePanel(null)} />}

              <div className="flex flex-col items-center w-full">
                <div
                  ref={canvasContainerRef}
                  className="bg-white rounded-xl shadow-[0_10px_30px_rgba(43,22,15,0.08)] relative overflow-hidden flex items-center justify-center transition-all duration-200"
                  style={{ width: `${canvasWidth}px`, maxWidth: '90vw', height: '500px', maxHeight: '500px' }}
                >
                  <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
                    <AutoFitText text={currentChar} />
                  </div>

                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="absolute inset-0 w-full h-full cursor-crosshair"
                    style={{ width: '100%', height: '100%', display: 'block' }}
                  />
                </div>

                <div className="flex items-center gap-4" style={{ marginTop: '35px' }}>
                  <div
                    ref={toolbarRef}
                    className="relative flex flex-row gap-1 bg-white rounded-2xl shadow-[0_10px_30px_rgba(43,22,15,0.12)] p-2"
                  >
                    {activePanel && (
                      <div
                        className={`absolute z-[50] rounded-2xl ${
                          activePanel === 'guide' ? '' : 'bg-white border border-[#e8dbd4] p-5'
                        }`}
                        style={{
                          width: activePanel === 'guide' ? 'auto' : '260px',
                          bottom: 'calc(100% + 8px)',
                          left: 0,
                        }}
                      >
                        {activePanel !== 'guide' && (
                          <div className="mb-4">
                            <p
                              className="uppercase tracking-widest text-[#72564c]/60 font-bold"
                              style={{ fontSize: '20px' }}
                            >
                              {activePanel === 'brush' ? 'Kích cỡ bút vẽ' : 'Màu bút vẽ'}
                            </p>
                          </div>
                        )}

                        {activePanel === 'brush' && (
                          <div className="flex flex-col gap-2">
                            {[
                              { size: 2, label: 'Nhỏ', dot: 'w-2 h-2' },
                              { size: 3, label: 'Vừa', dot: 'w-3.5 h-3.5' },
                              { size: 4, label: 'Lớn', dot: 'w-5 h-5' },
                            ].map(({ size, label, dot }) => (
                              <button
                                key={size}
                                onClick={() => {
                                  setBrushSize(size);
                                  setActivePanel(null);
                                }}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${
                                  brushSize === size
                                    ? 'bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white shadow-md'
                                    : 'bg-[#f5f0ee] text-[#72564c] hover:bg-[#eee6e2]'
                                }`}
                                style={{ fontSize: '18px' }}
                              >
                                <div
                                  className={`rounded-full shrink-0 ${dot} ${
                                    brushSize === size ? 'bg-white' : 'bg-[#72564c]'
                                  }`}
                                />
                                {label}
                              </button>
                            ))}
                          </div>
                        )}

                        {activePanel === 'color' && (
                          <div className="grid grid-cols-3 gap-4">
                            {colors.map((color) => (
                              <button
                                key={color}
                                onClick={() => {
                                  setBrushColor(color);
                                  setActivePanel(null);
                                }}
                                className={`aspect-square rounded-full transition-all ${
                                  brushColor === color
                                    ? 'scale-110 shadow-lg ring-4 ring-[#72564c]/30 ring-offset-2'
                                    : 'hover:scale-105 shadow-md'
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        )}

                        {activePanel === 'guide' && <StrokeOrderGuide word={currentChar} />}
                      </div>
                    )}

                    <button
                      onClick={() => setActivePanel(activePanel === 'brush' ? null : 'brush')}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all relative ${
                        activePanel === 'brush'
                          ? 'bg-gradient-to-br from-[#72564c] to-[#8d6e63] text-white shadow-lg'
                          : 'text-[#72564c]/60 hover:text-[#72564c] hover:bg-[#f5f0ee]'
                      }`}
                      title="Kích cỡ bút vẽ"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>

                      {activePanel !== 'brush' && (
                        <span
                          className="absolute bottom-1 right-1 rounded-full border-2 border-white text-white font-black flex items-center justify-center shadow"
                          style={{ width: '14px', height: '14px', fontSize: '7px', backgroundColor: brushColor }}
                        >
                          {brushSize}
                        </span>
                      )}
                    </button>

                    <div className="h-8 w-px bg-[#eeeee9] my-auto" />

                    <button
                      onClick={() => setActivePanel(activePanel === 'color' ? null : 'color')}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all relative ${
                        activePanel === 'color'
                          ? 'bg-gradient-to-br from-[#72564c] to-[#8d6e63] text-white shadow-lg'
                          : 'text-[#72564c]/60 hover:text-[#72564c] hover:bg-[#f5f0ee]'
                      }`}
                      title="Màu bút vẽ"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                        <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                        <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                        <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                      </svg>

                      {activePanel !== 'color' && (
                        <div
                          className="absolute bottom-1.5 right-1.5 w-3 h-3 rounded-full border-2 border-white shadow"
                          style={{ backgroundColor: brushColor }}
                        />
                      )}
                    </button>

                    <button
                      onClick={undoLastStroke}
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-all text-[#72564c]/60 hover:text-[#72564c] hover:bg-[#f5f0ee]"
                      title="Hoàn tác"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 7v6h6" />
                        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                      </svg>
                    </button>

                    <div className="h-8 w-px bg-[#eeeee9] my-auto" />

                    <button
                      onClick={() => setActivePanel(activePanel === 'guide' ? null : 'guide')}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        activePanel === 'guide'
                          ? 'bg-gradient-to-br from-[#72564c] to-[#8d6e63] text-white shadow-lg'
                          : 'text-[#72564c]/60 hover:text-[#72564c] hover:bg-[#f5f0ee]'
                      }`}
                      title="Hướng dẫn nét vẽ"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                      </svg>
                    </button>
                  </div>

                  <button
                    onClick={score !== null ? nextChar : handleCheckWriting}
                    disabled={isScoring}
                    className="bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white font-black rounded-full shadow-[0_8px_20px_rgba(114,86,76,0.25)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
                    style={{ fontSize: '20px', width: '400px', height: '56px' }}
                  >
                    {isScoring ? (
                      <>
                        <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Đang chấm điểm...
                      </>
                    ) : score !== null ? (
                      'Ký tự tiếp theo'
                    ) : (
                      'Kiểm tra'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {score !== null && (
              <>
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />

                <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                  <div className="bg-white rounded-2xl p-8 shadow-2xl border-[3px] border-[#72564c] w-80 pointer-events-auto">
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
                        Chữ tiếp theo
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
        </div>
      )}

      <Footer />
    </div>
  );
}
