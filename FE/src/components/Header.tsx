'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function Header() {
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  // Prevent hydration mismatch: auth state is client-only (Zustand)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isAdmin = mounted && user?.role === 'ADMIN';

  const menuItems = [
    { label: 'Quiz', subtitle: 'Test knowledge', href: '/quiz' },
    { label: 'Camera to Vocab', subtitle: 'Visual learning', href: '/camera' },
    { label: 'Writing Practice', subtitle: 'Handwriting', href: '/writing' },
    { label: 'Pronunciation', subtitle: 'Speak & listen', href: '/pronunciation' },
    { label: 'Learning Path', subtitle: 'Adjust level', href: '/learning-map' },
    { label: 'Tournament', subtitle: 'Compete & rank', href: '/tournament' },
  ];

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleHangulClick = () => {
    router.push('/dashboard');
  };

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 left-0 w-full h-[75px] bg-white shadow-md z-40 flex items-center justify-between px-6">
        {/* Left - Hamburger Menu */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-all"
          title="Menu"
        >
          <img
            src="https://res.cloudinary.com/dds5jlp7e/image/upload/q_auto/f_auto/v1775570296/list-view_iu1k6k.png"
            alt="Menu"
            className="w-6 h-6"
          />
        </button>

        {/* Center - HANGUL Logo */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={handleHangulClick}
            onMouseEnter={() => setShowGif(true)}
            onMouseLeave={() => setShowGif(false)}
            className="hangul relative group h-[75px] flex items-center justify-center"
          >
            {showGif ? (
              <div className="relative w-[75px] h-[75px]">
                <img
                  src="/lizard-mascot.gif"
                  alt="Lizard mascot"
                  className="w-full h-full drop-shadow-lg"
                />
                <span 
                  className="absolute inset-0 flex items-center justify-center text-sm font-black text-white tracking-tight animate-pulse"
                  style={{
                    animation: 'slideInRight 0.5s ease-out forwards'
                  }}
                >
                  HANGUL
                </span>
              </div>
            ) : (
              <span className="text-3xl font-black text-[#72564c] tracking-tight">HANGUL</span>
            )}
            <style>{`
              @keyframes slideInRight {
                from {
                  opacity: 0;
                  transform: translateX(-10px);
                }
                to {
                  opacity: 1;
                  transform: translateX(0);
                }
              }
            `}</style>
          </button>
        </div>

        {/* Right - Profile & Logout */}
        <div className="flex items-center gap-3">
          {/* Admin Panel Button — only for ADMIN role */}
          {isAdmin && (
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-700 transition-all"
              title="Admin Panel"
            >
              ⚙️ Admin
            </Link>
          )}

          {/* Profile Button */}
          <Link
            href="/profile"
            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
            title="Profile"
          >
            <img
              src="https://res.cloudinary.com/dds5jlp7e/image/upload/q_auto/f_auto/v1775569881/user_bth6mn.png"
              alt="Profile"
              className="w-6 h-6"
            />
          </Link>

          {/* Logout Button */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
            title="Logout"
          >
            <img
              src="https://res.cloudinary.com/dds5jlp7e/image/upload/q_auto/f_auto/v1775569972/exit_t0ndgt.png"
              alt="Logout"
              className="w-6 h-6"
            />
          </button>
        </div>
      </header>

      {/* Sidebar */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-30 top-[75px]"
            onClick={() => setSidebarOpen(false)}
          />
          
          {/* Sidebar Menu */}
          <nav className="fixed left-0 top-[75px] h-[calc(100vh-75px)] w-72 bg-white shadow-lg z-30 overflow-y-auto">
            <div className="px-4 py-6 space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="block px-4 py-3 rounded-lg hover:bg-[#72564c] hover:text-white transition-all active:scale-95 text-[#72564c] font-semibold"
                >
                  <div className="flex flex-col">
                    <span className="font-bold">{item.label}</span>
                    <span className="text-xs opacity-70 font-normal">{item.subtitle}</span>
                  </div>
                </Link>
              ))}

              {/* Admin Panel — chỉ hiện cho ADMIN */}
              {isAdmin && (
                <Link
                  href="/admin/dashboard"
                  onClick={() => setSidebarOpen(false)}
                  className="block px-4 py-3 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-700 transition-all active:scale-95 mt-2"
                >
                  <div className="flex flex-col">
                    <span className="font-bold">⚙️ Admin Panel</span>
                    <span className="text-xs opacity-70 font-normal">Quản trị hệ thống</span>
                  </div>
                </Link>
              )}
            </div>
          </nav>
        </>
      )}

      {/* Padding for fixed header */}
      <div className="h-[75px]" />

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4 flex flex-col gap-6">
            <div className="text-center">
              <h2 className="font-bold text-xl text-[#2b160f] mb-2">Đăng xuất</h2>
              <p className="text-[#504441]">Bạn có muốn xác nhận đăng xuất không?</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 rounded-xl border-2 border-[#72564c] text-[#72564c] font-semibold hover:bg-[#f4f4ef] transition-all active:scale-95"
              >
                Quay lại
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 rounded-xl bg-[#72564c] text-white font-semibold hover:bg-[#504441] transition-all active:scale-95"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .hangul {
          cursor: pointer;
          position: relative;
          display: inline-block;
        }

        .gif-hover {
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.3s ease;
          pointer-events: none;
        }

        .hangul:hover .gif-hover {
          opacity: 1;
          transform: translateY(0);
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-bounce {
          animation: bounce 1s infinite;
        }
      `}</style>
    </>
  );
}
