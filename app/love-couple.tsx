'use client';
import {useEffect,useState,type FormEvent,type ReactNode} from 'react';
import {CalendarDays,Lock,MessageCircleHeart,Sparkles,Trash2} from 'lucide-react';
import {toast} from 'sonner';
import {countdown,dateLabel,nextEventDate} from '@/lib/love-time';
import {CHECKIN_MOODS} from '@/lib/daily-prompt';
import type {Goal,LoveEvent,LoveState,Memory,View} from '@/lib/love-types';
import {MediaView} from './love-extras';

function SectionTitle({title,sub,action}:{title:string;sub?:string;action?:ReactNode}){
 return <div className="section-title"><div><h2>{title}</h2>{sub&&<p>{sub}</p>}</div>{action}</div>;
}
function EmptyState({title,description}:{title:string;description:string}){
 return <div className="empty-state couple-empty"><h3>{title}</h3><p>{description}</p></div>;
}

type CoupleNote = {id:string;ownerId:string;body:string;createdAt:string;mine:boolean};
type CheckInState = {
  day:string;
  prompt:string;
  mine:{mood:string;answer:string;createdAt:string}|null;
  partner:{mood:string;answer:string;createdAt:string}|'hidden'|null;
};
type CouplePayload = {
  connected:boolean;
  partner:{userId:string;name:string}|null;
  daysTogether:number;
  togetherSince:string;
  nextAnniversary:string|null;
  notes:CoupleNote[];
  checkIn:CheckInState;
};

const MOOD_LABEL: Record<string,string> = {
  glowing:'Glowing',
  calm:'Calm',
  tired:'Tired',
  missing:'Missing you',
  stressed:'A little stressed',
  grateful:'Grateful',
};

export function OurSpaceView({
  state,
  now,
  signedIn,
  onMemory,
  onInvite,
  onNavigate,
}:{
  state:LoveState;
  now:number;
  signedIn:boolean;
  onMemory:(m:Memory)=>void;
  onInvite:()=>void;
  onNavigate:(view:View)=>void;
}) {
  const [couple,setCouple]=useState<CouplePayload|null>(null);
  const [note,setNote]=useState('');
  const [mood,setMood]=useState('grateful');
  const [answer,setAnswer]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  async function load() {
    if (!signedIn) return;
    const r = await fetch('/api/couple', {cache: 'no-store'});
    const data = await r.json() as CouplePayload & {error?: string};
    if (!r.ok) throw new Error(data.error || 'Could not open your shared space.');
    setCouple(data);
  }

  useEffect(() => {
    void load().catch((e) => setError((e as Error).message));
  }, [signedIn, state.connected, state.revision]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/couple', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });
      const data = await r.json() as CouplePayload & CoupleNote & {error?: string};
      if (!r.ok) throw new Error(data.error || 'Could not save that.');
      if (body.op === 'note') {
        setNote('');
        setCouple((current) => current ? {...current, notes: [data as CoupleNote, ...current.notes]} : current);
        toast.success('Note sent to your shared space.');
      } else {
        setCouple(data as CouplePayload);
        setAnswer('');
        toast.success('Today’s check-in is saved.');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeNote(id: string) {
    setBusy(true);
    try {
      const r = await fetch('/api/couple', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({op: 'delete-note', id}),
      });
      const data = await r.json() as {error?: string};
      if (!r.ok) throw new Error(data.error || 'Could not remove that note.');
      setCouple((current) => current ? {...current, notes: current.notes.filter((item) => item.id !== id)} : current);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const connected = couple?.connected ?? state.connected;
  const sharedMemories = [...state.memories].filter((m) => !m.secret).sort((a, b) => b.date.localeCompare(a.date));
  const sharedGoals = state.goals.filter((g: Goal) => !g.secret);
  const dates = state.events
    .filter((e: LoveEvent) => !e.secret && (e.type === 'Anniversary' || e.type === 'Birthday' || e.annual))
    .map((e) => ({...e, next: nextEventDate(e, now)}))
    .sort((a, b) => a.next.localeCompare(b.next));
  const anniversary = couple?.nextAnniversary;
  const daysTogether = couple?.daysTogether ?? Math.max(0, Math.floor((now - new Date(state.profile.togetherSince).getTime()) / 86400000));
  const timeline = [
    ...sharedMemories.map((m) => ({kind: 'memory' as const, at: m.date, memory: m})),
    ...(couple?.notes || []).map((n) => ({kind: 'note' as const, at: n.createdAt.slice(0, 10), note: n})),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">JUST THE TWO OF YOU</p>
          <h1>Our space</h1>
          <p>A shared timeline, love notes, dates, dreams, and a daily check-in—only for linked partners.</p>
        </div>
      </div>
      {!connected && (
        <div className="connection-strip">
          <span><Lock size={16}/>Invite your partner with a link or code so they can see this space with you.</span>
          <button className="primary-button" onClick={onInvite}>Invite partner</button>
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="couple-space-grid">
        <section className="card couple-hero-card">
          <p className="eyebrow">OUR STORY</p>
          <h2>{daysTogether.toLocaleString()} <small>days together</small></h2>
          <p>Since {state.profile.togetherSince}. {connected ? `${state.profile.myName} and ${couple?.partner?.name || state.profile.partnerName} are linked.` : 'Your partner is not linked yet.'}</p>
          {anniversary && (
            <div className="couple-anniversary">
              <CalendarDays size={18}/>
              <div>
                <strong>Next anniversary</strong>
                <span>{dateLabel(anniversary, state.profile.myTimezone, true)} · {countdown(anniversary, now)}</span>
              </div>
            </div>
          )}
        </section>
        <section className="card couple-checkin">
          <SectionTitle title="Today’s check-in" sub={couple?.checkIn.prompt || 'How are you both, really?'}/>
          {couple?.checkIn.mine ? (
            <div className="checkin-answers">
              <article>
                <small>You · {MOOD_LABEL[couple.checkIn.mine.mood] || couple.checkIn.mine.mood}</small>
                <p>{couple.checkIn.mine.answer}</p>
              </article>
              {couple.checkIn.partner === 'hidden' && <p className="help-text">Your partner answered. You’ll see it here after they can see yours—refresh if this stays hidden.</p>}
              {couple.checkIn.partner && couple.checkIn.partner !== 'hidden' && (
                <article>
                  <small>{couple.partner?.name || 'Partner'} · {MOOD_LABEL[couple.checkIn.partner.mood] || couple.checkIn.partner.mood}</small>
                  <p>{couple.checkIn.partner.answer}</p>
                </article>
              )}
              {!couple.checkIn.partner && connected && <p className="help-text">Waiting for your partner’s answer. You’ll see it as soon as they check in.</p>}
            </div>
          ) : (
            <form className="love-form" onSubmit={(e: FormEvent) => {e.preventDefault(); void post({op: 'checkin', mood, answer});}}>
              <div className="mood-row" role="group" aria-label="How are you feeling">
                {CHECKIN_MOODS.map((item) => (
                  <button type="button" key={item} className={mood === item ? 'active' : ''} onClick={() => setMood(item)}>{MOOD_LABEL[item]}</button>
                ))}
              </div>
              <label>Your answer<textarea required maxLength={500} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="A little truth from today…"/></label>
              <button className="primary-button" disabled={busy || !signedIn}><Sparkles size={16}/>Share with {connected ? 'each other' : 'your future partner'}</button>
              <p className="help-text">Your partner sees your answer only after you check in. Only the two linked accounts can read this day.</p>
            </form>
          )}
        </section>
      </div>
      <section className="card couple-notes-card">
        <SectionTitle title="Love notes" sub="Short messages that stay in your couple space."/>
        <form className="note-compose" onSubmit={(e: FormEvent) => {e.preventDefault(); if (note.trim()) void post({op: 'note', body: note.trim()});}}>
          <label className="sr-only" htmlFor="couple-note">Write a love note</label>
          <textarea id="couple-note" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="A little note for the two of you…"/>
          <button className="primary-button" disabled={busy || !note.trim() || !signedIn}><MessageCircleHeart size={16}/>Send note</button>
        </form>
        <div className="note-list">
          {(couple?.notes || []).map((item) => (
            <article className={'couple-note ' + (item.mine ? 'mine' : '')} key={item.id}>
              <p>{item.body}</p>
              <small>{item.mine ? 'You' : (couple?.partner?.name || 'Partner')} · {dateLabel(item.createdAt, state.profile.myTimezone, true)}</small>
              {item.mine && <button className="icon-button" aria-label="Remove note" disabled={busy} onClick={() => void removeNote(item.id)}><Trash2 size={14}/></button>}
            </article>
          ))}
          {!couple?.notes.length && <EmptyState title="No notes yet" description="Leave something kind. Only your linked partner will see it here."/>}
        </div>
      </section>
      <section>
        <SectionTitle title="Shared timeline" sub="Memories you both can see, plus your notes." action={<button className="text-button" onClick={() => onNavigate('memories')}>Open memories</button>}/>
        <div className="couple-timeline">
          {timeline.slice(0, 24).map((item) => item.kind === 'memory' ? (
            <button className="timeline-memory" key={item.memory.id} onClick={() => onMemory(item.memory)}>
              <MediaView url={item.memory.image} kind={item.memory.mediaKind} title={item.memory.title} compact/>
              <span>
                <strong>{item.memory.title}</strong>
                <small>{item.memory.date} · {item.memory.place || 'Together'}</small>
              </span>
            </button>
          ) : (
            <div className="timeline-note" key={item.note.id}>
              <MessageCircleHeart size={16}/>
              <span>
                <strong>{item.note.body}</strong>
                <small>{item.at}</small>
              </span>
            </div>
          ))}
          {!timeline.length && <EmptyState title="Your story will live here" description="Keep a shared memory or send a love note."/>}
        </div>
      </section>
      <div className="couple-space-grid">
        <section className="card">
          <SectionTitle title="Dates that matter" sub="Anniversaries, birthdays, and yearly moments." action={<button className="text-button" onClick={() => onNavigate('calendar')}>Calendar</button>}/>
          {dates.length ? dates.slice(0, 6).map((event) => (
            <div className="date-row" key={event.id}>
              <strong>{event.title}</strong>
              <span>{dateLabel(event.next, event.timezone, true)} · {countdown(event.next, now)}</span>
            </div>
          )) : <p className="help-text">Add an anniversary or birthday on the calendar to see its countdown here.</p>}
        </section>
        <section className="card">
          <SectionTitle title="Shared bucket list" sub="Dreams you both can see." action={<button className="text-button" onClick={() => onNavigate('plans')}>Plans</button>}/>
          {sharedGoals.length ? sharedGoals.slice(0, 6).map((goal) => (
            <div className="date-row" key={goal.id}>
              <strong>{goal.title}</strong>
              <span>{goal.category} · {goal.progress}% · {goal.targetDate}</span>
            </div>
          )) : <p className="help-text">Add a dream on Plans. Leave it shared so it appears here for both of you.</p>}
        </section>
      </div>
    </>
  );
}
