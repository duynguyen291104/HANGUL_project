'use client';

import { useGoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Component bên trong — chỉ render khi có Provider
function GoogleLoginButtonInner({ redirectTo }: { redirectTo: string }) {
  const { googleLogin } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError('');
      try {
        await googleLogin(tokenResponse.access_token);
        const role = useAuthStore.getState().user?.role;
        router.push(role === 'ADMIN' ? '/admin/dashboard' : redirectTo);
      } catch (err: any) {
        setError(err?.message || 'Đăng nhập Google thất bại');
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Đăng nhập Google bị huỷ hoặc thất bại'),
    flow: 'implicit',
  });

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => login()}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white border border-[#d4c3be] rounded-full shadow-sm hover:shadow-md hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50 font-semibold text-[#504441]"
      >
        {loading ? (
          <span className="w-5 h-5 border-2 border-[#72564c]/30 border-t-[#72564c] rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            {/* giữ nguyên svg paths */}
          </svg>
        )}
        {loading ? 'Đang xử lý...' : 'Tiếp tục với Google'}
      </button>
      {error && <p className="text-[#93000a] text-xs text-center px-1">{error}</p>}
    </div>
  );
}

// Component ngoài — kiểm tra clientId trước
export default function GoogleLoginButton({ redirectTo = '/level-selection' }: { redirectTo?: string }) {
  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return null;
  return <GoogleLoginButtonInner redirectTo={redirectTo} />;
}