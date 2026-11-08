import Database from 'better-sqlite3';
import path from 'path';

// データベースファイルのパス
const dbPath = path.join(process.cwd(), 'rpa.db');

// データベース接続を取得する関数
let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    
    // 初回起動時にテーブルを作成する
    db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_name TEXT NOT NULL DEFAULT '店舗名未指定',
        supplier_name TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        delivery_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT '未処理', -- '未処理', '処理中', '完了', 'エラー'
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 既存DBへのカラム追加（移行用）
    try {
      db.exec(`ALTER TABLE orders ADD COLUMN store_name TEXT NOT NULL DEFAULT '店舗名未指定'`);
    } catch (e) {
      // カラムが既に存在する場合は無視
    }

    // システム設定用テーブル
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.exec(`
      INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_rpa_enabled', 'false');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('deli_sync_auto_enabled', 'true');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('deli_sync_schedule_time', '21:00');
    `);

    // デリサポーター連携ログテーブル
    db.exec(`
      CREATE TABLE IF NOT EXISTS deli_sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id TEXT NOT NULL,
        store_name TEXT NOT NULL,
        status TEXT NOT NULL, -- 'success', 'error'
        saved_count INTEGER DEFAULT 0,
        summary_json TEXT,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  return db;
}
