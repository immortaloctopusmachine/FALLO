// ============ Enums ============

export type AcademyItemStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type AcademyDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type AcademyQuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE';

// ============ Content Blocks ============

export interface TextContentBlock {
  id: string;
  type: 'TEXT';
  content: string; // Markdown
}

export interface ImageContentBlock {
  id: string;
  type: 'IMAGE';
  url: string;
  alt: string;
  caption?: string;
}

export interface VideoContentBlock {
  id: string;
  type: 'VIDEO';
  url: string;
  caption?: string;
}

export interface AudioContentBlock {
  id: string;
  type: 'AUDIO';
  url: string;
  caption?: string;
}

export type ContentBlock =
  | TextContentBlock
  | ImageContentBlock
  | VideoContentBlock
  | AudioContentBlock;

// ============ Quiz ============

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  type: AcademyQuestionType;
  question: string;
  options: QuizOption[];
  explanation?: string;
}

// ============ Category ============

export interface AcademyCategory {
  id: string;
  name: string;
  color: string | null;
  position: number;
  isActive: boolean;
}

// ============ Badge Reward (lightweight) ============

export interface BadgeRewardInfo {
  id: string;
  name: string;
  iconUrl: string | null;
}

// ============ Tutorial ============

export interface AcademyTutorial {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  creatorName: string | null;
  creatorAvatar: string | null;
  status: AcademyItemStatus;
  difficulty: AcademyDifficulty | null;
  estimatedMinutes: number | null;
  passingScore: number;
  coinsReward: number;
  position: number;
  contentBlocks: ContentBlock[];
  quiz: QuizQuestion[];
  categoryId: string | null;
  category: AcademyCategory | null;
  badgeDefinitionId: string | null;
  badgeReward: BadgeRewardInfo | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

// ============ Course ============

export interface AcademyCourse {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  creatorName: string | null;
  creatorAvatar: string | null;
  status: AcademyItemStatus;
  difficulty: AcademyDifficulty | null;
  estimatedMinutes: number | null;
  passingScore: number;
  coinsReward: number;
  position: number;
  finalQuiz: QuizQuestion[];
  enforceOrder: boolean;
  categoryId: string | null;
  category: AcademyCategory | null;
  badgeDefinitionId: string | null;
  badgeReward: BadgeRewardInfo | null;
  createdById: string;
  lessons: AcademyLesson[];
  createdAt: string;
  updatedAt: string;
}

// ============ Lesson ============

export interface AcademyLesson {
  id: string;
  title: string;
  description: string | null;
  position: number;
  passingScore: number;
  contentBlocks: ContentBlock[];
  quiz: QuizQuestion[];
  courseId: string;
  createdAt: string;
  updatedAt: string;
}

// ============ Progress ============

export interface AcademyProgress {
  id: string;
  userId: string;
  tutorialId: string | null;
  courseId: string | null;
  lessonId: string | null;
  quizScore: number | null;
  passed: boolean;
  attempts: number;
  coinsEarned: number;
  completedAt: string | null;
  lastAttemptAt: string | null;
}

// ============ Landing Page ============

export interface AcademyLandingItem {
  id: string;
  type: 'tutorial' | 'course';
  title: string;
  description: string | null;
  coverImage: string | null;
  creatorName: string | null;
  creatorAvatar: string | null;
  difficulty: AcademyDifficulty | null;
  estimatedMinutes: number | null;
  coinsReward: number;
  badgeReward: BadgeRewardInfo | null;
  category: AcademyCategory | null;
  lessonCount?: number;
  userProgress: {
    passed: boolean;
    quizScore: number | null;
    attempts: number;
    lessonsCompleted?: number;
    totalLessons?: number;
  } | null;
}

export interface AcademyLandingData {
  tutorials: AcademyLandingItem[];
  courses: AcademyLandingItem[];
  categories: AcademyCategory[];
}

// ============ Quiz Submission / Result ============

export interface QuizSubmission {
  answers: Record<string, string>; // questionId -> selectedOptionId
}

export interface QuizQuestionResult {
  questionId: string;
  correct: boolean;
  correctOptionId: string;
  selectedOptionId: string;
  explanation: string | null;
}

export interface QuizResult {
  score: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  coinsEarned: number;
  badgeAwarded: BadgeRewardInfo | null;
  questionResults: QuizQuestionResult[];
}

// ============ Tutorial Detail (with user progress) ============

export interface AcademyTutorialDetail extends AcademyTutorial {
  userProgress: AcademyProgress | null;
}

// ============ Course Detail (with user + lesson progress) ============

export interface AcademyCourseDetail extends AcademyCourse {
  userProgress: AcademyProgress | null;
  lessonProgress: Record<string, AcademyProgress>; // lessonId -> progress
}

// ============ Lesson Detail (with user progress) ============

export interface AcademyLessonDetail extends AcademyLesson {
  userProgress: AcademyProgress | null;
  course: {
    id: string;
    title: string;
    enforceOrder: boolean;
  };
  previousLesson: { id: string; title: string; passed: boolean } | null;
  nextLesson: { id: string; title: string } | null;
}
