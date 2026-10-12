'use strict';

const { ERROR_CODES, conflict, notFound, isUniqueViolation } = require('@mushroom/shared');
const { toUserDto } = require('../utils/dto');

/**
 * Nghiệp vụ người dùng: hồ sơ cá nhân (/me) và quản trị người dùng (/users, chỉ ADMIN).
 */
function createUserService({ db, userRepo, tokenRepo, passwords, clock }) {
  const found = (user) => {
    if (!user) throw notFound('Không tìm thấy người dùng');
    return user;
  };

  /**
   * Luôn phải còn ít nhất một Admin đang hoạt động (nếu không, không ai quản trị được hệ thống).
   * Khóa các dòng Admin (FOR UPDATE) nên hai Admin cùng lúc tự loại nhau cũng không vượt qua được.
   * Chỉ gọi bên trong giao dịch.
   */
  async function assertAnotherActiveAdmin(tx, targetId) {
    const adminIds = await userRepo.lockActiveAdmins(tx);
    if (!adminIds.some((id) => id !== targetId)) {
      throw conflict('Phải còn ít nhất một Admin đang hoạt động', ERROR_CODES.INVALID_STATE);
    }
  }

  return {
    // ---------- Hồ sơ của chính mình ----------
    async getProfile(userId) {
      return toUserDto(found(await userRepo.findById(db, userId)));
    },

    async updateProfile(userId, patch) {
      return toUserDto(found(await userRepo.update(db, userId, patch)));
    },

    // ---------- Quản trị (ADMIN) ----------
    async list({ page, limit, role, status, q }) {
      const { rows, total } = await userRepo.list(db, {
        role,
        status,
        q,
        limit,
        offset: (page - 1) * limit,
      });
      return { items: rows.map(toUserDto), page, limit, total };
    },

    async create(input) {
      const passwordHash = await passwords.hash(input.password);
      try {
        const user = await userRepo.insert(db, {
          name: input.name,
          email: input.email,
          passwordHash,
          role: input.role,
          phone: input.phone ?? null,
          address: input.address ?? null,
        });
        return toUserDto(user);
      } catch (err) {
        if (isUniqueViolation(err)) throw conflict('Email đã được sử dụng');
        throw err;
      }
    },

    async getById(id) {
      return toUserDto(found(await userRepo.findById(db, id)));
    },

    async update(id, patch) {
      return db.transaction(async (tx) => {
        const target = found(await userRepo.findById(tx, id));
        const demotingActiveAdmin =
          patch.role &&
          patch.role !== 'ADMIN' &&
          target.role === 'ADMIN' &&
          target.status === 'ACTIVE';
        if (demotingActiveAdmin) await assertAnotherActiveAdmin(tx, target.id);
        return toUserDto(await userRepo.update(tx, id, patch));
      });
    },

    /** Vô hiệu hóa (BR-15: không xóa) và thu hồi mọi refresh token của người đó. Idempotent. */
    async deactivate(id, actor) {
      if (actor.id === id) {
        throw conflict(
          'Không thể tự vô hiệu hóa tài khoản của chính mình',
          ERROR_CODES.INVALID_STATE,
        );
      }
      return db.transaction(async (tx) => {
        const target = found(await userRepo.findById(tx, id));
        if (target.status === 'INACTIVE') return toUserDto(target);
        if (target.role === 'ADMIN') await assertAnotherActiveAdmin(tx, target.id);
        const updated = await userRepo.update(tx, id, { status: 'INACTIVE' });
        await tokenRepo.revokeAllForUser(tx, id, clock.now());
        return toUserDto(updated);
      });
    },

    /** Kích hoạt lại và mở khóa đăng nhập. */
    async activate(id) {
      return db.transaction(async (tx) => {
        found(await userRepo.findById(tx, id));
        const updated = await userRepo.update(tx, id, { status: 'ACTIVE' });
        await userRepo.clearLoginLock(tx, id);
        return toUserDto(updated);
      });
    },

    /** Admin đặt lại mật khẩu: đổi mật khẩu, mở khóa và buộc đăng nhập lại ở mọi thiết bị. */
    async resetPassword(id, newPassword) {
      const passwordHash = await passwords.hash(newPassword); // băm ngoài giao dịch (tốn CPU)
      await db.transaction(async (tx) => {
        found(await userRepo.findById(tx, id));
        await userRepo.update(tx, id, { passwordHash });
        await userRepo.clearLoginLock(tx, id);
        await tokenRepo.revokeAllForUser(tx, id, clock.now());
      });
    },
  };
}

module.exports = { createUserService };
