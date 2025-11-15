// server.js
const express = require('express');
const cors = require('cors'); 
const app = express();
const PORT = process.env.PORT || 3001;

const criarTabelas = require('./initDatabase');

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- Inicialização da Base de Dados ---
criarTabelas();

// --- Carregamento dos Ficheiros de Rotas ---
const progressoRoutes = require('./routes/progresso');
const dialogosRoutes = require('./routes/dialogos');
const fasesRoutes = require('./routes/fases');
const itensFaseRoutes = require('./routes/itensFase');
const jogadoresRoutes = require('./routes/jogadores');
const cruzadinhasRoutes = require('./routes/cruzadinhas');
const cacapalavrasRoutes = require('./routes/cacapalavras');
const settingsRoutes = require('./routes/settings');
const memoriaRoutes = require('./routes/memoria');
const bonusRoutes = require('./routes/bonus');
const desafioBonusRoutes = require('./routes/desafioBonus');
const placarRoutes = require('./routes/placar');

// --- Registo das Rotas com Prefixos ---
app.use('/progresso', progressoRoutes);
app.use('/dialogos', dialogosRoutes);
app.use('/fases', fasesRoutes);
app.use('/itens-fase', itensFaseRoutes);
app.use('/jogadores', jogadoresRoutes);
app.use('/cruzadinhas', cruzadinhasRoutes);
app.use('/cacapalavras', cacapalavrasRoutes);
app.use('/settings', settingsRoutes);
app.use('/memoria', memoriaRoutes);
app.use('/bonus', bonusRoutes);
app.use('/desafio-bonus', desafioBonusRoutes);
app.use('/placar', placarRoutes);

// --- Arranque do Servidor ---
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});