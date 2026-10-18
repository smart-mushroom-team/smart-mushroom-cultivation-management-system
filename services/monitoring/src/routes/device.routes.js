'use strict';

const { Router } = require('express');
const { requireRole, ROLES } = require('@mushroom/shared');
const controller = require('../controllers/device.controller');

const router = Router();
const staff = requireRole(ROLES.OPERATOR); // Admin kế thừa quyền Operator

router.get('/', staff, controller.list);
router.get('/summary', staff, controller.summary);
router.post('/', staff, controller.create);
router.get('/:id', staff, controller.getById);
router.patch('/:id', staff, controller.update);
router.post('/:id/activate', staff, controller.activate);
router.post('/:id/deactivate', staff, controller.deactivate);
router.post('/:id/rotate-key', staff, controller.rotateKey);

module.exports = router;
