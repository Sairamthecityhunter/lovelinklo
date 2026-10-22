'use client';

import {useMemo,useState} from 'react';
import {Plus,ChevronLeft,ChevronRight,ArrowRight,Download,Pin} from 'lucide-react';
import {eventInYear,nextEventDate,dateLabel,localInput,zonedToISO} from '@/lib/love-time';
import {TYPE_EMOJI,type LoveState,type LoveEvent,type Pin as WishPin} from '@/lib/love-types';

type CalendarItem = {kind:'event';event:LoveEvent;date:string} | {kind:'pin';pin:WishPin;date:string};
const dayKey=(date:Date)=>date.toISOString().slice(0,10);
const dayLabel=(key:string)=>new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(key+'T12:00:00Z'));
const itemRecord=(item:CalendarItem)=>item.kind==='event'?item.event:item.pin;

export function CalendarView({state,now,onAdd,onEvent,onPin,onExport}:{state:LoveState;now:number;onExport:()=>void;onAdd:(e:Partial<LoveEvent>)=>void;onEvent:(e:LoveEvent)=>void;onPin:(p:WishPin)=>void}) {
  const zone=state.profile.myTimezone;
  const today=localInput(new Date(now).toISOString(),zone).slice(0,10);
  const [month,setMonth]=useState(()=>today.slice(0,7));
  const [selected,setSelected]=useState(()=>today);
  const [year,monthNumber]=month.split('-').map(Number);
  const monthDate=new Date(Date.UTC(year,monthNumber-1,1));
  const monthLabel=new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(monthDate);
  const cells=useMemo(()=>{
    const start=new Date(Date.UTC(year,monthNumber-1,1));
    return Array.from({length:42},(_,i)=>new Date(Date.UTC(year,monthNumber-1,1-start.getUTCDay()+i)));
  },[year,monthNumber]);
  const itemsByDay=useMemo(()=>{
    const days=new Map<string,CalendarItem[]>(cells.map(d=>[dayKey(d),[]]));
    const add=(item:CalendarItem)=>days.get(localInput(item.date,zone).slice(0,10))?.push(item);
    for(const event of state.events) {
      // Adjacent years include occasions that cross New Year between the couple's timezones.
      const dates=event.annual?[year-1,year,year+1].map(y=>eventInYear(event,y)):[event.date];
      for(const date of dates) if(Date.parse(date)>=Date.parse(event.date)) add({kind:'event',event,date});
    }
    for(const pin of state.pins) if(!pin.done) add({kind:'pin',pin,date:pin.dueAt});
    for(const items of days.values()) items.sort((a,b)=>a.date.localeCompare(b.date));
    return days;
  },[cells,state.events,state.pins,zone,year]);
  const selectedItems=itemsByDay.get(selected)||[];
  const next=state.events.map(event=>({event,date:nextEventDate(event,now)})).filter(e=>Date.parse(e.date)>now).sort((a,b)=>a.date.localeCompare(b.date));
  const navigate=(offset:number)=>{
    const key=dayKey(new Date(Date.UTC(year,monthNumber-1+offset,1)));
    setMonth(key.slice(0,7));setSelected(key);
  };
  const selectDay=(key:string)=>{setSelected(key);setMonth(key.slice(0,7));};
  const addMoment=()=>onAdd({date:zonedToISO(selected+'T19:00',zone),timezone:zone});

  return <>
    <div className="page-heading">
      <div><p className="eyebrow">MAKE TIME FOR WHAT MATTERS</p><h1>Love calendar</h1><p>Your dates and reminders. Select a day to see the details.</p></div>
      <div className="button-row"><button className="outline-button" onClick={onExport}><Download size={16}/>Export calendar</button><button className="primary-button" onClick={addMoment}><Plus size={16}/>Add event</button></div>
    </div>
    <div className="calendar-layout">
      <div className="card calendar-card emoji-calendar">
        <div className="calendar-toolbar">
          <h2 aria-live="polite">{monthLabel}</h2>
          <div><button className="text-button" onClick={()=>{setMonth(today.slice(0,7));setSelected(today);}}>Today</button><button className="icon-button" onClick={()=>navigate(-1)} aria-label="Previous month"><ChevronLeft size={18}/></button><button className="icon-button" onClick={()=>navigate(1)} aria-label="Next month"><ChevronRight size={18}/></button></div>
        </div>
        <div className="calendar-grid" role="group" aria-label={monthLabel+' calendar'}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div className="calendar-day-name" key={d} aria-hidden="true">{d}</div>)}
          {cells.map(date=>{
            const key=dayKey(date),items=itemsByDay.get(key)||[];
            const emojis=[...new Set(items.map(item=>TYPE_EMOJI[itemRecord(item).type]))];
            return <button key={key} type="button" className={'calendar-date '+(key.slice(0,7)!==month?'other-month ':'')+(key===today?'today ':'')+(key===selected?'selected':'')}
              aria-label={dayLabel(key)+(items.length?': '+items.map(item=>itemRecord(item).title).join(', '):': No moments planned')}
              aria-pressed={key===selected} aria-current={key===today?'date':undefined} onClick={()=>selectDay(key)}>
              <span className="calendar-date-number">{date.getUTCDate()}</span>
              <span className="calendar-date-emojis" aria-hidden="true">{emojis.slice(0,2).map(emoji=><span key={emoji}>{emoji}</span>)}{emojis.length>2&&<small>+{emojis.length-2}</small>}</span>
              <span className="calendar-date-titles" aria-hidden="true">{items.slice(0,2).map(item=><span className={'calendar-event '+(item.kind==='pin'?'is-pin':'')} key={item.kind+itemRecord(item).id}>{item.kind==='pin'&&<Pin size={10}/>}<span>{itemRecord(item).title}</span></span>)}{items.length>2&&<small>+{items.length-2} more</small>}</span>
            </button>;
          })}
        </div>
        <div className="calendar-emoji-key" aria-label="Calendar emoji guide"><span>🎂 Birthday</span><span>💍 Anniversary</span><span>🎁 Gift</span><span>❤️ Wish</span><span>📅 Date</span></div>
        <p className="calendar-zone">Dates & times in {zone.replaceAll('_',' ')}.</p>
        <section className="calendar-selection" aria-label="Selected date details" aria-live="polite">
          <div className="calendar-selection-heading"><div><p className="eyebrow">{selected===today?'TODAY':'YOUR DAY TOGETHER'}</p><h3>{dayLabel(selected).replace(/, \d{4}$/,'')}</h3></div><button className="icon-button" onClick={addMoment} aria-label={'Add moment on '+selected}><Plus size={20}/></button></div>
          {selectedItems.length?<div className="calendar-day-items">{selectedItems.map(item=>{
            const record=itemRecord(item);
            return <button className="calendar-day-item" key={item.kind+record.id} onClick={()=>item.kind==='event'?onEvent(item.event):onPin(item.pin)}>
              <span className={'calendar-item-emoji '+(item.kind==='pin'?'is-pin':'')} aria-hidden="true">{TYPE_EMOJI[record.type]}</span><span><strong>{record.title}</strong><small>{item.kind==='pin'?'Love Pin':'Special moment'} · {new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:zone}).format(new Date(item.date))}{record.timezone!==zone?' · '+dateLabel(item.date,record.timezone,true)+' ('+record.timezone.replaceAll('_',' ')+')':''}</small></span><ChevronRight size={16}/>
            </button>;
          })}</div>:<div className="calendar-empty-day"><span aria-hidden="true">🤍</span><p>A little room for something lovely.</p><button className="text-button" onClick={addMoment}>Plan a moment on this day <ArrowRight size={14}/></button></div>}
        </section>
      </div>
      <aside className="card calendar-aside"><h3>Upcoming</h3>{next.length?next.slice(0,4).map(({event,date})=><div className="upcoming-detail" key={event.id}><h4>{TYPE_EMOJI[event.type]} {event.title}</h4><p>{dateLabel(date,event.timezone,true)}</p><p>{state.pins.filter(p=>p.eventId===event.id&&!p.done).length} linked love pins</p><button onClick={()=>onEvent(event)}>View event <ArrowRight size={12} style={{display:'inline'}}/></button></div>):<p className="help-text">Your next chapter is waiting. Add a special date to begin.</p>}</aside>
    </div>
  </>;
}
