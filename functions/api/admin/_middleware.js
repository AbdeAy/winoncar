// WINON CAR - Middleware de Sécurité & RBAC pour /api/admin/*
// Valide le cookie de session avant d'autoriser l'accès aux endpoints d'administration

import {
  getSessionTokenFromRequest,
  hashSessionToken,
  createLogoutCookie
} from '../auth/_crypto.js';

export async function onRequest(context) {
  const { request, env } = context;

  // 1. Récupération du token depuis les cookies de la requête
  const rawToken = getSessionTokenFromRequest(request);

  if (!rawToken) {
    return new Response(JSON.stringify({
      success: false,
      error: "Accès refusé : session non authentifiée."
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': createLogoutCookie()
      }
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

  try {
    const tokenHash = await hashSessionToken(rawToken);

    // 2. Recherche de la session active et de l'utilisateur associé
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
        success: false,
        error: "Session invalide ou expirée."
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': createLogoutCookie()
        }
      });
    }

    // 3. Contrôle de l'expiration
    const expiresAt = new Date(sessionRecord.expires_at).getTime();
    if (Date.now() > expiresAt) {
      await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionRecord.session_id).run();
      return new Response(JSON.stringify({
        success: false,
        error: "Session expirée. Veuillez vous reconnecter."
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': createLogoutCookie()
        }
      });
    }

    // 4. Contrôle du statut du compte
    if (sessionRecord.status !== 'actif') {
      return new Response(JSON.stringify({
        success: false,
        error: "Ce compte administrateur est inactif ou désactivé."
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': createLogoutCookie()
        }
      });
    }

    // 5. Injection de l'utilisateur authentifié dans context.data
    context.data = context.data || {};
    context.data.user = {
      id: sessionRecord.user_id,
      username: sessionRecord.username,
      email: sessionRecord.email,
      role: sessionRecord.role,
      fullName: sessionRecord.full_name
    };

    // Poursuite vers le prochain handler / endpoint
    return await context.next();

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Erreur interne de vérification de session."
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

