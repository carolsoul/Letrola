// frontend/src/services/apiCruzadinhas.js

const BASE_URL = `${import.meta.env.VITE_API_URL}/cruzadinhas`;

/**
 * Busca a estrutura de uma cruzadinha (palavras, dicas, posições) para uma fase específica.
 * @param {number} mundo O número do mundo.
 * @param {number} fase O número da fase.
 * @returns {Promise<Array<object>>} Uma lista de objetos, onde cada objeto representa uma palavra na cruzadinha.
 */
export async function buscarCruzadinhaPorFase(mundo, fase) {
  try {
    const response = await fetch(`${BASE_URL}/${mundo}/${fase}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erro ao buscar dados da cruzadinha.");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro na requisição da cruzadinha:", error);
    throw error;
  }
}

/**
 * Valida se uma palavra preenchida pelo jogador está correta.
 * @param {number} mundo O número do mundo atual.
 * @param {number} fase O número da fase atual.
 * @param {string} palavra A palavra que o jogador submeteu.
 * @returns {Promise<object>} Um objeto indicando se a resposta está correta. Ex: { correta: true, palavra: 'FITA' }
 */
export async function validarPalavraCruzadinha(mundo, fase, palavra) {
  try {
    const response = await fetch(`${BASE_URL}/validar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mundo, fase, palavra }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erro ao validar a palavra.");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro na requisição de validação da cruzadinha:", error);
    throw error;
  }
}