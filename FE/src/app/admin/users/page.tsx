'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Trash2, Ban, CheckCircle, TrendingUp, Trophy, RotateCcw, Edit3, X, Check, Search } from 'lucide-react';

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  level: string;
  totalXP: number;
  totalTrophy: number;
  currentStreak: number;
  isBanned: boolean;
  createdAt: string;
  lastActiveAt: string | null;
}

interface AdjustModal {
  type: 'xp' | 'trophy' | 'level';
  userId: number;
  userName: string;
}

const LEVELS = ['NEWBIE', 'BEGINNER', 'INTERMEDIATE', 'UPPER', 'ADVANCED'];
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function AdminUsers() {
  const { token } = useAuthStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBanned, setFilterBanned] = useState<'all' | 'active' | 'banned'>('all');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [modal, setModal] = useState<AdjustModal | null>(null);
  const [modalAmount, setModalAmount] = useState('');
  const [modalReason, setModalReason] = useState('');
  const [modalLevel, setModalLevel] = useState('');

  useEffect(() => { fetchUsers(); }, [token]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data.data || []);
    } catch { console.error('Failed to fetch users'); }
    finally { setLoading(false); }
  };

  const doAction = async (userId: number, path: string, method = 'POST', body?: object) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`${API}/admin/users/${userId}/${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) { const err = await res.json(); alert(err.error || 'Action failed'); return false; }
      return true;
    } catch { alert('Request failed'); return false; }
    finally { setActionLoading(null); }
  };

  const handleBan = async (user: AdminUser) => {
    const action = user.isBanned ? 'unban' : 'ban';
    const confirmed = window.confirm(
      user.isBanned ? `Mở khóa tài khoản "${user.name}"?` : `Khóa tài khoản "${user.name}"? User sẽ không đăng nhập được.`
    );
    if (!confirmed) return;
    const ok = await doAction(user.id, action);
    if (ok) setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isBanned: !u.isBanned } : u));
  };

  const handleDelete = async (user: AdminUser) => {
    const confirmed = window.confirm(`Xóa vĩnh viễn tài khoản "${user.name}" (${user.email})? Không thể hoàn tác.`);
    if (!confirmed) return;
    const ok = await doAction(user.id, '', 'DELETE');
    if (ok) setUsers(prev => prev.filter(u => u.id !== user.id));
  };

  const handleResetScore = async (user: AdminUser) => {
    const confirmed = window.confirm(`Reset toàn bộ XP, Trophy và Streak của "${user.name}" về 0?`);
    if (!confirmed) return;
    const ok = await doAction(user.id, 'reset-score');
    if (ok) setUsers(prev => prev.map(u => u.id === user.id ? { ...u, totalXP: 0, totalTrophy: 0, currentStreak: 0 } : u));
  };

  const handleModalSubmit = async () => {
    if (!modal) return;
    if (modal.type === 'level') {
      if (!modalLevel) return alert('Chọn level');
      const ok = await doAction(modal.userId, 'set-level', 'POST', { level: modalLevel });
      if (ok) { setUsers(prev => prev.map(u => u.id === modal.userId ? { ...u, level: modalLevel } : u)); closeModal(); }
      return;
    }
    const amount = parseInt(modalAmount);
    if (isNaN(amount)) return alert('Nhập số hợp lệ');
    if (!modalReason.trim()) return alert('Nhập lý do');
    const path = modal.type === 'xp' ? 'adjust-xp' : 'adjust-trophy';
    const ok = await doAction(modal.userId, path, 'POST', { amount, reason: modalReason });
    if (ok) {
      setUsers(prev => prev.map(u => {
        if (u.id !== modal.userId) return u;
        return modal.type === 'xp' ? { ...u, totalXP: u.totalXP + amount } : { ...u, totalTrophy: u.totalTrophy + amount };
      }));
      closeModal();
    }
  };

  const closeModal = () => { setModal(null); setModalAmount(''); setModalReason(''); setModalLevel(''); };

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchBan = filterBanned === 'all' || (filterBanned === 'banned' ? u.isBanned : !u.isBanned);
    return matchSearch && matchBan;
  });

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="uppercase tracking-[0.25em] font-bold text-[#8d6e63] mb-1" style={{ fontSize: '20px' }}>Quản trị</p>
          <h1 className="font-bold text-[#1a1c19]" style={{ fontSize: '20px' }}>Người dùng</h1>
        </div>
        <span className="text-[#8d6e63]" style={{ fontSize: '20px' }}>{users.length} tài khoản</span>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="flex-1 flex items-center gap-2 border border-[#e8dcd4] rounded-lg px-3 py-2.5 bg-[#fafaf5]">
          <Search size={16} className="text-[#8d6e63]" />
          <input type="text" placeholder="Tìm theo tên / email..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent flex-1 outline-none text-[#1a1c19] placeholder:text-[#b0a098]" style={{ fontSize: '20px' }} />
        </div>
        <select value={filterBanned} onChange={e => setFilterBanned(e.target.value as 'all' | 'active' | 'banned')}
          className="border border-[#e8dcd4] rounded-lg px-3 py-2.5 bg-[#fafaf5] focus:border-[#72564c] focus:outline-none" style={{ fontSize: '20px' }}>
          <option value="all">Tất cả</option>
          <option value="active">Đang hoạt động</option>
          <option value="banned">Đã khóa</option>
        </select>
      </div>

      <div className="bg-[#fafaf5] border border-[#e8dcd4] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#72564c] mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-[#8d6e63]" style={{ fontSize: '20px' }}>Không tìm thấy người dùng</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-[#e8dcd4]">
              <tr>
                {['Người dùng', 'Level', 'XP', 'Trophy', 'Streak', 'Trạng thái', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left uppercase tracking-widest font-bold text-[#8d6e63]" style={{ fontSize: '20px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} className={`border-b border-[#e8dcd4]/50 last:border-0 hover:bg-white transition ${user.isBanned ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-[#1a1c19]" style={{ fontSize: '20px' }}>{user.name}</div>
                    <div className="text-[#8d6e63]" style={{ fontSize: '20px' }}>{user.email}</div>
                    {user.role === 'ADMIN' && (
                      <span className="uppercase tracking-wider font-bold text-red-700 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full mt-0.5 inline-block" style={{ fontSize: '20px' }}>
                        Admin
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="uppercase tracking-wider font-bold text-[#72564c] bg-[#ffdbce]/40 border border-[#e4beb2] px-2.5 py-1 rounded-full" style={{ fontSize: '20px' }}>
                      {user.level}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-[#406561]" style={{ fontSize: '20px' }}>
                    {user.totalXP.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-[#815300]" style={{ fontSize: '20px' }}>
                    {user.totalTrophy.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-[#504441]" style={{ fontSize: '20px' }}>
                    {user.currentStreak}
                  </td>
                  <td className="px-5 py-3.5">
                    {user.isBanned ? (
                      <span className="uppercase tracking-wider font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full" style={{ fontSize: '20px' }}>Bị khóa</span>
                    ) : (
                      <span className="uppercase tracking-wider font-bold text-[#406561] bg-[#c2ebe5]/40 border border-[#c2ebe5] px-2 py-0.5 rounded-full" style={{ fontSize: '20px' }}>Hoạt động</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setModal({ type: 'xp', userId: user.id, userName: user.name })} title="Điều chỉnh XP"
                        disabled={actionLoading === user.id} className="p-1.5 rounded-lg hover:bg-[#e8f0f8] text-[#2c5f8a] transition">
                        <TrendingUp size={14} />
                      </button>
                      <button onClick={() => setModal({ type: 'trophy', userId: user.id, userName: user.name })} title="Điều chỉnh Trophy"
                        disabled={actionLoading === user.id} className="p-1.5 rounded-lg hover:bg-[#f8f4e8] text-[#815300] transition">
                        <Trophy size={14} />
                      </button>
                      <button onClick={() => { setModal({ type: 'level', userId: user.id, userName: user.name }); setModalLevel(user.level); }} title="Đặt Level"
                        disabled={actionLoading === user.id} className="p-1.5 rounded-lg hover:bg-[#e8dcd4] text-[#72564c] transition">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleResetScore(user)} title="Reset XP/Trophy"
                        disabled={actionLoading === user.id} className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-400 transition">
                        <RotateCcw size={14} />
                      </button>
                      <button onClick={() => handleBan(user)} title={user.isBanned ? 'Mở khóa' : 'Khóa tài khoản'}
                        disabled={actionLoading === user.id || user.role === 'ADMIN'}
                        className={`p-1.5 rounded-lg transition ${user.isBanned ? 'hover:bg-[#e8f4f0] text-[#406561]' : 'hover:bg-red-50 text-red-400'}`}>
                        {user.isBanned ? <CheckCircle size={14} /> : <Ban size={14} />}
                      </button>
                      <button onClick={() => handleDelete(user)} title="Xóa tài khoản"
                        disabled={actionLoading === user.id || user.role === 'ADMIN'}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[#fafaf5] border border-[#e8dcd4] rounded-2xl shadow-2xl p-6 w-[420px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1a1c19]" style={{ fontSize: '20px' }}>
                {modal.type === 'xp' && 'Điều chỉnh XP'}
                {modal.type === 'trophy' && 'Điều chỉnh Trophy'}
                {modal.type === 'level' && 'Đặt Level'}
              </h2>
              <button onClick={closeModal} className="p-1 text-[#8d6e63] hover:text-[#1a1c19]"><X size={18} /></button>
            </div>
            <p className="text-[#8d6e63] mb-5" style={{ fontSize: '20px' }}>User: <strong className="text-[#1a1c19]">{modal.userName}</strong></p>

            {modal.type === 'level' ? (
              <select value={modalLevel} onChange={e => setModalLevel(e.target.value)}
                className="w-full border border-[#e8dcd4] rounded-lg px-3 py-2.5 bg-white focus:border-[#72564c] focus:outline-none mb-5" style={{ fontSize: '20px' }}>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            ) : (
              <div className="space-y-3 mb-5">
                <input type="number" placeholder="Số lượng (âm để giảm, ví dụ: -100)" value={modalAmount}
                  onChange={e => setModalAmount(e.target.value)}
                  className="w-full border border-[#e8dcd4] rounded-lg px-3 py-2.5 bg-white focus:border-[#72564c] focus:outline-none" style={{ fontSize: '20px' }} />
                <input type="text" placeholder="Lý do (bắt buộc)" value={modalReason}
                  onChange={e => setModalReason(e.target.value)}
                  className="w-full border border-[#e8dcd4] rounded-lg px-3 py-2.5 bg-white focus:border-[#72564c] focus:outline-none" style={{ fontSize: '20px' }} />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={closeModal} className="px-5 py-2.5 border border-[#e8dcd4] font-medium text-[#504441] rounded-lg hover:bg-white transition" style={{ fontSize: '20px' }}>Hủy</button>
              <button onClick={handleModalSubmit} disabled={actionLoading !== null}
                className="px-5 py-2.5 bg-[#72564c] text-white font-semibold rounded-lg hover:bg-[#5b4137] flex items-center gap-1.5 disabled:opacity-50 transition" style={{ fontSize: '20px' }}>
                <Check size={14} /> Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
