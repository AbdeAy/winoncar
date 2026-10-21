import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

console.log('================================================================================');
console.log('   TEST ISOLÉ MIGRATION 0004 & ROLLBACK (DOCUMENTS & LANGUE)                   ');
console.log('================================================================================');

const db = new DatabaseSync(':memory:');

// Base schema after 0001, 0002, 0003
db.exec(`
  CREATE TABLE reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_ref TEXT NOT NULL UNIQUE,
    car_id TEXT NOT NULL,
    car_name TEXT NOT NULL,
    pickup_location TEXT NOT NULL,
    return_location TEXT NOT NULL,
    pickup_date TEXT NOT NULL,
    pickup_time TEXT NOT NULL,
    return_date TEXT NOT NULL,
    return_time TEXT NOT NULL,
    days INTEGER NOT NULL,
    flight_number TEXT,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_email TEXT,
    notes TEXT,
    opt_wifi INTEGER DEFAULT 0,
    total_mad INTEGER NOT NULL,
    total_eur INTEGER NOT NULL,
    status TEXT DEFAULT 'en_attente',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    pickup_city TEXT DEFAULT 'Agadir',
    return_city TEXT DEFAULT 'Agadir',
    delivery_fee_status TEXT DEFAULT 'pending_confirmation',
    delivery_fee_mad INTEGER DEFAULT NULL,
    is_read INTEGER DEFAULT 0
  );

  INSERT INTO reservations (booking_ref, car_id, car_name, pickup_location, return_location, pickup_date, pickup_time, return_date, return_time, days, client_name, client_phone, total_mad, total_eur)
  VALUES ('WIN-HISTORIC', 'clio5', 'Renault Clio 5', 'Aéroport Agadir', 'Aéroport Agadir', '2026-10-20', '10:00', '2026-10-25', '10:00', 5, 'Client Existant', '+212600000000', 1600, 160);
`);

console.log('\n[1] Application de 0004_client_documents.sql...');
const migrationSql = fs.readFileSync('WINON CAR/migrations/0004_client_documents.sql', 'utf8');
db.exec(migrationSql);

const colsAfterMig = db.prepare("PRAGMA table_info('reservations')").all().map(c => c.name);
console.log(`  Nombre de colonnes après migration : ${colsAfterMig.length} (attendu: 31)`);
const expectedCols = ['client_language', 'doc_cin_recto', 'doc_cin_verso', 'doc_license_recto', 'doc_license_verso'];
for (const col of expectedCols) {
  if (!colsAfterMig.includes(col)) {
    console.error(`  ✗ ERREUR : Colonne manquante '${col}'`);
    process.exit(1);
  }
}
console.log('  ✓ PASS: Toutes les colonnes ajoutées sont présentes.');

// Insert a reservation with language and documents
db.prepare(`
  INSERT INTO reservations (
    booking_ref, car_id, car_name, pickup_location, return_location,
    pickup_date, pickup_time, return_date, return_time, days,
    client_name, client_phone, total_mad, total_eur,
    client_language, doc_cin_recto, doc_license_recto
  ) VALUES (
    'WIN-DOCS01', 'peugeot208', 'Peugeot 208 GT', 'Aéroport Marrakech', 'Aéroport Marrakech',
    '2026-11-01', '14:00', '2026-11-06', '14:00', 5,
    'Karim Benjelloun', '+212611223344', 1800, 180,
    'ar', 'data:image/webp;base64,cinRectoData', 'data:image/webp;base64,permisRectoData'
  )
`).run();

const newRes = db.prepare("SELECT * FROM reservations WHERE booking_ref = 'WIN-DOCS01'").get();
if (newRes.client_language !== 'ar' || !newRes.doc_cin_recto.startsWith('data:image/webp')) {
  console.error('  ✗ ERREUR : Données de réservation avec documents non conformes');
  process.exit(1);
}
console.log('  ✓ PASS: Insertion d\'une réservation avec langue arabe et documents réussie.');

// Check historic reservation untouched
const histRes = db.prepare("SELECT * FROM reservations WHERE booking_ref = 'WIN-HISTORIC'").get();
if (histRes.client_language !== 'fr' || histRes.doc_cin_recto !== null) {
  console.error('  ✗ ERREUR : Rétrocompatibilité rompue pour la réservation historique');
  process.exit(1);
}
console.log('  ✓ PASS: Réservation historique préservée (valeur par défaut client_language="fr" et docs=NULL).');

console.log('\n[2] Test du script de Rollback 0004...');
const rollbackSql = fs.readFileSync('WINON CAR/migrations_archive/0004_rollback.sql', 'utf8');
db.exec(rollbackSql);

const colsAfterRollback = db.prepare("PRAGMA table_info('reservations')").all().map(c => c.name);
console.log(`  Nombre de colonnes après rollback : ${colsAfterRollback.length} (attendu: 26)`);
for (const col of expectedCols) {
  if (colsAfterRollback.includes(col)) {
    console.error(`  ✗ ERREUR : La colonne '${col}' est encore présente après rollback !`);
    process.exit(1);
  }
}
console.log('  ✓ PASS: Les 5 colonnes ont été supprimées proprement.');

// Verify historical reservation still intact after rollback
const histAfterRollback = db.prepare("SELECT booking_ref, client_name, total_mad FROM reservations WHERE booking_ref = 'WIN-HISTORIC'").get();
if (!histAfterRollback || histAfterRollback.client_name !== 'Client Existant') {
  console.error('  ✗ ERREUR : Données historiques endommagées après rollback !');
  process.exit(1);
}
console.log('  ✓ PASS: Données historiques intactes après rollback.');
console.log('\n🎉 TOUS LES TESTS DE MIGRATION & ROLLBACK 0004 SONT AU VERT !');

