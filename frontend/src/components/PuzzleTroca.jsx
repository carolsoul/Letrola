import React, { useState, useEffect } from 'react';
import './PuzzleTroca.css';

// Função para embaralhar o array de letras
const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

function PuzzleTroca({ palavraCorreta, onComplete }) {
  // Estado para guardar as letras na ordem atual
  const [letras, setLetras] = useState([]);
  // Estado para guardar o índice da primeira letra selecionada para troca
  const [indiceSelecionado, setIndiceSelecionado] = useState(null);

  // Efeito para inicializar ou resetar o puzzle
  useEffect(() => {
    const letrasIniciais = palavraCorreta.split('').map((char, index) => ({
      char: char,
      id: index,
      // Se o caractere for um espaço, ele já começa como correto/travado
      estaCorreta: char === ' ',
    }));

    // Filtra apenas as letras para embaralhar, mantendo os espaços fora
    const apenasLetras = letrasIniciais.filter(l => l.char !== ' ');
    const letrasEmbaralhadas = shuffleArray(apenasLetras);

    // Remonta o array final, colocando as letras embaralhadas nos lugares que não são espaços
    let indexLetraEmbaralhada = 0;
    const arrayEmbaralhado = letrasIniciais.map(item => {
        if (item.char === ' ') {
            return item; // Mantém o espaço
        }
        // Adiciona a próxima letra embaralhada
        return letrasEmbaralhadas[indexLetraEmbaralhada++];
    });
    
    const arrayVerificado = arrayEmbaralhado.map((item, index) => {
        if (item.char === palavraCorreta[index]) {
            return { ...item, estaCorreta: true };
        }
        return item;
    });

    setLetras(arrayVerificado); // Define o estado com o array já verificado
    setIndiceSelecionado(null);
  }, [palavraCorreta]);
  
  
  // Efeito para verificar se o puzzle foi concluído
  useEffect(() => {
    if (letras.length > 0 && letras.every(letra => letra.estaCorreta)) {
      // Se todas as letras estão na posição correta, chama onComplete
      setTimeout(() => {
        onComplete();
      }, 500); // Pequeno delay para o jogador ver o puzzle completo
    }
  }, [letras, onComplete]);

  // Função chamada ao clicar em uma letra
  const handleCliqueLetra = (indexClicado) => {
    // Não faz nada se a letra clicada já estiver correta (travada)
    if (letras[indexClicado].estaCorreta) {
      return;
    }

    // Se nenhuma letra estiver selecionada ainda...
    if (indiceSelecionado === null) {
      // ...seleciona a letra clicada.
      setIndiceSelecionado(indexClicado);
    }  
    // Se o jogador clicar na mesma letra de novo...
    else if (indiceSelecionado === indexClicado) {
      // ...cancela a seleção.
      setIndiceSelecionado(null);
    }
    // Se uma letra já estava selecionada e o jogador clicou em outra...
    else {
      // ...executa a troca.
      const novoArrayLetras = [...letras];
      // A troca de fato
      [novoArrayLetras[indiceSelecionado], novoArrayLetras[indexClicado]] = 
      [novoArrayLetras[indexClicado], novoArrayLetras[indiceSelecionado]];

      // Após a troca, verifica se as duas letras ficaram na posição correta
      novoArrayLetras[indiceSelecionado].estaCorreta = 
        novoArrayLetras[indiceSelecionado].char === palavraCorreta[indiceSelecionado];
        
      novoArrayLetras[indexClicado].estaCorreta = 
        novoArrayLetras[indexClicado].char === palavraCorreta[indexClicado];
        
      // Atualiza o estado com as letras trocadas
      setLetras(novoArrayLetras);
      // Reseta a seleção para a próxima jogada
      setIndiceSelecionado(null);
    }
  };

  return (
    <div className="puzzle-troca-container">
      <div className="area-slots">
        {letras.map((letra, index) => {
          // Se for um espaço, renderiza uma quebra de linha invisível
          if (letra.char === ' ') {
            return <div key={letra.id} className="word-break" />;
          }

          // Define as classes CSS dinamicamente
          const classes = [
            'letra-tile',
            letra.estaCorreta ? 'correto' : '',
            indiceSelecionado === index ? 'selecionado' : ''
          ].join(' ');

          return (
            <button
              key={letra.id}
              className={classes}
              onClick={() => handleCliqueLetra(index)}
              disabled={letra.estaCorreta}  
            >
              {letra.char}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PuzzleTroca;