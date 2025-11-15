import React, { useState, useEffect } from 'react';
import { useAudio } from '../hooks/useAudio';
import '../styles/TutorialModal.css';

function TutorialModal({ isOpen, onClose, steps = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // --- NOVO ESTADO ---
  const [isDialoguePlaying, setIsDialoguePlaying] = useState(false);
  
  const { playSound, playAudioFile, stopDialogue } = useAudio();

  // Reinicia o índice quando o modal é aberto
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [isOpen]);

  // --- useEffect (TOCAR áudio) MODIFICADO ---
  useEffect(() => {
    if (isOpen && steps.length > 0 && steps[currentIndex]) {
      const currentStep = steps[currentIndex];
      
      if (currentStep.audio) {
        setIsDialoguePlaying(true); // Desabilita o botão
        const audioInstance = playAudioFile(currentStep.audio);

        if (audioInstance) {
          // Quando o áudio terminar, habilita o botão
          audioInstance.onended = () => {
            setIsDialoguePlaying(false);
          };
        } else {
          // Se o áudio não tocar (ex: SFX mudo)
          setIsDialoguePlaying(false);
        }
      } else {
        // Se não houver áudio, o botão fica habilitado
        setIsDialoguePlaying(false);
      }
    }
  }, [isOpen, currentIndex, steps, playAudioFile]);

  // --- useEffect (PARAR áudio) MODIFICADO ---
  useEffect(() => {
    if (!isOpen) {
      stopDialogue();
      setIsDialoguePlaying(false); // Garante que o botão esteja habilitado se fechar
    }
  }, [isOpen, stopDialogue]);


  if (!isOpen || steps.length === 0) {
    return null;
  }

  const handleNext = () => {
    // playSound('click'); // Opcional: pode remover se o áudio já for o feedback
    if (currentIndex < steps.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose(); // Fecha o modal
    }
  };

  const currentStep = steps[currentIndex];
  const isLastStep = currentIndex === steps.length - 1;

  const isFullImageStep = currentStep.image && !currentStep.text;

  return (
    <div className="tutorial-overlay" onClick={isDialoguePlaying ? undefined : handleNext}>
      {/* Clicar no overlay só funciona se o áudio não estiver tocando */}
      
      <div className="tutorial-content" onClick={(e) => e.stopPropagation()}>
        
        {isFullImageStep ? (
          <img src={currentStep.image} alt="Tutorial passo a passo" className="tutorial-full-image" />
        ) : (
          <>
            <img src={currentStep.image} alt="Ilustração do tutorial" className="tutorial-image" />
            <p className="tutorial-text">{currentStep.text}</p>
          </>
        )}

        {/* --- BOTÃO MODIFICADO --- */}
        <button 
          className="tutorial-btn" 
          onClick={handleNext}
          disabled={isDialoguePlaying} // Controlado pelo estado
        >
          {isLastStep ? 'Jogar!' : 'Próximo'}
        </button>
      </div>
    </div>
  );
}

export default TutorialModal;