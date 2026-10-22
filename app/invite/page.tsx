import {requireChatGPTUser} from '../chatgpt-auth';
import AcceptInvite from './accept';
export const dynamic='force-dynamic';
async function Content({token}:{token:string}){await requireChatGPTUser('/invite?token='+encodeURIComponent(token));return <AcceptInvite token={token}/>;}
export default async function Page({searchParams}:{searchParams:Promise<{token?:string}>}){const {token}=await searchParams;return <Content token={token||''}/>;}
