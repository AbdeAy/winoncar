// WINON CAR - Cloudflare Pages Function: /api/admin/vehicles
// Gestion du catalogue et du statut des véhicules (Admin & Super Admin)

const VALID_AVAILABILITY = ['disponible', 'loue', 'maintenance'];

/**
 * GET /api/admin/vehicles
 * Liste complète des véhicules avec leur état de disponibilité en temps réel
 */
export async function onRequestGet(context) {
  const { env } = context;
  const user = context.data?.user;

  if (!user) {
    return new Response(JSON.stringify({ success: false, error: "Non autorisé." }), { status: 401 });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ success: false, error: "Base de données indisponible." }), { status: 500 });
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
        display_order AS displayOrder,
        updated_at AS updatedAt
      FROM vehicles
      ORDER BY display_order ASC, id ASC
    `).all();

    return new Response(JSON.stringify({
      success: true,
      vehicles: result.results || [],
      count: (result.results || []).length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Erreur lors de la récupération des véhicules."
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * PATCH /api/admin/vehicles
 * Met à jour le statut de disponibilité ou le tarif journalier d'un véhicule avec traçabilité dans audit_logs
 */
export async function onRequestPatch(context) {
  return handleVehicleUpdate(context);
}

/**
 * POST /api/admin/vehicles
 * Alternative POST pour les clients ne supportant pas PATCH
 */
export async function onRequestPost(context) {
  return handleVehicleUpdate(context);
}

/**
 * Logique unifiée de mise à jour d'un véhicule
 */
export async function handleVehicleUpdate(context) {
  const { request, env } = context;
  const user = context.data?.user;

  if (!user) {
    return new Response(JSON.stringify({ success: false, error: "Non autorisé." }), { status: 401 });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ success: false, error: "Base de données indisponible." }), { status: 500 });
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.id) {
      return new Response(JSON.stringify({ success: false, error: "Identifiant du véhicule requis (id)." }), { status: 400 });
    }

    const vehicleId = String(body.id).trim();
    const newAvailability = body.availability ? String(body.availability).trim().toLowerCase() : null;
    const newPrice = body.priceMad !== undefined ? Number(body.priceMad) : (body.price !== undefined ? Number(body.price) : null);
    const newActive = body.isActive !== undefined ? (body.isActive ? 1 : 0) : null;

    const newImageUrl = body.imageUrl ? String(body.imageUrl).trim() : (body.image ? String(body.image).trim() : null);

    // 1. Validation des paramètres
    if (newAvailability && !VALID_AVAILABILITY.includes(newAvailability)) {
      return new Response(JSON.stringify({
        success: false,
        error: `Disponibilité invalide. Valeurs acceptées : ${VALID_AVAILABILITY.join(', ')}`
      }), { status: 400 });
    }

    if (newPrice !== null && (isNaN(newPrice) || newPrice <= 0)) {
      return new Response(JSON.stringify({
        success: false,
        error: "Le tarif journalier (priceMad) doit être un nombre strictement positif."
      }), { status: 400 });
    }

    // Contrôle RBAC strict : Seul le Super Admin peut modifier le prix ou la photo
    const userRole = String(user.role || '').trim().toLowerCase();
    if ((newPrice !== null || newImageUrl !== null) && userRole !== 'superadmin') {
      return new Response(JSON.stringify({
        success: false,
        error: "Action refusée : Seul le Super Administrateur peut modifier le tarif ou la photo d'un véhicule."
      }), { status: 403 });
    }

    // 2. Recherche du véhicule existant
    const current = await env.DB.prepare(`
      SELECT id, name, availability, price_mad, image_url, is_active FROM vehicles WHERE id = ?
    `).bind(vehicleId).first();

    if (!current) {
      return new Response(JSON.stringify({ success: false, error: `Véhicule '${vehicleId}' introuvable.` }), { status: 404 });
    }

    // 3. Préparation des modifications
    const updates = [];
    const params = [];

    if (newAvailability && newAvailability !== current.availability) {
      updates.push('availability = ?');
      params.push(newAvailability);
    }

    if (newPrice !== null && newPrice !== current.price_mad) {
      updates.push('price_mad = ?');
      params.push(newPrice);
    }

    if (newImageUrl !== null && (newImageUrl.startsWith('data:image/') || newImageUrl !== current.image_url)) {
      updates.push('image_url = ?');
      params.push(newImageUrl);
    }

    if (newActive !== null && newActive !== current.is_active) {
      updates.push('is_active = ?');
      params.push(newActive);
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "Aucune modification nécessaire.",
        vehicle: current
      }), { status: 200 });
    }

    updates.push("updated_at = datetime('now')");
    params.push(vehicleId);

    // 4. Exécution de la mise à jour
    await env.DB.prepare(`
      UPDATE vehicles SET ${updates.join(', ')} WHERE id = ?
    `).bind(...params).run();

    // 5. Inscription automatique dans le Journal d'Audit
    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'local';
    const auditDetails = JSON.stringify({
      vehicleId: current.id,
      vehicleName: current.name,
      previousAvailability: current.availability,
      newAvailability: newAvailability || current.availability,
      previousPriceMad: current.price_mad,
      newPriceMad: newPrice !== null ? newPrice : current.price_mad,
      photoUpdated: newImageUrl !== null && newImageUrl !== current.image_url
    });

    try {
      await env.DB.prepare(`
        INSERT INTO audit_logs (user_id, username, role, action, entity_type, entity_id, details, ip_address, created_at)
        VALUES (?, ?, ?, 'VEHICLE_UPDATED', 'vehicle', ?, ?, ?, datetime('now'))
      `).bind(user.id, user.username, user.role, current.id, auditDetails, clientIp).run();
    } catch (auditErr) {
      console.warn("Échec d'enregistrement de l'audit log véhicule :", auditErr);
    }

    // 6. Récupération de l'état mis à jour
    const updated = await env.DB.prepare(`
      SELECT 
        id, name, category, category_label AS categoryLabel, price_mad AS priceMad,
        badge, image_url AS imageUrl, availability, is_active AS isActive, updated_at AS updatedAt
      FROM vehicles WHERE id = ?
    `).bind(vehicleId).first();

    return new Response(JSON.stringify({
      success: true,
      message: `Véhicule '${current.name}' mis à jour avec succès.`,
      vehicle: updated
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Erreur interne lors de la mise à jour du véhicule."
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

