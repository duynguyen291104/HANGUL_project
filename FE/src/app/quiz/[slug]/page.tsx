'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AchievementToast, { AchievementNotification } from '@/components/AchievementToast';

interface Question {
  id: number;
  type: string;
  question: string;
  korean: string;
  english: string;
  romanization?: string;
  options: string[];
  correctAnswer: string;
  difficulty: string;
  level: string;
  explanation?: string;
  explanation_vi?: string;
}

interface QuizState {
  sessionId: number | null;
  questions: Question[];
  currentIndex: number;
  score: number;
  completed: boolean;
  loading: boolean;
  selectedAnswer: string | null;
  showResult: boolean;
  percentage: number | null;
  isPassed: boolean | null;
  unlockedMessage: string | null;
  correctAnswerText?: string;
  isAnswerCorrect?: boolean;
  answers: Array<{ questionId: number; isCorrect: boolean; selectedAnswer?: string }>;
}

// Fallback questions khi API fail
const FALLBACK_QUESTIONS: Question[] = [
  {
    id: 1,
    type: 'multiple-choice',
    question: 'How do you say "Hello" in Korean?',
    korean: '안녕하세요',
    english: 'Hello',
    options: ['안녕하세요', '감사합니다', '죄송합니다', '안녕'],
    correctAnswer: 'Hello',
    difficulty: 'Easy',
    level: 'Beginner',
    explanation: '안녕하세요 (annyeonghaseyo) is the formal greeting in Korean. It literally means "Please be well."',
    explanation_vi: '"안녕하세요" (annyeonghaseyo) là lời chào lịch sự trong tiếng Hàn. Nghĩa đen là "Xin vui lòng khỏe mạnh."',
  },
  {
    id: 2,
    type: 'multiple-choice',
    question: 'How do you say "Thank you" in Korean?',
    korean: '감사합니다',
    english: 'Thank you',
    options: ['안녕하세요', '감사합니다', '죄송합니다', '안녕'],
    correctAnswer: 'Thank you',
    difficulty: 'Easy',
    level: 'Beginner',
    explanation: '감사합니다 (gamsahamnida) is a formal way to say thank you. It shows respect and is appropriate in most situations.',
    explanation_vi: '"감사합니다" (gamsahamnida) là cách nói cảm ơn trang trọng. Nó biểu thị sự tôn trọng và thích hợp trong hầu hết các tình huống.',
  },
  {
    id: 3,
    type: 'multiple-choice',
    question: 'How do you say "Sorry" in Korean?',
    korean: '죄송합니다',
    english: 'Sorry',
    options: ['안녕하세요', '감사합니다', '죄송합니다', '안녕'],
    correctAnswer: 'Sorry',
    difficulty: 'Easy',
    level: 'Beginner',
    explanation: '죄송합니다 (joesonghamnida) is a formal apology. It\'s commonly used in formal settings or when apologizing sincerely.',
    explanation_vi: '"죄송합니다" (joesonghamnida) là lời xin lỗi trang trọng. Nó thường được sử dụng trong các tình huống chính thức hoặc khi xin lỗi chân thành.',
  },
  {
    id: 4,
    type: 'multiple-choice',
    question: 'How do you say "Yes" in Korean?',
    korean: '네',
    english: 'Yes',
    options: ['네', '아니요', '모르겠어요', '좋아요'],
    correctAnswer: 'Yes',
    difficulty: 'Easy',
    level: 'Beginner',
    explanation: '네 (ne) is the basic affirmative response in Korean. It is polite and appropriate in most situations.',
    explanation_vi: '"네" (ne) là câu trả lời khẳng định cơ bản trong tiếng Hàn. Nó lịch sự và thích hợp trong hầu hết các tình huống.',
  },
  {
    id: 5,
    type: 'multiple-choice',
    question: 'How do you say "No" in Korean?',
    korean: '아니요',
    english: 'No',
    options: ['네', '아니요', '모르겠어요', '좋아요'],
    correctAnswer: 'No',
    difficulty: 'Easy',
    level: 'Beginner',
    explanation: '아니요 (aniyo) is the polite way to say no in Korean. It\'s used when you want to politely decline something.',
    explanation_vi: '"아니요" (aniyo) là cách lịch sự để nói không trong tiếng Hàn. Nó được sử dụng khi bạn muốn từ chối điều gì đó một cách lịch sự.',
  },
  {
    id: 6,
    type: 'multiple-choice',
    question: 'How do you say "I do not know" in Korean?',
    korean: '모르겠어요',
    english: 'I do not know',
    options: ['네', '아니요', '모르겠어요', '좋아요'],
    correctAnswer: 'I do not know',
    difficulty: 'Easy',
    level: 'Beginner',
    explanation: '모르겠어요 (moreugesseoyo) literally means "I don\'t understand/know." It\'s a polite way to express uncertainty.',
    explanation_vi: '"모르겠어요" (moreugesseoyo) có nghĩa đen là "Tôi không hiểu/biết." Nó là cách lịch sự để bày tỏ sự không chắc chắn.',
  },
  {
    id: 7,
    type: 'multiple-choice',
    question: 'How do you say "Good" in Korean?',
    korean: '좋아요',
    english: 'Good',
    options: ['나빠요', '좋아요', '최고예요', '괜찮아요'],
    correctAnswer: 'Good',
    difficulty: 'Easy',
    level: 'Beginner',
    explanation: '좋아요 (johayo) means "good," "I like it," or "It\'s nice." It\'s one of the most commonly used positive expressions in Korean.',
    explanation_vi: '"좋아요" (johayo) có nghĩa là "tốt", "Tôi thích nó" hoặc "Nó đẹp lắm." Đó là một trong những biểu thức tích cực được sử dụng phổ biến nhất trong tiếng Hàn.',
  },
  {
    id: 8,
    type: 'multiple-choice',
    question: 'How do you say "Bad" in Korean?',
    korean: '나빠요',
    english: 'Bad',
    options: ['나빠요', '좋아요', '최고예요', '괜찮아요'],
    correctAnswer: 'Bad',
    difficulty: 'Easy',
    level: 'Beginner',
    explanation: '나빠요 (nappayo) means "bad" or "it\'s not good." It\'s the opposite of 좋아요 and is used to express disapproval.',
    explanation_vi: '"나빠요" (nappayo) có nghĩa là "xấu" hoặc "không tốt". Nó là đối lập của 좋아요 và được sử dụng để bày tỏ sự không tán thành.',
  },
  {
    id: 9,
    type: 'multiple-choice',
    question: 'How do you say "The best" in Korean?',
    korean: '최고예요',
    english: 'The best',
    options: ['나빠요', '좋아요', '최고예요', '괜찮아요'],
    correctAnswer: 'The best',
    difficulty: 'Easy',
    level: 'Beginner',
    explanation: '최고예요 (choegoyeyo) means "the best" or "it\'s the best." It\'s used to express high satisfaction or praise.',
    explanation_vi: '"최고예요" (choegoyeyo) có nghĩa là "tốt nhất" hoặc "đó là tốt nhất." Nó được sử dụng để bày tỏ sự hài lòng cao hoặc lời khen ngợi.',
  },
  {
    id: 10,
    type: 'multiple-choice',
    question: 'How do you say "It is okay/fine" in Korean?',
    korean: '괜찮아요',
    english: 'It is okay/fine',
    options: ['나빠요', '좋아요', '최고예요', '괜찮아요'],
    correctAnswer: 'It is okay/fine',
    difficulty: 'Easy',
    level: 'Beginner',
    explanation: '괜찮아요 (gwaenchanhayo) means "it\'s okay," "it\'s fine," or "it\'s alright." Use it to reassure someone or indicate acceptance.',
    explanation_vi: '"괜찮아요" (gwaenchanhayo) có nghĩa là "không sao", "tốt thôi" hoặc "tất cả được rồi". Sử dụng nó để yên tâm cho ai đó hoặc chỉ sự chấp nhận.',
  },
];

export default function QuizDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuthStore();
  const slug = params.slug as string;

  const [quiz, setQuiz] = useState<QuizState>({
    sessionId: null,
    questions: [],
    currentIndex: 0,
    score: 0,
    completed: false,
    loading: true,
    selectedAnswer: null,
    showResult: false,
    percentage: null,
    isPassed: null,
    unlockedMessage: null,
    correctAnswerText: undefined,
    isAnswerCorrect: undefined,
    answers: [],
  });

  const [topicName, setTopicName] = useState<string>('');
  const [startTime, setStartTime] = useState<number>(0);
  const [completionStats, setCompletionStats] = useState({
    xp: 25,
    correctCount: 0,
    totalCount: 0,
    time: '00:00',
  });
  const [newAchievements, setNewAchievements] = useState<AchievementNotification[]>([]);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  // Completion screen — granular per-element animation states
  const [anim, setAnim] = useState({
    backBtn: false,
    title: false,
    subtitle: false,
    xpCard: false,
    correctCard: false,
    timeCard: false,
    result: false,
    questionsRevealed: 0,
    btnContinue: false,
    btnHistory: false,
  });
  const [xpAnimated, setXpAnimated] = useState(0);
  const [correctAnimated, setCorrectAnimated] = useState(0);
  const [timeAnimated, setTimeAnimated] = useState('00:00');

  useEffect(() => {
    if (!quiz.completed) return;

    // Reset
    setAnim({ backBtn: false, title: false, subtitle: false, xpCard: false, correctCard: false, timeCard: false, result: false, questionsRevealed: 0, btnContinue: false, btnHistory: false });
    setXpAnimated(0);
    setCorrectAnimated(0);
    setTimeAnimated('00:00');

    const timers: ReturnType<typeof setTimeout>[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];
    const at = (ms: number, fn: () => void) => { const t = setTimeout(fn, ms); timers.push(t); };

    // Step 1 — back button (80ms)
    at(80, () => setAnim(p => ({ ...p, backBtn: true })));

    // Step 2 — main title (200ms)
    at(200, () => setAnim(p => ({ ...p, title: true })));

    // Step 3 — subtitle (600ms)
    at(600, () => setAnim(p => ({ ...p, subtitle: true })));

    // Step 4 — XP card + counter (1000ms)
    at(1000, () => {
      setAnim(p => ({ ...p, xpCard: true }));
      const xpTarget = completionStats.xp;
      let xp = 0;
      const xpStep = Math.max(1, Math.ceil(xpTarget / 28));
      const iv = setInterval(() => {
        xp = Math.min(xp + xpStep, xpTarget);
        setXpAnimated(xp);
        if (xp >= xpTarget) clearInterval(iv);
      }, 18);
      intervals.push(iv);
    });

    // Step 5 — correct count card + counter (1600ms)
    at(1600, () => {
      setAnim(p => ({ ...p, correctCard: true }));
      const target = completionStats.correctCount;
      let val = 0;
      if (target === 0) return;
      const iv = setInterval(() => {
        val = Math.min(val + 1, target);
        setCorrectAnimated(val);
        if (val >= target) clearInterval(iv);
      }, 80);
      intervals.push(iv);
    });

    // Step 6 — time card + counting from 00:00 → actual time (2250ms)
    at(2250, () => {
      setAnim(p => ({ ...p, timeCard: true }));
      const parts = completionStats.time.split(':').map(Number);
      const totalSec = (parts[0] || 0) * 60 + (parts[1] || 0);
      if (totalSec === 0) { setTimeAnimated('00:00'); return; }
      const steps = Math.min(totalSec, 60);
      const ivMs = Math.max(12, Math.floor(1200 / steps));
      let step = 0;
      const iv = setInterval(() => {
        step++;
        const cur = Math.min(Math.round((step / steps) * totalSec), totalSec);
        const m = Math.floor(cur / 60);
        const s = cur % 60;
        setTimeAnimated(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        if (step >= steps) clearInterval(iv);
      }, ivMs);
      intervals.push(iv);
    });

    // Step 7 — result message (after time finishes ~2250 + 1400 = 3650ms)
    at(3650, () => setAnim(p => ({ ...p, result: true })));

    // Step 7b — reveal questions one by one (only the 2 initially visible)
    const visibleCount = Math.min(2, quiz.questions.length);
    for (let i = 0; i < visibleCount; i++) {
      at(3950 + i * 350, () => setAnim(p => ({ ...p, questionsRevealed: i + 1 })));
    }
    const buttonsStart = 3950 + visibleCount * 350 + 200;

    // Step 8 — continue button
    at(buttonsStart, () => setAnim(p => ({ ...p, btnContinue: true })));

    // Step 9 — history button
    at(buttonsStart + 450, () => setAnim(p => ({ ...p, btnHistory: true })));

    return () => {
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, [quiz.completed]);

  useEffect(() => {
    if (!slug) {
      return;
    }

    const loadQuiz = async () => {
      try {
        setQuiz((prev) => ({ ...prev, loading: true }));
        console.log('🎬 Fetching quiz for slug:', slug);

        // Add authorization header with token
        const headers: any = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Fetch 10 random questions from topic by slug
        try {
          const randomQuestionsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/quiz/random-questions/${slug}`
          );
          if (randomQuestionsResponse.ok) {
            const randomData = await randomQuestionsResponse.json();
            const name = randomData.topicName || 'Quiz';
            setTopicName(name);
            console.log(`📌 Random 10 questions fetched from "${slug}":`, randomData.count);
            
            // Transform 10 random vocabulary into quiz questions
            if (randomData.vocabulary && Array.isArray(randomData.vocabulary)) {
              const questions = randomData.vocabulary.map((vocab: any, vocabIndex: number) => {
                const correctAnswer = vocab.vietnamese;
                
                // Get wrong answers from OTHER vocabulary items IN SAME 10-ITEM SET
                const wrongAnswers = randomData.vocabulary
                  .filter((_: any, idx: number) => idx !== vocabIndex)
                  .map((v: any) => v.vietnamese);
                
                // Shuffle and take 3 wrong answers
                const selectedWrongAnswers = wrongAnswers
                  .sort(() => Math.random() - 0.5)
                  .slice(0, Math.min(3, wrongAnswers.length));
                
                // If not enough wrong answers, repeat some
                while (selectedWrongAnswers.length < 3) {
                  const randomPick = wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)];
                  if (!selectedWrongAnswers.includes(randomPick)) {
                    selectedWrongAnswers.push(randomPick);
                  } else if (selectedWrongAnswers.length < 3) {
                    selectedWrongAnswers.push(randomPick);
                  }
                }
                
                // Combine all options and shuffle
                const options = [correctAnswer, ...selectedWrongAnswers]
                  .sort(() => Math.random() - 0.5);
                
                return {
                  id: vocab.id,
                  type: 'multiple-choice',
                  question: `"${vocab.korean}" có nghĩa là gì trong tiếng Việt?`,
                  korean: vocab.korean,
                  romanization: vocab.romanization || '',
                  english: vocab.english,
                  vietnamese: vocab.vietnamese,
                  options: options,
                  correctAnswer: correctAnswer,
                  difficulty: 'Medium',
                  level: randomData.topicLevel,
                  explanation: `${vocab.korean} (${vocab.romanization}) có nghĩa là "${vocab.vietnamese}"`,
                  explanation_vi: `${vocab.korean} (${vocab.romanization}) tiếng Anh là "${vocab.english}"`,
                };
              });
              
              console.log(`✅ Converted ${questions.length} vocabulary items into quiz questions`);
              
              setQuiz((prev) => ({
                ...prev,
                questions,
                loading: false,
              }));
              setStartTime(Date.now());
              return;
            }
          } else {
            console.warn('⚠️ Random questions fetch failed:', randomQuestionsResponse.status);
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch random questions:', err);
        }

        // Fallback: try old topic endpoint (for backward compatibility)
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/topic/slug/${slug}`,
          {
            headers,
          }
        );

        if (response.ok) {
          const topicData = await response.json();
          const name = topicData.name || 'Quiz';
          setTopicName(name);
          
          // Fallback: Transform all vocabulary into questions, but limit to 10 (random)
          if (topicData.vocabulary && Array.isArray(topicData.vocabulary)) {
            // Shuffle and take 10
            const randomVocab = topicData.vocabulary
              .sort(() => Math.random() - 0.5)
              .slice(0, 10);
            
            const questions = randomVocab.map((vocab: any, vocabIndex: number) => {
              const correctAnswer = vocab.vietnamese;
              
              const wrongAnswers = randomVocab
                .filter((_: any, idx: number) => idx !== vocabIndex)
                .map((v: any) => v.vietnamese);
              
              const selectedWrongAnswers = wrongAnswers
                .sort(() => Math.random() - 0.5)
                .slice(0, Math.min(3, wrongAnswers.length));
              
              while (selectedWrongAnswers.length < 3) {
                const randomPick = wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)];
                if (!selectedWrongAnswers.includes(randomPick)) {
                  selectedWrongAnswers.push(randomPick);
                } else if (selectedWrongAnswers.length < 3) {
                  selectedWrongAnswers.push(randomPick);
                }
              }
              
              const options = [correctAnswer, ...selectedWrongAnswers]
                .sort(() => Math.random() - 0.5);
              
              return {
                id: vocab.id,
                type: 'multiple-choice',
                question: `"${vocab.korean}" có nghĩa là gì trong tiếng Việt?`,
                korean: vocab.korean,
                romanization: vocab.romanization || '',
                english: vocab.english,
                vietnamese: vocab.vietnamese,
                options: options,
                correctAnswer: correctAnswer,
                difficulty: 'Medium',
                level: topicData.level,
                explanation: `${vocab.korean} (${vocab.romanization}) có nghĩa là "${vocab.vietnamese}"`,
                explanation_vi: `${vocab.korean} (${vocab.romanization}) tiếng Anh là "${vocab.english}"`,
              };
            });
            
            console.log('✅ Quiz loaded from fallback endpoint (topic/slug):', questions.length);

            setQuiz((prev) => ({
              ...prev,
              questions,
              loading: false,
            }));
            
            setStartTime(Date.now());
            return;
          }
        }
        
        console.warn('⚠️ Using hardcoded fallback questions...');
        const questions = FALLBACK_QUESTIONS;

        setQuiz((prev) => ({
          ...prev,
          questions,
          loading: false,
        }));

        setStartTime(Date.now());
      } catch (error) {
        console.error('❌ Quiz load error:', error);
        console.warn('⚠️ Using fallback questions instead of redirecting...');
        
        // Use fallback instead of redirecting
        setQuiz((prev) => ({
          ...prev,
          questions: FALLBACK_QUESTIONS,
          loading: false,
        }));
        
        setStartTime(Date.now());
      }
    };

    loadQuiz();
  }, [slug, token]);

  const handleAnswerSelect = (answer: string) => {
    if (quiz.showResult) return;
    setQuiz((prev) => ({ ...prev, selectedAnswer: answer }));
  };

  const handleCheckAnswer = async (answer: string) => {
    if (quiz.showResult || !quiz.selectedAnswer) return;

    const currentQuestion = quiz.questions[quiz.currentIndex];
    
    // Check answer client-side using correctAnswer field
    const isCorrect = answer === currentQuestion.correctAnswer;

    // Update UI immediately
    setQuiz((prev) => ({
      ...prev,
      showResult: true,
      correctAnswerText: currentQuestion.correctAnswer,
      isAnswerCorrect: isCorrect,
    }));

    // If correct, increment score
    if (isCorrect) {
      setQuiz((prev) => ({ ...prev, score: prev.score + 1 }));
    }

    // Track answer (including the user's selected answer text)
    setQuiz((prev) => {
      const newAnswers = [...prev.answers];
      const existingIndex = newAnswers.findIndex(a => a.questionId === currentQuestion.id);
      if (existingIndex >= 0) {
        newAnswers[existingIndex] = { questionId: currentQuestion.id, isCorrect: isCorrect, selectedAnswer: answer };
      } else {
        newAnswers.push({ questionId: currentQuestion.id, isCorrect: isCorrect, selectedAnswer: answer });
      }
      return { ...prev, answers: newAnswers };
    });

    // Send to API for logging/analytics (non-blocking)
    try {
      await fetch(`http://localhost:5000/api/quiz/submit-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          userAnswer: answer,
        }),
      });
    } catch (error) {
      console.warn('⚠️ Could not log answer to server:', error);
    }
  };

  const handleNextQuestion = () => {
    if (quiz.currentIndex < quiz.questions.length - 1) {
      setQuiz((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        selectedAnswer: null,
        showResult: false,
        correctAnswerText: undefined,
        isAnswerCorrect: undefined,
      }));
    } else {
      endQuiz();
    }
  };

  const endQuiz = async () => {
    try {
      console.log('🏁 Ending quiz...');

      // Use tracked answers from the quiz state
      const percentage = Math.round((quiz.score / quiz.questions.length) * 100);
      const isPassed = percentage >= 70;

      // Submit quiz results to backend using tracked answers
      const response = await fetch(`http://localhost:5000/api/quiz/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers: quiz.answers,  // Use tracked answers
          slug: slug,  // Use slug instead of topicId
          score: quiz.score,
        }),
      });

      const submitData = await response.json();
      console.log('📊 Quiz submitted:', submitData);

      // Collect newly unlocked achievements from quiz submit
      if (submitData.newAchievements?.length) {
        setNewAchievements(prev => [...prev, ...submitData.newAchievements]);
      }

      // Save learning history (all 10 questions + correct answers + user's selected answers)
      try {
        console.log('💾 Saving learning history...');
        
        // Merge user's answers with questions data
        const questionsWithAnswers = quiz.questions.map((q) => {
          const userAnswer = quiz.answers.find((a) => a.questionId === q.id);
          return {
            ...q,
            selectedAnswer: userAnswer?.selectedAnswer || null, // User's actual selected answer
            isCorrect: userAnswer?.isCorrect || false,
          };
        });

        console.log('📋 Questions with answers to save:', questionsWithAnswers);
        
        // 🔥 DEBUG: Log each answer detail
        questionsWithAnswers.forEach((q, idx) => {
          console.log(`📌 Q${idx + 1}: ${q.korean} → selected: ${q.selectedAnswer}, correct: ${q.correctAnswer}, isCorrect: ${q.isCorrect}`);
        });
        
        const correctCount = questionsWithAnswers.filter((q) => q.isCorrect).length;
        console.log(`🎯 DEBUG: ${correctCount}/${questionsWithAnswers.length} đúng`);

        const historyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/quiz/save-learning-history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            questions: questionsWithAnswers, // Save all questions with user's answers
            slug: slug,
            skillType: 'QUIZ',
          }),
        });

        console.log('📊 History response status:', historyResponse.status);
        
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          console.log('✅ Learning history saved:', historyData);
        } else {
          const errorText = await historyResponse.text();
          console.warn('⚠️ Failed to save learning history:', historyResponse.status, errorText);
        }
      } catch (err) {
        console.warn('⚠️ Error saving learning history:', err);
        // Don't fail the quiz submission if history save fails
      }

      // Calculate completion stats
      const elapsedTime = startTime ? Date.now() - startTime : 0;
      const minutes = Math.floor(elapsedTime / 60000);
      const seconds = Math.floor((elapsedTime % 60000) / 1000);
      const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      setCompletionStats({
        xp: submitData.xpGained || 25,
        correctCount: quiz.score,
        totalCount: quiz.questions.length,
        time: timeStr,
      });

      console.log('✅ Quiz ended:', { percentage, isPassed });

      setQuiz((prev) => ({
        ...prev,
        completed: true,
        percentage,
        isPassed,
      }));

      // Log activity time + update streak
      try {
        const elapsedSeconds = Math.max(1, Math.round((startTime ? Date.now() - startTime : 0) / 1000));
        const actRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/activity/log-time`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ totalSeconds: elapsedSeconds, skillType: 'quiz', sessionCount: 1 }),
        });
        if (actRes.ok) {
          const actData = await actRes.json();
          if (actData.newAchievements?.length) {
            setNewAchievements(prev => [...prev, ...actData.newAchievements]);
          }
        }
      } catch (_) { /* non-blocking */ }

      if (isPassed) {
        try {
          console.log('🔓 Unlocking next topic...');

          const completeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/progress/complete-topic`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ slug: slug }),
          });

          const completeData = await completeResponse.json();
          console.log('✅ Topic marked complete:', completeData);

          if (completeData.nextTopicUnlocked) {
            setQuiz((prev) => ({
              ...prev,
              unlockedMessage: `Chủ đề tiếp theo "${completeData.nextTopicName}" đã được mở khóa!`,
            }));
          }
        } catch (error) {
          console.error('⚠️ Error completing topic:', error);
        }
      }
    } catch (error) {
      console.error('❌ Quiz end error:', error);
    }
  };

  if (quiz.loading) {
    return (
      <div className="min-h-screen bg-[#fafaf5] font-['Be_Vietnam_Pro']">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#72564c] mx-auto mb-4"></div>
            <p className="text-[#504441]">Đang tải bài kiểm tra...</p>
          </div>
        </div>
      </div>
    );
  }

  if (quiz.completed) {
    const percentage = quiz.percentage || 0;
    const passed = quiz.isPassed || false;

    const fi = (visible: boolean) => ({
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1) translateY(0px)' : 'scale(0.9) translateY(20px)',
      transition: 'opacity 0.55s cubic-bezier(0.22,1,0.36,1), transform 0.55s cubic-bezier(0.22,1,0.36,1)',
    });

    return (
      <div className="min-h-screen bg-[#fafaf5] font-['Be_Vietnam_Pro'] overflow-x-hidden">
        <Header />

        {/* Back Button */}
        <div className="fixed left-[20px] top-[95px] z-20" style={fi(anim.backBtn)}>
          <button
            onClick={() => router.push('/quiz')}
            className="flex items-center gap-2 px-4 py-2 text-[#72564c] hover:text-[#504441] font-semibold transition-all hover:scale-105 active:scale-95"
            style={{ fontSize: '20px' }}
          >
            <span>←</span>
            <span>Quay lại</span>
          </button>
        </div>

        <main className="w-full max-w-5xl mx-auto px-4 py-10 pt-16 flex flex-col items-center gap-6">
          <div className="w-full flex flex-col items-center gap-6">

            {/* Step 1 — Title */}
            <div style={fi(anim.title)}>
              <h1 className="font-extrabold text-4xl md:text-5xl text-[#72564c] tracking-tight text-center">
                Bài học hoàn tất!
              </h1>
            </div>

            {/* Step 2 — Subtitle */}
            <div style={{ ...fi(anim.subtitle), marginTop: '0px' }}>
              <p className="text-[#504441] font-medium text-center" style={{ fontSize: '20px' }}>
                Chủ đề: {topicName || 'Quiz'} - Bài tập: Trắc nghiệm
              </p>
            </div>

            {/* Steps 3–5 — Stats */}
            <div className="flex items-stretch w-full max-w-2xl">
              <div
                className="flex-1 p-4 flex flex-col items-center justify-center"
                style={fi(anim.xpCard)}
              >
                <span className="font-bold text-[#815300] font-['Cormorant_Garamond']" style={{ fontSize: '20px' }}>
                  +{xpAnimated} XP
                </span>
                <span className="font-['Cormorant_Garamond'] uppercase tracking-widest text-[#504441] mt-1 text-center" style={{ fontSize: '20px' }}>
                  Điểm KN
                </span>
              </div>

              <div className="w-px bg-black self-stretch" />

              <div
                className="flex-1 p-4 flex flex-col items-center justify-center"
                style={fi(anim.correctCard)}
              >
                <span className="font-bold text-[#72564c] font-['Cormorant_Garamond']" style={{ fontSize: '20px' }}>
                  {correctAnimated}/{completionStats.totalCount}
                </span>
                <span className="font-['Cormorant_Garamond'] uppercase tracking-widest text-[#504441] mt-1 text-center" style={{ fontSize: '20px' }}>
                  Câu đúng
                </span>
              </div>

              <div className="w-px bg-black self-stretch" />

              <div
                className="flex-1 p-4 flex flex-col items-center justify-center"
                style={fi(anim.timeCard)}
              >
                <span className="font-bold text-[#5b4137] font-['Cormorant_Garamond'] tabular-nums" style={{ fontSize: '20px' }}>
                  {timeAnimated}
                </span>
                <span className="font-['Cormorant_Garamond'] uppercase tracking-widest text-[#504441] mt-1 text-center" style={{ fontSize: '20px' }}>
                  Thời gian
                </span>
              </div>
            </div>

            {/* Step 6 — Result message */}
            <div className="w-full max-w-2xl" style={fi(anim.result)}>
              {quiz.unlockedMessage && (
                <div className="mt-4 p-4 bg-[#ffdbce] text-[#2b160f] rounded-lg animate-pulse font-semibold text-center">
                  {quiz.unlockedMessage}
                </div>
              )}
            </div>

            {/* Chi tiết bài */}
            <div className="w-full max-w-2xl" style={{ ...fi(anim.result), marginTop: '-19px' }}>
              <div className="bg-[#fafaf5] rounded-xl border border-black p-5" style={{ paddingBottom: '12px' }}>
                <p className="font-bold text-[#72564c] mb-4" style={{ fontSize: '20px' }}>Chi tiết bài</p>
                <div className="flex flex-col gap-3">
                  {(detailsExpanded ? quiz.questions : quiz.questions.slice(0, 2)).map((q, idx) => {
                    const userAns = quiz.answers.find(a => a.questionId === q.id);
                    const isCorrect = userAns?.isCorrect ?? false;
                    const cardVisible = detailsExpanded || idx < anim.questionsRevealed;
                    return (
                      <div
                        key={q.id}
                        className={`relative p-4 border-[2px] ${
                          isCorrect
                            ? 'bg-[#e8f5e9] border-[#4caf50]'
                            : 'bg-[#ffdad6] border-[#ba1a1a]'
                        }`}
                        style={{ borderRadius: '15px', ...fi(cardVisible) }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[#504441] mb-1" style={{ fontSize: '20px' }}>
                              {idx + 1}. {q.korean}
                              {q.romanization && (
                                <span className="font-normal text-[#72564c]/70 ml-2" style={{ fontSize: '20px' }}>
                                  - phiên âm: {q.romanization}
                                </span>
                              )}
                            </p>
                            {!isCorrect && (
                              <p className="text-[#504441]" style={{ fontSize: '20px' }}>
                                Đáp án đúng: <b className="text-[#72564c]">{q.correctAnswer}</b>
                              </p>
                            )}
                            {userAns?.selectedAnswer && (
                              <p className="text-[#504441] mt-1" style={{ fontSize: '20px' }}>
                                Bạn chọn: <b className={isCorrect ? 'text-[#2e7d32]' : 'text-[#ba1a1a]'}>{userAns.selectedAnswer}</b>
                              </p>
                            )}
                          </div>
                          <span className={`shrink-0 font-bold ${isCorrect ? 'text-[#2e7d32]' : 'text-[#ba1a1a]'}`} style={{ fontSize: '20px' }}>
                            {isCorrect ? '+10XP' : '0XP'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {quiz.questions.length > 2 && (
                  <button
                    onClick={() => setDetailsExpanded(v => !v)}
                    className="w-full text-center text-[#72564c] hover:text-[#504441] font-bold transition"
                    style={{ fontSize: '20px', marginTop: '12px' }}
                  >
                    {detailsExpanded ? 'Thu gọn ▲' : `Xem thêm ${quiz.questions.length - 2} mục ▼`}
                  </button>
                )}
              </div>
            </div>

            {/* Step 7+8 — Action Buttons (each fades in separately) */}
            <div className="flex flex-col w-full max-w-sm gap-3 pb-8">
              {/* Step 7 — Tiếp tục */}
              <div style={fi(anim.btnContinue)}>
                <button
                  onClick={() => router.push('/quiz?refresh=true')}
                  className="w-full bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white font-bold py-3.5 rounded-xl shadow-lg hover:from-[#8d6e63] hover:to-[#a0806e] active:scale-95 transition-all flex items-center justify-center gap-2"
                  style={{ fontSize: '20px' }}
                >
                  Tiếp tục
                  <span>&rarr;</span>
                </button>
              </div>
              {/* Step 8 — Xem lịch sử tiến độ */}
              <div style={fi(anim.btnHistory)}>
                <button
                  onClick={() => router.push('/learning-map')}
                  className="w-full bg-[#ffdbce] text-[#2b160f] font-bold py-3.5 rounded-xl hover:bg-[#e4beb2] active:scale-95 transition-all"
                  style={{ fontSize: '20px' }}
                >
                  Xem lịch sử tiến độ
                </button>
              </div>
            </div>
          </div>
        </main>
        <AchievementToast
          achievements={newAchievements}
          onDismiss={(id) => setNewAchievements(prev => prev.filter(a => a.id !== id))}
        />
        <Footer />
      </div>
    );
  }

  const currentQuestion = quiz.questions[quiz.currentIndex];
  const answerLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="w-full bg-[#fafaf5] font-['Be_Vietnam_Pro']">
      {/* Quiz area: luôn full 100vh */}
      <div className="h-screen flex flex-col overflow-hidden">
        <Header />

        {/* Back Button — cách lề trái 25px, cách header 20px */}
        <div className="shrink-0 w-full" style={{ paddingTop: '20px', paddingLeft: '25px' }}>
          <button
            onClick={() => router.push('/quiz')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[#72564c] hover:text-[#504441] font-semibold transition-all hover:scale-105 active:scale-95"
            style={{ fontSize: '20px' }}
          >
            <span>←</span>
            <span>Quay lại</span>
          </button>
        </div>

        <main className="flex-1 flex flex-col min-h-0 max-w-4xl mx-auto w-full px-6 pb-4" style={{ paddingTop: '20px' }}>
          {/* Progress Section */}
          <section className="shrink-0 w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[#72564c] tracking-tight" style={{ fontSize: '20px' }}>
                Chủ đề bài học: {topicName || 'Quiz'}
              </span>
              <span className="font-bold text-[#72564c]/60" style={{ fontSize: '20px' }}>
                {quiz.currentIndex + 1} / {quiz.questions.length}
              </span>
            </div>
            <div className="w-full h-2 bg-[#eeeee9] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#72564c] to-[#8d6e63] rounded-full transition-all duration-500"
                style={{ width: `${((quiz.currentIndex + 1) / quiz.questions.length) * 100}%` }}
              />
            </div>
          </section>

          {/* Question Section — cách progress 20px */}
          <section className="shrink-0 w-full text-center" style={{ marginTop: '20px' }}>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#504441] tracking-tight">
              {currentQuestion.question}
            </h1>
            {/* Phiên âm — cách đề bài 20px */}
            <p className="text-[#504441]/70" style={{ marginTop: '20px', fontSize: '20px' }}>
              Phiên âm: <span className="font-bold text-[#72564c]">{currentQuestion.romanization || currentQuestion.korean}</span>
            </p>
          </section>

          {/* Options Grid — cố định height, cách phiên âm 20px */}
          <div
            className="grid grid-cols-2 shrink-0"
            style={{
              marginTop: '20px',
              gap: '20px',
              gridTemplateRows: 'minmax(100px, 120px) minmax(100px, 120px)',
            }}
          >
            {currentQuestion.options.map((option, idx) => {
              const isSelected = quiz.selectedAnswer === option;
              const isCorrectOption = option === quiz.correctAnswerText;
              let buttonClass =
                'w-full h-full flex items-center justify-between px-6 py-3 bg-[#f4f4ef] hover:bg-white border-2 border-transparent hover:border-[#8d6e63]/30 rounded-2xl transition-all duration-300 active:scale-[0.98]';

              if (quiz.showResult) {
                if (isCorrectOption) {
                  buttonClass = 'w-full h-full flex items-center justify-between px-6 py-3 bg-[#e8f5e9] border-2 border-[#4caf50] rounded-2xl transition-all duration-300';
                } else if (isSelected && !quiz.isAnswerCorrect) {
                  buttonClass = 'w-full h-full flex items-center justify-between px-6 py-3 bg-[#ffebee] border-2 border-[#f44336] rounded-2xl transition-all duration-300';
                } else {
                  buttonClass = 'w-full h-full flex items-center justify-between px-6 py-3 bg-[#f4f4ef] border-2 border-transparent rounded-2xl transition-all duration-300';
                }
              } else if (isSelected) {
                buttonClass = 'w-full h-full flex items-center justify-between px-6 py-3 bg-white border-2 border-[#72564c] rounded-2xl transition-all duration-300';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={quiz.showResult}
                  className={`${buttonClass} ${quiz.showResult ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className="text-xl font-bold text-[#72564c] text-left">{option}</span>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    quiz.showResult && isCorrectOption ? 'bg-[#4caf50]'
                    : quiz.showResult && isSelected && !quiz.isAnswerCorrect ? 'bg-[#f44336]'
                    : isSelected ? 'bg-[#72564c]'
                    : 'bg-[#eeeee9]'
                  }`}>
                    <span className={`font-black text-sm ${
                      (quiz.showResult && isCorrectOption) || (quiz.showResult && isSelected && !quiz.isAnswerCorrect) || isSelected
                        ? 'text-white' : 'text-[#72564c]/40'
                    }`}>
                      {quiz.showResult && isCorrectOption ? '✓' : quiz.showResult && isSelected && !quiz.isAnswerCorrect ? '✗' : answerLabels[idx]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation Section — cách options đúng 30px, min 120px max 150px */}
          {quiz.showResult && (
            <div className="shrink-0" style={{ marginTop: '30px', minHeight: '120px', maxHeight: '150px' }}>
              <div className={`h-full border-2 rounded-2xl px-6 py-5 flex items-center gap-6 ${
                quiz.isAnswerCorrect
                  ? 'bg-[#e8f5e9] border-[#4caf50]'
                  : 'bg-[#ffebee] border-[#f44336]'
              }`}>
                <div className="shrink-0">
                  <p className={`font-bold tracking-widest ${quiz.isAnswerCorrect ? 'text-[#2e7d32]' : 'text-[#c62828]'}`} style={{ fontSize: '20px' }}>
                    {quiz.isAnswerCorrect ? 'ĐÚNG' : 'SAI'}
                  </p>
                  {!quiz.isAnswerCorrect && (
                    <p className="text-[#c62828] font-semibold mt-1" style={{ fontSize: '20px' }}>Đáp án đúng:</p>
                  )}
                  <p className={`font-bold mt-1 ${quiz.isAnswerCorrect ? 'text-[#2e7d32]' : 'text-[#d32f2f]'}`} style={{ fontSize: '20px' }}>
                    {quiz.correctAnswerText}
                  </p>
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-2 gap-4">
                  {currentQuestion.explanation && (
                    <div>
                      <p className="text-[#504441]/70 font-bold tracking-widest mb-1" style={{ fontSize: '20px' }}>GIẢI THÍCH</p>
                      <p className="text-[#504441] leading-relaxed" style={{ fontSize: '20px' }}>{currentQuestion.explanation}</p>
                    </div>
                  )}
                  {currentQuestion.explanation_vi && (
                    <div className="bg-white/50 rounded-xl p-3">
                      <p className="text-[#504441]/70 font-bold tracking-widest mb-1" style={{ fontSize: '20px' }}>THÊM</p>
                      <p className="text-[#504441] leading-relaxed" style={{ fontSize: '20px' }}>{currentQuestion.explanation_vi}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* Action Button — cách options hoặc ô thông báo 30px */}
          <div className="shrink-0 w-full flex justify-end" style={{ marginTop: '30px', paddingBottom: '8px' }}>
            <button
              onClick={() => {
                if (quiz.showResult) {
                  handleNextQuestion();
                } else if (quiz.selectedAnswer) {
                  handleCheckAnswer(quiz.selectedAnswer);
                }
              }}
              disabled={!quiz.showResult && !quiz.selectedAnswer}
              className={`px-10 py-3 rounded-full font-bold shadow-lg transition-all active:scale-95 font-['Cormorant_Garamond'] text-lg ${
                !quiz.showResult && !quiz.selectedAnswer
                  ? 'bg-[#d4c3be] text-[#72564c]/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white hover:scale-105'
              }`}
            >
              {quiz.showResult ? 'Tiếp tục' : 'Kiểm tra đáp án'}
            </button>
          </div>
        </main>
      </div>

      {/* Footer nằm dưới vùng 100vh — scroll xuống để thấy */}
      <Footer />

      <AchievementToast
        achievements={newAchievements}
        onDismiss={(id) => setNewAchievements(prev => prev.filter(a => a.id !== id))}
      />
    </div>
  );
}
