import * as downloadTarball from 'download-package-tarball';
import * as got from 'got';
import {IPackageParams} from './interfaces';

export async function downloadPackage(pkg: IPackageParams, directory: string) {
  let gotOpts: any = {};
  
  if (process.env.NPM_TOKEN.trim() && process.env.NPM_TOKEN.trim().length > 0) {
    gotOpts.headers = {authorization: `Bearer ${process.env.NPM_TOKEN.trim()}`};
  } else {
    gotOpts.auth = `${process.env.NPM_USER}:${process.env.NPM_PASSWORD}`;
  }
  
  if (!pkg.version.includes('.')) {
    const {body} = await got(`${process.env.NPM_REGISTRY}/${(pkg.scope) ? `${pkg.scope}/` : ''}${pkg.package}`, {
      ...gotOpts,
      json: true
    });
    pkg.version = body['dist-tags'][pkg.version];
  }
  
  await downloadTarball({
    url: `${process.env.NPM_REGISTRY}/${(pkg.scope) ? `${pkg.scope}/` : ''}${pkg.package}/-/${pkg.package}-${pkg.version}.tgz`,
    gotOpts: gotOpts,
    dir: directory
  });
}
