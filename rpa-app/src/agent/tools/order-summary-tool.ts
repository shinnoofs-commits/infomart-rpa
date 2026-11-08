/**
 * @fileOverview Order Summary & Error Inspection Tool for S-Hub Agent
 */

import { getReadonlyDb } from '../db-readonly';

export async function getOrderSummaryDirect(input?: { storeName?: string; deliveryDate?: string }) {
  try {
    const db = getReadonlyDb();

    // 1. ステータス別集計
    let statusSql = 'SELECT status, count(*) as count FROM orders';
    const params: any[] = [];
    const whereClauses: string[] = [];

    if (input?.storeName) {
      whereClauses.push('store_name = ?');
      params.push(input.storeName);
    }
    if (input?.deliveryDate) {
      whereClauses.push('delivery_date = ?');
      params.push(input.deliveryDate);
    }

    if (whereClauses.length > 0) {
      statusSql += ' WHERE ' + whereClauses.join(' AND ');
    }
    statusSql += ' GROUP BY status';

    const statusRows = db.prepare(statusSql).all(...params) as any[];
    const counts: Record<string, number> = {
      未処理: 0,
      処理中: 0,
      完了: 0,
      エラー: 0,
    };
    let total = 0;
    for (const row of statusRows) {
      counts[row.status] = row.count;
      total += row.count;
    }

    // 2. 直近のエラー伝票（最大5件）
    let errorSql = "SELECT id, store_name, supplier_name, product_name, quantity, delivery_date, error_message, updated_at FROM orders WHERE status = 'エラー'";
    if (whereClauses.length > 0) {
      errorSql += ' AND ' + whereClauses.join(' AND ');
    }
    errorSql += ' ORDER BY id DESC LIMIT 5';
    const recentErrors = db.prepare(errorSql).all(...params) as any[];

    // 3. 直近の正常完了伝票（最大5件）
    let successSql = "SELECT id, store_name, supplier_name, product_name, quantity, delivery_date, updated_at FROM orders WHERE status = '完了'";
    if (whereClauses.length > 0) {
      successSql += ' AND ' + whereClauses.join(' AND ');
    }
    successSql += ' ORDER BY id DESC LIMIT 5';
    const recentCompleted = db.prepare(successSql).all(...params) as any[];

    return {
      totalOrders: total,
      countsByStatus: counts,
      recentErrors,
      recentCompleted,
    };
  } catch (error: any) {
    console.error('Error in getOrderSummaryDirect:', error);
    return {
      totalOrders: 0,
      countsByStatus: {},
      recentErrors: [],
      recentCompleted: [],
      error: error.message || error,
    };
  }
}
