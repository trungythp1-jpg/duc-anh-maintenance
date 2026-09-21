export function renderElevatorDetail(target,e){document.querySelector(target).innerHTML=`<h2>${e?.elevatorCode||'Elevator'}</h2><p>${e?.name||''}</p>`;}
