import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Phase 3 - Translations Dictionary Integrity (Parity, Non-Empty, Keys)', async (t) => {
  const translationsPath = path.join(rootDir, 'WINON CAR', 'assets', 'translations.js');
  assert.ok(fs.existsSync(translationsPath), 'assets/translations.js must exist');

  const fileContent = fs.readFileSync(translationsPath, 'utf8');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(fileContent + '\nthis.WINON_TRANSLATIONS = WINON_TRANSLATIONS;', sandbox);

  assert.ok(sandbox.WINON_TRANSLATIONS, 'WINON_TRANSLATIONS object must be declared');
  const { fr, en, ar } = sandbox.WINON_TRANSLATIONS;

  assert.ok(fr, 'French translations dictionary must exist');
  assert.ok(en, 'English translations dictionary must exist');
  assert.ok(ar, 'Arabic translations dictionary must exist');

  const frKeys = Object.keys(fr);
  assert.ok(frKeys.length >= 100, `Expected at least 100 translation keys, found ${frKeys.length}`);

  // Test 100% key parity across FR, EN, and AR
  for (const key of frKeys) {
    assert.ok(en[key] !== undefined, `Key '${key}' missing in English dictionary`);
    assert.ok(ar[key] !== undefined, `Key '${key}' missing in Arabic dictionary`);

    assert.ok(typeof fr[key] === 'string' && fr[key].trim().length > 0, `French key '${key}' cannot be empty`);
    assert.ok(typeof en[key] === 'string' && en[key].trim().length > 0, `English key '${key}' cannot be empty`);
    assert.ok(typeof ar[key] === 'string' && ar[key].trim().length > 0, `Arabic key '${key}' cannot be empty`);
  }

  // Check no stray keys in EN or AR not in FR
  const enKeys = Object.keys(en);
  const arKeys = Object.keys(ar);
  assert.equal(enKeys.length, frKeys.length, 'English dictionary key count must match French');
  assert.equal(arKeys.length, frKeys.length, 'Arabic dictionary key count must match French');
});

test('Phase 3 - HTML Template Parity & Multi-lingual Integration Check', async (t) => {
  const indexPath = path.join(rootDir, 'WINON CAR', 'index.html');

  assert.ok(fs.existsSync(indexPath), 'index.html must exist');

  const indexContent = fs.readFileSync(indexPath, 'utf8');

  // Check essential Phase 3 components in index.html
  assert.match(indexContent, /assets\/translations\.js/, 'Translations script must be included in HTML');
  assert.match(indexContent, /Tajawal/, 'Tajawal font must be included for Arabic typography');
  assert.match(indexContent, /html\[dir="rtl"\]/, 'RTL CSS rules must be declared');
  assert.match(indexContent, /setLanguage\(/, 'setLanguage() function must be declared');
  assert.match(indexContent, /uploadedDocs/, 'uploadedDocs state must be declared');
  assert.match(indexContent, /compressDocImage\(/, 'compressDocImage() must be declared');
  assert.match(indexContent, /handleDocUpload\(/, 'handleDocUpload() must be declared');
  assert.match(indexContent, /removeDoc\(/, 'removeDoc() must be declared');
  assert.match(indexContent, /docCinRectoInput/, 'CIN front input must exist');
  assert.match(indexContent, /docCinVersoInput/, 'CIN back input must exist');
  assert.match(indexContent, /docLicenseRectoInput/, 'License front input must exist');
  assert.match(indexContent, /docLicenseVersoInput/, 'License back input must exist');
});

test('Phase 3 - Admin Dashboard Documents & Language Support Check', async (t) => {
  const adminPath = path.join(rootDir, 'WINON CAR', 'admin', 'index.html');
  assert.ok(fs.existsSync(adminPath), 'admin/index.html must exist');

  const adminContent = fs.readFileSync(adminPath, 'utf8');

  // Check language badge rendering
  assert.match(adminContent, /clientLanguage/, 'Admin dashboard must check clientLanguage');
  assert.match(adminContent, /langBadge/, 'Admin dashboard must render langBadge');

  // Check document badge and slots
  assert.match(adminContent, /docCinRecto/, 'Admin dashboard must handle docCinRecto');
  assert.match(adminContent, /docLicenseRecto/, 'Admin dashboard must handle docLicenseRecto');
  assert.match(adminContent, /modal-doc-lightbox/, 'Admin dashboard must include document lightbox modal');
  assert.match(adminContent, /openDocLightbox/, 'openDocLightbox() function must be defined');
  assert.match(adminContent, /closeDocLightbox/, 'closeDocLightbox() function must be defined');
});

test('Phase 3 - D1 Database Operations with Documents & Multilingual Support', async (t) => {
  const db = new DatabaseSync(':memory:');

  // Run full migration sequence 0001 -> 0004
  const m1 = fs.readFileSync(path.join(rootDir, 'WINON CAR', 'migrations', '0001_initial_reservations.sql'), 'utf8');
  const m2 = fs.readFileSync(path.join(rootDir, 'WINON CAR', 'migrations', '0002_auth_and_management.sql'), 'utf8');
  const m3 = fs.readFileSync(path.join(rootDir, 'WINON CAR', 'migrations', '0003_locations_and_delivery.sql'), 'utf8');
  const m4 = fs.readFileSync(path.join(rootDir, 'WINON CAR', 'migrations', '0004_client_documents.sql'), 'utf8');

  db.exec(m1);
  db.exec(m2);
  db.exec(m3);
  db.exec(m4);

  // 1. Verify schema has 31 columns in reservations
  const colQuery = db.prepare("PRAGMA table_info(reservations)").all();
  const cols = colQuery.map(c => c.name);
  assert.equal(cols.length, 31, 'Reservations table must have exactly 31 columns');
  assert.ok(cols.includes('client_language'), 'Column client_language must exist');
  assert.ok(cols.includes('doc_cin_recto'), 'Column doc_cin_recto must exist');
  assert.ok(cols.includes('doc_cin_verso'), 'Column doc_cin_verso must exist');
  assert.ok(cols.includes('doc_license_recto'), 'Column doc_license_recto must exist');
  assert.ok(cols.includes('doc_license_verso'), 'Column doc_license_verso must exist');

  // 2. Simulate API Document Validation Logic
  const validateDoc = (doc) => {
    if (!doc || typeof doc !== 'string') return null;
    const trimmed = doc.trim();
    if (!trimmed.startsWith('data:image/')) return null;
    if (trimmed.length > 350000) return null;
    return trimmed;
  };

  // Mock compressed base64 images (~60KB each)
  const mockWebP = 'data:image/webp;base64,' + 'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAD8D+JaQAA3AA/ua1AAA='.repeat(1000);
  assert.ok(mockWebP.length > 50000 && mockWebP.length < 100000);

  // 3. Insert reservation with ARABIC language + ALL 4 DOCUMENTS
  const insertStmt = db.prepare(`
    INSERT INTO reservations (
      booking_ref, car_id, car_name, pickup_location, return_location,
      pickup_date, pickup_time, return_date, return_time, days,
      flight_number, client_name, client_phone, client_email, notes,
      opt_wifi, total_mad, total_eur, status,
      pickup_city, return_city, delivery_fee_status, delivery_fee_mad, is_read,
      client_language, doc_cin_recto, doc_cin_verso, doc_license_recto, doc_license_verso
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run(
    'WN-7701', 'tucson', 'Hyundai Tucson', 'Aéroport Agadir Al-Massira (AGA)', 'Aéroport Agadir Al-Massira (AGA)',
    '2026-11-20', '14:00', '2026-11-25', '14:00', 5,
    'AT452', 'هشام بنجلون', '+212612345678', 'hicham@example.com', 'طلب مقعد طفل إضافي',
    1, 3250, 301, 'en_attente',
    'Agadir', 'Agadir', 'pending_confirmation', null, 0,
    'ar',
    validateDoc(mockWebP),
    validateDoc(mockWebP),
    validateDoc(mockWebP),
    validateDoc(mockWebP)
  );

  // 4. Insert reservation with ENGLISH language and NO documents (optionality check)
  insertStmt.run(
    'WN-7702', 'clio5', 'Renault Clio 5', 'Centre-ville Agadir', 'Centre-ville Agadir',
    '2026-11-22', '10:00', '2026-11-26', '10:00', 4,
    null, 'David Miller', '+447911123456', 'david@example.co.uk', 'Arriving in the morning',
    0, 1280, 119, 'en_attente',
    'Agadir', 'Agadir', 'pending_confirmation', null, 0,
    'en',
    validateDoc(null),
    validateDoc(null),
    validateDoc(null),
    validateDoc(null)
  );

  // 5. Query and verify both records
  const queryStmt = db.prepare(`
    SELECT 
      booking_ref AS bookingRef, client_name AS clientName, client_language AS clientLanguage,
      doc_cin_recto AS docCinRecto, doc_license_recto AS docLicenseRecto
    FROM reservations 
    ORDER BY id ASC
  `);

  const rows = queryStmt.all();
  assert.equal(rows.length, 2, 'Should have 2 reservations');

  // Check row 1 (Arabic + 4 docs)
  assert.equal(rows[0].bookingRef, 'WN-7701');
  assert.equal(rows[0].clientName, 'هشام بنجلون');
  assert.equal(rows[0].clientLanguage, 'ar');
  assert.ok(rows[0].docCinRecto.startsWith('data:image/webp;base64,'));
  assert.ok(rows[0].docLicenseRecto.startsWith('data:image/webp;base64,'));

  // Check row 2 (English + 0 docs)
  assert.equal(rows[1].bookingRef, 'WN-7702');
  assert.equal(rows[1].clientName, 'David Miller');
  assert.equal(rows[1].clientLanguage, 'en');
  assert.equal(rows[1].docCinRecto, null, 'docCinRecto must be null when not uploaded');
  assert.equal(rows[1].docLicenseRecto, null, 'docLicenseRecto must be null when not uploaded');

  // 6. Test size limiter sanitizer (>350KB)
  const oversizedDoc = 'data:image/jpeg;base64,' + 'A'.repeat(400000);
  assert.equal(validateDoc(oversizedDoc), null, 'Oversized document (>350KB) must be rejected');

  // 7. Test invalid format sanitizer
  const invalidDoc = 'http://example.com/malicious.exe';
  assert.equal(validateDoc(invalidDoc), null, 'Non data:image/ string must be rejected');

  db.close();
});
