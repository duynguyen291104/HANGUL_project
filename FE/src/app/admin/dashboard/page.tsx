'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import { BookOpen, Users, Tag, Zap, ArrowRight, Trophy } from 'lucide-react';

interface TopPlayer {
  id: number;
  name: string;
  email: string;
  level: string;
  totalXP: number;
  totalTrophy: number;
  isBanned: boolean;
}

interface DashboardStats {
  totalVocab: number;
  totalUsers: number;
  totalTopics: number;
  totalXP: number;
  topPlayers: TopPlayer[];
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const RANK_COLORS = ['text-[#c49a2b]', 'text-[#8d9ba8]', 'text-[#a0734e]'];

export default function AdminDashboard() {
  const { token } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalVocab: 0,
    totalUsers: 0,
    totalTopics: 0,
    totalXP: 0,
    topPlayers: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, [token]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'TU VUNG',    value: stats.totalVocab,  icon: BookOpen, href: '/admin/vocabulary', color: 'text-[#406561]' },
    { label: 'NGUOI DUNG', value: stats.totalUsers,   icon: Users,    href: '/admin/users',      color: 'text-[#2c5f8a]' },
    { label: 'CHU DE',     value: stats.totalTopics,  icon: Tag,      href: '/admin/vocabulary', color: 'text-[#72564c]' },
    { label: 'TONG XP',    value: stats.totalXP,      icon: Zap,      href: '/admin/users',      color: 'text-[#815300]' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#72564c]" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#8d6e63] mb-1">Tong quan</p>
        <h1 className="text-3xl font-bold text-[#1a1c19]">Dashboard</h1>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, href, color }) => (
          <Link
            key={label}
            href={href}
            className="bg-[#fafaf5] border border-[#e8dcd4] rounded-xl p-5 hover:border-[#72564c] hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <Icon size={18} className={color} />
              <ArrowRight size={14} className="text-[#c9b8b0] group-hover:text-[#72564c] transition" />
            </div>
            <p className="text-2xl font-bold text-[#1a1c19] mb-1">{value.toLocaleString()}</p>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8d6e63]">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Players */}
        <div className="lg:col-span-2 bg-[#fafaf5] border border-[#e8dcd4] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#e8dcd4]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#8d6e63] mb-0.5">Bang xep hang</p>
              <h2 className="text-lg font-bold text-[#1a1c19]">Top Players</h2>
            </div>
            <Link href="/admin/tournament" className="text-xs text-[#72564c] hover:underline font-semibold flex items-center gap-1">
              Xem tat ca <ArrowRight size={12} />
            </Link>
          </div>

          {stats.topPlayers.length === 0 ? (
            <p className="text-sm text-[#8d6e63] text-center py-12">Chua co nguoi dung nao</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e8dcd4]">
                  {['', 'Nguoi dung', 'Level', 'XP', 'Trophy', 'Trang thai'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] uppercase tracking-widest font-bold text-[#8d6e63]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.topPlayers.map((p, i) => (
                  <tr key={p.id} className="border-b border-[#e8dcd4]/50 last:border-0 hover:bg-white transition">
                    <td className="px-5 py-3.5 w-10">
                      <span className={`text-sm font-bold ${RANK_COLORS[i] ?? 'text-[#8d6e63]'}`}>
                        #{i + 1}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-[#1a1c19]">{p.name}</p>
                      <p className="text-xs text-[#8d6e63]">{p.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#72564c] bg-[#ffdbce]/40 border border-[#e4beb2] px-2 py-0.5 rounded-full">
                        {p.level.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-[#406561]">{p.totalXP.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-[#815300]">{p.totalTrophy.toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      {p.isBanned ? (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">Khoa</span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-[#406561] bg-[#c2ebe5]/40 border border-[#c2ebe5] px-2 py-0.5 rounded-full">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-[#fafaf5] border border-[#e8dcd4] rounded-xl p-6">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#8d6e63] mb-0.5">Tac vu nhanh</p>
            <h2 className="text-lg font-bold text-[#1a1c19]">Quan ly</h2>
          </div>
          <div className="space-y-2">
            {[
              { href: '/admin/vocabulary', icon: BookOpen, label: 'Quan ly tu vung' },
              { href: '/admin/users',      icon: Users,    label: 'Quan ly nguoi dung' },
              { href: '/admin/tournament', icon: Trophy,   label: 'Tournament' },
            ].map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#e8dcd4] hover:border-[#72564c] hover:bg-white transition-all text-sm font-medium text-[#1a1c19] group"
              >
                <Icon size={16} className="text-[#8d6e63] group-hover:text-[#72564c]" />
                {label}
                <ArrowRight size={13} className="ml-auto text-[#c9b8b0] group-hover:text-[#72564c] transition" />
              </Link>
            ))}
          </div>

          {/* Summary note */}
          <div className="mt-6 pt-5 border-t border-[#e8dcd4]">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8d6e63] mb-3">He thong</p>
            <div className="space-y-2 text-sm text-[#504441]">
              <div className="flex justify-between">
                <span className="text-[#8d6e63]">Tu vung</span>
                <span className="font-semibold text-[#1a1c19]">{stats.totalVocab.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8d6e63]">Chu de</span>
                <span className="font-semibold text-[#1a1c19]">{stats.totalTopics.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8d6e63]">Nguoi dung</span>
                <span className="font-semibold text-[#1a1c19]">{stats.totalUsers.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8d6e63]">Tong XP toan he thong</span>
                <span className="font-semibold text-[#1a1c19]">{stats.totalXP.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
