export function remainingVisits(agreement){return Math.max(0,Number(agreement?.totalVisits||0)-Number(agreement?.completedVisits||0));}
