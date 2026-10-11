'use strict';

const { Router } = require('express');
const { requireRole, ROLES } = require('@mushroom/shared');
const controller = require('../controllers/room.controller');

const router = Router();
const staff = requireRole(ROLES.OPERATOR); // Admin kế thừa quyền Operator

router.get('/', staff, controller.list);
router.post('/', staff, controller.create);
router.get('/:id', staff, controller.getById);
router.patch('/:id', staff, controller.update);

module.exports = router;
