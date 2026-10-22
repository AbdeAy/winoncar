/*
 * WINON CAR — Shared "Back to top" floating button behaviour.
 * Self-initialising and idempotent so it can be included on any page
 * that renders an element with id="backToTopBtn".
 * Styling lives in assets/css/landing.css (#backToTopBtn).
 */
(function () {
  'use strict';

  var SHOW_AFTER = 400; // px scrolled before the button appears

  function init() {
    var btn = document.getElementById('backToTopBtn');
    if (!btn || btn.dataset.btInit === '1') return; // guard against double init
    btn.dataset.btInit = '1';

    var onScroll = function () {
      btn.classList.toggle('is-visible', window.scrollY > SHOW_AFTER);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // set correct state on load (e.g. refresh mid-page)

    btn.addEventListener('click', function () {
      var reduce = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
