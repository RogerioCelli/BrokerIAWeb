const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const { isAdmin, isMaster } = require('../middlewares/adminMiddleware');

// --- Rotas de Autenticação Admin ---
router.post('/auth/request', adminAuthController.requestAdminAccess);
router.post('/auth/validate', adminAuthController.validateAdminToken);

// --- Rotas de Dados (Protegidas) ---
router.get('/clients', isAdmin, adminController.getAllClients);
router.get('/clients/:cpf/policies', isAdmin, adminController.getClientPolicies);
router.get('/policies', isAdmin, adminController.getAllPolicies);
router.get('/cleanup-links', isAdmin, adminController.cleanupInvalidLinks);
router.post('/sync-drive', isAdmin, adminController.syncDriveWithN8N);

// --- Gestão de Usuários (Restrita ao MASTER) ---
router.get('/users', isMaster, adminController.getPortalUsers);
router.post('/users', isMaster, adminController.createPortalUser);
router.delete('/users/:id', isMaster, adminController.deletePortalUser);

module.exports = router;
