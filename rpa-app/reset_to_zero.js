const db = require('better-sqlite3')('rpa.db');
db.prepare("UPDATE orders SET quantity = 0, status = '未処理'").run();
console.log('All orders reset to 0 and marked as pending');
