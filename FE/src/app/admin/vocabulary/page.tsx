'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';

interface Vocabulary {
  id: number;
  korean: string;
  english: string;
  vietnamese: string;
  level: string;
  topicId: number;
}

interface Topic {
  id: number;
  name: string;
  level: string;
}

const LEVELS = ['NEWBIE', 'BEGINNER', 'INTERMEDIATE', 'UPPER', 'ADVANCED'];

const LEVEL_COLORS: Record<string, string> = {
  NEWBIE:       'bg-[#e8f4f0] text-[#406561] border-[#c2ebe5]',
  BEGINNER:     'bg-[#e8f0f8] text-[#2c5f8a] border-[#b8d4f0]',
  INTERMEDIATE: 'bg-[#f8f0e8] text-[#72564c] border-[#e4beb2]',
  UPPER:        'bg-[#f8f4e8] text-[#815300] border-[#ffddb5]',
  ADVANCED:     'bg-[#f8e8e8] text-[#8a2c2c] border-[#f0b8b8]',
};

export default function AdminVocabulary() {
  const { token } = useAuthStore();
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    korean: '', english: '', vietnamese: '', level: 'NEWBIE', topicId: 0,
  });

  useEffect(() => { fetchData(); }, [token, filterLevel]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vocabRes, topicsRes] = await Promise.all([
        fetch(`http://localhost:5000/api/admin/vocabulary?level=${filterLevel}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:5000/api/topic', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setVocabulary(await vocabRes.json());
      setTopics(await topicsRes.json());
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
      ? `http://localhost:5000/api/admin/vocabulary/${editingId}`
      : 'http://localhost:5000/api/admin/vocabulary';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, topicId: parseInt(formData.topicId.toString()) }),
      });
      if (res.ok) {
        setShowForm(false);
        setEditingId(null);
        setFormData({ korean: '', english: '', vietnamese: '', level: 'NEWBIE', topicId: 0 });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch { alert('Luu that bai'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xoa tu vung nay?')) return;
    await fetch(`http://localhost:5000/api/admin/vocabulary/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchData();
  };

  const filtered = vocabulary.filter(v =>
    v.korean.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.english.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#8d6e63] mb-1">Noi dung</p>
          <h1 className="text-3xl font-bold text-[#1a1c19]">Vocabulary</h1>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ korean: '', english: '', vietnamese: '', level: 'NEWBIE', topicId: 0 }); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#72564c] text-white text-sm font-semibold rounded-lg hover:bg-[#5b4137] transition"
        >
          <Plus size={16} /> Them moi
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-[#fafaf5] border border-[#e8dcd4] rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-[#1a1c19]">{editingId ? 'Chinh sua' : 'Them moi'} tu vung</h2>
            <button onClick={() => setShowForm(false)} className="p-1 text-[#8d6e63] hover:text-[#1a1c19]"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="text" placeholder="Tieng Han" value={formData.korean}
                onChange={e => setFormData({ ...formData, korean: e.target.value })} required
                className="border border-[#e8dcd4] rounded-lg px-3 py-2.5 text-sm bg-white focus:border-[#72564c] focus:outline-none transition" />
              <input type="text" placeholder="Tieng Anh" value={formData.english}
                onChange={e => setFormData({ ...formData, english: e.target.value })} required
                className="border border-[#e8dcd4] rounded-lg px-3 py-2.5 text-sm bg-white focus:border-[#72564c] focus:outline-none transition" />
              <input type="text" placeholder="Tieng Viet" value={formData.vietnamese}
                onChange={e => setFormData({ ...formData, vietnamese: e.target.value })}
                className="border border-[#e8dcd4] rounded-lg px-3 py-2.5 text-sm bg-white focus:border-[#72564c] focus:outline-none transition" />
              <select value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value })}
                className="border border-[#e8dcd4] rounded-lg px-3 py-2.5 text-sm bg-white focus:border-[#72564c] focus:outline-none transition">
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select value={formData.topicId} onChange={e => setFormData({ ...formData, topicId: parseInt(e.target.value) })} required
                className="border border-[#e8dcd4] rounded-lg px-3 py-2.5 text-sm bg-white focus:border-[#72564c] focus:outline-none transition col-span-2">
                <option value="">Chon chu de</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-5 py-2.5 bg-[#72564c] text-white text-sm font-semibold rounded-lg hover:bg-[#5b4137] transition">Luu</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-[#e8dcd4] text-sm font-medium text-[#504441] rounded-lg hover:bg-white transition">Huy</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 flex items-center gap-2 border border-[#e8dcd4] rounded-lg px-3 py-2.5 bg-[#fafaf5]">
          <Search size={16} className="text-[#8d6e63]" />
          <input type="text" placeholder="Tim tu vung..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-transparent flex-1 text-sm outline-none text-[#1a1c19] placeholder:text-[#b0a098]" />
        </div>
        <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
          className="border border-[#e8dcd4] rounded-lg px-3 py-2.5 text-sm bg-[#fafaf5] focus:border-[#72564c] focus:outline-none">
          <option value="">Tat ca cap do</option>
          {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#fafaf5] border border-[#e8dcd4] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#72564c] mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#8d6e63]">Khong co tu vung nao</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-[#e8dcd4]">
              <tr>
                {['Tieng Han', 'Tieng Anh', 'Tieng Viet', 'Cap do', 'Chu de', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] uppercase tracking-widest font-bold text-[#8d6e63]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-[#e8dcd4]/50 last:border-0 hover:bg-white transition">
                  <td className="px-5 py-3.5 text-sm font-semibold text-[#1a1c19]">{item.korean}</td>
                  <td className="px-5 py-3.5 text-sm text-[#1a1c19]">{item.english}</td>
                  <td className="px-5 py-3.5 text-sm text-[#504441]">{item.vietnamese}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border ${LEVEL_COLORS[item.level] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {item.level}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#504441]">
                    {topics.find(t => t.id === item.topicId)?.name || '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setFormData(item); setEditingId(item.id); setShowForm(true); }}
                        className="p-1.5 rounded-lg hover:bg-[#e8dcd4] text-[#72564c] transition"><Pencil size={15} /></button>
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
      <p className="mt-4 text-xs text-[#8d6e63]">{filtered.length} tu vung</p>
    </div>
  );
}
