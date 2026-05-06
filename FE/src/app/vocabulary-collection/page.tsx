'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import { Trash2, BookOpen, Volume2, SlidersHorizontal } from 'lucide-react';
import Footer from '@/components/Footer';

// Revised Romanization of Korean (simplified)
function romanizeKorean(text: string): string {
  const INITIALS = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
  const VOWELS   = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
  const FINALS   = ['','k','kk','k','n','n','n','t','l','k','m','p','l','l','p','l','m','p','p','t','t','ng','t','t','k','t','p','t'];
  return Array.from(text).map(char => {
    const code = char.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      const offset = code - 0xAC00;
      const initial = Math.floor(offset / 28 / 21);
      const vowel   = Math.floor(offset / 28) % 21;
      const final   = offset % 28;
      return INITIALS[initial] + VOWELS[vowel] + FINALS[final];
    }
    return char;
  }).join('');
}

function speakKorean(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'ko-KR';
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
}

interface SavedWord {
  id: number;
  koreanWord: string;
  meaning: string;
  source: string;
  type: 'quiz' | 'writing' | 'pronunciation' | 'camera';
  createdAt: string;
}

interface CollectionResponse {
  success: boolean;
  count: number;
  data: SavedWord[];
}

export default function VocabularyCollectionPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [data, setData] = useState<SavedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'quiz' | 'writing' | 'pronunciation' | 'camera'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [pageVisible, setPageVisible] = useState(false);
  const [listVisible, setListVisible] = useState(false);
  const [listKey, setListKey] = useState(0);
  // Single delete modal
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deletingModalClosing, setDeletingModalClosing] = useState(false);
  // Bulk delete
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkModalClosing, setBulkModalClosing] = useState(false);

  const closeSingleModal = () => {
    setDeletingModalClosing(true);
    setTimeout(() => { setDeleteTarget(null); setDeletingModalClosing(false); }, 260);
  };

  const closeBulkModal = () => {
    setBulkModalClosing(true);
    setTimeout(() => { setShowBulkConfirm(false); setBulkModalClosing(false); }, 260);
  };

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setPageVisible(true), 60);
      return () => clearTimeout(t);
    }
  }, [loading]);

  // Fetch ALL vocabulary (no type filter) — filter client-side so counts stay correct
  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchCollection = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/learning-path/vocabulary-collection`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }

        const result: CollectionResponse = await response.json();
        setData(result.data);
        setError('');
      } catch (error: any) {
        console.error('❌ Error fetching collection:', error);
        setError(error.message || 'Failed to load vocabulary collection');
      } finally {
        setLoading(false);
      }
    };

    fetchCollection();
  }, [token, router]);

  const filteredData = data.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesType = selectedType === 'all' || item.type === selectedType;
    const matchesSearch =
      item.koreanWord.toLowerCase().includes(searchLower) ||
      item.meaning.toLowerCase().includes(searchLower);
    return matchesType && matchesSearch;
  });

  // Reset "show all" when filter/search changes
  useEffect(() => { setShowAll(false); }, [selectedType, searchTerm]);

  // Re-trigger list animation when filter/search/showAll/page visibility changes
  useEffect(() => {
    if (!pageVisible) return;
    setListKey(k => k + 1);
    setListVisible(false);
    const t = setTimeout(() => setListVisible(true), 50);
    return () => clearTimeout(t);
  }, [selectedType, searchTerm, pageVisible]);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      quiz: 'Trắc nghiệm',
      writing: 'Viết',
      pronunciation: 'Phát âm',
      camera: 'Camera',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      quiz: 'bg-blue-50 text-blue-700 border-blue-200',
      writing: 'bg-green-50 text-green-700 border-green-200',
      pronunciation: 'bg-purple-50 text-purple-700 border-purple-200',
      camera: 'bg-orange-50 text-orange-700 border-orange-200',
    };
    return colors[type] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/learning-path/vocabulary-collection/${id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error('Delete failed');
      setData(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('❌ Error deleting:', error);
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map(id =>
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/learning-path/vocabulary-collection/${id}`,
            {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` },
            }
          )
        )
      );
    } catch (error) {
      console.error('❌ Error bulk deleting:', error);
    }
    setData(prev => prev.filter(item => !selectedIds.has(item.id)));
    setSelectedIds(new Set());
    setBulkMode(false);
    setShowBulkConfirm(false);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const visible = showAll ? filteredData : filteredData.slice(0, 3);
    setSelectedIds(new Set(visible.map(i => i.id)));
  };

  // Get count for each type
  const getAllCount = () => data.length;
  const getQuizCount = () => data.filter(d => d.type === 'quiz').length;
  const getWritingCount = () => data.filter(d => d.type === 'writing').length;
  const getPronunciationCount = () => data.filter(d => d.type === 'pronunciation').length;
  const getCameraCount = () => data.filter(d => d.type === 'camera').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf5]">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#72564c] mx-auto mb-4"></div>
            <p className="text-[#504441]">Loading vocabulary collection...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf5] w-full overflow-x-hidden">
      <Header />
      <main className="w-full pt-[70px] pb-20">

        {/* Header — no animation, left-aligned original position */}
        <div className="pl-[200px] pr-8 mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#504441] tracking-tight leading-tight">
            Từ vựng đã lưu
          </h1>
          <p className="text-[#8d6e63] mt-3 flex items-center gap-2" style={{ fontSize: '20px' }}>
            <BookOpen size={20} />
            {getAllCount()} từ trong bộ sưu tập
          </p>
        </div>

        <div style={{ width: '1000px', maxWidth: '100%' }} className="mx-auto px-4">

          {/* Click-outside overlay for filter dropdown */}
          {showFilter && (
            <div className="fixed inset-0 z-40" onClick={() => setShowFilter(false)} />
          )}

          {/* Search + Filter + Bulk delete — same row */}
          <div className={`flex items-center justify-between gap-5 ${pageVisible ? 'visible' : ''}`} data-animate data-delay="1" style={{ marginBottom: bulkMode ? '12px' : '30px' }}>
            <input
              type="text"
              placeholder="Tìm kiếm (Tiếng Hàn / Tiếng Việt)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-3 border border-[#e8dcd4] rounded-xl focus:outline-none focus:border-[#72564c] bg-white text-[#1a1c19] placeholder-[#b09488] transition-colors"
              style={{ fontSize: '20px', width: '450px', minWidth: '150px', flexShrink: 1 }}
            />
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative">
                <button
                  onClick={() => setShowFilter(v => !v)}
                  className={`flex items-center gap-2 px-4 py-3 font-semibold rounded-xl transition-colors ${
                    showFilter ? 'bg-[#504441] text-white' : 'bg-[#72564c] text-white hover:bg-[#504441]'
                  }`}
                  style={{ fontSize: '20px' }}
                >
                  <SlidersHorizontal size={18} />
                  {{ all: 'Lọc từ các bài tập', quiz: 'Trắc nghiệm', writing: 'Viết', pronunciation: 'Phát âm', camera: 'Camera' }[selectedType]}
                </button>

                {/* Dropdown */}
                <div
                  className="absolute right-0 top-[calc(100%+8px)] w-64 bg-white border border-[#e8dcd4] rounded-2xl shadow-xl overflow-hidden z-50"
                  style={{
                    transformOrigin: 'top right',
                    transform: showFilter ? 'scaleY(1) translateY(0)' : 'scaleY(0.85) translateY(-8px)',
                    opacity: showFilter ? 1 : 0,
                    pointerEvents: showFilter ? 'auto' : 'none',
                    transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.18s ease',
                  }}
                >
                  {([
                    { key: 'all', label: `Tất cả (${getAllCount()})` },
                    { key: 'quiz', label: `Trắc nghiệm (${getQuizCount()})` },
                    { key: 'writing', label: `Viết (${getWritingCount()})` },
                    { key: 'pronunciation', label: `Phát âm (${getPronunciationCount()})` },
                    { key: 'camera', label: `Camera (${getCameraCount()})` },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => { setSelectedType(key); setShowFilter(false); }}
                      className={`w-full text-left px-5 py-3 font-semibold transition-colors border-b border-[#f4ede9] last:border-0 ${
                        selectedType === key
                          ? 'bg-[#f4ede9] text-[#72564c]'
                          : 'text-[#504441] hover:bg-[#fafaf5]'
                      }`}
                      style={{ fontSize: '20px' }}
                    >
                      {selectedType === key && <span className="mr-2 text-[#72564c]">✓</span>}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => { setBulkMode(v => !v); setSelectedIds(new Set()); }}
                className="font-semibold text-[#8d6e63] hover:text-[#72564c] border border-[#c4a99e] px-4 py-3 rounded-xl hover:bg-[#f4ede9] transition-colors"
                style={{ fontSize: '20px' }}
              >
                {bulkMode ? 'Hủy chọn' : 'Xóa hàng loạt'}
              </button>
            </div>
          </div>

          {/* Bulk action bar — appears below search row when bulk mode active */}
          {bulkMode && (
            <div className="flex items-center justify-end gap-3" style={{ marginBottom: '30px' }}>
              <button
                onClick={selectAll}
                className="font-semibold text-[#72564c] hover:underline transition-colors"
                style={{ fontSize: '20px' }}
              >
                Chọn tất cả
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setShowBulkConfirm(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors"
                  style={{ fontSize: '20px' }}
                >
                  <Trash2 size={16} />
                  Xóa {selectedIds.size} từ
                </button>
              )}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700" style={{ fontSize: '20px' }}>
              {error}
            </div>
          )}

          {/* Empty State */}
          {filteredData.length === 0 && (
            <div className={`text-center py-16 ${pageVisible ? 'visible' : ''}`} data-animate data-delay="3">
              <BookOpen size={48} className="mx-auto text-[#e8dcd4] mb-4" />
              <p className="text-[#504441] mb-2" style={{ fontSize: '20px' }}>
                {searchTerm ? 'Không tìm thấy từ vựng nào' : 'Bộ sưu tập trống'}
              </p>
              <p className="text-[#8d6e63]" style={{ fontSize: '20px' }}>
                {searchTerm
                  ? 'Thử tìm kiếm với các từ khác'
                  : selectedType === 'quiz'
                  ? 'Hoàn thành bài tập trắc nghiệm để lưu từ vựng'
                  : selectedType === 'writing'
                  ? 'Hoàn thành bài luyện viết để lưu từ vựng'
                  : selectedType === 'pronunciation'
                  ? 'Hoàn thành bài luyện phát âm để lưu từ vựng'
                  : selectedType === 'camera'
                  ? 'Vào Camera Thông Minh để nhận diện và lưu từ'
                  : 'Hoàn thành bài tập trắc nghiệm / luyện viết / phát âm / từ vựng camera để lưu từ vựng'}
              </p>
            </div>
          )}

          {/* Vocabulary List */}
          {filteredData.length > 0 && (() => {
            const INITIAL_SHOW = 3;
            const visible = showAll ? filteredData : filteredData.slice(0, INITIAL_SHOW);
            return (
              <div key={listKey} className="space-y-3">
                {visible.map((item, index) => {
                  const hangulOnly = (item.koreanWord.match(/[\uAC00-\uD7A3]+/g) || []).join(' ');
                  const romanization = hangulOnly ? romanizeKorean(hangulOnly) : '';
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      data-animate-left=""
                      data-delay={String(Math.min(index, 6))}
                      onClick={bulkMode ? () => toggleSelect(item.id) : undefined}
                      className={`flex items-center justify-between p-5 bg-white border rounded-xl transition-colors ${listVisible ? 'visible' : ''} ${
                        bulkMode ? 'cursor-pointer' : ''
                      } ${isSelected ? 'border-[#72564c] bg-[#fdf8f6]' : 'border-[#e8dcd4] hover:border-[#72564c]'}`}
                    >
                      {bulkMode && (
                        <div className={`w-5 h-5 rounded border-2 mr-4 shrink-0 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-[#72564c] border-[#72564c]' : 'border-[#c4a99e]'
                        }`}>
                          {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#72564c]" style={{ fontSize: '20px' }}>{item.koreanWord}</span>
                          <span className="text-[#b09488]" style={{ fontSize: '20px' }}>· {romanization}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); speakKorean(hangulOnly || item.koreanWord); }}
                            className="p-1 text-[#8d6e63] hover:text-[#72564c] hover:bg-[#f4ede9] rounded-lg transition-colors shrink-0"
                            title="Phát âm"
                          >
                            <Volume2 size={18} />
                          </button>
                        </div>
                        <p className="text-[#504441] mt-1" style={{ fontSize: '20px' }}>{item.meaning}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full border font-medium ${getTypeColor(item.type)}`} style={{ fontSize: '20px' }}>
                            {getTypeLabel(item.type)}
                          </span>
                          <span className="text-[#b09488]" style={{ fontSize: '20px' }}>
                            {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                      {!bulkMode && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(item.id); }}
                          disabled={deletingId === item.id}
                          className="ml-4 p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50 shrink-0"
                          title="Xóa khỏi bộ sưu tập"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  );
                })}

                {filteredData.length > INITIAL_SHOW && (
                  <button
                    data-animate-left=""
                    onClick={() => setShowAll(v => !v)}
                    className={`w-full py-3 font-semibold text-[#72564c] border border-[#e8dcd4] rounded-xl hover:bg-[#f4ede9] transition-colors ${listVisible ? 'visible' : ''}`}
                    style={{
                      fontSize: '20px',
                      marginTop: '30px',
                      transitionDelay: `${(Math.min(visible.length, 6) * 0.07 + 0.5).toFixed(2)}s`
                    }}
                  >
                    {showAll ? 'Thu gọn' : `Xem thêm (${filteredData.length - INITIAL_SHOW} từ)`}
                  </button>
                )}
              </div>
            );
          })()}

        </div>
      </main>
      <Footer />

      {/* ── Single delete confirm modal ── */}
      {deleteTarget !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className={`${deletingModalClosing ? 'modal-pop-out' : 'modal-pop'} bg-[#fafaf5] rounded-2xl w-full max-w-sm p-8 shadow-xl flex flex-col items-center text-center`}>
            <img
              src="https://res.cloudinary.com/dds5jlp7e/image/upload/v1777958111/ChatGPT_Image_12_14_29_5_thg_5__2026-removebg-preview_vrggjd.png"
              alt=""
              style={{ width: '140px', height: '140px', objectFit: 'contain' }}
              className="mb-5"
            />
            <h3 className="font-extrabold text-[#1a1c19] mb-2" style={{ fontSize: '20px' }}>
              Bạn đã nắm chắc từ vựng này rồi chứ?
            </h3>
            <p className="text-[#8d6e63] mb-7" style={{ fontSize: '20px' }}>
              Từ sẽ bị xóa khỏi bộ sưu tập của bạn.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="w-full py-3 bg-[#72564c] text-white font-bold rounded-xl hover:bg-[#504441] transition-colors"
                style={{ fontSize: '20px' }}
              >
                Tôi đã ghi nhớ và xóa đi
              </button>
              <button
                onClick={closeSingleModal}
                className="w-full py-3 border border-[#c4a99e] text-[#504441] font-bold rounded-xl hover:bg-[#f4ede9] transition-colors"
                style={{ fontSize: '20px' }}
              >
                Giữ lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk delete confirm modal ── */}
      {showBulkConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className={`${bulkModalClosing ? 'modal-pop-out' : 'modal-pop'} bg-[#fafaf5] rounded-2xl w-full max-w-sm p-8 shadow-xl flex flex-col items-center text-center`}>
            <img
              src="https://res.cloudinary.com/dds5jlp7e/image/upload/v1777958111/ChatGPT_Image_12_14_29_5_thg_5__2026-removebg-preview_vrggjd.png"
              alt=""
              style={{ width: '140px', height: '140px', objectFit: 'contain' }}
              className="mb-5"
            />
            <h3 className="font-extrabold text-[#1a1c19] mb-2" style={{ fontSize: '20px' }}>
              Bạn đã nắm chắc {selectedIds.size} từ vựng này rồi chứ?
            </h3>
            <p className="text-[#8d6e63] mb-7" style={{ fontSize: '20px' }}>
              {selectedIds.size} từ sẽ bị xóa khỏi bộ sưu tập của bạn.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={handleBulkDelete}
                className="w-full py-3 bg-[#72564c] text-white font-bold rounded-xl hover:bg-[#504441] transition-colors"
                style={{ fontSize: '20px' }}
              >
                Tôi đã ghi nhớ và xóa đi
              </button>
              <button
                onClick={closeBulkModal}
                className="w-full py-3 border border-[#c4a99e] text-[#504441] font-bold rounded-xl hover:bg-[#f4ede9] transition-colors"
                style={{ fontSize: '20px' }}
              >
                Giữ lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
