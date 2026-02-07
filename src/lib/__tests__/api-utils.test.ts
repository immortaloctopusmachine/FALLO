import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/server before importing api-utils
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}));

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    boardMember: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import {
  apiError,
  apiSuccess,
  ApiErrors,
  hasPermission,
  type PermissionLevel,
} from '../api-utils';

// Note: requireAuth, requireAdmin, requireBoardMember, and requireBoardAdmin
// are not tested here because they depend on Prisma and NextAuth session.
// Those would require integration tests with mocked database.

describe('api-utils', () => {
  describe('apiError', () => {
    it('creates unauthorized error response', () => {
      const response = apiError('UNAUTHORIZED', 'Not authenticated', 401);
      expect(response.status).toBe(401);
    });

    it('creates validation error response', () => {
      const response = apiError('VALIDATION_ERROR', 'Invalid input', 400);
      expect(response.status).toBe(400);
    });

    it('creates not found error response', () => {
      const response = apiError('NOT_FOUND', 'Resource not found', 404);
      expect(response.status).toBe(404);
    });

    it('creates forbidden error response', () => {
      const response = apiError('FORBIDDEN', 'Access denied', 403);
      expect(response.status).toBe(403);
    });

    it('creates internal error response', () => {
      const response = apiError('INTERNAL_ERROR', 'Server error', 500);
      expect(response.status).toBe(500);
    });

    it('creates conflict error response', () => {
      const response = apiError('CONFLICT', 'Resource already exists', 409);
      expect(response.status).toBe(409);
    });
  });

  describe('apiSuccess', () => {
    it('creates success response with default status', () => {
      const response = apiSuccess({ id: '123', name: 'Test' });
      expect(response.status).toBe(200);
    });

    it('creates success response with custom status', () => {
      const response = apiSuccess({ id: '123' }, 201);
      expect(response.status).toBe(201);
    });

    it('handles null data', () => {
      const response = apiSuccess(null);
      expect(response.status).toBe(200);
    });

    it('handles array data', () => {
      const response = apiSuccess([{ id: '1' }, { id: '2' }]);
      expect(response.status).toBe(200);
    });
  });

  describe('ApiErrors', () => {
    it('unauthorized returns 401', () => {
      const response = ApiErrors.unauthorized();
      expect(response.status).toBe(401);
    });

    it('forbidden returns 403 with default message', () => {
      const response = ApiErrors.forbidden();
      expect(response.status).toBe(403);
    });

    it('forbidden accepts custom message', () => {
      const response = ApiErrors.forbidden('Custom forbidden message');
      expect(response.status).toBe(403);
    });

    it('adminRequired returns 403', () => {
      const response = ApiErrors.adminRequired();
      expect(response.status).toBe(403);
    });

    it('notFound returns 404 with default resource', () => {
      const response = ApiErrors.notFound();
      expect(response.status).toBe(404);
    });

    it('notFound accepts custom resource name', () => {
      const response = ApiErrors.notFound('Board');
      expect(response.status).toBe(404);
    });

    it('validation returns 400', () => {
      const response = ApiErrors.validation('Invalid email format');
      expect(response.status).toBe(400);
    });

    it('conflict returns 409', () => {
      const response = ApiErrors.conflict('Email already in use');
      expect(response.status).toBe(409);
    });

    it('internal returns 500 with default message', () => {
      const response = ApiErrors.internal();
      expect(response.status).toBe(500);
    });

    it('internal accepts custom message', () => {
      const response = ApiErrors.internal('Database connection failed');
      expect(response.status).toBe(500);
    });
  });

  describe('hasPermission', () => {
    const testCases: Array<{
      user: PermissionLevel;
      required: PermissionLevel;
      expected: boolean;
    }> = [
      // SUPER_ADMIN has all permissions
      { user: 'SUPER_ADMIN', required: 'SUPER_ADMIN', expected: true },
      { user: 'SUPER_ADMIN', required: 'ADMIN', expected: true },
      { user: 'SUPER_ADMIN', required: 'MEMBER', expected: true },
      { user: 'SUPER_ADMIN', required: 'VIEWER', expected: true },

      // ADMIN has admin and below
      { user: 'ADMIN', required: 'SUPER_ADMIN', expected: false },
      { user: 'ADMIN', required: 'ADMIN', expected: true },
      { user: 'ADMIN', required: 'MEMBER', expected: true },
      { user: 'ADMIN', required: 'VIEWER', expected: true },

      // MEMBER has member and viewer
      { user: 'MEMBER', required: 'SUPER_ADMIN', expected: false },
      { user: 'MEMBER', required: 'ADMIN', expected: false },
      { user: 'MEMBER', required: 'MEMBER', expected: true },
      { user: 'MEMBER', required: 'VIEWER', expected: true },

      // VIEWER only has viewer
      { user: 'VIEWER', required: 'SUPER_ADMIN', expected: false },
      { user: 'VIEWER', required: 'ADMIN', expected: false },
      { user: 'VIEWER', required: 'MEMBER', expected: false },
      { user: 'VIEWER', required: 'VIEWER', expected: true },
    ];

    it.each(testCases)(
      '$user can access $required = $expected',
      ({ user, required, expected }) => {
        expect(hasPermission(user, required)).toBe(expected);
      }
    );

    it('follows permission hierarchy', () => {
      // SUPER_ADMIN > ADMIN > MEMBER > VIEWER
      expect(hasPermission('SUPER_ADMIN', 'VIEWER')).toBe(true);
      expect(hasPermission('VIEWER', 'SUPER_ADMIN')).toBe(false);
    });
  });
});
