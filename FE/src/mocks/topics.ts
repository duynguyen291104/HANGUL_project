/**
 * Topics Data Structure
 * Each level has multiple topics (ordered)
 * Later: will be replaced with DB query
 */

export type Level = 'NEWBIE' | 'BEGINNER' | 'INTERMEDIATE' | 'UPPER' | 'ADVANCED';

export interface Topic {
  id: string;
  level: Level;
  order: number;
  name: string;
  description: string;
  lessonsCount: number;
}

export const topics: Topic[] = [
  // ===== NEWBIE (Cực cơ bản) =====
  {
    id: 'newbie-1',
    level: 'NEWBIE',
    order: 1,
    name: 'Chào hỏi cơ bản',
    description: 'Học cách chào hỏi và giới thiệu bản thân',
    lessonsCount: 5,
  },
  {
    id: 'newbie-2',
    level: 'NEWBIE',
    order: 2,
    name: 'Giới thiệu bản thân',
    description: 'Nói về tên, tuổi, quốc tịch',
    lessonsCount: 5,
  },
  {
    id: 'newbie-3',
    level: 'NEWBIE',
    order: 3,
    name: 'Số đếm',
    description: 'Học các con số từ 0-100',
    lessonsCount: 4,
  },
  {
    id: 'newbie-4',
    level: 'NEWBIE',
    order: 4,
    name: 'Bảng chữ cái',
    description: 'Học Hangul từ A-Z',
    lessonsCount: 6,
  },
  {
    id: 'newbie-5',
    level: 'NEWBIE',
    order: 5,
    name: 'Màu sắc',
    description: 'Học tên các màu cơ bản',
    lessonsCount: 4,
  },
  {
    id: 'newbie-6',
    level: 'NEWBIE',
    order: 6,
    name: 'Gia đình',
    description: 'Thành viên gia đình và mối quan hệ',
    lessonsCount: 5,
  },
  {
    id: 'newbie-7',
    level: 'NEWBIE',
    order: 7,
    name: 'Bạn bè',
    description: 'Giao tiếp với bạn bè',
    lessonsCount: 4,
  },
  {
    id: 'newbie-8',
    level: 'NEWBIE',
    order: 8,
    name: 'Đồ vật xung quanh',
    description: 'Tên các vật dụng hàng ngày',
    lessonsCount: 5,
  },
  {
    id: 'newbie-9',
    level: 'NEWBIE',
    order: 9,
    name: 'Trường học',
    description: 'Từ vựng về trường học',
    lessonsCount: 4,
  },
  {
    id: 'newbie-10',
    level: 'NEWBIE',
    order: 10,
    name: 'Nghề nghiệp đơn giản',
    description: 'Các nghề nghiệp phổ biến',
    lessonsCount: 4,
  },

  // ===== BEGINNER (Viết câu đơn) =====
  {
    id: 'beginner-1',
    level: 'BEGINNER',
    order: 1,
    name: 'Daily routine',
    description: 'Thói quen hằng ngày',
    lessonsCount: 6,
  },
  {
    id: 'beginner-2',
    level: 'BEGINNER',
    order: 2,
    name: 'Sở thích',
    description: 'Nói về những hoạt động yêu thích',
    lessonsCount: 5,
  },
  {
    id: 'beginner-3',
    level: 'BEGINNER',
    order: 3,
    name: 'Đi mua sắm',
    description: 'Giao tiếp khi mua sắm',
    lessonsCount: 5,
  },
  {
    id: 'beginner-4',
    level: 'BEGINNER',
    order: 4,
    name: 'Ăn uống ngoài',
    description: 'Đặt bàn, gọi đồ ăn',
    lessonsCount: 5,
  },
  {
    id: 'beginner-5',
    level: 'BEGINNER',
    order: 5,
    name: 'Du lịch cơ bản',
    description: 'Hỏi đường, tìm khách sạn',
    lessonsCount: 6,
  },
  {
    id: 'beginner-6',
    level: 'BEGINNER',
    order: 6,
    name: 'Phương tiện di chuyển',
    description: 'Xe buýt, tàu, taxi',
    lessonsCount: 4,
  },
  {
    id: 'beginner-7',
    level: 'BEGINNER',
    order: 7,
    name: 'Thời gian & lịch trình',
    description: 'Nói về giờ, ngày, tuần',
    lessonsCount: 5,
  },
  {
    id: 'beginner-8',
    level: 'BEGINNER',
    order: 8,
    name: 'Viết tin nhắn',
    description: 'Giao tiếp qua tin nhắn',
    lessonsCount: 4,
  },

  // ===== INTERMEDIATE (Viết đoạn văn) =====
  {
    id: 'intermediate-1',
    level: 'INTERMEDIATE',
    order: 1,
    name: 'Du lịch chi tiết',
    description: 'Mô tả các trải nghiệm du lịch',
    lessonsCount: 6,
  },
  {
    id: 'intermediate-2',
    level: 'INTERMEDIATE',
    order: 2,
    name: 'Văn hóa các nước',
    description: 'Tìm hiểu văn hóa khác nhau',
    lessonsCount: 6,
  },
  {
    id: 'intermediate-3',
    level: 'INTERMEDIATE',
    order: 3,
    name: 'Công việc & sự nghiệp',
    description: 'Nói về công việc và kế hoạch',
    lessonsCount: 6,
  },
  {
    id: 'intermediate-4',
    level: 'INTERMEDIATE',
    order: 4,
    name: 'Sức khỏe & thể thao',
    description: 'Tập luyện và cuộc sống khỏe mạnh',
    lessonsCount: 5,
  },
  {
    id: 'intermediate-5',
    level: 'INTERMEDIATE',
    order: 5,
    name: 'Thức ăn & ẩm thực',
    description: 'Nói về các loại đồ ăn',
    lessonsCount: 6,
  },
  {
    id: 'intermediate-6',
    level: 'INTERMEDIATE',
    order: 6,
    name: 'Mô tả trải nghiệm',
    description: 'Kể chuyện chi tiết hơn',
    lessonsCount: 5,
  },

  // ===== UPPER-INTERMEDIATE (Viết có lập luận) =====
  {
    id: 'upper-1',
    level: 'UPPER',
    order: 1,
    name: 'Công nghệ & AI',
    description: 'Thảo luận về công nghệ',
    lessonsCount: 7,
  },
  {
    id: 'upper-2',
    level: 'UPPER',
    order: 2,
    name: 'Giáo dục hiện đại',
    description: 'Tranh luận về hệ thống giáo dục',
    lessonsCount: 6,
  },
  {
    id: 'upper-3',
    level: 'UPPER',
    order: 3,
    name: 'Work-life balance',
    description: 'Cân bằng công việc và cuộc sống',
    lessonsCount: 6,
  },
  {
    id: 'upper-4',
    level: 'UPPER',
    order: 4,
    name: 'Mạng xã hội & tác động',
    description: 'Ảnh hưởng của social media',
    lessonsCount: 6,
  },
  {
    id: 'upper-5',
    level: 'UPPER',
    order: 5,
    name: 'Vấn đề môi trường',
    description: 'Thảo luận về biến đổi khí hậu',
    lessonsCount: 6,
  },

  // ===== ADVANCED (Viết essay, phân tích) =====
  {
    id: 'advanced-1',
    level: 'ADVANCED',
    order: 1,
    name: 'AI thay thế con người',
    description: 'Phân tích tương lai công nghệ',
    lessonsCount: 8,
  },
  {
    id: 'advanced-2',
    level: 'ADVANCED',
    order: 2,
    name: 'Tương lai giáo dục',
    description: 'Giáo dục trong thế kỷ 21',
    lessonsCount: 8,
  },
  {
    id: 'advanced-3',
    level: 'ADVANCED',
    order: 3,
    name: 'Biến đổi khí hậu',
    description: 'Phân tích vấn đề toàn cầu',
    lessonsCount: 8,
  },
  {
    id: 'advanced-4',
    level: 'ADVANCED',
    order: 4,
    name: 'Chính trị & xã hội',
    description: 'Phân tích các vấn đề chính trị',
    lessonsCount: 8,
  },
];

/**
 * Helper functions
 */

export function getTopicsByLevel(level: Level): Topic[] {
  return topics
    .filter((t) => t.level === level)
    .sort((a, b) => a.order - b.order);
}

export function getTopicById(id: string): Topic | undefined {
  return topics.find((t) => t.id === id);
}

export function getNextTopic(currentTopicId: string, level: Level): Topic | undefined {
  const currentTopic = getTopicById(currentTopicId);
  if (!currentTopic) return undefined;

  const levelTopics = getTopicsByLevel(level);
  const currentIndex = levelTopics.findIndex((t) => t.id === currentTopicId);
  return levelTopics[currentIndex + 1];
}

export function getFirstTopicForLevel(level: Level): Topic | undefined {
  return getTopicsByLevel(level)[0];
}
