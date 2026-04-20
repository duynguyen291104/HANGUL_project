'use client';

import { useEffect, useRef, useState } from 'react';

const TOTAL_PAIRS = 20;
const PAIRS_PER_ROUND = 4;
const TOTAL_ROUNDS = TOTAL_PAIRS / PAIRS_PER_ROUND; // 5
const TIME_LIMIT = 90; // seconds

interface MatchPair {
  id: string;
  korean: string;
  vietnamese: string;
  romanization: string;
}

type Side = 'vietnamese' | 'korean';

interface SelectedCard {
  id: string;
  side: Side;
}

interface MatchingTournamentProps {
  onComplete: (score: number, correctAnswers: number) => void;
  onExit: () => void;
}

export default function MatchingTournament({ onComplete, onExit }: MatchingTournamentProps) {
  const [allPairs, setAllPairs] = useState<MatchPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState(0);
  const [shuffledKorean, setShuffledKorean] = useState<MatchPair[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<SelectedCard | null>(null);
  const [wrongVN, setWrongVN] = useState<string | null>(null);
  const [wrongKR, setWrongKR] = useState<string | null>(null);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const finishedRef = useRef(false);
  const allPairsRef = useRef<MatchPair[]>([]);

  useEffect(() => {
    loadPairs();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (loading) return;
    if (timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [loading, timeLeft]);

  // Time's up
  useEffect(() => {
    if (timeLeft === 0 && !finishedRef.current && !loading) {
      finishedRef.current = true;
      onComplete(totalCorrect * 5, totalCorrect);
    }
  }, [timeLeft, loading]);

  const loadPairs = async () => {
    try {
      const token = localStorage.getItem('token');

      let res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vocabulary/random?limit=${TOTAL_PAIRS}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);

      let data = res ? await res.json() : null;

      if (!data || (Array.isArray(data) && data.length === 0) || (!Array.isArray(data) && (!data?.data || data.data.length === 0))) {
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vocabulary?limit=${TOTAL_PAIRS}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
        data = res ? await res.json() : null;
      }

      let vocabArray = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);

      if (!vocabArray || vocabArray.length < TOTAL_PAIRS) {
        vocabArray = [
          { korean: '안녕하세요', vietnamese: 'Xin chào', romanization: 'Annyeonghaseyo' },
          { korean: '감사합니다', vietnamese: 'Cảm ơn', romanization: 'Gamsahamnida' },
          { korean: '네', vietnamese: 'Có', romanization: 'Ne' },
          { korean: '아니요', vietnamese: 'Không', romanization: 'Aniyo' },
          { korean: '수고했어요', vietnamese: 'Làm tốt rồi', romanization: 'Sugohasyeosseoyo' },
          { korean: '잘 지내세요', vietnamese: 'Bạn khỏe không', romanization: 'Jal jineseyo' },
          { korean: '미안합니다', vietnamese: 'Xin lỗi', romanization: 'Mianhamnida' },
          { korean: '물', vietnamese: 'Nước', romanization: 'Mul' },
          { korean: '음식', vietnamese: 'Thức ăn', romanization: 'Eumsik' },
          { korean: '학교', vietnamese: 'Trường học', romanization: 'Hakgyo' },
          { korean: '친구', vietnamese: 'Bạn bè', romanization: 'Chingu' },
          { korean: '사랑', vietnamese: 'Tình yêu', romanization: 'Sarang' },
          { korean: '행복', vietnamese: 'Hạnh phúc', romanization: 'Haengbok' },
          { korean: '음악', vietnamese: 'Âm nhạc', romanization: 'Eumak' },
          { korean: '영화', vietnamese: 'Phim ảnh', romanization: 'Yeonghwa' },
          { korean: '책', vietnamese: 'Sách', romanization: 'Chaek' },
          { korean: '시간', vietnamese: 'Thời gian', romanization: 'Sigan' },
          { korean: '돈', vietnamese: 'Tiền', romanization: 'Don' },
          { korean: '집', vietnamese: 'Nhà', romanization: 'Jip' },
          { korean: '사람', vietnamese: 'Con người', romanization: 'Saram' },
        ];
      }

      const newPairs: MatchPair[] = vocabArray.slice(0, TOTAL_PAIRS).map((vocab: any, idx: number) => ({
        id: `pair-${idx}`,
        korean: vocab.korean,
        vietnamese: vocab.vietnamese,
        romanization: vocab.romanization || 'N/A',
      }));

      allPairsRef.current = newPairs;
      setAllPairs(newPairs);
      applyRound(newPairs, 0);
      setLoading(false);
    } catch (error) {
      console.error('Error loading pairs:', error);
      setLoading(false);
    }
  };

  const applyRound = (pairs: MatchPair[], roundIndex: number) => {
    const roundPairs = pairs.slice(roundIndex * PAIRS_PER_ROUND, (roundIndex + 1) * PAIRS_PER_ROUND);
    const shuffled = [...roundPairs].sort(() => Math.random() - 0.5);
    setShuffledKorean(shuffled);
    setMatched(new Set());
    setSelected(null);
    setWrongVN(null);
    setWrongKR(null);
  };

  const speakKorean = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const handleSelect = (id: string, side: Side) => {
    if (matched.has(id) || wrongVN !== null || wrongKR !== null) return;

    if (selected && selected.side === side) {
      setSelected({ id, side });
      return;
    }

    if (!selected) {
      setSelected({ id, side });
      return;
    }

    const vietnameseId = side === 'vietnamese' ? id : selected.id;
    const koreanId = side === 'korean' ? id : selected.id;
    const isCorrect = vietnameseId === koreanId;

    if (isCorrect) {
      const newMatched = new Set(matched);
      newMatched.add(vietnameseId);
      setMatched(newMatched);
      setSelected(null);

      setTotalCorrect((prev) => {
        const newTotal = prev + 1;

        if (newMatched.size === PAIRS_PER_ROUND) {
          const nextRound = currentRound + 1;
          if (nextRound >= TOTAL_ROUNDS) {
            if (!finishedRef.current) {
              finishedRef.current = true;
              setTimeout(() => onComplete(newTotal * 5, newTotal), 600);
            }
          } else {
            setTimeout(() => {
              setCurrentRound(nextRound);
              applyRound(allPairsRef.current, nextRound);
            }, 600);
          }
        }

        return newTotal;
      });
    } else {
      setWrongVN(vietnameseId);
      setWrongKR(koreanId);
      setTimeout(() => {
        setWrongVN(null);
        setWrongKR(null);
        setSelected(null);
      }, 800);
    }
  };

  const getVietnameseClass = (id: string) => {
    if (matched.has(id)) return 'bg-green-100 text-green-700 border-2 border-green-500 cursor-default';
    if (wrongVN === id) return 'bg-red-100 text-red-700 border-2 border-red-500';
    if (selected?.id === id && selected?.side === 'vietnamese') return 'bg-[#72564c] text-white border-2 border-[#72564c] ring-2 ring-[#8d6e63]';
    return 'bg-[#f0e6e0] hover:bg-[#e8dcd4] text-[#72564c] border-2 border-transparent hover:border-[#72564c]';
  };

  const getKoreanClass = (id: string) => {
    if (matched.has(id)) return 'bg-green-100 text-green-700 border-2 border-green-500 cursor-default';
    if (wrongKR === id) return 'bg-red-100 text-red-700 border-2 border-red-500';
    if (selected?.id === id && selected?.side === 'korean') return 'bg-[#72564c] text-white border-2 border-[#72564c] ring-2 ring-[#8d6e63]';
    return 'bg-[#f0e6e0] hover:bg-[#e8dcd4] text-[#72564c] border-2 border-transparent hover:border-[#72564c]';
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen text-white text-xl">Đang tải...</div>;
  }

  const roundPairs = allPairs.slice(currentRound * PAIRS_PER_ROUND, (currentRound + 1) * PAIRS_PER_ROUND);
  const timerColor = timeLeft <= 20 ? 'text-red-500' : timeLeft <= 45 ? 'text-orange-500' : 'text-[#72564c]';

  return (
    <div className="min-h-screen p-6 bg-[#fafaf5]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">

              <h1 className="text-3xl font-bold text-[#72564c]">Ghép từ hoàn hảo</h1>
            </div>
            <p className="text-[#8d6e63] text-sm">Ghép từ tiếng Việt với từ tiếng Hàn tương ứng</p>
          </div>
          <div className="flex items-center gap-5">
            <button onClick={onExit} className="text-[#72564c] hover:bg-[#f0e6e0] p-3 rounded-lg transition-all text-2xl">
              ✕
            </button>
          </div>
        </div>

        {/* Round progress bar */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-2 rounded-full ${
                i < currentRound ? 'bg-green-400' : i === currentRound ? 'bg-[#72564c]' : 'bg-[#e8dcd4]'
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="grid grid-cols-2 gap-8">
            {/* Vietnamese column */}
            <div>
              <h3 className="font-bold text-lg mb-4 text-[#72564c] flex items-center gap-2">
                <span>🇻🇳</span> Tiếng Việt
              </h3>
              <div className="space-y-2">
                {roundPairs.map((pair) => (
                  <button
                    key={pair.id}
                    onClick={() => handleSelect(pair.id, 'vietnamese')}
                    className={`w-full p-3 rounded-lg font-semibold text-left transition-all ${getVietnameseClass(pair.id)}`}
                  >
                    {pair.vietnamese}
                  </button>
                ))}
              </div>
            </div>

            {/* Korean column – shuffled */}
            <div>
              <h3 className="font-bold text-lg mb-4 text-[#72564c] flex items-center gap-2">
                <span>🇰🇷</span> Tiếng Hàn
              </h3>
              <div className="space-y-2">
                {shuffledKorean.map((pair) => (
                  <button
                    key={pair.id}
                    onClick={() => { speakKorean(pair.korean); handleSelect(pair.id, 'korean'); }}
                    className={`w-full p-3 rounded-lg font-semibold text-left transition-all ${getKoreanClass(pair.id)}`}
                  >
                    {pair.korean}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#e8dcd4]">
            <div className="text-center">
              <p className="text-xs text-[#8d6e63] mb-1">🏆 Trophy</p>
              <p className="text-2xl font-bold text-[#72564c]">{totalCorrect * 5}<span className="text-sm font-normal text-[#8d6e63]">/100</span></p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#8d6e63] mb-1">Tiến độ</p>
              <p className="text-2xl font-bold text-[#72564c]">{currentRound + 1}<span className="text-sm font-normal text-[#8d6e63]">/{TOTAL_ROUNDS} vòng</span></p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#8d6e63] mb-1">Thời gian</p>
              <p className={`text-2xl font-bold ${timerColor}`}>{timeLeft}s</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
