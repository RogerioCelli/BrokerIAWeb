const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/seguros/estrutura
 * Retorna todas as categorias e seus tipos de seguro aninhados.
 * Ideal para montar menus dinâmicos.
 */
router.get('/estrutura', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id as categoria_id, 
                c.nome as categoria_nome,
                json_agg(json_build_object('id', t.id, 'nome', t.nome)) as tipos
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
 * Retorna todas as marcas de veículos (parent_id IS NULL).
 * Pode filtrar por categoria (CARRO, MOTO, CAMINHAO) via query param ?categoria=CARRO
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
 * Retorna os filhos (modelos) de uma marca ou versão.
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

module.exports = router;
