'use strict';

const iotService = require('../services/iot.service');

module.exports = {
  // POST /iot/devices/:deviceId/telemetry
  async telemetry(req, res, next) {
    try {
      const { deviceId } = req.params;
      const result = await iotService.saveTelemetry(deviceId, req.body);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  // POST /iot/devices/:deviceId/snapshot
  async snapshot(req, res, next) {
    try {
      const { deviceId } = req.params;
      // req.file chứa snapshot buffer (từ multer middleware)
      const result = await iotService.saveSnapshot(deviceId, req.file.buffer);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  // GET /iot/devices/:deviceId/commands
  async commands(req, res, next) {
    try {
      // TODO: implement command polling
      return res.json({ commands: [] });
    } catch (err) {
      next(err);
    }
  },
};
