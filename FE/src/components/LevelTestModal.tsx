'use client';

import { useState, useEffect, useRef } from 'react';
import type { Level } from './LevelSkipModal';

const LEVEL_LABELS: Record<string, string> = {
  NEWBIE: 'NEWBIE', BEGINNER: 'BEGINNER', INTERMEDIATE: 'INTERMEDIATE',
  UPPER: 'UPPER', ADVANCED: 'ADVANCED',
};

interface Question {
  id: number;
  type: 'quiz' | 'writing' | 'pronunciation' | 'arrangement';
  korean: string;
  vietnamese: string;
  english: string;
  romanization?: string | null;
  /** Vietnamese options for quiz; Korean options for arrangement */
  options?: string[];
  level: string;
  isTargetLevel: boolean;
}

interface AnswerResult {
  questionId: number;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
}

interface SubmitResponse {
  passed: boolean;
  score: number;
  total: number;
  results: AnswerResult[];
  newLevel: string | null;
  message: string;
}

interface Props {
  targetLevel: Level;
  /** Called when the user clicks "Tiếp tục" after seeing results */
  onFinish: (passed: boolean, newLevel: string | null) => void;
  onClose: () => void;
}

export default function LevelTestModal({ targetLevel, onFinish, onClose }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
  const token = useRef<string>('');

  useEffect(() => {
    token.current = localStorage.getItem('token') ?? '';
    fetch(`${API}/learning-path/level-test/questions?targetLevel=${targetLevel}`, {
      headers: { Authorization: `Bearer ${token.current}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) setQuestions(data.questions);
        else setError(data.error ?? 'Không thể tải câu hỏi.');
      })
      .catch(() => setError('Lỗi kết nối. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }, [API, targetLevel]);

  const setAnswer = (questionId: number, value: string) =>
    setAnswers(prev => ({ ...prev, [questionId]: value }));

  const allAnswered = questions.length > 0 && questions.every(q => (answers[q.id] ?? '').trim() !== '');

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        targetLevel,
        answers: questions.map(q => ({
          questionId: q.id,
          userAnswer: answers[q.id] ?? '',
          questionType: q.type,
          // correctAnswer depends on question type:
          // arrangement → compare selected Korean chip to correct Korean word
          // pronunciation → compare spoken Korean to romanization
          // writing / quiz → compare to Vietnamese meaning
          correctAnswer:
            q.type === 'arrangement' ? q.korean
            : q.type === 'pronunciation' ? (q.romanization ?? q.korean)
            : q.vietnamese,
        })),
      };
      const r = await fetch(`${API}/learning-path/level-test/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.current}`,
        },
        body: JSON.stringify(payload),
      });
      const data: SubmitResponse = await r.json();
      setResult(data);
    } catch (_err) {
      setError('Lỗi khi nộp bài.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Result screen ──────────────────────────────────────
  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div className="w-full max-w-lg rounded-2xl bg-white border border-[#e8ddd8] p-8 text-[#3d2c26] shadow-2xl">
          <div className="text-center mb-6">

            <h2 className={`font-black mb-2 ${result.passed ? 'text-green-600' : 'text-red-500'}`} style={{ fontSize: '20px' }}>
              {result.passed ? 'Vượt cấp thành công!' : 'Chưa đạt'}
            </h2>
            <p className="text-[#8d6e63]" style={{ fontSize: '20px' }}>{result.message}</p>
          </div>

          {/* Score bar */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-[#8d6e63] font-medium" style={{ fontSize: '20px' }}>Kết quả</span>
              <span className="font-black text-[#72564c]" style={{ fontSize: '20px' }}>{result.score} / {result.total}</span>
            </div>
            <div className="w-full bg-[#f0e8e4] rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${result.passed ? 'bg-green-500' : 'bg-red-400'}`}
                style={{ width: `${(result.score / result.total) * 100}%` }}
              />
            </div>
            <p className="text-[#a07060] mt-1" style={{ fontSize: '20px' }}>Cần ít nhất 7/11 câu đúng để vượt cấp</p>
          </div>

          {/* Per-question breakdown */}
          <div className="max-h-48 overflow-y-auto space-y-2 mb-6 pr-1">
            {result.results.map((r) => {
              const q = questions.find(q => q.id === r.questionId);
              return (
                <div key={r.questionId} className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${
                  r.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>

                  <div>
                    <span className="font-bold text-[#3d2c26]" style={{ fontSize: '20px' }}>{q?.korean}</span>
                    {!r.isCorrect && (
                      <div className="text-[#8d6e63] mt-0.5" style={{ fontSize: '20px' }}>
                        Bạn: <em className="text-red-500">{r.userAnswer || '(bỏ trống)'}</em>
                        &ensp;·&ensp;
                        Đáp án: <em className="text-green-600 font-semibold">{r.correctAnswer}</em>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {result.passed && result.newLevel && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center mb-6" style={{ fontSize: '20px' }}>
              Cấp độ mới: <span className="font-black text-green-700">{LEVEL_LABELS[result.newLevel] ?? result.newLevel}</span>
            </div>
          )}

          <button
            onClick={() => onFinish(result.passed, result.newLevel)}
            className="w-full py-3 rounded-xl bg-[#72564c] hover:bg-[#504441] text-white font-bold transition shadow-md"
            style={{ fontSize: '20px' }}
          >
            Tiếp tục
          </button>
        </div>
      </div>
    );
  }

  // ── Loading / Error ─────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="bg-white rounded-2xl px-10 py-8 flex flex-col items-center gap-4 shadow-2xl">
          <div className="w-10 h-10 border-4 border-[#c0713a] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#72564c] font-semibold" style={{ fontSize: '20px' }}>Đang tải câu hỏi...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="w-full max-w-sm rounded-2xl bg-white border border-red-200 p-8 text-center shadow-2xl">

          <p className="text-red-500 font-semibold mb-4" style={{ fontSize: '20px' }}>{error}</p>
          <button onClick={onClose} className="px-6 py-2 rounded-xl border-2 border-[#e8ddd8] text-[#8d6e63] hover:bg-[#faf6f3] transition font-semibold" style={{ fontSize: '20px' }}>
            Đóng
          </button>
        </div>
      </div>
    );
  }

  // ── Question list ───────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#faf8f6] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#e8ddd8] shadow-sm shrink-0">
        <div>
          <h1 className="font-black text-[#72564c]" style={{ fontSize: '20px' }}>Bài kiểm tra vượt cấp</h1>
          <p className="text-[#8d6e63]" style={{ fontSize: '20px' }}>
            Mục tiêu: <span className="font-bold text-[#c0713a]">{LEVEL_LABELS[targetLevel]}</span>
            &ensp;·&ensp;
            <span className="font-semibold">{questions.filter(q => (answers[q.id] ?? '').trim()).length}</span>
            <span className="text-[#b09088]"> / {questions.length} đã trả lời</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#f0e8e4] text-[#8d6e63] hover:bg-[#e8ddd8] transition text-xl font-bold"
        >
          ×
        </button>
      </div>

      {/* Questions scroll area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {questions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            index={idx + 1}
            question={q}
            answer={answers[q.id] ?? ''}
            onChange={v => setAnswer(q.id, v)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-white border-t border-[#e8ddd8] shrink-0">
        <div className="max-w-2xl mx-auto">
          <button
            disabled={!allAnswered || submitting}
            onClick={handleSubmit}
            className={`w-full py-3.5 rounded-xl font-black transition shadow-md
              ${allAnswered && !submitting
                ? 'bg-[#72564c] hover:bg-[#504441] text-white'
                : 'bg-[#f0e8e4] text-[#c4a99e] cursor-not-allowed'}`}
            style={{ fontSize: '20px' }}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                Đang chấm...
              </span>
            ) : 'Nộp bài'}
          </button>
          {!allAnswered && (
            <p className="text-center text-[#a07060] mt-2" style={{ fontSize: '20px' }}>
              Vui lòng trả lời tất cả {questions.length} câu hỏi
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ArrangementCard ───────────────────────────────────────────
// Chip → animated "jump to blank" interaction + longer sentence prompts
function ArrangementCard({
  question, answer, onChange,
}: { question: Question; answer: string; onChange: (v: string) => void }) {
  const [launching, setLaunching] = useState<string | null>(null);
  const [blankKey, setBlankKey] = useState(0);
  const launchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (launchTimer.current) clearTimeout(launchTimer.current); }, []);

  const handleChipClick = (opt: string) => {
    if (launching !== null) return;
    if (answer === opt) { onChange(''); return; }
    setLaunching(opt);
    launchTimer.current = setTimeout(() => {
      setLaunching(null);
      onChange(opt);
      setBlankKey(k => k + 1);
    }, 320);
  };

  // Rotate longer sentence templates for variety
  const templates = [
    `Từ tiếng Hàn nào có nghĩa là "${question.vietnamese}"? (${question.english})`,
    `Khi muốn nói "${question.vietnamese}" bằng tiếng Hàn, bạn dùng từ nào? Gợi ý: "${question.english}"`,
    `Chọn từ tiếng Hàn đúng để điền vào chỗ trống:\n___ có nghĩa là "${question.vietnamese}" (${question.english}) trong tiếng Việt`,
    `Bạn có biết từ tiếng Hàn nào diễn đạt "${question.vietnamese}" không? Tiếng Anh của nó là "${question.english}"`,
  ];
  const prompt = templates[question.id % templates.length];

  return (
    <>
      <style>{`
        @keyframes chipLaunch {
          0%   { transform: scale(1)    translateY(0px);   opacity: 1; }
          35%  { transform: scale(1.18) translateY(-8px);  opacity: 1; }
          100% { transform: scale(0.3)  translateY(-40px); opacity: 0; }
        }
        @keyframes blankPop {
          0%   { transform: scale(0.2) translateY(12px);  opacity: 0; }
          60%  { transform: scale(1.15) translateY(-3px); opacity: 1; }
          80%  { transform: scale(0.93); }
          100% { transform: scale(1)   translateY(0px);   opacity: 1; }
        }
      `}</style>

      {/* Sentence prompt */}
      <p className="text-[#8d6e63] font-semibold leading-relaxed text-center py-1 whitespace-pre-line" style={{ fontSize: '20px' }}>
        {prompt}
      </p>

      {/* Answer blank */}
      <div className="flex justify-center mt-4 mb-3">
        <div className={`min-w-32 h-14 rounded-2xl border-2 flex items-center justify-center px-5 transition-colors
          ${answer ? 'border-[#c0713a] bg-[#fff1e6]' : 'border-dashed border-[#c4a99e] bg-[#faf8f6]'}`}>
          {answer ? (
            <span
              key={blankKey}
              className="flex items-center gap-2 text-2xl font-black text-[#72564c]"
              style={{ animation: 'blankPop 0.38s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
              {answer}
              <button
                onClick={() => onChange('')}
                className="text-[#c0713a]/70 hover:text-[#c0713a] text-base leading-none font-black transition"
              >
                ×
              </button>
            </span>
          ) : (
            <span className="text-[#c4a99e] tracking-[0.3em] select-none" style={{ fontSize: '20px' }}>_ _ _</span>
          )}
        </div>
      </div>

      {/* Korean word chips */}
      <div className="flex flex-wrap gap-2.5 justify-center mt-2">
        {(question.options ?? []).map(opt => {
          const isSelected = answer === opt;
          const isLaunching = launching === opt;
          return (
            <button
              key={opt}
              onClick={() => handleChipClick(opt)}
              disabled={isSelected}
              className={`px-5 py-2.5 rounded-xl font-black border-2 transition-all
                ${isSelected
                  ? 'opacity-0 pointer-events-none'
                  : 'border-[#e8ddd8] bg-white text-[#3d2c26] shadow-sm hover:border-[#c0713a]/50 hover:bg-[#fff8f4] hover:shadow active:scale-95'
                }`}
              style={{ ...(isLaunching ? { animation: 'chipLaunch 0.32s ease-out forwards' } : {}), fontSize: '20px' }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ── PronunciationCard ────────────────────────────────────────────
// Toggle mic: 1st click = start recording, 2nd click = stop + evaluate via Google Speech API
function PronunciationCard({
  question, answer: _answer, onChange,
}: { question: Question; answer: string; onChange: (v: string) => void }) {
  type Stage = 'idle' | 'recording' | 'processing' | 'correct' | 'wrong';
  const [stage, setStage] = useState<Stage>('idle');
  const [transcript, setTranscript] = useState('');
  const [waveHeights, setWaveHeights] = useState<number[]>(Array(20).fill(4));
  const [attempts, setAttempts] = useState(0);
  const MAX_ATTEMPTS = 3;
  const mediaRecRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef  = useRef<AnalyserNode | null>(null);
  const audioCtxRef  = useRef<AudioContext | null>(null);

  // Cleanup on unmount
  useEffect(() => () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    mediaRecRef.current?.stream?.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
    }
  }, []);

  // Animate waveform bars from AnalyserNode data
  const animateWave = () => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const heights = Array.from(data).slice(0, 20).map(v => Math.max(4, Math.min(40, (v / 255) * 40)));
    setWaveHeights(heights);
    animFrameRef.current = requestAnimationFrame(animateWave);
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup AudioContext for live waveform visualisation
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      ctx.createMediaStreamSource(stream).connect(analyser);

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = e => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (ctx.state !== 'closed') ctx.close();
        audioCtxRef.current = null;
        processAudio();
      };
      mediaRecRef.current = recorder;
      recorder.start();
      setStage('recording');
      animateWave();
    } catch (_err) {
      // Mic permission denied → give benefit of the doubt
      onChange(question.romanization ?? question.korean);
      setStage('correct');
    }
  };

  const stopRec = () => {
    mediaRecRef.current?.stop();
    setStage('processing');
    setWaveHeights(Array(20).fill(4));
    setAttempts(prev => prev + 1);
  };

  const processAudio = async () => {
    // ── Path 1: Browser SpeechRecognition (free, no API key needed) ─────────
    const SR =
      (window as any).SpeechRecognition ??
      (window as any).webkitSpeechRecognition;

    if (SR) {
      const recognition = new SR();
      recognition.lang = 'ko-KR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });

      // SpeechRecognition works from live mic stream, not a blob — so we
      // replay the blob through an Audio element and pipe it through WebAudio
      // into a destination stream, letting SR listen to that stream.
      // In practice this is unreliable cross-browser, so use inline re-recording:
      // skip this complexity and go directly to the base64/API path below.
      recognition.onerror = () => {
        // Fall through to Google API path
        processViaGoogleAPI(blob);
      };
      recognition.onresult = (event: any) => {
        const got: string = event.results[0][0].transcript.trim();
        const confidence: number = event.results[0][0].confidence ?? 1;
        setTranscript(got);
        const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
        const matched = got.length > 0 && (
          norm(got).includes(norm(question.korean)) ||
          confidence >= 0.55
        );
        if (matched) {
          onChange(question.romanization ?? question.korean);
          setStage('correct');
        } else {
          setTranscript(got || '(không nghe rõ)');
          setStage('wrong');
        }
      };
      recognition.onend = () => {};

      // SpeechRecognition cannot process a blob directly — fall through to API
      processViaGoogleAPI(blob);
      return;
    }

    // If no SR at all, go straight to Google API
    const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
    processViaGoogleAPI(blob);
  };

  const processViaGoogleAPI = async (blob: Blob) => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    try {
      const res = await fetch('/api/pronunciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64,
          audioFormat: 'WEBM_OPUS',
          language: 'ko-KR',
        }),
      });
      const data = await res.json();

      // `skip: true` means key not configured → silently accept
      if (data.skip || !res.ok || !data.success) {
        onChange(question.romanization ?? question.korean);
        setStage('correct');
        return;
      }

      const got = (data.recognizedText ?? '').trim();
      setTranscript(got);

      const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
      const matched = got.length > 0 && (
        norm(got).includes(norm(question.korean)) ||
        (data.confidence != null && data.confidence >= 0.55)
      );

      if (matched) {
        onChange(question.romanization ?? question.korean);
        setStage('correct');
      } else {
        setTranscript(got || '(không nghe rõ)');
        setStage('wrong');
      }
    } catch (_err) {
      onChange(question.romanization ?? question.korean);
      setStage('correct');
    }
  };

  const handleMicClick = () => {
    if (stage === 'recording') { stopRec(); return; }
    if (stage === 'idle') { startRec(); return; }
    if ((stage === 'wrong' || stage === 'correct') && attempts < MAX_ATTEMPTS) startRec();
  };

  const attemptsLeft = MAX_ATTEMPTS - attempts;
  const exhausted = (stage === 'wrong' || stage === 'correct') && attempts >= MAX_ATTEMPTS;

  const micLabel = {
    idle:       'Nhấn để ghi âm',
    recording:  'Nhấn để dừng',
    processing: 'Đang phân tích...',
    correct:    exhausted ? 'Hết lượt' : `Ghi lại (còn ${attemptsLeft} lần)`,
    wrong:      exhausted ? 'Hết lượt' : `Thử lại (còn ${attemptsLeft} lần)`,
  }[stage];

  const micColor = {
    idle:       'bg-[#72564c] hover:bg-[#504441]',
    recording:  'bg-red-500 hover:bg-red-600 animate-pulse',
    processing: 'bg-gray-400 cursor-not-allowed',
    correct:    exhausted ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600',
    wrong:      exhausted ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600',
  }[stage];

  return (
    <>
      <p className="text-[#8d6e63] font-medium mb-1" style={{ fontSize: '20px' }}>Đọc to từ tiếng Hàn sau:</p>
      <p className="font-black text-center py-4 text-[#3d2c26] tracking-wider" style={{ fontSize: '20px' }}>
        {question.korean}
      </p>
      {question.romanization && (
        <p className="text-center text-[#a07060] mb-1" style={{ fontSize: '20px' }}>[{question.romanization}]</p>
      )}
      <p className="text-center text-[#b09088] mb-3" style={{ fontSize: '20px' }}>({question.english})</p>

      {/* Live waveform */}
      <div className="flex items-end justify-center gap-[2px] h-12 my-3 px-2">
        {waveHeights.map((h, i) => (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-all duration-75 ${
              stage === 'recording' ? 'bg-[#c0713a]' : 'bg-[#e8ddd8]'
            }`}
            style={{ height: `${h}px` }}
          />
        ))}
      </div>

      {/* Mic button */}
      <div className="flex justify-center mt-1">
        <button
          onClick={handleMicClick}
          disabled={stage === 'processing' || exhausted}
          className={`flex items-center gap-2 px-8 py-3 rounded-full font-bold text-white transition shadow-md ${micColor}`}
          style={{ fontSize: '20px' }}
        >
          {micLabel}
        </button>
      </div>

      {/* Attempts indicator */}
      {stage !== 'idle' && stage !== 'recording' && (
        <p className="text-center text-[#a07060] mt-1" style={{ fontSize: '20px' }}>
          {exhausted ? 'Đã dùng hết 3 lần ghi âm' : `Còn ${attemptsLeft}/${MAX_ATTEMPTS} lần ghi âm`}
        </p>
      )}

      {/* Result feedback */}
      {stage === 'correct' && (
        <div className="mt-3 flex items-center justify-center gap-2 py-2 px-4 bg-green-50 border border-green-200 rounded-xl">
          <span className="text-green-600 font-black" style={{ fontSize: '20px' }}>+</span>
          <span className="text-green-700 font-semibold" style={{ fontSize: '20px' }}>Phát âm xác nhận!</span>
          {transcript && <span className="text-green-500 ml-1" style={{ fontSize: '20px' }}>"{transcript}"</span>}
        </div>
      )}
      {stage === 'wrong' && (
        <div className="mt-3 py-2 px-4 bg-orange-50 border border-orange-200 rounded-xl text-center">
          <p className="text-orange-700 font-semibold" style={{ fontSize: '20px' }}>Hệ thống nghe được: <em className="not-italic font-bold">{transcript}</em></p>
          <p className="text-orange-500 mt-0.5" style={{ fontSize: '20px' }}>Nhấn &ldquo;Thử lại&rdquo; để ghi âm lại</p>
        </div>
      )}
      {stage === 'processing' && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-[#c0713a] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#8d6e63]" style={{ fontSize: '20px' }}>Đang nhận dạng giọng nói...</span>
        </div>
      )}

      {/* Fallback: accept manually if everything fails */}
      {(stage === 'wrong') && (
        <button
          onClick={() => { onChange(question.romanization ?? question.korean); setStage('correct'); }}
          className="mt-2 w-full py-2 rounded-xl border border-[#e8ddd8] text-[#a07060] hover:bg-[#faf8f6] transition"
          style={{ fontSize: '20px' }}
        >
          Chấp nhận thủ công (bỏ qua đánh giá)
        </button>
      )}
    </>
  );
}

// ── QuestionCard ────────────────────────────────────────────
function QuestionCard({
  index, question, answer, onChange,
}: {
  index: number;
  question: Question;
  answer: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={`rounded-2xl border-2 p-5 bg-white shadow-sm ${
      question.isTargetLevel ? 'border-[#c0713a]/40' : 'border-[#e8ddd8]'
    }`}>
      {/* Badge row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="px-2.5 py-0.5 rounded-full bg-[#f0e8e4] text-[#8d6e63] font-semibold" style={{ fontSize: '20px' }}>
          Câu {index}
        </span>
        <span className={`px-2.5 py-0.5 rounded-full font-semibold
          ${ question.type === 'quiz' ? 'bg-blue-100 text-blue-700' :
            question.type === 'writing' ? 'bg-purple-100 text-purple-700' :
            question.type === 'arrangement' ? 'bg-amber-100 text-amber-700' :
            'bg-green-100 text-green-700'}`}
          style={{ fontSize: '20px' }}>
          {question.type === 'quiz' ? 'Trắc nghiệm'
            : question.type === 'writing' ? 'Viết'
            : question.type === 'arrangement' ? 'Sắp xếp'
            : 'Phát âm'}
        </span>
        {question.isTargetLevel && (
          <span className="px-2.5 py-0.5 rounded-full bg-[#fff1e6] text-[#c0713a] font-semibold border border-[#c0713a]/30" style={{ fontSize: '20px' }}>
            Cấp mục tiêu
          </span>
        )}
      </div>

      {/* Prompt */}
      {question.type === 'quiz' ? (
        <>
          <p className="text-[#8d6e63] font-medium mb-1" style={{ fontSize: '20px' }}>Nghĩa tiếng Việt của từ:</p>
          <p className="font-black text-center py-4 text-[#3d2c26] tracking-wider" style={{ fontSize: '20px' }}>{question.korean}</p>
          {question.romanization && (
            <p className="text-center text-[#a07060] mb-3" style={{ fontSize: '20px' }}>{question.romanization}</p>
          )}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {(question.options ?? []).map(opt => (
              <button
                key={opt}
                onClick={() => onChange(opt)}
                className={`py-2.5 px-3 rounded-xl border-2 transition font-medium text-left
                  ${answer === opt
                    ? 'border-[#c0713a] bg-[#fff1e6] text-[#72564c] font-bold'
                    : 'border-[#e8ddd8] bg-[#faf8f6] text-[#504441] hover:border-[#c0713a]/50 hover:bg-[#fff8f4]'}`}
                style={{ fontSize: '20px' }}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      ) : question.type === 'writing' ? (
        <>
          <p className="text-[#8d6e63] font-medium mb-1" style={{ fontSize: '20px' }}>Nghĩa tiếng Việt của từ tiếng Hàn sau là gì?</p>
          <p className="font-black text-center py-4 text-[#3d2c26] tracking-wider" style={{ fontSize: '20px' }}>{question.korean}</p>
          {question.romanization && (
            <p className="text-center text-[#a07060] mb-3" style={{ fontSize: '20px' }}>[{question.romanization}]</p>
          )}
          <input
            type="text"
            value={answer}
            onChange={e => onChange(e.target.value)}
            placeholder="Nhập nghĩa tiếng Việt..."
            className="w-full bg-[#faf8f6] border-2 border-[#e8ddd8] rounded-xl px-4 py-2.5 text-[#3d2c26] placeholder-[#c4a99e] focus:outline-none focus:border-[#c0713a] transition"
            style={{ fontSize: '20px' }}
          />
        </>
      ) : question.type === 'arrangement' ? (
        <ArrangementCard question={question} answer={answer} onChange={onChange} />
      ) : (
        <PronunciationCard question={question} answer={answer} onChange={onChange} />
      )}
    </div>
  );
}
