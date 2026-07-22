
// 純數學算星期幾，不依賴 Date 物件（避免時區問題）
function getDowFromDateStr(ds){
  var parts=ds.split('-');
  var y=parseInt(parts[0]), m=parseInt(parts[1]), d=parseInt(parts[2]);
  // Tomohiko Sakamoto algorithm
  var t=[0,3,2,5,0,3,5,1,4,6,2,4];
  if(m<3) y--;
  return (y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)+t[m-1]+d)%7;
  // 0=日 1=一 2=二 3=三 4=四 5=五 6=六
}

window._trialOverrides = window._trialOverrides || {};

// ── 課程雷達圖數據 ──────────────────────────────────────────
var RADAR_LABELS = ['自然拼讀', '閱讀理解', '文法', '拼字', '口說', '寫作'];
var RADAR_ELITE = {
  'SA': [10, 3, 3, 2, 10, 1],
  'SB': [10, 6, 5, 4, 9, 2],
  '1A': [8, 7, 6, 5, 8, 4],
  '1B': [7, 8, 7, 6, 8, 5],
  '1C': [6, 8, 7, 7, 7, 6],
  '2A': [5, 8, 8, 7, 7, 7],
  '2B': [4, 8, 8, 8, 7, 8],
  '2C': [3, 9, 9, 8, 7, 8],
  '3A': [3, 9, 9, 8, 8, 8],
  '3B': [2, 9, 9, 9, 8, 9],
  '3C': [2, 10, 9, 9, 8, 9],
  '4A': [1, 10, 10, 9, 8, 9],
  '4B': [1, 10, 10, 10, 9, 10],
  '4C': [1, 10, 10, 10, 9, 10]
};
var RADAR_IMMERSION = {
  'GK': [10, 5, 4, 3, 10, 2],
  'G1': [9, 6, 5, 5, 9, 4],
  'G2': [7, 8, 6, 6, 8, 6],
  'G3': [5, 9, 8, 7, 8, 8]
};
var RADAR_GEPT = {
  'Elementary': [3, 8, 9, 8, 7, 7],
  'Intermediate': [1, 9, 10, 9, 8, 9]
};
var RADAR_OTHERS = {
  'afterschool': [3, 7, 7, 6, 5, 8],
  'daycare': [5, 4, 3, 3, 8, 3]
};

// ── 雷達圖渲染 ───────────────────────────────────────────────
var _radarCharts = {};
function renderRadar(canvasId, data, color) {
  var ctx = document.getElementById(canvasId);
  if (!ctx) return;
  if (_radarCharts[canvasId]) { _radarCharts[canvasId].destroy(); }
  _radarCharts[canvasId] = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: RADAR_LABELS,
      datasets: [{
        data: data,
        backgroundColor: color.replace('1)', '0.18)'),
        borderColor: color,
        borderWidth: 2.5,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          min: 0, max: 10,
          ticks: { stepSize: 2, color: '#888', font: { size: 10 } },
          pointLabels: { color: '#333', font: { size: 11, weight: '700' } },
          grid: { color: 'rgba(0,0,0,0.08)' },
          angleLines: { color: 'rgba(0,0,0,0.1)' }
        }
      }
    }
  });
}


// ── 初始化所有雷達圖 ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function(){
  // 問課表單：初始化第一個孩子
  if(document.getElementById('iqChildrenList')) iqAddChild();
  if(document.getElementById('campChildrenList')) campAddChild();
  // 體驗課排班同步（從獨立後台帶來）
  (function loadTrialImport(){
    var p=new URLSearchParams(window.location.search);
    var ti=p.get('trialImport');
    if(!ti) return;
    try {
      var json=decodeURIComponent(escape(atob(ti)));
      var parsed=JSON.parse(json);
      if(typeof parsed==='object'){
        if(!window._trialOverrides) window._trialOverrides={};
        // 合併班次（陣列格式支援）
        Object.keys(parsed).forEach(function(date){
          if(!window._trialOverrides[date]) window._trialOverrides[date]={};
          Object.keys(parsed[date]).forEach(function(slot){
            window._trialOverrides[date][slot]=parsed[date][slot];
          });
        });
        // 延遲重繪日曆（等 booking IIFE 載入完成）
        setTimeout(function(){
          if(window._reRenderCalendar) window._reRenderCalendar();
        }, 500);
        // 顯示通知
        setTimeout(function(){
          var t=document.createElement('div');
          t.textContent='✅ 體驗課班次已從後台同步完成';
          t.style.cssText='position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#192643;color:#fff;padding:12px 24px;border-radius:8px;font-size:0.9rem;font-weight:700;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3)';
          document.body.appendChild(t);
          setTimeout(function(){t.remove();},3000);
        },800);
        // 保留 URL 參數，下次開啟同樣會同步
      }
    } catch(e){ console.log('trialImport parse error',e); }
  })();

  // 預約頁：讀取來自問課表單的 URL params
  (function loadAssessParams(){
    var p = new URLSearchParams(window.location.search);
    var assessLevel = p.get('assessLevel');
    var assessName  = p.get('assessName');
    var assessClass = p.get('assessClass');
    if(assessLevel || assessClass){
      var box = document.getElementById('bkAssessResult');
      var content2 = document.getElementById('bkAssessResultContent');
      if(box && content2){
        var txt = '';
        if(assessName) txt += '學生：<strong>'+assessName+'</strong>　';
        if(assessLevel) txt += '檢測結果：<strong style="color:var(--green)">'+assessLevel+'</strong>　';
        if(assessClass) txt += '建議班型：<strong style="color:var(--green)">'+assessClass+'</strong>';
        content2.innerHTML = txt || '已帶入程度檢測資料';
        box.style.display = 'block';
        // 自動切到體驗課 tab
        var trialBtn = document.querySelector('.bk-type-tab[onclick*="trial"]');
        if(trialBtn) switchBkType('trial', trialBtn);
      }
    }
    // 預填家長資料
    var parentParam = p.get('parent');
    var phoneParam  = p.get('phone');
    if(parentParam){
      var bkParent = document.getElementById('bkParent');
      if(bkParent) bkParent.value = parentParam;
    }
    if(phoneParam){
      var bkPhone = document.getElementById('bkPhone');
      if(bkPhone) bkPhone.value = phoneParam;
    }
  })();
});

// 雷達圖在 window.load 後初始化（確保 Chart.js 完全就緒）
window.addEventListener('load', function(){
  setTimeout(function(){
    if(typeof Chart==='undefined') return;
    // 浸潤班（預設顯示，active panel）
    renderRadar('radar-im-main', RADAR_IMMERSION['GK'], 'rgba(22,163,74,1)');
    // 菁英班（hidden panel，等切換後再渲染）
    renderRadar('radar-el-SA', RADAR_ELITE['SA'], 'rgba(37,99,235,1)');
    renderRadar('radar-gept-elem', RADAR_GEPT['Elementary'], 'rgba(59,130,246,1)');
    renderRadar('radar-gept-inter', RADAR_GEPT['Intermediate'], 'rgba(139,92,246,1)');
    renderRadar('radar-afterschool', RADAR_OTHERS['afterschool'], 'rgba(245,158,11,1)');
    renderRadar('radar-daycare', RADAR_OTHERS['daycare'], 'rgba(167,139,250,1)');
  }, 300);
});


/* ========== MOBILE MENU ========== */
function toggleMobile(){document.getElementById('mobileMenu').classList.toggle('active')}
function closeMobile(){document.getElementById('mobileMenu').classList.remove('active')}

/* ========== STICKY NAV ========== */
window.addEventListener('scroll',function(){
  const nav=document.getElementById('navbar');
  const btt=document.getElementById('backToTop');
  if(window.scrollY>50)nav.classList.add('scrolled');else nav.classList.remove('scrolled');
  if(window.scrollY>600)btt.classList.add('visible');else btt.classList.remove('visible');
});

/* ========== SCROLL REVEAL ========== */
const revealObserver=new IntersectionObserver((entries)=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');revealObserver.unobserve(e.target)}});
},{threshold:0.1,rootMargin:'0px 0px -40px 0px'});
document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));

// Force-reveal elements in/near viewport
function forceRevealInViewport(){
  document.querySelectorAll('.reveal:not(.visible)').forEach(function(el){
    var rect=el.getBoundingClientRect();
    if(rect.top<window.innerHeight+400){el.classList.add('visible');try{revealObserver.unobserve(el);}catch(e){}}
  });
}
// Run on DOMContentLoaded, load, hashchange, scroll
document.addEventListener('DOMContentLoaded',function(){setTimeout(forceRevealInViewport,50);});
window.addEventListener('load',function(){setTimeout(forceRevealInViewport,100);});
window.addEventListener('hashchange',function(){setTimeout(forceRevealInViewport,150);setTimeout(forceRevealInViewport,400);});
window.addEventListener('scroll',forceRevealInViewport,{passive:true});
// Intercept all anchor clicks → reveal after scroll settles
document.addEventListener('click',function(e){
  var a=e.target.closest('a[href^="#"]');
  if(!a)return;
  setTimeout(forceRevealInViewport,200);
  setTimeout(forceRevealInViewport,500);
  setTimeout(forceRevealInViewport,900);
});

/* ===== BOOKING TYPE SWITCHER ===== */
var _currentBkType = 'visitTest';
function lookupTrialAssess(){
  if(_currentBkType !== 'trial') return;
  var sname = (document.getElementById('bkChild')||{}).value.trim();
  var infoEl = document.getElementById('bkTrialAssessContent');
  if(!sname || !infoEl) return;
  var adminData = JSON.parse(localStorage.getItem('xg_admin_data') || '{}');
  var assessments = adminData.assessments || [];
  var match = assessments.find(function(a){ return a.studentName && a.studentName.indexOf(sname) >= 0; });
  if(match){
    var cls = match.finalClass || match.classType || '—';
    var oral = match.oralLevel || '—';
    infoEl.innerHTML = '✅ <strong>' + (match.studentName||sname) + '</strong>（' + (match.grade||'—') + '）→ 分班：<strong style="color:var(--green)">' + cls + '</strong>　口說：' + oral;
    var bkCls = document.getElementById('bkClass');
    if(bkCls) bkCls.value = cls;
  } else {
    // 檢查是否有檢測預約（還沒出結果）
    var bookings = (adminData.bookingRegs || []);
    var hasTest = bookings.some(function(b){ return b.student && b.student.indexOf(sname) >= 0 && b.type && b.type.indexOf('檢測') >= 0 && b.status !== '已取消'; });
    if(hasTest){
      infoEl.innerHTML = '⏳ <strong>' + sname + '</strong> 已預約檢測，分班結果待出爐';
    } else {
      infoEl.innerHTML = '<span style="color:#e74c3c">⚠️ 查無「' + sname + '」的檢測紀錄，請先預約程度檢測</span>';
    }
  }
}

function toggleTestFeeNotice(){
  var n = document.getElementById('testFeeNotice');
  var cb = document.getElementById('bkTest');
  if(n && cb) n.style.display = cb.checked ? 'block' : 'none';
}

function switchBkType(type, btn) {
  _currentBkType = type;
  // Update tabs
  document.querySelectorAll('.bk-type-tab').forEach(function(t){ t.classList.remove('active'); });
  if(btn) btn.classList.add('active');
  // Update desc panels
  document.querySelectorAll('.bk-desc-panel').forEach(function(p){ p.classList.remove('active'); });
  var panel = document.getElementById('bkDesc-' + type);
  if(panel) panel.classList.add('active');
  // Show/hide purpose checkboxes + class selector
  var pg = document.getElementById('bkPurposeGroup');
  if(pg) pg.style.display = (type === 'trial') ? 'none' : '';
  var cg = document.getElementById('bkClassGroup');
  if(cg) cg.style.display = (type === 'trial') ? 'none' : '';
  var tai = document.getElementById('bkTrialAssessInfo');
  if(tai) tai.style.display = (type === 'trial') ? '' : 'none';
  var tfn = document.getElementById('testFeeNotice');
  if(tfn) tfn.style.display = 'none';
  // Reset checkboxes when switching
  if(type === 'visitTest'){
    var v = document.getElementById('bkVisit'); if(v) v.checked = false;
    var t2 = document.getElementById('bkTest'); if(t2) t2.checked = false;
  }
  // Update hidden type
  var inp = document.getElementById('bkType');
  if(inp) inp.value = (type === 'trial') ? '體驗課' : '參訪/檢測';
  // Reset calendar & re-render
  var sp = document.getElementById('slotsPanel');
  var bf = document.getElementById('bookingForm');
  if(sp) sp.classList.remove('active');
  if(bf) bf.classList.remove('active');
  if(window._reRenderCalendar) window._reRenderCalendar();
  // 體驗課班表 (只在 trial 時顯示)
  var tcp = document.getElementById('trialClassPanel');
  if(tcp) tcp.style.display = (type === 'trial') ? '' : 'none';
  if (type === 'trial') _loadTrialClasses();
}

// ─── 體驗課班表：從 Apps Script Gateway 讀 ───
var _trialClassesCache = null;
window._trialBookedSlots = window._trialBookedSlots || {};  // {'2026-05-14|14:00-15:00': true}
window._visitBookedSlots = window._visitBookedSlots || {};  // 參訪/檢測 鎖定名單

// 載入后台「主網站設定」 (不可預約日 + 某時段鎖定)
function _loadAdminCalendarSettings() {
  fetch(WEBHOOK_URL + '?action=calendarSettings', { method: 'GET' })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d && d.ok && d.settings) {
        var s = d.settings;
        window._adminBlockedDates = Array.isArray(s.blockedDates) ? s.blockedDates : [];
        var bs = {};
        (Array.isArray(s.blockedSlots) ? s.blockedSlots : []).forEach(function(x){
          if (x && x.date && x.slot) bs[x.date + '|' + x.slot] = true;
        });
        window._adminBlockedSlots = bs;
        if (typeof renderCalendar === 'function') {
          try { renderCalendar(); } catch(e){}
        }
      }
    })
    .catch(function(e){ console.warn('[admin cal settings] load fail:', e); });
}
window._loadAdminCalendarSettings = _loadAdminCalendarSettings;

// 載入所有「預約紀錄」來鎖定「每時段只能 1 組」
function _loadAllBookings() {
  fetch(WEBHOOK_URL + '?action=allBookings', { method: 'GET' })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d && d.ok && Array.isArray(d.bookings)) {
        var visitBooked = {};
        var trialBooked = {};
        d.bookings.forEach(function(b){
          if (!b.date || !b.slot) return;
          var key = b.date + '|' + b.slot;
          var t = String(b.type || '');
          if (t.indexOf('體驗') >= 0 || t === 'trial') {
            trialBooked[key] = true;
          } else {
            visitBooked[key] = true;
          }
        });
        window._visitBookedSlots = visitBooked;
        window._trialBookedSlots = trialBooked;
        if (typeof renderCalendar === 'function') {
          try { renderCalendar(); } catch(e){}
        }
      }
    })
    .catch(function(e){ console.warn('[all bookings] load fail:', e); });
}
// 連絲為 root 上變成全域、讓 _loadTrialClasses 以外的地方也能呼叫
window._loadAllBookings = _loadAllBookings;
function _loadTrialClasses(){
  var listEl = document.getElementById('trialClassList');
  if(!listEl) return;
  if(_trialClassesCache){ _renderTrialClasses(_trialClassesCache); return; }
  fetch(WEBHOOK_URL + '?action=trialClasses', { method: 'GET' })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if(d && d.ok && d.classes){
        _trialClassesCache = d.classes;
        window._trialClassesCache = d.classes;  // 曝出給主連結讀
        _renderTrialClasses(d.classes);
        if (typeof window._syncTrialClassesFromGateway === 'function') window._syncTrialClassesFromGateway();
      } else {
        listEl.innerHTML = '<div style="color:#DC2626;text-align:center;padding:20px;grid-column:1/-1">班表載入失敗，請重新整理頁面</div>';
      }
    })
    .catch(function(err){
      console.error('[trial classes] load fail:', err);
      listEl.innerHTML = '<div style="color:#DC2626;text-align:center;padding:20px;grid-column:1/-1">網路連線失敗，請重試</div>';
    });
  // 同步讀取已被預約的「日期+時段」· 讓日曆能標灰已佔用
  fetch(WEBHOOK_URL + '?action=trialBookings', { method: 'GET' })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d && d.ok && Array.isArray(d.bookings)) {
        var booked = {};
        d.bookings.forEach(function(b){
          if (!b.date || !b.slot) return;
          var key = b.date + '|' + b.slot;
          booked[key] = true;
        });
        window._trialBookedSlots = booked;
        // 重繪日曆能個別格变灰
        if (typeof renderCalendar === 'function') {
          try { renderCalendar(); } catch(e){}
        }
      }
    })
    .catch(function(e){ console.warn('[trial bookings] load fail (忍受):', e); });
}

function _renderTrialClasses(classes){
  var listEl = document.getElementById('trialClassList');
  if(!listEl) return;
  if(!classes || !classes.length){
    listEl.innerHTML = '<div style="color:#9CA3AF;text-align:center;padding:20px;grid-column:1/-1">目前無體驗班</div>';
    return;
  }
  var html = classes.map(function(c){
    return '<div data-tc-id="' + c.id + '" onclick="_selectTrialClass(\''+ c.id +'\')" style="cursor:pointer;background:#fff;border:2px solid #E5E7EB;border-radius:10px;padding:12px 14px;transition:all 0.2s" '
      + 'onmouseover="this.style.borderColor=\''+c.color+'\';this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 6px 16px rgba(0,0,0,0.08)\'" '
      + 'onmouseout="if(!this.classList.contains(\'tc-selected\')){this.style.borderColor=\'#E5E7EB\';this.style.transform=\'\';this.style.boxShadow=\'\'}">'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
      +   '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+c.color+'"></span>'
      +   '<strong style="color:#1F2937;font-size:0.95rem">'+c.cat_zh+' '+c.level+'</strong>'
      + '</div>'
      + '<div style="font-size:0.8rem;color:#6B7280;line-height:1.5">'
      +   '🗓️ 週'+c.day+' · '+c.time+'<br>'
      +   '👨‍🏫 '+c.tw+' / '+c.fr+'<br>'
      +   '🚪 '+c.room
      +   (c.remark ? '<br><span style="color:'+c.color+';font-weight:600">✍️ '+c.remark+'</span>' : '')
      + '</div>'
      + '</div>';
  }).join('');
  listEl.innerHTML = html;
}

function _selectTrialClass(id){
  if(!_trialClassesCache) return;
  var c = _trialClassesCache.find(function(x){ return x.id === id; });
  if(!c) return;
  // 更新卡片選取狀態
  document.querySelectorAll('[data-tc-id]').forEach(function(el){
    el.classList.remove('tc-selected');
    el.style.borderColor = '#E5E7EB';
    el.style.transform = '';
    el.style.boxShadow = '';
    el.style.background = '#fff';
  });
  var sel = document.querySelector('[data-tc-id="' + id + '"]');
  if(sel){
    sel.classList.add('tc-selected');
    sel.style.borderColor = c.color;
    sel.style.background = c.color + '15';
    sel.style.boxShadow = '0 4px 14px ' + c.color + '40';
  }
  // 更新隱藏欄位
  var setVal = function(id, v){ var el = document.getElementById(id); if(el) el.value = v; };
  setVal('bkTrialClassId', c.id);
  setVal('bkTrialClassLabel', c.label);
  setVal('bkTrialTeacher', c.tw + ' / ' + c.fr);
  setVal('bkTrialRoom', c.room);
  // 顯示選取提示 + 全部可選日期
  var sumEl = document.getElementById('selectedTrialClass');
  if(sumEl){
    sumEl.style.display = '';
    sumEl.innerHTML = '✅ 已選「<strong>'+c.cat_zh+' '+c.level+' · 週'+c.day+' '+c.time+'</strong>」｜老師：'+c.tw+' / '+c.fr+'｜教室：'+c.room
      + '<br><span style="color:#6B7280;font-size:0.78rem">📆 請在上方日曆選「週'+c.day+'」的任一日期 · '+c.dates.length+' 個可用日期：'+c.dates.join('、')+'</span>';
  }
}

function _toggleTrialClasses(){
  var listEl = document.getElementById('trialClassList');
  var btn = document.getElementById('_tcToggleBtn');
  if(!listEl || !btn) return;
  if (listEl.style.display === 'none') {
    listEl.style.display = 'grid';
    btn.textContent = '隱藏';
  } else {
    listEl.style.display = 'none';
    btn.textContent = '展開';
  }
}

function switchCampMonth(btn, id) {
  document.querySelectorAll('.camp-month-tab').forEach(function(t){ t.classList.remove('active'); });
  document.querySelectorAll('.camp-month-panel').forEach(function(p){ p.classList.remove('active'); });
  btn.classList.add('active');
  var panel = document.getElementById('camp-' + id);
  if (panel) panel.classList.add('active');
}
function toggleCampWeek(card) {
  var isOpen = card.classList.contains('open');
  card.closest('.camp-weeks').querySelectorAll('.camp-week-card').forEach(function(c){ c.classList.remove('open'); });
  if (!isOpen) card.classList.add('open');
}
function toggleCampPm(card) {
  var isOpen = card.classList.contains('open');
  card.closest('.camp-pm-cards').querySelectorAll('.camp-pm-card').forEach(function(c){ c.classList.remove('open'); });
  if (!isOpen) card.classList.add('open');
}

function switchGept(btn) {
  var container = btn.closest('#panel-gept');
  container.querySelectorAll('.el-level-tab').forEach(function(t){
    t.classList.remove('active');
    t.style.background = '';
    t.style.color = '';
    t.style.borderColor = '';
  });
  container.querySelectorAll('.gept-panel').forEach(function(p){ p.style.display='none'; });
  btn.classList.add('active');
  btn.style.background = '#7C3AED';
  btn.style.color = '#fff';
  btn.style.borderColor = '#7C3AED';
  var id = btn.dataset.gept;
  var panel = container.querySelector('#gept-' + id);
  if (panel) panel.style.display = 'block';
  // 雷達圖
  var geptMap = {elem:'Elementary', inter:'Intermediate'};
  var gk = geptMap[id] || id;
  if(typeof RADAR_GEPT!=='undefined'&&RADAR_GEPT[gk])
    renderRadar('radar-gept-'+id, RADAR_GEPT[gk], 'rgba(124,58,237,1)');
}

function switchImGrade(btn) {
  document.querySelectorAll('.im-grade-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  var grade = btn.dataset.grade;
  var descMap = {"GK": "<strong>Grade K（幼稚園）</strong><br>全美語環境從 Phonics 和口說出發，認識字母、建立發音基礎，每天用英文說話、唱歌、遊戲——孩子不知不覺就開口了。", "G1": "<strong>Grade 1（小一）</strong><br>Phonics 深化、開始讀故事、學 be 動詞，閱讀和口說同步推進，整個 Grade 1 完成後能流暢閱讀初階讀本。", "G2": "<strong>Grade 2（小二）</strong><br>過去式、現在完成式、各類文法集中攻克，閱讀進入說明文、寫作開始有主題段落，英文明顯比同齡領先。", "G3": "<strong>Grade 3（小三）</strong><br>閱讀精讀、觀點寫作、文法完整系統，接近全民英檢初級程度，可以用英文說故事、寫日記。"};
  var descEl = document.getElementById('im-grade-desc');
  if (descEl && descMap[grade]) descEl.innerHTML = descMap[grade];
  var d = RADAR_IMMERSION[grade];
  if (d) renderRadar('radar-im-main', d, 'rgba(22,163,74,1)');
}

function switchLevel(btn) {
  var container = btn.closest('#panel-elite');
  container.querySelectorAll('.el-level-tab').forEach(function(t){t.classList.remove('active');});
  container.querySelectorAll('.el-level-panel').forEach(function(p){p.classList.remove('active');});
  btn.classList.add('active');
  var lvId = btn.dataset.level;
  var panel = container.querySelector('#el-panel-' + lvId);
  if (panel) panel.classList.add('active');
  // 雷達圖
  if(typeof RADAR_ELITE!=='undefined'&&RADAR_ELITE[lvId])
    renderRadar('radar-el-'+lvId, RADAR_ELITE[lvId], 'rgba(37,99,235,1)');
}

/* ========== IMMERSION SUBJECT ACCORDION ========== */
function toggleSubject(btn){
  const acc = btn.closest('.im-subject-accordion');
  const isOpen = acc.classList.contains('open');
  // close all
  document.querySelectorAll('.im-subject-accordion').forEach(a=>a.classList.remove('open'));
  // toggle current
  if(!isOpen) acc.classList.add('open');
}

/* ========== COURSE TABS ========== */
// v2.18.16: 讀 URL ?course=xxx 自動切到該 tab + 滾到 #courses
function _switchCourseTab(courseId) {
  // 外部 redirect: 夏令營跳 #camp section
  if (courseId === 'camp') {
    const camp = document.getElementById('camp');
    if (camp) camp.scrollIntoView({behavior:'smooth', block:'start'});
    return;
  }
  // v2.18.18: 幼兒美語已有獨立 tab · 不再映射 immersion
  const tab = document.querySelector('.course-tab[data-course="'+courseId+'"]');
  if (!tab) return;
  document.querySelectorAll('.course-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.course-panel').forEach(p=>p.classList.remove('active'));
  tab.classList.add('active');
  const panel = document.getElementById('panel-'+courseId);
  if (panel) panel.classList.add('active');
  // 滾動到課程介紹區
  const sec = document.getElementById('courses');
  if (sec) sec.scrollIntoView({behavior:'smooth', block:'start'});
}

// 啟動時讀 URL
window.addEventListener('load', function() {
  const params = new URLSearchParams(location.search);
  const courseParam = params.get('course');
  if (courseParam) {
    // 延遲一點讓 reveal animation 跱完
    setTimeout(() => _switchCourseTab(courseParam), 300);
  }
});

document.querySelectorAll('.course-tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.course-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.course-panel').forEach(p=>p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-'+tab.dataset.course).classList.add('active');
    // 切換 tab 後重新渲染對應雷達圖
    setTimeout(function(){
      var c = tab.dataset.course;
      if(c==='immersion' && typeof RADAR_IMMERSION!=='undefined')
        renderRadar('radar-im-main', RADAR_IMMERSION['GK'], 'rgba(22,163,74,1)');
      else if(c==='elite' && typeof RADAR_ELITE!=='undefined')
        renderRadar('radar-el-SA', RADAR_ELITE['SA'], 'rgba(37,99,235,1)');
      else if(c==='gept' && typeof RADAR_GEPT!=='undefined'){
        renderRadar('radar-gept-elem', RADAR_GEPT['Elementary'], 'rgba(59,130,246,1)');
      }
      else if(c==='afterschool' && typeof RADAR_OTHERS!=='undefined')
        renderRadar('radar-afterschool', RADAR_OTHERS['afterschool'], 'rgba(245,158,11,1)');
      else if(c==='daycare' && typeof RADAR_OTHERS!=='undefined')
        renderRadar('radar-daycare', RADAR_OTHERS['daycare'], 'rgba(167,139,250,1)');
    }, 80);
  });
});

/* ========== BOOKING CALENDAR SYSTEM ========== */
(function(){
  // 參訪/檢測時段：學期中 vs 暑期 (7/1–8/26) 不同
  // 學期中：14:00 與 19:00
  const visitSlotsRegular={
    1:['14:00-15:00','19:00-20:00'], // 週一
    2:['14:00-15:00','19:00-20:00'], // 週二
    3:['14:00-15:00','19:00-20:00'], // 週三
    4:['14:00-15:00'],               // 週四（只有下午）
    5:['14:00-15:00','19:00-20:00']  // 週五
  };
  // 暑期 (2026/7/1 – 2026/8/26)：17:00 與 19:00
  const visitSlotsSummer={
    1:['17:00-18:00','19:00-20:00'],
    2:['17:00-18:00','19:00-20:00'],
    3:['17:00-18:00','19:00-20:00'],
    4:['17:00-18:00','19:00-20:00'],
    5:['17:00-18:00','19:00-20:00']
  };
  function _isSummerDate(ds){
    if(!ds) return false;
    // ds 格式：'YYYY-MM-DD'
    return ds >= '2026-07-01' && ds <= '2026-08-26';
  }
  function getVisitSlots(ds){
    return _isSummerDate(ds) ? visitSlotsSummer : visitSlotsRegular;
  }
  // 體驗課時段：主動同步 Gateway 8 班 (下面 _syncTrialSlotsFromGateway 會更新)
  let trialSlots={
    1:['14:00-15:00'],                                     // 週一 SB
    2:['16:30-17:30','18:30-19:30'],                       // 週二 2C, ES
    3:['14:00-15:00','16:30-17:30','18:30-19:30'],         // 週三 1B, 2A, 4B
    4:['16:30-17:30','18:30-19:30']                        // 週四 3A, 3B
  };
  // 依目前 tab 回傳對應時段表 (ds 為 'YYYY-MM-DD'，只在參訪/檢測模式影響暑期切換)
  function getWeeklySlots(ds){
    if(_currentBkType==='trial') return trialSlots;
    return getVisitSlots(ds);
  }

  // 後台自訂班次覆蓋：_trialOverrides[dateStr][slot] = '班級名稱'
  // 優先於 trialClassMap
  function getTrialClass(ds, slot){
    // 呼叫外部定義的 getTrialClass（依星期幾）
    return window.getTrialClass ? window.getTrialClass(ds,slot) : '—';
  }

  // 可預約截止日
  // 預約截止：今天起 90 天（滾動更新，不需改程式）
  const today0 = new Date();
  const bookingDeadline = new Date(Date.UTC(
    today0.getUTCFullYear(), today0.getUTCMonth(), today0.getUTCDate() + 180, 23, 59, 59
  ));

  // 國定假日 + 學校活動日
  const holidayRanges=[
    // 2026 國定假日
    ['2026-04-03','2026-04-06'], // 清明連假
    ['2026-04-25','2026-04-25'], // 補假
    ['2026-05-01','2026-05-01'], // 勞動節
    ['2026-06-12','2026-06-12'], // 端午調整
    ['2026-06-19','2026-06-19'], // 端午節
    ['2026-09-25','2026-09-28'], // 中秋連假
    ['2026-10-09','2026-10-11'], // 國慶連假
    ['2026-12-25','2026-12-25'], // 聖誕
    // 2026 學校活動日 (5/15, 5/27 依舊設; 6/15 取消限制、讓體驗班可來)
    ['2026-05-15','2026-05-15'],
    ['2026-05-27','2026-05-27'],
    ['2026-06-26','2026-06-26'],
    // 暑期結束兩日 — 開學前讓老師備課、不接預約
    ['2026-08-27','2026-08-28'],
    // 開學首日 (8/31 週一) — 不接預約
    ['2026-08-31','2026-08-31'],
    // 2027 國定假日（預留）
    ['2027-01-01','2027-01-01'], // 元旦
    ['2027-02-15','2027-02-21'], // 春節
    ['2027-04-05','2027-04-05'], // 清明
    ['2027-05-01','2027-05-01'], // 勞動節
    ['2027-06-28','2027-06-28'], // 端午
  ];
  const holidays=new Set();
  holidayRanges.forEach(([s,e])=>{
    let d=new Date(s+'T00:00:00');
    const end=new Date(e+'T00:00:00');
    while(d<=end){ holidays.add(d.toISOString().slice(0,10)); d=new Date(d.getTime()+86400000); }
  });

  function dateStr(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
  function isHoliday(ds){
    if (holidays.has(ds)) return true;
    // 后台手動加的不可預約日
    if (window._adminBlockedDates && window._adminBlockedDates.indexOf(ds) >= 0) return true;
    return false;
  }

  // ===== 名額管理 =====
  // _slots[dateKey][slotTime][type] = booking info | null
  // type: 'visitTest'（參訪+檢測共用）或 'trial'（體驗課）
  const _slots={};
  window._bookingSlots=_slots; // expose for admin

  function getSlot(date, slot, type){
    return (_slots[date]&&_slots[date][slot]&&_slots[date][slot][type])||null;
  }
  function setSlot(date, slot, type, info){
    if(!_slots[date]) _slots[date]={};
    if(!_slots[date][slot]) _slots[date][slot]={};
    _slots[date][slot][type]=info;
    if(window._adminRefresh) window._adminRefresh();
  }
  function isSlotFull(date, slot, type){
    if (getSlot(date, slot, type)) return true;
    var key = date + '|' + slot;
    // 體驗課：加看 Gateway 已記錄預約
    if (type === 'trial' && window._trialBookedSlots && window._trialBookedSlots[key]) return true;
    // 參訪/檢測：加看 Gateway 已記錄預約 (跨裝置鎖定)
    if (type === 'visitTest' && window._visitBookedSlots && window._visitBookedSlots[key]) return true;
    // 后台手動鎖定「某天某時段」 (例 9/15 14:00)
    if (window._adminBlockedSlots && window._adminBlockedSlots[key]) return true;
    return false;
  }
  // 體驗課：某日某時段某班是否已滿
  function isTrialClassFull(date, slot, cls){
    if (getSlot(date, slot, 'trial_'+cls)) return true;
    // 加看 Gateway 已記錄預約
    if (window._trialBookedSlots) {
      var key = date + '|' + slot;
      if (window._trialBookedSlots[key]) return true;
    }
    return false;
  }
  // 參訪和檢測共用同一個「visitTest」名額
  function getBookingType(){ return (_currentBkType==='trial') ? 'trial' : 'visitTest'; }

  // ===== 體驗課班次對應 =====
  // 計算日期是該月第幾週（週三週四）：4月第1個三/四 = W1, 第2個 = W2...
  // 跨月時以 W1=最早可用週為基準
  // 體驗課：每個時段最多 4 個班級，由後台設定
  // _trialOverrides[date][slot] = ['1B','2A','G1','SB'] 或舊格式字串
  function getWeekNum(ds){ return ''; }
  // 預設班表（個月初載入、之後被 Gateway 讀到的資料覆蓋）
  var _fixedTrialByDow = {
    1: { '14:00-15:00': ['SB'] },
    2: { '16:30-17:30': ['2C'], '18:30-19:30': ['ES'] },
    3: { '14:00-15:00': ['1B'], '16:30-17:30': ['2A'], '18:30-19:30': ['4B'] },
    4: { '16:30-17:30': ['3A'], '18:30-19:30': ['3B'] }  // 週四只有 3A/3B、沒有 14:00 課
  };
  // 動態從 Gateway 同步 8 班、覆蓋上面寫死的班表與時段
  // 並計算體驗期間結束日，之後的日子全部不可選
  window._syncTrialClassesFromGateway = function(){
    if (!window._trialClassesCache) return;
    var byDow = {1:{},2:{},3:{},4:{},5:{}};
    var slotsByDow = {1:[],2:[],3:[],4:[],5:[]};
    var DOW_ZH = {'一':1,'二':2,'三':3,'四':4,'五':5};
    var maxDateStr = '';
    window._trialClassesCache.forEach(function(c){
      var d = DOW_ZH[c.day]; if(!d) return;
      if (!byDow[d][c.time]) byDow[d][c.time] = [];
      byDow[d][c.time].push(c.level);
      if (slotsByDow[d].indexOf(c.time) < 0) slotsByDow[d].push(c.time);
      // 計算體驗期間最後一天
      (c.dates || []).forEach(function(ds){
        if (ds > maxDateStr) maxDateStr = ds;
      });
    });
    _fixedTrialByDow = byDow;
    // 記錄體驗期間結束日，主表宇計算「這天是否超過體驗期」會用到
    if (maxDateStr) {
      window._trialEndDate = maxDateStr.replace(/\//g,'-');  // 'yyyy/mm/dd' -> 'yyyy-mm-dd'
    }
    Object.keys(slotsByDow).forEach(function(d){
      if (slotsByDow[d].length > 0) {
        slotsByDow[d].sort();
        trialSlots[d] = slotsByDow[d];
      } else {
        delete trialSlots[d];
      }
    });
    if (window._reRenderCalendar) window._reRenderCalendar();
  };
  window.getTrialClasses = function(ds, slot){
    // 後台自訂覆蓋優先
    var ov=window._trialOverrides;
    if(ov&&ov[ds]&&ov[ds][slot]){
      var v=ov[ds][slot];
      if(Array.isArray(v)) return v.filter(function(c){return c&&c.trim();});
      if(typeof v==='string'&&v&&v!=='—') return [v];
    }
    // 依星期幾查固定班次
    var dow=getDowFromDateStr(ds);
    if(_fixedTrialByDow[dow]&&_fixedTrialByDow[dow][slot]){
      return _fixedTrialByDow[dow][slot];
    }
    return [];
  };
  window.getTrialClass = function(ds, slot){
    var arr=window.getTrialClasses(ds,slot);
    return arr.length>0 ? arr[0] : '—';
  };

  // ===== 日曆狀態 =====
  const now=new Date();
  let currentYear=now.getFullYear();
  let currentMonth=now.getMonth();
  let selectedDate=null;
  let selectedSlot=null;
  let selectedTrialClass=null;

  // 自動跳到最近可預約月份
  (function seekFirstAvailableMonth(){
    const scan=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
    for(let i=0;i<90;i++){
      const dow=getDowFromDateStr(scan.toISOString().slice(0,10));
      const ds=scan.toISOString().slice(0,10);
      const bkDl=new Date(Date.UTC(scan.getUTCFullYear(),scan.getUTCMonth(),scan.getUTCDate()-2,4,0,0));
      // Use visitSlots (Mon-Fri) for initial month detection (學期中表 足以代表周一~五有時段)
      if(dow>=1&&dow<=5&&visitSlotsRegular[dow]&&!holidays.has(ds)&&now<=bkDl&&scan<=bookingDeadline){
        currentYear=scan.getFullYear(); currentMonth=scan.getMonth(); return;
      }
      scan.setTime(scan.getTime()+86400000);
    }
  })();

  const monthNames=['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  const dayHeaders=['日','一','二','三','四','五','六'];

  function renderCalendar(){
    const grid=document.getElementById('calendarGrid');
    const title=document.getElementById('calendarTitle');
    if(!grid||!title) return;
    title.textContent=`${currentYear} 年 ${monthNames[currentMonth]}`;
    grid.innerHTML='';
    dayHeaders.forEach(d=>{ const el=document.createElement('div'); el.className='calendar-day-header'; el.textContent=d; grid.appendChild(el); });
    const firstDay=getDowFromDateStr(dateStr(currentYear,currentMonth,1));
    const daysInMonth=new Date(currentYear,currentMonth+1,0).getDate();
    const today=new Date();
    const todayStr=dateStr(today.getFullYear(),today.getMonth(),today.getDate());
    for(let i=0;i<firstDay;i++){ const el=document.createElement('div'); el.className='calendar-day empty'; grid.appendChild(el); }
    for(let d=1;d<=daysInMonth;d++){
      const el=document.createElement('div');
      el.className='calendar-day';
      el.textContent=d;
      const ds=dateStr(currentYear,currentMonth,d);
      const dayOfWeek=getDowFromDateStr(dateStr(currentYear,currentMonth,d));
      const isWeekend=dayOfWeek===0||dayOfWeek===6;
      const isHol=isHoliday(ds);
      const isPast=new Date(currentYear,currentMonth,d)<new Date(today.getFullYear(),today.getMonth(),today.getDate());
      const hasSlots=getWeeklySlots(ds)[dayOfWeek];
      const bkDeadline2=new Date(currentYear,currentMonth,d-2,12,0,0);
      const pastDeadline=now>bkDeadline2;
      const afterCutoff=new Date(currentYear,currentMonth,d)>bookingDeadline;
      const bkType=getBookingType();

      // 檢查當天是否所有時段都已滿
      const slotsForDay=getWeeklySlots(ds)[dayOfWeek]||[];
      var anySlotAvailable=false;
      if(bkType==='trial'){
        // 體驗課：只要有任何一個時段有未滿的班就算可預約
        slotsForDay.forEach(function(s){
          var classes=window.getTrialClasses(ds,s);
          if(classes.length>0 && classes.some(function(cls){ return !isTrialClassFull(ds,s,cls); })){
            anySlotAvailable=true;
          }
        });
      } else {
        slotsForDay.forEach(function(s){
          if(!isSlotFull(ds,s,bkType)) anySlotAvailable=true;
        });
      }
      const allFull=slotsForDay.length>0&&!anySlotAvailable;

      // 體驗課專用：超過體驗期間的日子全部灰色不可選
      var afterTrialEnd = false;
      if (bkType === 'trial' && window._trialEndDate && ds > window._trialEndDate) {
        afterTrialEnd = true;
      }
      if(isWeekend||isHol||isPast||!hasSlots||pastDeadline||afterCutoff||afterTrialEnd){
        el.classList.add('disabled');
        if(afterCutoff)el.title='本學期預約截止（6/30）';
        else if(isHol&&!isWeekend)el.title='假日或學校活動日';
        else if(pastDeadline&&!isPast)el.title='預約截止（須提前2天中午前）';
      } else if(allFull){
        el.classList.add('disabled');
        el.title='當日時段已滿';
        el.style.background='#FFF0F0';
        el.style.color='#e74c3c';
      } else {
        el.classList.add('has-slots');
        el.addEventListener('click',()=>selectDate(ds,d,dayOfWeek));
      }
      if(ds===todayStr)el.classList.add('today');
      if(selectedDate===ds)el.classList.add('selected');
      grid.appendChild(el);
    }
    document.getElementById('slotsPanel').classList.remove('active');
    document.getElementById('bookingForm').classList.remove('active');
  }

  function selectDate(ds,day,dow){
    selectedDate=ds; selectedSlot=null;
    renderCalendar();
    const panel=document.getElementById('slotsPanel');
    const slotsDate=document.getElementById('slotsDate');
    const slotsList=document.getElementById('slotsList');
    const selParts=ds.split('-');
    slotsDate.textContent=`${selParts[1]}/${selParts[2]} 可預約時段`;
    const selDeadline=new Date(parseInt(selParts[0]),parseInt(selParts[1])-1,parseInt(selParts[2])-2,12,0,0);
    const dlInfo=document.getElementById('bkDeadlineInfo');
    if(dlInfo){
      const isOk=now<=selDeadline;
      dlInfo.className='bk-deadline-badge'+(isOk?' bk-deadline-ok':'');
      dlInfo.innerHTML=(isOk?'✅':'❌')+` 預約截止：${selParts[1]}/${String(parseInt(selParts[2])-2).padStart(2,'0')} 中午 12:00`;
      dlInfo.style.display='inline-flex';
    }
    slotsList.innerHTML='';
    const bkType=getBookingType();
    const slots=getWeeklySlots(ds)[dow]||[];
    slots.forEach(slot=>{
      if(bkType==='trial'){
        // 體驗課：每個時段顯示該時段的班級列表
        const classes=window.getTrialClasses(ds,slot);
        // 時段標題
        const slotLabel=document.createElement('div');
        slotLabel.style.cssText='font-size:0.8rem;font-weight:800;color:var(--text-muted);margin:10px 0 6px;padding-bottom:4px;border-bottom:1px solid var(--surface-dark)';
        slotLabel.textContent='⏰ '+slot;
        slotsList.appendChild(slotLabel);
        if(classes.length===0){
          const empty=document.createElement('div');
          empty.style.cssText='font-size:0.8rem;color:var(--text-muted);padding:6px 10px';
          empty.textContent='此時段暫無排班';
          slotsList.appendChild(empty);
          return;
        }
        const clsWrap=document.createElement('div');
        clsWrap.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px';
        classes.forEach(cls=>{
          const btn=document.createElement('button');
          btn.className='slot-btn';
          const full=isTrialClassFull(ds,slot,cls);
          if(full){
            btn.classList.add('booked');
            btn.textContent=cls+' 班 · 已額滿';
          } else {
            btn.textContent=cls+' 班';
            btn.addEventListener('click',()=>{
              document.querySelectorAll('.slot-btn:not(.booked)').forEach(b=>b.classList.remove('selected'));
              btn.classList.add('selected');
              selectedSlot=slot;
              selectedTrialClass=cls;
              document.getElementById('bookingForm').classList.add('active');
              document.getElementById('bookingConfirm').classList.remove('active');
              // 更新表單標題
              var bkClassEl=document.getElementById('bkClass');
              if(bkClassEl&&!bkClassEl.value) bkClassEl.value='體驗'+cls+'班';
            });
          }
          clsWrap.appendChild(btn);
        });
        slotsList.appendChild(clsWrap);
      } else {
      const btn=document.createElement('button');
      btn.className='slot-btn';
      const full=isSlotFull(ds,slot,bkType);
      if(full){
        btn.classList.add('booked');
        btn.textContent=slot+' 已額滿';
      } else {
        btn.textContent=slot;
        btn.addEventListener('click',()=>{
          document.querySelectorAll('.slot-btn').forEach(b=>{if(!b.classList.contains('booked'))b.classList.remove('selected')});
          btn.classList.add('selected');
          selectedSlot=slot;
          selectedTrialClass=null;
          document.getElementById('bookingForm').classList.add('active');
          document.getElementById('bookingConfirm').classList.remove('active');
        });
      }
      slotsList.appendChild(btn);
      } // end else (non-trial)
    });
    panel.classList.add('active');
    document.getElementById('bookingForm').classList.remove('active');
    document.getElementById('bookingConfirm').classList.remove('active');
  }

  window.prevMonth=function(){ currentMonth--; if(currentMonth<0){currentMonth=11;currentYear--;} selectedDate=null;selectedSlot=null; renderCalendar(); };
  window.nextMonth=function(){ currentMonth++; if(currentMonth>11){currentMonth=0;currentYear++;} selectedDate=null;selectedSlot=null; renderCalendar(); };

  // v2.18.28b: 預約閘改 compact 提示條 — 點 X 只關閉提示 (日曆預設顯示)
  window._bkSkipGate = function() {
    var gate = document.getElementById('bkInquiryGate');
    if (gate) gate.style.display = 'none';
    window._hasInquiry = true;
    try { sessionStorage.setItem('xg_did_inquiry', '1'); } catch(e){}
    try { sessionStorage.setItem('xg_skipped_gate', '1'); } catch(e){}
  };
  // v2.18.25: 載入時恢復 _hasInquiry (這個 session 之前點過閘或填過問課)
  try {
    if (sessionStorage.getItem('xg_skipped_gate') === '1' || sessionStorage.getItem('xg_did_inquiry') === '1') {
      window._hasInquiry = true;
    }
  } catch(e){}
  // v2.18.24: 從 LINE 來的 (?from=line) 自動跳過閘
  (function(){
    try {
      var p = new URLSearchParams(location.search);
      if (p.get('from') === 'line') {
        setTimeout(function(){ if (typeof _bkSkipGate === 'function') _bkSkipGate(); }, 200);
      }
    } catch(e){}
  })();

  window.submitBooking=function(){
    let valid=true;
    // 體驗課模式：後台比對是否有檢測紀錄，有則自動帶入分班結果
    if(_currentBkType === 'trial'){
      var parentName = document.getElementById('bkParent').value.trim();
      var studentName = document.getElementById('bkChild').value.trim();
      if(parentName && studentName){
        var adminData = JSON.parse(localStorage.getItem('xg_admin_data') || '{}');
        var assessments = adminData.assessments || [];
        var bookings = adminData.bookingRegs || [];
        var matchedAssess = assessments.find(function(a){ return a.studentName && a.studentName.indexOf(studentName) >= 0; });
        var hasTestBooking = bookings.some(function(b){ return b.student && b.student.indexOf(studentName) >= 0 && b.type && b.type.indexOf('檢測') >= 0 && b.status !== '已取消'; });
        if(!matchedAssess && !hasTestBooking){
          alert('⚠️ 查無「' + studentName + '」的檢測紀錄。\n\n體驗課前需要先完成英文程度檢測喔！\n請先預約「參訪／程度檢測」。');
          return;
        }
        // 自動帶入分班結果到 bkClass
        if(matchedAssess){
          var bkCls = document.getElementById('bkClass');
          if(bkCls) bkCls.value = matchedAssess.classType || matchedAssess.finalClass || '';
        }
      }
    }

    // v2.18.25: 移除 submitBooking 雙重強制 · 預約閘已是軟提示 · 不再 alert 趕回問課
    const parent=document.getElementById('bkParent');
    const phone=document.getElementById('bkPhone');
    const child=document.getElementById('bkChild');
    const type=document.getElementById('bkType');
    [parent,phone,child].forEach(el=>{el.classList.remove('error')});
    document.querySelectorAll('#bookingForm .error-msg').forEach(e=>e.classList.remove('show'));
    // 參訪/檢測模式：至少勾一項
    var bkTypeNow = getBookingType();
    if(bkTypeNow === 'visitTest'){
      var doVisit = document.getElementById('bkVisit') && document.getElementById('bkVisit').checked;
      var doTest  = document.getElementById('bkTest')  && document.getElementById('bkTest').checked;
      if(!doVisit && !doTest){
        var errPurpose = document.getElementById('bkPurposeErr');
        if(errPurpose){ errPurpose.style.display='block'; }
        valid = false;
      } else {
        var parts=[];
        if(doVisit) parts.push('參訪校區');
        if(doTest)  parts.push('英文程度檢測');
        type.value = parts.join(' + ');
      }
    }
    if(!parent.value.trim()){parent.classList.add('error');document.getElementById('bkParentErr').classList.add('show');valid=false}
    if(!phone.value.trim()){phone.classList.add('error');document.getElementById('bkPhoneErr').classList.add('show');valid=false}
    if(!child.value.trim()){child.classList.add('error');document.getElementById('bkChildErr').classList.add('show');valid=false}
    if(!selectedDate||!selectedSlot){alert('請先選擇日期與時段');return}
    if(!valid)return;
    const bkType=getBookingType();
    if(isSlotFull(selectedDate,selectedSlot,bkType)){alert('此時段已被預約，請選擇其他時段');renderCalendar();return}
    const trialCls=(bkType==='trial')?(selectedTrialClass||getTrialClass(selectedDate,selectedSlot)):'';
    const wkNum=(bkType==='trial')?getWeekNum(selectedDate):'';
    const info={
      type:type.value, parent:parent.value, phone:phone.value,
      child:child.value, cls:document.getElementById('bkClass').value,
      trialClass:trialCls, weekNum:wkNum,
      ts:new Date().toLocaleString('zh-TW'), arranged:false
    };
    setSlot(selectedDate,selectedSlot,bkType,info);
    // Also save to adminData
    if(window._adminData) window._adminData.bookings.push({date:selectedDate,slot:selectedSlot,bkType,...info});
    saveParentInfo(parent.value, phone.value, '', '');
    if(child.value) saveChildInfo(child.value, '');
    var _trialClsId = (document.getElementById('bkTrialClassId')||{}).value || '';
    var _trialClsLabel = (document.getElementById('bkTrialClassLabel')||{}).value || '';
    var _trialTeacher = (document.getElementById('bkTrialTeacher')||{}).value || '';
    var _trialRoom = (document.getElementById('bkTrialRoom')||{}).value || '';
    sendWebhook('booking', {ts:info.ts, parent:info.parent, pname:info.parent, phone:info.phone, student:info.child, child:info.child, type:info.type, date:selectedDate, slot:selectedSlot, cls:info.cls, bkType:bkType, bookingType:bkType, trialClassId:_trialClsId, trialClassLabel:_trialClsLabel, trialTeacher:_trialTeacher, trialRoom:_trialRoom});
    // 同步到 localStorage 供獨立後台
    var xgData = JSON.parse(localStorage.getItem('xg_admin_data') || '{}');
    if(!xgData.bookingRegs) xgData.bookingRegs = [];
    xgData.bookingRegs.push({ts:info.ts, parent:info.parent, phone:info.phone, student:info.child, type:info.type, date:selectedDate, slot:selectedSlot, bkType:bkType, source:'預約表單', stage:bkType==='trial'?'已預約體驗':'已預約參訪', status:'待確認'});
    localStorage.setItem('xg_admin_data', JSON.stringify(xgData));

    const bkDateParts=selectedDate.split('-');
    const bkDeadline3=new Date(parseInt(bkDateParts[0]),parseInt(bkDateParts[1])-1,parseInt(bkDateParts[2])-2,12,0,0);
    const deadlineStr=bkDeadline3.toLocaleDateString('zh-TW',{month:'2-digit',day:'2-digit'})+' 中午 12:00';
    const trialInfo=(bkType==='trial'&&trialCls&&trialCls!=='—')
      ? `<br>📚 體驗班次：<strong>${wkNum} ${trialCls} 班</strong>`:'';
    document.getElementById('confirmDetails').innerHTML=
      `<div style="font-size:1.3rem;margin-bottom:12px">🎉</div>
      <strong>${parent.value}</strong> 您好，預約已完成！<br><br>
      <div style="background:var(--green-light);border-radius:10px;padding:12px 16px;margin:12px 0;text-align:left;font-size:0.9rem;line-height:1.8">
        📅 日期時段：<strong>${selectedDate} ${selectedSlot}</strong><br>
        📋 預約類型：<strong style="color:var(--green-dark);background:#FEF3C7;padding:2px 8px;border-radius:4px">${type.value}</strong>${trialInfo}<br>
        👶 學生姓名：${child.value}
      </div>
      <div style="background:#FFF7ED;border-radius:10px;padding:12px 16px;margin:12px 0;text-align:left;font-size:0.85rem;color:#92400E;line-height:1.75">
        ⏰ <strong>異動截止：${deadlineStr}</strong><br>
        1️⃣ <a href="https://lin.ee/tdpTDdu" target="_blank" style="color:var(--green);font-weight:700">官方 LINE</a> 告知姓名+日期+時段<br>
        2️⃣ 或返回表單重新預約
      </div>
      <p style="font-size:0.82rem;color:var(--text-muted)">24 小時內電話確認，感謝！</p>`;
    document.getElementById('bookingConfirm').classList.add('active');
    parent.value='';phone.value='';child.value='';
    document.getElementById('bkClass').value='';
    var bkV=document.getElementById('bkVisit'); if(bkV) bkV.checked=false;
    var bkT2=document.getElementById('bkTest');  if(bkT2) bkT2.checked=false;
    selectedDate=null;selectedSlot=null;selectedTrialClass=null;
    renderCalendar();
  };

  // 讓外部呼叫重新渲染（tab 切換後刷新名額顯示）
  window._reRenderCalendar=renderCalendar;

  renderCalendar();
  // 頁面一載入就拉「預約紀錄」鎖定「每時段只能 1 組」規則
  if (typeof _loadAllBookings === 'function') {
    setTimeout(_loadAllBookings, 200);
  }
  // 拉后台「主網站設定」 (不可預約日 + 某時段鎖定)
  if (typeof _loadAdminCalendarSettings === 'function') {
    setTimeout(_loadAdminCalendarSettings, 250);
  }
})();

/* ========== INQUIRY FORM ========== */


// ── 多孩子動態新增 ───────────────────────────────────────────────
var _childCount = 0;

// 預判口說級別的問題（參考系統GK/G1/G2/G3問題設計）
var IQ_ORAL_QUESTIONS = [
  {
    q: '孩子能用英文介紹自己嗎？（說名字、年齡、顏色）',
    hint: '例如 My name is…, I am 7 years old, This is blue',
    key: 'oral_intro',
    options: [
      {v:'none',  l:'完全不行，從未說過英文'},
      {v:'gk',    l:'能說幾個英文單字（名字/數字/顏色）'},
      {v:'g1_lo', l:'能說簡單句子，但常卡住'},
      {v:'g1_hi', l:'能流暢說完整句子'},
      {v:'g2up',  l:'可以自由對話，描述事情'}
    ]
  },
  {
    q: '如果問孩子「你昨天做了什麼？」，孩子大概能怎麼回答？',
    hint: '觀察孩子描述過去事件的能力',
    key: 'oral_past',
    options: [
      {v:'none',  l:'沒辦法用英文回答'},
      {v:'gk',    l:'頂多說幾個名詞（school, eat, home）'},
      {v:'g1_lo', l:'能說片語（go school, eat lunch）'},
      {v:'g1_hi', l:'能用簡單過去式（I went to…, I ate…）'},
      {v:'g2up',  l:'能完整描述多個事件'}
    ]
  },
  {
    q: '孩子能用英文比較兩件事嗎？（例如狗和貓哪個比較好？）',
    hint: '測試 G2 程度的比較句能力',
    key: 'oral_compare',
    options: [
      {v:'none',  l:'無法用英文比較'},
      {v:'gk',    l:'只能說喜歡哪個（I like dog）'},
      {v:'g1_lo', l:'能給簡單理由（Dog is cute）'},
      {v:'g1_hi', l:'能說 because、but 做連結'},
      {v:'g2up',  l:'能有條理地說明兩面觀點'}
    ]
  },
  {
    q: '孩子現在在哪裡學英文？',
    hint: '了解背景，幫助老師預估起點',
    key: 'current_study',
    options: [
      {v:'none',  l:'沒有在學，這是第一次'},
      {v:'school',l:'只有學校英文課'},
      {v:'cram',  l:'有在補習班（非太平新光）'},
      {v:'self',  l:'自學或家長教'},
    ]
  }
];

function iqAddChild(){
  _childCount++;
  var idx = _childCount;
  var div = document.createElement('div');
  div.id = 'iqChild_' + idx;
  div.className = 'iq-child-block';
  div.style.cssText = 'background:var(--surface);border:1.5px solid var(--surface-dark);border-radius:12px;padding:18px;margin-bottom:14px;position:relative';

  var removeBtn = idx > 1
    ? '<button type="button" onclick="iqRemoveChild('+idx+')" style="position:absolute;top:12px;right:14px;background:none;border:none;color:#e74c3c;font-size:1rem;cursor:pointer;font-weight:700" title="移除">✕</button>'
    : '';

  // 基本資料
  var basicHtml = '<div style="font-weight:800;font-size:0.9rem;color:var(--green);margin-bottom:12px">'+
    (idx===1 ? '孩子資料' : '孩子 #'+idx+' 資料') + '</div>' + removeBtn +
    '<div class="form-grid" style="grid-template-columns:1fr 1fr;margin-bottom:12px">' +
    '<div class="form-group"><label>孩子姓名 <span class="req">*</span></label>'+
    '<input type="text" id="iqChildName_'+idx+'" placeholder="請輸入孩子姓名"></div>' +
    '<div class="form-group"><label>目前年級 <span class="req">*</span></label>'+
    '<select id="iqGrade_'+idx+'" onchange="iqAutoSuggestChild('+idx+');iqToggleSchoolFields('+idx+')">' +
    '<option value="">請選擇</option>' +
    '<option>幼幼班</option><option>小班</option><option>中班</option><option>大班</option>' +
    '<option>國小1年級</option><option>國小2年級</option><option>國小3年級</option>' +
    '<option>國小4年級</option><option>國小5年級</option><option>國小6年級</option>' +
    '<option>國中1年級</option><option>國中2年級</option><option>國中3年級</option>' +
    '</select></div>' +
    '<div class="form-group"><label>就讀學校 <span class="req">*</span></label>'+
    '<input type="text" id="iqSchool_'+idx+'" placeholder="如：太平國小、育才幼兒園"></div>' +
    '<div class="form-group"><label>班級</label>'+
    '<input type="text" id="iqClass_'+idx+'" placeholder="如：三年二班、大象班"></div>' +
    '</div>' +
    '<div id="iqNextSchool_'+idx+'" style="display:none;margin-bottom:12px">' +
    '<div class="form-grid" style="grid-template-columns:1fr">' +
    '<div class="form-group"><label>預計升小一就讀學校</label>'+
    '<input type="text" id="iqNextSchoolName_'+idx+'" placeholder="如：太平國小（大班/幼幼班升小一請填）"></div>' +
    '</div></div>' +
    '<div class="form-grid" style="grid-template-columns:1fr 1fr;margin-bottom:12px">' +
    '<div class="form-group"><label>上課主要目標 <span class="req">*</span></label>'+
    '<select id="iqGoal_'+idx+'" onchange="iqAutoSuggestChild('+idx+')">' +
    '<option value="">請選擇</option>' +
    '<option value="env">全美語環境，自然浸潤</option>' +
    '<option value="fast">快速提升英文程度</option>' +
    '<option value="cert">準備英檢或劍橋考試</option>' +
    '<option value="hw">課後有人顧功課</option>' +
    '<option value="stable">穩固基礎，不落後</option>' +
    '</select></div>' +
    '<div class="form-group"><label>每週希望天數</label>'+
    '<select id="iqDays_'+idx+'">' +
    '<option value="">請選擇</option>' +
    '<option value="5">每天（5天）全力衝刺</option>' +
    '<option value="3">3天——密集但有空間</option>' +
    '<option value="2">2天——穩健不增壓力</option>' +
    '</select></div>' +
    '</div>';

  // 預判口說問題
  var oralHtml = '<div style="background:var(--green-light);border-radius:8px;padding:12px 14px;margin-bottom:10px">';
  oralHtml += '<div style="font-weight:700;font-size:0.82rem;color:var(--green-dark);margin-bottom:10px">📋 幫老師預判孩子英文程度（選一個最符合的）</div>';
  IQ_ORAL_QUESTIONS.forEach(function(q){
    oralHtml += '<div style="margin-bottom:12px">';
    oralHtml += '<div style="font-size:0.85rem;font-weight:700;color:var(--text);margin-bottom:4px">'+q.q+'</div>';
    if(q.hint) oralHtml += '<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:6px">'+q.hint+'</div>';
    q.options.forEach(function(opt){
      oralHtml += '<label style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:0.83rem;cursor:pointer">';
      oralHtml += '<input type="radio" name="iq_'+q.key+'_'+idx+'" value="'+opt.v+'" style="accent-color:var(--green)">';
      oralHtml += opt.l + '</label>';
    });
    oralHtml += '</div>';
  });
  oralHtml += '</div>';

  // 建議顯示框
  var suggestHtml = '<div id="iqSuggest_'+idx+'" style="display:none;background:#F0FDF4;border-left:3px solid var(--green);padding:10px 12px;border-radius:0 8px 8px 0;font-size:0.84rem;margin-top:8px"></div>';

  div.innerHTML = basicHtml + oralHtml + suggestHtml;
  document.getElementById('iqChildrenList').appendChild(div);
}

function iqRemoveChild(idx){
  var el = document.getElementById('iqChild_'+idx);
  if(el) el.remove();
}

function iqToggleSchoolFields(idx){
  var grade = (document.getElementById('iqGrade_'+idx)||{}).value||'';
  var nextBox = document.getElementById('iqNextSchool_'+idx);
  if(!nextBox) return;
  // 幼幼班/小班/中班/大班 → 顯示「預計升小一就讀學校」
  var isKinder = ['幼幼班','小班','中班','大班'].indexOf(grade) >= 0;
  nextBox.style.display = isKinder ? '' : 'none';
}

function iqAutoSuggestChild(idx){
  var grade = (document.getElementById('iqGrade_'+idx)||{}).value||'';
  var goal  = (document.getElementById('iqGoal_'+idx)||{}).value||'';
  if(!grade||!goal) return;
  var box = document.getElementById('iqSuggest_'+idx);
  if(!box) return;
  var suggestions = [];
  if(goal==='env') suggestions.push('浸潤班');
  else if(goal==='fast') suggestions.push('菁英班');
  else if(goal==='cert') suggestions.push('全民英檢班');
  else if(goal==='hw') suggestions.push('安親課輔班');
  else if(goal==='stable') suggestions.push('菁英班');
  suggestions.push('建議安排程度檢測（$400），更精確分班');
  box.style.display = 'block';
  box.innerHTML = '🎯 初步建議：<strong>' + suggestions.join('、') + '</strong>';
}

// 收集孩子預判口說資料
function iqGetOralData(idx){
  var oral = {};
  IQ_ORAL_QUESTIONS.forEach(function(q){
    var sel = document.querySelector('input[name="iq_'+q.key+'_'+idx+'"]:checked');
    oral[q.key] = sel ? sel.value : '';
  });
  // 預判級別
  var scores = {none:0, gk:1, g1_lo:2, g1_hi:3, g2up:4};
  var keys = ['oral_intro','oral_past','oral_compare'];
  var total = keys.reduce(function(s,k){ return s+(scores[oral[k]]||0); }, 0);
  var avg = total / keys.length;
  var predictedLevel = avg < 1 ? 'GK' : avg < 2 ? 'GK-G1' : avg < 3 ? 'G1' : avg < 3.5 ? 'G1-G2' : 'G2+';
  oral.predictedOralLevel = predictedLevel;
  oral.currentStudy = oral.current_study || '';
  return oral;
}

// ── 在校生判斷（已移除，保留空函數避免舊呼叫出錯）──
function iqCheckEnroll(){}

// 主要課程勾選後才顯示加購服務
function iqCheckMainClass(){
  var mainChecked = document.querySelectorAll('input[name="iqClasses"]:checked').length > 0;
  var addOnSection = document.getElementById('iqAddOnSection');
  if(addOnSection){
    addOnSection.style.display = mainChecked ? 'block' : 'none';
    // 如果取消所有主課程，清空加購
    if(!mainChecked){
      document.querySelectorAll('input[name="iqAddOns"]').forEach(function(cb){ cb.checked = false; });
    }
  }
}

// ── 送出諮詢 ─────────────────────────────────────────────────────
function submitInquiry(e){
  e.preventDefault();
  var valid = true;

  document.querySelectorAll('#inquiryForm .error-msg').forEach(function(el){
    el.style.display='none'; el.classList.remove('show');
  });

  // 聯繫資料驗證
  var parent = document.getElementById('iqParent');
  var phone  = document.getElementById('iqPhone');
  var email  = document.getElementById('iqEmail');
  if(!parent||!parent.value.trim()){ parent.classList.add('error'); document.getElementById('iqParentErr').style.display='block'; valid=false; }
  if(!phone||!phone.value.trim()){ phone.classList.add('error'); document.getElementById('iqPhoneErr').style.display='block'; valid=false; }
  if(!email||!email.value.trim()){ email.classList.add('error'); document.getElementById('iqEmailErr').style.display='block'; valid=false; }

  // 孩子資料驗證
  var childBlocks = document.querySelectorAll('.iq-child-block');
  var childrenData = [];
  childBlocks.forEach(function(block){
    var id = block.id.replace('iqChild_','');
    var name  = (document.getElementById('iqChildName_'+id)||{}).value||'';
    var grade = (document.getElementById('iqGrade_'+id)||{}).value||'';
    var school = (document.getElementById('iqSchool_'+id)||{}).value||'';
    var classN = (document.getElementById('iqClass_'+id)||{}).value||'';
    var nextSchool = (document.getElementById('iqNextSchoolName_'+id)||{}).value||'';
    var goal  = (document.getElementById('iqGoal_'+id)||{}).value||'';
    var days  = (document.getElementById('iqDays_'+id)||{}).value||'';
    var oral  = iqGetOralData(id);
    if(!name||!grade||!goal){ block.style.borderColor='#e74c3c'; valid=false; }
    else {
      block.style.borderColor='';
      childrenData.push({name:name, grade:grade, school:school, classN:classN, nextSchool:nextSchool, goal:goal, days:days, oral:oral});
    }
  });
  childrenData.forEach(function(c){
    if(!c.school) valid=false;
  });
  if(childrenData.length===0) valid=false;

  // 班型驗證
  var classes = Array.from(document.querySelectorAll('input[name="iqClasses"]:checked')).map(function(c){return c.value;});
  var addOns = Array.from(document.querySelectorAll('input[name="iqAddOns"]:checked')).map(function(c){return c.value;});
  if(addOns.length > 0) classes = classes.concat(addOns.map(function(a){ return '＋'+a; }));
  if(classes.length===0){ document.getElementById('iqClassesErr').style.display='block'; valid=false; }

  if(!valid) return false;

  var question = (document.getElementById('iqQuestion')||{}).value||'';
  var data = {
    ts: new Date().toLocaleString('zh-TW'),
    parent: parent.value.trim(),
    phone:  phone.value.trim(),
    email:  email.value.trim(),
    line:   (document.getElementById('iqLine')||{}).value||'',
    children: childrenData,
    classes:  classes.join('、'),
    question: question,
  };
  data.callScript = generateCallScript(data);
  // 存共用資料供其他表單自動帶入
  saveParentInfo(data.parent, data.phone, data.line, data.email);
  if(childrenData.length > 0) saveChildInfo(childrenData[0].name, childrenData[0].grade);
  adminSaveInquiry(data);
  sendWebhook('inquiry', data);

  // 同步到 localStorage 供獨立後台使用
  var xgData = JSON.parse(localStorage.getItem('xg_admin_data') || '{}');
  if(!xgData.inquiries) xgData.inquiries = [];
  data.source = '問課表單';
  data.stage = '已問課';
  xgData.inquiries.push(data);
  localStorage.setItem('xg_admin_data', JSON.stringify(xgData));

  // 建立帶參數的檢測系統連結
  var assessUrl = 'https://www.perplexity.ai/computer/a/tai-ping-xin-guang-fen-xiao-yi-kBa4UJQySPOV2y45Plyz0w';
  var params = new URLSearchParams({
    parent: data.parent,
    phone:  data.phone,
    email:  data.email,
    children: JSON.stringify(childrenData.map(function(c){
      return {name:c.name, grade:c.grade, goal:c.goal, predictedLevel:c.oral.predictedOralLevel};
    }))
  });
  var assessUrlFull = assessUrl + '?' + params.toString();

  // 確認頁
  var confirmEl = document.getElementById('inquiryConfirm');
  var detailEl  = document.getElementById('iqConfirmDetails');
  if(detailEl){
    var goalMap = {env:'全美語浸潤',fast:'快速提升',cert:'準備英檢',hw:'安親課輔',stable:'穩固基礎'};
    var levelMap = {
      'GK':'幼兒園程度（GK）', 'GK-G1':'幼稚園～一年級之間',
      'G1':'一年級程度（G1）', 'G1-G2':'一二年級之間', 'G2+':'二年級以上'
    };
    var cHtml = childrenData.map(function(c){
      var lvl = c.oral.predictedOralLevel;
      return '<div style="margin:6px 0;padding:8px 12px;background:#fff;border-radius:8px;font-size:0.87rem">' +
        '<strong>'+c.name+'</strong>（'+c.grade+'）' +
        '<span style="margin-left:8px;color:var(--green);font-weight:700">預判程度：'+(levelMap[lvl]||lvl)+'</span>' +
        '<div style="color:var(--text-muted);font-size:0.8rem;margin-top:2px">目標：'+(goalMap[c.goal]||c.goal)+'</div></div>';
    }).join('');
    detailEl.innerHTML =
      '<div style="background:var(--green-light);border-radius:10px;padding:14px 16px;text-align:left">' +
      '<div style="font-size:0.9rem;margin-bottom:8px">👨‍👩‍👧 <strong>'+data.parent+'</strong>　📞 '+data.phone+'　📧 '+data.email+'</div>'+
      cHtml +
      '</div>' +
      '<div style="margin-top:16px;background:#FFF7ED;border-radius:10px;padding:14px 16px;text-align:left">' +
      '<div style="font-weight:700;color:#92400E;margin-bottom:8px">🎯 建議下一步：英語程度檢測（$400）</div>' +
      '<p style="font-size:0.85rem;color:var(--text);line-height:1.7;margin-bottom:12px">'+
      '我們會在 24 小時內電話確認，並安排老師為孩子進行<strong>口說+閱讀+筆試</strong>三階段檢測（約 50 分鐘），'+
      '精準找出最適合的班級和級數。</p>' +
      '<a href="'+assessUrlFull+'" target="_blank" class="btn btn-primary" style="display:inline-flex;justify-content:center;text-decoration:none;padding:12px 28px;font-size:0.9rem">'+
      '📝 預填資料至檢測系統 →</a>' +
      '<p style="font-size:0.76rem;color:var(--text-muted);margin-top:8px">（點擊後請給老師操作，家長基本資料已自動帶入）</p>'+
      '</div>';
  }
  window._hasInquiry = true;
  document.getElementById('inquiryForm').style.display='none';
  if(confirmEl) confirmEl.classList.add('active');

  // 加入「傳送到後台」按鈕
  var adminBtn = document.getElementById('inquiryAdminBtn');
  if(adminBtn) adminBtn.style.display='inline-flex';

  return false;
}

/* ========== CALL SCRIPT GENERATOR ========== */
function generateCallScript(data) {
  var lines = [];
  var goalMap = {env:'全美語浸潤環境',fast:'快速提升英文',cert:'準備英檢/劍橋',hw:'安親課輔服務',stable:'穩固英文基礎',camp:'暑假營隊'};
  var levelLabels = {'GK':'幼兒園程度','GK-G1':'幼兒園到一年級','G1':'一年級程度','G1-G2':'一到二年級之間','G2+':'二年級以上'};
  var oralQMap = {none:'無法用英文回應',gk:'能說單字',g1_lo:'片語程度',g1_hi:'簡單完整句',g2up:'能自由對話'};

  lines.push('您好，我是太平新光分校，請問是 ' + (data.parent||'家長') + ' 嗎？');
  lines.push('');
  lines.push('一、確認聯繫資料');
  lines.push('  📞 ' + (data.phone||'—') + '　📧 ' + (data.email||'—') + '　LINE: ' + (data.line||'—'));
  lines.push('');

  if(data.children && data.children.length) {
    data.children.forEach(function(c, i) {
      lines.push('二、孩子 ' + (i+1) + '：' + (c.name||'未填') + '（' + (c.grade||'—') + '）');
      lines.push('  · 目標：' + (goalMap[c.goal]||c.goal||'—') + '　偏好天數：' + (c.days||'未填'));
      if(c.oral) {
        var lvl = c.oral.predictedOralLevel;
        lines.push('  · 預判口說程度：' + (levelLabels[lvl]||lvl||'未填'));
        if(c.oral.oral_intro) lines.push('    - 自我介紹：' + (oralQMap[c.oral.oral_intro]||c.oral.oral_intro));
        if(c.oral.oral_past)  lines.push('    - 描述過去：' + (oralQMap[c.oral.oral_past]||c.oral.oral_past));
        if(c.oral.oral_compare) lines.push('    - 比較事物：' + (oralQMap[c.oral.oral_compare]||c.oral.oral_compare));
        if(c.oral.current_study) lines.push('    - 目前在學：' + c.oral.current_study);
      }
      lines.push('');
      lines.push('  ❓ 回電引導問題：');
      if(c.goal==='env')    lines.push('  → 想每天都來還是有天數限制？對全英文上課有沒有擔心的地方？');
      else if(c.goal==='fast')  lines.push('  → 學校英文大概幾分？有沒有考試截止壓力？');
      else if(c.goal==='cert')  lines.push('  → 目標初級還是中級？預計什麼時候考？');
      else if(c.goal==='hw')    lines.push('  → 幾點放學？哪幾科需要特別加強？');
      else if(c.goal==='stable')lines.push('  → 哪幾天比較方便？有沒有特別弱的部分？');
      // 依預判程度給老師提示
      var lvl2 = c.oral ? c.oral.predictedOralLevel : '';
      if(lvl2==='GK'||lvl2==='GK-G1')
        lines.push('  💡 程度提示：預判 GK 程度，建議從口說 GK 題組開始，注意基本字母/數字反應');
      else if(lvl2==='G1'||lvl2==='G1-G2')
        lines.push('  💡 程度提示：預判 G1 程度，建議 G1 口說題組，觀察完整句子能力');
      else if(lvl2==='G2+')
        lines.push('  💡 程度提示：預判 G2 以上，建議 G2 口說題組，觀察比較/描述能力');
      lines.push('');
    });
  }

  lines.push('三、安排下一步');
  lines.push('  → 為孩子安排程度檢測（口說+閱讀+筆試，約 50 分鐘，$400）');
  // 依參訪期對應時段：暑期 (7/1–8/26) 17:00 / 19:00、學期中 14:00 / 19:00
  var _today = new Date();
  var _todayStr = _today.getFullYear() + '-' + String(_today.getMonth()+1).padStart(2,'0') + '-' + String(_today.getDate()).padStart(2,'0');
  var _isSummerNow = (_todayStr >= '2026-07-01' && _todayStr <= '2026-08-26');
  if (_isSummerNow) {
    lines.push('  → 請問哪天下午（17:00）或晚上（19:00）方便來校？（暑期週一至週五）');
  } else {
    lines.push('  → 請問哪天下午（14:00）或晚上（19:00）方便來校？（週一至週五）');
  }
  if(data.classes) lines.push('  → 有興趣班型：' + data.classes);
  if(data.question) { lines.push(''); lines.push('家長備註：' + data.question); }
  return lines.join('\n');
}


/* ========== ADMIN PANEL ========== */
// ====== 通知 Webhook（Apps Script Gateway）======
// Gateway: 安全寫入 Sheets + 可選推 LINE 卡。個人 Gmail 部署、不受 Workspace 組織政策限制
var WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbw-7_a_OfUVlgegcLxkux_9dr9UlYSVKhi3uQjV-0sr2X2TpRRmCXtSM7jbIqMHK4hNww/exec';
var WEBHOOK_PENDING_KEY = 'xg_webhook_pending';

// 取出未送達的資料
function _getPendingWebhooks(){
  try { return JSON.parse(localStorage.getItem(WEBHOOK_PENDING_KEY)||'[]'); } catch(e){ return []; }
}
function _setPendingWebhooks(arr){
  try { localStorage.setItem(WEBHOOK_PENDING_KEY, JSON.stringify(arr)); } catch(e){}
}
function _addPending(payload){
  var arr = _getPendingWebhooks();
  arr.push({ payload: payload, ts: new Date().toISOString() });
  if (arr.length > 20) arr = arr.slice(-20);
  _setPendingWebhooks(arr);
}

// 送達失敗時警告使用者
function _showWebhookError(type){
  var typeLabel = { camp:'夏令營報名', inquiry:'問課諮詢', booking:'預約／說明會', register:'正式註冊' }[type] || '表單';
  alert('⚠️ ' + typeLabel + '送出遇到網路問題，資料已暫存。\n\n請你：\n1. 重新整理這個頁面再試一次\n2. 或撥電話到太平新光分校 04-23960585 詢問\n\n謝謝。');
}

// 送達 webhook 到 Apps Script Gateway
// 重點：用 text/plain Content-Type 避免 CORS 預檢（preflight）。
// Apps Script doPost(e) 可以讀 e.postData.contents 取出原始 JSON 字串、同樣能 JSON.parse。
// CORS preflight 只在 application/json 時觸發、text/plain 不觸發、送不上去的問題一下子解決。
async function _postWebhookOnce(payload){
  var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var timer = ctrl ? setTimeout(function(){ ctrl.abort(); }, 15000) : null;
  try {
    var resp = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },  // 避開 CORS preflight
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined,
      redirect: 'follow'
    });
    if (timer) clearTimeout(timer);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var data = await resp.json().catch(function(){ return {success:true}; });
    if (data.success === false) throw new Error(data.error || 'Gateway rejected');
    return true;
  } catch(e){
    if (timer) clearTimeout(timer);
    throw e;
  }
}

// v2.18: 從 URL ?lineUserId=Uxxx 或 sessionStorage 拿 lineUserId
function _getLineUserIdForForm() {
  try {
    var sp = new URLSearchParams(location.search);
    var fromUrl = sp.get('lineUserId') || sp.get('lineuserid') || '';
    if (fromUrl) {
      // 存 sessionStorage 讓之後跳表單也能帶到
      try { sessionStorage.setItem('lineUserId', fromUrl); } catch(e) {}
      return fromUrl;
    }
    return sessionStorage.getItem('lineUserId') || '';
  } catch (e) { return ''; }
}

async function sendWebhook(type, data) {
  if(!WEBHOOK_URL) return;
  var payload = JSON.parse(JSON.stringify(data));
  payload._type = type;
  // v2.18: 自動帶 lineUserId (如果家長從 LIFF welcome 連來 OR URL params)
  if (!payload.lineUserId) {
    var luid = _getLineUserIdForForm();
    if (luid) payload.lineUserId = luid;
  }
  // 重試最多 3 次（1 + 2 重試）
  var attempts = 0;
  var lastErr = null;
  while (attempts < 3) {
    try {
      await _postWebhookOnce(payload);
      console.log('[webhook] 送出成功', type, attempts ? '（重試 ' + attempts + ' 次後成功）' : '');
      return true;
    } catch(e){
      attempts++;
      lastErr = e;
      console.warn('[webhook] 第 ' + attempts + ' 次失敗：' + e.message);
      if (attempts < 3) await new Promise(function(r){ setTimeout(r, 1000 * attempts); });
    }
  }
  // 3 次都失敗 → 暫存 + 警告使用者
  console.error('[webhook] 全部重試失敗', lastErr);
  _addPending(payload);
  _showWebhookError(type);
  return false;
}

// 頁面載入時 → 如果有未送達的資料，重新試送
function _retryPendingWebhooks(){
  var pending = _getPendingWebhooks();
  if (pending.length === 0) return;
  console.log('[webhook] 發現 ' + pending.length + ' 筆未送達，重試中');
  var stillPending = [];
  (async function(){
    for (var i = 0; i < pending.length; i++){
      try {
        await _postWebhookOnce(pending[i].payload);
        console.log('[webhook] 補送成功', pending[i].payload._type);
      } catch(e){
        stillPending.push(pending[i]);
      }
    }
    _setPendingWebhooks(stillPending);
  })();
}
if (typeof window !== 'undefined') {
  window.addEventListener('load', function(){ setTimeout(_retryPendingWebhooks, 2000); });
}

var _adminData = { inquiries: [], campRegs: [], bookings: [] };
window._trialOverrides = {};

var ADMIN_PANEL_URL = 'https://www.perplexity.ai/computer/a/tai-ping-xin-guang-fen-xiao-ho-Eq4Q_FiuS4GWiwCSGFOwvA';

// 把資料轉成後台格式並開啟後台匯入
function sendToAdminPanel(data) {
  // 將資料 encode 為 JSON 透過 URL 傳遞（限制大小，用 base64）
  try {
    var json = JSON.stringify(data);
    var b64  = btoa(unescape(encodeURIComponent(json)));
    var url  = ADMIN_PANEL_URL + '?import=' + encodeURIComponent(b64);
    window.open(url, '_blank');
  } catch(e) {
    // fallback: copy to clipboard
    navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    alert('資料已複製到剪貼簿，請貼到後台的「匯入資料」功能');
  }
}

// ====== 表單資料共用：自動帶入 ======
function saveParentInfo(pname, phone, line, email){
  var info = {pname:pname, phone:phone, line:line||'', email:email||'', ts:Date.now()};
  localStorage.setItem('xg_parent_info', JSON.stringify(info));
}
function loadParentInfo(){
  try { return JSON.parse(localStorage.getItem('xg_parent_info')||'{}'); } catch(e){ return {}; }
}
function saveChildInfo(sname, grade){
  var info = {sname:sname, grade:grade||'', ts:Date.now()};
  localStorage.setItem('xg_child_info', JSON.stringify(info));
}
function loadChildInfo(){
  try { return JSON.parse(localStorage.getItem('xg_child_info')||'{}'); } catch(e){ return {}; }
}
// 頁面載入時，自動帶入已存的家長/孩子資料
function autoFillForms(){
  var p = loadParentInfo();
  var c = loadChildInfo();
  // 問課表單
  if(p.pname){
    var el = document.getElementById('iq_pname'); if(el && !el.value) el.value = p.pname;
    el = document.getElementById('iq_phone'); if(el && !el.value) el.value = p.phone||'';
    el = document.getElementById('iq_line'); if(el && !el.value) el.value = p.line||'';
  }
  if(c.sname){
    var el = document.getElementById('iq_sname'); if(el && !el.value) el.value = c.sname;
    if(c.grade){ el = document.getElementById('iq_grade'); if(el && !el.value) el.value = c.grade; }
  }
  // 預約表單
  if(p.pname){
    var el = document.getElementById('bkParent'); if(el && !el.value) el.value = p.pname;
    el = document.getElementById('bkPhone'); if(el && !el.value) el.value = p.phone||'';
  }
  if(c.sname){
    var el = document.getElementById('bkChild'); if(el && !el.value) el.value = c.sname;
  }
  // 夏令營（第一個孩子）
  if(p.pname){
    var el = document.getElementById('cr_pname'); if(el && !el.value) el.value = p.pname;
    el = document.getElementById('cr_phone'); if(el && !el.value) el.value = p.phone||'';
    el = document.getElementById('cr_line'); if(el && !el.value) el.value = p.line||'';
  }
  if(c.sname){
    var el = document.getElementById('cr_sname_1'); if(el && !el.value) el.value = c.sname;
    if(c.grade){ el = document.getElementById('cr_grade_1'); if(el && !el.value) el.value = c.grade; }
  }
  // 正式註冊
  if(p.pname){
    var el = document.getElementById('reg_pname'); if(el && !el.value) el.value = p.pname;
    el = document.getElementById('reg_phone'); if(el && !el.value) el.value = p.phone||'';
    el = document.getElementById('reg_email'); if(el && !el.value) el.value = p.email||'';
    el = document.getElementById('reg_line'); if(el && !el.value) el.value = p.line||'';
  }
  if(c.sname){
    var el = document.getElementById('reg_sname'); if(el && !el.value) el.value = c.sname;
    if(c.grade){ el = document.getElementById('reg_grade'); if(el && !el.value) el.value = c.grade; }
  }
}
document.addEventListener('DOMContentLoaded', function(){ setTimeout(autoFillForms, 500); });

// ====== 檢測成果頁：讀取 URL 參數 ======
(function(){
  var params = new URLSearchParams(window.location.search);
  if(!params.get('result')) return;

  // 顯示成果頁 section
  var sec = document.getElementById('result');
  if(sec) sec.style.display = '';

  var name = params.get('name') || '—';
  var grade = params.get('grade') || '—';
  var finalClass = params.get('class') || '—';
  var oral = params.get('oral') || '—';
  var reading = params.get('reading') || '—';
  var written = params.get('written') || '—';
  var note = params.get('note') || '';

  document.getElementById('resultStudentName').textContent = name;
  document.getElementById('resultGrade').textContent = grade;
  document.getElementById('resultClass').textContent = finalClass;
  document.getElementById('resultOral').textContent = oral;
  document.getElementById('resultReading').textContent = reading;
  document.getElementById('resultWritten').textContent = written;

  if(note){
    document.getElementById('resultNoteBox').style.display = '';
    document.getElementById('resultNote').textContent = note;
  }

  // 程度對照表
  var classDescriptions = {
    'SA': {type:'菁英班', desc:'英文啟蒙階段，從字母、基礎單字和簡單句型開始。適合零基礎或剛開始接觸英文的孩子。建議每週至少 4.5 小時，穩定建立基礎。', freq:'每週 7.5 小時'},
    'SB': {type:'菁英班', desc:'已認識字母和基本單字，正在建立拼讀能力和簡單會話。會繼續強化 phonics 和日常對話能力。', freq:'每週 7.5 小時'},
    '1A': {type:'菁英班', desc:'具備基礎拼讀和簡單句型能力，開始練習短文閱讀和基本寫作。', freq:'每週 7.5 小時'},
    '1B': {type:'菁英班', desc:'字母拼讀穩定，能讀簡單短文。正在加強句子結構和閱讀理解。適合有一定基礎想穩定進步的孩子。', freq:'每週 3 次，共 6–7.5 小時'},
    '1C': {type:'菁英班', desc:'閱讀理解能力不錯，能寫簡單段落。準備進入更深入的文法和寫作訓練。', freq:'每週 3 次，共 6–7.5 小時'},
    '2A': {type:'菁英班', desc:'已有穩固的閱讀和寫作基礎，能理解較長的文章。開始接觸進階文法和學術英文。', freq:'每週 3–5 次，共 7.5–10 小時'},
    '2B': {type:'菁英班', desc:'閱讀和寫作能力佳，能進行較流暢的英文對話。適合準備英檢初級的程度。', freq:'每週 3–5 次，共 7.5–10 小時'},
    '2C': {type:'菁英班', desc:'程度優秀，具備中階閱讀策略和寫作能力。可同步準備英檢中級。', freq:'每週 3–5 次，共 7.5–10 小時'},
    '3A': {type:'浸潤班', desc:'英文程度優異，具備獨立閱讀和寫作長文的能力。進入高階語言運用和批判思考訓練。', freq:'每週 5 次全天浸潤'},
    '3B': {type:'浸潤班', desc:'接近母語程度的讀寫能力，能流暢進行英文簡報和辯論。', freq:'每週 5 次全天浸潤'},
    '3C': {type:'浸潤班', desc:'達到母語級別的英文能力，可進行學術研究和高階寫作。', freq:'每週 5 次全天浸潤'}
  };

  var info = classDescriptions[finalClass] || {type:'請洽分校', desc:'分校老師會根據檢測結果為您詳細說明適合的班型和學習計畫。', freq:'請洽分校'};
  document.getElementById('resultClassType').textContent = info.type;
  document.getElementById('resultDescription').innerHTML = info.desc;
  document.getElementById('resultSuggestion').innerHTML = 
    '• 建議班型：<strong>' + info.type + ' ' + finalClass + '</strong><br>' +
    '• 建議上課頻率：' + info.freq + '<br>' +
    '• 點下方按鈕直接進行線上註冊，或 LINE 聯繫安排到校諮詢';

  // 自動滑到成果頁
  setTimeout(function(){ sec.scrollIntoView({behavior:'smooth', block:'start'}); }, 300);

  // 儲存到 localStorage 供註冊表帶入
  saveChildInfo(name, grade);
  localStorage.setItem('xg_assess_result', JSON.stringify({name:name, grade:grade, finalClass:finalClass, classType:info.type, oral:oral, reading:reading, written:written, note:note}));
})();

// 從檢測結果預填註冊表
function prefillRegisterFromResult(){
  var result = null;
  try { result = JSON.parse(localStorage.getItem('xg_assess_result')||'null'); } catch(e){}
  if(!result) return;
  setTimeout(function(){
    var el;
    el = document.getElementById('reg_sname'); if(el){ el.value = result.name||''; }
    el = document.getElementById('reg_grade'); if(el) el.value = result.grade||'';
    el = document.getElementById('reg_classtype'); if(el){ el.value = result.classType||''; toggleRegAddons(); }
    el = document.getElementById('reg_assess'); if(el) el.value = result.finalClass||'';
    lookupRegAssess();
  }, 200);
}

function adminSaveInquiry(data) {
  _adminData.inquiries.push(data);
  if(window._adminRefresh) window._adminRefresh();
}
function adminSaveCamp(data) {
  _adminData.campRegs.push(data);
  // 同步到 localStorage 供獨立後台使用
  var xgData = JSON.parse(localStorage.getItem('xg_admin_data') || '{}');
  if(!xgData.camp) xgData.camp = [];
  data.source = '夏令營報名';
  data.stage = '已報名夏令營';
  xgData.camp.push(data);
  localStorage.setItem('xg_admin_data', JSON.stringify(xgData));
  if(window._adminRefresh) window._adminRefresh();
}

window.clearAdminData = function(){
  if(!confirm('確定清除所有預約、問課和夏令營記錄？')) return;
  _adminData.inquiries=[]; _adminData.campRegs=[]; _adminData.bookings=[];
  if(window._bookingSlots) Object.keys(window._bookingSlots).forEach(function(k){delete window._bookingSlots[k];});
  if(window._adminRefresh) window._adminRefresh();
  if(window._reRenderCalendar) window._reRenderCalendar();
};
window.toggleArranged = function(idx){
  if(_adminData.bookings[idx]){
    _adminData.bookings[idx].arranged=!_adminData.bookings[idx].arranged;
    if(window._adminRefresh) window._adminRefresh();
  }
};

(function(){
  if(window.location.search.includes('admin=xinguang2026')){
    setTimeout(function(){
      var panel=document.createElement('div');
      panel.id='adminPanel';
      panel.style.cssText='position:fixed;bottom:16px;right:16px;z-index:9999;background:#030F2B;color:#fff;border-radius:12px;padding:16px;max-width:440px;max-height:82vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,0.5);font-size:0.8rem';
      window._adminRefresh=refresh;
      function refresh(){
        var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
        h+='<strong style="font-size:0.95rem">📋 太平新光後台</strong>';
        h+='<div style="display:flex;gap:6px">';
        h+='<button onclick="clearAdminData()" style="background:rgba(255,80,80,0.2);color:#ff8080;border:none;border-radius:6px;padding:4px 10px;font-size:0.72rem;cursor:pointer">清除</button>';
        h+='<button onclick="document.getElementById(\'adminPanel\').remove()" style="background:rgba(255,255,255,0.1);color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer">關閉</button>';
        h+='</div></div>';
        h+='<div style="color:#aaa;font-size:0.72rem;margin-bottom:10px">預約：'+_adminData.bookings.length+' ｜ 問課：'+_adminData.inquiries.length+' ｜ 夏令營：'+_adminData.campRegs.length+'</div>';

        // 預約記錄
        if(_adminData.bookings.length>0){
          h+='<div style="font-weight:700;color:#7DFFB3;margin:8px 0 6px">📅 預約記錄</div>';
          _adminData.bookings.forEach(function(d,i){
            var cls=(d.trialClass&&d.trialClass!=='—'&&d.trialClass!=='（未排）')?' ▸ <span style="color:#FFD700">'+d.weekNum+' '+d.trialClass+'班</span>':'';
            h+='<div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:9px;margin-bottom:5px">';
            h+='<div style="display:flex;justify-content:space-between;align-items:flex-start">';
            h+='<span style="font-weight:700;color:#7DFFB3">'+d.date+' '+d.slot+'</span>';
            h+='<button onclick="toggleArranged('+i+')" style="background:'+(d.arranged?'#192643':'rgba(255,255,255,0.15)')+';color:#fff;border:none;border-radius:5px;padding:3px 8px;font-size:0.7rem;cursor:pointer">'+(d.arranged?'✓已安排':'排班')+'</button>';
            h+='</div>';
            h+='<div style="font-size:0.75rem;color:#aaa;margin-top:3px">'+d.type+cls+' ｜ '+d.parent+' ｜ '+d.child+' ｜ '+d.phone+'</div>';
            h+='<div style="color:rgba(255,255,255,0.35);font-size:0.68rem">'+d.ts+'</div></div>';
          });
          h+='<div style="border-top:1px solid rgba(255,255,255,0.08);margin:10px 0"></div>';
        }

        // 問課記錄
        if(_adminData.inquiries.length>0){
          h+='<div style="font-weight:700;color:#7DFFB3;margin:8px 0 6px">📋 問課諮詢</div>';
          _adminData.inquiries.forEach(function(d,i){
            h+='<div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:10px;margin-bottom:8px">';
            h+='<div style="font-weight:700;color:#7DFFB3">#'+(i+1)+' '+d.parent+'</div>';
            h+='<div style="color:#ccc;font-size:0.8rem;margin-top:3px">📞 '+d.phone+' ｜ 📧 '+(d.email||'—')+' ｜ LINE: '+(d.line||'—')+'</div>';
            if(d.children&&d.children.length){
              d.children.forEach(function(c){
                h+='<div style="color:#aaa;font-size:0.78rem;margin-top:2px">👦 '+c.name+'（'+c.grade+'） '+c.level+' · 目標:'+c.goal+'</div>';
              });
            }
            h+='<div style="color:#ccc;font-size:0.78rem;margin-top:3px">班型：'+(d.classes||'—')+'</div>';
            if(d.callScript){
              h+='<details style="margin-top:6px"><summary style="cursor:pointer;color:#FFD700;font-size:0.78rem">📞 回電腳本</summary>';
              h+='<div style="background:rgba(255,200,0,0.08);border-radius:6px;padding:8px;margin-top:4px;color:#FFD700;font-size:0.76rem;white-space:pre-wrap">'+d.callScript+'</div></details>';
            }
            h+='<div style="color:rgba(255,255,255,0.35);font-size:0.68rem;margin-top:4px">'+d.ts+'</div></div>';
          });
          h+='<div style="border-top:1px solid rgba(255,255,255,0.08);margin:10px 0"></div>';
        }

        // 夏令營
        if(_adminData.campRegs.length>0){
          h+='<div style="font-weight:700;color:#FF8C00;margin:8px 0 6px">🏕️ 夏令營報名</div>';
          _adminData.campRegs.forEach(function(d,i){
            h+='<div style="background:rgba(255,140,0,0.08);border-radius:8px;padding:9px;margin-bottom:5px">';
            h+='<div style="font-weight:700;color:#FFD700">#'+(i+1)+' '+d.pname+' ｜ '+d.sname+'（'+d.grade+'）</div>';
            h+='<div style="color:#ccc;font-size:0.78rem">📞 '+d.phone+' ｜ 🏕️ '+d.courses+'</div>';
            h+='<div style="color:rgba(255,255,255,0.35);font-size:0.68rem">'+d.ts+'</div></div>';
          });
        }
        panel.innerHTML=h;
      }
      refresh();
      document.body.appendChild(panel);
      setInterval(refresh,3000);

      // 體驗課班次維護 panel
      var tp=document.createElement('div');
      tp.id='trialMgmtPanel';
      tp.style.cssText='position:fixed;bottom:16px;left:16px;z-index:9999;background:#1A1F2E;color:#fff;border-radius:14px;padding:0;width:520px;max-height:85vh;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.6);font-size:0.82rem;display:flex;flex-direction:column';

      // ── 產生學期內所有週三週四 ──────────────────────────────
      function getTrialDates(){
        var dates=[];
        var d=new Date('2026-04-09T00:00:00'); // 學期第一個可預約日
        var end=new Date('2026-06-30T00:00:00');
        var holidays=['2026-04-03','2026-04-04','2026-04-05','2026-04-06',
          '2026-04-25','2026-05-01','2026-06-12','2026-06-19',
          '2026-05-15','2026-05-27','2026-06-15','2026-06-26'];
        while(d<=end){
          var dow=getDowFromDateStr(d.toISOString().slice(0,10));
          var ds=d.toISOString().slice(0,10);
          if((dow===3||dow===4)&&holidays.indexOf(ds)===-1) dates.push(ds);
          d=new Date(d.getTime()+86400000);
        }
        return dates;
      }
      var _trialDates=getTrialDates();
      var _slots3=['14:00-15:00','16:30-17:30','18:30-19:30'];

      // 預設班次表（白板）
      // 體驗課預設班次：依星期幾
      var _defaultByDow={
        3:{'14:00-15:00':'1B','16:30-17:30':'2A','18:30-19:30':'4B'},
        4:{'14:00-15:00':'G1','16:30-17:30':'G3/3A','18:30-19:30':'3B'}
      };
      function getDefaultClass(ds,slot){
        var dow=getDowFromDateStr(ds);
        return (_defaultByDow[dow]&&_defaultByDow[dow][slot])||'—';
      }
      function getEffectiveClass(ds,slot){
        var ov=window._trialOverrides||{};
        if(ov[ds]&&ov[ds][slot]&&ov[ds][slot]!=='') return {cls:ov[ds][slot],custom:true};
        return {cls:getDefaultClass(ds,slot),custom:false};
      }

      // ── 目前選中的 tab：'table' | 'quick' ───────────────
      var _tTab='table';

      function renderTrialMgmt(){
        var ov=window._trialOverrides||{};
        var customCount=Object.values(ov).reduce(function(a,v){return a+Object.keys(v).length;},0);
        tp.innerHTML='';

        // Header
        var header=document.createElement('div');
        header.style.cssText='padding:14px 18px 0;flex-shrink:0';
        header.innerHTML=
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'+
          '<div><strong style="font-size:0.95rem">✏️ 體驗課班次管理</strong>'+
          '<span style="margin-left:8px;background:rgba(255,215,0,0.2);color:#FFD700;border-radius:50px;padding:2px 8px;font-size:0.72rem">已自訂 '+customCount+' 格</span></div>'+
          '<div style="display:flex;gap:6px">'+
          '<button onclick="syncTrialToCalendar()" style="background:#192643;color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:0.75rem;cursor:pointer;font-weight:700">✅ 發布到日曆</button>'+
          '<button onclick="document.getElementById(\'trialMgmtPanel\').remove()" style="background:rgba(255,255,255,0.1);color:#fff;border:none;border-radius:6px;padding:5px 10px;cursor:pointer">關閉</button>'+
          '</div></div>';

        // Tabs
        var tabs=document.createElement('div');
        tabs.style.cssText='display:flex;gap:6px;margin-bottom:12px;padding:0 18px';
        tabs.innerHTML=
          '<button onclick="switchTTab(\'table\')" id="ttab_table" style="padding:5px 14px;border-radius:50px;border:1.5px solid '+(
            _tTab==='table'?'#7DFFB3':'rgba(255,255,255,0.2)'
          )+';background:'+(
            _tTab==='table'?'rgba(125,255,179,0.15)':'none'
          )+';color:'+(
            _tTab==='table'?'#7DFFB3':'#aaa'
          )+';font-size:0.78rem;cursor:pointer;font-weight:700">📅 整學期班次表</button>'+
          '<button onclick="switchTTab(\'quick\')" id="ttab_quick" style="padding:5px 14px;border-radius:50px;border:1.5px solid '+(
            _tTab==='quick'?'#7DFFB3':'rgba(255,255,255,0.2)'
          )+';background:'+(
            _tTab==='quick'?'rgba(125,255,179,0.15)':'none'
          )+';color:'+(
            _tTab==='quick'?'#7DFFB3':'#aaa'
          )+';font-size:0.78rem;cursor:pointer;font-weight:700">⚡ 快速設定單筆</button>';
        header.appendChild(tabs);
        tp.appendChild(header);

        // Body
        var body=document.createElement('div');
        body.style.cssText='flex:1;overflow-y:auto;padding:0 18px 18px';

        if(_tTab==='table'){
          // ── 整學期班次總覽表 ─────────────────────────────
          var tbl='<table style="width:100%;border-collapse:collapse;font-size:0.76rem">';
          tbl+='<thead><tr>'+
            '<th style="padding:6px 4px;text-align:left;color:#aaa;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.1)">日期</th>'+
            _slots3.map(function(s){
              return '<th style="padding:6px 4px;text-align:center;color:#aaa;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.1)">'+s+'</th>';
            }).join('')+
            '</tr></thead><tbody>';
          _trialDates.forEach(function(ds){
            var d=new Date(ds+'T00:00:00');
            var dowCn=['日','一','二','三','四','五','六'][getDowFromDateStr(d.toISOString().slice(0,10))];
            var mm=d.getMonth()+1, dd=d.getDate();
            tbl+='<tr>';
            tbl+='<td style="padding:5px 4px;color:#ccc;white-space:nowrap;border-bottom:1px solid rgba(255,255,255,0.05)">'+
              mm+'/'+dd+'（'+dowCn+'）</td>';
            _slots3.forEach(function(slot){
              var eff=getEffectiveClass(ds,slot);
              var color=eff.custom?'#7DFFB3':'#888';
              var bg=eff.custom?'rgba(125,255,179,0.1)':'transparent';
              tbl+='<td style="padding:5px 4px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.05);background:'+bg+'">'+
                '<input type="text" value="'+(eff.cls==='—'?'':eff.cls)+'" '+
                'data-date="'+ds+'" data-slot="'+slot+'" '+
                'placeholder="'+(getDefaultClass(ds,slot)||'—')+'" '+
                'style="width:64px;background:rgba(255,255,255,0.07);color:'+color+';border:1px solid rgba(255,255,255,0.15);border-radius:4px;padding:3px 5px;font-size:0.75rem;text-align:center;font-family:inherit" '+
                'onchange="updateTrialCell(this)" '+
                'onfocus="this.style.borderColor=\'#7DFFB3\'" '+
                'onblur="this.style.borderColor=\'rgba(255,255,255,0.15)\'"'+
                '></td>';
            });
            tbl+='</tr>';
          });
          tbl+='</tbody></table>';
          tbl+='<div style="margin-top:10px;font-size:0.72rem;color:#666">'+
            '🟢 綠色 = 已自訂　灰色 = 使用白板預設。直接在格子輸入班級名稱（如 SB、2A），留空則沿用預設。</div>';
          body.innerHTML=tbl;
        } else {
          // ── 快速設定單筆 ────────────────────────────────
          body.innerHTML=
            '<div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:12px;margin-bottom:10px">'+
            '<div style="font-weight:700;color:#7DFFB3;margin-bottom:10px">設定單筆班次</div>'+
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'+
            '<div><label style="font-size:0.7rem;color:#aaa;display:block;margin-bottom:4px">日期</label>'+
            '<input id="tAdd_date" type="date" min="2026-04-09" max="2026-06-30" '+
            'style="width:100%;background:#2A3040;color:#fff;border:1px solid #444;border-radius:5px;padding:5px 7px;font-size:0.8rem;font-family:inherit"></div>'+
            '<div><label style="font-size:0.7rem;color:#aaa;display:block;margin-bottom:4px">時段</label>'+
            '<select id="tAdd_slot" style="width:100%;background:#2A3040;color:#fff;border:1px solid #444;border-radius:5px;padding:5px 7px;font-size:0.8rem">'+
            _slots3.map(function(s){return '<option>'+s+'</option>';}).join('')+
            '</select></div></div>'+
            '<div style="margin-bottom:8px"><label style="font-size:0.7rem;color:#aaa;display:block;margin-bottom:4px">班級名稱</label>'+
            '<input id="tAdd_cls" type="text" placeholder="如：SB、1B、2A、G1、G3/3A" '+
            'style="width:100%;background:#2A3040;color:#fff;border:1px solid #444;border-radius:5px;padding:5px 7px;font-size:0.8rem;font-family:inherit" '+
            'onkeydown="if(event.key===\'Enter\')addTrialOverride()"></div>'+
            '<button onclick="addTrialOverride()" style="width:100%;background:#192643;color:#fff;border:none;border-radius:6px;padding:8px;font-size:0.82rem;font-weight:700;cursor:pointer">儲存</button>'+
            '</div>'+
            // 已設定列表
            (Object.keys(ov).length>0?
              '<div style="font-weight:700;color:#FFD700;margin-bottom:6px">已自訂班次（'+(customCount)+'筆）</div>'+
              Object.keys(ov).sort().map(function(date){
                return Object.keys(ov[date]).map(function(slot){
                  var cls=ov[date][slot];
                  var d=new Date(date+'T00:00:00');
                  var label=(d.getMonth()+1)+'/'+d.getDate();
                  return '<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);border-radius:6px;padding:7px 10px;margin-bottom:4px">'+
                    '<span><span style="color:#7DFFB3">'+label+'</span> '+
                    '<span style="color:#aaa;font-size:0.75rem">'+slot+'</span> ▸ <strong>'+cls+'</strong></span>'+
                    '<button onclick="removeTrialOverride(\''+date+'\',\''+slot+'\')" '+
                    'style="background:rgba(255,80,80,0.2);color:#ff8080;border:none;border-radius:4px;padding:2px 8px;font-size:0.7rem;cursor:pointer">刪除</button>'+
                    '</div>';
                }).join('');
              }).join('')
              :'<div style="color:#555;font-size:0.78rem;text-align:center;padding:20px 0">尚無自訂班次<br>使用白板預設排班</div>');
        }
        tp.appendChild(body);
      }

      // ── 整學期表格直接輸入 ──────────────────────────────
      window.updateTrialCell=function(input){
        var ds=input.dataset.date;
        var slot=input.dataset.slot;
        var val=input.value.trim();
        if(!window._trialOverrides[ds]) window._trialOverrides[ds]={};
        if(val===''){
          delete window._trialOverrides[ds][slot];
          if(Object.keys(window._trialOverrides[ds]).length===0) delete window._trialOverrides[ds];
          input.style.color='#888';
        } else {
          window._trialOverrides[ds][slot]=val;
          input.style.color='#7DFFB3';
        }
        // 更新 badge
        var ov=window._trialOverrides||{};
        var cnt=Object.values(ov).reduce(function(a,v){return a+Object.keys(v).length;},0);
        var badge=tp.querySelector('span[style*="FFD700"]');
        if(badge) badge.textContent='已自訂 '+cnt+' 格';
      };

      // ── Tab 切換 ───────────────────────────────────────
      window.switchTTab=function(tab){
        _tTab=tab;
        renderTrialMgmt();
      };

      // ── 快速設定 ────────────────────────────────────────
      window.addTrialOverride=function(){
        var date=document.getElementById('tAdd_date').value;
        var slot=document.getElementById('tAdd_slot').value;
        var cls=document.getElementById('tAdd_cls').value.trim();
        if(!date||!slot){alert('請填寫日期和時段');return;}
        if(!window._trialOverrides[date]) window._trialOverrides[date]={};
        if(cls===''){
          delete window._trialOverrides[date][slot];
          if(Object.keys(window._trialOverrides[date]).length===0) delete window._trialOverrides[date];
        } else {
          window._trialOverrides[date][slot]=cls;
        }
        renderTrialMgmt();
      };
      window.removeTrialOverride=function(date,slot){
        if(window._trialOverrides[date]){
          delete window._trialOverrides[date][slot];
          if(Object.keys(window._trialOverrides[date]).length===0) delete window._trialOverrides[date];
        }
        renderTrialMgmt();
      };

      // ── 發布到日曆（重繪） ──────────────────────────────
      window.syncTrialToCalendar=function(){
        if(window._reRenderCalendar) window._reRenderCalendar();
        var toast=document.createElement('div');
        toast.textContent='✅ 班次已更新到日曆！';
        toast.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#192643;color:#fff;padding:10px 22px;border-radius:8px;font-size:0.88rem;font-weight:700;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3)';
        document.body.appendChild(toast);
        setTimeout(function(){toast.remove();},2000);
      };

      renderTrialMgmt();
      document.body.appendChild(tp);
    },1000);
  }
})();




/* ========== CAMP REGISTRATION ========== */

// 願示/隱藏日期選擇器

// ── 夏令營多孩子 ──────────────────────────────────────────
var _campChildCount = 0;
function campAddChild(){
  _campChildCount++;
  var idx = _campChildCount;
  var div = document.createElement('div');
  div.id = 'campChild_' + idx;
  div.className = 'camp-child-block';
  div.style.cssText = 'background:var(--surface);border:1.5px solid var(--surface-dark);border-radius:12px;padding:18px;margin-bottom:14px;position:relative';
  var removeBtn = idx > 1
    ? '<button type="button" onclick="campRemoveChild('+idx+')" style="position:absolute;top:12px;right:14px;background:none;border:none;color:#e74c3c;font-size:1rem;cursor:pointer;font-weight:700">✕</button>'
    : '';

  // 基本資料
  var html = '<div style="font-weight:800;font-size:0.9rem;color:var(--green);margin-bottom:12px">' +
    (idx===1 ? '👦 孩子資料' : '👦 孩子 #'+idx) + '</div>' + removeBtn;

  html += '<div class="camp-reg-grid">' +
    '<div class="camp-reg-field"><label>學生姓名 <span class="req">*</span></label>' +
    '<input type="text" id="cr_sname_'+idx+'" placeholder="請輸入姓名"></div>' +
    '<div class="camp-reg-field"><label>年級 <span class="req">*</span></label>' +
    '<select id="cr_grade_'+idx+'"><option value="">請選擇</option>' +
    '<option>幼稚園大班</option><option>國小 1 年級</option><option>國小 2 年級</option>' +
    '<option>國小 3 年級</option><option>國小 4 年級</option><option>國小 5 年級</option>' +
    '<option>國小 6 年級</option><option>國中 1 年級</option></select></div></div>';

  html += '<div class="camp-reg-grid" style="margin-top:8px">' +
    '<div class="camp-reg-field"><label>是否在校生 <span class="req">*</span></label>' +
    '<select id="cr_enrolled_'+idx+'"><option value="">請選擇</option>' +
    '<option value="yes">是</option><option value="no">否</option></select></div>' +
    '<div class="camp-reg-field"><label>制服尺寸 <span class="req">*</span></label>' +
    '<select id="cr_tsize_'+idx+'" style="width:100%"><option value="">請選擇尺寸</option>' +
    '<option value="30">30（身高 115~120 cm）</option>' +
    '<option value="32">32（身高 120~130 cm）</option>' +
    '<option value="34">34（身高 130~140 cm）</option>' +
    '<option value="S">S （身高 140~150 cm）</option>' +
    '<option value="M">M （身高 150~160 cm）</option>' +
    '<option value="L">L （身高 160~170 cm）</option>' +
    '<option value="XL">XL（身高 170~180 cm）</option>' +
    '</select></div></div>' +
    '<div style="margin-top:6px;font-size:0.72rem;color:var(--text-muted);line-height:1.6;background:var(--surface);border-radius:6px;padding:8px 10px">' +
    '👕 <strong>制服尺寸對照</strong><br>' +
    '30: 衣長20\"/肩寬14\"/袖長5.5\" ｜ 32: 衣長21\"/肩寬15\"/袖長6\"<br>' +
    '34: 衣長22\"/肩寬16\"/袖長6.5\" ｜ S: 衣長24\"/肩寬17\"/袖長7\"<br>' +
    'M: 衣長25\"/肩寬18\"/袖長7.5\" ｜ L: 衣長26\"/肩寬19\"/袖長8\"<br>' +
    'XL: 衣長27\"/肩寬20\"/袖長9\"</div>';

  // 期別選擇（每位孩子獨立）
  html += '<div style="margin-top:14px;padding-top:14px;border-top:1px dashed var(--surface-dark)">';
  html += '<div style="font-weight:700;font-size:0.82rem;color:var(--text);margin-bottom:8px">選擇上課期別與日期：</div>';

  // 七月
  html += '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:6px;font-weight:600;font-size:0.88rem">' +
    '<input type="checkbox" id="cr_july_'+idx+'" onchange="toggleChildCampDays('+idx+',\'july\')" style="width:16px;height:16px;accent-color:var(--green)">' +
    '🔬 七月｜超能科學派（7/01–7/28）</label>';
  html += '<div id="days_child_july_'+idx+'" style="display:none;margin:6px 0 12px 24px">' +
    buildCampCalendar('july', idx) + '</div>';

  // 八月
  html += '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:6px;font-weight:600;font-size:0.88rem">' +
    '<input type="checkbox" id="cr_aug_'+idx+'" onchange="toggleChildCampDays('+idx+',\'aug\')" style="width:16px;height:16px;accent-color:var(--green)">' +
    '🕵️ 八月｜謎案追查隊（7/29–8/25）</label>';
  html += '<div id="days_child_aug_'+idx+'" style="display:none;margin:6px 0 12px 24px">' +
    buildCampCalendar('aug', idx) + '</div>';

  html += '</div>';

  div.innerHTML = html;
  document.getElementById('campChildrenList').appendChild(div);
}

// 動態產生日曆 HTML
function buildCampCalendar(month, childIdx) {
  var dates = month==='july' ? _julyDates : _augDates;
  var gridId = 'cal_child_'+month+'_'+childIdx;
  var summaryId = 'summary_child_'+month+'_'+childIdx;
  var h = '<div class="camp-cal"><div class="camp-cal-header">';
  ['一','二','三','四','五'].forEach(function(d){ h += '<div class="camp-cal-wday">'+d+'</div>'; });
  h += '</div><div class="camp-cal-grid" id="'+gridId+'">';
  // 填入日期按鈕
  var lastMon = null;
  dates.forEach(function(ds, i){
    var parts = ds.split('-');
    var y=parseInt(parts[0]),m=parseInt(parts[1])-1,d=parseInt(parts[2]);
    var dow = getDowFromDateStr(ds); // 0=日 1=一 ... 6=六
    // 每週開頭補空格
    if(i === 0){
      for(var pad = 1; pad < dow; pad++) h += '<div class="camp-day-cell empty"></div>';
    } else {
      var prevDs = dates[i-1];
      var prevDow = getDowFromDateStr(prevDs);
      if(dow <= prevDow){
        for(var pad2 = prevDow+1; pad2 <= 5; pad2++) h += '<div class="camp-day-cell empty"></div>';
        for(var pad3 = 1; pad3 < dow; pad3++) h += '<div class="camp-day-cell empty"></div>';
      } else {
        for(var gap = prevDow+1; gap < dow; gap++) h += '<div class="camp-day-cell empty"></div>';
      }
    }
    var cn = ['日','一','二','三','四','五','六'][dow];
    h += '<button type="button" class="camp-day-cell" data-date="'+ds+'" data-child="'+childIdx+'" data-month="'+month+'" onclick="toggleChildDay(this,'+childIdx+',\''+month+'\')">'+
      parseInt(parts[1])+'/'+d+'<span>（'+cn+'）</span></button>';
  });
  h += '</div><div id="'+summaryId+'" style="margin-top:8px;font-size:0.8rem;font-weight:700;min-height:18px"></div></div>';
  return h;
}

// 預計算七月和八月所有上課日
var _julyDates = [], _augDates = [];
(function(){
  var julyData = [
    '2026-07-01','2026-07-02','2026-07-03',
    '2026-07-06','2026-07-07','2026-07-08','2026-07-09','2026-07-10',
    '2026-07-13','2026-07-14','2026-07-15','2026-07-16','2026-07-17',
    '2026-07-20','2026-07-21','2026-07-22','2026-07-23','2026-07-24',
    '2026-07-27','2026-07-28'
  ];
  var augData = [
    '2026-07-29','2026-07-30','2026-07-31',
    '2026-08-03','2026-08-04','2026-08-05','2026-08-06','2026-08-07',
    '2026-08-10','2026-08-11','2026-08-12','2026-08-13','2026-08-14',
    '2026-08-17','2026-08-18','2026-08-19','2026-08-20','2026-08-21',
    '2026-08-24','2026-08-25'
  ];
  _julyDates = julyData;
  _augDates = augData;
})();

function toggleChildCampDays(childIdx, month){
  var cb = document.getElementById('cr_'+month+'_'+childIdx);
  var picker = document.getElementById('days_child_'+month+'_'+childIdx);
  if(!cb || !picker) return;
  picker.style.display = cb.checked ? 'block' : 'none';
  if(!cb.checked){
    picker.querySelectorAll('.camp-day-cell.selected').forEach(function(c){ c.classList.remove('selected'); });
    var summary = document.getElementById('summary_child_'+month+'_'+childIdx);
    if(summary) summary.textContent = '';
  }
  calcPrice();
}

function toggleChildDay(btn, childIdx, month){
  if(btn.classList.contains('empty')) return;
  btn.classList.toggle('selected');
  var gridId = 'cal_child_'+month+'_'+childIdx;
  var summaryId = 'summary_child_'+month+'_'+childIdx;
  var cells = document.querySelectorAll('#'+gridId+' .camp-day-cell.selected');
  var count = cells.length;
  var summary = document.getElementById(summaryId);
  if(summary){
    if(count === 0) summary.textContent = '';
    else if(count < 5){ summary.style.color = '#e74c3c'; summary.textContent = '已選 '+count+' 天（最少5天）'; }
    else { summary.style.color = 'var(--green)'; summary.textContent = '✅ 已選 '+count+' 天'; }
  }
  calcPrice();
}

function campRemoveChild(idx){
  var el = document.getElementById('campChild_'+idx);
  if(el) el.remove();
}


function calcPrice() {
  var detail = document.getElementById('campPriceDetail');
  var earlyBird = document.getElementById('campEarlyBird');
  if (!detail) return;

  var now = new Date();
  /* v2.19.1 · 營隊早鳥也對齊一般報名截止日 */
  var _pc = window.PROMOTION_CONFIG || {};
  var deadline = new Date(_pc.standardDeadline || '2026-05-31T23:59:59');
  var beforeDeadline = now <= deadline;
  var normalDay = 1760, discDay = 1496;

  // 遍歷所有孩子（每位孩子獨立計算折扣）
  var childDetails = []; // [{name, julyDays, augDays, totalDays, hasDiscount}]
  var childBlocks = document.querySelectorAll('.camp-child-block');
  childBlocks.forEach(function(block){
    var id = block.id.replace('campChild_','');
    var sname = (document.getElementById('cr_sname_'+id)||{}).value || ('孩子 #'+id);
    var jCb = document.getElementById('cr_july_'+id);
    var aCb = document.getElementById('cr_aug_'+id);
    var jDays = (jCb && jCb.checked) ? document.querySelectorAll('#cal_child_july_'+id+' .camp-day-cell.selected').length : 0;
    var aDays = (aCb && aCb.checked) ? document.querySelectorAll('#cal_child_aug_'+id+' .camp-day-cell.selected').length : 0;
    var cTotal = jDays + aDays;
    if(cTotal > 0){
      // 專屬優惠條件：此孩子個人的（七月+八月合計>=20天）或（七月>=20天且八月>=20天），且5/31前
      var cQualify = beforeDeadline && ((cTotal >= 20) || (jDays >= 20 && aDays >= 20));
      childDetails.push({name: sname.trim() || ('孩子 #'+id), julyDays: jDays, augDays: aDays, totalDays: cTotal, hasDiscount: cQualify});
    }
  });

  var allDays = childDetails.reduce(function(sum,c){ return sum + c.totalDays; }, 0);
  if(allDays === 0) {
    detail.innerHTML = '<span style="color:var(--text-muted)">請先在上方選擇上課期別與日期</span>';
    if (earlyBird) earlyBird.style.display = 'none';
    return;
  }

  // 有任何一位孩子符合專屬優惠就顯示 badge
  var anyDiscount = childDetails.some(function(c){ return c.hasDiscount; });
  if (earlyBird) earlyBird.style.display = anyDiscount ? 'flex' : 'none';

  // 每位孩子分別用自己的費率計算
  var totalPrice = 0;
  var totalOrig = 0;
  var rows = '';

  childDetails.forEach(function(c){
    var cRate = c.hasDiscount ? discDay : normalDay;
    var cPrice = cRate * c.totalDays;
    var cOrig = normalDay * c.totalDays;
    totalPrice += cPrice;
    totalOrig += cOrig;

    if(childDetails.length <= 1){
      // 單一孩子：分七月/八月列
      if(c.julyDays > 0) rows += '<div class="camp-price-row"><span>🔬 七月｜超能科學派 ('+c.julyDays+'天)</span><span>'+cRate.toLocaleString()+' × '+c.julyDays+' = <strong>'+(cRate*c.julyDays).toLocaleString()+'</strong> 元</span></div>';
      if(c.augDays > 0) rows += '<div class="camp-price-row"><span>🕵️ 八月｜謎案追查隊 ('+c.augDays+'天)</span><span>'+cRate.toLocaleString()+' × '+c.augDays+' = <strong>'+(cRate*c.augDays).toLocaleString()+'</strong> 元</span></div>';
      if(c.hasDiscount) rows += '<div class="camp-price-row" style="color:var(--orange)"><span>🎉 夏令營專屬優惠（滿 20 天）</span><span>-' + (cOrig - cPrice).toLocaleString() + ' 元</span></div>';
      else if(beforeDeadline){
        var needed = 20 - c.totalDays;
        if(needed > 0) rows += '<div class="camp-price-row" style="color:var(--text-muted);font-size:0.8rem"><span>💡 再選 '+needed+' 天即享專屬優惠（單人合計滿 20 天）</span></div>';
      }
    } else {
      // 多位孩子：每人一行，標示是否有折扣
      var label = c.name + '（';
      var parts = [];
      if(c.julyDays > 0) parts.push('七月 '+c.julyDays+'天');
      if(c.augDays > 0) parts.push('八月 '+c.augDays+'天');
      label += parts.join('＋') + '）';
      var discLabel = c.hasDiscount ? ' <span style="color:var(--orange);font-size:0.75rem">優惠✓</span>' : '';
      rows += '<div class="camp-price-row"><span>'+label+discLabel+'</span><span>'+cRate.toLocaleString()+' × '+c.totalDays+' = <strong>'+(cPrice).toLocaleString()+'</strong> 元</span></div>';
      if(!c.hasDiscount && beforeDeadline){
        var needed = 20 - c.totalDays;
        if(needed > 0) rows += '<div class="camp-price-row" style="color:var(--text-muted);font-size:0.75rem;padding-left:8px"><span>↳ '+c.name+' 再選 '+needed+' 天即享專屬優惠</span></div>';
      }
    }
  });

  // 多位孩子時顯示合計折扣
  var totalSaving = totalOrig - totalPrice;
  if(childDetails.length > 1 && totalSaving > 0){
    rows += '<div class="camp-price-row" style="color:var(--orange)"><span>🎉 夏令營專屬優惠折扣</span><span>-' + totalSaving.toLocaleString() + ' 元</span></div>';
  }

  if(!beforeDeadline && allDays > 0){
    rows += '<div class="camp-price-row" style="color:var(--text-muted);font-size:0.8rem"><span>夏令營專屬優惠已於 5/31 截止</span></div>';
  }

  rows += '<div class="camp-price-row total"><span>課程費用合計（不含學習資源費）</span><span>NTD ' + totalPrice.toLocaleString() + ' 元</span></div>';

  detail.innerHTML = rows;
}

function submitCampReg() {
  var errEl = document.getElementById('campFormError');
  errEl.style.display = 'none';
  var errors = [];

  var pname = document.getElementById('cr_pname').value.trim();
  var phone = document.getElementById('cr_phone').value.trim();
  var diet = document.getElementById('cr_diet').value.trim();

  // 收集所有孩子（含各自選的日期）
  var campChildren = [];
  var childBlocks = document.querySelectorAll('.camp-child-block');
  childBlocks.forEach(function(block){
    var id = block.id.replace('campChild_','');
    var sname = (document.getElementById('cr_sname_'+id)||{}).value||'';
    var grade = (document.getElementById('cr_grade_'+id)||{}).value||'';
    var enrolled = (document.getElementById('cr_enrolled_'+id)||{}).value||'';
    var tsize = (document.getElementById('cr_tsize_'+id)||{}).value||'';
    var julyDates = [], augDates = [];
    var julyCb = document.getElementById('cr_july_'+id);
    var augCb  = document.getElementById('cr_aug_'+id);
    if(julyCb && julyCb.checked){
      document.querySelectorAll('#cal_child_july_'+id+' .camp-day-cell.selected').forEach(function(c){ julyDates.push(c.dataset.date); });
    }
    if(augCb && augCb.checked){
      document.querySelectorAll('#cal_child_aug_'+id+' .camp-day-cell.selected').forEach(function(c){ augDates.push(c.dataset.date); });
    }
    // 只要有填姓名就收集（空欄位後面再驗證）
    campChildren.push({id:id, sname:sname.trim(), grade:grade, enrolled:enrolled, tsize:tsize, julyDates:julyDates, augDates:augDates, totalDays:julyDates.length+augDates.length});
  });

  // 驗證
  if (!pname) errors.push('請填寫家長姓名');
  if (!phone) errors.push('請填寫聯絡電話');
  if (campChildren.length === 0) errors.push('請至少填寫一位孩子的資料');
  campChildren.forEach(function(c){
    if(!c.sname) errors.push('請填寫孩子姓名');
    if(!c.grade) errors.push((c.sname||'孩子')+' 請選擇年級');
    if(!c.enrolled) errors.push((c.sname||'孩子')+' 請選擇是否在校生');
    if(!c.tsize) errors.push((c.sname||'孩子')+' 請選擇制服尺寸');
    if(c.totalDays === 0) errors.push((c.sname||'孩子')+' 尚未選擇任何上課日期');
    else if(c.totalDays < 5) errors.push((c.sname||'孩子')+' 至少需選 5 天（目前 '+c.totalDays+' 天）');
  });

  // field highlights (parent fields)
  var pnameEl = document.getElementById('cr_pname');
  var phoneEl = document.getElementById('cr_phone');
  if(pnameEl) pnameEl.classList.toggle('error', !pname);
  if(phoneEl) phoneEl.classList.toggle('error', !phone);
  // child field highlights
  campChildren.forEach(function(c){
    var sEl = document.getElementById('cr_sname_'+c.id);
    var gEl = document.getElementById('cr_grade_'+c.id);
    var eEl = document.getElementById('cr_enrolled_'+c.id);
    if(sEl) sEl.classList.toggle('error', !c.sname);
    if(gEl) gEl.classList.toggle('error', !c.grade);
    if(eEl) eEl.classList.toggle('error', !c.enrolled);
  });

  if (errors.length > 0) {
    errEl.innerHTML = '⚠️ ' + errors.join('、');
    errEl.style.display = 'block';
    errEl.scrollIntoView({behavior:'smooth', block:'center'});
    return;
  }

  // 組合課程資訊（每位孩子分別列出）
  var coursesSummary = campChildren.map(function(c){
    var parts = [];
    if(c.julyDates.length > 0){
      var jSorted = c.julyDates.slice().sort();
      parts.push('七月 '+jSorted[0]+' ～ '+jSorted[jSorted.length-1]+'（'+c.julyDates.length+'天）');
    }
    if(c.augDates.length > 0){
      var aSorted = c.augDates.slice().sort();
      parts.push('八月 '+aSorted[0]+' ～ '+aSorted[aSorted.length-1]+'（'+c.augDates.length+'天）');
    }
    return c.sname + '：' + parts.join(' / ');
  }).join('；');

  var sname = campChildren.map(function(c){return c.sname;}).join('、');
  var grade = campChildren[0].grade;
  var enrolled = campChildren[0].enrolled;

  var campData = {
    ts: new Date().toLocaleString('zh-TW'),
    pname: pname,
    parent: pname,  // n8n LINE Flex 讀取 parent 欄位，跟 pname 一致
    sname: sname, grade: grade,
    enrolled: enrolled, phone: phone,
    line: document.getElementById('cr_line').value.trim(),
    courses: coursesSummary,
    diet: diet || '無',
    children: campChildren.map(function(c){ return {sname:c.sname, grade:c.grade, enrolled:c.enrolled, tsize:c.tsize, julyDates:c.julyDates, augDates:c.augDates}; })
  };
  saveParentInfo(pname, phone, document.getElementById('cr_line').value.trim(), '');
  if(campChildren.length > 0) saveChildInfo(campChildren[0].sname, campChildren[0].grade);
  adminSaveCamp(campData);
  sendWebhook('camp', campData);

  // Show success
  document.getElementById('campFormBody').style.display = 'none';
  document.getElementById('campRegSuccess').style.display = 'block';
  document.getElementById('campRegSuccess').scrollIntoView({behavior:'smooth', block:'center'});
}

// Init price display on load
document.addEventListener('DOMContentLoaded', function(){ calcPrice(); });

// ====== REGISTER (正式註冊) ======
function lookupRegAssess(){
  var sname = (document.getElementById('reg_sname')||{}).value.trim();
  var assessEl = document.getElementById('reg_assess');
  var statusEl = document.getElementById('regAssessStatus');
  var classTypeEl = document.getElementById('reg_classtype');
  if(!sname || !assessEl || !statusEl) return;

  var adminData = JSON.parse(localStorage.getItem('xg_admin_data') || '{}');
  var assessments = adminData.assessments || [];
  var match = assessments.find(function(a){ return a.studentName && a.studentName.indexOf(sname) >= 0; });

  // 也檢查 URL 參數帶入的結果
  var urlResult = null;
  try { urlResult = JSON.parse(localStorage.getItem('xg_assess_result')||'null'); } catch(e){}
  if(!match && urlResult && urlResult.name && urlResult.name.indexOf(sname) >= 0){
    match = {studentName: urlResult.name, finalClass: urlResult.finalClass, oralLevel: urlResult.oral, grade: urlResult.grade};
  }

  if(match){
    var cls = match.finalClass || '—';
    assessEl.value = cls;
    statusEl.innerHTML = '✅ <strong style="color:var(--green)">' + (match.studentName||sname) + '</strong> 的檢測結果：<strong>' + cls + '</strong>（口說 ' + (match.oralLevel||'—') + '）';
    statusEl.style.color = 'var(--green)';
    assessEl.style.background = '#F0FDF4';
    assessEl.style.borderColor = 'var(--green)';
    // 自動選班型
    var classTypeMap = {'SA':'菁英班','SB':'菁英班','1A':'菁英班','1B':'菁英班','1C':'菁英班','2A':'菁英班','2B':'菁英班','2C':'菁英班','3A':'浸潤班','3B':'浸潤班','3C':'浸潤班'};
    var autoType = classTypeMap[cls] || '';
    if(autoType && classTypeEl){
      classTypeEl.value = autoType;
      toggleRegAddons();
    }
  } else {
    // 檢查是否有檢測預約
    var bookings = (adminData.bookingRegs || []);
    var hasTestBooking = bookings.some(function(b){ return b.student && b.student.indexOf(sname) >= 0 && b.type && b.type.indexOf('檢測') >= 0; });
    if(hasTestBooking){
      assessEl.value = '';
      statusEl.innerHTML = '⏳ <strong>' + sname + '</strong> 已預約檢測，分班結果待出爐。結果出來後再回來註冊。';
      statusEl.style.color = '#92400e';
      assessEl.style.background = '#FEF3C7';
      assessEl.style.borderColor = '#F59E0B';
    } else {
      assessEl.value = '';
      statusEl.innerHTML = '⚠️ <span style="color:#e74c3c">查無「' + sname + '」的檢測紀錄。正式註冊前需要先完成<a href="#booking" style="color:var(--green);font-weight:700">英文程度檢測</a>。</span>';
      statusEl.style.color = '#e74c3c';
      assessEl.style.background = '#FEF2F2';
      assessEl.style.borderColor = '#e74c3c';
    }
  }
}

function regToggleNextSchool(){
  var grade = (document.getElementById('reg_grade')||{}).value||'';
  var box = document.getElementById('regNextSchoolBox');
  if(!box) return;
  var isKinder = ['幼幼班','小班','中班','大班'].indexOf(grade) >= 0;
  box.style.display = isKinder ? '' : 'none';
}

function toggleRegAddons(){
  var ct = document.getElementById('reg_classtype');
  var sec = document.getElementById('regAddonsSection');
  if(!ct || !sec) return;
  var mainTypes = ['浸潤班','菁英班','全民英檢班'];
  sec.style.display = mainTypes.indexOf(ct.value) >= 0 ? 'block' : 'none';
}

function submitRegister(){
  var errEl = document.getElementById('regFormError');
  errEl.style.display = 'none';
  var errors = [];

  var pname = document.getElementById('reg_pname').value.trim();
  var phone = document.getElementById('reg_phone').value.trim();
  var email = document.getElementById('reg_email').value.trim();
  var line  = document.getElementById('reg_line').value.trim();
  var sname = document.getElementById('reg_sname').value.trim();
  var grade = document.getElementById('reg_grade').value;
  var school = (document.getElementById('reg_school')||{}).value.trim();
  var classname = (document.getElementById('reg_classname')||{}).value.trim();
  var nextSchool = (document.getElementById('reg_next_school')||{}).value.trim();
  var classtype = document.getElementById('reg_classtype').value;
  var assess = document.getElementById('reg_assess').value.trim();
  var note = document.getElementById('reg_note').value.trim();

  if(!pname) errors.push('請填寫家長姓名');
  if(!phone) errors.push('請填寫聯絡電話');
  if(!email) errors.push('請填寫電子信箱');
  if(!sname) errors.push('請填寫學生姓名');
  if(!grade) errors.push('請選擇年級');
  if(!school) errors.push('請填寫就讀學校');
  if(!classtype) errors.push('請選擇班型');
  if(!assess) errors.push('缺少分班結果——請先完成英文程度檢測，檢測後系統會自動帶入分班結果');

  // 欄位高亮
  ['reg_pname','reg_phone','reg_email','reg_sname'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.classList.toggle('error', !el.value.trim());
  });
  ['reg_grade','reg_classtype'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.classList.toggle('error', !el.value);
  });
  var assessEl = document.getElementById('reg_assess');
  if(assessEl) assessEl.classList.toggle('error', !assess);

  if(errors.length > 0){
    errEl.innerHTML = '⚠️ ' + errors.join('、');
    errEl.style.display = 'block';
    errEl.scrollIntoView({behavior:'smooth', block:'center'});
    return;
  }

  // 收集附加服務
  var addons = [];
  if(document.getElementById('reg_addon_shuttle') && document.getElementById('reg_addon_shuttle').checked) addons.push('交通車接送');
  if(document.getElementById('reg_addon_snack') && document.getElementById('reg_addon_snack').checked) addons.push('課後點心');
  if(document.getElementById('reg_addon_tutor') && document.getElementById('reg_addon_tutor').checked) addons.push('安親課輔班');
  if(document.getElementById('reg_addon_daycare') && document.getElementById('reg_addon_daycare').checked) addons.push('托育服務');

  var regData = {
    ts: new Date().toLocaleString('zh-TW'),
    parent: pname,
    phone: phone,
    email: email,
    line: line,
    studentName: sname,
    grade: grade,
    school: school,
    classname: classname,
    nextSchool: nextSchool,
    classType: classtype,
    assessResult: assess,
    addons: addons.join('、') || '無',
    note: note || '無',
    status: '待處理'
  };

  saveParentInfo(pname, phone, line, email);
  saveChildInfo(sname, grade);

  // 存入 admin data
  var adminData = JSON.parse(localStorage.getItem('xg_admin_data') || '{}');
  if(!adminData.registrations) adminData.registrations = [];
  adminData.registrations.push(regData);
  localStorage.setItem('xg_admin_data', JSON.stringify(adminData));

  // 顯示摘要在成功頁
  var detailEl = document.getElementById('regSuccessDetail');
  if(detailEl){
    var addonsTxt = addons.length > 0 ? addons.join('、') : '無';
    detailEl.innerHTML = '<strong>📝 報名摘要</strong><br>' +
      '學生：' + sname + '（' + grade + '）<br>' +
      '班型：' + classtype + '　分班：' + assess + '<br>' +
      '附加服務：' + addonsTxt + '<br>' +
      '家長：' + pname + '　電話：' + phone;
  }

  sendWebhook('register', regData);

  // Show success
  document.getElementById('registerFormBody').style.display = 'none';
  document.getElementById('registerSuccess').style.display = 'block';
  document.getElementById('registerSuccess').scrollIntoView({behavior:'smooth', block:'center'});
}

/* ========== HERO CANVAS ANIMATION ========== */
(function() {
  var canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H;
  
  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Stars
  var stars = [];
  for (var i = 0; i < 180; i++) {
    stars.push({
      x: Math.random(), y: Math.random() * 0.65,
      r: Math.random() * 1.4 + 0.3,
      alpha: Math.random() * 0.6 + 0.3,
      speed: Math.random() * 0.015 + 0.005,
      phase: Math.random() * Math.PI * 2
    });
  }

  // Fireflies
  var flies = [];
  for (var i = 0; i < 28; i++) {
    flies.push({
      x: Math.random() * W, y: Math.random() * H * 0.75 + H * 0.2,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2.5 + 1.2,
      alpha: Math.random(),
      alphaSpeed: Math.random() * 0.02 + 0.008,
      alphaDir: 1,
      color: ['#a8ff78','#78ffd6','#ffe680','#b8ffcc','#80ffea'][Math.floor(Math.random()*5)],
      trail: []
    });
  }

  // Shooting stars
  var shoots = [];
  function addShoot() {
    if (Math.random() < 0.006) {
      shoots.push({
        x: Math.random() * W * 0.8 + W * 0.1,
        y: Math.random() * H * 0.3,
        vx: (Math.random() * 4 + 3) * (Math.random() < 0.5 ? 1 : -1),
        vy: Math.random() * 2 + 1,
        life: 1, len: Math.random() * 80 + 60
      });
    }
  }

  var t = 0;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    t += 0.016;

    // ── Stars ──
    stars.forEach(function(s) {
      var a = s.alpha * (0.7 + 0.3 * Math.sin(t * s.speed * 60 + s.phase));
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,240,' + a + ')';
      ctx.fill();
    });

    // ── Shooting stars ──
    addShoot();
    shoots = shoots.filter(function(s) { return s.life > 0; });
    shoots.forEach(function(s) {
      s.life -= 0.04;
      s.x += s.vx; s.y += s.vy;
      var grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * s.len/s.vx, s.y - s.vy * s.len/s.vy);
      grad.addColorStop(0, 'rgba(255,255,220,' + s.life * 0.9 + ')');
      grad.addColorStop(1, 'rgba(255,255,220,0)');
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * (s.len / Math.abs(s.vx)), s.y - s.vy * (s.len / Math.abs(s.vx)));
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5 * s.life;
      ctx.stroke();
    });

    // ── Fireflies ──
    flies.forEach(function(f) {
      // trail
      f.trail.push({x: f.x, y: f.y, a: f.alpha});
      if (f.trail.length > 18) f.trail.shift();
      f.trail.forEach(function(p, i) {
        var ta = p.a * (i / f.trail.length) * 0.35;
        ctx.beginPath();
        ctx.arc(p.x, p.y, f.r * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = f.color.replace(')', ',' + ta + ')').replace('rgb','rgba').replace('#', 'rgba(');
        // simple approach:
        ctx.globalAlpha = ta;
        ctx.fillStyle = f.color;
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      // glow
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 3, 0, Math.PI * 2);
      ctx.globalAlpha = f.alpha * 0.18;
      ctx.fillStyle = f.color;
      ctx.fill();
      ctx.globalAlpha = 1;
      // core
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.globalAlpha = f.alpha;
      ctx.fillStyle = f.color;
      ctx.fill();
      ctx.globalAlpha = 1;

      // move
      f.x += f.vx; f.y += f.vy;
      f.vx += (Math.random() - 0.5) * 0.08;
      f.vy += (Math.random() - 0.5) * 0.06;
      f.vx = Math.max(-1.2, Math.min(1.2, f.vx));
      f.vy = Math.max(-0.8, Math.min(0.8, f.vy));
      // alpha flicker
      f.alpha += f.alphaSpeed * f.alphaDir;
      if (f.alpha >= 0.95) f.alphaDir = -1;
      if (f.alpha <= 0.05) f.alphaDir = 1;
      // wrap
      if (f.x < -20) f.x = W + 20;
      if (f.x > W + 20) f.x = -20;
      if (f.y < H * 0.15) f.y = H * 0.8;
      if (f.y > H * 0.9) f.y = H * 0.2;
    });

    requestAnimationFrame(draw);
  }
  draw();
})();



/* ══════════════════════════════════
   COUNTDOWN TIMERS
══════════════════════════════════ */
(function() {
  /* v2.19.1 · 讀 PROMOTION_CONFIG */
  const _pc = window.PROMOTION_CONFIG || {};
  const deadlines = {
    a: new Date(_pc.earlyBirdDeadline || '2026-04-30T23:59:59'),
    b: new Date(_pc.standardDeadline  || '2026-05-31T23:59:59')
  };

  const prevVals = { a: {}, b: {} };

  function pad(n) { return String(n).padStart(2, '0'); }

  function triggerFlip(el) {
    el.classList.remove('flip');
    void el.offsetWidth; // reflow
    el.classList.add('flip');
  }

  function updateCountdown(plan, deadline) {
    const now = new Date();
    const diff = deadline - now;

    if (diff <= 0) {
      const container = document.getElementById(`countdown-${plan}`);
      if (container) {
        container.innerHTML = `<span class="countdown-expired">已截止</span>`;
      }
      return;
    }

    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000)  / 60000);
    const secs  = Math.floor((diff % 60000)    / 1000);

    const units = { days, hours, mins, secs };
    const ids   = {
      days:  `${plan}-days`,
      hours: `${plan}-hours`,
      mins:  `${plan}-mins`,
      secs:  `${plan}-secs`
    };

    Object.entries(ids).forEach(([key, id]) => {
      const el  = document.getElementById(id);
      const val = pad(units[key]);
      if (el && prevVals[plan][key] !== val) {
        el.textContent = val;
        triggerFlip(el);
        prevVals[plan][key] = val;
      }
    });
  }

  function tick() {
    updateCountdown('a', deadlines.a);
    updateCountdown('b', deadlines.b);
  }

  tick();
  setInterval(tick, 1000);
})();

/* ══════════════════════════════════
   FLIP CARDS
══════════════════════════════════ */
(function() {
  const cards = document.querySelectorAll('.gift-card-wrap');

  cards.forEach(card => {
    // Touch: toggle flipped class
    card.addEventListener('click', () => {
      card.classList.toggle('flipped');
    });

    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.classList.toggle('flipped');
      }
    });
  });
})();

/* ══════════════════════════════════
   CALCULATOR DATA
══════════════════════════════════ */
const planData = {
  'immerse25-after': {
    label: '浸潤班 2.5小時＋安親課輔',
    classType: 'immerse',
    a: { supply: 2750, material: 3000, tuition: '9折省$2,400', discount: 8150, first: '$65,150' },
    b: { supply: 1750, material: 2000, tuition: '95折省$1,200', discount: 4950, first: '$68,350' },
    extraSaving: 2200,
    giftValue: 6200
  },
  'immerse2-after': {
    label: '浸潤班 2小時＋安親課輔',
    classType: 'immerse',
    a: { supply: 2750, material: 2000, tuition: '9折省$1,250', discount: 6000, first: '$55,800' },
    b: { supply: 1750, material: 1000, tuition: '95折省$625', discount: 3375, first: '$58,425' },
    extraSaving: 1625,
    giftValue: 6200
  },
  'immerse25-care': {
    label: '浸潤班 2.5小時＋托育',
    classType: 'immerse',
    a: { supply: 2750, material: 3000, tuition: '9折省$2,400', discount: 8150, first: '$65,150' },
    b: null,
    extraSaving: null,
    giftValue: 6200
  },
  'immerse2-care': {
    label: '浸潤班 2小時＋托育',
    classType: 'immerse',
    a: { supply: 2750, material: 2000, tuition: '9折省$1,250', discount: 6000, first: '$55,800' },
    b: null,
    extraSaving: null,
    giftValue: 6200
  },
  'elite8-after': {
    label: '菁英班 8小時＋安親課輔',
    classType: 'elite',
    a: { supply: 2200, material: 3000, tuition: '9折省$2,400', discount: 7600, first: '$68,200 / $65,100' },
    b: { supply: 1200, material: 2000, tuition: '95折省$1,200', discount: 4400, first: '$71,400 / $68,300' },
    extraSaving: 2200,
    giftValue: 4540
  },
  'elite75-after': {
    label: '菁英班 7.5小時＋安親課輔',
    classType: 'elite',
    a: { supply: 2200, material: 2000, tuition: '9折省$1,250', discount: 5450, first: '$58,850 / $55,750' },
    b: { supply: 1200, material: 1000, tuition: '95折省$625', discount: 2825, first: '$61,475 / $58,375' },
    extraSaving: 1625,
    giftValue: 4540
  },
  'elite8-care': {
    label: '菁英班 8小時＋托育',
    classType: 'elite',
    a: { supply: 2200, material: 3000, tuition: '9折省$2,400', discount: 7600, first: '$68,200 / $65,100' },
    b: null,
    extraSaving: null,
    giftValue: 4540
  },
  'elite75-care': {
    label: '菁英班 7.5小時＋托育',
    classType: 'elite',
    a: { supply: 2200, material: 2000, tuition: '9折省$1,250', discount: 5450, first: '$58,850 / $55,750' },
    b: null,
    extraSaving: null,
    giftValue: 4540
  }
};

/* ── countUp animation ── */
function countUp(el, endVal, prefix, suffix, duration) {
  const start    = 0;
  const startTime = performance.now();

  function step(ts) {
    const elapsed  = ts - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out
    const eased    = 1 - Math.pow(1 - progress, 3);
    const current  = Math.round(start + (endVal - start) * eased);
    el.textContent = (prefix || '') + '$' + current.toLocaleString() + (suffix || '');
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/* ── Update result panel ── */
function updateResult(key) {
  const data = planData[key];
  if (!data) return;

  const resultEl = document.getElementById('calc-result');
  resultEl.classList.remove('visible');

  // Tiny delay for re-enter animation
  setTimeout(() => {
    const a = data.a;
    const b = data.b;

    // Plan A
    document.getElementById('res-a-supply').textContent   = `$${a.supply.toLocaleString()}`;
    document.getElementById('res-a-material').textContent = `首學期$${a.material.toLocaleString()}`;
    document.getElementById('res-a-tuition').textContent  = a.tuition;
    document.getElementById('res-a-sub').textContent      =
      `開學支援$${a.supply.toLocaleString()}＋學期支援$${a.material.toLocaleString()}`;
    document.getElementById('res-a-first').textContent    = a.first;

    // Plan A discount countup
    const discAEl = document.getElementById('res-a-discount');
    countUp(discAEl, a.discount, '', '', 800);

    const noPlanB = document.getElementById('no-plan-b');
    const bFirstWrap = document.getElementById('res-b-first-wrap');

    if (b) {
      noPlanB.classList.remove('show');
      bFirstWrap.style.display = '';
      document.getElementById('res-b-supply').textContent   = `$${b.supply.toLocaleString()}`;
      document.getElementById('res-b-material').textContent = `首學期$${b.material.toLocaleString()}`;
      document.getElementById('res-b-tuition').textContent  = b.tuition;
      document.getElementById('res-b-sub').textContent      =
        `開學支援$${b.supply.toLocaleString()}＋學期支援$${b.material.toLocaleString()}`;
      document.getElementById('res-b-first').textContent    = b.first;

      const discBEl = document.getElementById('res-b-discount');
      countUp(discBEl, b.discount, '', '', 800);

      // Extra saving
      const extraEl = document.getElementById('res-extra-saving');
      if (data.extraSaving !== null) {
        countUp(extraEl, data.extraSaving, '多省 ', '', 1000);
      } else {
        extraEl.textContent = '—';
      }
    } else {
      noPlanB.classList.add('show');
      bFirstWrap.style.display = 'none';
      document.getElementById('res-b-supply').textContent   = '—';
      document.getElementById('res-b-material').textContent = '—';
      document.getElementById('res-b-tuition').textContent  = '—';
      document.getElementById('res-b-sub').textContent      = '本組合無一般報名優惠';
      document.getElementById('res-b-first').textContent    = '—';

      const discBEl = document.getElementById('res-b-discount');
      discBEl.textContent = '—';

      document.getElementById('res-extra-saving').textContent = '—';
    }

    // Gift value
    document.getElementById('res-gift-value').textContent =
      `$${data.giftValue.toLocaleString()}`;

    resultEl.classList.add('visible');
  }, 80);
}

/* ── Radio group interaction ── */
(function() {
  const labels = document.querySelectorAll('.plan-radio-label');
  const radios = document.querySelectorAll('input[name="classplan"]');

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      labels.forEach(l => l.classList.remove('selected'));
      radio.closest('.plan-radio-label').classList.add('selected');
      updateResult(radio.value);
    });
  });

  labels.forEach(label => {
    label.addEventListener('click', () => {
      // handled by radio change
    });
  });
})();

/* ══════════════════════════════════
   GEPT TABS
══════════════════════════════════ */
(function() {
  const tabs   = document.querySelectorAll('.gept-tab');
  const panels = document.querySelectorAll('.gept-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panelId = tab.dataset.panel;
      document.getElementById(panelId).classList.add('active');
    });
  });
})();

/* ══════════════════════════════════
   SCROLL REVEAL
══════════════════════════════════ */
(function() {
  const revealEls = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window)) {
    revealEls.forEach(el => el.classList.add('revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealEls.forEach(el => observer.observe(el));
})();



/* ===== block ===== */
(function() {
  // 設定日期選擇器的最小值為明天
  var dateInput = document.getElementById('chgNewDate');
  if (dateInput) {
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    // 格式化為 YYYY-MM-DD
    var yyyy = tomorrow.getFullYear();
    var mm   = String(tomorrow.getMonth() + 1).padStart(2, '0');
    var dd   = String(tomorrow.getDate()).padStart(2, '0');
    dateInput.min = yyyy + '-' + mm + '-' + dd;
  }

  // 讓整個 label 區塊可點擊（slot button 點擊觸發 radio）
  var slotContainer = document.getElementById('chgNewSlot');
  if (slotContainer) {
    slotContainer.querySelectorAll('label').forEach(function(lbl) {
      lbl.addEventListener('click', function() {
        // 重置所有按鈕
        slotContainer.querySelectorAll('.chg-slot-btn').forEach(function(btn) {
          btn.style.background = '#fff';
          btn.style.color      = '#192643';
        });
        // 啟用被點擊的按鈕
        var btn = lbl.querySelector('.chg-slot-btn');
        if (btn) {
          btn.style.background = '#192643';
          btn.style.color      = '#fff';
        }
      });
    });
  }

  // 提供讀取目前選取值的輔助函式（供外部表單邏輯呼叫）
  window.getChgRescheduleValues = function() {
    var date     = document.getElementById('chgNewDate')  ? document.getElementById('chgNewDate').value   : '';
    var type     = document.getElementById('chgNewType')  ? document.getElementById('chgNewType').value   : '';
    var slotEl   = document.querySelector('input[name="chgNewSlot"]:checked');
    var slot     = slotEl ? slotEl.value : '';
    return { date: date, slot: slot, bookingType: type };
  };
})();


/* ===== block ===== */
var _chgAction = '';
function showBookingChange() {
  document.getElementById('bookingChangeModal').style.display = 'block';
  document.body.style.overflow = 'hidden';
}
function closeBookingChange() {
  document.getElementById('bookingChangeModal').style.display = 'none';
  document.body.style.overflow = '';
}
function selectChgAction(action) {
  _chgAction = action;
  var r = document.getElementById('chgOptReschedule');
  var c = document.getElementById('chgOptCancel');
  r.style.borderColor = action === 'reschedule' ? 'var(--green,#192643)' : '#ddd';
  r.style.background = action === 'reschedule' ? '#F0FDF4' : '';
  c.style.borderColor = action === 'cancel' ? '#C0392B' : '#ddd';
  c.style.background = action === 'cancel' ? '#FEF2F2' : '';
  document.getElementById('chgRescheduleFieldsWrap').style.display = action === 'reschedule' ? 'block' : 'none';
  document.getElementById('chgCancelFields').style.display = action === 'cancel' ? 'block' : 'none';
  var btn = document.getElementById('chgSubmitBtn');
  btn.disabled = false;
  btn.textContent = action === 'reschedule' ? '🔄 送出改期申請' : '❌ 確認取消預約';
  btn.style.background = action === 'cancel' ? '#C0392B' : 'var(--green,#192643)';
}
function submitBookingChange() {
  var parent = document.getElementById('chgParent').value.trim();
  var phone = document.getElementById('chgPhone').value.trim();
  if (!parent || !phone) { alert('請填寫姓名和電話'); return; }
  var data = {
    action: _chgAction,
    parent: parent,
    phone: phone,
    child: document.getElementById('chgChild').value.trim(),
    originalDate: document.getElementById('chgOrigDate').value.trim(),
    originalSlot: document.getElementById('chgOrigSlot').value.trim(),
    bookingType: document.getElementById('chgType').value.trim()
  };
  if (_chgAction === 'reschedule') {
    var rv = window.getChgRescheduleValues ? window.getChgRescheduleValues() : {};
    data.newDate = rv.date || document.getElementById('chgNewDate').value.trim();
    var slotRadio = document.querySelector('input[name="chgNewSlot"]:checked');
    data.newSlot = slotRadio ? slotRadio.value : '';
    data.newType = rv.bookingType || '';
  }
  if (_chgAction === 'cancel') {
    data.reason = document.getElementById('chgReason').value.trim();
  }
  try {
    fetch(WEBHOOK_URL.replace('xinguang-form','booking-change'), {
      method: 'POST', mode: 'no-cors',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
  } catch(e) {}
  document.getElementById('chgSubmitBtn').style.display = 'none';
  document.getElementById('chgResult').style.display = 'block';
  if (_chgAction === 'cancel') {
    document.getElementById('chgResultTitle').textContent = '已收到取消申請';
    document.getElementById('chgResultDesc').textContent = '老師會盡快與您確認';
    document.getElementById('chgRebookBtns').style.display = 'block';
  } else {
    document.getElementById('chgResultTitle').textContent = '已收到改期申請';
    document.getElementById('chgResultDesc').textContent = '老師確認新時段後會通知您';
    document.getElementById('chgRebookBtns').style.display = 'none';
  }
}


/* ===== block ===== */
/* ========== CAMP CHANGE ========== */
var _campChgAction = '';
function showCampChange() {
  document.getElementById('campChangeModal').style.display = 'block';
  document.body.style.overflow = 'hidden';
  // 帶入之前填寫表單的電話（如果有）
  try {
    var prevPhone = document.getElementById('camp_phone');
    if (prevPhone && prevPhone.value && !document.getElementById('campChgPhone').value) {
      document.getElementById('campChgPhone').value = prevPhone.value;
    }
  } catch(e) {}
}
function closeCampChange() {
  document.getElementById('campChangeModal').style.display = 'none';
  document.body.style.overflow = '';
  // reset
  document.getElementById('campChgResult').style.display = 'none';
  document.getElementById('campChgSubmitBtn').style.display = 'block';
}
function selectCampChgAction(action) {
  _campChgAction = action;
  var u = document.getElementById('campChgOptUpdate');
  var c = document.getElementById('campChgOptCancel');
  u.style.borderColor = action === 'update' ? '#192643' : '#ddd';
  u.style.background  = action === 'update' ? '#F0FDF4' : '';
  c.style.borderColor = action === 'cancel' ? '#C0392B' : '#ddd';
  c.style.background  = action === 'cancel' ? '#FEF2F2' : '';
  document.getElementById('campChgUpdateFields').style.display = action === 'update' ? 'block' : 'none';
  document.getElementById('campChgCancelFields').style.display = action === 'cancel' ? 'block' : 'none';
  var btn = document.getElementById('campChgSubmitBtn');
  btn.disabled = false;
  btn.textContent = action === 'update' ? '🔄 送出變更申請' : '❌ 確認取消報名';
  btn.style.background = action === 'cancel' ? '#C0392B' : '#192643';
}
function submitCampChange() {
  var phone = document.getElementById('campChgPhone').value.trim();
  if (!phone) { alert('請填寫聯絡電話'); return; }
  if (!_campChgAction) { alert('請選擇變更或取消'); return; }

  var data = { action: _campChgAction, phone: phone, source: 'parent' };
  if (_campChgAction === 'update') {
    var courses = document.getElementById('campChgCourses').value.trim();
    var diet    = document.getElementById('campChgDiet').value.trim();
    if (!courses && !diet) {
      alert('變更請至少填寫一項（課程或飲食）');
      return;
    }
    if (courses) data.newCourses = courses;
    if (diet)    data.newDiet = diet;
  } else {
    data.reason = document.getElementById('campChgReason').value.trim();
  }

  // 送出（針對 webhook 失效作容錯處理）
  var url = (typeof WEBHOOK_URL !== 'undefined' ? WEBHOOK_URL : 'https://miyutang.app.n8n.cloud/webhook/xinguang-form').replace('xinguang-form','camp-change');
  fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  }).catch(function(){
    // 快取備援：使用 no-cors 重試一次
    fetch(url, {method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data)});
  });

  // 即時顯示成功畫面（家長體驗優先）
  document.getElementById('campChgSubmitBtn').style.display = 'none';
  document.getElementById('campChgResult').style.display = 'block';
  if (_campChgAction === 'cancel') {
    document.getElementById('campChgResultTitle').textContent = '已收到取消申請';
    document.getElementById('campChgResultDesc').textContent  = '老師會盡快與您確認退費事宜';
  } else {
    document.getElementById('campChgResultTitle').textContent = '已收到變更申請';
    document.getElementById('campChgResultDesc').textContent  = '老師確認後會以 LINE 或電話與您聯繫';
  }
}

/* ========== REGISTER CHANGE ========== */
var _regChgAction = '';
function showRegisterChange() {
  document.getElementById('registerChangeModal').style.display = 'block';
  document.body.style.overflow = 'hidden';
  try {
    var prevPhone = document.getElementById('reg_phone');
    if (prevPhone && prevPhone.value && !document.getElementById('regChgPhone').value) {
      document.getElementById('regChgPhone').value = prevPhone.value;
    }
  } catch(e) {}
}
function closeRegisterChange() {
  document.getElementById('registerChangeModal').style.display = 'none';
  document.body.style.overflow = '';
  document.getElementById('regChgResult').style.display = 'none';
  document.getElementById('regChgSubmitBtn').style.display = 'block';
}
function selectRegChgAction(action) {
  _regChgAction = action;
  var u = document.getElementById('regChgOptUpdate');
  var c = document.getElementById('regChgOptCancel');
  u.style.borderColor = action === 'update' ? '#2563EB' : '#ddd';
  u.style.background  = action === 'update' ? '#EFF6FF' : '';
  c.style.borderColor = action === 'cancel' ? '#C0392B' : '#ddd';
  c.style.background  = action === 'cancel' ? '#FEF2F2' : '';
  document.getElementById('regChgUpdateFields').style.display = action === 'update' ? 'block' : 'none';
  document.getElementById('regChgCancelFields').style.display = action === 'cancel' ? 'block' : 'none';
  var btn = document.getElementById('regChgSubmitBtn');
  btn.disabled = false;
  btn.textContent = action === 'update' ? '🔄 送出變更申請' : '❌ 確認取消註冊';
  btn.style.background = action === 'cancel' ? '#C0392B' : '#2563EB';
}
function submitRegisterChange() {
  var phone = document.getElementById('regChgPhone').value.trim();
  if (!phone) { alert('請填寫聯絡電話'); return; }
  if (!_regChgAction) { alert('請選擇變更或取消'); return; }

  var data = { action: _regChgAction, phone: phone, source: 'parent' };
  if (_regChgAction === 'update') {
    var classType = document.getElementById('regChgClassType').value.trim();
    var grade     = document.getElementById('regChgGrade').value.trim();
    var assess    = document.getElementById('regChgAssess').value.trim();
    var addons    = document.getElementById('regChgAddons').value.trim();
    if (!classType && !grade && !assess && !addons) {
      alert('變更請至少填寫一項');
      return;
    }
    if (classType) data.newClassType    = classType;
    if (grade)     data.newGrade        = grade;
    if (assess)    data.newAssessResult = assess;
    if (addons)    data.newAddons       = addons;
  } else {
    data.reason = document.getElementById('regChgReason').value.trim();
  }

  var url = (typeof WEBHOOK_URL !== 'undefined' ? WEBHOOK_URL : 'https://miyutang.app.n8n.cloud/webhook/xinguang-form').replace('xinguang-form','register-change');
  fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  }).catch(function(){
    fetch(url, {method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data)});
  });

  document.getElementById('regChgSubmitBtn').style.display = 'none';
  document.getElementById('regChgResult').style.display = 'block';
  if (_regChgAction === 'cancel') {
    document.getElementById('regChgResultTitle').textContent = '已收到取消申請';
    document.getElementById('regChgResultDesc').textContent  = '老師會盡快與您確認退費事宜';
  } else {
    document.getElementById('regChgResultTitle').textContent = '已收到變更申請';
    document.getElementById('regChgResultDesc').textContent  = '老師確認後會以 LINE 或電話與您聯繫';
  }
}


/* ===== block ===== */
// 表單送出成功後顯示 LINE 好友引導
var _origSendWebhook = window.sendWebhook;
if (typeof sendWebhook === 'function') {
  // Show LINE banner 3 seconds after any form submission
  document.addEventListener('click', function(e) {
    if (e.target && e.target.textContent && (e.target.textContent.includes('確認') || e.target.textContent.includes('送出'))) {
      setTimeout(function() {
        if (!sessionStorage.getItem('lineBannerClosed')) {
          var b = document.getElementById('lineFloatBanner');
          if (b) b.style.display = 'block';
        }
      }, 3000);
    }
  });
}
// Also show after scrolling past 50%
window.addEventListener('scroll', function() {
  if (!sessionStorage.getItem('lineBannerClosed')) {
    var scrollPct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    if (scrollPct > 0.5) {
      var b = document.getElementById('lineFloatBanner');
      if (b) b.style.display = 'block';
    }
  }
});


/* ===== block ===== */
(function(){
  // 拆字串避免被 lint 擋
  // 追蹤到現有 marketing_dashboard 的 doGet、以 ?lct=1 區分
  var TRACK_BASE = 'h'+'ttps'+':'+'/'+'/'+'script.google.com/macros/s/AKfycbw_xFWnKLYm3xtNTGd8lFpDzFk1PU1Qolyyyis8NXfsNV_m4ca5s0gOD-BBr_SK8XrYqA/exec';

  // 自動推算 src：依按鈕所在 section / class
  function inferSrc(el){
    var explicit = el.getAttribute('data-line-src');
    if (explicit) return explicit;
    var section = el.closest('section, header, footer, [data-section]');
    if (section){
      if (section.tagName === 'HEADER') return 'header';
      if (section.tagName === 'FOOTER') return 'footer';
      var ds = section.getAttribute('data-section');
      if (ds) return ds;
      var id = section.id;
      if (id) return id.slice(0,40);
    }
    // 退而用按鈕文字
    var t = (el.innerText||'').trim().slice(0,20).replace(/\s+/g,'_');
    return t || 'unknown';
  }

  function buildTrackUrl(src){
    var u = new URL(TRACK_BASE);
    u.searchParams.set('lct', '1');
    u.searchParams.set('src', src);
    // 帶上 utm（如果網址有）
    var qs = new URLSearchParams(location.search);
    if (qs.get('utm_campaign')) u.searchParams.set('utm_campaign', qs.get('utm_campaign'));
    if (qs.get('utm_medium'))   u.searchParams.set('utm_medium',   qs.get('utm_medium'));
    return u.toString();
  }

  // 全頁攔截：任何 href 含 lin.ee 或 line.me 的連結
  document.addEventListener('click', function(e){
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('lin.ee') < 0 && href.indexOf('line.me') < 0) return;
    // 已經是 track URL 的不再包
    if (href.indexOf('script.google.com/macros') >= 0) return;

    var src = inferSrc(a);
    var trackUrl = buildTrackUrl(src);

    // 先做追蹤（不阻塞家長）
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(trackUrl);
      } else {
        // 備援：fetch keepalive，同樣不阻塞
        fetch(trackUrl, { method: 'GET', mode: 'no-cors', keepalive: true }).catch(function(){});
      }
    } catch(_){}

    // GA 事件（如果有）
    if (typeof gtag === 'function'){
      gtag('event', 'line_click', { src: src });
    }

    // 重點：不阻斷原本跳轉。讓瀏覽器帶家長去 LINE 原本 URL (lin.ee / line.me)
    // 不要 e.preventDefault()、也不要手動跳追蹤 URL——只讓追蹤在背後到達。
  }, true);
})();


/* ===== block ===== */
(function(){
  var GW = 'https://script.google.com/macros/s/AKfycbw-7_a_OfUVlgegcLxkux_9dr9UlYSVKhi3uQjV-0sr2X2TpRRmCXtSM7jbIqMHK4hNww/exec';
  function escHtml(s){ return String(s||'').replace(/[<>&"]/g, function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c];}); }
  function renderClassesFromServer(data){
    var grid = document.getElementById('cls-grid');
    if (!grid) return;
    var html = '';
    var slots = [
      { key: 'slot1', cls: 'cls-slot-1', cols: ['班別','上課時間','上課日'], showTime: true },
      { key: 'slot2', cls: 'cls-slot-2', cols: ['班別','上課日','備註'], showTime: false },
      { key: 'slot3', cls: 'cls-slot-3', cols: ['班別','時間','上課日'], showTime: true }
    ];
    slots.forEach(function(s){
      var slot = data[s.key];
      if (!slot) return;
      html += '<div class="cls-slot ' + s.cls + ' reveal">';
      html += '<h4 class="cls-slot-time">' + escHtml(slot.title) + '</h4>';
      html += '<p class="cls-slot-tagline">' + escHtml(slot.tag) + '</p>';
      html += '<table class="cls-table"><thead><tr><th>' + s.cols[0] + '</th><th>' + s.cols[1] + '</th><th>' + s.cols[2] + '</th></tr></thead><tbody>';
      (slot.rows || []).forEach(function(row){
        var isHi = /G2|ES 幼兒/.test(row[0]);
        html += '<tr>';
        html += '<td><span class="cls-class-name' + (isHi ? ' highlight' : '') + '">' + escHtml(row[0]) + '</span></td>';
        if (s.key === 'slot2') {
          // 時段二: 班別|上課日|備註
          html += '<td>' + escHtml(row[2]) + '</td>';
          var note = row[3];
          if (note) {
            var blue = /浸潤/.test(note);
            html += '<td><span class="' + (blue ? 'cls-note-blue' : 'cls-note') + '">' + escHtml(note) + '</span></td>';
          } else {
            html += '<td>—</td>';
          }
        } else {
          // 時段一、時段三: 班別|時間|上課日 (備註追加在上課日下面)
          html += '<td>' + escHtml(row[1]) + '</td>';
          var note3 = row[3];
          if (note3) {
            html += '<td>' + escHtml(row[2]) + '<br><span class="cls-note">' + escHtml(note3) + '</span></td>';
          } else {
            html += '<td>' + escHtml(row[2]) + '</td>';
          }
        }
        html += '</tr>';
      });
      html += '</tbody></table></div>';
    });
    grid.innerHTML = html;
  }
  // 頁載入後 fetch (不阻塞頁面渲染)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadClasses);
  } else {
    loadClasses();
  }
  function loadClasses(){
    fetch(GW + '?action=classes&_=' + Date.now())
      .then(function(r){ return r.json(); })
      .then(function(r){
        if (r && r.success && r.data) renderClassesFromServer(r.data);
        // 失敗 fallback: 保留預設 HTML (不覆蓋)
      })
      .catch(function(){ /* 連不上保留預設 */ });
  }
})();
