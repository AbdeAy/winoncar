import { DatabaseSync } from 'node:sqlite';
import { handleVehicleUpdate } from '../WINON CAR/functions/api/admin/vehicles.js';

console.log('================================================================================');
console.log('   TEST VALIDATION CHANGEMENT PHOTO SAFARI / IPHONE (API VEHICLES)             ');
console.log('================================================================================');

// 1. Setup in-memory SQLite DB
const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE vehicles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    category_label TEXT NOT NULL,
    price_mad INTEGER NOT NULL,
    badge TEXT,
    image_url TEXT NOT NULL,
    gearbox TEXT NOT NULL,
    fuel TEXT NOT NULL,
    seats TEXT NOT NULL,
    ac TEXT NOT NULL,
    bags TEXT NOT NULL,
    doors TEXT NOT NULL,
    description TEXT NOT NULL,
    availability TEXT DEFAULT 'disponible',
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  INSERT INTO vehicles (id, name, category, category_label, price_mad, image_url, gearbox, fuel, seats, ac, bags, doors, description)
  VALUES ('clio5', 'Renault Clio 5', 'eco', 'Citadine', 320, 'assets/cars/renault-clio-5.jpg', 'Manuelle', 'Diesel', '5', 'A/C', '2', '5', 'Desc');
`);

// Mock env
const mockEnv = {
  DB: {
    prepare(sql) {
      const stmt = db.prepare(sql);
      return {
        bind(...args) {
          return {
            async first() {
              return stmt.get(...args);
            },
            async all() {
              return { results: stmt.all(...args) };
            },
            async run() {
              return stmt.run(...args);
            }
          };
        }
      };
    }
  }
};

const mockSuperAdmin = {
  id: 1,
  username: 'superadmin',
  role: 'superadmin',
  full_name: 'Super Admin'
};

let passed = 0;
let total = 0;
function assert(cond, msg) {
  total++;
  if (cond) {
    passed++;
    console.log(`  ✓ PASS: ${msg}`);
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

async function run() {
  // Test 1: Submitting with identical values and NO photo -> Expect "Aucune modification nécessaire."
  {
    const req = new Request('http://localhost/api/admin/vehicles/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'clio5',
        availability: 'disponible',
        priceMad: 320
      })
    });
    const ctx = { request: req, env: mockEnv, data: { user: mockSuperAdmin } };
    const res = await handleVehicleUpdate(ctx);
    const body = await res.json();
    assert(res.status === 200, 'Statut 200 renvoyé pour requête sans changement');
    assert(body.message === 'Aucune modification nécessaire.', 'Message "Aucune modification nécessaire." quand rien ne change');
  }

  // Test 2: Submitting a new compressed photo from Safari (JPEG format) with identical price & availability
  {
    const fakeSafariJpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...';
    const req = new Request('http://localhost/api/admin/vehicles/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'clio5',
        availability: 'disponible',
        priceMad: 320,
        imageUrl: fakeSafariJpeg
      })
    });
    const ctx = { request: req, env: mockEnv, data: { user: mockSuperAdmin } };
    const res = await handleVehicleUpdate(ctx);
    const body = await res.json();
    assert(res.status === 200, 'Statut 200 renvoyé lors de la mise à jour de la photo');
    assert(body.success === true, 'Succès true lors de la mise à jour');
    assert(body.message !== 'Aucune modification nécessaire.', 'Le message n\'est PAS "Aucune modification nécessaire."');
    
    // Check DB
    const row = db.prepare("SELECT image_url FROM vehicles WHERE id = 'clio5'").get();
    assert(row.image_url === fakeSafariJpeg, 'Photo Safari (JPEG data URI) enregistrée dans D1');
  }

  // Test 3: Submitting a new WebP photo
  {
    const fakeWebp = 'data:image/webp;base64,UklGRmYAAABXRUJQVlA4TFsAAAAv...';
    const req = new Request('http://localhost/api/admin/vehicles/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'clio5',
        imageUrl: fakeWebp
      })
    });
    const ctx = { request: req, env: mockEnv, data: { user: mockSuperAdmin } };
    const res = await handleVehicleUpdate(ctx);
    const body = await res.json();
    assert(body.success === true, 'Succès true pour WebP data URI');
    const row = db.prepare("SELECT image_url FROM vehicles WHERE id = 'clio5'").get();
    assert(row.image_url === fakeWebp, 'Photo WebP enregistrée dans D1');
  }

  // Test 4: Audit log correctly records photo update
  {
    const logs = db.prepare("SELECT * FROM audit_logs WHERE action = 'VEHICLE_UPDATED'").all();
    assert(logs.length === 2, 'Deux événements enregistrés dans le journal d\'audit');
    const lastLog = JSON.parse(logs[1].details);
    assert(lastLog.photoUpdated === true, 'photoUpdated marqué true dans audit_logs');
  }

  console.log(`\nTOTAL: ${passed}/${total} tests réussis`);
  if (passed === total) {
    console.log('🎉 TOUS LES TESTS SAFARI / IPHONE SONT PASSÉS !');
  } else {
    process.exit(1);
  }
}

run().catch(console.error);

