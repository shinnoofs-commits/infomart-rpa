/**
 * @fileOverview Test script for S-Hub Agent Tools (Read-Only)
 */

import { getRpaStatusDirect } from './tools/rpa-status-tool';
import { getOrderSummaryDirect } from './tools/order-summary-tool';
import { getSyncLogsDirect } from './tools/sync-logs-tool';

async function main() {
  console.log('=== S-Hub Agent ツール動作検証テスト (完全読み取り専用) ===\n');

  try {
    // 1. RPA・同期ステータス
    console.log('--- 1. RPA・同期ステータス照会 (getRpaStatus) ---');
    const status = await getRpaStatusDirect();
    console.log(` - RPA実行状態: ${status.rpaRunning ? '実行中' : '待機中'}`);
    console.log(` - デリサポ連携状態: ${status.deliSyncRunning ? '実行中' : '待機中'}`);
    console.log(` - デリサポ同期設定: 自動=${status.deliSyncAutoEnabled}, 定期刻=${status.deliSyncScheduleTime}`);

    // 2. 発注データサマリー
    console.log('\n--- 2. 発注データ集計 (getOrderSummary) ---');
    const orders = await getOrderSummaryDirect();
    console.log(` - 登録総発注伝票数: ${orders.totalOrders} 件`);
    console.log(` - 内訳: 未処理=${orders.countsByStatus['未処理'] || 0}, 完了=${orders.countsByStatus['完了'] || 0}, エラー=${orders.countsByStatus['エラー'] || 0}`);
    if (orders.recentErrors.length > 0) {
      console.log(` - 直近エラー例: [${orders.recentErrors[0].store_name}] ${orders.recentErrors[0].product_name} -> 理由: ${orders.recentErrors[0].error_message}`);
    }

    // 3. デリサポ連携ログ
    console.log('\n--- 3. デリサポ連携履歴 (getSyncLogs) ---');
    const syncLogs = await getSyncLogsDirect({ limit: 3 });
    console.log(` - 取得ログ件数: ${syncLogs.totalRetrieved} 件`);
    syncLogs.logs.forEach(l => {
      console.log(` - [${l.created_at}] 店舗: ${l.store_name} | 結果: ${l.status} | 取込件数: ${l.saved_count}`);
    });

    console.log('\n========================================');
    console.log('🎉 すべてのツールが安全にSQLiteから実データを取得できました！');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ ツールテスト中にエラーが発生しました:', error);
    process.exit(1);
  }
}

main();
