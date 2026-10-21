// Test unitaire et d'intégration : API publique /api/vehicles et synchronisation dynamique
import { onRequestGet as publicGetVehicles } from '../WINON CAR/functions/api/vehicles.js';
import { onRequestPost as adminAddVehicle } from '../WINON CAR/functions/api/admin/vehicles/add.js';
import { onRequestPost as adminUpdateVehicle } from '../WINON CAR/functions/api/admin/vehicles/update.js';
import { onRequestPost as adminDeleteVehicle } from '../WINON CAR/functions/api/admin/vehicles/delete.js';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

console.log("=== TEST DE SYNCHRONISATION DYNAMIQUE D1 -> /api/vehicles -> SITE PUBLIC ===\n");

// 1. Initialisation d'une base en mémoire avec le schéma 0002
const db = new DatabaseSync(':memory:');
const schema0001 = fs.readFileSync('WINON CAR/migrations/0001_initial_reservations.sql', 'utf8');
const schema0002 = fs.readFileSync('WINON CAR/migrations/0002_auth_and_management.sql', 'utf8');

db.exec(schema0001);
db.exec(schema0002);

// Mock env.DB pour simuler Cloudflare D1
const mockD1 = {
  prepare(sql) {
    return {
      bind(...params) {
        return {
          first: async () => {
            const stmt = db.prepare(sql);
            return stmt.get(...params) || null;
          },
          all: async () => {
            const stmt = db.prepare(sql);
            return { results: stmt.all(...params) || [] };
          },
          run: async () => {
            const stmt = db.prepare(sql);
            const info = stmt.run(...params);
            return { success: true, meta: info };
          }
        };
      },
      first: async () => {
        const stmt = db.prepare(sql);
        return stmt.get() || null;
      },
      all: async () => {
        const stmt = db.prepare(sql);
        return { results: stmt.all() || [] };
      },
      run: async () => {
        const stmt = db.prepare(sql);
        const info = stmt.run();
        return { success: true, meta: info };
      }
    };
  }
};

const mockAdminUser = { id: 1, username: 'superadmin', role: 'superadmin' };

async function run() {
  // Test 1 : Récupération initiale via /api/vehicles
  const res1 = await publicGetVehicles({ env: { DB: mockD1 } });
  const data1 = await res1.json();
  console.assert(res1.status === 200, "Le statut doit être 200");
  console.assert(res1.headers.get('Cache-Control').includes('no-cache'), "Cache-Control doit être no-cache");
  console.assert(data1.vehicles.length === 10, `Attendu 10 véhicules, reçu ${data1.vehicles.length}`);
  console.log(`[PASS] GET /api/vehicles renvoie ${data1.vehicles.length} véhicules initiaux avec en-têtes sans cache.`);

  // Test 2 : Modification du prix d'un véhicule (Dacia Sandero 280 -> 250 MAD)
  const sanderoBefore = data1.vehicles.find(v => v.id === 'sandero');
  console.log(`Prix initial Dacia Sandero : ${sanderoBefore.priceMad} MAD`);

  const updateContext = {
    request: new Request('http://localhost/api/admin/vehicles/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'sandero', priceMad: 250, availability: 'disponible' })
    }),
    env: { DB: mockD1 },
    data: { user: mockAdminUser }
  };
  const updateRes = await adminUpdateVehicle(updateContext);
  console.assert(updateRes.status === 200, "Mise à jour réussie");

  // Re-vérification via l'API publique /api/vehicles
  const res2 = await publicGetVehicles({ env: { DB: mockD1 } });
  const data2 = await res2.json();
  const sanderoAfter = data2.vehicles.find(v => v.id === 'sandero');
  console.assert(sanderoAfter.priceMad === 250, `Le prix doit être de 250 MAD, reçu ${sanderoAfter.priceMad}`);
  console.log(`[PASS] Modification dashboard répercutée immédiatement dans /api/vehicles (Sandero: ${sanderoAfter.priceMad} MAD).`);

  // Test 3 : Ajout d'un nouveau véhicule depuis le dashboard (Toyota Yaris Cross)
  const addContext = {
    request: new Request('http://localhost/api/admin/vehicles/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Toyota Yaris Cross Automatique',
        category: 'suv',
        priceMad: 490,
        availability: 'disponible',
        badge: 'Nouveau Modèle 2026',
        imageUrl: 'assets/cars/toyota-yaris-cross.jpg'
      })
    }),
    env: { DB: mockD1 },
    data: { user: mockAdminUser }
  };
  const addRes = await adminAddVehicle(addContext);
  const addData = await addRes.json();
  const newVehId = addData.vehicle.id;
  console.assert(addRes.status === 201, "Ajout réussi");

  // Re-vérification via l'API publique /api/vehicles
  const res3 = await publicGetVehicles({ env: { DB: mockD1 } });
  const data3 = await res3.json();
  console.assert(data3.vehicles.length === 11, `Attendu 11 véhicules, reçu ${data3.vehicles.length}`);
  const newCar = data3.vehicles.find(v => v.id === newVehId);
  console.assert(newCar !== undefined, "Le nouveau véhicule doit être présent");
  console.assert(newCar.priceMad === 490, "Le tarif doit être de 490 MAD");
  console.log(`[PASS] Ajout dashboard répercuté immédiatement dans /api/vehicles (${newCar.name} - ${newCar.priceMad} MAD). Total: 11 véhicules.`);

  // Test 4 : Suppression du véhicule depuis le dashboard
  const deleteContext = {
    request: new Request('http://localhost/api/admin/vehicles/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: newVehId })
    }),
    env: { DB: mockD1 },
    data: { user: mockAdminUser }
  };
  const deleteRes = await adminDeleteVehicle(deleteContext);
  console.assert(deleteRes.status === 200, "Suppression réussie");

  // Re-vérification via l'API publique /api/vehicles
  const res4 = await publicGetVehicles({ env: { DB: mockD1 } });
  const data4 = await res4.json();
  console.assert(data4.vehicles.length === 10, `Attendu retour à 10 véhicules, reçu ${data4.vehicles.length}`);
  console.assert(data4.vehicles.find(v => v.id === newVehId) === undefined, "Le véhicule supprimé ne doit plus figurer dans l'API");
  console.log(`[PASS] Suppression dashboard répercutée immédiatement dans /api/vehicles. Total réinitialisé à 10 véhicules.`);

  // Test 5 : Vérification de la présence de la logique dynamique dans winoncar.html et index.html
  const winonHtml = fs.readFileSync('WINON CAR/winoncar.html', 'utf8');
  const indexHtml = fs.readFileSync('WINON CAR/index.html', 'utf8');

  console.assert(winonHtml.includes('fetch(\'/api/vehicles\')'), "winoncar.html doit appeler /api/vehicles");
  console.assert(winonHtml.includes('loadVehiclesFromAPI()'), "winoncar.html doit exécuter loadVehiclesFromAPI");
  console.assert(indexHtml.includes('fetch(\'/api/vehicles\')'), "index.html doit appeler /api/vehicles");
  console.assert(indexHtml.includes('loadVehiclesFromAPI()'), "index.html doit exécuter loadVehiclesFromAPI");
  console.log(`[PASS] index.html et winoncar.html contiennent bien la méthode d'intégration dynamique /api/vehicles.`);

  console.log("\n=== TOUS LES TESTS D'INTÉGRATION PUBLIQUE SONT VALIDÉS À 100% ===");
}

run().catch(err => {
  console.error("Échec du test :", err);
  process.exit(1);
});

