// WINON CAR - Mesure d'Audience Anonyme & Conforme RGPD/CNDP
// Zéro cookie tiers, zéro traçage intrusif, exclusion automatique du trafic admin

(function() {
  try {
    // 1. Contrôles d'exclusion
    if (window.location.pathname.startsWith('/admin') || navigator.webdriver) {
      return;
    }
    if (document.cookie && document.cookie.indexOf('winon_session=') !== -1) {
      return;
    }

    // 2. Gestion de la session de visite (Dédoublonnage par onglet/session sans cookie permanent)
    let sid = sessionStorage.getItem('winon_sid');
    let isVisit = false;
    if (!sid) {
      sid = 's_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
      try { sessionStorage.setItem('winon_sid', sid); } catch (e) {}
      isVisit = true;
    }

    // Détection de l'appareil
    const ua = navigator.userAgent || '';
    let deviceType = 'mobile';
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      deviceType = 'tablet';
    } else if (!/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry/i.test(ua)) {
      deviceType = 'desktop';
    }

    const payload = JSON.stringify({
      pagePath: window.location.pathname || '/',
      sessionId: sid,
      referrer: (document.referrer && document.referrer.indexOf(window.location.host) === -1) ? document.referrer : '',
      deviceType: deviceType,
      isVisit: isVisit
    });

    const endpoint = '/api/analytics/visit';

    // 3. Envoi asynchrone non-bloquant via sendBeacon ou fetch
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
    } else if (window.fetch) {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(function() {});
    }
  } catch (err) {
    // Ne jamais bloquer le rendu ou les fonctionnalités du site
  }
})();

