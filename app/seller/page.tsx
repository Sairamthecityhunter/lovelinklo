import {getChatGPTUser} from '../chatgpt-auth';
import {SellerPortal} from './seller-portal';
export const dynamic='force-dynamic';
export const metadata={title:'LoveLink Sellers — India & USA',description:'Prepare thoughtful products for LoveLink. Private seller applications, product drafts, pricing guidance, and owner review.'};
export default async function Page(){const user=await getChatGPTUser();return <SellerPortal signedIn={!!user}/>;}
