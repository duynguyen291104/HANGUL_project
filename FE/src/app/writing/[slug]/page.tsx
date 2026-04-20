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
  time: number;
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
const CANVAS_PADDING_X = 100; // horizontal padding on each side

export default function WritingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuthStore();
  const slug = params.slug as string;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(600);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<ExercisePoint[]>([]);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState<number | null>(null);
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
              `${process.env.NEXT_PUBLIC_API_URL}/public-vocab/random-by-topic/${topicData.id}?limit=10`
            );
            
            if (vocabResponse.ok) {
              const vocabData = await vocabResponse.json();
              if (vocabData.data && Array.isArray(vocabData.data)) {
                setCharacters(vocabData.data);
                setQuestionStartTime(Date.now()); // Set initial question start time
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

  // Initialize canvas when component mounts or current character changes
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
    setFeedback('');
  }, [currentCharIndex]);

  const currentChar = characters.length > 0 ? characters[currentCharIndex]?.korean : '한';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Measure character width to compute dynamic canvas width
      const offscreen = document.createElement('canvas');
      const offCtx = offscreen.getContext('2d');
      let measuredWidth = CANVAS_HEIGHT; // default square
      if (offCtx) {
        offCtx.font = `bold ${CANVAS_FONT_SIZE}px 'Plus Jakarta Sans', serif`;
        measuredWidth = Math.ceil(offCtx.measureText(currentChar).width);
      }
      const computedWidth = Math.max(400, measuredWidth + CANVAS_PADDING_X * 2);

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
        ctx.fillText(currentChar, canvas.width / 2, canvas.height / 2);
      }
    }
  }, [currentChar]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
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
    setStrokes([...strokes, { x, y, time: Date.now() }]);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
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

        ctx.font = 'bold 280px "Plus Jakarta Sans", serif';
        ctx.fillStyle = '#f5e6d3';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currentChar, canvas.width / 2, canvas.height / 2);
      }
      setStrokes([]);
      setFeedback('');
      setScore(null);
      setScoringMethod('');
      setIsDrawing(false);
    }
  };

  const handleCheckWriting = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (strokes.length === 0) {
      setFeedback('Hãy viết ký tự trước khi chấm điểm!');
      setScore(0);
      setIsScoring(false);
      return;
    }

    setIsScoring(true);
    const currentCharData = characters[currentCharIndex];

    try {
      // Export canvas as PNG base64
      const imageBase64 = canvas.toDataURL('image/png');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/writing/score`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            imageBase64,
            korean: currentCharData.korean,
            romanization: currentCharData.romanization,
            meaning: currentCharData.vietnamese,
            topicId,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setScore(data.accuracy);
        setFeedback(data.feedback || '');
        setScoringMethod(data.method || '');
      } else {
        setScore(50);
        setFeedback('Không thể chấm điểm, hãy thử lại');
        setScoringMethod('error');
      }
    } catch {
      setScore(50);
      setFeedback('Lỗi kết nối server');
      setScoringMethod('error');
    } finally {
      setIsScoring(false);
    }
  };

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
              <p className="text-7xl font-bold text-[#72564c]">{currentChar}</p>
            </div>

            {/* 50px gap then Stroke Order Guide */}
            {currentChar && (
              <div style={{ marginTop: '50px' }}>
                <StrokeOrderGuide word={currentChar} />
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

          {/* Canvas Container */}
          <div
            ref={canvasContainerRef}
            className="bg-white rounded-xl shadow-[0_40px_100px_rgba(43,22,15,0.08)] relative overflow-hidden flex items-center justify-center group mb-10 transition-all duration-200"
            style={{ width: `${canvasWidth}px`, height: '600px' }}
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
              <span className="text-[18rem] text-[#eeeee9] font-bold opacity-40">{currentChar}</span>
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

          {/* Action Buttons */}
          <div className="flex gap-6 mb-8" style={{ width: '600px' }}>
            <button
              onClick={clearCanvas}
              className="flex-1 bg-[#eeeee9] text-[#72564c] font-bold py-5 rounded-full border-b-4 border-[#d4c3be]/30 hover:bg-[#e8e8e3] transition-colors flex items-center justify-center gap-3"
            >
              Hoàn tác
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
                <span className="text-sm font-bold text-[#8d6e63]">{currentCharIndex + 1}/10</span>
              </div>
              <div className="w-full bg-[#e8dcd3] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#72564c] to-[#8d6e63] h-2 transition-all duration-300"
                  style={{ width: `${((currentCharIndex + 1) / 10) * 100}%` }}
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
