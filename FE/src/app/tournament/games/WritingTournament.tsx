'use client';

import { useEffect, useRef, useState } from 'react';

interface Vocabulary {
  id: number;
  korean: string;
  vietnamese: string;
  romanization?: string;
}

interface WritingTournamentProps {
  onComplete: (score: number, correctAnswers: number) => void;
  onExit: () => void;
}

export default function WritingTournament({ onComplete, onExit }: WritingTournamentProps) {
  const [questions, setQuestions] = useState<Vocabulary[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [answered, setAnswered] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  // Countdown timer — starts when questions are loaded
  useEffect(() => {
    if (loading) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          onComplete(score, correctAnswers);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [loading]);

  // Clean up timer on unmount
  useEffect(() => () => clearInterval(timerRef.current!), []);

  const loadQuestions = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Try endpoint 1: /vocabulary/random
      let res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vocabulary/random?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      
      let data = res ? await res.json() : null;

      // Fallback: Try endpoint 2: /vocabulary
      if (!data || (Array.isArray(data) && data.length === 0) || (!Array.isArray(data) && (!data?.data || data.data.length === 0))) {
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vocabulary?limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
        data = res ? await res.json() : null;
      }

      // Handle multiple response formats
      let vocabArray = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);

      if (!vocabArray || vocabArray.length === 0) {
        console.error('Invalid API response - using mock data:', data);
        // Mock data fallback
        vocabArray = [
          { id: 1, korean: '안녕하세요', vietnamese: 'Xin chào' },
          { id: 2, korean: '감사합니다', vietnamese: 'Cảm ơn' },
          { id: 3, korean: '네', vietnamese: 'Có' },
          { id: 4, korean: '아니요', vietnamese: 'Không' },
          { id: 5, korean: '수고했어요', vietnamese: 'Làm tốt rồi' },
          { id: 6, korean: '잘 지내세요', vietnamese: 'Bạn khỏe không' },
          { id: 7, korean: '미안합니다', vietnamese: 'Xin lỗi' },
          { id: 8, korean: '물', vietnamese: 'Nước' },
          { id: 9, korean: '음식', vietnamese: 'Thức ăn' },
          { id: 10, korean: '학교', vietnamese: 'Trường học' },
        ];
      }

      setQuestions(vocabArray.slice(0, 10));
      setLoading(false);
    } catch (error) {
      console.error('Error loading questions:', error);
      setLoading(false);
    }
  };

  const playAudio = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    setPlaying(true);
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleSubmit = () => {
    if (answered) return;

    setAnswered(true);
    const isCorrect = userInput.trim().toLowerCase() === questions[currentQuestion].vietnamese.toLowerCase();

    if (isCorrect) {
      setScore((prev) => prev + 10);
      setCorrectAnswers((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setAnswered(false);
      setUserInput('');
      setShowHint(false);
    } else {
      clearInterval(timerRef.current!);
      onComplete(score, correctAnswers);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen text-white text-xl">Đang tải...</div>;
  }

  if (questions.length === 0 || !questions[currentQuestion]) {
    return <div className="flex justify-center items-center min-h-screen text-white text-xl">Không có dữ liệu</div>;
  }

  const question = questions[currentQuestion];
  const isCorrect = userInput.trim().toLowerCase() === question.vietnamese.toLowerCase();

  return (
    <div className="min-h-screen p-6 bg-[#fafaf5]">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-[#72564c]">Viết tốc độ</h1>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <button onClick={onExit} className="text-[#72564c] hover:bg-[#f0e6e0] p-3 rounded-lg transition-all text-2xl">
              ✕
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="mb-6">
            <p className="text-[#8d6e63] text-sm mb-3 font-medium">Nhập tiếng Việt của từ Hàn Quốc</p>
            <div className="flex gap-3">
              <button
                onClick={() => playAudio(question.korean)}
                disabled={playing}
                className="flex-1 bg-gradient-to-r from-[#72564c] to-[#8d6e63] hover:opacity-90 text-white font-bold py-3 rounded-lg transition-all active:scale-95"
              >
                {playing ? 'Đang phát...' : 'Nghe'}
              </button>
              <button
                onClick={() => setShowHint(!showHint)}
                className="flex-1 bg-[#f0e6e0] hover:bg-[#e8dcd4] text-[#72564c] font-bold py-3 rounded-lg transition-all active:scale-95"
              >
                Gợi ý
              </button>
            </div>
          </div>

          {showHint && (
            <div className="bg-[#fff8f0] border-2 border-[#e8dcd4] p-4 rounded-lg mb-6">
              <p className="text-[#72564c] font-semibold">
                Phiên âm: <span className="text-[#8d6e63]">{question.romanization || 'N/A'}</span>
              </p>
            </div>
          )}

          <div className="mb-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-[#72564c] mb-2">{question.korean}</p>
              <p className="text-[#8d6e63]">=?</p>
            </div>
          </div>

          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !answered && handleSubmit()}
            placeholder="Nhập từ tiếng Việt tại đây..."
            disabled={answered}
            className="w-full px-4 py-3 mb-4 border-2 border-[#e8dcd4] rounded-lg focus:outline-none focus:border-[#72564c] text-[#72564c] placeholder-[#8d6e63]"
          />

          {answered && (
            <div className={`p-4 rounded-lg text-center font-bold mb-6 ${
              isCorrect
                ? 'bg-green-100 text-green-700 border-2 border-green-500'
                : 'bg-red-100 text-red-700 border-2 border-red-500'
            }`}>
              {isCorrect ? '✓ Chính xác! Đáp án đúng: ' + question.vietnamese : '✗ Sai! Đáp án đúng: ' + question.vietnamese}
            </div>
          )}

          <div className="flex gap-3">
            {!answered ? (
              <button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white font-bold py-3 rounded-lg hover:opacity-90 transition-all active:scale-95"
              >
                Kiểm tra
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex-1 bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white font-bold py-3 rounded-lg hover:opacity-90 transition-all active:scale-95"
              >
                {currentQuestion < questions.length - 1 ? 'Tiếp tục' : 'Hoàn thành'}
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#e8dcd4]">
            <div className="text-center">
              <p className="text-xs text-[#8d6e63] mb-1">🏆 Trophy</p>
              <p className="text-2xl font-bold text-[#72564c]">{score}<span className="text-sm font-normal text-[#8d6e63]">/100</span></p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#8d6e63] mb-1">Tiến độ</p>
              <p className="text-2xl font-bold text-[#72564c]">{currentQuestion + 1}<span className="text-sm font-normal text-[#8d6e63]">/{questions.length}</span></p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#8d6e63] mb-1">Thời gian</p>
              <p className={`text-2xl font-bold ${
                timeLeft <= 20 ? 'text-red-500' : timeLeft <= 45 ? 'text-orange-500' : 'text-[#72564c]'
              }`}>{formatTime(timeLeft)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
