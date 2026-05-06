'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Ban, CheckCircle, RefreshCw, Trophy, AlertTriangle } from 'lucide-react';

interface LeaderboardEntry {
  id: number;
  name: string;
  email: string;
  level: string;
  totalTrophy: number;
  totalXP: number;
  isBanned: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function AdminTournament() {
  const { token } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => { fetchLeaderboard(); }, [token]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/admin/tournament/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLeaderboard(data.data || []);
    } catch { console.error('Failed to fetch leaderboard'); }
    finally { setLoading(false); }
  };

  const handleResetLeaderboard = async () => {
    const confirmed = window.confirm('Đặt lại toàn bộ Trophy của tất cả user về 0?\n\nHành động này bắt đầu mùa giải mới và KHÔNG THỂ HOÀN TÁC.');
    if (!confirmed) return;
    const reconfirm = window.confirm('Xác nhận lần 2: Bạn chắc chắn muốn reset leaderboard?');
    if (!reconfirm) return;
    setResetting(true);
    try {
      const res = await fetch(`${API}/admin/tournament/reset-leaderboard`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { alert('Leaderboard đã được reset. Mùa giải mới bắt đầu!'); fetchLeaderboard(); }
      else { alert('Reset thất bại'); }
    } catch { alert('Lỗi kết nối'); }
    finally { setResetting(false); }
  };

  const handleBanToggle = async (entry: LeaderboardEntry) => {
    const action = entry.isBanned ? 'unban' : 'ban';
    const label = entry.isBanned ? 'Mở khóa' : 'Khóa';
    if (!window.confirm(`${label} user "${entry.name}" khỏi tournament?`)) return;
    setActionLoading(entry.id);
    try {
      const res = await fetch(`${API}/admin/users/${entry.id}/${action}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setLeaderboard(prev => prev.map(e => e.id === entry.id ? { ...e, isBanned: !e.isBanned } : e));
    } catch { alert('Thào tác thất bại'); }
    finally { setActionLoading(null); }
  };

  const rankDisplay = (i: number) => {
    if (i === 0) return <span className="font-bold text-[#c49a2b]" style={{ fontSize: '20px' }}>#1</span>;
    if (i === 1) return <span className="font-bold text-[#8d9ba8]" style={{ fontSize: '20px' }}>#2</span>;
    if (i === 2) return <span className="font-bold text-[#a0734e]" style={{ fontSize: '20px' }}>#3</span>;
    return <span className="text-[#8d6e63]" style={{ fontSize: '20px' }}>#{i + 1}</span>;
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="uppercase tracking-[0.25em] font-bold text-[#8d6e63] mb-1" style={{ fontSize: '20px' }}>Quản trị</p>
          <h1 className="font-bold text-[#1a1c19]" style={{ fontSize: '20px' }}>Giải đấu</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLeaderboard}
            className="flex items-center gap-2 px-4 py-2.5 border border-[#e8dcd4] font-medium text-[#504441] rounded-lg hover:bg-white transition"
            style={{ fontSize: '20px' }}>
            <RefreshCw size={14} /> Làm mới
          </button>
          <button onClick={handleResetLeaderboard} disabled={resetting}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            style={{ fontSize: '20px' }}>
            <Trophy size={14} />
            {resetting ? 'Đang đặt lại...' : 'Reset Leaderboard'}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-[#fdf8f0] border border-[#f0ddb5] rounded-xl px-4 py-3 mb-6">
        <AlertTriangle size={16} className="text-[#815300] mt-0.5 flex-shrink-0" />
        <p className="text-[#815300]" style={{ fontSize: '20px' }}>
          <strong>Lưu ý:</strong> "Reset Leaderboard" sẽ đặt totalTrophy của <em>tất cả user</em> về 0, bắt đầu mùa giải mới. Hành động này không thể hoàn tác.
        </p>
      </div>

      <div className="bg-[#fafaf5] border border-[#e8dcd4] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#72564c] mx-auto" /></div>
        ) : leaderboard.length === 0 ? (
          <div className="p-12 text-center text-[#8d6e63]" style={{ fontSize: '20px' }}>Chưa có dữ liệu bảng xếp hạng</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-[#e8dcd4]">
              <tr>
                {['Hạng', 'Người chơi', 'Level', 'XP', 'Trophy', 'Trạng thái', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left uppercase tracking-widest font-bold text-[#8d6e63]" style={{ fontSize: '20px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, i) => (
                <tr key={entry.id} className={`border-b border-[#e8dcd4]/50 last:border-0 hover:bg-white transition ${entry.isBanned ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3.5 w-14 text-center">{rankDisplay(i)}</td>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-[#1a1c19]" style={{ fontSize: '20px' }}>{entry.name}</div>
                    <div className="text-[#8d6e63]" style={{ fontSize: '20px' }}>{entry.email}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="uppercase tracking-wider font-bold text-[#72564c] bg-[#ffdbce]/40 border border-[#e4beb2] px-2.5 py-1 rounded-full" style={{ fontSize: '20px' }}>
                      {entry.level}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-[#406561]" style={{ fontSize: '20px' }}>
                    {entry.totalXP.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-[#815300]" style={{ fontSize: '20px' }}>
                    {entry.totalTrophy.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5">
                    {entry.isBanned ? (
                      <span className="uppercase tracking-wider font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full" style={{ fontSize: '20px' }}>Bị khóa</span>
                    ) : (
                      <span className="uppercase tracking-wider font-bold text-[#406561] bg-[#c2ebe5]/40 border border-[#c2ebe5] px-2 py-0.5 rounded-full" style={{ fontSize: '20px' }}>Hoạt động</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end">
                      <button onClick={() => handleBanToggle(entry)} disabled={actionLoading === entry.id}
                        title={entry.isBanned ? 'Mở khóa' : 'Khóa tài khoản'}
                        className={`p-1.5 rounded-lg transition ${entry.isBanned ? 'hover:bg-[#e8f4f0] text-[#406561]' : 'hover:bg-red-50 text-red-400'}`}>
                        {entry.isBanned ? <CheckCircle size={15} /> : <Ban size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-4 text-[#8d6e63]" style={{ fontSize: '20px' }}>{leaderboard.length} người tham gia</p>
    </div>
  );
}
