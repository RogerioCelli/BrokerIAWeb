const express = require('express');
const router = express.Router();
const db = require('../db');
const quoteController = require('../controllers/quoteController');

/**
 * GET /api/seguros/estrutura
 * Retorna todas as categorias e seus tipos de seguro aninhados do banco local.
 */
router.get('/estrutura', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id as categoria_id, 
                c.nome as categoria_nome,
                json_agg(json_build_object('id', t.id, 'nome', t.nome)) filter (where t.id is not null) as tipos
            FROM categorias_seguros c
            LEFT JOIN tipos_seguros t ON c.id = t.categoria_id
            GROUP BY c.id, c.nome, c.ordem
            ORDER BY c.ordem NULLS LAST, c.id;
        `;

        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar estrutura de seguros:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * GET /api/seguros/veiculos/marcas
 * Retorna todas as marcas de veículos filtradas por categoria.
 */
router.get('/veiculos/marcas', async (req, res) => {
    try {
        const { categoria } = req.query;
        let sql = `SELECT id, nome, fipe_codigo FROM veiculos_base WHERE tipo = 'MARCA'`;
        const params = [];

        if (categoria) {
            sql += ` AND categoria_veiculo = $1`;
            params.push(categoria.toUpperCase());
        }

        sql += ` ORDER BY nome ASC`;

        const result = await db.query(sql, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar marcas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * GET /api/seguros/veiculos/modelos/:parentId
 * Retorna os modelos de uma marca.
 */
router.get('/veiculos/modelos/:parentId', async (req, res) => {
    try {
        const { parentId } = req.params;
        const result = await db.query(
            `SELECT id, nome, fipe_codigo, tipo FROM veiculos_base WHERE parent_id = $1 ORDER BY nome ASC`,
            [parentId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar modelos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota de importação administrativa removida após conclusão da carga de dados.

/**
 * POST /api/seguros/submit
 * Recebe e registra uma nova solicitação de cotação.
 */
router.post('/submit', quoteController.submitQuote);

// Rota temporária para forçar a carga de dados (Será removida após o uso)
router.get('/admin/force-import', async (req, res) => {
    try {
        const { spawn } = require('child_process');
        const path = require('path');
        const scriptPath = path.join(__dirname, '..', 'scripts', 'full_import.js');

        console.log('[FORCE-IMPORT] Iniciando processo em background...');
        const child = spawn('node', [scriptPath], {
            detached: true,
            stdio: 'inherit'
        });
        child.unref();

        res.json({
            success: true,
            message: 'Importação iniciada em background. Verifique os logs do servidor para o progresso.'
        });
    } catch (error) {
        console.error('[FORCE-IMPORT] Erro:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
