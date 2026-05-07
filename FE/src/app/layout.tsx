import type { Metadata } from 'next';
import { Nunito, Baloo_2 } from 'next/font/google';
import './globals.css';
import GoogleAuthProvider from '@/components/GoogleAuthProvider';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-nunito',
});

const baloo = Baloo_2({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-baloo',
});

export const metadata: Metadata = {
  title: 'HANGUL - Học tiếng Hàn',
  description: 'Ứng dụng học tiếng Hàn tương tác với quiz, luyện viết, phát âm, và camera detection',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        <GoogleAuthProvider>
          {children}
        </GoogleAuthProvider>
      </body>
    </html>
  );
}
