// routes/placar.js
const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * Rota para buscar o placar global (Top 10 jogadores).
 * Soma apenas as estrelas do progresso ATIVO (ativo = 1).
 */
router.get('/', (req, res) => {
    
    // Esta é a consulta SQL que faz todo o trabalho.
    // 1. JUNTA as tabelas 'jogadores' e 'progresso'
    // 2. FILTRA para pegar apenas o progresso 'ativo = 1'
    // 3. AGRUPA por jogador para poder somar
    // 4. SOMA (SUM) as estrelas de cada um
    // 5. ORDENA do maior para o menor (DESC)
    // 6. LIMITA aos 10 primeiros
    const sql = `
        SELECT
            j.nome,
            SUM(p.estrelas) as total_estrelas
        FROM
            progresso p
        JOIN
            jogadores j ON p.id_jogador = j.id
        WHERE
            p.ativo = 1
        GROUP BY
            p.id_jogador, j.nome
        ORDER BY
            total_estrelas DESC
        LIMIT 10
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Erro ao buscar placar:", err);
            return res.status(500).json({ error: 'Erro ao buscar o placar.' });
        }
        
        // Retorna a lista, ex: [{ nome: "Jogador1", total_estrelas: 75 }, ...]
        res.json(rows);
    });
});

module.exports = router;