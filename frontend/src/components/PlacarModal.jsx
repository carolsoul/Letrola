import React, { useState, useEffect } from 'react';
import Modal from './Modal'; // Importa seu componente Modal genérico
import { buscarPlacar } from '../services/apiPlacar'; // Importa a função da API
import '../styles/PlacarModal.css'; // Criaremos este arquivo de estilo

function PlacarModal({ isOpen, onClose }) {
  const [placarData, setPlacarData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Busca os dados apenas quando o modal for aberto
    if (isOpen) {
      const carregarPlacar = async () => {
        setIsLoading(true);
        setError(null);
        
        const data = await buscarPlacar();
        
        if (data) {
          setPlacarData(data);
        } else {
          setError('Não foi possível carregar o placar. Tente mais tarde.');
        }
        setIsLoading(false);
      };

      carregarPlacar();
    }
  }, [isOpen]); // O efeito depende do 'isOpen'

  // Função para renderizar o conteúdo
  const renderContent = () => {
    if (isLoading) {
      return <p>Carregando placar...</p>;
    }

    if (error) {
      return <p className="placar-error">{error}</p>;
    }

    if (placarData.length === 0) {
      return <p>Nenhum jogador pontuou ainda. Seja o primeiro!</p>;
    }

    // Renderiza a lista de jogadores
    return (
      <ol className="placar-lista">
        {placarData.map((jogador, index) => (
          <li key={index}>
            <span className="placar-rank">#{index + 1}</span>
            <span className="placar-nome">{jogador.nome}</span>
            <span className="placar-estrelas">{jogador.total_estrelas} ★</span>
          </li>
        ))}
      </ol>
    );
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      variant="placar" 
    >
      <div className="placar-content">
        {renderContent()}
      </div>
    </Modal>
  );
}

export default PlacarModal;