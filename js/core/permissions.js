export const ROLES=Object.freeze({ADMIN:'admin',MANAGER:'manager',TECHNICIAN:'technician',CUSTOMER_SERVICE:'customer_service',WAREHOUSE:'warehouse',DIRECTOR:'director'});
export function hasRole(user,allowed=[]){return Boolean(user?.role && allowed.includes(user.role));}
export function can(user,action){const matrix={ADMIN:['*'],MANAGER:['read','write','complete'],TECHNICIAN:['read','work'],CUSTOMER_SERVICE:['read','confirm'],WAREHOUSE:['read','parts'],DIRECTOR:['read','reports']}; const p=matrix[String(user?.role||'').toUpperCase()]||[]; return p.includes('*')||p.includes(action);}
