import type { AttendanceValue } from '../core/types.js';

export function extractJsonSection(html:string,keyword:string):Record<string,unknown>|null {
  const keyIdx=html.indexOf(keyword); if(keyIdx<0)return null; let start=keyIdx+keyword.length;
  while(start<html.length&&/[\s:]/.test(html[start]))start++; if(html[start]==='[')return {}; if(html[start]!=='{')return null;
  let depth=0,inString=false,escape=false,quote='',i=start;
  for(;i<html.length;i++){const ch=html[i];if(escape){escape=false;continue}if(inString){if(ch==='\\')escape=true;else if(ch===quote)inString=false;continue}if(ch==='"'||ch==="'"){inString=true;quote=ch;continue}if(ch==='{')depth++;else if(ch==='}'&&--depth===0){i++;break}}
  try{return JSON.parse(html.slice(start,i)) as Record<string,unknown>}catch{return null}
}
export function mapAttendance(value:string|number|null|undefined):AttendanceValue|null {
  const v=String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().trim();
  if(/^(yes|ja|aanwezig|present|available|beschikbaar|42028)$/.test(v))return 'yes';
  if(/^(no|nee|afwezig|absent|unavailable|onbeschikbaar|42033)$/.test(v))return 'no';
  if(/^(unknown|onbekend|geen antwoord|no answer|niet beslist|42038|)$/.test(v))return 'unknown'; return null;
}
export function parseActivityDetails(eventId:string,html:string){
  if(!html.includes('initActivityDetails'))throw new Error(`Attendance payload absent for event ${eventId}`);
  const contactsRaw=extractJsonSection(html,'attendanceContacts:')??{}; const attendancesRaw=extractJsonSection(html,'attendances:')??{};
  const contacts=Object.values(contactsRaw).map(v=>{const c=v as Record<string,unknown>;return {id:String(c.id),fullName:String(c.fullName??''),functions:(c.contactFunctions??[]) as string[]}});
  const attendances=Object.entries(attendancesRaw).map(([contactId,v])=>{const a=v as Record<string,unknown>;const raw=String(a.attendanceTypeName??a.attendanceTypeId??'');return {contactId,value:mapAttendance(raw),sourceValue:raw,comment:a.comment==null?null:String(a.comment)}});
  const homeTeamId=html.match(/homeTeamId:\s*["']?(\d+)/)?.[1]??null;
  return {eventId,homeTeamId,contacts,attendances};
}
