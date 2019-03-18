import * as express from 'express';
import * as fs from 'fs';
import * as cors from 'cors';
import * as compression from 'compression';
import * as helmet from 'helmet';
import {CloudflareChallenge} from '@interactivetraining/le-challenge-cloudflare';
import {IPackageParams} from './interfaces';
import {downloadPackage, getGCloudPrivateKey} from './helpers';
import {GCloudStoreCreate} from '@interactivetraining/le-store-gcloud-storage'
import * as http from 'http';

require('dotenv').config();

if (!fs.existsSync('cache')) fs.mkdirSync('cache');
if (!fs.existsSync('acme')) fs.mkdirSync('acme');

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
    
    if (!params.version) params.version = 'latest';
    
    const packagePath = `cache/${params.version}/${(params.scope) ? `${params.scope}/` : ``}${params.package}`;
    const filePath = `${packagePath}/${params['0']}`;
    
    if (!fs.existsSync(packagePath) || params.version === 'latest') {
      await downloadPackage({
        scope: params.scope,
        package: params.package,
        version: params.version
      }, `cache/${params.version}`);
    }
    
    console.log(`${(params.scope) ? `${params.scope}/` : ``}${params.package}@${params.version}: ${params['0']}`);
    
    res.setHeader('Cache-Control', (!params.version.includes('.')) ? 'no-cache' : 'public, max-age=31536000');
    res.sendFile(filePath, {root: `./`});
  } catch (e) {
    console.log(e);
    const status = (e.hasOwnProperty('statusCode')) ? e.statusCode : 500;
    const message = (e.hasOwnProperty('statusMessage')) ? e.statusMessage : e.message;
    res.status(status).send(message);
  }
});

if (process.env.ENABLE_SSL === "1") {
  require('greenlock-express').create({
    version: 'draft-11',
    server: 'https://acme-v02.api.letsencrypt.org/directory',
    //server: 'https://acme-staging-v02.api.letsencrypt.org/directory',
    email: process.env.LETS_ENCRYPT_EMAIL,
    agreeTos: (process.env.LETS_ENCRYPT_AGREE_TO_TOS.trim() === 'true'),
    approveDomains: [
      process.env.DOMAIN
    ],
    configDir: 'acme/',
    app: app,
    store: GCloudStoreCreate({
      bucketName: process.env.GOOGLE_CLOUD_BUCKET_NAME,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      dbFileName: process.env.GOOGLE_CLOUD_CERT_DB_FILE,
      privateKey: getGCloudPrivateKey(),
      clientEmail: process.env.GOOGLE_CLOUD_CLIENT_EMAIL
    }),
    challengeType: 'dns-01',
    challenge: new CloudflareChallenge({
      cloudflare: {
        email: process.env.CLOUDFLARE_EMAIL,
        key: process.env.CLOUDFLARE_API_KEY
      },
      acmePrefix: '_acme-challenge',
      verifyPropagation: {waitFor: 5000, retries: 50},
      useDNSOverHTTPS: false
    })
  }).listen(80, 443, () => console.log(`Listening...`));
} else {
  http.createServer(app).listen(80, () => console.log(`Listening...`));
}

