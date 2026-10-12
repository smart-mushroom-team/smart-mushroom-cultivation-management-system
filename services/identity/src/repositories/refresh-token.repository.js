'use strict';

/** SQL của bảng refresh_tokens. Chỉ lưu BĂM SHA-256 của token, không bao giờ lưu token gốc. */

const iso = (d) => d.toISOString();

const map = (r) =>
  r && {
    id: r.id,
    userId: r.user_id,
    tokenHash: r.token_hash,
    expiresAt: r.expires_at,
    revokedAt: r.revoked_at,
  };

async function insert(db, { userId, tokenHash, expiresAt }) {
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1::text::uuid, $2, $3::text::timestamptz) RETURNING id`,
    [userId, tokenHash, iso(expiresAt)],
  );
}

async function findByHash(db, tokenHash) {
  const rows = await db.query(
    `SELECT id, user_id, token_hash, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = $1`,
    [tokenHash],
  );
  return map(rows[0]) || null;
}

/**
 * "Giành quyền" dùng token: chỉ thành công (trả 1) với MỘT request đầu tiên; request đồng thời thứ hai
 * thấy revoked_at đã có nên trả 0. Đây là chốt chặn dùng lại token khi xoay vòng refresh token.
 */
async function revokeIfActive(db, id, now) {
  const rows = await db.query(
    `UPDATE refresh_tokens SET revoked_at = $2::text::timestamptz
     WHERE id = $1::text::uuid AND revoked_at IS NULL RETURNING id`,
    [id, iso(now)],
  );
  return rows.length;
}

async function revokeAllForUser(db, userId, now) {
  const rows = await db.query(
    `UPDATE refresh_tokens SET revoked_at = $2::text::timestamptz
     WHERE user_id = $1::text::uuid AND revoked_at IS NULL RETURNING id`,
    [userId, iso(now)],
  );
  return rows.length;
}

async function revokeByHash(db, tokenHash, now) {
  const rows = await db.query(
    `UPDATE refresh_tokens SET revoked_at = $2::text::timestamptz
     WHERE token_hash = $1 AND revoked_at IS NULL RETURNING id`,
    [tokenHash, iso(now)],
  );
  return rows.length;
}

module.exports = { insert, findByHash, revokeIfActive, revokeAllForUser, revokeByHash };
