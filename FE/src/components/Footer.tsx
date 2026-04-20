import Link from 'next/link';

export default function Footer() {
  return (
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
            <span className="text-xl font-black text-[#72564c] tracking-tighter uppercase">HANGUL</span>
          </div>
          <p className="text-sm text-[#8d6e63] leading-relaxed">
            Ứng dụng học tiếng Hàn thông minh.<br />
            Xây dựng thói quen — một từ một lúc.
          </p>
        </div>

        {/* Nav links */}
        <div className="flex gap-16">
          <div>
            <p className="text-[11px] uppercase tracking-widest font-bold text-[#8d6e63] mb-4">Học tập</p>
            <div className="flex flex-col gap-3">
              <Link href="/quiz" className="text-sm text-[#504441] hover:text-[#72564c] transition-colors">Smart Quiz</Link>
              <Link href="/writing" className="text-sm text-[#504441] hover:text-[#72564c] transition-colors">Writing Pad</Link>
              <Link href="/pronunciation" className="text-sm text-[#504441] hover:text-[#72564c] transition-colors">Phát âm</Link>
              <Link href="/vocabulary-collection" className="text-sm text-[#504441] hover:text-[#72564c] transition-colors">Từ vựng</Link>
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest font-bold text-[#8d6e63] mb-4">Thi đấu</p>
            <div className="flex flex-col gap-3">
              <Link href="/tournament" className="text-sm text-[#504441] hover:text-[#72564c] transition-colors">Tournament</Link>
              <Link href="/leaderboard" className="text-sm text-[#504441] hover:text-[#72564c] transition-colors">Bảng xếp hạng</Link>
              <Link href="/learning-map" className="text-sm text-[#504441] hover:text-[#72564c] transition-colors">Lộ trình học</Link>
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest font-bold text-[#8d6e63] mb-4">Tài khoản</p>
            <div className="flex flex-col gap-3">
              <Link href="/profile" className="text-sm text-[#504441] hover:text-[#72564c] transition-colors">Hồ sơ</Link>
              <Link href="/camera" className="text-sm text-[#504441] hover:text-[#72564c] transition-colors">Camera Scan</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between pt-8 border-t border-[#e8dcd4]">
        <p className="text-xs text-[#b09488]">© 2026 HANGUL. Ứng dụng học tiếng Hàn.</p>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#72564c] animate-pulse" />
          <p className="text-xs text-[#8d6e63] font-medium">Đang hoạt động</p>
        </div>
      </div>
    </footer>
  );
}
