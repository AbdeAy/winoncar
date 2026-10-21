// ==============================================================================
// Test automatisé de l'Étape 4 : Middleware RBAC & Endpoints d'Administration Serveur
// Confiné EXCLUSIVEMENT au bac à sable sandbox_restore_test
// ==============================================================================

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  hashPassword,
  generateSessionToken,
  hashSessionToken,
  createSessionCookie
} from '../WINON CAR/functions/api/auth/_crypto.js';

import { onRequest as adminMiddleware } from '../WINON CAR/functions/api/admin/_middleware.js';
import { onRequestGet as getReservations, onRequestPatch as patchReservations } from '../WINON CAR/functions/api/admin/reservations.js';
import { onRequestGet as getUsers, onRequestPost as postUsers, onRequestPatch as patchUsers } from '../WINON CAR/functions/api/admin/users.js';
import { onRequestGet as getAuditLogs } from '../WINON CAR/functions/api/admin/audit-logs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('==============================================================================');
console.log('=== TEST DE L\'ÉTAPE 4 : MIDDLEWARE RBAC & ENDPOINTS SERVEUR WINON CAR ===');
console.log('==============================================================================\n');

// ------------------------------------------------------------------------------
// Empreinte SHA256 préalable de la base originale .wrangler (Garantie de non-altération)
// ------------------------------------------------------------------------------
const originalWorkingDbPath = path.resolve(
  __dirname,
  '../WINON CAR/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/f6d9166d2ea703e42b5f1aac71642d9b3f8f6dd1979b5c77455049746f270f6c.sqlite'
);

function getSha256(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

const originalHashBefore = getSha256(originalWorkingDbPath);
console.log(`[CONTRÔLE] Empreinte SHA256 base originale avant test : ${originalHashBefore}`);

// ------------------------------------------------------------------------------
// Connexion à la base du bac à sable
// ------------------------------------------------------------------------------
const sandboxDbPath = path.resolve(__dirname, 'f6d9166d2ea703e42b5f1aac71642d9b3f8f6dd1979b5c77455049746f270f6c.sqlite');
console.log(`[CONTRÔLE] Base bac à sable cible : ${sandboxDbPath}\n`);

const db = new DatabaseSync(sandboxDbPath);
db.exec('PRAGMA foreign_keys = ON;');

// ------------------------------------------------------------------------------
// Mock D1 pour émuler l'environnement Cloudflare D1 avec node:sqlite
// ------------------------------------------------------------------------------
function createD1Mock(sqliteDb) {
  return {
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async first() {
              const stmt = sqliteDb.prepare(sql);
              return stmt.get(...params) || null;
            },
            async all() {
              const stmt = sqliteDb.prepare(sql);
              const rows = stmt.all(...params);
              return { results: rows || [] };
            },
            async run() {
              const stmt = sqliteDb.prepare(sql);
              const info = stmt.run(...params);
              return {
                success: true,
                meta: {
                  last_row_id: Number(info.lastInsertRowid),
                  changes: info.changes
                }
              };
            }
          };
        },
        async first() {
          return this.bind().first();
        },
        async all() {
          return this.bind().all();
        },
        async run() {
          return this.bind().run();
        }
      };
    }
  };
}

const d1 = createD1Mock(db);

let allTestsPassed = true;
function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    allTestsPassed = false;
  }
}

try {
  // ----------------------------------------------------------------------------
  // SECTION 1 : Initialisation des comptes et sessions de test dans le sandbox
  // ----------------------------------------------------------------------------
  console.log('--- 1. INITIALISATION DES COMPTES DE TEST DANS LE SANDBOX ---');

  // Nettoyage préalable des comptes de test
  db.prepare("DELETE FROM audit_logs WHERE username IN ('sa_test_user', 'admin_test_user', 'inactive_test_user', 'agent_sarah_test')").run();
  db.prepare("DELETE FROM users WHERE username IN ('sa_test_user', 'admin_test_user', 'inactive_test_user', 'agent_sarah_test')").run();

  const saHash = await hashPassword('SuperAdmin@Winon2026#Secure');
  const adminHash = await hashPassword('AdminUser@Winon2026#Secure');
  const inactHash = await hashPassword('InactiveUser@Winon2026#Secure');

  const insertSA = db.prepare(`
    INSERT INTO users (username, email, password_hash, role, full_name, status)
    VALUES (?, ?, ?, 'superadmin', 'Super Admin Principal', 'actif')
  `).run('sa_test_user', 'sa@winoncar.local', saHash);
  const saId = Number(insertSA.lastInsertRowid);

  const insertAdmin = db.prepare(`
    INSERT INTO users (username, email, password_hash, role, full_name, status)
    VALUES (?, ?, ?, 'admin', 'Agent Admin Commercial', 'actif')
  `).run('admin_test_user', 'admin@winoncar.local', adminHash);
  const adminId = Number(insertAdmin.lastInsertRowid);

  const insertInact = db.prepare(`
    INSERT INTO users (username, email, password_hash, role, full_name, status)
    VALUES (?, ?, ?, 'admin', 'Agent Inactif', 'desactive')
  `).run('inactive_test_user', 'inactive@winoncar.local', inactHash);
  const inactId = Number(insertInact.lastInsertRowid);

  // Sessions
  const tokenSA = generateSessionToken();
  const tokenHashSA = await hashSessionToken(tokenSA);
  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at)
    VALUES ('sess_sa_step4', ?, ?, datetime('now', '+8 hours'))
  `).run(saId, tokenHashSA);

  const tokenAdmin = generateSessionToken();
  const tokenHashAdmin = await hashSessionToken(tokenAdmin);
  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at)
    VALUES ('sess_admin_step4', ?, ?, datetime('now', '+8 hours'))
  `).run(adminId, tokenHashAdmin);

  const tokenExpired = generateSessionToken();
  const tokenHashExpired = await hashSessionToken(tokenExpired);
  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at)
    VALUES ('sess_exp_step4', ?, ?, datetime('now', '-2 hours'))
  `).run(saId, tokenHashExpired);

  const tokenInact = generateSessionToken();
  const tokenHashInact = await hashSessionToken(tokenInact);
  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at)
    VALUES ('sess_inact_step4', ?, ?, datetime('now', '+8 hours'))
  `).run(inactId, tokenHashInact);

  console.log('Comptes et sessions de test initialisés avec succès.\n');

  // ----------------------------------------------------------------------------
  // SECTION 2 : Tests du Middleware d'Authentification & RBAC (_middleware.js)
  // ----------------------------------------------------------------------------
  console.log('--- 2. TESTS DU MIDDLEWARE (_middleware.js) ---');

  // 2.1 Requête sans cookie -> 401
  {
    const req = new Request('http://localhost/api/admin/reservations');
    const ctx = { request: req, env: { DB: d1 }, data: {}, next: async () => new Response("OK") };
    const res = await adminMiddleware(ctx);
    assert(res.status === 401, 'Requête sans cookie rejetée avec HTTP 401');
    const body = await res.json();
    assert(body.success === false, 'Corps de réponse indique success=false');
    assert(res.headers.get('Set-Cookie')?.includes('Max-Age=0'), 'En-tête Set-Cookie purge le cookie client');
  }

  // 2.2 Token forgé / inexistant -> 401
  {
    const req = new Request('http://localhost/api/admin/reservations', {
      headers: { 'Cookie': '__Host-winon_session=forged_token_00000000000000000000000000000000' }
    });
    const ctx = { request: req, env: { DB: d1 }, data: {}, next: async () => new Response("OK") };
    const res = await adminMiddleware(ctx);
    assert(res.status === 401, 'Jeton de session forgé rejeté avec HTTP 401');
  }

  // 2.3 Token expiré -> 401 + purge de la session en base
  {
    const req = new Request('http://localhost/api/admin/reservations', {
      headers: { 'Cookie': `__Host-winon_session=${tokenExpired}` }
    });
    const ctx = { request: req, env: { DB: d1 }, data: {}, next: async () => new Response("OK") };
    const res = await adminMiddleware(ctx);
    assert(res.status === 401, 'Jeton expiré rejeté avec HTTP 401');
    const purged = db.prepare("SELECT * FROM sessions WHERE id = 'sess_exp_step4'").get();
    assert(!purged, 'Session expirée automatiquement purgée de la table sessions');
  }

  // 2.4 Compte inactif -> 403
  {
    const req = new Request('http://localhost/api/admin/reservations', {
      headers: { 'Cookie': `__Host-winon_session=${tokenInact}` }
    });
    const ctx = { request: req, env: { DB: d1 }, data: {}, next: async () => new Response("OK") };
    const res = await adminMiddleware(ctx);
    assert(res.status === 403, 'Session d\'un compte désactivé bloquée avec HTTP 403');
  }

  // 2.5 Session valide Admin -> Injection réussie dans context.data.user
  let adminCtx = {
    request: new Request('http://localhost/api/admin/reservations', {
      headers: { 'Cookie': `__Host-winon_session=${tokenAdmin}` }
    }),
    env: { DB: d1 },
    data: {},
    next: async () => new Response("NEXT_CALLED")
  };
  const mwAdminRes = await adminMiddleware(adminCtx);
  assert(await mwAdminRes.text() === "NEXT_CALLED", 'Middleware autorise la session valide Admin et passe à next()');
  assert(adminCtx.data.user.role === 'admin', 'context.data.user.role injecté correctement (admin)');
  assert(adminCtx.data.user.username === 'admin_test_user', 'context.data.user.username injecté (admin_test_user)');

  // 2.6 Session valide Super Admin -> Injection réussie
  let saCtx = {
    request: new Request('http://localhost/api/admin/reservations', {
      headers: { 'Cookie': `__Host-winon_session=${tokenSA}` }
    }),
    env: { DB: d1 },
    data: {},
    next: async () => new Response("NEXT_CALLED")
  };
  const mwSARes = await adminMiddleware(saCtx);
  assert(await mwSARes.text() === "NEXT_CALLED", 'Middleware autorise la session valide Super Admin');
  assert(saCtx.data.user.role === 'superadmin', 'context.data.user.role injecté correctement (superadmin)');
  console.log();

  // ----------------------------------------------------------------------------
  // SECTION 3 : Tests de l'Endpoint Réservations (/api/admin/reservations)
  // ----------------------------------------------------------------------------
  console.log('--- 3. TESTS DE L\'ENDPOINT RÉSERVATIONS (Admin & Super Admin) ---');

  // 3.1 Consultation par Admin
  {
    const req = new Request('http://localhost/api/admin/reservations');
    const ctx = { request: req, env: { DB: d1 }, data: { user: adminCtx.data.user } };
    const res = await getReservations(ctx);
    assert(res.status === 200, 'GET /api/admin/reservations par Admin retourne HTTP 200');
    const body = await res.json();
    assert(body.success === true, 'body.success === true');
    assert(Array.isArray(body.reservations) && body.reservations.length >= 1, `Réservations retournées (${body.reservations.length})`);
    assert(body.reservations[0].bookingRef === 'WN-5521', 'Dossier WN-5521 présent');
  }

  // 3.2 Filtre par statut invalide -> Ignoré ou géré proprement
  {
    const req = new Request('http://localhost/api/admin/reservations?status=invalid_status');
    const ctx = { request: req, env: { DB: d1 }, data: { user: adminCtx.data.user } };
    const res = await getReservations(ctx);
    assert(res.status === 200, 'Filtre de statut invalide géré sans erreur serveur (200)');
  }

  // 3.3 Mise à jour d'un statut et note interne par l'Admin avec journal d'audit
  {
    const req = new Request('http://localhost/api/admin/reservations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 1,
        status: 'confirmee',
        notes: 'Caution vérifiée par l\'agent Youssef lors de l\'appel téléphonique.'
      })
    });
    const ctx = { request: req, env: { DB: d1 }, data: { user: adminCtx.data.user } };
    const res = await patchReservations(ctx);
    assert(res.status === 200, 'PATCH /api/admin/reservations retourne HTTP 200');
    const body = await res.json();
    assert(body.success === true, 'body.success === true');

    // Vérification en base
    const updatedRes = db.prepare('SELECT status, notes FROM reservations WHERE id = 1').get();
    assert(updatedRes.status === 'confirmee', 'Statut de réservation mis à jour en base à "confirmee"');
    assert(updatedRes.notes.includes('Caution vérifiée'), 'Notes internes mises à jour');

    // Vérification de l'insertion dans audit_logs
    const auditEntry = db.prepare(`
      SELECT * FROM audit_logs 
      WHERE action = 'RESERVATION_UPDATED' AND entity_id = '1'
      ORDER BY id DESC LIMIT 1
    `).get();
    assert(!!auditEntry, 'Événement RESERVATION_UPDATED enregistré dans audit_logs');
    assert(auditEntry.username === 'admin_test_user', 'Audit log attribue l\'action à admin_test_user');
  }
  console.log();

  // ----------------------------------------------------------------------------
  // SECTION 4 : Étanchéité Stricte RBAC (Tentatives d'accès Admin bloquées en 403)
  // ----------------------------------------------------------------------------
  console.log('--- 4. ÉTANCHÉITÉ RBAC : TESTS DE BLOCAGE STRICT DE L\'ADMIN EN 403 ---');

  // 4.1 Admin tente de lister les comptes (/api/admin/users) -> 403 FORBIDDEN
  {
    const req = new Request('http://localhost/api/admin/users');
    const ctx = { request: req, env: { DB: d1 }, data: { user: adminCtx.data.user } };
    const res = await getUsers(ctx);
    assert(res.status === 403, 'Tentative GET /api/admin/users par Admin -> HTTP 403 Interdit');
    const body = await res.json();
    assert(body.error?.includes('Super Administrateur'), 'Message d\'erreur explicite sur la restriction Super Admin');
  }

  // 4.2 Admin tente de créer un utilisateur (/api/admin/users) -> 403 FORBIDDEN
  {
    const req = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'hacker_admin',
        email: 'hack@winoncar.local',
        password: 'Password@2026!Secure',
        role: 'superadmin'
      })
    });
    const ctx = { request: req, env: { DB: d1 }, data: { user: adminCtx.data.user } };
    const res = await postUsers(ctx);
    assert(res.status === 403, 'Tentative POST /api/admin/users par Admin -> HTTP 403 Interdit');
  }

  // 4.3 Admin tente de modifier un utilisateur (/api/admin/users) -> 403 FORBIDDEN
  {
    const req = new Request('http://localhost/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: saId, role: 'admin' })
    });
    const ctx = { request: req, env: { DB: d1 }, data: { user: adminCtx.data.user } };
    const res = await patchUsers(ctx);
    assert(res.status === 403, 'Tentative PATCH /api/admin/users par Admin -> HTTP 403 Interdit');
  }

  // 4.4 Admin tente d'accéder au journal d'audit (/api/admin/audit-logs) -> 403 FORBIDDEN
  {
    const req = new Request('http://localhost/api/admin/audit-logs');
    const ctx = { request: req, env: { DB: d1 }, data: { user: adminCtx.data.user } };
    const res = await getAuditLogs(ctx);
    assert(res.status === 403, 'Tentative GET /api/admin/audit-logs par Admin -> HTTP 403 Interdit');
    const body = await res.json();
    assert(body.error?.includes('Super Administrateur'), 'Message d\'erreur explicite sur la restriction Super Admin');
  }
  console.log();

  // ----------------------------------------------------------------------------
  // SECTION 5 : Opérations Super Admin (/api/admin/users & /api/admin/audit-logs)
  // ----------------------------------------------------------------------------
  console.log('--- 5. TESTS DES OPÉRATIONS SUPER ADMIN ---');

  // 5.1 Super Admin liste les utilisateurs -> 200 (Zéro fuite de hash)
  {
    const req = new Request('http://localhost/api/admin/users');
    const ctx = { request: req, env: { DB: d1 }, data: { user: saCtx.data.user } };
    const res = await getUsers(ctx);
    assert(res.status === 200, 'GET /api/admin/users par Super Admin retourne HTTP 200');
    const body = await res.json();
    assert(body.success === true, 'body.success === true');
    assert(body.users.length >= 3, `Nombre d'utilisateurs retournés : ${body.users.length}`);

    // Contrôle de sécurité fondamental : aucun hash de mot de passe n'est exposé
    const hasAnyHash = body.users.some(u => u.password_hash || u.password);
    assert(!hasAnyHash, 'SÉCURITÉ : Aucun champ password ou password_hash n\'est renvoyé par l\'API');
  }

  // 5.2 Super Admin tente de créer un utilisateur avec un mot de passe faible -> 400
  {
    const req = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'weak_user',
        email: 'weak@winoncar.local',
        password: 'weakpassword',
        role: 'admin',
        fullName: 'Test Weak'
      })
    });
    const ctx = { request: req, env: { DB: d1 }, data: { user: saCtx.data.user } };
    const res = await postUsers(ctx);
    assert(res.status === 400, 'Création avec mot de passe non conforme rejetée avec HTTP 400');
  }

  // 5.3 Super Admin tente de créer un utilisateur déjà existant -> 409 Conflit
  {
    const req = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'sa_test_user',
        email: 'duplicate@winoncar.local',
        password: 'ValidPassword@2026!',
        role: 'admin',
        fullName: 'Doublon'
      })
    });
    const ctx = { request: req, env: { DB: d1 }, data: { user: saCtx.data.user } };
    const res = await postUsers(ctx);
    assert(res.status === 409, 'Création d\'un nom d\'utilisateur en doublon rejetée avec HTTP 409');
  }

  // 5.4 Super Admin crée un nouvel administrateur valide -> 201 Created
  let newCreatedUserId = null;
  {
    const req = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'agent_sarah_test',
        email: 'sarah@winoncar.local',
        password: 'SarahPassword@2026#Winon',
        role: 'admin',
        fullName: 'Sarah Commerciale'
      })
    });
    const ctx = { request: req, env: { DB: d1 }, data: { user: saCtx.data.user } };
    const res = await postUsers(ctx);
    assert(res.status === 201, 'Création d\'un nouvel admin valide retourne HTTP 201 Created');
    const body = await res.json();
    assert(body.success === true, 'body.success === true');
    assert(body.user?.username === 'agent_sarah_test', 'Utilisateur créé retourné avec nom d\'utilisateur conforme');
    newCreatedUserId = body.user?.id;

    // Vérification du stockage sécurisé PBKDF2 en base
    const dbUser = db.prepare('SELECT password_hash, role, status FROM users WHERE username = ?').get('agent_sarah_test');
    assert(!!dbUser, 'Utilisateur présent dans la table users');
    assert(dbUser.password_hash.includes('$') && dbUser.password_hash.length >= 97, 'Mot de passe haché avec PBKDF2 (sel + clé)');

    // Vérification de la traçabilité dans audit_logs
    const auditCreated = db.prepare(`
      SELECT * FROM audit_logs WHERE action = 'USER_CREATED' AND entity_id = ?
    `).get(String(newCreatedUserId));
    assert(!!auditCreated, 'Événement USER_CREATED tracé dans audit_logs');
    assert(auditCreated.username === 'sa_test_user', 'Création attribuée au Super Admin connecté');
  }

  // 5.5 Super Admin : Protection anti-auto-blocage (interdiction de désactiver son propre compte) -> 400
  {
    const req = new Request('http://localhost/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: saId,
        status: 'inactif'
      })
    });
    const ctx = { request: req, env: { DB: d1 }, data: { user: saCtx.data.user } };
    const res = await patchUsers(ctx);
    assert(res.status === 400, 'Tentative de désactiver son propre compte Super Admin bloquée avec HTTP 400');
  }

  // 5.6 Super Admin : Désactivation du compte agent_sarah_test -> 200 + révocation de session
  {
    // Simulation d'une session active pour Sarah
    const tokenSarah = generateSessionToken();
    const hashSarah = await hashSessionToken(tokenSarah);
    db.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, expires_at)
      VALUES ('sess_sarah_temp', ?, ?, datetime('now', '+8 hours'))
    `).run(newCreatedUserId, hashSarah);

    const req = new Request('http://localhost/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newCreatedUserId,
        status: 'inactif'
      })
    });
    const ctx = { request: req, env: { DB: d1 }, data: { user: saCtx.data.user } };
    const res = await patchUsers(ctx);
    assert(res.status === 200, 'Désactivation du compte par le Super Admin retourne HTTP 200');

    // Vérification de la révocation immédiate de session
    const activeSarahSess = db.prepare("SELECT * FROM sessions WHERE id = 'sess_sarah_temp'").get();
    assert(!activeSarahSess, 'Sécurité : Toutes les sessions actives de l\'utilisateur désactivé ont été révoquées');
  }

  // 5.7 Super Admin : Consultation du journal d'audit -> 200
  {
    const req = new Request('http://localhost/api/admin/audit-logs?limit=50');
    const ctx = { request: req, env: { DB: d1 }, data: { user: saCtx.data.user } };
    const res = await getAuditLogs(ctx);
    assert(res.status === 200, 'GET /api/admin/audit-logs par Super Admin retourne HTTP 200');
    const body = await res.json();
    assert(body.success === true, 'body.success === true');
    assert(Array.isArray(body.logs) && body.logs.length >= 3, `Logs retournés (${body.logs.length})`);
    
    // Vérification des actions enregistrées
    const actions = body.logs.map(l => l.action);
    assert(actions.includes('USER_CREATED'), 'Action USER_CREATED listée dans le journal d\'audit');
    assert(actions.includes('USER_UPDATED'), 'Action USER_UPDATED listée dans le journal d\'audit');
    assert(actions.includes('RESERVATION_UPDATED'), 'Action RESERVATION_UPDATED listée dans le journal d\'audit');
  }
  console.log();

  // ----------------------------------------------------------------------------
  // SECTION 6 : Nettoyage & Contrôle d'Intégrité de la Base Sandbox
  // ----------------------------------------------------------------------------
  console.log('--- 6. NETTOYAGE & CONTRÔLE D\'INTÉGRITÉ DE LA BASE ---');

  // Rétablissement de la réservation #1 à l'état initial
  db.prepare("UPDATE reservations SET status = 'en_attente', notes = NULL WHERE id = 1").run();

  // Suppression des utilisateurs et sessions de test
  db.prepare("DELETE FROM audit_logs WHERE username IN ('sa_test_user', 'admin_test_user', 'inactive_test_user', 'agent_sarah_test')").run();
  db.prepare("DELETE FROM sessions WHERE id IN ('sess_sa_step4', 'sess_admin_step4', 'sess_exp_step4', 'sess_inact_step4', 'sess_sarah_temp')").run();
  db.prepare("DELETE FROM users WHERE username IN ('sa_test_user', 'admin_test_user', 'inactive_test_user', 'agent_sarah_test')").run();

  // Contrôles PRAGMA
  const integrity = db.prepare('PRAGMA integrity_check;').get();
  assert(integrity.integrity_check === 'ok', `PRAGMA integrity_check = ${integrity.integrity_check}`);

  const fkCheck = db.prepare('PRAGMA foreign_key_check;').all();
  assert(fkCheck.length === 0, `PRAGMA foreign_key_check = ${fkCheck.length} violation(s)`);

  const resCount = db.prepare('SELECT count(*) as cnt FROM reservations;').get();
  assert(resCount.cnt === 1, `Nombre de réservations préservé : ${resCount.cnt} (réservation WN-5521 intacte)`);

  console.log();

} finally {
  db.close();
  console.log('Connexion SQLite sandbox fermée avec succès.');
}

// ------------------------------------------------------------------------------
// Vérification finale de l'intégrité de la base originale .wrangler
// ------------------------------------------------------------------------------
const originalHashAfter = getSha256(originalWorkingDbPath);
console.log(`[CONTRÔLE] Empreinte SHA256 base originale après test  : ${originalHashAfter}`);

if (originalHashBefore !== originalHashAfter) {
  console.error('\nCRITIQUE : L\'empreinte de la base originale a changé ! Altération non autorisée !');
  process.exit(1);
} else {
  console.log('[CONTRÔLE] Base originale 100% INTACTE (SHA-256 bit-à-bit rigoureusement identique).');
}

if (!allTestsPassed) {
  console.error('\nÉCHEC GLOBAL : Un ou plusieurs tests RBAC de l\'Étape 4 ont échoué.');
  process.exit(1);
}

console.log('\n==============================================================================');
console.log('=== TOUS LES TESTS DE L\'ÉTAPE 4 ONT RÉUSSI AVEC SUCCÈS (100% SUCCÈS) ===');
console.log('==============================================================================\n');
