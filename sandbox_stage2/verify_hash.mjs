import { DatabaseSync } from 'node:sqlite';
import { verifyPassword } from '../WINON CAR/functions/api/auth/_crypto.js';

const dbPath = 'WINON CAR/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/f6d9166d2ea703e42b5f1aac71642d9b3f8f6dd1979b5c77455049746f270f6c.sqlite';
const db = new DatabaseSync(dbPath);

const user = db.prepare("SELECT username, email, password_hash FROM users WHERE username='superadmin'").get();
console.log("User:", user.username, user.email);
console.log("Password hash in DB:", user.password_hash);

const test1 = await verifyPassword('WinonCar@2026#Admin', user.password_hash);
console.log("Matches 'WinonCar@2026#Admin' :", test1);

const test2 = await verifyPassword('WinonCar2026!', user.password_hash);
console.log("Matches 'WinonCar2026!' :", test2);

