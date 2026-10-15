'use strict';

const { Router } = require('express');
const controller = require('../controllers/room.controller');
const asyncHandler = require('../utils/async.handler');
const router = Router();

/**
 * @openapi
 * /rooms:
 *   get:
 *     tags: [Rooms]
 *     summary: List rooms
 *     responses:
 *       200: { description: Rooms returned }
 *   post:
 *     tags: [Rooms]
 *     summary: Create a room
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRoomRequest'
 *           example:
 *             name: 'Phòng A'
 *             status: ACTIVE
 *     responses:
 *       201: { description: Room created }
 * /rooms/{id}:
 *   get:
 *     tags: [Rooms]
 *     summary: Get a room
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { $ref: '#/components/schemas/IdParam' } }
 *     responses:
 *       200: { description: Room returned }
 *       404: { description: Room not found }
 *   patch:
 *     tags: [Rooms]
 *     summary: Update a room
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { $ref: '#/components/schemas/IdParam' } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRoomRequest'
 *           example:
 *             name: 'Phòng A - Updated'
 *     responses:
 *       200: { description: Room updated }
 * /rooms/{id}/status:
 *   patch:
 *     tags: [Rooms]
 *     summary: Change room status
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { $ref: '#/components/schemas/IdParam' } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRoomStatusRequest'
 *           example:
 *             status: INACTIVE
 *     responses:
 *       200: { description: Room status changed }
 */
router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.get('/:id', asyncHandler(controller.getById));
router.patch('/:id', asyncHandler(controller.update));
router.patch('/:id/status', asyncHandler(controller.changeStatus));

module.exports = router;
