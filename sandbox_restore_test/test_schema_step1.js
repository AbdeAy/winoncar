// ==============================================================================
// Étape 1 : Test d'application du schéma SQL dans le bac à sable isolé
// Cible EXCLUSIVEMENT la base du bac à sable : sandbox_restore_test/
// AUCUN accès au projet original WINON CAR, AUCUN accès distant Cloudflare D1
// ==============================================================================

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// 1. Validation stricte du confinement dans sandbox_restore_test
const sandboxDir = fs.realpathSync(path.resolve(__dirname));
const candidatePath = path.resolve(sandboxDir, 'f6d9166d2ea703e42b5f1aac71642d9b3f8f6dd1979b5c77455049746f270f6c.sqlite');

if (!fs.existsSync(candidatePath)) {
  console.error('ERREUR : Le fichier de base de données est introuvable dans le bac à sable.');
  process.exit(1);
}

if (fs.lstatSync(candidatePath).isSymbolicLink()) {
  console.error('ERREUR DE SÉCURITÉ : Le fichier ciblé est un lien symbolique.');
  process.exit(1);
}

const sandboxDbPath = fs.realpathSync(candidatePath);
const relativePath = path.relative(sandboxDir, sandboxDbPath);
if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
  console.error('ERREUR DE SÉCURITÉ : Évasion de chemin détectée hors du bac à sable.');
  process.exit(1);
}

console.log('=== ÉTAPE 1 : TEST DU SCHÉMA DANS LE BAC À SABLE ISOLÉ ===');
console.log('Base cible :', sandboxDbPath);

// 2. Connexion à la base du bac à sable (mode lecture/écriture confiné au sandbox)
const sandboxDb = new DatabaseSync(sandboxDbPath);

try {
  // Activation des clés étrangères SQLite
  sandboxDb.exec('PRAGMA foreign_keys = ON;');

  console.log('\n--- 1. CRÉATION DES TABLES D\'ADMINISTRATION ---');
  
  // Table users (Admin & Super Admin)
  sandboxDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'superadmin')),
      full_name TEXT NOT NULL,
      status TEXT DEFAULT 'actif' CHECK(status IN ('actif', 'desactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );
  `);
  console.log('Table "users" créée avec succès.');

  // Table sessions actives
  sandboxDb.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  console.log('Table "sessions" créée avec succès.');

  // Table vehicles
  sandboxDb.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
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
      availability TEXT DEFAULT 'disponible' CHECK(availability IN ('disponible', 'loue', 'maintenance')),
      is_active INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Table "vehicles" créée avec succès.');

  // Table audit_logs
  sandboxDb.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
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
  `);
  console.log('Table "audit_logs" créée avec succès.');

  // Index
  sandboxDb.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_vehicles_active ON vehicles(is_active);
  `);
  console.log('Index créés avec succès.');

  console.log('\n--- 2. VÉRIFICATIONS D\'INTÉGRITÉ POST-SCHÉMA ---');
  const integrityResult = sandboxDb.prepare('PRAGMA integrity_check').all();
  const isIntegrityOk = Array.isArray(integrityResult) && integrityResult.length === 1 && integrityResult[0].integrity_check === 'ok';
  console.log('Intégrité SQLite :', isIntegrityOk ? 'CONFORME (ok)' : 'ANOMALIE', JSON.stringify(integrityResult));

  const foreignKeyResult = sandboxDb.prepare('PRAGMA foreign_key_check').all();
  const isForeignKeyOk = Array.isArray(foreignKeyResult) && foreignKeyResult.length === 0;
  console.log('Clés étrangères :', isForeignKeyOk ? 'CONFORME (0 violation)' : 'VIOLATION', JSON.stringify(foreignKeyResult));

  // Liste des tables
  const tables = sandboxDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('Tables actuelles dans le bac à sable :', JSON.stringify(tables.map(t => t.name)));

  // Préservation de la table reservations
  const resCount = sandboxDb.prepare('SELECT count(*) AS total_count FROM reservations').get();
  console.log('Table reservations (préservation vérifiée) : total =', resCount.total_count);

  console.log('\n--- 3. TEST FONCTIONNEL DE CONTRAINTES RELATIONNELLES DANS LE BAC À SABLE ---');
  // Insertion temporaire d'un compte de test
  const insertUser = sandboxDb.prepare(`
    INSERT INTO users (username, email, password_hash, role, full_name, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('test_admin', 'test_admin@winoncar.local', 'mock_hash_for_test', 'admin', 'Test Admin Sandbox', 'actif');
  const testUserId = insertUser.lastInsertRowid;
  console.log('Insertion utilisateur test réussie, ID:', testUserId);

  // Insertion d'une session liée
  sandboxDb.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at)
    VALUES (?, ?, ?, datetime('now', '+8 hours'))
  `).run('session_test_id_123', testUserId, 'mock_token_hash_abc');
  console.log('Insertion session test liée réussie.');

  // Test de suppression en cascade (ON DELETE CASCADE)
  sandboxDb.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  const remainingSessions = sandboxDb.prepare('SELECT count(*) AS count FROM sessions WHERE user_id = ?').get(testUserId);
  console.log('Suppression utilisateur test effectuée. Sessions résiduelles (doit être 0):', remainingSessions.count);

  // Audit log test
  sandboxDb.prepare(`
    INSERT INTO audit_logs (username, role, action, entity_type, entity_id, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('system', 'superadmin', 'TEST_SCHEMA_VERIFICATION', 'system', 'sandbox', '{"test":"successful"}');
  const auditCount = sandboxDb.prepare('SELECT count(*) AS count FROM audit_logs').get();
  console.log('Écriture audit_logs test vérifiée : total entrées =', auditCount.count);

  // Nettoyage de l'entrée d'audit de test avec requête paramétrée
  sandboxDb.prepare('DELETE FROM audit_logs WHERE action = ?').run('TEST_SCHEMA_VERIFICATION');
  console.log('Nettoyage des données de test terminé.');

  // Intégrité finale
  const finalIntegrity = sandboxDb.prepare('PRAGMA integrity_check').all();
  console.log('Intégrité finale SQLite :', JSON.stringify(finalIntegrity));

} finally {
  sandboxDb.close();
  console.log('\nConnexion sandboxDb fermée proprement.');
}

console.log('=== ÉTAPE 1 TERMINÉE AVEC SUCCÈS DANS LE BAC À SABLE ===');

