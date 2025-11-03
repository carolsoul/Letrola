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

// --- Constantes do Jogo ---
const GRAVIDADE = 0.8;
const FORCA_PULO = 18;
const VELOCIDADE_PERSONAGEM = 8;
const ALTURA_CHAO_PERCENT = 87; // Renomeado de ALTURA_CHAO para clareza
const VELOCIDADE_FRUTAS = 2;
const TEMPO_3_ESTRELAS = 60;
const TEMPO_2_ESTRELAS = 180;
const TEMPO_1_ESTRELA = 300;
const LIMITE_DICAS = 15;
const VELOCIDADE_NUVENS = 2;
const VELOCIDADE_ARVORES = 2.5;

// --- Funções Utilitárias ---
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

// --- Componentes ---
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

// ATUALIZADO: Componente Fruta agora calcula seu próprio 'top'
const Fruta = ({ fruta }) => {
  // Calcula a posição Y dinamicamente com base na altura atual da tela
  const ground = window.innerHeight * (ALTURA_CHAO_PERCENT / 100);
  const topPos = ground + fruta.yOffset; // yOffset é negativo (ex: -150px)

  return (
    <img
      src={fruta.imgSrc}
      className="fruta"
      style={{ left: `${fruta.x}px`, top: `${topPos}px` }}
      alt={fruta.nome}
    />
  );
};

// --- Componente Principal ---
function Mundo1_Gameplay({ jogador, onFaseCompleta }) {
  const navigate = useNavigate();
  const { mundoId, faseId } = useParams();
  const { playSound, isMusicMuted, toggleMusic, isSfxMuted, toggleSfx } =
    useAudio();

  const mundo_id = parseInt(mundoId);
  const fase_id = parseInt(faseId);

  // States do Jogo
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

  // States do Puzzle
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
  // NOVO: State para "tap-to-move" no mobile
  const [letraSelecionada, setLetraSelecionada] = useState(null);

  // States do Cenário
  const [backgroundX, setBackgroundX] = useState(0);
  const [treesX, setTreesX] = useState(0);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  const gameLoopRef = useRef();

  // --- Efeitos ---
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

  // Atualiza screenWidth em redimensionamento
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handlers do Jogo
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
    const currentScreenWidth = window.innerWidth;
    const totalWorldWidth = itensDaApi.length * 400;
    
    // ATUALIZADO: Armazena 'yOffset' em vez de 'y' fixo
    setFrutas(
      itensDaApi.map((item, index) => ({
        id: item.id,
        nome: item.resposta.toUpperCase(),
        imgSrc: item.imagem_url,
        dica1: item.dica1,
        dica2: item.dica2,
        x: currentScreenWidth + 200 + index * 400,
        yOffset: -150 - (index % 2 === 0 ? 0 : 80), // Offset negativo do chão
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

  // Handlers de Input (Teclado)
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

  // Handlers de Input (Toque)
  const handleControlPress = useCallback(
    (e, key) => {
      e.preventDefault();
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

  
  // --- Handlers do Puzzle (MOVIDOS PARA CIMA) ---

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
      setLetraSelecionada(null); // Limpa seleção ao abrir puzzle
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


  // --- Game Loop ---
  const gameLoop = useCallback(() => {
    if (estadoJogo !== "jogando" || isPuzzleOpen || isTutorialOpen) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // Lógica do Personagem
    setPersonagemPos((prevPos) => {
      let { x, y, vy } = prevPos;
      if (teclasPressionadas["ArrowLeft"]) x -= VELOCIDADE_PERSONAGEM;
      if (teclasPressionadas["ArrowRight"]) x += VELOCIDADE_PERSONAGEM;
      setDirecaoPersonagem(
        teclasPressionadas["ArrowLeft"] ? "esquerda" : "direita"
      );
      vy += GRAVIDADE;
      y += vy;
      // ATUALIZADO: Usa a constante em %
      const chao = window.innerHeight * (ALTURA_CHAO_PERCENT / 100) - 50;
      if (y > chao) {
        y = chao;
        vy = 0;
      }
      if (teclasPressionadas["ArrowUp"] && y === chao) vy = -FORCA_PULO;
      if (x < 0) x = 0;
      if (x > window.innerWidth - 50) x = window.innerWidth - 50;
      return { x, y, vy };
    });

    // Lógica das Frutas
    setFrutas((frutasAtuais) =>
      frutasAtuais.map((fruta) => {
        if (!fruta.pega) {
          fruta.x -= VELOCIDADE_FRUTAS;
          if (fruta.x < -100) fruta.x += fruta.totalWorldWidth;
        }
        return fruta;
      })
    );

    // Lógica do Cenário
    setBackgroundX(prevX => {
      let nextX = prevX - VELOCIDADE_NUVENS;
      if (nextX <= -screenWidth) return 0;
      return nextX;
    });
    setTreesX(prevX => {
      let nextX = prevX - VELOCIDADE_ARVORES;
      if (nextX <= -screenWidth) return 0;
      return nextX;
    });

    // Lógica de Colisão
    const ground = window.innerHeight * (ALTURA_CHAO_PERCENT / 100);
    for (const fruta of frutas) {
      if (!fruta.pega && !colisaoAtiva) {
        const pRect = {
          x: personagemPos.x,
          y: personagemPos.y,
          width: 50,
          height: 50,
        };
        // ATUALIZADO: Calcula 'y' da fruta dinamicamente para colisão
        const frutaTopPos = ground + fruta.yOffset;
        const fRect = { x: fruta.x, y: frutaTopPos, width: 50, height: 50 };
        if (
          pRect.x < fRect.x + fRect.width &&
          pRect.x + pRect.width > fRect.x &&
          pRect.y < fRect.y + fRect.height &&
          pRect.y + pRect.height > fRect.y
        ) {
          setColisaoAtiva(true);
          handlePegarFruta(fruta); // Agora funciona
          break;
        }
      }
    }
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [
    estadoJogo,
    isPuzzleOpen,
    isTutorialOpen,
    teclasPressionadas,
    personagemPos,
    frutas,
    handlePegarFruta, // Dependência está correta
    colisaoAtiva,
    screenWidth
  ]);

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [gameLoop]);


  // --- Handlers do Puzzle (Drag/Tap) ---

  // Handlers de Drag-and-Drop (Desktop)
  const handleDragStart = (e, letraObj, origem, index) => {
    e.dataTransfer.setData(
      "letraData",
      JSON.stringify({ ...letraObj, origem, index })
    );
  };

  const handleDropLetra = (e, indexSlotDestino) => {
    e.preventDefault();
    const letraData = JSON.parse(e.dataTransfer.getData("letraData"));
    executarLogicaDrop(letraData, indexSlotDestino);
  };

  const handleDropNoGrid = (e) => {
    e.preventDefault();
    const letraData = JSON.parse(e.dataTransfer.getData("letraData"));
    executarLogicaRetornoGrid(letraData);
  };

  // Handlers de Tap-to-Move (Mobile)
  const handleClickLetra = (letraObj, origem, index) => {
    if (letraSelecionada && letraSelecionada.id === letraObj.id) {
      setLetraSelecionada(null); // Desseleciona
    } else {
      setLetraSelecionada({ ...letraObj, origem, index });
    }
  };

  const handleClickSlot = (indexSlotDestino) => {
    if (!letraSelecionada) return; // Nada selecionado
    executarLogicaDrop(letraSelecionada, indexSlotDestino);
    setLetraSelecionada(null); // Limpa seleção
  };

  const handleClickGrid = () => {
    if (!letraSelecionada) return; // Nada selecionado
    executarLogicaRetornoGrid(letraSelecionada);
    setLetraSelecionada(null); // Limpa seleção
  };

  // Lógica de Drop Refatorada (usada por D&D e Tap)
  const executarLogicaDrop = (letraData, indexSlotDestino) => {
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
    } else { // Origem === "slot"
      novosSlots[letraData.index] = letraDeslocada;
    }
    
    setPuzzleAtual((prev) => ({
      ...prev,
      slotsResposta: novosSlots,
      letrasGrid: novoGrid.filter(l => l !== null), // Limpa nulos
    }));

    // Checar vitória/erro
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

  // Lógica de Retorno ao Grid Refatorada
  const executarLogicaRetornoGrid = (letraData) => {
    if (letraData.origem !== 'slot') return; // Só retorna letras dos slots

    const novosSlots = [...puzzleAtual.slotsResposta];
    const novoGrid = [...puzzleAtual.letrasGrid];
    const indexVazio = novoGrid.findIndex((l) => l === null);

    if (indexVazio !== -1) { // Se houver espaço no grid
      novoGrid[indexVazio] = { id: letraData.id, letra: letraData.letra };
      novosSlots[letraData.index] = null;
      setPuzzleAtual((prev) => ({
        ...prev,
        slotsResposta: novosSlots,
        letrasGrid: novoGrid,
      }));
    } else { // Se grid estiver cheio, apenas adiciona
       setPuzzleAtual((prev) => ({
        ...prev,
        slotsResposta: novosSlots.map((s, i) => i === letraData.index ? null : s), // Limpa o slot
        letrasGrid: [...prev.letrasGrid, { id: letraData.id, letra: letraData.letra }], // Adiciona ao fim
      }));
    }
  };

  // --- Outros Handlers ---
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

  // --- Renderização ---
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
                  onClick={() => handleClickSlot(index)} // NOVO
                >
                  {letraObj && (
                    <div
                      className={`letra-arrastavel ${
                        letraSelecionada?.id === letraObj.id ? "selected" : ""
                      }`} // NOVO
                      draggable
                      onDragStart={(e) =>
                        handleDragStart(e, letraObj, "slot", index)
                      }
                      onClick={(e) => {
                        e.stopPropagation(); // Previne clique no slot
                        handleClickLetra(letraObj, "slot", index);
                      }} // NOVO
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
            onClick={handleClickGrid} // NOVO
          >
            {puzzleAtual.letrasGrid.map((letraObj, index) => (
              <div key={letraObj?.id || index} className="slot-grid">
                {letraObj && (
                  <div
                    className={`letra-arrastavel letra-arrastavel-${index + 1} ${
                        letraSelecionada?.id === letraObj.id ? "selected" : ""
                    }`} // NOVO
                    draggable
                    onDragStart={(e) =>
                      handleDragStart(e, letraObj, "grid", index)
                    }
                    onClick={(e) => {
                        e.stopPropagation(); // Previne clique no grid
                        handleClickLetra(letraObj, "grid", index);
                    }} // NOVO
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
            onMouseLeave={(e) => handleControlRelease(e, "ArrowUp")}
          >
            ▲
          </button>
        </div>
      </div>
    </section>
  );
}

export default Mundo1_Gameplay;