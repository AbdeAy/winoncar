// Test unitaire de validation pour /api/admin/vehicles et /api/admin/vehicles/update
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { onRequestGet as getVehicles, onRequestPatch as patchVehicles } from '../WINON CAR/functions/api/admin/vehicles.js';
import { onRequestPost as postVehicleUpdate } from '../WINON CAR/functions/api/admin/vehicles/update.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sandboxDbPath = path.resolve(__dirname, 'f6d9166d2ea703e42b5f1aac71642d9b3f8f6dd1979b5c77455049746f270f6c.sqlite');

const db = new DatabaseSync(sandboxDbPath);
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
INSERT OR IGNORE INTO vehicles (id, name, category, category_label, price_mad, badge, image_url, gearbox, fuel, seats, ac, bags, doors, description, availability, is_active, display_order)
VALUES
('sandero', 'Dacia Sandero Stepway', 'eco', 'Citadine Économique', 280, 'Le Plus Demandé', 'assets/cars/dacia-sandero-stepway.jpg', 'Manuelle', 'Essence', '5 Places', 'Climatisation A/C', '2 Valises', '5 Portes', 'Idéale pour circuler dans Agadir et visiter Taghazout en réalisant des économies sur le carburant.', 'disponible', 1, 1),
('clio5', 'Renault Clio 5', 'eco', 'Citadine Moderne', 320, 'Très Sobre', 'assets/cars/renault-clio-5.jpg', 'Manuelle', 'Diesel', '5 Places', 'Climatisation A/C', '2 Valises', '5 Portes', 'La citadine préférée des voyageurs : très sobre en carburant avec écran tactile et Bluetooth.', 'disponible', 1, 2),
('peugeot208', 'Peugeot 208 GT', 'eco', 'Citadine Premium', 360, 'Design Sport', 'assets/cars/peugeot-208.jpg', 'Automatique', 'Diesel', '5 Places', 'Climatisation A/C', '2 Valises', '5 Portes', 'Look moderne et cockpit digital. Idéale pour sillonner la corniche et la marina d''Agadir avec style.', 'disponible', 1, 3),
('accent', 'Hyundai Accent', 'berline', 'Berline Confort', 400, 'Grand Coffre', 'assets/cars/hyundai-accent.jpg', 'Automatique', 'Diesel', '5 Places', 'Climatisation A/C', '3 Valises', '4 Portes', 'Spacieuse, silencieuse et dotée d''un grand coffre pour accueillir tous vos bagages à l''aéroport.', 'disponible', 1, 4),
('golf8', 'Volkswagen Golf 8 DSG', 'berline', 'Berline Compacte Luxe', 550, 'Performance Allemande', 'assets/cars/vw-golf-8.jpg', 'Automatique DSG', 'Diesel', '5 Places', 'Clim Bizone', '3 Valises', '5 Portes', 'La référence allemande pour un plaisir de conduite absolu sur les autoroutes et routes du Maroc.', 'disponible', 1, 5),
('duster', 'Dacia Duster 4x4', 'suv', 'SUV Tout-Chemin', 420, 'Idéal Taghazout & Dunes', 'assets/cars/dacia-duster.jpg', 'Manuelle 6 vit.', 'Diesel', '5 Places', 'Climatisation A/C', '3 Valises', '5 Portes', 'Le SUV le plus demandé à Agadir : robuste, surélevé et parfaitement adapté aux plages et sentiers.', 'disponible', 1, 6),
('tucson', 'Hyundai Tucson', 'suv', 'SUV Familial Élégant', 650, 'Toit Panoramique', 'assets/cars/hyundai-tucson.jpg', 'Automatique', 'Diesel', '5 Places', 'Clim Tri-Zone', '4 Valises', '5 Portes', 'Confort de première classe pour les familles ou groupes d''amis désirant voyager dans un grand luxe.', 'disponible', 1, 7),
('sportage', 'Kia Sportage GT-Line', 'suv', 'SUV Sportif', 580, 'Technologie & Caméra', 'assets/cars/kia-sportage.jpg', 'Automatique', 'Diesel', '5 Places', 'Climatisation A/C', '3 Valises', '5 Portes', 'Lignes dynamiques, caméra de recul et sécurité maximale pour explorer toute la région Souss-Massa.', 'disponible', 1, 8),
('mercedes', 'Mercedes-Benz Classe C', 'luxe', 'Prestige & Berline VIP', 1100, 'Luxe Exceptionnel', 'assets/cars/mercedes-c-class.jpg', 'Automatique 9G', 'Diesel', '5 Places', 'Clim Thermotronic', '3 Valises', '4 Portes', 'L''élégance incarnée pour vos rendez-vous d''affaires ou séjours luxueux dans les palaces d''Agadir.', 'disponible', 1, 9),
('evoque', 'Range Rover Evoque', 'luxe', 'Prestige SUV VIP', 1200, 'Prestige VIP', 'assets/cars/range-rover-evoque.jpg', 'Automatique', 'Diesel', '5 Places', 'Climatisation A/C', '4 Valises', '5 Portes', 'Intérieur cuir raffiné et stature prestigieuse pour une expérience de conduite inoubliable.', 'disponible', 1, 10);
`);

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
              return { results: stmt.all(...params) || [] };
            },
            async run() {
              const stmt = sqliteDb.prepare(sql);
              const info = stmt.run(...params);
              return { success: true, meta: { last_row_id: Number(info.lastInsertRowid), changes: info.changes } };
            }
          };
        },
        async first() { return this.bind().first(); },
        async all() { return this.bind().all(); },
        async run() { return this.bind().run(); }
      };
    }
  };
}

const d1 = createD1Mock(db);
const mockAdmin = { id: 1, username: 'superadmin', role: 'superadmin' };

console.log('=== TEST UNITAIRE DES ENDPOINTS VÉHICULES ===\n');

try {
  // 1. GET /api/admin/vehicles
  const getRes = await getVehicles({ request: new Request('http://localhost/api/admin/vehicles'), env: { DB: d1 }, data: { user: mockAdmin } });
  const getData = await getRes.json();
  console.log(`[PASS] GET /api/admin/vehicles -> HTTP ${getRes.status}, ${getData.count} véhicules listés`);
  if (!getData.success || getData.count !== 10) throw new Error('Nombre de véhicules incorrect');

  // 2. POST /api/admin/vehicles/update
  const updateReq = new Request('http://localhost/api/admin/vehicles/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'duster',
      availability: 'loue',
      priceMad: 450
    })
  });
  const updateRes = await postVehicleUpdate({ request: updateReq, env: { DB: d1 }, data: { user: mockAdmin } });
  const updateData = await updateRes.json();
  console.log(`[PASS] POST /api/admin/vehicles/update -> HTTP ${updateRes.status}, message: "${updateData.message}"`);
  if (!updateData.success || updateData.vehicle.availability !== 'loue' || updateData.vehicle.priceMad !== 450) {
    throw new Error('Mise à jour véhicule échouée');
  }

  // 3. Vérification de l'enregistrement dans audit_logs
  const auditRow = db.prepare("SELECT * FROM audit_logs WHERE action = 'VEHICLE_UPDATED' AND entity_id = 'duster' ORDER BY id DESC LIMIT 1").get();
  console.log('[PASS] Audit log trouvé :', auditRow.action, '| Détails :', auditRow.details);
  if (!auditRow) throw new Error('Événement VEHICLE_UPDATED introuvable dans audit_logs');

  // Nettoyage : réinitialisation du véhicule duster
  db.prepare("UPDATE vehicles SET availability = 'disponible', price_mad = 420 WHERE id = 'duster'").run();
  db.prepare("DELETE FROM audit_logs WHERE action = 'VEHICLE_UPDATED' AND entity_id = 'duster'").run();

  console.log('\n=== TOUS LES TESTS VÉHICULES SONT VALIDES À 100% ===');
} finally {
  db.close();
}
