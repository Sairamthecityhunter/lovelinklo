import type {D1DatabaseLike} from './d1-postgres';

export type StoredObject = {body: ReadableStream<Uint8Array>};

export type ObjectStorage = {
 put(
  key: string,
  value: ArrayBuffer | ArrayBufferView | string,
  options?: {httpMetadata?: {contentType?: string}},
 ): Promise<void>;
 get(key: string, options?: {range?: {offset: number; length: number}}): Promise<StoredObject | null>;
 delete(keys: string | string[]): Promise<void>;
};

function toBuffer(value: ArrayBuffer | ArrayBufferView | string) {
 if (typeof value === 'string') return Buffer.from(value);
 if (value instanceof ArrayBuffer) return Buffer.from(value);
 return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
}

function streamFrom(buffer: Buffer) {
 return new ReadableStream<Uint8Array>({
  start(controller) {
   controller.enqueue(new Uint8Array(buffer));
   controller.close();
  },
 });
}

export function createObjectStorage(database: D1DatabaseLike): ObjectStorage {
 return {
  async put(key, value, options) {
   const content = toBuffer(value);
   const type = options?.httpMetadata?.contentType || 'application/octet-stream';
   await database.prepare(
    'INSERT INTO media_blobs (object_key, content, content_type) VALUES (?, ?, ?) ON CONFLICT (object_key) DO UPDATE SET content = excluded.content, content_type = excluded.content_type',
   ).bind(key, content, type).run();
  },
  async get(key, options) {
   const row = await database.prepare(
    'SELECT content, content_type FROM media_blobs WHERE object_key = ?',
   ).bind(key).first<{content: Buffer; content_type: string}>();
   if (!row) return null;
   const bytes = Buffer.isBuffer(row.content) ? row.content : Buffer.from(row.content);
   const slice = options?.range
    ? bytes.subarray(options.range.offset, options.range.offset + options.range.length)
    : bytes;
   return {body: streamFrom(slice)};
  },
  async delete(keys) {
   const list = Array.isArray(keys) ? keys : [keys];
   for (const key of list) {
    await database.prepare('DELETE FROM media_blobs WHERE object_key = ?').bind(key).run();
   }
  },
 };
}
