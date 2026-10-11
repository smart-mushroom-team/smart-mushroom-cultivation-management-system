'use strict';

const { Router } = require('express');
const { requireRole, ROLES } = require('@mushroom/shared');
const controller = require('../controllers/package.controller');

const router = Router();
const admin = requireRole(ROLES.ADMIN);

router.get('/', controller.list);
router.post('/', admin, controller.create);
router.get('/:id', controller.getById);
router.patch('/:id', admin, controller.update);

module.exports = router;
