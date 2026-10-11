'use strict';

const { Router } = require('express');
const { requireRole, ROLES } = require('@mushroom/shared');
const controller = require('../controllers/threshold.controller');

const router = Router({ mergeParams: true });
const staff = requireRole(ROLES.OPERATOR); // Admin kế thừa quyền Operator

router.get('/', staff, controller.get);
router.put('/', staff, controller.upsert);

module.exports = router;
