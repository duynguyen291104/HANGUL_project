'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export interface ResultItem {
  question: string;
  correctAnswer: string;
  userAnswer?: string;
  accuracy?: number;
  isCorrect: boolean;
  xp: number;
  timeSpent: number;
  english?: string;
  vietnamese?: string;
}

interface ResultSummaryProps {
  results: ResultItem[];
  mode: 'quiz' | 'writing' | 'pronunciation';
  topicName: string;
  backPath: string;
  continueAction?: () => void;
}

export default function ResultSummary({
  results,
  mode,
  topicName,
  continueAction,
}: ResultSummaryProps) {
  const router = useRouter();
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  // Per-element animation states (mirrors quiz [slug]/page.tsx)
  const [anim, setAnim] = useState({
    backBtn: false,
    title: false,
    subtitle: false,
    xpCard: false,
    correctCard: false,
    timeCard: false,
    result: false,
    questionsRevealed: 0,
    btnContinue: false,
    btnHistory: false,
  });
  const [xpAnimated, setXpAnimated] = useState(0);
  const [correctAnimated, setCorrectAnimated] = useState(0);
  const [timeAnimated, setTimeAnimated] = useState('00:00');

  // Stats
  const totalXP = results.reduce((sum, r) => sum + r.xp, 0);
  const correctCount = results.filter(r => r.isCorrect).length;
  const totalSec = Math.round(results.reduce((sum, r) => sum + r.timeSpent, 0));
  const totalCount = results.length;
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  useEffect(() => {
    setAnim({ backBtn: false, title: false, subtitle: false, xpCard: false, correctCard: false, timeCard: false, result: false, questionsRevealed: 0, btnContinue: false, btnHistory: false });
    setXpAnimated(0);
    setCorrectAnimated(0);
    setTimeAnimated('00:00');

    const timers: ReturnType<typeof setTimeout>[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];
    const at = (ms: number, fn: () => void) => { timers.push(setTimeout(fn, ms)); };

    at(80, () => setAnim(p => ({ ...p, backBtn: true })));
    at(200, () => setAnim(p => ({ ...p, title: true })));
    at(600, () => setAnim(p => ({ ...p, subtitle: true })));

    at(1000, () => {
      setAnim(p => ({ ...p, xpCard: true }));
      const target = totalXP;
      let val = 0;
      const step = Math.max(1, Math.ceil(target / 28));
      const iv = setInterval(() => {
        val = Math.min(val + step, target);
        setXpAnimated(val);
        if (val >= target) clearInterval(iv);
      }, 18);
      intervals.push(iv);
    });

    at(1600, () => {
      setAnim(p => ({ ...p, correctCard: true }));
      const target = correctCount;
      let val = 0;
      if (target === 0) return;
      const iv = setInterval(() => {
        val = Math.min(val + 1, target);
        setCorrectAnimated(val);
        if (val >= target) clearInterval(iv);
      }, 80);
      intervals.push(iv);
    });

    at(2250, () => {
      setAnim(p => ({ ...p, timeCard: true }));
      if (totalSec === 0) { setTimeAnimated('00:00'); return; }
      const steps = Math.min(totalSec, 60);
      const ivMs = Math.max(12, Math.floor(1200 / steps));
      let step = 0;
      const iv = setInterval(() => {
        step++;
        const cur = Math.min(Math.round((step / steps) * totalSec), totalSec);
        setTimeAnimated(formatTime(cur));
        if (step >= steps) clearInterval(iv);
      }, ivMs);
      intervals.push(iv);
    });

    at(3650, () => setAnim(p => ({ ...p, result: true })));

    const visibleCount = Math.min(2, results.length);
    for (let i = 0; i < visibleCount; i++) {
      at(3950 + i * 350, () => setAnim(p => ({ ...p, questionsRevealed: i + 1 })));
    }
    const buttonsStart = 3950 + visibleCount * 350 + 200;
    at(buttonsStart, () => setAnim(p => ({ ...p, btnContinue: true })));
    at(buttonsStart + 450, () => setAnim(p => ({ ...p, btnHistory: true })));

    return () => {
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fi = (visible: boolean) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'scale(1) translateY(0px)' : 'scale(0.9) translateY(20px)',
    transition: 'opacity 0.55s cubic-bezier(0.22,1,0.36,1), transform 0.55s cubic-bezier(0.22,1,0.36,1)',
  });

  const modeLabel = mode === 'writing' ? 'Luyện viết' : mode === 'pronunciation' ? 'Phát âm' : 'Trắc nghiệm';
  const historyPath = mode === 'writing' ? '/learning-map?refresh=true' : '/learning-map';

  return (
    <div className="min-h-screen bg-[#fafaf5] font-['Be_Vietnam_Pro'] overflow-x-hidden">
      <Header />

      {/* Back Button */}
      <div className="fixed left-[20px] top-[95px] z-20" style={fi(anim.backBtn)}>
        <button
          onClick={() => router.push(mode === 'writing' ? '/writing' : mode === 'pronunciation' ? '/pronunciation' : '/quiz')}
          className="flex items-center gap-2 px-4 py-2 text-[#72564c] hover:text-[#504441] font-semibold transition-all hover:scale-105 active:scale-95"
          style={{ fontSize: '20px' }}
        >
          <span>←</span>
          <span>Quay lại</span>
        </button>
      </div>

      <main className="w-full max-w-5xl mx-auto px-4 py-10 pt-16 flex flex-col items-center gap-6">
        <div className="w-full flex flex-col items-center gap-6">

          {/* Title */}
          <div style={fi(anim.title)}>
            <h1 className="font-extrabold text-4xl md:text-5xl text-[#72564c] tracking-tight text-center">
              Bài học hoàn tất!
            </h1>
          </div>

          {/* Subtitle */}
          <div style={{ ...fi(anim.subtitle), marginTop: '0px' }}>
            <p className="text-[#504441] font-medium text-center" style={{ fontSize: '20px' }}>
              Chủ đề: {topicName || 'Bài học'} - Bài tập: {modeLabel}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-stretch w-full max-w-2xl">
            <div
              className="flex-1 p-4 flex flex-col items-center justify-center"
              style={fi(anim.xpCard)}
            >
              <span className="font-bold text-[#815300] font-['Cormorant_Garamond']" style={{ fontSize: '20px' }}>
                +{xpAnimated} XP
              </span>
              <span className="font-['Cormorant_Garamond'] uppercase tracking-widest text-[#504441] mt-1 text-center" style={{ fontSize: '20px' }}>
                Điểm KN
              </span>
            </div>

            <div className="w-px bg-black self-stretch" />

            <div
              className="flex-1 p-4 flex flex-col items-center justify-center"
              style={fi(anim.correctCard)}
            >
              <span className="font-bold text-[#72564c] font-['Cormorant_Garamond']" style={{ fontSize: '20px' }}>
                {correctAnimated}/{totalCount}
              </span>
              <span className="font-['Cormorant_Garamond'] uppercase tracking-widest text-[#504441] mt-1 text-center" style={{ fontSize: '20px' }}>
                Câu đúng
              </span>
            </div>

            <div className="w-px bg-black self-stretch" />

            <div
              className="flex-1 p-4 flex flex-col items-center justify-center"
              style={fi(anim.timeCard)}
            >
              <span className="font-bold text-[#5b4137] font-['Cormorant_Garamond'] tabular-nums" style={{ fontSize: '20px' }}>
                {timeAnimated}
              </span>
              <span className="font-['Cormorant_Garamond'] uppercase tracking-widest text-[#504441] mt-1 text-center" style={{ fontSize: '20px' }}>
                Thời gian
              </span>
            </div>
          </div>

          {/* Chi tiết bài */}
          <div className="w-full max-w-2xl" style={{ ...fi(anim.result), marginTop: '5px' }}>
            <div className="bg-[#fafaf5] rounded-xl border border-black p-5" style={{ paddingBottom: '12px' }}>
              <p className="font-bold text-[#72564c] mb-4" style={{ fontSize: '20px' }}>Chi tiết bài</p>
              <div className="flex flex-col gap-3">
                {(detailsExpanded ? results : results.slice(0, 2)).map((q, idx) => {
                  const isCorrect = q.isCorrect;
                  const cardVisible = detailsExpanded || idx < anim.questionsRevealed;
                  return (
                    <div
                      key={idx}
                      className={`relative p-4 border-[2px] ${
                        isCorrect
                          ? 'bg-[#e8f5e9] border-[#4caf50]'
                          : 'bg-[#ffdad6] border-[#ba1a1a]'
                      }`}
                      style={{ borderRadius: '15px', ...fi(cardVisible) }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#504441] mb-1" style={{ fontSize: '20px' }}>
                            {idx + 1}. {q.question}
                            {q.correctAnswer && (
                              <span className="font-normal text-[#72564c]/70 ml-2" style={{ fontSize: '20px' }}>
                                - phiên âm: {q.correctAnswer}
                              </span>
                            )}
                          </p>
                          {q.vietnamese && (
                            <p className="text-[#504441]" style={{ fontSize: '20px' }}>
                              Nghĩa: <b className="text-[#72564c]">{q.vietnamese}</b>
                            </p>
                          )}
                          {q.accuracy !== undefined && (
                            <p className="text-[#504441] mt-1" style={{ fontSize: '20px' }}>
                              Độ chính xác: <b className={isCorrect ? 'text-[#2e7d32]' : 'text-[#ba1a1a]'}>{q.accuracy}%</b>
                            </p>
                          )}
                          {q.userAnswer && (
                            <p className="text-[#504441] mt-1" style={{ fontSize: '20px' }}>
                              Bạn chọn: <b className={isCorrect ? 'text-[#2e7d32]' : 'text-[#ba1a1a]'}>{q.userAnswer}</b>
                            </p>
                          )}
                        </div>
                        <span className={`shrink-0 font-bold ${isCorrect ? 'text-[#2e7d32]' : 'text-[#ba1a1a]'}`} style={{ fontSize: '20px' }}>
                          {isCorrect ? '+10XP' : '0XP'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {results.length > 2 && (
                <button
                  onClick={() => setDetailsExpanded(v => !v)}
                  className="w-full text-center text-[#72564c] hover:text-[#504441] font-bold transition"
                  style={{ fontSize: '20px', marginTop: '12px' }}
                >
                  {detailsExpanded ? 'Thu gọn ▲' : `Xem thêm ${results.length - 2} mục ▼`}
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col w-full max-w-sm gap-3 pb-8">
            <div style={fi(anim.btnContinue)}>
              <button
                onClick={continueAction || (() => router.push(`/${mode}`))}
                className="w-full bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white font-bold py-3.5 rounded-xl shadow-lg hover:from-[#8d6e63] hover:to-[#a0806e] active:scale-95 transition-all flex items-center justify-center gap-2"
                style={{ fontSize: '20px' }}
              >
                Tiếp tục
                <span>&rarr;</span>
              </button>
            </div>
            <div style={fi(anim.btnHistory)}>
              <button
                onClick={() => router.push(historyPath)}
                className="w-full bg-[#ffdbce] text-[#2b160f] font-bold py-3.5 rounded-xl hover:bg-[#e4beb2] active:scale-95 transition-all"
                style={{ fontSize: '20px' }}
              >
                Xem lịch sử tiến độ
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
