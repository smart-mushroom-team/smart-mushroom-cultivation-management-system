'use strict';

const { Router } = require('express');
const controller = require('../controllers/room-view.controller');

const router = Router({ mergeParams: true });

router.get('/camera', controller.getCamera);
router.get('/camera/snapshot', controller.getSnapshot);
router.get('/sensor/latest', controller.getLatestReading);
router.get('/sensor/readings', controller.getReadings);

module.exports = router;
