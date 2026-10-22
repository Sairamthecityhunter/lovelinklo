import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(import.meta.resolve('wrangler'));
const {Miniflare}=require('miniflare');

const mf=new Miniflare({
 modules:true,
 script:'export default { fetch(){ return new Response("ok"); } }',
 compatibilityDate:'2026-05-15',
 compatibilityFlags:['nodejs_compat'],
 d1Databases:{DB:'00000000-0000-4000-8000-000000000000'},
 persist:path.join(root,'.wrangler','state'),
});

try{
 const database=await mf.getD1Database('DB');
 const files=(await fs.readdir(path.join(root,'drizzle'))).filter(f=>f.endsWith('.sql')).sort();
 for(const file of files){
  const sql=await fs.readFile(path.join(root,'drizzle',file),'utf8');
  for(const statement of sql.split('--> statement-breakpoint')){
   if(statement.trim())await database.prepare(statement).run();
  }
  console.log('applied',file);
 }
 const tables=await database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users','auth_accounts','auth_sessions') ORDER BY name").all();
 console.log('tables',tables.results.map(r=>r.name).join(', '));
}finally{
 await mf.dispose();
}
