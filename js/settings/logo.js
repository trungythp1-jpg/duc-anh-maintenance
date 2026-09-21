export function applyLogo(url,selector='.company-logo'){document.querySelectorAll(selector).forEach(el=>{el.src=url||'';el.hidden=!url;});}
