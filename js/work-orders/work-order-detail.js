export function renderWorkOrderDetail(target,wo){document.querySelector(target).innerHTML=`<h2>${wo?.workOrderCode||'WO'}</h2><p>${wo?.status||''}</p>`;}
