'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GoogleLoginButton from '@/components/GoogleLoginButton';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_STRONG = /^(?=.*[A-Za-z])(?=.*[\d@$!%*#?&]).{8,}$/;

// Tính toán các điều kiện mật khẩu
function getPasswordChecks(pw: string) {
  return {
    length:  pw.length >= 8,
    letter:  /[A-Za-z]/.test(pw),
    number:  /[0-9]/.test(pw),
    special: /[@$!%*#?&^()\-_+=]/.test(pw),
  };
}

function getStrengthLevel(checks: ReturnType<typeof getPasswordChecks>) {
  const count = Object.values(checks).filter(Boolean).length;
  if (count <= 1) return { label: 'Rất yếu', color: 'bg-red-400',   width: 'w-1/4' };
  if (count === 2) return { label: 'Yếu',     color: 'bg-orange-400', width: 'w-2/4' };
  if (count === 3) return { label: 'Trung bình', color: 'bg-yellow-400', width: 'w-3/4' };
  return                  { label: 'Mạnh',    color: 'bg-green-500',  width: 'w-full' };
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const submittingRef = useRef(false);
  const router = useRouter();
  const { register, user } = useAuthStore();

  // Auth Guard: Nếu đã login → redirect đến dashboard
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFieldErrors(prev => ({ ...prev, [name]: '' }));
    setGlobalError('');
    if (name === 'password') setPasswordTouched(true);
    if (name === 'email') setEmailAvailable(null);
  };

  // Kiểm tra email đã đăng ký chưa ngay khi user rời khỏi ô email
  const handleEmailBlur = async () => {
    const email = formData.email.trim().toLowerCase();
    if (!email || !EMAIL_REGEX.test(email)) return; // chờ validate() xử lý định dạng
    setEmailChecking(true);
    setEmailAvailable(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/auth/check-email?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.taken) {
          setEmailAvailable(false);
          setFieldErrors(prev => ({ ...prev, email: 'Tài khoản đã được đăng ký với email này' }));
        } else {
          setEmailAvailable(true);
          setFieldErrors(prev => ({ ...prev, email: '' }));
        }
      }
    } catch {
      // network error — bỏ qua, backend sẽ báo lỗi khi submit
    } finally {
      setEmailChecking(false);
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const name = formData.name.trim();       // REG-010: trim
    const email = formData.email.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    // REG-003: Họ và tên bắt buộc
    if (!name) {
      errors.name = 'Họ và tên là bắt buộc';
    } else if (name.length > 255) {
      // REG-012: vượt max
      errors.name = 'Họ và tên không được vượt quá 255 ký tự';
    }

    // REG-004: Email bắt buộc
    if (!email) {
      errors.email = 'Email là bắt buộc';
    } else if (!EMAIL_REGEX.test(email)) {
      // REG-005, REG-020: sai định dạng
      errors.email = 'Email không hợp lệ';
    }

    // REG-006: Mật khẩu bắt buộc
    if (!password) {
      errors.password = 'Mật khẩu là bắt buộc';
    } else if (password.length < 8) {
      // REG-009: ngắn hơn quy định (min 8)
      errors.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    } else if (!PASSWORD_STRONG.test(password)) {
      // REG-007: quá yếu
      errors.password = 'Mật khẩu phải có ít nhất 1 chữ cái và 1 chữ số hoặc ký tự đặc biệt';
    }

    // REG-008: xác nhận mật khẩu
    if (password && confirmPassword && password !== confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    } else if (!confirmPassword) {
      errors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // REG-017: chặn double submit
    if (submittingRef.current || loading) return;

    setGlobalError('');
    if (!validate()) return;

    submittingRef.current = true;
    setLoading(true);

    // REG-010: trim trước khi gửi
    const trimmedEmail = formData.email.trim();
    const trimmedName = formData.name.trim();

    try {
      await register(trimmedEmail, trimmedName, formData.password);
      router.push('/login?registered=true');
    } catch (err) {
      const error = err as Error;
      const msg = error?.message || '';
      // REG-002: email đã tồn tại
      if (msg.toLowerCase().includes('email already exists') || msg.toLowerCase().includes('email đã tồn tại')) {
        setFieldErrors(prev => ({ ...prev, email: 'Email đã tồn tại trong hệ thống' }));
      } else {
        setGlobalError(msg || 'Đăng ký thất bại. Vui lòng thử lại.');
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

      {/* Main Register Container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Register Card */}
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
            <p className="text-[#504441] font-medium">Bắt đầu hành trình học tiếng Hàn cùng chúng tôi.</p>
          </div>

          {/* Global Error Message */}
          {globalError && (
            <div className="bg-[#ffdad6] rounded-lg p-4 mb-6 border border-[#ffdad6]">
              <p className="text-[#93000a] text-sm font-medium">{globalError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Name Field */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-[#72564c] px-1">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
                autoComplete="name"
                maxLength={256}
                className={`w-full px-4 py-4 bg-[#e8e8e3] rounded-lg border-none focus:ring-2 focus:ring-[#72564c]/20 focus:bg-white transition-all placeholder:text-[#827470]/50 ${fieldErrors.name ? 'ring-2 ring-red-400' : ''}`}
              />
              {fieldErrors.name && <p className="text-[#93000a] text-xs px-1">{fieldErrors.name}</p>}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-[#72564c] px-1">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleEmailBlur}
                  placeholder="hello@otter.edu"
                  autoComplete="email"
                  className={`w-full px-4 py-4 bg-[#e8e8e3] rounded-lg border-none focus:ring-2 focus:bg-white transition-all placeholder:text-[#827470]/50
                    ${fieldErrors.email ? 'ring-2 ring-red-400' : ''}
                    ${emailAvailable === true && !fieldErrors.email ? 'ring-2 ring-green-400' : ''}
                    ${!fieldErrors.email && emailAvailable !== true ? 'focus:ring-[#72564c]/20' : ''}
                  `}
                />
                {/* Spinner khi đang kiểm tra */}
                {emailChecking && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin h-4 w-4 text-[#72564c]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  </span>
                )}
                {/* Icon tick xanh khi email khả dụng */}
                {!emailChecking && emailAvailable === true && !fieldErrors.email && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 text-lg leading-none">✓</span>
                )}
              </div>
              {/* Email đã tồn tại */}
              {fieldErrors.email && (
                <p className="text-[#93000a] text-xs px-1 flex items-center gap-1">
                  <span>⚠</span> {fieldErrors.email}
                </p>
              )}
              {/* Email khả dụng */}
              {!fieldErrors.email && emailAvailable === true && (
                <p className="text-green-600 text-xs px-1 flex items-center gap-1 font-medium">
                  <span>✓</span> Email khả dụng
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-[#72564c] px-1">
                Mật khẩu
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
                className={`w-full px-4 py-4 bg-[#e8e8e3] rounded-lg border-none focus:ring-2 focus:ring-[#72564c]/20 focus:bg-white transition-all placeholder:text-[#827470]/50 ${fieldErrors.password ? 'ring-2 ring-red-400' : ''}`}
              />
              {fieldErrors.password && (
                <p className="text-[#93000a] text-xs px-1">{fieldErrors.password}</p>
              )}

              {/* Bảng điều kiện mật khẩu — hiện khi user bắt đầu nhập */}
              {(passwordTouched || !!fieldErrors.password) && (() => {
                const checks = getPasswordChecks(formData.password);
                const strength = formData.password ? getStrengthLevel(checks) : null;
                const rules = [
                  { key: 'length',  label: 'Ít nhất 8 ký tự' },
                  { key: 'letter',  label: 'Có chữ cái (a–z, A–Z)' },
                  { key: 'number',  label: 'Có chữ số (0–9)' },
                  { key: 'special', label: 'Có ký tự đặc biệt (@$!%*#?&...)' },
                ] as const;
                return (
                  <div className="mt-2 rounded-lg border border-[#e8dcd4] bg-[#fafaf5] px-4 py-3 space-y-2">
                    {/* Thanh độ mạnh */}
                    {strength && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-semibold text-[#504441] tracking-wide">Độ mạnh</span>
                          <span className={`text-[10px] font-bold ${
                            strength.label === 'Mạnh' ? 'text-green-600' :
                            strength.label === 'Trung bình' ? 'text-yellow-600' :
                            strength.label === 'Yếu' ? 'text-orange-500' : 'text-red-500'
                          }`}>{strength.label}</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#e8dcd4] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                        </div>
                      </div>
                    )}
                    {/* Checklist */}
                    <ul className="space-y-1">
                      {rules.map(rule => {
                        const passed = checks[rule.key];
                        return (
                          <li key={rule.key} className="flex items-center gap-2">
                            <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              passed ? 'bg-green-500 text-white' : 'bg-[#e8dcd4] text-[#72564c]'
                            }`}>
                              {passed ? '✓' : '✗'}
                            </span>
                            <span className={`text-xs ${
                              passed ? 'text-green-700 line-through decoration-green-400 decoration-1' : 'text-[#504441]'
                            }`}>
                              {rule.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-[#72564c] px-1">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
                className={`w-full px-4 py-4 bg-[#e8e8e3] rounded-lg border-none focus:ring-2 focus:ring-[#72564c]/20 focus:bg-white transition-all placeholder:text-[#827470]/50 ${fieldErrors.confirmPassword ? 'ring-2 ring-red-400' : ''}`}
              />
              {fieldErrors.confirmPassword && <p className="text-[#93000a] text-xs px-1">{fieldErrors.confirmPassword}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || submittingRef.current}
              className="w-full py-4 bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white font-bold text-lg rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
            </button>
          </form>

          {/* Google Login Divider */}
          <div className="relative my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#d4c3be]" />
            <span className="text-xs text-[#827470] font-medium">hoặc đăng nhập nhanh</span>
            <div className="flex-1 h-px bg-[#d4c3be]" />
          </div>

          <GoogleLoginButton redirectTo="/level-selection" />

          {/* Footer Link */}
          <p className="mt-10 text-center text-[#504441] text-sm font-medium">
            Đã có tài khoản?{' '}
            <Link className="text-[#72564c] font-bold hover:underline" href="/login">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
