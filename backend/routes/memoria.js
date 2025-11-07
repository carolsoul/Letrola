const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * Função para embaralhar um array (algoritmo Fisher-Yates).
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
 * MODIFICADO: Agora cria um card de IMAGEM e um card de TEXTO.
 */
router.get('/:mundo/:fase', (req, res) => {
    const { mundo, fase } = req.params;
    const mundoNum = parseInt(mundo, 10);
    const faseNum = parseInt(fase, 10);

    if (isNaN(mundoNum) || isNaN(faseNum)) {
        return res.status(400).json({ error: 'Parâmetros de mundo ou fase inválidos.' });
    }

    const sql = `SELECT par_identificador, imagem_url FROM memoria_pares WHERE mundo = ? AND fase = ?`;

    db.all(sql, [mundoNum, faseNum], (err, pares) => {
        if (err) {
            console.error("Erro ao buscar pares do jogo da memória:", err);
            return res.status(500).json({ error: 'Erro ao buscar dados do jogo da memória.' });
        }

        if (!pares || pares.length === 0) {
            return res.status(404).json({ error: 'Fase não encontrada ou sem pares definidos.' });
        }

        // 2. Cria o deck com um card de IMAGEM e um card de TEXTO
        const deck = [];
        pares.forEach((par) => {
            const identificador = par.par_identificador;
            
            // Card de Imagem
            deck.push({
                id: `${identificador}_img`, // ID único para a carta
                identificador: identificador,  // Identificador do par
                tipo: 'imagem',              // Tipo da carta
                conteudo: par.imagem_url     // URL da imagem
            });
            
            // Card de Texto
            deck.push({
                id: `${identificador}_txt`, // ID único para a carta
                identificador: identificador,  // Identificador do par
                tipo: 'texto',               // Tipo da carta
                conteudo: identificador      // O próprio texto (ex: "UVA")
            });
        });

        // 3. Embaralha o deck e envia para o frontend.
        const deckEmbaralhado = shuffleArray(deck);
        
        res.json(deckEmbaralhado);
    });
});

module.exports = router;