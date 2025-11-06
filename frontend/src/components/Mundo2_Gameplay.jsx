import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/Mundo2.css";
import Modal from "./Modal.jsx";
import Cronometro from "./Cronometro.jsx";
import ScoreDisplay from './ScoreDisplay.jsx';
import PuzzleTroca from './PuzzleTroca.jsx';
import { buscarItensPorFase } from "../services/apiItensFase.js";
import { useAudio } from "../hooks/useAudio";
import TutorialModal from "./TutorialModal.jsx"; // 1. Importar o modal de tutorial
import { tutorials } from "../data/tutorialData.js"; // 2. Importar os dados do tutorial

// --- Constantes de Configuração do Jogo ---
const MUNDO_ID = 2;
const TEMPO_3_ESTRELAS = 60;
const TEMPO_2_ESTRELAS = 180;
const TEMPO_1_ESTRELA = 300;
const LIMITE_DICAS = 15;

// --- Função Utilitária ---
const formatTime = (timeInMs) => {
    const totalSeconds = Math.floor(timeInMs / 1000);
    const min = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const sec = String(totalSeconds % 60).padStart(2, "0");
    return `${min}:${sec}`;
};

// --- Componentes de UI (Filhos) ---
const VaraDePesca = ({ mousePos, pontaDaVara }) => {
    const deltaX = mousePos.x - pontaDaVara.x;
    const deltaY = mousePos.y - pontaDaVara.y;
    const distancia = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angulo = Math.atan2(deltaY, deltaX) * (180 / Math.PI) - 90;

    return (
        <div className="vara-container">
            <div className="linha-pesca" style={{ top: `${pontaDaVara.y}px`, left: `${pontaDaVara.x}px`, height: `${distancia}px`, transform: `rotate(${angulo}deg)` }} />
            <img src="/anzol.svg" className="anzol" style={{ top: `${mousePos.y}px`, left: `${mousePos.x}px` }} alt="Anzol" />
        </div>
    );
};

const Bebida = ({ bebida, onClick }) => (
    <img src={bebida.imgSrc} className="bebida-flutuante" style={{ left: `${bebida.x}%`, animationDelay: `${bebida.delay}s` }} alt={bebida.nome} onClick={() => onClick(bebida)} />
);

// --- Componente Principal da Fase ---
function Mundo2_Gameplay({ jogador, onFaseCompleta }) {
    const navigate = useNavigate();
    const { mundoId, faseId } = useParams();
    const { playSound, isMusicMuted, toggleMusic, isSfxMuted, toggleSfx } = useAudio();

    const gameAreaRef = useRef(null);
    const pontaVaraRef = useRef(null);
    
    const mundo_id = parseInt(mundoId);
    const fase_id = parseInt(faseId);

    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    const [pontaVaraPos, setPontaVaraPos] = useState({ x: 0, y: 0 });
    const [isBgLoaded, setIsBgLoaded] = useState(false);
    const [estadoJogo, setEstadoJogo] = useState("carregando");
    const [tempo, setTempo] = useState({ inicio: Date.now(), decorrido: 0 });
    const [dicasUsadas, setDicasUsadas] = useState(0);
    const [bebidas, setBebidas] = useState([]);
    const [puzzle, setPuzzle] = useState({ isOpen: false, item: null });
    const [dicaExibida, setDicaExibida] = useState("Troque as letras para formar a palavra!");
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    useEffect(() => {
        const audio = playSound(`musica-mundo-${MUNDO_ID}`, true);
        return () => { if (audio) audio.pause(); };
    }, [playSound]);

    // 3. Onde a Lógica Foi Adicionada: Este useEffect verifica se o tutorial deve ser aberto.
    useEffect(() => {
        if (fase_id === 1) {
            const storageKey = `tutorial_mundo_${mundo_id}_visto`;
            const tutorialJaVisto = sessionStorage.getItem(storageKey);
            if (!tutorialJaVisto) {
                setIsTutorialOpen(true);
            }
        }
    }, [mundo_id, fase_id]);

    useEffect(() => {
        const updatePontaVaraPos = () => {
            if (pontaVaraRef.current && gameAreaRef.current) {
                const rect = pontaVaraRef.current.getBoundingClientRect();
                const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
                setPontaVaraPos({ x: rect.left - gameAreaRect.left, y: rect.top - gameAreaRect.top });
            }
        };
        if (isBgLoaded) updatePontaVaraPos();
        window.addEventListener('resize', updatePontaVaraPos);
        return () => window.removeEventListener('resize', updatePontaVaraPos);
    }, [isBgLoaded]);

    const handleMouseMove = useCallback((e) => {
        if (estadoJogo !== 'jogando' || puzzle.isOpen || isTutorialOpen) return;
        const rect = gameAreaRef.current?.getBoundingClientRect() || { top: 0, left: 0 };
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }, [estadoJogo, puzzle.isOpen, isTutorialOpen]);

    const finalizarFase = useCallback((motivo = 'concluido') => {
        if (estadoJogo === "finalizado") return;
        setEstadoJogo("finalizado");
        const tempoFinalSegundos = Math.floor(tempo.decorrido / 1000);
        let estrelas = 0;
        if (motivo !== 'tempo_esgotado') {
            if (tempoFinalSegundos <= TEMPO_3_ESTRELAS) estrelas = 3;
            else if (tempoFinalSegundos <= TEMPO_2_ESTRELAS) estrelas = 2;
            else if (tempoFinalSegundos <= TEMPO_1_ESTRELA) estrelas = 1;
            if (dicasUsadas > LIMITE_DICAS) estrelas = Math.max(0, estrelas - 1);
        }
        onFaseCompleta({ estrelas, tempoConclusao: tempoFinalSegundos });
    }, [estadoJogo, tempo.decorrido, dicasUsadas, onFaseCompleta]);

    const inicializarFase = useCallback(async () => {
        setEstadoJogo("carregando");
        try {
            const itensDaApi = await buscarItensPorFase(mundo_id, fase_id);
            if (!itensDaApi?.length) throw new Error("Nenhum item encontrado.");
            setBebidas(itensDaApi.map((item, index) => ({
                id: item.id,
                nome: item.resposta.toUpperCase(),
                imgSrc: item.imagem_url,
                dica1: item.dica1,
                dica2: item.dica2,
                x: 20 + (index * 25),
                delay: Math.random() * 5,
                pega: false,
            })));
            setTempo({ inicio: Date.now(), decorrido: 0 });
            setDicasUsadas(0);
            setPuzzle({ isOpen: false, item: null });
            setIsConfigOpen(false);
            setEstadoJogo("jogando");
        } catch (error) {
            console.error("Erro ao inicializar fase:", error);
            setEstadoJogo("erro");
        }
    }, [mundo_id, fase_id]);

    const handlePescarBebida = useCallback((bebida) => {
        if (estadoJogo !== 'jogando') return;
        playSound('som-pegar-item');
        setEstadoJogo("pausado");
        setPuzzle({ isOpen: true, item: { ...bebida, timestampInicio: Date.now() } });
    }, [estadoJogo, playSound]);

    const handleAcertoPuzzle = useCallback(() => {
        if (!puzzle.item) return;
        playSound('fase-acerto');
        setBebidas(prev => prev.map(b => b.id === puzzle.item.id ? { ...b, pega: true } : b));
        setPuzzle({ isOpen: false, item: null });
        setDicaExibida("Troque as letras para formar a palavra!");
        setEstadoJogo("jogando");
    }, [puzzle.item, playSound]);
    
    const handleDicaLiberada = useCallback((nivelDica, itemId) => {
        if (!puzzle.item || puzzle.item.id !== itemId) return;
        const dicaTexto = nivelDica === 1 ? puzzle.item.dica1 : puzzle.item.dica2;
        if(dicaTexto) {
            setDicaExibida(dicaTexto);
            setDicasUsadas(prev => prev + 1);
        }
    }, [puzzle.item]);
    
    const handleOpenConfig = () => { playSound('click'); setIsConfigOpen(true); };
    const handleVoltarAoMapa = () => { playSound('click'); navigate("/mapa-do-jogo", { state: { jogador, mundo_id: MUNDO_ID } }); };
    const handlePausar = () => { playSound('click'); setEstadoJogo(estadoJogo === 'jogando' ? 'pausado' : 'jogando'); };
    const handleRetry = () => { playSound('click'); inicializarFase(); };
    const handleNavigateAjuda = () => { playSound('click'); navigate('/ajuda'); };
    const handleCloseConfig = () => { playSound('click'); setIsConfigOpen(false); };
    const handleCloseTutorial = () => {
        const storageKey = `tutorial_mundo_${mundo_id}_visto`;
        sessionStorage.setItem(storageKey, 'true');
        setIsTutorialOpen(false);
        setTempo({ inicio: Date.now(), decorrido: 0 });
    };

    useEffect(() => {
        if (!jogador) navigate("/");
        else inicializarFase();
    }, [jogador, navigate, inicializarFase]);
    
    useEffect(() => {
        if (estadoJogo === "jogando" && bebidas.length > 0 && bebidas.every(b => b.pega)) {
            finalizarFase('concluido');
        }
    }, [bebidas, estadoJogo, finalizarFase]);

    if (estadoJogo === "carregando") return <div className="loading-screen-2">Carregando...</div>;
    if (estadoJogo === "erro") return <div className="error-screen-2">Erro ao carregar a fase.</div>;

    return (
        <section className="level-section" onMouseMove={handleMouseMove} ref={gameAreaRef}>
            <TutorialModal 
                isOpen={isTutorialOpen}
                onClose={handleCloseTutorial}
                steps={tutorials[mundo_id]}
            />
            <header>
                <button className="level-settings-btn" onClick={handleOpenConfig}><img src="/Settings.svg" alt="Configurações" /></button>
                <ScoreDisplay tempoDecorridoMs={tempo.decorrido} dicasTotaisUsadas={dicasUsadas} />
                <div className="timer"><img src="/timer.svg" alt="Cronômetro" /><p className="seconds">{formatTime(tempo.decorrido)}</p></div>
            </header>
            
            {(estadoJogo === "jogando" || estadoJogo === "pausado") && (
                <Cronometro
                    isPaused={puzzle.isOpen || estadoJogo === 'pausado' || isTutorialOpen}
                    tempoInicioFase={tempo.inicio}
                    limiteTempoFase={TEMPO_1_ESTRELA * 1000}
                    onTempoTick={(ms) => setTempo(t => ({ ...t, decorrido: ms }))}
                    onFaseTermina={() => finalizarFase('tempo_esgotado')}
                    itemAtual={puzzle.item}
                    onDicaLiberada={handleDicaLiberada}
                />
            )}
            
            <div className="level-container-mundo2">
                <img src="/level-2-background.svg" alt="Fundo da fase 2" className="level-bg-mundo2" onLoad={() => setIsBgLoaded(true)} />
                <div ref={pontaVaraRef} className="ponta-vara-origem"></div>
                <VaraDePesca mousePos={mousePos} pontaDaVara={pontaVaraPos} />
                <div className="agua">
                    {bebidas.filter(b => !b.pega).map(bebida => (
                        <Bebida key={bebida.id} bebida={bebida} onClick={handlePescarBebida} />
                    ))}
                </div>
            </div>

            <Modal isOpen={puzzle.isOpen} title="Qual o nome da bebida?" variant="puzzle" contentClassName="mundo-2-puzzle-content" modalBgClassName="mundo-2-puzzle-bg">
                {puzzle.item && (
                    <div className="puzzle-container">
                        <img src={puzzle.item.imgSrc} alt={puzzle.item.nome} className="puzzle-bebida-img" />
                        <PuzzleTroca palavraCorreta={puzzle.item.nome} onComplete={handleAcertoPuzzle} />
                        <div className="balao-dicas"><img src="/baloon-bear.svg" alt="balão de dica" className="baloon" /><p id="hint-text">{dicaExibida}</p></div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={isConfigOpen} onClose={handleCloseConfig} variant="config">
                <div className="btn-level-grid">
                    <button className={`btn music-btn ${isMusicMuted ? 'grayscale' : ''}`} onClick={toggleMusic}><div></div> música</button>
                    <button className={`btn effect-btn ${isSfxMuted ? 'grayscale' : ''}`} onClick={toggleSfx}><div></div> efeitos</button>
                    <button className="btn map-btn" onClick={handleVoltarAoMapa}><div></div>🏠</button>
                    <button className="btn stop-btn" onClick={handlePausar}><div></div>{estadoJogo === 'pausado' ? '▶' : '⏸'}</button>
                    <button className="btn retry-btn" onClick={handleRetry}><div></div>↩</button>
                    <button className="btn help-btn" onClick={handleNavigateAjuda}><div></div> ajuda</button>
                    <button className="btn skip-btn" onClick={handleCloseConfig}><div></div>fechar</button>
                </div>
            </Modal>
        </section>
    );
}

export default Mundo2_Gameplay;