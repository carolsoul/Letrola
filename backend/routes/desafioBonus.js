// routes/desafioBonus.js
const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * Rota para buscar TODOS os desafios de matemática para a fase bônus.
 * A validação da resposta será feita no frontend para agilidade.
 */
router.get('/fase/:fase_id', (req, res) => {
    const { fase_id } = req.params;
    const mundo_id = 6; // O Mundo Bônus é sempre o 6

    // 1. Busca todos os desafios (pergunta e resposta) da fase.
    const sql = `SELECT pergunta, resposta 
                 FROM mundo6_desafios_matematicos 
                 WHERE mundo = ? AND fase = ?`;

    db.all(sql, [mundo_id, fase_id], (err, desafios) => {
        if (err) {
            console.error("Erro ao buscar desafios de matemática:", err);
            return res.status(500).json({ error: 'Erro ao buscar desafios.' });
        }

        if (!desafios || desafios.length === 0) {
            return res.status(404).json({ error: 'Fase bônus não encontrada ou sem desafios.' });
        }
        
        // 2. Embaralha a ordem das perguntas e envia para o frontend.
        for (let i = desafios.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [desafios[i], desafios[j]] = [desafios[j], desafios[i]];
        }
        
        res.json(desafios);
    });
});

module.exports = router;