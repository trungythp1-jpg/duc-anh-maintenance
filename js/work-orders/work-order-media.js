export function validateMedia(file,{maxBytes=25*1024*1024}={}){return Boolean(file&&file.size<=maxBytes);}
