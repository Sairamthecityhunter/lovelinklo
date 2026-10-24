import {createDatabase, databaseUrl, type D1DatabaseLike} from './d1-postgres';
import {createObjectStorage, type ObjectStorage} from './object-storage';

type RuntimeEnv = NodeJS.ProcessEnv & {
 DB?: D1DatabaseLike;
 BUCKET?: ObjectStorage;
};

const cache = globalThis as unknown as {
 __lovelinkDb?: D1DatabaseLike;
 __lovelinkBucket?: ObjectStorage;
};

function database() {
 if (!databaseUrl()) return undefined;
 if (!cache.__lovelinkDb) cache.__lovelinkDb = createDatabase();
 return cache.__lovelinkDb;
}

function bucket() {
 const db = database();
 if (!db) return undefined;
 if (!cache.__lovelinkBucket) cache.__lovelinkBucket = createObjectStorage(db);
 return cache.__lovelinkBucket;
}

export const env: RuntimeEnv = new Proxy(process.env as RuntimeEnv, {
 get(target, prop, receiver) {
  if (prop === 'DB') return database();
  if (prop === 'BUCKET') return bucket();
  return Reflect.get(target, prop, receiver);
 },
});
