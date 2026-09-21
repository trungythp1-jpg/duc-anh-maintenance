async function sendZaloTemplate(){
 // Zalo OA/ZBS integration is intentionally isolated. Secrets belong in server-side runtime configuration.
 return {ok:false,skipped:true,reason:'ZALO_NOT_CONFIGURED'};
}
module.exports={sendZaloTemplate};
