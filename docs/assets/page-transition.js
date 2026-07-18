/**
 * Soft enter/leave transitions between static pages.
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

  // Enter: next frame so the CSS transition actually runs from opacity 0
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
  // Safety: never leave the page stuck invisible
  window.setTimeout(ready, 800);

  // Back/forward cache: restore without stuck is-leaving
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) ready();
  });

  // Sticky header: light elevation once the report scrolls under it
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
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireNavbarScroll);
  } else {
    wireNavbarScroll();
  }

  if (reduce) return;

  var LEAVE_MS = 210;

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
    // Same page (hash-only or identical path) — let the browser handle it
    if (url.pathname === location.pathname && url.search === location.search) return false;
    // Only animate between our HTML pages (not raw github assets, etc.)
    if (url.protocol !== "http:" && url.protocol !== "https:" && url.protocol !== "file:") return false;
    return /\.html?$|\/$/.test(url.pathname) || url.pathname.indexOf(".") === -1;
  }

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a[href]");
    if (!isInternalPageLink(a)) return;

    e.preventDefault();
    var href = a.href;
    document.body.classList.remove("is-ready");
    document.body.classList.add("is-leaving");
    window.setTimeout(function () {
      location.href = href;
    }, LEAVE_MS);
  });
})();
