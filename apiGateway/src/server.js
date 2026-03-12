import fs from 'fs';
import path from 'path';
import https from 'https';
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

const resolvePath = (p) => (path.isAbsolute(p) ? p : path.resolve(process.cwd(), p));

const keyPath = resolvePath(env.SSL_KEY_PATH);
const certPath = resolvePath(env.SSL_CERT_PATH);

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  throw new Error('TLS certificates not found. Run: npm run certs:generate in apiGateway');
}

const key = fs.readFileSync(keyPath);
const cert = fs.readFileSync(certPath);

const app = buildApp();
const server = https.createServer({ key, cert }, app);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'api_gateway_https_started');
});
