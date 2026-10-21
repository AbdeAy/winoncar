import { DatabaseSync } from 'node:sqlite';

const dbPath = 'WINON CAR/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/f6d9166d2ea703e42b5f1aac71642d9b3f8f6dd1979b5c77455049746f270f6c.sqlite';
const db = new DatabaseSync(dbPath);

console.log("=== UTILISATEURS EN BASE ===");
const users = db.prepare("SELECT id, username, email, role, status FROM users").all();
console.log(users);

console.log("\n=== DERNIERS AUDIT LOGS ===");
const logs = db.prepare("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 10").all();
console.log(logs);

