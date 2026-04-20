'use client';

import { useRouter } from 'next/navigation';

export interface ResultItem {
  question: string;
  correctAnswer: string;
  userAnswer?: string; // for quiz
  accuracy?: number; // for writing + pronunciation
  isCorrect: boolean;
  xp: number;
  timeSpent: number; // seconds
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
  backPath,
  continueAction,
}: ResultSummaryProps) {
  const router = useRouter();

  // Calculate stats
  const totalXP = results.reduce((sum, q) => sum + q.xp, 0);
  const correctCount = results.filter((q) => q.isCorrect).length;
  const accuracy = Math.round((correctCount / results.length) * 100);
  const totalTimeSeconds = results.reduce((sum, q) => sum + q.timeSpent, 0);
  const timeDisplay = totalTimeSeconds < 60 
    ? `${totalTimeSeconds}s` 
    : `${Math.floor(totalTimeSeconds / 60)}:${String(totalTimeSeconds % 60).padStart(2, '0')}`;

  const getModeLabel = () => {
    switch (mode) {
      case 'quiz':
        return 'Trắc Nghiệm';
      case 'writing':
        return 'Luyện Viết';
      case 'pronunciation':
        return 'Luyện Phát Âm';
      default:
        return 'Bài Học';
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf5] font-['Be_Vietnam_Pro']">
      {/* Back Button */}
      <div className="fixed left-[20px] top-[95px] z-20">
        <button
          onClick={() => router.push(backPath)}
          className="flex items-center gap-2 px-4 py-2 text-[#72564c] hover:text-[#504441] font-semibold transition-all hover:scale-105 active:scale-95"
        >
          <span className="text-xl">←</span>
          <span>Quay lại</span>
        </button>
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 flex flex-col items-center justify-center min-h-[80vh]">
        {/* Hero Section */}
        <div className="relative w-full flex flex-col items-center gap-12">
          <div className="text-center">
            <h1 className="font-extrabold text-5xl md:text-6xl text-[#72564c] tracking-tight">
              Bài học hoàn tất!
            </h1>
            <p className="text-[#504441] font-medium mt-4 text-xl">
              {topicName} - {getModeLabel()}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
            {/* XP Card */}
            <div className="bg-[#f4f4ef] rounded-lg p-6 flex flex-col items-center justify-center hover:bg-[#eeeee9] transition-colors">
              <div className="w-12 h-12 rounded-full bg-[#ffdbce] flex items-center justify-center mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#815300" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <span className="font-bold text-2xl text-[#815300]">
                +{totalXP} XP
              </span>
              <span className="font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-widest text-[#504441] mt-2">
                Điểm kinh nghiệm
              </span>
            </div>

            {/* Accuracy Card */}
            <div className="bg-[#f4f4ef] rounded-lg p-6 flex flex-col items-center justify-center hover:bg-[#eeeee9] transition-colors">
              <div className="w-12 h-12 rounded-full bg-[#c2ebe5] flex items-center justify-center mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2e7b72" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="4" />
                  <line x1="12" y1="2" x2="12" y2="4" />
                  <line x1="12" y1="20" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="4" y2="12" />
                  <line x1="20" y1="12" x2="22" y2="12" />
                </svg>
              </div>
              <span className="font-bold text-2xl text-[#72564c]">
                {accuracy}%
              </span>
              <span className="font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-widest text-[#504441] mt-2">
                Độ chính xác
              </span>
            </div>

            {/* Time Card */}
            <div className="bg-[#f4f4ef] rounded-lg p-6 flex flex-col items-center justify-center hover:bg-[#eeeee9] transition-colors">
              <div className="w-12 h-12 rounded-full bg-[#c2ebe5] flex items-center justify-center mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2e7b72" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <span className="font-bold text-2xl text-[#5b4137]">
                {timeDisplay}
              </span>
              <span className="font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-widest text-[#504441] mt-2">
                Thời gian học
              </span>
            </div>
          </div>

          {/* Result Message */}
          <div className="w-full max-w-2xl">
            <div className={`p-6 rounded-lg text-center font-bold text-lg ${
              accuracy >= 50
                ? 'bg-[#ffdbce] text-[#2b160f]'
                : 'bg-[#ffdad6] text-[#ba1a1a]'
            }`}>
              {accuracy >= 50
                ? `Xuất sắc! Bạn đạt ${accuracy}% - Hoàn thành tuyệt vời`
                : `Bạn đạt ${accuracy}% - Tiếp tục cố gắng`
              }
            </div>
          </div>

          {/* Details */}
          <div className="w-full max-w-2xl bg-[#f4f4ef] rounded-lg p-6">
            <h2 className="font-bold text-xl mb-4 text-[#72564c]">Chi tiết bài</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {results.map((item, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    item.isCorrect
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-[#504441]">
                      {index + 1}. {item.question}
                    </p>
                    <span className={`text-sm font-bold ${
                      item.isCorrect ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.isCorrect ? '+10 XP' : '0 XP'}
                    </span>
                  </div>

                  {/* Quiz - show user answer */}
                  {item.userAnswer && (
                    <div className="text-sm text-[#504441] mb-1">
                      Bạn chọn: <b>{item.userAnswer}</b>
                    </div>
                  )}

                  {/* Writing/Pronunciation - show accuracy */}
                  {item.accuracy !== undefined && (
                    <div className="text-sm text-[#504441] mb-1">
                      Độ chính xác: <b>{item.accuracy}%</b>
                    </div>
                  )}

                  <div className="text-xs text-[#504441]">
                    {item.timeSpent.toFixed(1)}s
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col w-full max-w-sm gap-4">
            <button
              onClick={continueAction || (() => router.push(`/${mode === 'pronunciation' ? 'pronunciation' : mode}`))}
              className="bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:from-[#8d6e63] hover:to-[#a0806e] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Tiếp tục
              <span>→</span>
            </button>
            <button
              onClick={() => router.push(backPath)}
              className="bg-[#ffdbce] text-[#2b160f] font-bold text-lg py-4 rounded-xl shadow-lg hover:bg-[#ffc9b7] active:scale-95 transition-all"
            >
              Quay lại chủ đề
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
