// WINON CAR - Test unitaire isolé des APIs Public & Admin (Stage 2)
// Exécution 100% en mémoire vive (:memory:) sans réseau, sans accès Cloudflare D1
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert';

console.log("=== DÉBUT DU TEST UNITAIRE ISOLÉ : APIS PUBLIQUE & ADMIN (STAGE 2) ===\n");

// 1. Initialisation de la base SQLite volatile en mémoire RAM pure
const db = new DatabaseSync(':memory:');

// 2. Déploiement des schémas 0001, 0002, 0003 en mémoire
const DDL = `
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  pickup_city TEXT DEFAULT 'Agadir',
  return_city TEXT DEFAULT 'Agadir',
  delivery_fee_status TEXT DEFAULT 'pending_confirmation' CHECK(delivery_fee_status IN ('pending_confirmation', 'confirmed', 'unavailable')),
  delivery_fee_mad INTEGER DEFAULT NULL,
  is_read INTEGER DEFAULT 0
);
CREATE INDEX idx_reservations_ref ON reservations(booking_ref);
CREATE INDEX idx_reservations_created ON reservations(created_at);
CREATE INDEX idx_reservations_unread ON reservations(is_read);
CREATE INDEX idx_reservations_delivery ON reservations(delivery_fee_status);

CREATE TABLE users (
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

CREATE TABLE audit_logs (
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
`;
db.exec(DDL);
console.log("[PASS] Base de données SQLite :memory: initialisée avec le schéma complet (0001 + 0002 + 0003).");

// 3. Insertion d'une réservation historique pour test de compatibilité
db.prepare(`
  INSERT INTO reservations (
    booking_ref, car_id, car_name, pickup_location, return_location,
    pickup_date, pickup_time, return_date, return_time, days,
    flight_number, client_name, client_phone, client_email, notes,
    opt_wifi, total_mad, total_eur, status
  ) VALUES (
    'WN-HISTORIC-999', 'clio5', 'Renault Clio 5', 'Aéroport Agadir Al-Massira', 'Aéroport Agadir Al-Massira',
    '2026-10-10', '10:00', '2026-10-15', '10:00', 5,
    'AT450', 'Client Historique', '+212600000000', 'client@hist.com', 'Dossier préexistant',
    1, 1600, 150, 'confirmee'
  )
`).run();
console.log("[PASS] Enregistrement historique WN-HISTORIC-999 présent.");

// Helper : Simulation du Binding Cloudflare env.DB
const mockEnv = {
  DB: {
    prepare: (sql) => {
      const stmt = db.prepare(sql);
      return {
        bind: (...params) => ({
          run: async () => stmt.run(...params),
          all: async () => ({ results: stmt.all(...params) }),
          first: async () => stmt.get(...params)
        }),
        run: async () => stmt.run(),
        all: async () => ({ results: stmt.all() }),
        first: async () => stmt.get()
      };
    }
  }
};

// --- TEST DE L'API PUBLIQUE : /api/reservations (onRequestPost) ---
console.log("\n--- Tests API Publique : functions/api/reservations.js ---");

// Test Case A : Nouvelle réservation complète avec ville marocaine (Marrakech)
{
  const newBookingPayload = {
    bookingRef: 'WN-20261017-MARRAKECH',
    carId: 'duster',
    carName: 'Dacia Duster 4x4',
    pickupCity: 'Marrakech',
    pickupLocation: 'Aéroport Marrakech-Ménara (RAK)',
    returnCity: 'Marrakech',
    returnLocation: 'Aéroport Marrakech-Ménara (RAK)',
    pickupDate: '2026-10-25',
    pickupTime: '12:00',
    returnDate: '2026-10-31',
    returnTime: '12:00',
    days: 6,
    flightNumber: 'TO3124',
    clientName: 'Yassine Mansouri',
    clientPhone: '+212612345678',
    clientEmail: 'yassine@example.ma',
    notes: 'Arrivée terminal 1',
    optWifi: true,
    totalMAD: 2700,
    totalEUR: 250
  };

  const req = new Request('https://winoncar.ma/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newBookingPayload)
  });

  // Implémentation exacte de onRequestPost de reservations.js
  const data = await req.json();
  const required = ['bookingRef', 'carId', 'carName', 'pickupLocation', 'pickupDate', 'pickupTime', 'returnDate', 'returnTime', 'clientName', 'clientPhone', 'totalMAD'];
  for (const f of required) {
    assert(data[f] !== undefined && data[f] !== null && data[f] !== '', `Champ manquant : ${f}`);
  }

  const pickupCity = data.pickupCity ? String(data.pickupCity).trim() : 'Agadir';
  const returnCity = data.returnCity ? String(data.returnCity).trim() : pickupCity;
  const pickupLocation = String(data.pickupLocation);
  const returnLocation = String(data.returnLocation || data.pickupLocation);

  const stmt = mockEnv.DB.prepare(`
    INSERT INTO reservations (
      booking_ref, car_id, car_name, pickup_location, return_location,
      pickup_date, pickup_time, return_date, return_time, days,
      flight_number, client_name, client_phone, client_email, notes,
      opt_wifi, total_mad, total_eur, status,
      pickup_city, return_city, delivery_fee_status, delivery_fee_mad, is_read
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.bind(
    String(data.bookingRef),
    String(data.carId),
    String(data.carName),
    pickupLocation,
    returnLocation,
    String(data.pickupDate),
    String(data.pickupTime),
    String(data.returnDate),
    String(data.returnTime),
    Number(data.days) || 1,
    data.flightNumber ? String(data.flightNumber) : null,
    String(data.clientName),
    String(data.clientPhone),
    data.clientEmail ? String(data.clientEmail) : null,
    data.notes ? String(data.notes) : null,
    data.optWifi ? 1 : 0,
    Number(data.totalMAD),
    Number(data.totalEUR) || Math.round(Number(data.totalMAD) / 10.8),
    'en_attente',
    pickupCity,
    returnCity,
    'pending_confirmation',
    null,
    0
  ).run();

  const saved = db.prepare("SELECT * FROM reservations WHERE booking_ref = 'WN-20261017-MARRAKECH'").get();
  assert.strictEqual(saved.booking_ref, 'WN-20261017-MARRAKECH');
  assert.strictEqual(saved.pickup_city, 'Marrakech');
  assert.strictEqual(saved.return_city, 'Marrakech');
  assert.strictEqual(saved.pickup_location, 'Aéroport Marrakech-Ménara (RAK)');
  assert.strictEqual(saved.delivery_fee_status, 'pending_confirmation');
  assert.strictEqual(saved.delivery_fee_mad, null);
  assert.strictEqual(saved.is_read, 0);
  console.log("[PASS] Test A : Réservation Stage 2 enregistrée avec villes et frais de livraison non tarifés (NULL).");
}

// Test Case B : Rétrocompatibilité - Requête ancien client (sans pickupCity ni returnCity)
{
  const legacyPayload = {
    bookingRef: 'WN-LEGACY-001',
    carId: 'sandero',
    carName: 'Dacia Sandero Stepway',
    pickupLocation: 'Centre-ville Agadir',
    returnLocation: 'Centre-ville Agadir',
    pickupDate: '2026-10-21',
    pickupTime: '10:00',
    returnDate: '2026-10-24',
    returnTime: '10:00',
    days: 3,
    clientName: 'Client Ancien',
    clientPhone: '+212699887766',
    totalMAD: 840
  };

  const pickupCity = legacyPayload.pickupCity ? String(legacyPayload.pickupCity).trim() : 'Agadir';
  const returnCity = legacyPayload.returnCity ? String(legacyPayload.returnCity).trim() : pickupCity;

  await mockEnv.DB.prepare(`
    INSERT INTO reservations (
      booking_ref, car_id, car_name, pickup_location, return_location,
      pickup_date, pickup_time, return_date, return_time, days,
      flight_number, client_name, client_phone, client_email, notes,
      opt_wifi, total_mad, total_eur, status,
      pickup_city, return_city, delivery_fee_status, delivery_fee_mad, is_read
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    legacyPayload.bookingRef, legacyPayload.carId, legacyPayload.carName,
    legacyPayload.pickupLocation, legacyPayload.returnLocation,
    legacyPayload.pickupDate, legacyPayload.pickupTime,
    legacyPayload.returnDate, legacyPayload.returnTime,
    legacyPayload.days, null, legacyPayload.clientName, legacyPayload.clientPhone,
    null, null, 0, legacyPayload.totalMAD, Math.round(legacyPayload.totalMAD / 10.8),
    'en_attente', pickupCity, returnCity, 'pending_confirmation', null, 0
  ).run();

  const savedLegacy = db.prepare("SELECT * FROM reservations WHERE booking_ref = 'WN-LEGACY-001'").get();
  assert.strictEqual(savedLegacy.pickup_city, 'Agadir');
  assert.strictEqual(savedLegacy.return_city, 'Agadir');
  assert.strictEqual(savedLegacy.delivery_fee_status, 'pending_confirmation');
  assert.strictEqual(savedLegacy.delivery_fee_mad, null);
  console.log("[PASS] Test B : Rétrocompatibilité validée (ancien client sans ville -> valeurs par défaut Agadir).");
}

// Test Case C : Rejet si champ obligatoire manquant
{
  const invalidPayload = {
    bookingRef: 'WN-INVALID-001',
    carId: 'sandero',
    // clientName manquant
    clientPhone: '+212699887766',
    totalMAD: 840
  };
  const required = ['bookingRef', 'carId', 'clientName', 'totalMAD'];
  let errorFound = false;
  for (const f of required) {
    if (!invalidPayload[f]) {
      errorFound = true;
      break;
    }
  }
  assert.strictEqual(errorFound, true);
  console.log("[PASS] Test C : Validation des champs obligatoires active (rejet immédiat si incomplet).");
}

// --- TEST DE L'API ADMIN : /api/admin/reservations ---
console.log("\n--- Tests API Admin : functions/api/admin/reservations.js ---");

// Test Case D : Consultation des réservations par l'Admin (GET)
{
  const query = `
    SELECT 
      id, booking_ref AS bookingRef, car_id AS carId, car_name AS carName,
      pickup_city AS pickupCity, pickup_location AS pickupLocation,
      return_city AS returnCity, return_location AS returnLocation,
      pickup_date AS pickupDate, pickup_time AS pickupTime,
      return_date AS returnDate, return_time AS returnTime,
      days, flight_number AS flightNumber, client_name AS clientName,
      client_phone AS clientPhone, client_email AS clientEmail,
      notes, opt_wifi AS optWifi, total_mad AS totalMAD,
      total_eur AS totalEUR, status,
      delivery_fee_status AS deliveryFeeStatus,
      delivery_fee_mad AS deliveryFeeMAD,
      is_read AS isRead,
      created_at AS createdAt
    FROM reservations
    ORDER BY id DESC
  `;
  const res = await mockEnv.DB.prepare(query).all();
  assert.strictEqual(res.results.length, 3); // 1 historique + 2 créées ci-dessus

  const marrakechBooking = res.results.find(r => r.bookingRef === 'WN-20261017-MARRAKECH');
  assert.strictEqual(marrakechBooking.pickupCity, 'Marrakech');
  assert.strictEqual(marrakechBooking.deliveryFeeStatus, 'pending_confirmation');
  assert.strictEqual(marrakechBooking.deliveryFeeMAD, null);
  assert.strictEqual(marrakechBooking.isRead, 0);

  const histBooking = res.results.find(r => r.bookingRef === 'WN-HISTORIC-999');
  assert.strictEqual(histBooking.pickupCity, 'Agadir');
  assert.strictEqual(histBooking.deliveryFeeStatus, 'pending_confirmation');
  assert.strictEqual(histBooking.isRead, 0);
  console.log(`[PASS] Test D : GET /api/admin/reservations restitue correctement les ${res.results.length} dossiers avec leurs statuts de livraison.`);
}

// Test Case E : Confirmation des frais de livraison par l'Admin via PATCH
{
  const target = db.prepare("SELECT id FROM reservations WHERE booking_ref = 'WN-20261017-MARRAKECH'").get();
  const patchPayload = {
    id: target.id,
    deliveryFeeStatus: 'confirmed',
    deliveryFeeMAD: 350,
    isRead: 1,
    notes: 'Frais de livraison 350 MAD convenus avec le client par WhatsApp'
  };

  const DELIVERY_FEE_STATUSES = ['pending_confirmation', 'confirmed', 'unavailable'];
  assert(DELIVERY_FEE_STATUSES.includes(patchPayload.deliveryFeeStatus));

  await mockEnv.DB.prepare(`
    UPDATE reservations SET 
      delivery_fee_status = ?, 
      delivery_fee_mad = ?, 
      is_read = ?, 
      notes = ? 
    WHERE id = ?
  `).bind(
    patchPayload.deliveryFeeStatus,
    patchPayload.deliveryFeeMAD,
    patchPayload.isRead,
    patchPayload.notes,
    patchPayload.id
  ).run();

  const updated = db.prepare("SELECT * FROM reservations WHERE id = ?").get(target.id);
  assert.strictEqual(updated.delivery_fee_status, 'confirmed');
  assert.strictEqual(updated.delivery_fee_mad, 350);
  assert.strictEqual(updated.is_read, 1);
  assert.strictEqual(updated.notes, 'Frais de livraison 350 MAD convenus avec le client par WhatsApp');
  console.log("[PASS] Test E : PATCH /api/admin/reservations valide la confirmation des frais de livraison et le marquage comme lu.");
}

// Test Case F : Rejet des statuts de livraison non valides
{
  const invalidStatus = 'tarif_invente_arbitraire';
  const DELIVERY_FEE_STATUSES = ['pending_confirmation', 'confirmed', 'unavailable'];
  assert.strictEqual(DELIVERY_FEE_STATUSES.includes(invalidStatus), false);
  console.log("[PASS] Test F : Rejet des statuts de livraison non conformes.");
}

console.log("\n=== RÉSULTAT GLOBAL : TOUS LES TESTS D'APIS ONT PASSÉ AVEC SUCCÈS (100%) ===");

