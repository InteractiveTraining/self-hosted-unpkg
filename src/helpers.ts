import {IPackageParams, TreeNode} from './interfaces';
import * as https from "https";
import {RequestOptions} from "https";
import * as gunzipMaybe from 'gunzip-maybe';
import * as mime from 'mime-types';
import * as tar from 'tar-stream';
import {storage} from './storage';
import {File} from '@google-cloud/storage';

export function getRegistryOptions() {
  let options: RequestOptions = {};
  
  if (process.env.NPM_TOKEN.trim() && process.env.NPM_TOKEN.trim().length > 0) {
    options.headers = {authorization: `Bearer ${process.env.NPM_TOKEN.trim()}`};
  } else {
    options.auth = `${process.env.NPM_USER}:${process.env.NPM_PASSWORD}`;
  }
  
  return options;
}

export async function getLatestVersion(pkg: IPackageParams): Promise<string> {
  return new Promise(resolve => {
    https.get(`${process.env.NPM_REGISTRY}/${(pkg.scope) ? `${pkg.scope}/` : ''}${pkg.package}`, getRegistryOptions(), (res) => {
      let body = '';
      res.on('data', (e: Buffer) => body += e.toString('utf-8'));
      res.on('end', () => resolve(JSON.parse(body)['dist-tags'][pkg.version]));
    })
  });
}

export async function downloadPackage(pkg: IPackageParams) {
  return new Promise(async resolve => {
    const cachePath = `cache/${(pkg.scope) ? `${pkg.scope}/` : ''}${pkg.package}/${pkg.version}/`;
    const registryUrl = `${process.env.NPM_REGISTRY}/${(pkg.scope) ? `${pkg.scope}/` : ''}${pkg.package}/-/${pkg.package}-${pkg.version}.tgz`;
    const extract = tar.extract();
    
    extract.on('entry', (header, stream: NodeJS.ReadableStream, next) => {
      let fileContent = '';
      stream.on('data', (e: Buffer) => fileContent += e.toString('utf-8'));
      stream.on('end', () => {
        storage
          .bucket(process.env.GOOGLE_CLOUD_CACHE_BUCKET_NAME)
          .file(cachePath + header.name)
          .save(fileContent, {
            contentType: mime.lookup(header.name),
            metadata: {
              cacheControl: 'public, max-age=31536000'
            },
            public: true,
            origin: '*'
          }).then(() => {
          console.log('cached: ' + cachePath + header.name);
          if ((header.name as string).slice('package/'.length) === pkg['0']) resolve();
        }).catch(reason => console.error('failed: ' + cachePath + header.name, reason));
        
        next();
      });
      
      stream.resume();
    });
    
    //extract.on('finish', () => {});
    
    https.get(registryUrl, getRegistryOptions(), (res) => res.pipe(gunzipMaybe()).pipe(extract)).on('error', (e) => console.error(e));
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

// https://stackoverflow.com/a/51012811
export function filesToTreeNodes(arr: Partial<File>[]): TreeNode[] {
  let tree: any = {};
  
  function addnode(obj: File) {
    let splitpath = obj.name.replace(/^\/|\/$/g, "").split('/');
    let ptr = tree;
    for (let i = 0; i < splitpath.length; i++) {
      let node: any = {
        name: splitpath[i],
        isDirectory: true
      };
      if (i == splitpath.length - 1) {
        node.isDirectory = false;
        node.size = obj.metadata.size;
      }
      ptr[splitpath[i]] = ptr[splitpath[i]] || node;
      ptr[splitpath[i]].children = ptr[splitpath[i]].children || {};
      ptr = ptr[splitpath[i]].children;
    }
  }
  
  function objectToArr(node: TreeNode) {
    Object.keys(node || {}).map((k) => {
      if (node[k].children) {
        objectToArr(node[k]);
      }
    });
    if (node.children) {
      node.children = Object.values(node.children);
      node.children.forEach(objectToArr);
    }
  }
  
  arr.map(addnode);
  objectToArr(tree);
  return Object.values(tree);
}