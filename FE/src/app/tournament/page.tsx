'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import Footer from '@/components/Footer';

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
  const socketRef = useRef<Socket | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState<string>('');
  const [currentRank, setCurrentRank] = useState<string>('Bronze');
  const [currentTrophy, setCurrentTrophy] = useState<number>(0);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

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

  // Refetch user profile (called on mount and after returning from game)
  const fetchUserProfile = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
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

  // Refetch leaderboard
  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/tournament/leaderboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
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

    // Fetch user info and leaderboard
    const initializeTournament = async () => {
      try {
        await fetchUserProfile();

        // Connect to WebSocket
        const socket = io('http://localhost:5000', {
          auth: { token }
        });

        socketRef.current = socket;

        socket.on('connect', async () => {
          console.log('🎮 Connected to tournament WebSocket');

          // Re-fetch fresh data when reconnecting (e.g. returning from game)
          const profileRes = await fetch('http://localhost:5000/api/user/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (profileRes.ok) {
            const userData = await profileRes.json();
            setUserInfo(userData);
            setUserLevel(userData.level);
            setCurrentRank(userData.rank || 'Bronze');
            setCurrentTrophy(userData.totalTrophy || 0);

            socket.emit('tournament:join', {
              userId: userData.id,
              name: userData.name
            });
          }
        });

        // Listen for rank updates pushed by server after submit
        socket.on('rankUpdate', (data: any) => {
          console.log('🏆 Rank updated via WS:', data.rank, data.trophy);
          setCurrentRank(data.rank);
          setCurrentTrophy(data.trophy);
        });

        socket.on('tournament:leaderboard-updated', (data: any) => {
          if (data.leaderboard) {
            setLeaderboard(data.leaderboard);
          }
        });

        await fetchLeaderboard();
        setLoading(false);
      } catch (error) {
        console.error('❌ Failed to initialize tournament:', error);
        setLoading(false);
      }
    };

    initializeTournament();

    // Re-fetch when tab becomes visible (user returns from game page)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUserProfile();
        fetchLeaderboard();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
                <h1 className="text-5xl font-extrabold text-[#1a1c19] tracking-tight mb-0">Đấu Trường</h1>
                <p className="text-[#504441] max-w-lg leading-relaxed mt-[20px]">
                  Chọn chiến trường của bạn. Rèn luyện kỹ năng của bạn chống lại các cầu thủ trên toàn thế giới và leo lên bảng xếp hạng theo mùa để nhận được phần thưởng độc quyền.
                </p>
              </div>
              
              {/* Current Rank - Right Side */}
              <div className="border-2 border-[#72564c] rounded-[25px] p-6 mr-[300px]">
                <p className="text-xs font-bold uppercase tracking-widest text-[#72564c] mb-2">Current Rank</p>
                <p className="text-2xl font-bold text-[#1a1c19]">{currentRank}</p>
                <p className="text-sm text-[#504441] mt-2">🏆 {currentTrophy} Trophy</p>
              </div>
            </div>
          </div>

          <div className="px-[90px] py-12 max-w-7xl mx-auto">
            {/* The Otter Arena Section */}
            <div className="bg-white rounded-xl p-8 shadow-lg mb-8">
              {/* Game Modes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {gameModes.map((mode) => (
                  <Link
                    key={mode.id}
                    href={`/tournament/games/${mode.id}`}
                    className="group relative bg-[#f4f4ef] rounded-lg p-8 overflow-hidden transition-all hover:translate-y-[-4px] cursor-pointer hover:shadow-xl"
                  >
                    <div className="relative z-10 flex flex-col h-full">
                      <h3 className="text-2xl font-bold mb-2 text-[#1a1c19]">{mode.title}</h3>
                      <p className="text-sm text-[#504441] mb-6">{mode.description}</p>
                      <div className="mt-auto flex justify-between items-end">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold uppercase tracking-widest text-[#72564c]">{mode.status}</span>
                          <span className="text-xs text-[#504441]">{mode.difficulty}</span>
                        </div>
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
                  <h2 className="text-2xl font-bold text-[#1a1c19]">Bảng Xếp Hạng</h2>
                  {userLevel && <p className="text-xs text-[#72564c] mt-2">Level: <strong>{userLevel}</strong></p>}
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8 text-[#504441]">
                  Đang tải bảng xếp hạng...
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-8 text-[#504441]">
                  Chưa có người chơi nào ở level {userLevel}
                </div>
              ) : (
                <div className="space-y-4">
                  {leaderboard.slice(0, 10).map((entry) => (
                    <div 
                      key={entry.userId} 
                      className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                        entry.userId === userInfo?.id
                          ? 'bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white shadow-lg'
                          : 'bg-[#f9f9f7] hover:shadow-md'
                      }`}
                    >
                      <div className={`w-8 text-center font-black ${entry.userId === userInfo?.id ? 'text-white' : 'text-[#815300]'}`}>
                        {entry.rank}
                      </div>
                      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-[#ffddb5]">
                        <div className="w-full h-full bg-gradient-to-br from-[#ff6b6b] to-[#ffd93d] flex items-center justify-center text-white font-bold">
                          {entry.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className={`font-bold text-sm ${entry.userId === userInfo?.id ? 'text-white' : 'text-[#1a1c19]'}`}>
                          {entry.name} {entry.userId === userInfo?.id && '(Bạn)'}
                        </p>
                        <p className={`text-xs ${entry.userId === userInfo?.id ? 'text-gray-100' : 'text-[#504441]'}`}>
                          🏆 {entry.trophy} Trophy • ⭐ {entry.xp} XP
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
