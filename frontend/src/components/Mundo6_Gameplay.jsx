import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Modal from "./Modal.jsx";
import Cronometro from "./Cronometro.jsx";
import ScoreDisplay from "./ScoreDisplay.jsx"
import { buscarDesafiosDaFase } from "../services/apiDesafioBonus.js";
import { useAudio } from "../hooks/useAudio";
import TutorialModal from "./TutorialModal.jsx";
import { tutorials } from "../data/tutorialData.js";
import '../styles/Mundo6.css'; // CSS Atualizado

// --- Constantes ---
const MUNDO_ID = 6;
const TEMPO_3_ESTRELAS = 120; // 2 minutos
const TEMPO_2_ESTRELAS = 240; // 4 minutos
const TEMPO_1_ESTRELA = 360; // 6 minutos
const POSICAO_JOGADOR_Y = 80; // Posição Y (em %) do jogador na tela

// --- Função Utilitária ---
const formatTime = (timeInMs) => {
    const totalSeconds = Math.floor(timeInMs / 1000);
    const min = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const sec = String(totalSeconds % 60).padStart(2, "0");
    return `${min}:${sec}`;
};

// --- Sub-componentes do Jogo ---

// Jogador (Macaco)
const Player = ({ raia, sprite }) => {
  const posicoesRaia = ['-80%', '0%', '80%']; // Posições X para Esquerda, Meio, Direita
  return (
    <img
      src={sprite}
      className="sprite-jogador"
      style={{ 
        transform: `translateX(${posicoesRaia[raia]})`,
        bottom: `${80 - POSICAO_JOGADOR_Y}%` 
      }}
      alt="Jogador"
    />
  );
};

// Guaxinim
const Guaxinim = ({ raia, yPos, sprite, pego }) => {
  const posicoesRaia = ['-80%', '-80%', '80%'];
  return (
    <img
      src={sprite}
      className={`sprite-guaxinim ${pego ? 'pego' : ''}`}
      style={{
        transform: `translateX(${posicoesRaia[raia]}) scale(0.7)`,
        top: `${70 - yPos}%`
      }}
      alt="Guaxinim"
    />
  );
};

// Caixa de Presente
const CaixaPresente = ({ caixa, onCollide }) => {
  const posicoesRaia = ['-80%', '0%', '80%'];
  
  // Chama a colisão quando a animação termina (quando chega no jogador)
  const handleAnimationEnd = () => {
    onCollide(caixa);
  };

  return (
    <img
      src="/presente.svg"
      className="item-coletavel"
      style={{
        transform: `translateX(${posicoesRaia[caixa.raia]})`,
        animation: `moveItem ${caixa.velocidade}s linear forwards`
      }}
      alt="Caixa de Presente"
      onAnimationEnd={handleAnimationEnd}
    />
  );
};

// --- Componente: GameHUD (Refatorado) ---
const GameHUD = ({ onOpenConfig, tempoExibido, tempoDecorridoMs }) => {
  return (
    <header>
      <button className="level-settings-btn" onClick={onOpenConfig}>
        <img src="/Settings.svg" alt="Configurações" />
      </button>
      <div className="two-columns">
        <ScoreDisplay tempoDecorridoMs={tempoDecorridoMs} />
      </div>
      <div className="timer">
        <img src="/timer.svg" alt="Cronômetro" />
        <p className="seconds">{tempoExibido}</p>
      </div>
    </header>
  );
};

// --- Componente: DesafioModal (Refatorado) ---
const DesafioModal = ({ isOpen, desafio, resposta, onRespostaChange, onSubmit, feedback }) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={true} title="" variant="puzzle">
      <div className="desafio-matematica-container">
        {desafio ? (
          <form className="desafio-form" onSubmit={onSubmit}>
            <label htmlFor="resposta-mat" className="pergunta-mat">
              {desafio.pergunta}
            </label>
            <input
              id="resposta-mat"
              type="number"
              pattern="\d*"
              value={resposta}
              onChange={(e) => onRespostaChange(e.target.value)}
              className={`input-mat ${feedback}`}
              disabled={!!feedback}
              autoFocus
            />
            <button type="submit" className="btn-responder" disabled={!!feedback}>
              Responder
            </button>
          </form>
        ) : (
          <p>Carregando desafio...</p>
        )}
      </div>
    </Modal>
  );
};


// --- Componente Principal ---
function Mundo6_Gameplay({ jogador, onFaseCompleta }) {
  const navigate = useNavigate();
  const { mundoId, faseId } = useParams();
  const { playSound, isMusicMuted, toggleMusic, isSfxMuted, toggleSfx } = useAudio();

  const mundo_id = parseInt(mundoId);
  const fase_id = parseInt(faseId);

  // Estados de Jogo
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [estadoJogo, setEstadoJogo] = useState("carregando");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [tempoInicioFase, setTempoInicioFase] = useState(Date.now());
  const [tempoDecorridoParaScore, setTempoDecorridoParaScore] = useState(0);
  const [tempoExibido, setTempoExibido] = useState("00:00");

  // Estados do Desafio
  const [desafios, setDesafios] = useState([]);
  const [caixas, setCaixas] = useState([]); // Caixas ativas na tela
  const [indiceDesafio, setIndiceDesafio] = useState(0); // Qual desafio estamos
  const [caixasColetadas, setCaixasColetadas] = useState(0);
  // ✅ RENOMEADO: De 'jogoFinalizado' para 'perseguicaoFinalAtiva'
  const [perseguicaoFinalAtiva, setPerseguicaoFinalAtiva] = useState(false);
  
  // Posição
  const [raiaJogador, setRaiaJogador] = useState(1); // 0: Esquerda, 1: Meio, 2: Direita
  const [raiaGuaxinim, setRaiaGuaxinim] = useState(1);
  const [yGuaxinim, setYGuaxinim] = useState(25); // Posição Y do guaxinim (em %)

  // Modal de Matemática
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [desafioAtual, setDesafioAtual] = useState(null);
  const [respostaUsuario, setRespostaUsuario] = useState("");
  const [feedback, setFeedback] = useState("");

  // --- Refs ---
  const spawIntervalRef = useRef(null); // Timer para spawnar caixas
  // ✅ ADICIONADO: Refs para estabilidade
  const tempoDecorridoRef = useRef(0);
  const estadoJogoRef = useRef(estadoJogo);

  // --- Efeitos ---
  useEffect(() => {
    const audio = playSound('musica-mundo-4', true); // Música animada
    return () => { if (audio) audio.pause(); };
  }, [playSound]);

  useEffect(() => {
    if (fase_id === 1) {
      const storageKey = `tutorial_mundo_${mundo_id}_visto`;
      const tutorialJaVisto = sessionStorage.getItem(storageKey);
      if (!tutorialJaVisto) setIsTutorialOpen(true);
    }
  }, [mundo_id, fase_id]);

  // Carregar desafios
  const inicializarFase = useCallback(async () => {
    setEstadoJogo("carregando");
    setDesafios([]);
    setCaixas([]);
    setIndiceDesafio(0);
    setCaixasColetadas(0);
    setPerseguicaoFinalAtiva(false); // ✅ RENOMEADO
    setRaiaJogador(1);
    setRaiaGuaxinim(1);
    setTempoInicioFase(Date.now());
    setTempoDecorridoParaScore(0);
    setTempoExibido("00:00");
    setIsModalOpen(false);
    
    if (isTutorialOpen) {
      setEstadoJogo("jogando"); // Pausado pelo tutorial
      return;
    }

    const desafiosDaApi = await buscarDesafiosDaFase(fase_id);
    if (desafiosDaApi) {
      setDesafios(desafiosDaApi);
      setEstadoJogo("jogando");
    } else {
      console.error("Não foi possível carregar os desafios da fase bônus.");
      setEstadoJogo("erro");
    }
  }, [fase_id, isTutorialOpen]);

  useEffect(() => {
    if (!jogador) navigate("/");
    else inicializarFase();
  }, [jogador, navigate, inicializarFase]);

  // ✅ ADICIONADO: Sincroniza o ref com o estado
  useEffect(() => {
    estadoJogoRef.current = estadoJogo;
  }, [estadoJogo]);

  // --- Lógica de Finalização (Estável) ---
  const finalizarFase = useCallback((motivo = 'concluido') => {
    // ✅ CORRIGIDO: Lê o estado do ref
    if (estadoJogoRef.current === "finalizado") return;
    setEstadoJogo("finalizado");
    clearInterval(spawIntervalRef.current);
    
    // ✅ CORRIGIDO: Lê o tempo do ref
    const tempoFinalSegundos = Math.floor(tempoDecorridoRef.current / 1000);
    let estrelas = 0;
    if (motivo === 'concluido') {
        if (tempoFinalSegundos <= TEMPO_3_ESTRELAS) estrelas = 3;
        else if (tempoFinalSegundos <= TEMPO_2_ESTRELAS) estrelas = 2;
        else estrelas = 1;
    }
    onFaseCompleta({ estrelas, tempoConclusao: tempoFinalSegundos });
  }, [onFaseCompleta]); // ✅ Dependências estáveis

  // --- Spawner de Caixas ---
  useEffect(() => {
    // ✅ RENOMEADO
    if (estadoJogo === "jogando" && !isTutorialOpen && !isModalOpen && !perseguicaoFinalAtiva) {
      // Inicia o spawner de caixas
      spawIntervalRef.current = setInterval(() => {
        if (indiceDesafio >= desafios.length) {
          // Se acabaram os desafios, para de spawnar
          clearInterval(spawIntervalRef.current);
          setPerseguicaoFinalAtiva(true); // ✅ RENOMEADO
          return;
        }

        const novaCaixa = {
          id: Date.now(), // ID único
          desafio: desafios[indiceDesafio],
          raia: Math.floor(Math.random() * 3), // Raia aleatória (0, 1, ou 2)
          velocidade: 2, // Duração da animação (em segundos)
        };
        
        setCaixas(prev => [...prev, novaCaixa]);
        setIndiceDesafio(idx => idx + 1); // Avança para o próximo desafio

      }, 3000); // Spawna uma caixa a cada 3 segundos (ajuste)
    } else {
      // Pausa o spawner
      clearInterval(spawIntervalRef.current);
    }
    return () => clearInterval(spawIntervalRef.current);
}, [estadoJogo, isTutorialOpen, isModalOpen, desafios, indiceDesafio, perseguicaoFinalAtiva]); // ✅ RENOMEADO

  // --- Lógica de Perseguição (Guaxinim) ---
  useEffect(() => {
    if (perseguicaoFinalAtiva) { // ✅ RENOMEADO
      // Se o jogo terminou, o guaxinim "desacelera" (vem para perto)
      // e o macaco o alcança para terminar a fase.
      setYGuaxinim(60); // Guaxinim vem mais para perto
      // Simula a captura após um tempo
      setTimeout(() => {
        setYGuaxinim(POSICAO_JOGADOR_Y - 5); // Fica bem em cima do macaco
        playSound('vitoria');
        finalizarFase('concluido');
      }, 1500);
    } else {
      // Movimento aleatório do guaxinim
      const moveGuaxinim = setInterval(() => {
        setRaiaGuaxinim(Math.floor(Math.random() * 3));
      }, 2000); // Muda de raia a cada 2s
      return () => clearInterval(moveGuaxinim);
    }
  }, [perseguicaoFinalAtiva, finalizarFase, playSound]); // ✅ RENOMEADO


  // --- Handlers de Input (Teclado) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (estadoJogo !== "jogando" || isModalOpen || isTutorialOpen) return;
      
      e.preventDefault(); // Previne rolagem da página
      if (e.key === "ArrowLeft") {
        setRaiaJogador(raia => Math.max(0, raia - 1)); // Vai para esquerda
      } else if (e.key === "ArrowRight") {
        setRaiaJogador(raia => Math.min(2, raia + 1)); // Vai para direita
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [estadoJogo, isModalOpen, isTutorialOpen]);

  // --- Handlers de Input (Toque/Swipe) ---
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (estadoJogo !== "jogando" || isModalOpen || isTutorialOpen) return;
    
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) { // Limite mínimo de swipe
      if (diff > 0) { // Swipe para Esquerda
        setRaiaJogador(raia => Math.max(0, raia - 1));
      } else { // Swipe para Direita
        setRaiaJogador(raia => Math.min(2, raia + 1));
      }
    }
    // Reseta os valores
    touchStartX.current = 0;
    touchEndX.current = 0;
  };


  // --- Lógica de Colisão e Puzzle ---
  const handleCollision = (caixaColidida) => {
    // Remove a caixa da tela
    setCaixas(prev => prev.filter(c => c.id !== caixaColidida.id));

    // Se o jogador estiver na raia errada, não abre o modal
    if (raiaJogador !== caixaColidida.raia) {
      playSound('fase-erro'); // Som de "perder" a caixa
      return;
    }

    // Colisão correta: Pausa o jogo e abre o modal
    playSound("som-pegar-item");
    setEstadoJogo("pausado");
    setDesafioAtual(caixaColidida.desafio);
    setIsModalOpen(true);
    setFeedback("");
    setRespostaUsuario("");
  };
  
  const handleVerificarResposta = (e) => {
    e.preventDefault();
    if (feedback || !desafioAtual) return;

    if (respostaUsuario.trim() === desafioAtual.resposta) {
        playSound('fase-acerto');
        setFeedback("correto");
        setCaixasColetadas(count => count + 1); // Incrementa caixas corretas
        
        setTimeout(() => {
            setIsModalOpen(false);
            setEstadoJogo("jogando"); // Retoma o jogo
            setDesafioAtual(null);
        }, 1000);

    } else {
        playSound('fase-erro');
        setFeedback("incorreto");
        setTimeout(() => {
            setFeedback("");
            setRespostaUsuario("");
        }, 1000);
    }
  };


  // --- Outros Handlers ---
  const handleCloseTutorial = () => {
    sessionStorage.setItem(`tutorial_mundo_${mundo_id}_visto`, 'true');
    setIsTutorialOpen(false);
    setTempoInicioFase(Date.now()); // Inicia o tempo
  };

  const onTempoTick = (tempoMs) => {
        setTempoExibido(formatTime(tempoMs, "ms"));
        setTempoDecorridoParaScore(tempoMs);
        tempoDecorridoRef.current = tempoMs; // ✅ CORRIGIDO: Atualiza o ref
  };

  const handleOpenConfig = () => { playSound('click'); setIsConfigOpen(true); };
  const handleVoltarAoMapa = () => { playSound('click'); navigate("/mapa-do-jogo", { state: { jogador, mundo_id: MUNDO_ID } }); };
  const handlePausar = () => { playSound('click'); setEstadoJogo(estadoJogo === 'jogando' ? 'pausado' : 'jogando'); };
  const handleRetry = () => { playSound('click'); inicializarFase(); };
  const handleNavigateAjuda = () => { playSound('click'); navigate('/ajuda'); };
  const handleCloseConfig = () => { playSound('click'); setIsConfigOpen(false); };

  if (estadoJogo === "carregando") return <div className="loading-screen-6">Carregando Desafio Bônus...</div>;
  if (estadoJogo === "erro") return <div className="error-screen-6">Erro ao carregar o Desafio Bônus.</div>;

  return (
    <section 
      className="mundo6-section"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <TutorialModal isOpen={isTutorialOpen} onClose={handleCloseTutorial} steps={tutorials[mundo_id]} />
      
      {/* Cenário "3D" Falso */}
      <img
          src="/bonus-bg.svg"
          alt="fundo-de-floresta"
          className="level-bonus-bg"
        />

      <div className="mundo6-cenario">
        <div className="pista"></div>
      </div>

      {/* Container dos Sprites */}
      <div className="sprites-container">
        <Guaxinim 
          raia={raiaGuaxinim} 
          yPos={yGuaxinim} 
          sprite="/raccoon-back.svg" 
          pego={perseguicaoFinalAtiva} // ✅ RENOMEADO
        />
        <Player 
          raia={raiaJogador} 
          sprite="/monkey-back.svg" 
        />
        {caixas.map(caixa => 
          <CaixaPresente key={caixa.id} caixa={caixa} onCollide={handleCollision} />
        )}
      </div>
      
      {/* ✅ REFATORADO: HUD */}
      <GameHUD
        onOpenConfig={handleOpenConfig}
        tempoExibido={tempoExibido}
        tempoDecorridoMs={tempoDecorridoParaScore}
      />

      {(estadoJogo === "jogando" || estadoJogo === "pausado") && (
          <Cronometro
              isPaused={estadoJogo !== 'jogando' || isTutorialOpen || isModalOpen}
              tempoInicioFase={tempoInicioFase}
              limiteTempoFase={TEMPO_1_ESTRELA * 1000} 
              onTempoTick={onTempoTick}
              onFaseTermina={() => finalizarFase('tempo_esgotado')}
          />
      )}
      
      {/* ✅ REFATORADO: Modal de Desafio */}
      <DesafioModal
        isOpen={isModalOpen}
        desafio={desafioAtual}
        resposta={respostaUsuario}
        onRespostaChange={setRespostaUsuario}
        onSubmit={handleVerificarResposta}
        feedback={feedback}
      />

      {/* Modal de Configuração */}
      <Modal isOpen={isConfigOpen} onClose={handleCloseConfig} variant="config">
          <div className="btn-level-grid">
              <button className={`btn music-btn ${isMusicMuted ? 'grayscale' : ''}`} onClick={toggleMusic}><div></div> música</button>
              <button className={`btn effect-btn ${isSfxMuted ? 'grayscale' : ''}`} onClick={toggleSfx}><div></div> efeitos</button>
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

export default Mundo6_Gameplay;