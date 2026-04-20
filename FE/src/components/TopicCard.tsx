'use client';

import { ArrowRight } from 'lucide-react';

interface TopicCardProps {
  id: number;
  name: string;
  description: string;
  level: string;
  order: number;
  mode: 'quiz' | 'writing' | 'pronunciation';
  questionCount?: number;
  completedQuestions?: number;
  totalQuestions?: number;
  score?: number;
  done?: boolean; // NEW: Track if skill is completed
  onClick: () => void;
}

export default function TopicCard({
  id: _id,
  name,
  description: _description,
  level: _level,
  order,
  mode,
  questionCount: _questionCount = 0,
  completedQuestions,
  totalQuestions,
  done = false, // NEW: Track completion status
  onClick,
}: TopicCardProps) {
  // Color mapping based on mode and completion status
  const getIconAndColor = () => {
    // If completed (done=true), use green color
    if (done) {
      return {
        icon: '✓',
        bgColor: 'bg-green-50',
        textColor: 'text-green-900',
        accentColor: 'from-green-400 to-green-600',
        cardBg: 'bg-green-50 border-green-200',
      };
    }

    // Otherwise use brown color
    const colorMap: Record<string, { icon: string; bgColor: string; textColor: string; accentColor: string; cardBg: string }> = {
      'quiz-0': { icon: '', bgColor: 'bg-primary-fixed', textColor: 'text-primary', accentColor: 'from-primary-fixed-dim to-primary', cardBg: 'bg-surface-container-low border-outline-variant/20' },
      'quiz-1': { icon: '', bgColor: 'bg-primary-fixed', textColor: 'text-primary', accentColor: 'from-primary-fixed-dim to-primary', cardBg: 'bg-surface-container-low border-outline-variant/20' },
      'quiz-2': { icon: '', bgColor: 'bg-primary-fixed', textColor: 'text-primary', accentColor: 'from-primary-fixed-dim to-primary', cardBg: 'bg-surface-container-low border-outline-variant/20' },
      'writing-0': { icon: '', bgColor: 'bg-primary-fixed', textColor: 'text-primary', accentColor: 'from-primary-fixed-dim to-primary', cardBg: 'bg-surface-container-low border-outline-variant/20' },
      'writing-1': { icon: '', bgColor: 'bg-primary-fixed', textColor: 'text-primary', accentColor: 'from-primary-fixed-dim to-primary', cardBg: 'bg-surface-container-low border-outline-variant/20' },
      'writing-2': { icon: '', bgColor: 'bg-primary-fixed', textColor: 'text-primary', accentColor: 'from-primary-fixed-dim to-primary', cardBg: 'bg-surface-container-low border-outline-variant/20' },
      'pronunciation-0': { icon: '', bgColor: 'bg-primary-fixed', textColor: 'text-primary', accentColor: 'from-primary-fixed-dim to-primary', cardBg: 'bg-surface-container-low border-outline-variant/20' },
      'pronunciation-1': { icon: '', bgColor: 'bg-primary-fixed', textColor: 'text-primary', accentColor: 'from-primary-fixed-dim to-primary', cardBg: 'bg-surface-container-low border-outline-variant/20' },
      'pronunciation-2': { icon: '', bgColor: 'bg-primary-fixed', textColor: 'text-primary', accentColor: 'from-primary-fixed-dim to-primary', cardBg: 'bg-surface-container-low border-outline-variant/20' },
    };

    const key = `${mode}-${order % 3}`;
    return colorMap[key] || colorMap['quiz-0'];
  };

  const { icon: _icon, bgColor: _bgColor, textColor: _textColor, accentColor, cardBg } = getIconAndColor();

  const getProgressText = () => {
    // If completed questions is 0, show "not started"
    if (!completedQuestions || completedQuestions === 0) {
      return 'tiến độ: chưa làm';
    }
    
    // Show progress with X/10 format (or X/totalQuestions if different)
    return `${completedQuestions}/${totalQuestions || 10}`;
  };

  return (
    <div className={`${cardBg} p-6 rounded-lg flex flex-col group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border`}>
      {/* Title */}
      <h3 className="text-2xl font-extrabold font-headline text-on-surface mb-auto">
        {name}
      </h3>

      {/* Progress */}
      <p className={`text-sm ${done ? 'text-green-700 font-semibold' : 'text-on-surface-variant'} font-body mt-4 mb-4`}>
        {done ? '✅ Hoàn thành!' : getProgressText()}
      </p>

      {/* Button */}
      <div className="mt-auto">
        <button
          onClick={onClick}
          className={`w-full bg-gradient-to-r ${accentColor} text-white px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap font-headline`}
          disabled={done}
        >
          {done ? '✓ Xong' : 'Bắt đầu'}
          {!done && <ArrowRight size={18} />}
        </button>
      </div>
    </div>
  );
}
