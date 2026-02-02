import { TextService } from '../services/TextService.ts';
import { SessionService } from '../services/SessionService.ts';

const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

export function startCleanupJob(): void {
  const textService = new TextService();
  const sessionService = new SessionService();

  const runCleanup = async (): Promise<void> => {
    try {
      const deletedTexts = await textService.cleanupExpired();
      if (deletedTexts > 0) {
        console.log(`Cleaned up ${deletedTexts} expired texts`);
      }

      // Clean up inactive sessions once per hour (every 60th run)
      const now = new Date();
      if (now.getMinutes() === 0) {
        const deletedSessions = await sessionService.cleanupInactive(30);
        if (deletedSessions > 0) {
          console.log(`Cleaned up ${deletedSessions} inactive sessions`);
        }
      }
    } catch (error) {
      console.error('Cleanup job error:', error);
    }
  };

  // Run immediately
  runCleanup();

  // Then run every minute
  setInterval(runCleanup, CLEANUP_INTERVAL_MS);

  console.log('Cleanup job started');
}
