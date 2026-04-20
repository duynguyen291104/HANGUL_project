'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Plus, Edit2, Trash2, Loader } from 'lucide-react';

interface QuizQuestion {
  id: number;
  questionText: string;
  correctAnswerText: string;
  level: string;
  usageCount: number;
  correctRate: number;
  vocabularyId: number;
  vocabulary: {
    id: number;
    korean: string;
    english: string;
    vietnamese: string;
  };
  topic: {
    id: number;
    name: string;
  };
}

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
}

export default function AdminQuizQuestions() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTopicId, setFilterTopicId] = useState<number | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [formData, setFormData] = useState({
    vocabularyId: 0,
    topicId: 0,
    questionText: '',
    wrongAnswerIds: [0, 0, 0],
    level: '',
    questionType: 'vocabulary',
  });

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    // Check if user is admin
    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      router.push('/');
      return;
    }

    fetchData();
  }, [token, user, filterTopicId, filterLevel, page]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch quiz questions
      const questionsQuery = new URLSearchParams();
      if (filterTopicId) questionsQuery.append('topicId', filterTopicId.toString());
      if (filterLevel) questionsQuery.append('level', filterLevel);
      questionsQuery.append('page', page.toString());

      const questionsRes = await fetch(
        `http://localhost:5000/api/quiz/admin/list?${questionsQuery}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (questionsRes.ok) {
        const questionsData = await questionsRes.json();
        setQuestions(questionsData.questions);
        setTotalPages(questionsData.totalPages);
      }

      // Fetch topics
      const topicsRes = await fetch('http://localhost:5000/api/topic', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (topicsRes.ok) {
        const topicsData = await topicsRes.json();
        setTopics(topicsData.data || topicsData);
      }

      // Fetch vocabularies
      const vocabRes = await fetch('http://localhost:5000/api/vocabulary', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (vocabRes.ok) {
        const vocabData = await vocabRes.json();
        setVocabularies(vocabData.data || vocabData);
      }
    } catch (error) {
      console.error('❌ Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.vocabularyId ||
      !formData.topicId ||
      !formData.questionText ||
      formData.wrongAnswerIds.some((id) => !id)
    ) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const method = editingId ? 'PUT' : 'POST';
      const endpoint = editingId
        ? `/api/quiz/admin/${editingId}`
        : '/api/quiz/admin/create';

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert(editingId ? 'Question updated!' : 'Question created!');
        setShowForm(false);
        setEditingId(null);
        setFormData({
          vocabularyId: 0,
          topicId: 0,
          questionText: '',
          wrongAnswerIds: [0, 0, 0],
          level: '',
          questionType: 'vocabulary',
        });
        fetchData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating question:', error);
      alert('Failed to create question');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/quiz/admin/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        alert('Question deleted');
        fetchData();
      } else {
        alert('Failed to delete question');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  const handleEdit = (question: QuizQuestion) => {
    setEditingId(question.id);
    setFormData({
      vocabularyId: question.vocabulary?.id || 0,
      topicId: question.topic.id,
      questionText: question.questionText,
      wrongAnswerIds: [0, 0, 0], // Would need to load these from database
      level: question.level,
      questionType: 'vocabulary',
    });
    setShowForm(true);
  };

  const topicName = (topicId: number) => {
    return topics.find((t) => t.id === topicId)?.name || 'Unknown';
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Header */}
      <div className="bg-white border-b border-[#ddd]">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <h1 className="text-4xl font-bold text-[#1a1c19]">Quiz Management</h1>
          <p className="text-[#504441] mt-2">Create, edit, and manage quiz questions</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Create Button */}
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({
              vocabularyId: 0,
              topicId: 0,
              questionText: '',
              wrongAnswerIds: [0, 0, 0],
              level: '',
              questionType: 'vocabulary',
            });
          }}
          className="mb-6 flex items-center gap-2 bg-[#72564c] text-white px-4 py-3 rounded-lg hover:bg-[#5a4439] transition"
        >
          <Plus size={20} />
          New Quiz Question
        </button>

        {/* Filters */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-[#e0e0e0]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#72564c] mb-2">Topic</label>
              <select
                value={filterTopicId || ''}
                onChange={(e) => {
                  setFilterTopicId(e.target.value ? parseInt(e.target.value) : null);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-[#ddd] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#72564c]"
              >
                <option value="">All Topics</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#72564c] mb-2">Level</label>
              <select
                value={filterLevel}
                onChange={(e) => {
                  setFilterLevel(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-[#ddd] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#72564c]"
              >
                <option value="">All Levels</option>
                <option value="NEWBIE">NEWBIE</option>
                <option value="BEGINNER">BEGINNER</option>
                <option value="INTERMEDIATE">INTERMEDIATE</option>
                <option value="ADVANCED">ADVANCED</option>
                <option value="EXPERT">EXPERT</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#72564c] mb-2">Search</label>
              <input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-[#ddd] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#72564c]"
              />
            </div>
          </div>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="text-center py-12">
            <Loader className="animate-spin mx-auto mb-4 text-[#72564c]" />
            <p className="text-[#504441]">Loading questions...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center border border-[#e0e0e0]">
            <p className="text-[#504441]">No quiz questions found</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {questions.map((question) => (
                <div
                  key={question.id}
                  className="bg-white rounded-lg p-6 shadow-sm border border-[#e0e0e0] hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-block px-3 py-1 bg-[#ffddb5] text-[#8d6e63] text-xs font-bold rounded">
                          {question.level}
                        </span>
                        <span className="inline-block px-3 py-1 bg-[#e8f5e9] text-[#2e7d32] text-xs font-bold rounded">
                          {question.topic.name}
                        </span>
                        <span className="text-xs text-[#72564c]">
                          Korean: {question.vocabulary.korean}
                        </span>
                      </div>
                      <p className="font-bold text-[#1a1c19] mb-2">{question.questionText}</p>
                      <p className="text-sm text-[#504441] mb-3">
                        Correct: {question.correctAnswerText}
                      </p>
                      <div className="flex gap-4 text-xs text-[#72564c]">
                        <span>📊 Used: {question.usageCount} times</span>
                        <span>✅ Correct: {question.correctRate.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(question)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(question.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-2 rounded-lg transition ${
                      page === p
                        ? 'bg-[#72564c] text-white'
                        : 'bg-white border border-[#ddd] text-[#504441] hover:bg-[#f5f5f5]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Create/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-[#e0e0e0] px-8 py-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-[#1a1c19]">
                  {editingId ? 'Edit' : 'Create New'} Quiz Question
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-[#504441] hover:text-[#1a1c19]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-8 space-y-6">
                {/* Vocabulary */}
                <div>
                  <label className="block text-sm font-bold text-[#1a1c19] mb-2">
                    Vocabulary (Correct Answer) *
                  </label>
                  <select
                    value={formData.vocabularyId}
                    onChange={(e) => {
                      const vocabId = parseInt(e.target.value);
                      const selectedVocab = vocabularies.find((v) => v.id === vocabId);
                      setFormData({
                        ...formData,
                        vocabularyId: vocabId,
                        topicId: selectedVocab?.topicId || 0,
                        level: selectedVocab?.level || '',
                      });
                    }}
                    className="w-full px-4 py-2 border border-[#ddd] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#72564c]"
                    required
                  >
                    <option value="">Select vocabulary</option>
                    {vocabularies.map((vocab) => (
                      <option key={vocab.id} value={vocab.id}>
                        {vocab.korean} ({vocab.english}) - {vocab.level}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Topic */}
                <div>
                  <label className="block text-sm font-bold text-[#1a1c19] mb-2">Topic</label>
                  <input
                    type="text"
                    value={formData.topicId ? topicName(formData.topicId) : ''}
                    disabled
                    className="w-full px-4 py-2 border border-[#ddd] rounded-lg bg-[#f5f5f5] text-[#504441]"
                  />
                </div>

                {/* Level */}
                <div>
                  <label className="block text-sm font-bold text-[#1a1c19] mb-2">Level</label>
                  <input
                    type="text"
                    value={formData.level}
                    disabled
                    className="w-full px-4 py-2 border border-[#ddd] rounded-lg bg-[#f5f5f5] text-[#504441]"
                  />
                </div>

                {/* Question Text */}
                <div>
                  <label className="block text-sm font-bold text-[#1a1c19] mb-2">
                    Question Text *
                  </label>
                  <textarea
                    value={formData.questionText}
                    onChange={(e) =>
                      setFormData({ ...formData, questionText: e.target.value })
                    }
                    placeholder='e.g., "_____ nghĩa là gì?"'
                    className="w-full px-4 py-2 border border-[#ddd] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#72564c]"
                    rows={3}
                    required
                  />
                </div>

                {/* Wrong Answers */}
                <div>
                  <label className="block text-sm font-bold text-[#1a1c19] mb-2">
                    Wrong Answers (3 different vocabularies) *
                  </label>
                  <div className="space-y-3">
                    {[0, 1, 2].map((idx) => (
                      <select
                        key={idx}
                        value={formData.wrongAnswerIds[idx]}
                        onChange={(e) => {
                          const newIds = [...formData.wrongAnswerIds];
                          newIds[idx] = parseInt(e.target.value);
                          setFormData({ ...formData, wrongAnswerIds: newIds });
                        }}
                        className="w-full px-4 py-2 border border-[#ddd] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#72564c]"
                        required
                      >
                        <option value="">Select wrong answer {idx + 1}</option>
                        {vocabularies
                          .filter((v) => v.id !== formData.vocabularyId && v.level === formData.level && v.topicId === formData.topicId)
                          .map((vocab) => (
                            <option key={vocab.id} value={vocab.id}>
                              {vocab.korean} - {vocab.vietnamese}
                            </option>
                          ))}
                      </select>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-[#72564c] text-white py-3 rounded-lg font-bold hover:bg-[#5a4439] transition"
                  >
                    {editingId ? 'Update Question' : 'Create Question'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 bg-[#ddd] text-[#504441] py-3 rounded-lg font-bold hover:bg-[#ccc] transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
