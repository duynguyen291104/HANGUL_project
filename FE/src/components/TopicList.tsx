'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import TopicCard from '@/components/TopicCard';

// Map topic slug → image URL. Add entries here as you assign images to topics.
const TOPIC_IMAGES: Record<string, string> = {
  'cho-hi-c-bn': 'https://res.cloudinary.com/dds5jlp7e/image/upload/v1777342433/Screenshot_from_2026-04-28_09-13-20_mf4vxm.png',
  '-ni-tht': 'https://res.cloudinary.com/dds5jlp7e/image/upload/v1777342920/Screenshot_from_2026-04-28_09-21-39_dsnj7f.png',
  'thng': 'https://res.cloudinary.com/dds5jlp7e/image/upload/v1777343054/Screenshot_from_2026-04-28_09-23-59_qszm1o.png',
  's-m': 'https://res.cloudinary.com/dds5jlp7e/image/upload/v1777356835/numbers_zco29i.png',
  'ngh-nghip': 'https://res.cloudinary.com/dds5jlp7e/image/upload/v1777343455/Screenshot_from_2026-04-28_09-30-44_vzcizh.png',
  'cc-phng-trong-nh': 'https://res.cloudinary.com/dds5jlp7e/image/upload/v1777343754/Screenshot_from_2026-04-28_09-35-44_w3rrda.png',
  'ng-vt': 'https://res.cloudinary.com/dds5jlp7e/image/upload/v1777344849/Screenshot_from_2026-04-28_09-53-59_jlbyoa.png',
  'cc-b-phn-c-th': 'https://res.cloudinary.com/dds5jlp7e/image/upload/v1777345020/Screenshot_from_2026-04-28_09-56-47_mejdgx.png',
  'qun-o': 'https://res.cloudinary.com/dds5jlp7e/image/upload/v1777345185/Screenshot_from_2026-04-28_09-59-26_cpdcgl.png',
  'mu-sc': 'https://res.cloudinary.com/dds5jlp7e/image/upload/v1777345272/Screenshot_from_2026-04-28_10-01-01_jkglic.png',
  'th-trong-tun': 'https://res.cloudinary.com/dds5jlp7e/image/upload/v1777357034/Screenshot_from_2026-04-28_13-16-53_shuwdm.png',
};

// Topics with multiple images (displayed side by side)
const TOPIC_IMAGES_MULTI: Record<string, string[]> = {
  'ng-t-c-bn': [
    'https://res.cloudinary.com/dds5jlp7e/image/upload/v1777343975/Screenshot_from_2026-04-28_09-39-23_kfq34s.png',
    'https://res.cloudinary.com/dds5jlp7e/image/upload/v1777344539/Screenshot_from_2026-04-28_09-48-19_uimgpn.png',
  ],
  'tnh-t-c-bn': [
    'https://res.cloudinary.com/dds5jlp7e/image/upload/v1777343975/Screenshot_from_2026-04-28_09-39-23_kfq34s.png',
    'https://res.cloudinary.com/dds5jlp7e/image/upload/v1777344638/Screenshot_from_2026-04-28_09-50-20_keie21.png',
  ],
};

interface Topic {
  id: number;
  name: string;
  slug: string;
  type: string;
  description: string;
  level: string;
  order: number;
}

interface TopicListProps {
  mode: 'quiz' | 'writing' | 'speak';
}

export default function TopicList({ mode }: TopicListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, updateLevel } = useAuthStore();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  // const [questionCounts, _setQuestionCounts] = useState<Record<number, number>>({});
  const [progressData, setProgressData] = useState<Record<number, { completed: number; total: number; correct?: number; done?: boolean; score?: number }>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!user) {
      router.push('/login');
      return;
    }

    const fetchTopicsAndProgress = async () => {
      try {
        setLoading(true);
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        // Fetch learning-path once: get authoritative level from DB + progress data
        let level = user.level || 'NEWBIE';
        let learningPathData: any = null;
        if (token) {
          try {
            const lpRes = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/user/learning-path`,
              { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
            );
            if (lpRes.ok) {
              learningPathData = await lpRes.json();
              level = learningPathData.level || level;
              // Sync store if DB level differs from local state
              if (learningPathData.level && learningPathData.level !== user.level) {
                await updateLevel(learningPathData.level);
              }
            }
          } catch (_) { /* keep local level as fallback */ }
        }

        // Fetch topics for the authoritative level
        const topicResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/topic/by-level/${level}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );

        if (!topicResponse.ok) {
          throw new Error(`Failed to fetch topics: ${topicResponse.status}`);
        }

        const topicData = await topicResponse.json();
        const topicsData = topicData.data || [];
        setTopics(topicsData);

        // Map progress data from already-fetched learning path
        if (learningPathData) {
          const progress: Record<number, { completed: number; total: number; correct?: number; done?: boolean; score?: number }> = {};
          for (const topic of learningPathData.topics) {
            let modeProgress;
            if (mode === 'quiz') {
              modeProgress = topic.quiz;
            } else if (mode === 'writing') {
              modeProgress = topic.writing;
            } else if (mode === 'speak') {
              modeProgress = topic.pronunciation;
            }

            progress[topic.id] = {
              completed: modeProgress?.correct || 0,
              total: modeProgress?.total || 0,
              correct: modeProgress?.correct || 0,
              done: modeProgress?.done || false,
              score: modeProgress?.score,
            };
          }
          setProgressData(progress);
        } else {
          // No LP data: initialize with empty values
          const emptyProgress: Record<number, { completed: number; total: number; correct?: number; done?: boolean; score?: number }> = {};
          for (const topic of topicsData) {
            emptyProgress[topic.id] = { completed: 0, total: 0, correct: 0, done: false };
          }
          setProgressData(emptyProgress);
        }
      } catch (err) {
        console.error(`Error:`, err);
        setError(err instanceof Error ? err.message : 'Failed to load topics');
      } finally {
        setLoading(false);
      }
    };

    fetchTopicsAndProgress();
    
    // Clear the refresh param from URL if it exists
    if (searchParams.get('refresh')) {
      window.history.replaceState({}, '', `/${mode === 'speak' ? 'pronunciation' : mode}`);
    }
  }, [mounted, user, router, mode, searchParams]);

  const getModeInfo = () => {
    switch (mode) {
      case 'quiz':
        return {
          title: 'Trắc Nghiệm',
          subtitle: 'Kiểm tra từ vựng và ngữ pháp',
        };
      case 'writing':
        return {
          title: 'Luyện Viết',
          subtitle: 'Thực hành viết chữ Hangul',
        };
      case 'speak':
        return {
          title: 'Luyện Phát Âm',
          subtitle: 'Cải thiện kỹ năng phát âm',
        };
      default:
        return {
          title: 'Bài Học',
          subtitle: 'Bắt đầu học',
        };
    }
  };

  const handleStartTopic = (slug: string) => {
    const routePath = mode === 'speak' ? 'pronunciation' : mode;
    router.push(`/${routePath}/${slug}`);
  };

  const modeInfo = getModeInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface to-surface-container">
      <Header />

      {/* Header Section */}
      <header className="pt-[70px] pl-[200px] mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold font-headline text-on-background leading-tight tracking-tight">
          {modeInfo.title}
        </h1>
        <p className="text-on-surface-variant font-medium font-body mt-[20px]" style={{ fontSize: '20px' }}>{modeInfo.subtitle}</p>
        {mounted && (
          <div className="inline-block text-on-surface-variant font-semibold mt-4 font-headline" style={{ fontSize: '20px' }}>
            Cấp độ: {user?.level || 'N/A'}
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Content */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-fixed border-t-primary"></div>
            <p className="mt-4 text-on-surface-variant font-medium font-body">Đang tải bài học...</p>
          </div>
        ) : error ? (
          <div className="bg-error-container border border-error rounded-2xl p-8 text-center">
            <p className="text-on-error-container font-semibold font-headline mb-4 text-lg">Error: {error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-error text-on-error rounded-full font-bold font-headline hover:opacity-90 transition"
            >
              Thử Lại
            </button>
          </div>
        ) : topics.length === 0 ? (
          <div className="bg-surface-container border border-outline-variant rounded-2xl p-8 text-center">
            <p className="text-on-surface-variant font-semibold font-headline text-lg">Không có bài học cho cấp độ này</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {topics.map((topic, index) => (
              <div
                key={topic.id}
                style={{
                  opacity: 0,
                  animation: 'cardFadeUp 0.45s ease forwards',
                  animationDelay: `${index * 80}ms`,
                }}
              >
                <TopicCard
                  id={topic.id}
                  name={topic.name}
                  description={topic.description}
                  level={topic.level}
                  order={topic.order}
                  mode={mode === 'speak' ? 'pronunciation' : mode}
                  completedQuestions={progressData[topic.id]?.completed || 0}
                  totalQuestions={progressData[topic.id]?.total || 0}
                  done={progressData[topic.id]?.done || false}
                  score={progressData[topic.id]?.score}
                  image={TOPIC_IMAGES[topic.slug]}
                  images={TOPIC_IMAGES_MULTI[topic.slug]}
                  onClick={() => handleStartTopic(topic.slug)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes cardFadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
