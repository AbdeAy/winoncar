// WINON CAR — Landing page behaviour (extracted from index.html).
// Classic (non-module) script: loaded at the end of <body>, same position/order
// as before, so DOM timing and global function scope are unchanged.
    // --- 1. DATA: CAR CATALOG (10 Vehicles with Prices in MAD) ---
    let CARS_DATABASE = [
      {
        id: 'sandero',
        name: 'Dacia Sandero Stepway',
        category: 'eco',
        categoryLabel: 'Citadine Économique',
        priceMAD: 280,
        badge: 'Le Plus Demandé',
        image: 'assets/cars/dacia-sandero-stepway.jpg',
        specs: {
          gearbox: 'Manuelle',
          fuel: 'Essence',
          seats: '5 Places',
          ac: 'Climatisation A/C',
          bags: '2 Valises',
          doors: '5 Portes'
        },
        description: 'Idéale pour circuler dans Agadir et visiter Taghazout en réalisant des économies sur le carburant.'
      },
      {
        id: 'clio5',
        name: 'Renault Clio 5',
        category: 'eco',
        categoryLabel: 'Citadine Moderne',
        priceMAD: 320,
        badge: 'Très Sobre',
        image: 'assets/cars/renault-clio-5.jpg',
        specs: {
          gearbox: 'Manuelle',
          fuel: 'Diesel',
          seats: '5 Places',
          ac: 'Climatisation A/C',
          bags: '2 Valises',
          doors: '5 Portes'
        },
        description: 'La citadine préférée des voyageurs : très sobre en carburant avec écran tactile et Bluetooth.'
      },
      {
        id: 'peugeot208',
        name: 'Peugeot 208 GT',
        category: 'eco',
        categoryLabel: 'Citadine Premium',
        priceMAD: 360,
        badge: 'Design Sport',
        image: 'assets/cars/peugeot-208.jpg',
        specs: {
          gearbox: 'Automatique',
          fuel: 'Diesel',
          seats: '5 Places',
          ac: 'Climatisation A/C',
          bags: '2 Valises',
          doors: '5 Portes'
        },
        description: 'Look moderne et cockpit digital. Idéale pour sillonner la corniche et la marina d\'Agadir avec style.'
      },
      {
        id: 'accent',
        name: 'Hyundai Accent',
        category: 'berline',
        categoryLabel: 'Berline Confort',
        priceMAD: 400,
        badge: 'Grand Coffre',
        image: 'assets/cars/hyundai-accent.jpg',
        specs: {
          gearbox: 'Automatique',
          fuel: 'Diesel',
          seats: '5 Places',
          ac: 'Climatisation A/C',
          bags: '3 Valises',
          doors: '4 Portes'
        },
        description: 'Spacieuse, silencieuse et dotée d\'un grand coffre pour accueillir tous vos bagages à l\'aéroport.'
      },
      {
        id: 'golf8',
        name: 'Volkswagen Golf 8 DSG',
        category: 'berline',
        categoryLabel: 'Berline Compacte Luxe',
        priceMAD: 550,
        badge: 'Performance Allemande',
        image: 'assets/cars/vw-golf-8.jpg',
        specs: {
          gearbox: 'Automatique DSG',
          fuel: 'Diesel',
          seats: '5 Places',
          ac: 'Clim Bizone',
          bags: '3 Valises',
          doors: '5 Portes'
        },
        description: 'La référence allemande pour un plaisir de conduite absolu sur les autoroutes et routes du Maroc.'
      },
      {
        id: 'duster',
        name: 'Dacia Duster 4x4',
        category: 'suv',
        categoryLabel: 'SUV Tout-Chemin',
        priceMAD: 420,
        badge: 'Idéal Taghazout & Dunes',
        image: 'assets/cars/dacia-duster.jpg',
        specs: {
          gearbox: 'Manuelle 6 vit.',
          fuel: 'Diesel',
          seats: '5 Places',
          ac: 'Climatisation A/C',
          bags: '3 Valises',
          doors: '5 Portes'
        },
        description: 'Le SUV le plus demandé à Agadir : robuste, surélevé et parfaitement adapté aux plages et sentiers.'
      },
      {
        id: 'tucson',
        name: 'Hyundai Tucson',
        category: 'suv',
        categoryLabel: 'SUV Familial Élégant',
        priceMAD: 650,
        badge: 'Toit Panoramique',
        image: 'assets/cars/hyundai-tucson.jpg',
        specs: {
          gearbox: 'Automatique',
          fuel: 'Diesel',
          seats: '5 Places',
          ac: 'Clim Tri-Zone',
          bags: '4 Valises',
          doors: '5 Portes'
        },
        description: 'Confort de première classe pour les familles ou groupes d\'amis désirant voyager dans un grand luxe.'
      },
      {
        id: 'sportage',
        name: 'Kia Sportage GT-Line',
        category: 'suv',
        categoryLabel: 'SUV Sportif',
        priceMAD: 580,
        badge: 'Technologie & Caméra',
        image: 'assets/cars/kia-sportage.jpg',
        specs: {
          gearbox: 'Automatique',
          fuel: 'Diesel',
          seats: '5 Places',
          ac: 'Climatisation A/C',
          bags: '3 Valises',
          doors: '5 Portes'
        },
        description: 'Lignes dynamiques, caméra de recul et sécurité maximale pour explorer toute la région Souss-Massa.'
      },
      {
        id: 'mercedes',
        name: 'Mercedes-Benz Classe C',
        category: 'luxe',
        categoryLabel: 'Prestige & Berline VIP',
        priceMAD: 1100,
        badge: 'Luxe Exceptionnel',
        image: 'assets/cars/mercedes-c-class.jpg',
        specs: {
          gearbox: 'Automatique 9G',
          fuel: 'Diesel',
          seats: '5 Places',
          ac: 'Clim Thermotronic',
          bags: '3 Valises',
          doors: '4 Portes'
        },
        description: 'L\'élégance incarnée pour vos rendez-vous d\'affaires ou séjours luxueux dans les palaces d\'Agadir.'
      },
      {
        id: 'evoque',
        name: 'Range Rover Evoque',
        category: 'luxe',
        categoryLabel: 'Prestige SUV VIP',
        priceMAD: 1200,
        badge: 'Prestige VIP',
        image: 'assets/cars/range-rover-evoque.jpg',
        specs: {
          gearbox: 'Automatique',
          fuel: 'Diesel',
          seats: '5 Places',
          ac: 'Climatisation A/C',
          bags: '4 Valises',
          doors: '5 Portes'
        },
        description: 'Intérieur cuir raffiné et stature prestigieuse pour une expérience de conduite inoubliable.'
      }
    ];

    let currentSelectedCarId = 'sandero';
    const MAD_TO_EUR_RATE = 10.8;
    let currentCategoryFilter = 'all';
    let currentLang = localStorage.getItem('winon_lang') || 'fr';

    // --- GESTION DES DOCUMENTS CLIENTS (Fast-track / Coupe-file) ---
    const uploadedDocs = {
      cinRecto: null,
      cinVerso: null,
      licenseRecto: null,
      licenseVerso: null
    };

    function compressDocImage(file, maxDimension = 1200, quality = 0.75) {
      return new Promise((resolve, reject) => {
        if (!file) return reject(new Error('Aucun fichier fourni'));
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
        reader.onload = (e) => {
          const img = new Image();
          img.onerror = () => reject(new Error("Format d'image non valide"));
          img.onload = () => {
            let width = img.width;
            let height = img.height;
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            let dataUrl = canvas.toDataURL('image/webp', quality);
            if (!dataUrl.startsWith('data:image/webp')) {
              dataUrl = canvas.toDataURL('image/jpeg', quality);
            }
            if (dataUrl.length > 200000) {
              dataUrl = canvas.toDataURL('image/jpeg', 0.6);
            }
            resolve(dataUrl);
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    function docText(key, fallback) {
      try { return (WINON_TRANSLATIONS[currentLang] && WINON_TRANSLATIONS[currentLang][key]) || fallback; }
      catch (e) { return fallback; }
    }

    function showDocError(key, msg) {
      const err = document.getElementById('err-' + key);
      const card = document.querySelector('.doc-card[data-doc="' + key + '"]');
      if (err) { err.textContent = msg; err.classList.remove('hidden'); }
      if (card) card.classList.add('is-error');
    }

    function clearDocError(key) {
      const err = document.getElementById('err-' + key);
      const card = document.querySelector('.doc-card[data-doc="' + key + '"]');
      if (err) { err.textContent = ''; err.classList.add('hidden'); }
      if (card) card.classList.remove('is-error');
    }

    function resetDocPreview(key) {
      const previewDiv = document.getElementById('preview-' + key);
      if (!previewDiv) return;
      previewDiv.innerHTML =
        '<i class="fa-solid fa-cloud-arrow-up doc-drop-ico"></i>' +
        '<span class="doc-drop-btn" data-i18n="doc_choose_file">' + docText('doc_choose_file', 'Choisir un fichier') + '</span>' +
        '<span class="doc-drop-hint">JPG, PNG \u00b7 10 Mo max</span>';
      previewDiv.style.cursor = '';
      const inputId = 'doc' + key.charAt(0).toUpperCase() + key.slice(1) + 'Input';
      previewDiv.onclick = function () { const el = document.getElementById(inputId); if (el) el.click(); };
      previewDiv.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); previewDiv.onclick(); } };
    }

    async function handleDocUpload(event, key) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const previewDiv = document.getElementById('preview-' + key);
      const badge = document.getElementById('badge-' + key);
      const delBtn = document.getElementById('del-' + key);
      const repBtn = document.getElementById('rep-' + key);
      const card = document.querySelector('.doc-card[data-doc="' + key + '"]');

      clearDocError(key);

      // Client-side validation. The backend only accepts images (JPEG/PNG/WebP).
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (file.type && allowed.indexOf(file.type) === -1) {
        showDocError(key, docText('doc_err_type', 'Format non pris en charge. Utilisez une image JPG ou PNG.'));
        if (event.target) event.target.value = '';
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showDocError(key, docText('doc_err_size', 'Fichier trop volumineux (10 Mo maximum).'));
        if (event.target) event.target.value = '';
        return;
      }

      try {
        if (previewDiv) {
          previewDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin doc-drop-ico" style="color:#D4AF37"></i>' +
            '<span class="doc-drop-txt">' + docText('doc_compressing', 'Compression...') + '</span>';
        }
        const compressed = await compressDocImage(file);
        // Only mark as attached once compression actually succeeded.
        uploadedDocs[key] = compressed;

        const sizeKB = Math.round((compressed.length * 3 / 4) / 1024);
        const safeName = String(file.name || 'document').replace(/[&<>"']/g, '');
        const shortName = safeName.length > 22 ? (safeName.slice(0, 19) + '…') : safeName;
        if (previewDiv) {
          previewDiv.innerHTML = '<img src="' + compressed + '" alt="' + shortName + '" title="' + docText('doc_preview_open', 'Agrandir') + '" />';
          previewDiv.style.cursor = 'zoom-in';
          previewDiv.onclick = function () { openDocPreview(key); };
          previewDiv.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDocPreview(key); } };
        }
        if (badge) { badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> ' + shortName + ' \u00b7 ' + sizeKB + ' Ko'; badge.classList.remove('hidden'); }
        if (delBtn) delBtn.classList.remove('hidden');
        if (repBtn) repBtn.classList.remove('hidden');
        if (card) { card.classList.add('is-filled'); card.classList.remove('is-error'); }
      } catch (err) {
        uploadedDocs[key] = null;
        if (event.target) event.target.value = '';
        resetDocPreview(key);
        if (badge) badge.classList.add('hidden');
        if (delBtn) delBtn.classList.add('hidden');
        if (repBtn) repBtn.classList.add('hidden');
        if (card) card.classList.remove('is-filled');
        showDocError(key, (err && err.message) ? err.message : "Erreur lors du traitement de l'image.");
      }
    }

    function removeDoc(key) {
      uploadedDocs[key] = null;
      const input = document.getElementById('doc' + key.charAt(0).toUpperCase() + key.slice(1) + 'Input');
      if (input) input.value = '';

      const badge = document.getElementById('badge-' + key);
      const delBtn = document.getElementById('del-' + key);
      const repBtn = document.getElementById('rep-' + key);
      const card = document.querySelector('.doc-card[data-doc="' + key + '"]');

      resetDocPreview(key);
      if (badge) { badge.textContent = ''; badge.classList.add('hidden'); }
      if (delBtn) delBtn.classList.add('hidden');
      if (repBtn) repBtn.classList.add('hidden');
      if (card) { card.classList.remove('is-filled'); card.classList.remove('is-error'); }
      clearDocError(key);
    }

    function openDocPreview(key) {
      const data = uploadedDocs[key];
      if (!data) return;
      const modal = document.getElementById('docPreviewModal');
      const img = document.getElementById('docPreviewImg');
      if (img) img.src = data;
      if (modal) { modal.classList.remove('hidden'); modal.classList.add('is-open'); const b = modal.querySelector('button'); if (b) { try { b.focus(); } catch (e) {} } }
    }
    function closeDocPreview() {
      const modal = document.getElementById('docPreviewModal');
      const img = document.getElementById('docPreviewImg');
      if (modal) { modal.classList.add('hidden'); modal.classList.remove('is-open'); }
      if (img) img.src = '';
    }
    function initDocPreviewModal() {
      const modal = document.getElementById('docPreviewModal');
      if (!modal) return;
      modal.addEventListener('click', (e) => { if (e.target === modal) closeDocPreview(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeDocPreview(); });
    }
    function initBackToTop() {
      const btn = document.getElementById('backToTopBtn');
      if (!btn) return;
      const onScroll = () => { btn.classList.toggle('is-visible', window.scrollY > 400); };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      btn.addEventListener('click', () => {
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      });
    }

    // --- MOTEUR MULTILINGUE CENTRALISÉ (FR | EN | AR) ---
    function setLanguage(lang) {
      if (!['fr', 'en', 'ar'].includes(lang)) lang = 'fr';
      currentLang = lang;
      localStorage.setItem('winon_lang', lang);

      // Mise à jour de la balise HTML racine
      document.documentElement.lang = lang;
      document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';

      // Mise à jour visuelle des boutons de langue
      document.querySelectorAll('.lang-switch-btn').forEach(btn => {
        const btnLang = btn.getAttribute('data-lang-btn');
        if (btnLang === lang) {
          btn.className = "lang-switch-btn px-2.5 py-1 rounded-lg transition-all font-bold bg-brand-gold text-brand-dark shadow-sm" + (btnLang === 'ar' ? ' font-arabic text-sm' : '');
        } else {
          btn.className = "lang-switch-btn px-2.5 py-1 rounded-lg transition-all font-bold text-slate-600 hover:text-slate-900" + (btnLang === 'ar' ? ' font-arabic text-sm' : '');
        }
      });

      // Remplacement de tous les textes avec data-i18n
      if (typeof WINON_TRANSLATIONS !== 'undefined' && WINON_TRANSLATIONS[lang]) {
        const dict = WINON_TRANSLATIONS[lang];
        document.querySelectorAll('[data-i18n]').forEach(el => {
          const key = el.getAttribute('data-i18n');
          if (dict[key] !== undefined) {
            el.textContent = dict[key];
          }
        });
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
          const key = el.getAttribute('data-i18n-aria');
          if (dict[key] !== undefined) el.setAttribute('aria-label', dict[key]);
        });

        // Placeholders localisés
        const nameInput = document.getElementById('clientName');
        const phoneInput = document.getElementById('clientPhone');
        const emailInput = document.getElementById('clientEmail');
        const notesInput = document.getElementById('bookingNotes');
        if (nameInput) {
          nameInput.placeholder = (lang === 'ar') ? 'مثال: كريم العلمي' : (lang === 'en' ? 'E.g., John Smith' : 'Ex: Karim Alami');
        }
        if (phoneInput) {
          phoneInput.placeholder = (lang === 'ar') ? 'مثال: 0612345678' : (lang === 'en' ? 'E.g. 0612345678' : 'Ex: 0612345678');
        }
        if (emailInput) {
          emailInput.placeholder = (lang === 'ar') ? 'مثال: contact@exemple.com' : (lang === 'en' ? 'E.g., contact@example.com' : 'votre.email@exemple.com');
        }
        if (notesInput) {
          notesInput.placeholder = (lang === 'ar') ? 'مثال: اسم الفندق، وقت الوصول...' : (lang === 'en' ? 'E.g., Hotel name, flight details...' : 'Ex: Nom de l\'hôtel, heure spécifique...');
        }

        // Mettre à jour les messages d'erreur de validation visibles
        if (typeof refreshVisibleValidationErrors === 'function') {
          refreshVisibleValidationErrors();
        }
      }

      // Re-rendre le catalogue avec les textes traduits
      if (typeof renderCarCatalog === 'function') {
        renderCarCatalog(currentCategoryFilter || 'all');
      }
      if (typeof renderReservationStep === 'function') { try { renderReservationStep(false); } catch (e) {} }
    }

    // --- 2. INITIALIZATION ON DOM LOAD ---
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('currentYear').textContent = new Date().getFullYear();

      // Appliquer la langue sauvegardée
      setLanguage(currentLang);

      // Set default dates (Tomorrow to 4 days later)
      const today = new Date();
      const pickupDateObj = new Date(today);
      pickupDateObj.setDate(today.getDate() + 1);

      const returnDateObj = new Date(today);
      returnDateObj.setDate(today.getDate() + 4);

      const pickupDateInput = document.getElementById('pickupDate');
      const returnDateInput = document.getElementById('returnDate');
      const quickPickupDate = document.getElementById('quickPickupDate');
      const quickReturnDate = document.getElementById('quickReturnDate');

      const pickupStr = pickupDateObj.toISOString().split('T')[0];
      const returnStr = returnDateObj.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];

      pickupDateInput.value = pickupStr;
      returnDateInput.value = returnStr;
      pickupDateInput.min = todayStr;
      returnDateInput.min = pickupStr;

      if (quickPickupDate && quickReturnDate) {
        quickPickupDate.value = pickupStr;
        quickReturnDate.value = returnStr;
        quickPickupDate.min = todayStr;
        quickReturnDate.min = pickupStr;
      }

      // Event listeners for dates
      pickupDateInput.addEventListener('change', () => {
        if (returnDateInput.value <= pickupDateInput.value) {
          const nextDay = new Date(pickupDateInput.value);
          nextDay.setDate(nextDay.getDate() + 1);
          returnDateInput.value = nextDay.toISOString().split('T')[0];
        }
        returnDateInput.min = pickupDateInput.value;
        if (quickPickupDate) quickPickupDate.value = pickupDateInput.value;
        if (quickReturnDate) quickReturnDate.value = returnDateInput.value;
        updateBookingCalculation();
      });

      returnDateInput.addEventListener('change', () => {
        if (quickReturnDate) quickReturnDate.value = returnDateInput.value;
        updateBookingCalculation();
      });

      // Populate Car Select dropdown in form
      populateCarSelectDropdown();

      // Initialize Moroccan cities and locations dropdowns
      initMoroccanLocations();

      // Render Car Catalog Cards
      renderCarCatalog('all');

      // Initialize filter buttons
      setupCategoryFilters();

      // Setup mobile menu
      setupMobileMenu();

      // Setup homepage vehicle slider (arrows, dots, search, swipe)
      setupVehicleSlider();

      // Preselect a vehicle if arriving from the fleet page (?car=ID)
      preselectCarFromQuery();

      // Perform initial calculation
      updateBookingCalculation();

      // Charger dynamiquement les véhicules et tarifs en direct depuis Cloudflare D1
      loadVehiclesFromAPI();

      // Re-synchronisation silencieuse dès que la page redevient active (retour d'onglet)
      window.addEventListener('focus', loadVehiclesFromAPI);

      // Initialiser le formulaire de réservation en 4 étapes (stepper)
      initReservationStepper();
      initBackToTop();
      initDocPreviewModal();
    });

    // --- CHARGEMENT DYNAMIQUE DU CATALOGUE DEPUIS CLOUDFLARE D1 ---
    async function loadVehiclesFromAPI() {
      try {
        const res = await fetch('/api/vehicles');
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.success && Array.isArray(data.vehicles) && data.vehicles.length > 0) {
          CARS_DATABASE = data.vehicles.map(v => ({
            id: v.id,
            name: v.name,
            category: v.category,
            categoryLabel: v.categoryLabel || v.category,
            priceMAD: Number(v.priceMad || v.priceMAD || 0),
            badge: v.badge || '',
            image: v.imageUrl || v.image || 'assets/cars/dacia-sandero-stepway.jpg',
            specs: {
              gearbox: v.gearbox || 'Manuelle',
              fuel: v.fuel || 'Diesel',
              seats: v.seats || '5 Places',
              ac: v.ac || 'Climatisation A/C',
              bags: v.bags || '2 Valises',
              doors: v.doors || '5 Portes'
            },
            description: v.description || `${v.name} disponible à la location chez WINON CAR Agadir.`,
            availability: v.availability || 'disponible'
          }));

          // Maintien du véhicule sélectionné ou repli sur le premier disponible
          const carSelect = document.getElementById('carSelect');
          const currentVal = carSelect ? carSelect.value : currentSelectedCarId;
          const matchingCar = CARS_DATABASE.find(c => c.id === currentVal);
          if (matchingCar) {
            currentSelectedCarId = matchingCar.id;
          } else if (CARS_DATABASE.length > 0) {
            currentSelectedCarId = CARS_DATABASE[0].id;
          }

          populateCarSelectDropdown();
          if (carSelect && currentSelectedCarId) {
            carSelect.value = currentSelectedCarId;
          }

          // Rafraîchir l'affichage selon le filtre de catégorie actif
          const activeFilterBtn = document.querySelector('#categoryFilterContainer .filter-btn.active');
          const currentCategory = activeFilterBtn ? activeFilterBtn.getAttribute('data-category') : 'all';
          renderCarCatalog(currentCategory || 'all');

          // Recalcul immédiat du devis
          updateBookingCalculation();
        }
      } catch (err) {
        console.warn('[WINON CAR] API D1 non joignable, catalogue par défaut actif :', err);
      }
    }

    // --- 3. POPULATE SELECT DROPDOWN ---
    function populateCarSelectDropdown() {
      const select = document.getElementById('carSelect');
      if (!select) return;
      select.innerHTML = '';
      CARS_DATABASE.forEach(car => {
        const option = document.createElement('option');
        option.value = car.id;
        const eur = Math.round(car.priceMAD / MAD_TO_EUR_RATE);
        let statusExtra = '';
        if (car.availability === 'maintenance') statusExtra = ' • [En révision]';
        else if (car.availability === 'loue') statusExtra = ' • [En location]';
        option.textContent = `${car.name} — ${car.priceMAD} MAD / jour (~${eur} €) • ${car.categoryLabel}${statusExtra}`;
        select.appendChild(option);
      });
    }

    // --- 4. RENDER CATALOG GRID ---
    function renderCarCatalog(categoryFilter = 'all') {
      const grid = document.getElementById('carCatalogGrid');
      if (!grid) return;
      grid.innerHTML = '';

      const t = (typeof WINON_TRANSLATIONS !== 'undefined' && WINON_TRANSLATIONS[currentLang]) ? WINON_TRANSLATIONS[currentLang] : {};

      const filteredCars = categoryFilter === 'all' 
        ? CARS_DATABASE 
        : CARS_DATABASE.filter(c => c.category === categoryFilter);

      vehicleSliderPage = 0;
      const searchTerm = (currentCarSearch || '').trim().toLowerCase();
      const catList = CARS_DATABASE.filter(c => {
        const catOk = (categoryFilter === 'all') ? true
          : (categoryFilter === 'auto') ? /automat/i.test((c.specs && c.specs.gearbox) || '')
          : (c.category === categoryFilter);
        const textOk = !searchTerm || ((c.name + ' ' + (c.categoryLabel || '')).toLowerCase().indexOf(searchTerm) !== -1);
        return catOk && textOk;
      });
      const noResEl = document.getElementById('carNoResults');
      if (noResEl) noResEl.hidden = catList.length !== 0;
      catList.forEach(car => {
        const eur = Math.round(car.priceMAD / MAD_TO_EUR_RATE);
        const slide = document.createElement('div');
        slide.className = 'v-slide';
        const card = document.createElement('div');
        card.className = "bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group h-full";
        
        let availabilityBadge = '';
        if (car.availability === 'maintenance') {
          availabilityBadge = `<span class="bg-amber-600/95 backdrop-blur-md text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow">${t.badge_maintenance || 'En Révision'}</span>`;
        } else if (car.availability === 'loue') {
          availabilityBadge = `<span class="bg-blue-600/95 backdrop-blur-md text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow">${t.badge_rented || 'En Location'}</span>`;
        }

        // WhatsApp message per vehicle
        let carWaText = `Bonjour WINON CAR Agadir, je souhaite réserver ou vérifier la disponibilité de la ${car.name} (${car.priceMAD} MAD / jour).`;
        if (currentLang === 'ar') {
          carWaText = `السلام عليكم WINON CAR، بغيت نسول على توفر سيارة ${car.name} (${car.priceMAD} درهم / يوم).`;
        } else if (currentLang === 'en') {
          carWaText = `Hello WINON CAR Agadir, I would like to book or check availability for ${car.name} (${car.priceMAD} MAD / day).`;
        }

        card.innerHTML = `
          <!-- Image & Badge Container -->
          <div class="relative h-52 overflow-hidden bg-slate-100">
            <img src="${car.image}" alt="${car.name}" 
                 loading="lazy"
                 onerror="this.onerror=null; this.src='assets/cars/dacia-sandero-stepway.jpg';"
                 class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
            <div class="absolute top-3 left-3 flex flex-wrap gap-1">
              ${car.badge ? `<span class="bg-brand-dark/95 backdrop-blur-md text-brand-gold text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow">
                ${car.badge}
              </span>` : ''}
              ${availabilityBadge}
            </div>
            <div class="absolute bottom-3 right-3">
              <span class="bg-white/95 backdrop-blur-md text-slate-800 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                ${car.categoryLabel}
              </span>
            </div>
          </div>

          <!-- Body Container -->
          <div class="p-6 flex-1 flex flex-col justify-between">
            <div>
              <div class="flex justify-between items-baseline mb-2">
                <h3 class="text-xl font-black text-slate-900 group-hover:text-brand-gold transition-colors">
                  ${car.name}
                </h3>
              </div>
              <p class="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                ${car.description}
              </p>

              <!-- Specs Pills -->
              <div class="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-[11px] text-slate-600 mb-4">
                <div class="flex items-center gap-1.5" title="${t.spec_manual || 'Boîte de vitesse'}">
                  <i class="fa-solid fa-gear text-brand-gold"></i>
                  <span>${car.specs.gearbox}</span>
                </div>
                <div class="flex items-center gap-1.5" title="${t.spec_diesel || 'Carburant'}">
                  <i class="fa-solid fa-gas-pump text-brand-gold"></i>
                  <span>${car.specs.fuel}</span>
                </div>
                <div class="flex items-center gap-1.5" title="${t.spec_seats || 'Nombre de places'}">
                  <i class="fa-solid fa-users text-brand-gold"></i>
                  <span>${car.specs.seats}</span>
                </div>
              </div>
            </div>

            <!-- Price & Actions Footer -->
            <div>
              <div class="flex items-baseline justify-between mb-4">
                <span class="text-xs text-slate-400 font-medium">${t.card_rate_all_inc || 'Tarif journalier TTC'}</span>
                <div class="text-right">
                  <span class="text-2xl font-black text-slate-900">${car.priceMAD} MAD</span>
                  <span class="text-xs text-slate-500 font-semibold">${t.card_per_day || ' / jour'}</span>
                  <span class="block text-[11px] text-slate-400 font-medium">(~${eur} €)</span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button onclick="selectCarAndScrollToBooking('${car.id}')" class="flex-1 py-2.5 px-3 rounded-xl bg-brand-dark hover:bg-brand-navy text-white font-bold text-sm transition-colors flex items-center justify-center gap-2" title="Sélectionner pour réserver">
                  <i class="fa-solid fa-calendar-check text-brand-gold"></i>
                  <span>${t.card_book_btn || 'Réserver'}</span>
                </button>
                <button onclick="openCarModal('${car.id}')" aria-label="Détails ${car.name}" class="w-10 h-10 shrink-0 rounded-xl border border-slate-200 hover:border-slate-800 text-slate-600 hover:text-slate-900 transition-colors flex items-center justify-center" title="Voir les détails">
                  <i class="fa-solid fa-circle-info"></i>
                </button>
                <a href="https://wa.me/212604707847?text=${encodeURIComponent(carWaText)}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp ${car.name}" class="w-10 h-10 shrink-0 rounded-xl border border-emerald-200 text-brand-whatsapp hover:bg-brand-whatsapp hover:text-white transition-colors flex items-center justify-center" title="Discuter sur WhatsApp">
                  <i class="fa-brands fa-whatsapp"></i>
                </a>
              </div>
            </div>
          </div>
        `;
        slide.appendChild(card);
        grid.appendChild(slide);
      });
      if (typeof refreshVehicleSlider === 'function') refreshVehicleSlider();
    }

    // --- 5. CATEGORY FILTER LOGIC ---
    function setupCategoryFilters() {
      const buttons = document.querySelectorAll('#categoryFilterContainer .filter-btn');
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          buttons.forEach(b => {
            b.classList.remove('active', 'bg-brand-dark', 'text-white');
            b.classList.add('bg-white', 'text-slate-600', 'border', 'border-slate-200');
          });
          btn.classList.add('active', 'bg-brand-dark', 'text-white');
          btn.classList.remove('bg-white', 'text-slate-600', 'border', 'border-slate-200');

          const category = btn.getAttribute('data-category');
          currentCategoryFilter = category;
          renderCarCatalog(category);
        });
      });
    }

    // --- 6. PRICE & DURATION CALCULATION ---
    function calculateDays() {
      const pickupDateVal = document.getElementById('pickupDate').value;
      const returnDateVal = document.getElementById('returnDate').value;
      if (!pickupDateVal || !returnDateVal) return 1;

      const d1 = new Date(pickupDateVal);
      const d2 = new Date(returnDateVal);
      const diffTime = d2.getTime() - d1.getTime();
      let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 1;
    }

    function updateBookingCalculation() {
      const carSelect = document.getElementById('carSelect');
      const selectedId = carSelect.value;
      const car = CARS_DATABASE.find(c => c.id === selectedId) || CARS_DATABASE[0];
      
      currentSelectedCarId = car.id;
      const days = calculateDays();
      let baseDaily = car.priceMAD;
      
      // Wi-Fi option
      const wifiChecked = document.getElementById('optWifi')?.checked;
      const wifiDaily = wifiChecked ? 30 : 0;
      
      // Discount for 7+ days (10%)
      const isDiscounted = days >= 7;
      const discountRate = isDiscounted ? 0.10 : 0.0;
      
      const subtotalCars = days * baseDaily;
      const discountMAD = Math.round(subtotalCars * discountRate);
      const extrasTotal = days * wifiDaily;
      const totalMAD = (subtotalCars - discountMAD) + extrasTotal;
      const totalEUR = Math.round(totalMAD / MAD_TO_EUR_RATE);
      const dailyEUR = Math.round(baseDaily / MAD_TO_EUR_RATE);

      document.getElementById('summaryCarName').textContent = car.name;
      document.getElementById('summaryCarDaily').textContent = `${car.priceMAD} MAD (~${dailyEUR} €)`;
      document.getElementById('summaryDays').textContent = `${days} jour${days > 1 ? 's' : ''}`;
      
      const discountRow = document.getElementById('longTermDiscountRow');
      if (isDiscounted && discountRow) {
        discountRow.classList.remove('hidden');
        document.getElementById('summaryDiscountText').textContent = `-10% (-${discountMAD} MAD)`;
      } else if (discountRow) {
        discountRow.classList.add('hidden');
      }

      document.getElementById('summaryTotal').textContent = `${totalMAD.toLocaleString()} MAD`;
      document.getElementById('summaryTotalEur').textContent = `(~${totalEUR} €)`;
    }

    // --- 7. SELECT CAR FROM CATALOG & SCROLL ---
    function selectCarAndScrollToBooking(carId = null) {
      // Fall back to the vehicle stored by the details modal / last selection so
      // the modal "Choisir cette voiture" CTA (invoked without an id) still
      // selects the correct car instead of a stale dropdown value.
      const carSelect = document.getElementById('carSelect');
      const targetId = carId || currentSelectedCarId;
      if (targetId && CARS_DATABASE.some(c => c.id === targetId)) {
        currentSelectedCarId = targetId;
        if (carSelect) carSelect.value = targetId;
      }
      closeCarModal();
      updateBookingCalculation();
      // Keep the Step 2 visual vehicle cards in sync with the new selection
      // so the chosen car is immediately highlighted when Step 2 opens.
      if (typeof renderVehicleSelectCards === 'function') renderVehicleSelectCards();

      // Scroll to the booking section, offsetting the sticky header so the
      // section heading is not hidden behind it. Respect reduced-motion.
      const bookingSection = document.getElementById('reservation');
      if (bookingSection) {
        const header = document.querySelector('header');
        const headerH = header ? header.getBoundingClientRect().height : 0;
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const top = bookingSection.getBoundingClientRect().top + window.pageYOffset - headerH - 12;
        window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
      }

      // Highlight select box temporarily
      const carSelectElem = document.getElementById('carSelect');
      if (carSelectElem) {
        carSelectElem.classList.add('ring-2', 'ring-brand-gold');
        setTimeout(() => carSelectElem.classList.remove('ring-2', 'ring-brand-gold'), 1500);
      }
    }

    // --- 8. CAR DETAIL MODAL ---
    let lastModalTrigger = null;
    function openCarModal(carId) {
      const car = CARS_DATABASE.find(c => c.id === carId);
      if (!car) return;

      currentSelectedCarId = car.id;
      document.getElementById('modalCarImg').src = car.image;
      document.getElementById('modalCarBadge').textContent = car.categoryLabel;
      document.getElementById('modalCarTitle').textContent = car.name;
      document.getElementById('modalCarSub').textContent = car.description;
      
      const eur = Math.round(car.priceMAD / MAD_TO_EUR_RATE);
      document.getElementById('modalCarPrice').textContent = `${car.priceMAD} MAD`;
      const _mt = (typeof WINON_TRANSLATIONS !== 'undefined' && WINON_TRANSLATIONS[currentLang]) ? WINON_TRANSLATIONS[currentLang] : {};
      const perDay = _mt.m_price_per_day || '/ jour';
      document.getElementById('modalCarPriceEur').textContent = `${perDay} (~${eur} €)`;

      // Render specs in modal (captions localised, values come from vehicle data)
      const lblGearbox = _mt.m_spec_gearbox || 'Boîte';
      const lblFuel = _mt.m_spec_fuel || 'Carburant';
      const lblCapacity = _mt.m_spec_capacity || 'Capacité';
      const lblAc = _mt.m_spec_ac || 'Climatisation';
      const specsContainer = document.getElementById('modalCarSpecs');
      specsContainer.innerHTML = `
        <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
          <i class="fa-solid fa-gear text-brand-gold text-base mb-1 block"></i>
          <span class="text-[11px] font-bold text-slate-800 block">${car.specs.gearbox}</span>
          <span class="text-[10px] text-slate-400">${lblGearbox}</span>
        </div>
        <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
          <i class="fa-solid fa-gas-pump text-brand-gold text-base mb-1 block"></i>
          <span class="text-[11px] font-bold text-slate-800 block">${car.specs.fuel}</span>
          <span class="text-[10px] text-slate-400">${lblFuel}</span>
        </div>
        <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
          <i class="fa-solid fa-users text-brand-gold text-base mb-1 block"></i>
          <span class="text-[11px] font-bold text-slate-800 block">${car.specs.seats}</span>
          <span class="text-[10px] text-slate-400">${lblCapacity}</span>
        </div>
        <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
          <i class="fa-solid fa-snowflake text-brand-gold text-base mb-1 block"></i>
          <span class="text-[11px] font-bold text-slate-800 block">${car.specs.ac}</span>
          <span class="text-[10px] text-slate-400">${lblAc}</span>
        </div>
      `;

      // Secondary CTA -> Contact page carrying the selected vehicle context
      const askBtn = document.getElementById('modalAskBtn');
      if (askBtn) askBtn.href = `contact/?vehicle=${encodeURIComponent(car.name)}`;

      lastModalTrigger = document.activeElement;
      document.getElementById('carModal').classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      const closeBtn = document.getElementById('carModalClose');
      if (closeBtn) setTimeout(() => closeBtn.focus(), 0);
    }

    function closeCarModal() {
      document.getElementById('carModal').classList.add('hidden');
      document.body.style.overflow = '';
      if (lastModalTrigger && typeof lastModalTrigger.focus === 'function') {
        lastModalTrigger.focus();
        lastModalTrigger = null;
      }
    }

    document.getElementById('carModal').addEventListener('click', (e) => {
      if (e.target.id === 'carModal') closeCarModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !document.getElementById('carModal').classList.contains('hidden')) closeCarModal();
    });

    // --- 9. MOROCCAN LOCATIONS HIERARCHY & SELECTION ---
    const MOROCCAN_LOCATIONS = {
      agadir: {
        label: "Agadir",
        locations: [
          { id: "aga_airport", label: "Aéroport Agadir Al-Massira (AGA)", isAirport: true },
          { id: "aga_center", label: "Centre-ville Agadir" },
          { id: "aga_marina", label: "Marina d'Agadir" },
          { id: "aga_hotel", label: "Hôtel / Résidence à Agadir" },
          { id: "aga_taghazout", label: "Taghazout / Taghazout Bay" },
          { id: "aga_imiouaddar", label: "Imi Ouaddar / Paradis Plage" },
          { id: "aga_other", label: "Autre adresse à Agadir (à préciser)", isCustom: true }
        ]
      },
      marrakech: {
        label: "Marrakech",
        locations: [
          { id: "rak_airport", label: "Aéroport Marrakech-Ménara (RAK)", isAirport: true },
          { id: "rak_gueliz", label: "Centre-ville / Guéliz / Hivernage" },
          { id: "rak_station", label: "Gare ferroviaire ONCF Marrakech" },
          { id: "rak_hotel", label: "Hôtel / Riad à Marrakech" },
          { id: "rak_other", label: "Autre adresse à Marrakech (à préciser)", isCustom: true }
        ]
      },
      casablanca: {
        label: "Casablanca",
        locations: [
          { id: "cmn_airport", label: "Aéroport Mohammed V (CMN)", isAirport: true },
          { id: "cmn_center", label: "Centre-ville / Maarif / Gauthier" },
          { id: "cmn_voyageurs", label: "Gare Casa-Voyageurs / Casa-Port" },
          { id: "cmn_hotel", label: "Hôtel à Casablanca" },
          { id: "cmn_other", label: "Autre adresse à Casablanca (à préciser)", isCustom: true }
        ]
      },
      rabat: {
        label: "Rabat",
        locations: [
          { id: "rba_airport", label: "Aéroport Rabat-Salé (RBA)", isAirport: true },
          { id: "rba_center", label: "Centre-ville / Agdal / Hassan" },
          { id: "rba_station", label: "Gare Rabat-Ville / Rabat-Agdal" },
          { id: "rba_other", label: "Autre adresse à Rabat (à préciser)", isCustom: true }
        ]
      },
      tanger: {
        label: "Tanger",
        locations: [
          { id: "tng_airport", label: "Aéroport Tanger Ibn Battouta (TNG)", isAirport: true },
          { id: "tng_center", label: "Centre-ville / Malabata" },
          { id: "tng_port", label: "Port Tanger Ville / Tanger Med" },
          { id: "tng_station", label: "Gare Tanger-Ville" },
          { id: "tng_other", label: "Autre adresse à Tanger (à préciser)", isCustom: true }
        ]
      },
      essaouira: {
        label: "Essaouira",
        locations: [
          { id: "esu_airport", label: "Aéroport Essaouira-Mogador (ESU)", isAirport: true },
          { id: "esu_center", label: "Centre-ville / Médina / Port" },
          { id: "esu_other", label: "Autre adresse à Essaouira (à préciser)", isCustom: true }
        ]
      },
      ouarzazate: {
        label: "Ouarzazate",
        locations: [
          { id: "ozz_airport", label: "Aéroport Ouarzazate (OZZ)", isAirport: true },
          { id: "ozz_center", label: "Centre-ville / Hôtels" },
          { id: "ozz_other", label: "Autre adresse à Ouarzazate (à préciser)", isCustom: true }
        ]
      },
      fes: {
        label: "Fès",
        locations: [
          { id: "fez_airport", label: "Aéroport Fès-Saïss (FEZ)", isAirport: true },
          { id: "fez_center", label: "Centre-ville / Ville Nouvelle" },
          { id: "fez_other", label: "Autre adresse à Fès (à préciser)", isCustom: true }
        ]
      },
      autre_ville: {
        label: "Autre Ville au Maroc",
        locations: [
          { id: "custom_city_location", label: "Adresse complète de livraison (à préciser)", isCustom: true }
        ]
      }
    };

    function populateCitySelect(selectElement, defaultCity = 'agadir') {
      if (!selectElement) return;
      selectElement.innerHTML = '';
      Object.keys(MOROCCAN_LOCATIONS).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = MOROCCAN_LOCATIONS[key].label;
        if (key === defaultCity) opt.selected = true;
        selectElement.appendChild(opt);
      });
    }

    function populateLocationSelect(cityKey, locationSelectElement, customContainerElement) {
      if (!locationSelectElement) return;
      locationSelectElement.innerHTML = '';
      const cityData = MOROCCAN_LOCATIONS[cityKey] || MOROCCAN_LOCATIONS['agadir'];
      cityData.locations.forEach(loc => {
        const opt = document.createElement('option');
        opt.value = loc.label;
        opt.textContent = loc.label;
        if (loc.isCustom) opt.dataset.isCustom = 'true';
        if (loc.isAirport) opt.dataset.isAirport = 'true';
        locationSelectElement.appendChild(opt);
      });
      checkCustomAddressVisibility(locationSelectElement, customContainerElement);
    }

    function checkCustomAddressVisibility(selectElement, containerElement) {
      if (!selectElement || !containerElement) return;
      const selectedOpt = selectElement.options[selectElement.selectedIndex];
      const isCustom = selectedOpt && selectedOpt.dataset.isCustom === 'true';
      if (isCustom) {
        containerElement.classList.remove('hidden');
      } else {
        containerElement.classList.add('hidden');
      }
    }

    function initMoroccanLocations() {
      const pickupCitySel = document.getElementById('pickupCity');
      const returnCitySel = document.getElementById('returnCity');
      const pickupLocSel = document.getElementById('pickupLocation');
      const returnLocSel = document.getElementById('returnLocation');
      const pickupCustomContainer = document.getElementById('pickupCustomAddressContainer');
      const returnCustomContainer = document.getElementById('returnCustomAddressContainer');

      if (pickupCitySel && pickupLocSel) {
        populateCitySelect(pickupCitySel, 'agadir');
        populateLocationSelect('agadir', pickupLocSel, pickupCustomContainer);
      }
      if (returnCitySel && returnLocSel) {
        populateCitySelect(returnCitySel, 'agadir');
        populateLocationSelect('agadir', returnLocSel, returnCustomContainer);
      }
      updateFlightNumberVisibility();
    }

    function handlePickupCityChange() {
      const cityKey = document.getElementById('pickupCity').value;
      const pickupLocSel = document.getElementById('pickupLocation');
      const pickupCustomContainer = document.getElementById('pickupCustomAddressContainer');
      populateLocationSelect(cityKey, pickupLocSel, pickupCustomContainer);

      const isSame = document.getElementById('sameLocationCheck').checked;
      if (isSame) {
        const returnCitySel = document.getElementById('returnCity');
        const returnLocSel = document.getElementById('returnLocation');
        const returnCustomContainer = document.getElementById('returnCustomAddressContainer');
        if (returnCitySel) returnCitySel.value = cityKey;
        populateLocationSelect(cityKey, returnLocSel, returnCustomContainer);
      }
      updateFlightNumberVisibility();
    }

    function handlePickupLocationChange() {
      const pickupLocSel = document.getElementById('pickupLocation');
      const pickupCustomContainer = document.getElementById('pickupCustomAddressContainer');
      checkCustomAddressVisibility(pickupLocSel, pickupCustomContainer);

      const isSame = document.getElementById('sameLocationCheck').checked;
      if (isSame) {
        const returnLocSel = document.getElementById('returnLocation');
        const returnCustomContainer = document.getElementById('returnCustomAddressContainer');
        if (returnLocSel) returnLocSel.value = pickupLocSel.value;
        checkCustomAddressVisibility(returnLocSel, returnCustomContainer);
      }
      updateFlightNumberVisibility();
    }

    function handleReturnCityChange() {
      const cityKey = document.getElementById('returnCity').value;
      const returnLocSel = document.getElementById('returnLocation');
      const returnCustomContainer = document.getElementById('returnCustomAddressContainer');
      populateLocationSelect(cityKey, returnLocSel, returnCustomContainer);
    }

    function handleReturnLocationChange() {
      const returnLocSel = document.getElementById('returnLocation');
      const returnCustomContainer = document.getElementById('returnCustomAddressContainer');
      checkCustomAddressVisibility(returnLocSel, returnCustomContainer);
    }

    function toggleReturnLocation() {
      const isChecked = document.getElementById('sameLocationCheck').checked;
      const returnContainer = document.getElementById('returnLocationContainer');
      const pickupCityVal = document.getElementById('pickupCity').value;
      const pickupLocVal = document.getElementById('pickupLocation').value;

      if (isChecked) {
        returnContainer.classList.add('hidden');
        document.getElementById('returnCity').value = pickupCityVal;
        populateLocationSelect(pickupCityVal, document.getElementById('returnLocation'), document.getElementById('returnCustomAddressContainer'));
        document.getElementById('returnLocation').value = pickupLocVal;
      } else {
        returnContainer.classList.remove('hidden');
      }
    }

    function updateFlightNumberVisibility() {
      const pickupLocSel = document.getElementById('pickupLocation');
      const selectedOpt = pickupLocSel?.options[pickupLocSel.selectedIndex];
      const isAirport = selectedOpt && selectedOpt.dataset.isAirport === 'true';
      const flightRow = document.getElementById('flightNumberRow');
      if (flightRow) {
        const label = flightRow.querySelector('label');
        if (isAirport) {
          flightRow.classList.remove('opacity-60');
          if (label) label.innerHTML = `<i class="fa-solid fa-plane-arrival text-brand-gold mr-1.5"></i> N° de Vol d'Arrivée (Recommandé pour l'accueil direct à l'aéroport)`;
        } else {
          flightRow.classList.add('opacity-60');
          if (label) label.innerHTML = `<i class="fa-solid fa-plane-arrival text-brand-gold mr-1.5"></i> N° de Vol (Si arrivée par avion)`;
        }
      }
    }

    function applyQuickSearchAndScroll() {
      const qLoc = document.getElementById('quickLocation')?.value;
      const qPick = document.getElementById('quickPickupDate')?.value;
      const qRet = document.getElementById('quickReturnDate')?.value;

      if (qLoc) {
        document.getElementById('pickupCity').value = 'agadir';
        handlePickupCityChange();
        const pickupLoc = document.getElementById('pickupLocation');
        if (pickupLoc) {
          for (let opt of pickupLoc.options) {
            if (opt.value.includes(qLoc) || qLoc.includes(opt.value)) {
              pickupLoc.value = opt.value;
              break;
            }
          }
          handlePickupLocationChange();
        }
      }
      if (qPick) document.getElementById('pickupDate').value = qPick;
      if (qRet) document.getElementById('returnDate').value = qRet;

      updateBookingCalculation();
      document.getElementById('flotte').scrollIntoView({ behavior: 'smooth' });
    }

    function getSelectedLocationDetails() {
      const pickupCityKey = document.getElementById('pickupCity').value;
      const pickupCityLabel = MOROCCAN_LOCATIONS[pickupCityKey]?.label || pickupCityKey;
      let pickupLocation = document.getElementById('pickupLocation').value;
      const pickupCustom = document.getElementById('pickupCustomAddress')?.value.trim();
      const pickupLocSel = document.getElementById('pickupLocation');
      const isPickupCustom = pickupLocSel?.options[pickupLocSel.selectedIndex]?.dataset.isCustom === 'true';
      if (isPickupCustom && pickupCustom) {
        pickupLocation = `${pickupLocation} : ${pickupCustom}`;
      }

      const isSame = document.getElementById('sameLocationCheck').checked;
      let returnCityLabel = pickupCityLabel;
      let returnLocation = pickupLocation;

      if (!isSame) {
        const returnCityKey = document.getElementById('returnCity').value;
        returnCityLabel = MOROCCAN_LOCATIONS[returnCityKey]?.label || returnCityKey;
        returnLocation = document.getElementById('returnLocation').value;
        const returnCustom = document.getElementById('returnCustomAddress')?.value.trim();
        const returnLocSel = document.getElementById('returnLocation');
        const isReturnCustom = returnLocSel?.options[returnLocSel.selectedIndex]?.dataset.isCustom === 'true';
        if (isReturnCustom && returnCustom) {
          returnLocation = `${returnLocation} : ${returnCustom}`;
        }
      }

      return { pickupCityLabel, pickupLocation, returnCityLabel, returnLocation };
    }

    // --- 10. WHATSAPP BOOKING GENERATOR ---
    function buildWhatsAppBookingMessage() {
      const car = CARS_DATABASE.find(c => c.id === currentSelectedCarId) || CARS_DATABASE[0];
      const { pickupCityLabel, pickupLocation, returnCityLabel, returnLocation } = getSelectedLocationDetails();

      const pickupDate = document.getElementById('pickupDate').value;
      const pickupTime = document.getElementById('pickupTime').value;
      const returnDate = document.getElementById('returnDate').value;
      const returnTime = document.getElementById('returnTime').value;
      const clientName = document.getElementById('clientName').value.trim() || 'Client';
      const clientPhone = document.getElementById('clientPhone').value.trim() || 'Non renseigné';
      const clientEmail = document.getElementById('clientEmail').value.trim();
      const flightNumber = document.getElementById('flightNumber').value.trim();
      const notes = document.getElementById('bookingNotes').value.trim();

      const days = calculateDays();
      const isDiscounted = days >= 7;
      const discountRate = isDiscounted ? 0.10 : 0.0;
      const subtotalCars = days * car.priceMAD;
      const discountMAD = Math.round(subtotalCars * discountRate);
      
      const wifiChecked = document.getElementById('optWifi')?.checked;
      const wifiDaily = wifiChecked ? 30 : 0;
      const totalMAD = (subtotalCars - discountMAD) + (days * wifiDaily);
      const totalEUR = Math.round(totalMAD / MAD_TO_EUR_RATE);

      const babySeatChecked = document.getElementById('optBabySeat')?.checked;
      const docCount = Object.values(uploadedDocs).filter(Boolean).length;
      const hasDocs = docCount > 0;

      let msg = '';

      if (currentLang === 'ar') {
        msg = 
`السلام عليكم WINON CAR،

بغيت نحجز هاد السيارة في أكادير :
🚗 السيارة : ${car.name}
💰 ثمن الكراء : ${car.priceMAD} درهم / يوم
⏱ المدة : ${days} أيام
💵 المجموع التقديري : ${totalMAD} درهم (~${totalEUR} €) ${isDiscounted ? '(تخفيض -10% محتسب)' : ''}

📍 الاستلام (Prise en charge) :
• المدينة : ${pickupCityLabel}
• المكان : ${pickupLocation}
• التاريخ : ${pickupDate} مع ${pickupTime}

📍 الإرجاع (Restitution) :
• المدينة : ${returnCityLabel}
• المكان : ${returnLocation}
• التاريخ : ${returnDate} مع ${returnTime}

🚚 مصاريف التوصيل : يتم تأكيدها عبر واتساب حسب المدينة أو المطار.

👤 الزبون : ${clientName}
📞 الهاتف : ${clientPhone}`;

        if (clientEmail) msg += `\n📧 البريد الإلكتروني : ${clientEmail}`;
        if (flightNumber) msg += `\n✈️ رقم الرحلة : ${flightNumber}`;
        if (babySeatChecked) msg += `\n👶 كرسي الأطفال : نعم (مجاني)`;
        if (wifiChecked) msg += `\n📶 موديم Wi-Fi 4G : نعم`;
        if (notes) msg += `\n📝 ملاحظة : ${notes}`;
        if (hasDocs) msg += `\n📄 الوثائق (CIN / Permis) : تم إرفاق ${docCount}/4 وثائق عبر الموقع تسريعًا للاستلام`;

        msg += `\n\nشكرًا وعافاكم أكدوا لي التوفر والمصاريف النهائية !`;

      } else if (currentLang === 'en') {
        msg = 
`Hello WINON CAR,

I would like to book the following vehicle in Agadir:
🚗 Vehicle: ${car.name}
💰 Rental rate: ${car.priceMAD} MAD / day
⏱ Duration: ${days} day(s)
💵 Estimated total: ${totalMAD} MAD (~${totalEUR} €) ${isDiscounted ? '(-10% long term discount applied)' : ''}

📍 PICKUP:
• City: ${pickupCityLabel}
• Location: ${pickupLocation}
• Date: ${pickupDate} at ${pickupTime}

📍 RETURN:
• City: ${returnCityLabel}
• Location: ${returnLocation}
• Date: ${returnDate} at ${returnTime}

🚚 DELIVERY FEES: To be confirmed via WhatsApp depending on city/airport.

👤 Client: ${clientName}
📞 Phone: ${clientPhone}`;

        if (clientEmail) msg += `\n📧 Email: ${clientEmail}`;
        if (flightNumber) msg += `\n✈️ Flight No: ${flightNumber}`;
        if (babySeatChecked) msg += `\n👶 Baby seat: Yes (Free)`;
        if (wifiChecked) msg += `\n📶 4G Wi-Fi hotspot: Yes`;
        if (notes) msg += `\n📝 Notes: ${notes}`;
        if (hasDocs) msg += `\n📄 Client Documents: ${docCount}/4 attached via website for fast-track pickup`;

        msg += `\n\nPlease confirm vehicle availability and delivery fees!`;

      } else {
        msg = 
`Bonjour WINON CAR,

Je souhaite réserver le véhicule suivant :
🚗 Véhicule : ${car.name}
💰 Tarif location : ${car.priceMAD} MAD / jour
⏱ Durée : ${days} jour(s)
💵 Total location estimé : ${totalMAD} MAD (~${totalEUR} €) ${isDiscounted ? '(Remise -10% incluse)' : ''}

📍 PRISE EN CHARGE :
• Ville : ${pickupCityLabel}
• Lieu : ${pickupLocation}
• Date : ${pickupDate} à ${pickupTime}

📍 RESTITUTION :
• Ville : ${returnCityLabel}
• Lieu : ${returnLocation}
• Date : ${returnDate} à ${returnTime}

🚚 FRAIS DE LIVRAISON : À confirmer via WhatsApp selon la ville/aéroport.

👤 Client : ${clientName}
📞 Téléphone : ${clientPhone}`;

        if (clientEmail) msg += `\n📧 Email : ${clientEmail}`;
        if (flightNumber) msg += `\n✈️ N° Vol : ${flightNumber}`;
        if (babySeatChecked) msg += `\n👶 Siège bébé : Oui (Offert)`;
        if (wifiChecked) msg += `\n📶 Option Wi-Fi 4G : Oui`;
        if (notes) msg += `\n📝 Note particulière : ${notes}`;
        if (hasDocs) msg += `\n📄 Documents clients : ${docCount}/4 pièces jointes via le site (coupe-file)`;

        msg += `\n\nMerci de me confirmer la disponibilité du véhicule et les frais de livraison !`;
      }

      return encodeURIComponent(msg);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // --- 10b. BOOKING FORM VALIDATION ENGINE ---
    // Strict rule: phone must be exactly 10 digits, digits only, no letters.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Show an inline error below an input field.
     * @param {string} fieldId  - id of the <div id="...Error"> container
     * @param {string} message  - text to display
     */
    function showFieldError(fieldId, message) {
      const container = document.getElementById(fieldId);
      if (!container) return;
      const span = container.querySelector('.error-msg');
      if (span) span.textContent = message;
      container.classList.remove('hidden');
      // Highlight the sibling input/select with a red border
      const input = container.previousElementSibling;
      if (input && (input.tagName === 'INPUT' || input.tagName === 'SELECT')) {
        input.classList.add('border-rose-500');
        input.classList.remove('border-slate-700');
      }
    }

    /**
     * Clear an inline error container and reset the input border.
     * @param {string} fieldId
     */
    function clearFieldError(fieldId) {
      const container = document.getElementById(fieldId);
      if (!container) return;
      container.classList.add('hidden');
      const input = container.previousElementSibling;
      if (input && (input.tagName === 'INPUT' || input.tagName === 'SELECT')) {
        input.classList.remove('border-rose-500');
        input.classList.add('border-slate-700');
      }
    }

    /**
     * Get the current translation string for a validation key.
     * Falls back to French when key is missing.
     */
    function t(key) {
      if (typeof WINON_TRANSLATIONS !== 'undefined' && WINON_TRANSLATIONS[currentLang]) {
        return WINON_TRANSLATIONS[currentLang][key] || WINON_TRANSLATIONS['fr'][key] || key;
      }
      return key;
    }

    /**
     * Validate the phone field (strict: exactly 10 digits, no letters).
     * Returns true when valid, false + shows error when invalid.
     */
    function validatePhoneField() {
      const phoneInput = document.getElementById('clientPhone');
      const raw = phoneInput ? phoneInput.value : '';

      // Rule 1 – must not contain any letters
      if (/[a-zA-Z\u0600-\u06FF]/.test(raw)) {
        showFieldError('clientPhoneError', t('error_phone_letters'));
        return false;
      }

      // Rule 2 – strip everything that's not a digit, normalize Moroccan prefixes, count exactly 10
      let digits = raw.replace(/\D/g, '');
      if (digits.startsWith('00212') && digits.length === 14) {
        digits = '0' + digits.slice(5);
        if (phoneInput && phoneInput.value !== digits) phoneInput.value = digits;
      } else if ((raw.trim().startsWith('+212') || digits.startsWith('212')) && digits.length === 12) {
        digits = '0' + digits.slice(3);
        if (phoneInput && phoneInput.value !== digits) phoneInput.value = digits;
      }

      if (digits.length !== 10) {
        showFieldError('clientPhoneError', t('error_phone_invalid'));
        return false;
      }

      clearFieldError('clientPhoneError');
      return true;
    }

    /**
     * Validate the full name field (≥ 2 printable characters, no HTML tags).
     */
    function validateNameField() {
      const nameInput = document.getElementById('clientName');
      const val = nameInput ? nameInput.value.replace(/<[^>]*>/g, '').trim() : '';
      if (val.length < 2) {
        showFieldError('clientNameError', t('error_name_required'));
        return false;
      }
      clearFieldError('clientNameError');
      return true;
    }

    /**
     * Validate the optional email field (RFC-basic pattern when non-empty).
     */
    function validateEmailField() {
      const emailInput = document.getElementById('clientEmail');
      const val = emailInput ? emailInput.value.trim() : '';
      if (val === '') { clearFieldError('clientEmailError'); return true; } // optional
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val) && val.length <= 120;
      if (!ok) {
        showFieldError('clientEmailError', t('error_email_invalid'));
        return false;
      }
      clearFieldError('clientEmailError');
      return true;
    }

    /**
     * Validate date/time chronology: return must be strictly after pickup.
     */
    function validateDatesField() {
      const pickupDate = document.getElementById('pickupDate')?.value;
      const pickupTime = document.getElementById('pickupTime')?.value || '10:00';
      const returnDate = document.getElementById('returnDate')?.value;
      const returnTime = document.getElementById('returnTime')?.value || '10:00';

      if (!pickupDate || !returnDate) return true; // handled by HTML required
      const start = new Date(`${pickupDate}T${pickupTime}`);
      const end   = new Date(`${returnDate}T${returnTime}`);
      if (isNaN(start) || isNaN(end) || end <= start) {
        showFieldError('datesError', t('error_dates_invalid'));
        return false;
      }
      clearFieldError('datesError');
      return true;
    }

    /**
     * Run all booking form validations. Returns true only when all pass.
     * Also shows / hides the top-level error banner.
     */
    function validateBookingForm() {
      const phoneOk  = validatePhoneField();
      const nameOk   = validateNameField();
      const emailOk  = validateEmailField();
      const datesOk  = validateDatesField();
      const allOk    = phoneOk && nameOk && emailOk && datesOk;

      const banner = document.getElementById('bookingFormErrorBanner');
      if (banner) {
        if (!allOk) {
          const bannerText = banner.querySelector('.error-banner-text');
          if (bannerText) bannerText.textContent = t('error_form_has_errors');
          banner.classList.remove('hidden');
          // Scroll banner into view smoothly
          banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          banner.classList.add('hidden');
        }
      }
      return allOk;
    }

    /**
     * Called by setLanguage() to refresh any already-visible error messages
     * in the current active language without re-running the full validation.
     */
    function refreshVisibleValidationErrors() {
      const errorMap = {
        clientPhoneError : 'error_phone_invalid',
        clientNameError  : 'error_name_required',
        clientEmailError : 'error_email_invalid',
        datesError       : 'error_dates_invalid'
      };
      Object.entries(errorMap).forEach(([containerId, key]) => {
        const container = document.getElementById(containerId);
        if (container && !container.classList.contains('hidden')) {
          const span = container.querySelector('.error-msg');
          if (span) span.textContent = t(key);
        }
      });
      const banner = document.getElementById('bookingFormErrorBanner');
      if (banner && !banner.classList.contains('hidden')) {
        const bt = banner.querySelector('.error-banner-text');
        if (bt) bt.textContent = t('error_form_has_errors');
      }
    }

    // ── Live feedback listeners (attached once DOM is ready) ──────────────────
    document.addEventListener('DOMContentLoaded', () => {
      const phoneInput = document.getElementById('clientPhone');
      const nameInput  = document.getElementById('clientName');
      const emailInput = document.getElementById('clientEmail');
      const pickupDateInput  = document.getElementById('pickupDate');
      const pickupTimeInput  = document.getElementById('pickupTime');
      const returnDateInput  = document.getElementById('returnDate');
      const returnTimeInput  = document.getElementById('returnTime');

      // Phone: block any non-digit keystroke live + validate on input
      if (phoneInput) {
        // Prevent letters from being typed at all
        phoneInput.addEventListener('keypress', (e) => {
          if (!/[0-9]/.test(e.key) && !['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Enter'].includes(e.key)) {
            e.preventDefault();
          }
        });
        // Also handle paste: strip non-digits immediately
        phoneInput.addEventListener('paste', (e) => {
          e.preventDefault();
          const pasted = (e.clipboardData || window.clipboardData).getData('text');
          let digitsOnly = pasted.replace(/\D/g, '');
          if (digitsOnly.startsWith('212') && digitsOnly.length === 12) digitsOnly = '0' + digitsOnly.slice(3);
          const cur = phoneInput.value;
          const start = phoneInput.selectionStart;
          const end   = phoneInput.selectionEnd;
          phoneInput.value = cur.slice(0, start) + digitsOnly + cur.slice(end);
          validatePhoneField();
        });
        // Live validation as user types
        phoneInput.addEventListener('input', () => {
          // Strip any non-digit characters automatically
          let cleaned = phoneInput.value.replace(/\D/g, '');
          if (cleaned.startsWith('212') && cleaned.length === 12) cleaned = '0' + cleaned.slice(3);
          if (phoneInput.value !== cleaned) phoneInput.value = cleaned;
          if (phoneInput.value.length > 0) validatePhoneField();
          else clearFieldError('clientPhoneError');
        });
        phoneInput.addEventListener('blur', validatePhoneField);
      }

      if (nameInput) {
        nameInput.addEventListener('input', () => {
          if (nameInput.value.trim().length > 0) validateNameField();
          else clearFieldError('clientNameError');
        });
        nameInput.addEventListener('blur', validateNameField);
      }

      if (emailInput) {
        emailInput.addEventListener('input', () => {
          if (emailInput.value.trim().length > 0) validateEmailField();
          else clearFieldError('clientEmailError');
        });
        emailInput.addEventListener('blur', validateEmailField);
      }

      [pickupDateInput, pickupTimeInput, returnDateInput, returnTimeInput].forEach(el => {
        if (el) el.addEventListener('change', validateDatesField);
      });
    });

    function submitViaWhatsApp() {
      const nameInput  = document.getElementById('clientName');
      const phoneInput = document.getElementById('clientPhone');

      // Validate name
      if (!validateNameField()) {
        nameInput.focus();
        return;
      }

      // Validate phone (exactly 10 digits, no letters)
      if (!validatePhoneField()) {
        phoneInput.focus();
        return;
      }

      const encodedMsg = buildWhatsAppBookingMessage();
      const whatsappUrl = `https://wa.me/212604707847?text=${encodedMsg}`;
      window.open(whatsappUrl, '_blank');
    }

    // --- 11. FORM SUBMISSION HANDLER ---
    function handleFormSubmit(event) {
      event.preventDefault();

      // Run all validations — stop here if any field is invalid
      if (!validateBookingForm()) return;
      if (window.__winonSubmitting) return; // prevent duplicate submissions
      const car = CARS_DATABASE.find(c => c.id === currentSelectedCarId) || CARS_DATABASE[0];
      const days = calculateDays();
      const isDiscounted = days >= 7;
      const discountRate = isDiscounted ? 0.10 : 0.0;
      const subtotalCars = days * car.priceMAD;
      const discountMAD = Math.round(subtotalCars * discountRate);
      
      const wifiChecked = document.getElementById('optWifi')?.checked;
      const wifiDaily = wifiChecked ? 30 : 0;
      const totalMAD = (subtotalCars - discountMAD) + (days * wifiDaily);
      const totalEUR = Math.round(totalMAD / MAD_TO_EUR_RATE);

      const { pickupCityLabel, pickupLocation, returnCityLabel, returnLocation } = getSelectedLocationDetails();
      const pickupDate = document.getElementById('pickupDate').value;
      const returnDate = document.getElementById('returnDate').value;
      const clientName = document.getElementById('clientName').value.trim();
      const clientPhone = document.getElementById('clientPhone').value.trim();

      const bookingRef = 'WN-' + Math.floor(1000 + Math.random() * 9000);
      document.getElementById('confirmBookingRef').textContent = bookingRef;

      const docCount = Object.values(uploadedDocs).filter(Boolean).length;
      const docsRowHtml = docCount > 0 
        ? `<div class="flex justify-between border-b border-slate-200 pb-1 text-xs text-emerald-700 font-semibold">
             <span>${currentLang === 'ar' ? 'الوثائق المرفقة:' : (currentLang === 'en' ? 'Attached Docs:' : 'Documents :')}</span>
             <span>${docCount}/4 ${currentLang === 'ar' ? 'وثائق مرفقة (تسريع الاستلام)' : (currentLang === 'en' ? 'attached (fast-track)' : 'pièces fournies (coupe-file)')}</span>
           </div>`
        : '';

      const detailsHtml = `
        <div class="flex justify-between border-b border-slate-200 pb-1">
          <span class="text-slate-500">${currentLang === 'ar' ? 'السيارة:' : (currentLang === 'en' ? 'Vehicle:' : 'Véhicule :')}</span>
          <strong class="text-slate-900">${car.name}</strong>
        </div>
        <div class="flex justify-between border-b border-slate-200 pb-1">
          <span class="text-slate-500">${currentLang === 'ar' ? 'التواريخ:' : (currentLang === 'en' ? 'Dates:' : 'Dates :')}</span>
          <span class="text-slate-800">${pickupDate} &rarr; ${returnDate} (${days} j)</span>
        </div>
        <div class="flex justify-between border-b border-slate-200 pb-1">
          <span class="text-slate-500">${currentLang === 'ar' ? 'الاستلام:' : (currentLang === 'en' ? 'Pickup:' : 'Prise en charge :')}</span>
          <span class="text-slate-800">${pickupCityLabel} — ${pickupLocation}</span>
        </div>
        <div class="flex justify-between border-b border-slate-200 pb-1">
          <span class="text-slate-500">${currentLang === 'ar' ? 'الإرجاع:' : (currentLang === 'en' ? 'Return:' : 'Restitution :')}</span>
          <span class="text-slate-800">${returnCityLabel} — ${returnLocation}</span>
        </div>
        <div class="flex justify-between border-b border-slate-200 pb-1 text-xs text-amber-700 font-semibold">
          <span>${currentLang === 'ar' ? 'مصاريف التوصيل:' : (currentLang === 'en' ? 'Delivery fees:' : 'Frais de livraison :')}</span>
          <span>${currentLang === 'ar' ? 'يُؤكَّد عبر واتساب' : (currentLang === 'en' ? 'To confirm via WhatsApp' : 'À confirmer via WhatsApp')}</span>
        </div>
        ${docsRowHtml}
        <div class="flex justify-between border-b border-slate-200 pb-1">
          <span class="text-slate-500">${currentLang === 'ar' ? 'العميل:' : (currentLang === 'en' ? 'Client:' : 'Client :')}</span>
          <span class="text-slate-800">${clientName} (${clientPhone})</span>
        </div>
        <div class="flex justify-between pt-1">
          <span class="font-bold text-slate-700">${currentLang === 'ar' ? 'المجموع التقديري:' : (currentLang === 'en' ? 'Estimated Total:' : 'Total location estimé :')}</span>
          <strong class="text-brand-gold text-sm">${totalMAD} MAD (~${totalEUR} €)</strong>
        </div>
      `;
      document.getElementById('confirmModalDetails').innerHTML = detailsHtml;

      const encodedMsg = buildWhatsAppBookingMessage();
      const whatsappUrl = `https://wa.me/212604707847?text=${encodedMsg}`;
      document.getElementById('confirmModalWhatsAppBtn').href = whatsappUrl;
      // Enregistrement dans Cloudflare D1 via l'API (avec langue & documents)
      const bookingPayload = {
        bookingRef,
        carId: car.id,
        carName: car.name,
        pickupCity: pickupCityLabel,
        pickupLocation: pickupLocation,
        returnCity: returnCityLabel,
        returnLocation: returnLocation,
        pickupDate,
        pickupTime: document.getElementById('pickupTime')?.value || '10:00',
        returnDate,
        returnTime: document.getElementById('returnTime')?.value || '10:00',
        days,
        flightNumber: document.getElementById('flightNumber')?.value.trim() || null,
        clientName,
        clientPhone,
        clientEmail: document.getElementById('clientEmail')?.value.trim() || null,
        notes: document.getElementById('bookingNotes')?.value.trim() || null,
        optWifi: !!wifiChecked,
        totalMAD,
        totalEUR,
        clientLanguage: currentLang,
        docCinRecto: uploadedDocs.cinRecto || null,
        docCinVerso: uploadedDocs.cinVerso || null,
        docLicenseRecto: uploadedDocs.licenseRecto || null,
        docLicenseVerso: uploadedDocs.licenseVerso || null
      };

      const submitBtn = document.getElementById('rSubmitBtn');
      const banner = document.getElementById('bookingFormErrorBanner');
      if (banner) banner.classList.add('hidden');
      window.__winonSubmitting = true;
      const prevBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>' + docText('submit_loading', 'Envoi en cours…') + '</span>'; }

      fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload)
      }).then(res => res.json().then(result => ({ ok: res.ok, result })))
        .then(({ ok, result }) => {
          if (ok && result && result.success) {
            console.log('[WINON CAR] Réservation enregistrée dans D1 :', result);
            document.getElementById('confirmModal').classList.remove('hidden');
            if (submitBtn) submitBtn.innerHTML = prevBtnHtml;
          } else {
            throw new Error((result && result.error) ? result.error : 'submit_failed');
          }
        })
        .catch(err => {
          console.warn('[WINON CAR] Échec enregistrement réservation :', err);
          window.__winonSubmitting = false;
          if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = prevBtnHtml; }
          if (banner) {
            const span = banner.querySelector('.error-banner-text');
            if (span) span.textContent = docText('submit_error', "L'envoi a échoué. Vos informations sont conservées — réessayez ou utilisez WhatsApp.");
            banner.classList.remove('hidden');
            const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            banner.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
          }
        });
    }

    function closeConfirmModal() {
      document.getElementById('confirmModal').classList.add('hidden');
    }

    // --- 12. FAQ ACCORDION TOGGLE ---
    function toggleFaq(btn) {
      const content = btn.nextElementSibling;
      const icon = btn.querySelector('.fa-chevron-down');
      const isHidden = content.classList.contains('hidden');

      // Close all other FAQs
      document.querySelectorAll('#faqAccordion .faq-content').forEach(c => c.classList.add('hidden'));
      document.querySelectorAll('#faqAccordion .fa-chevron-down').forEach(i => i.style.transform = '');

      if (isHidden) {
        content.classList.remove('hidden');
        if (icon) icon.style.transform = 'rotate(180deg)';
      }
    }

    // --- 13. MOBILE MENU TOGGLE ---
    function setupMobileMenu() {
      const btn = document.getElementById('mobileMenuBtn');
      const menu = document.getElementById('mobileMenu');
      const icon = document.getElementById('menuIcon');
      const links = document.querySelectorAll('.mobile-link');

      btn.addEventListener('click', () => {
        const isHidden = menu.classList.contains('hidden');
        if (isHidden) {
          menu.classList.remove('hidden');
          icon.classList.remove('fa-bars');
          icon.classList.add('fa-xmark');
        } else {
          menu.classList.add('hidden');
          icon.classList.remove('fa-xmark');
          icon.classList.add('fa-bars');
        }
      });

      links.forEach(link => {
        link.addEventListener('click', () => {
          menu.classList.add('hidden');
          icon.classList.remove('fa-xmark');
          icon.classList.add('fa-bars');
        });
      });
    }

    // --- 4b. VEHICLE SLIDER (homepage #flotte: 3 cards/view with arrows, dots, search) ---
    let currentCarSearch = '';
    let vehicleSliderPage = 0;

    function vehicleSlidesPerView() {
      const w = window.innerWidth;
      return w >= 1024 ? 3 : (w >= 768 ? 2 : 1);
    }
    function vehicleSliderPages() {
      const track = document.getElementById('carCatalogGrid');
      if (!track) return 1;
      return Math.max(1, Math.ceil(track.children.length / vehicleSlidesPerView()));
    }
    function applyVehicleSlider() {
      const track = document.getElementById('carCatalogGrid');
      if (!track) return;
      const pages = vehicleSliderPages();
      if (vehicleSliderPage > pages - 1) vehicleSliderPage = pages - 1;
      if (vehicleSliderPage < 0) vehicleSliderPage = 0;
      track.style.transform = 'translateX(-' + (vehicleSliderPage * 100) + '%)';
      const prev = document.getElementById('carSliderPrev');
      const next = document.getElementById('carSliderNext');
      const multi = pages > 1;
      if (prev) { prev.disabled = vehicleSliderPage <= 0; prev.style.visibility = multi ? 'visible' : 'hidden'; }
      if (next) { next.disabled = vehicleSliderPage >= pages - 1; next.style.visibility = multi ? 'visible' : 'hidden'; }
      const dots = document.getElementById('carSliderDots');
      if (dots) dots.style.display = multi ? 'flex' : 'none';
    }
    function renderVehicleSliderDots() {
      const dots = document.getElementById('carSliderDots');
      if (!dots) return;
      const pages = vehicleSliderPages();
      dots.innerHTML = '';
      for (let i = 0; i < pages; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'v-dot' + (i === vehicleSliderPage ? ' active' : '');
        b.setAttribute('aria-label', 'Page ' + (i + 1));
        b.addEventListener('click', () => { vehicleSliderPage = i; applyVehicleSlider(); renderVehicleSliderDots(); });
        dots.appendChild(b);
      }
    }
    function refreshVehicleSlider() { applyVehicleSlider(); renderVehicleSliderDots(); }
    function vehicleSliderNext() { vehicleSliderPage++; applyVehicleSlider(); renderVehicleSliderDots(); }
    function vehicleSliderPrev() { vehicleSliderPage--; applyVehicleSlider(); renderVehicleSliderDots(); }
    function resetVehicleFilters() {
      currentCarSearch = '';
      const s = document.getElementById('carSearch'); if (s) s.value = '';
      vehicleSliderPage = 0;
      const allBtn = document.querySelector('#categoryFilterContainer .filter-btn[data-category="all"]');
      if (allBtn) { allBtn.click(); } else { renderCarCatalog('all'); }
    }
    function setupVehicleSlider() {
      const prev = document.getElementById('carSliderPrev');
      const next = document.getElementById('carSliderNext');
      if (prev) prev.addEventListener('click', vehicleSliderPrev);
      if (next) next.addEventListener('click', vehicleSliderNext);
      const search = document.getElementById('carSearch');
      if (search) search.addEventListener('input', () => {
        currentCarSearch = search.value;
        vehicleSliderPage = 0;
        renderCarCatalog(currentCategoryFilter || 'all');
      });
      const vp = document.getElementById('carSliderViewport');
      if (vp) {
        let sx = 0, dx = 0, active = false;
        vp.addEventListener('touchstart', e => { active = true; sx = e.touches[0].clientX; dx = 0; }, { passive: true });
        vp.addEventListener('touchmove', e => { if (active) dx = e.touches[0].clientX - sx; }, { passive: true });
        vp.addEventListener('touchend', () => { if (active) { if (Math.abs(dx) > 40) { if (dx < 0) { vehicleSliderNext(); } else { vehicleSliderPrev(); } } active = false; } });
        vp.addEventListener('keydown', e => {
          if (e.key === 'ArrowRight') { e.preventDefault(); vehicleSliderNext(); }
          else if (e.key === 'ArrowLeft') { e.preventDefault(); vehicleSliderPrev(); }
        });
      }
      let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(refreshVehicleSlider, 150); });
    }
    // Visual vehicle selection cards for reservation step 2 (drives the hidden #carSelect).
    function renderVehicleSelectCards() {
      const wrap = document.getElementById('carSelectCards');
      const sel = document.getElementById('carSelect');
      if (!wrap || !sel) return;
      const selectedId = sel.value || currentSelectedCarId;
      wrap.innerHTML = '';
      CARS_DATABASE.forEach(car => {
        const eur = Math.round(car.priceMAD / MAD_TO_EUR_RATE);
        const checked = car.id === selectedId;
        let statusTxt = '';
        if (car.availability === 'maintenance') statusTxt = ' \u2022 En r\u00e9vision';
        else if (car.availability === 'loue') statusTxt = ' \u2022 En location';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', checked ? 'true' : 'false');
        btn.setAttribute('data-car-id', car.id);
        btn.className = 'vsel-card';
        btn.innerHTML =
          '<img src="' + car.image + '" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'assets/cars/dacia-sandero-stepway.jpg\';">' +
          '<div class="min-w-0 flex-1">' +
            '<p class="font-bold text-white text-sm leading-tight truncate">' + car.name + '</p>' +
            '<p class="text-[11px] text-slate-400 truncate">' + car.specs.gearbox + ' \u2022 ' + car.specs.fuel + ' \u2022 ' + car.specs.seats + '</p>' +
            '<p class="text-sm font-black text-brand-gold mt-0.5">' + car.priceMAD + ' MAD <span class="text-[10px] text-slate-400 font-medium">/ jour (~' + eur + ' \u20ac)' + statusTxt + '</span></p>' +
          '</div>' +
          '<span class="vsel-radio" aria-hidden="true"></span>';
        btn.addEventListener('click', () => {
          sel.value = car.id;
          currentSelectedCarId = car.id;
          updateBookingCalculation();
          renderVehicleSelectCards();
        });
        wrap.appendChild(btn);
      });
    }

    function preselectCarFromQuery() {
      try {
        const carId = new URLSearchParams(window.location.search).get('car');
        if (!carId) return;
        const sel = document.getElementById('carSelect');
        if (sel && CARS_DATABASE.some(c => c.id === carId)) {
          currentSelectedCarId = carId;
          sel.value = carId;
          updateBookingCalculation();
        }
      } catch (e) {}
    }

    // --- 14. RESERVATION STEPPER (landing-page 4-step flow) ---
    // Reuses the existing fields, validators, pricing and submit flow.
    // Panels are grouped by .rstep[data-rstep]; only field VISIBILITY changes.
    let reservationStep = 1;
    const RESERVATION_TOTAL_STEPS = 5;
    const RESERVATION_STEP_HEADINGS = {
      1: { fr: 'Trajet', en: 'Trip', ar: 'المسار' },
      2: { fr: 'Véhicule', en: 'Vehicle', ar: 'السيارة' },
      3: { fr: 'Vos informations', en: 'Your details', ar: 'معلوماتك' },
      4: { fr: 'Documents', en: 'Documents', ar: 'الوثائق' },
      5: { fr: 'Confirmation', en: 'Confirmation', ar: 'التأكيد' }
    };

    function initReservationStepper() {
      if (!document.querySelector('.rstep')) return; // stepper markup absent
      reservationStep = 1;
      renderReservationStep(false);
    }

    function renderReservationStep(focusHeading) {
      document.querySelectorAll('.rstep').forEach(p => {
        p.hidden = Number(p.getAttribute('data-rstep')) !== reservationStep;
      });

      for (let i = 1; i <= RESERVATION_TOTAL_STEPS; i++) {
        const dot = document.getElementById('rDot-' + i);
        const lbl = document.getElementById('rLbl-' + i);
        const line = document.getElementById('rLine-' + i);
        const stt = i < reservationStep ? 'done' : (i === reservationStep ? 'current' : '');
        if (dot) {
          dot.setAttribute('data-state', stt);
          dot.innerHTML = (stt === 'done') ? '<i class="fa-solid fa-check"></i>' : String(i);
        }
        if (lbl) lbl.setAttribute('data-state', stt);
        if (line && i < RESERVATION_TOTAL_STEPS) line.setAttribute('data-state', i < reservationStep ? 'done' : '');
      }

      const heading = document.getElementById('rStepHeading');
      if (heading) heading.textContent = RESERVATION_STEP_HEADINGS[reservationStep][currentLang] || RESERVATION_STEP_HEADINGS[reservationStep].fr;
      const count = document.getElementById('rStepCount');
      if (count) count.textContent = (currentLang === 'ar') ? ('الخطوة ' + reservationStep + ' من 5')
        : (currentLang === 'en' ? ('Step ' + reservationStep + ' / 5') : ('Étape ' + reservationStep + ' / 5'));

      const back = document.getElementById('rBackBtn');
      const next = document.getElementById('rNextBtn');
      if (back) back.classList.toggle('invisible', reservationStep === 1);
      if (next) next.classList.toggle('hidden', reservationStep === RESERVATION_TOTAL_STEPS);
      const submitBtn = document.getElementById('rSubmitBtn');
      if (submitBtn) submitBtn.classList.toggle('hidden', reservationStep !== RESERVATION_TOTAL_STEPS);
      if (next) {
        const _ns = next.querySelector('span');
        if (_ns) {
          const _k = {1:'step_next_vehicle',2:'step_next_infos',3:'step_next_documents',4:'step_next_confirm'}[reservationStep] || 'step_next_default';
          const _t = (typeof WINON_TRANSLATIONS !== 'undefined' && WINON_TRANSLATIONS[currentLang] && WINON_TRANSLATIONS[currentLang][_k]);
          if (_t) { _ns.textContent = _t; _ns.removeAttribute('data-i18n'); }
        }
      }

      if (reservationStep === 2 && typeof renderVehicleSelectCards === 'function') renderVehicleSelectCards();
      if (reservationStep === RESERVATION_TOTAL_STEPS) buildReservationReview();

      if (focusHeading && heading) { try { heading.focus({ preventScroll: true }); } catch (e) {} }
    }

    function reservationStepNext() {
      if (!validateReservationStep(reservationStep)) return;
      if (reservationStep < RESERVATION_TOTAL_STEPS) { reservationStep++; renderReservationStep(true); }
    }

    function reservationStepBack() {
      if (reservationStep > 1) { reservationStep--; renderReservationStep(true); }
    }

    function validateReservationStep(step) {
      if (step === 1) {
        return (typeof validateDatesField === 'function') ? validateDatesField() : true;
      }
      if (step === 2) {
        const sel = document.getElementById('carSelect');
        return !!(sel && sel.value);
      }
      if (step === 3) {
        const okName = (typeof validateNameField === 'function') ? validateNameField() : true;
        const okPhone = (typeof validatePhoneField === 'function') ? validatePhoneField() : true;
        const okEmail = (typeof validateEmailField === 'function') ? validateEmailField() : true;
        return okName && okPhone && okEmail;
      }
      return true;
    }

    function buildReservationReview() {
      const review = document.getElementById('rReview');
      if (!review) return;
      const car = CARS_DATABASE.find(c => c.id === currentSelectedCarId) || CARS_DATABASE[0];
      const days = calculateDays();
      const loc = (typeof getSelectedLocationDetails === 'function') ? getSelectedLocationDetails() : {};
      const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
      const pickupDate = val('pickupDate'), pickupTime = val('pickupTime');
      const returnDate = val('returnDate'), returnTime = val('returnTime');
      const name = (val('clientName') || '').trim();
      const phone = (val('clientPhone') || '').trim();
      const wifi = document.getElementById('optWifi') && document.getElementById('optWifi').checked;
      const totalText = (document.getElementById('summaryTotal') || {}).textContent || '';
      const totalEur = (document.getElementById('summaryTotalEur') || {}).textContent || '';
      const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      const row = (k, v) => '<div class="flex justify-between gap-3 border-b border-slate-700/60 pb-1.5"><span class="text-slate-400">' + k + '</span><span class="text-white font-semibold text-right">' + (esc(v) || '—') + '</span></div>';
      const _dc = Object.values(uploadedDocs).filter(Boolean).length;
      const _dt = (k,f)=>((typeof WINON_TRANSLATIONS!=='undefined' && WINON_TRANSLATIONS[currentLang] && WINON_TRANSLATIONS[currentLang][k]) || f);
      const _docLabel = _dt('doc_status_label','Documents');
      const _docStatus = _dc > 0 ? (_dc + '/4 ' + _dt('doc_status_count','pièce(s) jointe(s)')) : _dt('doc_status_none','Aucun document joint (facultatif)');
      review.innerHTML =
        row('Véhicule', car ? car.name : '—') +
        row('Prise en charge', loc.pickupLocation ? (loc.pickupCityLabel + ' — ' + loc.pickupLocation) : '—') +
        row('Restitution', loc.returnLocation ? (loc.returnCityLabel + ' — ' + loc.returnLocation) : '—') +
        row('Dates', pickupDate + ' ' + pickupTime + ' → ' + returnDate + ' ' + returnTime) +
        row('Durée', days + ' jour' + (days > 1 ? 's' : '')) +
        row('Options', wifi ? 'Wi-Fi 4G (+30 MAD/j)' : 'Standard') +
        row('Client', name ? (name + ' (' + phone + ')') : '—') +
        row(_docLabel, _docStatus) +
        '<div class="flex justify-between gap-3 pt-1"><span class="text-slate-300 font-bold">Total estimé</span><span class="gold-text-gradient font-extrabold">' + esc(totalText) + ' ' + esc(totalEur) + '</span></div>' +
        '<p class="text-[11px] text-amber-300/90 pt-1"><i class="fa-solid fa-circle-info mr-1"></i>Frais de livraison confirmés via WhatsApp. Votre demande est envoyée pour confirmation.</p>';
    }
  
