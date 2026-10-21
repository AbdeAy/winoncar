// ==============================================================================
// Test automatisé de l'Étape 2 : Moteur Cryptographique & Flux d'Authentification
// Confiné EXCLUSIVEMENT au bac à sable sandbox_restore_test
// ==============================================================================

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  validatePasswordPolicy,
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashSessionToken,
  createSessionCookie,
  createLogoutCookie
} from '../WINON CAR/functions/api/auth/_crypto.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== TEST DE L\'ÉTAPE 2 : MOTEUR CRYPTOGRAPHIQUE & AUTHENTIFICATION ===\n');

// ------------------------------------------------------------------------------
// TEST 1 : Validation de la politique de mot de passe (>=12, maj, min, num, sym)
// ------------------------------------------------------------------------------
console.log('--- 1. TEST DE LA POLITIQUE DE MOT DE PASSE ---');

const policyTests = [
  { pwd: 'short', expected: false, desc: 'Trop court (< 12)' },
  { pwd: 'lowercaseonly123!', expected: false, desc: 'Sans majuscule' },
  { pwd: 'UPPERCASEONLY123!', expected: false, desc: 'Sans minuscule' },
  { pwd: 'NoDigitsHereAtAll!', expected: false, desc: 'Sans chiffre' },
  { pwd: 'NoSymbolsHere1234', expected: false, desc: 'Sans symbole' },
  { pwd: 'WinonCar@2026#Secure', expected: true, desc: 'Mot de passe conforme (20 cars, Maj, Min, Num, Sym)' }
];

let policyOk = true;
for (const t of policyTests) {
  const res = validatePasswordPolicy(t.pwd);
  const pass = res.valid === t.expected;
  console.log(`[${pass ? 'OK' : 'FAIL'}] ${t.desc} (test: "${t.pwd}") -> valid=${res.valid}`);
  if (!pass) policyOk = false;
}

if (!policyOk) {
  console.error('ÉCHEC : Certains tests de politique de mot de passe ont échoué.');
  process.exit(1);
}
console.log('Politique de mot de passe validée à 100%.\n');

// ------------------------------------------------------------------------------
// TEST 2 : Hachage PBKDF2-SHA256 & Vérification sécurisée
// ------------------------------------------------------------------------------
console.log('--- 2. TEST DU HACHAGE PBKDF2-SHA256 & VÉRIFICATION ---');

const testPassword = 'WinonCar@2026#Secure';
console.log('Hachage du mot de passe de test en cours (100 000 itérations PBKDF2)...');
const t0 = Date.now();
const storedHash = await hashPassword(testPassword);
const elapsed = Date.now() - t0;
console.log(`Hash généré en ${elapsed} ms : ${storedHash.substring(0, 24)}... (${storedHash.length} caractères)`);

const parts = storedHash.split('$');
if (parts.length !== 2 || parts[0].length !== 32 || parts[1].length !== 64) {
  console.error('ÉCHEC : Format du hash invalide (attendu: selHex32$hashHex64).');
  process.exit(1);
}
console.log('[OK] Format du hash conforme (sel 16 octets + clé 32 octets).');

const verifySuccess = await verifyPassword(testPassword, storedHash);
console.log(`[${verifySuccess ? 'OK' : 'FAIL'}] Vérification avec le bon mot de passe -> ${verifySuccess}`);

const verifyWrong = await verifyPassword('MauvaisMotDePasse123!', storedHash);
console.log(`[${!verifyWrong ? 'OK' : 'FAIL'}] Vérification avec mauvais mot de passe -> ${verifyWrong} (rejet attendu)`);

if (!verifySuccess || verifyWrong) {
  console.error('ÉCHEC : La vérification cryptographique a échoué.');
  process.exit(1);
}
console.log('Moteur cryptographique PBKDF2 validé à 100%.\n');

// ------------------------------------------------------------------------------
// TEST 3 : Génération et hachage des tokens de session
// ------------------------------------------------------------------------------
console.log('--- 3. TEST DES TOKENS DE SESSION & COOKIES ---');

const sessionToken = generateSessionToken();
console.log(`Token généré (256 bits) : ${sessionToken.substring(0, 16)}... (longueur: ${sessionToken.length})`);
const tokenHash = await hashSessionToken(sessionToken);
console.log(`Hash SHA-256 du token : ${tokenHash.substring(0, 16)}... (longueur: ${tokenHash.length})`);

const cookieHeader = createSessionCookie(sessionToken);
console.log(`Set-Cookie généré : ${cookieHeader}`);
const logoutCookie = createLogoutCookie();
console.log(`Set-Cookie déconnexion : ${logoutCookie}`);

if (sessionToken.length !== 64 || tokenHash.length !== 64 || !cookieHeader.includes('HttpOnly') || !cookieHeader.includes('SameSite=Strict')) {
  console.error('ÉCHEC : Propriétés de session ou cookie non conformes.');
  process.exit(1);
}
console.log('[OK] Propriétés de session et cookies de sécurité validés.\n');

// ------------------------------------------------------------------------------
// TEST 4 : Simulation du flux complet d'authentification sur la base du bac à sable
// ------------------------------------------------------------------------------
console.log('--- 4. TEST DU FLUX AUTHENTIFICATION SUR LA BASE DU BAC À SABLE ---');

const sandboxDbPath = path.resolve(__dirname, 'f6d9166d2ea703e42b5f1aac71642d9b3f8f6dd1979b5c77455049746f270f6c.sqlite');
console.log('Connexion à la base bac à sable :', sandboxDbPath);
const db = new DatabaseSync(sandboxDbPath);

try {
  db.exec('PRAGMA foreign_keys = ON;');

  // Nettoyage préalable des éventuels comptes de test résiduels
  db.prepare("DELETE FROM sessions WHERE id IN ('session_sa_123', 'session_admin_456')").run();
  db.prepare("DELETE FROM users WHERE username IN ('superadmin_test', 'agent_admin_test')").run();

  // Insertion d'un Super Admin et d'un Admin de test
  const superAdminPwd = 'SuperAdmin@Winon2026!';
  const superAdminHash = await hashPassword(superAdminPwd);
  const adminPwd = 'SimpleAdmin@Winon2026!';
  const adminHash = await hashPassword(adminPwd);

  const insertSA = db.prepare(`
    INSERT INTO users (username, email, password_hash, role, full_name, status)
    VALUES (?, ?, ?, 'superadmin', 'Super Administrateur Test', 'actif')
  `).run('superadmin_test', 'superadmin@winoncar.local', superAdminHash);
  const saId = insertSA.lastInsertRowid;
  console.log(`[OK] Super Admin inséré avec ID: ${saId}`);

  const insertAdmin = db.prepare(`
    INSERT INTO users (username, email, password_hash, role, full_name, status)
    VALUES (?, ?, ?, 'admin', 'Agent Admin Test', 'actif')
  `).run('agent_admin_test', 'agent@winoncar.local', adminHash);
  const adminId = insertAdmin.lastInsertRowid;
  console.log(`[OK] Admin standard inséré avec ID: ${adminId}`);

  // Test de connexion Super Admin
  const userRecord = db.prepare("SELECT * FROM users WHERE username = ? AND status = 'actif'").get('superadmin_test');
  const loginPass = await verifyPassword(superAdminPwd, userRecord.password_hash);
  console.log(`[${loginPass ? 'OK' : 'FAIL'}] Authentification Super Admin -> ${loginPass}`);

  // Création d'une session Super Admin
  const rawTokenSA = generateSessionToken();
  const hashTokenSA = await hashSessionToken(rawTokenSA);
  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at)
    VALUES (?, ?, ?, datetime('now', '+8 hours'))
  `).run('session_sa_123', saId, hashTokenSA);
  console.log('[OK] Session Super Admin enregistrée en base.');

  // Test endpoint /api/auth/me pour Super Admin
  const meQuery = db.prepare(`
    SELECT u.id, u.username, u.email, u.role, u.full_name
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND u.status = 'actif'
  `).get(hashTokenSA);
  console.log('[OK] Données /api/auth/me récupérées :', JSON.stringify(meQuery));
  if (meQuery.role !== 'superadmin') {
    throw new Error('Rôle incorrect retourné pour Super Admin');
  }

  // Test de connexion Admin standard
  const adminRecord = db.prepare("SELECT * FROM users WHERE username = ? AND status = 'actif'").get('agent_admin_test');
  const adminLoginPass = await verifyPassword(adminPwd, adminRecord.password_hash);
  console.log(`[${adminLoginPass ? 'OK' : 'FAIL'}] Authentification Admin Standard -> ${adminLoginPass}`);

  // Création d'une session Admin
  const rawTokenAdmin = generateSessionToken();
  const hashTokenAdmin = await hashSessionToken(rawTokenAdmin);
  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at)
    VALUES (?, ?, ?, datetime('now', '+8 hours'))
  `).run('session_admin_456', adminId, hashTokenAdmin);
  console.log('[OK] Session Admin enregistrée en base.');

  const meAdminQuery = db.prepare(`
    SELECT u.id, u.username, u.email, u.role, u.full_name
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND u.status = 'actif'
  `).get(hashTokenAdmin);
  console.log('[OK] Données /api/auth/me Admin récupérées :', JSON.stringify(meAdminQuery));
  if (meAdminQuery.role !== 'admin') {
    throw new Error('Rôle incorrect retourné pour Admin');
  }

  // Test de tentative avec mot de passe erroné
  const badLoginPass = await verifyPassword('MauvaisMotDePasse!', adminRecord.password_hash);
  console.log(`[${!badLoginPass ? 'OK' : 'FAIL'}] Rejet d'un mauvais mot de passe -> succès du rejet`);

  // Nettoyage complet des données de test
  db.prepare("DELETE FROM sessions WHERE id IN ('session_sa_123', 'session_admin_456')").run();
  db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(saId, adminId);
  console.log('[OK] Nettoyage des comptes et sessions de test effectué.');

  // Contrôle final d'intégrité
  const integrity = db.prepare('PRAGMA integrity_check').all();
  console.log('Intégrité finale SQLite :', JSON.stringify(integrity));
  const fk = db.prepare('PRAGMA foreign_key_check').all();
  console.log('Clés étrangères finales :', JSON.stringify(fk));

  // Vérification de la préservation de la table réservations
  const resCount = db.prepare('SELECT count(*) as count FROM reservations').get();
  console.log('Réservations préservées (doit être 1) :', resCount.count);
  if (resCount.count !== 1) {
    throw new Error('Altération de la table reservations détectée !');
  }

} finally {
  db.close();
  console.log('Connexion sandboxDb fermée proprement.');
}

console.log('\n=== ÉTAPE 2 VALIDÉE AVEC SUCCÈS À 100% ===');
