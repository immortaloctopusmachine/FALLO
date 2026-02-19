/**
 * API utility functions for consistent authentication, authorization, and response handling.
 *
 * This module reduces boilerplate across API routes by providing:
 * - Authentication checking with typed session
 * - Permission/role validation
 * - Consistent error and success response formatting
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';

/**
 * Standard API error codes used across the application.
 */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

/**
 * Standard API error response structure.
 */
export interface ApiError {
  code: ApiErrorCode;
  message: string;
}

/**
 * Standard API response structure.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * Create a standardized error response.
 *
 * @param code - Error code
 * @param message - Human-readable error message
 * @param status - HTTP status code
 * @returns NextResponse with error body
 */
export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number
): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status }
  );
}

/**
 * Create a standardized success response.
 *
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with success body
 */
export function apiSuccess<T>(
  data: T,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Common error responses.
 */
export const ApiErrors = {
  unauthorized: () => apiError('UNAUTHORIZED', 'Not authenticated', 401),
  forbidden: (message = 'Access denied') => apiError('FORBIDDEN', message, 403),
  adminRequired: () => apiError('FORBIDDEN', 'Admin access required', 403),
  notFound: (resource = 'Resource') => apiError('NOT_FOUND', `${resource} not found`, 404),
  validation: (message: string) => apiError('VALIDATION_ERROR', message, 400),
  conflict: (message: string) => apiError('CONFLICT', message, 409),
  internal: (message = 'Internal server error') => apiError('INTERNAL_ERROR', message, 500),
} as const;

/**
 * Get the authenticated session or return an unauthorized response.
 *
 * @returns Object with either session (if authenticated) or response (if not)
 */
export async function requireAuth(): Promise<
  | { session: Session & { user: { id: string } }; response?: never }
  | { session?: never; response: NextResponse<ApiResponse> }
> {
  const session = await auth();

  if (!session?.user?.id) {
    return { response: ApiErrors.unauthorized() };
  }

  return { session: session as Session & { user: { id: string } } };
}

/**
 * Permission levels for checking access.
 */
export type PermissionLevel = 'VIEWER' | 'MEMBER' | 'ADMIN' | 'SUPER_ADMIN';

const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

/**
 * Check if a user has at least the required permission level.
 *
 * @param userPermission - The user's current permission
 * @param requiredPermission - The minimum required permission
 * @returns true if user has sufficient permission
 */
export function hasPermission(
  userPermission: PermissionLevel,
  requiredPermission: PermissionLevel
): boolean {
  return PERMISSION_HIERARCHY[userPermission] >= PERMISSION_HIERARCHY[requiredPermission];
}

/**
 * Require the user to have admin permission (ADMIN or SUPER_ADMIN).
 *
 * @param userId - The authenticated user's ID
 * @returns Object with either user (if admin) or response (if not)
 */
export async function requireAdmin(userId: string): Promise<
  | { user: { id: string; permission: PermissionLevel }; response?: never }
  | { user?: never; response: NextResponse<ApiResponse> }
> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, permission: true },
  });

  if (!user) {
    return { response: ApiErrors.notFound('User') };
  }

  const permission = user.permission as PermissionLevel;
  if (!hasPermission(permission, 'ADMIN')) {
    return { response: ApiErrors.adminRequired() };
  }

  return { user: { id: user.id, permission } };
}

/**
 * Require the user to be a member of a specific board.
 *
 * @param boardId - The board ID to check
 * @param userId - The authenticated user's ID
 * @returns Object with either membership info or response (if not a member)
 */
export async function requireBoardMember(
  boardId: string,
  userId: string
): Promise<
  | { membership: { userId: string; boardId: string; permission: PermissionLevel }; response?: never }
  | { membership?: never; response: NextResponse<ApiResponse> }
> {
  const membership = await prisma.boardMember.findUnique({
    where: {
      userId_boardId: { userId, boardId },
    },
    select: { userId: true, boardId: true, permission: true },
  });

  if (membership) {
    return {
      membership: {
        ...membership,
        permission: membership.permission as PermissionLevel,
      },
    };
  }

  // Fallback for SUPER_ADMIN users who may not have explicit board membership.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { permission: true },
  });

  if (user?.permission === 'SUPER_ADMIN') {
    return {
      membership: { userId, boardId, permission: 'SUPER_ADMIN' as PermissionLevel },
    };
  }

  return {
    response: ApiErrors.forbidden('Not a member of this board'),
  };
}

/**
 * Require the user to be an admin of a specific board.
 *
 * @param boardId - The board ID to check
 * @param userId - The authenticated user's ID
 * @returns Object with either membership info or response (if not an admin)
 */
export async function requireBoardAdmin(
  boardId: string,
  userId: string
): Promise<
  | { membership: { userId: string; boardId: string; permission: PermissionLevel }; response?: never }
  | { membership?: never; response: NextResponse<ApiResponse> }
> {
  const result = await requireBoardMember(boardId, userId);

  if (result.response) {
    return result;
  }

  if (!hasPermission(result.membership.permission, 'ADMIN')) {
    return { response: ApiErrors.forbidden('Board admin access required') };
  }

  return result;
}

/**
 * Wrap an async API handler with standard error handling.
 *
 * @param handler - The async handler function
 * @param errorMessage - Custom error message for logging/response
 * @returns NextResponse
 */
export async function withErrorHandling<T>(
  handler: () => Promise<NextResponse<T>>,
  errorMessage = 'An error occurred'
): Promise<NextResponse<T | ApiResponse>> {
  try {
    return await handler();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    return ApiErrors.internal(errorMessage);
  }
}
