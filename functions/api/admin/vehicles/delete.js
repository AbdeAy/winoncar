// WINON CAR - Cloudflare Pages Function: /api/admin/vehicles/delete
// Suppression sécurisée d'un véhicule de la flotte (Admin & Super Admin)

/**
 * Gestion unifiée de suppression d'un véhicule
 */
async function handleVehicleDeletion(context) {
  const { request, env } = context;
  const user = context.data?.user;

  if (!user) {
    return new Response(JSON.stringify({ success: false, error: "Non autorisé." }), { status: 401 });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ success: false, error: "Base de données indisponible." }), { status: 500 });
  }

  try {
    const url = new URL(request.url);
    const body = await request.json().catch(() => null);
    const vehicleId = (body?.id || url.searchParams.get('id') || '').trim();

    if (!vehicleId) {
      return new Response(JSON.stringify({
        success: false,
        error: "Identifiant du véhicule (id) obligatoire pour la suppression."
      }), { status: 400 });
    }

    // 1. Recherche du véhicule existant
    const current = await env.DB.prepare(`
      SELECT id, name, category, price_mad, availability FROM vehicles WHERE id = ?
    `).bind(vehicleId).first();

    if (!current) {
      return new Response(JSON.stringify({
        success: false,
        error: `Véhicule '${vehicleId}' introuvable dans la base de données.`
      }), { status: 404 });
    }

    // 2. Suppression dans la base Cloudflare D1
    await env.DB.prepare('DELETE FROM vehicles WHERE id = ?').bind(vehicleId).run();

    // 3. Enregistrement immuable dans le Journal d'Audit
    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'local';
    const auditDetails = JSON.stringify({
      deletedVehicleId: current.id,
      deletedVehicleName: current.name,
      category: current.category,
      lastPriceMad: current.price_mad,
      lastAvailability: current.availability
    });

    try {
      await env.DB.prepare(`
        INSERT INTO audit_logs (user_id, username, role, action, entity_type, entity_id, details, ip_address, created_at)
        VALUES (?, ?, ?, 'VEHICLE_DELETED', 'vehicle', ?, ?, ?, datetime('now'))
      `).bind(user.id, user.username, user.role, current.id, auditDetails, clientIp).run();
    } catch (auditErr) {
      console.warn("Échec d'insertion audit log suppression véhicule :", auditErr);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Véhicule '${current.name}' retiré de la flotte avec succès.`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Erreur interne lors de la suppression du véhicule."
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPost(context) {
  return handleVehicleDeletion(context);
}

export async function onRequestDelete(context) {
  return handleVehicleDeletion(context);
}

