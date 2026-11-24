export const guidance = '請說明便於分校能協助後續課程進度安排。';
export function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw Error('FORM_SOURCE_CHANGED');
  return source.replace(before, after);
}
export function patchHtml(source) {
  let result = replaceOnce(source,
    '<label for="reason">補充說明 <small>選填</small></label>',
    '<label for="reason">補充說明 <small>必填</small></label><p id="reasonHelp"><strong>' + guidance + '</strong></p>');
  result = replaceOnce(result, '<textarea id="reason"', '<textarea id="reason" required aria-required="true" aria-describedby="reasonHelp"');
  return replaceOnce(result, 'parent-center.js?v=20261007-startup-1', 'parent-center.js?v=20261124-reason-required-1');
}
export function patchScript(source) {
  return replaceOnce(source,
    "    const data={requestId:requestId(),leaveType:'services_'+m,reason:$('reason').value.trim(),makeup:!!(m&2)&&$('makeup').checked};",
    "    if(!$('reason').value.trim()){ $('reason').focus(); throw Error('請填寫補充說明，便於分校能協助後續課程進度安排。'); }\n" +
    "    const data={requestId:requestId(),leaveType:'services_'+m,reason:$('reason').value.trim(),makeup:!!(m&2)&&$('makeup').checked};");
}
