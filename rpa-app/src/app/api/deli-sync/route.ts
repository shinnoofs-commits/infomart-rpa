import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { 
  syncAllConfiguredStoresToDeliSupporter, 
  syncSingleStoreById 
} from '@/lib/deliSupporterSync';
import { 
  isDeliSyncRunning, 
  getDeliSyncStatus 
} from '@/lib/rpaState';
import { getConfiguredStores } from '@/lib/storeCredentials';
import { initDeliScheduler } from '@/lib/deliScheduler';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    initDeliScheduler();
    const db = getDb();
    
    // 1. 設定情報の取得
    const enabledRow = db.prepare("SELECT value FROM settings WHERE key = 'deli_sync_auto_enabled'").get() as { value: string } | undefined;
    const timeRow = db.prepare("SELECT value FROM settings WHERE key = 'deli_sync_schedule_time'").get() as { value: string } | undefined;

    const autoSyncEnabled = enabledRow ? enabledRow.value === 'true' : true;
    const scheduleTime = timeRow?.value || '21:00';

    // 2. 最近の同期ログを取得（最新15件）
    const recentLogs = db.prepare(`
      SELECT id, store_id, store_name, status, saved_count, summary_json, error_message, created_at
      FROM deli_sync_logs
      ORDER BY id DESC
      LIMIT 15
    `).all();

    // 3. 設定済みの店舗一覧
    const stores = getConfiguredStores().map(s => ({
      storeName: s.storeName,
      storeId: s.storeId
    }));

    return NextResponse.json({
      isRunning: isDeliSyncRunning(),
      currentStatus: getDeliSyncStatus(),
      autoSyncEnabled,
      scheduleTime,
      stores,
      recentLogs
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // empty body is allowed (defaults to all stores)
    }

    const { storeId, storeName } = body;

    if (storeId || storeName) {
      const target = storeId || storeName;
      console.log(`[API /deli-sync] 特定店舗「${target}」の同期リクエストを受信`);
      const result = await syncSingleStoreById(target);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    console.log('[API /deli-sync] 全店舗の同期リクエストを受信');
    const result = await syncAllConfiguredStoresToDeliSupporter();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    console.error('[API /deli-sync] 例外:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || '内部サーバーエラーが発生しました' 
    }, { status: 500 });
  }
}
