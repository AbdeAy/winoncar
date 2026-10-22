// WINON CAR — Reservation page (4-step booking funnel).
// Vanilla JS, no framework/bundler. Reuses the existing public APIs:
//   GET  /api/vehicles       -> vehicle catalogue (Cloudflare D1)
//   POST /api/reservations   -> saves a pending request (status "en_attente")
// Pricing + payload mirror the landing page exactly (assets/js/landing.js).

(function () {
  'use strict';

  // ---- Constants (identical to the landing page business rules) ----
  const MAD_TO_EUR_RATE = 10.8;
  const WIFI_DAILY_MAD = 30;        // optWifi add-on
  const LONG_TERM_DAYS = 7;         // >= 7 days -> discount
  const LONG_TERM_RATE = 0.10;      // 10%
  const WA_NUMBER = '212604707847';

  // ---- Static location reference data (UI only — no API dependency) ----
  const MOROCCAN_LOCATIONS = {
    agadir: { label: 'Agadir', locations: [
      { label: 'Aéroport Agadir Al-Massira (AGA)', isAirport: true },
      { label: 'Centre-ville Agadir' },
      { label: "Marina d'Agadir" },
      { label: 'Hôtel / Résidence à Agadir' },
      { label: 'Taghazout / Taghazout Bay' },
      { label: 'Imi Ouaddar / Paradis Plage' },
      { label: 'Autre adresse à Agadir (à préciser)', isCustom: true } ] },
    marrakech: { label: 'Marrakech', locations: [
      { label: 'Aéroport Marrakech-Ménara (RAK)', isAirport: true },
      { label: 'Centre-ville / Guéliz / Hivernage' },
      { label: 'Gare ONCF Marrakech' },
      { label: 'Hôtel / Riad à Marrakech' },
      { label: 'Autre adresse à Marrakech (à préciser)', isCustom: true } ] },
    casablanca: { label: 'Casablanca', locations: [
      { label: 'Aéroport Mohammed V (CMN)', isAirport: true },
      { label: 'Centre-ville / Maarif / Gauthier' },
      { label: 'Gare Casa-Voyageurs / Casa-Port' },
      { label: 'Hôtel à Casablanca' },
      { label: 'Autre adresse à Casablanca (à préciser)', isCustom: true } ] },
    rabat: { label: 'Rabat', locations: [
      { label: 'Aéroport Rabat-Salé (RBA)', isAirport: true },
      { label: 'Centre-ville / Agdal / Hassan' },
      { label: 'Gare Rabat-Ville / Rabat-Agdal' },
      { label: 'Autre adresse à Rabat (à préciser)', isCustom: true } ] },
    tanger: { label: 'Tanger', locations: [
      { label: 'Aéroport Tanger Ibn Battouta (TNG)', isAirport: true },
      { label: 'Centre-ville / Malabata' },
      { label: 'Port Tanger Ville / Tanger Med' },
      { label: 'Autre adresse à Tanger (à préciser)', isCustom: true } ] },
    essaouira: { label: 'Essaouira', locations: [
      { label: 'Aéroport Essaouira-Mogador (ESU)', isAirport: true },
      { label: 'Centre-ville / Médina / Port' },
      { label: 'Autre adresse à Essaouira (à préciser)', isCustom: true } ] },
    ouarzazate: { label: 'Ouarzazate', locations: [
      { label: 'Aéroport Ouarzazate (OZZ)', isAirport: true },
      { label: 'Centre-ville / Hôtels' },
      { label: 'Autre adresse à Ouarzazate (à préciser)', isCustom: true } ] },
    fes: { label: 'Fès', locations: [
      { label: 'Aéroport Fès-Saïss (FEZ)', isAirport: true },
      { label: 'Centre-ville / Ville Nouvelle' },
      { label: 'Autre adresse à Fès (à préciser)', isCustom: true } ] },
    autre_ville: { label: 'Autre ville au Maroc', locations: [
      { label: 'Adresse complète de livraison (à préciser)', isCustom: true } ] }
  };

  // =====================================================================
  //  PURE HELPERS (unit-tested in Node — see tools/reservation.test.mjs)
  // =====================================================================

  // Whole rental days from two YYYY-MM-DD strings (date-only, min 1).
  function calcDays(pickupDate, returnDate) {
    if (!pickupDate || !returnDate) return 1;
    const d1 = new Date(pickupDate), d2 = new Date(returnDate);
    if (isNaN(d1) || isNaN(d2)) return 1;
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / 86400000);
    return diff > 0 ? diff : 1;
  }

  // Price breakdown — mirrors landing.js updateBookingCalculation().
  function calcPricing(priceMAD, days, optWifi) {
    priceMAD = Number(priceMAD) || 0;
    days = Number(days) || 1;
    const subtotal = days * priceMAD;
    const discounted = days >= LONG_TERM_DAYS;
    const discountMAD = discounted ? Math.round(subtotal * LONG_TERM_RATE) : 0;
    const extrasMAD = (optWifi ? WIFI_DAILY_MAD : 0) * days;
    const totalMAD = (subtotal - discountMAD) + extrasMAD;
    const totalEUR = Math.round(totalMAD / MAD_TO_EUR_RATE);
    return { subtotal, discounted, discountMAD, extrasMAD, totalMAD, totalEUR };
  }

  // Phone: exactly 10 digits, no letters (matches server contract).
  function validatePhone(raw) {
    if (/[a-zA-Z\u0600-\u06FF]/.test(raw || '')) return false;
    return (String(raw || '').replace(/\D/g, '')).length === 10;
  }

  function validateEmail(raw) {
    if (!raw) return true; // optional
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(raw.trim()) && raw.trim().length <= 120;
  }

  // Flight number: optional; if present, 2–8 alphanumerics (lenient for real airline codes).
  function validateFlight(raw) {
    if (!raw || !raw.trim()) return true;
    return /^[A-Za-z0-9 ]{2,8}$/.test(raw.trim());
  }

  // Return datetime strictly after pickup datetime.
  function datesValid(pDate, pTime, rDate, rTime) {
    if (!pDate || !rDate) return false;
    const start = new Date(`${pDate}T${pTime || '10:00'}`);
    const end = new Date(`${rDate}T${rTime || '10:00'}`);
    if (isNaN(start) || isNaN(end)) return false;
    return end > start;
  }

  // Car image URLs from the API are root-relative ("assets/cars/x.jpg").
  // This page lives in /reservation/, so prefix with ../ when needed.
  function normalizeImg(url) {
    if (!url) return '../assets/cars/dacia-sandero-stepway.jpg';
    if (/^https?:\/\//.test(url) || url.startsWith('/') || url.startsWith('../')) return url;
    return '../' + url;
  }

  // Build the exact POST /api/reservations payload.
  function buildPayload(state) {
    const car = state.car || {};
    const days = calcDays(state.pickupDate, state.returnDate);
    const p = calcPricing(car.priceMAD, days, state.optWifi);
    return {
      bookingRef: state.bookingRef,
      carId: car.id,
      carName: car.name,
      pickupCity: state.cityLabel,
      pickupLocation: state.pickupLocation,
      returnCity: state.cityLabel,
      returnLocation: state.pickupLocation,
      pickupDate: state.pickupDate,
      pickupTime: state.pickupTime || '10:00',
      returnDate: state.returnDate,
      returnTime: state.returnTime || '10:00',
      days: days,
      flightNumber: (state.flightNumber || '').trim() || null,
      clientName: (state.clientName || '').trim(),
      clientPhone: (state.clientPhone || '').replace(/\D/g, ''),
      clientEmail: (state.clientEmail || '').trim() || null,
      notes: (state.notes || '').trim() || null,
      optWifi: !!state.optWifi,
      totalMAD: p.totalMAD,
      totalEUR: p.totalEUR,
      clientLanguage: state.lang || 'fr'
    };
  }

  // Export pure helpers for Node testing; no-op in the browser.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calcDays, calcPricing, validatePhone, validateEmail, validateFlight, datesValid, normalizeImg, buildPayload, MOROCCAN_LOCATIONS };
    return;
  }

  // =====================================================================
  //  BROWSER APP
  // =====================================================================
  const $ = (id) => document.getElementById(id);
  const state = {
    lang: (function () { try { return localStorage.getItem('winon_lang') || 'fr'; } catch (e) { return 'fr'; } })(),
    bookingRef: 'WN-' + Math.floor(1000 + Math.random() * 9000),
    cityKey: 'agadir', cityLabel: 'Agadir',
    pickupLocation: '', isAirport: false, flightNumber: '',
    pickupDate: '', pickupTime: '10:00', returnDate: '', returnTime: '10:00',
    car: null, optWifi: false,
    clientName: '', clientPhone: '', clientEmail: '', notes: '',
    step: 1, vehicles: [], vehiclesLoaded: false, submitting: false, submitted: false
  };

  const TOTAL_STEPS = 4;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    buildCitySelect();
    onCityChange();                 // populates locations for default city
    setDefaultDates();
    bindEvents();
    renderStep();
    renderSummary();
  }

  // ---------- Step 1: locations & dates ----------
  function buildCitySelect() {
    const sel = $('r-city');
    sel.innerHTML = '';
    Object.keys(MOROCCAN_LOCATIONS).forEach(key => {
      const o = document.createElement('option');
      o.value = key; o.textContent = MOROCCAN_LOCATIONS[key].label;
      if (key === state.cityKey) o.selected = true;
      sel.appendChild(o);
    });
  }

  function onCityChange() {
    state.cityKey = $('r-city').value;
    state.cityLabel = MOROCCAN_LOCATIONS[state.cityKey].label;
    const locSel = $('r-location');
    locSel.innerHTML = '';
    MOROCCAN_LOCATIONS[state.cityKey].locations.forEach((loc, i) => {
      const o = document.createElement('option');
      o.value = loc.label; o.textContent = loc.label;
      if (loc.isAirport) o.dataset.airport = '1';
      if (loc.isCustom) o.dataset.custom = '1';
      if (i === 0) o.selected = true;
      locSel.appendChild(o);
    });
    onLocationChange();
  }

  function onLocationChange() {
    const locSel = $('r-location');
    const opt = locSel.options[locSel.selectedIndex];
    const isCustom = opt && opt.dataset.custom === '1';
    state.isAirport = !!(opt && opt.dataset.airport === '1');
    $('r-custom-wrap').classList.toggle('hidden', !isCustom);
    $('r-flight-wrap').classList.toggle('hidden', !state.isAirport);
    syncLocationValue();
    renderSummary();
  }

  function syncLocationValue() {
    const locSel = $('r-location');
    const opt = locSel.options[locSel.selectedIndex];
    if (opt && opt.dataset.custom === '1') {
      state.pickupLocation = ($('r-custom').value || '').trim();
    } else {
      state.pickupLocation = locSel.value;
    }
  }

  function setDefaultDates() {
    const today = new Date();
    const inThree = new Date(today.getTime() + 3 * 86400000);
    const iso = (d) => d.toISOString().slice(0, 10);
    $('r-pickup-date').min = iso(today);
    $('r-pickup-date').value = iso(today);
    $('r-return-date').min = iso(today);
    $('r-return-date').value = iso(inThree);
    state.pickupDate = iso(today);
    state.returnDate = iso(inThree);
  }

  // ---------- Events ----------
  function bindEvents() {
    $('r-city').addEventListener('change', onCityChange);
    $('r-location').addEventListener('change', onLocationChange);
    $('r-custom').addEventListener('input', () => { syncLocationValue(); clearError('r-location'); renderSummary(); });
    $('r-flight').addEventListener('input', (e) => { state.flightNumber = e.target.value; });

    $('r-pickup-date').addEventListener('change', (e) => {
      state.pickupDate = e.target.value;
      $('r-return-date').min = e.target.value;
      if (state.returnDate && state.returnDate < e.target.value) { state.returnDate = e.target.value; $('r-return-date').value = e.target.value; }
      renderSummary();
    });
    $('r-pickup-time').addEventListener('change', (e) => { state.pickupTime = e.target.value; renderSummary(); });
    $('r-return-date').addEventListener('change', (e) => { state.returnDate = e.target.value; renderSummary(); });
    $('r-return-time').addEventListener('change', (e) => { state.returnTime = e.target.value; renderSummary(); });

    $('r-name').addEventListener('input', (e) => { state.clientName = e.target.value; clearError('r-name'); });
    $('r-phone').addEventListener('input', (e) => { state.clientPhone = e.target.value; clearError('r-phone'); });
    $('r-email').addEventListener('input', (e) => { state.clientEmail = e.target.value; clearError('r-email'); });
    $('r-notes').addEventListener('input', (e) => { state.notes = e.target.value.slice(0, 500); $('r-notes-count').textContent = state.notes.length; });
    $('r-wifi').addEventListener('change', (e) => { state.optWifi = e.target.checked; renderSummary(); });

    $('r-back').addEventListener('click', goBack);
    $('r-next').addEventListener('click', goNext);
    $('r-retry-vehicles').addEventListener('click', loadVehicles);
    $('r-submit').addEventListener('click', submitReservation);
  }

  // ---------- Navigation ----------
  function goBack() {
    if (state.step > 1) { state.step--; renderStep(); }
  }

  function goNext() {
    if (!validateStep(state.step)) return;
    if (state.step < TOTAL_STEPS) { state.step++; renderStep(); }
  }

  function validateStep(step) {
    if (step === 1) {
      let ok = true;
      syncLocationValue();
      if (!state.pickupLocation) { setError('r-location', 'Veuillez préciser le lieu de prise en charge.'); ok = false; }
      if (!validateFlight($('r-flight').value)) { setError('r-flight', "Format de numéro de vol invalide (ex. AT452)."); ok = false; } else { clearError('r-flight'); }
      if (!datesValid(state.pickupDate, state.pickupTime, state.returnDate, state.returnTime)) {
        setError('r-return-date', 'La date/heure de retour doit être postérieure à la prise en charge.'); ok = false;
      } else { clearError('r-return-date'); }
      return ok;
    }
    if (step === 2) {
      if (!state.car) { $('r-vehicle-error').textContent = 'Veuillez sélectionner un véhicule disponible pour continuer.'; $('r-vehicle-error').classList.add('show'); return false; }
      $('r-vehicle-error').classList.remove('show');
      return true;
    }
    if (step === 3) {
      let ok = true;
      const name = (state.clientName || '').trim();
      if (name.length < 2 || name.length > 100) { setError('r-name', 'Nom complet requis (au moins 2 caractères).'); ok = false; }
      if (!validatePhone(state.clientPhone)) { setError('r-phone', 'Numéro invalide : exactement 10 chiffres (ex. 0612345678).'); ok = false; }
      if (!validateEmail(state.clientEmail)) { setError('r-email', "Format d'adresse email invalide."); ok = false; }
      return ok;
    }
    return true;
  }

  function renderStep() {
    document.querySelectorAll('.res-step').forEach(s => s.classList.toggle('active', Number(s.dataset.step) === state.step));
    // Stepper visuals
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const dot = $('dot-' + i), label = $('label-' + i), line = $('line-' + i);
      const st = i < state.step ? 'done' : (i === state.step ? 'current' : 'todo');
      if (dot) { dot.dataset.state = st; dot.innerHTML = st === 'done' ? '<i class="fa-solid fa-check"></i>' : i; dot.setAttribute('aria-current', i === state.step ? 'step' : 'false'); }
      if (label) label.dataset.state = st;
      if (line && i < TOTAL_STEPS) line.dataset.state = i < state.step ? 'done' : 'todo';
    }
    $('r-step-count').textContent = `Étape ${state.step} sur ${TOTAL_STEPS}`;
    // Footer buttons
    $('r-back').classList.toggle('invisible', state.step === 1);
    $('r-next').classList.toggle('hidden', state.step === TOTAL_STEPS);
    $('r-submit').classList.toggle('hidden', state.step !== TOTAL_STEPS);
    const nextLabels = { 1: 'Continuer vers le véhicule', 2: 'Continuer vers vos infos', 3: 'Vérifier ma demande' };
    $('r-next-label').textContent = nextLabels[state.step] || 'Continuer';

    if (state.step === 2 && !state.vehiclesLoaded) loadVehicles();
    if (state.step === 4) renderReview();

    // Move focus to the step heading for screen-reader users
    const heading = document.querySelector('.res-step.active [data-step-heading]');
    if (heading) heading.setAttribute('tabindex', '-1'), heading.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    renderSummary();
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ---------- Step 2: vehicles ----------
  async function loadVehicles() {
    const box = $('r-vehicles');
    setVehiclesState('loading');
    $('r-next').disabled = true;
    try {
      const res = await fetch('/api/vehicles', { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const list = (data && data.success && Array.isArray(data.vehicles)) ? data.vehicles : [];
      state.vehicles = list.map(v => ({
        id: String(v.id), name: v.name,
        priceMAD: Number(v.priceMad || v.priceMAD || 0),
        categoryLabel: v.categoryLabel || v.category || '',
        badge: v.badge || '',
        image: normalizeImg(v.imageUrl || v.image),
        seats: v.seats || '5 Places', bags: v.bags || '2 Valises',
        gearbox: v.gearbox || 'Manuelle', fuel: v.fuel || 'Diesel', ac: v.ac || 'Climatisation',
        availability: v.availability || 'disponible'
      }));
      state.vehiclesLoaded = true;
      if (state.vehicles.length === 0) { setVehiclesState('empty'); return; }
      renderVehicles();
      setVehiclesState('grid');
    } catch (err) {
      console.warn('[WINON CAR] /api/vehicles failed:', err);
      setVehiclesState('error');
    } finally {
      $('r-next').disabled = false;
    }
  }

  function setVehiclesState(mode) {
    ['loading', 'empty', 'error', 'grid'].forEach(m => $('r-vehicles-' + m).classList.toggle('hidden', m !== mode));
    $('r-next').disabled = (mode === 'loading');
  }

  function renderVehicles() {
    const grid = $('r-vehicles-grid');
    grid.innerHTML = '';
    state.vehicles.forEach(car => {
      const available = car.availability === 'disponible';
      const eur = Math.round(car.priceMAD / MAD_TO_EUR_RATE);
      const el = document.createElement('div');
      el.className = 'veh-card' + (available ? '' : ' is-unavailable');
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', available ? '0' : '-1');
      el.setAttribute('aria-pressed', state.car && state.car.id === car.id ? 'true' : 'false');
      el.innerHTML =
        `<div class="veh-check"><i class="fa-solid fa-check"></i></div>
         <div class="h-36 bg-slate-100 overflow-hidden flex items-center justify-center">
           <img src="${car.image}" alt="${escapeHtml(car.name)}" class="w-full h-full object-cover" loading="lazy"
                onerror="this.onerror=null;this.src='../assets/cars/dacia-sandero-stepway.jpg';">
         </div>
         <div class="p-4">
           <div class="flex items-center justify-between gap-2">
             <h4 class="font-extrabold text-brand-dark leading-tight">${escapeHtml(car.name)}</h4>
             ${car.badge ? `<span class="text-[10px] font-extrabold uppercase bg-brand-goldLight text-brand-goldHover px-2 py-0.5 rounded-full">${escapeHtml(car.badge)}</span>` : ''}
           </div>
           <p class="text-xs text-slate-500 mt-1">${escapeHtml(car.seats)} · ${escapeHtml(car.bags)} · ${escapeHtml(car.ac)}</p>
           <div class="mt-3 flex items-end justify-between">
             <div><span class="text-lg font-black text-brand-dark">${car.priceMAD} MAD</span><span class="text-xs text-slate-500"> / jour (~${eur} €)</span></div>
             ${available ? '' : '<span class="text-[11px] font-bold text-amber-700">Non disponible</span>'}
           </div>
         </div>`;
      if (available) {
        el.addEventListener('click', () => selectCar(car.id));
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCar(car.id); } });
      }
      grid.appendChild(el);
    });
  }

  function selectCar(id) {
    state.car = state.vehicles.find(c => c.id === id) || null;
    $('r-vehicle-error').classList.remove('show');
    document.querySelectorAll('#r-vehicles-grid .veh-card').forEach(c => c.setAttribute('aria-pressed', 'false'));
    renderVehicles(); // refresh pressed state
    renderSummary();
  }

  // ---------- Step 4: review + summary ----------
  function renderReview() {
    const days = calcDays(state.pickupDate, state.returnDate);
    const car = state.car || {};
    const p = calcPricing(car.priceMAD, days, state.optWifi);
    const rows = [
      ['Ville de départ', state.cityLabel],
      ['Prise en charge', state.pickupLocation],
      ['Dates', `${fmtDate(state.pickupDate)} ${state.pickupTime} → ${fmtDate(state.returnDate)} ${state.returnTime}`],
      ['Durée', `${days} jour${days > 1 ? 's' : ''}`],
      ['Véhicule', car.name || '—'],
      ['Options', state.optWifi ? 'Boîtier Wi-Fi 4G (+30 MAD/j)' : 'Aucune'],
      ['Vol', (state.flightNumber || '').trim() || '—'],
      ['Client', `${(state.clientName || '').trim()} · ${(state.clientPhone || '').replace(/\D/g, '')}`],
      ['Email', (state.clientEmail || '').trim() || '—'],
      ['Demandes', (state.notes || '').trim() || '—']
    ];
    $('r-review').innerHTML = rows.map(([k, v]) =>
      `<div class="flex justify-between gap-4 py-2 border-b border-slate-100 text-sm">
         <span class="text-slate-500">${k}</span><span class="font-semibold text-slate-800 text-right">${escapeHtml(String(v))}</span></div>`).join('') +
      `<div class="flex justify-between gap-4 pt-3 text-base"><span class="font-bold text-slate-700">Total estimé</span>
         <strong class="text-brand-dark">${p.totalMAD.toLocaleString('fr-FR')} MAD <span class="text-slate-400 text-sm">(~${p.totalEUR} €)</span></strong></div>`;
  }

  function renderSummary() {
    const car = state.car;
    $('s-city').textContent = state.cityLabel || '—';
    $('s-location').textContent = state.pickupLocation || 'À préciser';
    $('s-dates').textContent = (state.pickupDate && state.returnDate)
      ? `${fmtDate(state.pickupDate)} – ${fmtDate(state.returnDate)}` : '—';
    const days = calcDays(state.pickupDate, state.returnDate);
    $('s-duration').textContent = (state.pickupDate && state.returnDate) ? `${days} jour${days > 1 ? 's' : ''}` : '';
    if (car) {
      $('s-car-wrap').classList.remove('hidden');
      $('s-car-img').src = car.image;
      $('s-car-name').textContent = car.name;
      $('s-car-price').textContent = `${car.priceMAD} MAD / jour`;
      const p = calcPricing(car.priceMAD, days, state.optWifi);
      $('s-price-box').innerHTML =
        `<div class="flex items-center gap-2 text-brand-dark"><i class="fa-solid fa-coins text-brand-gold"></i>
           <span class="font-black text-lg">${p.totalMAD.toLocaleString('fr-FR')} MAD</span>
           <span class="text-slate-400 text-sm">(~${p.totalEUR} €)</span></div>
         <p class="text-xs text-slate-500 mt-0.5">${days} jour${days > 1 ? 's' : ''}${state.optWifi ? ' · Wi-Fi inclus' : ''}${p.discounted ? ' · remise -10%' : ''}</p>`;
    } else {
      $('s-car-wrap').classList.add('hidden');
      $('s-price-box').innerHTML =
        `<div class="flex items-center gap-2 text-emerald-700"><i class="fa-solid fa-coins"></i>
           <span class="font-bold">Prix calculé à l'étape suivante</span></div>`;
    }
  }

  // ---------- Submit ----------
  async function submitReservation() {
    if (state.submitting || state.submitted) return;
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      showResult('error', 'Certaines informations sont incomplètes. Revenez en arrière pour les corriger.');
      return;
    }
    state.submitting = true;
    setSubmitBusy(true);
    const payload = buildPayload(state);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok && result.success) {
        state.submitted = true;
        showSuccess(payload.bookingRef);
      } else {
        showResult('error', (result && result.error) ? result.error : "Échec de l'enregistrement. Vous pouvez réessayer ou nous écrire sur WhatsApp.");
        setSubmitBusy(false);
      }
    } catch (err) {
      console.warn('[WINON CAR] reservation submit failed:', err);
      showResult('error', "Connexion indisponible. Réessayez ou envoyez votre demande directement sur WhatsApp — vos informations sont conservées.");
      setSubmitBusy(false);
    } finally {
      state.submitting = false;
    }
  }

  function setSubmitBusy(busy) {
    const btn = $('r-submit');
    btn.disabled = busy;
    btn.innerHTML = busy
      ? '<i class="fa-solid fa-spinner fa-spin"></i> Envoi en cours…'
      : '<i class="fa-brands fa-whatsapp"></i> Envoyer ma demande';
  }

  function showSuccess(ref) {
    $('r-submit').classList.add('hidden');
    $('r-back').classList.add('hidden');
    const wa = waLink(ref);
    showResult('success',
      `<div class="text-center">
         <div class="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl"><i class="fa-solid fa-check"></i></div>
         <h3 class="mt-3 text-lg font-black text-brand-dark">Demande enregistrée — réf. ${escapeHtml(ref)}</h3>
         <p class="mt-1 text-sm text-slate-600">Votre demande est enregistrée (statut : en attente). Un membre de l'équipe WINON CAR vous répondra rapidement. Pour accélérer, confirmez directement sur WhatsApp.</p>
         <a href="${wa}" target="_blank" rel="noopener noreferrer" class="mt-4 inline-flex items-center gap-2 bg-brand-whatsapp hover:bg-brand-whatsappHover text-white px-6 py-3 rounded-xl font-bold shadow"><i class="fa-brands fa-whatsapp text-lg"></i> Confirmer sur WhatsApp</a>
         <div class="mt-3"><a href="../" class="text-sm font-semibold text-slate-500 hover:text-brand-gold">Retour à l'accueil</a></div>
       </div>`, true);
  }

  function showResult(type, html, isHtml) {
    const box = $('r-result');
    box.classList.remove('hidden');
    box.className = 'mt-4 rounded-xl p-4 text-sm ' + (type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200 text-red-700');
    if (type === 'error' && !isHtml) {
      box.innerHTML = `<div class="flex items-start gap-2"><i class="fa-solid fa-triangle-exclamation mt-0.5"></i><div><p class="font-semibold">${escapeHtml(html)}</p>
        <a href="${waLink(state.bookingRef)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 mt-2 text-emerald-700 font-bold"><i class="fa-brands fa-whatsapp"></i> Envoyer sur WhatsApp</a></div></div>`;
    } else { box.innerHTML = html; }
    box.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
  }

  function waLink(ref) {
    const days = calcDays(state.pickupDate, state.returnDate);
    const car = state.car || {};
    const p = calcPricing(car.priceMAD, days, state.optWifi);
    const msg = `Bonjour WINON CAR, je souhaite réserver (réf. ${ref}).\n`
      + `Véhicule : ${car.name || '-'}\n`
      + `Prise en charge : ${state.cityLabel} - ${state.pickupLocation}\n`
      + `Dates : ${state.pickupDate} ${state.pickupTime} -> ${state.returnDate} ${state.returnTime} (${days} j)\n`
      + (state.flightNumber ? `Vol : ${state.flightNumber}\n` : '')
      + `Client : ${state.clientName} (${(state.clientPhone || '').replace(/\D/g, '')})\n`
      + (state.optWifi ? `Option : Wi-Fi 4G\n` : '')
      + `Total estimé : ${p.totalMAD} MAD (~${p.totalEUR} EUR)`;
    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  }

  // ---------- small utils ----------
  function setError(id, msg) {
    const err = $(id + '-error'); const field = $(id);
    if (err) { err.textContent = msg; err.classList.add('show'); }
    if (field) field.classList.add('is-invalid');
  }
  function clearError(id) {
    const err = $(id + '-error'); const field = $(id);
    if (err) err.classList.remove('show');
    if (field) field.classList.remove('is-invalid');
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00'); if (isNaN(d)) return iso;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
})();
