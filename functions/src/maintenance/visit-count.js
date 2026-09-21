function calculateTheoreticalVisits(startDate,endDate,intervalMonths=1){
 const start=new Date(startDate); const end=new Date(endDate); if(Number.isNaN(start)||Number.isNaN(end)||end<start)return 0;
 let count=0; let cursor=new Date(start);
 while(cursor<=end && count<240){count++; cursor.setMonth(cursor.getMonth()+Number(intervalMonths||1));}
 return count;
}
function remainingVisits(totalVisits,completedVisits){return Math.max(0,Number(totalVisits||0)-Number(completedVisits||0));}
module.exports={calculateTheoreticalVisits,remainingVisits};
