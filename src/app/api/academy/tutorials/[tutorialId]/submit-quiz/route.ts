import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import { gradeQuiz, validateQuizSubmission } from '@/lib/academy/quiz-grading';
import { awardCoins } from '@/lib/academy/coin-service';
import { awardAcademyBadge } from '@/lib/academy/badge-service';
import type { QuizQuestion, QuizSubmission } from '@/types/academy';

// POST /api/academy/tutorials/[tutorialId]/submit-quiz
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tutorialId: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { tutorialId } = await params;

    const tutorial = await prisma.academyTutorial.findUnique({
      where: { id: tutorialId },
      select: {
        id: true,
        status: true,
        quiz: true,
        passingScore: true,
        coinsReward: true,
        badgeDefinitionId: true,
      },
    });

    if (!tutorial || tutorial.status !== 'PUBLISHED') {
      return ApiErrors.notFound('Tutorial');
    }

    const questions = tutorial.quiz as unknown as QuizQuestion[];
    if (questions.length === 0) {
      return ApiErrors.validation('This tutorial has no quiz questions');
    }

    const body: QuizSubmission = await request.json();
    const validationError = validateQuizSubmission(questions, body);
    if (validationError) return ApiErrors.validation(validationError);

    const gradeResult = gradeQuiz(questions, body, tutorial.passingScore);

    // Upsert progress
    const existingProgress = await prisma.academyProgress.findUnique({
      where: { userId_tutorialId: { userId: session.user.id, tutorialId } },
    });

    const alreadyPassed = existingProgress?.passed ?? false;
    const isFirstPass = gradeResult.passed && !alreadyPassed;

    let coinsEarned = 0;
    let badgeAwarded = null;

    if (isFirstPass) {
      // Award coins on first pass
      if (tutorial.coinsReward > 0) {
        await awardCoins(session.user.id, tutorial.coinsReward);
        coinsEarned = tutorial.coinsReward;
      }
      // Award badge on first pass
      if (tutorial.badgeDefinitionId) {
        badgeAwarded = await awardAcademyBadge(session.user.id, tutorial.badgeDefinitionId);
      }
    }

    await prisma.academyProgress.upsert({
      where: { userId_tutorialId: { userId: session.user.id, tutorialId } },
      create: {
        userId: session.user.id,
        tutorialId,
        quizScore: gradeResult.score,
        passed: gradeResult.passed,
        attempts: 1,
        coinsEarned,
        completedAt: gradeResult.passed ? new Date() : null,
        lastAttemptAt: new Date(),
      },
      update: {
        quizScore: gradeResult.score,
        passed: gradeResult.passed || alreadyPassed, // Once passed, stays passed
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
    console.error('POST /api/academy/tutorials/[tutorialId]/submit-quiz error:', error);
    return ApiErrors.internal();
  }
}
