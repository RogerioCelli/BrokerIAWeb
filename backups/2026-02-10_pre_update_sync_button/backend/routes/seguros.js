const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/seguros/categorias
 * Listar todas as categorias de seguro do Master
 */
router.get('/categorias', async (req, res) => {
    try {
        const result = await db.masterQuery('SELECT * FROM categorias_seguros ORDER BY ramo, nome');
        res.json(result.rows);
    } catch (error) {
        console.error('[MASTER-DB-ERR] Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro ao carregar categorias do Master' });
    }
});

/**
 * GET /api/seguros/marcas/:categoriaId
 * Listar marcas de uma categoria específica (Master)
 */
router.get('/marcas/:categoriaId', async (req, res) => {
    try {
        const { categoriaId } = req.params;
        const result = await db.masterQuery('SELECT * FROM marcas_veiculos WHERE categoria_id = $1 ORDER BY nome', [categoriaId]);
        res.json(result.rows);
    } catch (error) {
        console.error('[MASTER-DB-ERR] Erro ao buscar marcas:', error);
        res.status(500).json({ error: 'Erro ao carregar marcas do Master' });
    }
});

/**
 * GET /api/seguros/modelos/:marcaId
 * Listar modelos de uma marca específica (Master)
 */
router.get('/modelos/:marcaId', async (req, res) => {
    try {
        const { marcaId } = req.params;
        const result = await db.masterQuery('SELECT * FROM modelos_veiculos WHERE marca_id = $1 ORDER BY nome', [marcaId]);
        res.json(result.rows);
    } catch (error) {
        console.error('[MASTER-DB-ERR] Erro ao buscar modelos:', error);
        res.status(500).json({ error: 'Erro ao carregar modelos do Master' });
    }
});

module.exports = router;
