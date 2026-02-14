const express = require('express');
const router = express.Router();
const magicLinkController = require('../controllers/magicLinkController');

// Rota para o n8n gerar um link
router.post('/generate', magicLinkController.generate);

// Rota para o frontend verificar o token ao abrir a página
router.get('/verify/:uuid', magicLinkController.verify);

// Rota para o frontend confirmar a autorização
router.post('/confirm', magicLinkController.confirm);

module.exports = router;
