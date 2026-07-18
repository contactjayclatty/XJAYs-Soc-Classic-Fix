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

  function setOpen(open) {
    if (!navEl || !toggleBtn) return;
    navEl.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    toggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
    toggleBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (scrim) {
      if (open) scrim.hidden = false;
      else scrim.hidden = true;
    }
  }

  function closeNav(immediate) {
    if (!navEl || !navEl.classList.contains("is-open")) {
      setOpen(false);
      return;
    }
    if (immediate || reduce) {
      setOpen(false);
      return;
    }
    setOpen(false);
  }

  function openNav() {
    setOpen(true);
  }

  function toggleNav() {
    if (navEl && navEl.classList.contains("is-open")) closeNav();
    else openNav();
  }

  function wireMobileNav() {
    navEl = document.querySelector("header.navbar");
    if (!navEl) return;
    toggleBtn = navEl.querySelector(".nav-toggle");
    scrim = navEl.querySelector(".nav-scrim") || document.getElementById("nav-scrim");
    panel = navEl.querySelector(".nav-panel");
    if (!toggleBtn) return;

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
      if (e.key === "Escape") closeNav();
    });

    // Close when switching to desktop layout
    if (window.matchMedia) {
      var mq = window.matchMedia("(min-width: 769px)");
      var onMq = function (ev) {
        if (ev.matches) closeNav(true);
      };
      if (mq.addEventListener) mq.addEventListener("change", onMq);
      else if (mq.addListener) mq.addListener(onMq);
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
