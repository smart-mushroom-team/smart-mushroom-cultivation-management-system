'use strict';

const { Router } = require('express');
const { requireRole, ROLES } = require('@mushroom/shared');
const controller = require('../controllers/tray.controller');

const router = Router();
const staff = requireRole(ROLES.OPERATOR); // Admin kế thừa quyền Operator

router.get('/', staff, controller.list);
router.post('/', staff, controller.create);
router.get('/:id', staff, controller.getById);
router.patch('/:id', staff, controller.update);
router.delete('/:id', staff, controller.remove);
router.post('/:id/complete-cleaning', staff, controller.completeCleaning);

module.exports = router;
