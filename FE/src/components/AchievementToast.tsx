'use client';

import { useEffect, useState } from 'react';
import { Trophy, BookOpen, Zap, Flame, Library, X } from 'lucide-react';

export interface AchievementNotification {
  id: number;
  name: string;
  description: string;
  criteria: string;
}

interface Props {
  achievements: AchievementNotification[];
  onDismiss: (id: number) => void;
}

function criteriaIcon(criteria: string) {
  const cls = 'w-5 h-5 text-[#72564c]';
  if (criteria === 'QUIZ_COUNT') return <BookOpen className={cls} />;
  if (criteria === 'XP') return <Zap className={cls} />;
  if (criteria === 'STREAK') return <Flame className={cls} />;
  if (criteria === 'VOCAB_COUNT') return <Library className={cls} />;
  if (criteria === 'TROPHY') return <Trophy className={cls} />;
  return <Trophy className={cls} />;
}

function AchievementItem({ ach, onDismiss }: { ach: AchievementNotification; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slide in
    const t = setTimeout(() => setVisible(true), 50);
    // Auto-dismiss after 4s
    const dismiss = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(ach.id), 300);
    }, 4000);
    return () => { clearTimeout(t); clearTimeout(dismiss); };
  }, [ach.id, onDismiss]);

  return (
    <div
      className={`w-72 flex items-start gap-3 p-4 bg-white border border-[#e8dcd4] rounded-2xl shadow-lg transition-all duration-300 ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      }`}
    >
      <div className="w-9 h-9 rounded-lg bg-[#f4ede9] flex items-center justify-center shrink-0 mt-0.5">
        {criteriaIcon(ach.criteria)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-widest font-bold text-[#406561] mb-0.5">Thành tích mới!</p>
        <p className="text-sm font-semibold text-[#1a1c19] leading-tight">{ach.name}</p>
        <p className="text-xs text-[#8d6e63] mt-0.5 leading-snug">{ach.description}</p>
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(ach.id), 300); }}
        className="shrink-0 text-[#b0a49f] hover:text-[#8d6e63] transition-colors mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function AchievementToast({ achievements, onDismiss }: Props) {
  if (achievements.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      {achievements.map(ach => (
        <div key={ach.id} className="pointer-events-auto">
          <AchievementItem ach={ach} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
