'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Ban, CheckCircle, RefreshCw, Trophy, AlertTriangle } from 'lucide-react';
import ActionDialog from '@/components/ui/ActionDialog';

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
  const [dialogMessage, setDialogMessage] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

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
    setConfirmDialog({
      title: 'Reset leaderboard',
      message: 'Reset toàn bộ Trophy của tất cả user về 0? Hành động này không thể hoàn tác.',
      danger: true,
      onConfirm: async () => {
        setResetting(true);
        try {
          const res = await fetch(`${API}/admin/tournament/reset-leaderboard`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            setDialogMessage('Leaderboard đã được reset. Mùa giải mới bắt đầu!');
            fetchLeaderboard();
          } else {
            setDialogMessage('Reset thất bại.');
          }
        } catch {
          setDialogMessage('Lỗi kết nối.');
        } finally {
          setResetting(false);
        }
      },
    });
  };

  const handleBanToggle = async (entry: LeaderboardEntry) => {
    const action = entry.isBanned ? 'unban' : 'ban';
    const label = entry.isBanned ? 'Mo khoa' : 'Khoa';
    setConfirmDialog({
      title: `${label} user`,
      message: `${label} user "${entry.name}" khỏi tournament?`,
      danger: !entry.isBanned,
      onConfirm: async () => {
        setActionLoading(entry.id);
        try {
          const res = await fetch(`${API}/admin/users/${entry.id}/${action}`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            setLeaderboard(prev => prev.map(e => e.id === entry.id ? { ...e, isBanned: !e.isBanned } : e));
          } else {
            setDialogMessage('Thao tác thất bại.');
          }
        } catch {
          setDialogMessage('Thao tác thất bại.');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const rankDisplay = (i: number) => {
    if (i === 0) return <span className="text-sm font-bold text-[#c49a2b]">#1</span>;
    if (i === 1) return <span className="text-sm font-bold text-[#8d9ba8]">#2</span>;
    if (i === 2) return <span className="text-sm font-bold text-[#a0734e]">#3</span>;
    return <span className="text-sm text-[#8d6e63]">#{i + 1}</span>;
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#8d6e63] mb-1">Quan tri</p>
          <h1 className="text-3xl font-bold text-[#1a1c19]">Tournament</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLeaderboard}
            className="flex items-center gap-2 px-4 py-2.5 border border-[#e8dcd4] text-sm font-medium text-[#504441] rounded-lg hover:bg-white transition">
            <RefreshCw size={14} /> Lam moi
          </button>
          <button onClick={handleResetLeaderboard} disabled={resetting}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition disabled:opacity-50">
            <Trophy size={14} />
            {resetting ? 'Dang reset...' : 'Reset Leaderboard'}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-[#fdf8f0] border border-[#f0ddb5] rounded-xl px-4 py-3 mb-6">
        <AlertTriangle size={16} className="text-[#815300] mt-0.5 flex-shrink-0" />
        <p className="text-sm text-[#815300]">
          <strong>Luu y:</strong> "Reset Leaderboard" se dat totalTrophy cua <em>tat ca user</em> ve 0, bat dau mua giai moi. Hanh dong nay khong the hoan tac.
        </p>
      </div>

      <div className="bg-[#fafaf5] border border-[#e8dcd4] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#72564c] mx-auto" /></div>
        ) : leaderboard.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#8d6e63]">Chua co du lieu leaderboard</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-[#e8dcd4]">
              <tr>
                {['Hang', 'Player', 'Level', 'XP', 'Trophy', 'Trang thai', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] uppercase tracking-widest font-bold text-[#8d6e63]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, i) => (
                <tr key={entry.id} className={`border-b border-[#e8dcd4]/50 last:border-0 hover:bg-white transition ${entry.isBanned ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3.5 w-14 text-center">{rankDisplay(i)}</td>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-sm text-[#1a1c19]">{entry.name}</div>
                    <div className="text-xs text-[#8d6e63]">{entry.email}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[#72564c] bg-[#ffdbce]/40 border border-[#e4beb2] px-2.5 py-1 rounded-full">
                      {entry.level.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-[#406561]">
                    {entry.totalXP.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-[#815300]">
                    {entry.totalTrophy.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5">
                    {entry.isBanned ? (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">Bi khoa</span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#406561] bg-[#c2ebe5]/40 border border-[#c2ebe5] px-2 py-0.5 rounded-full">Hoat dong</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end">
                      <button onClick={() => handleBanToggle(entry)} disabled={actionLoading === entry.id}
                        title={entry.isBanned ? 'Mo khoa' : 'Khoa tai khoan'}
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
      <p className="mt-4 text-xs text-[#8d6e63]">{leaderboard.length} nguoi tham gia</p>
      <ActionDialog
        open={!!confirmDialog}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        confirmText="Xác nhận"
        danger={!!confirmDialog?.danger}
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => {
          const action = confirmDialog?.onConfirm;
          setConfirmDialog(null);
          if (action) void action();
        }}
      />
      <ActionDialog
        open={!!dialogMessage}
        title="Thông báo"
        message={dialogMessage}
        confirmText="Đóng"
        hideCancel
        onClose={() => setDialogMessage('')}
        onConfirm={() => setDialogMessage('')}
      />
    </div>
  );
}
