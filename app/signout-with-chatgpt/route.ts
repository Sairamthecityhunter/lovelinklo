import {signOutResponse} from '@/lib/session-auth';

export const dynamic='force-dynamic';

export function GET(request:Request){
 return signOutResponse(request);
}

export function POST(request:Request){
 return signOutResponse(request);
}
