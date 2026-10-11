'use strict';

const { Router } = require('express');
const { requireRole, ROLES } = require('@mushroom/shared');
const controller = require('../controllers/my-tray.controller');

const router = Router();
const customer = requireRole(ROLES.CUSTOMER);

router.get('/', customer, controller.list);
router.get('/:trayId', customer, controller.getById);

module.exports = router;
