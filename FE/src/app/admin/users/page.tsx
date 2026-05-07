'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Trash2, Ban, CheckCircle, TrendingUp, Trophy, RotateCcw, Edit3, X, Check, Search } from 'lucide-react';
import ActionDialog from '@/components/ui/ActionDialog';

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

const LEVELS = ['CỰC_CƠ_BẢN', 'SƠ_CẤP', 'TRUNG_CẤP', 'CAO_CẤP', 'THÀNH_THẠO'];
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const ITEMS_PER_PAGE = 10;

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
  const [notice, setNotice] = useState<{ id: number; type: 'success' | 'error'; message: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  useEffect(() => { fetchUsers(); }, [token]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterBanned]);

  const notify = (type: 'success' | 'error', message: string) => {
    setNotice({ id: Date.now(), type, message });
  };

  const isProtectedAdmin = (user: AdminUser) => user.role === 'ADMIN';

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data.data || []);
    } catch {
      console.error('Failed to fetch users');
      notify('error', 'Khong the tai danh sach tai khoan');
    }
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
      if (!res.ok) { const err = await res.json(); notify('error', err.error || 'Action failed'); return false; }
      return true;
    } catch { notify('error', 'Request failed'); return false; }
    finally { setActionLoading(null); }
  };

  const handleBan = async (user: AdminUser) => {
    if (isProtectedAdmin(user)) {
      notify('error', 'Khong the thao tac voi tai khoan admin');
      return;
    }
    const action = user.isBanned ? 'unban' : 'ban';
    setConfirmDialog({
      title: user.isBanned ? 'Mở khóa tài khoản' : 'Khóa tài khoản',
      message: user.isBanned
        ? `Bạn muốn mở khóa tài khoản "${user.name}"?`
        : `Bạn muốn khóa tài khoản "${user.name}"? User sẽ không đăng nhập được.`,
      danger: !user.isBanned,
      onConfirm: async () => {
        const ok = await doAction(user.id, action);
        if (ok) {
          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isBanned: !u.isBanned } : u));
          notify('success', user.isBanned ? 'Mo khoa tai khoan thanh cong' : 'Khoa tai khoan thanh cong');
        }
      },
    });
  };

  const handleDelete = async (user: AdminUser) => {
    if (isProtectedAdmin(user)) {
      notify('error', 'Khong the thao tac voi tai khoan admin');
      return;
    }
    setConfirmDialog({
      title: 'Xóa tài khoản',
      message: `Xóa vĩnh viễn tài khoản "${user.name}" (${user.email})? Hành động này không thể hoàn tác.`,
      danger: true,
      onConfirm: async () => {
        const ok = await doAction(user.id, '', 'DELETE');
        if (ok) {
          setUsers(prev => prev.filter(u => u.id !== user.id));
          notify('success', 'Xoa tai khoan thanh cong');
        }
      },
    });
  };

  const handleResetScore = async (user: AdminUser) => {
    if (isProtectedAdmin(user)) {
      notify('error', 'Khong the thao tac voi tai khoan admin');
      return;
    }
    setConfirmDialog({
      title: 'Reset điểm',
      message: `Reset toàn bộ XP, Trophy và Streak của "${user.name}" về 0?`,
      danger: true,
      onConfirm: async () => {
        const ok = await doAction(user.id, 'reset-score');
        if (ok) {
          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, totalXP: 0, totalTrophy: 0, currentStreak: 0 } : u));
          notify('success', 'Reset diem thanh cong');
        }
      },
    });
  };

  const handleModalSubmit = async () => {
    if (!modal) return;
    const targetUser = users.find(u => u.id === modal.userId);
    if (targetUser && isProtectedAdmin(targetUser)) {
      notify('error', 'Khong the thao tac voi tai khoan admin');
      closeModal();
      return;
    }
    if (modal.type === 'level') {
      if (!modalLevel) return notify('error', 'Chon level');
      const ok = await doAction(modal.userId, 'set-level', 'POST', { level: modalLevel });
      if (ok) {
        setUsers(prev => prev.map(u => u.id === modal.userId ? { ...u, level: modalLevel } : u));
        notify('success', 'Cap nhat level thanh cong');
        closeModal();
      }
      return;
    }
    const amount = parseInt(modalAmount);
    if (isNaN(amount)) return notify('error', 'Nhap so hop le');
    if (!modalReason.trim()) return notify('error', 'Nhap ly do');
    const path = modal.type === 'xp' ? 'adjust-xp' : 'adjust-trophy';
    const ok = await doAction(modal.userId, path, 'POST', { amount, reason: modalReason });
    if (ok) {
      setUsers(prev => prev.map(u => {
        if (u.id !== modal.userId) return u;
        return modal.type === 'xp' ? { ...u, totalXP: u.totalXP + amount } : { ...u, totalTrophy: u.totalTrophy + amount };
      }));
      notify('success', modal.type === 'xp' ? 'Dieu chinh XP thanh cong' : 'Dieu chinh Trophy thanh cong');
      closeModal();
    }
  };

  const closeModal = () => { setModal(null); setModalAmount(''); setModalReason(''); setModalLevel(''); };

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchBan = filterBanned === 'all' || (filterBanned === 'banned' ? u.isBanned : !u.isBanned);
    return matchSearch && matchBan;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedUsers = filtered.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );
  const startItem = filtered.length === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(safeCurrentPage * ITEMS_PER_PAGE, filtered.length);

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#8d6e63] mb-1">Quan tri</p>
          <h1 className="text-3xl font-bold text-[#1a1c19]">Nguoi dung</h1>
        </div>
        <span className="text-sm text-[#8d6e63]">{users.length} tai khoan</span>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="flex-1 flex items-center gap-2 border border-[#e8dcd4] rounded-lg px-3 py-2.5 bg-[#fafaf5]">
          <Search size={16} className="text-[#8d6e63]" />
          <input type="text" placeholder="Tim theo ten / email..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent flex-1 text-sm outline-none text-[#1a1c19] placeholder:text-[#b0a098]" />
        </div>
        <select value={filterBanned} onChange={e => setFilterBanned(e.target.value as 'all' | 'active' | 'banned')}
          className="border border-[#e8dcd4] rounded-lg px-3 py-2.5 text-sm bg-[#fafaf5] focus:border-[#72564c] focus:outline-none">
          <option value="all">Tat ca</option>
          <option value="active">Dang hoat dong</option>
          <option value="banned">Da khoa</option>
        </select>
      </div>

      <div className="bg-[#fafaf5] border border-[#e8dcd4] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#72564c] mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#8d6e63]">Khong tim thay user</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-[#e8dcd4]">
              <tr>
                {['User', 'Level', 'XP', 'Trophy', 'Streak', 'Trang thai', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] uppercase tracking-widest font-bold text-[#8d6e63]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map(user => (
                <tr key={user.id} className={`border-b border-[#e8dcd4]/50 last:border-0 hover:bg-white transition ${user.isBanned ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-sm text-[#1a1c19]">{user.name}</div>
                    <div className="text-xs text-[#8d6e63]">{user.email}</div>
                    {user.role === 'ADMIN' && (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-red-700 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">
                        Admin
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[#72564c] bg-[#ffdbce]/40 border border-[#e4beb2] px-2.5 py-1 rounded-full">
                      {user.level.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-[#406561]">
                    {user.totalXP.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-[#815300]">
                    {user.totalTrophy.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#504441]">
                    {user.currentStreak}
                  </td>
                  <td className="px-5 py-3.5">
                    {user.isBanned ? (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">Bi khoa</span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#406561] bg-[#c2ebe5]/40 border border-[#c2ebe5] px-2 py-0.5 rounded-full">Hoat dong</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setModal({ type: 'xp', userId: user.id, userName: user.name })} title="Dieu chinh XP"
                        disabled={actionLoading === user.id || isProtectedAdmin(user)} className="p-1.5 rounded-lg hover:bg-[#e8f0f8] text-[#2c5f8a] transition disabled:opacity-40 disabled:cursor-not-allowed">
                        <TrendingUp size={14} />
                      </button>
                      <button onClick={() => setModal({ type: 'trophy', userId: user.id, userName: user.name })} title="Dieu chinh Trophy"
                        disabled={actionLoading === user.id || isProtectedAdmin(user)} className="p-1.5 rounded-lg hover:bg-[#f8f4e8] text-[#815300] transition disabled:opacity-40 disabled:cursor-not-allowed">
                        <Trophy size={14} />
                      </button>
                      <button onClick={() => { setModal({ type: 'level', userId: user.id, userName: user.name }); setModalLevel(user.level); }} title="Set Level"
                        disabled={actionLoading === user.id || isProtectedAdmin(user)} className="p-1.5 rounded-lg hover:bg-[#e8dcd4] text-[#72564c] transition disabled:opacity-40 disabled:cursor-not-allowed">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleResetScore(user)} title="Reset XP/Trophy"
                        disabled={actionLoading === user.id || isProtectedAdmin(user)} className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-400 transition disabled:opacity-40 disabled:cursor-not-allowed">
                        <RotateCcw size={14} />
                      </button>
                      <button onClick={() => handleBan(user)} title={user.isBanned ? 'Mo khoa' : 'Khoa tai khoan'}
                        disabled={actionLoading === user.id || isProtectedAdmin(user)}
                        className={`p-1.5 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed ${user.isBanned ? 'hover:bg-[#e8f4f0] text-[#406561]' : 'hover:bg-red-50 text-red-400'}`}>
                        {user.isBanned ? <CheckCircle size={14} /> : <Ban size={14} />}
                      </button>
                      <button onClick={() => handleDelete(user)} title="Xoa tai khoan"
                        disabled={actionLoading === user.id || isProtectedAdmin(user)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition disabled:opacity-40 disabled:cursor-not-allowed">
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
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-[#8d6e63]">
          Hien thi {startItem}-{endItem} / {filtered.length} tai khoan
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={safeCurrentPage === 1}
            className="rounded-lg border border-[#e8dcd4] px-3 py-1.5 text-xs font-semibold text-[#504441] disabled:cursor-not-allowed disabled:opacity-50 hover:bg-white transition"
          >
            Truoc
          </button>
          <span className="text-xs font-semibold text-[#72564c]">
            Trang {safeCurrentPage}/{totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={safeCurrentPage === totalPages}
            className="rounded-lg border border-[#e8dcd4] px-3 py-1.5 text-xs font-semibold text-[#504441] disabled:cursor-not-allowed disabled:opacity-50 hover:bg-white transition"
          >
            Sau
          </button>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[#fafaf5] border border-[#e8dcd4] rounded-2xl shadow-2xl p-6 w-[420px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1a1c19] text-lg">
                {modal.type === 'xp' && 'Dieu chinh XP'}
                {modal.type === 'trophy' && 'Dieu chinh Trophy'}
                {modal.type === 'level' && 'Dat Level'}
              </h2>
              <button onClick={closeModal} className="p-1 text-[#8d6e63] hover:text-[#1a1c19]"><X size={18} /></button>
            </div>
            <p className="text-sm text-[#8d6e63] mb-5">User: <strong className="text-[#1a1c19]">{modal.userName}</strong></p>

            {modal.type === 'level' ? (
              <select value={modalLevel} onChange={e => setModalLevel(e.target.value)}
                className="w-full border border-[#e8dcd4] rounded-lg px-3 py-2.5 text-sm bg-white focus:border-[#72564c] focus:outline-none mb-5">
                {LEVELS.map(l => <option key={l} value={l}>{l.replace(/_/g, ' ')}</option>)}
              </select>
            ) : (
              <div className="space-y-3 mb-5">
                <input type="number" placeholder="So luong (am de giam, vi du: -100)" value={modalAmount}
                  onChange={e => setModalAmount(e.target.value)}
                  className="w-full border border-[#e8dcd4] rounded-lg px-3 py-2.5 text-sm bg-white focus:border-[#72564c] focus:outline-none" />
                <input type="text" placeholder="Ly do (bat buoc)" value={modalReason}
                  onChange={e => setModalReason(e.target.value)}
                  className="w-full border border-[#e8dcd4] rounded-lg px-3 py-2.5 text-sm bg-white focus:border-[#72564c] focus:outline-none" />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={closeModal} className="px-5 py-2.5 border border-[#e8dcd4] text-sm font-medium text-[#504441] rounded-lg hover:bg-white transition">Huy</button>
              <button onClick={handleModalSubmit} disabled={actionLoading !== null}
                className="px-5 py-2.5 bg-[#72564c] text-white text-sm font-semibold rounded-lg hover:bg-[#5b4137] flex items-center gap-1.5 disabled:opacity-50 transition">
                <Check size={14} /> Xac nhan
              </button>
            </div>
          </div>
        </div>
      )}
      {notice && (
        <div
          key={notice.id}
          className={`fixed right-6 top-6 z-50 min-w-[280px] max-w-[420px] rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
            notice.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-3">
            <span>{notice.message}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-xs font-bold opacity-70 hover:opacity-100"
              aria-label="Dong thong bao"
            >
              x
            </button>
          </div>
        </div>
      )}
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
    </div>
  );
}
