import * as Redis from 'ioredis';
import {IPackageParams} from './interfaces';

const redisConnection = () => {
  return (process.env.REDIS_PORT && process.env.REDIS_HOST && process.env.REDIS_PORT.trim().length > 1 && process.env.REDIS_HOST.trim().length > 1)
    ? new Redis({
      port: parseInt(process.env.REDIS_PORT),
      host: process.env.REDIS_HOST,
      password: process.env.REDIS_PASSWORD
    }) : undefined;
};

const redis = redisConnection();
const sub = redisConnection();
if (sub) sub.subscribe("unpkg_download");

let onDownloadPromises: { key: string, resolver: any }[] = [];

sub.on("message", (channel: string, message: string) => {
  if (channel === 'unpkg_download') {
    let findResolver = onDownloadPromises.filter(el => el.key === message);
    if (findResolver) {
      findResolver.map(async (el, c) => {
        el.resolver(await Cache.get(el.key));
        if (c === findResolver.length - 1) {
          onDownloadPromises = onDownloadPromises.filter(r => !(findResolver.find(t => t.resolver === r.resolver)));
        }
      })
    }
  }
});

export class Cache {
  static get(key: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      if (!redis) resolve(null);
      redis.get(key, (err, result) => {
        (err) ? reject(err) : resolve(result);
      });
    })
  }
  
  static async set(key: string, value: any, expireSeconds: number = 0): Promise<string> {
    if (!redis) return;
    let set = await redis.set(key, value, 'EX', expireSeconds);
    await redis.publish("unpkg_download", key);
    return set;
  }
  
  static onDownload(key: string, resolver) {
    if (!redis) return;
    onDownloadPromises.push({key: key, resolver: resolver});
  }
  
  static removeIsDownloading(pkg: IPackageParams): Promise<number> {
    if (!redis) return;
    console.log('---DONE DOWNLOADING---', `${(pkg.scope) ? `${pkg.scope}/` : ''}${pkg.package}@${pkg.version}`);
    return redis.del(`is_downloading_${process.env.CACHE_PREFIX}/cache/${(pkg.scope) ? `${pkg.scope}/` : ''}${pkg.package}/${pkg.version}`);
  }
  
  static checkIsDownloading(pkg: IPackageParams): Promise<string> {
    if (!redis) return;
    return this.get(`is_downloading_${process.env.CACHE_PREFIX}/cache/${(pkg.scope) ? `${pkg.scope}/` : ''}${pkg.package}/${pkg.version}`);
  }
  
  static addIsDownloading(pkg: IPackageParams): Promise<string> {
    if (!redis) return;
    console.log('---DOWNLOADING---', `${(pkg.scope) ? `${pkg.scope}/` : ''}${pkg.package}@${pkg.version}`);
    return redis.set(`is_downloading_${process.env.CACHE_PREFIX}/cache/${(pkg.scope) ? `${pkg.scope}/` : ''}${pkg.package}/${pkg.version}`, '1');
  }
  
  static buildKey(pkg: IPackageParams): string {
    return `${process.env.CACHE_PREFIX}/cache/${(pkg.scope) ? `${pkg.scope}/` : ''}${pkg.package}/${pkg.version}/${pkg['0']}`;
  }
}