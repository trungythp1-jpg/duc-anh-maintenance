export function renderCustomerDetail(target,customer){document.querySelector(target).innerHTML=`<h2>${customer?.name||''}</h2><p>${customer?.phone||''}</p>`;}
