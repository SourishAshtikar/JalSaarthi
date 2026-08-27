const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

// All routes here are admin only
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

router.get('/', userController.listUsers);
router.get('/stats', userController.getAdminStats);
router.get('/tokens', userController.listRegistrationTokens);
router.post('/tokens', userController.generateRegistrationToken);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
