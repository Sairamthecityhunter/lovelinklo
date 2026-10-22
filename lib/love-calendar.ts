import type {LoveState,Pin} from './love-types';
import {advanceOccurrence,nextEventDate,reminderAt,eventInYear,zonedParts} from './love-time';
const stamp=(iso:string)=>new Date(iso).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
const escapeText=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
export function foldCalendarLine(s:string){let out='',line='',size=0;const enc=new TextEncoder();for(const c of s){const bytes=enc.encode(c).length;if(size+bytes>75){out+=line+'\r\n';line=' ';size=1;}line+=c;size+=bytes;}return out+line;}
export function calendarExport(state:LoveState,now:number,options:{privateItems:boolean;messages:boolean}){
 const until=now+366*86400000,records:{id:string;title:string;date:string;body:string;alarm?:string}[]=[];
 for(const e of state.events){if(e.secret&&!options.privateItems)continue;let date=nextEventDate(e,now);for(let i=0;i<2&&Date.parse(date)<=until;i++){if(Date.parse(date)>=now)records.push({id:`event-${e.id}-${stamp(date)}`,title:e.title,date,body:`LoveLink occasion · ${e.timezone}`});if(!e.annual)break;date=eventInYear(e,zonedParts(date,e.timezone).year+1);}}
 for(const original of state.pins){if(original.done||(original.secret&&!options.privateItems)||(state.viewerId&&original.ownerId&&original.ownerId!==state.viewerId))continue;let p:Pin=original;
 if(Date.parse(p.dueAt)<now&&p.repeat!=='none')p=advanceOccurrence(p,now-p.reminderMinutes*60000);
 for(let i=0;i<368&&Date.parse(p.dueAt)<=until;i++){
  if(Date.parse(p.dueAt)>=now)records.push({id:`pin-${p.id}-${stamp(p.dueAt)}`,title:p.title,date:p.dueAt,body:`LoveLink ${p.type.toLowerCase()} · ${p.timezone}${options.messages&&p.message?'\n\n'+p.message:''}`,alarm:Date.parse(reminderAt(p))>now?reminderAt(p):undefined});
  if(p.repeat==='none')break;p=advanceOccurrence(p,Date.parse(p.dueAt)-p.reminderMinutes*60000+1);
 }
 }
 records.sort((a,b)=>a.date.localeCompare(b.date));const selected=records.slice(0,20000);const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//LoveLink//Love calendar//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
 for(const r of selected){lines.push('BEGIN:VEVENT',`UID:${r.id}@lovelink`,`DTSTAMP:${stamp(new Date(now).toISOString())}`,`DTSTART:${stamp(r.date)}`,'DURATION:PT15M',`SUMMARY:${escapeText(r.title)}`,`DESCRIPTION:${escapeText(r.body)}`,'CLASS:PRIVATE','TRANSP:TRANSPARENT');if(r.alarm)lines.push('BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${escapeText(r.title)}`,`TRIGGER;VALUE=DATE-TIME:${stamp(r.alarm)}`,'END:VALARM');lines.push('END:VEVENT');}
 lines.push('END:VCALENDAR');return {text:lines.map(foldCalendarLine).join('\r\n')+'\r\n',count:selected.length,truncated:records.length>selected.length};
}
export function downloadCalendar(text:string){const url=URL.createObjectURL(new Blob([text],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='lovelink-calendar.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
