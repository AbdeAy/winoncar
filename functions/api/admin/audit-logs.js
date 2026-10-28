// WINON CAR - Cloudflare Pages Function: /api/admin/audit-logs
// Consultation du journal d'audit de sécurité (Réservé exclusivement aux Super Administrateurs)

/**
 * GET /api/admin/audit-logs
 * Retourne les événements d'audit immuables avec pagination et comptage total
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const user = context.data?.user;

  // Contrôle strict RBAC : Seul le Super Admin peut accéder aux journaux d'audit
  if (!user || user.role !== 'superadmin') {
    return new Response(JSON.stringify({
      success: false,
      error: "Accès refusé : privilèges Super Administrateur requis pour consulter le journal d'audit."
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ success: false, error: "Base de données indisponible." }), { status: 500 });
  }

  try {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '100', 10), 1), 500);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

    const logsResult = await env.DB.prepare(`
      SELECT 
        id,
        user_id AS userId,
        username,
        role,
        action,
        entity_type AS entityType,
        entity_id AS entityId,
        details,
        ip_address AS ipAddress,
        created_at AS createdAt
      FROM audit_logs
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    const countResult = await env.DB.prepare(`
      SELECT COUNT(*) AS total FROM audit_logs
    `).first();

    return new Response(JSON.stringify({
      success: true,
      logs: logsResult.results || [],
      count: (logsResult.results || []).length,
      total: countResult?.total || 0
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Erreur interne lors de la récupération des journaux d'audit."
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

