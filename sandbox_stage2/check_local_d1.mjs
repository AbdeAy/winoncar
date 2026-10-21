import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dir = 'WINON CAR/.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sqlite'));

for (const f of files) {
  try {
    const dbPath = path.join(dir, f);
    const stat = fs.statSync(dbPath);
    const db = new DatabaseSync(dbPath);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
    console.log(`${f} (${stat.size} bytes, modified: ${stat.mtime.toISOString()}):`, tables);
    if (tables.includes('reservations')) {
      const cols = db.prepare("PRAGMA table_info('reservations')").all().map(c => c.name);
      console.log(`  -> Columns in reservations (${cols.length}):`, cols);
    }
  } catch (e) {
    console.log(`${f}: ERROR ${e.message}`);
  }
}
