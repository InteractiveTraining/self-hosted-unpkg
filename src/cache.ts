import * as LRU from 'lru-cache';

export const cache = new LRU({
  max: 1024 * 1024 * 350,
  length: Buffer.byteLength as any,
  maxAge: 1000 * 60 * 10
});