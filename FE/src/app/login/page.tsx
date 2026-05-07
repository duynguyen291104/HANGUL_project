'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import GoogleLoginButton from '@/components/GoogleLoginButton';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Gợi ý yêu cầu mật khẩu khi đăng nhập bị lỗi
const PASSWORD_HINTS = [
  'Tối thiểu 8 ký tự',
  'Có chữ cái (a–z, A–Z)',
  'Có chữ số hoặc ký tự đặc biệt (@$!%*#?&...)',
  'Phân biệt chữ hoa / chữ thường',
];

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  // LOG-004/005/006: per-field errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user } = useAuthStore();

  // Auth Guard: Nếu đã login → redirect theo role
  useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, router]);

  // Check if user just registered or reset password
  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccess('Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.');
    } else if (searchParams.get('reset') === 'true') {
      setSuccess('Mật khẩu đã được đặt lại thành công! Vui lòng đăng nhập.');
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setFieldErrors(prev => ({ ...prev, [name]: '' }));
    setGlobalError('');
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const email = formData.email.trim(); // LOG-011: trim
    const password = formData.password;

    // LOG-004: email bắt buộc
    if (!email) {
      errors.email = 'Email là bắt buộc';
    } else if (!EMAIL_REGEX.test(email)) {
      // LOG-007: sai định dạng
      errors.email = 'Email không hợp lệ';
    }

    // LOG-005: password bắt buộc
    if (!password) {
      errors.password = 'Mật khẩu là bắt buộc';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;

    setGlobalError('');
    setSuccess('');
    if (!validate()) return;

    submittingRef.current = true;
    setLoading(true);

    // LOG-011: trim email
    const trimmedEmail = formData.email.trim();

    // LOG-012/013: Remember Me → lưu vào localStorage hoặc sessionStorage
    // Zustand store xử lý token, ta chỉ báo cho store biết mode
    if (typeof window !== 'undefined') {
      if (formData.rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }
    }

    try {
      await login(trimmedEmail, formData.password);
      const role = useAuthStore.getState().user?.role;
      setTimeout(() => {
        if (role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else {
          router.push('/level-selection');
        }
      }, 500);
    } catch (err) {
      const error = err as Error;
      const msg = error?.message || '';
      // LOG-009: tài khoản bị khóa (suspended)
      if (msg.toLowerCase().includes('suspended') || msg.toLowerCase().includes('banned') || msg.toLowerCase().includes('khóa') || msg.toLowerCase().includes('tạm thời')) {
        setGlobalError('Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.');
      } else if (msg.toLowerCase().includes('too many') || msg.toLowerCase().includes('locked') || msg.toLowerCase().includes('nhiều lần')) {
        // LOG-010: quá nhiều lần sai
        setGlobalError('Tài khoản bị khóa tạm thời do nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.');
      } else if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials') || msg.toLowerCase().includes('không đúng')) {
        setGlobalError('Email hoặc mật khẩu không đúng');
      } else {
        setGlobalError(msg || 'Đăng nhập thất bại. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <div className="bg-hangul-pattern min-h-screen text-[#1a1c19] flex items-center justify-center p-6 relative overflow-hidden" style={{ backgroundColor: '#fafaf5' }}>
      {/* Decorative Mascots */}
      {/* Hana - Top Left */}
      <div className="absolute top-[15%] left-[5%] md:left-[15%] lg:left-[25%] -rotate-12 z-0" style={{ filter: 'drop-shadow(0 10px 20px rgba(43, 22, 15, 0.1))' }}>
        <img
          alt="Hana the Otter"
          className="w-32 h-32 md:w-48 md:h-48 object-contain"
          src="https://res.cloudinary.com/dds5jlp7e/image/upload/v1774702475/Screenshot_from_2026-03-28_19-52-57-removebg-preview_xvqdug.png"
        />
      </div>

      {/* Ji-woo - Bottom Right */}
      <div className="absolute bottom-[10%] right-[5%] md:right-[15%] lg:right-[25%] rotate-12 z-0" style={{ filter: 'drop-shadow(0 10px 20px rgba(43, 22, 15, 0.1))' }}>
        <img
          alt="Ji-woo the Otter"
          className="w-28 h-28 md:w-40 md:h-40 object-contain"
          src="https://res.cloudinary.com/dds5jlp7e/image/upload/v1774702475/Screenshot_from_2026-03-28_19-52-57-removebg-preview_xvqdug.png"
        />
      </div>

      {/* Top Right Mascot */}
      <div className="absolute top-[20%] right-[10%] -rotate-6 z-0" style={{ filter: 'drop-shadow(0 10px 20px rgba(43, 22, 15, 0.1))' }}>
        <img
          alt="Mascot Icon"
          className="w-24 h-24 md:w-36 md:h-36 object-contain"
          src="https://res.cloudinary.com/dds5jlp7e/image/upload/v1774702475/Screenshot_from_2026-03-28_19-52-57-removebg-preview_xvqdug.png"
        />
      </div>

      {/* Main Login Container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Login Card */}
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
            <p className="text-[#504441] font-medium">Hành trình thành thạo tiếng Hàn bắt đầu từ đây.</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="bg-green-100 rounded-lg p-4 mb-6 border border-green-300">
              <p className="text-green-700 text-sm font-medium">{success}</p>
            </div>
          )}

          {/* Global Error Message */}
          {globalError && (
            <div className="bg-[#ffdad6] rounded-lg p-4 mb-6 border border-[#ffdad6]">
              <p className="text-[#93000a] text-sm font-medium">{globalError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-[#72564c] px-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="hello@otter.edu"
                autoComplete="email"
                className={`w-full px-4 py-4 bg-[#e8e8e3] rounded-lg border-none focus:ring-2 focus:ring-[#72564c]/20 focus:bg-white transition-all placeholder:text-[#827470]/50 ${fieldErrors.email ? 'ring-2 ring-red-400' : ''}`}
              />
              {fieldErrors.email && <p className="text-[#93000a] text-xs px-1">{fieldErrors.email}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="block text-sm font-bold text-[#72564c]">
                  Mật khẩu
                </label>
                <Link className="text-xs font-bold text-[#815300] hover:underline" href="/forgot-password">
                  Quên mật khẩu?
                </Link>
              </div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`w-full px-4 py-4 bg-[#e8e8e3] rounded-lg border-none focus:ring-2 focus:ring-[#72564c]/20 focus:bg-white transition-all placeholder:text-[#827470]/50 ${fieldErrors.password ? 'ring-2 ring-red-400' : ''}`}
              />
              {/* Lỗi để trống */}
              {fieldErrors.password && (
                <p className="text-[#93000a] text-xs px-1">{fieldErrors.password}</p>
              )}
              {/* Gợi ý yêu cầu khi đăng nhập sai mật khẩu */}
              {(globalError.includes('không đúng') || globalError.includes('sai')) && (
                <div className="mt-2 rounded-lg border border-[#e8dcd4] bg-[#fafaf5] px-4 py-3">
                  <p className="text-xs font-semibold text-[#72564c] mb-2">ửe Yêu cầu mật khẩu:</p>
                  <ul className="space-y-1">
                    {PASSWORD_HINTS.map((hint, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#72564c]" />
                        <span className="text-xs text-[#504441]">{hint}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* LOG-012/013: Remember Me */}
            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="w-4 h-4 accent-[#72564c] cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-sm text-[#504441] cursor-pointer select-none">
                Ghi nhớ đăng nhập
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || submittingRef.current}
              className="w-full py-4 bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white font-bold text-lg rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          {/* Google Login Divider */}
          <div className="relative my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#d4c3be]" />
            <span className="text-xs text-[#827470] font-medium">hoặc</span>
            <div className="flex-1 h-px bg-[#d4c3be]" />
          </div>

          <GoogleLoginButton redirectTo="/level-selection" />

          {/* Footer Link */}
          <p className="mt-10 text-center text-[#504441] text-sm font-medium">
            Chưa có tài khoản?{' '}
            <Link className="text-[#72564c] font-bold hover:underline" href="/register">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
