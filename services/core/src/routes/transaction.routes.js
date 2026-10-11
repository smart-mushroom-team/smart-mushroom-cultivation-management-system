'use strict';

const { Router } = require('express');
const controller = require('../controllers/transaction.controller');

const router = Router();

router.get('/', controller.list);

module.exports = router;
