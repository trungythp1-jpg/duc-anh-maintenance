export function required(v){return v!==null&&v!==undefined&&String(v).trim()!==''}
export function normalizeText(v){return String(v??'').trim().replace(/\s+/g,' ').toLowerCase()}
