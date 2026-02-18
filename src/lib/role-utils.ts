import type { BoardSettings } from '@/types';

const LEAD_ROLE_HINTS = ['lead'];
const PO_ROLE_HINTS = ['po', 'product owner'];

function normalizeRoleName(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

export type ApproverRole = 'PO' | 'LEAD';

export interface ResolvedApprover {
  role: ApproverRole;
  userId: string;
  roleName: string;
}

/**
 * Resolve PO and Lead approvers from project role assignments.
 * Uses the same role name hint matching as the quality review system.
 */
export function resolveApprovers(
  projectRoleAssignments: NonNullable<BoardSettings['projectRoleAssignments']>
): ResolvedApprover[] {
  const approvers: ResolvedApprover[] = [];

  for (const ra of projectRoleAssignments) {
    if (!ra.userId || !ra.roleName) continue;
    const normalized = normalizeRoleName(ra.roleName);

    if (
      PO_ROLE_HINTS.some(
        (hint) =>
          normalized === hint ||
          normalized.includes(hint) ||
          normalized.replace(/\./g, '') === hint
      )
    ) {
      approvers.push({ role: 'PO', userId: ra.userId, roleName: ra.roleName });
    }

    if (
      LEAD_ROLE_HINTS.some(
        (hint) =>
          normalized === hint ||
          normalized.endsWith(` ${hint}`) ||
          normalized.startsWith(`${hint} `)
      )
    ) {
      approvers.push({ role: 'LEAD', userId: ra.userId, roleName: ra.roleName });
    }
  }

  return approvers;
}
