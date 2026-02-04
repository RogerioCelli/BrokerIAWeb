const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policyController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Todas as rotas de apólices exigem login
router.get('/my', authenticateToken, policyController.getMyPolicies);
router.get('/:id', authenticateToken, policyController.getPolicyDetails);

module.exports = router;
