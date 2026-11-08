/**
 * @fileOverview Deli-Supporter Sync History Logs Tool for S-Hub Agent
 */

import { getReadonlyDb } from '../db-readonly';

export async function getSyncLogsDirect(input?: { storeName?: string; limit?: number }) {
  try {
    const db = getReadonlyDb();
    const limit = input?.limit || 5;

    let sql = 'SELECT id, store_id, store_name, status, saved_count, error_message, created_at FROM deli_sync_logs';
    const params: any[] = [];

    if (input?.storeName) {
      sql += ' WHERE store_name = ? OR store_id = ?';
      params.push(input.storeName, input.storeName);
    }

    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(limit);

    const logs = db.prepare(sql).all(...params) as any[];

    return {
      totalRetrieved: logs.length,
      logs,
    };
  } catch (error: any) {
    console.error('Error in getSyncLogsDirect:', error);
    return {
      totalRetrieved: 0,
      logs: [],
      error: error.message || error,
    };
  }
}
