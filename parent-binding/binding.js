'use strict';
const GW_URL = 'https://script.google.com/macros/s/AKfycbw-7_a_OfUVlgegcLxkux_9dr9UlYSVKhi3uQjV-0sr2X2TpRRmCXtSM7jbIqMHK4hNww/exec';
document.getElementById('issueForm').onsubmit=async e=>{
  e.preventDefault();
  const form=e.target,button=e.submitter,out=document.getElementById('result');
  const body=Object.fromEntries(new FormData(form));
  if(!window.confirm(`確定為學生編號 ${body.studentNo} 的家長${body.slot}核發綁定碼？請再確認學生編號與親屬欄位。`))return;
  button.disabled=true;out.textContent='正在核發…';
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
  try {
    const response=await fetch(GW_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({...body,_action:'parent_issue_code'}),signal:controller.signal});
    const result=await response.json();
    if(!result.success)throw Error(result.error||'核發失敗');
    out.replaceChildren();
    const title=document.createElement('p');title.className='muted';title.textContent=`${result.name}（${result.studentNo}）／家長${result.slot}`;
    const code=document.createElement('code');code.textContent=result.code;
    const note=document.createElement('p');note.className='help';note.textContent='30 分鐘內有效，使用後失效。請透過已核驗的家長聯絡管道提供，不要張貼在群組。';
    out.append(title,code,note);
  } catch(err) {out.textContent=err.name==='AbortError'?'連線超時。可重新核發，舊碼將失效。':err.message;}
  finally {clearTimeout(timeout);button.disabled=false;form.elements.adminPass.value='';}
};
