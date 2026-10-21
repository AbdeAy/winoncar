import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const dbPath = 'WINON CAR/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/f6d9166d2ea703e42b5f1aac71642d9b3f8f6dd1979b5c77455049746f270f6c.sqlite';
const migrationSql = fs.readFileSync('WINON CAR/migrations/0003_locations_and_delivery.sql', 'utf-8');

const db = new DatabaseSync(dbPath);

console.log("Application de la migration 0003 sur la base locale de développement...");

// Exécution des instructions une par une
const statements = migrationSql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

for (const stmt of statements) {
  try {
    db.exec(stmt);
    console.log(`  ✓ Exécuté : ${stmt.slice(0, 50)}...`);
  } catch (err) {
    if (err.message.includes('duplicate column')) {
      console.log(`  ℹ Déjà existant : ${stmt.slice(0, 50)}...`);
    } else {
      console.error(`  ❌ Erreur sur : ${stmt}`, err.message);
      throw err;
    }
  }
}

// Enregistrement dans d1_migrations
try {
  db.prepare("INSERT INTO d1_migrations (name, applied_at) VALUES ('0003_locations_and_delivery.sql', datetime('now'))").run();
  console.log("  ✓ Migration 0003 enregistrée dans d1_migrations.");
} catch (e) {
  console.log("  ℹ d1_migrations note :", e.message);
}

const cols = db.prepare("PRAGMA table_info('reservations')").all().map(c => c.name);
console.log(`\nSuccès ! Colonnes reservations (${cols.length}) :`, cols);

