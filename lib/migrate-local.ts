import {env} from 'cloudflare:workers';
import {SCHEMA_STATEMENTS} from './schema-bootstrap';

let ready:Promise<void>|null=null;

export async function ensureLocalSchema(){
 if(!env.DB)return;
 if(!ready)ready=(async()=>{
  const users=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").first();
  if(!users){
   for(const sql of SCHEMA_STATEMENTS)await env.DB.prepare(sql).run();
   return;
  }
  const auth=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='auth_accounts'").first();
  if(auth)return;
  for(const sql of SCHEMA_STATEMENTS){
   if(sql.includes('auth_accounts')||sql.includes('auth_sessions'))await env.DB.prepare(sql).run();
  }
 })().catch(e=>{ready=null;throw e;});
 await ready;
}

export async function ensureAuthTables(){return ensureLocalSchema();}
