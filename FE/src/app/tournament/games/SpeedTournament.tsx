'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Question {
  id: number;
  korean: string;
  english: string;
  vietnamese: string;
  options: string[];
}

interface SpeedTournamentProps {
  onComplete: (score: number, correctAnswers: number) => void;
  onExit: () => void;
}

export default function SpeedTournament({ onComplete, onExit }: SpeedTournamentProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(90);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  // Guard: prevent finishGame from being called more than once
  const finishedRef = useRef(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  // Timer: count down, but DON'T call finishGame inside setState updater
  useEffect(() => {
    if (loading || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, timeLeft]);

  // Trigger finish when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && !loading) {
      finishGame();
    }
  }, [timeLeft, loading]);

  const loadQuestions = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Try endpoint 1: /vocabulary/random
      let res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vocabulary/random?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      
      let data = res ? await res.json() : null;

      // Fallback: Try endpoint 2: /vocabulary
      if (!data || (Array.isArray(data) && data.length === 0) || (!Array.isArray(data) && (!data?.data || data.data.length === 0))) {
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vocabulary?limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);
        data = res ? await res.json() : null;
      }

      // Fallback: Try endpoint 3: Get from topic questions
      if (!data || (Array.isArray(data) && data.length === 0) || (!Array.isArray(data) && (!data?.data || data.data.length === 0))) {
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/question/by-topic/1?limit=20`, {
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
          { id: 1, korean: '안녕하세요', english: 'Hello', vietnamese: 'Xin chào', kana: 'Annyeonghaseyo' },
          { id: 2, korean: '감사합니다', english: 'Thank you', vietnamese: 'Cảm ơn', kana: 'Gamsahamnida' },
          { id: 3, korean: '네', english: 'Yes', vietnamese: 'Có', kana: 'Ne' },
          { id: 4, korean: '아니요', english: 'No', vietnamese: 'Không', kana: 'Aniyo' },
          { id: 5, korean: '수고했어요', english: 'Good job', vietnamese: 'Làm tốt rồi', kana: 'Sugohasyeosseoyo' },
          { id: 6, korean: '잘 지내세요', english: 'How are you', vietnamese: 'Bạn khỏe không', kana: 'Jal jineseyo' },
          { id: 7, korean: '미안합니다', english: 'Sorry', vietnamese: 'Xin lỗi', kana: 'Mianhamnida' },
          { id: 8, korean: '물', english: 'Water', vietnamese: 'Nước', kana: 'Mul' },
          { id: 9, korean: '음식', english: 'Food', vietnamese: 'Thức ăn', kana: 'Eumsik' },
          { id: 10, korean: '학교', english: 'School', vietnamese: 'Trường học', kana: 'Hakgyo' },
          { id: 11, korean: '책', english: 'Book', vietnamese: 'Sách', kana: 'Chaek' },
          { id: 12, korean: '펜', english: 'Pen', vietnamese: 'Bút', kana: 'Pen' },
          { id: 13, korean: '가방', english: 'Bag', vietnamese: 'Túi', kana: 'Gabang' },
          { id: 14, korean: '집', english: 'House', vietnamese: 'Nhà', kana: 'Jip' },
          { id: 15, korean: '날씨', english: 'Weather', vietnamese: 'Thời tiết', kana: 'Nalsssi' },
          { id: 16, korean: '계절', english: 'Season', vietnamese: 'Mùa', kana: 'Gyejeol' },
          { id: 17, korean: '색', english: 'Color', vietnamese: 'Màu sắc', kana: 'Saek' },
          { id: 18, korean: '숫자', english: 'Number', vietnamese: 'Số', kana: 'Sutja' },
          { id: 19, korean: '이름', english: 'Name', vietnamese: 'Tên', kana: 'Ireum' },
          { id: 20, korean: '나이', english: 'Age', vietnamese: 'Tuổi', kana: 'Nai' },
        ];
      }

      const quizQuestions = vocabArray.slice(0, 20).map((vocab: any) => {
        const wrongAnswers = vocabArray
          .filter((v: any) => v.id !== vocab.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map((v: any) => v.vietnamese);

        const options = [vocab.vietnamese, ...wrongAnswers].sort(
          () => Math.random() - 0.5
        );

        return {
          id: vocab.id,
          korean: vocab.korean,
          english: vocab.english,
          vietnamese: vocab.vietnamese,
          options,
        };
      });

      setQuestions(quizQuestions);
      setLoading(false);
    } catch (error) {
      console.error('Error loading questions:', error);
      setLoading(false);
    }
  };

  const handleAnswer = (answer: string) => {
    if (answered) return;

    const correct = answer === questions[currentQuestion].vietnamese;
    setSelectedAnswer(answer);
    setIsCorrect(correct);
    setAnswered(true);

    if (correct) {
      setScore((prev) => prev + 5);
      setCorrectAnswers((prev) => prev + 1);
    }

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion((prev) => prev + 1);
        setAnswered(false);
        setSelectedAnswer(null);
        setIsCorrect(false);
      } else {
        finishGame();
      }
    }, 500);
  };

  const finishGame = () => {
    // Guard: only fire once even if timer and question-end both trigger
    if (finishedRef.current) return;
    finishedRef.current = true;
    onComplete(score, correctAnswers);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-white text-xl">Đang tải...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return <div className="flex justify-center items-center min-h-screen text-white">Không có câu hỏi</div>;
  }

  const question = questions[currentQuestion];

  return (
    <div className="min-h-screen p-6 bg-[#fafaf5]">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl"></span>
              <h1 className="text-3xl font-bold text-[#72564c]">Trắc nghiệm tốc độ</h1>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <button onClick={onExit} className="text-[#72564c] hover:bg-[#f0e6e0] p-3 rounded-lg transition-all text-2xl">
              ✕
            </button>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <p className="text-[#8d6e63] text-sm mb-2 font-medium">Đây là từ tiếng gì?</p>
              <h2 className="text-4xl font-bold text-[#72564c] mb-2">{question.korean}</h2>
              <p className="text-[#8d6e63]">{question.english}</p>
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(option)}
                disabled={answered}
                className={`p-4 rounded-lg font-bold transition-all ${
                  answered && option === selectedAnswer
                    ? isCorrect
                      ? 'bg-green-100 text-green-700 border-2 border-green-500'
                      : 'bg-red-100 text-red-700 border-2 border-red-500'
                    : answered && option === question.vietnamese && !isCorrect
                    ? 'bg-green-100 text-green-700 border-2 border-green-500'
                    : 'bg-[#f0e6e0] text-[#72564c] hover:bg-[#e8dcd4] border-2 border-transparent active:scale-95'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {answered && (
            <div className={`p-4 rounded-lg text-center font-bold mb-6 ${
              isCorrect
                ? 'bg-green-100 text-green-700 border-2 border-green-500'
                : 'bg-red-100 text-red-700 border-2 border-red-500'
            }`}>
              {isCorrect ? '✓ Chính xác!' : '✗ Sai rồi!'}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-[#8d6e63] mb-1">🏆 Trophy</p>
              <p className="text-3xl font-bold text-[#72564c]">{score}<span className="text-base font-normal text-[#8d6e63]">/100</span></p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#8d6e63] mb-1">Tiến độ</p>
              <p className="text-3xl font-bold text-[#72564c]">{currentQuestion + 1}<span className="text-base font-normal text-[#8d6e63]">/{questions.length}</span></p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#8d6e63] mb-1">Thời gian</p>
              <p className={`text-3xl font-bold ${
                timeLeft <= 20 ? 'text-red-500' : timeLeft <= 45 ? 'text-orange-500' : 'text-[#72564c]'
              }`}>{timeLeft}s</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
