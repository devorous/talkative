import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SessionService {
  async createOrUpdate(
    sessionId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await prisma.session.upsert({
      where: { id: sessionId },
      update: {
        lastActive: new Date(),
        ipAddress,
        userAgent,
      },
      create: {
        id: sessionId,
        ipAddress,
        userAgent,
      },
    });
  }

  async updateLastActive(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { lastActive: new Date() },
    });
  }

  async cleanupInactive(olderThanDays: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await prisma.session.deleteMany({
      where: {
        lastActive: { lt: cutoff },
      },
    });

    return result.count;
  }
}
