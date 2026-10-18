'use strict';

const { Router } = require('express');
const { requireRole, ROLES } = require('@mushroom/shared');
const controller = require('../controllers/rental.controller');

const router = Router();
const customer = requireRole(ROLES.CUSTOMER);
const staff = requireRole(ROLES.OPERATOR); // Admin kế thừa quyền Operator

router.post('/', customer, controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/:id/confirm', staff, controller.confirm);
router.post('/:id/reject', staff, controller.reject);

module.exports = router;
