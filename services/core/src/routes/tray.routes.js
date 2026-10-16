'use strict';

const { Router } = require('express');
const controller = require('../controllers/tray.controller');
const asyncHandler = require('../utils/async.handler');

const router = Router();

/**
 * @openapi
 * /trays:
 *   get:
 *     tags: [Trays]
 *     summary: List trays
 *     parameters:
 *       - { name: page, in: query, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { name: pageSize, in: query, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
 *       - { name: roomId, in: query, schema: { type: string, format: uuid } }
 *       - { name: occupancyStatus, in: query, schema: { type: string, enum: [AVAILABLE, RESERVED, RENTED, CLEANING] } }
 *       - { name: trayCode, in: query, schema: { type: string } }
 *     responses: { 200: { description: Trays returned } }
 *   post:
 *     tags: [Trays]
 *     summary: Create a tray
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateTrayRequest' }
 *     responses:
 *       201: { description: Tray created }
 *       409: { description: Tray code or position already exists }
 * /trays/{id}:
 *   get:
 *     tags: [Trays]
 *     summary: Get a tray
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { $ref: '#/components/schemas/IdParam' } }
 *     responses: { 200: { description: Tray returned } }
 *   patch:
 *     tags: [Trays]
 *     summary: Update tray code, room and position
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { $ref: '#/components/schemas/IdParam' } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateTrayRequest' }
 *     responses: { 200: { description: Tray updated } }
 *   delete:
 *     tags: [Trays]
 *     summary: Delete a tray that has never belonged to a rental
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { $ref: '#/components/schemas/IdParam' } }
 *     responses:
 *       204: { description: Tray deleted }
 *       409: { description: Tray has belonged to a rental }
 * /trays/{id}/complete-cleaning:
 *   post:
 *     tags: [Trays]
 *     summary: Complete cleaning and move CLEANING to AVAILABLE
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { $ref: '#/components/schemas/IdParam' } }
 *     responses:
 *       200: { description: Cleaning completed }
 *       409: { description: Tray is not CLEANING }
 * /trays/{id}/status:
 *   patch:
 *     tags: [Trays]
 *     summary: Change tray occupancy status
 *     description: Allowed lifecycle is AVAILABLE → RESERVED → RENTED → CLEANING → AVAILABLE. RESERVED may return to AVAILABLE when a rental is rejected.
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { $ref: '#/components/schemas/IdParam' } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateTrayStatusRequest' }
 *     responses:
 *       200: { description: Tray status changed }
 *       409: { description: Invalid status transition }
 */
router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.get('/:id', asyncHandler(controller.getById));
router.patch('/:id', asyncHandler(controller.update));
router.patch('/:id/status', asyncHandler(controller.changeStatus));
router.delete('/:id', asyncHandler(controller.remove));
router.post('/:id/complete-cleaning', asyncHandler(controller.completeCleaning));

module.exports = router;
