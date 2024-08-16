const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');

// Authentication routes
router.post('/add', packageController.new);
router.get('/list', packageController.list);
router.post('/edit', packageController.edit);
router.get('/delete', packageController.delete);

module.exports = router;
