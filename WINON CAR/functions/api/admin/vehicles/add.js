// WINON CAR - Cloudflare Pages Function: /api/admin/vehicles/add
// Ajout d'un nouveau véhicule dans la flotte (Admin & Super Admin)

const CATEGORY_LABELS = {
  eco: 'Citadine Économique',
  berline: 'Berline Confort',
  suv: 'SUV Tout-Chemin',
  luxe: 'Prestige VIP'
};

const VALID_AVAILABILITY = ['disponible', 'loue', 'maintenance'];

export async function onRequestPost(context) {
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
    if (!body || !body.name || !body.priceMad) {
      return new Response(JSON.stringify({
        success: false,
        error: "Nom du véhicule et tarif journalier (en MAD) obligatoires."
      }), { status: 400 });
    }

    const name = String(body.name).trim();
    const priceMad = Number(body.priceMad);
    const category = body.category ? String(body.category).trim().toLowerCase() : 'eco';
    const categoryLabel = body.categoryLabel || CATEGORY_LABELS[category] || 'Véhicule de Tourisme';
    const availability = body.availability && VALID_AVAILABILITY.includes(body.availability) ? body.availability : 'disponible';
    const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : 'assets/cars/dacia-sandero-stepway.jpg';
    const badge = body.badge ? String(body.badge).trim() : 'Nouveau';
    const gearbox = body.gearbox ? String(body.gearbox).trim() : 'Automatique';
    const fuel = body.fuel ? String(body.fuel).trim() : 'Diesel';
    const seats = body.seats ? String(body.seats).trim() : '5 Places';
    const ac = body.ac ? String(body.ac).trim() : 'Climatisation A/C';
    const bags = body.bags ? String(body.bags).trim() : '3 Valises';
    const doors = body.doors ? String(body.doors).trim() : '5 Portes';
    const description = body.description ? String(body.description).trim() : `${name} disponible à la location chez WINON CAR Agadir.`;

    if (isNaN(priceMad) || priceMad <= 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "Le tarif journalier doit être un nombre strictement supérieur à 0 MAD."
      }), { status: 400 });
    }

    // Génération d'un identifiant slug unique
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const uniqueSuffix = Date.now().toString(36).slice(-4);
    const vehicleId = `${baseSlug}-${uniqueSuffix}`;

    // Récupération de l'ordre d'affichage maximal
    const maxOrderRow = await env.DB.prepare('SELECT MAX(display_order) AS max_order FROM vehicles').first();
    const nextOrder = (maxOrderRow?.max_order || 0) + 1;

    // Insertion du véhicule dans la base Cloudflare D1
    await env.DB.prepare(`
      INSERT INTO vehicles (
        id, name, category, category_label, price_mad, badge, image_url,
        gearbox, fuel, seats, ac, bags, doors, description,
        availability, is_active, display_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'))
    `).bind(
      vehicleId, name, category, categoryLabel, priceMad, badge, imageUrl,
      gearbox, fuel, seats, ac, bags, doors, description,
      availability, nextOrder
    ).run();

    // Journalisation automatique dans audit_logs
    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'local';
    const auditDetails = JSON.stringify({
      vehicleId,
      name,
      category,
      priceMad,
      availability
    });

    try {
      await env.DB.prepare(`
        INSERT INTO audit_logs (user_id, username, role, action, entity_type, entity_id, details, ip_address, created_at)
        VALUES (?, ?, ?, 'VEHICLE_CREATED', 'vehicle', ?, ?, ?, datetime('now'))
      `).bind(user.id, user.username, user.role, vehicleId, auditDetails, clientIp).run();
    } catch (auditErr) {
      console.warn("Échec d'insertion audit log véhicule :", auditErr);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Véhicule '${name}' ajouté avec succès à la flotte WINON CAR.`,
      vehicle: {
        id: vehicleId,
        name,
        category,
        categoryLabel,
        priceMad,
        imageUrl,
        availability,
        badge
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Erreur interne lors de l'ajout du véhicule."
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

