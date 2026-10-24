import {requireChatGPTUser} from '../chatgpt-auth';
import AcceptInvite from './accept';

export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};

async function Content({token,code}:{token:string;code:string}){
 const next=token?'/invite?token='+encodeURIComponent(token):(code?'/invite?code='+encodeURIComponent(code):'/invite');
 await requireChatGPTUser(next);
 return <AcceptInvite token={token} code={code}/>;
}

export default async function Page({searchParams}:{searchParams:Promise<{token?:string;code?:string}>}){
 const {token,code}=await searchParams;
 return <Content token={token||''} code={code||''}/>;
}
