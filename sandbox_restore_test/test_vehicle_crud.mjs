// Test automatisé complet : Ajout et Suppression de Véhicules (CRUD) avec Audit Logs
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { onRequestGet as getVehicles } from '../WINON CAR/functions/api/admin/vehicles.js';
import { onRequestPost as addVehicle } from '../WINON CAR/functions/api/admin/vehicles/add.js';
import { onRequestPost as deleteVehicle } from '../WINON CAR/functions/api/admin/vehicles/delete.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sandboxDbPath = path.resolve(__dirname, 'f6d9166d2ea703e42b5f1aac71642d9b3f8f6dd1979b5c77455049746f270f6c.sqlite');

const db = new DatabaseSync(sandboxDbPath);
db.exec('PRAGMA foreign_keys = ON;');

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

console.log('=== TEST UNITAIRE : AJOUT & SUPPRESSION DE VÉHICULES AVEC AUDIT ===\n');

try {
  // 1. Comptage initial
  const initRes = await getVehicles({ request: new Request('http://localhost/api/admin/vehicles'), env: { DB: d1 }, data: { user: mockAdmin } });
  const initData = await initRes.json();
  const initialCount = initData.count;
  console.log(`[PASS] Nombre initial de véhicules : ${initialCount}`);

  // 2. Test d'erreur à l'ajout (nom ou tarif manquant)
  const badAdd = await addVehicle({
    request: new Request('http://localhost/api/admin/vehicles/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', priceMad: -50 })
    }),
    env: { DB: d1 },
    data: { user: mockAdmin }
  });
  console.log(`[PASS] Ajout avec données invalides rejeté -> HTTP ${badAdd.status}`);
  if (badAdd.status !== 400) throw new Error('Échec validation ajout');

  // 3. Ajout réussi d'un nouveau véhicule (Toyota Yaris Cross)
  const addRes = await addVehicle({
    request: new Request('http://localhost/api/admin/vehicles/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Toyota Yaris Cross Automatique',
        category: 'eco',
        priceMad: 350,
        availability: 'disponible',
        badge: 'Nouveau Modèle 2026',
        imageUrl: 'assets/cars/dacia-sandero-stepway.jpg'
      })
    }),
    env: { DB: d1 },
    data: { user: mockAdmin }
  });
  const addData = await addRes.json();
  console.log(`[PASS] POST /api/admin/vehicles/add -> HTTP ${addRes.status}, id généré : "${addData.vehicle?.id}"`);
  if (addRes.status !== 201 || !addData.success) throw new Error('Échec insertion véhicule');
  const newVehId = addData.vehicle.id;

  // 4. Vérification de l'augmentation du catalogue
  const afterAddRes = await getVehicles({ request: new Request('http://localhost/api/admin/vehicles'), env: { DB: d1 }, data: { user: mockAdmin } });
  const afterAddData = await afterAddRes.json();
  console.log(`[PASS] Flotte après ajout : ${afterAddData.count} véhicules (attendu: ${initialCount + 1})`);
  if (afterAddData.count !== initialCount + 1) throw new Error('Véhicule non comptabilisé dans la flotte');

  // 5. Vérification du log VEHICLE_CREATED dans audit_logs
  const createLog = db.prepare("SELECT * FROM audit_logs WHERE action = 'VEHICLE_CREATED' AND entity_id = ?").get(newVehId);
  console.log(`[PASS] Journal d'audit VEHICLE_CREATED enregistré pour ${newVehId}`);
  if (!createLog) throw new Error('Log VEHICLE_CREATED manquant dans audit_logs');

  // 6. Test d'erreur à la suppression (id manquant ou inexistant)
  const badDelete = await deleteVehicle({
    request: new Request('http://localhost/api/admin/vehicles/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'inconnu_xyz_123' })
    }),
    env: { DB: d1 },
    data: { user: mockAdmin }
  });
  console.log(`[PASS] Suppression d'un véhicule inexistant rejetée -> HTTP ${badDelete.status}`);
  if (badDelete.status !== 404) throw new Error('Échec validation suppression');

  // 7. Suppression réussie du véhicule créé
  const delRes = await deleteVehicle({
    request: new Request('http://localhost/api/admin/vehicles/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: newVehId })
    }),
    env: { DB: d1 },
    data: { user: mockAdmin }
  });
  const delData = await delRes.json();
  console.log(`[PASS] POST /api/admin/vehicles/delete -> HTTP ${delRes.status}, message: "${delData.message}"`);
  if (delRes.status !== 200 || !delData.success) throw new Error('Échec suppression véhicule');

  // 8. Vérification du retour au nombre initial
  const finalRes = await getVehicles({ request: new Request('http://localhost/api/admin/vehicles'), env: { DB: d1 }, data: { user: mockAdmin } });
  const finalData = await finalRes.json();
  console.log(`[PASS] Flotte après suppression : ${finalData.count} véhicules (retour exact à ${initialCount})`);
  if (finalData.count !== initialCount) throw new Error('Véhicule toujours présent après suppression');

  // 9. Vérification du log VEHICLE_DELETED dans audit_logs
  const deleteLog = db.prepare("SELECT * FROM audit_logs WHERE action = 'VEHICLE_DELETED' AND entity_id = ?").get(newVehId);
  console.log(`[PASS] Journal d'audit VEHICLE_DELETED enregistré pour ${newVehId}`);
  if (!deleteLog) throw new Error('Log VEHICLE_DELETED manquant dans audit_logs');

  // Nettoyage des logs de test
  db.prepare("DELETE FROM audit_logs WHERE entity_id = ?").run(newVehId);

  console.log('\n=== TOUS LES TESTS CRUD VÉHICULES SONT VALIDES À 100% ===');
} finally {
  db.close();
}

