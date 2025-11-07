// Local: frontend/src/services/apiDesafioBonus.js

// Usa a variável de ambiente do Vite, como os outros arquivos
const BASE_URL = `${import.meta.env.VITE_API_URL}/desafio-bonus`;

/**
 * Busca a lista de desafios (perguntas e respostas) para a fase bônus.
 * @param {number} faseId - O ID da fase bônus (ex: 1).
 * @returns {Promise<Array<object>|null>} Um array de { pergunta, resposta } ou null.
 */
export async function buscarDesafiosDaFase(faseId) {
  try {
    // Chama a rota GET /desafio-bonus/fase/1
    const response = await fetch(`${BASE_URL}/fase/${faseId}`);
    if (!response.ok) {
      throw new Error('Falha ao buscar desafios da fase bônus.');
    }
    return await response.json();
  } catch (error) {
    console.error('Erro em buscarDesafiosDaFase:', error);
    return null;
  }
}