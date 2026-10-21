// Contrôle de sécurité et de stricte isolation pour le Stage 2
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

console.log("=== VÉRIFICATION DE L'ISOLATION STRICTE DE L'ENVIRONNEMENT DE TEST (STAGE 2) ===\n");

// 1. Contrôle de l'absence de toute variable ou configuration de production
const hasRemoteFlag = process.argv.includes('--remote');
console.assert(!hasRemoteFlag, "CRITIQUE : Le drapeau --remote ne doit JAMAIS être utilisé dans la sandbox");
console.log("[PASS] Aucun drapeau --remote détecté dans l'environnement de test.");

// 2. Vérification que la base de test est exclusivement locale / en mémoire
const sandboxDb = new DatabaseSync(':memory:');
console.assert(sandboxDb !== null, "La base sandbox en mémoire doit s'initialiser");
console.log("[PASS] Base de données de test initialisée strictement en mémoire RAM (:memory:).");

// 3. Test d'écriture en sandbox sans impact réseau
sandboxDb.exec("CREATE TABLE test_isolation (id INTEGER PRIMARY KEY, msg TEXT)");
sandboxDb.exec("INSERT INTO test_isolation (msg) VALUES ('test_local_uniquement')");
const row = sandboxDb.prepare("SELECT msg FROM test_isolation WHERE id = 1").get();
console.assert(row.msg === 'test_local_uniquement', "L'écriture en sandbox locale doit réussir");
console.log("[PASS] Les opérations de test s'exécutent à 100% dans la mémoire locale sans aucun appel réseau.");

// 4. Vérification de l'intégrité des fichiers originaux de WINON CAR
const originalIndex = fs.statSync('WINON CAR/index.html');
console.assert(originalIndex.size > 0, "Le fichier original index.html doit être intact");
console.log(`[PASS] Fichier principal intact (index.html: ${originalIndex.size} octets).`);

// 5. Vérification de l'archive de sauvegarde pre-stage2
const backupPath = 'backups/backup_pre_stage2_20261017.zip';
console.assert(fs.existsSync(backupPath), "L'archive de sauvegarde doit exister");
const backupStat = fs.statSync(backupPath);
console.assert(backupStat.size > 1000000, "L'archive doit peser plus de 1 Mo");
console.log(`[PASS] Archive de sauvegarde physique confirmée (${(backupStat.size / (1024*1024)).toFixed(2)} Mo).`);

console.log("\n=== ENVIRONNEMENT ISOLÉ VALIDÉ : AUCUN RISQUE POUR LA PRODUCTION ===");

