import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CaçaPalavras from './CaçaPalavras';
import Modal from "./Modal.jsx";
import Cronometro from "./Cronometro.jsx";
import CruzadinhaScoreDisplay from './CruzadinhaScoreDisplay.jsx';
import '../styles/Mundo4.css';
import { useAudio } from "../hooks/useAudio";
import TutorialModal from "./TutorialModal.jsx";
import { tutorials } from "../data/tutorialData.js";
import { buscarPalavrasDoNivel } from "../services/apiCacapalavras.js";

// --- Constantes ---
const MUNDO_ID = 4;
const TEMPO_3_ESTRELAS = 180;
const TEMPO_2_ESTRELAS = 300;
const TEMPO_1_ESTRELA = 480;

// Função para determinar o gridSize (pode ser ajustada)
const determinarGridSize = (palavras) => {
    if (!palavras || palavras.length === 0) return 10;
    const maiorPalavra = palavras.reduce((max, p) => Math.max(max, p.length), 0);
    return Math.max(10, maiorPalavra + 2, Math.ceil(palavras.length * 1.5));
};

const formatTime = (timeInMs) => {
    const totalSeconds = Math.floor(timeInMs / 1000);
    const min = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const sec = String(totalSeconds % 60).padStart(2, "0");
    return `${min}:${sec}`;
};

function Mundo4_Gameplay({ jogador, onFaseCompleta }) {
  const { mundoId, faseId } = useParams();
  const navigate = useNavigate();
  const { playSound, isMusicMuted, toggleMusic, isSfxMuted, toggleSfx } = useAudio();

  const mundo_id = parseInt(mundoId);
  const fase_id = parseInt(faseId);

  // 3. Adicionar estado para controlar o tutorial
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const [estadoJogo, setEstadoJogo] = useState("carregando");
  const [tempo, setTempo] = useState({ inicio: Date.now(), decorrido: 0 });
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [palavrasEncontradas, setPalavrasEncontradas] = useState([]);
  const [palavrasDaFase, setPalavrasDaFase] = useState([]);
  const [gridSize, setGridSize] = useState(10);

  // Efeito para tocar a música de fundo
  useEffect(() => {
    const audio = playSound(`musica-mundo-${MUNDO_ID}`, true);
    return () => { if (audio) audio.pause(); };
  }, [playSound]);

  // 4. Efeito para verificar e mostrar o tutorial
  useEffect(() => {
    if (fase_id === 1) {
        const storageKey = `tutorial_mundo_${mundo_id}_visto`;
        const tutorialJaVisto = sessionStorage.getItem(storageKey);
        if (!tutorialJaVisto) {
            setIsTutorialOpen(true);
        }
    }
  }, [mundo_id, fase_id]);

  // Efeito para buscar as palavras da API
  useEffect(() => {
    if (!jogador) {
        navigate("/");
        return;
    }

    const carregarPalavras = async () => {
        setEstadoJogo("carregando");
        const palavrasApi = await buscarPalavrasDoNivel(mundo_id, fase_id);
        if (palavrasApi && palavrasApi.length > 0) {
            setPalavrasDaFase(palavrasApi);
            setGridSize(determinarGridSize(palavrasApi));
            setPalavrasEncontradas([]);
            setTempo({ inicio: Date.now(), decorrido: 0 });
            setEstadoJogo("jogando");
        } else {
            console.error("Não foi possível carregar as palavras para a fase.");
            setEstadoJogo("erro");
        }
    };

    carregarPalavras();
  }, [jogador, navigate, mundo_id, fase_id]);

  const finalizarFase = useCallback((motivo = 'concluido') => {
      if (estadoJogo === "finalizado") return;
      setEstadoJogo("finalizado");
      const tempoFinalSegundos = Math.floor(tempo.decorrido / 1000);
      let estrelas = 0;
      if (motivo !== 'tempo_esgotado') {
          if (tempoFinalSegundos <= TEMPO_3_ESTRELAS) estrelas = 3;
          else if (tempoFinalSegundos <= TEMPO_2_ESTRELAS) estrelas = 2;
          else if (tempoFinalSegundos <= TEMPO_1_ESTRELA) estrelas = 1;
      }
      onFaseCompleta({ estrelas, tempoConclusao: tempoFinalSegundos });
  }, [estadoJogo, tempo.decorrido, onFaseCompleta]);

  const handlePalavraEncontrada = (palavra) => {
    playSound('fase-acerto');
    setPalavrasEncontradas(prev => [...prev, palavra]);
  };

  useEffect(() => {
    if (estadoJogo === "jogando" && palavrasDaFase.length > 0 && palavrasEncontradas.length === palavrasDaFase.length) {
      finalizarFase('concluido');
    }
  }, [palavrasEncontradas, palavrasDaFase, estadoJogo, finalizarFase]);

  const handleOpenConfig = () => { playSound('click'); setIsConfigOpen(true); };
  const handleVoltarAoMapa = () => { playSound('click'); navigate("/mapa-do-jogo", { state: { jogador, mundo_id: MUNDO_ID } }); };
  const handlePausar = () => { playSound('click'); setEstadoJogo(estadoJogo === 'jogando' ? 'pausado' : 'jogando'); };
  const handleRetry = () => { playSound('click'); window.location.reload(); };
  const handleNavigateAjuda = () => { playSound('click'); navigate('/ajuda'); };
  const handleCloseConfig = () => { playSound('click'); setIsConfigOpen(false); };
  // 5. Função para fechar o tutorial e reiniciar o cronômetro
  const handleCloseTutorial = () => {
    const storageKey = `tutorial_mundo_${mundo_id}_visto`;
    sessionStorage.setItem(storageKey, 'true');
    setIsTutorialOpen(false);
    setTempo({ inicio: Date.now(), decorrido: 0 });
  };

  if (estadoJogo === "carregando") return <div className="loading-screen">Carregando Caça-Palavras...</div>;
  if (estadoJogo === "erro") return <div className="error-screen">Erro ao carregar o Caça-Palavras. Tente novamente.</div>;
  if (palavrasDaFase.length === 0) return <div className="error-screen">Nenhuma palavra encontrada para esta fase.</div>;

  return (
    <section className="mundo4-section">
      {/* 6. Renderizar o modal de tutorial */}
      <TutorialModal
          isOpen={isTutorialOpen}
          onClose={handleCloseTutorial}
          steps={tutorials[mundo_id]}
      />
      <header className="mundo4-header">
        <button className="level-settings-btn" onClick={handleOpenConfig}>
          <img src="/Settings.svg" alt="Configurações" />
        </button>
        <CruzadinhaScoreDisplay tempoDecorridoMs={tempo.decorrido} />
        <div className="timer">
            <img src="/timer.svg" alt="Cronômetro" />
            <p className="seconds">{formatTime(tempo.decorrido)}</p>
        </div>
      </header>

       {(estadoJogo === "jogando" || estadoJogo === "pausado") && (
          <Cronometro
              // 7. Pausar o cronômetro se o tutorial estiver aberto
              isPaused={estadoJogo === "pausado" || isTutorialOpen}
              tempoInicioFase={tempo.inicio}
              limiteTempoFase={TEMPO_1_ESTRELA * 1000}
              onTempoTick={(ms) => setTempo(t => ({ ...t, decorrido: ms }))}
              onFaseTermina={() => finalizarFase('tempo_esgotado')}
          />
      )}

      <main className="mundo4-main">
        <CaçaPalavras
          palavras={palavrasDaFase}
          gridSize={gridSize}
          onPalavraEncontrada={handlePalavraEncontrada}
        />
      </main>

      <Modal isOpen={isConfigOpen} onClose={handleCloseConfig} variant="config">
          <div className="btn-level-grid">
              <button className={`btn music-btn ${isMusicMuted ? 'grayscale' : ''}`} onClick={toggleMusic}>
                  <div></div> música
              </button>
              <button className={`btn effect-btn ${isSfxMuted ? 'grayscale' : ''}`} onClick={toggleSfx}>
                  <div></div> efeitos
              </button>
              <button className="btn map-btn" onClick={handleVoltarAoMapa}><div></div>🏠</button>
              <button className="btn stop-btn" onClick={handlePausar}><div></div>{estadoJogo === 'pausado' ? '▶' : '⏸'}</button>
              <button className="btn retry-btn" onClick={handleRetry}><div></div>↩</button>
              <button className="btn help-btn" onClick={handleNavigateAjuda}><div></div> ajuda</button>
              <button className="btn skip-btn" onClick={handleCloseConfig}><div></div> fechar</button>
          </div>
      </Modal>
    </section>
  );
}

export default Mundo4_Gameplay;