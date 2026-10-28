// WINON CAR - Cloudflare Pages Function: /api/auth/logout
// Déconnexion et invalidation de la session

import {
  getSessionTokenFromRequest,
  hashSessionToken,
  createLogoutCookie
} from './_crypto.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const rawToken = getSessionTokenFromRequest(request);

    if (rawToken && env.DB) {
      const tokenHash = await hashSessionToken(rawToken);

      // Suppression de la session en base de données
      try {
        await env.DB.prepare(`
          DELETE FROM sessions WHERE token_hash = ?
        `).bind(tokenHash).run();
      } catch (dbErr) {
        console.warn('Erreur lors de la suppression de session en base :', dbErr);
      }
    }

    // Réponse avec cookie invalidé (Max-Age=0)
    return new Response(JSON.stringify({
      success: true,
      message: "Déconnexion réussie."
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': createLogoutCookie()
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Erreur lors de la déconnexion."
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

