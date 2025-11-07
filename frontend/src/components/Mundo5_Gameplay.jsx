import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Modal from "./Modal.jsx";
import Cronometro from "./Cronometro.jsx";
import ScoreDisplay from "./ScoreDisplay.jsx"
import { buscarDeckDaFase } from "../services/apiMemoria.js";
import { useAudio } from "../hooks/useAudio";
import TutorialModal from "./TutorialModal.jsx";
import { tutorials } from "../data/tutorialData.js";
import '../styles/Mundo5.css';

// --- Constantes ---
const MUNDO_ID = 5;
const TEMPO_3_ESTRELAS = 60;  // 1 minuto
const TEMPO_2_ESTRELAS = 120; // 2 minutos
const TEMPO_1_ESTRELA = 180; // 3 minutos

// --- Função Utilitária ---
const formatTime = (timeInMs) => {
    const totalSeconds = Math.floor(timeInMs / 1000);
    const min = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const sec = String(totalSeconds % 60).padStart(2, "0");
    return `${min}:${sec}`;
};

// --- Sub-componente Card ---
const Card = ({ card, onClick, isFlipped, isMatched }) => {
    const handleClick = () => {
        if (!isFlipped && !isMatched) {
            onClick(card);
        }
    };

    return (
        <div className={`memoria-card ${isFlipped || isMatched ? 'is-flipped' : ''} ${isMatched ? 'is-matched' : ''}`} onClick={handleClick}>
            <div className="card-face card-back">
                <img src="/verso.svg" alt="Verso" />
            </div>
            <div className="card-face card-front">
                {card.tipo === 'imagem' ? (
                    <img src={card.conteudo} alt={card.identificador} className="card-image" />
                ) : (
                    <span className="card-text">{card.conteudo}</span>
                )}
            </div>
        </div>
    );
};

// --- Componente Principal ---
function Mundo5_Gameplay({ jogador, onFaseCompleta }) {
    const { mundoId, faseId } = useParams();
    const navigate = useNavigate();
    const { playSound, isMusicMuted, toggleMusic, isSfxMuted, toggleSfx } = useAudio();

    const mundo_id = parseInt(mundoId);
    const fase_id = parseInt(faseId);

    // --- Estados ---
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    const [estadoJogo, setEstadoJogo] = useState("carregando");
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [tempoInicioFase, setTempoInicioFase] = useState(Date.now());
    const [tempoDecorridoParaScore, setTempoDecorridoParaScore] = useState(0);
    const [tempoExibido, setTempoExibido] = useState("00:00"); 
    const [cards, setCards] = useState([]);
    const [flippedCards, setFlippedCards] = useState([]);
    const [matchedCards, setMatchedCards] = useState([]);
    const [tentativas, setTentativas] = useState(0);
    const [isChecking, setIsChecking] = useState(false);
    const timerRef = useRef(null); 

    // Efeito para música e tutorial
    useEffect(() => {
        const audio = playSound('musica-mundo-5', true) || playSound('musica-mundo-1', true); 
        return () => { if (audio) audio.pause(); };
    }, [playSound]);

    useEffect(() => {
        if (fase_id === 1) {
            const storageKey = `tutorial_mundo_${mundo_id}_visto`;
            const tutorialJaVisto = sessionStorage.getItem(storageKey);
            if (!tutorialJaVisto) setIsTutorialOpen(true);
        }
    }, [mundo_id, fase_id]);

    // Carregar o deck
    const inicializarFase = useCallback(async () => {
        setEstadoJogo("carregando");
        setCards([]);
        setFlippedCards([]);
        setMatchedCards([]);
        setTentativas(0);
        setIsChecking(false);
        clearTimeout(timerRef.current);

        setTempoInicioFase(Date.now());
        setTempoDecorridoParaScore(0);
        setTempoExibido("00:00");

        if (isTutorialOpen) {
            setEstadoJogo("jogando"); // Fica jogando, mas pausado pelo tutorial
            return;
        }

        const deckDaApi = await buscarDeckDaFase(mundo_id, fase_id);
        if (deckDaApi) {
            setCards(deckDaApi);
            setEstadoJogo("jogando");
        } else {
            console.error("Não foi possível carregar o deck da fase.");
            setEstadoJogo("erro");
        }
    }, [mundo_id, fase_id, isTutorialOpen]);

    useEffect(() => {
        if (!jogador) navigate("/");
        else inicializarFase();
    }, [jogador, navigate, inicializarFase]);

    // Lógica de verificação de pares
    useEffect(() => {
        if (flippedCards.length === 2) {
            setIsChecking(true);
            setTentativas(t => t + 1);
            const [card1, card2] = flippedCards;

            if (card1.identificador === card2.identificador) {
                playSound('fase-acerto');
                setMatchedCards(prev => [...prev, card1.id, card2.id]);
                setFlippedCards([]);
                setIsChecking(false);
            } else {
                playSound('fase-erro');
                timerRef.current = setTimeout(() => {
                    setFlippedCards([]);
                    setIsChecking(false);
                }, 1200);
            }
        }
        return () => clearTimeout(timerRef.current);
    }, [flippedCards, playSound]);

    // Lógica de finalização
    const finalizarFase = useCallback((motivo = 'concluido') => {
        if (estadoJogo === "finalizado") return;
        setEstadoJogo("finalizado");
        
        const tempoFinalSegundos = Math.floor(tempoDecorridoParaScore / 1000);
        let estrelas = 0;
        
        if (motivo !== 'tempo_esgotado') {
            if (tempoFinalSegundos <= TEMPO_3_ESTRELAS) estrelas = 3;
            else if (tempoFinalSegundos <= TEMPO_2_ESTRELAS) estrelas = 2;
            else if (tempoFinalSegundos <= TEMPO_1_ESTRELA) estrelas = 1;
        }
        onFaseCompleta({ estrelas, tempoConclusao: tempoFinalSegundos });
    }, [estadoJogo, onFaseCompleta, tempoDecorridoParaScore]); // ✅ Dependência atualizada

    useEffect(() => {
        if (cards.length > 0 && matchedCards.length === cards.length) {
            setTimeout(() => finalizarFase('concluido'), 500);
        }
    }, [matchedCards, cards, finalizarFase]);

    const handleCardClick = (card) => {
        if (isChecking || flippedCards.length >= 2 || flippedCards.some(c => c.id === card.id) || estadoJogo !== 'jogando') return;
        
        playSound('click');
        setFlippedCards(prev => [...prev, card]);
    };

    const handleCloseTutorial = () => {
        sessionStorage.setItem(`tutorial_mundo_${mundo_id}_visto`, 'true');
        setIsTutorialOpen(false);
        setEstadoJogo("jogando");
        setTempoInicioFase(Date.now());
    };

    const onTempoTick = (tempoMs) => {
        setTempoExibido(formatTime(tempoMs, "ms"));
        setTempoDecorridoParaScore(tempoMs);
    };

    // Handlers do Modal de Configuração
    const handleOpenConfig = () => { playSound('click'); setIsConfigOpen(true); };
    const handleVoltarAoMapa = () => { playSound('click'); navigate("/mapa-do-jogo", { state: { jogador, mundo_id: MUNDO_ID } }); };
    const handlePausar = () => { playSound('click'); setEstadoJogo(estadoJogo === 'jogando' ? 'pausado' : 'jogando'); };
    const handleRetry = () => { playSound('click'); inicializarFase(); };
    const handleNavigateAjuda = () => { playSound('click'); navigate('/ajuda'); };
    const handleCloseConfig = () => { playSound('click'); setIsConfigOpen(false); };

    // --- Determinar layout da grade ---
    const getGridClassName = (count) => {
        if (count <= 8) return 'grid-4x2';   // Fase 1 (4 pares = 8 cartas)
        if (count <= 12) return 'grid-4x3';  // Fase 2 (6 pares = 12 cartas)
        if (count <= 16) return 'grid-4x4';  // Fase 3 (8 pares = 16 cartas)
        if (count <= 20) return 'grid-5x4';  // Fase 4 (10 pares = 20 cartas)
        return 'grid-6x4'; // Fase 5 (12 pares = 24 cartas)
    };

    if (estadoJogo === "carregando") return <div className="loading-screen-5">Carregando Jogo da Memória...</div>;
    if (estadoJogo === "erro") return <div className="error-screen-5">Erro ao carregar o Jogo da Memória.</div>;

    return (
        <section className="mundo5-section">
            <TutorialModal isOpen={isTutorialOpen} onClose={handleCloseTutorial} steps={tutorials[mundo_id]} />
            
            {/* ✅ Cabeçalho corrigido para o Mundo 5 */}
            <header >
                <button className="level-settings-btn" onClick={handleOpenConfig}><img src="/Settings.svg" alt="Configurações" /></button>
                <div className="two-columns">
                    <ScoreDisplay
                          tempoDecorridoMs={tempoDecorridoParaScore}
                        />

                <div className="tentativas-contador">
                    <p>Tentativas: <span>{tentativas}</span></p>
                </div>
                </div>

                <div className="timer">
                    <img src="/timer.svg" alt="Cronômetro" />
                    <p className="seconds">{tempoExibido}</p>
                </div>
            </header>

            {(estadoJogo === "jogando" || estadoJogo === "pausado") && (
                <Cronometro
                    isPaused={estadoJogo !== 'jogando' || isTutorialOpen || isChecking}
                    tempoInicioFase={tempoInicioFase}
                    limiteTempoFase={TEMPO_1_ESTRELA * 1000}
                    onTempoTick={onTempoTick}
                    onFaseTermina={() => finalizarFase('tempo_esgotado')}
                />
            )}

            <main className="mundo5-main">
                <div className={`memoria-grid ${getGridClassName(cards.length)}`}>
                    {cards.map(card => (
                        <Card
                            key={card.id}
                            card={card}
                            onClick={handleCardClick}
                            isFlipped={flippedCards.some(c => c.id === card.id)}
                            isMatched={matchedCards.includes(card.id)}
                        />
                    ))}
                </div>
            </main>

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

export default Mundo5_Gameplay;