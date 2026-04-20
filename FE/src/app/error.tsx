'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#fafaf5]">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-[#72564c] mb-4">Đã xảy ra lỗi</h2>
        <p className="text-[#504441] mb-6">{error.message || 'Vui lòng thử lại'}</p>
        <button
          onClick={() => reset()}
          className="px-6 py-2 bg-[#72564c] text-white rounded-lg hover:bg-[#5c453a] transition-colors"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
