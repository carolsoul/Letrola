// routes/bonus.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// O número total de estrelas necessárias para desbloquear a fase bônus.
// 5 Mundos * 5 Fases/Mundo * 3 Estrelas/Fase = 75
const TOTAL_ESTRELAS_NECESSARIAS = 75;

/**
 * Rota para verificar se um jogador desbloqueou a fase bônus.
 * O frontend chamará isso após o login ou após completar uma fase.
 */
router.get('/status/:id_jogador', (req, res) => {
    const { id_jogador } = req.params;

    // 1. Usamos a mesma lógica da rota /total-estrelas
    // Garante que estamos somando apenas do jogo ATIVO (ativo = 1)
    const sql = `SELECT SUM(estrelas) as total_estrelas 
                 FROM progresso 
                 WHERE id_jogador = ? AND ativo = 1`;

    db.get(sql, [id_jogador], (err, row) => {
        if (err) {
            console.error("Erro ao buscar total de estrelas para bônus:", err);
            return res.status(500).json({ error: "Erro ao verificar status do bônus." });
        }

        const estrelasColetadas = row.total_estrelas || 0;
        const desbloqueado = estrelasColetadas >= TOTAL_ESTRELAS_NECESSARIAS;

        res.json({
            desbloqueado: desbloqueado,
            estrelas_coletadas: estrelasColetadas,
            estrelas_necessarias: TOTAL_ESTRELAS_NECESSARIAS
        });
    });
});

module.exports = router;