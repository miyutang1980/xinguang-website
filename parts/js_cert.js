  (function () {
    // ── Scroll Reveal ──
    var reveals = document.querySelectorAll('#cert-comparison .cert-reveal');

    function checkReveals() {
      var trigger = window.innerHeight * 0.9;
      reveals.forEach(function (el) {
        var top = el.getBoundingClientRect().top;
        if (top < trigger) {
          el.classList.add('cert-visible');
        }
      });
    }

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('cert-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      reveals.forEach(function (el) { observer.observe(el); });
    } else {
      // Fallback: just show everything
      reveals.forEach(function (el) { el.classList.add('cert-visible'); });
    }

    // ── Stagger ladder steps on hover/load ──
    var ladderSteps = document.querySelectorAll('#cert-comparison .cert-ladder-step');
    ladderSteps.forEach(function (step, i) {
      step.style.transitionDelay = (i * 0.06) + 's';
    });

    // ── Table row stagger-in on section visible ──
    var tableRows = document.querySelectorAll('#cert-comparison .cert-table tbody tr');
    var tableObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          tableRows.forEach(function (row, i) {
            setTimeout(function () {
              row.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
              row.style.opacity = '1';
              row.style.transform = 'translateX(0)';
            }, i * 80);
          });
          tableObserver.disconnect();
        }
      });
    }, { threshold: 0.2 });

    tableRows.forEach(function (row) {
      row.style.opacity = '0';
      row.style.transform = 'translateX(-12px)';
    });

    var tableEl = document.querySelector('#cert-comparison .cert-table-wrapper');
    if (tableEl) tableObserver.observe(tableEl);

  })();

