'use client';

import TopicList from '@/components/TopicList';
import Footer from '@/components/Footer';

export default function PronunciationPage() {
  return (
    <>
      <TopicList mode="speak" />
      <Footer />
    </>
  );
}
