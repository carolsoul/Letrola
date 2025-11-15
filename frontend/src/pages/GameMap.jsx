import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/GameMap.css"; 
import Modal from "../components/Modal";
import PlacarModal from "../components/PlacarModal";
import ScoreDisplay from "../components/ScoreDisplay";
import { buscarFaseAtual, buscarEstrelas, buscarTotalEstrelas } from "../services/apiProgresso";
import { verificarAcessoFase } from "../services/apiFases";
import { mundos } from "../data/mundoData";
import { useAudio } from "../hooks/useAudio";

function GameMap() {
  const location = useLocation();
  const navigate = useNavigate();

  const { jogador, mundo_id = 1, checkWorldCompletion } = location.state || {};
  
  const { 
    playSound, 
    playAudioFile,
    stopDialogue,
    isMusicMuted, 
    toggleMusic, 
    isSfxMuted, 
    toggleSfx 
  } = useAudio();

  const dadosMundo = mundos[mundo_id] || mundos[1];
  const levels = [1, 2, 3, 4, 5];

  const [starsPerLevel, setStarsPerLevel] = useState({});
  const [faseMaisAlta, setFaseMaisAlta] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isWorldSelectOpen, setIsWorldSelectOpen] = useState(false);
  const [indiceHistoria, setIndiceHistoria] = useState(0);
  const [mostrarHistoria, setMostrarHistoria] = useState(false);
  const [mundosDesbloqueados, setMundosDesbloqueados] = useState({ 1: true });
  const [isFimDoMundoOpen, setIsFimDoMundoOpen] = useState(false);
  const [resultadoMundo, setResultadoMundo] = useState({ totalEstrelas: 0, mensagem: "" });
  const [isPlacarOpen, setIsPlacarOpen] = useState(false);

  const [isDialoguePlaying, setIsDialoguePlaying] = useState(false);

  const buscarDadosDoJogador = useCallback(async () => {
    if (!jogador || !jogador.id) return;
    const faseAtual = await buscarFaseAtual(jogador.id, mundo_id);
    setFaseMaisAlta(faseAtual);
    const newStars = {};
    for (const level of levels) {
      newStars[level] = await buscarEstrelas(jogador.id, mundo_id, level);
    }
    setStarsPerLevel(newStars);
    const statusMundos = { 1: true };
    for (const idMundo in mundos) {
        if (idMundo > 1) {
            const faseMaxMundoAnterior = await buscarFaseAtual(jogador.id, idMundo - 1);
            if (faseMaxMundoAnterior > 5) {
                statusMundos[idMundo] = true;
            }
        }
    }
    setMundosDesbloqueados(statusMundos);
  }, [jogador, mundo_id]);


  useEffect(() => {
    if (!jogador || !jogador.id) {
      navigate("/");
      return;
    }
    buscarDadosDoJogador();
  }, [jogador, navigate, mundo_id, buscarDadosDoJogador]);

  useEffect(() => {
    if (!jogador?.id || !dadosMundo?.historia?.length) {
      setMostrarHistoria(false);
      return;
    }
    const chave = `historia_mundo_${mundo_id}_jogador_${jogador.id}_vista`;
    const historiaJaVista = !!sessionStorage.getItem(chave);
    setMostrarHistoria(!historiaJaVista);
    setIndiceHistoria(0);
  }, [mundo_id, jogador?.id]);

  useEffect(() => {
    const verificarFimDeMundo = async () => {
        if (checkWorldCompletion && jogador && jogador.id) {
            const totalEstrelas = await buscarTotalEstrelas(jogador.id, mundo_id);
            const minimoParaAvancar = 11;
            const desbloqueado = totalEstrelas >= minimoParaAvancar;
            setResultadoMundo({
                totalEstrelas,
                mensagem: desbloqueado
                    ? `Você conseguiu ${totalEstrelas} estrelas! O próximo mundo foi desbloqueado!`
                    : `Você precisa de ${minimoParaAvancar} estrelas para desbloquear o próximo mundo. Você conseguiu ${totalEstrelas}. Jogue novamente!`
            });
            setIsFimDoMundoOpen(true);
        }
    };
    verificarFimDeMundo();
  }, [checkWorldCompletion, jogador, mundo_id]);

  useEffect(() => {
    if (mostrarHistoria && dadosMundo.historia && dadosMundo.historia[indiceHistoria]) {
      const audioPath = dadosMundo.historia[indiceHistoria].audio;
      
      if (audioPath) {
        setIsDialoguePlaying(true); // Desabilita o botão
        const audioInstance = playAudioFile(audioPath);

        if (audioInstance) {
          audioInstance.onended = () => {
            setIsDialoguePlaying(false);
          };
        } else {
          setIsDialoguePlaying(false);
        }
      } else {
        setIsDialoguePlaying(false);
      }
    }
  }, [mostrarHistoria, indiceHistoria, dadosMundo.historia, playAudioFile]);

  useEffect(() => {
    if (!mostrarHistoria) {
      stopDialogue();
      setIsDialoguePlaying(false);
    }
  }, [mostrarHistoria, stopDialogue]);

  const handleLevelClick = async (level) => {
    playSound('click');
    try {
      const resultado = await verificarAcessoFase(jogador.id, mundo_id, level);
      if (resultado?.permitido) {
        navigate(`/mundo/${mundo_id}/fase/${level}`, { state: { jogador } });
      } else {
        setModalMessage(resultado.mensagem || "Você ainda não pode acessar esta fase.");
        setIsModalOpen(true);
      }
    } catch (error) {
        setModalMessage("Não foi possível verificar o acesso à fase. Tente novamente.");
        setIsModalOpen(true);
    }
  };

  const handleWorldChange = (novoMundoId) => {
    playSound('click');
    navigate('/mapa-do-jogo', { state: { jogador, mundo_id: novoMundoId }, replace: true });
    setIsWorldSelectOpen(false);
  };

  const handleProximoDialogo = () => {
    if (dadosMundo.historia && indiceHistoria < dadosMundo.historia.length - 1) {
      setIndiceHistoria(indiceHistoria + 1);
    } else {
      const chave = `historia_mundo_${mundo_id}_jogador_${jogador.id}_vista`;
      sessionStorage.setItem(chave, 'true');
      setMostrarHistoria(false);
    }
  };

  const handleOpenConfig = () => {
    playSound('click');
    setIsConfigOpen(true);
  };

  const handleOpenPlacar = () => {
    playSound('click');
    setIsPlacarOpen(true);
  };

  const handleOpenWorldSelect = () => {
    playSound('click');
    setIsWorldSelectOpen(true);
  };

  const handleNavigateAjuda = () => {
    playSound('click');
    navigate('/ajuda');
  }

  const handleToggleMusic = () => {
    playSound('click');
    toggleMusic();
  }

  const handleToggleSfx = () => {
    playSound('click');
    toggleSfx();
  }

  const totalStars = Object.values(starsPerLevel).reduce((a, b) => a + b, 0);
  const maxStars = levels.length * 3;

  return (
    <section className="map-section">
      {mostrarHistoria && dadosMundo.historia && dadosMundo.historia[indiceHistoria] && (
        <div className="historia-overlay">
          <div className="historia-container">
            <img
              src={dadosMundo.historia[indiceHistoria].imagem}
              alt="Cena da história"
              className="historia-imagem"
            />
            <p className="historia-dialogo">
              {dadosMundo.historia[indiceHistoria].dialogo}
            </p>
            
            <button 
              className={`historia-btn ${isDialoguePlaying ? 'disabled-button' : ''}`} // Adiciona classe condicional
              onClick={handleProximoDialogo}
              disabled={isDialoguePlaying}
            >
              {indiceHistoria < dadosMundo.historia.length - 1 ? "Próximo" : "Jogar"}
            </button>
          </div>
        </div>
      )}

      <div className={`map-container mundo-${mundo_id}-layout`}>

        <img src={dadosMundo.mapa.imagem} alt={`Mapa do ${dadosMundo.nome}`} className="map"/>

        <div className="greeting">
          <h1>Olá, {jogador?.nome || "Jogador"}!</h1>
          <div className="stars-count">
            <p>{totalStars} / {maxStars}</p>
            <img src="/stars-count.svg" alt="tabua-de-madeira-com-estrelas" />
          </div>
        </div>

        <button className="settings-btn-right" onClick={handleOpenConfig}>
          <div></div>
          <img src="/Settings.svg" alt="Configurações" />
        </button>

        <button className="world-btn-right" onClick={handleOpenWorldSelect}>
          <div></div>
          <img src="/World.svg" alt="Mundos" />
        </button>

        <button className="placar-btn-right" onClick={handleOpenPlacar}>
          <div></div>
          <img src="/Trophy.svg" alt="Placar" /> 
        </button>


        <div className="levels-container">
          {levels.map((level) => {
            const isLocked = level > faseMaisAlta;
            return (
              <button
                key={level}
                onClick={() => handleLevelClick(level)}
                className={`level level-${level} ${isLocked ? 'locked' : ''}`}
              >
                <ScoreDisplay
                  starsEarned={starsPerLevel[level]}
                  variant="map"
                />
                <p>{level}</p>
                <img src="/level-button.svg" alt={`Botão fase ${level}`} />
              </button>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        variant="faseInfo"
      >
        <p>{modalMessage}</p>
      </Modal>

      <Modal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        variant="config"
      >
        <div className="btn-grid">
          <button className={`btn music-btn ${isMusicMuted ? 'grayscale' : ''}`} onClick={handleToggleMusic}>
              <div></div> música
          </button>
          <button className={`btn effect-btn ${isSfxMuted ? 'grayscale' : ''}`} onClick={handleToggleSfx}>
              <div></div> efeitos
          </button>
          <button className="btn help-btn" onClick={handleNavigateAjuda}> <div></div> ajuda</button>
        </div>
      </Modal>

      <Modal isOpen={isWorldSelectOpen} 
      onClose={() => setIsWorldSelectOpen(false)} variant="worldConfig">

        <div className="btn-grid-world">
          {Object.keys(mundos).map(id => (
            <button key={id} className={`btn-world mundo-${id}-btn`} onClick={() => handleWorldChange(parseInt(id))} disabled={!mundosDesbloqueados[id]}>
              <div></div>{mundos[id].nome}
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={isFimDoMundoOpen}
        onClose={() => setIsFimDoMundoOpen(false)}
        variant="faseInfo"
      >
        <p>{resultadoMundo.mensagem}</p>
        <p>Total de Estrelas: {resultadoMundo.totalEstrelas}</p>
      </Modal>

      <PlacarModal 
        isOpen={isPlacarOpen} 
        onClose={() => setIsPlacarOpen(false)} 
      />
    </section>
  );
}

export default GameMap;