import type {Pin} from "./love-types";
const formatters=new Map<string,Intl.DateTimeFormat>();
export function zonedParts(date:Date|string,timeZone:string) {
 let formatter=formatters.get(timeZone);if(!formatter){formatter=new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});if(formatters.size>=64)formatters.delete(formatters.keys().next().value!);formatters.set(timeZone,formatter);}
 const p=formatter.formatToParts(new Date(date));
 return Object.fromEntries(p.filter(x=>x.type!=="literal").map(x=>[x.type,Number(x.value)])) as Record<string,number>;
}
export function localInput(date:string,timeZone:string){const p=zonedParts(date,timeZone);return `${p.year}-${String(p.month).padStart(2,"0")}-${String(p.day).padStart(2,"0")}T${String(p.hour).padStart(2,"0")}:${String(p.minute).padStart(2,"0")}`;}
export function zonedToISO(wall:string,timeZone:string):string {
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(wall))throw new Error("Choose a valid date and time.");
 const [y,m,d,h,n]=wall.split(/[-T:]/).map(Number); const target=Date.UTC(y,m-1,d,h,n); let guess=target;
 for(let i=0;i<5;i++){const p=zonedParts(new Date(guess),timeZone);const delta=target-Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);guess+=delta;if(delta===0)break;}
 const iso=new Date(guess).toISOString();
 if(localInput(iso,timeZone)!==wall)throw new Error("That local time is skipped by daylight saving. Please choose another time.");
 const earlier=new Date(guess-3600000).toISOString();return localInput(earlier,timeZone)===wall?earlier:iso;
}
export function countdown(date:string,now:number,full=false){const ms=new Date(date).getTime()-now;if(ms<=0)return "It’s time ❤️";const mins=Math.ceil(ms/60000),days=Math.floor(ms/86400000),hours=Math.floor(ms/3600000)%24;if(full&&days>0)return `${days}d ${hours}h ${Math.floor(ms/60000)%60}m`;if(days>0)return `${days} ${days===1?"day":"days"} remaining`;if(ms>=3600000){const h=Math.floor(ms/3600000);return `${h} ${h===1?"hour":"hours"} remaining`;}return `${mins} ${mins===1?"minute":"minutes"} remaining`;}
export function dateLabel(date:string,timezone:string,withTime=false){return new Intl.DateTimeFormat("en-US",{timeZone:timezone,month:"short",day:"numeric",...(withTime?{hour:"numeric",minute:"2-digit"}:{} )}).format(new Date(date));}
export function reminderAt(pin:Pin){return pin.snoozedUntil || new Date(new Date(pin.dueAt).getTime()-pin.reminderMinutes*60000).toISOString();}
export function advanceOccurrence(pin:Pin,now=Date.now()):Pin {
 if(pin.repeat==="none")return {...pin,done:true};
 const base=zonedParts(pin.dueAt,pin.timezone);const anchor=pin.anchorDay||base.day;let next=new Date(pin.dueAt).getTime();let step=0;
 do{step++;let date:Date;
 if(pin.repeat==="monthly"||pin.repeat==="yearly") {const month=base.month-1+(pin.repeat==="monthly"?step:step*12);const first=new Date(Date.UTC(base.year,month,1));const last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();date=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),Math.min(anchor,last),base.hour,base.minute));}
 else date=new Date(Date.UTC(base.year,base.month-1,base.day+step*(pin.repeat==="weekly"?7:1),base.hour,base.minute));
 const wall=date.toISOString().slice(0,16);try{next=new Date(zonedToISO(wall,pin.timezone)).getTime();}catch{next=new Date(zonedToISO(new Date(date.getTime()+3600000).toISOString().slice(0,16),pin.timezone)).getTime();}
 }while(next-pin.reminderMinutes*60000<=now&&step<40000);
 return {...pin,dueAt:new Date(next).toISOString(),anchorDay:anchor,done:false,notifiedAt:undefined,snoozedUntil:undefined};
}
export function addBusinessDays(date:Date,n:number){const r=new Date(date);let count=0;while(count<n){r.setUTCDate(r.getUTCDate()+1);if(r.getUTCDay()!==0&&r.getUTCDay()!==6)count++;}return r;}
export function orderDeadline(deliverDate:string,businessDays:number){const d=new Date(deliverDate+"T12:00:00Z");let count=0;while(count<businessDays){d.setUTCDate(d.getUTCDate()-1);if(d.getUTCDay()!==0&&d.getUTCDay()!==6)count++;}return d;}

/** Resolve an annual occasion in its own timezone, retaining its original month/day. */
export function eventInYear(event:{date:string;timezone:string;annual:boolean},year:number){
 if(!event.annual)return event.date;
 const p=zonedParts(event.date,event.timezone);const day=Math.min(p.day,new Date(Date.UTC(year,p.month,0)).getUTCDate());
 const wall=new Date(Date.UTC(year,p.month-1,day,p.hour,p.minute));
 try{return zonedToISO(wall.toISOString().slice(0,16),event.timezone);}catch{return zonedToISO(new Date(wall.getTime()+3600000).toISOString().slice(0,16),event.timezone);}
}
export function nextEventDate(event:{date:string;timezone:string;annual:boolean},now=Date.now()){
 if(!event.annual||Date.parse(event.date)>=now)return event.date;
 const year=zonedParts(new Date(now),event.timezone).year;const candidate=eventInYear(event,year);
 return Date.parse(candidate)>=now?candidate:eventInYear(event,year+1);
}
export function shiftLocalDays(iso:string,zone:string,days:number){
 const p=zonedParts(iso,zone);const wall=new Date(Date.UTC(p.year,p.month-1,p.day+days,p.hour,p.minute));
 try{return zonedToISO(wall.toISOString().slice(0,16),zone);}catch{return zonedToISO(new Date(wall.getTime()+3600000).toISOString().slice(0,16),zone);}
}
