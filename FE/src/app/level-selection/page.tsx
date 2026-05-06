'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { Level } from '@/mocks/topics';
import LevelTestModal from '@/components/LevelTestModal';

const levels: { value: Level; label: string; description: string }[] = [
  {
    value: 'NEWBIE',
    label: 'Newbie',
    description: 'Các chủ đề nhập môn — bảng chữ cái và từ vựng căn bản nhất',
  },
  {
    value: 'BEGINNER',
    label: 'Beginner',
    description: 'Các chủ đề quen thuộc hàng ngày với từ vựng phổ biến',
  },
  {
    value: 'INTERMEDIATE',
    label: 'Intermediate',
    description: 'Các chủ đề đa dạng hơn với độ khó từ vựng và ngữ pháp tăng dần',
  },
  {
    value: 'UPPER',
    label: 'Upper',
    description: 'Các chủ đề nâng cao với ngữ pháp phức tạp và từ vựng phong phú',
  },
  {
    value: 'ADVANCED',
    label: 'Advanced',
    description: 'Các chủ đề chuyên sâu với nội dung và cấu trúc câu phức tạp nhất',
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
    <div className="h-screen overflow-hidden bg-[#fafaf5] flex" style={{
      backgroundImage: 'radial-gradient(#d4c3be 0.5px, transparent 0.5px)',
      backgroundSize: '24px 24px',
    }}>

      {/* ── Left panel — 38.2% (golden minor) ── */}
      <div className="flex flex-col items-center justify-center gap-5 px-10 shrink-0" style={{ width: '38.2%' }}>
        <img
          alt="Otter Mascot"
          className="object-contain"
          style={{ width: '140px', height: '140px' }}
          src="/otter-mascot.png"
        />
        <h1 className="text-6xl font-black tracking-tighter uppercase text-[#72564c] leading-none">
          HANGUL
        </h1>
        <div className="text-center">
          <p className="font-bold text-[#8d6e63]" suppressHydrationWarning style={{ fontSize: '20px' }}>
            Chào mừng, {user?.name || 'Learner'}!
          </p>
          <p className="text-[#504441] mt-1" style={{ fontSize: '20px' }}>
            Hãy chọn mức độ học tập phù hợp với bạn
          </p>
        </div>
        {error && (
          <p className="text-red-500 text-center" style={{ fontSize: '20px' }}>{error}</p>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="w-px bg-[#e8dcd4] my-12 shrink-0" />

      {/* ── Right panel — 61.8% (golden major) ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-10">
        {/* 2×2 top grid */}
        <div className="grid grid-cols-2 gap-4 w-full" style={{ maxWidth: '560px' }}>
          {levels.slice(0, 4).map((level) => (
            <button
              key={level.value}
              onClick={() => handleSelectLevel(level.value)}
              disabled={loading}
              className="tactile-card bg-white px-6 py-5 rounded-xl flex flex-col items-center text-center border-2 border-transparent hover:border-[#8d6e63] hover:shadow-[0_12px_30px_rgba(114,86,76,0.1)] hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <h3 className="font-extrabold text-[#72564c] mb-1" style={{ fontSize: '20px' }}>
                {level.label}
              </h3>
              <p className="text-[#504441] leading-snug" style={{ fontSize: '20px' }}>
                {level.description}
              </p>
              {selected === level.value && loading && (
                <div className="mt-3 w-4 h-4 border-2 border-[#72564c] border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          ))}
        </div>

        {/* Advanced — full width */}
        <button
          onClick={() => handleSelectLevel(levels[4].value)}
          disabled={loading}
          className="tactile-card bg-white px-6 py-5 rounded-xl flex flex-col items-center text-center border-2 border-transparent hover:border-[#8d6e63] hover:shadow-[0_12px_30px_rgba(114,86,76,0.1)] hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all w-full"
          style={{ maxWidth: '560px' }}
        >
          <h3 className="font-extrabold text-[#72564c] mb-1" style={{ fontSize: '20px' }}>
            {levels[4].label}
          </h3>
          <p className="text-[#504441] leading-snug" style={{ fontSize: '20px' }}>
            {levels[4].description}
          </p>
          {selected === levels[4].value && loading && (
            <div className="mt-3 w-4 h-4 border-2 border-[#72564c] border-t-transparent rounded-full animate-spin" />
          )}
        </button>
      </div>

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
