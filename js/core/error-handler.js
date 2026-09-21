export function normalizeError(error){return {code:error?.code||'unknown',message:error?.message||'Có lỗi xảy ra'};}
export function showError(error,callback=console.error){const e=normalizeError(error); callback(e.message,e); return e;}
