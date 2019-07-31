import {IPackageParams} from './interfaces';
import * as https from "https";
import {RequestOptions} from "https";
import * as gunzipMaybe from 'gunzip-maybe';
import * as tar from 'tar-stream';
import {Extract} from 'tar-stream';
import * as http from "http";
import {cache} from './cache';

export function getRegistryOptions(): RequestOptions {
  let options: RequestOptions = {};
  
  if (process.env.NPM_TOKEN.trim() && process.env.NPM_TOKEN.trim().length > 0) {
    options.headers = {authorization: `Bearer ${process.env.NPM_TOKEN.trim()}`};
  } else {
    options.auth = `${process.env.NPM_USER}:${process.env.NPM_PASSWORD}`;
  }
  
  return options;
}

export function getPackageUrl(pkg: IPackageParams): string {
  return `${process.env.NPM_REGISTRY}/${(pkg.scope) ? `${pkg.scope}/` : ''}${pkg.package}`;
}

export function getCacheKey(pkg: IPackageParams): string {
  return `cache/${(pkg.scope) ? `${pkg.scope}/` : ''}${pkg.package}/${pkg.version}/`;
}

export async function getLatestVersion(pkg: IPackageParams): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(getPackageUrl(pkg), getRegistryOptions(), (res) => {
      if (res.statusCode !== 200) {
        reject({statusCode: res.statusCode, statusMessage: res.statusMessage});
        return;
      }
      
      let body = '';
      res.on('data', (e: Buffer) => body += e.toString('utf-8'));
      res.on('end', () => {
        const tags = JSON.parse(body)['dist-tags'];
        resolve(tags[pkg.version] || tags['latest']);
      });
    })
  });
}

export async function downloadFile(pkg: IPackageParams): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const cachePath = getCacheKey(pkg);
    
    if (!cache.has(cachePath + pkg['0'])) {
      const extract = await downloadPackage(pkg);
      
      extract.on('entry', (header, stream: NodeJS.ReadableStream, next) => {
        let fileContent = '';
        stream.on('data', (e: Buffer) => fileContent += e.toString('utf-8'));
        stream.on('end', () => {
          cache.set(cachePath + (header.name as string).slice('package/'.length), fileContent);
          
          if ((header.name as string).slice('package/'.length) === pkg['0']) {
            resolve(fileContent);
          }
          next();
        });
        
        stream.resume();
      });
      
      extract.on('finish', () => reject({statusCode: 404, statusMessage: 'Not found'}));
    } else {
      console.log('--from cache---', cache.itemCount);
      resolve((cache.get(cachePath + pkg['0']) as string));
    }
  });
}

export async function downloadPackage(pkg: IPackageParams): Promise<Extract> {
  return new Promise(async (resolve, reject) => {
    const extract = tar.extract();
    
    https.get(`${getPackageUrl(pkg)}/-/${pkg.package}-${pkg.version}.tgz`, getRegistryOptions(), (res: http.IncomingMessage) => {
      if (res.statusCode !== 200) {
        reject({statusCode: res.statusCode, statusMessage: res.statusMessage});
        return;
      }
      
      res.pipe(gunzipMaybe()).pipe(extract);
      resolve(extract);
    }).on('error', (e) => {
      reject();
      console.error(e);
    });
  });
}

export async function getPackageFileList(pkg: IPackageParams): Promise<string | string[]> {
  return new Promise(async resolve => {
    const extract = await downloadPackage(pkg);
    const arr = [];
    
    extract.on('entry', (header, stream: NodeJS.ReadableStream, next) => {
      arr.push((header.name as string).slice('package/'.length));
      next();
      stream.resume();
    });
    
    extract.on('finish', () => resolve(arr));
  });
}

export function jsonEscape(str: string) {
  return str.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
}

/**
 * Converts all \n to new lines and returns key.
 * (solves issue only found when loaded using kubernetes secrets)
 */
export function getGCloudPrivateKey() {
  const obj = JSON.parse(jsonEscape('{"k": "' + process.env.GOOGLE_CLOUD_PRIVATE_KEY.trim() + '"}'));
  return obj.k;
}