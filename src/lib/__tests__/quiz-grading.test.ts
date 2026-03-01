import { describe, it, expect } from 'vitest';
import { gradeQuiz, validateQuizSubmission } from '@/lib/academy/quiz-grading';
import type { QuizQuestion, QuizSubmission } from '@/types/academy';

const sampleQuestions: QuizQuestion[] = [
  {
    id: 'q1',
    type: 'MULTIPLE_CHOICE',
    question: 'What color is the sky?',
    options: [
      { id: 'a', text: 'Red', isCorrect: false },
      { id: 'b', text: 'Blue', isCorrect: true },
      { id: 'c', text: 'Green', isCorrect: false },
    ],
    explanation: 'The sky appears blue due to Rayleigh scattering.',
  },
  {
    id: 'q2',
    type: 'TRUE_FALSE',
    question: 'Water boils at 100°C at sea level.',
    options: [
      { id: 't', text: 'True', isCorrect: true },
      { id: 'f', text: 'False', isCorrect: false },
    ],
  },
  {
    id: 'q3',
    type: 'MULTIPLE_CHOICE',
    question: 'Which planet is closest to the Sun?',
    options: [
      { id: 'x', text: 'Venus', isCorrect: false },
      { id: 'y', text: 'Mercury', isCorrect: true },
    ],
  },
];

describe('gradeQuiz', () => {
  it('grades all correct answers as 100%', () => {
    const submission: QuizSubmission = {
      answers: { q1: 'b', q2: 't', q3: 'y' },
    };
    const result = gradeQuiz(sampleQuestions, submission, 70);

    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.correctCount).toBe(3);
    expect(result.totalQuestions).toBe(3);
    expect(result.questionResults).toHaveLength(3);
    expect(result.questionResults.every((r) => r.correct)).toBe(true);
  });

  it('grades all wrong answers as 0%', () => {
    const submission: QuizSubmission = {
      answers: { q1: 'a', q2: 'f', q3: 'x' },
    };
    const result = gradeQuiz(sampleQuestions, submission, 70);

    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.correctCount).toBe(0);
  });

  it('handles partial correct answers', () => {
    const submission: QuizSubmission = {
      answers: { q1: 'b', q2: 'f', q3: 'y' },
    };
    const result = gradeQuiz(sampleQuestions, submission, 70);

    expect(result.score).toBe(67); // 2/3 = 66.67 rounded to 67
    expect(result.passed).toBe(false); // 67 < 70
    expect(result.correctCount).toBe(2);
  });

  it('passes when score equals passing score exactly', () => {
    const submission: QuizSubmission = {
      answers: { q1: 'b', q2: 'f', q3: 'y' },
    };
    const result = gradeQuiz(sampleQuestions, submission, 67);

    expect(result.passed).toBe(true); // 67 >= 67
  });

  it('handles empty questions array', () => {
    const result = gradeQuiz([], { answers: {} }, 70);

    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.totalQuestions).toBe(0);
  });

  it('returns correct explanations', () => {
    const submission: QuizSubmission = {
      answers: { q1: 'a', q2: 't', q3: 'y' },
    };
    const result = gradeQuiz(sampleQuestions, submission, 70);

    expect(result.questionResults[0].explanation).toBe('The sky appears blue due to Rayleigh scattering.');
    expect(result.questionResults[1].explanation).toBeNull();
  });

  it('reports correct option IDs in results', () => {
    const submission: QuizSubmission = {
      answers: { q1: 'a', q2: 'f', q3: 'x' },
    };
    const result = gradeQuiz(sampleQuestions, submission, 70);

    expect(result.questionResults[0].correctOptionId).toBe('b');
    expect(result.questionResults[0].selectedOptionId).toBe('a');
    expect(result.questionResults[1].correctOptionId).toBe('t');
  });

  it('handles unanswered questions as incorrect', () => {
    const submission: QuizSubmission = {
      answers: { q1: 'b' }, // q2 and q3 not answered
    };
    const result = gradeQuiz(sampleQuestions, submission, 70);

    expect(result.correctCount).toBe(1);
    expect(result.score).toBe(33); // 1/3 = 33.33 rounded to 33
  });
});

describe('validateQuizSubmission', () => {
  it('returns null for valid submission', () => {
    const submission: QuizSubmission = {
      answers: { q1: 'b', q2: 't', q3: 'y' },
    };
    expect(validateQuizSubmission(sampleQuestions, submission)).toBeNull();
  });

  it('returns error for missing answers', () => {
    const submission: QuizSubmission = {
      answers: { q1: 'b' },
    };
    const error = validateQuizSubmission(sampleQuestions, submission);
    expect(error).toContain('Missing answer');
  });

  it('returns error for invalid answers object', () => {
    const error = validateQuizSubmission(sampleQuestions, {} as QuizSubmission);
    expect(error).toContain('answers must be an object');
  });
});
