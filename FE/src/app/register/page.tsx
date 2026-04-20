'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { register, user } = useAuthStore();

  // 🔥 Auth Guard: Nếu đã login → redirect đến dashboard
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.email || !formData.name || !formData.password) {
      setError('Vui lòng điền đầy đủ thông tin');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu không khớp');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải tối thiểu 6 ký tự');
      setLoading(false);
      return;
    }

    try {
      await register(formData.email, formData.name, formData.password);
      router.push('/login?registered=true');
    } catch (err) {
      const error = err as Error;
      setError(error?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
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
            <p className="text-[#504441] font-medium">Join our learning journey today.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-[#ffdad6] rounded-lg p-4 mb-6 border border-[#ffdad6]">
              <p className="text-[#93000a] text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
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
                className="w-full px-4 py-4 bg-[#e8e8e3] rounded-lg border-none focus:ring-2 focus:ring-[#72564c]/20 focus:bg-white transition-all placeholder:text-[#827470]/50"
              />
            </div>

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
                className="w-full px-4 py-4 bg-[#e8e8e3] rounded-lg border-none focus:ring-2 focus:ring-[#72564c]/20 focus:bg-white transition-all placeholder:text-[#827470]/50"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-[#72564c] px-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full px-4 py-4 bg-[#e8e8e3] rounded-lg border-none focus:ring-2 focus:ring-[#72564c]/20 focus:bg-white transition-all placeholder:text-[#827470]/50"
              />
              <p className="text-xs text-[#504441] px-1">Minimum 6 characters</p>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-[#72564c] px-1">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full px-4 py-4 bg-[#e8e8e3] rounded-lg border-none focus:ring-2 focus:ring-[#72564c]/20 focus:bg-white transition-all placeholder:text-[#827470]/50"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-[#72564c] to-[#8d6e63] text-white font-bold text-lg rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Footer Link */}
          <p className="mt-10 text-center text-[#504441] text-sm font-medium">
            Already have an account?{' '}
            <Link className="text-[#72564c] font-bold hover:underline" href="/login">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
