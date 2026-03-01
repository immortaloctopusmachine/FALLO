import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import { gradeQuiz, validateQuizSubmission } from '@/lib/academy/quiz-grading';
import type { QuizQuestion, QuizSubmission } from '@/types/academy';

// POST /api/academy/courses/[courseId]/lessons/[lessonId]/submit-quiz
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { courseId, lessonId } = await params;

    // Validate course exists and is published
    const course = await prisma.academyCourse.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        status: true,
        enforceOrder: true,
        lessons: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            progress: {
              where: { userId: session.user.id },
              select: { passed: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!course || course.status !== 'PUBLISHED') {
      return ApiErrors.notFound('Course');
    }

    // Check sequential enforcement
    if (course.enforceOrder) {
      const lessonIndex = course.lessons.findIndex((l) => l.id === lessonId);
      if (lessonIndex > 0) {
        const prevLesson = course.lessons[lessonIndex - 1];
        if (!prevLesson.progress[0]?.passed) {
          return ApiErrors.validation('Previous lesson must be completed first');
        }
      }
    }

    const lesson = await prisma.academyLesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        courseId: true,
        quiz: true,
        passingScore: true,
      },
    });

    if (!lesson || lesson.courseId !== courseId) {
      return ApiErrors.notFound('Lesson');
    }

    const questions = lesson.quiz as unknown as QuizQuestion[];
    if (questions.length === 0) {
      return ApiErrors.validation('This lesson has no quiz questions');
    }

    const body: QuizSubmission = await request.json();
    const validationError = validateQuizSubmission(questions, body);
    if (validationError) return ApiErrors.validation(validationError);

    const gradeResult = gradeQuiz(questions, body, lesson.passingScore);

    const existingProgress = await prisma.academyProgress.findUnique({
      where: { userId_lessonId: { userId: session.user.id, lessonId } },
    });

    const alreadyPassed = existingProgress?.passed ?? false;

    await prisma.academyProgress.upsert({
      where: { userId_lessonId: { userId: session.user.id, lessonId } },
      create: {
        userId: session.user.id,
        lessonId,
        quizScore: gradeResult.score,
        passed: gradeResult.passed,
        attempts: 1,
        completedAt: gradeResult.passed ? new Date() : null,
        lastAttemptAt: new Date(),
      },
      update: {
        quizScore: gradeResult.score,
        passed: gradeResult.passed || alreadyPassed,
        attempts: { increment: 1 },
        ...(!alreadyPassed && gradeResult.passed && { completedAt: new Date() }),
        lastAttemptAt: new Date(),
      },
    });

    return apiSuccess({
      score: gradeResult.score,
      passed: gradeResult.passed,
      correctCount: gradeResult.correctCount,
      totalQuestions: gradeResult.totalQuestions,
      coinsEarned: 0, // Lessons don't award coins (only courses/tutorials do)
      badgeAwarded: null,
      questionResults: gradeResult.questionResults,
    });
  } catch (error) {
    console.error('POST /api/academy/courses/[courseId]/lessons/[lessonId]/submit-quiz error:', error);
    return ApiErrors.internal();
  }
}
