export function bindMobileMenu(button,menu){const b=document.querySelector(button),m=document.querySelector(menu);if(b&&m)b.addEventListener('click',()=>m.classList.toggle('is-open'));}
