// WINON CAR - Cloudflare Pages Function: /api/admin/reservations
// Consultation et gestion des réservations (Admin & Super Admin)

const VALID_STATUSES = ['en_attente', 'confirmee', 'en_cours', 'terminee', 'annulee'];

/**
 * GET /api/admin/reservations
 * Liste les réservations avec filtres par statut et recherche textuelle
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const user = context.data?.user;

  if (!user) {
    return new Response(JSON.stringify({ success: false, error: "Non autorisé" }), { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    let query = `
      SELECT 
        id, booking_ref AS bookingRef, car_id AS carId, car_name AS carName,
        pickup_city AS pickupCity, pickup_location AS pickupLocation,
        return_city AS returnCity, return_location AS returnLocation,
        pickup_date AS pickupDate, pickup_time AS pickupTime,
        return_date AS returnDate, return_time AS returnTime,
        days, flight_number AS flightNumber, client_name AS clientName,
        client_phone AS clientPhone, client_email AS clientEmail,
        notes, opt_wifi AS optWifi, total_mad AS totalMAD,
        total_eur AS totalEUR, status,
        delivery_fee_status AS deliveryFeeStatus,
        delivery_fee_mad AS deliveryFeeMAD,
        is_read AS isRead,
        client_language AS clientLanguage,
        doc_cin_recto AS docCinRecto,
        doc_cin_verso AS docCinVerso,
        doc_license_recto AS docLicenseRecto,
        doc_license_verso AS docLicenseVerso,
        created_at AS createdAt
      FROM reservations
      WHERE 1=1
    `;
    const params = [];

    if (statusFilter && statusFilter !== 'all' && VALID_STATUSES.includes(statusFilter)) {
      query += ` AND status = ?`;
      params.push(statusFilter);
    }

    if (search && search.trim() !== '') {
      const s = `%${search.trim()}%`;
      query += ` AND (booking_ref LIKE ? OR client_name LIKE ? OR client_phone LIKE ? OR car_name LIKE ?)`;
      params.push(s, s, s, s);
    }

    query += ` ORDER BY id DESC LIMIT 200`;

    const stmt = env.DB.prepare(query);
    const result = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();

    return new Response(JSON.stringify({
      success: true,
      reservations: result.results || [],
      count: (result.results || []).length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Erreur lors de la récupération des réservations."
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * PATCH /api/admin/reservations
 * Met à jour le statut et/ou les notes internes d'un dossier avec traçabilité dans audit_logs
 */
export async function onRequestPatch(context) {
  const { request, env } = context;
  const user = context.data?.user;

  if (!user) {
    return new Response(JSON.stringify({ success: false, error: "Non autorisé" }), { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.id) {
      return new Response(JSON.stringify({ success: false, error: "ID de réservation requis." }), { status: 400 });
    }

    const resId = Number(body.id);
    const newStatus = body.status ? String(body.status) : null;
    const newNotes = body.notes !== undefined ? String(body.notes) : null;

    if (newStatus && !VALID_STATUSES.includes(newStatus)) {
      return new Response(JSON.stringify({
        success: false,
        error: `Statut invalide. Statuts acceptés : ${VALID_STATUSES.join(', ')}`
      }), { status: 400 });
    }

    const DELIVERY_FEE_STATUSES = ['pending_confirmation', 'confirmed', 'unavailable'];
    const newDeliveryFeeStatus = body.deliveryFeeStatus ? String(body.deliveryFeeStatus) : null;
    const newDeliveryFeeMAD = body.deliveryFeeMAD !== undefined ? (body.deliveryFeeMAD === null || body.deliveryFeeMAD === '' ? null : Math.max(0, Number(body.deliveryFeeMAD))) : undefined;
    const newIsRead = body.isRead !== undefined ? (Number(body.isRead) ? 1 : 0) : undefined;

    if (newDeliveryFeeStatus && !DELIVERY_FEE_STATUSES.includes(newDeliveryFeeStatus)) {
      return new Response(JSON.stringify({
        success: false,
        error: `Statut de livraison invalide. Statuts acceptés : ${DELIVERY_FEE_STATUSES.join(', ')}`
      }), { status: 400 });
    }

    // 1. Récupération de l'état actuel pour le journal d'audit
    const current = await env.DB.prepare('SELECT id, booking_ref, status, notes FROM reservations WHERE id = ?').bind(resId).first();
    if (!current) {
      return new Response(JSON.stringify({ success: false, error: "Réservation introuvable." }), { status: 404 });
    }

    // 2. Application de la mise à jour
    const updates = [];
    const updateParams = [];

    if (newStatus) {
      updates.push('status = ?');
      updateParams.push(newStatus);
    }
    if (newNotes !== null) {
      updates.push('notes = ?');
      updateParams.push(newNotes);
    }
    if (newDeliveryFeeStatus) {
      updates.push('delivery_fee_status = ?');
      updateParams.push(newDeliveryFeeStatus);
    }
    if (newDeliveryFeeMAD !== undefined) {
      updates.push('delivery_fee_mad = ?');
      updateParams.push(newDeliveryFeeMAD);
    }
    if (newIsRead !== undefined) {
      updates.push('is_read = ?');
      updateParams.push(newIsRead);
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "Aucune modification demandée." }), { status: 200 });
    }

    updateParams.push(resId);
    await env.DB.prepare(`UPDATE reservations SET ${updates.join(', ')} WHERE id = ?`).bind(...updateParams).run();

    // 3. Traçabilité automatique dans audit_logs
    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'local';
    const auditDetails = JSON.stringify({
      bookingRef: current.booking_ref,
      oldStatus: current.status,
      newStatus: newStatus || current.status,
      notesUpdated: newNotes !== null,
      deliveryFeeStatusUpdated: !!newDeliveryFeeStatus,
      deliveryFeeMADUpdated: newDeliveryFeeMAD !== undefined,
      isReadUpdated: newIsRead !== undefined
    });

    try {
      await env.DB.prepare(`
        INSERT INTO audit_logs (user_id, username, role, action, entity_type, entity_id, details, ip_address)
        VALUES (?, ?, ?, 'RESERVATION_UPDATED', 'reservation', ?, ?, ?)
      `).bind(user.id, user.username, user.role, String(resId), auditDetails, clientIp).run();
    } catch (auditErr) {
      console.warn("Échec d'insertion audit log :", auditErr);
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Dossier mis à jour avec succès."
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Erreur interne lors de la mise à jour."
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

