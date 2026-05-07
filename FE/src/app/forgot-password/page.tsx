'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [globalError, setGlobalError] = useState('');
  // Dev mode: show reset link directly
  const [devResetUrl, setDevResetUrl] = useState('');
  const submittingRef = useRef(false);

  const validate = (): boolean => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Email là bắt buộc');
      return false;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError('Email không hợp lệ');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;
    setGlobalError('');
    setDevResetUrl('');
    if (!validate()) return;

    submittingRef.current = true;
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setGlobalError(data.error || 'Hệ thống gặp sự cố. Vui lòng thử lại.');
        return;
      }

      setSubmitted(true);
      // Dev only: show link in UI
      if (data.resetUrl) {
        setDevResetUrl(data.resetUrl);
      }
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
          <div data-form-text="" className="bg-[#fafaf5]/80 backdrop-blur-xl rounded-lg shadow-[0_20px_40px_rgba(43,22,15,0.06)] p-8 md:p-12 border border-[#d4c3be]/10">
          {/* Brand Header */}
          <div className="text-center mb-10">
            <img
              src="https://res.cloudinary.com/dds5jlp7e/image/upload/v1774702475/Screenshot_from_2026-03-28_19-52-57-removebg-preview_xvqdug.png"
              alt="HANGUL Mascot"
              className="w-20 h-20 mx-auto mb-4 object-contain"
            />
            <h1 className="font-black tracking-tighter text-[#72564c] uppercase mb-2" style={{ fontSize: '40px' }}>
              HANGUL
            </h1>
            <p className="text-[#504441] font-medium">Đặt lại mật khẩu của bạn.</p>
          </div>

          {!submitted ? (
            <>
              <p className="text-sm text-[#504441] mb-6 text-center">
                Nhập email tài khoản của bạn. Chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.
              </p>

              {/* Global Error */}
              {globalError && (
                <div className="bg-[#ffdad6] rounded-lg p-4 mb-6 border border-[#ffdad6]">
                  <p className="text-[#93000a] text-sm font-medium">{globalError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-[#72564c] px-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError('');
                      setGlobalError('');
                    }}
                    placeholder="hello@otter.edu"
                    autoComplete="email"
                    className={`w-full px-4 py-4 bg-[#e8e8e3] rounded-lg border-none focus:ring-2 focus:ring-[#72564c]/20 focus:bg-white transition-all placeholder:text-[#827470]/50 ${emailError ? 'ring-2 ring-red-400' : ''}`}
                  />
                  {emailError && (
                    <p className="text-[#93000a] text-xs px-1">{emailError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || submittingRef.current}
                  className="w-full py-4 bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white font-bold text-lg rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? 'Đang xử lý...' : 'Gửi liên kết đặt lại'}
                </button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#72564c]">Kiểm tra email của bạn!</h2>
              <p className="text-sm text-[#504441]">
                Nếu email <span className="font-semibold">{email.trim()}</span> tồn tại trong hệ thống,
                bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút.
              </p>

              {/* Dev fallback: only shown when SMTP is not configured */}
              {devResetUrl && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-left">
                  <p className="text-xs font-bold text-amber-700 mb-2">
                    [DEV — SMTP chưa cấu hình] Liên kết đặt lại:
                  </p>
                  <a
                    href={devResetUrl}
                    className="text-xs text-blue-600 underline break-all"
                  >
                    {devResetUrl}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Back to login */}
          <p className="mt-8 text-center text-[#504441] text-sm font-medium">
            <Link
              className="text-[#72564c] font-bold hover:underline"
              href="/login"
            >
              ← Quay lại đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
