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
    accuracy: 0,
    time: '00:00',
  });
  const [newAchievements, setNewAchievements] = useState<AchievementNotification[]>([]);

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
                const correctAnswer = vocab.english;
                
                // Get wrong answers from OTHER vocabulary items IN SAME 10-ITEM SET
                const wrongAnswers = randomData.vocabulary
                  .filter((_: any, idx: number) => idx !== vocabIndex)
                  .map((v: any) => v.english);
                
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
                  question: `"${vocab.korean}" có nghĩa là gì trong tiếng Anh?`,
                  korean: vocab.korean,
                  english: vocab.english,
                  vietnamese: vocab.vietnamese,
                  options: options,
                  correctAnswer: correctAnswer,
                  difficulty: 'Medium',
                  level: randomData.topicLevel,
                  explanation: `${vocab.korean} (${vocab.romanization}) có nghĩa là "${vocab.english}"`,
                  explanation_vi: `${vocab.korean} (${vocab.romanization}) tiếng Việt là "${vocab.vietnamese}"`,
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
              const correctAnswer = vocab.english;
              
              const wrongAnswers = randomVocab
                .filter((_: any, idx: number) => idx !== vocabIndex)
                .map((v: any) => v.english);
              
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
                question: `"${vocab.korean}" có nghĩa là gì trong tiếng Anh?`,
                korean: vocab.korean,
                english: vocab.english,
                vietnamese: vocab.vietnamese,
                options: options,
                correctAnswer: correctAnswer,
                difficulty: 'Medium',
                level: topicData.level,
                explanation: `${vocab.korean} (${vocab.romanization}) có nghĩa là "${vocab.english}"`,
                explanation_vi: `${vocab.korean} (${vocab.romanization}) tiếng Việt là "${vocab.vietnamese}"`,
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
        accuracy: submitData.percentage || percentage,
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
              unlockedMessage: `🎉 Chủ đề tiếp theo "${completeData.nextTopicName}" đã được mở khóa!`,
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

    return (
      <div className="min-h-screen bg-[#fafaf5] font-['Be_Vietnam_Pro']">
        <Header />

        {/* Back Button */}
        <div className="fixed left-[20px] top-[95px] z-20">
          <button
            onClick={() => router.push('/quiz')}
            className="flex items-center gap-2 px-4 py-2 text-[#72564c] hover:text-[#504441] font-semibold transition-all hover:scale-105 active:scale-95"
          >
            <span className="text-xl">←</span>
            <span>Quay lại</span>
          </button>
        </div>

        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 flex flex-col items-center justify-center min-h-[80vh]">
          {/* Hero Section */}
          <div className="relative w-full flex flex-col items-center gap-12">
            <div className="text-center">
              <h1 className="font-extrabold text-5xl md:text-6xl text-[#72564c] tracking-tight">
                Bài học hoàn tất!
              </h1>
              <p className="text-[#504441] font-medium mt-4 text-xl">
                Hana rất tự hào về nỗ lực của bạn!
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
              {/* XP Card */}
              <div className="bg-[#f4f4ef] rounded-lg p-6 flex flex-col items-center justify-center hover:bg-[#eeeee9] transition-colors">
                <div className="w-12 h-12 rounded-full bg-[#ffdbce] flex items-center justify-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#815300" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <span className="font-bold text-2xl text-[#815300]">
                  +{completionStats.xp} XP
                </span>
                <span className="font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-widest text-[#504441] mt-2">
                  Điểm kinh nghiệm
                </span>
              </div>

              {/* Accuracy Card */}
              <div className="bg-[#f4f4ef] rounded-lg p-6 flex flex-col items-center justify-center hover:bg-[#eeeee9] transition-colors">
                <div className="w-12 h-12 rounded-full bg-[#c2ebe5] flex items-center justify-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2e7b72" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="4" />
                    <line x1="12" y1="2" x2="12" y2="4" />
                    <line x1="12" y1="20" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="4" y2="12" />
                    <line x1="20" y1="12" x2="22" y2="12" />
                  </svg>
                </div>
                <span className="font-bold text-2xl text-[#72564c]">
                  {completionStats.accuracy}%
                </span>
                <span className="font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-widest text-[#504441] mt-2">
                  Độ chính xác
                </span>
              </div>

              {/* Time Card */}
              <div className="bg-[#f4f4ef] rounded-lg p-6 flex flex-col items-center justify-center hover:bg-[#eeeee9] transition-colors">
                <div className="w-12 h-12 rounded-full bg-[#ffdbce] flex items-center justify-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#815300" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <span className="font-bold text-2xl text-[#5b4137]">
                  {completionStats.time}
                </span>
                <span className="font-['Plus_Jakarta_Sans'] text-xs uppercase tracking-widest text-[#504441] mt-2">
                  Thời gian học
                </span>
              </div>
            </div>

            {/* Result Message */}
            <div className="w-full max-w-2xl">
              <div className={`p-6 rounded-lg text-center font-bold text-lg ${
                passed 
                  ? 'bg-[#ffdbce] text-[#2b160f]' 
                  : 'bg-[#ffdad6] text-[#ba1a1a]'
              }`}>
                {passed 
                  ? `Bạn vượt qua với ${percentage}% - Bạn đã đạt mục tiêu 70%` 
                  : `Bạn đạt ${percentage}% - Cần thêm ${70 - percentage}% để đạt mục tiêu`
                }
              </div>
              {quiz.unlockedMessage && (
                <div className="mt-4 p-4 bg-[#ffdbce] text-[#2b160f] rounded-lg animate-pulse font-semibold text-center">
                  {quiz.unlockedMessage}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col w-full max-w-sm gap-4">
              <button
                onClick={() => router.push('/quiz?refresh=true')}
                className="bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:from-[#8d6e63] hover:to-[#a0806e] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Tiếp tục
                <span>&rarr;</span>
              </button>
              <button
                onClick={() => router.push('/learning-map?refresh=true')}
                className="bg-[#ffdbce] text-[#2b160f] font-bold text-lg py-4 rounded-xl hover:bg-[#e4beb2] active:scale-95 transition-all"
              >
                Bài tiếp theo
              </button>
            </div>
          </div>
        </main>
        <AchievementToast
          achievements={newAchievements}
          onDismiss={(id) => setNewAchievements(prev => prev.filter(a => a.id !== id))}
        />
      </div>
    );
  }

  const currentQuestion = quiz.questions[quiz.currentIndex];
  const answerLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="min-h-screen bg-[#fafaf5]">
      <Header />

      {/* Back Button */}
      <div className="fixed left-[20px] top-[95px] z-20">
        <button
          onClick={() => router.push('/quiz')}
          className="flex items-center gap-2 px-4 py-2 text-[#72564c] hover:text-[#504441] font-semibold transition-all hover:scale-105 active:scale-95"
        >
          <span className="text-xl">←</span>
          <span>Quay lại</span>
        </button>
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 flex flex-col items-center">
        {/* Progress Section */}
        <section className="w-full mb-16">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-[#72564c] tracking-tight">
              {topicName || 'Quiz'}
            </span>
            <span className="font-bold text-[#72564c]/60">
              {quiz.currentIndex + 1} / {quiz.questions.length}
            </span>
          </div>
          <div className="w-full h-4 bg-[#eeeee9] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#72564c] to-[#8d6e63] rounded-full transition-all"
              style={{ width: `${((quiz.currentIndex + 1) / quiz.questions.length) * 100}%` }}
            />
          </div>
        </section>

        {/* Question Section */}
        <section className="w-full text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#504441] tracking-tight mb-4">
            {currentQuestion.question}
          </h1>
          <p className="text-[#504441]/70 text-lg">
            Tiếng Hàn: <span className="font-bold text-[#72564c]">{currentQuestion.korean}</span>
          </p>
        </section>

        {/* Options Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = quiz.selectedAnswer === option;
            const isCorrectOption = option === quiz.correctAnswerText; // Compare with correct answer from API
            let buttonClass =
              'group relative flex items-center justify-between p-8 bg-[#f4f4ef] hover:bg-white border-2 border-transparent hover:border-[#8d6e63]/30 rounded-xl transition-all duration-300 active:scale-[0.98]';

            if (quiz.showResult) {
              if (isCorrectOption) {
                // Green for correct answer
                buttonClass =
                  'group relative flex items-center justify-between p-8 bg-[#e8f5e9] border-2 border-[#4caf50] rounded-xl transition-all duration-300 active:scale-[0.98]';
              } else if (isSelected && !quiz.isAnswerCorrect) {
                // Red for wrong answer selected
                buttonClass =
                  'group relative flex items-center justify-between p-8 bg-[#ffebee] border-2 border-[#f44336] rounded-xl transition-all duration-300 active:scale-[0.98]';
              }
            } else if (isSelected) {
              buttonClass =
                'group relative flex items-center justify-between p-8 bg-white border-2 border-[#72564c] rounded-xl transition-all duration-300 active:scale-[0.98]';
            }

            return (
              <button
                key={idx}
                onClick={() => handleAnswerSelect(option)}
                disabled={quiz.showResult}
                className={`${buttonClass} ${quiz.showResult ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="flex flex-col items-start">
                  <span className="text-3xl font-bold text-[#72564c] mb-1">
                    {option}
                  </span>
                  <span className="text-[#504441]/60 font-medium italic">
                    {idx === 0 && 'Lựa chọn A'}
                    {idx === 1 && 'Lựa chọn B'}
                    {idx === 2 && 'Lựa chọn C'}
                    {idx === 3 && 'Lựa chọn D'}
                  </span>
                </div>
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    quiz.showResult && isCorrectOption
                      ? 'bg-[#4caf50]'
                      : quiz.showResult && isSelected && !quiz.isAnswerCorrect
                      ? 'bg-[#f44336]'
                      : isSelected
                      ? 'bg-[#72564c]'
                      : 'bg-[#eeeee9]'
                  }`}
                >
                  <span
                    className={`font-black text-lg ${
                      quiz.showResult && isCorrectOption
                        ? 'text-white'
                        : quiz.showResult && isSelected && !quiz.isAnswerCorrect
                        ? 'text-white'
                        : isSelected
                        ? 'text-white'
                        : 'text-[#72564c]/40'
                    }`}
                  >
                    {quiz.showResult && isCorrectOption ? '✓' : quiz.showResult && isSelected && !quiz.isAnswerCorrect ? '✗' : answerLabels[idx]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation Section */}
        {quiz.showResult && (
          <section className="w-full mb-12 mt-8 max-w-3xl">
            <div className={`border-2 rounded-xl p-8 ${
              quiz.isAnswerCorrect
                ? 'bg-gradient-to-br from-[#e8f5e9] to-[#c8e6c9] border-[#4caf50]'
                : 'bg-gradient-to-br from-[#ffebee] to-[#ffcdd2] border-[#f44336]'
            }`}>
              {/* Result Status */}
              <div className="mb-8">
                <p className={`text-lg font-bold tracking-widest mb-2 ${quiz.isAnswerCorrect ? 'text-[#2e7d32]' : 'text-[#c62828]'}`}>
                  {quiz.isAnswerCorrect ? '✓ ĐÚN G' : '✗ SAI'}
                </p>                {!quiz.isAnswerCorrect && (
                  <p className={`text-sm font-bold mb-2 text-[#c62828]`}>
                    👇 Đáp án đúng:
                  </p>
                )}                <p className={`text-3xl font-bold ${quiz.isAnswerCorrect ? 'text-[#2e7d32]' : 'text-[#d32f2f]'}`}>
                  {quiz.correctAnswerText}
                </p>
              </div>

              {/* Two Column Layout for Explanations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* English Explanation */}
                {currentQuestion.explanation && (
                  <div className="flex flex-col">
                    <p className="text-[#504441]/70 text-sm font-bold tracking-widest mb-3">
                      📖 GIẢI THÍCH
                    </p>
                    <p className="text-[#504441] text-base leading-relaxed font-medium">
                      {currentQuestion.explanation}
                    </p>
                  </div>
                )}

                {/* Vietnamese Translation */}
                {currentQuestion.explanation_vi && (
                  <div className="flex flex-col bg-white/50 rounded-lg p-4">
                    <p className="text-[#504441]/70 text-sm font-bold tracking-widest mb-3">
                      🇻🇳 DỊCH TIẾNG VIỆT
                    </p>
                    <p className="text-[#504441] text-base leading-relaxed font-medium">
                      {currentQuestion.explanation_vi}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Bottom Section with Buttons */}
        <section className="w-full flex items-end justify-end gap-8">
          {/* Action Button */}
          <button
            onClick={() => {
              if (quiz.showResult) {
                handleNextQuestion();
              } else if (quiz.selectedAnswer) {
                handleCheckAnswer(quiz.selectedAnswer);
              }
            }}
            disabled={!quiz.showResult && !quiz.selectedAnswer}
            className={`px-12 py-4 rounded-full font-bold font-['Plus_Jakarta_Sans'] shadow-lg transition-all active:scale-95 ${
              !quiz.showResult && !quiz.selectedAnswer
                ? 'bg-[#d4c3be] text-[#72564c]/50 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white shadow-[#72564c]/20 hover:scale-105'
            }`}
          >
            {quiz.showResult ? 'Tiếp tục' : 'Kiểm tra đáp án'}
          </button>
        </section>
      </main>
      <Footer />
      <AchievementToast
        achievements={newAchievements}
        onDismiss={(id) => setNewAchievements(prev => prev.filter(a => a.id !== id))}
      />
    </div>
  );
}
