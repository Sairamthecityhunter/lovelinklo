'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {Bell,CalendarDays,Trash2} from 'lucide-react';
import {toast} from 'sonner';

type Day = {
  id:string;
  personUserId:string|null;
  name:string|null;
  type:string;
  label:string;
  month:number;
  day:number;
  year:number|null;
  interests:string[];
};

const LEVELS = [
  {value:100,label:'Favorite (100)',help:'Love notes right away, and every special day.'},
  {value:50,label:'Close (50)',help:'No love-note pushes. One day before each special day.'},
  {value:25,label:'Quiet (25)',help:'No love-note pushes. Birthday only, one day before.'},
];

async function jsonFetch(path: string, body?: Record<string, unknown>) {
  const r = await fetch(path, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    headers: body ? {'Content-Type': 'application/json'} : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json() as Record<string, unknown> & {error?: string};
  if (!r.ok) throw new Error(data.error || 'Could not save that.');
  return data;
}

export function PartnerNotifySettings({
  signedIn,
  partnerName,
  partnerUserId,
  connected,
}:{
  signedIn:boolean;
  partnerName:string;
  partnerUserId:string|null;
  connected:boolean;
}) {
  const [publicKey,setPublicKey]=useState<string|null>(null);
  const [subscribed,setSubscribed]=useState(false);
  const [level,setLevel]=useState<number|null>(null);
  const [mode,setMode]=useState<'full'|'simple'>('full');
  const [lead,setLead]=useState<'1h'|'1d'>('1d');
  const [busy,setBusy]=useState(false);

  async function load() {
    const [push, close, days] = await Promise.all([
      jsonFetch('/api/push'),
      jsonFetch('/api/closeness'),
      jsonFetch('/api/special-days'),
    ]);
    setPublicKey((push.publicKey as string|null) || null);
    setSubscribed(!!push.subscribed);
    setLevel(typeof close.level === 'number' ? close.level : null);
    const prefs = days.prefs as {mode?:string;lead?:string}|undefined;
    if (prefs?.mode === 'simple' || prefs?.mode === 'full') setMode(prefs.mode);
    if (prefs?.lead === '1h' || prefs?.lead === '1d') setLead(prefs.lead);
  }

  useEffect(() => {
    if (!signedIn) return;
    void load().catch(() => {});
  }, [signedIn, connected]);

  async function togglePush(next: boolean) {
    if (!next) {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await jsonFetch('/api/push', {op: 'unsubscribe', endpoint: sub.endpoint});
        await sub.unsubscribe().catch(() => {});
      }
      setSubscribed(false);
      toast.success('Notifications are off.');
      return;
    }
    if (!publicKey) {
      toast.error('Push isn’t configured on this server yet.');
      return;
    }
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      toast.error('This browser doesn’t support notifications.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      toast.error('Notifications stay off until you allow them.');
      return;
    }
    const reg = await navigator.serviceWorker.register('/sw.js');
    const ready = await navigator.serviceWorker.ready.catch(() => reg);
    const sub = await ready.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey,
    });
    const json = sub.toJSON();
    await jsonFetch('/api/push', {
      op: 'subscribe',
      endpoint: sub.endpoint,
      keys: {p256dh: json.keys?.p256dh, auth: json.keys?.auth},
    });
    setSubscribed(true);
    toast.success('Notifications are on for this device.');
  }

  return (
    <section className="card couple-safety-card">
      <div className="section-title">
        <div>
          <h2>Notifications & closeness</h2>
          <p>Opt in to pushes. Your closeness level is private — {partnerName || 'your partner'} never sees it.</p>
        </div>
      </div>
      <div className="setting-row">
        <div>
          <strong>Allow notifications</strong>
          <p>We only ask when you turn this on. Nothing is sent until you allow it.</p>
        </div>
        <button
          className={subscribed ? 'primary-button' : 'outline-button'}
          disabled={!signedIn || busy}
          onClick={() => {
            setBusy(true);
            void togglePush(!subscribed).catch((e) => toast.error((e as Error).message)).finally(() => setBusy(false));
          }}
        ><Bell size={16}/>{subscribed ? 'On' : 'Off'}</button>
      </div>
      {connected && (
        <div className="setting-row">
          <div>
            <strong>Closeness with {partnerName || 'your partner'}</strong>
            <p>This only changes what you receive.</p>
            <div className="mood-row" role="group" aria-label="Closeness level">
              {LEVELS.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={level === item.value ? 'active' : ''}
                  disabled={!signedIn || busy}
                  onClick={() => {
                    setBusy(true);
                    void jsonFetch('/api/closeness', {op: 'set', level: item.value})
                      .then(() => {setLevel(item.value); toast.success('Closeness saved.');})
                      .catch((e) => toast.error((e as Error).message))
                      .finally(() => setBusy(false));
                  }}
                >{item.label}</button>
              ))}
            </div>
            <p className="help-text">{LEVELS.find((item) => item.value === level)?.help || 'No level means no pushes.'}</p>
          </div>
        </div>
      )}
      <form className="love-form" onSubmit={(e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        void jsonFetch('/api/special-days', {op: 'prefs', mode, lead})
          .then(() => toast.success('Reminder preferences saved.'))
          .catch((err) => toast.error((err as Error).message))
          .finally(() => setBusy(false));
      }}>
        <label>Reminder style
          <select value={mode} onChange={(e) => setMode(e.target.value as 'full'|'simple')}>
            <option value="full">Full — include a small idea from their interests</option>
            <option value="simple">Simple — birthday only, no ideas</option>
          </select>
        </label>
        <label>Lead time
          <select value={lead} onChange={(e) => setLead(e.target.value as '1h'|'1d')}>
            <option value="1d">One day before</option>
            <option value="1h">One hour before</option>
          </select>
        </label>
        <button className="outline-button" disabled={!signedIn || busy}>Save reminder preferences</button>
        {partnerUserId && <p className="help-text">Favorite (100) uses this lead time and bypasses quiet hours for love notes.</p>}
      </form>
    </section>
  );
}

export function SpecialDaysCard({
  signedIn,
  partnerName,
  partnerUserId,
}:{
  signedIn:boolean;
  partnerName:string;
  partnerUserId:string|null;
}) {
  const empty = {type:'birthday',label:'',name:'',month:1,day:1,year:'',interests:'',usePartner:true};
  const [days,setDays]=useState<Day[]>([]);
  const [form,setForm]=useState(empty);
  const [editing,setEditing]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);

  async function load() {
    const data = await jsonFetch('/api/special-days');
    setDays((data.days as Day[]) || []);
  }
  useEffect(() => {
    if (signedIn) void load().catch(() => {});
  }, [signedIn]);

  function reset() {
    setEditing(null);
    setForm({...empty, name: partnerName, usePartner: !!partnerUserId});
  }

  return (
    <section className="card couple-safety-card">
      <div className="section-title">
        <div>
          <h2>Special days</h2>
          <p>Birthdays, anniversaries, and custom dates. Interests stay on your side and shape full-mode reminder ideas.</p>
        </div>
      </div>
      <div className="note-list">
        {days.map((day) => (
          <article className="couple-note" key={day.id}>
            <p>{day.label} · {day.type} · {day.month}/{day.day}{day.year ? `/${day.year}` : ''}</p>
            <small>{day.name || partnerName}{day.interests.length ? ` · ${day.interests.join(', ')}` : ''}</small>
            <button className="icon-button" aria-label="Remove special day" disabled={busy} onClick={() => {
              setBusy(true);
              void jsonFetch('/api/special-days', {op: 'delete', id: day.id})
                .then((data) => {setDays((data.days as Day[]) || []); toast.success('Removed.');})
                .catch((e) => toast.error((e as Error).message))
                .finally(() => setBusy(false));
            }}><Trash2 size={14}/></button>
            <button className="text-button" onClick={() => {
              setEditing(day.id);
              setForm({
                type: day.type,
                label: day.label,
                name: day.name || '',
                month: day.month,
                day: day.day,
                year: day.year ? String(day.year) : '',
                interests: day.interests.join(', '),
                usePartner: !!day.personUserId,
              });
            }}>Edit</button>
          </article>
        ))}
        {!days.length && <p className="help-text">Add a birthday or anniversary to get a private reminder.</p>}
      </div>
      <form className="love-form" onSubmit={(e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const interests = form.interests.split(',').map((item) => item.trim()).filter(Boolean);
        void jsonFetch('/api/special-days', {
          op: editing ? 'update' : 'create',
          id: editing || undefined,
          type: form.type,
          label: form.label.trim(),
          name: form.usePartner ? (partnerName || form.name.trim()) : form.name.trim(),
          personUserId: form.usePartner ? partnerUserId : null,
          month: Number(form.month),
          day: Number(form.day),
          year: form.year ? Number(form.year) : null,
          interests,
        }).then((data) => {
          setDays((data.days as Day[]) || []);
          reset();
          toast.success(editing ? 'Special day updated.' : 'Special day saved.');
        }).catch((err) => toast.error((err as Error).message)).finally(() => setBusy(false));
      }}>
        <label>Label<input required maxLength={80} value={form.label} onChange={(e) => setForm((s) => ({...s,label:e.target.value}))} placeholder="Maya’s birthday"/></label>
        <label>Type
          <select value={form.type} onChange={(e) => setForm((s) => ({...s,type:e.target.value}))}>
            <option value="birthday">Birthday</option>
            <option value="anniversary">Anniversary</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        {partnerUserId && (
          <label className="safety-check">
            <input type="checkbox" checked={form.usePartner} onChange={(e) => setForm((s) => ({...s,usePartner:e.target.checked}))}/>
            This is about {partnerName || 'my partner'}
          </label>
        )}
        {!form.usePartner && <label>Person<input required maxLength={80} value={form.name} onChange={(e) => setForm((s) => ({...s,name:e.target.value}))} placeholder="Name"/></label>}
        <div className="form-grid triple">
          <label>Month<input required type="number" min={1} max={12} value={form.month} onChange={(e) => setForm((s) => ({...s,month:Number(e.target.value)}))}/></label>
          <label>Day<input required type="number" min={1} max={31} value={form.day} onChange={(e) => setForm((s) => ({...s,day:Number(e.target.value)}))}/></label>
          <label>Year (optional)<input type="number" min={1900} max={2100} value={form.year} onChange={(e) => setForm((s) => ({...s,year:e.target.value}))}/></label>
        </div>
        <label>Interests<textarea maxLength={200} value={form.interests} onChange={(e) => setForm((s) => ({...s,interests:e.target.value}))} placeholder="Coffee, film photography, hiking"/></label>
        <div className="button-row">
          <button className="primary-button" disabled={!signedIn || busy}><CalendarDays size={16}/>{editing ? 'Save day' : 'Add special day'}</button>
          {editing && <button type="button" className="outline-button" onClick={reset}>Cancel</button>}
        </div>
      </form>
    </section>
  );
}
