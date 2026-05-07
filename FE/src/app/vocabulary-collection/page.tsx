'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import { Trash2, BookOpen } from 'lucide-react';
import Footer from '@/components/Footer';
import ActionDialog from '@/components/ui/ActionDialog';

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [dialogMessage, setDialogMessage] = useState('');

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

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      quiz: 'Quiz',
      writing: 'Writing',
      pronunciation: 'Pronunciation',
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
      setData(prev => prev.filter(item => item.id !== id));
      console.log('✅ Word removed from collection');
      setDialogMessage('Đã xóa khỏi bộ sưu tập.');
    } catch (error) {
      console.error('❌ Error deleting:', error);
      setDialogMessage('Lỗi khi xóa từ vựng.');
    } finally {
      setDeletingId(null);
    }
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
    <div className="min-h-screen bg-[#fafaf5]">
      <Header />
      <main className="pt-[70px] pl-[200px]">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-extrabold text-[#1a1c19] tracking-tight mb-0">
            Bộ Sưu Tập Từ Vựng
          </h1>
          <p className="text-[#504441] mt-[20px]">
            <BookOpen className="inline mr-2" size={20} />
            từ vựng đã lưu
          </p>
        </div>

        {/* Centered Content Container */}
        <div style={{ marginLeft: '350px', marginRight: '350px' }} className="px-6">
          {/* Search Bar */}
          <div className="mb-8">
            <input
              type="text"
              placeholder="Tìm kiếm (Korean / English / Vietnamese)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-[#e8e8e3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#72564c] placeholder-[#504441]"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap mb-8">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                selectedType === 'all'
                  ? 'bg-[#72564c] text-white'
                  : 'bg-[#f4f4ef] text-[#504441] hover:bg-[#e8e8e3]'
              }`}
            >
              Tất cả ({getAllCount()})
            </button>
            <button
              onClick={() => setSelectedType('quiz')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                selectedType === 'quiz'
                  ? 'bg-[#72564c] text-white'
                  : 'bg-[#f4f4ef] text-[#504441] hover:bg-[#e8e8e3]'
              }`}
            >
              Quiz ({getQuizCount()})
            </button>
            <button
              onClick={() => setSelectedType('writing')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                selectedType === 'writing'
                  ? 'bg-[#72564c] text-white'
                  : 'bg-[#f4f4ef] text-[#504441] hover:bg-[#e8e8e3]'
              }`}
            >
              Writing ({getWritingCount()})
            </button>
            <button
              onClick={() => setSelectedType('pronunciation')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                selectedType === 'pronunciation'
                  ? 'bg-[#72564c] text-white'
                  : 'bg-[#f4f4ef] text-[#504441] hover:bg-[#e8e8e3]'
              }`}
            >
              Pronunciation ({getPronunciationCount()})
            </button>
            <button
              onClick={() => setSelectedType('camera')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                selectedType === 'camera'
                  ? 'bg-[#72564c] text-white'
                  : 'bg-[#f4f4ef] text-[#504441] hover:bg-[#e8e8e3]'
              }`}
            >
              Camera ({getCameraCount()})
            </button>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Empty State */}
          {filteredData.length === 0 && (
            <div className="text-center py-16">
              <BookOpen size={48} className="mx-auto text-[#e8e8e3] mb-4" />
              <p className="text-[#504441] text-lg mb-2">
                {searchTerm ? 'Không tìm thấy từ vựng nào' : 'Bộ sưu tập trống'}
              </p>
              <p className="text-[#72564c] text-sm">
                {searchTerm
                  ? 'Thử tìm kiếm với các từ khác'
                  : selectedType === 'camera'
                  ? 'Vào Camera Thông Minh để nhận diện và lưu từ'
                  : 'Hoàn thành quiz/writing/pronunciation để lưu từ vựng'}
              </p>
            </div>
          )}

          {/* Vocabulary List */}
          {filteredData.length > 0 && (
            <div className="space-y-3">
              {filteredData.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-white border border-[#e8e8e3] rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex-1">
                    <p className="text-lg font-bold text-[#72564c]">{item.koreanWord}</p>
                    <p className="text-sm text-[#504441] mt-1">{item.meaning}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`text-xs px-2 py-1 rounded border ${getTypeColor(item.type)}`}
                      >
                        {getTypeLabel(item.type)}
                      </span>
                      <span className="text-xs text-[#8b8b86]">
                        {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmDeleteId(item.id)}
                    disabled={deletingId === item.id}
                    className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                    title="Delete from collection"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <ActionDialog
        open={confirmDeleteId !== null}
        title="Xác nhận xóa"
        message="Bạn chắc chắn muốn xóa từ này khỏi bộ sưu tập?"
        confirmText="Xóa"
        danger
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId !== null) {
            void handleDelete(confirmDeleteId);
          }
          setConfirmDeleteId(null);
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
      <Footer />
    </div>
  );
}
