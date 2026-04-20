'use client';

import TopicList from '@/components/TopicList';
import Footer from '@/components/Footer';

export default function QuizPage() {
  return (
    <>
      <TopicList mode="quiz" />
      <Footer />
    </>
  );
}
