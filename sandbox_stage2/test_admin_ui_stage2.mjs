// WINON CAR - Stage 2 Step 2.5 & 2.6 Local Verification Test
// Tests: Admin UI Notification Center, Delivery Fees, WebP Canvas Compression & RBAC

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

console.log("================================================================================");
console.log("   WINON CAR - VÉRIFICATION LOCALE ÉTAPE 2.5 & 2.6 (DASHBOARD & WEBP MANAGER)   ");
console.log("================================================================================");

const adminHtmlPath = path.resolve('WINON CAR/admin/index.html');
if (!fs.existsSync(adminHtmlPath)) {
  console.error("❌ ERREUR: Le fichier WINON CAR/admin/index.html est introuvable.");
  process.exit(1);
}

const htmlContent = fs.readFileSync(adminHtmlPath, 'utf-8');
let totalTests = 0;
let passedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    process.exitCode = 1;
  }
}

// 1. Contrôle des éléments DOM de l'Étape 2.5 (Centre de Notifications)
console.log("\n[1] Contrôle des éléments du Centre de Notifications (Étape 2.5)...");
assert(htmlContent.includes('id="notif-bell-btn"'), "Bouton Cloche de notification (#notif-bell-btn) présent dans le Header");
assert(htmlContent.includes('id="notif-badge"'), "Badge compteur non lu (#notif-badge) avec pulse présent");
assert(htmlContent.includes('id="notif-dropdown"'), "Panneau déroulant (#notif-dropdown) présent");
assert(htmlContent.includes('id="notif-dropdown-count"'), "Compteur dans le panneau (#notif-dropdown-count) présent");
assert(htmlContent.includes('id="notif-sound-toggle-btn"'), "Bouton bascule audio (#notif-sound-toggle-btn) présent");
assert(htmlContent.includes('id="notif-mark-all-read-btn"'), "Bouton tout marquer comme lu (#notif-mark-all-read-btn) présent");
assert(htmlContent.includes('id="notif-list"'), "Conteneur de la liste des notifications (#notif-list) présent");

// 2. Contrôle des éléments DOM de l'Étape 2.5 (Frais de Livraison & Villes dans Modale Réservation)
console.log("\n[2] Contrôle des éléments de Frais de Livraison & Villes (Étape 2.5)...");
assert(htmlContent.includes('id="modal-res-pickup-city"'), "Ville de prise en charge (#modal-res-pickup-city) présente");
assert(htmlContent.includes('id="modal-res-pickup-loc"'), "Lieu de prise en charge (#modal-res-pickup-loc) présent");
assert(htmlContent.includes('id="modal-res-return-city"'), "Ville de restitution (#modal-res-return-city) présente");
assert(htmlContent.includes('id="modal-res-return-loc"'), "Lieu de restitution (#modal-res-return-loc) présent");
assert(htmlContent.includes('id="modal-res-flight-container"'), "Conteneur numéro de vol (#modal-res-flight-container) présent");
assert(htmlContent.includes('id="modal-delivery-status-select"'), "Sélecteur de statut livraison (#modal-delivery-status-select) présent");
assert(htmlContent.includes('id="modal-delivery-fee-input"'), "Champ de saisie montant MAD (#modal-delivery-fee-input) présent");
assert(htmlContent.includes('ثمن التوصيل كيتحدد حسب المدينة أو المطار'), "Message d'avertissement en Darija présent dans la modale");

// 3. Contrôle des éléments DOM de l'Étape 2.6 (Gestionnaire Photos WebP)
console.log("\n[3] Contrôle des éléments du Gestionnaire Photo WebP (Étape 2.6)...");
assert(htmlContent.includes('id="modal-veh-img-preview"'), "Aperçu photo véhicule (#modal-veh-img-preview) présent");
assert(htmlContent.includes('id="modal-veh-file-input"'), "Input fichier pour remplacement photo (#modal-veh-file-input) présent");
assert(htmlContent.includes('id="modal-veh-pick-file-btn"'), "Bouton déclencheur upload (#modal-veh-pick-file-btn) présent");
assert(htmlContent.includes('id="modal-veh-compress-stats"'), "Bloc métriques de compression (#modal-veh-compress-stats) présent");
assert(htmlContent.includes('id="modal-veh-rbac-notice"'), "Notice de restriction RBAC pour admin standard (#modal-veh-rbac-notice) présente");
assert(htmlContent.includes('id="add-veh-file-input"'), "Input fichier WebP dans ajout véhicule (#add-veh-file-input) présent");
assert(htmlContent.includes('id="add-veh-pick-file-btn"'), "Bouton import WebP dans ajout véhicule (#add-veh-pick-file-btn) présent");

// 4. Extraction et validation syntaxique du script JavaScript
console.log("\n[4] Validation syntaxique du bloc JavaScript...");
const allScripts = [...htmlContent.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi)];
const appScriptMatch = allScripts.find(m => m[1].includes('state ='));
assert(appScriptMatch !== undefined, "Balise <script> principale de l'application présente dans admin/index.html");

if (appScriptMatch) {
  const jsCode = appScriptMatch[1];
  try {
    // Compile le code JS dans une sandbox Node pour vérifier la validité syntaxique
    new vm.Script(jsCode);
    assert(true, "Syntaxe JavaScript 100% valide (aucune erreur ECMAScript)");
  } catch (err) {
    assert(false, `Syntaxe JavaScript invalide : ${err.message}`);
  }

  // Vérification de la présence des fonctions clés
  assert(jsCode.includes('function playChime()'), "Fonction playChime() synthétiseur Web Audio API présente");
  assert(jsCode.includes('function updateNotificationsUI()'), "Fonction updateNotificationsUI() présente");
  assert(jsCode.includes('function compressImageToWebP('), "Fonction compressImageToWebP() présente");
  assert(jsCode.includes('function pollNewReservations()'), "Fonction pollNewReservations() de détection automatique présente");
  assert(jsCode.includes('updateModalDeliveryFields('), "Fonction updateModalDeliveryFields() de gestion des frais présente");
  assert(jsCode.includes('markAllNotificationsRead()'), "Fonction markAllNotificationsRead() présente");
  assert(jsCode.includes("payload.imageUrl = newImageData"), "Sauvegarde de la photo WebP dans le payload véhicule pour Super Admin");
  assert(jsCode.includes("role === 'superadmin'"), "Contrôle RBAC strict Super Admin vs Admin vérifié dans le script");
}

console.log("\n--------------------------------------------------------------------------------");
console.log(`RÉSULTAT TOTAL : ${passedTests} / ${totalTests} vérifications réussies (${Math.round((passedTests/totalTests)*100)}%)`);
console.log("--------------------------------------------------------------------------------\n");

if (passedTests === totalTests) {
  console.log("🎉 TOUS LES CONTRÔLES LOCAUX DES ÉTAPES 2.5 ET 2.6 SONT AU VERT !");
  process.exit(0);
} else {
  console.error("❌ CERTAINS CONTRÔLES ONT ÉCHOUÉ.");
  process.exit(1);
}
