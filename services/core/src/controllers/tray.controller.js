'use strict';

const service = require('../services/tray.service');
const {
  idParamSchema,
  createBodySchema,
  updateBodySchema,
  statusBodySchema,
  listQuerySchema,
} = require('../validators/tray.validator');

async function create(req, res) {
  const data = createBodySchema.parse(req.body);
  res.status(201).json({ data: await service.createTray(data) });
}

async function list(req, res) {
  const { page, pageSize, roomId, occupancyStatus, trayCode } = listQuerySchema.parse(req.query);
  const result = await service.listTrays({
    page,
    pageSize,
    filters: { roomId, occupancyStatus, trayCode },
  });
  res.json({ data: result.items, meta: result.meta });
}

async function getById(req, res) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await service.getTray(id) });
}

async function update(req, res) {
  const { id } = idParamSchema.parse(req.params);
  const data = updateBodySchema.parse(req.body);
  res.json({ data: await service.updateTray(id, data) });
}

async function changeStatus(req, res) {
  const { id } = idParamSchema.parse(req.params);
  const { occupancyStatus } = statusBodySchema.parse(req.body);
  res.json({ data: await service.changeTrayStatus(id, occupancyStatus) });
}

async function remove(req, res) {
  const { id } = idParamSchema.parse(req.params);
  await service.deleteTray(id);
  res.status(204).send();
}

async function completeCleaning(req, res) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await service.completeCleaning(id) });
}

module.exports = { create, list, getById, update, changeStatus, remove, completeCleaning };
