export function filterMyWorkOrders(items,userId){return (items||[]).filter(x=>(x.assignedTechnicianIds||[]).includes(userId));}
