export function theoreticalVisits(start,end,interval=1){let n=0,d=new Date(start),e=new Date(end);while(d<=e&&n<240){n++;d.setMonth(d.getMonth()+Number(interval||1));}return n;}
