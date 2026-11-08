import fs from 'fs';
import path from 'path';
import { chromium, Browser } from 'playwright';
import { getDb } from './db';
import { 
  getConfiguredStores, 
  getStoreCredentials, 
  normalizeStoreId, 
  StoreCredential 
} from './storeCredentials';
import { 
  isDeliSyncRunning, 
  setDeliSyncRunning, 
  setDeliSyncStatus, 
  isRpaRunning 
} from './rpaState';
import { sendLineNotification } from './line';

export const DELI_SUPPORTER_MAIN_URL = 
  'https://firebase-portfolio-maestro--fir-01278470-c0ea3.us-central1.hosted.app/api/sync/infomart';
export const DELI_SUPPORTER_BACKUP_URL = 
  'https://asia-northeast1-fir-01278470-c0ea3.cloudfunctions.net/syncInfomartActuals';
export const DELI_SUPPORTER_API_KEY = 'delicount-sync-secret-2026';

export interface StoreSyncResult {
  storeName: string;
  storeId: string;
  success: boolean;
  savedCount?: number;
  dates?: string[];
  suppliers?: string[];
  csvPath?: string;
  csvSize?: number;
  error?: string;
  endpointUsed?: string;
}

/**
 * Downloads the weekly order CSV from Infomart for a specific store.
 */
export async function downloadInfomartWeeklyCsv(
  storeName: string, 
  userId: string, 
  password: string
): Promise<{ success: boolean; csvText?: string; csvPath?: string; error?: string }> {
  let browser: Browser | null = null;
  const downloadsDir = path.join(process.cwd(), 'downloads');
  fs.mkdirSync(downloadsDir, { recursive: true });

  try {
    console.log(`[DeliSync] 店舗「${storeName}」のインフォマートCSVダウンロードを開始します (ID: ${userId})`);

    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      acceptDownloads: true
    });

    const page = await context.newPage();

    page.on('dialog', async dialog => {
      console.log(`[DeliSync] Dialog: ${dialog.message()}`);
      await dialog.accept();
    });

    // 1. ログイン
    await page.goto('https://www.infomart.co.jp/scripts/logon.asp', { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });

    const uidSelector = 'input[name="uid"], input[name="UID"]';
    const pwdSelector = 'input[name="pwd"], input[name="PWD"]';
    const submitSelector = 'input[type="image"], input[type="submit"], button[type="submit"], a.btn-login';

    await page.waitForSelector(uidSelector, { timeout: 15000 }).catch(() => {});

    if (await page.$(uidSelector) && await page.$(pwdSelector)) {
      await page.fill(uidSelector, userId);
      await page.fill(pwdSelector, password);
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
        page.click(submitSelector)
      ]);
    }

    await page.waitForTimeout(2000);

    // 2. 発注リスト画面へ遷移
    const isOnOrderPage = (await page.$('#sdate')) !== null;
    if (!isOnOrderPage) {
      console.log(`[DeliSync] 店舗「${storeName}」: 発注リスト画面へ遷移します...`);
      await page.waitForSelector('#lnkLog, a[title="発注リスト"]', { timeout: 15000 }).catch(() => {});
      
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
        page.evaluate(() => {
          const link = document.getElementById('lnkLog') || 
                       document.querySelector('a[title="発注リスト"]') || 
                       document.querySelector('a[href*="order_my_catalog"]');
          if (link) (link as HTMLElement).click();
        })
      ]);
    }
    await page.waitForTimeout(3000);

    // 3. 週間発注タブへ切替
    const hasSdateInput = (await page.$('#sdate')) !== null;
    if (!hasSdateInput) {
      const weeklyTab = await page.$('#catalogTabLinkB, a[href*="buyer_reserved_order"], a:has-text("週間発注")');
      if (weeklyTab) {
        console.log(`[DeliSync] 店舗「${storeName}」: 週間発注タブへ切り替えます...`);
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {}),
          weeklyTab.click()
        ]);
        await page.waitForTimeout(2000);
      }
    }

    // 4. CSVダウンロードリンクを検索してダウンロード実行
    const downloadSelector = '#downloadLink, a[onclick*="downloadOrder"], a:has-text("CSVダウンロード")';
    await page.waitForSelector(downloadSelector, { timeout: 15000 });

    console.log(`[DeliSync] 店舗「${storeName}」: 週間発注CSVのダウンロードボタンをクリックします...`);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.click(downloadSelector)
    ]);

    const timestamp = Date.now();
    const storeId = normalizeStoreId(storeName);
    const safeStoreId = storeId.replace(/[^a-zA-Z0-9_-]/g, '_') || 'store';
    const suggestedFilename = (download.suggestedFilename() || 'WeeklyOrders.csv').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const targetFilename = `${safeStoreId}_${timestamp}_${suggestedFilename}`;
    const targetFilePath = path.join(downloadsDir, targetFilename);

    fs.mkdirSync(downloadsDir, { recursive: true });
    await download.saveAs(targetFilePath);
    console.log(`[DeliSync] 店舗「${storeName}」: CSV保存完了 (${targetFilePath})`);

    // 5. Shift_JIS (CP932) で未加工読み込み
    const buffer = fs.readFileSync(targetFilePath);
    const decoder = new TextDecoder('shift_jis');
    const csvText = decoder.decode(buffer);

    return {
      success: true,
      csvText,
      csvPath: targetFilePath
    };
  } catch (error: any) {
    console.error(`[DeliSync] 店舗「${storeName}」のCSVダウンロード中にエラー:`, error);
    return {
      success: false,
      error: error.message || 'CSVダウンロードに失敗しました'
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Sends the raw CSV text to Deli-supporter API.
 */
export async function sendCsvToDeliSupporter(
  storeId: string, 
  csvText: string
): Promise<{ success: boolean; savedCount?: number; summary?: any; error?: string; endpointUsed?: string }> {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': DELI_SUPPORTER_API_KEY
  };
  const body = JSON.stringify({
    storeId,
    csvText
  });

  // Try sending with automatic retry (up to 3 attempts) to withstand momentary Wi-Fi / DNS wake delays
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // 1. Try Main URL first
    try {
      console.log(`[DeliSync] デリサポーター メインAPIへ送信中 (${DELI_SUPPORTER_MAIN_URL}) [試行 ${attempt}/${maxAttempts}]...`);
      const res = await fetch(DELI_SUPPORTER_MAIN_URL, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(60000)
      });

      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          savedCount: data.savedCount || 0,
          summary: data.summary,
          endpointUsed: 'Main API (Hosted App)'
        };
      } else {
        const errText = await res.text();
        console.warn(`[DeliSync] メインAPIエラー (HTTP ${res.status}): ${errText}. バックアップへ切り替えます...`);
      }
    } catch (e: any) {
      console.warn(`[DeliSync] メインAPI通信失敗: ${e.message}. バックアップへ切り替えます...`);
    }

    // 2. Fallback to Backup URL (Direct Cloud Functions)
    try {
      console.log(`[DeliSync] デリサポーター バックアップAPIへ送信中 (${DELI_SUPPORTER_BACKUP_URL}) [試行 ${attempt}/${maxAttempts}]...`);
      const res = await fetch(DELI_SUPPORTER_BACKUP_URL, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(60000)
      });

      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          savedCount: data.savedCount || 0,
          summary: data.summary,
          endpointUsed: 'Backup API (Cloud Functions)'
        };
      } else {
        const errText = await res.text();
        console.warn(`[DeliSync] バックアップAPIエラー (HTTP ${res.status}): ${errText}`);
      }
    } catch (e: any) {
      console.warn(`[DeliSync] バックアップAPI通信失敗: ${e.message}`);
    }

    if (attempt < maxAttempts) {
      console.log(`[DeliSync] 通信再試行のため 3秒待機します (試行 ${attempt}/${maxAttempts})...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  return {
    success: false,
    error: `デリサポーターAPI接続失敗: 複数回試行しましたが接続できませんでした`
  };
}

/**
 * Downloads and syncs weekly CSV for a single store.
 */
export async function syncSingleStore(
  store: StoreCredential
): Promise<StoreSyncResult> {
  const db = getDb();
  console.log(`[DeliSync] ▶ 店舗「${store.storeName}」(${store.storeId}) の連携処理を開始`);

  // 1. Download CSV
  const dlResult = await downloadInfomartWeeklyCsv(store.storeName, store.userId, store.password);
  if (!dlResult.success || !dlResult.csvText) {
    const errorMsg = dlResult.error || 'CSV取得エラー';
    db.prepare(`
      INSERT INTO deli_sync_logs (store_id, store_name, status, saved_count, error_message)
      VALUES (?, ?, 'error', 0, ?)
    `).run(store.storeId, store.storeName, errorMsg);

    return {
      storeName: store.storeName,
      storeId: store.storeId,
      success: false,
      error: errorMsg
    };
  }

  // 2. Send to Deli-supporter
  const sendResult = await sendCsvToDeliSupporter(store.storeId, dlResult.csvText);
  if (!sendResult.success) {
    const errorMsg = sendResult.error || 'デリサポAPI送信エラー';
    db.prepare(`
      INSERT INTO deli_sync_logs (store_id, store_name, status, saved_count, error_message)
      VALUES (?, ?, 'error', 0, ?)
    `).run(store.storeId, store.storeName, errorMsg);

    return {
      storeName: store.storeName,
      storeId: store.storeId,
      success: false,
      csvPath: dlResult.csvPath,
      csvSize: dlResult.csvText.length,
      error: errorMsg,
      endpointUsed: sendResult.endpointUsed
    };
  }

  // 3. Save success log
  const summaryJson = JSON.stringify(sendResult.summary || {});
  db.prepare(`
    INSERT INTO deli_sync_logs (store_id, store_name, status, saved_count, summary_json, error_message)
    VALUES (?, ?, 'success', ?, ?, NULL)
  `).run(store.storeId, store.storeName, sendResult.savedCount || 0, summaryJson);

  return {
    storeName: store.storeName,
    storeId: store.storeId,
    success: true,
    savedCount: sendResult.savedCount || 0,
    dates: sendResult.summary?.dates,
    suppliers: sendResult.summary?.suppliers,
    csvPath: dlResult.csvPath,
    csvSize: dlResult.csvText.length,
    endpointUsed: sendResult.endpointUsed
  };
}

/**
 * Runs the sync pipeline for all configured stores.
 */
export async function syncAllConfiguredStoresToDeliSupporter(): Promise<{
  success: boolean;
  results: StoreSyncResult[];
  message: string;
}> {
  if (isDeliSyncRunning()) {
    return {
      success: false,
      results: [],
      message: 'デリサポーター連携は現在実行中です。'
    };
  }

  if (isRpaRunning()) {
    return {
      success: false,
      results: [],
      message: '通常のインフォマート自動発注RPAが実行中です。完了後に再実行してください。'
    };
  }

  const stores = getConfiguredStores();
  if (stores.length === 0) {
    return {
      success: false,
      results: [],
      message: '.env.local に有効なインフォマートログイン情報が見つかりません。'
    };
  }

  setDeliSyncRunning(true, `${stores.length}店舗のデリサポCSV同期を実行中...`);
  const results: StoreSyncResult[] = [];

  try {
    for (const store of stores) {
      setDeliSyncRunning(true, `店舗「${store.storeName}」のCSV取得＆送信中...`);
      const res = await syncSingleStore(store);
      results.push(res);
      // Brief pause between stores
      await new Promise(r => setTimeout(r, 2000));
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    const allSuccessful = successCount === totalCount;
    const totalRecords = results.reduce((acc, r) => acc + (r.savedCount || 0), 0);

    const message = allSuccessful
      ? `全${totalCount}店舗のデリサポ連携が完了しました（合計 ${totalRecords} 件同期）`
      : `${totalCount}店舗中 ${successCount}店舗が完了、${totalCount - successCount}店舗でエラーが発生しました`;

    setDeliSyncStatus(
      allSuccessful ? 'completed' : 'error',
      message,
      results
    );

    // LINE notification on complete (or error)
    if (!allSuccessful) {
      const failedStores = results.filter(r => !r.success).map(r => `${r.storeName}: ${r.error}`).join('\n');
      sendLineNotification(`⚠️【デリサポ自動連携アラート】\nインフォマート実発注データの同期中にエラーが発生しました。\n\n${failedStores}`).catch(() => {});
    }

    return {
      success: allSuccessful,
      results,
      message
    };
  } catch (error: any) {
    const errorMsg = error.message || '連携中に予期せぬエラーが発生しました';
    setDeliSyncStatus('error', errorMsg);
    return {
      success: false,
      results,
      message: errorMsg
    };
  } finally {
    setDeliSyncRunning(false);
  }
}

/**
 * Sync a specific store by ID or Name.
 */
export async function syncSingleStoreById(storeIdOrName: string): Promise<{
  success: boolean;
  result?: StoreSyncResult;
  message: string;
}> {
  if (isDeliSyncRunning() || isRpaRunning()) {
    return {
      success: false,
      message: '別の処理が実行中です。完了までお待ちください。'
    };
  }

  const stores = getConfiguredStores();
  const targetId = normalizeStoreId(storeIdOrName);
  const store = stores.find(s => s.storeId === targetId || s.storeName.includes(storeIdOrName));

  if (!store) {
    // If not found in list, check credentials directly
    const creds = getStoreCredentials(storeIdOrName);
    if (!creds.userId || !creds.password) {
      return {
        success: false,
        message: `店舗「${storeIdOrName}」のログイン情報が設定されていません。`
      };
    }
    const customStore: StoreCredential = {
      storeName: storeIdOrName.endsWith('店') ? storeIdOrName : `${storeIdOrName}店`,
      storeId: targetId,
      userId: creds.userId,
      password: creds.password
    };
    setDeliSyncRunning(true, `店舗「${customStore.storeName}」のCSV取得＆送信中...`);
    try {
      const res = await syncSingleStore(customStore);
      setDeliSyncStatus(res.success ? 'completed' : 'error', res.success ? '同期完了' : res.error || 'エラー', [res]);
      return {
        success: res.success,
        result: res,
        message: res.success ? `同期が完了しました (登録: ${res.savedCount}件)` : (res.error || 'エラーが発生しました')
      };
    } finally {
      setDeliSyncRunning(false);
    }
  }

  setDeliSyncRunning(true, `店舗「${store.storeName}」のCSV取得＆送信中...`);
  try {
    const res = await syncSingleStore(store);
    setDeliSyncStatus(res.success ? 'completed' : 'error', res.success ? '同期完了' : res.error || 'エラー', [res]);
    return {
      success: res.success,
      result: res,
      message: res.success ? `同期が完了しました (登録: ${res.savedCount}件)` : (res.error || 'エラーが発生しました')
    };
  } finally {
    setDeliSyncRunning(false);
  }
}
