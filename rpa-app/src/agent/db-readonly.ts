/**
 * @fileOverview Read-Only SQLite Client for S-Hub Agent
 * 本番稼働中のRPA処理に干渉しないよう、readonlyモードで接続します。
 */

import Database from 'better-sqlite3';
import * as path from 'path';

const dbPath = path.join(process.cwd(), 'rpa.db');
let readonlyDb: Database.Database | null = null;

export function getReadonlyDb(): Database.Database {
  if (!readonlyDb) {
    readonlyDb = new Database(dbPath, { readonly: true, fileMustExist: false });
  }
  return readonlyDb;
}
