import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/Fase.css";
import "../styles/Mundo1.css";
import Modal from "./Modal.jsx";
import Cronometro from "./Cronometro.jsx";
import ScoreDisplay from "./ScoreDisplay.jsx";
import { buscarItensPorFase } from "../services/apiItensFase.js";
import { useAudio } from "../hooks/useAudio";
import TutorialModal from "./TutorialModal.jsx";
import { tutorials } from "../data/tutorialData.js";

const GRAVIDADE = 0.8;
const FORCA_PULO = 18;
const VELOCIDADE_PERSONAGEM = 8;
const ALTURA_CHAO = 87;
const VELOCIDADE_FRUTAS = 2;
const TEMPO_3_ESTRELAS = 60;
const TEMPO_2_ESTRELAS = 180;
const TEMPO_1_ESTRELA = 300;
const LIMITE_DICAS = 15;

// Constantes de velocidade para o cenário
const VELOCIDADE_NUVENS = 2;
const VELOCIDADE_ARVORES = 4;

const formatTime = (time, unit = "ms") => {
  const totalSeconds = unit === "ms" ? Math.floor(time / 1000) : time;
  const min = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const sec = String(totalSeconds % 60).padStart(2, "0");
  return `${min}:${sec}`;
};

const gerarLetrasPuzzle = (palavra) => {
  const letrasPalavra = palavra.split("");
  const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let letrasGrid = [];
  letrasPalavra.forEach((letra, index) => {
    letrasGrid.push({ id: `palavra-${index}`, letra: letra });
  });
  while (letrasGrid.length < 8) {
    const letraAleatoria =
      alfabeto[Math.floor(Math.random() * alfabeto.length)];
    letrasGrid.push({
      id: `aleatoria-${letrasGrid.length}`,
      letra: letraAleatoria,
    });
  }
  return letrasGrid.sort(() => Math.random() - 0.5);
};

const Personagem = ({ pos, direcao }) => (
  <img
    src="/monkey-run.gif"
    className={`personagem-gif ${
      direcao === "esquerda" ? "virado-esquerda" : ""
    }`}
    style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
    alt="Personagem Macaco Correndo"
  />
);
const Fruta = ({ fruta }) => (
  <img
    src={fruta.imgSrc}
    className="fruta"
    style={{ left: `${fruta.x}px`, top: `${fruta.y}px` }}
    alt={fruta.nome}
  />
);

function Mundo1_Gameplay({ jogador, onFaseCompleta }) {
  const navigate = useNavigate();
  const { mundoId, faseId } = useParams();
  const { playSound, isMusicMuted, toggleMusic, isSfxMuted, toggleSfx } =
    useAudio();

  const mundo_id = parseInt(mundoId);
  const fase_id = parseInt(faseId);

  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [estadoJogo, setEstadoJogo] = useState("carregando");
  const [tempoInicioFase, setTempoInicioFase] = useState(Date.now());
  const [tempoDecorridoParaScore, setTempoDecorridoParaScore] = useState(0);
  const [dicasTotaisUsadas, setDicasTotaisUsadas] = useState(0);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [tempoExibido, setTempoExibido] = useState("00:00");
  const [personagemPos, setPersonagemPos] = useState({ x: 100, y: 0, vy: 0 });
  const [direcaoPersonagem, setDirecaoPersonagem] = useState("direita");
  const [teclasPressionadas, setTeclasPressionadas] = useState({});
  const [frutas, setFrutas] = useState([]);
  const [isPuzzleOpen, setIsPuzzleOpen] = useState(false);
  const [puzzleAtual, setPuzzleAtual] = useState({
    fruta: null,
    letrasGrid: [],
    slotsResposta: [],
  });
  const [puzzleError, setPuzzleError] = useState(false);
  const [colisaoAtiva, setColisaoAtiva] = useState(false);
  const [itemEmJogo, setItemEmJogo] = useState(null);
  const [dicaExibida, setDicaExibida] = useState(
    "Colete as frutas para aprender a soletrar!"
  );

  // States para a posição do cenário
  const [backgroundX, setBackgroundX] = useState(0);
  const [treesX, setTreesX] = useState(0);
  // State para guardar a largura da tela
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  const gameLoopRef = useRef();

  useEffect(() => {
    const musicaMundo = `musica-mundo-${mundo_id}`;
    const audio = playSound(musicaMundo, true);
    return () => {
      if (audio) audio.pause();
    };
  }, [mundo_id, playSound]);

  useEffect(() => {
    if (fase_id === 1) {
      const storageKey = `tutorial_mundo_${mundo_id}_visto`;
      const tutorialJaVisto = sessionStorage.getItem(storageKey);
      if (!tutorialJaVisto) {
        setIsTutorialOpen(true);
      }
    }
  }, [mundo_id, fase_id]);

  // useEffect para atualizar a largura da tela se a janela mudar
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleFaseTermina = useCallback(
    ({ tempoFinalMs, motivo }) => {
      if (estadoJogo === "finalizado") return;
      setEstadoJogo("finalizado");
      const tempoFinalSegundos = Math.floor(tempoFinalMs / 1000);
      let estrelas = 0;
      if (motivo !== "tempo_esgotado") {
        if (tempoFinalSegundos <= TEMPO_3_ESTRELAS) estrelas = 3;
        else if (tempoFinalSegundos <= TEMPO_2_ESTRELAS) estrelas = 2;
        else if (tempoFinalSegundos <= TEMPO_1_ESTRELA) estrelas = 1;
        if (dicasTotaisUsadas > LIMITE_DICAS)
          estrelas = Math.max(0, estrelas - 1);
      }

      onFaseCompleta({ estrelas, tempoConclusao: tempoFinalSegundos });
    },
    [estadoJogo, dicasTotaisUsadas, onFaseCompleta]
  );

  const inicializarFase = useCallback(async () => {
    const itensDaApi = await buscarItensPorFase(mundo_id, fase_id);
    if (itensDaApi.length === 0) {
      throw new Error("Nenhum item encontrado para a fase.");
    }
    setTempoInicioFase(Date.now());
    setDicasTotaisUsadas(0);
    setTempoDecorridoParaScore(0);
    setPersonagemPos({ x: 100, y: 0, vy: 0 });
    setDirecaoPersonagem("direita");
    setColisaoAtiva(false);
    const screenWidth = window.innerWidth;
    const totalWorldWidth = itensDaApi.length * 400;
    setFrutas(
      itensDaApi.map((item, index) => ({
        id: item.id,
        nome: item.resposta.toUpperCase(),
        imgSrc: item.imagem_url,
        dica1: item.dica1,
        dica2: item.dica2,
        x: screenWidth + 200 + index * 400,
        y:
          window.innerHeight * (ALTURA_CHAO / 100) -
          150 -
          (index % 2 === 0 ? 0 : 80),
        initialY:
          window.innerHeight * (ALTURA_CHAO / 100) -
          150 -
          (index % 2 === 0 ? 0 : 80),
        pega: false,
        totalWorldWidth: totalWorldWidth,
      }))
    );
    setEstadoJogo("jogando");
    setIsConfigOpen(false);
  }, [mundo_id, fase_id]);

  const handleConcluirFase = useCallback(() => {
    if (estadoJogo === "finalizado") return;
    const tempoFinalMs = Date.now() - tempoInicioFase;
    handleFaseTermina({ tempoFinalMs });
  }, [estadoJogo, tempoInicioFase, handleFaseTermina]);

  useEffect(() => {
    if (!jogador) {
      navigate("/");
    } else {
      inicializarFase().catch((error) => {
        console.error("Falha ao inicializar a fase:", error);
        setEstadoJogo("erro");
      });
    }
  }, [jogador, navigate, inicializarFase]);

  useEffect(() => {
    if (frutas.length > 0 && estadoJogo === "jogando") {
      if (frutas.every((fruta) => fruta.pega)) {
        handleConcluirFase();
      }
    }
  }, [frutas, estadoJogo, handleConcluirFase]);

  // O useEffect de teclado permanece o mesmo
  useEffect(() => {
    const handleKeyDown = (e) => {
      setTeclasPressionadas((prev) => ({ ...prev, [e.key]: true }));
      if (e.key === "ArrowUp") {
        playSound("som-pular");
      }
    };
    const handleKeyUp = (e) =>
      setTeclasPressionadas((prev) => ({ ...prev, [e.key]: false }));
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [playSound]);

  // Handlers para os botões de toque/clique
  const handleControlPress = useCallback(
    (e, key) => {
      e.preventDefault(); // Previne zoom/scroll no mobile
      setTeclasPressionadas((prev) => ({ ...prev, [key]: true }));
      if (key === "ArrowUp") {
        playSound("som-pular");
      }
    },
    [playSound]
  );

  const handleControlRelease = useCallback((e, key) => {
    e.preventDefault();
    setTeclasPressionadas((prev) => ({ ...prev, [key]: false }));
  }, []);

  const handlePegarFruta = useCallback(
    (fruta) => {
      playSound("som-pegar-item");
      setItemEmJogo({ ...fruta, timestampInicio: Date.now() });
      setDicaExibida("Arraste as letras para formar a palavra!");
      setPuzzleAtual({
        fruta: fruta,
        letrasGrid: gerarLetrasPuzzle(fruta.nome),
        slotsResposta: Array(fruta.nome.length).fill(null),
      });
      setIsPuzzleOpen(true);
    },
    [playSound]
  );

  const handleAcertoPuzzle = useCallback(() => {
    playSound("fase-acerto");
    setFrutas((prevFrutas) =>
      prevFrutas.map((f) =>
        f.id === puzzleAtual.fruta.id ? { ...f, pega: true } : f
      )
    );
    setIsPuzzleOpen(false);
    setColisaoAtiva(false);
    setItemEmJogo(null);
    setDicaExibida("Parabéns! Continue coletando as outras frutas.");
  }, [puzzleAtual.fruta, playSound]);

  const gameLoop = useCallback(() => {
    // Lógica do gameLoop permanece idêntica
    if (estadoJogo !== "jogando" || isPuzzleOpen || isTutorialOpen) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // Lógica do personagem
    setPersonagemPos((prevPos) => {
      let { x, y, vy } = prevPos;
      if (teclasPressionadas["ArrowLeft"]) x -= VELOCIDADE_PERSONAGEM;
      if (teclasPressionadas["ArrowRight"]) x += VELOCIDADE_PERSONAGEM;
      setDirecaoPersonagem(
        teclasPressionadas["ArrowLeft"] ? "esquerda" : "direita"
      );
      vy += GRAVIDADE;
      y += vy;
      const chao = window.innerHeight * (ALTURA_CHAO / 100) - 50;
      if (y > chao) {
        y = chao;
        vy = 0;
      }
      if (teclasPressionadas["ArrowUp"] && y === chao) vy = -FORCA_PULO;
      if (x < 0) x = 0;
      if (x > window.innerWidth - 50) x = window.innerWidth - 50;
      return { x, y, vy };
    });

    // Lógica das frutas
    setFrutas((frutasAtuais) =>
      frutasAtuais.map((fruta) => {
        if (!fruta.pega) {
          fruta.x -= VELOCIDADE_FRUTAS;
          if (fruta.x < -100) fruta.x += fruta.totalWorldWidth;
        }
        return fruta;
      })
    );

    // Lógica de animação do cenário
    setBackgroundX(prevX => {
      let nextX = prevX - VELOCIDADE_NUVENS;
      if (nextX <= -screenWidth) {
        return 0;
      }
      return nextX;
    });

    setTreesX(prevX => {
      let nextX = prevX - VELOCIDADE_ARVORES;
      if (nextX <= -screenWidth) {
        return 0;
      }
      return nextX;
    });

    // Lógica de colisão
    for (const fruta of frutas) {
      if (!fruta.pega && !colisaoAtiva) {
        const pRect = {
          x: personagemPos.x,
          y: personagemPos.y,
          width: 50,
          height: 50,
        };
        const fRect = { x: fruta.x, y: fruta.y, width: 50, height: 50 };
        if (
          pRect.x < fRect.x + fRect.width &&
          pRect.x + pRect.width > fRect.x &&
          pRect.y < fRect.y + fRect.height &&
          pRect.y + pRect.height > fRect.y
        ) {
          setColisaoAtiva(true);
          handlePegarFruta(fruta);
          break;
        }
      }
    }
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [
    estadoJogo,
    isPuzzleOpen,
    isTutorialOpen,
    teclasPressionadas, // É lido pelo gameLoop, então precisa estar aqui
    personagemPos,      // É lido pelo gameLoop, então precisa estar aqui
    frutas,             // É lido pelo gameLoop, então precisa estar aqui
    handlePegarFruta,
    colisaoAtiva,
    screenWidth
  ]);

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [gameLoop]);

  const handleDragStart = (e, letraObj, origem, index) => {
    e.dataTransfer.setData(
      "letraData",
      JSON.stringify({ ...letraObj, origem, index })
    );
  };
  const handleDropLetra = (e, indexSlotDestino) => {
    e.preventDefault();
    const letraData = JSON.parse(e.dataTransfer.getData("letraData"));
    const novosSlots = [...puzzleAtual.slotsResposta];
    const novoGrid = [...puzzleAtual.letrasGrid];
    const letraDeslocada = novosSlots[indexSlotDestino];
    novosSlots[indexSlotDestino] = { id: letraData.id, letra: letraData.letra };
    if (letraData.origem === "grid") {
      const indexOriginalGrid = novoGrid.findIndex(
        (l) => l && l.id === letraData.id
      );
      if (indexOriginalGrid !== -1) {
        novoGrid[indexOriginalGrid] = letraDeslocada;
      }
    } else {
      novosSlots[letraData.index] = letraDeslocada;
    }
    setPuzzleAtual((prev) => ({
      ...prev,
      slotsResposta: novosSlots,
      letrasGrid: novoGrid,
    }));
    if (novosSlots.every((slot) => slot !== null)) {
      const palavraFormada = novosSlots.map((s) => s.letra).join("");
      if (palavraFormada === puzzleAtual.fruta.nome) {
        setTimeout(handleAcertoPuzzle, 300);
      } else {
        playSound("fase-erro");
        setPuzzleError(true);
        setTimeout(() => setPuzzleError(false), 800);
      }
    }
  };

  const handleDropNoGrid = (e) => {
    e.preventDefault();
    const letraData = JSON.parse(e.dataTransfer.getData("letraData"));
    if (letraData.origem === "slot") {
      const novosSlots = [...puzzleAtual.slotsResposta];
      const novoGrid = [...puzzleAtual.letrasGrid];
      const indexVazio = novoGrid.findIndex((l) => l === null);
      if (indexVazio !== -1) {
        novoGrid[indexVazio] = { id: letraData.id, letra: letraData.letra };
        novosSlots[letraData.index] = null;
        setPuzzleAtual((prev) => ({
          ...prev,
          slotsResposta: novosSlots,
          letrasGrid: novoGrid,
        }));
      }
    }
  };

  const handleTempoTick = (tempoMs) => {
    setTempoExibido(formatTime(tempoMs, "ms"));
    setTempoDecorridoParaScore(tempoMs);
  };
  const handleDicaLiberada = (nivelDica, itemId) => {
    const item = itemEmJogo;
    if (!item || item.id !== itemId) return;
    const dicaTexto = nivelDica === 1 ? item.dica1 : item.dica2;
    if (dicaTexto) {
      setDicaExibida(dicaTexto);
      setDicasTotaisUsadas((prev) => prev + 1);
    }
  };

  const handleOpenConfig = () => {
    playSound("click");
    setIsConfigOpen(true);
  };
  const handleVoltarAoMapa = () => {
    playSound("click");
    navigate("/mapa-do-jogo", { state: { jogador, mundo_id } });
  };
  const handleRetry = () => {
    playSound("click");
    inicializarFase();
  };
  const handlePausar = () => {
    playSound("click");
    setEstadoJogo(estadoJogo === "jogando" ? "pausado" : "jogando");
  };
  const handleNavigateAjuda = () => {
    playSound("click");
    navigate("/ajuda");
  };
  const handleCloseConfig = () => {
    playSound("click");
    setIsConfigOpen(false);
  };
  const handleCloseTutorial = () => {
    const storageKey = `tutorial_mundo_${mundo_id}_visto`;
    sessionStorage.setItem(storageKey, "true");
    setIsTutorialOpen(false);
    setTempoInicioFase(Date.now());
  };

  if (estadoJogo === "carregando") {
    return <div className="loading-screen-1">Carregando fase...</div>;
  }
  if (estadoJogo === "erro") {
    return (
      <div className="error-screen-1">Ocorreu um erro ao carregar a fase.</div>
    );
  }

  return (
    <section className="level-section">
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={handleCloseTutorial}
        steps={tutorials[mundo_id]}
      />
      {estadoJogo === "jogando" && (
        <Cronometro
          isPaused={isPuzzleOpen || estadoJogo === "pausado" || isTutorialOpen}
          tempoInicioFase={tempoInicioFase}
          limiteTempoFase={TEMPO_1_ESTRELA * 1000}
          onTempoTick={handleTempoTick}
          onFaseTermina={(resultado) =>
            handleFaseTermina({ ...resultado, motivo: "tempo_esgotado" })
          }
          itemAtual={itemEmJogo}
          onDicaLiberada={handleDicaLiberada}
        />
      )}
      <div className="level-container">
        <img
          src="/level-1-background.svg"
          alt="fundo-de-floresta"
          className="level-1-bg"
        />

        <div 
          className="clouds-wrapper"
          style={{ transform: `translateX(${backgroundX}px)` }}
        >
          <img src="/clouds.svg" alt="nuvens" className="clouds" />
          <img src="/clouds.svg" alt="nuvens" className="clouds" /> 
        </div>
        
        <div 
          className="trees-wrapper"
          style={{ transform: `translateX(${treesX}px)` }}
        >
          <img src="/trees-transparent.svg" alt="pinheiros" className="pines" />
          <img src="/trees-transparent.svg" alt="pinheiros" className="pines" />

        </div>

        <div className="chao"></div>
        <Personagem pos={personagemPos} direcao={direcaoPersonagem} />
        {frutas.map(
          (fruta) => !fruta.pega && <Fruta key={fruta.id} fruta={fruta} />
        )}
      </div>
      <header>
        <button className="level-settings-btn" onClick={handleOpenConfig}>
          <img src="/Settings.svg" alt="Configurações" />
        </button>
        <ScoreDisplay
          tempoDecorridoMs={tempoDecorridoParaScore}
          dicasTotaisUsadas={dicasTotaisUsadas}
        />
        <div className="timer">
          <img src="/timer.svg" alt="Cronômetro" />
          <p className="seconds">{tempoExibido}</p>
        </div>
      </header>
      <Modal
        isOpen={isPuzzleOpen}
        title="Qual o nome da fruta?"
        variant="puzzle"
      >
        <div className="puzzle-container">
          <div className="fruit-slots">
            <img
              src={puzzleAtual.fruta?.imgSrc}
              alt={puzzleAtual.fruta?.nome}
              className="puzzle-fruta-img"
            />
            <div
              className={`puzzle-slots-resposta ${puzzleError ? "error" : ""}`}
              onDragOver={(e) => e.preventDefault()}
            >
              {puzzleAtual.slotsResposta.map((letraObj, index) => (
                <div
                  key={index}
                  className="slot-resposta"
                  onDrop={(e) => handleDropLetra(e, index)}
                >
                  {letraObj && (
                    <div
                      className="letra-arrastavel"
                      draggable
                      onDragStart={(e) =>
                        handleDragStart(e, letraObj, "slot", index)
                      }
                    >
                      {letraObj.letra}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div
            className="puzzle-letras-grid"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropNoGrid}
          >
            {puzzleAtual.letrasGrid.map((letraObj, index) => (
              <div key={letraObj?.id || index} className="slot-grid">
                {letraObj && (
                  <div
                    className={`letra-arrastavel letra-arrastavel-${index + 1}`}
                    draggable
                    onDragStart={(e) =>
                      handleDragStart(e, letraObj, "grid", index)
                    }
                  >
                    {letraObj.letra}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="balao-dicas">
            <img src="/baloon.svg" alt="" className="baloon" />
            <p id="hint-text">{dicaExibida}</p>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        variant="config"
      >
        <div className="btn-level-grid">
          <button
            className={`btn music-btn ${isMusicMuted ? "grayscale" : ""}`}
            onClick={toggleMusic}
          >
            <div></div> música
          </button>
          <button
            className={`btn effect-btn ${isSfxMuted ? "grayscale" : ""}`}
            onClick={toggleSfx}
          >
            <div></div> efeitos
          </button>
          <button className="btn map-btn" onClick={handleVoltarAoMapa}>
            <div></div>🏠
          </button>
          <button className="btn stop-btn" onClick={handlePausar}>
            <div></div>
            {estadoJogo === "pausado" ? "▶" : "⏸"}
          </button>
          <button className="btn retry-btn" onClick={handleRetry}>
            <div></div>↩
          </button>
          <button className="btn help-btn" onClick={handleNavigateAjuda}>
            <div></div> ajuda
          </button>
          <button className="btn skip-btn" onClick={handleCloseConfig}>
            <div></div>fechar
          </button>
        </div>
      </Modal>
      <div className="mobile-controls">
        <div className="controls-left-side">
          <button
            className="control-btn"
            onTouchStart={(e) => handleControlPress(e, "ArrowLeft")}
            onTouchEnd={(e) => handleControlRelease(e, "ArrowLeft")}
            onMouseDown={(e) => handleControlPress(e, "ArrowLeft")}
            onMouseUp={(e) => handleControlRelease(e, "ArrowLeft")}
            onMouseLeave={(e) => handleControlRelease(e, "ArrowLeft")}
          >
            ◀
          </button>
          <button
            className="control-btn"
            onTouchStart={(e) => handleControlPress(e, "ArrowRight")}
            onTouchEnd={(e) => handleControlRelease(e, "ArrowRight")}
            onMouseDown={(e) => handleControlPress(e, "ArrowRight")}
            onMouseUp={(e) => handleControlRelease(e, "ArrowRight")}
            onMouseLeave={(e) => handleControlRelease(e, "ArrowRight")}
          >
            ▶
          </button>
        </div>
        <div className="controls-right-side">
          <button
            className="control-btn"
            onTouchStart={(e) => handleControlPress(e, "ArrowUp")}
            onTouchEnd={(e) => handleControlRelease(e, "ArrowUp")}
            onMouseDown={(e) => handleControlPress(e, "ArrowUp")}
            onMouseUp={(e) => handleControlRelease(e, "ArrowUp")}
            onMouseLeave={(e) => handleControlRelease(e, "ArrowUp")} // Corrigido de ArrowLeft para ArrowUp
          >
            ▲
          </button>
        </div>
      </div>
    </section>
  );
}

export default Mundo1_Gameplay;