/**
 * Soft enter/leave transitions + sticky navbar + mobile menu.
 * Marked up by <html class="page-trans"> so first paint stays dark (no white flash).
 */
(function () {
  var html = document.documentElement;
  if (!html.classList.contains("page-trans")) return;
  html.classList.add("js");

  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function ready() {
    document.body.classList.remove("is-leaving");
    document.body.classList.add("is-ready");
  }

  function scheduleReady() {
    requestAnimationFrame(function () {
      requestAnimationFrame(ready);
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleReady);
  } else {
    scheduleReady();
  }
  window.setTimeout(ready, 800);

  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
      closeNav(true);
      ready();
    }
  });

  /* ---------- sticky elevation ---------- */
  function wireNavbarScroll() {
    var nav = document.querySelector("header.navbar");
    if (!nav) return;
    var onScroll = function () {
      if (window.scrollY > 8) nav.classList.add("is-scrolled");
      else nav.classList.remove("is-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- mobile menu ---------- */
  var navEl, toggleBtn, scrim, panel;
  var mqDesktop = window.matchMedia ? window.matchMedia("(min-width: 769px)") : null;

  function isNavOpen() {
    return !!(navEl && navEl.classList.contains("is-open"));
  }

  // aria-hidden only applies to the mobile drawer; on desktop the panel is
  // always visible and must stay exposed to assistive tech.
  function syncPanelA11y() {
    if (!panel) return;
    if (!mqDesktop || mqDesktop.matches) panel.removeAttribute("aria-hidden");
    else panel.setAttribute("aria-hidden", isNavOpen() ? "false" : "true");
  }

  function setOpen(open) {
    if (!navEl || !toggleBtn) return;
    navEl.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    toggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
    toggleBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (scrim) scrim.hidden = !open;
    syncPanelA11y();
  }

  function closeNav(immediate) {
    if (!navEl) return;
    var focusInside = panel && panel.contains(document.activeElement);
    setOpen(false);
    if (focusInside && toggleBtn) toggleBtn.focus();
  }

  function openNav() {
    setOpen(true);
  }

  function toggleNav() {
    if (isNavOpen()) closeNav();
    else openNav();
  }

  function panelFocusables() {
    if (!panel) return [];
    return Array.prototype.slice.call(
      panel.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    );
  }

  // Keep Tab cycling through: toggle button -> drawer links -> gh button.
  function trapTab(e) {
    if (!toggleBtn) return;
    var items = [toggleBtn].concat(panelFocusables());
    var first = items[0];
    var last = items[items.length - 1];
    var active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !navEl.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function wireMobileNav() {
    navEl = document.querySelector("header.navbar");
    if (!navEl) return;
    toggleBtn = navEl.querySelector(".nav-toggle");
    scrim = navEl.querySelector(".nav-scrim") || document.getElementById("nav-scrim");
    panel = navEl.querySelector(".nav-panel");
    if (!toggleBtn) return;

    syncPanelA11y();

    toggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleNav();
    });

    if (scrim) {
      scrim.addEventListener("click", function () {
        closeNav();
      });
    }

    document.addEventListener("keydown", function (e) {
      if (!isNavOpen()) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeNav();
        if (toggleBtn) toggleBtn.focus();
      } else if (e.key === "Tab") {
        trapTab(e);
      }
    });

    // Close when switching to desktop layout; keep aria state in sync
    if (mqDesktop) {
      var onMq = function (ev) {
        if (ev.matches) closeNav(true);
        syncPanelA11y();
      };
      if (mqDesktop.addEventListener) mqDesktop.addEventListener("change", onMq);
      else if (mqDesktop.addListener) mqDesktop.addListener(onMq);
    }

    // Close after choosing a link (page leave also closes)
    if (panel) {
      panel.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest("a[href]");
        if (!a) return;
        // same-page hash or external — still close drawer
        closeNav();
      });
    }
  }

  function bootChrome() {
    wireNavbarScroll();
    wireMobileNav();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootChrome);
  } else {
    bootChrome();
  }

  if (reduce) return;

  var LEAVE_MS = 220;

  function isInternalPageLink(a) {
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return false;
    if (a.getAttribute("rel") && /\bexternal\b/.test(a.getAttribute("rel"))) return false;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || href.indexOf("mailto:") === 0 || href.indexOf("javascript:") === 0)
      return false;
    var url;
    try {
      url = new URL(a.href, location.href);
    } catch (err) {
      return false;
    }
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.search === location.search) return false;
    if (url.protocol !== "http:" && url.protocol !== "https:" && url.protocol !== "file:") return false;
    return /\.html?$|\/$/.test(url.pathname) || url.pathname.indexOf(".") === -1;
  }

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a[href]");
    if (!isInternalPageLink(a)) return;

    e.preventDefault();
    var href = a.href;
    closeNav(true);
    document.body.classList.remove("is-ready");
    document.body.classList.add("is-leaving");
    window.setTimeout(function () {
      location.href = href;
    }, LEAVE_MS);
  });
})();
