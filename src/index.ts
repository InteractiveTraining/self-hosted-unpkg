require('dotenv').config();

import * as express from 'express';
import * as cors from 'cors';
import * as compression from 'compression';
import * as helmet from 'helmet';
import {downloadFile, getGCloudPrivateKey, getLatestVersion, getPackageFileList} from './helpers';
import * as http from 'http';
import * as https from 'https';
import {IPackageParams} from './interfaces';
import * as mime from 'mime-types';
import {AcmeClient} from '@interactivetraining/acme-client';

(async () => {
  const app = express();
  
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  
  app.get(['/:scope?/:package@:version/*', '/:scope?/:package/*'], async (req, res) => {
    try {
      let params: IPackageParams = req.params;
      
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
      
      console.log(`request: ${(params.scope) ? `${params.scope}/` : ``}${params.package}@${params.version} - ${params['0']}`);
      
      // cache for 1 year
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      
      // if file path is empty - respond with directory listing
      if (params['0'] === '') {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(await getPackageFileList(params));
      } else {
        const file = await downloadFile(params);
        
        res.setHeader('Content-Type', mime.lookup(params['0']));
        res.status(200).send(file);
      }
    } catch (e) {
      console.log(e);
      const status = (e && e.hasOwnProperty('statusCode')) ? e.statusCode : 500;
      const message = (e && e.hasOwnProperty('statusMessage')) ? e.statusMessage : 'unknown error';
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
    http.createServer(app).listen(process.env.HTTP_PORT, () => console.log(`Listening...`));
  }
})();

