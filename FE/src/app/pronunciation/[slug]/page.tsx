'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useAuthStore } from '@/store/authStore';
import { Volume2, Mic } from 'lucide-react';
import ResultSummary, { type ResultItem } from '@/components/ResultSummary';
import Footer from '@/components/Footer';

interface Vocabulary {
  id: number;
  korean: string;
  english: string;
  vietnamese: string;
  romanization: string;
}

interface SoundWavePoint {
  x: number;
  y: number;
}

export default function PronunciationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuthStore();
  const slug = params.slug as string;

  const [topicId, setTopicId] = useState<number | null>(null);
  const [topicName, setTopicName] = useState('');
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [totalScores, setTotalScores] = useState<number[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [soundWave, setSoundWave] = useState<SoundWavePoint[]>([]);
  const [speed, setSpeed] = useState(0.5);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [_transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [_scoringMethod, setScoringMethod] = useState('');
  const [isScoring, setIsScoring] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const highlightIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const browserTranscriptRef = useRef<string>('');
  const speechRecognitionRef = useRef<any>(null);

  /** Levenshtein similarity 0-100 (browser fallback) */
  const levenshteinSimilarity = (a: string, b: string): number => {
    const m = a.length, n = b.length;
    if (!m && !n) return 100;
    if (!m || !n) return 0;
    const dp: number[][] = Array.from({ length: n + 1 }, (_, i) => [i]);
    dp[0] = Array.from({ length: m + 1 }, (_, j) => j);
    for (let i = 1; i <= n; i++)
      for (let j = 1; j <= m; j++)
        dp[i][j] = b[i - 1] === a[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]);
    return Math.max(0, Math.round((1 - dp[n][m] / Math.max(m, n)) * 100));
  };

  useEffect(() => {
    const fetchTopic = async () => {
      if (!slug) return;
      
      try {
        // Step 1: Fetch topic info to get topicId and name
        const topicResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/topic/slug/${slug}`
        );
        
        if (topicResponse.ok) {
          const topicData = await topicResponse.json();
          setTopicId(topicData.id); // NEW: Store topicId for scoring
          setTopicName(topicData.name);
          
          // Step 2: Fetch random vocabulary from this topic
          if (topicData.id) {
            const vocabResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/public-vocab/random-by-topic/${topicData.id}?limit=10`
            );
            
            if (vocabResponse.ok) {
              const vocabData = await vocabResponse.json();
              if (vocabData.data && Array.isArray(vocabData.data)) {
                setVocabulary(vocabData.data);
              }
            }
          }
          setQuestionStartTime(Date.now()); // Set initial question start time
        }
      } catch (error) {
        console.error('Error fetching topic:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopic();
  }, [slug]);

  // Initialize voices
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const synth = window.speechSynthesis;
      if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = () => {
          synth.getVoices();
        };
      }
    }
  }, []);

  const handlePlayAudio = async () => {
    const currentWord = vocabulary[currentIndex];
    if (!currentWord) return;

    try {
      // Clear previous highlight interval
      if (highlightIntervalRef.current) {
        clearInterval(highlightIntervalRef.current);
      }

      const synth = window.speechSynthesis;
      
      // Ensure voices are loaded
      let voices = synth.getVoices();
      if (voices.length === 0) {
        await new Promise(resolve => {
          synth.onvoiceschanged = () => {
            resolve(null);
          };
        });
        voices = synth.getVoices();
      }

      // Phát với tốc độ hiện tại
      const speech = new SpeechSynthesisUtterance(currentWord.korean);
      speech.rate = speed;
      speech.lang = 'ko-KR';
      speech.volume = 1;
      speech.pitch = 1;

      // Find Korean voice or use default
      const koreanVoice = voices.find((v) => v.lang.includes('ko'));
      if (koreanVoice) {
        speech.voice = koreanVoice;
      }

      // Cancel any ongoing speech
      synth.cancel();
      
      // Log for debugging
      console.log(`🔊 Playing: "${currentWord.korean}" at ${speed}x speed`);
      
      // Speak
      synth.speak(speech);
      
      // Highlight characters in romanization
      const romanizationLength = currentWord.romanization ? currentWord.romanization.length : 0;
      if (romanizationLength > 0) {
        let charIndex = 0;
        const highlightDuration = 150; // adjust timing based on speed
        
        highlightIntervalRef.current = setInterval(() => {
          setActiveIndex(charIndex);
          charIndex++;
          
          if (charIndex >= romanizationLength) {
            clearInterval(highlightIntervalRef.current!);
            highlightIntervalRef.current = null;
            
            // Reset to gray after speaking
            setTimeout(() => setActiveIndex(-1), 300);
          }
        }, highlightDuration);
      }
      
      // Sau đó chuyển sang tốc độ tiếp theo: 0.5x → 1.5x → 0.5x
      const speeds = [0.5, 1.5];
      const currentSpeedIndex = speeds.indexOf(speed);
      const nextSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
      const nextSpeed = speeds[nextSpeedIndex];
      setSpeed(nextSpeed);
    } catch (error) {
      console.error('❌ Error playing audio:', error);
    }
  };

  const handleMicClick = async () => {
    if (!isRecording && !hasRecorded) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        setIsRecording(true);
        setHasRecorded(true);
        setSoundWave([]);
        setTranscript('');
        setFeedback('');
        audioChunksRef.current = [];

        // Sound wave visualizer
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        const visualize = () => {
          animationFrameRef.current = requestAnimationFrame(visualize);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          const points: SoundWavePoint[] = [];
          for (let i = 0; i < dataArray.length; i++) {
            points.push({ x: (i / dataArray.length) * 100, y: (dataArray[i] / 255) * 100 });
          }
          setSoundWave(points);
        };
        visualize();

        // Web Speech API — browser-side Korean recognition (fallback when Whisper unavailable)
        browserTranscriptRef.current = '';
        const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
          const recognition = new SpeechRecognitionAPI();
          recognition.lang = 'ko-KR';
          recognition.interimResults = false;
          recognition.maxAlternatives = 1;
          recognition.onresult = (event: any) => {
            browserTranscriptRef.current = event.results[0]?.[0]?.transcript?.trim() || '';
          };
          recognition.onerror = () => { browserTranscriptRef.current = ''; };
          speechRecognitionRef.current = recognition;
          recognition.start();
        }

        // MediaRecorder — capture real audio for Whisper
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const currentWord = vocabulary[currentIndex];
          if (!currentWord) return;

          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const arrayBuffer = await audioBlob.arrayBuffer();
          const base64Audio = btoa(
            new Uint8Array(arrayBuffer).reduce((d, b) => d + String.fromCharCode(b), '')
          );

          setIsScoring(true);
          try {
            const scoreResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/pronunciation/score`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                  audioBase64: base64Audio,
                  correctAnswer: currentWord.korean,
                  romanization: currentWord.romanization,
                  korean: currentWord.korean,
                  topicId,
                  vocabId: currentWord.id,
                }),

              }
            );

            if (scoreResponse.ok) {
              const scoreData = await scoreResponse.json();
              console.log('📊 Whisper Score:', scoreData);

              // Fallback: Whisper unavailable → use Web Speech API transcript
              if (scoreData.method === 'unavailable' && browserTranscriptRef.current) {
                const browserText = browserTranscriptRef.current;
                // Convert Korean transcript to romanization for comparison if needed
                const accuracy = levenshteinSimilarity(
                    browserText.normalize('NFC').replace(/[^\uAC00-\uD7A3]/g, ''),
                    currentWord.korean.normalize('NFC').replace(/[^\uAC00-\uD7A3]/g, '')
                  );

                setScore(accuracy);
                setTranscript(browserText);
                setScoringMethod('browser');
                setFeedback(
                  accuracy >= 80
                    ? `Phát âm khá chuẩn! Bạn đọc: "${browserText}", phiên âm: "${currentWord.romanization}".`
                    : accuracy >= 50
                    ? `Gần đúng. Bạn đọc: "${browserText}", phiên âm đúng: "${currentWord.romanization}".`
                    : `Chưa đúng. Bạn đọc: "${browserText}", phiên âm cần đọc: "${currentWord.romanization}".`
                );
              } else {
                setScore(scoreData.accuracy);
                setFeedback(scoreData.feedback || '');
                setScoringMethod(scoreData.method || '');
                setTranscript(scoreData.transcript || '');
              }
            } else {
              const err = await scoreResponse.json().catch(() => ({}));
              setScore(0);
              setFeedback((err as any).error || 'Whisper server chưa chạy, hãy thử lại');
            }
          } catch {
            setScore(0);
            setFeedback('Không kết nối được Whisper server');
          } finally {
            setIsScoring(false);
          }
        };

        mediaRecorder.start();
      } catch (error) {
        console.error('Error accessing microphone:', error);
        setIsRecording(false);
        setHasRecorded(false);
      }
    } else if (isRecording) {
      setIsRecording(false);
      setSoundWave([]);

      if (speechRecognitionRef.current) { try { speechRecognitionRef.current.stop(); } catch {} }
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const handleRetry = () => {
    setScore(null);
    setHasRecorded(false);
    setSoundWave([]);
    setIsRecording(false);
    setTranscript('');
    setFeedback('');
    setScoringMethod('');
    audioChunksRef.current = [];
    setQuestionStartTime(Date.now());
  };

  const savePronunciationHistory = async (resultsToSave: ResultItem[]) => {
    try {
      console.log('💾 Saving pronunciation history...');
      console.log('📦 Data being sent:', {
        questionCount: resultsToSave.length,
        slug,
        skillType: 'PRONUNCIATION',
        questions: resultsToSave.map((r) => ({
          korean: r.question,
          accuracy: r.accuracy,
        })),
      });
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/quiz/save-learning-history`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            questions: resultsToSave.map((result) => ({
              korean: result.question,
              vietnamese: vocabulary.find(word => word.korean === result.question)?.vietnamese || '',
              accuracy: result.accuracy,
            })),
            slug: slug,
            skillType: 'PRONUNCIATION',
          }),
        }
      );

      console.log(`📡 Response status: ${response.status}`);
      
      const result = await response.json();
      if (response.ok) {
        console.log('✅ Pronunciation history saved:', result);
      } else {
        console.warn('⚠️ Failed to save history:', result.message, result);
      }
    } catch (error) {
      console.error('❌ Error saving pronunciation history:', error);
    }
  };

  const handleNext = async () => {
    const currentWord = vocabulary[currentIndex];
    const timeSpent = score !== null ? Math.round((Date.now() - questionStartTime) / 1000) : 0;
    const currentAccuracy = score || 0;
    const isCorrect = currentAccuracy >= 50;
    const xp = isCorrect ? 10 : 0;

    // Add to results
    const newResult: ResultItem = {
      question: currentWord.korean,
      correctAnswer: currentWord.romanization,
      accuracy: currentAccuracy,
      isCorrect,
      xp,
      timeSpent,
    };

    setResults([...results, newResult]);

    if (currentIndex < vocabulary.length - 1) {
      setTotalScores([...totalScores, score || 0]);
      setCurrentIndex(currentIndex + 1);
      setScore(null);
      setHasRecorded(false);
      setSoundWave([]);
      setIsRecording(false);
      setQuestionStartTime(Date.now());
    } else {
      console.log('🏁 All words completed! Saving history...');
      console.log('📊 Results to save:', [...results, newResult]);
      
      setTotalScores([...totalScores, score || 0]);
      
      // Calculate total time and log activity
      const updatedResults = [...results, newResult];
      const totalTimeSpent = updatedResults.reduce((sum, r) => sum + r.timeSpent, 0);
      console.log(`⏱️ Total time spent: ${totalTimeSpent}s`);
      console.log(`📤 About to save to backend...`);
      
      await savePronunciationHistory(updatedResults);
      await logLearningTime(totalTimeSpent, 'pronunciation');
      
      console.log('✅ All save operations completed, setting isCompleted = true');
      setIsCompleted(true);
    }
  };

  const logLearningTime = async (totalSeconds: number, skillType: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/activity/log-time`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            totalSeconds: Math.round(totalSeconds),
            skillType,
            sessionCount: 1,
          }),
        }
      );

      if (response.ok) {
        console.log(`✅ Logged ${Math.round(totalSeconds)}s of ${skillType} learning`);
      } else {
        console.warn('⚠️ Failed to log learning time');
      }
    } catch (error) {
      console.warn('⚠️ Error logging learning time:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface to-surface-container flex items-center justify-center">
        <Header />
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="text-on-surface-variant font-medium">Đang tải bài phát âm...</p>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <ResultSummary
        results={results}
        mode="pronunciation"
        topicName={topicName}
        backPath="/pronunciation"
        continueAction={() => router.push('/pronunciation?refresh=true')}
      />
    );
  }

  if (!vocabulary.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface to-surface-container flex items-center justify-center">
        <Header />
        <p className="text-on-surface-variant">Không có từ nào để phát âm</p>
      </div>
    );
  }

  const currentWord = vocabulary[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface to-surface-container">
      <Header />
      
      <div className="pt-[75px] flex flex-col items-center px-4 pb-8">
        <button
          onClick={() => router.push('/pronunciation')}
          className="fixed top-[95px] left-[20px] z-20 flex items-center gap-2 px-4 py-2 text-[#72564c] hover:text-[#504441] font-semibold transition-all hover:scale-105 active:scale-95"
        >
          <span className="text-xl">←</span>
          <span>Quay lại</span>
        </button>

        <p className="text-on-surface-variant mb-8">
          {currentIndex + 1} / {vocabulary.length}
        </p>

        <h1 className="text-4xl font-bold text-on-background mb-12">{topicName}</h1>

        <div className="bg-surface-container rounded-2xl p-12 text-center mb-12 max-w-md w-full">
          <p className="text-on-surface-variant text-2xl font-bold mb-4">Phát âm từ này</p>
          
          {/* Speaker + Speed + Korean in same row */}
          <div className="flex items-center gap-2 justify-center mb-8">
            <p className="text-8xl font-bold text-on-background">{currentWord.korean}</p>
          </div>

          {/* Sound Wave Animation */}
          <div className="mb-8 h-12 flex items-center justify-center">
            <svg width="100%" height="100%" viewBox="0 0 400 64" preserveAspectRatio="none">
              {soundWave.length > 0 ? (
                <polyline
                  points={soundWave
                    .map((point, i) => `${(i / soundWave.length) * 400},${32 - point.y / 2}`)
                    .join(' ')}
                  fill="none"
                  stroke="#72564c"
                  strokeWidth="2"
                />
              ) : (
                <line x1="0" y1="32" x2="400" y2="32" stroke="#d4c3be" strokeWidth="2" />
              )}
            </svg>
          </div>

          {/* Speaker + Speed + Romanization */}
          <div className="flex items-start gap-2 justify-center mb-8">
            <div className="flex flex-col items-center gap-0.5">
              <button
                onClick={handlePlayAudio}
                className="text-on-background hover:opacity-70 transition flex-shrink-0"
                title="Click to cycle speed: 0.5x → 1.5x"
              >
                <Volume2 size={28} />
              </button>
              <p className="text-2xl font-bold text-primary">
                {speed === 0.5 ? '0.5x' : '1.5x'}
              </p>
            </div>
            <p className="text-lg font-medium">
              {currentWord.romanization && currentWord.romanization.split('').map((char, index) => (
                <span
                  key={index}
                  className={`transition-all duration-100 ${
                    index <= activeIndex
                      ? 'text-black font-bold'
                      : 'text-gray-400 font-normal'
                  }`}
                >
                  {char}
                </span>
              ))}
            </p>
          </div>

          <button
            onClick={handleMicClick}
            className={`w-12 h-12 rounded-full mx-auto mb-8 flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-[#72564c] hover:bg-[#8d6e63]'
            }`}
            title={isRecording ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
          >
            <Mic size={24} className="text-white" />
          </button>

          {isScoring && (
            <div className="mt-8 p-4 bg-primary/10 rounded-lg text-center">
              <p className="text-on-surface-variant text-2xl animate-pulse">Đang phân tích</p>
            </div>
          )}

          {score !== null && !isScoring && (
            <div className="mt-8 p-6 bg-primary/10 rounded-2xl text-center">
              <p className="text-base font-semibold text-on-surface mb-1">{currentWord.english}</p>
              <p className="text-sm text-on-surface-variant mb-4">{currentWord.vietnamese}</p>
              <p className="text-base text-on-surface-variant mb-1">Độ chính xác</p>
              <p className="text-6xl font-black text-primary mb-3">{score}%</p>
              <p className="text-base font-medium text-on-surface-variant">
                {feedback ||
                  (score >= 80 ? 'Phát âm chuẩn.' :
                   score >= 60 ? `Gần đúng, cần hướng tới: "${currentWord.romanization}".` :
                   score >= 40 ? `Chưa đúng, phiên âm đúng là: "${currentWord.romanization}".` :
                                 `Sai phiên âm, cần đọc là: "${currentWord.romanization}"`)}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-4 max-w-md w-full">
          {(score !== null || isScoring) ? (
            <>
              <button
                onClick={handleRetry}
                disabled={isScoring}
                className="flex-1 px-6 py-3 bg-surface-container text-on-surface rounded-full font-bold hover:opacity-80 transition border border-outline-variant disabled:opacity-40"
              >
                Làm lại
              </button>
              <button
                onClick={handleNext}
                disabled={isScoring || score === null}
                className="flex-1 px-6 py-3 bg-primary text-on-primary rounded-full font-bold hover:opacity-90 transition disabled:opacity-40"
              >
                {currentIndex === vocabulary.length - 1 ? 'Hoàn tát' : 'Tiếp tục'}
              </button>
            </>
          ) : null}
        </div>
      </div>
      <Footer />
    </div>
  );
}
