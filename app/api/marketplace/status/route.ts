import {ensureUser,response,failure,ApiError} from '@/lib/server';
import {CONCIERGE_OWNER} from '@/lib/concierge-operator';
import {settings,checkoutMode} from '@/lib/shop-server';
import {marketplaceConfig} from '@/lib/marketplace-server';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const ctx=await ensureUser(request);if(ctx.userId!==CONCIERGE_OWNER)throw new ApiError(403,'Only the owner can inspect payment setup.');const v=settings(),c=marketplaceConfig();return response({digitalMode:checkoutMode(),physicalMode:c.enabled?c.mode:'disabled',countries:c.countries,feeBps:c.feeBps,checks:[{name:'Stripe merchant credential',ready:!!v.STRIPE_SECRET_KEY&&/^sk_(test|live)_/.test(v.STRIPE_SECRET_KEY)},{name:'Digital payment webhook',ready:!!v.STRIPE_WEBHOOK_SECRET},{name:'Connected-seller payment webhook',ready:!!v.STRIPE_CONNECT_WEBHOOK_SECRET},{name:'Approved domestic markets',ready:c.countries.length>0},{name:'Final commission configured',ready:c.feeBps!==null},{name:'Physical sales activated by owner',ready:v.MARKETPLACE_ENABLED==='true'}]});}catch(e){return failure(e);}}
