'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import SpeedTournament from '../SpeedTournament';
import WritingTournament from '../WritingTournament';
import MatchingTournament from '../MatchingTournament';
import PronunciationTournament from '../PronunciationTournament';
import AchievementToast, { AchievementNotification } from '@/components/AchievementToast';

export default function GamePage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params?.gameId as string;
  const [submitting, setSubmitting] = useState(false);
  const [newAchievements, setNewAchievements] = useState<AchievementNotification[]>([]);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!gameId) {
      router.push('/tournament');
    }
  }, [gameId, router]);

  const handleComplete = async (_score: number, correctAnswers: number) => {
    setSubmitting(true);
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      // Total questions per game type
      const totalQuestions = gameId === 'flash-writing' ? 10 : 20;
      const scorePercent = Math.round((correctAnswers / totalQuestions) * 100);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournament/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ score: scorePercent, correctAnswers, gameType: gameId }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`Tournament saved: +${data.trophyGained} Trophy | ${correctAnswers}/${totalQuestions} correct`);
        if (data.newAchievements?.length) {
          setNewAchievements(data.newAchievements);
        }
      } else {
        console.error('Tournament submit failed:', res.status);
      }

      // Log activity time + update streak
      let actAchievements: AchievementNotification[] = [];
      try {
        const actRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/activity/log-time`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ totalSeconds: elapsedSeconds, skillType: 'tournament', sessionCount: 1 }),
        });
        if (actRes.ok) {
          const actData = await actRes.json();
          if (actData.newAchievements?.length) {
            actAchievements = actData.newAchievements;
            setNewAchievements(prev => [...prev, ...actAchievements]);
          }
        }
      } catch (_) { /* non-blocking */ }
    } catch (err) {
      console.error('Save tournament error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Effect: redirect after achievements have been shown (or immediately if none)
  useEffect(() => {
    if (!submitting) {
      const delay = newAchievements.length > 0 ? 4500 : 500;
      const t = setTimeout(() => router.push('/tournament'), delay);
      return () => clearTimeout(t);
    }
  }, [submitting]);

  const handleExit = () => {
    router.push('/tournament');
  };

  if (submitting) {
    return (
      <div className="min-h-screen bg-[#fafaf5] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#72564c] mx-auto mb-4"></div>
          <p className="text-[#72564c] font-semibold">Đang lưu kết quả...</p>
        </div>
        <AchievementToast
          achievements={newAchievements}
          onDismiss={(id) => setNewAchievements(prev => prev.filter(a => a.id !== id))}
        />
      </div>
    );
  }

  const renderGame = () => {
    switch (gameId) {
      case 'speed-quiz':
        return <SpeedTournament onComplete={handleComplete} onExit={handleExit} />;
      case 'flash-writing':
        return <WritingTournament onComplete={handleComplete} onExit={handleExit} />;
      case 'word-match':
        return <MatchingTournament onComplete={handleComplete} onExit={handleExit} />;
      case 'perfect-speaking':
        return <PronunciationTournament onComplete={handleComplete} onExit={handleExit} />;
      default:
        return <SpeedTournament onComplete={handleComplete} onExit={handleExit} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf5]">
      {renderGame()}
      <AchievementToast
        achievements={newAchievements}
        onDismiss={(id) => setNewAchievements(prev => prev.filter(a => a.id !== id))}
      />
    </div>
  );
}

