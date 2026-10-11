'use strict';

const { Router } = require('express');
const controller = require('../controllers/internal.controller');

const router = Router();

router.get('/rooms/:roomId/access', controller.checkRoomAccess);
router.post('/alerts', controller.createAlert);

module.exports = router;
