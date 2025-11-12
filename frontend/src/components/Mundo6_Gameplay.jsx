import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import { useLoader } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import Modal from "./Modal.jsx";
import Cronometro from "./Cronometro.jsx";
import ScoreDisplay from "./ScoreDisplay.jsx";
import { buscarDesafiosDaFase } from "../services/apiDesafioBonus.js";
import { useAudio } from "../hooks/useAudio";
import TutorialModal from "./TutorialModal.jsx";
import { tutorials } from "../data/tutorialData.js";
import '../styles/Mundo6.css';

// --- Constantes ---
const MUNDO_ID = 6;
const TEMPO_3_ESTRELAS = 120; 
const TEMPO_2_ESTRELAS = 240;
const TEMPO_1_ESTRELA = 360;

const formatTime = (timeInMs) => {
    const totalSeconds = Math.floor(timeInMs / 1000);
    const min = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const sec = String(totalSeconds % 60).padStart(2, "0");
    return `${min}:${sec}`;
};

// --- Sub-componentes 3D ---

// Jogador (macaquinho) em 3D - Corrigido para usar targetLane corretamente
const Player3D = ({ targetLane }) => {
  const texture = useLoader(TextureLoader, '/monkey-back.svg');
  const ref = useRef();
  
  useFrame((state, delta) => {
    if (!ref.current) return;
    
    const targetX = targetLane * 2; 
    ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, targetX, 10 * delta);
  });
  return (
    <sprite 
      ref={ref} 
      position={[0, 0, 4]} // Posição inicial neutra, ajustada por useFrame
      scale={[3.5, 3.5, 1]} 
      center={[0.5, 0]} // Centraliza o sprite para aparecer inteiro
      renderOrder={2} // Aumentado para garantir prioridade sobre o baú
    > 
      <spriteMaterial map={texture} transparent />
    </sprite>
  );
};

// Guaxinim como sprite 2D
const Guaxinim3D = ({ distance, scale }) => {
  const texture = useLoader(TextureLoader, '/raccoon-back.svg');
  const ref = useRef();
  
  useFrame((state, delta) => {
    if (!ref.current) return;
    
    // Movimento suave para a posição Z
    ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, distance, 3 * delta);
    
    const baseScale = scale[0];
    const scaleFactor = Math.max(1, 3 + distance / 10);
    const newScale = baseScale * scaleFactor;
    ref.current.scale.set(newScale, newScale, 1);
  });

 return (
    <sprite 
      ref={ref} 
      position={[0, 0, distance]}
      scale={scale} 
      center={[0.5, 0]} // Ajustado: centralizado horizontalmente, ancorado na base para aparecer inteiro
    >
      <spriteMaterial map={texture} transparent />
    </sprite>
  );
};

// Caixa em 3D (baú)
useGLTF.preload('/treasure_coins_chest.glb');
const Caixa3D = ({ position, onCollide, collided }) => { 
  const meshRef = useRef();
  const { scene } = useGLTF('/treasure_coins_chest.glb');
  const sceneClone = React.useMemo(() => scene.clone(), [scene]);
  useFrame((state, delta) => {
    if (meshRef.current && !collided) {
      meshRef.current.position.z += 6 * delta; 

      if (meshRef.current.position.z > 0.5) {
        onCollide();
      }
    }
  });

  return sceneClone ? (
    <primitive 
      ref={meshRef} 
      object={sceneClone} 
      position={position} 
      rotation={[0, Math.PI, 0]}
      scale={[0.2, 0.2, 0.2]}
      renderOrder={-999}
    />
  ) : (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="brown" />
    </mesh>
  );
};

const Scene3D = ({ playerPosition, guaxinimPosition, caixas, onCaixaCollide, collidedCaixas }) => {
  const groundTexture = useLoader(TextureLoader, '/ground-texture.jpg');
  const grassTexture = useLoader(TextureLoader, '/grass-texture.jpg');
  
  // Configurações para ambas as texturas
  groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(10, 10);
  
  grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(20, 20);
  const ref = useRef();

  // Movimento infinito do chão
  useFrame((state, delta) => {
    if (ref.current) {
        groundTexture.offset.y -= 0.5 * delta;
        grassTexture.offset.y += 0.8 * delta;
    }
  });

 return (
    <>
      <ambientLight intensity={5} />
      <pointLight position={[10, 10, 10]} />
      
      {/* Gramado como plano maior abaixo da pista */}
      <mesh position={[0, -1.1, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-2}>
        <planeGeometry args={[200, 100]} /> {/* Maior para cobrir toda a largura */}
        <meshStandardMaterial map={grassTexture} />
      </mesh>
      
      {/* Pista sobreposta */}
      <mesh ref={ref} position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
        <planeGeometry args={[20, 100]} />
        <meshStandardMaterial map={groundTexture} />
      </mesh>

      <Player3D targetLane={playerPosition} /> 

      <Guaxinim3D distance={guaxinimPosition} scale={[2, 2, 2]} />

      {caixas.map((caixa) => (
        <Caixa3D 
          key={caixa.id}
          position={[caixa.raia * 2 - 2, 0, -10]}
          onCollide={() => onCaixaCollide(caixa)} 
          collided={collidedCaixas.includes(caixa.id)}
        />
      ))}
    </>
  );
};

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
  const [tempo, setTempo] = useState({ inicio: Date.now(), decorrido: 0 });
  
  // Estados do Desafio e Progresso
  const [desafios, setDesafios] = useState([]);
  const [totalDesafiosIniciais, setTotalDesafiosIniciais] = useState(0);
  const [caixas, setCaixas] = useState([]);
  const [indiceDesafio, setIndiceDesafio] = useState(0);
  const [caixasColetadas, setCaixasColetadas] = useState(0);
  const [perseguicaoFinalAtiva, setPerseguicaoFinalAtiva] = useState(false);
  const [collidedCaixas, setCollidedCaixas] = useState([]); 
  
  // Posição
  const [raiaJogador, setRaiaJogador] = useState(1); // 0: esquerda, 1: centro, 2: direita
  const [guaxinimDistance, setGuaxinimDistance] = useState(50); // Distância em unidades 3D

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [desafioAtual, setDesafioAtual] = useState(null);
  const [respostaUsuario, setRespostaUsuario] = useState("");
  const [feedback, setFeedback] = useState("");

  // Refs
  const spawIntervalRef = useRef(null);
  const tempoDecorridoRef = useRef(0);
  const estadoJogoRef = useRef(estadoJogo);

  useEffect(() => {
    const audio = playSound('musica-mundo-4', true);
    return () => { if (audio) audio.pause(); };
  }, [playSound]);

  useEffect(() => {
    if (fase_id === 1) {
      const storageKey = `tutorial_mundo_${mundo_id}_visto`;
      const tutorialJaVisto = sessionStorage.getItem(storageKey);
      if (!tutorialJaVisto) setIsTutorialOpen(true);
    }
  }, [mundo_id, fase_id]);

  // Inicialização
  const inicializarFase = useCallback(async () => {
    setEstadoJogo("carregando");
    setDesafios([]);
    setCaixas([]);
    setIndiceDesafio(0);
    setCaixasColetadas(0);
    setTotalDesafiosIniciais(0);
    setPerseguicaoFinalAtiva(false);
    setRaiaJogador(1);
    setGuaxinimDistance(50);
    setTempoInicioFase(Date.now());
    setTempoDecorridoParaScore(0);
    setTempoExibido("00:00");
    setIsModalOpen(false);
    setCollidedCaixas([]);
    
    if (isTutorialOpen) {
      setEstadoJogo("jogando");
      return;
    }

    const desafiosDaApi = await buscarDesafiosDaFase(fase_id);
    if (desafiosDaApi) {
      setDesafios(desafiosDaApi);
      setTotalDesafiosIniciais(desafiosDaApi.length);
      setEstadoJogo("jogando");
    } else {
      console.error("Erro ao carregar desafios.");
      setEstadoJogo("erro");
    }
  }, [fase_id, isTutorialOpen]);

  useEffect(() => {
    if (!jogador) navigate("/");
    else inicializarFase();
  }, [jogador, navigate, inicializarFase]);

  useEffect(() => {
    estadoJogoRef.current = estadoJogo;
  }, [estadoJogo]);

  // Aproximação do Guaxinim
  useEffect(() => {
    if (totalDesafiosIniciais > 0) {
      const progresso = caixasColetadas / totalDesafiosIniciais;
      const novaDistancia = 50 - (progresso * 40); // De 50 para 10
      setGuaxinimDistance(novaDistancia);
    }
  }, [caixasColetadas, totalDesafiosIniciais]);

  // Finalização
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

  // Spawner
  useEffect(() => {
    if (estadoJogo === "jogando" && !isTutorialOpen && !isModalOpen && !perseguicaoFinalAtiva) {
      spawIntervalRef.current = setInterval(() => {
        if (caixasColetadas >= totalDesafiosIniciais && totalDesafiosIniciais > 0) {
          clearInterval(spawIntervalRef.current);
          setPerseguicaoFinalAtiva(true);
          return;
        }
        if (indiceDesafio >= desafios.length) return;

        const novaCaixa = {
          id: Date.now(),
          desafio: desafios[indiceDesafio],
          raia: Math.floor(Math.random() * 3),
        };
        
        setCaixas(prev => [...prev, novaCaixa]);
        setIndiceDesafio(idx => idx + 1);
      }, 3000);
    } else {
      clearInterval(spawIntervalRef.current);
    }
    return () => clearInterval(spawIntervalRef.current);
  }, [estadoJogo, isTutorialOpen, isModalOpen, desafios, indiceDesafio, perseguicaoFinalAtiva, caixasColetadas, totalDesafiosIniciais]);

  // Perseguição Final
  useEffect(() => {
    if (perseguicaoFinalAtiva) {
      setTimeout(() => {
        setGuaxinimDistance(5); // Perto
        playSound('vitoria');
        setTimeout(() => finalizarFase('concluido'), 1000);
      }, 500);
    }
  }, [perseguicaoFinalAtiva, finalizarFase, playSound]);

  // Controles
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (estadoJogo !== "jogando" || isModalOpen || isTutorialOpen) return;
      if (e.key === "ArrowLeft") setRaiaJogador(raia => Math.max(0, raia - 1));
      else if (e.key === "ArrowRight") setRaiaJogador(raia => Math.min(2, raia + 1));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [estadoJogo, isModalOpen, isTutorialOpen]);

  const touchStartX = useRef(0);
  const handleTouchStart = (e) => { touchStartX.current = e.targetTouches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (estadoJogo !== "jogando" || isModalOpen || isTutorialOpen) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setRaiaJogador(raia => Math.max(0, raia - 1));
      else setRaiaJogador(raia => Math.min(2, raia + 1));
    }
  };

  // Colisão
  const handleCaixaCollide = (caixa) => {
    setCollidedCaixas(prev => [...prev, caixa.id]);
    setTimeout(() => {
      setCaixas(prev => prev.filter(c => c.id !== caixa.id));
    }, 16);
    if (raiaJogador !== caixa.raia) {
      playSound('fase-erro');
      setDesafios(prev => [...prev, caixa.desafio]);
      return;
    }
    playSound("som-pegar-item");
    setEstadoJogo("pausado");
    setDesafioAtual(caixa.desafio);
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
        setCaixasColetadas(count => count + 1);
        
        setTimeout(() => {
            setIsModalOpen(false);
            setEstadoJogo("jogando");
            setDesafioAtual(null);
        }, 1000);
    } else {
        playSound('fase-erro');
        setFeedback("incorreto");
        setDesafios(prev => [...prev, desafioAtual]);

        setTimeout(() => {
            setIsModalOpen(false);
            setEstadoJogo("jogando");
            setDesafioAtual(null);
        }, 1000);
    }
  };

  // Handlers
  const handleCloseTutorial = () => {
    sessionStorage.setItem(`tutorial_mundo_${mundo_id}_visto`, 'true');
    setIsTutorialOpen(false);
    setTempoInicioFase(Date.now());
  };

  const onTempoTick = (tempoMs) => {
        setTempoExibido(formatTime(tempoMs));
        setTempoDecorridoParaScore(tempoMs);
        tempoDecorridoRef.current = tempoMs;
  };

  const handleOpenConfig = () => { playSound('click'); setIsConfigOpen(true); };
  const handleVoltarAoMapa = () => { playSound('click'); navigate("/mapa-do-jogo", { state: { jogador, mundo_id: MUNDO_ID } }); };
  const handlePausar = () => { playSound('click'); setEstadoJogo(estadoJogo === 'jogando' ? 'pausado' : 'jogando'); };
  const handleRetry = () => { playSound('click'); inicializarFase(); };
  const handleNavigateAjuda = () => { playSound('click'); navigate('/ajuda'); };
  const handleCloseConfig = () => { playSound('click'); setIsConfigOpen(false); };

  if (estadoJogo === "carregando") return <div className="loading-screen-6">Carregando Desafio...</div>;
  if (estadoJogo === "erro") return <div className="error-screen-6">Erro ao carregar.</div>;

  return (
    <section 
      className="mundo6-section"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <TutorialModal isOpen={isTutorialOpen} onClose={handleCloseTutorial} steps={tutorials[mundo_id]} />
      
    
    <Canvas camera={{ position: [0, 5, 10], fov: 75 }} className="pista-canvas">
      <Scene3D 
        playerPosition={raiaJogador - 1}
        guaxinimPosition={-guaxinimDistance}
        caixas={caixas}
        onCaixaCollide={handleCaixaCollide}
        collidedCaixas={collidedCaixas}
      />
    </Canvas>


      <header>
        <button className="level-settings-btn" onClick={handleOpenConfig}>
          <img src="/Settings.svg" alt="Config" />
        </button>
        <ScoreDisplay tempoDecorridoMs={tempoDecorridoParaScore} />
        <div className="timer">
          <img src="/timer.svg" alt="Timer" />
          <p className="seconds">{tempoExibido}</p>
        </div>
      </header>

      {(estadoJogo === "jogando" || estadoJogo === "pausado") && (
          <Cronometro
              isPaused={estadoJogo !== 'jogando' || isTutorialOpen || isModalOpen}
              tempoInicioFase={tempoInicioFase}
              limiteTempoFase={TEMPO_1_ESTRELA * 1000} 
              onTempoTick={onTempoTick}
              onFaseTermina={() => finalizarFase('tempo_esgotado')}
          />
      )}
      
      <DesafioModal
        isOpen={isModalOpen}
        desafio={desafioAtual}
        resposta={respostaUsuario}
        onRespostaChange={setRespostaUsuario}
        onSubmit={handleVerificarResposta}
        feedback={feedback}
      />

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
  )
}
export default Mundo6_Gameplay;
