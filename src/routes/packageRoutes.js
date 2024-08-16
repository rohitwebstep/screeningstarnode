const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');

// Authentication routes
router.post('/create', packageController.create);  // Changed from /add to /create for clarity
router.get('/list', packageController.list);
router.put('/update', packageController.update);   // Changed from /edit to /update for clarity
router.delete('/delete', packageController.delete); // Changed from /delete to /delete for clarity

module.exports = router;
