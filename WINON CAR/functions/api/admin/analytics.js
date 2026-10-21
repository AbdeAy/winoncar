// WINON CAR - Cloudflare Pages Function: /api/admin/analytics
// Restitution des statistiques d'audience du site web pour le Dashboard d'Administration
// Requiert une session active (gérée par _middleware.js)

export async function onRequestGet(context) {
  const { env } = context;

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
    // 1. Métriques globales (Tout l'historique)
    const totalRow = await env.DB.prepare(`
      SELECT 
        COUNT(*) AS total_page_views,
        COUNT(DISTINCT session_id) AS total_visits,
        COUNT(DISTINCT visitor_hash) AS total_unique_visitors
      FROM site_visits
    `).first() || {};

    // 2. Métriques Aujourd'hui (UTC)
    const todayRow = await env.DB.prepare(`
      SELECT 
        COUNT(*) AS page_views_today,
        COUNT(DISTINCT session_id) AS visits_today,
        COUNT(DISTINCT visitor_hash) AS unique_visitors_today
      FROM site_visits
      WHERE date(created_at) = date('now')
    `).first() || {};

    // 3. Métriques des 7 derniers jours
    const last7dRow = await env.DB.prepare(`
      SELECT 
        COUNT(*) AS page_views_7d,
        COUNT(DISTINCT session_id) AS visits_7d,
        COUNT(DISTINCT visitor_hash) AS unique_visitors_7d
      FROM site_visits
      WHERE created_at >= datetime('now', '-7 days')
    `).first() || {};

    // 4. Métriques des 30 derniers jours
    const last30dRow = await env.DB.prepare(`
      SELECT 
        COUNT(*) AS page_views_30d,
        COUNT(DISTINCT session_id) AS visits_30d,
        COUNT(DISTINCT visitor_hash) AS unique_visitors_30d
      FROM site_visits
      WHERE created_at >= datetime('now', '-30 days')
    `).first() || {};

    // 5. Historique journalier des 14 derniers jours pour le graphique
    const dailyRows = await env.DB.prepare(`
      SELECT 
        date(created_at) AS day_date,
        COUNT(*) AS page_views,
        COUNT(DISTINCT session_id) AS visits,
        COUNT(DISTINCT visitor_hash) AS unique_visitors
      FROM site_visits
      WHERE created_at >= datetime('now', '-14 days')
      GROUP BY date(created_at)
      ORDER BY date(created_at) ASC
    `).all();

    // 6. Répartition par appareil (30 derniers jours)
    const deviceRows = await env.DB.prepare(`
      SELECT 
        device_type,
        COUNT(*) AS count
      FROM site_visits
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY device_type
    `).all();

    const deviceMap = { mobile: 0, desktop: 0, tablet: 0 };
    (deviceRows.results || []).forEach(r => {
      if (r.device_type && deviceMap[r.device_type] !== undefined) {
        deviceMap[r.device_type] = r.count;
      }
    });

    // 7. Pages les plus consultées (30 derniers jours)
    const topPagesRows = await env.DB.prepare(`
      SELECT 
        page_path,
        COUNT(*) AS hits
      FROM site_visits
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY page_path
      ORDER BY hits DESC
      LIMIT 5
    `).all();

    return new Response(JSON.stringify({
      success: true,
      updatedAt: new Date().toISOString(),
      methodology: {
        pageViews: "Nombre brut de pages ou sections chargées par les visiteurs.",
        visits: "Nombre de sessions de navigation distinctes (session client).",
        uniqueVisitors: "Estimation basée sur une empreinte quotidienne anonymisée (IP + User-Agent + sel journalier cryptographique). Conforme RGPD et CNDP sans traçage permanent.",
        adminExclusion: "Le trafic issu de l'espace d'administration (/admin/) et des navigateurs connectés avec un compte administrateur est automatiquement exclu."
      },
      stats: {
        totalVisits: Number(totalRow.total_visits || 0),
        totalPageViews: Number(totalRow.total_page_views || 0),
        totalUniqueVisitors: Number(totalRow.total_unique_visitors || 0),

        visitsToday: Number(todayRow.visits_today || 0),
        pageViewsToday: Number(todayRow.page_views_today || 0),
        uniqueVisitorsToday: Number(todayRow.unique_visitors_today || 0),

        visits7d: Number(last7dRow.visits_7d || 0),
        pageViews7d: Number(last7dRow.page_views_7d || 0),
        uniqueVisitors7d: Number(last7dRow.unique_visitors_7d || 0),

        visits30d: Number(last30dRow.visits_30d || 0),
        pageViews30d: Number(last30dRow.page_views_30d || 0),
        uniqueVisitors30d: Number(last30dRow.unique_visitors_30d || 0)
      },
      dailyChart: (dailyRows.results || []).map(r => ({
        date: r.day_date,
        visits: Number(r.visits || 0),
        pageViews: Number(r.page_views || 0),
        uniqueVisitors: Number(r.unique_visitors || 0)
      })),
      devices: deviceMap,
      topPages: (topPagesRows.results || []).map(r => ({
        path: r.page_path,
        hits: Number(r.hits || 0)
      }))
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Erreur interne lors de la récupération des statistiques."
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

