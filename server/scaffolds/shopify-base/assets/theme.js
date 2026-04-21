/* Yappaflow Shopify base theme — runtime behaviours.
 * Intentionally vanilla JS (no bundler). Everything here is progressive
 * enhancement: the page is fully functional without it, just less lively.
 *
 * Responsibilities:
 *  - Theme toggle (light / dark) with localStorage persistence
 *  - IntersectionObserver-powered scroll reveals
 *  - Mobile nav drawer
 *  - Ajax cart add + mini-cart count refresh
 *  - Product variant picker → updates hidden variantId + price
 *  - FAQ accordion
 *  - Back-to-top button
 *
 * Every block is wrapped in a feature-detect or element-exists check so
 * the script is safe to load on pages that don't include the feature.
 */

(function () {
  'use strict';

  var doc  = document;
  var root = doc.documentElement;

  /* ------------------------------------------------------------------ *
   * Theme toggle                                                        *
   * ------------------------------------------------------------------ */
  function initThemeToggle() {
    var buttons = doc.querySelectorAll('[data-theme-toggle]');
    if (!buttons.length) return;

    function current() {
      return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }
    function apply(theme) {
      root.setAttribute('data-theme', theme);
      try { localStorage.setItem('yappaflow_theme', theme); } catch (_) {}
      buttons.forEach(function (b) {
        b.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      });
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        apply(current() === 'dark' ? 'light' : 'dark');
      });
      btn.setAttribute('aria-pressed', current() === 'dark' ? 'true' : 'false');
    });
  }

  /* ------------------------------------------------------------------ *
   * Scroll reveals                                                      *
   * ------------------------------------------------------------------ */
  function initReveals() {
    var nodes = doc.querySelectorAll('[data-reveal]');
    if (!nodes.length) return;

    if (!('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('is-revealed'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-revealed');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ------------------------------------------------------------------ *
   * Mobile nav drawer                                                   *
   * ------------------------------------------------------------------ */
  function initNavDrawer() {
    var btn    = doc.querySelector('[data-nav-toggle]');
    var drawer = doc.querySelector('[data-nav-drawer]');
    if (!btn || !drawer) return;

    function setOpen(open) {
      drawer.toggleAttribute('data-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      doc.body.style.overflow = open ? 'hidden' : '';
    }

    btn.addEventListener('click', function () {
      setOpen(!drawer.hasAttribute('data-open'));
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.matches('[data-nav-close]') || e.target === drawer) setOpen(false);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  /* ------------------------------------------------------------------ *
   * Ajax cart add                                                       *
   * ------------------------------------------------------------------ */
  function updateCartCount(count) {
    var badges = doc.querySelectorAll('[data-cart-count]');
    badges.forEach(function (b) {
      b.textContent = String(count);
      b.toggleAttribute('data-empty', count === 0);
    });
  }

  function refreshCart() {
    return fetch('/cart.js', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (cart) { updateCartCount(cart.item_count); return cart; })
      .catch(function () { /* ignore */ });
  }

  function initAjaxAdd() {
    var forms = doc.querySelectorAll('form[action*="/cart/add"]');
    if (!forms.length) return;

    forms.forEach(function (form) {
      form.addEventListener('submit', function (e) {
        // Only intercept when JS can take over — respect explicit opt-out.
        if (form.hasAttribute('data-no-ajax')) return;
        e.preventDefault();

        var submit = form.querySelector('[type="submit"]');
        var originalText;
        if (submit) {
          originalText = submit.textContent;
          submit.setAttribute('disabled', 'true');
          submit.textContent = submit.getAttribute('data-loading-label') || 'Adding…';
        }

        var data = new FormData(form);
        fetch('/cart/add.js', {
          method:  'POST',
          headers: { Accept: 'application/json' },
          body:    data,
        })
          .then(function (r) {
            if (!r.ok) throw new Error('Add to cart failed');
            return r.json();
          })
          .then(function () { return refreshCart(); })
          .then(function () {
            if (submit) {
              submit.textContent = submit.getAttribute('data-success-label') || 'Added ✓';
              setTimeout(function () {
                submit.textContent = originalText;
                submit.removeAttribute('disabled');
              }, 1200);
            }
            doc.dispatchEvent(new CustomEvent('yf:cart-updated'));
          })
          .catch(function () {
            if (submit) {
              submit.textContent = originalText;
              submit.removeAttribute('disabled');
            }
            // Fallback: let the browser POST the form normally.
            form.setAttribute('data-no-ajax', 'true');
            form.submit();
          });
      });
    });

    // Prime count on first load.
    refreshCart();
  }

  /* ------------------------------------------------------------------ *
   * Product variant picker                                              *
   * ------------------------------------------------------------------ */
  function initVariantPicker() {
    var form = doc.querySelector('[data-product-form]');
    if (!form) return;

    var variantsEl = doc.querySelector('[data-variants-json]');
    if (!variantsEl) return;

    var variants;
    try { variants = JSON.parse(variantsEl.textContent || '[]'); }
    catch (_) { return; }
    if (!variants.length) return;

    var optionSelects = form.querySelectorAll('[data-option-index]');
    var hiddenId      = form.querySelector('input[name="id"]');
    var priceEl       = doc.querySelector('[data-price]');
    var comparePriceEl= doc.querySelector('[data-compare-price]');
    var submitBtn     = form.querySelector('[type="submit"]');

    function currentSelection() {
      return Array.from(optionSelects).map(function (s) { return s.value; });
    }

    function match() {
      var sel = currentSelection();
      return variants.find(function (v) {
        return sel.every(function (val, i) { return v.options[i] === val; });
      });
    }

    function formatMoney(cents) {
      if (typeof cents !== 'number') return '';
      var locale = doc.documentElement.lang || 'en';
      var currency = doc.documentElement.getAttribute('data-currency') || 'USD';
      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency', currency: currency,
        }).format(cents / 100);
      } catch (_) {
        return '$' + (cents / 100).toFixed(2);
      }
    }

    function apply() {
      var v = match();
      if (!v) {
        if (submitBtn) {
          submitBtn.setAttribute('disabled', 'true');
          submitBtn.textContent = submitBtn.getAttribute('data-unavailable-label') || 'Unavailable';
        }
        return;
      }
      if (hiddenId) hiddenId.value = String(v.id);
      if (priceEl) priceEl.textContent = formatMoney(v.price);
      if (comparePriceEl) {
        if (v.compare_at_price && v.compare_at_price > v.price) {
          comparePriceEl.textContent = formatMoney(v.compare_at_price);
          comparePriceEl.hidden = false;
        } else {
          comparePriceEl.hidden = true;
        }
      }
      if (submitBtn) {
        if (v.available) {
          submitBtn.removeAttribute('disabled');
          submitBtn.textContent = submitBtn.getAttribute('data-add-label') || 'Add to cart';
        } else {
          submitBtn.setAttribute('disabled', 'true');
          submitBtn.textContent = submitBtn.getAttribute('data-soldout-label') || 'Sold out';
        }
      }
    }

    optionSelects.forEach(function (s) {
      s.addEventListener('change', apply);
      s.addEventListener('input',  apply);
    });

    apply();
  }

  /* ------------------------------------------------------------------ *
   * FAQ accordion                                                       *
   * ------------------------------------------------------------------ */
  function initFaq() {
    var items = doc.querySelectorAll('[data-faq-item]');
    if (!items.length) return;

    items.forEach(function (item) {
      var trigger = item.querySelector('[data-faq-trigger]');
      var panel   = item.querySelector('[data-faq-panel]');
      if (!trigger || !panel) return;

      trigger.addEventListener('click', function () {
        var open = item.hasAttribute('data-open');
        item.toggleAttribute('data-open', !open);
        trigger.setAttribute('aria-expanded', String(!open));
        panel.hidden = open;
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Back-to-top                                                         *
   * ------------------------------------------------------------------ */
  function initBackToTop() {
    var btn = doc.querySelector('[data-back-to-top]');
    if (!btn) return;

    function onScroll() {
      btn.toggleAttribute('data-visible', window.scrollY > 400);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    onScroll();
  }

  /* ------------------------------------------------------------------ *
   * Boot                                                                *
   * ------------------------------------------------------------------ */
  function boot() {
    initThemeToggle();
    initReveals();
    initNavDrawer();
    initAjaxAdd();
    initVariantPicker();
    initFaq();
    initBackToTop();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
