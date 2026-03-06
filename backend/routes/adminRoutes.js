const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
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
router.post('/ingest', isAdmin, adminController.ingestPolicyData);

// --- Rotas de Staging (Área de Validação de Importação) ---
router.post('/staging/save', adminController.saveToStaging); // Aberta para n8n/extração
router.get('/staging/list', isAdmin, adminController.getPendingImports);
router.get('/staging/detail/:id', isAdmin, adminController.getPendingImportDetail);
router.post('/staging/bulk-approve', isAdmin, adminController.bulkApproveImports);
router.post('/staging/bulk-delete', isAdmin, adminController.bulkDeleteImports);


// --- Gestão de Usuários (Restrita ao MASTER) ---
router.get('/users', isMaster, adminController.getPortalUsers);
router.post('/users', isMaster, adminController.createPortalUser);
router.delete('/users/:id', isMaster, adminController.deletePortalUser);

module.exports = router;
