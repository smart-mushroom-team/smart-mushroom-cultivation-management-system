'use strict';

/**
 * Helper cho test Identity: dựng TOÀN BỘ ứng dụng (routes -> controllers -> services -> repositories -> SQL)
 * trên PostgreSQL thật (PGlite) đã chạy đúng file migration. Không mock repository: SQL được kiểm thử thật.
 */
const bcrypt = require('bcryptjs');
const { createLogger, verifyAccessToken } = require('@mushroom/shared');
const { migratedDb, createPgliteDb } = require('@mushroom/shared/testing/pglite');
const { createApp } = require('../src/app');

const SECRET = 'test-secret-identity';
let seq = 0;

/** Đồng hồ giả: test có thể "tua" thời gian (hết hạn token, hết thời gian khóa) mà không phải chờ. */
function createClock() {
  let offset = 0;
  return {
    now: () => new Date(Date.now() + offset),
    advance(ms) {
      offset += ms;
    },
  };
}

async function setupApp(t, configOverrides = {}) {
  const pg = await migratedDb('identity');
  const db = createPgliteDb(pg);
  const logger = createLogger('test');
  logger.level = 'silent';
  const clock = createClock();
  const config = {
    jwtSecret: SECRET,
    jwtExpiresIn: '1h',
    refreshTokenTtlDays: 7,
    maxFailedLogins: 5,
    lockMinutes: 5,
    bcryptRounds: 4, // rẻ nhất để test nhanh
    ...configOverrides,
  };
  const server = createApp({ config, logger, db, clock }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    server.close();
    await pg.close();
  });

  /** Gọi API; trả { status, body } (body = JSON đã parse hoặc null). */
  async function api(path, { method = 'GET', token, body, headers = {} } = {}) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  /** Tạo người dùng trực tiếp bằng SQL (không qua API) để dựng bối cảnh cho test. */
  async function makeUser({
    name = 'Người Dùng',
    email,
    password = 'Password123',
    role = 'CUSTOMER',
    status = 'ACTIVE',
  } = {}) {
    seq += 1;
    const mail = email || `user${seq}-${Date.now()}@example.com`;
    const hash = await bcrypt.hash(password, 4);
    const rows = await db.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4::text::"Role", $5::text::"UserStatus") RETURNING id`,
      [name, mail, hash, role, status],
    );
    return { id: rows[0].id, email: mail, password, role, name };
  }

  /** Đăng nhập qua API, trả toàn bộ body (accessToken, refreshToken, user...). */
  async function login(email, password = 'Password123') {
    const r = await api('/auth/login', { method: 'POST', body: { email, password } });
    if (r.status !== 200)
      throw new Error(`Đăng nhập thất bại ${r.status}: ${JSON.stringify(r.body)}`);
    return r.body;
  }

  /** Tạo người dùng rồi đăng nhập, trả { user, token, refreshToken }. */
  async function makeLoggedIn(opts = {}) {
    const user = await makeUser(opts);
    const session = await login(user.email, user.password);
    return { ...user, token: session.accessToken, refreshToken: session.refreshToken };
  }

  return { api, base, db, clock, makeUser, login, makeLoggedIn, config };
}

const decode = (token) => verifyAccessToken(token, SECRET);

module.exports = { setupApp, decode, SECRET };
