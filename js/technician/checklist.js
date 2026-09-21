export function checklistCompletion(items){const a=items||[];return a.length?Math.round(a.filter(x=>x.completed).length/a.length*100):0;}
