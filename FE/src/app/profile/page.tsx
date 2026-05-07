'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { BookOpen, Zap, Flame, Library, Trophy, Lock, ChevronDown, ChevronUp } from 'lucide-react';

interface UserProfile {
  id: number;
  publicId?: string;
  name: string;
  email: string;
  level: string;
  totalXP: number;
  streakDays: number;
  completedQuizzes: number;
  learnedVocabulary: number;
  provider?: string;
}

export default function ProfilePage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedVocabCount, setSavedVocabCount] = useState(0);
  const [achievements, setAchievements] = useState<{
    id: number;
    name: string;
    description: string;
    badge: string;
    criteria: string;
    unlocked: boolean;
  }[]>([]);
  const [achievementStats, setAchievementStats] = useState({ unlockedCount: 0, totalAchievements: 0, completionPercentage: 0 });
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordStep, setPasswordStep] = useState(1); // 1: current password, 2: new password
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [profileMsg, setProfileMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [pageVisible, setPageVisible] = useState(false);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setPageVisible(true), 60);
      return () => clearTimeout(t);
    }
  }, [loading]);
  const [profileData, setProfileData] = useState<UserProfile>({
    id: 0,
    name: user?.name || '',
    email: user?.email || '',
    level: user?.level || 'NEWBIE',
    totalXP: user?.totalXP || 0,
    streakDays: 0,
    completedQuizzes: 0,
    learnedVocabulary: 0,
  });

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    loadProfileData();
  }, [token, router]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      // Fetch fresh user data from API to get updated profile
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch profile');
      
      const userData = await response.json();
      
      setProfileData({
        id: userData.id || 0,
        publicId: userData.publicId || '',
        name: userData.name || '',
        email: userData.email || '',
        level: userData.level || 'NEWBIE',
        totalXP: userData.totalXP || 0,
        streakDays: userData.currentStreak || 0,
        completedQuizzes: 0,
        learnedVocabulary: 0,
        provider: userData.provider || 'local',
      });

      // Fetch achievements progress
      try {
        const achRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/achievements/progress`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (achRes.ok) {
          const achData = await achRes.json();
          setAchievements(achData.achievements || []);
          setAchievementStats({
            unlockedCount: achData.unlockedCount || 0,
            totalAchievements: achData.totalAchievements || 0,
            completionPercentage: achData.completionPercentage || 0,
          });
        }
      } catch { /* silent */ }

      // Fetch saved vocabulary count
      try {
        const vocabResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vocabulary/saved/collection`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (vocabResponse.ok) {
          const vocabData = await vocabResponse.json();
          setSavedVocabCount(vocabData.total || 0);
        }
      } catch (vocabError) {
        console.error('Lỗi tải số lượng từ vựng đã lưu:', vocabError);
        setSavedVocabCount(0);
      }
    } catch (error) {
      console.error('Lỗi tải dữ liệu hồ sơ:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: profileData.name }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as any).error || 'Không thể cập nhật hồ sơ');
      }

      // Sync name/email into authStore so all pages (tournament, etc.) see the new name
      if (user) {
        useAuthStore.getState().setUser({ ...user, name: profileData.name });
      }

      setIsEditing(false);
      setProfileMsg({ type: 'success', text: 'Hồ sơ đã được cập nhật thành công!' });
    } catch (error: any) {
      console.error('Lỗi cập nhật hồ sơ:', error);
      setProfileMsg({ type: 'error', text: error.message || 'Không thể cập nhật hồ sơ. Vui lòng thử lại!' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordNext = async () => {
    if (!passwordData.currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Vui lòng nhập mật khẩu hiện tại để tiếp tục.' });
      return;
    }

    try {
      setPasswordMsg(null);
      setPasswordLoading(true);

      // Verify current password with backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword: passwordData.currentPassword }),
      });

      if (response.status === 401) {
        setPasswordMsg({ type: 'error', text: 'Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra và thử lại.' });
        setPasswordData({ ...passwordData, currentPassword: '' });
        return;
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as any).error || 'Không thể xác minh mật khẩu');
      }

      // If password is correct, move to step 2
      setPasswordMsg(null);
      setPasswordStep(2);
    } catch (error: any) {
      setPasswordMsg({ type: 'error', text: `Lỗi xác minh: ${error.message}` });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Vui lòng điền đầy đủ mật khẩu mới và xác nhận mật khẩu.' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu mới và xác nhận không khớp nhau. Vui lòng kiểm tra lại.' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }

    try {
      setPasswordMsg(null);
      setPasswordLoading(true);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmPassword: passwordData.confirmPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể đổi mật khẩu');
      }

      setPasswordMsg({ type: 'success', text: 'Đổi mật khẩu thành công! Bạn có thể đóng cử sổ này.' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordStep(1);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordMsg(null);
      }, 1800);
    } catch (error: any) {
      setPasswordMsg({ type: 'error', text: `Lỗi: ${error.message}` });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf5]">
      <Header />

      <header className="pt-[70px] pl-[200px] mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#504441] tracking-tight leading-tight">
          Hồ sơ cá nhân
        </h1>
      </header>

      <main className="pl-[240px] pr-10 pb-20">
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="w-8 h-8 border-2 border-[#72564c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex justify-center">
          <div className="w-full max-w-5xl">

            {/* ── Identity block ── */}
            <div className={`pb-10 border-b border-[#e8dcd4] ${pageVisible ? 'visible' : ''}`} data-animate data-delay="1">
              <div className="flex items-center gap-5 mb-6">
                <div className="w-16 h-16 rounded-full bg-[#72564c] flex items-center justify-center shrink-0">
                  <span className="text-2xl font-black text-white">
                    {profileData.name ? profileData.name[0].toUpperCase() : '?'}
                  </span>
                </div>
                <div>
                  <h1 className="font-extrabold text-[#1a1c19] leading-tight" style={{ fontSize: '20px' }}>{profileData.name}</h1>
                  <p className="text-[#8d6e63]" style={{ fontSize: '20px' }}>{profileData.email}</p>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex gap-8">
                <div>
                  <p className="uppercase tracking-widest font-bold text-[#8d6e63] mb-0.5" style={{ fontSize: '20px' }}>Cấp độ</p>
                  <p className="font-black text-[#1a1c19]" style={{ fontSize: '20px' }}>{profileData.level}</p>
                </div>
                <div className="w-px bg-[#e8dcd4]" />
                <div>
                  <p className="uppercase tracking-widest font-bold text-[#8d6e63] mb-0.5" style={{ fontSize: '20px' }}>Tổng XP</p>
                  <p className="font-black text-[#1a1c19]" style={{ fontSize: '20px' }}>{profileData.totalXP}</p>
                </div>
                <div className="w-px bg-[#e8dcd4]" />
                <button
                  onClick={() => router.push('/vocabulary-collection')}
                  className="text-left group"
                >
                  <p className="uppercase tracking-widest font-bold text-[#8d6e63] mb-0.5" style={{ fontSize: '20px' }}>Từ đã lưu</p>
                  <p className="font-black text-[#1a1c19] group-hover:text-[#72564c] transition-colors" style={{ fontSize: '20px' }}>
                    {savedVocabCount}
                  </p>
                </button>
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="mt-6 font-semibold text-[#72564c] border border-[#c4a99e] px-4 py-1.5 rounded-lg hover:bg-[#f4ede9] transition-colors" style={{ fontSize: '20px' }}
              >
                {isEditing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa hồ sơ'}
              </button>
            </div>

            {/* ── Edit form ── */}
            {isEditing && (
              <div className="py-8 border-b border-[#e8dcd4]">
                <h2 className="font-bold uppercase tracking-widest text-[#8d6e63] mb-5" style={{ fontSize: '20px' }}>Chỉnh sửa hồ sơ</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-[#504441] mb-1.5" style={{ fontSize: '20px' }}>Tên</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-[#d6c8c2] rounded-lg text-[#1a1c19] focus:outline-none focus:border-[#72564c] transition-colors" style={{ fontSize: '20px' }}
                    />
                  </div>
                  {profileData.publicId && (
                    <div>
                      <label className="block font-semibold text-[#504441] mb-1.5" style={{ fontSize: '20px' }}>User ID</label>
                      <div
                        className="w-full px-4 py-2.5 bg-[#f4ede9] border border-[#d6c8c2] rounded-lg text-[#8d6e63] flex items-center gap-2 cursor-not-allowed select-none"
                        style={{ fontSize: '20px' }}
                        title="ID công khai của bạn — không thể thay đổi"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0 text-[#b09488]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                        <span className="flex-1 font-bold tracking-wider">{profileData.publicId}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0 text-[#b09488]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <p className="mt-1 text-[#b09488]" style={{ fontSize: '18px' }}>ID công khai dùng trên bảng xếp hạng — không thể thay đổi.</p>
                    </div>
                  )}
                  <div>
                    <label className="block font-semibold text-[#504441] mb-1.5" style={{ fontSize: '20px' }}>Email</label>
                    <div
                      className="w-full px-4 py-2.5 bg-[#f4ede9] border border-[#d6c8c2] rounded-lg text-[#8d6e63] flex items-center gap-2 cursor-not-allowed select-none"
                      style={{ fontSize: '20px' }}
                      title="Email không thể thay đổi sau khi đăng ký"
                    >
                      <span className="flex-1 truncate">{profileData.email}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0 text-[#b09488]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <p className="mt-1 text-[#b09488]" style={{ fontSize: '18px' }}>Email không thể thay đổi sau khi đăng ký.</p>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-5 py-2 bg-[#72564c] text-white font-bold rounded-lg hover:bg-[#504441] disabled:opacity-50 transition-colors" style={{ fontSize: '20px' }}
                    >
                      {saving ? 'Đang lưu...' : 'Lưu'}
                    </button>
                    <button
                      onClick={() => { setIsEditing(false); setProfileMsg(null); }}
                      className="px-5 py-2 font-bold text-[#504441] border border-[#d6c8c2] rounded-lg hover:bg-[#f4ede9] transition-colors" style={{ fontSize: '20px' }}
                    >
                      Hủy
                    </button>
                  </div>
                  {profileMsg && (
                    <p className={`mt-2 px-3 py-2 rounded-lg font-medium ${
                      profileMsg.type === 'error' ? 'bg-[#ffdad6] text-red-700' : 'bg-[#c2ebe5]/40 text-[#406561]'
                    }`} style={{ fontSize: '20px' }}>
                      {profileMsg.text}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── Two-column: Achievements + Settings ── */}
            <div className="grid grid-cols-2 gap-8 py-8 items-start">

              {/* ── Left: Achievements ── */}
              <div className={`border border-[#c4a99e] rounded-2xl p-6 bg-white ${pageVisible ? 'visible' : ''}`} data-animate data-delay="2">
                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold uppercase tracking-widest text-[#8d6e63]" style={{ fontSize: '20px' }}>Thành tích</h2>
                  {achievementStats.totalAchievements > 0 && (
                    <span className="text-[#8d6e63] font-medium" style={{ fontSize: '20px' }}>
                      {achievementStats.unlockedCount}/{achievementStats.totalAchievements} đã mở khóa
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {achievementStats.totalAchievements > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-[#8d6e63] mb-1.5" style={{ fontSize: '20px' }}>
                      <span>{achievementStats.completionPercentage}% hoàn thành</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#e8dcd4] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#72564c] rounded-full transition-all duration-700"
                        style={{ width: `${achievementStats.completionPercentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {achievements.length === 0 ? (
                  <p className="text-[#8d6e63] text-center py-8" style={{ fontSize: '20px' }}>Đang tải thành tích...</p>
                ) : (() => {
                  const INITIAL_SHOW = 2;
                  const visible = showAllAchievements ? achievements : achievements.slice(0, INITIAL_SHOW);
                  const criteriaIcon = (criteria: string, unlocked: boolean) => {
                    const cls = `w-5 h-5 ${unlocked ? 'text-[#72564c]' : 'text-[#b0a49f]'}`;
                    if (criteria === 'QUIZ_COUNT') return <BookOpen className={cls} />;
                    if (criteria === 'XP') return <Zap className={cls} />;
                    if (criteria === 'STREAK') return <Flame className={cls} />;
                    if (criteria === 'VOCAB_COUNT') return <Library className={cls} />;
                    if (criteria === 'TROPHY') return <Trophy className={cls} />;
                    return <BookOpen className={cls} />;
                  };
                  return (
                    <>
                      <div className="grid grid-cols-1 gap-2">
                        {visible.map(ach => (
                          <div
                            key={ach.id}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                              ach.unlocked
                                ? 'bg-[#fafaf5] border-[#e8dcd4]'
                                : 'bg-[#fafaf5] border-[#f0ebe6] opacity-55'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              ach.unlocked ? 'bg-[#f4ede9]' : 'bg-[#ece8e4]'
                            }`}>
                              {ach.unlocked
                                ? criteriaIcon(ach.criteria, true)
                                : <Lock className="w-4 h-4 text-[#b0a49f]" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`font-semibold leading-tight ${
                                  ach.unlocked ? 'text-[#1a1c19]' : 'text-[#8d6e63]'
                                }`} style={{ fontSize: '20px' }}>{ach.name}</p>
                                {ach.unlocked && (
                                  <span className="uppercase tracking-wider font-bold text-[#406561] bg-[#c2ebe5]/40 border border-[#c2ebe5] px-1.5 py-0.5 rounded-full" style={{ fontSize: '20px' }}>Đạt được</span>
                                )}
                              </div>
                              <p className="text-[#8d6e63] mt-0.5 truncate" style={{ fontSize: '20px' }}>{ach.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {achievements.length > INITIAL_SHOW && (
                        <button
                          onClick={() => setShowAllAchievements(v => !v)}
                          className="mt-3 w-full flex items-center justify-center gap-1.5 font-semibold text-[#72564c] hover:text-[#5b4137] py-2.5 border border-[#e8dcd4] rounded-xl hover:bg-[#f4ede9] transition-colors" style={{ fontSize: '20px' }}
                        >
                          {showAllAchievements ? (
                            <><ChevronUp className="w-3.5 h-3.5" /> Thu gọn</>
                          ) : (
                            <><ChevronDown className="w-3.5 h-3.5" /> Xem thêm ({achievements.length - INITIAL_SHOW})</>
                          )}
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* ── Right: Settings ── */}
              <div className={`border border-[#c4a99e] rounded-2xl p-6 bg-white ${pageVisible ? 'visible' : ''}`} data-animate data-delay="3">
                <h2 className="font-bold uppercase tracking-widest text-[#8d6e63] mb-5" style={{ fontSize: '20px' }}>Cài đặt</h2>
                {profileData.provider === 'google' ? (
                  /* Google account — cannot change password */
                  <div className="flex items-start gap-4 py-4 px-4 rounded-xl bg-[#f4f0ec] border border-[#e8dcd4]">
                    <div className="mt-0.5 shrink-0">
                      <svg className="w-5 h-5 text-[#8d6e63]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-[#1a1c19]" style={{ fontSize: '20px' }}>Đăng nhập bằng Google</p>
                      <p className="text-[#8d6e63] mt-1 leading-relaxed" style={{ fontSize: '20px' }}>
                        Mật khẩu của bạn được quản lý bởi Google.<br />
                        Để đổi mật khẩu, vui lòng thực hiện tại{' '}
                        <a
                          href="https://myaccount.google.com/security"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#72564c] underline hover:text-[#504441] transition-colors"
                        >
                          myaccount.google.com
                        </a>
                        .
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Local account — show change password */
                  <div className="flex justify-between items-center py-4">
                    <div>
                      <p className="font-semibold text-[#1a1c19]" style={{ fontSize: '20px' }}>Đổi mật khẩu</p>
                      <p className="text-[#8d6e63] mt-0.5" style={{ fontSize: '20px' }}>Cập nhật mật khẩu tài khoản</p>
                    </div>
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="font-semibold text-[#72564c] border border-[#c4a99e] px-4 py-1.5 rounded-lg hover:bg-[#f4ede9] transition-colors" style={{ fontSize: '20px' }}
                    >
                      Thay đổi
                    </button>
                  </div>
                )}
              </div>

            </div>

          </div>
          </div>
        )}
      </main>

      {/* ── Password modal — only for local accounts ── */}
      {showPasswordModal && profileData.provider !== 'google' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[#fafaf5] rounded-2xl w-full max-w-sm p-8 shadow-xl">
            <div className="mb-6">
              <p className="uppercase tracking-widest font-bold text-[#8d6e63] mb-1" style={{ fontSize: '20px' }}>
                Bước {passwordStep} / 2
              </p>
              <h3 className="font-extrabold text-[#1a1c19]" style={{ fontSize: '20px' }}>Đổi mật khẩu</h3>
            </div>

            {passwordStep === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-[#504441] mb-1.5" style={{ fontSize: '20px' }}>Mật khẩu hiện tại</label>
                  <p className="text-[#8d6e63] mb-2" style={{ fontSize: '20px' }}>Nhập mật khẩu bạn đang dùng để xác nhận danh tính trước khi đổi.</p>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => { setPasswordData({ ...passwordData, currentPassword: e.target.value }); setPasswordMsg(null); }}
                    placeholder="Nhập mật khẩu hiện tại"
                    className={`w-full px-4 py-2.5 bg-white border rounded-lg text-[#1a1c19] focus:outline-none transition-colors ${
                      passwordMsg?.type === 'error' ? 'border-red-400 focus:border-red-500' : 'border-[#d6c8c2] focus:border-[#72564c]'
                    }`} style={{ fontSize: '20px' }}
                  />
                  {passwordMsg && (
                    <p className={`mt-2 px-3 py-2 rounded-lg font-medium ${
                      passwordMsg.type === 'error'
                        ? 'bg-[#ffdad6] text-red-700'
                        : 'bg-[#c2ebe5]/40 text-[#406561]'
                    }`} style={{ fontSize: '20px' }}>
                      {passwordMsg.text}
                    </p>
                  )}
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handlePasswordNext}
                    disabled={passwordLoading}
                    className="flex-1 py-2.5 bg-[#72564c] text-white font-bold rounded-lg hover:bg-[#504441] disabled:opacity-50 transition-colors" style={{ fontSize: '20px' }}
                  >
                    {passwordLoading ? 'Đang xác minh...' : 'Tiếp theo'}
                  </button>
                  <button
                    onClick={() => { setShowPasswordModal(false); setPasswordStep(1); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); setPasswordMsg(null); }}
                    className="px-4 py-2.5 font-bold text-[#504441] border border-[#d6c8c2] rounded-lg hover:bg-[#f4ede9] transition-colors" style={{ fontSize: '20px' }}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-[#504441] mb-1.5" style={{ fontSize: '20px' }}>Mật khẩu mới</label>
                  <p className="text-[#8d6e63] mb-2" style={{ fontSize: '20px' }}>Tối thiểu 6 ký tự. Nên kết hợp chữ hoa, số và ký tự đặc biệt.</p>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => { setPasswordData({ ...passwordData, newPassword: e.target.value }); setPasswordMsg(null); }}
                    placeholder="Nhập mật khẩu mới"
                    className={`w-full px-4 py-2.5 bg-white border rounded-lg text-[#1a1c19] focus:outline-none transition-colors ${
                      passwordMsg?.type === 'error' ? 'border-red-400 focus:border-red-500' : 'border-[#d6c8c2] focus:border-[#72564c]'
                    }`} style={{ fontSize: '20px' }}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#504441] mb-1.5" style={{ fontSize: '20px' }}>Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => { setPasswordData({ ...passwordData, confirmPassword: e.target.value }); setPasswordMsg(null); }}
                    placeholder="Nhập lại mật khẩu mới"
                    className={`w-full px-4 py-2.5 bg-white border rounded-lg text-[#1a1c19] focus:outline-none transition-colors ${
                      passwordMsg?.type === 'error' ? 'border-red-400 focus:border-red-500' : 'border-[#d6c8c2] focus:border-[#72564c]'
                    }`} style={{ fontSize: '20px' }}
                  />
                  {passwordMsg && (
                    <p className={`mt-2 px-3 py-2 rounded-lg font-medium ${
                      passwordMsg.type === 'error'
                        ? 'bg-[#ffdad6] text-red-700'
                        : 'bg-[#c2ebe5]/40 text-[#406561]'
                    }`} style={{ fontSize: '20px' }}>
                      {passwordMsg.text}
                    </p>
                  )}
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handlePasswordChange}
                    disabled={passwordLoading || passwordMsg?.type === 'success'}
                    className="flex-1 py-2.5 bg-[#72564c] text-white font-bold rounded-lg hover:bg-[#504441] disabled:opacity-50 transition-colors" style={{ fontSize: '20px' }}
                  >
                    {passwordLoading ? 'Đang xử lý...' : 'Xác nhận'}
                  </button>
                  <button
                    onClick={() => { setPasswordStep(1); setPasswordMsg(null); }}
                    className="px-4 py-2.5 font-bold text-[#504441] border border-[#d6c8c2] rounded-lg hover:bg-[#f4ede9] transition-colors" style={{ fontSize: '20px' }}
                  >
                    Quay lại
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
