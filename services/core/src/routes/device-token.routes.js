'use strict';

const { Router } = require('express');
const controller = require('../controllers/device-token.controller');

const router = Router();

router.post('/', controller.register);
router.delete('/', controller.unregister);

module.exports = router;
