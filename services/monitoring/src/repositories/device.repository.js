'use strict';

const { getPrisma } = require('../config/prisma');

// Repository = các function để query database
module.exports = {
  // Tạo device mới
  async create(data) {
    const prisma = getPrisma();
    return prisma.device.create({ data });
  },

  // Lấy device theo ID
  async findById(id) {
    const prisma = getPrisma();
    return prisma.device.findUnique({
      where: { id },
    });
  },

  // Lấy tất cả device
  async findAll(filters = {}) {
    const prisma = getPrisma();
    return prisma.device.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
    });
  },

  // Cập nhật device
  async update(id, data) {
    const prisma = getPrisma();
    return prisma.device.update({
      where: { id },
      data,
    });
  },

  // Xóa device
  async delete(id) {
    const prisma = getPrisma();
    return prisma.device.delete({
      where: { id },
    });
  },

  // Lấy device by API key (dùng cho IoT authentication)
  async findByApiKeyHash(apiKeyHash) {
    const prisma = getPrisma();
    return prisma.device.findFirst({
      where: { apiKeyHash },
    });
  },
};
