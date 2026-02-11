const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policyController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Rotas de Usuário Logado
router.get('/my', authenticateToken, policyController.getMyPolicies);
router.get('/debug-scan', policyController.debugScan); // Rota temporária para diagnóstico
router.post('/chat', authenticateToken, policyController.chatWithAI);
router.get('/:id', authenticateToken, policyController.getPolicyDetails);

// Rota Pública (Para novos clientes / leads)
router.post('/public-chat', policyController.publicChat);

module.exports = router;
