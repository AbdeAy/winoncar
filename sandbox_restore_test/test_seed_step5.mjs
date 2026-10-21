// ==============================================================================
// Test automatisé de l'Étape 5 : Initialisation CLI du Super Admin & Flux E2E
// Confiné EXCLUSIVEMENT au bac à sable sandbox_restore_test
// ==============================================================================

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { seedAdmin } from '../WINON CAR/scripts/seed_admin.mjs';
import { onRequestPost as loginHandler } from '../WINON CAR/functions/api/auth/login.js';
import { onRequestPost as logoutHandler } from '../WINON CAR/functions/api/auth/logout.js';
import { onRequestGet as meHandler } from '../WINON CAR/functions/api/auth/me.js';
import { onRequest as adminMiddleware } from '../WINON CAR/functions/api/admin/_middleware.js';
import { onRequestGet as getReservations, onRequestPatch as patchReservations } from '../WINON CAR/functions/api/admin/reservations.js';
import { onRequestGet as getUsers, onRequestPost as postUsers } from '../WINON CAR/functions/api/admin/users.js';
import { onRequestGet as getAuditLogs } from '../WINON CAR/functions/api/admin/audit-logs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('==============================================================================');
console.log('=== TEST DE L\'ÉTAPE 5 : INITIALISATION DU SUPER ADMIN & FLUX COMPLET E2E ===');
console.log('==============================================================================\n');

// ------------------------------------------------------------------------------
// Contrôle de non-altération de la base originale .wrangler
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

// Base cible du bac à sable
const sandboxDbPath = path.resolve(__dirname, 'f6d9166d2ea703e42b5f1aac71642d9b3f8f6dd1979b5c77455049746f270f6c.sqlite');
console.log(`[CONTRÔLE] Base bac à sable cible : ${sandboxDbPath}\n`);

// ------------------------------------------------------------------------------
// Mock D1 pour node:sqlite
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

let allTestsPassed = true;
function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    allTestsPassed = false;
  }
}

// Nettoyage préalable des comptes de test
{
  const initDb = new DatabaseSync(sandboxDbPath);
  initDb.exec("DELETE FROM audit_logs WHERE username IN ('superadmin_root', 'agent_commercial_e2e');");
  initDb.exec("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE username IN ('superadmin_root', 'agent_commercial_e2e'));");
  initDb.exec("DELETE FROM users WHERE username IN ('superadmin_root', 'agent_commercial_e2e');");
  initDb.close();
}

try {
  // ----------------------------------------------------------------------------
  // SECTION 1 : Tests du Script CLI d'Initialisation (seed_admin.mjs)
  // ----------------------------------------------------------------------------
  console.log('--- 1. TESTS DU SCRIPT CLI SEED_ADMIN ---');

  // 1.1 Rejet si mot de passe non conforme
  let weakPwdCaught = false;
  try {
    await seedAdmin({
      username: 'superadmin_root',
      email: 'root@winoncar.com',
      password: 'short',
      fullname: 'Admin Test'
    });
  } catch (err) {
    weakPwdCaught = true;
    assert(err.message.includes('Politique de mot de passe'), 'Rejet mot de passe faible (<12 car)');
  }
  assert(weakPwdCaught, 'Exception levée pour mot de passe non conforme');

  // 1.2 Rejet si identifiant invalide
  let badUserCaught = false;
  try {
    await seedAdmin({
      username: 'a!',
      email: 'root@winoncar.com',
      password: 'SuperAdmin@Winon2026!Secure'
    });
  } catch (err) {
    badUserCaught = true;
    assert(err.message.includes("Nom d'utilisateur invalide"), 'Rejet identifiant avec caractères interdits');
  }
  assert(badUserCaught, 'Exception levée pour identifiant invalide');

  // 1.3 Mode génération SQL sécurisée (pour exécution Cloudflare D1)
  const sqlRes = await seedAdmin({
    username: 'superadmin_root',
    email: 'direction@winoncar.com',
    password: 'SuperAdmin@Winon2026!Secure',
    fullname: 'Directeur Général',
    generateSql: true
  });
  assert(sqlRes.success === true, 'Génération SQL réussie');
  assert(sqlRes.sql.includes('INSERT INTO users'), 'SQL contient INSERT INTO users');
  assert(sqlRes.sql.includes('superadmin'), 'SQL contient le rôle superadmin');
  assert(sqlRes.sql.includes('INITIAL_SUPERADMIN_SEEDED'), 'SQL contient l\'audit log INITIAL_SUPERADMIN_SEEDED');
  assert(!sqlRes.sql.includes('SuperAdmin@Winon2026!Secure'), 'Zéro mot de passe en clair dans le SQL (seulement le hash PBKDF2)');

  // 1.4 Exécution directe du seed sur la base du bac à sable
  const seedExecRes = await seedAdmin({
    username: 'superadmin_root',
    email: 'direction@winoncar.com',
    password: 'SuperAdmin@Winon2026!Secure',
    fullname: 'Directeur Général WINON CAR',
    dbPath: sandboxDbPath
  });
  assert(seedExecRes.success === true, 'Initialisation directe en base réussie');
  assert(seedExecRes.role === 'superadmin', 'Rôle attribué superadmin');
  assert(Number(seedExecRes.userId) > 0, `Utilisateur inséré avec ID: ${seedExecRes.userId}`);

  // 1.5 Tentative de seed en doublon (doit être refusée)
  let duplicateCaught = false;
  try {
    await seedAdmin({
      username: 'superadmin_root',
      email: 'autre@winoncar.com',
      password: 'SuperAdmin@Winon2026!Secure',
      dbPath: sandboxDbPath
    });
  } catch (err) {
    duplicateCaught = true;
    assert(err.message.includes('existe déjà'), 'Rejet de la tentative de seed en doublon');
  }
  assert(duplicateCaught, 'Exception levée pour doublon');
  console.log();

  // ----------------------------------------------------------------------------
  // SECTION 2 : Flux de Connexion & Session End-to-End (E2E)
  // ----------------------------------------------------------------------------
  console.log('--- 2. FLUX AUTHENTIFICATION DE BOUT EN BOUT (E2E) ---');

  const testDb = new DatabaseSync(sandboxDbPath);
  testDb.exec('PRAGMA foreign_keys = ON;');
  const d1 = createD1Mock(testDb);

  // 2.1 Tentative de connexion avec mauvais mot de passe -> 401
  {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernameOrEmail: 'superadmin_root',
        password: 'MauvaisMotDePasse123!'
      })
    });
    const res = await loginHandler({ request: req, env: { DB: d1 } });
    assert(res.status === 401, 'POST /api/auth/login avec mauvais mot de passe -> HTTP 401');
    const body = await res.json();
    assert(body.success === false, 'Échec d\'authentification confirmé');
  }

  // 2.2 Connexion réussie avec les identifiants créés par seed_admin -> 200 + Cookie
  let sessionCookie = null;
  let rawToken = null;
  {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernameOrEmail: 'superadmin_root',
        password: 'SuperAdmin@Winon2026!Secure'
      })
    });
    const res = await loginHandler({ request: req, env: { DB: d1 } });
    assert(res.status === 200, 'POST /api/auth/login avec bons identifiants -> HTTP 200 OK');
    const body = await res.json();
    assert(body.success === true, 'body.success === true');
    assert(body.user.role === 'superadmin', 'Profil retourné indique rôle superadmin');
    assert(body.user.username === 'superadmin_root', 'Profil indique superadmin_root');

    // Récupération du cookie de session
    const setCookie = res.headers.get('Set-Cookie');
    assert(setCookie?.includes('winon_session='), 'Cookie winon_session présent');
    assert(setCookie?.includes('HttpOnly'), 'Drapeau HttpOnly présent');
    assert(setCookie?.includes('SameSite=Strict'), 'Drapeau SameSite=Strict présent');

    sessionCookie = setCookie.split(';')[0];
    rawToken = sessionCookie.replace('__Host-winon_session=', '').replace('winon_session=', '').trim();
    assert(rawToken.length === 64, 'Token de session 256 bits valide (64 car hex)');
  }

  // 2.3 Vérification de session active via GET /api/auth/me
  {
    const req = new Request('http://localhost/api/auth/me', {
      headers: { 'Cookie': sessionCookie }
    });
    const res = await meHandler({ request: req, env: { DB: d1 } });
    assert(res.status === 200, 'GET /api/auth/me avec cookie valide -> HTTP 200');
    const body = await res.json();
    assert(body.authenticated === true, 'authenticated === true');
    assert(body.user.role === 'superadmin', 'Rôle vérifié : superadmin');
    assert(body.user.fullName === 'Directeur Général WINON CAR', 'Nom complet conforme');
  }
  console.log();

  // ----------------------------------------------------------------------------
  // SECTION 3 : Opérations Métier avec le Compte Initialisé
  // ----------------------------------------------------------------------------
  console.log('--- 3. OPÉRATIONS MÉTIER AVEC LE COMPTE INITIALISÉ ---');

  // Contexte authentifié via le middleware
  const adminCtx = {
    request: new Request('http://localhost/api/admin/reservations', {
      headers: { 'Cookie': sessionCookie }
    }),
    env: { DB: d1 },
    data: {},
    next: async () => new Response("OK")
  };
  await adminMiddleware(adminCtx);
  assert(adminCtx.data.user?.role === 'superadmin', 'Middleware a injecté avec succès le Super Admin initial');

  // 3.1 Consultation des réservations
  {
    const res = await getReservations(adminCtx);
    assert(res.status === 200, 'Super Admin consulte les réservations (HTTP 200)');
    const body = await res.json();
    assert(body.reservations?.length >= 1, 'Réservations retournées');
    assert(body.reservations[0].bookingRef === 'WN-5521', 'Dossier WN-5521 accessible');
  }

  // 3.2 Mise à jour de réservation
  {
    const patchReq = new Request('http://localhost/api/admin/reservations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 1,
        status: 'confirmee',
        notes: 'Dossier validé par la Direction.'
      })
    });
    const ctx = { request: patchReq, env: { DB: d1 }, data: { user: adminCtx.data.user } };
    const res = await patchReservations(ctx);
    assert(res.status === 200, 'Super Admin met à jour la réservation (HTTP 200)');
  }

  // 3.3 Création d'un second administrateur par le Super Admin
  {
    const createReq = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'agent_commercial_e2e',
        email: 'commercial@winoncar.com',
        password: 'CommercialPassword@2026!',
        role: 'admin',
        fullName: 'Agent Commercial Agence'
      })
    });
    const ctx = { request: createReq, env: { DB: d1 }, data: { user: adminCtx.data.user } };
    const res = await postUsers(ctx);
    assert(res.status === 201, 'Super Admin crée un compte agent commercial (HTTP 201 Created)');
    const body = await res.json();
    assert(body.user.role === 'admin', 'Rôle admin bien attribué au nouveau compte');
  }

  // 3.4 Consultation du journal d'audit complet
  {
    const auditReq = new Request('http://localhost/api/admin/audit-logs?limit=50');
    const ctx = { request: auditReq, env: { DB: d1 }, data: { user: adminCtx.data.user } };
    const res = await getAuditLogs(ctx);
    assert(res.status === 200, 'Super Admin consulte le journal d\'audit (HTTP 200)');
    const body = await res.json();
    const actions = body.logs.map(l => l.action);
    assert(actions.includes('INITIAL_SUPERADMIN_SEEDED'), 'Événement INITIAL_SUPERADMIN_SEEDED présent dans l\'audit');
    assert(actions.includes('LOGIN_SUCCESS'), 'Événement LOGIN_SUCCESS présent dans l\'audit');
    assert(actions.includes('RESERVATION_UPDATED'), 'Événement RESERVATION_UPDATED présent dans l\'audit');
    assert(actions.includes('USER_CREATED'), 'Événement USER_CREATED présent dans l\'audit');
  }
  console.log();

  // ----------------------------------------------------------------------------
  // SECTION 4 : Déconnexion Sécurisée & Contrôle d'Invalidation
  // ----------------------------------------------------------------------------
  console.log('--- 4. DÉCONNEXION SÉCURISÉE & CONTRÔLE D\'INVALIDATION ---');

  // 4.1 Déconnexion via POST /api/auth/logout
  {
    const req = new Request('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: { 'Cookie': sessionCookie }
    });
    const res = await logoutHandler({ request: req, env: { DB: d1 } });
    assert(res.status === 200, 'POST /api/auth/logout retourne HTTP 200');
    const setCookie = res.headers.get('Set-Cookie');
    assert(setCookie?.includes('Max-Age=0'), 'Set-Cookie purge la session côté navigateur (Max-Age=0)');
  }

  // 4.2 Tentative d'accès aux réservations avec l'ancien cookie après déconnexion -> 401
  {
    const req = new Request('http://localhost/api/admin/reservations', {
      headers: { 'Cookie': sessionCookie }
    });
    const ctx = { request: req, env: { DB: d1 }, data: {}, next: async () => new Response("FAIL") };
    const res = await adminMiddleware(ctx);
    assert(res.status === 401, 'Accès bloqué en HTTP 401 après déconnexion (session révoquée)');
  }
  console.log();

  // ----------------------------------------------------------------------------
  // SECTION 5 : Nettoyage & Contrôles d'Intégrité
  // ----------------------------------------------------------------------------
  console.log('--- 5. NETTOYAGE & CONTRÔLE D\'INTÉGRITÉ DU SANDBOX ---');

  // Réinitialisation de la réservation #1
  testDb.exec("UPDATE reservations SET status = 'en_attente', notes = NULL WHERE id = 1;");

  // Suppression des utilisateurs et logs de test
  testDb.exec("DELETE FROM audit_logs WHERE username IN ('superadmin_root', 'agent_commercial_e2e');");
  testDb.exec("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE username IN ('superadmin_root', 'agent_commercial_e2e'));");
  testDb.exec("DELETE FROM users WHERE username IN ('superadmin_root', 'agent_commercial_e2e');");

  // Contrôles PRAGMA
  const integrity = testDb.prepare('PRAGMA integrity_check;').get();
  assert(integrity.integrity_check === 'ok', `PRAGMA integrity_check = ${integrity.integrity_check}`);

  const fkCheck = testDb.prepare('PRAGMA foreign_key_check;').all();
  assert(fkCheck.length === 0, `PRAGMA foreign_key_check = ${fkCheck.length} violation(s)`);

  const resCount = testDb.prepare('SELECT count(*) as cnt FROM reservations;').get();
  assert(resCount.cnt === 1, `Nombre de réservations préservé : ${resCount.cnt} (WN-5521 intacte)`);

  testDb.close();
  console.log('Connexion SQLite sandbox fermée.\n');

} catch (err) {
  console.error('\nERREUR INATTENDUE DURANT LE TEST E2E :', err);
  allTestsPassed = false;
}

// ------------------------------------------------------------------------------
// Contrôle de non-altération de la base originale .wrangler
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
  console.error('\nÉCHEC GLOBAL : Un ou plusieurs tests de l\'Étape 5 ont échoué.');
  process.exit(1);
}

console.log('\n==============================================================================');
console.log('=== TOUS LES TESTS DE L\'ÉTAPE 5 ONT RÉUSSI AVEC SUCCÈS (100% SUCCÈS) ===');
console.log('==============================================================================\n');
