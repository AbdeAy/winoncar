// WINON CAR - Cloudflare Pages Function: /api/analytics/visit
// Mesure d'audience respectueuse de la vie privée (RGPD & CNDP : aucun stockage d'IP brute)
// Exclusion stricte du trafic administrateur (cookie winon_session) et des robots

function toHex(buffer) {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

async function computeDailyVisitorHash(ip, userAgent, dateStr) {
  const salt = 'winon-car-salt-2026';
  const rawString = `${ip}|${userAgent}|${dateStr}|${salt}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(rawString);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  return toHex(hashBuffer);
}

function detectDevice(userAgent) {
  if (!userAgent) return 'mobile';
  const ua = userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

function isBot(userAgent) {
  if (!userAgent) return false;
  return /bot|crawler|spider|crawling|lighthouse|headless|curl|wget|python-requests/i.test(userAgent);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    if (!env.DB) {
      return new Response(null, { status: 204 });
    }

    const userAgent = request.headers.get('User-Agent') || '';
    if (isBot(userAgent)) {
      return new Response(null, { status: 204 });
    }

    // 1. Exclusion du trafic d'administration (Vérification présence session admin)
    const cookieHeader = request.headers.get('Cookie') || '';
    if (cookieHeader.includes('winon_session=')) {
      // Détecte si la session est active dans la base D1
      const match = cookieHeader.match(/winon_session=([^;]+)/);
      if (match && match[1]) {
        try {
          const rawToken = match[1].trim();
          const encoder = new TextEncoder();
          const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(rawToken));
          const tokenHash = toHex(hashBuffer);

          const activeSession = await env.DB.prepare(`
            SELECT id FROM sessions WHERE token_hash = ? AND expires_at > datetime('now') LIMIT 1
          `).bind(tokenHash).first();

          if (activeSession) {
            // Requête provenant d'un administrateur authentifié -> Exclure des statistiques publiques
            return new Response(null, { status: 204 });
          }
        } catch {
          // Si vérification échoue, continuer sans bloquer
        }
      }
    }

    // 2. Extraction du payload envoyé par le navigateur
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    let pagePath = typeof body.pagePath === 'string' ? body.pagePath.trim() : '/';
    if (!pagePath || pagePath.length > 255) pagePath = '/';

    // Exclusion des URL d'administration
    if (pagePath.startsWith('/admin') || pagePath.startsWith('/api/admin')) {
      return new Response(null, { status: 204 });
    }

    const sessionId = (typeof body.sessionId === 'string' && body.sessionId.length <= 64)
      ? body.sessionId.trim()
      : (globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).substring(2, 15));

    const referrer = typeof body.referrer === 'string' ? body.referrer.slice(0, 255) : null;
    const deviceType = (body.deviceType && ['mobile', 'desktop', 'tablet'].includes(body.deviceType))
      ? body.deviceType
      : detectDevice(userAgent);

    const isVisit = body.isVisit === false ? 0 : 1;

    // 3. Calcul de l'empreinte pseudonymisée du visiteur pour la journée
    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const todayStr = new Date().toISOString().slice(0, 10);
    const visitorHash = await computeDailyVisitorHash(clientIp, userAgent, todayStr);

    // 4. Insertion dans la base D1
    await env.DB.prepare(`
      INSERT INTO site_visits (visitor_hash, session_id, page_path, referrer, device_type, is_visit)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(visitorHash, sessionId, pagePath, referrer, deviceType, isVisit).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    // Les pannes de télémétrie ne doivent JAMAIS perturber l'expérience utilisateur
    console.warn("Erreur télémétrie de visite :", error);
    return new Response(null, { status: 204 });
  }
}

