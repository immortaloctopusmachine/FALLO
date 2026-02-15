import { prisma } from '@/lib/prisma';
import { resolveEvaluatorRolesFromUserCompanyRoles } from '@/lib/quality-review';

export async function getCanViewQualitySummaries(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      userCompanyRoles: {
        select: {
          companyRole: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return false;
  }

  const evaluatorRoles = resolveEvaluatorRolesFromUserCompanyRoles(user.userCompanyRoles);
  return evaluatorRoles.length > 0;
}

