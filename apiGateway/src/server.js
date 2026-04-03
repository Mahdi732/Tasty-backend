import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { randomUUID } from 'crypto';
import { createProxyMiddleware } from 'http-proxy-middleware';
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

const getCorrelationId = (req) => {
  const incoming = req.headers['x-correlation-id'] || req.headers['x-request-id'];
  if (incoming) {
    return String(incoming);
  }
  return randomUUID();
};

const socketProxy = createProxyMiddleware({
  target: env.NOTIFICATION_SOCKET_TARGET,
  changeOrigin: true,
  ws: true,
  xfwd: true,
  secure: false,
  on: {
    proxyReq: (proxyReq, req) => {
      const correlationId = getCorrelationId(req);
      proxyReq.setHeader('x-correlation-id', correlationId);
      proxyReq.setHeader('x-request-id', correlationId);
    },
    proxyReqWs: (proxyReq, req) => {
      const correlationId = getCorrelationId(req);
      proxyReq.setHeader('x-correlation-id', correlationId);
      proxyReq.setHeader('x-request-id', correlationId);
    },
  },
});

app.use('/socket.io', socketProxy);

const attachSocketUpgradeProxy = (server) => {
  server.on('upgrade', (req, socket, head) => {
    if (!req.url?.startsWith('/socket.io')) {
      return;
    }

    const correlationId = getCorrelationId(req);
    req.headers['x-correlation-id'] = correlationId;
    req.headers['x-request-id'] = correlationId;
    socketProxy.upgrade(req, socket, head);
  });
};

const httpsServer = https.createServer({ key, cert }, app);
attachSocketUpgradeProxy(httpsServer);

httpsServer.listen(env.PORT, () => {
  logger.info({ port: env.PORT, socketTarget: env.NOTIFICATION_SOCKET_TARGET }, 'api_gateway_https_started');
});

if (env.NODE_ENV !== 'production') {
  const httpServer = http.createServer(app);
  attachSocketUpgradeProxy(httpServer);
  httpServer.listen(env.HTTP_REDIRECT_PORT, () => {
    logger.info({ port: env.HTTP_REDIRECT_PORT }, 'api_gateway_http_started_for_local_dev');
  });
}
