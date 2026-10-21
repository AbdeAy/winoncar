import { DatabaseSync } from 'node:sqlite';
import { hashPassword } from '../WINON CAR/functions/api/auth/_crypto.js';

const dbPath = 'WINON CAR/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/f6d9166d2ea703e42b5f1aac71642d9b3f8f6dd1979b5c77455049746f270f6c.sqlite';
const db = new DatabaseSync(dbPath);

const newPassword = 'Tahyoudtmama@19990804';
const hash = await hashPassword(newPassword);

// Mise à jour du compte superadmin
db.prepare("UPDATE users SET password_hash = ?, status = 'actif' WHERE username = 'superadmin'").run(hash);

const agentPassword = 'WinonCar@2026#Agent';
const agentHash = await hashPassword(agentPassword);
db.prepare("UPDATE users SET password_hash = ?, status = 'actif' WHERE username = 'admin'").run(agentHash);

console.log("✓ Mots de passe configurés pour l'environnement local :");
console.log(`  1. Super Admin : superadmin / ${newPassword}`);
console.log(`  2. Admin Standard : admin / ${agentPassword}`);
