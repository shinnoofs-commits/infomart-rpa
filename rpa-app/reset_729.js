const db = require('better-sqlite3')('rpa.db');
const info = db.prepare("UPDATE orders SET quantity = 0, status = '未処理' WHERE delivery_date = '2026-07-29'").run();
console.log(`Reset ${info.changes} orders for 2026-07-29 to quantity 0 and pending status`);
