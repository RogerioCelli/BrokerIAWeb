const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rota para solicitar o token (Passo 1)
router.post('/request', authController.requestAccess);

// Rota para validar o token (Passo 2)
router.post('/validate', authController.validateToken);

module.exports = router;
