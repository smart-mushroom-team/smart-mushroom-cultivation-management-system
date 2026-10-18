'use strict';

const { conflict, isUniqueViolation } = require('@mushroom/shared');
const { toUserDto } = require('../utils/dto');
const errors = require('../errors');

const ROLE_CUSTOMER = 'CUSTOMER';

/**
 * Nghiệp vụ xác thực: đăng ký, đăng nhập (khóa tạm khi sai nhiều lần), làm mới/thu hồi token.
 * Service KHÔNG biết gì về Express (req/res); chỉ nhận dữ liệu thuần và ném AppError.
 * Mọi phụ thuộc được truyền vào (DI) nên test thay được DB, đồng hồ, bộ băm...
 */
function createAuthService({ db, userRepo, tokenRepo, passwords, tokens, config, logger, clock }) {
  /** Cấp cặp token mới và lưu băm refresh token. Chạy được trong giao dịch (truyền tx). */
  async function issuePair(conn, user, now) {
    const access = tokens.signAccess(user);
    const refresh = tokens.newRefresh(now);
    await tokenRepo.insert(conn, {
      userId: user.id,
      tokenHash: refresh.hash,
      expiresAt: refresh.expiresAt,
    });
    return {
      accessToken: access.accessToken,
      refreshToken: refresh.token,
      expiresIn: access.expiresIn,
    };
  }

  return {
    /** FR-03: khách tự đăng ký. Vai trò luôn là CUSTOMER, không nhận từ client. */
    async register(input) {
      const passwordHash = await passwords.hash(input.password);
      try {
        const user = await userRepo.insert(db, {
          name: input.name,
          email: input.email,
          passwordHash,
          role: ROLE_CUSTOMER,
          phone: input.phone ?? null,
          address: input.address ?? null,
        });
        logger.info({ userId: user.id }, 'Đăng ký tài khoản mới');
        return toUserDto(user);
      } catch (err) {
        if (isUniqueViolation(err)) throw conflict('Email đã được đăng ký');
        throw err;
      }
    },

    /** FR-02, UC-01. */
    async login({ email, password }) {
      const user = await userRepo.findByEmail(db, email);
      if (!user) {
        await passwords.compareDummy(password); // chống dò email qua thời gian phản hồi
        throw errors.invalidCredentials();
      }

      const now = clock.now();
      if (user.lockedUntil && user.lockedUntil > now) {
        throw errors.accountLocked(user.lockedUntil, now); // đang khóa: không kiểm mật khẩu
      }

      if (!(await passwords.compare(password, user.passwordHash))) {
        const state = await userRepo.recordFailedLogin(db, user.id, {
          maxFailures: config.maxFailedLogins,
          lockedUntil: new Date(now.getTime() + config.lockMinutes * 60 * 1000),
        });
        if (state.lockedUntil && state.lockedUntil > now) {
          logger.warn({ userId: user.id }, 'Tài khoản bị khóa tạm do sai mật khẩu nhiều lần');
          throw errors.accountLocked(state.lockedUntil, now);
        }
        throw errors.invalidCredentials();
      }

      // Chỉ báo "bị vô hiệu hóa" SAU KHI mật khẩu đúng, để không lộ trạng thái tài khoản cho người lạ.
      if (user.status !== 'ACTIVE') throw errors.accountDisabled();

      await userRepo.recordSuccessfulLogin(db, user.id, now);
      const pair = await issuePair(db, user, now);
      return { ...pair, user: toUserDto({ ...user, lastLoginAt: now }) };
    },

    /**
     * Làm mới token với XOAY VÒNG: mỗi refresh token chỉ dùng được một lần.
     * Dùng lại token đã thu hồi => nghi bị đánh cắp => thu hồi TOÀN BỘ token của người dùng.
     *
     * Lưu ý quan trọng: bên trong db.transaction chỉ TRẢ KẾT QUẢ, KHÔNG ném lỗi. Nếu ném lỗi thì
     * giao dịch bị ROLLBACK và việc thu hồi token (revokeAllForUser) sẽ bị hủy mất.
     */
    async refresh({ refreshToken }) {
      const now = clock.now();
      const tokenHash = tokens.hash(refreshToken);

      const outcome = await db.transaction(async (tx) => {
        const stored = await tokenRepo.findByHash(tx, tokenHash);
        if (!stored) return { error: 'INVALID' };

        if (stored.revokedAt) {
          await tokenRepo.revokeAllForUser(tx, stored.userId, now);
          return { error: 'REUSED', userId: stored.userId };
        }
        if (stored.expiresAt <= now) return { error: 'INVALID' };

        const user = await userRepo.findById(tx, stored.userId);
        if (!user) return { error: 'INVALID' };
        if (user.status !== 'ACTIVE') {
          await tokenRepo.revokeAllForUser(tx, user.id, now);
          return { error: 'DISABLED' };
        }

        // Giành quyền dùng token; request đồng thời thứ hai sẽ thua ở đây
        if ((await tokenRepo.revokeIfActive(tx, stored.id, now)) === 0) {
          await tokenRepo.revokeAllForUser(tx, user.id, now);
          return { error: 'REUSED', userId: user.id };
        }
        // Dùng thông tin MỚI NHẤT (vai trò, họ tên) để đưa vào access token mới
        return { pair: await issuePair(tx, user, now) };
      });

      if (outcome.pair) return outcome.pair;
      if (outcome.error === 'REUSED') {
        logger.warn(
          { userId: outcome.userId },
          'Phát hiện dùng lại refresh token đã thu hồi, thu hồi toàn bộ phiên',
        );
      }
      if (outcome.error === 'DISABLED') throw errors.accountDisabled();
      throw errors.invalidRefreshToken();
    },

    /** Thu hồi refresh token. Luôn thành công (idempotent), kể cả khi token không tồn tại. */
    async logout({ refreshToken }) {
      await tokenRepo.revokeByHash(db, tokens.hash(refreshToken), clock.now());
    },
  };
}

module.exports = { createAuthService };
