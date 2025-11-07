// Local: src/services/apiMemoria.js

// A URL base do seu servidor backend.
const BASE_URL = 'http://localhost:3000/memoria'; // A rota que vamos criar no server.js

/**
 * Busca o deck de cartas (já duplicado e embaralhado) para um nível do Jogo da Memória.
 * @param {number} mundo - O número do mundo (ex: 5).
 * @param {number} fase - O número da fase (ex: 1).
 * @returns {Promise<Array<object>|null>} Um array de objetos de carta ou null em caso de erro.
 * Cada objeto de carta terá: { id, identificador, imagem_url }
 */
export async function buscarDeckDaFase(mundo, fase) {
  try {
    const response = await fetch(`${BASE_URL}/${mundo}/${fase}`);
    if (!response.ok) {
      throw new Error('Falha ao buscar o deck do jogo da memória.');
    }
    return await response.json();
  } catch (error) {
    console.error('Erro em buscarDeckDaFase:', error);
    return null;
  }
}