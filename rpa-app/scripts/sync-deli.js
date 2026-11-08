/**
 * Standalone runner for Deli-supporter sync.
 * Can be run via:
 *   node scripts/sync-deli.js
 * Or via Windows Task Scheduler at 21:00 daily.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const Database = require('better-sqlite3');

const MAIN_URL = 'https://firebase-portfolio-maestro--fir-01278470-c0ea3.us-central1.hosted.app/api/sync/infomart';
const BACKUP_URL = 'https://asia-northeast1-fir-01278470-c0ea3.cloudfunctions.net/syncInfomartActuals';
const API_KEY = 'delicount-sync-secret-2026';

function readEnvMap() {
  const envMap = {};
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx > 0) {
          envMap[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
        }
      }
    }
  }
  return envMap;
}

function normalizeStoreId(storeName) {
  const clean = storeName.replace(/[\s　]+/g, '').replace(/店$/, '');
  if (clean.includes('本厚木') || clean === 'hon-atsugi') return 'hon-atsugi';
  if (clean.includes('港南台') || clean === 'konandai') return 'konandai';
  if (clean.includes('横須賀') || clean === 'yokosuka') return 'yokosuka';
  if (clean.includes('西川口') || clean === 'nishikawaguchi') return 'nishikawaguchi';
  return clean;
}

function getConfiguredStores() {
  const envMap = readEnvMap();
  const stores = [];
  for (const key of Object.keys(envMap)) {
    if (key.startsWith('INFOMART_USER_ID_')) {
      const storeName = key.replace('INFOMART_USER_ID_', '');
      const pwdKey = `INFOMART_PASSWORD_${storeName}`;
      const userId = envMap[key];
      const password = envMap[pwdKey];
      if (userId && password) {
        stores.push({
          storeName: storeName.endsWith('店') ? storeName : `${storeName}店`,
          storeId: normalizeStoreId(storeName),
          userId,
          password
        });
      }
    }
  }
  if (stores.length === 0 && envMap['INFOMART_USER_ID']) {
    stores.push({
      storeName: '本厚木店',
      storeId: 'hon-atsugi',
      userId: envMap['INFOMART_USER_ID'],
      password: envMap['INFOMART_PASSWORD']
    });
  }
  return stores;
}

async function sendCsv(storeId, csvText) {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY
  };
  const body = JSON.stringify({ storeId, csvText });

  try {
    const res = await fetch(MAIN_URL, { method: 'POST', headers, body });
    if (res.ok) {
      const json = await res.json();
      return { success: true, savedCount: json.savedCount, summary: json.summary, endpoint: 'Main' };
    }
  } catch (e) {
    console.warn(`[Sync] メインAPI通信失敗: ${e.message}. バックアップへ接続...`);
  }

  try {
    const res = await fetch(BACKUP_URL, { method: 'POST', headers, body });
    if (res.ok) {
      const json = await res.json();
      return { success: true, savedCount: json.savedCount, summary: json.summary, endpoint: 'Backup' };
    }
    const errText = await res.text();
    return { success: false, error: `API error (HTTP ${res.status}): ${errText}` };
  } catch (e) {
    return { success: false, error: `Backup API failed: ${e.message}` };
  }
}

async function runDirectSync() {
  console.log('[Sync CLI] スタンドアロン直接実行モードで開始します...');
  const stores = getConfiguredStores();
  console.log(`[Sync CLI] 設定済み店舗数: ${stores.length}`);

  const downloadsDir = path.join(__dirname, '..', 'downloads');
  fs.mkdirSync(downloadsDir, { recursive: true });

  const dbPath = path.join(__dirname, '..', 'rpa.db');
  let db = null;
  try {
    db = new Database(dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS deli_sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id TEXT NOT NULL,
        store_name TEXT NOT NULL,
        status TEXT NOT NULL,
        saved_count INTEGER DEFAULT 0,
        summary_json TEXT,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (e) {
    console.warn('[Sync CLI] DBオープン失敗 (スキップします):', e.message);
  }

  const browser = await chromium.launch({ headless: true });

  for (const store of stores) {
    console.log(`\n========================================`);
    console.log(`[Sync CLI] ▶ 店舗「${store.storeName}」(${store.storeId}) 処理開始`);
    console.log(`========================================`);

    try {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        acceptDownloads: true
      });
      const page = await context.newPage();
      page.on('dialog', async d => await d.accept());

      console.log(`[Sync CLI] ログインページアクセス中...`);
      await page.goto('https://www.infomart.co.jp/scripts/logon.asp', { waitUntil: 'domcontentloaded', timeout: 60000 });

      const uidSelector = 'input[name="uid"], input[name="UID"]';
      const pwdSelector = 'input[name="pwd"], input[name="PWD"]';
      const submitSelector = 'input[type="image"], input[type="submit"], button[type="submit"], a.btn-login';

      await page.waitForSelector(uidSelector, { timeout: 15000 }).catch(() => {});
      if (await page.$(uidSelector) && await page.$(pwdSelector)) {
        await page.fill(uidSelector, store.userId);
        await page.fill(pwdSelector, store.password);
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
          page.click(submitSelector)
        ]);
      }
      await page.waitForTimeout(2000);

      // 発注リストへ
      if ((await page.$('#sdate')) === null) {
        console.log(`[Sync CLI] 発注リスト画面へ遷移...`);
        await page.waitForSelector('#lnkLog, a[title="発注リスト"]', { timeout: 15000 }).catch(() => {});
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
          page.evaluate(() => {
            const link = document.getElementById('lnkLog') || 
                         document.querySelector('a[title="発注リスト"]') || 
                         document.querySelector('a[href*="order_my_catalog"]');
            if (link) link.click();
          })
        ]);
      }
      await page.waitForTimeout(3000);

      // 週間発注タブへ
      if ((await page.$('#sdate')) === null) {
        const weeklyTab = await page.$('#catalogTabLinkB, a[href*="buyer_reserved_order"], a:has-text("週間発注")');
        if (weeklyTab) {
          console.log(`[Sync CLI] 週間発注タブへ切替...`);
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {}),
            weeklyTab.click()
          ]);
          await page.waitForTimeout(2000);
        }
      }

      // CSVダウンロード
      console.log(`[Sync CLI] CSVダウンロード待機中...`);
      const downloadSelector = '#downloadLink, a[onclick*="downloadOrder"], a:has-text("CSVダウンロード")';
      await page.waitForSelector(downloadSelector, { timeout: 15000 });

      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30000 }),
        page.click(downloadSelector)
      ]);

      const timestamp = Date.now();
      const safeStoreId = (store.storeId || 'store').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeFilename = (download.suggestedFilename() || 'WeeklyOrders.csv').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const filename = `${safeStoreId}_${timestamp}_${safeFilename}`;
      const filePath = path.join(downloadsDir, filename);
      fs.mkdirSync(downloadsDir, { recursive: true });
      await download.saveAs(filePath);
      console.log(`[Sync CLI] CSV保存完了: ${filePath}`);

      const buffer = fs.readFileSync(filePath);
      const csvText = new TextDecoder('shift_jis').decode(buffer);
      console.log(`[Sync CLI] CSV読込完了 (文字数: ${csvText.length})`);

      // API送信
      console.log(`[Sync CLI] デリサポーターへAPI送信中...`);
      const sendRes = await sendCsv(store.storeId, csvText);

      if (sendRes.success) {
        console.log(`[Sync CLI] ✅ 成功! 登録件数: ${sendRes.savedCount}件 (${sendRes.endpoint})`);
        if (db) {
          db.prepare(`
            INSERT INTO deli_sync_logs (store_id, store_name, status, saved_count, summary_json)
            VALUES (?, ?, 'success', ?, ?)
          `).run(store.storeId, store.storeName, sendRes.savedCount || 0, JSON.stringify(sendRes.summary || {}));
        }
      } else {
        console.error(`[Sync CLI] ❌ 送信エラー:`, sendRes.error);
        if (db) {
          db.prepare(`
            INSERT INTO deli_sync_logs (store_id, store_name, status, saved_count, error_message)
            VALUES (?, ?, 'error', 0, ?)
          `).run(store.storeId, store.storeName, sendRes.error);
        }
      }

      await context.close().catch(() => {});
    } catch (err) {
      console.error(`[Sync CLI] ❌ 店舗「${store.storeName}」処理中に例外:`, err.message);
      if (db) {
        db.prepare(`
          INSERT INTO deli_sync_logs (store_id, store_name, status, saved_count, error_message)
          VALUES (?, ?, 'error', 0, ?)
        `).run(store.storeId, store.storeName, err.message);
      }
    }
  }

  await browser.close().catch(() => {});
  if (db) db.close();
  console.log(`\n[Sync CLI] 全店舗の処理が完了しました。`);
  process.exit(0);
}

async function main() {
  // If local server is running on port 3000, trigger via API to keep state synced
  try {
    console.log('[Sync CLI] ローカル Next.js サーバー (http://localhost:3000) への接続を確認中...');
    const pingRes = await fetch('http://localhost:3000/api/deli-sync', {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    if (pingRes.ok) {
      console.log('[Sync CLI] サーバー稼働を確認。Next.js サーバー経由で同期を開始します...');
      const runRes = await fetch('http://localhost:3000/api/deli-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(600000)
      });
      const data = await runRes.json();
      console.log('[Sync CLI] ✅ 完了:', data.message);
      process.exit(data.success ? 0 : 1);
    }
  } catch (e) {
    console.log('[Sync CLI] ローカルサーバー未稼働または応答なし。直接スタンドアロン実行へフォールバックします。');
  }

  await runDirectSync();
}

main().catch(err => {
  console.error('[Sync CLI] 致命的エラー:', err);
  process.exit(1);
});
