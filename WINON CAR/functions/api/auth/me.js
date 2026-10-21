// WINON CAR - Cloudflare Pages Function: /api/auth/me
// Vérification de la session active et renvoi des informations de profil & rôle

import {
  getSessionTokenFromRequest,
  hashSessionToken,
  createLogoutCookie
} from './_crypto.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const rawToken = getSessionTokenFromRequest(request);

    if (!rawToken) {
      return new Response(JSON.stringify({
        authenticated: false,
        error: "Aucune session active."
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!env.DB) {
      return new Response(JSON.stringify({
        authenticated: false,
        error: "Base de données indisponible."
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const tokenHash = await hashSessionToken(rawToken);

    // Recherche de la session et de l'utilisateur associé
    const sessionRecord = await env.DB.prepare(`
      SELECT 
        s.id AS session_id,
        s.expires_at,
        u.id AS user_id,
        u.username,
        u.email,
        u.role,
        u.full_name,
        u.status
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token_hash = ?
      LIMIT 1
    `).bind(tokenHash).first();

    if (!sessionRecord) {
      return new Response(JSON.stringify({
        authenticated: false,
        error: "Session invalide ou introuvable."
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': createLogoutCookie()
        }
      });
    }

    // Vérification de l'expiration de la session
    const expiresAt = new Date(sessionRecord.expires_at).getTime();
    if (Date.now() > expiresAt) {
      // Nettoyage de la session expirée
      await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionRecord.session_id).run();

      return new Response(JSON.stringify({
        authenticated: false,
        error: "Session expirée. Veuillez vous reconnecter."
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': createLogoutCookie()
        }
      });
    }

    // Vérification du statut du compte
    if (sessionRecord.status !== 'actif') {
      return new Response(JSON.stringify({
        authenticated: false,
        error: "Compte utilisateur suspendu ou désactivé."
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': createLogoutCookie()
        }
      });
    }

    return new Response(JSON.stringify({
      authenticated: true,
      user: {
        id: sessionRecord.user_id,
        username: sessionRecord.username,
        email: sessionRecord.email,
        role: sessionRecord.role,
        fullName: sessionRecord.full_name
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      authenticated: false,
      error: error.message || "Erreur interne lors de la vérification de session."
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

