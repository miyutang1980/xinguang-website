'use strict';
// Separate notice workflow: never calls parent_create or mutates leave masks.
let pickupReady=false,pickupBusy=false,pickupUncertain=false,pickupPending=null,pickupRows=[],pickupLoaded=false,pickupKidsSignature='';
let pickupKey;try{pickupKey=sessionStorage.getItem('parent-pickup-key');}catch(e){}
function renewPickupKey(){pickupKey=requestId();try{sessionStorage.setItem('parent-pickup-key',pickupKey);}catch(e){}}
if(!pickupKey)renewPickupKey();
function pickupWhen(){
  const date=$('pickupDate').value;
  $('pickupWhen').textContent=!date?'請選擇接孩子日期。':date===today?'今天的安排：確認送出後立即通知校方。':`${date} 中午 12:00 起通知校方，不會今天先發送。`;
}
function pickupStatus(n){
  if(n.state==='accepted')return 'LINE 已受理（不代表已讀）';
  if(n.state==='suppressed')return '已取消發送';
  if(n.state==='needs_review')return '請電話聯繫校方確認';
  const current=new Date().toLocaleString('sv-SE',{timeZone:'Asia/Taipei'});
  return n.notifyAt>current?`預定 ${n.notifyAt.slice(0,16)} 起通知`:'等待通知／重試中';
}
function pickupNotices(notice){
  const list=text('ul','','notification-list');
  notice.notifications.forEach(n=>{const li=text('li','');li.append(text('span',n.kind==='cancel'?'取消安排通知':'接孩子通知'),text('strong',pickupStatus(n)));list.append(li);});
  return list;
}
function renderPickupHistory(){
  $('pickupHistory').replaceChildren();
  if(!pickupRows.length){$('pickupHistory').append(text('p','目前沒有接孩子通知。','history-empty'));return;}
  pickupRows.forEach(r=>{
    const card=text('article','','record'),top=text('div','','record-top');
    top.append(text('h3',`${r.date} · ${r.time}`),text('span',r.status==='cancelled'?'已取消安排':'已登記','badge'));
    card.append(top,text('p',r.kids.map(k=>k.name).join('、'),'record-type'),pickupNotices(r));
    if(r.note)card.append(text('p',r.note));
    card.append(text('p',r.noticeId,'record-id'));
    if(r.cancellable){const b=text('button','取消這次接孩子通知','text-button');b.type='button';b.onclick=()=>{
      pickupPending={action:'parent_pickup_cancel',data:{noticeId:r.noticeId}};
      openPickupReview('取消這次接孩子安排？',[reviewData([['孩子',r.kids.map(k=>k.name).join('、')],['日期／時間',r.date+' '+r.time]]),text('p','未發送的通知將停止發送；已嘗試通知校方的安排，將立即補送取消通知。','review-note')]);
    };card.append(b);}
    $('pickupHistory').append(card);
  });
}
async function loadPickup(){
  $('pickupRefresh').disabled=true;showError('pickupError','');
  try{
    const r=await api('parent_pickup_list');
    if(!Array.isArray(r.notices))throw Error('請先部署接孩子通知 v4 Gateway。');
    today=r.today||today;pickupReady=r.pickupReady===true;pickupRows=r.notices;
    $('pickupUnavailable').hidden=pickupReady;$('pickupFields').disabled=!pickupReady||pickupUncertain;
    const signature=JSON.stringify(kids.map(k=>[k.studentNo,k.name,k.cls]));
    if(!pickupLoaded||pickupKidsSignature!==signature){
      pickupKidsSignature=signature;
      $('pickupKids').replaceChildren();
      kids.forEach(k=>{const l=text('label','','choice'),i=document.createElement('input');i.type='checkbox';i.name='pickupKid';i.value=k.studentNo;i.checked=kids.length===1;
        const s=text('span','','kid-name');s.append(text('strong',k.name),text('small',k.cls||'在校學生'));l.append(i,s,text('span','','checkmark'));$('pickupKids').append(l);});
      $('pickupDate').value=today;pickupLoaded=true;
    }
    $('pickupDate').min=today;pickupWhen();renderPickupHistory();
  }catch(e){$('pickupFields').disabled=true;showError('pickupError',e.message);}
  finally{$('pickupRefresh').disabled=false;}
}
function openPickupReview(title,children){
  $('pickupDialogTitle').textContent=title;$('pickupReviewContent').replaceChildren(...children);
  showError('pickupDialogError','');$('pickupSend').hidden=false;$('pickupSend').disabled=false;$('pickupSend').textContent='確認送出';
  $('pickupBack').hidden=false;$('pickupBack').disabled=false;$('pickupBack').textContent='返回修改';
  $('pickupDialog').showModal();
}
$('pickupTab').onclick=()=>{setTab('pickup');loadPickup();};
$('pickupRefresh').onclick=loadPickup;
$('pickupDate').onchange=pickupWhen;
$('pickupForm').onsubmit=e=>{
  e.preventDefault();showError('pickupError','');
  try{
    if(!pickupReady)throw Error('校方尚未啟用接孩子通知，請電話聯繫。');
    const ids=[...document.querySelectorAll('[name=pickupKid]:checked')].map(x=>x.value);
    const date=$('pickupDate').value,time=$('pickupTime').value,note=$('pickupNote').value.trim();
    if(!ids.length||ids.length>5)throw Error('請選 1–5 位孩子。');
    if(!date||date<today||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('請選擇有效的日期與接孩子時間。');
    if(date>today&&time<='12:00')throw Error('提前登記限中午 12:00 後接孩子；中午前請電話聯繫，或於當天填寫。');
    if(date+' '+time<=new Date().toLocaleString('sv-SE',{timeZone:'Asia/Taipei'}).slice(0,16))throw Error('接孩子時間已過，請選稍後的時間。');
    pickupPending={action:'parent_pickup_create',data:{requestId:pickupKey,studentNos:ids,date,time,note}};
    openPickupReview('確認接孩子通知',[reviewData([['孩子',kids.filter(k=>ids.includes(k.studentNo)).map(k=>k.name).join('、')],['接孩子日期',date],['預計到校',time],['通知時機',date===today?'送出後立即通知校方':date+' 中午 12:00 起'],['備註',note||'未填寫']]),text('p','這不是請假，也不會自動取消校車。通知已送達不代表校方已確認下課或交接，急件請來電。','review-note')]);
  }catch(err){showError('pickupError',err.message);}
};
$('pickupSend').onclick=async()=>{
  if(pickupBusy||!pickupPending)return;
  pickupBusy=true;pickupUncertain=true;$('pickupSend').disabled=true;$('pickupBack').disabled=true;$('pickupBack').hidden=true;
  $('pickupSend').textContent='正在登記…';showError('pickupDialogError','');
  try{
    const r=await api(pickupPending.action,pickupPending.data);
    const created=pickupPending.action==='parent_pickup_create';
    pickupPending=null;pickupUncertain=false;if(created)renewPickupKey();
    $('pickupDialogTitle').textContent=r.notice.status==='cancelled'?'已取消接孩子安排':'接孩子安排已登記';
    $('pickupReviewContent').replaceChildren(reviewData([['日期／時間',r.notice.date+' '+r.notice.time]]),pickupNotices(r.notice),text('p',r.notificationWarning||'LINE 已受理不代表老師已讀，臨時安排請電話確認。','review-note'));
    $('pickupSend').hidden=true;$('pickupBack').hidden=false;$('pickupBack').textContent='查看接孩子紀錄';
    if(created){$('pickupForm').reset();pickupLoaded=false;}
    await loadPickup();
  }catch(e){
    if(e.safeToEdit){pickupUncertain=false;renewPickupKey();pickupPending=null;$('pickupSend').hidden=true;$('pickupBack').hidden=false;$('pickupBack').textContent='返回修改';}
    else{$('pickupSend').textContent='重試同一請求';}
    showError('pickupDialogError',e.message+(pickupUncertain?' 請重試同一請求，不要改填後重複送出。':''));
  }finally{pickupBusy=false;$('pickupSend').disabled=false;$('pickupBack').disabled=false;$('pickupFields').disabled=!pickupReady||pickupUncertain;}
};
$('pickupBack').onclick=()=>{if(!pickupBusy&&!pickupUncertain)$('pickupDialog').close();};
$('pickupDialog').addEventListener('cancel',e=>{if(pickupBusy||pickupUncertain)e.preventDefault();});
