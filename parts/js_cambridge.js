(function () {
  'use strict';

  var section = document.getElementById('cambridge-pathway');
  if (!section) return;

  var tabs = section.querySelectorAll('.cp-level-btn');
  var panels = section.querySelectorAll('.cp-detail-panel');
  var currentLevel = null;

  function showPanel(targetId) {
    panels.forEach(function (panel) {
      panel.classList.remove('is-visible');
    });
    var panel = document.getElementById('cp-detail-' + targetId);
    if (panel) {
      panel.classList.add('is-visible');
      // Scroll panel into view if needed on mobile
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function activateTab(btn) {
    tabs.forEach(function (t) {
      t.classList.remove('is-active');
      t.setAttribute('aria-selected', 'false');
      t.setAttribute('tabindex', '-1');
      // hide arrow
      var arrow = t.parentElement.querySelector('.cp-arrow-down');
      if (arrow) arrow.style.opacity = '0';
    });

    btn.classList.add('is-active');
    btn.setAttribute('aria-selected', 'true');
    btn.setAttribute('tabindex', '0');

    var arrow = btn.parentElement.querySelector('.cp-arrow-down');
    if (arrow) arrow.style.opacity = '1';
  }

  function handleTabClick(btn) {
    var target = btn.getAttribute('data-target');
    // Always activate — no toggle-off on re-click
    currentLevel = target;
    activateTab(btn);
    showPanel(target);
  }

  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      handleTabClick(btn);
    });

    // Keyboard nav: left/right arrows
    btn.addEventListener('keydown', function (e) {
      var allTabs = Array.from(tabs);
      var idx = allTabs.indexOf(btn);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        var next = allTabs[(idx + 1) % allTabs.length];
        next.focus();
        handleTabClick(next);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        var prev = allTabs[(idx - 1 + allTabs.length) % allTabs.length];
        prev.focus();
        handleTabClick(prev);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleTabClick(btn);
      }
    });
  });

  // Open GK by default after a short delay so the animation plays
  setTimeout(function () {
    var gkBtn = section.querySelector('[data-target="gk"]');
    if (gkBtn) {
      handleTabClick(gkBtn);
    }
  }, 400);

})();
