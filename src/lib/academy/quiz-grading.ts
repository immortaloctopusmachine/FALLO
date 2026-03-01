import type { QuizQuestion, QuizSubmission, QuizQuestionResult } from '@/types/academy';

export interface QuizGradeResult {
  score: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  questionResults: QuizQuestionResult[];
}

/**
 * Grade a quiz submission against the correct answers.
 *
 * @param questions - The quiz questions with correct answers
 * @param submission - The user's submitted answers (questionId → selectedOptionId)
 * @param passingScore - The minimum percentage to pass (0–100)
 * @returns Grading result with score, pass/fail, and per-question breakdown
 */
export function gradeQuiz(
  questions: QuizQuestion[],
  submission: QuizSubmission,
  passingScore: number
): QuizGradeResult {
  const questionResults: QuizQuestionResult[] = [];
  let correctCount = 0;

  for (const question of questions) {
    const selectedOptionId = submission.answers[question.id] ?? '';
    const correctOption = question.options.find((o) => o.isCorrect);
    const correctOptionId = correctOption?.id ?? '';
    const isCorrect = selectedOptionId === correctOptionId;

    if (isCorrect) correctCount++;

    questionResults.push({
      questionId: question.id,
      correct: isCorrect,
      correctOptionId,
      selectedOptionId,
      explanation: question.explanation ?? null,
    });
  }

  const totalQuestions = questions.length;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = score >= passingScore;

  return { score, passed, correctCount, totalQuestions, questionResults };
}

/**
 * Validate that a quiz submission contains answers for all questions.
 * Returns an error message if invalid, or null if valid.
 */
export function validateQuizSubmission(
  questions: QuizQuestion[],
  submission: QuizSubmission
): string | null {
  if (!submission.answers || typeof submission.answers !== 'object') {
    return 'answers must be an object mapping questionId to selectedOptionId';
  }

  const questionIds = new Set(questions.map((q) => q.id));
  const answeredIds = new Set(Object.keys(submission.answers));

  for (const qId of questionIds) {
    if (!answeredIds.has(qId)) {
      return `Missing answer for question ${qId}`;
    }
  }

  return null;
}
