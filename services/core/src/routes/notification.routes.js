'use strict';

const { Router } = require('express');
const controller = require('../controllers/notification.controller');

const router = Router();

router.get('/', controller.list);
router.get('/unread-count', controller.unreadCount);
router.post('/read-all', controller.markAllRead);
router.post('/:id/read', controller.markRead);

module.exports = router;
