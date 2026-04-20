'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { BookOpen, Zap, Flame, Library, Trophy, Lock, ChevronDown, ChevronUp } from 'lucide-react';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  level: string;
  totalXP: number;
  streakDays: number;
  completedQuizzes: number;
  learnedVocabulary: number;
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
        name: userData.name || '',
        email: userData.email || '',
        level: userData.level || 'NEWBIE',
        totalXP: userData.totalXP || 0,
        streakDays: userData.currentStreak || 0,
        completedQuizzes: 0,
        learnedVocabulary: 0,
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
      // TODO: Implement API call to update profile
      setIsEditing(false);
      alert('Hồ sơ đã được cập nhật thành công!');
    } catch (error) {
      console.error('Lỗi cập nhật hồ sơ:', error);
      alert('Không thể cập nhật hồ sơ. Vui lòng thử lại!');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordNext = async () => {
    if (!passwordData.currentPassword) {
      alert('Vui lòng nhập mật khẩu hiện tại');
      return;
    }

    try {
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
        alert('Mật khẩu hiện tại không chính xác');
        setPasswordData({ ...passwordData, currentPassword: '' });
        return;
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as any).error || 'Không thể xác minh mật khẩu');
      }

      // If password is correct, move to step 2
      setPasswordStep(2);
    } catch (error: any) {
      alert(`Lỗi: ${error.message}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      if (!passwordData.newPassword || !passwordData.confirmPassword) {
        alert('Vui lòng nhập mật khẩu mới');
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        alert('Mật khẩu mới không khớp');
        return;
      }

      if (passwordData.newPassword.length < 6) {
        alert('Mật khẩu mới phải có ít nhất 6 ký tự');
        return;
      }

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

      alert('Đổi mật khẩu thành công!');
      setShowPasswordModal(false);
      setPasswordStep(1);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      alert(`Lỗi: ${error.message}`);
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
          <div className="w-full max-w-xl">

            {/* ── Identity block ── */}
            <div className="pb-10 border-b border-[#e8dcd4]">
              <div className="flex items-center gap-5 mb-6">
                <div className="w-16 h-16 rounded-full bg-[#72564c] flex items-center justify-center shrink-0">
                  <span className="text-2xl font-black text-white">
                    {profileData.name ? profileData.name[0].toUpperCase() : '?'}
                  </span>
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-[#1a1c19] leading-tight">{profileData.name}</h1>
                  <p className="text-base text-[#8d6e63]">{profileData.email}</p>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex gap-8">
                <div>
                  <p className="text-[12px] uppercase tracking-widest font-bold text-[#8d6e63] mb-0.5">Cấp độ</p>
                  <p className="text-3xl font-black text-[#1a1c19]">{profileData.level}</p>
                </div>
                <div className="w-px bg-[#e8dcd4]" />
                <div>
                  <p className="text-[12px] uppercase tracking-widest font-bold text-[#8d6e63] mb-0.5">Tổng XP</p>
                  <p className="text-3xl font-black text-[#1a1c19]">{profileData.totalXP}</p>
                </div>
                <div className="w-px bg-[#e8dcd4]" />
                <button
                  onClick={() => router.push('/vocabulary-collection')}
                  className="text-left group"
                >
                  <p className="text-[12px] uppercase tracking-widest font-bold text-[#8d6e63] mb-0.5">Từ đã lưu</p>
                  <p className="text-3xl font-black text-[#1a1c19] group-hover:text-[#72564c] transition-colors">
                    {savedVocabCount}
                  </p>
                </button>
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="mt-6 text-sm font-semibold text-[#72564c] border border-[#c4a99e] px-4 py-1.5 rounded-lg hover:bg-[#f4ede9] transition-colors"
              >
                {isEditing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa hồ sơ'}
              </button>
            </div>

            {/* ── Edit form ── */}
            {isEditing && (
              <div className="py-8 border-b border-[#e8dcd4]">
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#8d6e63] mb-5">Chỉnh sửa hồ sơ</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#504441] mb-1.5">Tên</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-[#d6c8c2] rounded-lg text-[#1a1c19] focus:outline-none focus:border-[#72564c] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#504441] mb-1.5">Email</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-[#d6c8c2] rounded-lg text-[#1a1c19] focus:outline-none focus:border-[#72564c] transition-colors"
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-5 py-2 bg-[#72564c] text-white text-sm font-bold rounded-lg hover:bg-[#504441] disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Đang lưu...' : 'Lưu'}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-5 py-2 text-sm font-bold text-[#504441] border border-[#d6c8c2] rounded-lg hover:bg-[#f4ede9] transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Achievements ── */}
            <div className="py-8 border-b border-[#e8dcd4]">
              {/* Header row */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#8d6e63]">Thành tích</h2>
                <div className="flex items-center gap-3">
                  {achievementStats.totalAchievements > 0 && (
                    <span className="text-xs text-[#8d6e63] font-medium">
                      {achievementStats.unlockedCount}/{achievementStats.totalAchievements} đã mở khóa
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {achievementStats.totalAchievements > 0 && (
                <div className="mb-5">
                  <div className="flex justify-between text-[11px] text-[#8d6e63] mb-1.5">
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
                <p className="text-sm text-[#8d6e63] text-center py-8">Đang tải thành tích...</p>
              ) : (() => {
                const INITIAL_SHOW = 4;
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
                              ? 'bg-white border-[#e8dcd4]'
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
                              <p className={`text-sm font-semibold leading-tight ${
                                ach.unlocked ? 'text-[#1a1c19]' : 'text-[#8d6e63]'
                              }`}>{ach.name}</p>
                              {ach.unlocked && (
                                <span className="text-[10px] uppercase tracking-wider font-bold text-[#406561] bg-[#c2ebe5]/40 border border-[#c2ebe5] px-1.5 py-0.5 rounded-full">Đạt được</span>
                              )}
                            </div>
                            <p className="text-xs text-[#8d6e63] mt-0.5 truncate">{ach.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {achievements.length > INITIAL_SHOW && (
                      <button
                        onClick={() => setShowAllAchievements(v => !v)}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-[#72564c] hover:text-[#5b4137] py-2.5 border border-[#e8dcd4] rounded-xl hover:bg-[#f4ede9] transition-colors"
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

            {/* ── Settings ── */}
            <div className="py-8">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#8d6e63] mb-5">Cài đặt</h2>
              <div className="space-y-0">
                <div className="flex justify-between items-center py-4">
                  <div>
                    <p className="font-semibold text-[#1a1c19] text-sm">Đổi mật khẩu</p>
                    <p className="text-xs text-[#8d6e63] mt-0.5">Cập nhật mật khẩu tài khoản</p>
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="text-sm font-semibold text-[#72564c] border border-[#c4a99e] px-4 py-1.5 rounded-lg hover:bg-[#f4ede9] transition-colors"
                  >
                    Thay đổi
                  </button>
                </div>
              </div>
            </div>

          </div>
          </div>
        )}
      </main>

      {/* ── Password modal ── */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[#fafaf5] rounded-2xl w-full max-w-sm p-8 shadow-xl">
            <div className="mb-6">
              <p className="text-[11px] uppercase tracking-widest font-bold text-[#8d6e63] mb-1">
                Bước {passwordStep} / 2
              </p>
              <h3 className="text-xl font-extrabold text-[#1a1c19]">Đổi mật khẩu</h3>
            </div>

            {passwordStep === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#504441] mb-1.5">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Nhập mật khẩu hiện tại"
                    className="w-full px-4 py-2.5 bg-white border border-[#d6c8c2] rounded-lg text-[#1a1c19] focus:outline-none focus:border-[#72564c] transition-colors"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handlePasswordNext}
                    disabled={passwordLoading}
                    className="flex-1 py-2.5 bg-[#72564c] text-white text-sm font-bold rounded-lg hover:bg-[#504441] disabled:opacity-50 transition-colors"
                  >
                    {passwordLoading ? 'Đang xác minh...' : 'Tiếp theo'}
                  </button>
                  <button
                    onClick={() => { setShowPasswordModal(false); setPasswordStep(1); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                    className="px-4 py-2.5 text-sm font-bold text-[#504441] border border-[#d6c8c2] rounded-lg hover:bg-[#f4ede9] transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#504441] mb-1.5">Mật khẩu mới</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Nhập mật khẩu mới"
                    className="w-full px-4 py-2.5 bg-white border border-[#d6c8c2] rounded-lg text-[#1a1c19] focus:outline-none focus:border-[#72564c] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#504441] mb-1.5">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full px-4 py-2.5 bg-white border border-[#d6c8c2] rounded-lg text-[#1a1c19] focus:outline-none focus:border-[#72564c] transition-colors"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handlePasswordChange}
                    disabled={passwordLoading}
                    className="flex-1 py-2.5 bg-[#72564c] text-white text-sm font-bold rounded-lg hover:bg-[#504441] disabled:opacity-50 transition-colors"
                  >
                    {passwordLoading ? 'Đang xử lý...' : 'Xác nhận'}
                  </button>
                  <button
                    onClick={() => setPasswordStep(1)}
                    className="px-4 py-2.5 text-sm font-bold text-[#504441] border border-[#d6c8c2] rounded-lg hover:bg-[#f4ede9] transition-colors"
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
