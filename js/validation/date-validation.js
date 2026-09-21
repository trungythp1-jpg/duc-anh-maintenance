export function validateDateRange(start,end){return Boolean(start&&end&&new Date(start)<=new Date(end));}
