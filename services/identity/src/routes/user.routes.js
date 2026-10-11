'use strict';

const { Router } = require('express');
const controller = require('../controllers/user.controller');

const router = Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.patch('/:id', controller.update);
router.post('/:id/deactivate', controller.deactivate);
router.post('/:id/activate', controller.activate);
router.post('/:id/reset-password', controller.resetPassword);

module.exports = router;
