// ==============================================================================
// Script de vérification 100% lecture seule (Read-Only) pour le bac à sable
// Cible EXCLUSIVEMENT la base restaurée dans : sandbox_restore_test/
// AUCUN accès à la base originale, AUCUN accès distant, AUCUNE écriture
// AUCUNE donnée personnelle (noms, téléphones, emails) n'est affichée
// ==============================================================================

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// 1. Validation robuste de confinement et résolution canonique (anti-symlink)
const sandboxDir = fs.realpathSync(path.resolve(__dirname));
const candidatePath = path.resolve(sandboxDir, 'f6d9166d2ea703e42b5f1aac71642d9b3f8f6dd1979b5c77455049746f270f6c.sqlite');

const fileExists = fs.existsSync(candidatePath);
console.log('=== VÉRIFICATION DU BAC À SABLE (LECTURE SEULE STRICTE) ===');
console.log('1. Existence du fichier SQLite :', fileExists);

if (!fileExists) {
  console.error('ERREUR : Le fichier de base de données est introuvable dans le bac à sable.');
  process.exit(1);
}

// Vérification de sécurité anti-symlink directe
if (fs.lstatSync(candidatePath).isSymbolicLink()) {
  console.error('ERREUR DE SÉCURITÉ : Le fichier ciblé est un lien symbolique.');
  process.exit(1);
}

// Résolution canonique réelle de la cible
const sandboxDbPath = fs.realpathSync(candidatePath);

// Validation robuste de confinement via path.relative
const relativePath = path.relative(sandboxDir, sandboxDbPath);
const isContained = relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);

if (!isContained) {
  console.error('ERREUR DE SÉCURITÉ : Évasion de chemin détectée hors du bac à sable.');
  process.exit(1);
}

console.log('Chemin Sandbox validé :', sandboxDbPath);
const fileSize = fs.statSync(sandboxDbPath).size;
console.log('2. Taille du fichier SQLite :', fileSize, 'octets');

// 2. Connexion unique à la base restaurée en mode STRICTEMENT LECTURE SEULE
const sandboxDb = new DatabaseSync(sandboxDbPath, { readOnly: true });

try {
  // 3. Vérification d'intégrité SQLite (PRAGMA integrity_check)
  const integrityResult = sandboxDb.prepare('PRAGMA integrity_check').all();
  const isIntegrityOk = Array.isArray(integrityResult) && integrityResult.length === 1 && integrityResult[0].integrity_check === 'ok';
  console.log("3. Intégrité SQLite :", isIntegrityOk ? "CONFORME (ok)" : "ANOMALIE DÉTECTÉE", JSON.stringify(integrityResult));

  // 4. Vérification des clés étrangères (PRAGMA foreign_key_check)
  const foreignKeyResult = sandboxDb.prepare('PRAGMA foreign_key_check').all();
  const isForeignKeyOk = Array.isArray(foreignKeyResult) && foreignKeyResult.length === 0;
  console.log("4. Clés étrangères :", isForeignKeyOk ? "CONFORME (0 violation)" : "VIOLATIONS DÉTECTÉES", JSON.stringify(foreignKeyResult));

  // 5. Noms des tables dans sqlite_master (uniquement les noms)
  const tablesList = sandboxDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  const tableNames = tablesList.map(t => t.name);
  console.log('5. Noms des tables détectées :', JSON.stringify(tableNames));

  // 6. Vérification de sécurité : existence de la table reservations avant comptage
  if (tableNames.includes('reservations')) {
    const reservationCount = sandboxDb.prepare('SELECT count(*) AS total_count FROM reservations').get();
    console.log('6. Nombre total de réservations :', reservationCount.total_count);
  } else {
    console.log('6. ATTENTION : La table "reservations" n\'existe pas dans cette base.');
  }
} finally {
  // 7. Fermeture sécurisée garantie de la connexion unique
  sandboxDb.close();
  console.log('\nConnexion sandboxDb fermée proprement.');
}

console.log('=== VÉRIFICATION DU BAC À SABLE TERMINÉE AVEC SUCCÈS ===');
