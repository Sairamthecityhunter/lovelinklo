import {db,response,failure,ApiError} from '@/lib/server';
import {fulfillInstallmentSession,fulfillPlusSession,syncPlusSubscription} from '@/lib/payment-plans-server';
import {verifyWebhook,billingMode,fulfill,syncSubscription} from '@/lib/shop-server';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{const raw=await request.text();if(raw.length>500000)throw new ApiError(413,'Payload too large.');const event=await verifyWebhook(raw,request.headers.get('stripe-signature'));if(typeof event.id!=='string'||!event.data?.object)throw new ApiError(400,'Invalid event.');if(!!event.livemode!==(billingMode()==='live'))throw new ApiError(400,'Payment mode mismatch.');const database=db();if(await database.prepare('SELECT id FROM shop_webhook_events WHERE id=?').bind(event.id).first())return response({received:true});const object=event.data.object;
 if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
  if(object.metadata?.kind==='plus')await fulfillPlusSession(object);
  else if(object.metadata?.kind==='gift_installment')await fulfillInstallmentSession(object);
  else await fulfill(object.id);
 }
 else if(event.type.startsWith('customer.subscription.')){
  if(object.metadata?.kind==='plus')await syncPlusSubscription(object);
  else await syncSubscription(object.id);
 }
 else if(event.type==='checkout.session.expired')await database.prepare("UPDATE shop_orders SET status='expired' WHERE session_id=? AND status='pending'").bind(object.id).run();
 else if(event.type==='charge.refunded'||event.type==='charge.dispute.created'){const payment=typeof object.payment_intent==='string'?object.payment_intent:null;if(payment){const status=event.type==='charge.refunded'?'refunded':'disputed';await database.batch([database.prepare('UPDATE shop_orders SET status=? WHERE payment_id=?').bind(status,payment),database.prepare('DELETE FROM shop_gifts WHERE order_id IN (SELECT id FROM shop_orders WHERE payment_id=?)').bind(payment)]);}}
 await database.prepare('INSERT INTO shop_webhook_events (id,created_at) VALUES (?,?) ON CONFLICT DO NOTHING').bind(event.id,Date.now()).run();return response({received:true});
 }catch(e){return failure(e);}}
