'use strict';

const { Router } = require('express');
const { requireRole, ROLES } = require('@mushroom/shared');
const controller = require('../controllers/demo.controller');

const router = Router();
const admin = requireRole(ROLES.ADMIN);

router.get('/state', admin, controller.getState);
router.put('/date', admin, controller.setDate);
router.post('/run-expiry-job', admin, controller.runExpiryJob);

module.exports = router;
