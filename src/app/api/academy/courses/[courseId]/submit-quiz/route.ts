import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import { gradeQuiz, validateQuizSubmission } from '@/lib/academy/quiz-grading';
import { awardCoins } from '@/lib/academy/coin-service';
import { awardAcademyBadge } from '@/lib/academy/badge-service';
import type { QuizQuestion, QuizSubmission } from '@/types/academy';

// POST /api/academy/courses/[courseId]/submit-quiz — final course quiz
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { courseId } = await params;

    const course = await prisma.academyCourse.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        status: true,
        finalQuiz: true,
        passingScore: true,
        coinsReward: true,
        badgeDefinitionId: true,
        lessons: {
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

    // All lessons must be passed before the final quiz
    const allLessonsPassed = course.lessons.every((l) => l.progress[0]?.passed);
    if (!allLessonsPassed) {
      return ApiErrors.validation('All lessons must be completed before taking the final quiz');
    }

    const questions = course.finalQuiz as unknown as QuizQuestion[];
    if (questions.length === 0) {
      return ApiErrors.validation('This course has no final quiz questions');
    }

    const body: QuizSubmission = await request.json();
    const validationError = validateQuizSubmission(questions, body);
    if (validationError) return ApiErrors.validation(validationError);

    const gradeResult = gradeQuiz(questions, body, course.passingScore);

    const existingProgress = await prisma.academyProgress.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId } },
    });

    const alreadyPassed = existingProgress?.passed ?? false;
    const isFirstPass = gradeResult.passed && !alreadyPassed;

    let coinsEarned = 0;
    let badgeAwarded = null;

    if (isFirstPass) {
      if (course.coinsReward > 0) {
        await awardCoins(session.user.id, course.coinsReward);
        coinsEarned = course.coinsReward;
      }
      if (course.badgeDefinitionId) {
        badgeAwarded = await awardAcademyBadge(session.user.id, course.badgeDefinitionId);
      }
    }

    await prisma.academyProgress.upsert({
      where: { userId_courseId: { userId: session.user.id, courseId } },
      create: {
        userId: session.user.id,
        courseId,
        quizScore: gradeResult.score,
        passed: gradeResult.passed,
        attempts: 1,
        coinsEarned,
        completedAt: gradeResult.passed ? new Date() : null,
        lastAttemptAt: new Date(),
      },
      update: {
        quizScore: gradeResult.score,
        passed: gradeResult.passed || alreadyPassed,
        attempts: { increment: 1 },
        ...(isFirstPass && { coinsEarned, completedAt: new Date() }),
        lastAttemptAt: new Date(),
      },
    });

    return apiSuccess({
      score: gradeResult.score,
      passed: gradeResult.passed,
      correctCount: gradeResult.correctCount,
      totalQuestions: gradeResult.totalQuestions,
      coinsEarned,
      badgeAwarded,
      questionResults: gradeResult.questionResults,
    });
  } catch (error) {
    console.error('POST /api/academy/courses/[courseId]/submit-quiz error:', error);
    return ApiErrors.internal();
  }
}
