// routes/memoria.js
const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * Função para embaralhar um array (algoritmo Fisher-Yates).
 * O backend já entrega o deck embaralhado para o frontend.
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Rota para buscar os pares de cartas de uma fase do Jogo da Memória.
 */
router.get('/:mundo/:fase', (req, res) => {
    const { mundo, fase } = req.params;

    // 1. Busca os pares únicos no banco de dados.
    const sql = `SELECT par_identificador, imagem_url FROM memoria_pares WHERE mundo = ? AND fase = ?`;

    db.all(sql, [mundo, fase], (err, pares) => {
        if (err) {
            console.error("Erro ao buscar pares do jogo da memória:", err);
            return res.status(500).json({ error: 'Erro ao buscar dados do jogo da memória.' });
        }

        if (!pares || pares.length === 0) {
            return res.status(404).json({ error: 'Fase não encontrada ou sem pares definidos.' });
        }

        // 2. Duplica os pares para criar o deck completo (ex: 4 pares -> 8 cartas)
        // Adicionamos um ID único para cada *carta* individual, para o React usar como 'key'.
        const deck = [];
        pares.forEach((par) => {
            deck.push({ id: `${par.par_identificador}_1`, identificador: par.par_identificador, imagem_url: par.imagem_url });
            deck.push({ id: `${par.par_identificador}_2`, identificador: par.par_identificador, imagem_url: par.imagem_url });
        });

        // 3. Embaralha o deck e envia para o frontend.
        const deckEmbaralhado = shuffleArray(deck);
        
        res.json(deckEmbaralhado);
    });
});

module.exports = router;