'use strict';

const deviceService = require('../services/device.service');

// Controller = nhận request, gọi service, trả response
module.exports = {
  // POST /devices — tạo device mới
  async create(req, res, next) {
    try {
      const result = await deviceService.createDevice(req.body);
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  // GET /devices — lấy danh sách
  async list(req, res, next) {
    try {
      const devices = await deviceService.listDevices(req.query);
      return res.json({ data: devices });
    } catch (err) {
      next(err);
    }
  },

  // GET /devices/:id — lấy 1 device
  async getById(req, res, next) {
    try {
      const device = await deviceService.getDeviceById(req.params.id);
      return res.json(device);
    } catch (err) {
      next(err);
    }
  },

  // PATCH /devices/:id — cập nhật
  async update(req, res, next) {
    try {
      const device = await deviceService.updateDevice(req.params.id, req.body);
      return res.json(device);
    } catch (err) {
      next(err);
    }
  },

  // POST /devices/:id/activate
  async activate(req, res, next) {
    try {
      const device = await deviceService.activateDevice(req.params.id);
      return res.json(device);
    } catch (err) {
      next(err);
    }
  },

  // POST /devices/:id/deactivate
  async deactivate(req, res, next) {
    try {
      const device = await deviceService.deactivateDevice(req.params.id);
      return res.json(device);
    } catch (err) {
      next(err);
    }
  },

  // GET /devices/summary — số thiết bị theo connectionState
  async summary(req, res, next) {
    try {
      const devices = await deviceService.listDevices();
      const summary = {
        online: devices.filter((d) => d.connectionState === 'ONLINE').length,
        offline: devices.filter((d) => d.connectionState === 'OFFLINE').length,
        total: devices.length,
      };
      return res.json(summary);
    } catch (err) {
      next(err);
    }
  },

  // POST /devices/:id/rotate-key
  async rotateKey(req, res, next) {
    try {
      const result = await deviceService.rotateDeviceKey(req.params.id);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
