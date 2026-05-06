'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface PasswordCondition {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_CONDITIONS: PasswordCondition[] = [
  { label: 'Ít nhất 8 ký tự', test: (pw) => pw.length >= 8 },
  { label: 'Có chữ hoa (A–Z)', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Có chữ thường (a–z)', test: (pw) => /[a-z]/.test(pw) },
  { label: 'Có số hoặc ký tự đặc biệt (@$!%*#?&...)', test: (pw) => /[\d@$!%*#?&]/.test(pw) },
];

type PageState = 'loading' | 'invalid' | 'form' | 'success';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [pageState, setPageState] = useState<PageState>('loading');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setPageState('invalid');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/verify-reset-token?token=${encodeURIComponent(token)}`
        );
        const data = await res.json();
        setPageState(data.valid ? 'form' : 'invalid');
      } catch {
        setPageState('invalid');
      }
    };

    verify();
  }, [token]);

  const validateForm = (): boolean => {
    let valid = true;
    setPasswordError('');
    setConfirmError('');

    if (!newPassword) {
      setPasswordError('Mật khẩu mới là bắt buộc');
      valid = false;
    } else if (!PASSWORD_CONDITIONS.every((c) => c.test(newPassword))) {
      setPasswordError('Mật khẩu chưa đáp ứng đủ yêu cầu');
      valid = false;
    }

    if (!confirmPassword) {
      setConfirmError('Vui lòng nhập lại mật khẩu');
      valid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmError('Mật khẩu không khớp');
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    setGlobalError('');
    if (!validateForm()) return;

    submittingRef.current = true;
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword }),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setGlobalError(data.error || 'Hệ thống gặp sự cố. Vui lòng thử lại.');
        return;
      }

      setPageState('success');
      // Redirect to login after 3s
      setTimeout(() => router.push('/login?reset=true'), 3000);
    } catch {
      setGlobalError('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <div
      className="bg-hangul-pattern min-h-screen text-[#1a1c19] flex items-center justify-center p-6 relative overflow-hidden"
      style={{ backgroundColor: '#fafaf5' }}
    >
      {/* Decorative Mascots */}
      <div
        className="absolute top-[15%] left-[5%] md:left-[15%] lg:left-[25%] -rotate-12 z-0"
        style={{ filter: 'drop-shadow(0 10px 20px rgba(43, 22, 15, 0.1))' }}
      >
        <img
          alt="Hana the Otter"
          className="w-32 h-32 md:w-48 md:h-48 object-contain"
          src="https://res.cloudinary.com/dds5jlp7e/image/upload/v1774702475/Screenshot_from_2026-03-28_19-52-57-removebg-preview_xvqdug.png"
        />
      </div>
      <div
        className="absolute bottom-[10%] right-[5%] md:right-[15%] lg:right-[25%] rotate-12 z-0"
        style={{ filter: 'drop-shadow(0 10px 20px rgba(43, 22, 15, 0.1))' }}
      >
        <img
          alt="Ji-woo the Otter"
          className="w-28 h-28 md:w-40 md:h-40 object-contain"
          src="https://res.cloudinary.com/dds5jlp7e/image/upload/v1774702475/Screenshot_from_2026-03-28_19-52-57-removebg-preview_xvqdug.png"
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#fafaf5]/80 backdrop-blur-xl rounded-lg shadow-[0_20px_40px_rgba(43,22,15,0.06)] p-8 md:p-12 border border-[#d4c3be]/10">
          {/* Brand Header */}
          <div className="text-center mb-10">
            <img
              src="https://res.cloudinary.com/dds5jlp7e/image/upload/v1774702475/Screenshot_from_2026-03-28_19-52-57-removebg-preview_xvqdug.png"
              alt="HANGUL Mascot"
              className="w-20 h-20 mx-auto mb-4 object-contain"
            />
            <h1 className="font-black text-4xl tracking-tighter text-[#72564c] uppercase mb-2">
              HANGUL
            </h1>
            <p className="text-[#504441] font-medium">Tạo mật khẩu mới.</p>
          </div>

          {/* Loading State */}
          {pageState === 'loading' && (
            <div className="text-center py-8">
              <div className="w-10 h-10 border-4 border-[#72564c]/20 border-t-[#72564c] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#504441] text-sm">Đang xác minh liên kết...</p>
            </div>
          )}

          {/* Invalid Token State */}
          {pageState === 'invalid' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#72564c]">Liên kết không hợp lệ</h2>
              <p className="text-sm text-[#504441]">
                Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng.
              </p>
              <Link
                href="/forgot-password"
                className="inline-block mt-2 py-3 px-6 bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white font-bold rounded-full shadow hover:shadow-md active:scale-95 transition-all"
              >
                Yêu cầu liên kết mới
              </Link>
            </div>
          )}

          {/* Form State */}
          {pageState === 'form' && (
            <>
              {/* Global Error */}
              {globalError && (
                <div className="bg-[#ffdad6] rounded-lg p-4 mb-6 border border-[#ffdad6]">
                  <p className="text-[#93000a] text-sm font-medium">{globalError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* New Password */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-[#72564c] px-1">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordError('');
                      setGlobalError('');
                    }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`w-full px-4 py-4 bg-[#e8e8e3] rounded-lg border-none focus:ring-2 focus:ring-[#72564c]/20 focus:bg-white transition-all placeholder:text-[#827470]/50 ${passwordError ? 'ring-2 ring-red-400' : ''}`}
                  />
                  {passwordError && (
                    <p className="text-[#93000a] text-xs px-1">{passwordError}</p>
                  )}

                  {/* Password Conditions */}
                  {newPassword.length > 0 && (
                    <div className="rounded-lg border border-[#e8dcd4] bg-[#fafaf5] px-4 py-3 mt-2">
                      <ul className="space-y-1">
                        {PASSWORD_CONDITIONS.map((cond, i) => {
                          const passed = cond.test(newPassword);
                          return (
                            <li key={i} className="flex items-center gap-2">
                              <span
                                className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${
                                  passed
                                    ? 'bg-green-500 text-white'
                                    : 'bg-[#e8e8e3] text-[#827470]'
                                }`}
                              >
                                {passed ? '✓' : '·'}
                              </span>
                              <span
                                className={`text-xs ${passed ? 'text-green-700' : 'text-[#504441]'}`}
                              >
                                {cond.label}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-[#72564c] px-1">
                    Xác nhận mật khẩu
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setConfirmError('');
                    }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`w-full px-4 py-4 bg-[#e8e8e3] rounded-lg border-none focus:ring-2 focus:ring-[#72564c]/20 focus:bg-white transition-all placeholder:text-[#827470]/50 ${confirmError ? 'ring-2 ring-red-400' : ''}`}
                  />
                  {confirmError && (
                    <p className="text-[#93000a] text-xs px-1">{confirmError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || submittingRef.current}
                  className="w-full py-4 bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white font-bold text-lg rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
                </button>
              </form>
            </>
          )}

          {/* Success State */}
          {pageState === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#72564c]">Mật khẩu đã được đặt lại!</h2>
              <p className="text-sm text-[#504441]">
                Mật khẩu của bạn đã được cập nhật thành công. Bạn sẽ được chuyển đến trang đăng nhập trong giây lát...
              </p>
            </div>
          )}

          {/* Back to login — only show on form/invalid states */}
          {pageState !== 'loading' && pageState !== 'success' && (
            <p className="mt-8 text-center text-[#504441] text-sm font-medium">
              <Link className="text-[#72564c] font-bold hover:underline" href="/login">
                ← Quay lại đăng nhập
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
