import * as Redis from 'ioredis';
import {IPackageParams} from './interfaces';

const redis = (process.env.REDIS_PORT && process.env.REDIS_HOST) ? new Redis({
  port: parseInt(process.env.REDIS_PORT),
  host: process.env.REDIS_HOST,
  password: process.env.REDIS_PASSWORD
}) : undefined;

export class Cache {
  static get(key: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      if (!redis) resolve(null);
      redis.get(key, (err, result) => {
        (err) ? reject(err) : resolve(result);
      });
    })
  }
  
  static set(key: string, value: any, expireSeconds: number = 0): Promise<string> {
    if (!redis) return;
    return redis.set(key, value, 'EX', expireSeconds);
  }
  
  static buildKey(pkg: IPackageParams): string {
    return `${process.env.CACHE_PREFIX}/cache/${(pkg.scope) ? `${pkg.scope}/` : ''}${pkg.package}/${pkg.version}/${pkg['0']}`;
  }
}