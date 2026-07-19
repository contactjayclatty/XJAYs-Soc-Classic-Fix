/**
 * Preflight modal shown before a module download starts.
 * Shows size / stack / virus-check fields and a short simulated
 * progress bar, then hands off to the real (cross-origin) download link.
 */
(function () {
  var overlay = document.getElementById("dlModalOverlay");
  if (!overlay) return;

  var closeBtn = document.getElementById("dlModalClose");
  var fill = document.getElementById("dlModalFill");
  var pctEl = document.getElementById("dlModalPct");
  var statusEl = document.getElementById("dlModalStatus");
  var titleEl = document.getElementById("dlModalTitle");
  var sizeEl = document.getElementById("dlModalSize");
  var stackEl = document.getElementById("dlModalStack");
  var virusEl = document.getElementById("dlModalVirus");

  var STEPS = [
    { pct: 25, status: "Preparing download…", delay: 200 },
    { pct: 55, status: "Resolving release asset…", delay: 260 },
    { pct: 85, status: "Handing off to GitHub…", delay: 240 },
    { pct: 100, status: "Starting download…", delay: 220 }
  ];

  var timers = [];
  var pendingHref = null;
  var lastFocused = null;

  function clearTimers() {
    timers.forEach(function (t) { window.clearTimeout(t); });
    timers = [];
  }

  function reset() {
    overlay.classList.remove("is-done");
    fill.style.width = "0%";
    pctEl.textContent = "0%";
    statusEl.textContent = "Preparing download…";
  }

  function openModal(link) {
    lastFocused = document.activeElement;
    titleEl.textContent = link.dataset.filename || link.textContent.trim();
    sizeEl.textContent = link.dataset.size || "—";
    stackEl.textContent = link.dataset.stack || "—";
    virusEl.textContent = link.dataset.virus || "—";
    pendingHref = link.href;

    reset();
    overlay.hidden = false;
    document.body.classList.add("dl-modal-lock");
    requestAnimationFrame(function () {
      overlay.classList.add("is-open");
    });
    if (closeBtn) closeBtn.focus();

    runSequence();
  }

  function closeModal() {
    clearTimers();
    overlay.classList.remove("is-open");
    document.body.classList.remove("dl-modal-lock");
    window.setTimeout(function () {
      overlay.hidden = true;
    }, 180);
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function runSequence() {
    var elapsed = 0;
    STEPS.forEach(function (step) {
      elapsed += step.delay;
      timers.push(
        window.setTimeout(function () {
          fill.style.width = step.pct + "%";
          pctEl.textContent = step.pct + "%";
          statusEl.textContent = step.status;
          if (step.pct === 100) {
            overlay.classList.add("is-done");
            timers.push(window.setTimeout(triggerDownload, 300));
          }
        }, elapsed)
      );
    });
  }

  function triggerDownload() {
    if (!pendingHref) return;
    var a = document.createElement("a");
    a.href = pendingHref;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    statusEl.textContent = "Download started";
    timers.push(window.setTimeout(closeModal, 900));
  }

  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest(".js-download");
    if (!link) return;
    e.preventDefault();
    openModal(link);
  });

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !overlay.hidden) closeModal();
  });
})();
