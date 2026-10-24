import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const script = fileURLToPath(new URL('./migrate-postgres.mjs', import.meta.url));
const result = spawnSync(process.execPath, [script], {stdio: 'inherit'});
process.exit(result.status ?? 1);
