import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');
const gatewayUrl = (process.env.BFF_GATEWAY_URL ?? 'http://localhost:8080').replace(/\/$/, '');
const isProduction = process.env.NODE_ENV === 'production';
const sessionCookie = 'srs_bff_session';
const sessionTtlSeconds = 8 * 60 * 60;
const sessions = new Map();

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => part.trim().split('='))
    .filter(([key, value]) => key && value)
    .map(([key, ...value]) => [key, decodeURIComponent(value.join('='))]));
}

function serializeSessionCookie(value, maxAge = sessionTtlSeconds) {
  const secure = process.env.BFF_COOKIE_SECURE === 'true' ? '; Secure' : '';
  return `${sessionCookie}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

function getSession(req) {
  const id = parseCookies(req.headers.cookie)[sessionCookie];
  const session = id ? sessions.get(id) : undefined;
  if (session?.expiresAt && session.expiresAt < Date.now()) { sessions.delete(id); return null; }
  return id ? { id, session } : null;
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > 2 * 1024 * 1024) reject(new Error('Payload too large')); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

async function gatewayRequest(pathname, { method = 'GET', body, accessToken, refreshToken } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(`${gatewayUrl}${pathname}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const data = await response.json().catch(() => undefined);
  return { response, data };
}

async function refreshSession(session) {
  const result = await gatewayRequest('/api/identity/auth/refresh', { method: 'POST', body: { refreshToken: session.refreshToken } });
  if (!result.response.ok) return false;
  session.accessToken = result.data.accessToken;
  session.refreshToken = result.data.refreshToken;
  return true;
}

async function gatewayWithSession(session, pathname, options = {}) {
  let result = await gatewayRequest(pathname, { ...options, accessToken: session.accessToken });
  if (result.response.status === 401 && await refreshSession(session)) {
    result = await gatewayRequest(pathname, { ...options, accessToken: session.accessToken });
  }
  return result;
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(data === undefined ? '' : JSON.stringify(data));
}

function clearSession(res, id) {
  if (id) sessions.delete(id);
  res.setHeader('Set-Cookie', serializeSessionCookie('', 0));
}

async function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.post('/bff/auth/login', async (req, res) => {
    try {
      const body = await parseJsonBody(req);
      const result = await gatewayRequest('/api/identity/auth/login', { method: 'POST', body });
      if (!result.response.ok) return sendJson(res, result.response.status, result.data);
      if (!['ADMIN', 'OPERATOR'].includes(result.data.user?.role)) return sendJson(res, 403, { error: { code: 'FORBIDDEN', message: 'Web chỉ dành cho Admin và Operator' } });
      const id = crypto.randomBytes(32).toString('base64url');
      sessions.set(id, { accessToken: result.data.accessToken, refreshToken: result.data.refreshToken, user: result.data.user, expiresAt: Date.now() + sessionTtlSeconds * 1000 });
      res.setHeader('Set-Cookie', serializeSessionCookie(id));
      return sendJson(res, 200, { user: result.data.user, expiresIn: result.data.expiresIn });
    } catch (error) { return sendJson(res, 502, { error: { code: 'BFF_ERROR', message: error.message } }); }
  });

  app.get('/bff/auth/me', async (req, res) => {
    const current = getSession(req);
    if (!current?.session) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' } });
    const result = await gatewayWithSession(current.session, '/api/identity/me');
    if (!result.response.ok) { clearSession(res, current.id); return sendJson(res, result.response.status, result.data); }
    current.session.user = result.data;
    return sendJson(res, 200, result.data);
  });

  app.post('/bff/auth/logout', async (req, res) => {
    const current = getSession(req);
    if (current?.session) await gatewayRequest('/api/identity/auth/logout', { method: 'POST', body: { refreshToken: current.session.refreshToken } }).catch(() => undefined);
    clearSession(res, current?.id);
    res.statusCode = 204; res.end();
  });

  app.use('/bff/api', async (req, res) => {
    const current = getSession(req);
    if (!current?.session) return sendJson(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' } });
    let body;
    try { body = ['GET', 'HEAD'].includes(req.method) ? undefined : await parseJsonBody(req); } catch (error) { return sendJson(res, 400, { error: { code: 'BAD_REQUEST', message: error.message } }); }
    const pathname = `/api${req.originalUrl.slice('/bff/api'.length)}`;
    const result = await gatewayWithSession(current.session, pathname, { method: req.method, body });
    if (result.response.status === 401) clearSession(res, current.id);
    return sendJson(res, result.response.status, result.data);
  });

  if (isProduction) {
    app.use(express.static(path.join(webRoot, 'dist')));
    app.use((_req, res) => res.sendFile(path.join(webRoot, 'dist', 'index.html')));
  } else {
    const vite = await createViteServer({ root: webRoot, server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
  return app;
}

const app = await createApp();
const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Web BFF listening on http://localhost:${port}`));
