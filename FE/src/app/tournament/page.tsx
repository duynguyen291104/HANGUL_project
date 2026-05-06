'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import Footer from '@/components/Footer';
import { AnimatePresence, motion } from 'framer-motion';

interface GameMode {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  status: string;
  difficulty: string;
  mascot: string;
  mascotAlt: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: number;
  name: string;
  trophy: number;
  avatar?: string;
  level: string;
  xp: number;
}

interface UserInfo {
  id: number;
  name: string;
  email: string;
  level: string;
  totalTrophy: number;
  totalXP: number;
  avatar?: string;
  rank?: string;
}

export default function TournamentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const socketRef = useRef<Socket | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState<string>('');
  const [currentRank, setCurrentRank] = useState<string>('Bronze');
  const [currentTrophy, setCurrentTrophy] = useState<number>(0);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Animation states
  const [displayedTrophy, setDisplayedTrophy] = useState(0);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [boardVisible, setBoardVisible] = useState(false);
  const trophyAnimTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Animate trophy count-up whenever currentTrophy changes
  useEffect(() => {
    if (trophyAnimTimerRef.current) clearInterval(trophyAnimTimerRef.current);
    const target = currentTrophy;
    const duration = 1500;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;
    const start = displayedTrophy;
    trophyAnimTimerRef.current = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayedTrophy(Math.round(start + (target - start) * eased));
      if (step >= steps) {
        clearInterval(trophyAnimTimerRef.current!);
        setDisplayedTrophy(target);
      }
    }, interval);
    return () => { if (trophyAnimTimerRef.current) clearInterval(trophyAnimTimerRef.current); };
  }, [currentTrophy]);

  // Update leaderboard – Framer Motion layout handles the animation
  const updateLeaderboardWithAnimation = (newBoard: LeaderboardEntry[]) => {
    setLeaderboard(newBoard);
  };

  // When the game page navigates back with ?r=<timestamp>, re-fetch leaderboard
  // so the updated data is visible without a full page reload.
  const refreshParam = searchParams?.get('r');
  useEffect(() => {
    if (!refreshParam || !token) return;
    fetchUserProfile();
    fetchLeaderboard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshParam]);

  const gameModes: GameMode[] = [
    {
      id: 'speed-quiz',
      title: 'Trắc Nghiệm Tốc Độ',
      description: 'Ghép các nguyên âm và phụ âm Hàn Quốc đối với thời gian.',
      icon: '',
      color: 'bg-[#ffddb5]',
      status: 'Đang Diễn Ra',
      difficulty: 'Trung Cấp',
      mascot: 'https://res.cloudinary.com/dds5jlp7e/image/upload/q_auto/f_auto/v1775133394/clock_okbser.png',
      mascotAlt: 'Biểu tượng đồng hồ cho Trắc Nghiệm Tốc Độ',
    },
    {
      id: 'flash-writing',
      title: 'Luyện Viết Nhanh',
      description: 'Huấn luyện thứ tự nét với phản hồi tức thì.',
      icon: '',
      color: 'bg-[#c2ebe5]',
      status: 'Tầng Chuyên Gia',
      difficulty: 'Nâng Cao',
      mascot: 'https://res.cloudinary.com/dds5jlp7e/image/upload/q_auto/f_auto/v1775133605/writing_kgqgdy.png',
      mascotAlt: 'Biểu tượng viết cho Luyện Viết Nhanh',
    },
    {
      id: 'word-match',
      title: 'Ghép Từ',
      description: 'Kết nối các định nghĩa với các cấu trúc Hangul phức tạp nhanh chóng.',
      icon: '',
      color: 'bg-[#ffddb5]',
      status: 'Kỷ Lục Mới',
      difficulty: 'Trung Cấp',
      mascot: 'https://res.cloudinary.com/dds5jlp7e/image/upload/q_auto/f_auto/v1775133703/puzzle_k88yqv.png',
      mascotAlt: 'Biểu tượng câu đố cho Ghép Từ',
    },
    {
      id: 'perfect-speaking',
      title: 'Phát Âm Hoàn Hảo',
      description: 'Trận chiến phát âm được hỗ trợ bởi AI cho các điểm lưu loát hàng đầu.',
      icon: '',
      color: 'bg-[#ffdad6]',
      status: 'Cực Độ',
      difficulty: 'Chuyên Gia',
      mascot: 'https://res.cloudinary.com/dds5jlp7e/image/upload/q_auto/f_auto/v1775133799/microphone_1_syam64.png',
      mascotAlt: 'Biểu tượng micrô cho Phát Âm Hoàn Hảo',
    },
  ];

  const fetchUserProfile = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const userData = await res.json();
        setUserInfo(userData);
        setUserLevel(userData.level);
        setCurrentRank(userData.rank || 'Bronze');
        setCurrentTrophy(userData.totalTrophy || 0);
      }
    } catch (e) {
      console.error('Failed to fetch user profile', e);
    }
  };

  // Refetch leaderboard — always bypass cache so returning from a game shows fresh data
  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/tournament/leaderboard?_t=${Date.now()}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store',
        }
      );
      if (res.ok) {
        const data = await res.json();
        updateLeaderboardWithAnimation(data.leaderboard || []);
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard', e);
    }
  };

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    // 1. Fetch data immediately — independent of socket setup so a socket error
    //    never prevents the leaderboard from showing
    fetchUserProfile();
    fetchLeaderboard().then(() => {
      setLoading(false);
      setTimeout(() => setCardsVisible(true), 100);
      setTimeout(() => setBoardVisible(true), 300);
    });

    // 2. Connect WebSocket
    const socket = io('http://localhost:5000', { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', async () => {
      console.log('🎮 Socket connected / reconnected');
      // Re-join the level room and refresh data on every (re)connect.
      // This is the key fix: returning from the game page triggers a
      // socket reconnect which re-fetches the latest leaderboard.
      try {
        const profileRes = await fetch('http://localhost:5000/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store',
        });
        if (profileRes.ok) {
          const userData = await profileRes.json();
          setUserInfo(userData);
          setUserLevel(userData.level);
          setCurrentRank(userData.rank || 'Bronze');
          setCurrentTrophy(userData.totalTrophy || 0);
          socket.emit('tournament:join', { userId: userData.id, name: userData.name });
        }
      } catch (_) {}
      // Always get the freshest leaderboard after joining the room
      fetchLeaderboard();
    });

    // Rank update pushed immediately after submit (personal feed)
    socket.on('rankUpdate', (data: any) => {
      setCurrentRank(data.rank);
      setCurrentTrophy(data.trophy);
    });

    // Real-time leaderboard pushed to the whole level room after any submit
    socket.on('tournament:leaderboard-updated', (data: any) => {
      if (data.leaderboard) {
        updateLeaderboardWithAnimation(data.leaderboard);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token, router]);

  return (
    <div className="min-h-screen bg-[#fafaf5]">
      <Header />
      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 min-h-screen">
          {/* Header Section */}
          <div className="pt-[70px] pl-[200px] pr-[90px]">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-extrabold text-[#1a1c19] tracking-tight mb-0" style={{ fontSize: '48px' }}>Đấu Trường</h1>
                <p className="text-[#504441] max-w-lg leading-relaxed mt-[20px]" style={{ fontSize: '20px' }}>
                  Chọn chiến trường của bạn. Rèn luyện kỹ năng của bạn chống lại các cầu thủ trên toàn thế giới và leo lên bảng xếp hạng theo mùa để nhận được phần thưởng độc quyền.
                </p>
              </div>
              
              {/* Current Rank - Right Side */}
              <div className="border-2 border-[#72564c] rounded-[25px] p-6 mr-[300px]">
                <p className="font-bold uppercase tracking-widest text-[#72564c] mb-2" style={{ fontSize: '20px' }}>Hạng hiện tại</p>
                <p className="font-bold text-[#1a1c19]" style={{ fontSize: '20px' }}>{currentRank}</p>
                <p className="text-[#504441] mt-2" style={{ fontSize: '20px' }}>{displayedTrophy} Trophy</p>
              </div>
            </div>
          </div>

          <div className="px-[90px] py-12 max-w-7xl mx-auto">
            {/* The Otter Arena Section */}
            <div className="bg-white rounded-xl p-8 shadow-lg mb-8">
              {/* Game Modes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {gameModes.map((mode, index) => (
                  <Link
                    key={mode.id}
                    href={`/tournament/games/${mode.id}`}
                    className="group relative bg-[#f4f4ef] rounded-lg p-8 overflow-hidden transition-all hover:translate-y-[-4px] cursor-pointer hover:shadow-xl"
                    style={{
                      opacity: cardsVisible ? 1 : 0,
                      transform: cardsVisible ? 'translateY(0)' : 'translateY(28px)',
                      transition: 'opacity 0.45s ease, transform 0.45s ease',
                      transitionDelay: cardsVisible ? `${index * 100}ms` : '0ms',
                    }}
                  >
                    <div className="relative z-10 flex flex-col h-full">
                      <h3 className="font-bold mb-2 text-[#1a1c19]" style={{ fontSize: '20px' }}>{mode.title}</h3>
                      <p className="text-[#504441] mb-6" style={{ fontSize: '20px' }}>{mode.description}</p>
                      <div className="mt-auto flex justify-end items-end">
                        <div className="w-24 h-24 -mr-4 -mb-4 rounded-lg overflow-hidden">
                          <img alt={mode.mascotAlt} src={mode.mascot} className="w-full h-full object-cover brightness-0 saturate-200" style={{filter: 'sepia(0.6) hue-rotate(15deg) brightness(0.9) saturate(1.5)'}} />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Leaderboard Section */}
            <div className="bg-white rounded-xl p-8 shadow-lg mb-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="font-bold text-[#1a1c19]" style={{ fontSize: '20px' }}>Bảng Xếp Hạng</h2>
                  {userLevel && <p className="text-[#72564c] mt-2" style={{ fontSize: '20px' }}>Level: <strong>{userLevel}</strong></p>}
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8 text-[#504441]" style={{ fontSize: '20px' }}>
                  Đang tải bảng xếp hạng...
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-8 text-[#504441]" style={{ fontSize: '20px' }}>
                  Chưa có người chơi nào ở level {userLevel}
                </div>
              ) : (
                <motion.div className="space-y-4" layout>
                  <AnimatePresence initial={false}>
                    {leaderboard.slice(0, 10).map((entry, index) => (
                      <motion.div
                        key={entry.userId}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: boardVisible ? 1 : 0, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{
                          layout: { type: 'spring', stiffness: 300, damping: 30 },
                          opacity: { duration: 0.4, delay: boardVisible ? index * 0.07 : 0 },
                        }}
                        className={`flex items-center gap-4 p-4 rounded-lg ${
                          entry.userId === userInfo?.id
                            ? 'bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white shadow-lg'
                            : 'bg-[#f9f9f7] hover:shadow-md'
                        }`}
                      >
                        <div className={`w-8 text-center font-black ${entry.userId === userInfo?.id ? 'text-white' : 'text-[#815300]'}`} style={{ fontSize: '20px' }}>
                          {entry.rank}
                        </div>
                        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-[#ffddb5]">
                          <div className="w-full h-full bg-gradient-to-br from-[#ff6b6b] to-[#ffd93d] flex items-center justify-center text-white font-bold">
                            {entry.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className={`font-bold ${entry.userId === userInfo?.id ? 'text-white' : 'text-[#1a1c19]'}`} style={{ fontSize: '20px' }}>
                            {entry.name} {entry.userId === userInfo?.id && '(Bạn)'}
                          </p>
                          <p className={`${entry.userId === userInfo?.id ? 'text-gray-100' : 'text-[#504441]'}`} style={{ fontSize: '20px' }}>
                            {entry.trophy} Trophy • {entry.xp} XP
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
