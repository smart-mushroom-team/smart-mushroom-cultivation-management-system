'use strict';

const { Router } = require('express');
const { requireRole, ROLES } = require('@mushroom/shared');
const controller = require('../controllers/room.controller');
const asyncHandler = require('../utils/async.handler');
const router = Router();
const staff = requireRole(ROLES.OPERATOR);

router.get('/', staff, asyncHandler(controller.list));
router.post('/', staff, asyncHandler(controller.create));
router.get('/:id', staff, asyncHandler(controller.getById));
router.patch('/:id', staff, asyncHandler(controller.update));
router.patch('/:id/status', staff, asyncHandler(controller.changeStatus));

module.exports = router;
