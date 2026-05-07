'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BookOpen,
  Users, Trophy, LogOut, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin/dashboard',  icon: LayoutDashboard, label: 'Bảng điều khiển' },
  { href: '/admin/vocabulary', icon: BookOpen,        label: 'Từ vựng' },
  { href: '/admin/users',      icon: Users,           label: 'Người dùng' },
  { href: '/admin/tournament', icon: Trophy,          label: 'Giải đấu' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!mounted) {
    return <div className="min-h-screen bg-[#fafaf5]" />;
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf5]">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#8d6e63] mb-3">Truy cập bị từ chối</p>
          <h1 className="text-3xl font-bold text-[#1a1c19] mb-2">Không có quyền Admin</h1>
          <p className="text-[#504441] mb-6">Tài khoản của bạn không có quyền truy cập trang này.</p>
          <Link href="/" className="px-5 py-2.5 bg-[#72564c] text-white text-sm font-semibold rounded-lg hover:bg-[#5b4137] transition">
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f4f3ee]">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-[68px]'} bg-[#1a1c19] text-[#fafaf5] transition-all duration-300 flex flex-col flex-shrink-0`}>
        {/* Logo */}
        <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} px-4 py-5 border-b border-white/10`}>
          {sidebarOpen && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#72564c] font-bold mb-0.5">Admin Panel</p>
              <p className="text-lg font-black tracking-tight text-[#fafaf5]">HANGUL</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition text-[#8d6e63] hover:text-[#fafaf5]"
          >
            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center ${
                  sidebarOpen ? 'gap-3 px-3' : 'justify-center px-2'
                } py-2.5 rounded-lg transition-all font-medium ${
                  active
                    ? 'bg-[#72564c] text-white'
                    : 'text-[#a09080] hover:bg-white/10 hover:text-[#fafaf5]'
                }`}
                style={{ fontSize: '20px' }}
              >
                <Icon size={18} className="flex-shrink-0" />
                {sidebarOpen && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${
              sidebarOpen ? 'gap-3 px-3' : 'justify-center px-2'
            } py-2.5 rounded-lg hover:bg-white/10 transition text-[#a09080] hover:text-[#fafaf5]`}
            style={{ fontSize: '20px' }}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {sidebarOpen && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-[#fafaf5] border-b border-[#e8dcd4] px-6 flex items-center justify-end flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-semibold text-[#1a1c19]" style={{ fontSize: '20px' }}>{user?.name}</p>
              <p className="uppercase tracking-widest text-[#8d6e63] font-bold" style={{ fontSize: '20px' }}>Admin</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#72564c] flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-8 bg-[#f4f3ee]">
          {children}
        </main>
      </div>
    </div>
  );
}

