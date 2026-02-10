const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Rotas públicas para visualização de dados (Conforme solicitado para novo diagnostico)
router.get('/clients', adminController.getAllClients);
router.get('/clients/:cpf/policies', adminController.getClientPolicies);
router.get('/policies', adminController.getAllPolicies);
router.get('/cleanup-links', adminController.cleanupInvalidLinks);
router.post('/sync-drive', adminController.syncDriveWithN8N);

module.exports = router;
