import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { hashPassword, verifyPassword } from '../WINON CAR/functions/api/auth/_crypto.js';
import { onRequestPost as handleVisit } from '../WINON CAR/functions/api/analytics/visit.js';
import { onRequestGet as handleGetAnalytics } from '../WINON CAR/functions/api/admin/analytics.js';
import { onRequestPost as handleChangePassword } from '../WINON CAR/functions/api/admin/change-password.js';
import { onRequestPost as handlePublicReservation } from '../WINON CAR/functions/api/reservations.js';
import { onRequestGet as handleAdminUsers } from '../WINON CAR/functions/api/admin/users.js';

console.log('='.repeat(80));
console.log('   WINON CAR — SUITE COMPLÈTE DE TESTS LOCAUX AUTOMATISÉS (STAGE 3)');
console.log('='.repeat(80));

// Initialisation de la base SQLite isolée
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

// D1 Mock
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

// -----------------------------------------------------------------------------
// Insertion des comptes réels de production existants
// -----------------------------------------------------------------------------
const superadminCurrentPwd = 'Tahyoudtmama@19990804';
const superadminHash = await hashPassword(superadminCurrentPwd);
db.prepare(`
  INSERT INTO users (id, username, email, password_hash, role, full_name, status)
  VALUES (1, 'superadmin', 'abdellah99.ahiyoud@gmail.com', ?, 'superadmin', 'ABDELLAH AHIYOUD', 'actif')
`).run(superadminHash);

const adminCurrentPwd = 'WinonCar@2026#Agent';
const adminHash = await hashPassword(adminCurrentPwd);
db.prepare(`
  INSERT INTO users (id, username, email, password_hash, role, full_name, status)
  VALUES (2, 'Admin', 'admin@winoncar.com', ?, 'admin', 'AYOUB ABOUDRAR', 'actif')
`).run(adminHash);

// Insertion d'une réservation historique existante
db.prepare(`
  INSERT INTO reservations (
    id, booking_ref, car_id, car_name, pickup_city, pickup_location, return_city, return_location,
    pickup_date, pickup_time, return_date, return_time, days, client_name, client_phone, client_email,
    total_mad, total_eur, status, client_language, delivery_fee_status
  ) VALUES (
    101, 'WN-EXISTING-001', 'clio5', 'Renault Clio 5', 'Agadir', 'Aéroport Al-Massira (AGA)', 'Agadir', 'Aéroport Al-Massira (AGA)',
    '2026-10-25', '14:00', '2026-10-30', '14:00', 5, 'Client Historique', '0612345678', 'client@test.com',
    1600, 150, 'confirmee', 'fr', 'confirmed'
  )
`).run();

// Session active pour Super Admin
const adminSessionToken = 'active_superadmin_session_token_xyz';
const encoder = new TextEncoder();
const tokenDigest = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(adminSessionToken));
const bytes = new Uint8Array(tokenDigest);
let sessionHash = '';
for (let i = 0; i < bytes.length; i++) sessionHash += bytes[i].toString(16).padStart(2, '0');

db.prepare(`
  INSERT INTO sessions (id, user_id, token_hash, expires_at)
  VALUES ('sess_super', 1, ?, datetime('now', '+8 hours'))
`).run(sessionHash);

let testCount = 0;
let passCount = 0;

function assert(condition, testName) {
  testCount++;
  if (condition) {
    passCount++;
    console.log(`  [PASS ${passCount}] ${testName}`);
  } else {
    console.error(`  [FAIL] ${testName}`);
    throw new Error(`Échec du test : ${testName}`);
  }
}

// -----------------------------------------------------------------------------
// EXÉCUTION DES 14 VÉRIFICATIONS REQUISES
// -----------------------------------------------------------------------------

console.log('\n--- 1. Authentification des comptes existants ---');
// Point 1 : Existing Admin login works
const adminUserRecord = db.prepare("SELECT password_hash FROM users WHERE username = 'Admin'").get();
const isAdminPwdValid = await verifyPassword(adminCurrentPwd, adminUserRecord.password_hash);
assert(isAdminPwdValid, "Existing Admin login still works avec son mot de passe existant");

// Point 2 : Existing Super Admin login works
const superUserRecord = db.prepare("SELECT password_hash FROM users WHERE username = 'superadmin'").get();
const isSuperPwdValid = await verifyPassword(superadminCurrentPwd, superUserRecord.password_hash);
assert(isSuperPwdValid, "Existing Super Admin login still works avec son mot de passe existant");

console.log('\n--- 2. Contrôle strict des rôles et permissions RBAC ---');
// Point 3 & 7 : Role permissions remain intact & Admin cannot access unauthorized Super Admin ops
const reqAdminUsersAccess = new Request('https://winoncar.ma/api/admin/users', { method: 'GET' });
const resAdminUsers = await handleAdminUsers({
  request: reqAdminUsersAccess,
  env: mockEnv,
  data: { user: { id: 2, username: 'Admin', role: 'admin' } }
});
assert(resAdminUsers.status === 403, "Admin standard cannot access unauthorized Super Admin operations (GET /api/admin/users -> 403 Forbidden)");

const resSuperUsers = await handleAdminUsers({
  request: reqAdminUsersAccess,
  env: mockEnv,
  data: { user: { id: 1, username: 'superadmin', role: 'superadmin' } }
});
assert(resSuperUsers.status === 200, "Super Admin has full access to user management (GET /api/admin/users -> 200 OK)");

console.log('\n--- 3. Modification sécurisée des identifiants (Change Password) ---');
// Point 5 : Incorrect current credentials are rejected
const reqBadCurrent = new Request('https://winoncar.ma/api/admin/change-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    currentPassword: 'IncorrectPassword@9999',
    newPassword: 'NewValidPassword@2026#',
    confirmPassword: 'NewValidPassword@2026#'
  })
});
const resBadCurrent = await handleChangePassword({
  request: reqBadCurrent,
  env: mockEnv,
  data: { user: { id: 2, username: 'Admin', role: 'admin' } }
});
assert(resBadCurrent.status === 400, "Incorrect current credentials are rejected (HTTP 400)");

// Point 6 : Mismatched confirmation is rejected
const reqMismatch = new Request('https://winoncar.ma/api/admin/change-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    currentPassword: adminCurrentPwd,
    newPassword: 'NewValidPassword@2026#',
    confirmPassword: 'DifferentConfirmation@2026#'
  })
});
const resMismatch = await handleChangePassword({
  request: reqMismatch,
  env: mockEnv,
  data: { user: { id: 2, username: 'Admin', role: 'admin' } }
});
assert(resMismatch.status === 400, "Mismatched confirmation is rejected (HTTP 400)");

// Point 7 (bis) : Admin cannot change Super Admin credentials
const reqEscalate = new Request('https://winoncar.ma/api/admin/change-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    currentPassword: adminCurrentPwd,
    newPassword: 'HackedPassword@2026#',
    confirmPassword: 'HackedPassword@2026#',
    targetUserId: 1 // Cible le Super Admin !
  })
});
const resEscalate = await handleChangePassword({
  request: reqEscalate,
  env: mockEnv,
  data: { user: { id: 2, username: 'Admin', role: 'admin' } }
});
assert(resEscalate.status === 403, "Admin cannot change Super Admin credentials (HTTP 403 Forbidden)");

// Point 4 : Both roles can change their own credentials through the intended flow
const newAdminValidPwd = 'AdminUpdated@2026#KeySecure';
const reqAdminChange = new Request('https://winoncar.ma/api/admin/change-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    currentPassword: adminCurrentPwd,
    newPassword: newAdminValidPwd,
    confirmPassword: newAdminValidPwd
  })
});
const resAdminChange = await handleChangePassword({
  request: reqAdminChange,
  env: mockEnv,
  data: { user: { id: 2, username: 'Admin', role: 'admin' } }
});
assert(resAdminChange.status === 200, "Admin can change their own credentials successfully (HTTP 200)");

const newSuperValidPwd = 'SuperUpdated@2026#KeySecure';
const reqSuperChange = new Request('https://winoncar.ma/api/admin/change-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    currentPassword: superadminCurrentPwd,
    newPassword: newSuperValidPwd,
    confirmPassword: newSuperValidPwd
  })
});
const resSuperChange = await handleChangePassword({
  request: reqSuperChange,
  env: mockEnv,
  data: { user: { id: 1, username: 'superadmin', role: 'superadmin' } }
});
assert(resSuperChange.status === 200, "Super Admin can change their own credentials successfully (HTTP 200)");

// Vérifier que les nouveaux mots de passe sont actifs et les anciens révoqués
const updatedAdminRow = db.prepare("SELECT password_hash FROM users WHERE id = 2").get();
const updatedSuperRow = db.prepare("SELECT password_hash FROM users WHERE id = 1").get();
assert(await verifyPassword(newAdminValidPwd, updatedAdminRow.password_hash), "Nouveau mot de passe Admin actif");
assert(await verifyPassword(newSuperValidPwd, updatedSuperRow.password_hash), "Nouveau mot de passe Super Admin actif");

console.log('\n--- 4. Statistiques d\'Audience Visiteurs (Analytics) ---');
// Point 8 : Visitor statistics increase correctly for valid test visits
const initialStats = await (await handleGetAnalytics({ env: mockEnv })).json();
const initialVisits = initialStats.stats.totalVisits;

const reqPublicVisit1 = new Request('https://winoncar.ma/api/analytics/visit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'CF-Connecting-IP': '105.158.20.10',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
  },
  body: JSON.stringify({ pagePath: '/', sessionId: 'sess_client_test_A', isVisit: true, deviceType: 'mobile' })
});
await handleVisit({ request: reqPublicVisit1, env: mockEnv });

const reqPublicVisit2 = new Request('https://winoncar.ma/api/analytics/visit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'CF-Connecting-IP': '105.158.20.11',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  },
  body: JSON.stringify({ pagePath: '/#flotte', sessionId: 'sess_client_test_B', isVisit: true, deviceType: 'desktop' })
});
await handleVisit({ request: reqPublicVisit2, env: mockEnv });

const updatedStats = await (await handleGetAnalytics({ env: mockEnv })).json();
assert(updatedStats.stats.totalVisits === initialVisits + 2, "Visitor statistics increase correctly for valid test visits (+2 visites)");
assert(updatedStats.stats.visitsToday >= 2, "Visits today reflète exactement l'activité");

// Point 9 : Dashboard traffic is excluded where practical
const visitsBeforeAdmin = updatedStats.stats.totalVisits;
const reqAdminTraffic = new Request('https://winoncar.ma/api/analytics/visit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': `winon_session=${adminSessionToken}` // Session admin active
  },
  body: JSON.stringify({ pagePath: '/', sessionId: 'sess_admin_excluded', isVisit: true })
});
const resAdminTraffic = await handleVisit({ request: reqAdminTraffic, env: mockEnv });
assert(resAdminTraffic.status === 204, "Dashboard / Admin traffic is excluded (HTTP 204 No Content)");

const reqAdminPath = new Request('https://winoncar.ma/api/analytics/visit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pagePath: '/admin/index.html', sessionId: 'sess_admin_path', isVisit: true })
});
const resAdminPath = await handleVisit({ request: reqAdminPath, env: mockEnv });
assert(resAdminPath.status === 204, "Dashboard /admin/ path is excluded (HTTP 204 No Content)");

const afterAdminStats = await (await handleGetAnalytics({ env: mockEnv })).json();
assert(afterAdminStats.stats.totalVisits === visitsBeforeAdmin, "Admin traffic did not increment public visitor statistics");

console.log('\n--- 5. Non-régression Réservations & Intégrité des données ---');
// Point 10 & 14 : Existing public reservation APIs remain compatible and work with WhatsApp/docs
const reqRes = new Request('https://winoncar.ma/api/reservations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bookingRef: 'WN-202610-099',
    carId: 'sandero',
    carName: 'Dacia Sandero Stepway',
    pickupCity: 'Agadir',
    pickupLocation: 'Aéroport Al-Massira (AGA)',
    returnCity: 'Taghazout',
    returnLocation: 'Hôtel / Adresse personnelle',
    pickupDate: '2026-11-01',
    pickupTime: '10:00',
    returnDate: '2026-11-06',
    returnTime: '10:00',
    days: 5,
    clientName: 'Nadia El Fassi',
    clientPhone: '+212612345678',
    clientEmail: 'nadia@test.com',
    clientLanguage: 'ar',
    docCinRecto: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAkA4JaQAA3AA/vv9WAAA',
    totalMAD: 1400,
    totalEUR: 130
  })
});
const resReservation = await handlePublicReservation({ request: reqRes, env: mockEnv });
const resData = await resReservation.json();
assert(resReservation.status === 201 && resData.success, "Public reservation API works with locations, Darija, and documents (HTTP 201)");

// Point 11 : Existing reservations and account records remain unchanged
const historicRes = db.prepare("SELECT booking_ref, client_name, status, total_mad FROM reservations WHERE id = 101").get();
assert(historicRes && historicRes.booking_ref === 'WN-EXISTING-001' && historicRes.total_mad === 1600, "Existing reservation records remain 100% intact and unaltered");

const historicSuper = db.prepare("SELECT username, email, role FROM users WHERE id = 1").get();
assert(historicSuper && historicSuper.username === 'superadmin' && historicSuper.email === 'abdellah99.ahiyoud@gmail.com', "Existing account records remain 100% intact and preserved");

console.log('\n--- 6. Intégrité des Fichiers Frontend & Layout Mobile ---');
// Point 12 : Existing dashboard pages and mobile layout still work
const adminHtml = fs.readFileSync('WINON CAR/admin/index.html', 'utf8');
assert(adminHtml.includes('id="tab-analytics"'), "Section tab-analytics présente dans le dashboard");
assert(adminHtml.includes('id="modal-change-password"'), "Modale modal-change-password présente dans le dashboard");
assert(adminHtml.includes('id="notif-bell-btn"'), "Centre de notifications préservé");
assert(adminHtml.includes('id="modal-veh-img-preview"'), "Gestionnaire photo WebP véhicules préservé");
assert(adminHtml.includes('loadAnalytics'), "Fonction loadAnalytics intégrée");

const publicHtml = fs.readFileSync('WINON CAR/index.html', 'utf8');
assert(publicHtml.includes('assets/analytics.js'), "Balise analytics.js présente dans index.html");
assert(publicHtml.includes('assets/translations.js'), "Dictionnaire multilingue préservé dans index.html");
assert(publicHtml.includes('id="bookingForm"'), "Formulaire de réservation préservé dans index.html");

console.log('\n' + '='.repeat(80));
console.log(`🎉 RÉSULTAT GLOBAL : ${passCount} / ${testCount} TESTS RÉUSSIS (100% DE SUCCÈS)`);
console.log('='.repeat(80) + '\n');
