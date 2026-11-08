const db = require('better-sqlite3')('rpa.db');
db.prepare("UPDATE orders SET status = '未処理', error_message = NULL").run();
console.log('reset ok');
