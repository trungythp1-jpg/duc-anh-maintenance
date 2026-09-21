export function normalizeVietnamPhone(v){return String(v??'').replace(/[\s.-]/g,'')}
export function isValidVietnamPhone(v){return /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(normalizeVietnamPhone(v))}
