import type {ReactNode} from 'react';
import {BrandLogo} from '@/app/brand-logo';
import {visibilityLabel} from '@/lib/closeness-unlocks';
import type {CountRow, OpsSnapshot} from '@/lib/ops-dashboard';
import {BarChart3, Bell, CalendarDays, Gift, Heart, NotebookPen, Plane} from 'lucide-react';

function money(cents: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {style: 'currency', currency}).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function dayLabel(iso: string) {
  const date = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return iso;
  return new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'}).format(new Date(date + 'T12:00:00Z'));
}

function Stat({label, value, hint}:{label: string; value: number | string; hint?: string}) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
      {hint && <small>{hint}</small>}
    </div>
  );
}

function Breakdown({rows}:{rows: CountRow[]}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0) || 1;
  return (
    <ul className="ops-breakdown">
      {rows.map((row) => (
        <li key={row.key}>
          <span>{row.label}</span>
          <strong>{row.count}</strong>
          <i style={{width: `${Math.round((row.count / total) * 100)}%`}}/>
        </li>
      ))}
    </ul>
  );
}

export function DashboardView({
  snapshot,
  via,
  homeHref,
}:{
  snapshot: OpsSnapshot;
  via: string;
  homeHref: string;
}) {
  return (
    <div className="ops-shell">
      <header className="ops-top">
        <a href={homeHref} aria-label="Back to LoveLink"><BrandLogo variant="wordmark"/></a>
        <nav className="ops-top-links">
          <a className="outline-button" href={homeHref}>Back to LoveLink</a>
        </nav>
      </header>
      <main className="ops-main">
        <div className="page-heading">
          <div>
            <p className="eyebrow">OPERATIONS</p>
            <h1>LoveLink at a glance</h1>
            <p>Read-only counts from the live couple database. Note bodies, addresses, and push endpoints stay off this page.</p>
          </div>
          <span className="ops-via">Unlocked via {via.replace(/-/g, ' ')}</span>
        </div>

        <div className="pins-summary ops-summary">
          <Stat label="Couples" value={snapshot.couples} hint={`${snapshot.pairedCouples} paired`}/>
          <Stat label="People" value={snapshot.users}/>
          <Stat label="Push subscriptions" value={snapshot.push.subscriptions} hint={`${snapshot.push.subscribers} people`}/>
          <Stat label="Love notes sent" value={snapshot.notes.sent} hint={`${snapshot.notes.scheduled} scheduled`}/>
          <Stat label="Active trips" value={snapshot.trips.active}/>
          <Stat label="Gift orders" value={snapshot.gifts.total}/>
        </div>

        <div className="ops-grid">
          <section className="card ops-card">
            <h2><Bell size={18}/> Push subscriptions</h2>
            <p>Devices currently stored in <code>push_subscriptions</code>.</p>
            <div className="ops-pair">
              <div><strong>{snapshot.push.subscriptions}</strong><span>Subscriptions</span></div>
              <div><strong>{snapshot.push.subscribers}</strong><span>Distinct people</span></div>
            </div>
          </section>

          <section className="card ops-card">
            <h2><Heart size={18}/> Closeness across couples</h2>
            <p>Directed closeness rows, then couples that have at least one partner-to-partner level.</p>
            <Breakdown rows={snapshot.closeness.rows}/>
            <h3>Couples by level</h3>
            <Breakdown rows={snapshot.closeness.couplesByLevel}/>
            <p className="help-text">{snapshot.closeness.unsetCouples} paired {snapshot.closeness.unsetCouples === 1 ? 'couple has' : 'couples have'} no closeness row yet. Favorite is {visibilityLabel(100)}, Close is {visibilityLabel(50)}, Everyone is {visibilityLabel(25)}.</p>
          </section>

          <section className="card ops-card">
            <h2><NotebookPen size={18}/> Love notes</h2>
            <p>Sent versus still waiting on a special day.</p>
            <Breakdown rows={snapshot.notes.rows}/>
          </section>

          <section className="card ops-card">
            <h2><Plane size={18}/> Travel trips</h2>
            <p>Active means not marked done and not already past.</p>
            <Breakdown rows={snapshot.trips.rows}/>
            <ol className="ops-list">
              {snapshot.trips.upcoming.map((trip) => (
                <li key={`${trip.title}-${trip.startDate}-${trip.destination}`}>
                  <strong>{trip.title}</strong>
                  <span>{trip.destination || 'Destination open'} · {trip.status}{trip.startDate ? ` · ${dayLabel(trip.startDate)}` : ''}</span>
                </li>
              ))}
            </ol>
            {!snapshot.trips.upcoming.length && <p className="help-text">No active trips right now.</p>}
          </section>

          <section className="card ops-card ops-span">
            <h2><CalendarDays size={18}/> Upcoming calendar & special days</h2>
            <p>Next occurrence of saved occasions and annual special days. Titles only — no private note text.</p>
            <div className="ops-split">
              <div>
                <h3>Calendar events</h3>
                <ol className="ops-list">
                  {snapshot.calendar.events.map((event) => (
                    <li key={`${event.title}-${event.date}`}>
                      <strong>{event.title}</strong>
                      <span>{dayLabel(event.date)} · {event.type}{event.annual ? ' · annual' : ''}</span>
                    </li>
                  ))}
                </ol>
                {!snapshot.calendar.events.length && <p className="help-text">No upcoming calendar events.</p>}
              </div>
              <div>
                <h3>Special days</h3>
                <ol className="ops-list">
                  {snapshot.calendar.specialDays.map((day) => (
                    <li key={`${day.label}-${day.date}`}>
                      <strong>{day.label}</strong>
                      <span>{dayLabel(day.date)} · {day.type}</span>
                    </li>
                  ))}
                </ol>
                {!snapshot.calendar.specialDays.length && <p className="help-text">No special days on file.</p>}
              </div>
            </div>
          </section>

          <section className="card ops-card ops-span">
            <h2><Gift size={18}/> Gift orders</h2>
            <p>Catalog gift orders from <code>gift_orders</code>, without addresses or messages.</p>
            <Breakdown rows={snapshot.gifts.rows}/>
            <ol className="ops-list">
              {snapshot.gifts.recent.map((order) => (
                <li key={`${order.title}-${order.createdAt}`}>
                  <strong>{order.title}</strong>
                  <span>{order.status.replace(/_/g, ' ')} · {money(order.priceCents, order.currency)} · {dayLabel(order.createdAt)}</span>
                </li>
              ))}
            </ol>
            {!snapshot.gifts.recent.length && <p className="help-text">No gift orders yet.</p>}
          </section>
        </div>

        <footer className="ops-foot">
          <span><BarChart3 size={14}/> Generated {new Date(snapshot.generatedAt).toLocaleString('en-US')}</span>
          <a href={homeHref}>Return to the LoveLink home</a>
        </footer>
      </main>
    </div>
  );
}

export function DashboardLocked({
  homeHref,
  children,
}:{
  homeHref: string;
  children: ReactNode;
}) {
  return (
    <div className="ops-shell">
      <header className="ops-top">
        <a href={homeHref} aria-label="Back to LoveLink"><BrandLogo variant="wordmark"/></a>
        <nav className="ops-top-links">
          <a className="outline-button" href={homeHref}>Back to LoveLink</a>
        </nav>
      </header>
      <main className="ops-main ops-locked">
        <div className="page-heading">
          <div>
            <p className="eyebrow">OPERATIONS</p>
            <h1>This dashboard is private</h1>
            <p>It is not part of the public couple site. Use the operations password or a signed-in owner account.</p>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
