'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {ArrowRight,Bookmark,Gift,Heart,Pin,Search,Package,Mail} from 'lucide-react';
import {toast} from 'sonner';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {products} from '@/lib/love-data';
import {SHOP_ITEMS,money} from '@/lib/shop-catalog';
import type {LoveState,Product,Pin as WishPin} from '@/lib/love-types';
import {Choice,EmptyState} from './lovelink';
import './love-together.css';
import {MarketplaceOrders} from './love-marketplace';
import {sellerMoney} from '@/lib/seller';

type GiftOrder = {
  id:string;
  title:string;
  productId:string;
  priceCents:number;
  recipientName:string;
  status:string;
  paymentMode:string;
  checkoutUrl:string|null;
  mine:boolean;
  message:string;
  createdAt:string;
};

function GiftCatalogOrder({state}:{state:LoveState}) {
  const empty = {recipientName:state.profile.partnerName,forPartner:true,addressLine1:'',addressLine2:'',city:'',region:'',postalCode:'',country:'',message:''};
  const [selected,setSelected]=useState<Product|null>(null);
  const [form,setForm]=useState(empty);
  const [orders,setOrders]=useState<GiftOrder[]>([]);
  const [created,setCreated]=useState<GiftOrder|null>(null);
  const [payment,setPayment]=useState<{mode:string;provider:string}|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  async function load(productId?:string) {
    const r = await fetch('/api/gift-orders', {cache: 'no-store'});
    const data = await r.json() as {orders?:GiftOrder[];payment?:{mode:string;provider:string};error?:string};
    if (!r.ok) throw new Error(data.error || 'Could not load gift orders.');
    setOrders(data.orders || []);
    if (data.payment) setPayment(data.payment);
    const params = new URLSearchParams(window.location.search);
    const wanted = productId || params.get('place');
    if (wanted && !selected) setSelected(products.find((item) => item.id === wanted) || null);
  }

  useEffect(() => {
    void load().catch((e) => setError((e as Error).message));
  }, []);

  return (
    <>
      <div className="gift-disclosure">
        <strong>New catalog order path.</strong>
        <p>Place an order for a catalog gift. Gift ideas, wishlist pins, digital shop gifts, Gift Passport, and seller marketplace checkout stay as they are. Payment stays pending until Stripe keys are connected; no shipment is claimed from this form.</p>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {created && (
        <section className="card together-panel">
          <h2>Order saved</h2>
          <p>{created.title} for {created.recipientName}. Status: {created.status.replaceAll('_',' ')}.</p>
          <p className="help-text">{created.checkoutUrl ? 'Continue to the payment provider when you are ready.' : 'No live payment keys are connected, so this stays pending_payment until Stripe is hooked up.'}</p>
          {created.checkoutUrl && <a className="primary-button" href={created.checkoutUrl}>Continue to checkout</a>}
          <button className="outline-button" onClick={() => {setCreated(null); setSelected(null);}}>Order another gift</button>
        </section>
      )}
      <div className="product-grid">
        {products.map((item) => (
          <article className="product-card" key={'order-'+item.id}>
            <div className="product-image"><img src={item.image} alt={item.title}/></div>
            <div>
              <small>{item.category}</small>
              <h3>{item.title}</h3>
              <p>{item.subtitle}</p>
              <div className="product-price"><strong>{item.price ? '$'+item.price : 'No charge'}</strong></div>
              <button className="primary-button" onClick={() => {setSelected(item); setCreated(null); setForm((s) => ({...s,recipientName:state.profile.partnerName}));}}>Order this gift</button>
            </div>
          </article>
        ))}
      </div>
      {selected && !created && (
        <section className="card together-panel">
          <h2>Checkout · {selected.title}</h2>
          <p>{selected.subtitle} · {selected.price ? '$'+selected.price : 'No charge'}</p>
          <form className="love-form" onSubmit={(e: FormEvent) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            void fetch('/api/gift-orders', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                op: 'create',
                productId: selected.id,
                recipientName: form.recipientName.trim(),
                forPartner: form.forPartner,
                addressLine1: form.addressLine1.trim(),
                addressLine2: form.addressLine2.trim(),
                city: form.city.trim(),
                region: form.region.trim(),
                postalCode: form.postalCode.trim(),
                country: form.country.trim(),
                message: form.message.trim(),
              }),
            }).then(async (r) => {
              const data = await r.json() as {created?:GiftOrder;orders?:GiftOrder[];checkoutUrl?:string|null;error?:string};
              if (!r.ok) throw new Error(data.error || 'Could not create that order.');
              setOrders(data.orders || []);
              setCreated(data.created || null);
              toast.success('Gift order saved.');
              if (data.checkoutUrl) window.location.assign(data.checkoutUrl);
            }).catch((err) => {setError((err as Error).message); toast.error((err as Error).message);}).finally(() => setBusy(false));
          }}>
            <label className="safety-check">
              <input type="checkbox" checked={form.forPartner} onChange={(e) => setForm((s) => ({...s,forPartner:e.target.checked,recipientName:e.target.checked ? state.profile.partnerName : s.recipientName}))}/>
              This gift is for {state.profile.partnerName || 'my partner'}
            </label>
            {!form.forPartner && <label>Recipient name<input required maxLength={80} value={form.recipientName} onChange={(e) => setForm((s) => ({...s,recipientName:e.target.value}))}/></label>}
            <label>Address<input required maxLength={120} value={form.addressLine1} onChange={(e) => setForm((s) => ({...s,addressLine1:e.target.value}))} placeholder="Street address"/></label>
            <label>Address line 2<input maxLength={120} value={form.addressLine2} onChange={(e) => setForm((s) => ({...s,addressLine2:e.target.value}))}/></label>
            <div className="form-grid">
              <label>City<input required maxLength={80} value={form.city} onChange={(e) => setForm((s) => ({...s,city:e.target.value}))}/></label>
              <label>Region<input maxLength={80} value={form.region} onChange={(e) => setForm((s) => ({...s,region:e.target.value}))}/></label>
            </div>
            <div className="form-grid">
              <label>Postal code<input required maxLength={20} value={form.postalCode} onChange={(e) => setForm((s) => ({...s,postalCode:e.target.value}))}/></label>
              <label>Country<input required maxLength={56} value={form.country} onChange={(e) => setForm((s) => ({...s,country:e.target.value}))} placeholder="United States"/></label>
            </div>
            <label>Gift message<textarea maxLength={500} value={form.message} onChange={(e) => setForm((s) => ({...s,message:e.target.value}))} placeholder="A little note with the gift"/></label>
            <div className="button-row">
              <button className="primary-button" disabled={busy}>{payment?.provider === 'stripe' ? 'Save order and pay' : 'Save order'}</button>
              <button type="button" className="outline-button" disabled={busy} onClick={() => setSelected(null)}>Cancel</button>
            </div>
          </form>
        </section>
      )}
      {!!orders.length && (
        <section className="card together-panel">
          <h2>Gift orders</h2>
          {orders.map((order) => (
            <div className="together-history" key={order.id}>
              <span>{order.title}<small>{order.recipientName} · {order.status.replaceAll('_',' ')} · {order.mine ? 'You ordered' : 'For you'}</small></span>
              {order.mine && order.status === 'pending_payment' && (
                <button className="text-button" disabled={busy} onClick={() => {
                  setBusy(true);
                  void fetch('/api/gift-orders', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({op: 'cancel', id: order.id})})
                    .then(async (r) => {
                      const data = await r.json() as {orders?:GiftOrder[];error?:string};
                      if (!r.ok) throw new Error(data.error || 'Could not cancel that order.');
                      setOrders(data.orders || []);
                    })
                    .catch((e) => toast.error((e as Error).message))
                    .finally(() => setBusy(false));
                }}>Cancel</button>
              )}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
function SellerCatalog({onPin}:{onPin:(p:Partial<WishPin>)=>void}){
 const [country,setCountry]=useState<'IN'|'US'>('IN'),[items,setItems]=useState<any[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[selected,setSelected]=useState<any>(null),[note,setNote]=useState(''),[ack,setAck]=useState(false),[busy,setBusy]=useState(false),[mode,setMode]=useState('disabled'),[checkoutId,setCheckoutId]=useState('');
 useEffect(()=>{let alive=true;setLoading(true);setError('');setItems([]);setSelected(null);setAck(false);void fetch('/api/seller/catalog?country='+country,{cache:'no-store'}).then(async r=>{const d:any=await r.json();if(!r.ok)throw Error(d.error||'Catalog previews could not load.');if(alive){setItems(d.items);setMode(d.mode||'disabled');}}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[country]);
 return <section className="seller-customer-catalog"><div className="section-title"><div><h2>Gifts from independent sellers</h2><p>Choose your delivery country. Only payment-ready products offer checkout.</p></div><Choice label="Seller catalog country" value={country} onChange={v=>setCountry(v as 'IN'|'US')} options={[{value:'IN',label:'India · INR'},{value:'US',label:'USA · USD'}]}/></div><p className="gift-disclosure">Each seller handles fulfillment, support, returns, and tax registration. Owner review is not identity verification. Checkout confirms the final price and tax before you pay.</p>{loading&&<p role="status">Loading catalog previews…</p>}{error&&<p role="alert">{error}</p>}{!loading&&!error&&!items.length&&<p>No seller has a reviewed, opted-in preview in this market yet. <a href="/seller">Apply through the seller portal</a>.</p>}<div className="product-grid">{items.map(p=><article className="product-card" key={p.id}><div className="product-image"><img src={p.photo} alt={p.title}/></div><div><small>{p.shopName} · {p.city} · {p.currency}</small><h3>{p.title}</h3><p>{p.description}</p><p><strong>Item price: {sellerMoney(p.price,p.country)}</strong></p><p>Shipping: {sellerMoney(p.shipping,p.country)}</p><p className="help-text">Seller-stated preparation: {p.processingDays} days; transit: {p.deliveryMin}–{p.deliveryMax} days. Service area: {p.serviceArea}. Stock reported: {p.stock}.</p><button className="outline-button" onClick={()=>onPin({title:'Gift idea: '+p.title,type:'Gift',message:p.shopName+' · '+p.title+'\nProposed price '+sellerMoney(p.price,p.country)+' + shipping '+sellerMoney(p.shipping,p.country)+'\nCatalog preview only — no order, payment, or delivery confirmed.'})}><Pin size={14}/>Save a gift reminder</button><button className="primary-button" disabled={!p.checkoutEnabled||busy} onClick={()=>{setSelected(p);setCheckoutId(crypto.randomUUID());setNote('');setAck(false);setError('');}}>{p.checkoutEnabled?(mode==='test'?'Test checkout':'Buy from '+p.shopName):p.stock===0?'Sold out':'Checkout not activated'}</button><span className="seller-preview-label">{p.checkoutEnabled?'Sold and fulfilled by '+p.shopName:'Seller payment onboarding or market activation required'}</span></div></article>)}</div>{selected&&<section className="card together-panel seller-form"><h2>{selected.title}</h2><p>Seller: {selected.shopName}. Item {sellerMoney(selected.price,selected.country)} + shipping {sellerMoney(selected.shipping,selected.country)}. Tax is calculated at Stripe checkout. One item per order.</p><p>Delivery service area: {selected.serviceArea}. Preparation {selected.processingDays} days + transit {selected.deliveryMin}–{selected.deliveryMax} days, estimated by the seller.</p><p>Returns: {selected.returns}</p><p>Support: {selected.support}</p>{selected.personalization&&<p>Personalization options: {selected.personalization}</p>}<label>Gift or personalization note · optional<textarea maxLength={500} value={note} onChange={e=>{setNote(e.target.value);setCheckoutId(crypto.randomUUID());}}/></label><label><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/> I confirm my delivery address is within this service area and accept the seller’s return policy. My delivery address and note are shared with the seller to fulfill this order.</label>{mode==='test'&&<p>Test checkout: no real money is taken and no shipment is expected.</p>}<div className="button-row"><button className="primary-button" disabled={busy||!ack} onClick={()=>{setBusy(true);setError('');const requestId=checkoutId;void fetch('/api/marketplace/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId:selected.id,requestId,note,ack:true})}).then(async r=>{const d:any=await r.json();if(!r.ok)throw Error(d.error||'Checkout unavailable.');window.location.assign(d.url);}).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}>Continue to secure checkout</button><button className="outline-button" disabled={busy} onClick={()=>setSelected(null)}>Cancel</button></div></section>}<MarketplaceOrders/></section>;
}
export function GiftsView({state,category,setCategory,onProduct,onWishlist,onPin}:{state:LoveState;category:string;setCategory:(v:string)=>void;onProduct:(p:Product)=>void;onWishlist:(p:Product)=>Promise<unknown>;onPin:(p:Partial<WishPin>)=>void;onAI?:()=>void}){
 const [tab,setTab]=useState('ideas'),[q,setQ]=useState(''),[budget,setBudget]=useState('all');
 useEffect(()=>{const params=new URLSearchParams(window.location.search);if(params.has('order'))setTab('physical');else if(params.has('place'))setTab('order');},[]);
 const visible=products.filter(p=>(category==='All gifts'||p.category===category)&&`${p.title} ${p.subtitle} ${p.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase())&&p.price<=(budget==='all'?Infinity:Number(budget)));
 return <div className="gift-center"><div className="page-heading"><div><p className="eyebrow">THOUGHTFUL STARTS WITH KNOWING THEM</p><h1>Gifts, made clear.</h1><p>Save an idea, send something digital, or plan a physical gift.</p></div><a className="outline-button" href="/together?tab=passport"><Heart size={16}/>Gift Passport</a></div>
 <Tabs value={tab} onValueChange={setTab}><TabsList className="together-tabs" aria-label="Gift categories">{[['ideas','Gift ideas'],['digital','Digital gifts'],['physical','Physical gifts'],['order','Order a gift']].map(([v,t])=><TabsTrigger key={v} value={v}>{t}</TabsTrigger>)}</TabsList></Tabs>
 {tab==='ideas'&&<><div className="gift-disclosure"><strong>Ideas only. Nothing is ordered or charged.</strong><p>These are sample ideas with illustrative budgets, not products offered by a connected seller. Save them to your wishlist or set a reminder.</p></div><div className="filter-chips">{['All gifts','Flowers','Personalized','Photography','Jewelry','Experiences'].map(x=><button key={x} className={category===x?'active':''} onClick={()=>setCategory(x)}>{x}</button>)}</div><div className="gift-filters"><label className="search-input"><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Flowers, coffee, a little adventure…" aria-label="Search gift ideas"/></label><Choice label="Idea budget" value={budget} onChange={setBudget} options={[{value:'all',label:'Any budget'},{value:'25',label:'Up to $25'},{value:'50',label:'Up to $50'},{value:'100',label:'Up to $100'}]}/></div><div className="product-grid">{visible.map(p=>{const saved=state.wishlist.some(w=>w.productId===p.id);return <article className="product-card" key={p.id}><button className="product-image" aria-label={'View idea: '+p.title} onClick={()=>onProduct(p)}><img src={p.image} alt={p.title}/></button><div><small>{p.category} · Idea only</small><h3>{p.title}</h3><p>{p.subtitle}</p><div className="product-price"><strong>{p.price?'Example budget: $'+p.price:'No purchase needed'}</strong></div><div className="button-row"><button className="outline-button" onClick={()=>void onWishlist(p)} aria-pressed={saved}><Bookmark size={14}/>{saved?'Saved · remove':'Save idea'}</button><button className="outline-button" onClick={()=>onPin({title:'Gift idea: '+p.title,type:'Gift',message:p.subtitle+'\nIdea only — no order has been placed.'})}><Pin size={14}/>Remind me</button></div></div></article>;})}</div>{!visible.length&&<EmptyState icon={Gift} title="No matching ideas" description="Try another category or budget." action={<button className="outline-button" onClick={()=>{setQ('');setCategory('All gifts');setBudget('all');}}>Reset filters</button>}/>}<p className="catalog-note">No verified stock, seller prices, ratings, or delivery promises. Saving an idea does not reserve it.</p>{state.orders.length>0&&<section className="card together-panel"><h2>Previous demo orders</h2><p>These were demonstrations only. Nothing was purchased or shipped.</p>{state.orders.map(o=><div className="together-history" key={o.id}><span>{o.title}<small>Demo record · no payment · no shipment</small></span></div>)}</section>}</>}
 {tab==='digital'&&<><div className="gift-disclosure"><strong>Digital only. Nothing is shipped.</strong><p>Animated gifts appear inside LoveLink for your connected partner. Digital books are downloads. Each gift below is a separate one-time purchase, not included in Together membership. Checkout availability is shown in the shop.</p></div><div className="concierge-grid">{SHOP_ITEMS.filter(i=>i.kind==='gift'||i.kind==='book').map(i=><article className="card together-panel" key={i.id}><span style={{fontSize:36}} aria-hidden="true">{i.emoji}</span><h2>{i.name}</h2><p>{i.description}</p><strong>{money(i.price)} · one time</strong><p className="together-muted">{i.kind==='gift'?'One send to your connected partner. Replay in the app.':'Downloadable document. You can print it yourself; no printed copy is delivered.'}</p><a className="outline-button" href={'/shop?item='+i.id}>Preview digital gift <ArrowRight size={16}/></a></article>)}</div><section className="card together-panel"><Mail size={22}/><h2>A letter can be enough.</h2><p>Write your own love letter for free, or use your Together membership to download a monthly memory book.</p><div className="button-row"><a className="outline-button" href="/letters">Write a free letter</a><a className="outline-button" href="/together?tab=book">Monthly memory book</a></div></section></>}
 {tab==='physical'&&<><SellerCatalog onPin={onPin}/><section className="card gift-physical-status"><Package size={34}/><p className="eyebrow">CLEAR PURCHASES</p><h2>Know who sends your gift.</h2><p>Purchase buttons appear only when the market is activated and the seller has completed payment onboarding. Ideas and unactivated listings cannot be ordered.</p><p>For each purchase, check:</p><ul><li>The seller and who fulfills your order</li><li>The item price, shipping, taxes, and final total</li><li>A seller-confirmed delivery estimate and tracking</li><li>Return, refund, and support information</li></ul><p className="together-muted">Physical gifts will be paid separately from your subscription. We will label external retailer links and disclose affiliate commissions if an approved partnership is added.</p><button className="outline-button" onClick={()=>setTab('ideas')}>Save a gift idea instead <ArrowRight size={16}/></button><a className="text-button" href="/seller">Apply to sell in India or the USA</a><a className="text-button" href="/concierge">Printed-keepsake requests</a><p className="together-muted">Requests are not orders and do not guarantee availability. No payment is collected for requests.</p></section></>}
 {tab==='order'&&<GiftCatalogOrder state={state}/>}
 </div>;
}
