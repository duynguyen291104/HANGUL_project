'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import { Check } from 'lucide-react';
import LevelSkipModal from '@/components/LevelSkipModal';
import LevelTestModal from '@/components/LevelTestModal';
import type { Level } from '@/components/LevelSkipModal';
import Footer from '@/components/Footer';

const LEVEL_LABELS: Record<string, string> = {
  NEWBIE:       'NEWBIE',
  BEGINNER:     'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  UPPER:        'UPPER',
  ADVANCED:     'ADVANCED',
};

const DESCRIPTION_VI: Record<string, string> = {
  'Architecture': 'Kiến trúc',
  'Art history': 'Lịch sử nghệ thuật',
  'Art': 'Nghệ thuật',
  'Astronomy': 'Thiên văn học',
  'Basic adjectives': 'Tính từ cơ bản',
  'Basic colors': 'Màu sắc cơ bản',
  'Basic greetings and polite phrases': 'Chào hỏi và lịch sự cơ bản',
  'Basic verbs': 'Động từ cơ bản',
  'Body parts': 'Bộ phận cơ thể',
  'Business and commerce': 'Kinh doanh và thương mại',
  'Career and employment': 'Nghề nghiệp và việc làm',
  'Classical music': 'Nhạc cổ điển',
  'Clothing items': 'Trang phục',
  'Common animals': 'Động vật phổ biến',
  'Common professions': 'Nghề nghiệp phổ biến',
  'Communication': 'Giao tiếp',
  'Comparative religion': 'Tôn giáo so sánh',
  'Cooking': 'Nấu ăn',
  'Days of the week': 'Các ngày trong tuần',
  'Directions': 'Phương hướng',
  'Economics': 'Kinh tế học',
  'Education and learning': 'Giáo dục và học tập',
  'Emotions and feelings': 'Cảm xúc',
  'Entertainment': 'Giải trí',
  'Environment and ecology': 'Môi trường và sinh thái',
  'Family members': 'Thành viên gia đình',
  'Food and drinks': 'Đồ ăn và thức uống',
  'Food culture': 'Văn hóa ẩm thực',
  'Furniture': 'Đồ nội thất',
  'Geography': 'Địa lý',
  'Health and medicine': 'Sức khỏe và y học',
  'History': 'Lịch sử',
  'Hobbies and interests': 'Sở thích',
  'Law and legal system': 'Luật pháp và hệ thống pháp luật',
  'Linguistics': 'Ngôn ngữ học',
  'Literature and writing': 'Văn học và viết lách',
  'Molecular biology': 'Sinh học phân tử',
  'Months of the year': 'Các tháng trong năm',
  'Music': 'Âm nhạc',
  'Neuroscience': 'Khoa học thần kinh',
  'Numbers 1-10': 'Số đếm 1-10',
  'Philosophy and abstract concepts': 'Triết học và khái niệm trừu tượng',
  'Political theory': 'Lý thuyết chính trị',
  'Politics and government': 'Chính trị và chính phủ',
  'Professional sports': 'Thể thao chuyên nghiệp',
  'Psychology': 'Tâm lý học',
  'Quantum physics': 'Vật lý lượng tử',
  'Relationships': 'Các mối quan hệ',
  'Restaurant vocabulary': 'Từ vựng nhà hàng',
  'Rooms in a house': 'Các phòng trong nhà',
  'School subjects': 'Môn học',
  'Shopping and commerce': 'Mua sắm và thương mại',
  'Shopping items': 'Đồ mua sắm',
  'Social issues': 'Các vấn đề xã hội',
  'Sports and games': 'Thể thao và trò chơi',
  'Technology and computing': 'Công nghệ và máy tính',
  'Theology': 'Thần học',
  'Time expressions': 'Cách diễn đạt thời gian',
  'Transportation': 'Phương tiện giao thông',
  'Travel and tourism': 'Du lịch',
  'Weather and seasons': 'Thời tiết và mùa',
};

interface SkillProgress {
  done: boolean;
  correct?: number; // NEW: Add correct count
  total?: number;   // NEW: Add total count
  progress?: string; // NEW: Add progress string "X/Y"
  score?: number;
  attempts: number;
  historyCount?: number;
}

interface Topic {
  id: number;
  name: string;
  description: string;
  order: number;
  quiz: SkillProgress;
  writing: SkillProgress;
  pronunciation: SkillProgress;
}

interface LearningPathData {
  level: string;
  totalTopics: number;
  completedSkills: number;
  totalSkills: number;
  progressPercentage: number;
  topics: Topic[];
  xp: number;
  trophy: number;
}

interface LearningHistoryItem {
  id: string;
  questionText: string;
  correctAnswer: string;
  selectedAnswer: string;
  isCorrect: boolean;
  createdAt: string;
}

export default function LearningMapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, updateLevel } = useAuthStore();
  const [data, setData] = useState<LearningPathData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Animation states
  const [animatedXP, setAnimatedXP] = useState(0);
  const [animatedTrophy, setAnimatedTrophy] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [cardsVisible, setCardsVisible] = useState(false);
  
  // Track if we've already cleared storage to prevent infinite loop
  const hasCleared = useRef(false);
  
  // Level-skip state
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [testTarget, setTestTarget] = useState<Level | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  // History state
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, LearningHistoryItem[]>>({});
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [savingVocab, setSavingVocab] = useState<Record<string, boolean>>({});
  const [savedHistoryIds, setSavedHistoryIds] = useState<Set<string>>(new Set());
  const [savedWordKeys, setSavedWordKeys] = useState<Set<string>>(new Set());

  // Pre-load saved vocabulary keys so buttons show "Saved" across sessions
  useEffect(() => {
    if (!token) return;
    const fetchSavedKeys = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/learning-path/vocabulary-collection`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (res.ok) {
          const result = await res.json();
          const keys = new Set<string>(
            (result.data || []).map((item: any) => `${item.koreanWord}::${item.type}`)
          );
          setSavedWordKeys(keys);
        }
      } catch {}
    };
    fetchSavedKeys();
  }, [token]);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchTopics = async () => {
      try {
        setLoading(true);
        const isRefresh = searchParams.get('refresh') === 'true';
        if (isRefresh) {
          console.log('🔄 Refreshing progress after quiz/writing/pronunciation completion...');
        } else {
          console.log('📚 Fetching learning path...');
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/user/learning-path`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch learning path: ${response.status}`);
        }

        const learningPath = await response.json();
        console.log('✅ Learning path fetched:', learningPath);
        setData(learningPath);
        setError('');
        
        // Clear the refresh param from URL if it exists
        if (isRefresh) {
          window.history.replaceState({}, '', '/learning-map');
        }

        // Trigger animations after data loads
        setTimeout(() => {
          setAnimatedProgress(learningPath.progressPercentage ?? 0);
          setCardsVisible(true);
          // Count-up XP
          const xpTarget = learningPath.xp ?? 0;
          const trophyTarget = learningPath.trophy ?? 0;
          const duration = 1500;
          const steps = 60;
          const interval = duration / steps;
          let step = 0;
          const timer = setInterval(() => {
            step++;
            const progress = step / steps;
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            setAnimatedXP(Math.round(xpTarget * eased));
            setAnimatedTrophy(Math.round(trophyTarget * eased));
            if (step >= steps) {
              clearInterval(timer);
              setAnimatedXP(xpTarget);
              setAnimatedTrophy(trophyTarget);
            }
          }, interval);
        }, 100);
      } catch (error: any) {
        console.error('❌ Error fetching learning path:', error);
        
        // If 404, it means user doesn't exist in database
        // Clear localStorage only once and redirect to login
        if (error.message.includes('404') && !hasCleared.current) {
          console.log('🔄 User session invalid (404). Clearing storage and redirecting...');
          hasCleared.current = true;
          localStorage.clear();
          sessionStorage.clear();
          // Use window.location to do a hard redirect
          window.location.href = '/login';
          return;
        }
        
        setError(error.message || 'Failed to load learning path');
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, [token, router, searchParams, refreshCount]);

  const handleToggleSkill = async (topicId: number, skillType: string) => {
    const key = `${topicId}-${skillType}`;
    
    if (expandedSkill === key) {
      setExpandedSkill(null);
      return;
    }

    setExpandedSkill(key);
    setLoadingHistory(true);

    try {
      // Fetch from unified learning-history endpoint with skillType parameter
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/learning-path/learning-history?topicId=${topicId}&skillType=${skillType}&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const result = await response.json();
      console.log(`✅ ${skillType} history fetched:`, result.data);
      
      setHistory((prev) => ({
        ...prev,
        [key]: result.data || [],
      }));
    } catch (err: any) {
      console.error(`❌ Error fetching ${skillType} history:`, err);
      setHistory((prev) => ({
        ...prev,
        [key]: [],
      }));
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveVocabulary = async (item: any, type: string, itemId: string) => {
    setSavingVocab((prev) => ({ ...prev, [itemId]: true }));

    try {
      // Extract word and meaning based on type
      let word = '';
      let meaning = '';
      
      if (type === 'QUIZ') {
        word = item.questionText || '';
        meaning = item.correctAnswer || '';
      } else if (type === 'WRITING') {
        word = item.korean || item.word || '';
        meaning = item.vietnamese || item.meaning || '';
      } else if (type === 'PRONUNCIATION') {
        word = item.korean || item.word || '';
        meaning = item.vietnamese || item.meaning || '';
      }

      console.log('💾 Saving vocab:', { word, meaning, type });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/learning-path/save-vocab-from-history`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            word,
            meaning,
            type: type.toLowerCase(),
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Vocabulary saved:', result);
        setSavedHistoryIds((prev) => new Set([...prev, itemId]));
        setSavedWordKeys((prev) => new Set([...prev, `${word}::${type.toLowerCase()}`]));
      } else {
        console.warn('⚠️ Vocabulary save failed:', result);
      }
    } catch (error) {
      console.error('❌ Error saving vocabulary:', error);
    } finally {
      setSavingVocab((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf5]">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#72564c] mx-auto mb-4"></div>
            <p className="text-[#504441]">Đang tải lộ trình học tập...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#fafaf5]">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error || 'No data available'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#72564c] text-white rounded hover:bg-[#504441]"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf5]">
      <Header />
      <main className="pt-[70px] pl-[200px]">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-extrabold text-[#1a1c19] tracking-tight mb-0">
            Lộ Trình Học Tập
          </h1>
          <p className="text-[#504441] mt-[20px]" style={{ fontSize: '20px' }}>
            {LEVEL_LABELS[data.level] ?? data.level} •  {data.completedSkills}/{data.totalSkills} kỹ năng hoàn thành
          </p>
          
          {/* XP & Trophy Stats */}
          <div className="grid grid-cols-2 gap-8 max-w-xs mt-4 p-6 border border-[#e8e8e3] rounded-[25px]">
            <div className="text-center">
              <p className="font-semibold text-[#72564c] mb-2" style={{ fontSize: '20px' }}>XP</p>
              <p className="font-black text-[#72564c]" style={{ fontSize: '20px' }}>{animatedXP}</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-[#72564c] mb-2" style={{ fontSize: '20px' }}>Trophy</p>
              <p className="font-black text-[#72564c]" style={{ fontSize: '20px' }}>{animatedTrophy}</p>
            </div>
          </div>
        </div>

        {/* Centered Content Container - 350px margin on each side */}
        <div style={{marginLeft: '350px', marginRight: '350px'}} className="px-6">
          {/* Progress Bar */}
          <div className="my-12">
            <div className="w-full h-4 bg-[#e8e8e3] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#72564c] to-[#8d6e63] rounded-full"
                style={{
                  width: `${animatedProgress}%`,
                  transition: 'width 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                }}
              />
            </div>
            <p className="text-[#504441] mt-2" style={{ fontSize: '20px' }}>
              {data.progressPercentage}% hoàn thành
            </p>
          </div>

          {/* Topics */}
          <div className="space-y-6 my-12">
          {data.topics.map((topic, index) => (
            <div
              key={topic.id}
              className="bg-white p-6 rounded-lg border border-[#e8e8e3] hover:shadow-md transition-shadow"
              style={{
                opacity: cardsVisible ? 1 : 0,
                transform: cardsVisible ? 'translateY(0)' : 'translateY(28px)',
                transition: `opacity 0.45s ease, transform 0.45s ease`,
                transitionDelay: cardsVisible ? `${index * 80}ms` : '0ms',
              }}
            >
              <h3 className="font-bold text-[#72564c] mb-2" style={{ fontSize: '20px' }}>
                {topic.name}
              </h3>


              {/* Skills Row */}
              <div className="flex gap-4 flex-wrap">
                {/* Quiz */}
                <div className="flex-1 min-w-[140px]">
                  <button
                    onClick={() => handleToggleSkill(topic.id, 'QUIZ')}
                    className={`w-full p-3 rounded-lg text-center transition-all font-bold ${
                      (topic.quiz.done || (topic.quiz.total && topic.quiz.total > 0))
                        ? 'bg-[#c2ebe5] text-[#406561] border border-[#8ecdc5]'
                        : 'bg-[#f4f4ef] text-[#504441] hover:bg-[#e8e8e3]'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {topic.quiz.done && <Check size={16} />}
                      <span style={{ fontSize: '20px' }}>Trắc nghiệm</span>
                      <span className="text-sm">{expandedSkill === `${topic.id}-QUIZ` ? '▼' : '▶'}</span>
                    </div>
                    {/* Show correct/total format NEW */}
                    {topic.quiz.total && topic.quiz.total > 0 ? (
                      <div className="mt-1" style={{ fontSize: '20px' }}>
                        {topic.quiz.correct || 0}/{topic.quiz.total}
                      </div>
                    ) : (
                      <div className="mt-1 text-[#504441]" style={{ fontSize: '20px' }}>tiến độ: chưa làm</div>
                    )}
                  </button>

                  {/* Quiz History Dropdown */}
                  {expandedSkill === `${topic.id}-QUIZ` && (
                    <div className="mt-2 bg-white border border-[#e8e8e3] rounded-lg p-4 space-y-3 max-h-80 overflow-y-auto">
                      {loadingHistory ? (
                        <p className="text-[#504441]" style={{ fontSize: '20px' }}>Đang tải...</p>
                      ) : history[`${topic.id}-QUIZ`]?.length > 0 ? (
                        history[`${topic.id}-QUIZ`].map((item: LearningHistoryItem) => (
                          <div key={item.id} className="pb-3">
                            <p className="font-semibold text-[#72564c]" style={{ fontSize: '18px' }}>{item.questionText}</p>
                            <p className="text-[#504441] mt-1" style={{ fontSize: '18px' }}>
                              <span className={item.isCorrect ? 'text-green-600' : 'text-red-600'}>
                                Câu trả lời của bạn: {item.selectedAnswer} {item.isCorrect ? '(Đúng)' : '(Sai)'}
                              </span>
                            </p>
                            {!item.isCorrect && (
                              <p className="text-[#504441] mt-1" style={{ fontSize: '18px' }}>
                                <span className="text-green-600">Đáp án đúng: {item.correctAnswer}</span>
                              </p>
                            )}
                            {/* Save Vocabulary Button */}
                            {(() => {
                              const quizWord = item.questionText || '';
                              const isSaved = savedWordKeys.has(`${quizWord}::quiz`) || savedHistoryIds.has(item.id);
                              return (
                                <button
                                  onClick={() => handleSaveVocabulary(item, 'QUIZ', item.id)}
                                  disabled={savingVocab[item.id] || isSaved}
                                  className={`mt-2 px-3 py-1 rounded font-semibold transition-all ${
                                    isSaved
                                      ? 'bg-green-100 text-green-700 cursor-default'
                                      : savingVocab[item.id]
                                      ? 'bg-gray-300 text-gray-600 cursor-wait'
                                      : 'bg-[#72564c] text-white hover:bg-[#504441] cursor-pointer'
                                  }`}
                                  style={{ fontSize: '18px' }}
                                >
                                  {isSaved ? '✓ Đã lưu' : savingVocab[item.id] ? 'Đang lưu...' : 'Lưu'}
                                </button>
                              );
                            })()}
                            <hr className="mt-3 border-t border-black" />
                          </div>
                        ))
                      ) : (
                        <p className="text-[#504441]" style={{ fontSize: '20px' }}>Chưa có lịch sử trắc nghiệm</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Writing */}
                <div className="flex-1 min-w-[140px]">
                  <button
                    onClick={() => handleToggleSkill(topic.id, 'WRITING')}
                    className={`w-full p-3 rounded-lg text-center transition-all font-bold ${
                      (topic.writing.done || (topic.writing.total && topic.writing.total > 0))
                        ? 'bg-[#c2ebe5] text-[#406561] border border-[#8ecdc5]'
                        : 'bg-[#f4f4ef] text-[#504441] hover:bg-[#e8e8e3]'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {topic.writing.done && <Check size={16} />}
                      <span style={{ fontSize: '20px' }}>Luyện viết</span>
                      <span className="text-sm">{expandedSkill === `${topic.id}-WRITING` ? '▼' : '▶'}</span>
                    </div>
                    {topic.writing.total && topic.writing.total > 0 ? (
                      <div className="mt-1" style={{ fontSize: '20px' }}>
                        {topic.writing.correct || 0}/{topic.writing.total}
                      </div>
                    ) : (
                      <div className="mt-1 text-[#504441]" style={{ fontSize: '20px' }}>tiến độ: chưa làm</div>
                    )}
                  </button>

                  {/* Writing History Dropdown */}
                  {expandedSkill === `${topic.id}-WRITING` && (
                    <div className="mt-2 bg-white border border-[#e8e8e3] rounded-lg p-4 space-y-3 max-h-80 overflow-y-auto">
                      {loadingHistory ? (
                        <p className="text-[#504441]" style={{ fontSize: '20px' }}>Đang tải...</p>
                      ) : history[`${topic.id}-WRITING`]?.length > 0 ? (
                        history[`${topic.id}-WRITING`].map((item: any, idx) => (
                          <div key={idx} className="pb-3">
                            <p className="font-semibold text-[#72564c]" style={{ fontSize: '18px' }}>
                              Đề bài: {item.korean || item.word}
                            </p>
                            {(item.vietnamese || item.meaning) && (
                              <p className="text-[#504441] mt-1" style={{ fontSize: '18px' }}>
                                Nghĩa tiếng việt: <span className="font-semibold">{item.vietnamese || item.meaning}</span>
                              </p>
                            )}
                            {item.accuracy !== null && item.accuracy !== undefined && (
                              <p className="text-blue-600 font-semibold mt-1" style={{ fontSize: '18px' }}>
                                Tiến độ: {item.accuracy}%
                              </p>
                            )}
                            {/* Save Vocabulary Button */}
                            {(() => {
                              const writingWord = item.korean || item.word || '';
                              const writingKey = item.id || idx;
                              const isSaved = savedWordKeys.has(`${writingWord}::writing`) || savedHistoryIds.has(writingKey);
                              return (
                                <button
                                  onClick={() => handleSaveVocabulary(item, 'WRITING', writingKey)}
                                  disabled={savingVocab[writingKey] || isSaved}
                                  className={`mt-2 px-3 py-1 rounded font-semibold transition-all ${
                                    isSaved
                                      ? 'bg-green-100 text-green-700 cursor-default'
                                      : savingVocab[writingKey]
                                      ? 'bg-gray-300 text-gray-600 cursor-wait'
                                      : 'bg-[#72564c] text-white hover:bg-[#504441] cursor-pointer'
                                  }`}
                                  style={{ fontSize: '18px' }}
                                >
                                  {isSaved ? '✓ Đã lưu' : savingVocab[writingKey] ? 'Đang lưu...' : 'Lưu'}
                                </button>
                              );
                            })()}
                            <hr className="mt-3 border-t border-black" />
                          </div>
                        ))
                      ) : (
                        <p className="text-[#504441]" style={{ fontSize: '20px' }}>Chưa có lịch sử luyện viết</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Pronunciation */}
                <div className="flex-1 min-w-[140px]">
                  <button
                    onClick={() => handleToggleSkill(topic.id, 'PRONUNCIATION')}
                    className={`w-full p-3 rounded-lg text-center transition-all font-bold ${
                      (topic.pronunciation.done || (topic.pronunciation.total && topic.pronunciation.total > 0))
                        ? 'bg-[#c2ebe5] text-[#406561] border border-[#8ecdc5]'
                        : 'bg-[#f4f4ef] text-[#504441] hover:bg-[#e8e8e3]'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {topic.pronunciation.done && <Check size={16} />}
                      <span style={{ fontSize: '20px' }}>Phát âm</span>
                      <span className="text-sm">{expandedSkill === `${topic.id}-PRONUNCIATION` ? '▼' : '▶'}</span>
                    </div>
                    {topic.pronunciation.total && topic.pronunciation.total > 0 ? (
                      <div className="mt-1" style={{ fontSize: '20px' }}>
                        {topic.pronunciation.correct || 0}/{topic.pronunciation.total}
                      </div>
                    ) : (
                      <div className="mt-1 text-[#504441]" style={{ fontSize: '20px' }}>tiến độ: chưa làm</div>
                    )}
                  </button>

                  {/* Pronunciation History Dropdown */}
                  {expandedSkill === `${topic.id}-PRONUNCIATION` && (
                    <div className="mt-2 bg-white border border-[#e8e8e3] rounded-lg p-4 space-y-3 max-h-80 overflow-y-auto">
                      {loadingHistory ? (
                        <p className="text-[#504441]" style={{ fontSize: '20px' }}>Đang tải...</p>
                      ) : history[`${topic.id}-PRONUNCIATION`]?.length > 0 ? (
                        history[`${topic.id}-PRONUNCIATION`].map((item: any, idx) => (
                          <div key={idx} className="pb-3">
                            <p className="font-semibold text-[#72564c]" style={{ fontSize: '18px' }}>
                              Đề bài: {item.korean || item.word}
                            </p>
                            {(item.vietnamese || item.meaning) && (
                              <p className="text-[#504441] mt-1" style={{ fontSize: '18px' }}>
                                Nghĩa tiếng việt: <span className="font-semibold">{item.vietnamese || item.meaning}</span>
                              </p>
                            )}
                            {item.accuracy !== null && item.accuracy !== undefined && (
                              <p className="text-blue-600 font-semibold mt-1" style={{ fontSize: '18px' }}>
                                Tiến độ: {item.accuracy}%
                              </p>
                            )}
                            {/* Save Vocabulary Button */}
                            {(() => {
                              const pronounceWord = item.korean || item.word || '';
                              const pronounceKey = item.id || idx;
                              const isSaved = savedWordKeys.has(`${pronounceWord}::pronunciation`) || savedHistoryIds.has(pronounceKey);
                              return (
                                <button
                                  onClick={() => handleSaveVocabulary(item, 'PRONUNCIATION', pronounceKey)}
                                  disabled={savingVocab[pronounceKey] || isSaved}
                                  className={`mt-2 px-3 py-1 rounded font-semibold transition-all ${
                                    isSaved
                                      ? 'bg-green-100 text-green-700 cursor-default'
                                      : savingVocab[pronounceKey]
                                      ? 'bg-gray-300 text-gray-600 cursor-wait'
                                      : 'bg-[#72564c] text-white hover:bg-[#504441] cursor-pointer'
                                  }`}
                                  style={{ fontSize: '18px' }}
                                >
                                  {isSaved ? '✓ Đã lưu' : savingVocab[pronounceKey] ? 'Đang lưu...' : 'Lưu'}
                                </button>
                              );
                            })()}
                            <hr className="mt-3 border-t border-black" />
                          </div>
                        ))
                      ) : (
                        <p className="text-[#504441]" style={{ fontSize: '20px' }}>Chưa có lịch sử luyện nói</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* Action Button - Learn Beyond - Bottom Right */}
        <div className="flex justify-end pb-12" style={{paddingRight: '20%'}}>
          {/* Learn Beyond Button */}
          <button
            onClick={() => setShowSkipModal(true)}
            className="px-12 py-4 bg-[#72564c] text-white rounded-lg font-bold hover:bg-[#504441] transition-all duration-300 shadow-sm hover:shadow-md"
            style={{ fontSize: '20px' }}
          >
            Học vượt
          </button>
        </div>
      </main>

      {/* Level-skip confirmation + level picker */}
      {showSkipModal && data && (
        <LevelSkipModal
          currentLevel={(data.level as Level)}
          userXP={data.xp}
          userTrophy={data.trophy}
          onConfirm={(target, isReview) => {
            setShowSkipModal(false);
            if (isReview) {
              // Already-passed level: persist to DB then update local state
              const tok = localStorage.getItem('token');
              fetch(`${process.env.NEXT_PUBLIC_API_URL}/learning-path/set-level`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${tok}`,
                },
                body: JSON.stringify({ level: target, force: true }),
              }).then(async (res) => {
                const result = await res.json().catch(() => ({}));
                const newTrophy = result.trophy ?? undefined;
                updateLevel(target, newTrophy);
                setRefreshCount(c => c + 1);
              }).catch(() => {
                updateLevel(target);
                setRefreshCount(c => c + 1);
              });
            } else {
              setTestTarget(target);
            }
          }}
          onClose={() => setShowSkipModal(false)}
        />
      )}

      {/* Full-screen inline test */}
      {testTarget && (
        <LevelTestModal
          targetLevel={testTarget}
          onFinish={(passed, newLevel) => {
            setTestTarget(null);
            if (passed && newLevel) {
              // Sync auth store so quiz/writing/pronunciation pages use the new level
              updateLevel(newLevel);
              // Re-fetch learning-map data to reflect new level
              setRefreshCount(c => c + 1);
            }
          }}
          onClose={() => setTestTarget(null)}
        />
      )}
      <Footer />
    </div>
  );
}