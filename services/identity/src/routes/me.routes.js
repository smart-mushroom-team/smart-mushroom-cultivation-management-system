'use strict';

const { Router } = require('express');
const controller = require('../controllers/me.controller');

const router = Router();

router.get('/', controller.getProfile);
router.patch('/', controller.updateProfile);

module.exports = router;
