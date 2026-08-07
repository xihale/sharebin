/**
 * Cron job for expired paste cleanup (replaces CF scheduled handler)
 */

import cron from 'node-cron'
import { cleanupExpiredPastes } from './services/paste.service'

/** Start the hourly cleanup job. Call once at app boot. */
export function startCleanupCron(): void {
  cron.schedule('0 * * * *', async () => {
    try {
      const count = await cleanupExpiredPastes()
      console.log(`[cron] Cleanup complete. Deleted ${count} expired pastes`)
    } catch (err) {
      console.error('[cron] Cleanup failed:', err)
    }
  })
  console.log('[cron] Hourly paste cleanup scheduled')
}
