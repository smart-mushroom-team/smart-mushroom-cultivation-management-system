'use strict';

const { Router } = require('express');
const { requireRole, ROLES } = require('@mushroom/shared');
const controller = require('../controllers/dashboard.controller');

const router = Router();
const staff = requireRole(ROLES.OPERATOR); // Admin kế thừa quyền Operator

router.get('/summary', staff, controller.summary);

module.exports = router;
