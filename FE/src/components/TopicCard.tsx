'use client';

import { useState } from 'react';
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
  done?: boolean;
  image?: string;
  images?: string[];
  onClick: () => void;
}

export default function TopicCard({
  id: _id,
  name,
  description: _description,
  level: _level,
  order: _order,
  mode: _mode,
  questionCount: _questionCount = 0,
  completedQuestions,
  totalQuestions,
  done = false,
  image,
  images,
  onClick,
}: TopicCardProps) {
  const [hovered, setHovered] = useState(false);
  const total = totalQuestions || 10;
  const correct = completedQuestions || 0;

  return (
    <div
      className="bg-white border border-gray-200 p-6 rounded-lg flex flex-col hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Title */}
      <h3 className="text-2xl font-extrabold font-headline mb-1 text-on-surface">
        {name}
      </h3>

      {/* Topic image(s) */}
      {(images && images.length > 0) ? (
        <div className="flex gap-2 mt-3">
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${name} ${i + 1}`}
              width={120}
              height={120}
              style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px' }}
            />
          ))}
        </div>
      ) : image ? (
        <div className="mt-3">
          <img
            src={image}
            alt={name}
            width={120}
            height={120}
            style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px' }}
          />
        </div>
      ) : null}

      {/* Status label */}
      <p className="font-semibold font-body mt-3 mb-4 text-on-surface-variant" style={{ fontSize: '20px' }}>
        {done ? 'Hoàn thành' : 'Chưa làm'}
      </p>

      {/* Button */}
      <div className="mt-auto">
        <button
          onClick={onClick}
          className="w-full px-6 py-3 rounded-full font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap font-headline text-black"
          style={{
            fontSize: '20px',
            background: done
              ? 'linear-gradient(135deg, #e6ae8c, #a8cecf)'
              : 'linear-gradient(135deg, #ada996, #f2f2f2, #dbdbdb, #eaeaea)',
          }}
        >
          {done
            ? hovered
              ? 'Ôn tập lại'
              : `✓ ${correct}/${total}`
            : (
              <>
                Bắt đầu <ArrowRight size={18} />
              </>
            )
          }
        </button>
      </div>
    </div>
  );
}
