const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Rotas públicas para visualização de dados (Conforme solicitado para novo diagnostico)
router.get('/clients', adminController.getAllClients);
router.get('/policies', adminController.getAllPolicies);

module.exports = router;
