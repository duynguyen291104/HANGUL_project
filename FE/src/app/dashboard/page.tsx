'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import Link from 'next/link';

interface GameStats {
  trophy?: number;
  xp?: number;
  quizCount?: number;
  writeCount?: number;
  speakCount?: number;
  rank?: string;
  eligible?: boolean;
  streak?: number;
  level?: string;
}

interface ActivityData {
  weekStart: string;
  weekEnd: string;
  totalSeconds: number;
  totalMinutes: number;
  totalHours: number;
  avgSessionMinutes: number;
  totalSessions: number;
  activityCount: number;
  daily: Array<{
    date: string;
    dayOfWeek: string;
    seconds: number;
    minutes: number;
    hours: string;
  }>;
}

export default function Dashboard() {
  const router = useRouter();
  const { user: authUser, token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [weeklyActivity, setWeeklyActivity] = useState<ActivityData | null>(null);
  const [vocabCount, setVocabCount] = useState<number>(0);
  const [heroVisible, setHeroVisible] = useState(false);
  const [barsVisible, setBarsVisible] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    if (authUser && !authUser.levelLocked) {
      router.push('/level-selection');
      return;
    }

    loadData();
  }, [token, authUser, router]);

  // Hero entrance — fires on mount, no scroll needed
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Scroll-triggered animations: fade-up, slide-left, slide-right, bar chart
  useEffect(() => {
    if (loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (entry.target.hasAttribute('data-animate-bars')) {
            setBarsVisible(true);
          } else {
            entry.target.classList.add('in-view');
          }
        });
      },
      { threshold: 0.15 }
    );
    document
      .querySelectorAll('[data-animate],[data-animate-lr],[data-animate-rl],[data-animate-bars]')
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [loading]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const [, statsRes, activityRes] = await Promise.allSettled([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/stats`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/activity/weekly`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        }),
      ]);

      clearTimeout(timeoutId);

      // Check if requests succeeded
      const statsOk = statsRes.status === 'fulfilled' && statsRes.value.ok;
      const activityOk = activityRes.status === 'fulfilled' && activityRes.value.ok;

      if (!statsOk) {
        console.warn('API calls failed, using default data');
        setStats({
          trophy: 0,
          xp: 0,
          quizCount: 0,
          writeCount: 0,
          speakCount: 0,
          rank: 'Bronze',
          eligible: true,
          streak: 0,
          level: authUser?.level ?? '—',
        });
        setLoading(false);
        return;
      }

      const statsData = await statsRes.value.json();
      setStats(statsData);

      // Fetch vocab count
      try {
        const vocabRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/learning-path/vocabulary-collection`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (vocabRes.ok) {
          const vocabData = await vocabRes.json();
          setVocabCount(vocabData.count ?? 0);
        }
      } catch (_) { /* non-blocking */ }

      if (activityOk) {
        const activityData = await activityRes.value.json();
        setWeeklyActivity(activityData);
      }
      setLoading(false);
    } catch (err) {
      console.error('Lỗi tải dữ liệu:', err);
      // Set default data on error
      setStats({
        trophy: 0,
        xp: 0,
        quizCount: 0,
        writeCount: 0,
        speakCount: 0,
        rank: 'Bronze',
        eligible: true,
        streak: 0,
        level: authUser?.level ?? '—',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fafaf5]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#72564c] mx-auto mb-4"></div>
          <p className="text-[#504441]" style={{ fontSize: '20px' }}>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf5]">
      <Header />

      {/* ── Hero — full bleed, flush with header and both edges ── */}
      <section className="relative w-full overflow-hidden" style={{ aspectRatio: '16/7' }}>
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/hero-bg.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative z-10 h-full flex flex-col justify-center px-[100px] py-10">
          <p
            className="uppercase tracking-[0.25em] font-bold text-white/70 mb-3"
            style={{
              fontSize: '20px',
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'none' : 'translateY(16px)',
              transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
            }}
          >
            Ứng dụng học tiếng Hàn
          </p>
          <h1
            className="text-8xl font-black text-white leading-[1.05] tracking-tight mb-5"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'none' : 'translateY(30px)',
              transition: 'opacity 0.85s ease 0.3s, transform 0.85s ease 0.3s',
            }}
          >
            한글<br />
            <span className="text-[#ffdbce]">HANGUL</span>
          </h1>
          <p
            className="text-white/80 leading-relaxed max-w-sm"
            style={{
              fontSize: '20px',
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'none' : 'translateY(16px)',
              transition: 'opacity 0.7s ease 0.55s, transform 0.7s ease 0.55s',
            }}
          >
            Học từ vựng, luyện phát âm và kiểm tra kiến thức mỗi ngày.<br />
            Xây dựng thói quen — một từ một lúc.
          </p>
        </div>
      </section>

      <main className="px-[100px] pb-24">

        {/* ── Stats row ── */}
        {stats && (
          <section className="py-10 border-b border-[#e8dcd4]">
            <p className="uppercase tracking-[0.2em] font-bold text-[#8d6e63] mb-6" data-animate data-delay="0" style={{ fontSize: '20px' }}>Thống kê của bạn</p>
            <div className="flex gap-10">
              <div data-animate data-delay="1">
                <p className="uppercase tracking-widest font-bold text-[#8d6e63] mb-1" style={{ fontSize: '20px' }}>Cấp độ</p>
                <p className="font-black text-[#1a1c19]" style={{ fontSize: '20px' }}>{stats.level ?? '—'}</p>
              </div>
              <div className="w-px bg-[#e8dcd4]" />
              <div data-animate data-delay="2">
                <p className="uppercase tracking-widest font-bold text-[#8d6e63] mb-1" style={{ fontSize: '20px' }}>Hạng</p>
                <p className="font-black text-[#1a1c19]" style={{ fontSize: '20px' }}>{stats.rank}</p>
              </div>
              <div className="w-px bg-[#e8dcd4]" />
              <div data-animate data-delay="3">
                <p className="uppercase tracking-widest font-bold text-[#8d6e63] mb-1" style={{ fontSize: '20px' }}>Trophy</p>
                <p className="font-black text-[#1a1c19]" style={{ fontSize: '20px' }}>{stats.trophy ?? 0}</p>
              </div>
              <div className="w-px bg-[#e8dcd4]" />
              <div data-animate data-delay="4">
                <p className="uppercase tracking-widest font-bold text-[#8d6e63] mb-1" style={{ fontSize: '20px' }}>XP</p>
                <p className="font-black text-[#1a1c19]" style={{ fontSize: '20px' }}>{stats.xp ?? 0}</p>
              </div>
              <div className="w-px bg-[#e8dcd4]" />
              <div data-animate data-delay="5">
                <p className="uppercase tracking-widest font-bold text-[#8d6e63] mb-1" style={{ fontSize: '20px' }}>Chuỗi ngày</p>
                <p className="font-black text-[#1a1c19]" style={{ fontSize: '20px' }}>{stats.streak ?? 0}</p>
              </div>
            </div>
          </section>
        )}

        {/* ── Cards grid ── */}
        <section className="pt-10">
          <p className="uppercase tracking-[0.2em] font-bold text-[#8d6e63] mb-6" data-animate data-delay="0" style={{ fontSize: '20px' }}>Học tập</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

            {/* Vocabulary */}
            <Link
              href="/vocabulary-collection"
              className="group border border-[#e8dcd4] rounded-2xl p-6 flex flex-col justify-between min-h-[160px] hover:border-[#72564c] transition-colors"
              data-animate data-delay="1"
            >
              <div className="overflow-hidden mb-4" style={{ width: '120px', height: '120px' }}>
                <img src="https://res.cloudinary.com/dds5jlp7e/image/upload/v1777952597/Screenshot_from_2026-05-05_10-31-12-removebg-preview_txjshc.png" alt="Từ vựng" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-bold text-[#1a1c19] mb-0.5" style={{ fontSize: '20px' }}>Từ vựng</h3>
                <p className="text-[#8d6e63]" style={{ fontSize: '20px' }}>{vocabCount} từ đã lưu</p>
              </div>
            </Link>

            {/* Learning map */}
            <Link
              href="/learning-map"
              className="group border border-[#e8dcd4] rounded-2xl p-6 flex flex-col justify-between min-h-[160px] hover:border-[#72564c] transition-colors"
              data-animate data-delay="2"
            >
              <div className="overflow-hidden mb-4" style={{ width: '120px', height: '120px' }}>
                <img src="https://res.cloudinary.com/dds5jlp7e/image/upload/v1777952612/Screenshot_from_2026-05-05_10-30-39-removebg-preview_nleapq.png" alt="Lịch sử tiến độ" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-bold text-[#1a1c19] mb-0.5" style={{ fontSize: '20px' }}>Lịch sử tiến độ</h3>
                <p className="text-[#8d6e63]" style={{ fontSize: '20px' }}>Xem lịch sử học tập</p>
              </div>
            </Link>

            {/* Weekly activity — spans 2 cols */}
            <div className="lg:col-span-2 bg-[#f4f0ec] border border-[#e8dcd4] rounded-2xl p-6" data-animate data-delay="3">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-[#1a1c19]" style={{ fontSize: '20px' }}>Hoạt động tuần này</h3>
                  <p className="text-[#8d6e63] mt-0.5" style={{ fontSize: '20px' }}>
                    {weeklyActivity
                      ? weeklyActivity.totalMinutes < 60
                        ? `${weeklyActivity.totalMinutes} phút`
                        : `${weeklyActivity.totalHours} giờ`
                      : '0 phút'}
                  </p>
                </div>
                {weeklyActivity && (
                  <div className="flex gap-4 text-right">
                    <div>
                      <p className="uppercase tracking-widest text-[#8d6e63]" style={{ fontSize: '20px' }}>TB/buổi</p>
                      <p className="font-bold text-[#1a1c19]" style={{ fontSize: '20px' }}>{weeklyActivity.avgSessionMinutes}m</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-widest text-[#8d6e63]" style={{ fontSize: '20px' }}>Buổi học</p>
                      <p className="font-bold text-[#1a1c19]" style={{ fontSize: '20px' }}>{weeklyActivity.activityCount}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bar chart — bars animate up from 0 when scrolled into view */}
              <div className="flex items-end gap-1.5 h-20" data-animate-bars>
                {(() => {
                  const days = weeklyActivity
                    ? weeklyActivity.daily
                    : ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => ({ date: '', dayOfWeek: d, seconds: 0, minutes: 0 }));
                  const maxSec = weeklyActivity
                    ? Math.max(...weeklyActivity.daily.map(d => d.seconds), 1)
                    : 1;
                  return days.map((day, idx) => {
                    const hasActivity = day.seconds > 0;
                    const pct = hasActivity ? Math.max((day.seconds / maxSec) * 100, 12) : 0;
                    const isToday = day.date ? new Date(day.date).toDateString() === new Date().toDateString() : false;
                    return (
                      <div key={idx} className="flex-1 h-full flex flex-col justify-end gap-1">
                        {hasActivity ? (
                          <div
                            className={`w-full rounded-sm ${isToday ? 'bg-[#72564c]' : 'bg-[#b09488]'}`}
                            style={{
                              height: barsVisible ? `${pct}%` : '0%',
                              transition: `height 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 50}ms`,
                            }}
                            title={`${day.dayOfWeek}: ${day.minutes}m`}
                          />
                        ) : (
                          <div className="w-full h-[2px] rounded-full bg-[#e3ddd8]" />
                        )}
                        <span className={`font-bold uppercase text-center ${isToday && hasActivity ? 'text-[#72564c]' : 'text-[#8d6e63]'}`} style={{ fontSize: '9px' }}>
                          {day.dayOfWeek.slice(0, 1)}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* ── Feature Showcase ── */}
      <div className="w-full">

        {/* Divider */}
        <div className="h-px bg-[#e8dcd4]" />

        {/* ── Interlude 00 → 01 ── */}
        <div className="h-[250px] bg-[#f4f0ec] flex items-center px-[100px] justify-between border-b border-[#e8dcd4]">
          <div className="flex items-center gap-6" data-animate-lr>
            <span className="text-[80px] font-black text-[#e8dcd4] leading-none select-none">01</span>
            <div>
              <p className="uppercase tracking-widest font-bold text-[#8d6e63] mb-1" style={{ fontSize: '20px' }}>Khám phá tính năng</p>
              <p className="font-black text-[#1a1c19] tracking-tight" style={{ fontSize: '40px' }}>Smart Quiz</p>
              <p className="text-[#8d6e63] mt-1" style={{ fontSize: '20px' }}>Bắt đầu hành trình với hệ thống quiz thông minh.</p>
            </div>
          </div>
          <div className="flex items-center gap-3" data-animate-rl>
            <div className="w-2 h-2 rounded-full bg-[#72564c]" />
            <div className="w-2 h-2 rounded-full bg-[#e8dcd4]" />
            <div className="w-2 h-2 rounded-full bg-[#e8dcd4]" />
            <div className="w-2 h-2 rounded-full bg-[#e8dcd4]" />
          </div>
        </div>

        {/* Quiz */}
        <div className="relative w-full overflow-hidden" style={{ height: '840px' }}>
          <video className="absolute inset-0 w-full h-full object-cover" src="/feat-quiz.mp4" autoPlay loop muted playsInline onLoadedMetadata={(e) => { const v = e.currentTarget; v.currentTime = Math.max(0, v.duration - 3); }} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <div className="relative z-10 h-full flex flex-col justify-center px-[100px]">
            <p className="uppercase tracking-[0.3em] font-bold text-[#ffdbce]/80 mb-3" style={{ fontSize: '20px' }}>Tính năng 01</p>
            <h2 className="font-black text-white leading-tight tracking-tight mb-5" style={{ fontSize: '40px' }}>
              Smart Quiz
            </h2>
            <p className="text-white/70 max-w-md leading-relaxed mb-8" style={{ fontSize: '20px' }}>
              Hệ thống câu hỏi tự thích nghi theo từng cấp độ.<br />
              Sai ở đâu — ôn ngay tại đó. Không bỏ sót một từ nào.
            </p>
            <div className="flex flex-col gap-3 mb-8 max-w-xs">
              <div className="flex items-center gap-3" data-animate data-delay="0">
                <div className="w-1 h-6 bg-[#ffdbce] rounded-full" />
                <p className="text-white/60" style={{ fontSize: '20px' }}>Câu hỏi thích nghi theo trình độ</p>
              </div>
              <div className="flex items-center gap-3" data-animate data-delay="1">
                <div className="w-1 h-6 bg-[#ffdbce] rounded-full" />
                <p className="text-white/60" style={{ fontSize: '20px' }}>Phân tích điểm yếu sau mỗi bài</p>
              </div>
              <div className="flex items-center gap-3" data-animate data-delay="2">
                <div className="w-1 h-6 bg-[#ffdbce] rounded-full" />
                <p className="text-white/60" style={{ fontSize: '20px' }}>Luyện lại từ sai tự động</p>
              </div>
            </div>
            <Link href="/quiz" className="w-fit px-6 py-2.5 bg-white text-[#72564c] font-bold rounded-lg hover:bg-[#ffdbce] transition-all" style={{ fontSize: '20px' }} data-animate data-delay="3">
              Vào Quiz ngay
            </Link>
          </div>
          <div className="absolute right-[100px] top-1/2 -translate-y-1/2 z-10 text-right">
            <p className="text-[160px] font-black text-white/5 leading-none select-none">01</p>
          </div>
        </div>

        {/* ── Interlude 01 → 02 ── */}
        <div className="h-[250px] bg-[#fafaf5] flex items-center px-[100px] justify-between border-b border-[#e8dcd4]">
          <div className="flex items-center gap-6" data-animate-lr>
            <span className="text-[80px] font-black text-[#e8dcd4] leading-none select-none">02</span>
            <div>
              <p className="uppercase tracking-widest font-bold text-[#8d6e63] mb-1" style={{ fontSize: '20px' }}>Tiếp theo</p>
              <p className="font-black text-[#1a1c19] tracking-tight" style={{ fontSize: '40px' }}>Writing Pad</p>
              <p className="text-[#8d6e63] mt-1" style={{ fontSize: '20px' }}>Luyện viết chữ Hàn bằng tay — chính xác từng nét.</p>
            </div>
          </div>
          <div className="flex items-center gap-3" data-animate-rl>
            <div className="w-2 h-2 rounded-full bg-[#72564c]" />
            <div className="w-2 h-2 rounded-full bg-[#b09488]" />
            <div className="w-2 h-2 rounded-full bg-[#e8dcd4]" />
            <div className="w-2 h-2 rounded-full bg-[#e8dcd4]" />
          </div>
        </div>

        {/* Writing */}
        <div className="relative w-full overflow-hidden" style={{ height: '840px' }}>
          <video className="absolute inset-0 w-full h-full object-cover" src="/feat-writing.mp4" autoPlay loop muted playsInline />
          <div className="absolute inset-0 bg-gradient-to-l from-black/70 via-black/40 to-transparent" />
          <div className="absolute left-[100px] top-1/2 -translate-y-1/2 z-10">
            <p className="text-[160px] font-black text-white/5 leading-none select-none">02</p>
          </div>
          <div className="relative z-10 h-full flex flex-col justify-center items-end px-[100px]">
            <p className="uppercase tracking-[0.3em] font-bold text-[#ffdbce]/80 mb-3" style={{ fontSize: '20px' }}>Tính năng 02</p>
            <h2 className="font-black text-white leading-tight tracking-tight mb-5 text-right" style={{ fontSize: '40px' }}>
              Writing Pad
            </h2>
            <p className="text-white/70 max-w-md leading-relaxed mb-8 text-right" style={{ fontSize: '20px' }}>
              Cầm bút — viết từng nét — cảm nhận chữ Hàn.<br />
              Không chỉ nhìn mà còn chạm vào ngôn ngữ.
            </p>
            <div className="flex flex-col gap-3 mb-8 items-end">
              <div className="flex items-center gap-3" data-animate data-delay="0">
                <p className="text-white/60" style={{ fontSize: '20px' }}>Nhận diện nét bút bằng AI</p>
                <div className="w-1 h-6 bg-[#ffdbce] rounded-full" />
              </div>
              <div className="flex items-center gap-3" data-animate data-delay="1">
                <p className="text-white/60" style={{ fontSize: '20px' }}>Chấm điểm theo thời gian thực</p>
                <div className="w-1 h-6 bg-[#ffdbce] rounded-full" />
              </div>
              <div className="flex items-center gap-3" data-animate data-delay="2">
                <p className="text-white/60" style={{ fontSize: '20px' }}>Lưu lịch sử từng bài luyện</p>
                <div className="w-1 h-6 bg-[#ffdbce] rounded-full" />
              </div>
            </div>
            <Link href="/writing" className="w-fit px-6 py-2.5 bg-white text-[#72564c] font-bold rounded-lg hover:bg-[#ffdbce] transition-all" style={{ fontSize: '20px' }} data-animate data-delay="3">
              Luyện viết
            </Link>
          </div>
        </div>

        {/* ── Interlude 02 → 03 ── */}
        <div className="h-[250px] bg-[#f4f0ec] flex items-center px-[100px] justify-between border-b border-[#e8dcd4]">
          <div className="flex items-center gap-6" data-animate-lr>
            <span className="text-[80px] font-black text-[#e8dcd4] leading-none select-none">03</span>
            <div>
              <p className="uppercase tracking-widest font-bold text-[#8d6e63] mb-1" style={{ fontSize: '20px' }}>Tiếp theo</p>
              <p className="font-black text-[#1a1c19] tracking-tight" style={{ fontSize: '40px' }}>Phát âm</p>
              <p className="text-[#8d6e63] mt-1" style={{ fontSize: '20px' }}>AI phân tích giọng nói — chuẩn như người bản ngữ.</p>
            </div>
          </div>
          <div className="flex items-center gap-3" data-animate-rl>
            <div className="w-2 h-2 rounded-full bg-[#e8dcd4]" />
            <div className="w-2 h-2 rounded-full bg-[#e8dcd4]" />
            <div className="w-2 h-2 rounded-full bg-[#72564c]" />
            <div className="w-2 h-2 rounded-full bg-[#b09488]" />
          </div>
        </div>

        {/* Pronunciation */}
        <div className="relative w-full overflow-hidden" style={{ height: '840px' }}>
          <video className="absolute inset-0 w-full h-full object-cover" src="/feat-pronunciation.mp4" autoPlay loop muted playsInline />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <div className="relative z-10 h-full flex flex-col justify-center px-[100px]">
            <p className="uppercase tracking-[0.3em] font-bold text-[#ffdbce]/80 mb-3" style={{ fontSize: '20px' }}>Tính năng 03</p>
            <h2 className="font-black text-white leading-tight tracking-tight mb-5" style={{ fontSize: '40px' }}>
              Phát âm
            </h2>
            <p className="text-white/70 max-w-md leading-relaxed mb-8" style={{ fontSize: '20px' }}>
              Nghe — nói — so sánh với giọng chuẩn.<br />
              AI chấm từng âm tiết, phản hồi tức thì không cần đợi chờ.
            </p>
            <div className="flex flex-col gap-3 mb-8 max-w-xs">
              <div className="flex items-center gap-3" data-animate data-delay="0">
                <div className="w-1 h-6 bg-[#ffdbce] rounded-full" />
                <p className="text-white/60" style={{ fontSize: '20px' }}>So sánh với giọng người bản ngữ</p>
              </div>
              <div className="flex items-center gap-3" data-animate data-delay="1">
                <div className="w-1 h-6 bg-[#ffdbce] rounded-full" />
                <p className="text-white/60" style={{ fontSize: '20px' }}>Điểm số độ chính xác theo %</p>
              </div>
              <div className="flex items-center gap-3" data-animate data-delay="2">
                <div className="w-1 h-6 bg-[#ffdbce] rounded-full" />
                <p className="text-white/60" style={{ fontSize: '20px' }}>Hỗ trợ Web Speech API fallback</p>
              </div>
            </div>
            <Link href="/pronunciation" className="w-fit px-6 py-2.5 bg-white text-[#72564c] font-bold rounded-lg hover:bg-[#ffdbce] transition-all" style={{ fontSize: '20px' }} data-animate data-delay="3">
              Luyện phát âm
            </Link>
          </div>
          <div className="absolute right-[100px] top-1/2 -translate-y-1/2 z-10 text-right">
            <p className="text-[160px] font-black text-white/5 leading-none select-none">03</p>
          </div>
        </div>

        {/* ── Interlude 03 → 04 ── */}
        <div className="h-[250px] bg-[#fafaf5] flex items-center px-[100px] justify-between border-b border-[#e8dcd4]">
          <div className="flex items-center gap-6" data-animate-lr>
            <span className="text-[80px] font-black text-[#e8dcd4] leading-none select-none">04</span>
            <div>
              <p className="uppercase tracking-widest font-bold text-[#8d6e63] mb-1" style={{ fontSize: '20px' }}>Tiếp theo</p>
              <p className="font-black text-[#1a1c19] tracking-tight" style={{ fontSize: '40px' }}>Tournament</p>
              <p className="text-[#8d6e63] mt-1" style={{ fontSize: '20px' }}>Thi đấu — leo hạng — trở thành số một.</p>
            </div>
          </div>
          <div className="flex items-center gap-3" data-animate-rl>
            <div className="w-2 h-2 rounded-full bg-[#e8dcd4]" />
            <div className="w-2 h-2 rounded-full bg-[#e8dcd4]" />
            <div className="w-2 h-2 rounded-full bg-[#e8dcd4]" />
            <div className="w-2 h-2 rounded-full bg-[#72564c]" />
          </div>
        </div>

        {/* Tournament */}
        <div className="relative w-full overflow-hidden" style={{ height: '840px' }}>
          <video className="absolute inset-0 w-full h-full object-cover" src="/feat-tournament.mp4" autoPlay loop muted playsInline />
          <div className="absolute inset-0 bg-gradient-to-l from-black/70 via-black/40 to-transparent" />
          <div className="absolute left-[100px] top-1/2 -translate-y-1/2 z-10">
            <p className="text-[160px] font-black text-white/5 leading-none select-none">04</p>
          </div>
          <div className="relative z-10 h-full flex flex-col justify-center items-end px-[100px]">
            <p className="uppercase tracking-[0.3em] font-bold text-[#ffdbce]/80 mb-3" style={{ fontSize: '20px' }}>Tính năng 04</p>
            <h2 className="font-black text-white leading-tight tracking-tight mb-5 text-right" style={{ fontSize: '40px' }}>
              Tournament
            </h2>
            <p className="text-white/70 max-w-md leading-relaxed mb-8 text-right" style={{ fontSize: '20px' }}>
              Đấu trường thực sự — không có chỗ cho sự dễ dãi.<br />
              Thi đấu, leo hạng và khẳng định bản thân mỗi ngày.
            </p>
            <div className="flex flex-col gap-3 mb-8 items-end">
              <div className="flex items-center gap-3" data-animate data-delay="0">
                <p className="text-white/60" style={{ fontSize: '20px' }}>4 chế độ: Quiz, Viết, Phát âm, Ghép từ</p>
                <div className="w-1 h-6 bg-[#ffdbce] rounded-full" />
              </div>
              <div className="flex items-center gap-3" data-animate data-delay="1">
                <p className="text-white/60" style={{ fontSize: '20px' }}>Bảng xếp hạng realtime</p>
                <div className="w-1 h-6 bg-[#ffdbce] rounded-full" />
              </div>
              <div className="flex items-center gap-3" data-animate data-delay="2">
                <p className="text-white/60" style={{ fontSize: '20px' }}>Tích XP — thăng hạng mỗi tuần</p>
                <div className="w-1 h-6 bg-[#ffdbce] rounded-full" />
              </div>
            </div>
            <Link href="/tournament" className="w-fit px-6 py-2.5 bg-white text-[#72564c] font-bold rounded-lg hover:bg-[#ffdbce] transition-all" style={{ fontSize: '20px' }} data-animate data-delay="3">
              Vào đấu trường
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#e8dcd4]" />

      </div>

      {/* ── Footer ── */}
      <footer className="bg-[#fafaf5] px-[100px] pt-16 pb-8 border-t border-[#e8dcd4]">
        <div className="flex justify-between items-start gap-16 mb-16">

          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="https://res.cloudinary.com/dds5jlp7e/image/upload/v1774702475/Screenshot_from_2026-03-28_19-52-57-removebg-preview_xvqdug.png"
                alt="HANGUL"
                className="w-10 h-10 object-contain"
              />
              <span className="font-black text-[#72564c] tracking-tighter uppercase" style={{ fontSize: '20px' }}>HANGUL</span>
            </div>
            <p className="text-[#8d6e63] leading-relaxed" style={{ fontSize: '20px' }}>
              Ứng dụng học tiếng Hàn thông minh.<br />
              Xây dựng thói quen — một từ một lúc.
            </p>
          </div>

          {/* Nav links */}
          <div className="flex gap-16">
            <div>
              <p className="uppercase tracking-widest font-bold text-[#8d6e63] mb-4" style={{ fontSize: '20px' }}>Học tập</p>
              <div className="flex flex-col gap-3">
                <Link href="/quiz" className="text-[#504441] hover:text-[#72564c] transition-colors" style={{ fontSize: '20px' }}>Smart Quiz</Link>
                <Link href="/writing" className="text-[#504441] hover:text-[#72564c] transition-colors" style={{ fontSize: '20px' }}>Writing Pad</Link>
                <Link href="/pronunciation" className="text-[#504441] hover:text-[#72564c] transition-colors" style={{ fontSize: '20px' }}>Phát âm</Link>
                <Link href="/vocabulary-collection" className="text-[#504441] hover:text-[#72564c] transition-colors" style={{ fontSize: '20px' }}>Từ vựng</Link>
              </div>
            </div>
            <div>
              <p className="uppercase tracking-widest font-bold text-[#8d6e63] mb-4" style={{ fontSize: '20px' }}>Thi đấu</p>
              <div className="flex flex-col gap-3">
                <Link href="/tournament" className="text-[#504441] hover:text-[#72564c] transition-colors" style={{ fontSize: '20px' }}>Tournament</Link>
                <Link href="/leaderboard" className="text-[#504441] hover:text-[#72564c] transition-colors" style={{ fontSize: '20px' }}>Bảng xếp hạng</Link>
                <Link href="/learning-map" className="text-[#504441] hover:text-[#72564c] transition-colors" style={{ fontSize: '20px' }}>Lộ trình học</Link>
              </div>
            </div>
            <div>
              <p className="uppercase tracking-widest font-bold text-[#8d6e63] mb-4" style={{ fontSize: '20px' }}>Tài khoản</p>
              <div className="flex flex-col gap-3">
                <Link href="/profile" className="text-[#504441] hover:text-[#72564c] transition-colors" style={{ fontSize: '20px' }}>Hồ sơ</Link>
                <Link href="/camera" className="text-[#504441] hover:text-[#72564c] transition-colors" style={{ fontSize: '20px' }}>Camera Scan</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between pt-8 border-t border-[#e8dcd4]">
          <p className="text-[#b09488]" style={{ fontSize: '20px' }}>© 2026 HANGUL. Ứng dụng học tiếng Hàn.</p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#72564c] animate-pulse" />
            <p className="text-[#8d6e63] font-medium" style={{ fontSize: '20px' }}>Đang hoạt động</p>
          </div>
        </div>
      </footer>

      <style>{`
        /* ── Fade up (stats, cards, video bullets/buttons) ── */
        [data-animate] {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.55s ease, transform 0.55s ease;
        }
        [data-animate].in-view {
          opacity: 1;
          transform: translateY(0);
        }
        [data-animate][data-delay="0"] { transition-delay: 0ms; }
        [data-animate][data-delay="1"] { transition-delay: 130ms; }
        [data-animate][data-delay="2"] { transition-delay: 260ms; }
        [data-animate][data-delay="3"] { transition-delay: 390ms; }
        [data-animate][data-delay="4"] { transition-delay: 520ms; }
        [data-animate][data-delay="5"] { transition-delay: 650ms; }

        /* ── Slide from left (interlude title block) ── */
        [data-animate-lr] {
          opacity: 0;
          transform: translateX(-52px);
          transition: opacity 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      transform 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        [data-animate-lr].in-view {
          opacity: 1;
          transform: translateX(0);
        }

        /* ── Slide from right (interlude dots) ── */
        [data-animate-rl] {
          opacity: 0;
          transform: translateX(52px);
          transition: opacity 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.18s,
                      transform 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.18s;
        }
        [data-animate-rl].in-view {
          opacity: 1;
          transform: translateX(0);
        }
      `}</style>

    </div>
  );
}
