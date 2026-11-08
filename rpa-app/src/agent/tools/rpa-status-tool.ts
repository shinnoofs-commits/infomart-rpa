/**
 * @fileOverview RPA & Deli-Sync Live Status Tool for S-Hub Agent
 */

import { isRpaRunning, isDeliSyncRunning, getDeliSyncStatus } from '../../lib/rpaState';
import { getReadonlyDb } from '../db-readonly';

export async function getRpaStatusDirect() {
  try {
    const db = getReadonlyDb();
    const settingsRows = db.prepare('SELECT key, value, updated_at FROM settings').all() as any[];
    
    const settingsMap: Record<string, string> = {};
    for (const row of settingsRows) {
      settingsMap[row.key] = row.value;
    }

    const rpaActive = isRpaRunning();
    const syncActive = isDeliSyncRunning();
    const syncStatus = getDeliSyncStatus();

    return {
      rpaRunning: rpaActive,
      deliSyncRunning: syncActive,
      deliSyncStatus: syncStatus.status,
      deliSyncMessage: syncStatus.message,
      lastRunAt: syncStatus.lastRunAt || '未実行',
      autoRpaEnabled: settingsMap['auto_rpa_enabled'] === 'true',
      deliSyncAutoEnabled: settingsMap['deli_sync_auto_enabled'] === 'true',
      deliSyncScheduleTime: settingsMap['deli_sync_schedule_time'] || '21:00',
    };
  } catch (error: any) {
    console.error('Error in getRpaStatusDirect:', error);
    return {
      rpaRunning: false,
      deliSyncRunning: false,
      error: error.message || error,
    };
  }
}
