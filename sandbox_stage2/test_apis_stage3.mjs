import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { hashPassword, verifyPassword } from '../WINON CAR/functions/api/auth/_crypto.js';
import { onRequestPost as handleVisit } from '../WINON CAR/functions/api/analytics/visit.js';
import { onRequestGet as handleGetAnalytics } from '../WINON CAR/functions/api/admin/analytics.js';
import { onRequestPost as handleChangePassword } from '../WINON CAR/functions/api/admin/change-password.js';

console.log('='.repeat(80));
console.log('   TEST ISOLÉ DES NOUVELLES APIS (ANALYTICS & CHANGEMENT MOT DE PASSE)');
console.log('='.repeat(80));

// 1. Initialisation de la base SQLite en mémoire avec toutes les migrations (0001 à 0005)
const db = new DatabaseSync(':memory:');
const mig1 = fs.readFileSync('WINON CAR/migrations/0001_initial_reservations.sql', 'utf8');
const mig2 = fs.readFileSync('WINON CAR/migrations/0002_auth_and_management.sql', 'utf8');
const mig3 = fs.readFileSync('WINON CAR/migrations/0003_locations_and_delivery.sql', 'utf8');
const mig4 = fs.readFileSync('WINON CAR/migrations/0004_client_documents.sql', 'utf8');
const mig5 = fs.readFileSync('WINON CAR/migrations/0005_visitor_analytics.sql', 'utf8');

db.exec(mig1);
db.exec(mig2);
db.exec(mig3);
db.exec(mig4);
db.exec(mig5);

// Création d'un mock d1 pour Cloudflare Pages Functions
function createD1Mock(sqliteDb) {
  return {
    prepare(sql) {
      return {
        _sql: sql,
        _params: [],
        bind(...params) {
          this._params = params;
          return this;
        },
        async first() {
          const stmt = sqliteDb.prepare(this._sql);
          return stmt.get(...this._params) || null;
        },
        async all() {
          const stmt = sqliteDb.prepare(this._sql);
          const results = stmt.all(...this._params);
          return { results: results || [] };
        },
        async run() {
          const stmt = sqliteDb.prepare(this._sql);
          const info = stmt.run(...this._params);
          return {
            meta: {
              last_row_id: Number(info.lastInsertRowid || 0),
              changes: Number(info.changes || 0)
            }
          };
        }
      };
    }
  };
}

const mockEnv = { DB: createD1Mock(db) };

// Insertion d'un Super Admin et d'un Admin standard pour les tests
const superadminPassword = 'WinonSuper@2026#Init';
const superadminHash = await hashPassword(superadminPassword);
db.prepare(`
  INSERT INTO users (id, username, email, password_hash, role, full_name, status)
  VALUES (1, 'superadmin', 'super@winoncar.com', ?, 'superadmin', 'Super Administrateur', 'actif')
`).run(superadminHash);

const adminPassword = 'WinonAdmin@2026#Init';
const adminHash = await hashPassword(adminPassword);
db.prepare(`
  INSERT INTO users (id, username, email, password_hash, role, full_name, status)
  VALUES (2, 'admin_agent', 'agent@winoncar.com', ?, 'admin', 'Agent Standard', 'actif')
`).run(adminHash);

// Insertion d'une session active pour le Super Admin
const activeToken = 'test_active_session_token_123';
const encoder = new TextEncoder();
const tokenDigest = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(activeToken));
const bytes = new Uint8Array(tokenDigest);
let tokenHash = '';
for (let i = 0; i < bytes.length; i++) tokenHash += bytes[i].toString(16).padStart(2, '0');

db.prepare(`
  INSERT INTO sessions (id, user_id, token_hash, expires_at)
  VALUES ('sess_1', 1, ?, datetime('now', '+8 hours'))
`).run(tokenHash);

// -----------------------------------------------------------------------------
// [A] TESTS DE L'API ANALYTICS PUBLIQUE (POST /api/analytics/visit)
// -----------------------------------------------------------------------------
console.log('\n--- [A] Tests de l\'API Visiteur /api/analytics/visit ---');

// Test A1 : Visite publique normale (nouveau visiteur)
const req1 = new Request('https://winoncar.ma/api/analytics/visit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    'CF-Connecting-IP': '196.200.10.1'
  },
  body: JSON.stringify({
    pagePath: '/',
    sessionId: 'session_pub_001',
    referrer: 'https://google.com',
    deviceType: 'mobile',
    isVisit: true
  })
});

const res1 = await handleVisit({ request: req1, env: mockEnv });
console.log(`  ✓ Test A1 : Visite publique enregistrée (HTTP ${res1.status})`);
if (res1.status !== 200) throw new Error('Échec Test A1');

// Test A2 : Page view subséquente dans la même session (isVisit: false)
const req2 = new Request('https://winoncar.ma/api/analytics/visit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    'CF-Connecting-IP': '196.200.10.1'
  },
  body: JSON.stringify({
    pagePath: '/#flotte',
    sessionId: 'session_pub_001',
    referrer: 'https://winoncar.ma/',
    deviceType: 'mobile',
    isVisit: false
  })
});
const res2 = await handleVisit({ request: req2, env: mockEnv });
console.log(`  ✓ Test A2 : Page view subséquente enregistrée (HTTP ${res2.status})`);

// Test A3 : Exclusion stricte du trafic Admin avec cookie de session
const req3 = new Request('https://winoncar.ma/api/analytics/visit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'CF-Connecting-IP': '196.200.10.2',
    'Cookie': `winon_session=${activeToken}`
  },
  body: JSON.stringify({
    pagePath: '/',
    sessionId: 'session_admin_001',
    isVisit: true
  })
});
const res3 = await handleVisit({ request: req3, env: mockEnv });
console.log(`  ✓ Test A3 : Trafic Admin exclu correctement (HTTP ${res3.status})`);
if (res3.status !== 204) throw new Error('Échec Test A3 : Le trafic admin n\'a pas été exclu');

// Test A4 : Exclusion des URL d'administration
const req4 = new Request('https://winoncar.ma/api/analytics/visit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pagePath: '/admin/index.html', isVisit: true })
});
const res4 = await handleVisit({ request: req4, env: mockEnv });
console.log(`  ✓ Test A4 : Chemin /admin/ exclu (HTTP ${res4.status})`);
if (res4.status !== 204) throw new Error('Échec Test A4 : Chemin /admin non exclu');

// Test A5 : Exclusion des robots
const req5 = new Request('https://winoncar.ma/api/analytics/visit', {
  method: 'POST',
  headers: { 'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' },
  body: JSON.stringify({ pagePath: '/', isVisit: true })
});
const res5 = await handleVisit({ request: req5, env: mockEnv });
console.log(`  ✓ Test A5 : Robot / Crawler exclu (HTTP ${res5.status})`);
if (res5.status !== 204) throw new Error('Échec Test A5 : Robot non exclu');

// -----------------------------------------------------------------------------
// [B] TESTS DE L'API ADMIN ANALYTICS (GET /api/admin/analytics)
// -----------------------------------------------------------------------------
console.log('\n--- [B] Tests de l\'API Dashboard /api/admin/analytics ---');
const resAnalytics = await handleGetAnalytics({ env: mockEnv });
const dataAnalytics = await resAnalytics.json();

console.log('  Données Analytics reçues :', {
  totalVisits: dataAnalytics.stats.totalVisits,
  totalPageViews: dataAnalytics.stats.totalPageViews,
  visitsToday: dataAnalytics.stats.visitsToday,
  uniqueVisitorsToday: dataAnalytics.stats.uniqueVisitorsToday,
  dailyChartLength: dataAnalytics.dailyChart.length
});

if (dataAnalytics.stats.totalVisits !== 1 || dataAnalytics.stats.totalPageViews !== 2) {
  throw new Error(`Incohérence métriques analytics : visits=${dataAnalytics.stats.totalVisits}, pv=${dataAnalytics.stats.totalPageViews}`);
}
console.log('  ✓ PASS: Métriques conformes et distinction claire entre Visites (1) et Pages Vues (2).');

// -----------------------------------------------------------------------------
// [C] TESTS DU CHANGEMENT DE MOT DE PASSE (POST /api/admin/change-password)
// -----------------------------------------------------------------------------
console.log('\n--- [C] Tests de l\'API Changement de Mot de Passe ---');

// Test C1 : Rejet si mot de passe actuel erroné
const reqC1 = new Request('https://winoncar.ma/api/admin/change-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    currentPassword: 'BadPassword@1234',
    newPassword: 'WinonSuper@2026#New1',
    confirmPassword: 'WinonSuper@2026#New1'
  })
});
const resC1 = await handleChangePassword({
  request: reqC1,
  env: mockEnv,
  data: { user: { id: 1, username: 'superadmin', role: 'superadmin' } }
});
console.log(`  ✓ Test C1 : Rejet mot de passe actuel erroné (HTTP ${resC1.status})`);
if (resC1.status !== 400) throw new Error('Échec Test C1');

// Test C2 : Rejet si confirmation divergente
const reqC2 = new Request('https://winoncar.ma/api/admin/change-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    currentPassword: superadminPassword,
    newPassword: 'WinonSuper@2026#New1',
    confirmPassword: 'WinonSuper@2026#Mismatch'
  })
});
const resC2 = await handleChangePassword({
  request: reqC2,
  env: mockEnv,
  data: { user: { id: 1, username: 'superadmin', role: 'superadmin' } }
});
console.log(`  ✓ Test C2 : Rejet confirmation divergente (HTTP ${resC2.status})`);
if (resC2.status !== 400) throw new Error('Échec Test C2');

// Test C3 : Rejet si politique de sécurité non respectée (<12 car ou pas de symbole)
const reqC3 = new Request('https://winoncar.ma/api/admin/change-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    currentPassword: superadminPassword,
    newPassword: 'weak',
    confirmPassword: 'weak'
  })
});
const resC3 = await handleChangePassword({
  request: reqC3,
  env: mockEnv,
  data: { user: { id: 1, username: 'superadmin', role: 'superadmin' } }
});
console.log(`  ✓ Test C3 : Rejet mot de passe faible (HTTP ${resC3.status})`);
if (resC3.status !== 400) throw new Error('Échec Test C3');

// Test C4 : Rejet RBAC - Un Admin standard tente de modifier le compte du Super Admin (targetUserId: 1)
const reqC4 = new Request('https://winoncar.ma/api/admin/change-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    currentPassword: adminPassword,
    newPassword: 'WinonAgent@2026#New1',
    confirmPassword: 'WinonAgent@2026#New1',
    targetUserId: 1 // Tente de modifier le superadmin !
  })
});
const resC4 = await handleChangePassword({
  request: reqC4,
  env: mockEnv,
  data: { user: { id: 2, username: 'admin_agent', role: 'admin' } }
});
console.log(`  ✓ Test C4 : Rejet escalade de privilèges Admin -> Super Admin (HTTP ${resC4.status})`);
if (resC4.status !== 403) throw new Error('Échec Test C4 : Un admin a pu cibler le superadmin !');

// Test C5 : Succès - Super Admin change son propre mot de passe
const newSuperPwd = 'WinonSuper@2026#SuccessValid';
const reqC5 = new Request('https://winoncar.ma/api/admin/change-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    currentPassword: superadminPassword,
    newPassword: newSuperPwd,
    confirmPassword: newSuperPwd
  })
});
const resC5 = await handleChangePassword({
  request: reqC5,
  env: mockEnv,
  data: { user: { id: 1, username: 'superadmin', role: 'superadmin' } }
});
const dataC5 = await resC5.json();
console.log(`  ✓ Test C5 : Succès changement mot de passe Super Admin (HTTP ${resC5.status}) :`, dataC5.message);
if (resC5.status !== 200 || !dataC5.success) throw new Error('Échec Test C5');

// Test C6 : Vérification cryptographique en base du nouveau mot de passe
const updatedUser = db.prepare("SELECT password_hash FROM users WHERE id = 1").get();
const isNewPwdValid = await verifyPassword(newSuperPwd, updatedUser.password_hash);
const isOldPwdInvalid = await verifyPassword(superadminPassword, updatedUser.password_hash);
if (!isNewPwdValid || isOldPwdInvalid) {
  throw new Error('Échec Test C6 : Le nouveau mot de passe ne vérifie pas ou l\'ancien est toujours valide !');
}
console.log('  ✓ Test C6 : Nouveau mot de passe vérifié en base, ancien révoqué avec succès.');

// Test C7 : Succès - Admin standard change son propre mot de passe
const newAdminPwd = 'WinonAgent@2026#ValidAdmin1';
const reqC7 = new Request('https://winoncar.ma/api/admin/change-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    currentPassword: adminPassword,
    newPassword: newAdminPwd,
    confirmPassword: newAdminPwd
  })
});
const resC7 = await handleChangePassword({
  request: reqC7,
  env: mockEnv,
  data: { user: { id: 2, username: 'admin_agent', role: 'admin' } }
});
const dataC7 = await resC7.json();
console.log(`  ✓ Test C7 : Succès changement mot de passe Admin standard (HTTP ${resC7.status}) :`, dataC7.message);
if (resC7.status !== 200 || !dataC7.success) throw new Error('Échec Test C7');

// Test C8 : Vérification de l'inscription dans le journal d'audit
const auditEntries = db.prepare("SELECT action, entity_type FROM audit_logs WHERE action IN ('PASSWORD_CHANGED', 'PASSWORD_CHANGE_FAILED')").all();
console.log(`  ✓ Test C8 : ${auditEntries.length} événements d'audit enregistrés (succès et échecs).`);
if (auditEntries.length < 2) throw new Error('Échec Test C8 : Entrées d\'audit manquantes');

console.log('\n🎉 TOUS LES TESTS D\'APIS STAGE 3 SONT VALIDÉS À 100% !\n');

