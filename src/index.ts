require('dotenv').config();

import {IPackageParams} from './interfaces';
import {AcmeClient} from '@interactivetraining/acme-client';
import {downloadFile, getGCloudPrivateKey, getLatestVersion, getPackageFileList} from './helpers';
import * as express from 'express';
import * as compression from 'compression';
import * as helmet from 'helmet';
import * as http from 'http';
import * as https from 'https';
import * as mime from 'mime-types';

(async () => {
  const app = express();
  
  app.use(helmet());
  app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', "true");
    return next();
  });
  app.use(compression());
  app.use(require('cookie-parser')());
  
  app.get(['/:scope?/:package@:version/*', '/:scope?/:package/*'], async (req, res) => {
    try {
      let params: IPackageParams = (req.params as any);
      params.query = (req.query as any) || {};
      const includeFetchPatch = !!(params.query.npmrc && req.path.split('.').pop() === 'js');
      
      if (params.query.npmrc) {
        res.cookie('npmrc', params.query.npmrc);
      } else if (req.cookies.npmrc) {
        params.query.npmrc = req.cookies.npmrc;
      }
      
      if (params.query.npmrc === process.env.NPM_TOKEN) params.query.npmrc = undefined;
      
      // correct the params.package value when there isn't a scope or version provided
      if (!params.version && params.scope && !req.url.split('/')[1].includes('@')) {
        params.package = params.scope;
        params.scope = undefined;
      }
      
      if (!params.version) {
        params.version = 'latest';
      }
      
      if (!params.version.includes('.')) {
        params.version = await getLatestVersion(params);
        res.setHeader('Cache-Control', 'no-cache');
        res.redirect(302, `/${(params.scope) ? `${params.scope}/` : ``}${params.package}@${params.version}/${params['0']}`);
        return;
      }
      
      if (process.env.LOG_REQUEST && process.env.LOG_REQUEST.toLowerCase() === "true") {
        console.log(`request(${(req.headers && req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'] : ''}): ${(params.scope) ? `${params.scope}/` : ``}${params.package}@${params.version} - ${params['0']}`);
      }
      
      let prependFetchPatch = includeFetchPatch ? `
      var oldFectch = fetch;
  self.fetch = function (input, init) {
    if (!init) init = {};
    init.credentials = "include";
    return oldFectch(input, init);
  }
  ` : ``;
      
      res.setHeader('Cache-Control', `${(params.query && params.query.npmrc) ? `private` : `public`}, max-age=31536000`);
      
      // if file path is empty - respond with directory listing
      if (params['0'] === '') {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(await getPackageFileList(params));
      } else {
        res.setHeader('Content-Type', mime.lookup(params['0']));
        res.status(200).send(prependFetchPatch + (await downloadFile(params)));
      }
    } catch (e) {
      const status = (e && e.hasOwnProperty('statusCode')) ? e.statusCode : 500;
      const message = (e && e.hasOwnProperty('statusMessage')) ? e.statusMessage : 'unknown error';
      if (status === 500) console.error(e);
      res.status(status).send(message);
    }
  });
  
  if (process.env.ENABLE_SSL === "1") {
    const acmeClient = await new AcmeClient({
      domain: process.env.DOMAIN,
      email: process.env.LETS_ENCRYPT_EMAIL,
      googleCloud: {
        bucketName: process.env.GOOGLE_CLOUD_SSL_BUCKET_NAME,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        credentials: {
          email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
          privateKey: getGCloudPrivateKey()
        }
      },
      cloudflare: {
        email: process.env.CLOUDFLARE_EMAIL,
        apiKey: process.env.CLOUDFLARE_API_KEY
      },
      fileNames: {
        cert: `${process.env.DOMAIN}-cert.pem`,
        caCert: `${process.env.DOMAIN}-caCert.pem`,
        privateKey: `${process.env.DOMAIN}-private-key.pem`,
        accountKey: `${process.env.DOMAIN}-account-key.pem`
      },
      acmeServer: 'prod',
      agreeTerms: (process.env.LETS_ENCRYPT_AGREE_TO_TOS.trim() === 'true')
    }).getCert();
    https.createServer(acmeClient, app).listen(443, () => console.log(`Listening...`));
  } else {
    http.createServer(app).listen(process.env.PORT || 8080, () => console.log(`Listening...`));
  }
})();

