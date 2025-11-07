import React, { useEffect, useRef, useCallback } from 'react';

const TEMPO_DICA_1_MS = 15 * 1000; // 15 segundos
const TEMPO_DICA_2_MS = 30 * 1000; // 30 segundos

const Cronometro = ({
  tempoInicioFase,
  limiteTempoFase,
  itemAtual,
  onDicaLiberada,
  onFaseTermina,
  onTempoTick,
  onItemTempoTick,
  isPaused,
}) => {
  const requestRef = useRef();
  const dicasLiberadasRef = useRef(0);
  const tempoPausaRef = useRef(0);
  const tempoInicioAjustadoRef = useRef(tempoInicioFase);

  useEffect(() => {
    if (!isPaused && tempoPausaRef.current > 0) {
      const duracaoPausa = Date.now() - tempoPausaRef.current;
      tempoInicioAjustadoRef.current += duracaoPausa;
      tempoPausaRef.current = 0;
    }
  }, [isPaused]);

  const gameLoop = useCallback(() => {
    // =======================================================
    // CORREÇÃO 1: Lógica das Dicas MOVIDA PARA CIMA
    // =======================================================
    if (itemAtual && itemAtual.timestampInicio) {
      const tempoDecorridoItem = Date.now() - itemAtual.timestampInicio;

      if (onItemTempoTick) {
        onItemTempoTick(tempoDecorridoItem);
      }

      if (tempoDecorridoItem >= TEMPO_DICA_1_MS && dicasLiberadasRef.current === 0) {
        dicasLiberadasRef.current = 1;
        if (itemAtual.dica1) {
          onDicaLiberada(1, itemAtual.id);
        }
      } else if (tempoDecorridoItem >= TEMPO_DICA_2_MS && dicasLiberadasRef.current === 1) {
        dicasLiberadasRef.current = 2;
        if (itemAtual.dica2) {
          onDicaLiberada(2, itemAtual.id);
        }
      }
    }

    // Lógica da Pausa (AGORA VEM DEPOIS DAS DICAS)
    if (isPaused) {
      if (tempoPausaRef.current === 0) {
        tempoPausaRef.current = Date.now();
      }
      requestRef.current = requestAnimationFrame(gameLoop);
      return; // Sai da função se estiver pausado
    }

    // O restante (tempo da fase) só roda se NÃO estiver pausado
    const tempoDecorridoFase = Date.now() - tempoInicioAjustadoRef.current;
    onTempoTick(tempoDecorridoFase);

    if (tempoDecorridoFase >= limiteTempoFase) {
      onFaseTermina({ tempoFinalMs: limiteTempoFase });
      return;
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [
      isPaused, 
      limiteTempoFase, 
      itemAtual, // itemAtual ainda é necessário aqui para o useCallback
      onDicaLiberada, 
      onFaseTermina, 
      onTempoTick, 
      onItemTempoTick
    ]);

  useEffect(() => {
    dicasLiberadasRef.current = 0;
  }, [itemAtual]);

  // =======================================================
  // CORREÇÃO 2: Separar os useEffects
  // =======================================================

  // Este useEffect SÓ reseta o tempo ajustado se o tempo de INÍCIO da fase mudar
  useEffect(() => {
    tempoInicioAjustadoRef.current = tempoInicioFase;
  }, [tempoInicioFase]);

  // Este useEffect SÓ controla o loop (iniciar/parar)
  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameLoop]); // 'gameLoop' aqui está correto, pois o reset foi movido

  return null;
};

export default Cronometro;