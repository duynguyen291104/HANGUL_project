'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { Level } from '@/mocks/topics';
import LevelTestModal from '@/components/LevelTestModal';

const levels: { value: Level; label: string; description: string }[] = [
  {
    value: 'NEWBIE',
    label: 'Beginner',
    description: 'Làm quen với chữ cái và từ vựng đơn giản',
  },
  {
    value: 'BEGINNER',
    label: 'Learner',
    description: 'Viết được câu đơn hoàn chỉnh',
  },
  {
    value: 'INTERMEDIATE',
    label: 'Challenger',
    description: 'Viết được đoạn văn với 5-7 câu',
  },
  {
    value: 'UPPER',
    label: 'Master',
    description: 'Viết được các bài có logic và lập luận',
  },
  {
    value: 'ADVANCED',
    label: 'Grandmaster',
    description: 'Viết essay, phân tích sâu',
  },
];

export default function LevelSelectionPage() {
  const router = useRouter();
  const { user, updateLevel } = useAuthStore();
  const [selected, setSelected] = useState<Level | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [testTarget, setTestTarget] = useState<Level | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    console.log('[LevelSelection] Token:', token ? 'EXISTS' : 'MISSING');
    console.log('[LevelSelection] User:', user);
    
    if (!token) {
      console.warn('[LevelSelection] No token found, redirecting to login');
      router.push('/login');
      return;
    }

    if (user && user.levelLocked) {
      router.push('/dashboard');
    }
  }, [user, router]);

  /** Force a level — used after test pass/fail */
  const commitLevel = async (level: Level) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      // Use learning-path submit which already set the level; just sync client store
      await updateLevel(level);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLevel = async (level: Level) => {
    setSelected(level);
    setError('');
    // NEWBIE needs no test – set immediately
    if (level === 'NEWBIE') {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found.');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/set-level`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ level }),
        });
        if (response.ok) {
          await updateLevel(level);
          router.push('/dashboard');
        } else {
          const err = await response.json();
          setError(err.error || 'Failed to set level');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
      return;
    }
    // All higher levels must take the skill test first
    setTestTarget(level);
  };



  return (
    <>
    <div className="min-h-screen bg-[#fafaf5] flex flex-col" style={{
      backgroundImage: 'radial-gradient(#d4c3be 0.5px, transparent 0.5px)',
      backgroundSize: '24px 24px',
    }}>
      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-6 py-12">
        {/* Header Section */}
        <header className="text-center mb-12">
          <div className="mb-8 flex justify-center items-center gap-2">
            <img
              alt="Otter Mascot"
              className="w-[200px] h-[200px] object-contain"
              src="/otter-mascot.png"
            />
          </div>
          <h1 className="text-6xl font-black tracking-tighter mb-4 uppercase text-[#72564c]">
            HANGUL
          </h1>
          <p className="text-2xl font-bold text-[#8d6e63] mb-1" suppressHydrationWarning>
            Chào mừng, {user?.name || 'Learner'}!
          </p>
          <p className="text-[#504441] font-medium">
            Hãy chọn mức độ học tập phù hợp với bạn
          </p>
        </header>

        {/* Levels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-2xl mb-12">
          {levels.slice(0, 4).map((level) => (
            <button
              key={level.value}
              onClick={() => handleSelectLevel(level.value)}
              disabled={loading}
              className="tactile-card bg-white p-8 rounded-xl flex flex-col items-center text-center shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 border-2 border-transparent hover:border-[#8d6e63] hover:shadow-[0_20px_25px_-5px_rgba(114,86,76,0.1),0_10px_10px_-5px_rgba(114,86,76,0.04)] hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <h3 className="text-xl font-extrabold text-[#72564c] mb-2">
                {level.label}
              </h3>
              <p className="text-sm text-[#504441] leading-relaxed">
                {level.description}
              </p>
              {selected === level.value && loading && (
                <div className="mt-4 w-4 h-4 border-2 border-[#72564c] border-t-transparent rounded-full animate-spin"></div>
              )}
            </button>
          ))}

          {/* Level 5 (Centered Span) */}
          <button
            onClick={() => handleSelectLevel(levels[4].value)}
            disabled={loading}
            className="tactile-card bg-white p-8 rounded-xl flex flex-col items-center text-center md:col-span-2 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 border-2 border-transparent hover:border-[#8d6e63] hover:shadow-[0_20px_25px_-5px_rgba(114,86,76,0.1),0_10px_10px_-5px_rgba(114,86,76,0.04)] hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <h3 className="text-xl font-extrabold text-[#72564c] mb-2">
              {levels[4].label}
            </h3>
            <p className="text-sm text-[#504441] leading-relaxed">
              {levels[4].description}
            </p>
            {selected === levels[4].value && loading && (
              <div className="mt-4 w-4 h-4 border-2 border-[#72564c] border-t-transparent rounded-full animate-spin"></div>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-red-600 text-sm mb-6 text-center">
            {error}
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="p-10 text-center opacity-40 text-xs tracking-[0.2em] font-bold uppercase text-[#72564c]">
        Designed with Otter Love • Hangul Learning System
      </footer>

      <style>{`
        .tactile-card {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>

    {/* Inline level-skip test for non-NEWBIE first-login selection */}
    {testTarget && (
      <LevelTestModal
        targetLevel={testTarget as any}
        onFinish={async (passed, newLevel) => {
          setTestTarget(null);
          if (passed && newLevel) {
            await commitLevel(newLevel as Level);
          } else {
            // Test failed → land at NEWBIE
            setError('Chưa đạt. Bạn sẽ bắt đầu từ cấp Beginner.');
            setLoading(true);
            try {
              const token = localStorage.getItem('token');
              if (token) {
                await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/set-level`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ level: 'NEWBIE' }),
                });
              }
              await updateLevel('NEWBIE' as Level);
              router.push('/dashboard');
            } finally {
              setLoading(false);
            }
          }
        }}
        onClose={() => setTestTarget(null)}
      />
    )}
  </>
  );
}
