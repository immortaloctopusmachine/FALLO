import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiFetch } from '@/lib/api-client';
import type {
  AcademyLandingData,
  AcademyTutorialDetail,
  AcademyCourseDetail,
  AcademyLessonDetail,
  AcademyCategory,
  QuizResult,
  QuizSubmission,
} from '@/types/academy';

const LIST_STALE_TIME = 5 * 60 * 1000;

// ---- Landing ----

export function useAcademyLanding(categoryId?: string) {
  const url = categoryId
    ? `/api/academy?category=${categoryId}`
    : '/api/academy';
  return useQuery({
    queryKey: ['academy', 'landing', categoryId ?? 'all'],
    queryFn: () => apiFetch<AcademyLandingData>(url),
    staleTime: LIST_STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

// ---- Categories ----

export function useAcademyCategories() {
  return useQuery({
    queryKey: ['academy', 'categories'],
    queryFn: () => apiFetch<AcademyCategory[]>('/api/academy/categories'),
    staleTime: LIST_STALE_TIME,
  });
}

// ---- Tutorial detail ----

export function useTutorialDetail(tutorialId: string) {
  return useQuery({
    queryKey: ['academy', 'tutorials', tutorialId],
    queryFn: () => apiFetch<AcademyTutorialDetail>(`/api/academy/tutorials/${tutorialId}`),
    enabled: !!tutorialId,
  });
}

// ---- Course detail ----

export function useCourseDetail(courseId: string) {
  return useQuery({
    queryKey: ['academy', 'courses', courseId],
    queryFn: () => apiFetch<AcademyCourseDetail>(`/api/academy/courses/${courseId}`),
    enabled: !!courseId,
  });
}

// ---- Lesson detail ----

export function useLessonDetail(courseId: string, lessonId: string) {
  return useQuery({
    queryKey: ['academy', 'courses', courseId, 'lessons', lessonId],
    queryFn: () => apiFetch<AcademyLessonDetail>(`/api/academy/courses/${courseId}/lessons/${lessonId}`),
    enabled: !!courseId && !!lessonId,
  });
}

// ---- Quiz submission mutations ----

export function useSubmitTutorialQuiz(tutorialId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (submission: QuizSubmission) =>
      apiFetch<QuizResult>(`/api/academy/tutorials/${tutorialId}/submit-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy', 'tutorials', tutorialId] });
      queryClient.invalidateQueries({ queryKey: ['academy', 'landing'] });
    },
  });
}

export function useSubmitLessonQuiz(courseId: string, lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (submission: QuizSubmission) =>
      apiFetch<QuizResult>(
        `/api/academy/courses/${courseId}/lessons/${lessonId}/submit-quiz`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy', 'courses', courseId] });
      queryClient.invalidateQueries({ queryKey: ['academy', 'courses', courseId, 'lessons', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['academy', 'landing'] });
    },
  });
}

export function useSubmitCourseQuiz(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (submission: QuizSubmission) =>
      apiFetch<QuizResult>(`/api/academy/courses/${courseId}/submit-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy', 'courses', courseId] });
      queryClient.invalidateQueries({ queryKey: ['academy', 'landing'] });
    },
  });
}

// ---- CRUD mutations for Super Admin ----

export function useAcademyMutations() {
  const queryClient = useQueryClient();

  return useMemo(() => ({
    // Categories
    createCategory: (data: { name: string; color?: string }) =>
      apiFetch<AcademyCategory>('/api/academy/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((result) => {
        queryClient.invalidateQueries({ queryKey: ['academy'] });
        return result;
      }),

    updateCategory: (categoryId: string, data: { name?: string; color?: string; isActive?: boolean }) =>
      apiFetch<AcademyCategory>(`/api/academy/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((result) => {
        queryClient.invalidateQueries({ queryKey: ['academy'] });
        return result;
      }),

    deleteCategory: (categoryId: string) =>
      apiFetch(`/api/academy/categories/${categoryId}`, { method: 'DELETE' })
        .then(() => { queryClient.invalidateQueries({ queryKey: ['academy'] }); }),

    reorderCategories: (categoryIds: string[]) =>
      apiFetch('/api/academy/categories/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryIds }),
      }).then(() => { queryClient.invalidateQueries({ queryKey: ['academy', 'categories'] }); }),

    // Tutorials
    createTutorial: (data: { title: string; description?: string; categoryId?: string; difficulty?: string; estimatedMinutes?: number }) =>
      apiFetch('/api/academy/tutorials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((result) => {
        queryClient.invalidateQueries({ queryKey: ['academy'] });
        return result;
      }),

    saveTutorial: (tutorialId: string, data: Record<string, unknown>) =>
      apiFetch(`/api/academy/tutorials/${tutorialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((result) => {
        queryClient.invalidateQueries({ queryKey: ['academy', 'tutorials', tutorialId] });
        queryClient.invalidateQueries({ queryKey: ['academy', 'landing'] });
        return result;
      }),

    deleteTutorial: (tutorialId: string) =>
      apiFetch(`/api/academy/tutorials/${tutorialId}`, { method: 'DELETE' })
        .then(() => { queryClient.invalidateQueries({ queryKey: ['academy'] }); }),

    // Courses
    createCourse: (data: { title: string; description?: string; categoryId?: string; difficulty?: string; estimatedMinutes?: number; enforceOrder?: boolean }) =>
      apiFetch('/api/academy/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((result) => {
        queryClient.invalidateQueries({ queryKey: ['academy'] });
        return result;
      }),

    saveCourse: (courseId: string, data: Record<string, unknown>) =>
      apiFetch(`/api/academy/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((result) => {
        queryClient.invalidateQueries({ queryKey: ['academy', 'courses', courseId] });
        queryClient.invalidateQueries({ queryKey: ['academy', 'landing'] });
        return result;
      }),

    deleteCourse: (courseId: string) =>
      apiFetch(`/api/academy/courses/${courseId}`, { method: 'DELETE' })
        .then(() => { queryClient.invalidateQueries({ queryKey: ['academy'] }); }),

    // Lessons
    createLesson: (courseId: string, data: { title: string; description?: string }) =>
      apiFetch(`/api/academy/courses/${courseId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((result) => {
        queryClient.invalidateQueries({ queryKey: ['academy', 'courses', courseId] });
        return result;
      }),

    saveLesson: (courseId: string, lessonId: string, data: Record<string, unknown>) =>
      apiFetch(`/api/academy/courses/${courseId}/lessons/${lessonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((result) => {
        queryClient.invalidateQueries({ queryKey: ['academy', 'courses', courseId] });
        queryClient.invalidateQueries({ queryKey: ['academy', 'courses', courseId, 'lessons', lessonId] });
        return result;
      }),

    deleteLesson: (courseId: string, lessonId: string) =>
      apiFetch(`/api/academy/courses/${courseId}/lessons/${lessonId}`, { method: 'DELETE' })
        .then(() => { queryClient.invalidateQueries({ queryKey: ['academy', 'courses', courseId] }); }),

    reorderLessons: (courseId: string, lessonIds: string[]) =>
      apiFetch(`/api/academy/courses/${courseId}/lessons/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonIds }),
      }).then(() => { queryClient.invalidateQueries({ queryKey: ['academy', 'courses', courseId] }); }),
  }), [queryClient]);
}
