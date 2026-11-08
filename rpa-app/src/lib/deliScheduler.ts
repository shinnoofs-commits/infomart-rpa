import { getDb } from './db';
import { syncAllConfiguredStoresToDeliSupporter } from './deliSupporterSync';
import { isDeliSyncRunning, isRpaRunning } from './rpaState';

declare global {
  // eslint-disable-next-line no-var
  var __deliSchedulerInitialized: boolean | undefined;
}

/**
 * Returns current JST (Asia/Tokyo) date and time details.
 */
export function getJstNow() {
  const now = new Date();
  const jstString = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  // ja-JP format: "YYYY/MM/DD HH:mm:ss"
  const [datePart, timePart] = jstString.split(' ');
  const [year, month, day] = datePart.split('/');
  const [hour, minute] = timePart.split(':');

  const paddedMonth = month.padStart(2, '0');
  const paddedDay = day.padStart(2, '0');
  const paddedHour = hour.padStart(2, '0');
  const paddedMinute = minute.padStart(2, '0');

  return {
    dateStr: `${year}-${paddedMonth}-${paddedDay}`, // e.g. "2026-10-21"
    timeStr: `${paddedHour}:${paddedMinute}`,       // e.g. "21:00"
    hour: parseInt(paddedHour, 10),
    minute: parseInt(paddedMinute, 10),
    raw: jstString
  };
}

export async function checkAndRunScheduledSync(): Promise<boolean> {
  const db = getDb();
  
  // 1. 設定の取得
  const enabledRow = db.prepare("SELECT value FROM settings WHERE key = 'deli_sync_auto_enabled'").get() as { value: string } | undefined;
  const isEnabled = enabledRow ? enabledRow.value === 'true' : true;
  if (!isEnabled) {
    return false;
  }

  const timeRow = db.prepare("SELECT value FROM settings WHERE key = 'deli_sync_schedule_time'").get() as { value: string } | undefined;
  const targetTime = timeRow?.value || '21:00';
  const [targetHour, targetMinute] = targetTime.split(':').map(n => parseInt(n, 10));

  // 2. 現在のJST時刻と前回の実行日確認
  const jst = getJstNow();
  const isTimeOrPast = (jst.hour > targetHour) || (jst.hour === targetHour && jst.minute >= targetMinute);
  if (!isTimeOrPast) {
    return false;
  }

  const lastRunRow = db.prepare("SELECT value FROM settings WHERE key = 'last_deli_sync_date'").get() as { value: string } | undefined;
  if (lastRunRow?.value === jst.dateStr) {
    // 今日はすでに実行済み
    return false;
  }

  // 実行フラグを立てて二重起動を防止
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) 
    VALUES ('last_deli_sync_date', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(jst.dateStr);

  if (isDeliSyncRunning() || isRpaRunning()) {
    console.warn(`[Scheduler] ⏰ ${targetTime} の定時実行時刻ですが、現在別の処理が実行中のためキュー待機します。`);
    // 5分後に再試行できるよう日付フラグを戻す
    setTimeout(() => {
      db.prepare("DELETE FROM settings WHERE key = 'last_deli_sync_date'").run();
    }, 5 * 60 * 1000);
    return false;
  }

  console.log(`[Scheduler] ⏰ 定時時刻 ${targetTime} (JST) を検知しました。デリサポーター自動連携を開始します...`);
  
  try {
    const res = await syncAllConfiguredStoresToDeliSupporter();
    console.log(`[Scheduler] 連携完了: ${res.message}`);
    return true;
  } catch (error) {
    console.error('[Scheduler] 連携エラー:', error);
    return false;
  }
}

export function initDeliScheduler() {
  if (globalThis.__deliSchedulerInitialized) {
    return;
  }
  globalThis.__deliSchedulerInitialized = true;

  console.log('[Scheduler] ⏰ デリサポーター連携 毎日21:00 自動スケジューラーが起動しました (Asia/Tokyo)');

  // 30秒ごとに時刻をチェック
  setInterval(async () => {
    try {
      await checkAndRunScheduledSync();
    } catch (e) {
      console.error('[Scheduler] Tick error:', e);
    }
  }, 30 * 1000);
}
