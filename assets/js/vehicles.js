// WINON CAR — Fleet page controller (vehicles/index.html).
// Reuses GET /api/vehicles (same contract as the landing page). Vanilla JS.
// "Réserver" links back to the homepage booking flow with ?car=ID preselection.

(function () {
  'use strict';

  const MAD_TO_EUR_RATE = 10.8;
  const WA_NUMBER = '212604707847';
  const $ = (id) => document.getElementById(id);

  let ALL = [];
  const state = { search: '', category: 'all', sort: 'default', transmission: 'all', fuel: 'all', seats: 'all', price: 'all' };

  // Image URLs from the API are root-relative ("assets/cars/x.jpg"); this page
  // lives in /vehicles/, so prefix with ../ when needed.
  function normalizeImg(url) {
    if (!url) return '../assets/cars/dacia-sandero-stepway.jpg';
    if (/^https?:\/\//.test(url) || url.startsWith('/') || url.startsWith('../')) return url;
    return '../' + url;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function isAuto(car) { return /automat/i.test(car.gearbox || ''); }

  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    loadVehicles();
  });

  function bindEvents() {
    $('fleetSearch').addEventListener('input', (e) => { state.search = e.target.value; render(); });
    $('fleetSort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
    $('fleetTransmission').addEventListener('change', (e) => { state.transmission = e.target.value; render(); });
    $('fleetFuel').addEventListener('change', (e) => { state.fuel = e.target.value; render(); });
    $('fleetSeats').addEventListener('change', (e) => { state.seats = e.target.value; render(); });
    $('fleetPrice').addEventListener('change', (e) => { state.price = e.target.value; render(); });
    $('fleetRetry').addEventListener('click', loadVehicles);
    $('fleetReset').addEventListener('click', resetFilters);
    $('fleetEmptyReset').addEventListener('click', resetFilters);

    $('fleetCategories').querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $('fleetCategories').querySelectorAll('.filter-btn').forEach(b => {
          b.classList.remove('active', 'bg-brand-dark', 'text-white');
          b.classList.add('bg-white', 'text-slate-600', 'border', 'border-slate-200');
        });
        btn.classList.add('active', 'bg-brand-dark', 'text-white');
        btn.classList.remove('bg-white', 'text-slate-600', 'border', 'border-slate-200');
        state.category = btn.getAttribute('data-category');
        render();
      });
    });
  }

  function setState(mode) {
    $('fleetLoading').classList.toggle('hidden', mode !== 'loading');
    $('fleetError').classList.toggle('hidden', mode !== 'error');
    $('fleetEmpty').classList.toggle('hidden', mode !== 'empty');
    $('fleetGrid').classList.toggle('hidden', mode !== 'grid');
  }

  async function loadVehicles() {
    setState('loading');
    $('fleetCount').textContent = 'Chargement…';
    try {
      const res = await fetch('/api/vehicles', { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const list = (data && data.success && Array.isArray(data.vehicles)) ? data.vehicles : [];
      ALL = list.map(v => ({
        id: String(v.id), name: v.name || 'Véhicule',
        category: v.category || '', categoryLabel: v.categoryLabel || v.category || '',
        priceMAD: Number(v.priceMad || v.priceMAD || 0),
        badge: v.badge || '', image: normalizeImg(v.imageUrl || v.image),
        gearbox: v.gearbox || 'Manuelle', fuel: v.fuel || 'Diesel',
        seats: v.seats || '5 Places', bags: v.bags || '2 Valises', ac: v.ac || 'Climatisation',
        description: v.description || '', availability: v.availability || 'disponible'
      }));
      if (ALL.length === 0) { setState('empty'); $('fleetCount').textContent = '0 véhicule'; return; }
      populateDerivedFilters();
      render();
    } catch (err) {
      console.warn('[WINON CAR] fleet /api/vehicles failed:', err);
      setState('error');
      $('fleetCount').textContent = 'Erreur de chargement';
    }
  }

  function populateDerivedFilters() {
    const fuels = Array.from(new Set(ALL.map(c => (c.fuel || '').trim()).filter(Boolean))).sort();
    const seats = Array.from(new Set(ALL.map(c => (c.seats || '').trim()).filter(Boolean)))
      .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0));
    const fuelSel = $('fleetFuel'), seatSel = $('fleetSeats');
    fuelSel.innerHTML = '<option value="all">Tous</option>' + fuels.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join('');
    seatSel.innerHTML = '<option value="all">Toutes</option>' + seats.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
  }

  function applyFilters() {
    const q = state.search.trim().toLowerCase();
    let list = ALL.filter(c => {
      if (state.category !== 'all') {
        if (state.category === 'auto') { if (!isAuto(c)) return false; }
        else if (c.category !== state.category) return false;
      }
      if (state.transmission === 'auto' && !isAuto(c)) return false;
      if (state.transmission === 'manual' && isAuto(c)) return false;
      if (state.fuel !== 'all' && (c.fuel || '') !== state.fuel) return false;
      if (state.seats !== 'all' && (c.seats || '') !== state.seats) return false;
      if (state.price === 'lt350' && !(c.priceMAD < 350)) return false;
      if (state.price === '350_500' && !(c.priceMAD >= 350 && c.priceMAD <= 500)) return false;
      if (state.price === 'gt500' && !(c.priceMAD > 500)) return false;
      if (q && (c.name + ' ' + (c.categoryLabel || '')).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    if (state.sort === 'price_asc') list.sort((a, b) => a.priceMAD - b.priceMAD);
    else if (state.sort === 'price_desc') list.sort((a, b) => b.priceMAD - a.priceMAD);
    else if (state.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    return list;
  }

  function render() {
    if (ALL.length === 0) return;
    const list = applyFilters();
    $('fleetCount').textContent = list.length + ' véhicule' + (list.length > 1 ? 's' : '');
    if (list.length === 0) { setState('empty'); return; }
    setState('grid');
    $('fleetGrid').innerHTML = list.map(cardHTML).join('');
  }

  function cardHTML(car) {
    const eur = Math.round(car.priceMAD / MAD_TO_EUR_RATE);
    const available = car.availability === 'disponible';
    const waText = `Bonjour WINON CAR Agadir, je souhaite réserver ou vérifier la disponibilité de la ${car.name} (${car.priceMAD} MAD / jour).`;
    const reserveHref = '../index.html?car=' + encodeURIComponent(car.id) + '#reservation';
    let availBadge = '';
    if (car.availability === 'maintenance') availBadge = '<span class="bg-amber-600/95 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow">En révision</span>';
    else if (car.availability === 'loue') availBadge = '<span class="bg-blue-600/95 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow">En location</span>';

    return `
      <div class="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group h-full">
        <div class="relative h-52 overflow-hidden bg-slate-100">
          <img src="${esc(car.image)}" alt="${esc(car.name)}" loading="lazy"
               onerror="this.onerror=null;this.src='../assets/cars/dacia-sandero-stepway.jpg';"
               class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          <div class="absolute top-3 left-3 flex flex-wrap gap-1">
            ${car.badge ? `<span class="bg-brand-dark/95 text-brand-gold text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow">${esc(car.badge)}</span>` : ''}
            ${availBadge}
          </div>
          <div class="absolute bottom-3 right-3">
            <span class="bg-white/95 text-slate-800 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">${esc(car.categoryLabel)}</span>
          </div>
        </div>
        <div class="p-6 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="text-xl font-black text-slate-900 group-hover:text-brand-gold transition-colors mb-2">${esc(car.name)}</h3>
            ${car.description ? `<p class="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">${esc(car.description)}</p>` : ''}
            <div class="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-[11px] text-slate-600 mb-4">
              <div class="flex items-center gap-1.5"><i class="fa-solid fa-gear text-brand-gold"></i><span>${esc(car.gearbox)}</span></div>
              <div class="flex items-center gap-1.5"><i class="fa-solid fa-gas-pump text-brand-gold"></i><span>${esc(car.fuel)}</span></div>
              <div class="flex items-center gap-1.5"><i class="fa-solid fa-users text-brand-gold"></i><span>${esc(car.seats)}</span></div>
            </div>
          </div>
          <div>
            <div class="flex items-baseline justify-between mb-4">
              <span class="text-xs text-slate-400 font-medium">Tarif journalier TTC</span>
              <div class="text-right">
                <span class="text-2xl font-black text-slate-900">${car.priceMAD} MAD</span>
                <span class="text-xs text-slate-500 font-semibold"> / jour</span>
                <span class="block text-[11px] text-slate-400 font-medium">(~${eur} €)</span>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <a href="${reserveHref}" class="py-2.5 px-2 rounded-xl ${available ? 'bg-brand-dark hover:bg-brand-navy' : 'bg-slate-400 pointer-events-none'} text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5" title="Réserver ce véhicule">
                <i class="fa-solid fa-calendar-check"></i><span>${available ? 'Réserver' : 'Indisponible'}</span>
              </a>
              <a href="https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener noreferrer"
                 class="py-2.5 px-2 rounded-xl bg-brand-whatsapp hover:bg-brand-whatsappHover text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5" title="Discuter sur WhatsApp">
                <i class="fa-brands fa-whatsapp text-sm"></i><span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>`;
  }

  function resetFilters() {
    state.search = ''; state.category = 'all'; state.sort = 'default';
    state.transmission = 'all'; state.fuel = 'all'; state.seats = 'all'; state.price = 'all';
    $('fleetSearch').value = ''; $('fleetSort').value = 'default';
    $('fleetTransmission').value = 'all'; $('fleetFuel').value = 'all';
    $('fleetSeats').value = 'all'; $('fleetPrice').value = 'all';
    $('fleetCategories').querySelectorAll('.filter-btn').forEach(b => {
      const isAll = b.getAttribute('data-category') === 'all';
      b.classList.toggle('active', isAll);
      b.classList.toggle('bg-brand-dark', isAll); b.classList.toggle('text-white', isAll);
      b.classList.toggle('bg-white', !isAll); b.classList.toggle('text-slate-600', !isAll);
      b.classList.toggle('border', !isAll); b.classList.toggle('border-slate-200', !isAll);
    });
    render();
  }
})();
