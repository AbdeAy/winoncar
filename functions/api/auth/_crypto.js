// WINON CAR - Module Cryptographique & Sécurité Sessions (Standard Web Crypto API)
// Compatible avec Cloudflare Pages Functions et Node.js (v20+)

const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

/**
 * Valide la politique de mot de passe stricte WINON CAR :
 * - Au moins 12 caractères
 * - Au moins une majuscule [A-Z]
 * - Au moins une minuscule [a-z]
 * - Au moins un chiffre [0-9]
 * - Au moins un symbole spécial
 */
export function validatePasswordPolicy(password) {
  if (typeof password !== 'string') {
    return { valid: false, error: 'Le mot de passe doit être une chaîne de caractères valide.' };
  }
  if (password.length < 12) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins 12 caractères.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins une lettre majuscule.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins une lettre minuscule.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins un chiffre.' };
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins un caractère spécial.' };
  }
  return { valid: true };
}

/**
 * Convertit un Uint8Array en chaîne hexadécimale
 */
function toHex(buffer) {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Convertit une chaîne hexadécimale en Uint8Array
 */
function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Comparaison en temps constant de deux chaînes hexadécimales pour neutraliser les attaques par timing
 */
function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Hache un mot de passe avec PBKDF2-SHA256 (100 000 itérations + sel 16 octets aléatoire)
 * Retourne le format standard : "saltHex$hashHex"
 */
export async function hashPassword(password) {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('API Web Crypto non disponible dans cet environnement.');
  }

  const salt = cryptoObj.getRandomValues(new Uint8Array(SALT_BYTES));
  const encoder = new TextEncoder();
  const passwordKey = await cryptoObj.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await cryptoObj.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    passwordKey,
    KEY_BYTES * 8
  );

  const saltHex = toHex(salt);
  const hashHex = toHex(derivedBits);
  return `${saltHex}$${hashHex}`;
}

/**
 * Vérifie un mot de passe en clair contre un hash stocké ("saltHex$hashHex")
 */
export async function verifyPassword(password, storedPasswordHash) {
  if (typeof password !== 'string' || typeof storedPasswordHash !== 'string') {
    return false;
  }

  const parts = storedPasswordHash.split('$');
  if (parts.length !== 2) {
    return false;
  }

  const [saltHex, expectedHashHex] = parts;
  if (saltHex.length !== SALT_BYTES * 2 || expectedHashHex.length !== KEY_BYTES * 2) {
    return false;
  }

  const cryptoObj = globalThis.crypto;
  const salt = fromHex(saltHex);
  const encoder = new TextEncoder();
  const passwordKey = await cryptoObj.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await cryptoObj.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    passwordKey,
    KEY_BYTES * 8
  );

  const computedHashHex = toHex(derivedBits);
  return constantTimeEqual(computedHashHex, expectedHashHex);
}

/**
 * Génère un identifiant de session aléatoire sécurisé de 256 bits (64 caractères hex)
 */
export function generateSessionToken() {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  return toHex(bytes);
}

/**
 * Hache un jeton de session en SHA-256 avant stockage en base de données
 */
export async function hashSessionToken(token) {
  const encoder = new TextEncoder();
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(token));
  return toHex(digest);
}

/**
 * Extrait le cookie de session de la requête HTTP
 */
export function getSessionTokenFromRequest(request) {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.trim().split('=');
    if (name === '__Host-winon_session' || name === 'winon_session') {
      return rest.join('=');
    }
  }
  return null;
}

/**
 * Crée le header Set-Cookie pour la session sécurisée
 */
export function createSessionCookie(token, maxAgeSeconds = 28800) {
  // En local HTTP ou en production HTTPS
  // Si le domaine est sécurisé (HTTPS), on utilise de préférence le préfixe __Host-
  const cookieName = 'winon_session';
  return `${cookieName}=${token}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Strict; Secure`;
}

/**
 * Crée le header Set-Cookie pour supprimer la session lors de la déconnexion
 */
export function createLogoutCookie() {
  const cookieName = 'winon_session';
  return `${cookieName}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict; Secure`;
}

