'use client';
import {useEffect, useState} from 'react';
import {ArrowRight, Heart, Sparkles} from 'lucide-react';
import {toast} from 'sonner';
import {FREE_BENEFITS, PLUS_BENEFITS} from '@/lib/payment-plans';
import {money} from '@/lib/shop-catalog';

type BillingPlan = {
  tier: string;
  status: string;
  paymentMode: string;
  expiresAt: number;
  cancelAtEnd: boolean;
};

type BillingPayload = {
  plus: boolean;
  source: string;
  mode: string;
  plan: BillingPlan;
  priceCents: number;
  checkoutUrl?: string | null;
  error?: string;
};

type GiftPlan = {
  id: string;
  giftOrderId: string;
  title: string;
  recipientName: string;
  totalCents: number;
  installmentCount: number;
  splitWithPartner: boolean;
  status: string;
  progress: {paidCents: number; remainingCents: number; percent: number; complete: boolean};
  installments: Array<{
    id: string;
    sequence: number;
    amountCents: number;
    dueOn: string;
    status: string;
    mine: boolean;
    checkoutUrl: string | null;
  }>;
};

type GiftPlansPayload = {
  plus: boolean;
  mode: string;
  plans: GiftPlan[];
  checkoutUrl?: string | null;
  error?: string;
};

async function readJson<T>(r: Response): Promise<T> {
  const data = await r.json() as T & {error?: string};
  if (!r.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function modeNote(mode: string, plus: boolean) {
  if (plus && mode === 'demo') return 'Demo Plus is on. No real charge was taken.';
  if (mode === 'demo') return 'Stripe keys are not connected, so Plus starts in demo mode with no charge.';
  if (mode === 'test') return 'Test checkout only. Test payments do not charge real money.';
  return 'Secure checkout with Stripe.';
}

export function BillingSettingsCard({signedIn, connected}: {signedIn: boolean; connected: boolean}) {
  const [data, setData] = useState<BillingPayload | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!signedIn) return;
    const next = await readJson<BillingPayload>(await fetch('/api/billing', {cache: 'no-store'}));
    setData(next);
  }

  useEffect(() => {
    void load().catch((e) => setError((e as Error).message));
  }, [signedIn]);

  async function post(op: 'start-plus' | 'cancel-plus') {
    setBusy(true);
    setError('');
    try {
      const next = await readJson<BillingPayload>(await fetch('/api/billing', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({op}),
      }));
      setData(next);
      if (next.checkoutUrl) {
        window.location.assign(next.checkoutUrl);
        return;
      }
      toast.success(op === 'start-plus' ? 'LoveLink Plus is on for both of you.' : 'Plus is canceled for this couple.');
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card settings-card billing-card" id="billing">
      <h2>Payment plan</h2>
      <p>Free keeps the couple space. Plus unlocks gift installments and Together extras for both of you.</p>
      {!signedIn && <p className="help-text">Sign in to see your couple’s plan.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {signedIn && !data && !error && <p role="status">Checking your plan…</p>}
      {data && (
        <>
          <div className="setting-row">
            <div>
              <strong>{data.plus ? 'LoveLink Plus' : 'LoveLink Free'}</strong>
              <p>{data.plus ? 'Gift payment plans and Together extras are unlocked.' : 'Pairing, notes, trips, and full-price gift orders stay available.'}</p>
            </div>
            <span className="integration-tag">{data.plus ? 'Active' : 'Free'}</span>
          </div>
          <p className="help-text">{modeNote(data.mode, data.plus)}</p>
          <div className="billing-compare">
            <article>
              <h3>Free</h3>
              <strong>{money(0)}</strong>
              <ul>{FREE_BENEFITS.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
            <article>
              <h3>Plus</h3>
              <strong>{money(data.priceCents)} <small>/ month</small></strong>
              <ul>{PLUS_BENEFITS.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          </div>
          <div className="button-row">
            {!data.plus && (
              <button className="primary-button" disabled={busy} onClick={() => void post('start-plus')}>
                {data.mode === 'demo' ? 'Start Plus (demo)' : 'Start Plus'}
              </button>
            )}
            {data.plus && data.source !== 'shop' && (
              <button className="outline-button" disabled={busy} onClick={() => void post('cancel-plus')}>Cancel Plus</button>
            )}
            {data.plus && data.source === 'shop' && (
              <a className="outline-button" href="/shop">Manage in Shop & Together</a>
            )}
            <a className="text-button" href="/gifts?tab=order">Open gift orders <ArrowRight size={14}/></a>
          </div>
          {!connected && <p className="help-text">Invite your partner so Plus covers both of you.</p>}
        </>
      )}
    </section>
  );
}

export function BillingHomeCard({onNavigate}: {onNavigate: (view: 'gifts' | 'settings') => void}) {
  const [data, setData] = useState<BillingPayload | null>(null);
  const [plans, setPlans] = useState<GiftPlan[]>([]);

  useEffect(() => {
    void Promise.all([
      fetch('/api/billing', {cache: 'no-store'}).then((r) => r.ok ? r.json() : null),
      fetch('/api/payment-plans', {cache: 'no-store'}).then((r) => r.ok ? r.json() : null),
    ]).then(([billing, gift]) => {
      if (billing) setData(billing as BillingPayload);
      if (gift?.plans) setPlans((gift as GiftPlansPayload).plans.filter((plan) => plan.status === 'active'));
    }).catch(() => {});
  }, []);

  if (!data) return null;
  const open = plans[0];
  return (
    <button className="card together-home-link billing-home-link" onClick={() => onNavigate(open ? 'gifts' : 'settings')}>
      <span>
        <strong>{data.plus ? 'Plus is looking after the two of you.' : 'A payment plan, when you are ready.'}</strong>
        <small>
          {open
            ? `${open.title}: ${money(open.progress.paidCents)} of ${money(open.totalCents)} saved.`
            : data.plus
              ? 'Split a catalog gift or keep using Together extras.'
              : 'Free stays fully usable. Plus unlocks gift installments.'}
        </small>
      </span>
      <ArrowRight size={21}/>
    </button>
  );
}

export function BillingSpaceCard({onNavigate}: {onNavigate: (view: 'gifts' | 'settings') => void}) {
  const [data, setData] = useState<BillingPayload | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetch('/api/billing', {cache: 'no-store'})
      .then((r) => readJson<BillingPayload>(r))
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <section className="card billing-space-card">
      <p className="eyebrow">YOUR COUPLE PLAN</p>
      <h2>{data?.plus ? 'LoveLink Plus' : 'LoveLink Free'}</h2>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!data && !error && <p role="status">Loading your plan…</p>}
      {data && (
        <>
          <p>{data.plus ? 'You can split or schedule catalog gifts together.' : 'Upgrade when you want to split a gift or unlock Together extras.'}</p>
          <p className="help-text">{modeNote(data.mode, data.plus)}</p>
          <div className="button-row">
            <button className="outline-button" onClick={() => onNavigate('settings')}>Billing settings</button>
            <button className="text-button" onClick={() => onNavigate('gifts')}>Gift orders <ArrowRight size={14}/></button>
          </div>
        </>
      )}
    </section>
  );
}

export function GiftPaymentPlans({
  giftOrderId,
  plus,
}: {
  giftOrderId?: string;
  plus?: boolean;
}) {
  const [payload, setPayload] = useState<GiftPlansPayload | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<2 | 3 | 4>(3);
  const [split, setSplit] = useState(true);

  async function load() {
    const next = await readJson<GiftPlansPayload>(await fetch('/api/payment-plans', {cache: 'no-store'}));
    setPayload(next);
  }

  useEffect(() => {
    void load().catch((e) => setError((e as Error).message));
  }, []);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      const next = await readJson<GiftPlansPayload>(await fetch('/api/payment-plans', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      }));
      setPayload(next);
      if (next.checkoutUrl) window.location.assign(next.checkoutUrl);
      else toast.success(body.op === 'create' ? 'Payment plan saved.' : body.op === 'cancel' ? 'Payment plan cancelled.' : 'Payment recorded.');
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const plans = payload?.plans || [];
  const forOrder = giftOrderId ? plans.find((plan) => plan.giftOrderId === giftOrderId) : null;
  const list = giftOrderId ? (forOrder ? [forOrder] : []) : plans;
  const canCreate = !!giftOrderId && !forOrder && (plus ?? payload?.plus);

  return (
    <section className="card together-panel billing-gift-panel">
      <div className="section-title">
        <div>
          <h2>Gift payment plans</h2>
          <p>Split a catalog gift, or pay it in a few parts. Physical shipment is still not claimed.</p>
        </div>
        <Sparkles size={18}/>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!payload && !error && <p role="status">Loading payment plans…</p>}
      {payload && !list.length && !canCreate && (
        <p className="help-text">
          {giftOrderId
            ? (plus ?? payload.plus)
              ? 'No plan on this order yet.'
              : 'Start LoveLink Plus to split or schedule this gift.'
            : 'No gift payment plans yet.'}
        </p>
      )}
      {canCreate && giftOrderId && (
        <form className="love-form" onSubmit={(e) => {
          e.preventDefault();
          void post({op: 'create', giftOrderId, installments: count, splitWithPartner: split});
        }}>
          <label>How many payments
            <select value={count} onChange={(e) => setCount(Number(e.target.value) as 2 | 3 | 4)}>
              <option value={2}>2 parts</option>
              <option value={3}>3 parts</option>
              <option value={4}>4 parts</option>
            </select>
          </label>
          <label className="safety-check">
            <input type="checkbox" checked={split} onChange={(e) => setSplit(e.target.checked)}/>
            Split with my partner
          </label>
          <div className="button-row">
            <button className="primary-button" disabled={busy}>Start payment plan</button>
          </div>
        </form>
      )}
      {giftOrderId && !(plus ?? payload?.plus) && (
        <p className="help-text">
          <a className="text-button" href="/settings#billing">Unlock Plus <Heart size={14}/></a>
          {' '}to schedule this gift instead of paying it all at once.
        </p>
      )}
      {list.map((plan) => (
        <article className="billing-plan" key={plan.id}>
          <div className="section-title">
            <div>
              <h3>{plan.title || 'Gift plan'}</h3>
              <p>{plan.recipientName} · {plan.installmentCount} parts{plan.splitWithPartner ? ' · split' : ''} · {plan.status}</p>
            </div>
            <strong>{money(plan.progress.paidCents)} / {money(plan.totalCents)}</strong>
          </div>
          <div className="billing-progress" aria-hidden="true"><span style={{width: plan.progress.percent + '%'}}/></div>
          {plan.installments.map((item) => (
            <div className="together-history" key={item.id}>
              <span>
                Part {item.sequence}
                <small>{money(item.amountCents)} · due {item.dueOn} · {item.status}</small>
              </span>
              {plan.status === 'active' && item.status === 'due' && item.mine && (
                <button className="text-button" disabled={busy} onClick={() => void post({op: 'pay', installmentId: item.id})}>
                  {payload?.mode === 'demo' ? 'Mark paid (demo)' : 'Pay this part'}
                </button>
              )}
            </div>
          ))}
          {plan.status === 'active' && !plan.progress.paidCents && (
            <button className="outline-button" disabled={busy} onClick={() => void post({op: 'cancel', planId: plan.id})}>Cancel plan</button>
          )}
        </article>
      ))}
    </section>
  );
}
