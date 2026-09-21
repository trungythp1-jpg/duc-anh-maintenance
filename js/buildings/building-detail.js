export function renderBuildingDetail(target,b){document.querySelector(target).innerHTML=`<h2>${b?.name||''}</h2><p>${b?.address||''}</p>`;}
