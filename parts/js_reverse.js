(function() {
  /* ── Data Tables ── */

  // goal → { label, deadline, targetGrade }
  // deadline: age at which they should have completed the goal
  const GOALS = {
    g1:  { label: '國小畢業前有英文基礎（A1）', deadline: 12, targetGrade: 'G1' },
    g3a: { label: '國中會考英文精熟（A2-B1）',  deadline: 13, targetGrade: 'G3' },
    g3b: { label: '通過全民英檢初級（GEPT）',    deadline: 13, targetGrade: 'G3' },
    g5:  { label: '通過全民英檢中級（GEPT中級）', deadline: 13, targetGrade: 'G5' },
  };

  // class info: name, weeklyLabel, startLevel, years to each target grade
  const CLASSES = [
    {
      id: 'immersive',
      name: '浸潤班',
      daysKey: 'high',
      weeklyLabel: '每天（~10小時）',
      startLevel: 'GK 幼兒英語',
      years: { G1: 1, G3: 3, G5: 5 },
      upgradeOrder: 0,
    },
    {
      id: 'elite',
      name: '菁英班',
      daysKey: 'mid',
      weeklyLabel: '3–4天（~7.5小時）',
      startLevel: 'SA 初學銜接',
      years: { G1: 3, G3: 4.5, G5: 7 },
      upgradeOrder: 1,
    },
  ];

  // days selection → class id
  const DAYS_TO_CLASS = { high: 'immersive', mid: 'elite', low: 'elite' };

  /* ── Helpers ── */
  function getClass(id) { return CLASSES.find(c => c.id === id); }

  function formatYears(y) {
    if (y === Math.floor(y)) return y + ' 年';
    return y + ' 年（約 ' + Math.round(y * 12) + ' 個月）';
  }

  function latestStart(deadline, years) {
    return deadline - years;
  }

  /* ── Main calculation ── */
  window.reCalculate = function() {
    const ageVal  = document.getElementById('re-age').value;
    const goalVal = document.getElementById('re-goal').value;
    const daysVal = document.getElementById('re-days').value;

    if (!ageVal || !goalVal || !daysVal) {
      alert('請先填寫所有選項喔！');
      return;
    }

    const age      = parseInt(ageVal);
    const goal     = GOALS[goalVal];
    const classId  = DAYS_TO_CLASS[daysVal];
    const cls      = getClass(classId);
    const targetGrade = goal.targetGrade;
    const deadline = goal.deadline;
    const yearsNeeded = cls.years[targetGrade];
    const latestAge = latestStart(deadline, yearsNeeded);
    const yearsLeft = deadline - age;
    const canDo    = latestAge >= age;

    // Determine status
    let status, statusClass, statusIcon, statusText;
    if (latestAge > age + 1) {
      status = 'ok'; statusIcon = '✅';
      statusText = `還來得及！孩子現在 ${age} 歲，最晚 ${latestAge} 歲前開始就行。不過早點開始，壓力更小、效果更好！`;
    } else if (latestAge >= age) {
      status = 'warn'; statusIcon = '⚠️';
      statusText = `時間有點緊迫！孩子現在 ${age} 歲，必須立即開始，一天都不能等。建議盡快預約程度測驗（$400）！`;
    } else {
      status = 'err'; statusIcon = '❌';
      const higherClass = findUpgradeClass(classId, targetGrade, age, deadline);
      if (higherClass) {
        statusText = `以目前${cls.name}的進度，時間來不及了！建議升級到「${higherClass.name}」（每週${higherClass.weeklyLabel}），可在 ${deadline - higherClass.years[targetGrade]} 歲前完成目標。`;
      } else {
        statusText = `以目前進度時間略不夠，建議調整目標或來校做完整評估，讓老師提供個人化方案。`;
      }
    }

    /* ── Build result card ── */
    const card = document.getElementById('re-result-card');
    card.className = 're-result-main status-' + status;

    document.getElementById('re-stats').innerHTML = `
      <div class="re-stat">
        <div class="re-stat-icon">🎯</div>
        <div class="re-stat-label">推薦班型</div>
        <div class="re-stat-value">${cls.name}</div>
      </div>
      <div class="re-stat">
        <div class="re-stat-icon">⏰</div>
        <div class="re-stat-label">需要時間</div>
        <div class="re-stat-value">${formatYears(yearsNeeded)}</div>
      </div>
      <div class="re-stat">
        <div class="re-stat-icon">📅</div>
        <div class="re-stat-label">最晚開始年齡</div>
        <div class="re-stat-value">${latestAge > 0 ? latestAge + ' 歲' : '越早越好'}</div>
      </div>
      <div class="re-stat">
        <div class="re-stat-icon">🏁</div>
        <div class="re-stat-label">目標達成年齡</div>
        <div class="re-stat-value">${Math.min(age + yearsNeeded, 18)} 歲</div>
      </div>
    `;

    const banner = document.getElementById('re-status-banner');
    banner.className = 're-status-banner ' + status;
    banner.innerHTML = `<span style="font-size:1.3rem;">${statusIcon}</span> ${statusText}`;

    /* ── Timeline ── */
    const minAge = 4, maxAge = 18;
    const ageRange = maxAge - minAge;
    const startPct = ((age - minAge) / ageRange) * 100;
    const endPct   = Math.min(((age + yearsNeeded - minAge) / ageRange) * 100, 100);

    document.getElementById('re-tl-ages').innerHTML =
      `<span>${minAge} 歲</span><span>9 歲</span><span>12 歲</span><span>15 歲</span><span>${maxAge} 歲</span>`;

    const fill = document.getElementById('re-tl-fill');
    fill.style.width = '0';
    fill.style.marginLeft = startPct + '%';

    const marker = document.getElementById('re-tl-marker');
    marker.style.display = 'block';
    marker.style.left = startPct + '%';

    // Trigger transition after tiny delay
    setTimeout(() => {
      fill.style.width = (endPct - startPct) + '%';
    }, 80);

    /* ── Comparison Table ── */
    let rows = '';
    CLASSES.forEach(c => {
      const yrs = c.years[targetGrade];
      const late = latestStart(deadline, yrs);
      const isRec = c.id === classId;
      const feasible = late >= age;
      const rowClass = isRec ? ' re-row-highlight' : '';

      let badgeHtml = '';
      if (isRec) badgeHtml += '<span class="re-badge re-badge-rec">推薦</span>';

      let statusBadge;
      if (late > age + 1) {
        statusBadge = `<span class="re-badge re-badge-ok">✓ 來得及</span>`;
      } else if (late >= age) {
        statusBadge = `<span class="re-badge re-badge-warn">⚡ 剛好來得及</span>`;
      } else {
        const shortfall = age - late;
        statusBadge = `<span class="re-badge re-badge-err">✗ 晚了 ${shortfall} 年</span>`;
      }

      rows += `<tr class="${rowClass}">
        <td>${c.name}${badgeHtml}</td>
        <td>${c.weeklyLabel}</td>
        <td>${c.startLevel}</td>
        <td>${formatYears(yrs)}（最晚 ${late > 0 ? late + '歲' : '越早越好'}開始）</td>
        <td>${statusBadge}</td>
      </tr>`;
    });
    document.getElementById('re-table-body').innerHTML = rows;

    /* ── Show results ── */
    const panel = document.getElementById('re-results');
    panel.classList.add('visible');
    setTimeout(() => {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  /* Find a faster class that could still achieve the goal */
  function findUpgradeClass(currentClassId, targetGrade, age, deadline) {
    // Classes ordered fastest first: immersive, elite
    const order = ['immersive', 'elite'];
    const currentIdx = order.indexOf(currentClassId);
    for (let i = 0; i < currentIdx; i++) {
      const c = getClass(order[i]);
      if (c && (deadline - c.years[targetGrade]) >= age) return c;
    }
    return null;
  }

  /* Smooth scroll polyfill for CTA */
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('a[href="#booking"]');
    if (!btn) return;
    e.preventDefault();
    const target = document.getElementById('booking');
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });

})();
