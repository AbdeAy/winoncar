import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

console.log('='.repeat(80));
console.log('   TEST ISOLÉ MIGRATION 0005 & ROLLBACK (STATISTIQUES VISITEURS)');
console.log('='.repeat(80));

const db = new DatabaseSync(':memory:');

// 1. Initialisation avec les migrations 0001 à 0004
const mig1 = fs.readFileSync('WINON CAR/migrations/0001_initial_reservations.sql', 'utf8');
const mig2 = fs.readFileSync('WINON CAR/migrations/0002_auth_and_management.sql', 'utf8');
const mig3 = fs.readFileSync('WINON CAR/migrations/0003_locations_and_delivery.sql', 'utf8');
const mig4 = fs.readFileSync('WINON CAR/migrations/0004_client_documents.sql', 'utf8');

db.exec(mig1);
db.exec(mig2);
db.exec(mig3);
db.exec(mig4);

// Insérer des enregistrements de référence
db.prepare(`
  INSERT INTO users (id, username, email, password_hash, role, full_name, status)
  VALUES (1, 'superadmin', 'test@winoncar.com', 'dummy_hash', 'superadmin', 'Test Admin', 'actif')
`).run();

db.prepare(`
  INSERT INTO reservations (booking_ref, car_id, car_name, pickup_location, return_location, pickup_date, pickup_time, return_date, return_time, days, client_name, client_phone, total_mad, total_eur, status)
  VALUES ('WN-HIST-001', 'clio5', 'Renault Clio 5', 'Aéroport', 'Aéroport', '2026-10-20', '10:00', '2026-10-25', '10:00', 5, 'Client Test', '0600000000', 1600, 150, 'en_attente')
`).run();

console.log('\n[1] Application de 0005_visitor_analytics.sql...');
const mig5 = fs.readFileSync('WINON CAR/migrations/0005_visitor_analytics.sql', 'utf8');
db.exec(mig5);

// Vérification de la création de la table site_visits
const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='site_visits'").get();
if (!tableCheck) {
  throw new Error('ÉCHEC: La table site_visits n\'a pas été créée !');
}
console.log('  ✓ PASS: Table site_visits créée avec succès.');

// Vérification des colonnes
const cols = db.prepare('PRAGMA table_info(site_visits)').all().map(c => c.name);
const expectedCols = ['id', 'visitor_hash', 'session_id', 'page_path', 'referrer', 'device_type', 'is_visit', 'created_at'];
for (const col of expectedCols) {
  if (!cols.includes(col)) throw new Error(`ÉCHEC: Colonne manquante: ${col}`);
}
console.log(`  ✓ PASS: Toutes les colonnes attendues (${cols.length}) sont présentes.`);

// Insertion de données de visites de test
db.prepare(`
  INSERT INTO site_visits (visitor_hash, session_id, page_path, referrer, device_type, is_visit)
  VALUES 
    ('hash_user_1', 'sess_1', '/', 'direct', 'mobile', 1),
    ('hash_user_1', 'sess_1', '/#flotte', 'direct', 'mobile', 0),
    ('hash_user_2', 'sess_2', '/', 'google.com', 'desktop', 1),
    ('hash_user_3', 'sess_3', '/', 'facebook.com', 'tablet', 1)
`).run();

const visitCount = db.prepare("SELECT COUNT(*) as c FROM site_visits").get().c;
const distinctSessions = db.prepare("SELECT COUNT(DISTINCT session_id) as c FROM site_visits WHERE is_visit = 1").get().c;
const distinctVisitors = db.prepare("SELECT COUNT(DISTINCT visitor_hash) as c FROM site_visits").get().c;

if (visitCount !== 4 || distinctSessions !== 3 || distinctVisitors !== 3) {
  throw new Error(`Incohérence dans les métriques insérées: count=${visitCount}, sessions=${distinctSessions}, visitors=${distinctVisitors}`);
}
console.log('  ✓ PASS: Insertion et requêtes d\'agrégation des visites validées.');

// [2] Test du Rollback
console.log('\n[2] Test du script de Rollback 0005...');
const rollback5 = fs.readFileSync('WINON CAR/migrations_archive/0005_rollback.sql', 'utf8');
db.exec(rollback5);

const tableAfterRollback = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='site_visits'").get();
if (tableAfterRollback) {
  throw new Error('ÉCHEC: La table site_visits existe toujours après rollback !');
}
console.log('  ✓ PASS: Table site_visits et index supprimés proprement.');

// Vérification que les données existantes sont 100% intactes
const userAfter = db.prepare("SELECT username FROM users WHERE id = 1").get();
const resAfter = db.prepare("SELECT booking_ref FROM reservations WHERE booking_ref = 'WN-HIST-001'").get();
if (!userAfter || userAfter.username !== 'superadmin' || !resAfter) {
  throw new Error('ÉCHEC: Données historiques corrompues ou altérées après rollback !');
}
console.log('  ✓ PASS: Données utilisateurs et réservations historiques 100% intactes.');

console.log('\n🎉 TOUS LES TESTS DE MIGRATION & ROLLBACK 0005 SONT AU VERT !\n');

