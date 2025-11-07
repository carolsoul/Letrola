import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAudio } from '../hooks/useAudio';
import Cronometro from './Cronometro.jsx';
import '../styles/Mundo5.css'; // Usando o novo CSS

// --- Constantes de Pontuação ---
const TEMPO_3_ESTRELAS = 60;
const TEMPO_2_ESTRELAS = 180;
const TEMPO_1_ESTRELA = 300;

// --- Dados Mockados (Substitua pela API quando pronto) ---
const mockItens = [
    { id: 1, resposta: 'MAÇÃ', imagem_url: '/maca.svg' },
    { id: 2, resposta: 'BANANA', imagem_url: '/banana.svg' },
    { id: 3, resposta: 'UVA', imagem_url: '/uva.svg' },
    { id: 4, resposta: 'LARANJA', imagem_url: '/laranja.svg' },
    { id: 5, resposta: 'PERA', imagem_url: '/pera.svg' },
];

/**
 * Cria e embaralha as cartas do jogo.
 * Para cada item, cria uma carta de IMAGEM e uma carta de TEXTO com o mesmo parId.
 */
function embaralharCartas(itens) {
    const cartasDoJogo = [];

    itens.forEach((item) => {
        const parId = item.id;
        // Carta de Imagem
        cartasDoJogo.push({
            id: Math.random(),
            tipo: 'imagem',
            conteudo: item.imagem_url,
            parId: parId,
            isFlipped: false,
            isMatched: false,
        });
        // Carta de Texto
        cartasDoJogo.push({
            id: Math.random(),
            tipo: 'texto',
            conteudo: item.resposta.toUpperCase(),
            parId: parId,
            isFlipped: false,
            isMatched: false,
        });
    });

    return cartasDoJogo.sort(() => Math.random() - 0.5);
}

// Função para calcular estrelas (necessária para onFaseCompleta)
const calcularEstrelas = (tempoSegundos) => {
    if (tempoSegundos <= TEMPO_3_ESTRELAS) return 3;
    if (tempoSegundos <= TEMPO_2_ESTRELAS) return 2;
    if (tempoSegundos <= TEMPO_1_ESTRELA) return 1;
    return 0;
};

function Mundo5_Gameplay({ jogador, onFaseCompleta }) {
    const { mundoId, faseId } = useParams();
    const { playSound } = useAudio();

    const [cartas, setCartas] = useState([]);
    const [selecionadas, setSelecionadas] = useState([]); // Antes "viradas"
    const [bloqueado, setBloqueado] = useState(false);
    const [estadoJogo, setEstadoJogo] = useState('carregando');

    // States do Cronômetro
    const [tempoInicioFase, setTempoInicioFase] = useState(0);
    const [tempoDecorrido, setTempoDecorrido] = useState(0);

    // Inicializa ou reinicia o jogo
    const inicializarFase = useCallback(() => {
        setEstadoJogo('carregando');
        // const itens = await buscarItensPorFase(mundoId, faseId); // TODO: Descomentar quando a API estiver pronta
        const itens = mockItens; // Usando dados mockados por enquanto

        setCartas(embaralharCartas(itens));
        setSelecionadas([]);
        setBloqueado(false);
        setTempoInicioFase(Date.now());
        setTempoDecorrido(0);
        setEstadoJogo('jogando');
    }, [mundoId, faseId]);

    // Efeito para carregar o jogo na primeira vez
    useEffect(() => {
        inicializarFase();
    }, [inicializarFase]);

    // Efeito para checar os pares
    useEffect(() => {
        if (selecionadas.length === 2) {
            setBloqueado(true);
            const [primeira, segunda] = selecionadas;

            // Lógica de acerto (baseada no parId, não no conteúdo)
            if (primeira.parId === segunda.parId) {
                playSound('fase-acerto');
                setCartas((prev) =>
                    prev.map((c) =>
                        c.parId === primeira.parId ? { ...c, isMatched: true } : c
                    )
                );
                setSelecionadas([]);
                setBloqueado(false);
            } else {
                // Lógica de erro
                playSound('fase-erro');
                setTimeout(() => {
                    setCartas((prev) =>
                        prev.map((c) =>
                            c.id === primeira.id || c.id === segunda.id
                                ? { ...c, isFlipped: false }
                                : c
                        )
                    );
                    setSelecionadas([]);
                    setBloqueado(false);
                }, 1200); // Tempo um pouco maior para ver o texto/imagem
            }
        }
    }, [selecionadas, playSound]);

    // Efeito para checar a vitória
    useEffect(() => {
        if (cartas.length > 0 && estadoJogo === 'jogando') {
            const todosEncontrados = cartas.every((c) => c.isMatched);

            if (todosEncontrados) {
                setEstadoJogo('finalizado');
                const tempoFinalSegundos = Math.floor(tempoDecorrido / 1000);
                const estrelas = calcularEstrelas(tempoFinalSegundos);

                setTimeout(() => {
                    if (onFaseCompleta) {
                        onFaseCompleta({ estrelas, tempoConclusao: tempoFinalSegundos });
                    }
                }, 500);
            }
        }
    }, [cartas, estadoJogo, onFaseCompleta, tempoDecorrido]);

    const virarCarta = (carta) => {
        // Não faz nada se:
        // 1. O jogo estiver bloqueado
        // 2. A carta já estiver virada
        // 3. A carta já for um par encontrado
        // 4. Já houver 2 cartas selecionadas
        if (bloqueado || carta.isFlipped || carta.isMatched || selecionadas.length === 2) {
            return;
        }

        // Lógica de virar a carta
        const novaCarta = { ...carta, isFlipped: true };
        setCartas((prev) =>
            prev.map((c) => (c.id === carta.id ? novaCarta : c))
        );
        setSelecionadas((prev) => [...prev, novaCarta]);
    };

    if (estadoJogo === 'carregando') {
        return <div className="loading-screen-1">Carregando Jogo da Memória...</div>;
    }

    return (
        <section className="mundo5-container">
            {estadoJogo === 'jogando' && (
                <Cronometro
                    isPaused={estadoJogo !== 'jogando'}
                    tempoInicioFase={tempoInicioFase}
                    limiteTempoFase={TEMPO_1_ESTRELA * 1000}
                    onTempoTick={(tempoMs) => setTempoDecorrido(tempoMs)}
                    onFaseTermina={() => {
                        if (onFaseCompleta) {
                            onFaseCompleta({ estrelas: 0, tempoConclusao: TEMPO_1_ESTRELA });
                        }
                    }}
                />
            )}

            <div className="jogo-memoria-grid">
                {cartas.map((carta) => (
                    <div
                        key={carta.id}
                        className={`card ${carta.isFlipped || carta.isMatched ? 'flipped' : ''}`}
                        onClick={() => virarCarta(carta)}
                    >
                        <div className="cardInner">
                            {/* CONTEÚDO (o que é revelado ao virar) */}
                            <div className="cardFront">
                                {carta.tipo === 'imagem' ? (
                                    <img src={carta.conteudo} alt="Conteúdo da carta" className="carta-imagem" />
                                ) : (
                                    <div className="carta-texto">{carta.conteudo}</div>
                                )}
                            </div>
                            {/* CAPA (o que fica visível inicialmente) */}
                            <div className="cardBack">
                                <img src="/verso.svg" alt="Verso da carta" className="carta-capa" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default Mundo5_Gameplay;