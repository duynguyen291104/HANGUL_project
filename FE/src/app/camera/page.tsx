'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface Detection {
  id: number;
  label: string;
  confidence: number;
  bbox: number[];
  age: number;
}

const YOLO_SERVER = process.env.NEXT_PUBLIC_FLASK_API_URL || 'http://localhost:5001';

// Korean (COCO) → Vietnamese translation map
const KO_TO_VI: Record<string, string> = {
  '사람': 'Người', '자전거': 'Xe đạp', '자동차': 'Ô tô', '오토바이': 'Xe máy',
  '비행기': 'Máy bay', '버스': 'Xe buýt', '기차': 'Tàu hỏa', '트럭': 'Xe tải',
  '배': 'Tàu thủy', '신호등': 'Đèn giao thông', '소화전': 'Vòi cứu hỏa',
  '정지 표지판': 'Biển dừng', '주차 미터기': 'Đồng hồ đỗ xe', '벤치': 'Ghế băng',
  '새': 'Chim', '고양이': 'Mèo', '개': 'Chó', '말': 'Ngựa', '양': 'Cừu', '소': 'Bò',
  '코끼리': 'Voi', '곰': 'Gấu', '얼룩말': 'Ngựa vằn', '기린': 'Hươu cao cổ',
  '배낭': 'Ba lô', '우산': 'Ô (dù)', '핸드백': 'Túi xách', '넥타이': 'Cà vạt',
  '여행 가방': 'Va li', '프리스비': 'Đĩa bay', '스키': 'Ván trượt tuyết',
  '스노보드': 'Snowboard', '공': 'Bóng', '연': 'Diều', '야구 방망이': 'Gậy bóng chày',
  '야구 글러브': 'Găng tay bóng chày', '스케이트보드': 'Ván trượt',
  '서핑보드': 'Ván lướt sóng', '테니스 라켓': 'Vợt tennis', '병': 'Chai',
  '와인잔': 'Ly rượu vang', '컵': 'Cốc', '포크': 'Nĩa', '칼': 'Dao',
  '숟가락': 'Thìa', '그릇': 'Bát', '바나나': 'Chuối', '사과': 'Táo',
  '샌드위치': 'Bánh mì kẹp', '오렌지': 'Cam', '브로콜리': 'Súp lơ xanh',
  '당근': 'Cà rốt', '핫도그': 'Xúc xích', '피자': 'Pizza', '도넛': 'Bánh vòng',
  '케이크': 'Bánh kem', '의자': 'Ghế', '소파': 'Ghế sofa', '화분': 'Chậu hoa',
  '침대': 'Giường', '식탁': 'Bàn ăn', '변기': 'Bồn cầu', '텔레비전': 'Tivi',
  '노트북': 'Máy tính xách tay', '마우스': 'Chuột máy tính',
  '리모컨': 'Điều khiển từ xa', '키보드': 'Bàn phím', '휴대전화': 'Điện thoại',
  '전자레인지': 'Lò vi sóng', '오븐': 'Lò nướng', '토스터': 'Máy nướng bánh mì',
  '싱크대': 'Bồn rửa chén', '냉장고': 'Tủ lạnh', '책': 'Sách', '시계': 'Đồng hồ',
  '꽃병': 'Bình hoa', '가위': 'Kéo', '테디 베어': 'Gấu bông',
  '헤어 드라이어': 'Máy sấy tóc', '칫솔': 'Bàn chải đánh răng',
};

export default function CameraPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [frameCount, setFrameCount] = useState(0);
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [savingWord, setSavingWord] = useState<string | null>(null);

  // Check server health on mount + load already-saved camera words
  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    checkServerHealth();
    const healthInterval = setInterval(checkServerHealth, 5000);

    // Load saved camera words so "Đã lưu" persists across visits
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/learning-path/vocabulary-collection?type=camera`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then(r => r.json())
      .then(data => {
        if (data?.data) {
          setSavedSet(new Set((data.data as { koreanWord: string }[]).map(w => w.koreanWord)));
        }
      })
      .catch(() => {});

    return () => clearInterval(healthInterval);
  }, [token, router]);

  // Fetch detections when stream is active
  useEffect(() => {
    if (!isStreamActive) return;

    const detectionInterval = setInterval(fetchDetections, 500);
    return () => clearInterval(detectionInterval);
  }, [isStreamActive]);

  const checkServerHealth = async () => {
    try {
      const response = await fetch('/api/yolo/health', { cache: 'no-store' });
      const data = await response.json();
      setServerStatus(data.status === 'disconnected' ? 'disconnected' : 'connected');
      setFrameCount(data.frame_count ?? 0);
    } catch {
      setServerStatus('disconnected');
    }
  };

  const startDetection = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/yolo/start', { method: 'POST' });
      if (response.ok) {
        setIsStreamActive(true);
      } else {
        throw new Error('Failed to start detection');
      }
    } catch (err) {
      setError('Không thể khởi động phát hiện: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const stopDetection = async () => {
    try {
      await fetch('/api/yolo/stop', { method: 'POST' });
      setIsStreamActive(false);
      // Keep detections visible so user can still save words after stopping
    } catch {
      setError('Lỗi dừng phát hiện');
    }
  };

  const fetchDetections = async () => {
    try {
      const response = await fetch('/api/yolo/detections', { cache: 'no-store' });
      const data = await response.json();
      const raw: Detection[] = data.detections || [];
      // Accumulate: merge new detections into existing list.
      // Once a word is scanned it stays until page reload.
      // Update confidence if a newer frame has a higher value.
      setDetections(prev => {
        const merged = new Map(prev.map(d => [d.label, d]));
        for (const d of raw) {
          const existing = merged.get(d.label);
          if (!existing || d.confidence > existing.confidence) merged.set(d.label, d);
        }
        return Array.from(merged.values());
      });
      setFrameCount(data.frame_count ?? 0);
    } catch {
      // silent — proxy handles YOLO down gracefully
    }
  };

  const handleSave = async (koreanWord: string) => {
    if (!token || savedSet.has(koreanWord) || savingWord) return;
    const meaning = KO_TO_VI[koreanWord] || koreanWord;
    setSavingWord(koreanWord);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/learning-path/save-word-to-collection`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ koreanWord, meaning, type: 'camera' }),
        }
      );
      if (res.ok) setSavedSet(prev => new Set(prev).add(koreanWord));
    } catch {
      // silent
    } finally {
      setSavingWord(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f7f4ef' }}>
      <Header />

      <main className="flex-1 px-[100px] py-14 flex flex-col gap-12">

        {/* ── Title row ── */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold font-headline text-on-background leading-tight tracking-tight">
              Camera Thông Minh
            </h1>
            <p className="text-on-surface-variant font-medium font-body mt-[20px]">
              Hướng camera vào bất kỳ vật thể — AI nhận diện và gợi ý từ tiếng Hàn ngay lập tức
            </p>
          </div>

          {/* server pill */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wide border ${
            serverStatus === 'connected'
              ? 'border-[#a3cfb5] text-[#2d7a50] bg-[#eaf6ef]'
              : serverStatus === 'checking'
              ? 'border-[#e0c97a] text-[#8a6e18] bg-[#fdf8e3]'
              : 'border-[#f0b8b8] text-[#b83232] bg-[#fdf0f0]'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              serverStatus === 'connected' ? 'bg-[#2d7a50] live-dot'
              : serverStatus === 'checking' ? 'bg-[#c9a020]'
              : 'bg-[#b83232]'
            }`} />
            {serverStatus === 'connected' ? 'AI đang chạy'
              : serverStatus === 'checking' ? 'Đang kết nối…'
              : 'Server ngoại tuyến'}
          </div>
        </div>

        {/* ── Core layout: viewport left, sidebar right ── */}
        <div className="flex gap-10 items-start">

          {/* ── Camera block ── */}
          <div style={{ flex: '0 0 960px' }}>
            {/* viewport */}
            <div
              className="relative rounded-[20px] overflow-hidden"
              style={{
                height: '620px',
                background: '#141412',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.12), 0 24px 60px rgba(0,0,0,0.22)',
              }}
            >
              {/* feed */}
              {isStreamActive ? (
                <img
                  src={`${YOLO_SERVER}/api/yolo/stream?t=${Date.now()}`}
                  alt="Camera view"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                  {/* big Korean label */}
                  <p
                    className="text-[120px] font-black leading-none mb-4 camera-idle-text"
                    style={{ color: 'rgba(255,255,255,0.04)', letterSpacing: '-4px' }}
                  >
                    카메라
                  </p>
                  <p className="text-white/25 text-sm font-medium tracking-widest uppercase">
                    {serverStatus === 'disconnected'
                      ? 'Chạy yolo_flask_server.py để kết nối'
                      : 'Nhấn nút bên dưới để bắt đầu'}
                  </p>
                </div>
              )}

              {/* dim overlay top */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 28%, transparent 72%, rgba(0,0,0,0.55) 100%)' }} />

              {/* scan line */}
              {isStreamActive && <div className="scan-beam" />}

              {/* frame counter — top right */}
              <div className="absolute top-4 right-5 z-10">
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">
                  {frameCount.toLocaleString()} frames
                </span>
              </div>

              {/* bottom shutter row */}
              <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-8 h-[76px]">
                {/* hint text */}
                <p className="text-white/35 text-xs tracking-wide">
                  {isStreamActive ? `${detections.length} vật thể tìm thấy` : 'Camera sẵn sàng'}
                </p>

                {/* shutter */}
                {!isStreamActive ? (
                  <button
                    onClick={startDetection}
                    disabled={loading || serverStatus === 'disconnected'}
                    className="shutter-btn disabled:opacity-30"
                  >
                    <span className="shutter-inner" />
                  </button>
                ) : (
                  <button onClick={stopDetection} className="stop-btn">
                    <span className="stop-square" />
                  </button>
                )}

                <p className="text-white/35 text-xs tracking-wide text-right w-[120px]">
                  {isStreamActive ? 'Đang quay' : ''}
                </p>
              </div>
            </div>

            {/* error */}
            {error && (
              <div className="mt-4 px-5 py-3 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-medium">
                {error}
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="flex-1 flex flex-col gap-5" style={{ minWidth: 0 }}>

            {/* stats strip */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Frames xử lý', value: frameCount.toLocaleString(), mono: true },
                { label: 'Vật thể nhận ra', value: String(detections.length), mono: false },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-white px-5 py-4"
                  style={{ boxShadow: '0 2px 0 #e0d8d0, 0 0 0 1px #ede8e2' }}
                >
                  <p className="text-[9px] uppercase tracking-[0.22em] font-bold text-[#b89a8a] mb-1.5">{s.label}</p>
                  <p className={`text-3xl font-black text-[#1a1c19] leading-none ${s.mono ? 'font-mono' : ''}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* detection list */}
            <div
              className="rounded-2xl bg-white flex flex-col overflow-hidden"
              style={{
                flex: 1,
                maxHeight: '490px',
                boxShadow: '0 2px 0 #e0d8d0, 0 0 0 1px #ede8e2',
              }}
            >
              {/* header */}
              <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-[#f0ece6]">
                <h2 className="text-sm font-black text-[#1a1c19] tracking-tight">Kết quả</h2>
                {detections.length > 0 && (
                  <span className="text-[11px] font-bold text-[#8d6e63] bg-[#f5ede9] px-2.5 py-0.5 rounded-full">
                    {detections.length}
                  </span>
                )}
              </div>

              {/* list */}
              <div className="flex-1 overflow-y-auto">
                {detections.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-14 px-6 text-center">

                    <p className="text-[#1a1c19]/30 text-sm font-semibold leading-snug">
                      Chưa có gì ở đây<br />
                      <span className="font-normal text-xs">Bắt đầu camera để nhận diện</span>
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-[#f5f1ec]">
                    {detections.map((d, i) => {
                      const vi = KO_TO_VI[d.label] || d.label;
                      const isSaved = savedSet.has(d.label);
                      const isSaving = savingWord === d.label;
                      return (
                        <li key={i} className="px-5 py-3.5 hover:bg-[#faf7f4] transition-colors duration-100">
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <span className="font-bold text-[#1a1c19] text-sm leading-none block">{d.label}</span>
                              <span className="text-[11px] text-[#8d6e63] mt-0.5 block">{vi}</span>
                            </div>
                            <span className="text-[11px] font-black text-[#72564c] flex-shrink-0 ml-2 mt-0.5">{Math.round(d.confidence * 100)}%</span>
                          </div>
                          {/* confidence bar */}
                          <div className="h-[2px] bg-[#ede8e2] rounded-full mt-2 mb-3 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.round(d.confidence * 100)}%`,
                                background: 'linear-gradient(90deg,#72564c,#c67230)',
                                transition: 'width 0.6s ease',
                              }}
                            />
                          </div>
                          <button
                            onClick={() => handleSave(d.label)}
                            disabled={isSaved || isSaving}
                            className={`w-full text-center text-[11px] font-bold py-1.5 rounded-lg transition-all duration-150 ${
                              isSaved
                                ? 'bg-[#eaf6ef] text-[#2d7a50] cursor-default'
                                : isSaving
                                ? 'bg-[#f5ede9] text-[#b89a8a] cursor-wait'
                                : 'bg-[#1a1c19] text-white hover:bg-[#72564c]'
                            }`}
                          >
                            {isSaved ? 'Đã lưu' : isSaving ? 'Đang lưu…' : 'Lưu vào bộ sưu tập'}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .scan-beam {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 8;
          overflow: hidden;
        }
        .scan-beam::after {
          content: '';
          position: absolute;
          left: 0; right: 0;
          height: 80px;
          background: linear-gradient(to bottom, transparent, rgba(198,114,48,0.18), transparent);
          animation: scanMove 3.5s ease-in-out infinite;
        }
        @keyframes scanMove {
          0%   { top: -80px; }
          100% { top: 100%; }
        }
        .live-dot {
          animation: livePulse 2s ease-in-out infinite;
        }
        @keyframes livePulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(0.7); }
        }
        .shutter-btn {
          width: 54px; height: 54px;
          border-radius: 50%;
          border: 2.5px solid rgba(255,255,255,0.6);
          display: flex; align-items: center; justify-content: center;
          background: transparent;
          transition: transform 0.15s ease, border-color 0.15s ease;
          cursor: pointer;
        }
        .shutter-btn:hover { transform: scale(1.08); border-color: white; }
        .shutter-btn:active { transform: scale(0.93); }
        .shutter-inner {
          width: 40px; height: 40px;
          border-radius: 50%;
          background: rgba(255,255,255,0.88);
          display: block;
          transition: background 0.15s ease;
        }
        .shutter-btn:hover .shutter-inner { background: white; }
        .stop-btn {
          width: 54px; height: 54px;
          border-radius: 50%;
          border: 2.5px solid rgba(220,80,80,0.7);
          display: flex; align-items: center; justify-content: center;
          background: transparent;
          transition: transform 0.15s ease;
          cursor: pointer;
        }
        .stop-btn:hover { transform: scale(1.08); }
        .stop-btn:active { transform: scale(0.93); }
        .stop-square {
          width: 18px; height: 18px;
          border-radius: 3px;
          background: rgba(220,80,80,0.85);
          display: block;
        }
        .camera-idle-text {
          animation: idleDrift 8s ease-in-out infinite;
        }
        @keyframes idleDrift {
          0%,100% { letter-spacing: -4px; opacity: 0.04; }
          50%      { letter-spacing: 2px;  opacity: 0.07; }
        }
      ` }} />
      <Footer />
    </div>
  );
}
