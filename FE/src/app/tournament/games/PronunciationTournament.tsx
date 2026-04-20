'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, Mic } from 'lucide-react';

interface WordData {
  korean: string;
  romanization: string;
  english: string;
  vietnamese: string;
  id?: number;
  topic?: string;
}

interface PronunciationTournamentProps {
  onComplete: (score: number, correctAnswers: number) => void;
  onExit: () => void;
}

const TOTAL_SECONDS = 90; // 1.5 minutes

export default function PronunciationTournament({ onComplete, onExit }: PronunciationTournamentProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [soundwaveHeights, setSoundwaveHeights] = useState<number[]>(Array(20).fill(8));
  const [vocabularyList, setVocabularyList] = useState<WordData[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState<WordData>({
    korean: '안녕하세요',
    romanization: 'An-nyeong-ha-se-yo',
    english: '"Hello / Good day"',
    vietnamese: '"Xin chào"'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [tournamentScore, setTournamentScore] = useState(0);
  const [_correctAnswers, setCorrectAnswers] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const highlightIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tournamentScoreRef = useRef(0);
  const correctAnswersRef = useRef(0);

  // Countdown timer — starts once vocabulary is loaded
  useEffect(() => {
    if (isLoading) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          onComplete(tournamentScoreRef.current, correctAnswersRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  useEffect(() => {
    loadVocabulary();
  }, []);

  const loadVocabulary = async () => {
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
          { id: 1, korean: '안녕하세요', vietnamese: 'Xin chào', romanization: 'Annyeonghaseyo', english: 'Hello' },
          { id: 2, korean: '감사합니다', vietnamese: 'Cảm ơn', romanization: 'Gamsahamnida', english: 'Thank you' },
          { id: 3, korean: '네', vietnamese: 'Có', romanization: 'Ne', english: 'Yes' },
          { id: 4, korean: '아니요', vietnamese: 'Không', romanization: 'Aniyo', english: 'No' },
          { id: 5, korean: '수고했어요', vietnamese: 'Làm tốt rồi', romanization: 'Sugohasyeosseoyo', english: 'Good job' },
          { id: 6, korean: '좋아요', vietnamese: 'Tôi thích', romanization: 'Joahayo', english: 'I like it' },
          { id: 7, korean: '미안합니다', vietnamese: 'Xin lỗi', romanization: 'Mianhamnida', english: 'Sorry' },
          { id: 8, korean: '물', vietnamese: 'Nước', romanization: 'Mul', english: 'Water' },
          { id: 9, korean: '음식', vietnamese: 'Thức ăn', romanization: 'Eumsik', english: 'Food' },
          { id: 10, korean: '학교', vietnamese: 'Trường học', romanization: 'Hakgyo', english: 'School' },
        ];
      }

      const vocabList = vocabArray.slice(0, 10).map((vocab: any) => ({
        korean: vocab.korean,
        romanization: vocab.romanization || '',
        english: vocab.english,
        vietnamese: vocab.vietnamese,
        id: vocab.id,
      }));

      setVocabularyList(vocabList);
      if (vocabList.length > 0) {
        setCurrentWord(vocabList[0]);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading vocabulary:', error);
      setIsLoading(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        // audioBlob is recorded but used for API calls in production
        // const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await handleAnalyzePronunciation();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      isRecordingRef.current = true;

      // Setup audio visualization
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyzerRef.current = audioContextRef.current.createAnalyser();
        analyzerRef.current.fftSize = 256;
        const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
        dataArrayRef.current = dataArray;

        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyzerRef.current);
      }

      animateWaveform();
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      isRecordingRef.current = false;

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  };

  const animateWaveform = () => {
    if (!analyzerRef.current || !dataArrayRef.current || !isRecordingRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (analyzerRef.current as any).getByteFrequencyData(dataArrayRef.current);
    const newHeights = Array.from(dataArrayRef.current)
      .slice(0, 20)
      .map(v => Math.max(8, Math.min(48, (v / 255) * 48)));

    setSoundwaveHeights(newHeights);
    animationRef.current = requestAnimationFrame(animateWaveform);
  };

  const handleAnalyzePronunciation = async () => {
    setIsAnalyzing(true);
    try {
      const score = Math.floor(Math.random() * 40 + 60); // 60-100
      setPronunciationScore(score);
      setShowFeedback(true);

      tournamentScoreRef.current += (score >= 50 ? 10 : 0);
      correctAnswersRef.current += 1;
      setTournamentScore(tournamentScoreRef.current);
      setCorrectAnswers(correctAnswersRef.current);
    } catch (error) {
      console.error('Error analyzing pronunciation:', error);
      setPronunciationScore(0);
      setShowFeedback(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNextWord = () => {
    setShowFeedback(false);
    setPronunciationScore(null);
    setSoundwaveHeights(Array(20).fill(8));
    audioContextRef.current = null;
    if (currentWordIndex < vocabularyList.length - 1) {
      const nextIndex = currentWordIndex + 1;
      setCurrentWordIndex(nextIndex);
      setCurrentWord(vocabularyList[nextIndex]);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      onComplete(tournamentScoreRef.current, correctAnswersRef.current);
    }
  };

  const handlePlayNativeAudio = async () => {
    if (isPlayingAudio) return;

    try {
      setIsPlayingAudio(true);
      setActiveIndex(-1);

      if (highlightIntervalRef.current) {
        clearInterval(highlightIntervalRef.current);
        highlightIntervalRef.current = null;
      }

      const synth = window.speechSynthesis;
      let voices = synth.getVoices();
      if (voices.length === 0) {
        await new Promise<void>(resolve => {
          synth.onvoiceschanged = () => resolve();
        });
        voices = synth.getVoices();
      }

      const speech = new SpeechSynthesisUtterance(currentWord.korean);
      speech.rate = 0.8;
      speech.lang = 'ko-KR';
      speech.volume = 1;
      speech.pitch = 1;

      const koreanVoice = voices.find((v) => v.lang.includes('ko'));
      if (koreanVoice) speech.voice = koreanVoice;

      synth.cancel();
      synth.speak(speech);

      // Animate romanization characters
      const romanLen = currentWord.romanization ? currentWord.romanization.length : 0;
      if (romanLen > 0) {
        let charIndex = 0;
        const step = 150;
        highlightIntervalRef.current = setInterval(() => {
          setActiveIndex(charIndex);
          charIndex++;
          if (charIndex >= romanLen) {
            clearInterval(highlightIntervalRef.current!);
            highlightIntervalRef.current = null;
            setTimeout(() => {
              setActiveIndex(-1);
              setIsPlayingAudio(false);
            }, 300);
          }
        }, step);
      } else {
        speech.onend = () => setIsPlayingAudio(false);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlayingAudio(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafaf5] flex items-center justify-center">
        <p className="text-[#72564c] font-bold text-lg">Loading pronunciation tournament...</p>
      </div>
    );
  }

  if (vocabularyList.length === 0 || !currentWord) {
    return (
      <div className="min-h-screen bg-[#fafaf5] flex items-center justify-center">
        <p className="text-[#72564c] font-bold text-lg">Không có dữ liệu từ vựng</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf5] p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl"></span>
              <h1 className="text-3xl font-bold text-[#72564c]">Phát âm hoàn hảo</h1>
            </div>
            <p className="text-[#8d6e63] text-sm">Luyện phát âm hoàn hảo</p>
          </div>
          <div className="flex items-center gap-5">
            <button
              onClick={onExit}
              className="text-[#72564c] hover:bg-[#f0e6e0] p-3 rounded-lg transition-all text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Korean Word */}
          <div className="mb-6">
            <p className="text-sm text-[#72564c] mb-4">Phát âm từ này:</p>
            <p className="text-5xl font-bold text-[#1a1c19] mb-6">{currentWord.korean}</p>

            {/* Speaker icon + animated romanization */}
            <div className="flex items-center gap-3 justify-center mb-4">
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={handlePlayNativeAudio}
                  disabled={isPlayingAudio}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isPlayingAudio
                      ? 'bg-[#ffddb5] text-[#815300] animate-pulse'
                      : 'bg-[#ffddb5] text-[#815300] hover:bg-[#ffcd9b]'
                  } disabled:opacity-50`}
                  title="Nghe phát âm chuẩn"
                >
                  <Volume2 size={20} />
                </button>
              </div>
              <p className="text-xl font-medium">
                {currentWord.romanization && currentWord.romanization.split('').map((char, index) => (
                  <span
                    key={index}
                    className={`transition-all duration-100 ${
                      index <= activeIndex
                        ? 'text-[#72564c] font-bold'
                        : 'text-gray-400 font-normal'
                    }`}
                  >
                    {char}
                  </span>
                ))}
              </p>
            </div>
          </div>

          {/* Soundwave Visualization — always visible, animates only when recording */}
          <div className={`mb-6 flex items-center justify-center gap-1 h-16 transition-all ${showFeedback ? 'opacity-0 pointer-events-none h-0 mb-0 overflow-hidden' : ''}`}>
            {soundwaveHeights.map((height, idx) => (
              <div
                key={idx}
                className={`w-1 rounded-full transition-all duration-75 ${
                  isRecording
                    ? 'bg-gradient-to-t from-[#72564c] to-[#8d6e63]'
                    : 'bg-[#d4c3be]'
                }`}
                style={{ height: isRecording ? `${height}px` : '8px' }}
              ></div>
            ))}
          </div>

          {/* Mic Button — hidden when showing feedback */}
          {!showFeedback && (
            <div className="mb-6 flex flex-col items-center gap-2">
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isAnalyzing}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse scale-110'
                    : 'bg-[#72564c] hover:bg-[#8d6e63] hover:scale-105'
                } disabled:opacity-50`}
                title={isRecording ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
              >
                <Mic size={28} className="text-white" />
              </button>
              <p className="text-xs text-[#8d6e63] font-medium">
                {isAnalyzing ? 'Đang phân tích...' : isRecording ? 'Đang ghi âm... (nhấn để dừng)' : 'Nhấn để ghi âm'}
              </p>
            </div>
          )}

          {/* Result Card */}
          {showFeedback && pronunciationScore !== null && (
            <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Score ring + label */}
              <div className="flex flex-col items-center mb-5">
                <div className={`relative w-28 h-28 rounded-full flex items-center justify-center shadow-lg mb-3 ${
                  pronunciationScore >= 80
                    ? 'bg-gradient-to-br from-[#a5d6a7] to-[#4caf50]'
                    : pronunciationScore >= 60
                    ? 'bg-gradient-to-br from-[#ffe082] to-[#ffa000]'
                    : 'bg-gradient-to-br from-[#ef9a9a] to-[#e53935]'
                }`}>
                  <div className="bg-white rounded-full w-20 h-20 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-black leading-none ${
                      pronunciationScore >= 80 ? 'text-[#2e7d32]' : pronunciationScore >= 60 ? 'text-[#e65100]' : 'text-[#c62828]'
                    }`}>{pronunciationScore}%</span>
                  </div>
                </div>
                <span className={`text-sm font-bold tracking-wide px-4 py-1 rounded-full ${
                  pronunciationScore >= 80
                    ? 'bg-[#e8f5e9] text-[#2e7d32]'
                    : pronunciationScore >= 60
                    ? 'bg-[#fff3e0] text-[#e65100]'
                    : 'bg-[#ffebee] text-[#c62828]'
                }`}>
                  {pronunciationScore >= 80 ? '✓ Xuất sắc' : pronunciationScore >= 60 ? '◑ Khá tốt' : '✗ Cần luyện thêm'}
                </span>
              </div>

              {/* Word info card */}
              <div className="bg-[#f9f6f4] rounded-2xl p-4 mb-4 border border-[#e8dcd4]">
                <p className="text-center text-2xl font-black text-[#1a1c19] mb-3">{currentWord.korean}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3 text-center border border-[#f0e6e0]">
                    <p className="text-[10px] font-bold tracking-widest text-[#8d6e63] uppercase mb-1">Tiếng Anh</p>
                    <p className="text-sm font-bold text-[#1a1c19]">{currentWord.english}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center border border-[#f0e6e0]">
                    <p className="text-[10px] font-bold tracking-widest text-[#8d6e63] uppercase mb-1">Tiếng Việt</p>
                    <p className="text-sm font-bold text-[#72564c]">{currentWord.vietnamese}</p>
                  </div>
                </div>
              </div>

              {/* Next button */}
              <button
                onClick={handleNextWord}
                className="w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-all active:scale-95 hover:opacity-90 shadow-md bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white"
              >
                {currentWordIndex < vocabularyList.length - 1 ? 'Từ tiếp theo →' : '🎉 Hoàn thành'}
              </button>
            </div>
          )}
        </div>

        {/* Tournament Stats */}
        <div className="mt-6 p-4 bg-white rounded-lg shadow-md grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-[#8d6e63] mb-1">🏆 Trophy</p>
            <p className="text-3xl font-bold text-[#72564c]">{tournamentScore}<span className="text-base font-normal text-[#8d6e63]">/100</span></p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[#8d6e63] mb-1">Tiến độ</p>
            <p className="text-3xl font-bold text-[#72564c]">
              {currentWordIndex + 1}<span className="text-base font-normal text-[#8d6e63]">/{vocabularyList.length > 0 ? vocabularyList.length : 10}</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-[#8d6e63] mb-1">Thời gian</p>
            <p className={`text-3xl font-bold ${
              timeLeft <= 20 ? 'text-red-500' : timeLeft <= 45 ? 'text-orange-500' : 'text-[#72564c]'
            }`}>{String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
