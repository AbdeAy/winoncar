// ==============================================================================
// WINON CAR - CLI d'Initialisation du Compte Super Administrateur
// Crée de manière sécurisée le premier compte Super Admin
// Hachage PBKDF2-SHA256 (100 000 itérations, sel aléatoire 16 octets)
// Zéro mot de passe en clair - Respect strict de la politique de sécurité
// ==============================================================================

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import {
  hashPassword,
  validatePasswordPolicy
} from '../functions/api/auth/_crypto.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Analyse les arguments passés en ligne de commande
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    username: null,
    email: null,
    password: null,
    fullname: null,
    dbPath: null,
    generateSql: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--username' || arg === '-u') {
      params.username = args[++i];
    } else if (arg === '--email' || arg === '-e') {
      params.email = args[++i];
    } else if (arg === '--password' || arg === '-p') {
      params.password = args[++i];
    } else if (arg === '--fullname' || arg === '-n') {
      params.fullname = args[++i];
    } else if (arg === '--db') {
      params.dbPath = args[++i];
    } else if (arg === '--generate-sql') {
      params.generateSql = true;
    } else if (arg === '--help' || arg === '-h') {
      params.help = true;
    }
  }

  return params;
}

function showHelp() {
  console.log(`
WINON CAR - Initialisation Super Administrateur (CLI)

Utilisation :
  node seed_admin.mjs [options]

Options :
  -u, --username <nom>     Identifiant unique (3-30 caractères alphanumériques)
  -e, --email <email>      Adresse email professionnelle
  -p, --password <pwd>     Mot de passe fort (>= 12 car, maj, min, num, sym)
  -n, --fullname <nom>     Nom et prénom complets
  --db <chemin>            Chemin absolu ou relatif vers la base SQLite locale
  --generate-sql           Génère l'instruction SQL sécurisée avec hash PBKDF2
  -h, --help               Affiche cette aide

Exemple :
  node seed_admin.mjs -u superadmin -e contact@winoncar.com -n "Directeur Général" --db sandbox_restore_test/db.sqlite
`);
}

/**
 * Fonction principale
 */
export async function seedAdmin(options = {}) {
  const params = { ...parseArgs(), ...options };

  if (params.help) {
    showHelp();
    return { success: true };
  }

  console.log('==============================================================================');
  console.log('=== WINON CAR : INITIALISATION DU SUPER ADMINISTRATEUR ===');
  console.log('==============================================================================\n');

  // Mode interactif si certains champs manquent et que stdin est disponible
  if ((!params.username || !params.email || !params.password) && process.stdin.isTTY) {
    const rl = readline.createInterface({ input, output });
    try {
      if (!params.username) {
        params.username = await rl.question('Nom d\'utilisateur Super Admin : ');
      }
      if (!params.fullname) {
        params.fullname = await rl.question('Nom complet (ex: Direction WINON CAR) : ');
      }
      if (!params.email) {
        params.email = await rl.question('Email professionnel : ');
      }
      if (!params.password) {
        params.password = await rl.question('Mot de passe (>= 12 car, Maj, Min, Chiffre, Symbole) : ');
      }
    } finally {
      rl.close();
    }
  }

  // 1. Validation de l'identifiant
  if (!params.username || typeof params.username !== 'string' || !/^[a-zA-Z0-9_-]{3,30}$/.test(params.username.trim())) {
    throw new Error("Nom d'utilisateur invalide (3 à 30 caractères alphanumériques, tirets et underscores autorisés).");
  }
  const cleanUsername = params.username.trim();

  // 2. Validation de l'email
  if (!params.email || typeof params.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.email.trim())) {
    throw new Error("Format d'adresse email invalide.");
  }
  const cleanEmail = params.email.trim().toLowerCase();

  // 3. Validation du nom complet
  const cleanFullName = (params.fullname && typeof params.fullname === 'string') ? params.fullname.trim() : 'Super Administrateur';

  // 4. Validation de la politique de mot de passe stricte
  const policy = validatePasswordPolicy(params.password);
  if (!policy.valid) {
    throw new Error(`Politique de mot de passe non respectée : ${policy.error}`);
  }

  // 5. Hachage sécurisé PBKDF2-SHA256 (100k itérations, sel aléatoire 16 octets)
  console.log('Génération du sel cryptographique 16 octets et hachage PBKDF2-SHA256 (100 000 itérations)...');
  const passwordHash = await hashPassword(params.password);
  console.log('[OK] Hash PBKDF2 généré avec succès.');

  // 6. Mode génération SQL seule (pour Cloudflare D1 console ou migration)
  if (params.generateSql) {
    const escapedHash = passwordHash.replace(/'/g, "''");
    const escapedUser = cleanUsername.replace(/'/g, "''");
    const escapedEmail = cleanEmail.replace(/'/g, "''");
    const escapedName = cleanFullName.replace(/'/g, "''");

    const sql = `
-- WINON CAR - Initialisation du Super Administrateur (Hash PBKDF2)
INSERT INTO users (username, email, password_hash, role, full_name, status, created_at)
VALUES ('${escapedUser}', '${escapedEmail}', '${escapedHash}', 'superadmin', '${escapedName}', 'actif', datetime('now'));

INSERT INTO audit_logs (username, role, action, entity_type, entity_id, details, ip_address, created_at)
VALUES ('${escapedUser}', 'superadmin', 'INITIAL_SUPERADMIN_SEEDED', 'user', '${escapedUser}', '{"seed": "cli", "email": "${escapedEmail}"}', '127.0.0.1', datetime('now'));
    `.trim();

    console.log('\n--- INSTRUCTION SQL GÉNÉRÉE (À EXÉCUTER SUR CLOUDFLARE D1) ---');
    console.log(sql);
    console.log('-------------------------------------------------------------\n');

    return {
      success: true,
      sql,
      username: cleanUsername,
      email: cleanEmail,
      fullName: cleanFullName,
      passwordHash
    };
  }

  // 7. Mode exécution directe sur base SQLite locale
  if (!params.dbPath) {
    console.log('[INFO] Aucun chemin de base spécifié (--db). Exécution terminée en mode génération.');
    return {
      success: true,
      username: cleanUsername,
      email: cleanEmail,
      fullName: cleanFullName,
      passwordHash
    };
  }

  const resolvedDbPath = path.resolve(process.cwd(), params.dbPath);
  if (!fs.existsSync(resolvedDbPath)) {
    throw new Error(`Le fichier de base de données spécifié est introuvable : ${resolvedDbPath}`);
  }

  console.log(`Connexion à la base de données : ${resolvedDbPath}`);
  const db = new DatabaseSync(resolvedDbPath);

  try {
    db.exec('PRAGMA foreign_keys = ON;');

    // Vérifier si le compte existe déjà
    const existing = db.prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?').get(cleanUsername, cleanEmail);
    if (existing) {
      throw new Error(`Un compte avec l'identifiant '${cleanUsername}' ou l'email '${cleanEmail}' existe déjà dans la base.`);
    }

    // Insertion du Super Admin
    const insertUser = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, full_name, status, created_at)
      VALUES (?, ?, ?, 'superadmin', ?, 'actif', datetime('now'))
    `).run(cleanUsername, cleanEmail, passwordHash, cleanFullName);

    const newUserId = Number(insertUser.lastInsertRowid);
    console.log(`[OK] Super Administrateur créé en base avec l'ID #${newUserId}.`);

    // Inscription dans le journal d'audit
    const auditDetails = JSON.stringify({
      seedSource: 'cli',
      username: cleanUsername,
      email: cleanEmail,
      role: 'superadmin'
    });

    db.prepare(`
      INSERT INTO audit_logs (user_id, username, role, action, entity_type, entity_id, details, ip_address, created_at)
      VALUES (?, ?, 'superadmin', 'INITIAL_SUPERADMIN_SEEDED', 'user', ?, ?, '127.0.0.1', datetime('now'))
    `).run(newUserId, cleanUsername, String(newUserId), auditDetails);
    console.log('[OK] Événement INITIAL_SUPERADMIN_SEEDED enregistré dans le journal d\'audit.');

    // Contrôles d'intégrité
    const integrity = db.prepare('PRAGMA integrity_check;').get();
    if (integrity.integrity_check !== 'ok') {
      throw new Error(`Échec PRAGMA integrity_check : ${integrity.integrity_check}`);
    }

    const fk = db.prepare('PRAGMA foreign_key_check;').all();
    if (fk.length > 0) {
      throw new Error(`Échec PRAGMA foreign_key_check : ${fk.length} violation(s)`);
    }

    console.log('[OK] Intégrité SQLite et clés étrangères vérifiées avec succès.\n');
    console.log(`=== COMPTE INITIALISÉ AVEC SUCCÈS ===`);
    console.log(`Identifiant  : ${cleanUsername}`);
    console.log(`Email        : ${cleanEmail}`);
    console.log(`Rôle         : superadmin (Accès Total)`);
    console.log(`Statut       : actif`);
    console.log(`Sécurité     : Hash PBKDF2 stocké, aucun mot de passe en clair.\n`);

    return {
      success: true,
      userId: newUserId,
      username: cleanUsername,
      email: cleanEmail,
      role: 'superadmin',
      fullName: cleanFullName,
      passwordHash
    };

  } finally {
    db.close();
    console.log('Connexion SQLite fermée.');
  }
}

// Si exécuté directement via `node seed_admin.mjs`
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  seedAdmin().catch(err => {
    console.error('\nERREUR :', err.message);
    process.exit(1);
  });
}

