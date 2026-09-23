'use strict';
const GW_URL = 'https://script.google.com/macros/s/AKfycbw-7_a_OfUVlgegcLxkux_9dr9UlYSVKhi3uQjV-0sr2X2TpRRmCXtSM7jbIqMHK4hNww/exec';
const LIFF_ID = '2009757754-paHJ5QJO';
const $ = id => document.getElementById(id);
const serviceNames = ['取消接送','美語請假','安親請假','托育請假'];
let kids=[], records=[], today='', editRecord=null, pending=null, busy=false, initialized=false, lastRequest='';
let unresolved=false;
function savedRequest() {try {return JSON.parse(sessionStorage.getItem('parent-center-pending')||'null');}catch(e){return null;}}
function persistRequest(value) {try {if(value)sessionStorage.setItem('parent-center-pending',JSON.stringify(value));else sessionStorage.removeItem('parent-center-pending');}catch(e){}}
function text(tag, content, cls) {const el=document.createElement(tag);el.textContent=content;if(cls)el.className=cls;return el;}
function showError(id,message) {$(id).textContent=message;$(id).hidden=!message;}
function mask() {return [...document.querySelectorAll('input[name=service]:checked')].reduce((m,x)=>m|Number(x.value),0);}
function names(m) {return serviceNames.filter((_,i)=>m&(1<<i)).join('、');}
function legacyMask(type) {return /^services_/.test(type)?Number(type.slice(9)):({pickup_only:1,pickup_eng:3,pickup_eng_daycare:7,pickup_eng_nursery:11,all:15}[type]||0);}
function requestId() {return crypto.randomUUID().replaceAll('-','');}
async function api(action,data={}) {
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),35000);
  try {
    const token=window.liff?.getAccessToken();
    const response=await fetch(GW_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({...data,_action:action,accessToken:token}),signal:controller.signal,redirect:'follow'});
    if(!response.ok)throw Error('連線暫時不穩定，請稍後重試。');
    const result=await response.json();
    if(!result.success){const error=Error(result.error||'後端尚未更新或暫時無法處理，請聯絡校方。');error.safeToEdit=result.safeToEdit===true;throw error;}
    return result;
  } catch(e) {
    if(e.name==='AbortError')throw Error('連線超時。若已按送出，請按「重試同一請求」，避免重複建立。');
    if(e instanceof TypeError)throw Error('網路連線中斷。若已送出，請重試同一請求，系統會核對原編號。');
    if(e instanceof SyntaxError)throw Error('服務回應格式異常，請聯絡校方確認部署。');
    throw e;
  } finally {clearTimeout(timer);}
}
function renderKids() {
  $('kids').replaceChildren();
  kids.forEach(k=>{
    const label=text('label','', 'choice'), input=document.createElement('input');
    input.type='checkbox';input.name='kid';input.value=k.studentNo;input.checked=kids.length===1;
    const body=text('span','', 'kid-name');
    body.append(text('strong',k.name),text('small',[k.englishName,k.cls].filter(Boolean).join(' · ')||'在校學生'));
    label.append(input,text('span',k.name.slice(-1),'kid-avatar'),body,text('span','','checkmark'));
    $('kids').append(label);
  });
}
function updateSummary() {
  const count=document.querySelectorAll('input[name=kid]:checked').length,m=mask();
  $('makeupWrap').hidden=!(m&2);if(!(m&2))$('makeup').checked=false;
  $('selectionSummary').textContent=count&&m?`${count} 位孩子 · ${names(m)}`:'請選擇孩子與調整項目';
}
function setTab(history) {
  $('newTab').setAttribute('aria-pressed',String(!history));$('historyTab').setAttribute('aria-pressed',String(history));
  $('leaveForm').hidden=history;$('historyPanel').hidden=!history;
}
function resetForm() {
  editRecord=null;pending=null;$('leaveForm').reset();renderKids();
  $('kidsField').disabled=false;$('datesField').disabled=false;
  $('dateFrom').value=today;$('dateTo').value=today;
  $('dateFrom').min=today;$('dateTo').min=today;
  $('formTitle').textContent='這次需要調整什麼？';$('formEyebrow').textContent='NEW REQUEST';
  $('reviewBtn').textContent='確認請假內容 →';$('exitEdit').hidden=true;$('addChild').hidden=false;
  showError('formError','');updateSummary();
}
function showBinding() {
  $('bindingPanel').hidden=false;$('center').hidden=true;$('bindingBack').hidden=!kids.length;
}
function renderHistory() {
  $('historyCount').textContent=records.length;$('historyList').replaceChildren();
  if(!records.length){$('historyList').append(text('p','目前沒有請假紀錄。送出後可以在這裡查看。','history-empty'));return;}
  records.forEach(r=>{
    const item=text('article','','record'), top=text('div','','record-top');
    top.append(text('h3',r.date+' · '+r.name),text('span',r.status==='cancelled'?'已取消':'已記錄',r.status==='cancelled'?'badge cancelled':'badge'));
    item.append(top,text('p',r.leaveTypeLabel||names(legacyMask(r.leaveType)),'record-type'));
    if(r.reason)item.append(text('p',r.reason));
    if(r.makeup)item.append(text('p','已提出美語補課聯繫需求'));
    item.append(text('p',r.leaveNo,'record-id'));
    if(r.editable) {
      const actions=text('div','','record-actions'), edit=text('button','修改內容'), cancel=text('button','取消這筆請假');
      edit.type=cancel.type='button';edit.onclick=()=>startEdit(r);cancel.onclick=()=>reviewCancel(r);
      actions.append(edit,cancel);item.append(actions);
    } else if(r.status!=='cancelled') item.append(text('p','如需更動，請直接聯絡校方。','help'));
    $('historyList').append(item);
  });
}
async function reloadData(reset=true) {
  const result=await api('parent_bootstrap');
  if(!Array.isArray(result.kids)||!Array.isArray(result.list)||!result.today)throw Error('請先部署家長中心新版後端。');
  kids=result.kids;records=result.list;today=result.today;renderHistory();
  if(reset)resetForm();
  $('loadingPanel').hidden=true;$('loginPanel').hidden=true;
  $('connectionText').textContent='LINE 身分已確認 · '+(kids.length?`${kids.length} 位孩子已綁定`:'尚待綁定孩子');
  if(kids.length){$('center').hidden=false;$('bindingPanel').hidden=true;}
  else showBinding();
}
async function initialize() {
  showError('globalError','');$('loadingPanel').hidden=false;
  try {
    if(!window.liff)throw Error('LINE 元件未載入，請檢查網路後重新整理。');
    if(!initialized){await liff.init({liffId:LIFF_ID});initialized=true;}
    if(!liff.isLoggedIn()) {$('loadingPanel').hidden=true;$('loginPanel').hidden=false;$('connectionText').textContent='尚未登入 LINE';return;}
    await reloadData();
    const recovery=savedRequest();
    if(recovery?.action&&recovery?.data?.requestId){
      pending=recovery;unresolved=true;
      openReview('確認上一筆送出結果',[text('p','上次送出尚未取得確認。請重試同一請求，系統會核對原編號，不會重新建立一筆。','review-note')]);
      $('sendBtn').textContent='重試同一請求';$('backBtn').hidden=true;
    }
  } catch(e) {
    $('loadingPanel').hidden=true;$('connectionText').textContent='尚未完成資料讀取';
    showError('globalError',e.message);
    const retry=text('button','重新讀取','retry-link');retry.onclick=initialize;$('globalError').append(document.createElement('br'),retry);
  }
}
function datesInRange() {
  const from=$('dateFrom').value,to=$('dateTo').value;
  if(!from||!to||from<today||to<from)throw Error('請選擇有效日期，結束日期不能早於開始日期。');
  const start=new Date(from+'T00:00:00Z'),end=new Date(to+'T00:00:00Z');
  const count=(end-start)/86400000+1;
  if(!Number.isInteger(count)||count<1||count>14)throw Error('一次最多選擇 14 天，請分批登記。');
  return Array.from({length:count},(_,i)=>new Date(+start+i*86400000).toISOString().slice(0,10));
}
function reviewData(rows) {
  const box=text('div','','review-data');
  rows.forEach(([label,value])=>{const p=text('p','');p.append(text('span',label),document.createTextNode(value));box.append(p);});
  return box;
}
function openReview(title,children) {
  $('dialogTitle').textContent=title;$('dialogEyebrow').textContent='最後確認';
  $('reviewContent').replaceChildren(...children);showError('dialogError','');
  $('sendBtn').hidden=false;$('sendBtn').disabled=false;$('sendBtn').textContent='確認送出';
  $('backBtn').hidden=false;$('backBtn').textContent='返回修改';$('reviewDialog').showModal();
}
function startEdit(r) {
  resetForm();editRecord=r;$('kids').replaceChildren();
  const label=text('label','','choice');const input=document.createElement('input');input.type='checkbox';input.name='kid';input.value=r.studentNo;input.checked=true;
  label.append(input,text('strong',r.name),text('span','','checkmark'));$('kids').append(label);
  $('kidsField').disabled=true;$('datesField').disabled=true;$('dateFrom').value=$('dateTo').value=r.date;
  const m=legacyMask(r.leaveType);document.querySelectorAll('input[name=service]').forEach(x=>x.checked=!!(m&Number(x.value)));
  $('reason').value=r.reason||'';$('makeup').checked=r.makeup;
  $('formTitle').textContent='修改這筆請假';$('formEyebrow').textContent='UPDATE REQUEST';
  $('reviewBtn').textContent='確認修改內容 →';$('exitEdit').hidden=false;$('addChild').hidden=true;
  updateSummary();setTab(false);$('leaveForm').scrollIntoView({behavior:'smooth',block:'start'});
}
function reviewCancel(r) {
  pending={action:'parent_cancel',data:{requestId:requestId(),leaveNo:r.leaveNo}};
  openReview('取消這筆請假？',[reviewData([['孩子',r.name],['日期',r.date],['原項目',r.leaveTypeLabel||names(legacyMask(r.leaveType))]]),
    text('p','取消後會通知原本相關的群組。其他請假紀錄不受影響。','review-note')]);
  $('sendBtn').textContent='確認取消這筆';
}
function renderNotifications(items) {
  const list=text('ul','','notification-list');
  if(!items?.length){list.append(text('li','通知狀態尚待確認，可稍後查詢。'));return list;}
  items.forEach(n=>{const li=text('li','');li.append(text('span',n.label),text('strong',n.state==='accepted'?'LINE 已受理':n.state==='needs_review'?'請校方協助':'等待重試'));list.append(li);});
  return list;
}
async function submitPending() {
  if(busy||!pending)return;
  busy=true;unresolved=true;persistRequest(pending);$('sendBtn').disabled=true;$('backBtn').disabled=true;$('sendBtn').textContent='正在記錄與通知…';showError('dialogError','');
  try {
    const result=await api(pending.action,pending.data);lastRequest=result.requestId;
    const cancel=pending.action==='parent_cancel';pending=null;unresolved=false;persistRequest(null);
    $('dialogTitle').textContent=cancel?'這筆請假已取消':'已完成登記';
    $('dialogEyebrow').textContent='REQUEST SAVED';
    const count=text('p',`${result.count} 筆紀錄已更新。通知處理情形如下：`,'review-note');
    const list=renderNotifications(result.notifications);
    $('reviewContent').replaceChildren(count,list,text('p','「LINE 已受理」不代表老師已讀。若為當天臨時變動，請直接聯絡校方確認。','review-note'));
    if(!result.notifications?.length||result.notifications.some(n=>n.state!=='accepted')){
      const retry=text('button','重新查詢／重試通知','retry-link');retry.type='button';
      retry.onclick=async()=>{retry.disabled=true;try{const r=await api('parent_retry',{requestId:lastRequest});list.replaceWith(renderNotifications(r.notifications));retry.remove();}catch(e){showError('dialogError',e.message);retry.disabled=false;}};
      $('reviewContent').append(retry);
    }
    $('sendBtn').hidden=true;$('backBtn').hidden=false;$('backBtn').textContent='查看我的紀錄';
    try {await reloadData();setTab(true);} catch(e){showError('globalError','請假已記錄，但紀錄列表更新失敗。請重新整理確認，不要重新送單。');}
  } catch(e) {if(e.safeToEdit){unresolved=false;persistRequest(null);}$('backBtn').hidden=unresolved;showError('dialogError',e.message);$('sendBtn').textContent='重試同一請求';}
  finally{busy=false;$('sendBtn').disabled=false;$('backBtn').disabled=unresolved;$('backBtn').hidden=unresolved;}
}
$('leaveForm').addEventListener('change',updateSummary);
$('dateFrom').addEventListener('change',()=>{if($('dateTo').value<$('dateFrom').value)$('dateTo').value=$('dateFrom').value;});
$('leaveForm').addEventListener('submit',e=>{
  e.preventDefault();showError('formError','');
  try{
    const ids=[...document.querySelectorAll('input[name=kid]:checked')].map(x=>x.value), m=mask();
    if(!ids.length)throw Error('請先選擇孩子。');if(!m)throw Error('請至少勾選一個調整項目。');
    const dates=editRecord?[editRecord.date]:datesInRange();
    if(ids.length>5||ids.length*dates.length>20)throw Error('每次最多 5 位孩子、合計 20 筆，請分批送出。');
    const data={requestId:requestId(),leaveType:'services_'+m,reason:$('reason').value.trim(),makeup:!!(m&2)&&$('makeup').checked};
    if(editRecord)data.leaveNo=editRecord.leaveNo;else Object.assign(data,{studentNos:ids,dates});
    pending={action:editRecord?'parent_update':'parent_create',data};
    const selected=editRecord?editRecord.name:kids.filter(k=>ids.includes(k.studentNo)).map(k=>k.name).join('、');
    openReview(editRecord?'確認修改內容':'確認這次的安排',[reviewData([['孩子',selected],['日期',dates.length===1?dates[0]:`${dates[0]} 至 ${dates.at(-1)}，共 ${dates.length} 天`],['調整項目',names(m)],['補充說明',data.reason||'未填寫'],['美語補課',data.makeup?'請校方聯繫安排':'未提出']]),
      text('p','未勾選的項目不會請假。送出後，系統將通知家長與對應的校務群組。','review-note')]);
  }catch(err){showError('formError',err.message);}
});
$('sendBtn').onclick=submitPending;
$('backBtn').onclick=()=>{if(!busy&&!unresolved){$('reviewDialog').close();}};
$('reviewDialog').addEventListener('cancel',e=>{if(busy||unresolved)e.preventDefault();});
$('newTab').onclick=()=>{resetForm();setTab(false);};$('historyTab').onclick=()=>setTab(true);
$('exitEdit').onclick=()=>{resetForm();setTab(true);};
$('refreshBtn').onclick=async()=>{const b=$('refreshBtn');b.disabled=true;showError('globalError','');try{await reloadData(false);}catch(e){showError('globalError',e.message);}finally{b.disabled=false;}};
$('addChild').onclick=showBinding;$('bindingBack').onclick=()=>{$('bindingPanel').hidden=true;$('center').hidden=false;};
$('bindingForm').onsubmit=async e=>{
  e.preventDefault();const button=e.submitter;button.disabled=true;$('bindingMessage').textContent='正在核對綁定碼…';
  try{await api('parent_bind',{code:$('bindingCode').value});$('bindingCode').value='';await reloadData();$('bindingMessage').textContent='綁定完成。';}
  catch(err){$('bindingMessage').textContent=err.message;}finally{button.disabled=false;}
};
$('loginBtn').onclick=()=>liff.login({redirectUri:location.origin+location.pathname});
$('themeBtn').onclick=()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';$('themeBtn').textContent=dark?'淺色':'深色';$('themeBtn').setAttribute('aria-label',dark?'切換淺色模式':'切換深色模式');};
initialize();
