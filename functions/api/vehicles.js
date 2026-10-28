// WINON CAR - Cloudflare Pages Function: /api/vehicles
// Catalogue public des véhicules (données en direct depuis Cloudflare D1)

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Base de données Cloudflare D1 indisponible." 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const result = await env.DB.prepare(`
      SELECT 
        id,
        name,
        category,
        category_label AS categoryLabel,
        price_mad AS priceMad,
        badge,
        image_url AS imageUrl,
        gearbox,
        fuel,
        seats,
        ac,
        bags,
        doors,
        description,
        availability,
        is_active AS isActive,
        display_order AS displayOrder
      FROM vehicles
      WHERE is_active = 1
      ORDER BY display_order ASC, id ASC
    `).all();

    return new Response(JSON.stringify({
      success: true,
      vehicles: result.results || [],
      count: (result.results || []).length
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Erreur interne lors de la récupération des véhicules."
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

