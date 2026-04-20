'use client';

import { useState, useEffect } from 'react';

export type Level = 'NEWBIE' | 'BEGINNER' | 'INTERMEDIATE' | 'UPPER' | 'ADVANCED';

const LEVEL_ORDER: Level[] = ['NEWBIE', 'BEGINNER', 'INTERMEDIATE', 'UPPER', 'ADVANCED'];

export const LEVEL_LABELS: Record<Level, string> = {
  NEWBIE:       'NEWBIE',
  BEGINNER:     'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  UPPER:        'UPPER',
  ADVANCED:     'ADVANCED',
};

const LEVEL_XP: Record<Level, number> = {
  NEWBIE: 0, BEGINNER: 1000, INTERMEDIATE: 2000, UPPER: 3000, ADVANCED: 4000,
};

interface Eligibility {
  eligible: boolean;
  alreadyPassed: boolean;
  reason: string;
}

interface Props {
  currentLevel: Level;
  userXP: number;
  userTrophy: number;
  onConfirm: (targetLevel: Level, isReview: boolean) => void;
  onClose: () => void;
}

export default function LevelSkipModal({ currentLevel, userXP, userTrophy, onConfirm, onClose }: Props) {
  const [step, setStep] = useState<'confirm' | 'select' | 'warning' | 'review-warning'>('confirm');
  const [selected, setSelected] = useState<Level | null>(null);
  const [eligibility, setEligibility] = useState<Record<string, Eligibility>>({});
  const [loading, setLoading] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

  // Fetch eligibility for ALL levels (not just above current) so we can show passed lower levels
  useEffect(() => {
    if (step !== 'select') return;
    const targets = LEVEL_ORDER.filter(l => l !== currentLevel);
    if (targets.length === 0) return;

    setLoading(true);
    const token = localStorage.getItem('token');

    Promise.all(
      targets.map(async (lvl) => {
        const r = await fetch(`${API}/learning-path/level-test/eligibility?targetLevel=${lvl}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await r.json();
        return [lvl, data] as [Level, Eligibility];
      })
    )
      .then(entries => setEligibility(Object.fromEntries(entries)))
      .finally(() => setLoading(false));
  }, [step, currentLevel, API]);

  const handleProceed = () => {
    if (!selected) return;
    const isReview = reviewLevels.includes(selected) || eligibility[selected]?.alreadyPassed === true;
    if (isReview) {
      // Review: show 4000-trophy cost warning
      setStep('review-warning');
    } else {
      // Skip to new level: show trophy-reset warning
      setStep('warning');
    }
  };

  // Levels above current (can be skipped to if eligible AND not already passed)
  const skipLevels = LEVEL_ORDER.filter(l =>
    LEVEL_ORDER.indexOf(l) > LEVEL_ORDER.indexOf(currentLevel) &&
    !eligibility[l]?.alreadyPassed
  );
  // Any level (above or below current) already passed = review with 4000 trophy cost
  const reviewLevels = LEVEL_ORDER.filter(l =>
    l !== currentLevel &&
    eligibility[l]?.alreadyPassed
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white border border-[#e8ddd8] p-8 text-[#3d2c26] shadow-2xl">

        {step === 'confirm' && (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#fff1e6] mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h2 className="text-2xl font-black text-[#72564c] mb-2">Học vượt cấp</h2>
              <p className="text-[#8d6e63] text-sm leading-relaxed">
                Tính năng này cho phép bạn bỏ qua cấp độ hiện tại nếu đủ điều kiện và vượt qua bài kiểm tra 10 câu.
              </p>
            </div>

            <div className="flex flex-col gap-2 mb-8">
              <div className="flex justify-between items-center bg-[#faf6f3] border border-[#ede3dd] rounded-xl px-4 py-3 text-sm">
                <span className="text-[#8d6e63] font-medium">Cấp hiện tại</span>
                <span className="font-bold text-[#c0713a] bg-[#fff1e6] px-3 py-0.5 rounded-full text-xs">{LEVEL_LABELS[currentLevel]}</span>
              </div>
              <div className="flex justify-between items-center bg-[#faf6f3] border border-[#ede3dd] rounded-xl px-4 py-3 text-sm">
                <span className="text-[#8d6e63] font-medium">✨ XP</span>
                <span className="font-bold text-[#3d2c26]">{userXP.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-[#faf6f3] border border-[#ede3dd] rounded-xl px-4 py-3 text-sm">
                <span className="text-[#8d6e63] font-medium">🏆 Trophy</span>
                <span className="font-bold text-[#3d2c26]">{userTrophy.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border-2 border-[#e8ddd8] text-[#8d6e63] font-semibold hover:bg-[#faf6f3] transition"
              >
                Hủy
              </button>
              <button
                onClick={() => setStep('select')}
                className="flex-1 py-3 rounded-xl bg-[#c0713a] hover:bg-[#a55e2e] text-white font-bold transition shadow-md"
              >
                Thực hành →
              </button>
            </div>
          </>
        )}

        {step === 'select' && (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-[#72564c] mb-1">Chọn cấp muốn vượt</h2>
              <p className="text-[#8d6e63] text-sm">
                Chọn cấp độ bạn muốn nhảy tới.
              </p>
            </div>

            {loading ? (
              <div className="flex flex-col items-center py-10 gap-3 text-[#8d6e63]">
                <div className="w-8 h-8 border-3 border-[#c0713a] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Đang kiểm tra điều kiện...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mb-6 max-h-72 overflow-y-auto pr-1">

                {/* ── Ôn lại: already-passed levels at/below current ── */}
                {reviewLevels.length > 0 && (
                  <>
                    <p className="text-xs font-bold text-[#8d6e63] uppercase tracking-wide px-1">Ôn lại cấp cũ</p>
                    {reviewLevels.map((lvl) => {
                      const trophyNeeded = 4000;
                      const locked = userTrophy < trophyNeeded;
                      const isSelected = selected === lvl;
                      return (
                        <button
                          key={lvl}
                          disabled={locked}
                          onClick={() => !locked && setSelected(lvl)}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition text-sm font-medium text-left
                            ${ locked
                              ? 'border-[#f0e8e4] bg-[#faf8f7] text-[#c4a99e] cursor-not-allowed'
                              : isSelected
                                ? 'border-[#22c55e] bg-green-50 text-[#166534]'
                                : 'border-[#bbf7d0] bg-white text-[#504441] hover:border-[#22c55e] hover:bg-green-50' }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded-full flex-shrink-0 ${locked ? 'bg-[#e8ddd8]' : 'bg-green-500'}`} />
                            <span className="font-bold">{LEVEL_LABELS[lvl]}</span>
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            locked
                              ? 'bg-[#f0e8e4] text-[#c4a99e]'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {locked ? `Cần ${trophyNeeded.toLocaleString()} 🏆` : 'Ôn lại'}
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}

                {/* ── Vượt cấp: levels above current ── */}
                {skipLevels.length > 0 && (
                  <>
                    <p className="text-xs font-bold text-[#8d6e63] uppercase tracking-wide px-1 mt-1">Vượt lên cấp mới</p>
                    {skipLevels.map((lvl) => {
                      const info = eligibility[lvl];
                      const locked = info ? !info.eligible : true;
                      const isSelected = selected === lvl;
                      return (
                        <button
                          key={lvl}
                          disabled={locked}
                          onClick={() => setSelected(lvl)}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition text-sm font-medium text-left
                            ${ locked
                              ? 'border-[#f0e8e4] bg-[#faf8f7] text-[#c4a99e] cursor-not-allowed'
                              : isSelected
                                ? 'border-[#c0713a] bg-[#fff1e6] text-[#72564c]'
                                : 'border-[#e8ddd8] bg-white text-[#504441] hover:border-[#c0713a] hover:bg-[#fff8f4]' }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded-full flex-shrink-0 ${
                              locked ? 'bg-[#e8ddd8]' :
                              info?.alreadyPassed ? 'bg-green-500' : 'bg-[#c0713a]'
                            }`} />
                            <span className="font-bold">{LEVEL_LABELS[lvl]}</span>
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            locked ? 'bg-[#f0e8e4] text-[#c4a99e]' :
                            info?.alreadyPassed ? 'bg-green-100 text-green-700' :
                            'bg-[#fff1e6] text-[#c0713a]'
                          }`}>
                            {locked
                              ? `Cần ${LEVEL_XP[lvl].toLocaleString()} XP`
                              : info?.alreadyPassed ? 'Đã vượt' : 'Đủ ĐK'}
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}

              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setSelected(null); setStep('confirm'); }}
                className="flex-1 py-3 rounded-xl border-2 border-[#e8ddd8] text-[#8d6e63] font-semibold hover:bg-[#faf6f3] transition"
              >
                ← Quay lại
              </button>
              <button
                disabled={!selected}
                onClick={handleProceed}
                className={`flex-1 py-3 rounded-xl font-bold transition shadow-md
                  ${
                    selected
                      ? 'bg-[#c0713a] hover:bg-[#a55e2e] text-white'
                      : 'bg-[#f0e8e4] text-[#c4a99e] cursor-not-allowed'
                  }`}
              >
                {selected && reviewLevels.includes(selected) ? 'Ôn lại' : 'Bắt đầu thi'}
              </button>
            </div>
          </>
        )}

        {step === 'review-warning' && selected && (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 mb-4">
                <span className="text-3xl">🏆</span>
              </div>
              <h2 className="text-2xl font-black text-amber-700 mb-2">Học lại cấp cũ</h2>
              <p className="text-[#8d6e63] text-sm leading-relaxed">
                Quay về cấp <span className="font-bold text-[#3d2c26]">{selected}</span> sẽ tốn <span className="font-black text-amber-700">4,000 Trophy</span>.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#8d6e63]">🏆 Trophy hiện tại</span>
                <span className="font-black text-[#3d2c26]">{userTrophy.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className="text-[#8d6e63]">💸 Chi phí chuyển cấp</span>
                <span className="font-black text-amber-700">− 4,000</span>
              </div>
              <div className="h-px bg-amber-200 my-3" />
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#8d6e63] font-semibold">🏆 Trophy còn lại</span>
                <span className="font-black text-amber-700">{Math.max(0, userTrophy - 4000).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mt-1 text-sm">
                <span className="text-[#8d6e63]">✨ XP (giữ nguyên)</span>
                <span className="font-bold text-green-600">{userXP.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('select')}
                className="flex-1 py-3 rounded-xl border-2 border-[#e8ddd8] text-[#8d6e63] font-semibold hover:bg-[#faf6f3] transition"
              >
                ← Quay lại
              </button>
              <button
                onClick={() => onConfirm(selected, true)}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition shadow-md"
              >
                Xác nhận (−4,000 🏆)
              </button>
            </div>
          </>
        )}

        {step === 'warning' && selected && (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h2 className="text-2xl font-black text-red-600 mb-2">Xác nhận chuyển cấp</h2>
              <p className="text-[#8d6e63] text-sm leading-relaxed">
                Bạn sắp chuyển sang cấp <span className="font-bold text-[#3d2c26]">{selected}</span>.
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 mb-6">
              <p className="text-red-700 font-bold text-sm text-center">
                Toàn bộ Trophy sẽ bị xóa khi chuyển cấp!
              </p>
              <div className="flex justify-between items-center mt-3 text-sm">
                <span className="text-[#8d6e63]">🏆 Trophy hiện tại</span>
                <span className="font-black text-red-600 line-through">{userTrophy.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mt-1 text-sm">
                <span className="text-[#8d6e63]">🏆 Trophy sau khi chuyển</span>
                <span className="font-black text-red-600">0</span>
              </div>
              <div className="flex justify-between items-center mt-1 text-sm">
                <span className="text-[#8d6e63]">✨ XP (giữ nguyên)</span>
                <span className="font-bold text-green-600">{userXP.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('select')}
                className="flex-1 py-3 rounded-xl border-2 border-[#e8ddd8] text-[#8d6e63] font-semibold hover:bg-[#faf6f3] transition"
              >
                ← Quay lại
              </button>
              <button
                onClick={() => {
                  const isReview = eligibility[selected]?.alreadyPassed === true || reviewLevels.includes(selected);
                  onConfirm(selected, isReview);
                }}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition shadow-md"
              >
                Xác nhận
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
