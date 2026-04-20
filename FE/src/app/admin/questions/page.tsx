'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';

interface Question {
  id: number;
  questionText: string;
  difficulty: string;
  topicId: number;
  explanation?: string;
  explanation_vi?: string;
}

interface Topic {
  id: number;
  name: string;
}

const DIFF_COLORS: Record<string, string> = {
  easy:   'bg-[#e8f4f0] text-[#406561] border-[#c2ebe5]',
  medium: 'bg-[#f8f4e8] text-[#815300] border-[#ffddb5]',
  hard:   'bg-[#f8e8e8] text-[#8a2c2c] border-[#f0b8b8]',
};

export default function AdminQuestions() {
  const { token } = useAuthStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    questionText: '', options: ['', '', '', ''], correctAnswer: '',
    difficulty: 'easy', topicId: 0, explanation: '', explanation_vi: '',
  });

  const resetForm = () => ({
    questionText: '', options: ['', '', '', ''], correctAnswer: '',
    difficulty: 'easy', topicId: 0, explanation: '', explanation_vi: '',
  });

  useEffect(() => { fetchData(); }, [token, filterDifficulty]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [qRes, tRes] = await Promise.all([
        fetch(`http://localhost:5000/api/admin/questions?difficulty=${filterDifficulty}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:5000/api/topic', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setQuestions(await qRes.json());
      setTopics(await tRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId
      ? `http://localhost:5000/api/admin/questions/${editingId}`
      : 'http://localhost:5000/api/admin/questions';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, topicId: parseInt(formData.topicId.toString()) }),
      });
      if (res.ok) {
        setShowForm(false); setEditingId(null); setFormData(resetForm()); fetchData();
      } else { const err = await res.json(); alert(err.error); }
    } catch { alert('Luu that bai'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xoa cau hoi nay?')) return;
    await fetch(`http://localhost:5000/api/admin/questions/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  };

  const filtered = questions.filter(q =>
    q.questionText.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#8d6e63] mb-1">Noi dung</p>
          <h1 className="text-3xl font-bold text-[#1a1c19]">Questions</h1>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData(resetForm()); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#72564c] text-white text-sm font-semibold rounded-lg hover:bg-[#5b4137] transition"
        >
          <Plus size={16} /> Them cau hoi
        </button>
      </div>

      {showForm && (
        <div className="bg-[#fafaf5] border border-[#e8dcd4] rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-[#1a1c19]">{editingId ? 'Chinh sua' : 'Them'} cau hoi</h2>
            <button onClick={() => setShowForm(false)} className="p-1 text-[#8d6e63] hover:text-[#1a1c19]"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea placeholder="Noi dung cau hoi" value={formData.questionText}
              onChange={e => setFormData({ ...formData, questionText: e.target.value })} required
              className="w-full border border-[#e8dcd4] rounded-lg px-3 py-2.5 text-sm bg-white focus:border-[#72564c] focus:outline-none transition min-h-20 resize-none" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select value={formData.topicId} onChange={e => setFormData({ ...formData, topicId: parseInt(e.target.value) })} required
                className="border border-[#e8dcd4] rounded-lg px-3 py-2.5 text-sm bg-white focus:border-[#72564c] focus:outline-none transition">
                <option value="">Chon chu de</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={formData.difficulty} onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                className="border border-[#e8dcd4] rounded-lg px-3 py-2.5 text-sm bg-white focus:border-[#72564c] focus:outline-none transition">
                <option value="easy">De</option>
                <option value="medium">Trung binh</option>
                <option value="hard">Kho</option>
              </select>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest font-bold text-[#8d6e63] mb-2">Cac lua chon</p>
              {formData.options.map((opt, idx) => (
                <input key={idx} type="text" placeholder={`Lua chon ${idx + 1}`} value={opt} required
                  onChange={e => { const o = [...formData.options]; o[idx] = e.target.value; setFormData({ ...formData, options: o }); }}
                  className="w-full border border-[#e8dcd4] rounded-lg px-3 py-2.5 text-sm bg-white focus:border-[#72564c] focus:outline-none transition mb-2" />
              ))}
            </div>
            <input type="text" placeholder="Dap an dung (phai trung voi 1 lua chon)" value={formData.correctAnswer}
              onChange={e => setFormData({ ...formData, correctAnswer: e.target.value })} required
              className="w-full border border-[#e8dcd4] rounded-lg px-3 py-2.5 text-sm bg-white focus:border-[#72564c] focus:outline-none transition" />
            <textarea placeholder="Giai thich (tieng Anh)" value={formData.explanation}
              onChange={e => setFormData({ ...formData, explanation: e.target.value })}
              className="w-full border border-[#e8dcd4] rounded-lg px-3 py-2.5 text-sm bg-white focus:border-[#72564c] focus:outline-none transition min-h-16 resize-none" />
            <textarea placeholder="Giai thich (tieng Viet)" value={formData.explanation_vi}
              onChange={e => setFormData({ ...formData, explanation_vi: e.target.value })}
              className="w-full border border-[#e8dcd4] rounded-lg px-3 py-2.5 text-sm bg-white focus:border-[#72564c] focus:outline-none transition min-h-16 resize-none" />
            <div className="flex gap-2">
              <button type="submit" className="px-5 py-2.5 bg-[#72564c] text-white text-sm font-semibold rounded-lg hover:bg-[#5b4137] transition">Luu</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-[#e8dcd4] text-sm font-medium text-[#504441] rounded-lg hover:bg-white transition">Huy</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-3 mb-5">
        <div className="flex-1 flex items-center gap-2 border border-[#e8dcd4] rounded-lg px-3 py-2.5 bg-[#fafaf5]">
          <Search size={16} className="text-[#8d6e63]" />
          <input type="text" placeholder="Tim cau hoi..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-transparent flex-1 text-sm outline-none text-[#1a1c19] placeholder:text-[#b0a098]" />
        </div>
        <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}
          className="border border-[#e8dcd4] rounded-lg px-3 py-2.5 text-sm bg-[#fafaf5] focus:border-[#72564c] focus:outline-none">
          <option value="">Tat ca do kho</option>
          <option value="easy">De</option>
          <option value="medium">Trung binh</option>
          <option value="hard">Kho</option>
        </select>
      </div>

      <div className="bg-[#fafaf5] border border-[#e8dcd4] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#72564c] mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#8d6e63]">Chua co cau hoi nao</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-[#e8dcd4]">
              <tr>
                {['Noi dung', 'Do kho', 'Chu de', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] uppercase tracking-widest font-bold text-[#8d6e63]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-[#e8dcd4]/50 last:border-0 hover:bg-white transition">
                  <td className="px-5 py-3.5 text-sm text-[#1a1c19] max-w-xs">
                    {item.questionText.length > 60 ? item.questionText.substring(0, 60) + '...' : item.questionText}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border ${DIFF_COLORS[item.difficulty] || ''}`}>
                      {item.difficulty}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#504441]">
                    {topics.find(t => t.id === item.topicId)?.name || '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-[#e8dcd4] text-[#72564c] transition"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-4 text-xs text-[#8d6e63]">{filtered.length} cau hoi</p>
    </div>
  );
}
