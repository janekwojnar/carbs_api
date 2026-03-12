import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth/config';

export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user || !['ADMIN', 'MODERATOR'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }

  return session;
}
