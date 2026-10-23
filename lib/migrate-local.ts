import {env} from '@/lib/cf-env';

let ready:Promise<void>|null=null;

export async function ensureLocalSchema(){
 const database=env.DB;
 if(!database)return;
 if(!ready)ready=(async()=>{
  const users=await database.prepare("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'").first();
  if(!users)throw new Error('Database schema is missing. Run `pnpm db:migrate` (or `npm run db:migrate`) against DATABASE_URL.');
  const auth=await database.prepare("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'auth_accounts'").first();
  if(!auth)throw new Error('Auth tables are missing. Run `pnpm db:migrate` against DATABASE_URL.');
  const extras=await database.prepare("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'couple_notes'").first();
  if(!extras)throw new Error('Couple tables are missing. Run `pnpm db:migrate` against DATABASE_URL.');
  const safety=await database.prepare("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partner_blocks'").first();
  if(!safety)throw new Error('Safety tables are missing. Run `pnpm db:migrate` against DATABASE_URL.');
 })().catch(e=>{ready=null;throw e;});
 await ready;
}

export async function ensureAuthTables(){return ensureLocalSchema();}
