'use strict';

const { Router } = require('express');
const { requireRole, ROLES } = require('@mushroom/shared');
const controller = require('../controllers/cycle.controller');

const router = Router();
const staff = requireRole(ROLES.OPERATOR); // Admin kế thừa quyền Operator

router.get('/', staff, controller.list);
router.post('/', staff, controller.create);
router.get('/:id', controller.getById);
router.post('/:id/progress', staff, controller.updateProgress);
router.post('/:id/harvest', staff, controller.harvest);
router.post('/:id/discard', staff, controller.discard);

module.exports = router;
