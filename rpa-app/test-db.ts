import { getDb } from './src/lib/db';

const db = getDb();
console.log("Current orders:");
console.log(db.prepare("SELECT * FROM orders").all());

console.log("Updating order 1 to 120 using string ID...");
const stmt = db.prepare("UPDATE orders SET quantity = ? WHERE id = ?");
const result = stmt.run(120, '1');
console.log("Changes:", result.changes);

console.log("Orders after update:");
console.log(db.prepare("SELECT * FROM orders").all());
