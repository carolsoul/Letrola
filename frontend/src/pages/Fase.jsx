import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Mundo1_Gameplay from '../components/Mundo1_Gameplay';
import Mundo2_Gameplay from '../components/Mundo2_Gameplay';
import Mundo3_Gameplay from '../components/Mundo3_Gameplay';
import Mundo4_Gameplay from '../components/Mundo4_Gameplay';
import Mundo5_Gameplay from '../components/Mundo5_Gameplay';
import Modal from "../components/Modal.jsx";
import { salvarProgresso, buscarTotalEstrelas } from "../services/apiProgresso.js";
import { mundos } from "../data/mundoData.js";
import { useAudio } from "../hooks/useAudio";

// Função para formatar o tempo
const formatTime = (time, unit = 'ms') => {
   const totalSeconds = unit === 'ms' ? Math.floor(time / 1000) : time;
  const min = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const sec = String(totalSeconds % 60).padStart(2, "0");
  return `${min}:${sec}`;
};

// Constantes da fase
const TEMPO_3_ESTRELAS = 60; // em segundos
const MINIMO_ESTRELAS_AVANCAR = 11; // Mínimo de estrelas para desbloquear o próximo mundo

function Fase() {
  const { mundoId, faseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
   const { jogador } = location.state || {};
  const { playSound } = useAudio();

  const mundo_id = parseInt(mundoId);
   const fase_id = parseInt(faseId);

  // States dos modais e do jogo
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
   const [resultadoFinal, setResultadoFinal] = useState({ title: "", estrelas: 0, tempoConclusao: 0, proximaMeta: "" });
  const [isFimDoMundoOpen, setIsFimDoMundoOpen] = useState(false);
   const [resultadoMundo, setResultadoMundo] = useState({ totalEstrelas: 0, desbloqueado: false, mensagem: "" });

   // Lida com a conclusão de uma fase, agora com som
   const handleFaseCompleta = useCallback(async (resultado) => {
    // Toca o som de vitória/derrota primeiro
    if (resultado.estrelas > 0) {
      playSound('vitoria');
    } else {
      // Se perdeu na última fase, ainda mostra o feedback normal
      // (Não vai para os créditos se perder)
      if (mundo_id === 4 && fase_id === 5) {
          playSound('derrota');
            setResultadoFinal({
            title: "Tempo Esgotado!",
            estrelas: 0,
            tempoConclusao: resultado.tempoConclusao,
          proximaMeta: `Para 3 estrelas, termine em ${formatTime(TEMPO_3_ESTRELAS, 's')}.` 
        });
        setIsFeedbackOpen(true);
        return; // Sai da função
      }
      playSound('derrota'); // Som de derrota para outras fases
    }

     try {
       await salvarProgresso(jogador.id, mundo_id, fase_id, resultado.estrelas, resultado.tempoConclusao);
    } catch (error) {
        console.error("Falha ao salvar o progresso:", error);
    }

    if (mundo_id === 5 && fase_id === 5 && resultado.estrelas > 0) {
        navigate('/creditos');
        return;
    }

    if (fase_id === 5) {
        const totalEstrelasMundo = await buscarTotalEstrelas(jogador.id, mundo_id);
        const desbloqueado = totalEstrelasMundo >= MINIMO_ESTRELAS_AVANCAR;

       setResultadoMundo({
            totalEstrelas: totalEstrelasMundo,
            desbloqueado: desbloqueado,
            mensagem: desbloqueado
            ? `Você coletou ${totalEstrelasMundo} estrelas e desbloqueou o próximo mundo!`
            : `Você precisa de pelo menos ${MINIMO_ESTRELAS_AVANCAR} estrelas para avançar. Você conseguiu ${totalEstrelasMundo}. Jogue novamente para conseguir mais estrelas!`
        });
        setIsFimDoMundoOpen(true);
    } else {

      let metaTexto = "";
      let titulo = "";

      if (resultado.estrelas === 0) {
          titulo = "";
          metaTexto = `Tente novamente! Para 3 estrelas, termine em ${formatTime(TEMPO_3_ESTRELAS, 's')}.`;
      } else if (resultado.estrelas < 3) {
          titulo = "";
          metaTexto = `Para 3 estrelas, termine em ${formatTime(TEMPO_3_ESTRELAS, 's')}.`;
      } else { // resultado.estrelas === 3
          titulo = "";
          metaTexto = "Parabéns! Você foi muito rápido!";
      }

       	setResultadoFinal({
          	title: titulo, 
           	estrelas: resultado.estrelas,
          	tempoConclusao: resultado.tempoConclusao,
          	proximaMeta: metaTexto 
      	});
       	setIsFeedbackOpen(true);
     }
  }, [jogador, mundo_id, fase_id, playSound, navigate]); // Adicionei 'navigate' que estava faltando nas dependências

  const handleVoltarAoMapa = () => {
    playSound('click');
    const navState = { jogador, mundo_id };
    if (fase_id === 5) {
         navState.checkWorldCompletion = true;
    }
    setIsFeedbackOpen(false);
    navigate("/mapa-do-jogo", { state: navState });
  };

  const handleAvancar = () => {
  playSound('click');
      const proxima_fase_id = fase_id + 1;
      setIsFeedbackOpen(false);
      navigate(`/mundo/${mundo_id}/fase/${proxima_fase_id}`, { state: { jogador } });
};

  const handleRetry = () => {
    playSound('click');
    setIsFeedbackOpen(false);
    navigate(`/mundo/${mundo_id}/fase/${fase_id}`, { state: { jogador }, replace: true });
   };

  const handleProximoMundo = () => {
    playSound('click');
    setIsFimDoMundoOpen(false);
     const proximo_mundo_id = mundo_id + 1;
    navigate("/mapa-do-jogo", {
    state: { jogador, mundo_id: proximo_mundo_id }, replace: true
    });
  };

   const renderGameplay = () => {
    switch (mundo_id) {
      case 1:
        return <Mundo1_Gameplay jogador={jogador} onFaseCompleta={handleFaseCompleta} />;
      case 2:
        return <Mundo2_Gameplay jogador={jogador} onFaseCompleta={handleFaseCompleta} />;
      case 3:
        return <Mundo3_Gameplay jogador={jogador} onFaseCompleta={handleFaseCompleta} />;
       case 4:
        return <Mundo4_Gameplay jogador={jogador} onFaseCompleta={handleFaseCompleta} />;
       case 5:
        return <Mundo5_Gameplay jogador={jogador} onFaseCompleta={handleFaseCompleta} />;
      default:
         return <div>Mundo não encontrado!</div>;
     }
   };

   useEffect(() => {
     if (!jogador) {
       navigate('/');
    }
   }, [jogador, navigate]);

   return (
     <div>
      {renderGameplay()}

      {/* Modal de Feedback de Fase */}
      <Modal isOpen={isFeedbackOpen} onClose={handleVoltarAoMapa} title={resultadoFinal.title} variant="feedback">
        <div className="feedback-content">
          <div className="feedback-stats">
            <p className="time-status">Seu tempo:
              <span>{formatTime(resultadoFinal.tempoConclusao, 's')}</span>
            </p>
            <p>{resultadoFinal.proximaMeta}</p>
          </div>
          <div className="feedback-info">
            <p>{mundos[mundo_id]?.mensagemFeedback || "Parabéns, você completou o desafio!"}</p>
           </div>
          <div className="feedback-actions">

             <button className="btn map-btn" onClick={handleVoltarAoMapa}>
              <div></div>
              🏠
            </button>

            <button className="btn retry-btn" onClick={handleRetry}>
              <div></div>
            ↩
            </button>
            {resultadoFinal.estrelas > 0 && fase_id < 5 && (
            <button className="btn next-level-btn" onClick={handleAvancar}>
              <div></div> avançar
             </button>)}
           </div>
         </div>
      </Modal>

    <Modal isOpen={isFimDoMundoOpen}
      onClose={handleVoltarAoMapa}
      variant="feedback">
        <div className="feedback-content">
          <div className="feedback-stats">
              <p>{resultadoMundo.mensagem}</p>
              {resultadoMundo.desbloqueado && (
                <button className='btn next-level-btn' onClick={handleProximoMundo}>
                  Ir para o próximo mundo
                </button>
              )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
export default Fase;