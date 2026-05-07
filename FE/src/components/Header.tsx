'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function Header() {
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarClosing, setSidebarClosing] = useState(false);
  const totalItems = 6; // menuItems.length + possible admin
  const closeDuration = totalItems * 65 + 280; // last item delay + animation duration

  const closeSidebar = () => {
    setSidebarClosing(true);
    setTimeout(() => {
      setSidebarOpen(false);
      setSidebarClosing(false);
    }, closeDuration);
  };
  const [showGif, setShowGif] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  // Prevent hydration mismatch: auth state is client-only (Zustand)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isAdmin = mounted && user?.role === 'ADMIN';

  const menuItems = [
    { label: 'Trắc nghiệm', subtitle: 'Kiểm tra kiến thức', href: '/quiz' },
    { label: 'Từ vựng qua camera', subtitle: 'Học tập trực quan', href: '/camera' },
    { label: 'Luyện viết', subtitle: 'Viết tay', href: '/writing' },
    { label: 'Phát âm', subtitle: 'Nói và nghe', href: '/pronunciation' },
    { label: 'Lộ trình học tập', subtitle: 'Điều chỉnh cấp độ', href: '/learning-map' },
    { label: 'Giải đấu', subtitle: 'Thi đấu và xếp hạng', href: '/tournament' },
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
          onClick={() => sidebarOpen ? closeSidebar() : setSidebarOpen(true)}
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
                  className="absolute inset-0 flex items-center justify-center font-black text-white tracking-tight animate-pulse"
                  style={{
                    fontSize: '20px',
                    animation: 'slideInRight 0.5s ease-out forwards'
                  }}
                >
                  HANGUL
                </span>
              </div>
            ) : (
              <span className="font-black text-[#72564c] tracking-tight" style={{ fontSize: '20px' }}>HANGUL</span>
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-700 transition-all"
              title="Admin Panel"
              style={{ fontSize: '20px' }}
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
            onClick={closeSidebar}
          />
          
          {/* Sidebar Menu */}
          <nav className="fixed left-0 top-[75px] h-[calc(100vh-75px)] w-72 bg-white shadow-lg z-30 overflow-y-auto">
            <div className="px-4 py-6 space-y-1">
              {menuItems.map((item, index) => {
                const n = menuItems.length + (isAdmin ? 1 : 0);
                const outDelay = sidebarClosing ? (n - 1 - index) * 65 : 0;
                const inDelay = !sidebarClosing ? index * 65 : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebar}
                    className={`block px-4 py-3 rounded-lg hover:bg-[#72564c] hover:text-white transition-colors active:scale-95 text-[#72564c] font-semibold ${
                      sidebarClosing ? 'sidebar-item-out' : 'sidebar-item'
                    }`}
                    style={{ animationDelay: `${sidebarClosing ? outDelay : inDelay}ms` }}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold" style={{ fontSize: '22px' }}>{item.label}</span>
                      <span className="opacity-70 font-normal" style={{ fontSize: '18px' }}>{item.subtitle}</span>
                    </div>
                  </Link>
                );
              })}

              {/* Admin Panel — chỉ hiện cho ADMIN */}
              {isAdmin && (() => {
                const n = menuItems.length + 1;
                const outDelay = sidebarClosing ? 0 : 0;
                const inDelay = !sidebarClosing ? menuItems.length * 65 : 0;
                return (
                  <Link
                    href="/admin/dashboard"
                    onClick={closeSidebar}
                    className={`block px-4 py-3 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-700 transition-all active:scale-95 mt-2 ${
                      sidebarClosing ? 'sidebar-item-out' : 'sidebar-item'
                    }`}
                    style={{ animationDelay: `${sidebarClosing ? outDelay : inDelay}ms` }}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold">⚙️ Admin Panel</span>
                      <span className="opacity-70 font-normal" style={{ fontSize: '20px' }}>Quản trị hệ thống</span>
                    </div>
                  </Link>
                );
              })()}
            </div>
            <style>{`
              @keyframes menuItemIn {
                from { opacity: 0; transform: translateX(-22px); }
                to   { opacity: 1; transform: translateX(0); }
              }
              @keyframes menuItemOut {
                from { opacity: 1; transform: translateX(0); }
                to   { opacity: 0; transform: translateX(-22px); }
              }
              .sidebar-item {
                opacity: 0;
                animation: menuItemIn 0.28s ease forwards;
              }
              .sidebar-item-out {
                opacity: 1;
                animation: menuItemOut 0.22s ease forwards;
              }
            `}</style>
          </nav>
        </>
      )}

      {/* Padding for fixed header */}
      <div className="h-[75px]" />

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ animation: 'backdropFadeIn 0.2s ease forwards' }}>
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4 flex flex-col gap-6" style={{ animation: 'modalSlideIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
            <div className="text-center">
              <h2 className="font-bold text-[#2b160f] mb-2" style={{ fontSize: '20px' }}>Đăng xuất</h2>
              <p className="text-[#504441]" style={{ fontSize: '20px' }}>Bạn có muốn xác nhận đăng xuất không?</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 rounded-xl border-2 border-[#72564c] text-[#72564c] font-semibold hover:bg-[#f4f4ef] transition-all active:scale-95"
                style={{ fontSize: '20px' }}
              >
                Quay lại
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 rounded-xl bg-[#72564c] text-white font-semibold hover:bg-[#504441] transition-all active:scale-95"
                style={{ fontSize: '20px' }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes backdropFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes modalSlideIn {
          from { opacity: 0; transform: scale(0.85) translateY(16px); }
          to   { opacity: 1; transform: scale(1)   translateY(0); }
        }

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
