// WINON CAR - Cloudflare Pages Function: /api/auth/login
// Authentification sécurisée des administrateurs (Admin & Super Admin)

import {
  verifyPassword,
  generateSessionToken,
  hashSessionToken,
  createSessionCookie
} from './_crypto.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.usernameOrEmail || !body.password) {
      return new Response(JSON.stringify({
        success: false,
        error: "Veuillez fournir un nom d'utilisateur/email et un mot de passe."
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!env.DB) {
      return new Response(JSON.stringify({
        success: false,
        error: "Base de données indisponible."
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const identifier = String(body.usernameOrEmail).trim();
    const plainPassword = String(body.password).trim();
    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'local';

    // 1. Recherche de l'utilisateur actif
    const user = await env.DB.prepare(`
      SELECT id, username, email, password_hash, role, full_name, status
      FROM users
      WHERE (username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE) AND status = 'actif'
      LIMIT 1
    `).bind(identifier, identifier).first();

    // 2. Vérification cryptographique stricte du mot de passe (PBKDF2-SHA256)
    let isPasswordValid = false;
    if (user) {
      isPasswordValid = await verifyPassword(plainPassword, user.password_hash);
    }

    if (!user || !isPasswordValid) {
      // Journalisation de la tentative échouée
      try {
        await env.DB.prepare(`
          INSERT INTO audit_logs (username, role, action, entity_type, entity_id, details, ip_address)
          VALUES (?, ?, 'LOGIN_FAILED', 'auth', ?, '{"reason":"invalid_credentials"}', ?)
        `).bind(identifier, user ? user.role : 'unknown', user ? String(user.id) : null, clientIp).run();
      } catch (logErr) {
        console.warn('Impossible d\'écrire le log d\'échec de connexion :', logErr);
      }

      return new Response(JSON.stringify({
        success: false,
        error: "Identifiants invalides ou compte inactif."
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Génération d'une nouvelle session sécurisée (8 heures)
    const rawSessionToken = generateSessionToken();
    const tokenHash = await hashSessionToken(rawSessionToken);
    const sessionId = globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : generateSessionToken().substring(0, 36);
    const maxAgeSeconds = 8 * 3600; // 8 heures

    await env.DB.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, expires_at)
      VALUES (?, ?, ?, datetime('now', '+8 hours'))
    `).bind(sessionId, user.id, tokenHash).run();

    // 4. Mise à jour de la dernière connexion de l'utilisateur
    await env.DB.prepare(`
      UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(user.id).run();

    // 5. Journalisation de l'audit de succès
    try {
      await env.DB.prepare(`
        INSERT INTO audit_logs (user_id, username, role, action, entity_type, entity_id, details, ip_address)
        VALUES (?, ?, ?, 'LOGIN_SUCCESS', 'auth', ?, '{"auth_method":"password"}', ?)
      `).bind(user.id, user.username, user.role, String(user.id), clientIp).run();
    } catch (logErr) {
      console.warn('Impossible d\'écrire le log de succès de connexion :', logErr);
    }

    // 6. Réponse avec cookie de session sécurisé HttpOnly
    const sessionCookie = createSessionCookie(rawSessionToken, maxAgeSeconds);

    return new Response(JSON.stringify({
      success: true,
      message: "Connexion réussie",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.full_name
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': sessionCookie
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Erreur interne lors de la connexion."
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

