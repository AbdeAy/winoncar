// WINON CAR - Cloudflare Pages Function: /api/reservations
// Gère l'enregistrement des réservations dans Cloudflare D1

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const data = await request.json();

    // 1. Validation des champs obligatoires
    const required = [
      'bookingRef',
      'carId',
      'carName',
      'pickupLocation',
      'pickupDate',
      'pickupTime',
      'returnDate',
      'returnTime',
      'clientName',
      'clientPhone',
      'totalMAD'
    ];

    for (const field of required) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Le champ obligatoire suivant est manquant : ${field}` 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 2. Vérification de la liaison D1 (Binding)
    if (!env.DB) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Liaison de base de données non disponible (binding env.DB absent)." 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Détermination des villes et valeurs par défaut Stage 2 & Phase 3
    const pickupCity = data.pickupCity ? String(data.pickupCity).trim() : 'Agadir';
    const returnCity = data.returnCity ? String(data.returnCity).trim() : pickupCity;
    const pickupLocation = String(data.pickupLocation);
    const returnLocation = String(data.returnLocation || data.pickupLocation);

    // Langue choisie par le client ('fr', 'en', 'ar')
    const validLanguages = ['fr', 'en', 'ar'];
    const clientLanguage = data.clientLanguage && validLanguages.includes(String(data.clientLanguage).toLowerCase().trim())
      ? String(data.clientLanguage).toLowerCase().trim()
      : 'fr';

    // Documents d'identité optionnels (CIN & Permis compressés côté client < 150 Ko)
    const validateDoc = (doc) => {
      if (!doc || typeof doc !== 'string') return null;
      const trimmed = doc.trim();
      if (!trimmed.startsWith('data:image/')) return null;
      // Garde-fou taille maximale (350 Ko de base64 max)
      if (trimmed.length > 350000) return null;
      return trimmed;
    };

    const docCinRecto = validateDoc(data.docCinRecto);
    const docCinVerso = validateDoc(data.docCinVerso);
    const docLicenseRecto = validateDoc(data.docLicenseRecto);
    const docLicenseVerso = validateDoc(data.docLicenseVerso);

    // 4. Insertion sécurisée via requête préparée paramétrée
    const stmt = env.DB.prepare(`
      INSERT INTO reservations (
        booking_ref, car_id, car_name, pickup_location, return_location,
        pickup_date, pickup_time, return_date, return_time, days,
        flight_number, client_name, client_phone, client_email, notes,
        opt_wifi, total_mad, total_eur, status,
        pickup_city, return_city, delivery_fee_status, delivery_fee_mad, is_read,
        client_language, doc_cin_recto, doc_cin_verso, doc_license_recto, doc_license_verso
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt.bind(
      String(data.bookingRef),
      String(data.carId),
      String(data.carName),
      pickupLocation,
      returnLocation,
      String(data.pickupDate),
      String(data.pickupTime),
      String(data.returnDate),
      String(data.returnTime),
      Number(data.days) || 1,
      data.flightNumber ? String(data.flightNumber) : null,
      String(data.clientName),
      String(data.clientPhone),
      data.clientEmail ? String(data.clientEmail) : null,
      data.notes ? String(data.notes) : null,
      data.optWifi ? 1 : 0,
      Number(data.totalMAD),
      Number(data.totalEUR) || Math.round(Number(data.totalMAD) / 10.8),
      'en_attente',
      pickupCity,
      returnCity,
      'pending_confirmation',
      null,
      0,
      clientLanguage,
      docCinRecto,
      docCinVerso,
      docLicenseRecto,
      docLicenseVerso
    ).run();

    return new Response(JSON.stringify({
      success: true,
      bookingRef: data.bookingRef,
      message: "Réservation enregistrée avec succès dans Cloudflare D1"
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message || "Erreur interne lors de l'enregistrement de la réservation" 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestGet(context) {
  const { env } = context;
  
  let dbStatus = "non_lie";
  let count = 0;
  
  if (env && env.DB) {
    try {
      const res = await env.DB.prepare("SELECT count(*) as total FROM reservations").first();
      dbStatus = "connecte";
      count = res ? res.total : 0;
    } catch (e) {
      dbStatus = "erreur: " + e.message;
    }
  }

  return new Response(JSON.stringify({
    service: "WINON CAR API",
    status: "operationnel",
    database: dbStatus,
    reservationsCount: count,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

