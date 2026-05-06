'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const features = [
    { ko: '퀴', label: 'Smart Quiz', desc: 'Kiểm tra kiến thức với câu hỏi thích nghi theo tiến độ của bạn.', href: '/quiz', bg: '#ffdbce', color: '#72564c' },
    { ko: '쓰', label: 'Writing Pad', desc: 'Luyện viết chữ Hàn với nhận diện nét bút chính xác.', href: '/writing', bg: '#c2ebe5', color: '#406561' },
    { ko: '말', label: 'Phát âm', desc: 'AI đánh giá phát âm thời gian thực, giúp bạn nói chuẩn.', href: '/pronunciation', bg: '#ffddb5', color: '#815300' },
    { ko: '촬', label: 'Camera Scan', desc: 'Quét văn bản tiếng Hàn ngoài đời thực và dịch ngay.', href: '/camera', bg: '#ffdad6', color: '#ba1a1a' },
    { ko: '경', label: 'Tournament', desc: 'Thi đấu trực tiếp với người học khác và leo hạng.', href: '/tournament', bg: '#72564c', color: '#ffffff' },
  ];

  return (
    <div className="min-h-screen bg-[#fafaf5] text-[#1a1c19]">

      {/* ── Fixed Header ── */}
      <header data-form-text="" className="fixed top-0 left-0 w-full h-[75px] bg-[#fafaf5]/90 backdrop-blur-xl z-40 flex items-center justify-between px-[100px] border-b border-[#e8dcd4]">
        <div className="flex items-center gap-3">
          <img
            src="https://res.cloudinary.com/dds5jlp7e/image/upload/v1774702475/Screenshot_from_2026-03-28_19-52-57-removebg-preview_xvqdug.png"
            alt="HANGUL"
            className="w-10 h-10 object-contain"
          />
          <span className="text-xl font-black text-[#72564c] tracking-tighter uppercase">HANGUL</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-5 py-2 text-sm font-bold text-[#72564c] hover:text-[#5b4137] transition">
            Đăng nhập
          </Link>
          <Link href="/register" className="px-5 py-2 bg-[#72564c] text-white text-sm font-bold rounded-lg hover:bg-[#5b4137] transition-all">
            Bắt đầu miễn phí
          </Link>
        </div>
      </header>

      {/* ── Hero — full bleed video ── */}
      <section className="relative w-full overflow-hidden mt-[75px]" style={{ aspectRatio: '16/7' }}>
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/hero-landing.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 h-full flex flex-col justify-end items-center text-center pb-[15px]">
          <h1 className="text-8xl font-black text-white leading-[1.05] tracking-tight mb-5">
            <span className="text-[#ffdbce]">HANGUL</span>
          </h1>
          <div className="flex items-center gap-8">
            <div>
              <p className="text-[11px] uppercase tracking-widest font-bold text-white/50 mb-1">Người học</p>
              <p className="text-3xl font-black text-white">10,000+</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div>
              <p className="text-[11px] uppercase tracking-widest font-bold text-white/50 mb-1">Chủ đề</p>
              <p className="text-3xl font-black text-white">60+</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div>
              <p className="text-[11px] uppercase tracking-widest font-bold text-white/50 mb-1">Từ vựng</p>
              <p className="text-3xl font-black text-white">900+</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div>
              <p className="text-[11px] uppercase tracking-widest font-bold text-white/50 mb-1">Cấp độ</p>
              <p className="text-3xl font-black text-white">5</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section data-form-text="" className="px-[100px] py-16 border-b border-[#e8dcd4]">
        <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#8d6e63] mb-3">Tính năng</p>
        <h2 className="text-4xl font-black text-[#1a1c19] tracking-tight mb-12">
          Mọi thứ bạn cần để thành thạo tiếng Hàn
        </h2>
        <div className="grid grid-cols-5 gap-4">
          {features.map((f) => (
            <Link
              key={f.ko}
              href={f.href}
              className="group border border-[#e8dcd4] rounded-xl p-6 hover:border-[#c4a99e] hover:shadow-[0_8px_30px_rgba(114,86,76,0.08)] transition-all"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-xl font-black"
                style={{ backgroundColor: f.bg, color: f.color }}
              >
                {f.ko}
              </div>
              <p className="font-bold text-[#1a1c19] mb-2">{f.label}</p>
              <p className="text-sm text-[#8d6e63] leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section data-form-text="" className="px-[100px] py-16 border-b border-[#e8dcd4]">
        <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#8d6e63] mb-3">Cách hoạt động</p>
        <h2 className="text-4xl font-black text-[#1a1c19] tracking-tight mb-12">Ba bước đơn giản</h2>
        <div className="grid grid-cols-3 gap-12">
          <div className="border-t-2 border-[#72564c] pt-6">
            <p className="text-[11px] uppercase tracking-widest font-bold text-[#8d6e63] mb-4">Bước 01</p>
            <h3 className="text-xl font-black text-[#1a1c19] mb-3">Tạo tài khoản</h3>
            <p className="text-sm text-[#504441] leading-relaxed">
              Đăng ký miễn phí và làm bài kiểm tra trình độ để hệ thống xếp cấp phù hợp với bạn.
            </p>
          </div>
          <div className="border-t-2 border-[#8d6e63] pt-6">
            <p className="text-[11px] uppercase tracking-widest font-bold text-[#8d6e63] mb-4">Bước 02</p>
            <h3 className="text-xl font-black text-[#1a1c19] mb-3">Học theo lộ trình</h3>
            <p className="text-sm text-[#504441] leading-relaxed">
              Hệ thống gợi ý bài học phù hợp với cấp độ và mục tiêu của bạn mỗi ngày.
            </p>
          </div>
          <div className="border-t-2 border-[#c4a99e] pt-6">
            <p className="text-[11px] uppercase tracking-widest font-bold text-[#8d6e63] mb-4">Bước 03</p>
            <h3 className="text-xl font-black text-[#1a1c19] mb-3">Thi đấu & leo hạng</h3>
            <p className="text-sm text-[#504441] leading-relaxed">
              Tham gia tournament, tích XP và leo lên bảng xếp hạng với hàng nghìn người học khác.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section data-form-text="" className="px-[100px] py-20">
        <div className="bg-[#72564c] rounded-2xl px-16 py-16 flex items-center justify-between">
          <div>
            <p className="text-[13px] uppercase tracking-[0.25em] font-bold text-[#ffdbce]/70 mb-3">Sẵn sàng chưa?</p>
            <h2 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
              Bắt đầu hành trình<br />
              <span className="text-[#ffdbce]">tiếng Hàn</span> ngay hôm nay.
            </h2>
          </div>
          <div className="flex flex-col gap-4 items-end shrink-0">
            <Link
              href="/register"
              className="px-10 py-4 bg-white text-[#72564c] font-bold text-base rounded-xl hover:bg-[#ffdbce] transition-all whitespace-nowrap"
            >
              Đăng ký miễn phí
            </Link>
            <Link href="/login" className="text-sm text-white/70 hover:text-white transition underline underline-offset-4">
              Đã có tài khoản? Đăng nhập
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer data-form-text="" className="px-[100px] py-8 border-t border-[#e8dcd4]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dds5jlp7e/image/upload/v1774702475/Screenshot_from_2026-03-28_19-52-57-removebg-preview_xvqdug.png"
              alt="HANGUL"
              className="w-7 h-7 object-contain opacity-60"
            />
            <span className="text-sm font-black text-[#8d6e63] tracking-tighter uppercase">HANGUL</span>
          </div>
          <p className="text-xs text-[#8d6e63]">© 2026 HANGUL. Ứng dụng học tiếng Hàn.</p>
        </div>
      </footer>

    </div>
  );
}
