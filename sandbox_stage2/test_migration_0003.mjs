// WINON CAR - Test unitaire isolé pour la migration 0003 et son rollback (Stage 2)
// Exécution 100% en mémoire RAM (:memory:) sans accès disque, sans réseau, sans Cloudflare
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert';

console.log("=== DÉBUT DU TEST UNITAIRE ISOLÉ : MIGRATION 0003 & ROLLBACK ===");

// 1. Initialisation SQLite en mémoire vive exclusive
const db = new DatabaseSync(':memory:');
console.log("[PASS] Base SQLite allouée strictement en mémoire vive (:memory:).");

// 2. Schéma initial de référence (0001)
const DDL_INITIAL = `
CREATE TABLE reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_ref TEXT UNIQUE NOT NULL,
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_reservations_ref ON reservations(booking_ref);
CREATE INDEX idx_reservations_created ON reservations(created_at);
`;
db.exec(DDL_INITIAL);
console.log("[PASS] Schéma initial créé (21 colonnes, 2 index explicites + 1 index UNIQUE automatique).");

// Capture de l'empreinte structurelle de référence avant migration
const columnsBaseline = db.prepare("PRAGMA table_info('reservations')").all();
const indexesBaseline = db.prepare("PRAGMA index_list('reservations')").all();
console.log(`[PASS] Empreinte capturée : ${columnsBaseline.length} colonnes, ${indexesBaseline.length} index.`);

// 3. Insertion d'une réservation historique témoin
db.prepare(`
  INSERT INTO reservations (
    booking_ref, car_id, car_name, pickup_location, return_location,
    pickup_date, pickup_time, return_date, return_time, days,
    flight_number, client_name, client_phone, client_email, notes,
    opt_wifi, total_mad, total_eur, status
  ) VALUES (
    'WN-20261017-0001', 'clio5', 'Renault Clio 5', 'Aéroport Agadir Al-Massira', 'Aéroport Agadir Al-Massira',
    '2026-10-20', '10:00', '2026-10-25', '10:00', 5,
    'AT450', 'Abdellah Ahiyoud', '+212600000000', 'client@example.com', 'Siège bébé requis',
    1, 1600, 150, 'en_attente'
  )
`).run();
console.log("[PASS] Réservation historique témoin insérée : WN-20261017-0001.");

// 4. Application de la migration 0003
const DDL_MIGRATION = `
ALTER TABLE reservations ADD COLUMN pickup_city TEXT DEFAULT 'Agadir';
ALTER TABLE reservations ADD COLUMN return_city TEXT DEFAULT 'Agadir';
ALTER TABLE reservations ADD COLUMN delivery_fee_status TEXT DEFAULT 'pending_confirmation' 
  CHECK(delivery_fee_status IN ('pending_confirmation', 'confirmed', 'unavailable'));
ALTER TABLE reservations ADD COLUMN delivery_fee_mad INTEGER DEFAULT NULL;
ALTER TABLE reservations ADD COLUMN is_read INTEGER DEFAULT 0;
CREATE INDEX idx_reservations_unread ON reservations(is_read);
CREATE INDEX idx_reservations_delivery ON reservations(delivery_fee_status);
`;
db.exec(DDL_MIGRATION);
console.log("[PASS] Migration 0003 appliquée en mémoire (5 colonnes + 2 index ajoutés).");

// 5. Contrôles d'intégrité et de compatibilité
const checkIntegrity = db.prepare("PRAGMA integrity_check").get();
assert.strictEqual(checkIntegrity.integrity_check, 'ok');
const checkFK = db.prepare("PRAGMA foreign_key_check").all();
assert.strictEqual(checkFK.length, 0);
console.log("[PASS] PRAGMA integrity_check: ok, foreign_key_check: 0 violation.");

const columnsAfterMigration = db.prepare("PRAGMA table_info('reservations')").all();
const indexesAfterMigration = db.prepare("PRAGMA index_list('reservations')").all();
assert.strictEqual(columnsAfterMigration.length, columnsBaseline.length + 5);
assert.strictEqual(indexesAfterMigration.length, indexesBaseline.length + 2);
console.log(`[PASS] Schéma migré validé : ${columnsAfterMigration.length} colonnes (21+5), ${indexesAfterMigration.length} index (3+2).`);

// Vérification de la préservation de la réservation historique
const historicAfterMig = db.prepare("SELECT * FROM reservations WHERE booking_ref = 'WN-20261017-0001'").get();
assert.strictEqual(historicAfterMig.booking_ref, 'WN-20261017-0001');
assert.strictEqual(historicAfterMig.car_name, 'Renault Clio 5');
assert.strictEqual(historicAfterMig.total_mad, 1600);
assert.strictEqual(historicAfterMig.pickup_city, 'Agadir');
assert.strictEqual(historicAfterMig.return_city, 'Agadir');
assert.strictEqual(historicAfterMig.delivery_fee_status, 'pending_confirmation');
assert.strictEqual(historicAfterMig.delivery_fee_mad, null);
assert.strictEqual(historicAfterMig.is_read, 0);
console.log("[PASS] Réservation historique intacte avec valeurs par défaut conformes.");

// Insertion d'une réservation Stage 2 (Marrakech avec frais de livraison confirmés)
db.prepare(`
  INSERT INTO reservations (
    booking_ref, car_id, car_name, pickup_city, pickup_location, return_city, return_location,
    pickup_date, pickup_time, return_date, return_time, days, client_name, client_phone, total_mad, total_eur,
    delivery_fee_status, delivery_fee_mad, is_read
  ) VALUES (
    'WN-20261017-0002', 'duster', 'Dacia Duster 4x4', 'Marrakech', 'Aéroport Marrakech-Ménara (RAK)', 'Marrakech', 'Aéroport Marrakech-Ménara (RAK)',
    '2026-10-22', '12:00', '2026-10-28', '12:00', 6, 'Client Marrakech', '+212611111111', 2520, 240,
    'confirmed', 300, 1
  )
`).run();
console.log("[PASS] Insertion réservation Stage 2 réussie (Marrakech, frais confirmés 300 MAD).");

// Contrôle de la contrainte CHECK sur delivery_fee_status
assert.throws(() => {
  db.prepare(`
    INSERT INTO reservations (
      booking_ref, car_id, car_name, pickup_city, pickup_location, return_city, return_location,
      pickup_date, pickup_time, return_date, return_time, days, client_name, client_phone, total_mad, total_eur,
      delivery_fee_status
    ) VALUES (
      'WN-ERR', 'clio5', 'Clio', 'Agadir', 'Aéroport', 'Agadir', 'Aéroport',
      '2026-10-22', '12:00', '2026-10-28', '12:00', 6, 'Err', '+212600000000', 1000, 100,
      'statut_invalide'
    )
  `).run();
}, /CHECK constraint failed/);
console.log("[PASS] Contrainte CHECK sur delivery_fee_status vérifiée (rejet statut non conforme).");

// 6. Exécution du Rollback
const DDL_ROLLBACK = `
DROP INDEX IF EXISTS idx_reservations_unread;
DROP INDEX IF EXISTS idx_reservations_delivery;
ALTER TABLE reservations DROP COLUMN pickup_city;
ALTER TABLE reservations DROP COLUMN return_city;
ALTER TABLE reservations DROP COLUMN delivery_fee_status;
ALTER TABLE reservations DROP COLUMN delivery_fee_mad;
ALTER TABLE reservations DROP COLUMN is_read;
`;
db.exec(DDL_ROLLBACK);
console.log("[PASS] Rollback exécuté en mémoire.");

// 7. Vérification de la restauration exacte du schéma
const checkIntegrityAfter = db.prepare("PRAGMA integrity_check").get();
assert.strictEqual(checkIntegrityAfter.integrity_check, 'ok');

const columnsAfterRollback = db.prepare("PRAGMA table_info('reservations')").all();
const indexesAfterRollback = db.prepare("PRAGMA index_list('reservations')").all();
assert.deepStrictEqual(columnsBaseline, columnsAfterRollback);
assert.deepStrictEqual(indexesBaseline, indexesAfterRollback);
console.log("[PASS] Structure table et index restaurés 100% à l'état initial (PRAGMA table_info & index_list).");

// Vérification des données après rollback
const historicFinal = db.prepare("SELECT * FROM reservations WHERE booking_ref = 'WN-20261017-0001'").get();
assert.strictEqual(historicFinal.booking_ref, 'WN-20261017-0001');
assert.strictEqual(historicFinal.car_name, 'Renault Clio 5');
assert.strictEqual(historicFinal.client_name, 'Abdellah Ahiyoud');
assert.strictEqual(historicFinal.total_mad, 1600);
assert.strictEqual(historicFinal.pickup_city, undefined);
console.log("[PASS] Données historiques préservées après rollback, colonnes ajoutées supprimées.");

// Vérification explicite de la réservation Stage 2 après rollback
const stage2Final = db.prepare("SELECT * FROM reservations WHERE booking_ref = 'WN-20261017-0002'").get();
assert.strictEqual(stage2Final.booking_ref, 'WN-20261017-0002');
assert.strictEqual(stage2Final.car_name, 'Dacia Duster 4x4');
assert.strictEqual(stage2Final.client_name, 'Client Marrakech');
assert.strictEqual(stage2Final.total_mad, 2520);
assert.strictEqual(stage2Final.pickup_city, undefined);
assert.strictEqual(stage2Final.return_city, undefined);
assert.strictEqual(stage2Final.delivery_fee_status, undefined);
assert.strictEqual(stage2Final.delivery_fee_mad, undefined);
assert.strictEqual(stage2Final.is_read, undefined);
console.log("[PASS] Réservation Stage 2 préservée dans ses colonnes de base, données des 5 colonnes supprimées intentionnellement purgées.");

console.log("\n=== RÉSULTAT GLOBAL : TEST EN MÉMOIRE RÉUSSI À 100% (0 DÉFAUT) ===");

